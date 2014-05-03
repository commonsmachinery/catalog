/* Catalog web frontend - app

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Authors: 
        Peter Liljenberg <peter@commonsmachinery.se>
        Elsa Balderrama <elsa@commonsmachinery.se>

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

var debug = require('debug')('frontend:sessions');

var url = require('url');
var Promise = require('bluebird');
var express = require('express');
var persona = require('express-persona');

var cluster = require('./cluster');
var uris = require('./uris');

/* Module globals */
var env;
var dev, test;
var sessions;
var User;

/* Functions defined later */
var useTestAccount,
	checkUserSession,
	setLocals,
	personaAudience,
	loginScreen,
	logout;


/*
 * Set up middlewares for session management.
 */
exports.init = function init(app, sessionstore) {
    env = process.env;
    dev = env.NODE_ENV === 'development';
    test = env.NODE_ENV === 'test';

    // We can load the User model now that mongodb is connected
    User = require('./model/user');

    /* Session middlewares */
    sessions = sessionstore;
    app.use(express.session({
        secret: env.CATALOG_SECRET,
        store: sessionstore
    }));

    if (dev) {
        // Allow account creation/login with simple HTTP basic auth
        app.use(useTestAccount);
    }

    // Common session checks
    app.use(checkUserSession);
    app.use(setLocals);
};


/*
 * Setup routes for session management.
 */
exports.routes = function routes(app) {
    // AJAX Persona routes
    persona(app, {
        audience: personaAudience(),
        middleware: function(req, res, next) {
            req.session.loginType = 'persona';
            next();
        },
    });

    /* Screens */
    app.get('/login', loginScreen);

    if (dev) {
        // Handle test account logins by generating an email from the
        // provided username and then rerunning the normal session
        // code.
        app.post('/test/login',
                 function(req, res, next) {
                     var user = req.body.testuser;
                     if (/^[\-_a-zA-Z0-9]+$/.test(user)) {
                         var email = user + '@test';
                         debug('test login from web: %s', email);
                         req.session.email = email;
                         req.session.loginType = 'test';
                     }
                     else {
                         debug('invalid test user name: %s', user);
                         req.session.destroy();
                     }
                     next();
                 },
                 checkUserSession,
                 function(req, res) {
                     if (req.session && req.session.uid) {
                         res.redirect('/');
                     }
                     else {
                         res.redirect('/login');
                     }
                 });

        app.all('/test/logout', logout);
    }
};


/*
 * Middleware on routes that require a valid user session to work
 */
exports.requireUser = function requireUser(req, res, next) {
    if (req.session && req.session.uid) {
        next();
    }
    else {
        res.send(401);
    }
};


/*
 * Internal middleware to allow simple auth in development mode for
 * special test accounts that are set with basic HTTP auth.  This will
 * set req.session.email, just like persona login would.
 *
 * To use, run: curl --user test: rest-of-command-line...
 */
useTestAccount = function useTestAccount(req, res, next) {
    var auth, encoded, buf, len, decoded, nameLen, email;

    // Simple basic auth implementation to dig out username
    auth = req.get('Authorization');

    if (auth) {
        if (auth.indexOf('Basic ') === 0) {
            encoded = auth.slice(6);
            buf = new Buffer(encoded.length);
            len = buf.write(encoded, 0, encoded.length, 'base64');
            decoded = buf.toString('utf8', 0, len);

            nameLen = decoded.indexOf(':');

            if (nameLen > 0) {
                email = decoded.slice(0, nameLen) + '@test';

                debug('got email from basic auth: %s', email);

                if ((req.session && req.session.email) !== email) {
                    debug('changing test session to %s', email);

                    // By dropping uid checkSession will load or
                    // create a user accounts, as necessary
                    req.session.uid = null;
                    req.session.email = email;
                }

                // Let checkSession take over
                return next();
            }
        }

        console.error("can't parse test Authorization header: %s", auth);
    }

    // Always fall through to let regular session handling do it's job
    next();
};


