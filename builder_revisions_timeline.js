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

function main(builder_conf, amo_conf, callback) {

    // user 21322 is an outlier, someone who copied ~ 5,000
    // add-ons and libraries on June 16 & July 4, 2012.
    var builder_conn = mysql.createConnection(builder_conf);

    var queries = YAML.readFileSync('./revision_timeline.yml').pop();

    async.parallel([
        // get daily counts
        function(p_callback) {
            var from = moment('2010-11-28'), 
                _iter = from,
                _now = moment();

            var daily_totals = [];

            async.whilst(
                function () {
                    // my test
                    return ( _iter < _now );
                },
                function(_callback) {
                    _iter.add('d', 1);
                    var str_target_date = _iter.format('YYYY-MM-DD');

                    (function(_date) {
                        builder_conn.query(queries.daily_sql, [_date], function(err, rows, fields) {
                            if (err) throw err;
                            // D(rows);
                            daily_totals.push([rows[0].count, _date]);
                            _callback();
                        })
                    })(str_target_date);
                },
                function(err) {
                    L('finished daily');
                    if (err) throw err;
                    p_callback(null, {'daily': daily_totals});
            });
        }
        ,
        // get monthly counts
        function(p_callback) {

            var from = moment('2010-11-01'), 
                _iter_monthly = from,
                _now = moment();

            var monthly_totals = [];

            async.whilst(
                function() {
                    return ( _iter_monthly <= _now );
                },
                function(_callback) {
                    _iter_monthly.add('months', 1).date(1);
                    var _future = moment(_iter_monthly);
                    _future.add('months', 1);

                    var range_start_date = _iter_monthly.format('YYYY-MM-DD'),
                        range_end_date = _future.format('YYYY-MM-DD');

                    (function(start, end) {
                        // L(start, end);
                        builder_conn.query(queries.monthly_sql, [start, end], function(err, rows, fields) {
                            // D(rows);
                            if (err) throw err;
                            monthly_totals.push([rows[0].count, range_start_date]);
                            _callback();
                        });
                    })(range_start_date, range_end_date);
                },
                function(err) {
                    if (err) throw err;
                    L('finished monthly');
                    p_callback(null, {'monthly': monthly_totals});
                }
            );
        }
    ]
    ,function(err, results) {
        L('finishing parallel');
        if (err) throw err;

        builder_conn.end();

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

    // D(results[0]['monthly']);

    var monthly = results[1]['monthly'];
    var daily = results[0]['daily'];

    csv().from(monthly).to.path('./monthly_builder_revisions.csv');
    csv().from(daily).to.path('./daily_builder_revisions.csv');
  });
}
