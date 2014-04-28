'use strict';

var dbgfn = require('debug');
var config = require('../frontend/config.json').test;
var expect = require('expect.js');
var util = require('./modules/util');

var worksURL = config.base_url + '/works';
var work = require('./modules/work');
var post = require('./modules/post');

/* data we are going to use along the tests */
var workData = {
    visibility: 'private',
    state: 'published'
}; 
var postData = {
    resource: 'http://tumblr.com'
};

var user = 'user';
var otherUser = 'otherUser';

describe('Post', function(){

    it('should create a work', function(done){
        var debug = dbgfn('test:creating-a-work');
        workData.resource = worksURL;
        work.post(workData, user).end(done);
    });

    describe('#post', function(){
        var debug = dbgfn('test:workPosts:post');
        it('should return post URI', function(done){
            postData.url = workData.resource + '/posts';
            post.post(postData, user).end(done);
        });
    });

    describe('#get', function(){
        var debug = dbgfn('test:workPosts:get');
        it('should return the post', function(done){
            post.get(postData, user).end(done);
        });
        it('should return 404 when getting unexistent post', function(done){
            var failData = util.clone(postData);
            failData.url += 'fail';
            debug('getting post: %s', failData.url + '/' + postData.id);
            post.post(failData, user).end(function(err, res){
                expect(err.toString()).to.contain('expected 404');
                done();
            });
        });
        it('should not get private work post from another user', function(done){
            debug('getting post: %s', postData.url + '/' + postData.id);
            post.get(postData, otherUser).end(function(err, res){
                expect(err.toString()).to.contain('expected 403');
                done();
            });
        });
    });

    describe('#put', function(){
        var debug = dbgfn('test:workPosts:put');
        it('should return the updated post', function(done){
            this.timeout(4000);
            debug('updating post: %s', postData.url + '/' + postData.id);
            postData.resource = 'http://deviantart.com';
            setTimeout(function(){
                post.put(postData, user);
            }, 1000);
            done();
        });
        it('should return 404 when updating unexistent post', function(done){
            var failData = util.clone(postData);
            failData.url += 'fail';
            debug('updating post: %s', postData.url + '/' + postData.id);
            post.put(failData, user).end(function(err, res){
                /* ToDo: check for explicit error code */
                expect(err.toString()).to.not.be(null);
                done();
            });
        });
        it('should deny updating post from another user', function(done){
            debug('updating post: %s', postData.url + '/' + postData.id);
            post.put(postData, otherUser).end(function(err, res){
                /* ToDo: check for explicit error code */
                expect(err.toString()).to.not.be(null);
                post.get(postData, user).end(function(err, res){
                    expect(err).to.be(null);
                    expect(res.body.updated).to.be(postData.updated);
                    done();
                });
            });
        });
    });

    describe('#delete', function(){
        var debug = dbgfn('test:workPosts:delete');
        it('should not delete post from another user', function(done){
            post.remove(postData + '/' + postData.id, otherUser).end(function(err, res){
                /* ToDo: check for explicit error code */
                expect(err).to.not.be(null);
                post.get(postData, user).end(done);
            });
        });
        it('should return success code', function(done){
            post.remove(postData, user).end(done);
        });
        it('should return 404 when deleting unexistent post', function(done){
            var failData = util.clone(postData);
            failData.url += 'fail';
            debug('deleting post: %s', failData.url + '/' + failData.id);
            post.remove(failData, user).end(function(err, res){
                /* ToDo: check for explicit error code */
                expect(err.toString()).to.not.be(null);
                done();
            });
        });
    });

});
    