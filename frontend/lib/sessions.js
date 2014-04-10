/* Catalog web frontend - app

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Authors: 
        Peter Liljenberg <peter@commonsmachinery.se>
        Elsa Balderrama <elsa@commonsmachinery.se>

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

var debug = require('debug')('frontend:sessions');
var persona = require('./persona');
var Promise = require('bluebird');
var User;
var env;
var dev, test;
var sessions;


var adminPanel, check_dummy_session, checkSession, isLogged, kickUser, loginScreen, logout, newSession, newUser, prefix, setGroup, start_dummy_session, userLock; 


function init (app, sessionstore) {

    var db = require('./wrappers/mongo');
    var express = require('express');

    env = process.env;
    dev = env.NODE_ENV === 'development';
    test = env.NODE_ENV === 'test';

    /* Session middlewares */
    sessions = sessionstore;
    app.use(express.session({
        secret: env.CATALOG_SECRET,
        store: sessionstore
    }));
    if(dev){
        app.use(check_dummy_session);
    }
    else {
        app.use(checkSession);
    }

    var user = require('./userSchema');

    var userSchema = new db.Schema(user.schema,{autoIndex: env.CATALOG_USERS_AUTOINDEX});
    userSchema.method(user.methods);
    User = db.model('User', userSchema);

    /* ================================ Routes ================================ */

    /* Screens */
    app.get('/login', loginScreen);
    app.get('/admin', adminPanel);

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

    app.post('/kick', kickUser);
    app.post('/lock', userLock);
    app.post('/setGroup', setGroup);
    app.del('/session', logout);
    
    return;
}


function checkSession(req, res, next) {
    var uid = req.session.uid;
    function respond(user){
        if (user) {
            if(user.locked) {
                debug('user is locked');
                notLogged();
            }
            else{
                res.locals.user = uid;
                res.locals.group = user.group || null;
                req.session.group = user.group || null;
                next();
            }
        } 
        else {
            notLogged();
        }

        return;
    }

    function notLogged(){
        if(req.method === 'GET' || req.path === '/session' || req.path === '/signup'){
            next();
        }
        else {
            res.redirect('/login');
        }
        return;
    }

    if (uid) {
        User.findOne({uid: uid})
        .then(respond,
            function(err){
                console.error(err);
                res.send(500);
            }
        );
    } 
    else{
        notLogged();
    }

    return;
}

/* ========================== REST Functions =============================== */

/* Screens */

function loginScreen (req, res) {
    res.setHeader('X-UA-Compatible', 'IE=Edge'); //requirement for persona
    var referer = req.headers.referer;
    var landing = !referer || referer.search(env.CATALOG_BASE_URL) < 0;

    if(!req.session.uid){
        res.render('login',{
            landing: landing,
        });
    }
    else{
        res.redirect('/users/' + req.session.uid);
    }
    
    return;
}

/* for now it can kill sessions or lock users */
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

/* Actions */

function kickUser (req, res) {

    function kick (array) {
        var len = array.length;
        var i;
        for (i = 0; i < len; i++){
            sessions.kick(array[i]._sessionid);
        }
        res.send(500);
        return;
    }

    if(req.session.group === 'admin'){
        var user = req.body.uid;

        sessions.all({uid: user})
        .then(kick, function(err){
            console.error(err);
            res.send(500);
        });
    }
    return;
}

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

function logout (req, res) {
    req.session.destroy(); 
    res.send(200);
    return;
}

/* for now setGroup can only be done by curl on dev mode. Otherwise, 
*  they need to be set by a DBA on mongo
*/
function setGroup (req, res) {

    var uid = req.body.uid;

    if(req.session.group === 'admin'){
        User.findOneAndUpdate({uid: uid}, {group: req.body.group})
        .then(
            function(user){
                debug('new admin: %s', uid);
                res.send(200);
            }, function(err){
                console.error('error updating user: %s', err);
                res.send(500);
            }
        );
    }
    else{
        res.redirect('/login');
    }
    return;
}

