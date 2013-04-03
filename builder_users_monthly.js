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

function main(builder_conf, callback) {

    var queries = YAML.readFileSync('./builder_funnel.yml').shift();
    var builder_conn = mysql.createConnection(builder_conf);


    var from = moment('2010-11-01'), 
    _iter = from,
    _now = moment('2013-01-01');

    var monthly_active_users = [],
        monthly_created_users = [],
        w_results = [];

    async.whilst(
        function () {
            return ( _iter < _now );
        },
        function(w_callback) {
            _iter.add('months', 1).date(1);
            
            var _future = moment(_iter);
                _future.add('months', 1);

            var _from = _iter.format('YYYY-MM-DD');
            var _to = _future.format('YYYY-MM-DD');


            async.parallel([
                function(p_callback) {
                    builder_conn.query(queries.builder_users_active, [_from, _to], function(err, rows, fields) {
                        if (err) throw err;
                        // D(rows);
                        p_callback(null, {'active': [_from, rows[0]['active_user_count']]});
                    })
                },
                function(p_callback) {
                    builder_conn.query(queries.builder_users_created, [_from, _to], function(err, rows, fields) {
                        if (err) throw err;
                        // D(rows);
                        p_callback(null, {'created': [_from, rows[0]['created_user_count']]});
                    })
                }], 
                function(err, results) {
                    // w_results.push(results);
                    D(results);
                    monthly_active_users.push(results[0]['active']);
                    monthly_created_users.push(results[1]['created']);
                    
                    w_callback();
                });
        },
        function(err) {
            if (err) throw err;
            builder_conn.end();
            csv().from(monthly_active_users).to.path('./monthly_active_users.csv');
            csv().from(monthly_created_users).to.path('./monthly_created_users.csv');
        }
    );
}

if (!module.parent) {
  // this is the main module
  var builder_config = getConfig('./builder.yml');
  main(builder_config, function(err, results) {
    if (err) throw err;

    // D(results);

  });
} else {
  // we were require()d from somewhere else
}