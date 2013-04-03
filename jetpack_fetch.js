#!/usr/bin/env node

var util = require('util'),
	fs = require('fs'),
	path = require('path'),
	// moment = require('moment'),
	moment = require('moment-range'),
	async = require('async'),
	csv = require('csv'),
	YAML = require('libyaml'),
	request = require('request'),
	_ = require('underscore'),
	redis = require('redis');

var L = console.log,
    D = util.inspect,
    F = util.format;

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

var logData, logged = 0, rowCount;

var redis_client = redis.createClient();

function logger(addon) {

	var _tpl = 'https://addons.cdn.mozilla.net/storage/public-staging/%d/%s';

	_url = util.format(_tpl, addon.addon_id, addon.filename);
	// console.log(_url);
	var r_id = 'addon-'+addon.addon_id;
	addon.download_url = _url;
	// L(D([r_id, addon]));
	redis_client.hset('addon-data', r_id, JSON.stringify(addon), function(err, result) {
		if (err) throw err;
		// L(result);
		// redis_client.lpush('addon-ids', r_id, function() {
			logged++;
			L(logged);
			if (logged === rowCount) {
				redis_client.end();
			}
		// });
	});
}

function download(addon) {
	var pp = function(o) { return JSON.stringify(o,null,'  ')};
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
		console.log(util.format('%s exists already, skipping.', addon.filename));
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
	var downloadCount = 0;
	var mysql      = require('mysql');
	var connection = mysql.createConnection(config);

	connection.connect(); // open the mysql connection

	// stage queries, otherwise the download handler freaks out.
	var count_sql = "SELECT COUNT(a.id) as count "+
			  "FROM `users_tags_addons` as uta "+
			  "INNER JOIN `addons` as a ON uta.addon_id = a.id  "+
			  "INNER JOIN `versions` as v ON v.addon_id = a.id "+
			  "INNER JOIN `files` as f ON f.version_id = v.id "+
			  "WHERE `tag_id` = 7758 "+
			  "AND v.`id` = a.`current_version` "+
			  "AND a.inactive = 0 "+
			  "AND a.status NOT IN (0, 5,10)";


	connection.query(count_sql, function(err, rows, fields) {
		if (err) Error(err, null);

		rowCount = rows[0].count;

		// L(rowCount);
		// rowCount = 1680; // mock test.

		var _sets = Math.ceil(rowCount / 200);
		var _iter = []; _iter[_sets] = true;

		var foo = _iter.map(function(i) {

		})
		var i = 0;

		_(_sets).times(function(n) {

			var start = n * 200;
			var params = [start, 200];

			// L(params);
			// get all of the *latest* files for add-ons tagged with jetpack
			var sql = "SELECT a.id as addon_id, v.id as version_id, f.filename "+
					  "FROM `users_tags_addons` as uta "+
					  "INNER JOIN `addons` as a ON uta.addon_id = a.id  "+
					  "INNER JOIN `versions` as v ON v.addon_id = a.id "+
					  "INNER JOIN `files` as f ON f.version_id = v.id "+
					  "WHERE uta.`tag_id` = 7758 "+
					  "AND v.`id` = a.`current_version` "+
					  "AND a.inactive = 0 "+
					  "AND a.status NOT IN (0, 5,10) LIMIT ?, ?";

			connection.query(sql, params, function(err, rows, fields) {
				if (err) Error(err, null);
				L(D(params));
				L(rows.length);
				L('rowCount: '+rowCount);
				rows.forEach(function(addon, i, arr) {
					downloadCount++; // we're done using mysql
					if (downloadCount === rowCount) {
						// L(D(addon));
						connection.end();
					}

					callback(addon);
				});
			});
		});
	});
}

if (!module.parent) {
	var myArgs = process.argv.slice(2);

	if (fs.existsSync('./config.yml')) {
		var config = getConfig('./config.yml');
		main(config, logger);
	}
	else {
		Usage('No DB configuration file found ( ./config.yml )');
	}
}