function newSession (req, res) {
    var uid = req.body.uid;
    var provider = env.CATALOG_AUTHENTICATION;
    var pass = req.body.pass;

    debug('starting new session...');

    function respond (user) {
        uid = user.uid;
        if(!provider && user && pass && user.authenticate(pass)){
            req.session.uid = uid;
            req.session.group = user.group;
            res.send(uid);
        }
        else if (provider === 'persona' && user) {
            uid = req.body.uid;
            req.session.uid = uid;
            req.session.group = user.group;
            res.send(200, uid);
        } 
        else {
            res.redirect('/login');
        }
        return;
    }

    function findUser (param) {
        User.findOne(param)
        .then(respond,
            function(err){
                console.error(err);
                res.send(500);
            }
        );
    }

    if(provider === 'persona'){
       persona.verify(req.body.assertion)
       .then(
            function(email){
                findUser({email:email});
            }, function(err){
                res.send(403);
            }
        );
    }
    else {
        findUser({uid:uid});
    }
    
    return;
}

function newUser (req, res) {
    var uid = req.body.uid;
    var provider = env.CATALOG_AUTHENTICATION;

    if (provider === 'persona'){
        persona.verify(req.body.assertion)
        .then(
            function(email){
                var user = new User({
                    uid: uid,
                    email: email,
                    provider: provider,
                    group: req.body.group || null
                });
                user.save(function(err){
                    if (err){
                        console.error(err);
                        res.send(500);
                    }
                    else{
                        newSession(req, res);
                    }
                });
            }, function(err){
                res.send(403);
            }
        );
    }
    else if(!provider && uid && req.body.pass){
        var user = new User({
            uid: uid,
            hash: req.body.pass,
            group: req.body.group || null
        });
        user.save(function(err){
            if (err){
                console.error(err);
                res.send(500);
            }
            else {
                newSession(req, res);
            }
        });
    }
    return;
}



/* ======================== Dummies ===================== */

/* If running on dev/test mode, every username will be prefixed to
*  prevent accidents
*/
function prefix (req, res, next) {
    req.body.uid = 'test_' + req.body.uid;
    next();

    return;
}

/* If running dev mode, you can log in via a script with only a username 
*  which doesn't need to be previously registered
*/
function start_dummy_session (req, res) {
    var uid = req.body.uid;
    var provider = env.CATALOG_AUTHENTICATION;
    debug('starting new session...');

    function respond (user) {
        debug('new session: %s ', uid);

        if(user && req.body.pass && user.authenticate(pass)){
            req.session.uid = uid;
            req.session.group = user.group;
            res.send(uid);
        }
        else if (provider === 'persona' && user) {
            uid = user.uid;
            debug('user %s is registered', uid);
            req.session.uid = uid;
            req.session.group = user.group;
            res.send(uid);
        } 
        else {
            debug('user is not registered, started dummy session');
            req.session.uid = uid;
            res.send(uid);
        }

        return;
    }
    function findUser (param) {
        User.findOne(param)
        .then(respond,
            function(err) {
                console.error(err);
            }
        );
    }

    if(provider === 'persona'){
       persona.verify(req.body.assertion)
       .then(
            function(email){
                findUser({email:email});
            }, function(err){
                res.send(403);
            }
        );
    }
    else {
        findUser({uid: uid});
    }
    return;
}

/* if running in dev mode, checks your session and it doesn't matter if you are
*  registered or not unless you want to check as admin
*/
function check_dummy_session(req, res, next){
    var uid;
    function respond(user){
        if (user) {
            if(user.locked) {
                debug('user is locked.');
                res.send(403);
            }
            else{
                debug('user is logged in and registered.');
                res.locals.user = uid;
                res.locals.group = user.group || null;
                req.session.group = user.group || null;
                next();
            }
        } 
        else {
            debug('user is running a dummy session.');
            req.locals.user = uid;
            next();
        }
        return;
    }

    if (req.session && req.session.uid) {
        debug('checking session for user: %s...', uid);
        uid = req.session.uid;
        User.findOne({uid: uid})
        .then(respond, 
            function(err){
                console.error(err);
                res.send(403);
            }
        );
    } 
    else if(req.method === 'GET' || req.path === '/session' || req.path === '/signup'){
        next();
    }
    else {
        debug('there is no session running for this user.');
        res.redirect('/login');
    }

    return;
}


module.exports = init;
