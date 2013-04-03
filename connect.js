#!/usr/bin/env node

var util = require('util'),
	fs = require('fs'),
	path = require('path'),
	moment = require('moment-range'),
	async = require('async'),
	csv = require('csv'),
	YAML = require('libyaml');

var L = function(o) {
	console.log(util.inspect(o));
}

var collected = [
	['Date', 'All', 'SDK', 'Builder']
];

function getConfig(path) {
	var docs = YAML.readFileSync(path);
	return docs[0];
}

/**  
 * main - our main loop that gathers data for a particular date range
 * @param from - a date parsed by moment
 * @param to - same deal
 */
function main(from, to, config) {

	var mysql      = require('mysql');
	var connection = mysql.createConnection(config);

	connection.connect(); // open the mysql connection

	// console.log('Got args: '+from.format('YYYY-MM-DD')+', '+to.format('YYYY-MM-DD'));

	var range = moment().range(from, to),
		_cur = from;


	async.whilst(
		function () {
			// my test
			return ( _cur < to );
		},
		function(w_callback) {
			// where the rubber hits the road
			_cur.add('d', 1);
			var str_target_date = _cur.format('YYYY-MM-DD');

			async.parallel([
				function(callback) {
					// get all created extensions
					var sql = "SELECT COUNT(*) AS count FROM `addons` WHERE DATE(created) = ? AND addontype_id = 1;";
					
					(function (date) {
						connection.query(sql, [date], function(err, rows, fields) {
							if (err) callback(err, null);
							callback(null, {'all': rows[0]["count"], date: date});
						});						
					})(str_target_date);
				}
				, function(callback) {
					// get SDK extensions
					var sql = "SELECT COUNT(a.id) as count FROM `users_tags_addons` as uta INNER JOIN `addons` as a ON uta.addon_id = a.id WHERE `tag_id` = 7758 AND DATE(a.created) = ?";
					(function (date) {
						connection.query(sql, [date], function(err, rows, fields) {
							if (err) callback(err, null);
							callback(null, {'sdk': rows[0]["count"], date: date});
						});						
					})(str_target_date);

				}
				, function(callback) {
					// get builder extensions
					var sql = "SELECT COUNT(a.id) as count FROM `users_tags_addons` as uta INNER JOIN `addons` as a ON uta.addon_id = a.id WHERE `tag_id` = 7758 AND a.guid LIKE 'jid0-%' AND DATE(a.created) = ?;";
					(function (date) {
						connection.query(sql, [date], function(err, rows, fields) {
							if (err) callback(err, null);
							callback(null, {'builder': rows[0]["count"], date: date});
						});
					})(str_target_date);
				}], 
				function(err, result) {
					if (err) throw err;

					// [ { type: 'all', date: '2011-01-01', rows: 4 },
					//   { type: 'sdk-all', date: '2011-01-01', rows: 0 },
					//   { type: 'builder', date: '2011-01-01', rows: 0 } ]

					// L(result);

					var _date = result[0].date;
					// L(_by_date);

					var _out = [
						result[0].date,
						result[0].all,
						result[1].sdk,
						result[2].builder
					];

					collected.push(_out);

					w_callback();
				}
			);
			// end of peel-out / patch-laying, etc
		},
		function (err) {
			if (err) console.log('Error: '+err);

			// L(collected);

			csv().from(collected).to(console.log);
			connection.end(); // end the mysql connection
		}
	);
}

/**  
 * prints usage message and exits the whole script!
 */
function Usage(err) {
	console.log(err);
	console.log('Usage: ./connect.js --from=<date> --to=<date>');
	console.log('Example: ./connect.js --from=2011-12-31 --to=2012-02-29');
	process.exit(1);
}

if (!module.parent) {
	var myArgs = process.argv.slice(2);

	// no args at all
	if (myArgs.length === 0 
		|| myArgs.length < 2) {
		Usage('No arguments supplied!');
	}

	// bad args
	var args_regex = /^--(from|to)=[\d]{4}-[\d]{2}-[\d]{2}/;

	if (!args_regex.test(myArgs[0]) || !args_regex.test(myArgs[1])) {
		Usage("Invalid date formats: "+myArgs[0] + ' & ' + myArgs[1] + "\nDate supplied should be in ISO format: YYYY-MM-DD");
	}

	// try to catch badly formatted dates
	var _from = myArgs[0].split('=').pop();
	var _to = myArgs[1].split('=').pop();

	try {
		var from = moment(_from);
	} catch(e) {
		Usage('Error parsing \'from\' date: '+e);
	}

	try {
		var to = moment(_to);
	} catch(e) {
		Usage('Error parsing \'to\' date: '+e);
	}

	if (!fs.existsSync('./config.yml')) {
		Usage('./config.yml doesn\'t exist, no database configuration found?');
	}
	else {
		var config = getConfig(path.join(__dirname, 'config.yml'));
	}

	main(from, to, config);
}