'use strict';

var debug = require('debug')('frontend:sessionStore');
var sessionStore = require('sessionstore');
var Promise = require('bluebird');

var promiseFilter;

module.exports = function(host, dbname, port){
    function promise (resolve, reject) {
        function settle (err, store){
            if(err){
                reject(err);
                return;
            }
            debug('session store connected');

            extend(store, store.constructor.prototype);

            resolve(store);
            return;
        }

        host = host.match(/\/\/([^:\/?#]*)/)[1];
        console.log(host, port, dbname);
        sessionStore.createSessionStore({
            type: 'mongodb',
            dbName: dbname,
            host: host,
            port: port
        }, settle);

        return;
    }
    return new Promise(promise);
};

function extend (store, proto) {

    store.list = {};

    /* lets us get filtered sessions */
    proto.all = promiseFilter;

    /* keeps a registry of currently connected users */
    proto.set = (function(_super){
        return function(sid, sess, callback){
            var sessRef = this.list[sid];
            if(!sessRef){
                sessRef = sess;
            }
            _super.apply(this, arguments);
            return;
        };
    })(proto.set);

    /* kills other user's sessions */
    proto.kick = function(sid){
        var sessRef = this.list[sid];
        if(sessRef){
            sessRef.destroy();
        }
        else{
            store.destroy(sid);
        }
        return;
    };
}

function promiseFilter(param, offset, limit) {

    var self = this;
    function promise (resolve, reject) {
        
        var arr = [];
        function pushSession(err, d) {
            if(d && d.uid){
                arr.push(d);
            }
            else{
               resolve(arr);
            }
            return;
        }

        self.sessions.find(param, function(err, cursor){ 
            if(err){
                console.error('error getting sessions: ', err);
                reject(err);
            }
            cursor.skip(offset || 0);
            cursor.limit(limit || 0);
            cursor.each(pushSession);
            return;
        });

        return;
    }
    return new Promise(promise);
}