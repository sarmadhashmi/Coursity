var fs = require('fs');

var express = require('express');
var multer = require('multer')	
var winston = require('winston');
var async = require('async');

var parserFactory = require('./parsers/main.js');
var semesterConfig = require('./config/semesters.json');
// Add logging
winston.add(winston.transports.File, { filename: __dirname + '/logs/main.log' });

var app = express();

app.get('/', function(req, res) {
	winston.info('User connected: ' + req.connection.remoteAddress);
	res.sendFile(__dirname + '/public/views/index.html');
});
var icsFolder = __dirname + '/ics/';
var tempFolder = __dirname + '/temp/'

app.use(multer({
	dest: tempFolder	
}));

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
			console.log(icsFolder + fileName);
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
