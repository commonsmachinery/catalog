/* Catalog web frontend - app

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

var debug = require('debug')('catalog:frontend:sessions');

// External modules
var url = require('url');
var Promise = require('bluebird');
var expressSession = require('express-session');
var persona = require('express-persona');

// Common modules
var config = require('../../lib/config');

var core = require('../../modules/core/core');

// Frontend modules

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
exports.init = function init(app, sessionstore, db) {
    env = process.env;
    dev = env.NODE_ENV === 'development';
    test = env.NODE_ENV === 'test';

    // We can load the User model now that mongodb is connected
    User = require('./model/user')(db);

    /* Session middlewares */
    sessions = sessionstore;
    app.use(expressSession({
        secret: config.frontend.secret,
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

        User.findOneAsync({ emails: email })
            .then(
                function(user) {
                    if (user) {
                        debug('found user %s from email %s', user.id, email);

                        if (user.locked) {
                            // TODO: throw UserLockedError instead
                        }

                        return Promise.resolve(user);
                    }

                    debug('creating new user for %s', email);

                    return new Promise(function(resolve, reject) {
                        var newUser = new User({
                            emails: [email],
                        });

                        newUser.save(function(err, savedUser, affected) {
                            if (err) {
                                console.error('error saving new user: %s %j', err, newUser);
                                reject(err);
                            }
                            else {
                                resolve(savedUser);
                            }
                        });
                    });
                })
            .then(
                function(authUser) {
                    // Ensure that we have a core.User too
                    return core.get_user({ userId: authUser.id }, authUser.id)
                        .catch(
                            core.UserNotFoundError,
                            function (err) {
                                debug('creating new core.User for %j', authUser);
                                return core.create_user(
                                    { userId: authUser.id },
                                    { _id: authUser.id });
                            })
                        .then(function(coreUser) {
                            return [authUser, coreUser];
                        });
                })
            .spread(
                function(authUser, coreUser) {
                    debug('creating new session for user %s', authUser.id);
                    req.session.uid = authUser.id;

                    req.session.gravatarHash = coreUser.profile.gravatar_hash;

                    // TEST CODE: trigger an update, not really
                    // bothering about the result.
                    core.update_user(
                        { userId: authUser.id },
                        coreUser.id,
                        { alias: "test" })
                        .then(debug);

                    // Proceed to whatever the request is supposed to do
                    next();
                })
            .catch(
                function(err) {
                    console.error('error looking up/creating user from email %s: %s', email, err);
                    res.send(500, dev ? err.stack : '');
                })
            .done();
    }
    else {
        // Just check that the user isn't locked

        User.findByIdAsync(uid)
            .then(
                function(user) {
                    if (user.locked) {
                        // TODO: throw UserLockedError instead
                    }

                    // Proceed to whatever the request is supposed to do
                    next();
                })
            .catch(
                function(err) {
                    console.error('error looking up user from uid %s: %s', uid, err);
                    res.send(500, dev ? err.stack : '');
                })
            .done();
    }
};


setLocals = function setLocals(req, res, next) {
    if (req.session) {
        var locals = res.locals;
        locals.user =  req.session.uid;
        locals.loginEmail = req.session.email;
        locals.loginType = req.session.loginType;
        locals.url = req.url;
        locals.loginGravatarHash = req.session.gravatarHash;
    }
    next();
};


/*
 * Return the Persona audience URL that corresponds to the catalog
 * base URL
 */
personaAudience = function personaAudience() {
    var u = url.parse(config.frontend.baseURL);
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
    var landing = !referer || referer.search(config.frontend.baseURL) < 0;

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


