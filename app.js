var express = require('express');
var app = express();
var multer = require('multer')	

app.get('/', function(req, res) {
	res.sendFile(__dirname + '/public/views/index.html');
});
app.use(multer({ dest: './tmpitytmp/'}));
app.post('/upload', function(req, res) {    			
	if (!req.files) {
		res.sendStatus(404);
	} else {
		res.sendStatus(200);
	}	
});
app.use(express.static(__dirname + '/public'));
app.listen(3000, function() {	
	console.log("Started server at http://localhost:3000.");
});