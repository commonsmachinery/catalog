
var dbgfn = require('debug');
var config = require('../frontend/config.json').test;
var app = require('express')();
var request = require('supertest')(config.base_url);
var expect = require('expect.js');

var baseURL = config.base_url;
var work = require('./unit/work');

/* data we are going to use along the tests */
var data = {
    visibility: 'public'
}; 

describe('Work', function(){

    describe('#post', function(){
        var debug = dbgfn('test:work:post');
        it('should return the work URI', function(done){
            debug('input data %j', data);
            work.post(data).end(done);
        });
        it('should reject invalid attributes', function(done){
            debug('input data %j', {visibility:'invalid'});
            work.post({visibility:'invalid'}) .end(function(err, res){
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
            work.get(data.resource).end(done);
        });
        it('should return 404 when getting unexistent work', function(done){
            resource = data.resource + 'fail';
            debug('getting work: %s', resource);
            work.get(resource).end(function(err, res){
                debug('Request status: %s', err);
                expect(err).to.not.be(null);
                done();
            });
        });
    });

    describe('#put', function(){
        var debug = dbgfn('test:work:put');
        it('should return the updated work', function(done){
            debug('updating work: %s. Setting visibility = private', data.resource);
            data.visibility = 'private';
            work.put(data).end(done);
        });
        it('should return 404 when updating unexistent work', function(done){
            var failData = data.clone();
            failData.resource += 'fail';
            debug('updating work: %s', failData.resource);
            work.put(failData).end(function(err, res){
                debug('Request status: %s', err);
                expect(err).to.not.be(null);
            });
        });
        it('should reject invalid attributes', function(done){
            var failData = data.clone();
            failData.visibility = 'invalid';
            debug('updating work: %s', failData.resource);
            work.put(failData).end(function(err, res){
                debug('Request status: %s', err);
                expect(err).to.not.be(null);
                work.get(failData.resource).end(function(err, res){
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
            work.delete(data.resource).end(done);
        });
        it('should return 404 when deleting unexistent work', function(done){
            resource = data.resource + 'fail';
            debug('getting work: %s', resource);
            work.get(resource).end(function(err, res){
                debug('Request status: %s', err);
                expect(err).to.not.be(null);
                done();
            });
        });
    });

});
