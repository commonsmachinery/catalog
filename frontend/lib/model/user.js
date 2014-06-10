/* Catalog web frontend - User model

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

var mongo = require('../../../lib/mongo');
var config = require('../../../lib/config');

var schema = new mongo.Schema(
    {
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
        autoIndex: config.autoIndex,
    }
);

// None for now
//schema.methods({
//});

module.exports = function(db) {
    return db.model('User', schema);
};

