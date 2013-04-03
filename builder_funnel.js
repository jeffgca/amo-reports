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



if (!module.parent) {

    var csv_collected = [];

    var config = getConfig('./builder.yml');
    var connection = mysql.createConnection(config);
    var queries = YAML.readFileSync('./builder_funnel.yml')[0];

    connection.connect(); // open the mysql connection

    async.parallel([
        function(callback) {
            // get all users
            connection.query(queries.auth_user, function(err, rows, fields) {
                if(err) throw err;
                L('got all users');
                callback(null, rows[0]);
            });
        }
        ,function(callback) {
            // get all add-ons 
            connection.query(queries.all_addons, function(err, rows, fields) {
                if(err) throw err;
                L('got all add-ons');
                callback(null, rows[0]);
            });
        }
        ,function(callback) {
            // get all modules
            connection.query(queries.all_modules, function(err, rows, fields) {
                if(err) throw err;
                L('got all modules');
                callback(null, rows[0]);
            });
        },
        function(callback) {
            // get non-copy add-ons
            connection.query(queries.non_copy_addons, function(err, rows, fields) {
                if(err) throw err;
                callback(null, rows);
            });
            // next iterate thru them and get revision count, reject
            // those with fewer than 5 revisions
        },
        function(callback) {

            connection.query(queries.non_copy_addon_revisions, function(err, rows, fields) {

                L('fetched revision data, iterating...');
                var total_revision_count = rows.length, 
                    five_counter = 0,
                    ten_counter = 0,
                    thirty_counter = 0,
                    revisions = [];

                L(F('Fetched %d rows', total_revision_count));

                var summed = {};

                var users_summed = {};

                rows.forEach(function (row) {

                    if (!users_summed[row['author_id']]) {
                        var pkg_id = row['package_id'];
                        users_summed[row['author_id']] = {}
                        users_summed[row['author_id']][pkg_id] = 1;
                    } else {
                        var pkg_id = row['package_id'];
                        if (!users_summed[row['author_id']][pkg_id]) {
                            users_summed[row['author_id']][pkg_id] = 1
                        }
                        else {
                            users_summed[row['author_id']][pkg_id]++;
                        }
                    }

                    if (!summed[row['package_id']]) {
                        summed[row['package_id']] = 1;
                    } 
                    else {
                        summed[row['package_id']]++;
                    }
                });

                // L(D(users_summed));

                L('Summed all the revisions.');
                L(F('Got %d summed addons', _.size(summed)));

                csv().from(_.pairs(summed))
                    .to.path('./summed_dev_revision_ounts.csv')
                    .on('end', function(count) {
                        L(F('Copied out %s records of summed data to csv', count));
                    }).
                    on('error', function(err) {
                        L(F('Error copying out summed data: %s', err));
                    });
                L('analyzing the summed data.');
                _.each(summed, function(item) {
                    // bump counters for various revision thresholds.
                    if (item >= 5) {
                        five_counter++;        
                    }

                    if (item >= 10) {
                        ten_counter++;        
                    }

                    if (item >= 30) {
                        thirty_counter++;        
                    }
                });

                // identify heavy users.
                var users_five = 0,
                    users_ten = 0,
                    users_thirty = 0;
                _.each(users_summed, function(data, user_id) {
                    var has_five, has_ten, has_thirty;
                    _.each(data, function(count, id) {
                        if (count >= 30)  {
                            has_thirty = true;
                        } 
                        if (count >= 10) {
                            has_ten = true;
                        }
                        if (count >= 5) {
                            has_five = true;
                        }
                    });

                    if (has_thirty) 
                        users_thirty++;

                    if (has_ten)
                        users_ten++;

                    if (has_five)
                        users_five++;
                });

                callback(null, {
                    'non_copy_count': total_revision_count,
                    'five_counter': five_counter,
                    'ten_counter': ten_counter,
                    'thirty_counter': thirty_counter,
                    'users_five': users_five,
                    'users_ten': users_ten,
                    'users_thirty': users_thirty
                });
            });
        }
    ], 
    function(err, results) {
        L('in final callback');
        if(err) throw err;

        connection.end();

        L(D(results));

        // csv().from(csv_collected).to.path('./raw_rev_count.csv');
    });
}
