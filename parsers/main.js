module.exports.getParser = function(uniName) {
	var parser = require('./' + uniName +'.js');
	return parser.convertToCal;
}