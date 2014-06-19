/* Catalog web frontend - Admin model

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Authors:
        Elsa Balderrama <elsa@commonsmachinery.se>

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

var crypto = require('crypto');
var db = require('../wrappers/mongo');
var config = require('../config');

var schema = new db.Schema(
    {
        username: {
            type: String,
            required: true,
            index: {
                unique: true
            }
        },
        password: {
            type: String,
            required: true,
            set: function(password) {
                this.salt = this.makeSalt();
                return this.encrypt(password);
            }
        },
        salt: {
            type: String,
            required: true,
        },
        locked: {
            type: Boolean,
            default: false
        }
    },

    // Options
    {
        autoIndex: config.autoIndex,
    }
);

schema.methods({
    authenticate: function(password) {
        return this.encrypt(password) === this.password;
    },

    encrypt: function(password) {
        return crypto.createHmac('sha1', this.salt).update(password).digest('hex');
    },

    makeSalt: function() {
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789?+=?*';
        var charLen = chars.length;
        var salt = [];
        var i;
        for(i=0; i < 11; i++ ){
            salt.push(chars[Math.floor(Math.random() * charLen + 1)]);
        }
        return salt.join('');
    }
});

module.exports = db.model('Admin', schema);
