var fs = require('fs');
var express = require('express');
var winston = require('winston');
var async = require('async');
var nodemailer = require('nodemailer');
var bodyParser = require('body-parser');
var validator = require('validator');
var https = require('https');
var os = require("os");
var parserFactory = require('./parsers/main.js');
var semesterConfig = require('./config/semesters.json');
var config = require('./config/config.json');
var wellknown = require('nodemailer-wellknown');
var RateLimit = require('express-rate-limit');
// Metrics stuff
var metricsFile = __dirname + '/metrics.json';
fs.readFile(metricsFile, function (err, data) {
	if (err) {
		fs.writeFile(metricsFile, '{}');
	}
});

var metricsIncrement = function(metricsName, callback) {
	fs.readFile(metricsFile, function (err, data) {
    	var json = JSON.parse(data);
    	if (json.hasOwnProperty(metricsName)) {
    		json[metricsName]++;
    	} else {
    		json[metricsName] = 1;
    	}
    	fs.writeFile(metricsFile, JSON.stringify(json, null, 4), function(err) {
    		if (callback) callback();
    	});
	});
}

// Add logging
try {
	fs.mkdirSync('logs');
}  catch (e) {
	//  folder already exists;
}  finally {
	winston.add(winston.transports.File, { filename: __dirname + '/logs/main.log' });
}
try {
	fs.mkdirSync('public/ics');
} catch (e) {
	// folder already exists
}

// emailer
var transporter = nodemailer.createTransport({
    service: config.type,
    auth: {
        user: config.user,
        pass: config.pass
    }
});

var sendEmail = function(email, file, req) {
	transporter.sendMail({
		from: 'coursitycal@gmail.com',
		to: email,
		subject: 'Your Weekly Schedule',
		html: "<p>Hi,</p> <p>Here's your </p>" +
			"<a href= 'http://" + req.get('host') + "/ics/" + file +
			"'>timetable</a>!<p>Cheers, <br> Coursity Team</p>",
		attachments: [
			{   // utf-8 string as an attachment
				filename: "your_timetable.ics",
				path: __dirname + "/public/ics/" + file
			}
		]
	}, function (err, info) {
		if (err) return winston.error(err);
		winston.info('Sent ics file to ' + email);
		metricsIncrement('sent_to_email');
		//return res.status(200).send('Sent.')
	});
};

// rate limiter
var limiter = RateLimit({
        // window, delay, and max apply per-ip unless global is set to true
        windowMs: 1800000, // miliseconds - how long to keep records of requests in memory -- set to 30 minutes
        max: 50, // max number of recent connections during `window` miliseconds before (temporarily) bocking the user.
        global: false, // if true, IP address is ignored and setting is applied equally to all requests
        message: 'What the hell man, why you tryin to make so many requests?'
});

// middleware
var app = express();
app.use(bodyParser.json());

app.get('/', function(req, res) {
	//console.log(req.get('host'));
	winston.info('User connected: ' + req.connection.remoteAddress || 'localhost');
	res.sendFile(__dirname + '/public/views/index.html');
});
var icsFolder = __dirname + '/public/ics/';
var tempFolder = __dirname + '/temp/';

app.use('/upload', limiter);

app.post('/upload', function(req, res) {
	if (!req.files || req.files.file.mimetype !== 'text/html') {
		var msg = 'Invalid file type uploaded. Only .HTML files';
		metricsIncrement('invalid_file_uploaded');
		winston.error(msg);
		return res.status(404).send(msg);
	}

	var university = req.body.university;
	var semester = req.body.semester;
	var calEmail = req.body.calEmail;
	var filename = req.files.file.name;

	var config, start_date, end_date;
	if (semesterConfig[university] && semesterConfig[university][semester]) {
		config = semesterConfig[university][semester];
		start_date = config['start_date'];
		end_date = config['end_date'];
		end_date = new Date(end_date[0], end_date[1], end_date[2], 23, 30, 0);
	} else {
		var msg = 'Invalid university or semester provided';
		metricsIncrement('invalid_uni_provided');
		winston.error(msg);
		return res.status(404).send(msg);
	}
	winston.info('Getting parser for ' + university + ' for semester  ' + semester);
	async.waterfall([
		function(callback) {
			parserFactory.getParser(university, callback);
		},
		function(convertToCal, callback) {
			var icsFile = filename.split(".")[0] + ".ics";
			convertToCal(tempFolder + filename, start_date, end_date, icsFolder, icsFile, callback);
		},
		function(fileName, callback) {
			fs.unlink(tempFolder + filename, function() {
				callback(null, fileName);
			});
		},
	], function(err, fileName) {
		if (err) {
			winston.error(err);
			res.status(404).send(err);
		} else if (!fileName) {
			var msg = 'Invalid university provided or parser not found: ' + university;
			metricsIncrement('no_parser_found');
			winston.error(msg);
			res.status(404).send(msg);
		} else {
			winston.info('Piping file ' + fileName + ' to response.');
			fs.readFile(icsFolder + fileName, 'utf8', function (err,data) {
				if (err) {
					return res.status(404).send(err);
				}
				var icsContentChecker = data.indexOf("BEGIN:VEVENT") > -1;
				if (!icsContentChecker) {
					fs.unlink(icsFolder + fileName, function(err) {
						if (!err) {
							winston.info("File deleted: " + fileName);
						}
						var msg = 'No events found in your schedule, try again and make sure you follow the steps correctly and';
						if (university === 'mcmaster'){
							msg = msg + " Use the Calendar link in the HOW-TO Section below"
						}
						winston.error(msg);
						res.status(404).send(msg);
				    	metricsIncrement('no_events_found');
					});
				} else {
						if (calEmail) sendEmail(calEmail, fileName, req);
						res.status(200).send(fileName);
						metricsIncrement(university + '_completed');
					}
				});
			}
	});
});

app.use(express.static(__dirname + '/public'));
app.listen(80, function() {
	winston.info("Started server at http://localhost:80.");
});
