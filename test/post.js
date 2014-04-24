'use strict';

/* Test rest work browsing features */

var dbgfn = require('debug');
var config = require('../frontend/config.json').test;
var expect = require('expect.js');
var util = require('./modules/util');

var baseURL = config.base_url + '/works';
var work = require('./modules/work');
var post = require('./modules/post');
work.setPath(baseURL);

/* data we are going to use along the tests */
var workData = {
    visibility: 'private',
    status: 'published'
}; 
var postData = {};

var user = 'user';
var otherUser = 'otherUser';

describe('Post', function(){

    it('should create a work', function(done){
        var debug = dbgfn('test:creating-work');
        work.post(workData, user).end(function(err, res){
            expect(err).to.be(null);
            post.setPath(workData.resource + '/posts');
        });
    });

    describe('#post', function(){
        it('should return post URI', function(done){
            post.post(postData, user);
        });
    });

    describe('#get', function(){
        it('should return the post', function(done){
            post.get(postData, user);
        });
    });

    describe('#put', function(){
        it('should return the updated post', function(done){
            post.put(postData, user);
        });
    });

    describe('#delete', function(){
        it('should return success code', function(done){
            post.delete(postData, user);
        });
    });

});
    