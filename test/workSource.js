'use strict';

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
    state: 'published'
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
    });

    describe('#get', function(){
        var debug = dbgfn('test:workSource:get');
        it('should return the source', function(done){
            debug('getting source: %s', sourceData.resource);
            source.get(sourceData, user).end(done);
        });
        it('should return 404 when getting unexistent source', function(done){
            var failData = util.clone(sourceData);
            failData.resource += 'fail';
            debug('getting source: %s', failData.resource);
            source.get(failData, user).end(function(err, res){
                expect(err.toString()).to.contain('expected 404');
                done();
            });
        });
        it('should not get private work source from another user', function(done){
            debug('getting source: %s', sourceData.resource);
            source.get(sourceData, otherUser).end(function(err, res){
                expect(err.toString()).to.contain('expected 403');
                done();
            });
        });
    });

    describe('#put', function(){
        var debug = dbgfn('test:workSource:put');
        it('should return the updated source', function(done){
            debug('updating source: %s', sourceData.resource);
            source.put(sourceData, user).end(done);
        });
        it('should return 404 when updating unexistent source', function(done){
            var failData = util.clone(sourceData);
            failData.resource += 'fail';
            debug('updating source: %s', failData.resource);
            source.put(failData, user).end(function(err, res){
                expect(err.toString()).to.contain('expected 404');
                done();
            });
        });
        it('should reject invalid attributes', function(done){
            var failData = util.clone(sourceData);
            failData.invalid = 'invalid';
            debug('faildata resource', failData.resource);
            source.put(failData).end(function(err, res){
                /* ToDo: evaluate against a propper error code */
                expect(err.toString()).to.not.be(null);
                source.get(failData, user).end(function(err, res){
                    expect(err).to.be(null);
                    expect(res.body.updated).to.be(sourceData.updated);
                    done();
                });
            });
        });
        it('should deny updating source from another user work', function(done){
            debug('updating source: %s', sourceData.resource);
            source.put(sourceData, otherUser).end(function(err, res){
                /* ToDo: check for explicit error code */
                expect(err.toString()).to.not.be(null);
                source.get(sourceData, user).end(function(err, res){
                    expect(err).to.be(null);
                    expect(res.body.updated).to.be(sourceData.updated);
                    done();
                });
            });
        });
    });

    describe('#delete', function(){
        var debug = dbgfn('test:workSource:delete');
        it('should not delete source from another user', function(done){
            debug('deleting source: %s', sourceData.resource);
            source.remove(sourceData, otherUser).end(function(err, res){
                /* ToDo: check for explicit error code */
                expect(err).to.not.be(null);
                source.get(sourceData, user).end(done);
            });
        });
        it('should return success code', function(done){
            source.remove(sourceData, user).end(done);
        });
        it('should return 404 when deleting unexistent source', function(done){
            var failData = util.clone(sourceData);
            failData.resource += 'fail';
            source.remove(failData, user).end(function(err, res){
                /* ToDo: check for explicit error code */
                expect(err.toString()).to.not.be(null);
                done();
            });
        });
    });

});
    