
'use strict';

var request = require('supertest')('');
var expect = require('expect.js');
var util = require('./util');

var exports = module.exports;


exports.get = function get(path, filter, user){
    return request.get(path + filter)
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
            if(work.creator != user){
                expect(work.visibility).to.not.be('private');
            }
            if(filter){
                for(var j in filter){
                    expect(work[j]).to.be(filter[j])
                }
            }
        }
    });
}
