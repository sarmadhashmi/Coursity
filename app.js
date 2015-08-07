var fs = require('fs');

var express = require('express');
var multer = require('multer')	
var winston = require('winston');
var async = require('async');
var nodemailer = require('nodemailer');
var bodyParser = require('body-parser');
var validator = require('validator');

var parserFactory = require('./parsers/main.js');
var semesterConfig = require('./config/semesters.json');
var config = require('./config/config.json');

// Add logging
try {
	fs.mkdirSync('logs');	
}  catch (e) {
	//  folder already exists;
}  finally {
	winston.add(winston.transports.File, { filename: __dirname + '/logs/main.log' });
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
app.use(multer({
	dest: tempFolder,
	limits: { fileSize: 2097152 }		// 2MB	
}));


app.get('/', function(req, res) {
	winston.info('User connected: ' + req.connection.remoteAddress || 'localhost');
	res.sendFile(__dirname + '/public/views/index.html');
});
var icsFolder = __dirname + '/ics/';
var tempFolder = __dirname + '/temp/';


app.post('/feedback', function(req, res) {		
	if (!validator.isEmail(req.body.email)) {		
		return res.status(404).send('Invalid email entered.');
	}
	transporter.sendMail({
	    from: req.body.email,
	    to: 'course2cal@gmail.com',
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
});

app.post('/upload', function(req, res) {   
	if (!req.files || req.files.file.mimetype !== 'text/html') {
		var msg = 'Invalid file type uploaded. Only .HTML files';
		winston.error(msg);
		return res.status(404).send(msg);
	}

	var university = req.body.university;
	var semester = req.body.semester;	
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
			winston.info('Piping file ' +  fileName + ' to response.')
			res.attachment('timetable.ics');			
			var filestream = fs.createReadStream(icsFolder + fileName);	
			filestream.on('readable', function() {
				filestream.pipe(res);		
			});
		}				 
	});	
});


app.use(express.static(__dirname + '/public'));
app.listen(3000, function() {	
	winston.info("Started server at http://localhost:3000.");
});
