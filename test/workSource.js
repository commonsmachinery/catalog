'use strict';

/* Test rest work browsing features */

var dbgfn = require('debug');
var config = require('../frontend/config.json').test;
var expect = require('expect.js');
var util = require('./modules/util');

var baseURL = config.base_url + '/works';
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
        var debug = dbgfn('test:creating-work');
        workData.resource = baseURL;
        work.post(workData, user).end(function(err, res){
            expect(err).to.be(null);
            source.setPath(workData.resource + '/sources');
        });
    });

    describe('#post', function(){
        it('should return source URI', function(done){
            source.post(sourceData, user);
        });
    });

    describe('#get', function(){
        it('should return the source', function(done){
            source.get(sourceData, user);
        });
    });

    describe('#put', function(){
        it('should return the updated source', function(done){
            source.put(sourceData, user);
        });
    });

    describe('#delete', function(){
        it('should return success code', function(done){
            source.delete(sourceData, user);
        });
    });

});
    