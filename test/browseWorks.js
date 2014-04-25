'use strict';

/* Test rest work browsing features */

var dbgfn = require('debug');
var config = require('../frontend/config.json').test;
var expect = require('expect.js');
var util = require('./modules/util');

var baseURL = config.base_url + '/works';
var work = require('./modules/work');
var works = require('./modules/works');

/* data we are going to use along the tests */
var data = [
    {
        visibility: 'private',
        status: 'published'
    }, {
        visibility: 'public',
        status: 'inprogress'
    }, {
        visibility: 'public',
        status: 'public'
    }
]; 
var user = 'user';
var otherUser = 'otherUser';

describe('Works', function(){

/* Server fails to process these */
// describe('#populate', function(){
//     var debug = dbgfn('test:populatingWorks');
//     var created = 0;
//     var len = data.length;
//     it('should return the work URIs', function(done){
//         for (var i = 0; i < len; i++){
//             work.post(data[i], user).end(function(err, res){
//                 expect(err).to.be(null);
//                 created++;
//                 if(created == len){
//                     done();
//                 }
//             });
//         }
//     });

    it('should return the work URIs', function(done){
        var debug = dbgfn('test:populating-works');
        debug('Creating %s works', data.length);
        var created = 0;
        var len = data.length;
        function create(){
            data.resource = baseURL;
            work.post(data, user).end(function(err, res){
                expect(err).to.be(null);
                created++;
                if(created == len){
                    done();
                }
                else{
                    create();
                }
            });
        }
        create();
    });

    it('should get all owned and public works', function(done){
        works.get(baseURL, '', user).end(done);
    });
    it('should return only public works', function(done){
        works.get(baseURL, '', otherUser).end(done);
    });
    var filter = '?status=inprogress'
    it('should filter by: ' + filter, function(done){
        works.get(baseURL, filter, user).end(done);
    });

});
    