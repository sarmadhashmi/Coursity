var fs = require('fs');
var winston = require('winston');
module.exports.getParser = function(uniName, callback) {
	fs.open(__dirname + '/' +  uniName + '.js', 'r', function(err) {	
		if (err) {			
			winston.error(err);
			return callback("No parser with the name was found: " + uniName);
		}
		var parser = require('./' + uniName + '.js');
		return callback(null, parser.convertToCal);		
	});		
}