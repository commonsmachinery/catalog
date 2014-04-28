'use strict';

var dbgfn = require('debug');
var config = require('../frontend/config.json').test;
var expect = require('expect.js');
var util = require('./modules/util');

var worksURL = config.base_url + '/works';
var sourcesURL;
var work = require('./modules/work');
var source = require('./modules/source');
var sources = require('./modules/sources');

/* data we are going to use along the tests */
var sourcesData = [
    {
        resource: 'http://something.com/example.jpg'
    }, {
        resource: 'http://deviantart.com'
    }, {
        resource: 'http://tumblr.com'
    }
]; 
var workData = {};
var user = 'user';
var otherUser = 'otherUser';

describe('Sources', function(){

    it('should create a work', function(done){
        var debug = dbgfn('test:creating-a-work');
        workData.resource = worksURL;
        work.post(workData, user).end(done);
    });

    it('should return the source URIs', function(done){
        this.timeout(5000);
        var debug = dbgfn('test:populating-sources');
        sourcesURL = workData.resource + '/sources';
        debug('Creating %s sources', sourcesData.length);
        var curr = 0;
        var len = sourcesData.length;
        function create(){
            if(curr < len){
                sourcesData[curr].url = sourcesURL;
                source.post(sourcesData[curr], user).end(function(err, res){
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
        sources.get(sourcesURL, user).end(done);
    });
    it('should not get sources from private work', function(done){
        sources.get(sourcesURL, otherUser).end(function(err, res){
            expect(err.toString()).to.contain('expected 403');
            done();
        });
    });
});
    