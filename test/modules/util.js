'use strict';

var dbgfn = require('debug');

var exports = module.exports;

/* Make a shallow clone of the object */
exports.clone = function clone(obj){
    var extend = require('util')._extend;
    return extend({}, obj);
}

exports.auth = function auth(user){
    return 'Basic ' + new Buffer(user + ':').toString('base64');
}