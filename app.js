var fs = require('fs');

var express = require('express');
var multer = require('multer')	
var parserFactory = require('./parsers/main.js');

var app = express();

app.get('/', function(req, res) {
	res.sendFile(__dirname + '/public/views/index.html');
});


var fileFilter = function(req, file, cb) {	
	cb(null, file.mimetype === 'text/html');
}

var icsFolder = __dirname + '/ics/';
var tempFolder = __dirname + '/temp/'

app.use(multer({ dest: './temp/', fileFilter: fileFilter}));

app.post('/upload', function(req, res) {    
	var start_date = [2015,8,7];
	var filename = req.files.file.name;	


	// check what uni, get required parser
	var parser = parserFactory.getParser('mcmaster');	
	var returnFile = parser(tempFolder + filename, start_date, icsFolder);
	
	if (!req.files) {
		res.sendStatus(404);
	} else {		
		res.attachment('timetable.ics');
		var filestream = fs.createReadStream(icsFolder + returnFile);		
		filestream.pipe(res);		
	}	
});


app.use(express.static(__dirname + '/public'));
app.listen(3000, function() {	
	console.log("Started server at http://localhost:3000.");
});