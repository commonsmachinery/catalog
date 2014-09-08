/*
 * Catalog API test - request transformations
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 *
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

/* global describe, it, before, after */

'use strict';

var debug = require('debug')('catalog:apitest:search');

// External libs
var request = require('supertest');
var expect = require('expect.js');
var parseLinks = require('parse-links');
var url = require('url');

// Common libs
var config = require('../lib/config');

// Apitest libs
var util = require('./lib/util');


describe('Search', function() {
    it('should require uri parameter', function(done) {
        var req = request(config.frontend.baseURL);
        req.get('/lookup/uri')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .expect(400)
            .end(done);
    });
});
