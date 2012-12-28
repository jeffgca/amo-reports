var util = require('util'),
	fs = require('fs'),
	path = require('path'),
	// moment = require('moment'),
	moment = require('moment-range'),
	async = require('async'),
	csv = require('csv');

var L = function(o) {
	console.log(util.inspect(o));
}

function getConfig(path) {
	var docs = YAML.readFileSync(path);
	return docs[0];
}

/**  
 * prints usage message and exits the whole script!
 */
function Usage(err) {
	console.log(err);
	console.log('Usage: ./jetpack_fetch.js');
	process.exit(1);
};

/* main function */
function main(config) {

	var mysql      = require('mysql');
	var connection = mysql.createConnection(config);

	connection.connect(); // open the mysql connection



	connection.end(); // end the mysql connection
}

if (!module.parent) {
	var myArgs = process.argv.slice(2);

	if (fs.existsSync('./config.yml')) {
		main(config);
	}
	else {
		Usage('No DB configuration file found ( ./config.yml )');
	}

	
}