var fs = require('fs');

var express = require('express');
var multer = require('multer')	
var winston = require('winston');
var async = require('async');
var nodemailer = require('nodemailer');
var bodyParser = require('body-parser');
var validator = require('validator');
var $ = require('jquery');
var https = require('https');
var os = require("os")
var parserFactory = require('./parsers/main.js');
var semesterConfig = require('./config/semesters.json');
var config = require('./config/config.json');
var wellknown = require('nodemailer-wellknown');
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

// middleware
var app = express();
app.use(bodyParser.json());

app.get('/', function(req, res) {
	//console.log(req.get('host'));
	winston.info('User connected: ' + req.connection.remoteAddress || 'localhost');
	res.sendFile(__dirname + '/public/views/index.html');
});
var icsFolder = __dirname + '/ics/';
var tempFolder = __dirname + '/temp/';


app.post('/feedback', function(req, res) {		
	if (!validator.isEmail(req.body.email)) {		
		return res.status(404).send('Invalid email entered.');
	}

	verifyRecaptcha(req.body.recaptcha, function(success) {
		//console.log(success);
		winston.info('Captcha result ' + success);
		if (success) {
			transporter.sendMail({
				from: req.body.email,
				to: 'coursitycal@gmail.com',
				subject: 'Feedback from ' + req.body.email,
				text: req.body.message
			}, function(err, info) {
				if (err) {
					winston.error(err);
					return res.status(404).send(err);
				}
				winston.info('Recieved feedback from ' + req.body.email);
				return res.status(200).send('Sent.')
			});
		} else {
			return res.status(404).send('Enter CAPTCHA');
		}
	});




// Helper function to make API call to recatpcha and check response
	function verifyRecaptcha(key, callback) {
		var SECRET = "6LcmqgsTAAAAAEcRIq40M7mCD5WeExBFmrijaGX-";
		https.get("https://www.google.com/recaptcha/api/siteverify?secret=" + SECRET + "&response=" + key, function(res) {
			var data = "";
			res.on('data', function (chunk) {
				data += chunk.toString();
			});
			res.on('end', function() {
				try {
					var parsedData = JSON.parse(data);
					callback(parsedData.success);
				} catch (e) {
					callback(false);
				}
			});
		});
	}
});

app.post('/upload', multer({
	dest: tempFolder,
	limits: { fileSize: 2097152 }		// 2MB	
}), function(req, res) {   
	if (!req.files || req.files.file.mimetype !== 'text/html') {
		var msg = 'Invalid file type uploaded. Only .HTML files';
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
		winston.error(msg);
		return res.status(404).send(msg);
	}

	winston.info('Getting parser for ' + university + ' for semester  ' + semester);	
	async.waterfall([
		function(callback) {
			parserFactory.getParser(university, callback);
		},
		function(convertToCal, callback) {						
			convertToCal(tempFolder + filename, start_date, end_date, icsFolder, callback);
		}
	], function(err, fileName) {
		if (err) {
			winston.error(err);
			res.status(404).send(err);
		} else if (!fileName) {
			var msg = 'Invalid university provided or parser not found: ' + university;
			winston.error(msg);
			res.status(404).send(msg);	
		} else {
			winston.info('Piping file ' + fileName + ' to response.');
			res.attachment('timetable.ics');
			var filestream = fs.createReadStream(icsFolder + fileName);
			filenameSplit = filename.split(".");
			var icsFile = filenameSplit[0] + '.ics';
			var writeStream = fs.createWriteStream(__dirname + '/public/ics/' + icsFile);
			filestream.pipe(writeStream).on('finish', function () {
				winston.info("File was saved as " + icsFile);
				res.status(200).send(icsFile);
			});
			winston.info("File was saved here: " + req.get('host') + "/public/ics/" + icsFile );

			if (calEmail){
			transporter.sendMail({
				from: 'coursitycal@gmail.com',
				to: calEmail,
				subject: 'Your Weekly Schedule',
				html: "<p>Hi,</p> <p>Find a how to guide attached and this is your Calendar file</p>" + "<a href= 'http://" + req.get('host') + "/ics/" + icsFile + "'> Timetable Link</a><p>Cheers, <br> Coursity Team</p>",
				attachments: [
					{   // utf-8 string as an attachment
						filename: "Timetable.ics",
						path: __dirname + "/public/ics/" + icsFile
					},
					{   // utf-8 string as an attachment
						filename: "How_to_Guide_for_Coursity.docx",
						path: __dirname + "/public/Step_for_Coursity.docx"
					}

				]
			}, function (err, info) {
				if (err) {
					winston.error(err);
					return res.status(404).send(err);
				}
				winston.info('Sent ics file to ' + calEmail);
				//return res.status(200).send('Sent.')
			});
			}
		}
	});
});


app.use(express.static(__dirname + '/public'));
app.listen(80, function() {
	winston.info("Started server at http://localhost:80.");
});
