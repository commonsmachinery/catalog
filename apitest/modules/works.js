
'use strict';

var request = require('supertest')('');
var expect = require('expect.js');
var util = require('./util');
var querystring = require('querystring');

var exports = module.exports;


exports.get = function get(path, filter, user, uid){
    return request.get(path + '?' + filter)
    .set('Accept', 'application/json')
    .set('Authorization', util.auth(user))
    .expect(function(res){
        expect(res.status).to.be(200);
        filter = querystring.parse(filter);
        var works = res.body;
        var len = works.length;
        var work;
        for(var i=0; i<len; i++){
            work = works[i];
            if(work.visible === 'private'){
                expect(work.creator).to.be(uid);
            }
            if(filter){
                for(var j in filter){
					if (filter.hasOwnProperty(j)) {
						expect(work[j]).to.be(filter[j]);
					}
                }
            }
        }
    });
};
