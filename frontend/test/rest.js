
var config = require('../config.json').test;
var app = require('express')();
var request = require('supertest')(config.base_url);
var expect = require('expect.js');

var sampleWork = {};

describe('Work', function(){
    describe('- post', function(){
        it('should return the workURI', function(done){
            request.post('/works')
            .send(sampleWork)
            .expect(200, function(res){
                console.log(res);
            })
            .end(done);
        })
    });
    describe('- get', function(){
        //get the work
    })
})
