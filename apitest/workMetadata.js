'use strict';

var dbgfn = require('debug');
var config = require('../lib/config.js');
var expect = require('expect.js');
var util = require('./modules/util');

var worksURL = config.catalog.baseURL + '/works';
var work = require('./modules/work');
var metadata = require('./modules/workMetadata');

/* data we are going to use along the tests */
var workData = {};
var user = 'user';
var otherUser = 'otherUser';

describe('Work metadata', function(){

    it('should create a work', function(done){
        var debug = dbgfn('test:creating-a-work');
        workData.resource = worksURL;
        work.post(workData, user).end(done);
    });

    it('should get work metadata', function(done){
        var debug = dbgfn('test:getting-metadata');
        metadata.get(workData, user).end(done);
    });
});

