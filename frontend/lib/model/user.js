/* Catalog web frontend - User model

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Authors: 
        Elsa Balderrama <elsa@commonsmachinery.se>

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

var db = require('../../../lib/mongo');
var config = require('../../../lib/config');

var schema = new db.Schema(
    {
        uid: {
            type: String,
            required: true,
            index: {
                unique: true
            }
        },
        uri: {
            type: String,
            required: true,
            index: {
                unique: true
            }
        },
        emails: {
            type: [String],
            required: true,
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
        autoIndex: config.catalog.usersAutoIndex === "true",
    }
);

// None for now
//schema.methods({
//});

module.exports = db.model('User', schema);
