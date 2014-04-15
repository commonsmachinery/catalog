/* Catalog web frontend - app

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Authors: 
        Peter Liljenberg <peter@commonsmachinery.se>
        Elsa Balderrama <elsa@commonsmachinery.se>

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

var debug = require('debug')('frontend:sessions');

var Promise = require('bluebird');
var express = require('express');

var cluster = require('./cluster');
var db = require('./wrappers/mongo');
//var persona = require('./persona');
var User = require('./model/user');

var env;
var dev, test;
var sessions;
var cluster;


var useTestAccount
  , checkUserSession
  , loginScreen
  , logout
  ;


//var adminPanel, check_dummy_session, checkSession, isLogged, kickUser, loginScreen, logout, newSession, newUser, prefix, setGroup, start_dummy_session, userLock;


function init (app, theCluster, sessionstore) {
    env = process.env;
    dev = env.NODE_ENV === 'development';
    test = env.NODE_ENV === 'test';

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

    // TODO: persona setup

    // Common session checks
    app.use(checkUserSession);


    /* ================================ Routes ================================ */

    /* Screens */
    app.get('/login', loginScreen);
//    app.get('/admin', adminPanel);

    // app.post('/lock', userLock);

    // Generic session logout - beware that these doesn't log out the
    // persona session, so perhaps they should not be allowed outside
    // dev?
    app.get('/logout', logout);
    app.del('/session', logout);

    if (dev) {
        // Handle test account logins by generating an email from the
        // provided username and then rerunning the normal session
        // code.
        app.post('/test/login',
                 function(req, res, next) {
                     var user = req.body.testuser;
                     if (/^[-_a-zA-Z0-9]+$/.test(user)) {
                         var email = user + '@test';
                         debug('test login from web: %s', email);
                         req.session.email = email;
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
                         res.redirect('/users/' + req.session.uid);
                     }
                     else {
                         res.redirect('/login');
                     }
                 });
    }
}

exports.init = init;


/*
 * Middleware on routes that require a valid user session to work
 */
function requireUser(req, res, next) {
    if (req.session && req.session.uid) {
        next();
    }
    else {
        res.send(401);
    }
}

exports.requireUser = requireUser;


/*
 * Internal middleware to allow simple auth in development mode for
 * special test accounts that are set with basic HTTP auth.  This will
 * set req.session.email, just like persona login would.
 *
 * To use, run: curl --user test: rest-of-command-line...
 */
function useTestAccount(req, res, next) {
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
}


/*
 * Middleware to ookup user from email, if necessary, and check that
 * the account isn't locked.  If it is, drop the session.
 */
function checkUserSession(req, res, next) {
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

        User.findOne({ email: email }).
            then(
                function(user) {
                    if (user) {
                        debug('found user %s from email %s', user.uid, email);
                        return Promise.resolve(user);
                    }
                    else {
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
                                        var user = new User({
                                            uid: newId,
                                            email: email,
                                        });

                                        user.save(function(err, savedUser) {
                                            if (err) {
                                                console.error('error saving new user: %s %j', err, user);
                                                reject(err);
                                            }
                                            else {
                                                resolve(user);
                                            }
                                        });
                                    });
                                }
                            );
                    }
                }
            ).then(
                function(user) {
                    debug('creating new session for user %s', user.uid);

                    if (user.locked) {
                        console.warning('removing session for locked user: %s', user.uid);
                        req.session.destroy();
                    }
                    else {
                        req.session.uid = user.uid;
                        res.locals.user = uid;
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
                        console.warning('removing session for locked user: %s', user.uid);
                        req.session.destroy();
                    }
                    else {
                        res.locals.user = user.uid;
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
}

/* ========================== REST Functions =============================== */

/* Screens */

function loginScreen (req, res) {
    res.setHeader('X-UA-Compatible', 'IE=Edge'); //requirement for persona
    var referer = req.headers.referer;
    var landing = !referer || referer.search(env.CATALOG_BASE_URL) < 0;

    if(!req.session.uid){
        res.render('login',{
            isDev: dev,
            landing: landing,
        });
    }
    else{
        res.redirect('/users/' + req.session.uid);
    }
    
    return;
}

/* for now it can kill sessions or lock users */
/*
function adminPanel (req, res){
    if(req.session.group === 'admin'){
        var q = req.query;
        Promise.join(
            sessions.all(
                {}, 
                q.sessOffset || 0, 
                q.sessLimit || 50
            ),
            User.find(null, null, {
                sort: {created: -1}, 
                skip: q.usrOffset || 0, 
                limit: q.usrLimit || 50
            })
        ).spread(
            function(sessions, users){
                res.render('adminPanel', {
                    sessions: sessions,
                    users: users
                });
            }, function(err){
                console.error(err);
            }
        );
    }
    else {
        res.redirect('/login');
    }
    return;
}
*/

/* Actions */

/*
function userLock (req, res) {

    if(req.session.group === 'admin'){
        var user = req.body.uid;

        User.findOneAndUpdate({uid: user}, {locked: req.body.lock})
        .then(
            function(){
                debug('user %s locked', user);
                res.send(200);
            }, function(err){
                console.error(err);
                res.send(500);
            }
        );
    }
    return;
}
*/

function logout (req, res) {
    req.session.destroy(); 
    res.send(204);
    return;
}


