'use strict';

/* Test rest work browsing features */

var dbgfn = require('debug');
var config = require('../lib/config.js');
var expect = require('expect.js');
var util = require('./modules/util');

var baseURL = config.catalog.baseURL + '/works';
var work = require('./modules/work');
var works = require('./modules/works');

/* data we are going to use along the tests */
var data = [
    {
        visible: 'private',
        state: 'published'
    }, {
        visible: 'public',
        state: 'draft'
    }, {
        visible: 'public',
        state: 'published'
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
        this.timeout(5000);
        var debug = dbgfn('test:populating-works');
        debug('Creating %s works', data.length);
        var curr = 0;
        var len = data.length;
        function create(){
            if(curr < len){
                data[curr].resource = baseURL;
                work.post(data[curr], user).end(function(err, res){
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

    /* Since creator is not the same as uid, we need to get the user assigned by the server to compare */
    it('should get user id', function(done){
        work.get(data[0], user).end(done);
    });

    it('should get all owned and public works', function(done){
        works.get(baseURL, '', user, data[0].creator).end(done);
    });
    it('should return only public works', function(done){
        works.get(baseURL, '', otherUser).end(done);
    });
    var filter = 'state=draft';
    it('should filter by: ' + filter, function(done){
        works.get(baseURL, filter, user, data[0].creator).end(done);
    });

});

