var fs = require('fs');

var express = require('express');
var multer = require('multer')	
var parserFactory = require('./parsers/main.js');
var winston = require('winston');
var async = require('async');
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
		var msg = 'Invalid file type uploaded.';
		winston.error(msg);
		return res.status(404).send(msg);
	}

	var university = req.body.university;
	//To-Do let user pick date
	var start_date = [2015,8,7];
	var end_date = new Date(2015,11,08, 23, 30, 0);

	/*if (Fall){
	start_date = [2015,8,7];
	end_date = new Date(2015,11,08, 23, 30, 0);
	}
	if (Winter){
		start_date = [2016,0,7];
		end_date = new Date(2015,3,21, 23, 30, 0);
	}*/
	var filename = req.files.file.name;	

	winston.info('Getting parser for ' + university);	
	async.waterfall([
		function(callback) {
			parserFactory.getParser(university, callback);
		},
		function(convertToCal, callback) {			
			convertToCal(tempFolder + filename, start_date,end_date, icsFolder, callback);
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
			winston.info('Piping file to response: ' + fileName)
			res.attachment('timetable.ics');
			var filestream = fs.createReadStream(icsFolder + fileName);		
			filestream.pipe(res);		
		}				 
	});	
});


app.use(express.static(__dirname + '/public'));
app.listen(3000, function() {	
	console.log("Started server at http://localhost:3000.");
});
