'use strict';

/* Test rest work browsing features */

var dbgfn = require('debug');
var config = require('../frontend/config.json').test;
var expect = require('expect.js');
var util = require('./modules/util');

var worksURL = config.base_url + '/works';
var work = require('./modules/work');
var source = require('./modules/source');

/* data we are going to use along the tests */
var workData = {
    visibility: 'private',
    status: 'published'
}; 
var sourceData = {};

var user = 'user';
var otherUser = 'otherUser';

describe('Source', function(){

    it('should create a work', function(done){
        var debug = dbgfn('test:creating-a-work');
        workData.resource = worksURL;
        work.post(workData, user).end(function(err, res){
            expect(err).to.be(null);
            sourceData.resource = workData.resource + '/sources';
            done();
        });
    });

    describe('#post', function(){
        var debug = dbgfn('test:workSource:post');
        it('should return source URI', function(done){
            source.post(sourceData, user).end(done);
        });
        it('should reject invalid attribute values', function(done){
            var failData = util.clone(sourceData);
            failData.visibility = 'invalid';
            debug('input data %j', failData);
            work.post(failData, user) .end(function(err, res){
                /* ToDo: check for explicit error code */
                expect(err).to.not.be(null);
                done();
            });
        });
        it('should reject invalid attribute fields', function(done){
            var failData = util.clone(sourceData);
            failData.invalid = 'invalid';
            debug('input data %j', failData);
            work.post(failData, user) .end(function(err, res){
                /* ToDo: check for explicit error code */
                expect(err).to.not.be(null);
                done();
            });
        });
    });

    describe('#get', function(){
        var debug = dbgfn('test:workSource:get');
        it('should return the source', function(done){
            debug('getting work: %s', sourceData.resource);
            source.get(sourceData, user).end(done);
        });
        it('should return 404 when getting unexistent source', function(done){
            var failData = util.clone(sourceData);
            failData.resource += 'fail';
            debug('getting work: %s', failData.resource);
            work.get(failData, user).end(function(err, res){
                expect(err.toString()).to.contain('expected 404');
                done();
            });
        });
        it('should not get private source from another user', function(done){
            debug('getting work: %s', sourceData.resource);
            work.get(sourceData, otherUser).end(function(err, res){
                expect(err.toString()).to.contain('expected 403');
                done();
            });
        });
    });

    describe('#put', function(){
        var debug = dbgfn('test:workSource:put');
        it('should return the updated source', function(done){
            debug('updating work: %s', sourceData.resource);
            source.put(sourceData, user).end(done);
        });
        it('should return 404 when updating unexistent source', function(done){
            var failData = util.clone(sourceData);
            failData.resource += 'fail';
            debug('updating work: %s', failData.resource);
            work.put(failData, user).end(function(err, res){
                expect(err.toString()).to.contain('expected 404');
                done();
            });
        });
        it('should reject invalid attributes', function(done){
            var failData = util.clone(sourceData);
            failData.visibility = 'invalid';
            debug('faildata resource', failData.resource);
            work.put(failData).end(function(err, res){
                /* ToDo: evaluate against an appropiate error code */
                expect(err.toString()).to.not.be(null);
                work.get(failData, user).end(function(err, res){
                    expect(err).to.be(null);
                    expect(res.body.updated).to.be(sourceData.updated);
                    done();
                });
            });
        });
    });

    describe('#delete', function(){
        var debug = dbgfn('test:workSource:delete');
        it('should return success code', function(done){
            source.remove(sourceData.resource, user).end(done);
        });
        it('should return 404 when deleting unexistent source', function(done){
            var resource = sourceData.resource + 'fail';
            debug('deleting work: %s', resource);
            work.remove(resource, user).end(function(err, res){
                expect(err.toString()).to.not.be(null);
                done();
            });
        });
        it('should not delete work from another user', function(done){
            debug('deleting work: %s', sourceData.resource);
            work.remove(sourceData.resource, otherUser).end(function(err, res){
                /* ToDo: check for explicit error code */
                expect(err).to.not.be(null);
                done();
            });
        });
    });

});
    