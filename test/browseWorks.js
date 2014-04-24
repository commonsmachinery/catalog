'use strict';

/* Test rest work browsing features */

var dbgfn = require('debug');
var config = require('../frontend/config.json').test;
var app = require('express')();
var request = require('supertest')(config.base_url);
var expect = require('expect.js');

/* Make a shallow clone of the object */
var clone = function clone(obj){
    var extend = require('util')._extend;
    return extend({}, obj);
}


var baseURL = config.base_url;
var work = require('./unit/work');

/* data we are going to use along the tests */
var data = [{
    visibility: 'private',
    status: 'published'
}, {
    visibility: 'public',
    status: 'inprogress'
}, {
    visibility: 'public',
    status: 'public'
}]; 
var user = 'user';

describe('Works', function(){

    describe('#populate', function(){
        var debug = dbgfn('test:populatingWorks');
        var created = 0;
        var len = data.length;
        it('should return the work URIs', function(done){
            for (var i = 0; i < len; i++){
                work.post(data[i], user).end(function(err, res){
                    expect(err).to.be(null);
                    created++;
                    if(created == len){
                        done();
                    }
                });
            }
        });
        it('should return all works to the owner', function(done){
            works.get(data, user).end(done);
        });
        it('should return only public works', function(done){
            works.get(data, user).end(done);
        });

    });
});

    