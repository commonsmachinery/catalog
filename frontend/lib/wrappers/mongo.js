'use strict';

var mongoose = require('mongoose'),
    Promise = require('bluebird');

exports.Schema = mongoose.Schema;
exports.model = mongoose.model.bind(mongoose);
exports.connect = function(url) {
    function promise(resolve, reject){
        mongoose.connect(url);
        var conn = mongoose.connection;
        conn.on('open', function(){
            debug('Connected to mongoDB');
            resolve(conn);
        });
        conn.on('error', function(err){
            console.log('mongo connection error: %s', err);
            reject(err);
        });
        return;
    }
    return new Promise(promise);
};