/* Catalog web frontend - app

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Authors: 
        Peter Liljenberg <peter@commonsmachinery.se>
        Elsa Balderrama <elsa@commonsmachinery.se>

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

var debug = require('debug')('frontend:sessions');
var csrf = require('./csrf');
var persona = require('./persona');
var User;
var env;
var dev, test;
var sessions;


var isLogged, loginScreen, logout, newSession, newUser, loginScreen; 

function init (app, express, db, sessionstore) {
    sessions = sessionstore;
    env = process.env;
    dev = env.NODE_ENV === 'development';
    test = env.NODE_ENV === 'test';

    app.use(function(req, res, next){
        res.locals.logged = req.session.uid;
        next();
        return;
    });

    var user = require('./userSchema');
    
    var userSchema = new db.Schema(user.schema,{autoIndex: env.CATALOG_USERS_AUTOINDEX});
    userSchema.method(user.methods);
    User = db.model('User', userSchema);

    /* ==================== Routes ==================== */

    /* Screens */
    app.get('/login', csrf.setToken, loginScreen);

    /* Actions */

    if(dev){
        app.post('/session', prefix, start_dummy_session);
        app.get('/session', check_dummy_session);
        app.post('/signup', prefix, newUser);
    }
    else if (test){
        app.post('/session', prefix, csrf.check, newSession);
        app.post('/signup', prefix, csrf.check, newUser);
    }
    else{
        app.post('/session', csrf.check, newSession);
        app.post('/signup', csrf.check, newUser);
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
    console.log(res.locals.logged);
    res.setHeader('X-UA-Compatible', 'IE=Edge'); //requirement for persona
    var referer = req.headers.referer;
    var landing = !referer || referer.search(env.CATALOG_BASE_URL) < 0;

    res.render('login',{
        landing: landing,
        token: req.session.token
    });
}

/* Actions */

function logout (req, res) {
    var session = req.session.id;
    sessions.all(function(all){
        console.log(all);
    });
    sessions.get(session, function(err, data){
        if(err){
            console.log(err);
        }
        else{
            sessions.destroy(session);
        }
        res.redirect('/login');
        return;
    });
    return;
}

function newSession (req, res) {
    var uid = req.body.uid;
    debug('starting new session...');

    function respond (user) {
        uid = user.uid;
        if (user) {
            req.session.uid = uid;
            req.session.group = user.group;
            sessions.set(uid, req.session);
            res.send(uid);
        } 
        else {
            res.redirect('/login');
        }

        return;
    }

    function findUser (param) {
        User.findOne(param).exec()
        .then(respond,
            function(err){
                console.error(err);
                res.send('403');
                return;
            }
        );
    }

    if(req.body.provider == 'persona'){
       persona.verify(req.body.assertion)
       .then(
            function(email){
                findUser({email:email});
                return;
            }, function(err){
                res.send('403');
                return;
            }
        );
       return;
    }

    findUser({uid:uid});

    return;
}

function newUser (req, res) {
    var uid = req.body.uid;
    var provider = req.body.provider;

    if (provider == 'persona'){
        persona.verify(req.body.assertion)
        .then(
            function(email){
                var user = new User({
                    uid: uid,
                    email: email,
                    provider: provider
                });
                user.save(function(err){
                    if (err){
                        console.error(err);
                        res.send('403');
                        return;
                    }
                    newSession(req, res);
                    return;
                });
                return;
            }, function(err){
                res.send('403');
                return;
            }
        );
        return;
    }
    if(uid && req.body.pass){
        var user = new User({
            uid: uid,
            hash: req.body.pass
        });
        user.save(function(err){
            if (err){
                console.error(err);
                res.send('403');
                return;
            }
            newSession(req, res);
            return;
        });
    }
    
    return;
}

/* ======================== Dummies ===================== */

function start_dummy_session (req, res) {
    var uid = req.body.uid;
    debug('starting new session...');

    function respond (user) {
        uid = user.uid;
        debug('new session: %s', uid);

        if (user) {
            debug('user %s is registered', uid);
            req.session.uid = uid;
            req.session.group = user.group;
            sessions.set(req.session.id, req.session);
            res.send(uid);
        } 
        else {
            debug('user is not registered, started dummy session');
            req.session.uid = uid;
            res.redirect('/users/' + '_test_dummy');
        }

        return;
    }
    function findUser (param) {
        var promise = User.findOne(param).exec();
        promise.then(respond,
            function(err) {
                console.error(err);
                return;
            }
        );
    }

    if(req.body.provider == 'persona'){
       persona.verify(req.body.assertion)
       .then(
            function(email){
                findUser({email:email});
                return;
            }, function(err){
                res.send('403');
                return;
            }
        );
    }
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

    if (session && session.uid) {
        debug('checking session for user: %s...', uid);
        uid = session.uid
        User.findOne({uid: uid}).exec()
        .then(respond, 
            function(err){
                console.error(err);
                res.send('403');
                return;
            }
        );
        return;
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