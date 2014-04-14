/* Catalog web frontend - Admin model

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Authors:
        Elsa Balderrama <elsa@commonsmachinery.se>

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

// TODO: this is just a placeholder for the password stuff from the
// user model while we decide how to handle frontend admin accounts

'use strict';

var db = require('../wrappers/mongo');

var schema = new db.Schema(
    {
        uid: {
            type: String,
            index: {
                unique: true
            }
        },
        email: {
            type: String,
            index: {
                unique: true
            }
        },
        hash: {
            type: String,
            set: function(password) {
                this.salt = this.makeSalt();
                return this.encrypt(password);
            }
        },
        salt: {
            type: String
        },
        created: {
            type: Date,
            default: Date.now()
        },
        locked: {
            type: Boolean,
            default: false
        }
    },

    // Options
    {
        autoIndex: process.env.CATALOG_USERS_AUTOINDEX
    },
);

schema.methods({
    authenticate: function(string) {
        return this.encrypt(string) === this.hash;
    },

    encrypt: function(string) {
        return crypto.createHmac('sha1', this.salt).update(string).digest('hex');
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
