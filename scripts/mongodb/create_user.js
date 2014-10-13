#!/usr/bin/env node

'use strict';

// Create a user in a MongoDB database.  Only predefined user names
// are supported, see the list below.

// The admin user must be the first created in the database, since the
// localhost exception is disabled afterwards.  See
// http://docs.mongodb.org/manual/core/authentication/#localhost-exception


var config = require('../../lib/config');

// Map user names to roles
var users = {
    admin: [{
        role: "userAdminAnyDatabase",
        db: "admin",
    }],

    // Limited access for index-only frontend
    index_fe: [
        {
            db: config.core.db,
            role: 'read'
        },
        {
            // Read-write to log lookups.  This could be tightened to
            // only allow event logging and no other changes, but then
            // we must create a role for that.  Good enough for now.
            db: config.search.db,
            role: 'readWrite',
        },
    ],

    // Full access to everything
    catalog: [
        {
            db: config.core.db,
            role: 'readWrite'
        },
        {
            db: config.search.db,
            role: 'readWrite'
        },
        {
            db: config.event.db,
            role: 'readWrite'
        },
    ]
};


if (process.argv.length !== 3) {
    console.error('Usage: %s %s USERNAME', process.argv[0], process.argv[1]);
    process.exit(1);
}

var user = process.argv[2];
var roles = users[user];
if (!roles) {
    console.error('Unknown user name: %s', user);
    console.error('Valid user names: %s', Object.getOwnPropertyNames(users).join(' '));
    process.exit(1);
}


var crypto = require('crypto');
var url = require('url');
var mongodb = require('mongodb');


// Get connection URL for admin database
var u = url.parse(config.mongodbURL, true);
u.pathname = '/admin';
var connectURL = url.format(u);

// Generate a 12-char password. replacing URL-sensitive chars
var buf = crypto.pseudoRandomBytes(9);
var pwd = buf.toString('base64').replace(/[+\/]/g, '.');

console.log('Connecting to: %s', connectURL);
mongodb.MongoClient.connect(connectURL, function(err, db) {
    if (err) {
        console.error(err);
        process.exit(1);
    }

    console.log('Creating user: %s', user);
    db.addUser(user, pwd, {roles: roles}, function(err) {
        if (err) {
            console.log('Error creating %s: %s', user, err);
            process.exit(1);
        }

        console.log('User created.');
        console.log('\nConnecting as %s:', user);

        // Add auth info to URL. search must be reset for query to be used
        u.search = null;
        u.query.authSource = 'admin';
        u.auth = user + ':' + pwd;
        console.log('URL: %s', url.format(u));
        console.log('CMD: mongo -u %s -p %s --authenticationDatabase admin', user, pwd);

        db.close(function(err) {
            if (err) {
                console.log('Error closing db connection: %s', err);
                process.exit(1);
            }

            process.exit(0);
        });
    });
});
