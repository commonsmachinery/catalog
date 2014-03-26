'use strict';

var debug = require('debug')('frontend:sessionStore');
var sessionStore = require('sessionstore');
var Promise = require('bluebird');

module.exports = function(dbname){
	function promise (resolve, reject) {
		var store = sessionStore.createSessionStore({
			type: 'mongodb',
			dbName: dbname
		}, settle);

		function settle (err, store){
			if(err){
				reject(err);
			}
			else{
				debug('session store connected');
				resolve(store);
			}
		}
		return;
	}
	return new Promise(promise);
}
