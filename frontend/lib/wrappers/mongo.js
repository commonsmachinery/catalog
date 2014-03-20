'use strict';

var mongoose = require('mongoose'),
    Promise = require('bluebird');

exports.Schema = mongoose.Schema;
exports.model = mongoose.model.bind(mongoose);
exports.connect = function(url) {
    function promise(resolve, reject){
        mongoose.connect(url);
        var conn = mongoose.connection;
        conn.on('open', resolve.bind(conn));
        conn.on('error', reject);
        return;
    }
    return new Promise(promise);
};