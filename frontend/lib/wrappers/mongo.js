'use strict';


var debug = require('debug')('frontend:mongo');
var mongoose = require('mongoose'),
    Promise = require('bluebird');

var model = mongoose.Model;
var find = model.find;
var findOne = model.findOne;
var findOneAndUpdate = model.findOneAndUpdate;

model.find = Promise.promisify(find);
model.findOne = Promise.promisify(findOne);
model.findOneAndUpdate = Promise.promisify(findOneAndUpdate);


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