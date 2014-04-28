'use strict';

var request = require('supertest')('');
var expect = require('expect.js');
var util = require('./util');
var querystring = require('querystring');

var exports = module.exports;


exports.get = function get(data, user){
    return request.get(data.resource + '/completeMetadata')
    .set('Accept', 'application/json')
    .set('Authorization', util.auth(user))
    .expect(function(res){
        expect(res.status).to.be(200);
        var metadata = res.body;
        expect(metadata).to.be.an('object');
    });
};