/*
 * Middleware to ookup user from email, if necessary, and check that
 * the account isn't locked.  If it is, drop the session.
 */
checkUserSession = function checkUserSession(req, res, next) {
    var uid = req.session && req.session.uid;
    var email = req.session && req.session.email;

    if (!email) {
        // No valid session without an email, reset just to be sure
        if (req.session) {
            req.session.uid = null;
        }
        return next();
    }

    if (!uid) {
        // Look up user from email, or create one if necessary

        User.findOne({ emails: email }).
            then(
                function(user) {
                    if (user) {
                        debug('found user %s from email %s', user.uid, email);
                        return Promise.resolve(user);
                    }

                    return cluster.increment('next-user-id').
                        then(
                            function(newId) {
                                // Reduce the risk of overlapping accounts by
                                // having prefixes on the dev and test accounts
                                if (dev) {
                                    newId = 'dev_' + newId;
                                }
                                else if (dev) {
                                    newId = 'test_' + newId;
                                }

                                debug('creating new user with id %s for %s', newId, email);

                                return new Promise(function(resolve, reject) {
                                    var newUser = new User({
                                        uid: newId,
                                        uri: uris.buildUserURI(newId),
                                        emails: [email],
                                    });

                                    newUser.save(function(err, savedUser, affected) {
                                        if (err) {
                                            console.error('error saving new user: %s %j', err, newUser);
                                            reject(err);
                                        }
                                        else {
                                            if (affected > 0) {
                                                // the uniqueness on uid should ensure that
                                                // this never happens, but can't-happens have
                                                // a tendency to happen.
                                                console.error('overwrote existing user with %j', savedUser);
                                            }

                                            resolve(savedUser);
                                        }
                                    });
                                });
                            }
                        );
                }
            ).then(
                function(user) {
                    debug('creating new session for user %s', user.uid);

                    if (user.locked) {
                        console.warn('removing session for locked user: %s', user.uid);
                        req.session.destroy();
                    }
                    else {
                        req.session.uid = user.uid;
                    }

                    // Proceed to whatever the request is supposed to do
                    next();
                }
            ).catch(
                function(err) {
                    console.error('error looking up/creating user from email %s: %s', email, err);
                    res.send(500, dev ? err.stack : '');
                }
            ).done();
    }
    else {
        // Just check that the user isn't locked

        User.findOne({ uid: uid }).
            then(
                function(user) {
                    if (user.locked) {
                        console.warn('removing session for locked user: %s', user.uid);
                        req.session.destroy();
                    }

                    // Proceed to whatever the request is supposed to do
                    next();
                }
            ).catch(
                function(err) {
                    console.error('error looking up user from uid %s: %s', uid, err);
                    res.send(500, dev ? err.stack : '');
                }
            ).done();
    }
};


setLocals = function setLocals(req, res, next) {
    if (req.session) {
        res.locals({
            user: req.session.uid,
            loginEmail: req.session.email,
            loginType: req.session.loginType,
            url: req.url

        });
    }
    next();
};


/*
 * Return the Persona audience URL that corresponds to the catalog
 * base URL
 */
personaAudience = function personaAudience() {
    var u = url.parse(env.CATALOG_BASE_URL);
    var port = u.port;
    var audience;

    if (!port) {
        port = u.protocol === 'https:' ? 443 : 80;
    }

    audience = u.protocol + '//' + u.hostname + ':' + port;
    debug('using persona audience: %s', audience);

    return audience;
};



/* ========================== REST Functions =============================== */

/* Screens */

loginScreen = function loginScreen (req, res) {
    res.setHeader('X-UA-Compatible', 'IE=Edge'); //requirement for persona
    var referer = req.headers.referer;
    var landing = !referer || referer.search(env.CATALOG_BASE_URL) < 0;

    if (!req.session.uid){
        res.render('login',{
            isDev: dev,
            landing: landing,
        });
    }
    else {
        res.redirect('/');
    }
    
    return;
};


logout = function logout (req, res) {
    req.session.destroy(); 
    res.redirect('/');
    return;
};


