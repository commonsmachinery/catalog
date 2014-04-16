/* Catalog web frontend - admin functionality

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Authors:
        Peter Liljenberg <peter@commonsmachinery.se>
        Elsa Balderrama <elsa@commonsmachinery.se>

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

var debug = require('debug')('frontend:admin');

var User;

var adminUsersPage
  , changeUserLock
  ;

function init(app) {
    // TODO: add admin session validation here later
    // app.use('/admin', checkAdminSession);

    // We can load the User model now that mongodb is connected
    User = require('./model/user');
}
exports.init = init;


function routes(app) {
    // TODO: this should be a subpage later, but for now we only care
    // about tweaking users
    app.get('/admin', adminUsersPage);
    app.post('/admin/changeUserLock', changeUserLock);
}
exports.routes = routes;


function adminUsersPage(req, res) {
    var q = req.query;

    User.find({}, 'uid emails locked', {
        sort: { uid: 1 },
        skip: q.offset || 0,
        limit: q.limit || 50
    }).then(
        function(users) {
            res.render('adminUsersPage', {
                users: users
            });
        }
    ).catch(
        function(err) {
            console.error(err);
            res.send(500, process.env.NODE_ENV === 'production' ? '' : err.stack);
        }
    );
}

/* Actions */

function changeUserLock(req, res) {
    var uid = req.body.uid;
    var lock = req.body.lock === 'true';

    User.findOneAndUpdate({ uid: uid }, { locked: lock })
        .then(
            function() {
                debug('user %s locked: %s', uid, lock);
                res.send('ok');
            }
        ).catch(
            function(err) {
                console.error(err);
                res.send(500, process.env.NODE_ENV === 'production' ? '' : err.stack);
            }
        );
}
