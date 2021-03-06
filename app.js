var fs = require('fs');
var express = require('express');
var winston = require('winston');
var async = require('async');
var nodemailer = require('nodemailer');
var bodyParser = require('body-parser');
var validator = require('validator');
var https = require('https');
var os = require("os");
var shortid = require('shortid');
var icsBuilder = require('./parsers/ics-builder.js');
if (fs.existsSync('./config/config.json')) {
    var config = require('./config/config.json');
}
var wellknown = require('nodemailer-wellknown');
var RateLimit = require('express-rate-limit');
// Metrics stuff
// var metricsFile = __dirname + '/metrics.json';
// fs.readFile(metricsFile, function (err, data) {
// 	if (err) {
// 		fs.writeFile(metricsFile, '{}');
// 	}
// });

var metricsIncrement = function(metricsName, callback) {
	if (callback) callback();
	// fs.readFile(metricsFile, function (err, data) {
 //    	var json = JSON.parse(data);
 //    	if (json.hasOwnProperty(metricsName)) {
 //    		json[metricsName]++;
 //    	} else {
 //    		json[metricsName] = 1;
 //    	}
 //    	fs.writeFile(metricsFile, JSON.stringify(json, null, 4), function(err) {
 //    		if (callback) callback();
 //    	});
	// });
};

var aggregateMetrics = function(metrics, callback) {
	if (callback) callback();
	// fs.readFile(metricsFile, function (err, data) {
 //    	var json = JSON.parse(data);
	// 		var total = 0;
	// 		metrics.forEach(function(metricsName) {
	// 			total += json.hasOwnProperty(metricsName) ? json[metricsName] : 0;
	// 		});
 //    	callback(total);
	// });
};

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
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.user || config.user,
        pass: process.env.pass || config.pass
    }
});

var sendEmail = function(email, file, req) {
	transporter.sendMail({
		from: 'coursitycal@gmail.com',
		to: email,
		subject: 'Your timetable from Coursity',
		html: "<p>Hi,</p> <p>Attached is your " +
			"<a href= 'http://" + req.get('host') + "/ics/" + file +
			"'>magical file</a> aka timetable! Go ahead and try importing it somewhere.</p>" +
			"<p>Cheers, <br> Coursity Team</p>",
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
        max: 15, // max number of recent connections during `window` miliseconds before (temporarily) bocking the user.
        global: false, // if true, IP address is ignored and setting is applied equally to all requests
        message: 'What the hell man, why you tryin to make so many requests?'
});

// middleware
var app = express();
app.use(bodyParser.json());

app.get('/', function(req, res) {
	winston.info('User connected: ' + req.connection.remoteAddress || 'localhost');
	res.sendFile(__dirname + '/public/views/index.html');
});
var icsFolder = __dirname + '/public/ics/';

app.use('/process', limiter);

app.post('/process', function(req, res) {

	var university = req.body.university;
	var calEmail = req.body.calEmail;
	var timetable = req.body.timetable;
	var alarms = req.body.alarms;
	if (!req.body.university) {
		return res.status(404).send("No university provided.");
	}
	if (!req.body.timetable) {
		return res.status(404).send("No timetable provided.");
	}
	winston.info('Getting parser for ' + university);
	async.waterfall([
		function(callback) {
			switch (university) {
				case "uottawa":
					return callback(null, require('./parsers/uottawa.js'));
				case "mcmaster":
					return callback(null, require('./parsers/mcmaster.js'));
				default:
					callback("No parser with the name was found: " + university);
			}
		},
		function(parser, callback) {
			var filename = shortid.generate() + '.ics';
			fs.writeFile(
				icsFolder + filename,
				icsBuilder.buildICS(parser.parse(timetable), alarms),
				function(err) {
					if (err) {
						return callback(err);
					}
					callback(null, filename);
				});
		},
	], function(err, filename) {
		if (err) {
			winston.error(err);
			res.status(404).send(err);
		} else {
			winston.info('Piping file ' + filename + ' to response.');
			fs.readFile(icsFolder + filename, 'utf8', function (err, data) {
				if (err) {
					return res.status(404).send(err);
				}
				var icsContentChecker = data.indexOf("BEGIN:VEVENT") > -1;
				if (!icsContentChecker) {
					fs.unlink(icsFolder + filename, function(err) {
						if (!err) {
							winston.info("File deleted: " + filename);
						}
						var msg = 'No events found in your schedule, try again and make sure you follow the steps correctly!';
						winston.error(msg, { error_timetable: timetable, university:university });
						res.status(404).send(msg);
				    metricsIncrement('no_events_found');
					});
				} else {
						if (calEmail) sendEmail(calEmail, filename, req);
						res.status(200).send(filename);
						metricsIncrement(university + '_completed');
					}
				});
			}
	});
});

// Every 5 minutes, update the metrics
// var metricsSoFar = 0;
// var aggregateUniMetrics = function() {
// 	aggregateMetrics(['mcmaster_completed', 'uottawa_completed'],
// 		function(total) {
// 			metricsSoFar = total;
// 	});
// };
// setInterval(aggregateUniMetrics, 300000);
// aggregateUniMetrics();

// app.get('/metrics', function(req, res) {
// 	res.status(200).send(JSON.stringify({
// 		"timetables_processed" : metricsSoFar
// 	}));
// });

app.use(express.static(__dirname + '/public'));
app.listen(process.env.PORT || config.port, function() {
	winston.info("Started server at http://localhost:" + (process.env.PORT || config.port));
});
