/* Catalog web application - main script
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

/*global requirejs, require*/

requirejs.config({
	baseUrl : '/app',
	paths: {
		lib : '../lib',
		models: '../app/models',
		views: '../app/views',
		collections: '../app/collections',
		underscore: '../lib/underscore',
		jquery : '../lib/jquery',
        rdflib : '../lib/rdflib',
        },
	map: {
		'lib': {
			backbone: 'lib/backbone'
		}
	}
});

require(['jquery', 'lib/backbone', 'session'], function($, Backbone, session){
    'use strict';

	function _init(){
		session.init();

		// TODO: this doesn't handle network timeouts, only various
		// gateway timeouts.  This all probably should go into a
		// wrapper class instead that handles common errors, but it
		// must be reviewed how that interacts with Backbone.

		function retry(xhr, status /*, error */){
			/* jshint validthis:true */
			if(this.tryCount < this.maxTries){
				console.error('%s: %s... retrying', xhr, status);
				this.tryCount++;
				var self = this;
				setTimeout(function(){
					$.ajax(self);
				}, 3000);
			}
			else{
				console.error("couldn't process request!");
				//ToDo: show some message dialog to the user
			}
		}

		/* If network timeout or internal server error, retry */
		$.ajaxSetup({
			tryCount: 0,
			maxTries: 3,
			statusCode: {
				408: retry,
				500: retry,
				504: retry,
				522: retry,
				524: retry,
				598: retry
			}
		});
	}

	/* To allow navigation that changes a URL without loading a new
	 * page, we impose the convention on all page main scripts to
	 * return a function that sets up the new view (since just doing
	 * require(['foo']) will be a noop the second time it is called in
	 * a page).
	 *
	 * These scripts get the router, so they can listen to route
	 * events to destroy their views, add new routes or request
	 * navigation.
	 */

	var router;
	var AppRouter = Backbone.Router.extend({
		routes: {
			"": 'home',
			"admin(/)": 'admin',
            "users/:id/sources(/)": 'userSources',
			"works(?:filters)(/)": 'works',
			"works/:id(/)": 'work',
			"works/:id/posts(/)": 'posts',
            "works/:id/sources(/)": 'workSources',
            "users/:id(/)": 'userProfile',
			"login(/)": 'login'
		},
		admin: function(){
			require(['admin'], function(view) { view(router); });
		},
		home: function() {
			require(['home'], function(view) { view(router); });
		},
		login: function(){
			// require(['login'], function(view) { view(router); });
		},
		posts: function(id){
			require(['posts'], function(view) { view(router); });
		},
		userProfile: function(id){
			require(['userProfile'], function(view){ view(router); });
		},
        userSources: function(userId){
            require(['sources'], function(view) { view(router, '/users/' + userId); });
        },
        works: function(filters) {
			require(['browseWorks'], function(view) { view(router, filters); });
		},
		work: function (id) {
			require(['workPermalink'], function(view) { view(router, id); });
        },
        workSources: function(workId){
            require(['sources'], function(view) { view(router, '/works/' + workId); });
        },
    });

    router = new AppRouter();
	Backbone.history.start({pushState:true});

	if(document.readyState === 'complete'){
		_init();
	} else {
		document.onready = _init;
	}

	return;

});

