'use strict';

/* Test rest work browsing features */

var dbgfn = require('debug');
var config = require('../frontend/config.json').test;
var expect = require('expect.js');
var util = require('./modules/util');

var worksURL = config.base_url + '/works';
var postsURL;
var work = require('./modules/work');
var post = require('./modules/post');
var posts = require('./modules/posts');

/* data we are going to use along the tests */
var postsData = [
    {
        resource: 'http://something.com'
    }, {
        resource: 'http://deviantart.com'
    }, {
        resource: 'http://tumblr.com'
    }
]; 
var workData = {};
var user = 'user';
var otherUser = 'otherUser';

describe('Posts', function(){

    it('should create a work', function(done){
        var debug = dbgfn('test:creating-a-work');
        workData.resource = worksURL;
        work.post(workData, user).end(done);
    });

    it('should return the post URIs', function(done){
        this.timeout(5000);
        var debug = dbgfn('test:populating-posts');
        postsURL = workData.resource + '/posts';
        debug('Creating %s posts', postsData.length);
        var curr = 0;
        var len = postsData.length;
        function create(){
            if(curr < len){
                postsData[curr].url = postsURL;
                post.post(postsData[curr], user).end(function(err, res){
                    expect(err).to.be(null);
                    curr++;
                    debug(curr);
                    create();
                });
            }
            else{
                done();
            }
        }
        create();
    });

    it('should get sources', function(done){
        posts.get(postsURL, user).end(done);
    });
    it('should not get sources from private work', function(done){
        posts.get(postsURL, otherUser).end(function(err, res){
            expect(err.toString()).to.contain('expected 403');
            done();
        });
    });
});
    