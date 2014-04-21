

var config = require('../../frontend/config.json').test;
var app = require('express')();
var request = require('supertest')(config.base_url);
var expect = require('expect.js');

var baseURL = config.base_url;
var exports = module.exports;

exports.post = function(data, done){
    return request.post('/works')
    .send(data)
    .set('Content-type', 'application/json')
    .expect(function(res){
        expect(res.status).to.be(302);
        var redirectURL = res.header.location;
        var pattern = new RegExp(baseURL + '(\\/works\\/\\d+)');
        data.resource = redirectURL;
        expect(redirectURL).to.match(pattern);
    });
}

exports.get = function(data){
    return request.get(data.replace(baseURL,''))
    .set('Accept', 'application/json')
    .expect(function(res){
        expect(res.status).to.be(200);
        var work = res.body;
        expect(work.resource).to.be(data);
        expect(new Date(work.created)).to.not.be('Invalid Date');
        data = work;
    });
}

exports.put = function(data){
    return request.get(data.resource.replace(baseURL,''))
    .set('Content-type', 'application/json')
    .send(data)
    .expect(function(res){
        expect(res.status).to.be(200);
        var work = res.body;
        var created = new Date(work.created);
        var updated = new Date(work.updated);
        expect(work.resource).to.be(data.resource);
        expect(created).to.not.be('Invalid Date');
        expect(updated).to.not.be('Invalid Date');
        expect(updated).to.be.greater.than(created);
        /* ToDo: check updated By equals user */
    });
}

exports.delete = function(data){
    return request.delete(data.resource.replace(baseURL,''))
    .expect(function(res){
        expect(res.status).to.be(200);
        exports.get(data).end(function(err, res){
            expect(err).to.be(404);
        });
    });
}