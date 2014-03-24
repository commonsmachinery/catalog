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

var isLogged, loginScreen, logout, newSession, newUser, signupScreen; 

function init (app, express, db) {

    env = process.env;

    var user = require('./userSchema'),
        sessionStore = require('connect-mongodb')({ 
            dbname: env.CATALOG_USERS_DB
        });

    /* ToDo: not sure if this is a propper way to make functions available for the rest api */
    app.set('isLogged', isLogged);
    
    app.use(express.cookieParser());
    app.use(express.session({
        secret: env.CATALOG_SECRET,
        store: sessionStore
    }));

    var userSchema = new db.Schema(user.schema);
    userSchema.method(user.methods);
    User = db.model('User', userSchema);

    /* Routes */
    app.get('/login', loginScreen);
    app.post('/login', newSession);
    app.del('/session', logout);
    app.get('/signup', signupScreen);
    app.post('/signup', newUser);
}

function isLogged(req, res, next) {
    var uid = req.session.uid;
    if (uid) {
        User.findById(uid, function(user) {
            if (user) {
                req.locals.user = uid;
                next();
            } 
            else {
                res.redirect('/login');
            }
        });
    } 
    else {
        res.redirect('/login');
    }
}

function loginScreen (req, res) {
    res.render('login');
}

function logout (req, res) {
    if (req.session) {
        req.session.destroy();
    }
    res.redirect('/login');
}

function newSession (req, res) {
    function respond (err, user) {
        console.log(user);
        if (user && user.authenticate(req.body.pass)) {
            req.session.uid = user.uid;
            res.redirect('/users/'+req.session.uid);
        } 
        else {
            res.redirect('/login');
        }
        return;
    }
    User.findOne({"uid": req.body.uid}, respond);
       
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

function signupScreen (req, res) {
    // body...
}

module.exports = init;