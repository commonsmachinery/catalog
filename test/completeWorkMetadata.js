'use strict';

var dbgfn = require('debug');
var config = require('../frontend/config.json').test;
var expect = require('expect.js');
var util = require('./modules/util');

var worksURL = config.base_url + '/works';
var work = require('./modules/work');
var source = require('./modules/source');
var metadata = require('./modules/completeWorkMetadata');

/* data we are going to use along the tests */
var sourceData = {
    resource: 'http://something.com/example.jpg'
}; 
var workData = {};
var user = 'user';
var otherUser = 'otherUser';

describe('Complete work metadata', function(){

    it('should create a work', function(done){
        var debug = dbgfn('test:creating-a-work');
        workData.resource = worksURL;
        work.post(workData, user).end(done);
    });

    it('should create a source', function(done){
        var debug = dbgfn('test:creating-a-source');
        sourceData.url = workData.resource + '/sources';
        source.post(sourceData, user).end(done);
    });

    it('should get source metadata', function(done){
        var debug = dbgfn('test:getting-metadata');
        metadata.get(workData, user).end(function(err, res){
            expect(err).to.be(null);
            expect(res.sources[0].resource).to.contain(sourceData.resource);
            done();
        });
    });
});
    