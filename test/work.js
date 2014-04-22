
'use strict';


/* Test rest calls for an individual work and other failed cases */

var dbgfn = require('debug');
var config = require('../frontend/config.json').test;
var app = require('express')();
var request = require('supertest')(config.base_url);
var expect = require('expect.js');

/* Make a shallow clone of the object */
var clone = function clone(obj){
    var extend = require('util')._extend;
    return extend({}, obj);
}


var baseURL = config.base_url;
var work = require('./unit/work');

/* data we are going to use along the tests */
var data = {
    visibility: 'private'
}; 
var auth = 'Basic ' + new Buffer('test:').toString('base64');

describe('Work', function(){

    describe('#post', function(){
        var debug = dbgfn('test:work:post');
        it('should return the work URI', function(done){
            debug('input data %j', data);
            work.post(data, auth).end(done);
        });
        it('should reject invalid attributes', function(done){
            var failData = clone(data);
            failData.visibility = 'invalid';
            debug('input data %j', failData);
            work.post(failData, auth) .end(function(err, res){
                debug('Request status: %s', err);
                expect(err).to.not.be(null);
                done();
            });
        });

    });

    describe('#get', function(){
        var debug = dbgfn('test:work:get');
        it('should return the work', function(done){
            debug('getting work: %s', data.resource);
            work.get(data, auth).end(done);
        });
        it('should return 404 when getting unexistent work', function(done){
            var failData = clone(data);
            failData.resource += 'fail';
            debug('getting work: %s', failData.resource);
            work.get(failData, auth).end(function(err, res){
                expect(err.toString()).to.contain('expected 404');
                done();
            });
        });
        it('should not get private work from another user', function(done){
            var failAuth = 'Basic ' + new Buffer('test2:').toString('base64');
            debug('getting work: %s', data.resource);
            work.get(data, failAuth).end(function(err, res){
                expect(err.toString()).to.contain('expected 403');
                done();
            });
        });
    });

    describe('#put', function(done){
        var debug = dbgfn('test:work:put');
        it('should return the updated work', function(done){
            debug('updating work: %s. Setting visibility = public', data.resource);
            data.visibility = 'public';
            work.put(data, auth).end(done);
        });
        it('should return 404 when updating unexistent work', function(done){
            var failData = clone(data);
            failData.resource += 'fail';
            debug('updating work: %s', failData.resource);
            work.put(failData, auth).end(function(err, res){
                expect(err.toString()).to.contain('expected 404');
            });
        });
        it('should reject invalid attributes', function(done){
            var failData = clone(data);
            failData.visibility = 'invalid';
            debug('faildata resource', failData.resource);
            work.put(failData).end(function(err, res){
                /* ToDo: evaluate against an appropiate error code */
                expect(err.toString()).to.not.be(null);
                work.get(failData, auth).end(function(err, res){
                    expect(err).to.be(null);
                    expect(res.body.updated).to.be(data.updated);
                    done();
                });
            });
        });
        it('should not edit work from another user', function(done){
            var failData = clone(data);
            var failAuth = 'Basic ' + new Buffer('test2:').toString('base64');
            debug('updating work: %s', failData.resource);
            work.put(data, failAuth).end(function(err, res){
                expect(err.toString()).to.contain('expected 403');
                work.get(data, auth).end(function(err, res){
                    expect(err).to.be(null);
                    expect(res.body.updated).to.be(data.updated);
                    done();
                });
            });
        });
    });

    describe('#delete', function(){
        var debug = dbgfn('test:work:delete');
        it('should return success code', function(done){
            debug('deleting work: %s', data.resource);
            work.delete(data.resource, auth).end(done);
        });
        it('should return 404 when deleting unexistent work', function(done){
            resource = data.resource + 'fail';
            debug('deleting work: %s', resource);
            work.delete(resource, auth).end(function(err, res){
                debug('Request status: %s', err);
                expect(err.toString()).to.contain('expected 404');
                done();
            });
        });
        it('should not delete work from another user', function(done){
            resource = data.resource + 'fail';
            var failAuth = 'Basic ' + new Buffer('test2:').toString('base64');
            debug('deleting work: %s', resource);
            work.delete(resource, failAuth).end(function(err, res){
                debug('Request status: %s', err);
                expect(err).to.not.be(null);
                done();
            });
        });
    });

});
