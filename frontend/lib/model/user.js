/* Catalog web frontend - User model

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Authors: 
        Elsa Balderrama <elsa@commonsmachinery.se>

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

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
        created: {
            type: Date,
            default: Date.now
        },
        locked: {
            type: Boolean,
            default: false
        },
    },

    // Options
    {
        autoIndex: process.env.CATALOG_USERS_AUTOINDEX
    }
);

// None for now
//schema.methods({
//});

module.exports = db.model('User', schema);
