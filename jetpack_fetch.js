var util = require('util'),
	fs = require('fs'),
	path = require('path'),
	// moment = require('moment'),
	moment = require('moment-range'),
	async = require('async'),
	csv = require('csv'),
	YAML = require('libyaml'),
	request = require('request');

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

function download(addon) {

	var url = 'https://addons.mozilla.org/firefox/downloads/file/';
	var pp = function(o) { return JSON.stringify(o,null,'  ')};

	// console.log(pp(addon));
	// https://addons.mozilla.org/firefox/downloads/latest/289675/addon-289675-latest.xpi
	var _url = url+addon.addon_id+'/'+addon.filename;
	// var _tpl = 'https://addons.mozilla.org/firefox/downloads/latest/%d/addon-%d-latest.xpi';

	var _tpl = 'https://addons.cdn.mozilla.net/storage/public-staging/%d/%s';

	_url = util.format(_tpl, addon.addon_id, addon.filename);
	console.log(_url);

	var destination = util.format(
		'%s/files/%d/%s',
		__dirname,
		addon.addon_id,
		addon.filename);
	var _dest_dir = path.dirname(destination);

	if (!fs.existsSync(_dest_dir)) {
		console.log('Creating '+_dest_dir);
		fs.mkdirSync(_dest_dir);
	}

	console.log(destination);

	if (fs.existsSync(destination)) {
		console.log(utils.format('%s exists already, skipping.', addon.filename));
	}
	var stream = fs.createWriteStream(destination);

	// var stream = fs.createWriteStream(target_path);
	stream.on('close', function(result) {
		console.log('Created '+result);
	});
	
	request(_url).pipe(stream);
}

function Error(msg) {
	console.log('Error: '+msg);
	process.exit(1);	
}

/* main function */
function main(config, callback) {

	var mysql      = require('mysql');
	var connection = mysql.createConnection(config);

	connection.connect(); // open the mysql connection

	// get all of the *latest* files for add-ons tagged with jetpack
	var sql = "SELECT a.id as addon_id, v.id as verison_id, f.filename "+
			  "FROM `users_tags_addons` as uta "+
			  "INNER JOIN `addons` as a ON uta.addon_id = a.id  "+
			  "INNER JOIN `versions` as v ON v.addon_id = a.id "+
			  "INNER JOIN `files` as f ON f.version_id = v.id "+
			  "WHERE `tag_id` = 7758 "+
			  "AND v.`id` = a.`current_version` "+
			  "AND a.inactive = 0 "+
			  "AND a.status NOT IN (0, 5,10) LIMIT 100";

	connection.query(sql, function(err, rows, fields) {
		if (err) Error(err, null);

		rows.forEach(function(addon, i, arr) {
			callback(addon);
		});
	});

	connection.end(); // end the mysql connection
}

if (!module.parent) {
	var myArgs = process.argv.slice(2);

	if (fs.existsSync('./config.yml')) {
		var config = getConfig('./config.yml');
		main(config, download);
	}
	else {
		Usage('No DB configuration file found ( ./config.yml )');
	}
}