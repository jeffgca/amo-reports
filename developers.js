#!/usr/bin/env node

var util = require('util'),
	fs = require('fs'),
	path = require('path');

var L = console.log,
	D = util.inspect,
	F = util.format;

var YAML 	= require('libyaml'), 
	mysql 	= require('mysql'),
	async 	= require('async');

// functions...


/**  
 * main();
 */
function main() {

	var config  = YAML.readFileSync('./config.yml')[0];
	var queries = YAML.readFileSync('./developer_queries.yml')[0];

	var connection = mysql.createConnection(config);

	connection.connect(); // open the mysql connection

	async.parallel([
		function(callback) {
			// all
			connection.query(queries.all, function(err, rows, fields) {
				callback(null, {query: 'all', data: rows});
			});
		},
		function(callback) {
			// sdk
			connection.query(queries.sdk, function(err, rows, fields) {
				callback(null, {query: 'sdk', data: rows});
			});
		},
		function(callback) {
			// builder
			connection.query(queries.builder, function(err, rows, fields) {
				callback(null, {query: 'builder', data: rows});
			});
		}
	], 
	function(err, result) {
		if (err) throw err;

		result.forEach(function(item) {
			L(F('%s: %d', item.query, item.data.length));
		});

		connection.end();
	});
}


if (!module.parent) {
  // this is the main module
  main();
} else {
  // we were require()d from somewhere else
}
