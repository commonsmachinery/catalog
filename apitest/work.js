
'use strict';


/* Test rest calls for an individual work and other failed cases */

var dbgfn = require('debug');
var config = require('../frontend/lib/config.js');
var expect = require('expect.js');
var util = require('./modules/util');

var baseURL = config.catalog.baseURL + '/works';
var work = require('./modules/work');

/* data we are going to use along the tests */
var data = {
    visible: 'private',
    state: 'draft'
}; 
var user = 'user';
var otherUser = 'otherUser';

describe('Work', function(){

    describe('#post', function(){
        var debug = dbgfn('test:work:post');
        it('should return the work URI', function(done){
            debug('input data %j', data);
            data.resource = baseURL;
            work.post(data, user).end(done);
        });
        it('should reject invalid attribute values', function(done){
            var failData = util.clone(data);
            failData.visible = 'invalid';
            debug('input data %j', failData);
            work.post(failData, user) .end(function(err, res){
                /* ToDo: check for explicit error code */
                expect(err).to.not.be(null);
                done();
            });
        });

    });

    describe('#get', function(){
        var debug = dbgfn('test:work:get');
        it('should return the work', function(done){
            debug('getting work: %s', data.resource);
            work.get(data, user).end(done);
        });
        it('should return 404 when getting unexistent work', function(done){
            var failData = util.clone(data);
            failData.resource += 'fail';
            debug('getting work: %s', failData.resource);
            work.get(failData, user).end(function(err, res){
                expect(err.toString()).to.contain('expected 404');
                done();
            });
        });
        it('should not get private work from another user', function(done){
            debug('getting work: %s', data.resource);
            work.get(data, otherUser).end(function(err, res){
                expect(err.toString()).to.contain('expected 403');
                done();
            });
        });
    });

    describe('#put', function(done){
        var debug = dbgfn('test:work:put');
        it('should return the updated work', function(done){
            this.timeout(4000);
            debug('updating work: %s. Setting visible = public', data.resource);
            data.visible = 'public';
            data.state = 'published';
            setTimeout(function(){
                work.put(data, user).end(done);
            }, 1000);
        });
        it('should return 404 when updating unexistent work', function(done){
            var failData = util.clone(data);
            failData.resource += 'fail';
            debug('updating work: %s', failData.resource);
            work.put(failData, user).end(function(err, res){
                expect(err.toString()).to.contain('expected 404');
                done();
            });
        });
        // it('should reject invalid attributes', function(done){
        //     var failData = util.clone(data);
        //     failData.visible = 'invalid';
        //     debug('faildata resource', failData.resource);
        //     work.put(failData).end(function(err, res){
        //         /* ToDo: evaluate against an appropiate error code */
        //         expect(err.toString()).to.not.be(null);
        //         work.get(failData, user).end(function(err, res){
        //             expect(err).to.be(null);
        //             expect(res.body.updated).to.be(data.updated);
        //             done();
        //         });
        //     });
        // });
        // it('should reject invalid attribute values', function(done){
        //     var failData = util.clone(data);
        //     failData.invalid = 'invalid';
        //     debug('faildata resource', failData.resource);
        //     work.put(failData).end(function(err, res){
        //         /* ToDo: evaluate against an appropiate error code */
        //         expect(err.toString()).to.not.be(null);
        //         work.get(failData, user).end(function(err, res){
        //             expect(err).to.be(null);
        //             expect(res.body.updated).to.be(data.updated);
        //             done();
        //         });
        //     });
        // });
        it('should not edit work from another user', function(done){
            debug('updating work: %s', data.resource);
            work.put(data, otherUser).end(function(err, res){
                expect(err.toString()).to.contain('expected 403');
                work.get(data, user).end(function(err, res){
                    expect(err).to.be(null);
                    expect(res.body.updated).to.be(data.updated);
                    done();
                });
            });
        });
    });

    describe('#delete', function(){
        var debug = dbgfn('test:work:delete');
        it('should not delete work from another user', function(done){
            debug('deleting work: %s', data.resource);
            work.remove(data, otherUser).end(function(err, res){
                /* ToDo: check for explicit error code */
                expect(err).to.not.be(null);
                work.get(data, user).end(done);
            });
        });
        it('should return success code', function(done){
            debug('deleting work: %s', data.resource);
            work.remove(data, user).end(done);
        });
        it('should return 404 when deleting unexistent work', function(done){
            var failData = util.clone(data);
            failData.resource += 'fail';
            debug('deleting work: %s', failData.resource);
            work.remove(failData, user).end(function(err, res){
                expect(err.toString()).to.contain('expected 404');
                done();
            });
        });
    });

});
