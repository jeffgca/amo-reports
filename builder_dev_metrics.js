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
    D = function(o) { L(util.inspect(o)); },
    F = function(s) { L(util.format.apply(null, arguments)); };

function getConfig(path) {
    var docs = YAML.readFileSync(path);
    return docs[0];
}

/**  

[ { user_count: 29312 },
  { addon_count: 67563 },
  { module_count: 4195 },
  [ { non_copy_total: 35120 } ],
  { non_copy_count: 800693,
    five_counter: 13117,
    ten_counter: 9192,
    thirty_counter: 4945,
    users_five: 8254,
    users_ten: 6070,
    users_thirty: 3614 } ]

 */

function main(builder_conf, amo_conf, callback) {
    // var result = {};

    var builder_conn = mysql.createConnection(builder_conf);
    var amo_conn = mysql.createConnection(amo_conf);

    var queries = YAML.readFileSync('./builder_funnel.yml').shift();

    async.parallel([
        // get all users
        function(callback) {
            L('getting total users')
            var _sql = "SELECT COUNT(DISTINCT(author_id)) AS total_count FROM jetpack_package WHERE type = 'a' ORDER BY author_id ASC";
            builder_conn.query(_sql, function(err, rows, cols) {

                D(rows)

                callback(null, rows[0]);
            });
        },
        // submitted to AMO
        function(p_callback) {

            L('starting waterfall')
            async.waterfall([

                function(callback) {
                    L('getting guids')
                    amo_conn.query(queries.amo_builder_guids, function(err, rows, cols) {
                        if (err) throw err;

                        callback(null, rows);
                    });
                },
                function(guids, callback) {
                    F('got %d guids, fetching users', _.size(guids));
                    var _guids = _.map(guids, function(row) { return row.guid; });

                    builder_conn.query(queries.builder_guids_users, 
                        [_guids],
                        function(err, rows, cols) {
                            if (err) throw err;

                            D(rows[0]);

                            var two_or_more = {}, 
                                collected_users = {};
                            _.each(rows, function(item) {
                                if (!collected_users[item['author_id']]) {
                                    collected_users[item['author_id']] = 1;
                                } else {
                                    collected_users[item['author_id']]++;
                                    if (collected_users[item['author_id']] > 2) {
                                        two_or_more[item['author_id']] = true;
                                    }
                                }
                            });

                            callback(null, {
                                'users_submitted': _.size(collected_users),
                                'two_or_more': _.size(two_or_more)
                            });
                        });
                }
            ], 
            function(err, results) {
                L('finishing waterfall');
                D(results);
                p_callback(null, results);
            });
        }
    ]
    ,function(err, results) {
        L('finishing parallel');
        if (err) throw err;

        builder_conn.end();
        amo_conn.end();

        callback(null, results);
    });
}

exports.main = main;

if (!module.parent) {
  // this is the main module
  var builder_config = getConfig('./builder.yml'),
      amo_config = getConfig('./config.yml')

  main(builder_config, amo_config, function(err, results) {
    if (err) throw err;
    L(results);
  });
}
