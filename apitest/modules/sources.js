
'use strict';

var request = require('supertest')('');
var expect = require('expect.js');
var util = require('./util');
var querystring = require('querystring');

var exports = module.exports;


exports.get = function get(path, user){
    return request.get(path)
    .set('Accept', 'application/json')
    .set('Authorization', util.auth(user))
    .expect(function(res){
        expect(res.status).to.be(200);
        var sources = res.body;
        expect(sources).to.be.an('array');
        expect(sources.length).to.be.greaterThan('0');
    });
};
