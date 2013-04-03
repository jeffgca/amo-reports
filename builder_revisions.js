#!/usr/bin/env node

var util = require('util'),
    fs = require('fs'),
    path = require('path'),
    mysql = require('mysql'),
    moment = require('moment-range'),
    async = require('async'),
    csv = require('csv'),
    YAML = require('libyaml'), 
    _ = require('underscore');

var L = console.log,
    D = util.inspect,
    F = util.format;

function getConfig(path) {
    var docs = YAML.readFileSync(path);
    return docs[0];
}

var config = getConfig('./builder.yml');
var connection = mysql.createConnection(config);

connection.connect(); // open the mysql connection

var sql = "SELECT id FROM jetpack_package WHERE type = 'a'";

var csv_data = [];
csv_data.push(['addon_id', 'revision_count']);
var _counters = {};

connection.query(sql, function(err, rows, fields) {
    if (err) throw err;

    var rowCount = rows.length;

    L(F('Fetched %d add-ons', rowCount));

    var data = {}, 
        _counter = 0;

    rows.forEach(function(item) {
        var _sql = "SELECT COUNT(id) as count FROM jetpack_packagerevision WHERE package_id = ?";
        (function(addon_id) {
            connection.query(_sql, [addon_id], function(err, rows, fields) {
                if (err) throw err;

                // L([addon_id, rows[0].count]);                

                csv_data.push([addon_id, rows[0].count]);

                _counter++;
                if (_counter === rowCount) {
                    connection.end();
                    csv().from(csv_data).to(console.log);
                    // L(D(csv_data))
                }
            });
        })(item.id);
    });
});
