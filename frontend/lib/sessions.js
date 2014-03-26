/* Catalog web frontend - app

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Authors: 
        Peter Liljenberg <peter@commonsmachinery.se>
        Elsa Balderrama <elsa@commonsmachinery.se>

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

var debug = require('debug')('frontend:sessions')
var User;
var env;
var dev, test;


var isLogged, loginScreen, logout, newSession, newUser, signupScreen; 

function init (app, express, db) {

    env = process.env;
    dev = env.NODE_ENV === 'development';
    test = env.NODE_ENV === 'test';

    var user = require('./userSchema');
    
    var userSchema = new db.Schema(user.schema);
    userSchema.method(user.methods);
    User = db.model('User', userSchema);

    /* ==================== Routes ==================== */

    /* Screens */
    app.get('/login', loginScreen);
    app.get('/signup', signupScreen);

    /* Actions */


    if(dev){
        app.post('/session', prefix, start_dummy_session);
        app.get('/session', check_dummy_session);
        app.post('/signup', prefix, newUser);
    }
    else if (test){
        app.post('/session', prefix, newSession);
        app.post('/signup', prefix, newUser);
    }
    else{
        app.post('/session', newSession);
        app.post('/signup', newUser);
    }

    app.del('/session', logout);
    
    return;
}

function checkSession(req, res, next) {

    var uid = req.session.uid;
    function respond(user){
        if (user) {
            req.locals.user = uid;
            req.locals.type = user.type || null;
            next();
        } 
        else {
            res.redirect('/login');
        }

        return;
    }

    if (uid) {
        User.findOne({uid: uid}).exec()
        .then(respond,
            function(err){
                console.error(err);
                return;
            }
        );
    } 
    else {
        res.redirect('/login');
    }

    return;
}

function prefix (req, res, next) {
    req.body.uid = 'test_' + req.body.uid;
    next();

    return;
}


/* ========================== REST Functions =============================== */

/* Screens */

function loginScreen (req, res) {
    res.render('login');
}

function signupScreen (req, res) {
    // body...
}

/* Actions */

function logout (req, res) {
    if (req.session) {
        debug('login %s out', req.session.uid);
        req.session.destroy();
    }
    res.redirect('/login');
}

function newSession (req, res) {

    var uid = req.body.uid;
    var pass = req.body.pass;

    function respond (user) {
        debug('new session: %s', user);
        if (user && user.authenticate(pass)) {
            req.session.uid = user.uid;
            res.redirect('/users/' + req.session.uid);
        } 
        else {
            res.redirect('/login');
        }

        return;
    }

    User.findOne({uid: uid}).exec()
    .then(respond,
        function(err){
            console.error(err);
            return;
        }
    );

    return;
}

function newUser (req, res) {
    var user = new User({
        uid: req.body.uid,
        hash: req.body.pass
    });
    user.save(function(err){
        newSession(req, res);
        return;
    });
    return;
}

/* ======================== Dummies ===================== */

function start_dummy_session (req, res) {

    var uid = req.body.uid;
    debug('starting new session...');
    function respond (user) {
        debug('new session: %s', uid);

        if (user) {
            debug('user %s is registered', user);
            req.session.uid = user.uid;
            res.redirect('/users/' + user.uid);
        } 
        else {
            debug('user is not registered, started dummy session');
            req.session.uid = uid;
            res.redirect('/users/' + '_test_dummy');
        }

        return;
    }

    User.findOne({uid: uid}).exec()
    .then(respond,
        function(err) {
            console.error(err);
            return;
        }
    );

    return;
}

function check_dummy_session(req, res, next){

    var uid;
    function respond(user){
        if (user) {
            debug('user is logged in and registered.');
            req.locals.user = uid;
            req.locals.type = user.type || null;
            next();
        } 
        else {
            debug('user is running a dummy session.')
            req.locals.user = uid;
            next();
        }

        return;
    }

    if (req.session && req.session.uid) {
        debug('checking session for user: %s...', uid);
        uid = req.session.uid
        User.findOne({uid: uid}).exec()
        .then(respond, 
            function(err){
                console.error(err);
                return;
            }
        );
    } 
    else {
        debug('there is no session running for this user.')
        res.redirect('/login');
    }

    return;
}


module.exports.start = init;
if(dev){
    module.exports.checkSession = check_dummy_session;
}
else {
    module.exports.checkSession = checkSession;
}