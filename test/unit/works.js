
'use strict';

var config = require('../../frontend/config.json').test;
var app = require('express')();
var request = require('supertest')(config.base_url);
var expect = require('expect.js');

var baseURL = config.base_url;
var exports = module.exports;

exports.get = function get(data, user){
    var auth = 'Basic ' + new Buffer(user + ':').toString('base64')
    return request.get('/works')
    .set('Accept', 'application/json')
    .set('Authorization', auth)
    .expect(function(res){
        console.log(res.body);
        expect(res.status).to.be(200);
        var works = res.body;
        var len = works.length;
        expect(len).to.be(data.length);
    });
}

exports.put = function put(data, user){
    var auth = 'Basic ' + new Buffer(user + ':').toString('base64')
    return request.put(data.resource.replace(baseURL,''))
    .set('Content-type', 'application/json')
    .set('Authorization', auth)
    .send(data)
    .expect(function(res){
        expect(res.status).to.be(200);
        var work = res.body;
        var created = new Date(work.created);
        var updated = new Date(work.updated);
        data.updated = work.updated;
        expect(work.resource).to.be(data.resource);
        expect(created).to.not.be('Invalid Date');
        expect(updated).to.not.be('Invalid Date');
        expect(updated).to.be.greaterThan(created);
        /* ToDo: check updated By equals user */
    });
}

exports.remove = function remove(data, user){
    var auth = 'Basic ' + new Buffer(user + ':').toString('base64')
    return request.delete(data.replace(baseURL,''))
    .set('Authorization', auth)
    .expect(function(res){
        expect(res.status).to.be(204);
        exports.get(data).end(function(err, res){
            expect(err).to.be(404);
        });
    });
}