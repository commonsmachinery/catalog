/* Catalog web frontend - app

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Authors: 
        Peter Liljenberg <peter@commonsmachinery.se>
        Elsa Balderrama <elsa@commonsmachinery.se>

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

var crypto;
var mongoose;
var mongoStore;

var db;
var app;
var User;

var userModel = {  
    uid: {
        type: String,
        index: {
            unique: true
        }
    },
    hash: {
        type: String,
        set: function(password) {
            this.salt = this.makeSalt();
            return this.encrypt(password);
        }
    },
    salt: {
        type: String
    }
};

var userMethods = {
    authenticate: function(string) {
            console.log(this.encrypt(string), ' ---- ', this.hash);
            return this.encrypt(string) === this.hash;
        },
    encrypt: function(string) {
        return crypto.createHmac('sha1', this.salt).update(string).digest('hex');
    },
    makeSalt: function() {
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789?+=';
        var charLen = chars.length;
        var salt = [];
        for( var i=0; i < 11; i++ ){
            salt.push(chars[Math.floor(Math.random() * charLen + 1)]);
        }
        return salt.join('');
    }
};
function init (app, express) {
    app = app;
    /* ToDo: not sure if this is a propper way to make functions available */
    app.set('isLogged', isLogged);

    /* Session management */
    crypto = require('crypto');
    mongoose = require('mongoose');
    mongoStore = require('connect-mongodb')({ dbname: 'catalog-dev'});

    mongoose.connect('mongodb://localhost/catalog-dev');
    var db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error:'));
    db.once('open', function callback () {
      // yay!
      return;
    });

    app.use(express.cookieParser());
    app.use(express.session({
        secret: 'shhh...',
        store: mongoStore
    }));

    var userSchema = new mongoose.Schema(userModel);
    userSchema.method(userMethods);
    User = mongoose.model('User', userSchema);

    /* Routes */
    app.get('/login', loginScreen);
    app.post('/login', newSession);
    app.del('/session', logout);
    app.get('/signup', signupScreen);
    app.post('/signup', newUser);
}




function isLogged(req, res, next) {
    if (req.session.uid) {
        User.findById(req.session.uid, function(user) {
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
        return
    });
    return;
}

function signupScreen (req, res) {
    // body...
}

module.exports = init;