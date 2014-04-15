/*global requirejs, document*/

'use strict'; 

requirejs.config({
	baseUrl : '/app',
	paths: {
		lib : '../lib',
		models: '../app/models',
		views: '../app/views',
		collections: '../app/collections',
		underscore: '../lib/underscore',
		jquery : '../lib/jquery',
        },
	map: {
		'lib': {
			backbone: 'lib/backbone'
		}
	}
});

require(['jquery', 'lib/backbone', 'login'], function($, Backbone, login){	
	/* add backbone plugins */
	require(['lib/Backbone.ModelBinder']);

	function _init(){

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
		login.init();
		return;
	}

	function retry(xhr, status, error){
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
		return;
	}

	var Router = Backbone.Router.extend({
		routes: {
			"": 'home',
			"admin(/)": 'admin',
			"users/:id/sources/": 'sources',
			"works(?:filters)(/)": 'works',
			"works/:id(/)": 'work',
			"works/:id/posts(/)": 'posts',
			"works/:id/sources(/)": 'sources',
			"login(/)": 'login'
		},
		admin: function(){
			require(['admin']);
		},
		home: function() {
			require(['home']);
		},
		login: function(){
			require(['login']);
		},
		posts: function(id){
			require(['posts']);
		},
		sources: function(id){
			require(['sources']);
		},
		works: function(filters) {
			require(['browseWorks']);
		},
		work: function (id) {
			require(['workPermalink']);
		}
	});
	var app = new Router();
	Backbone.history.start({pushState:true});

	if(document.readyState === 'complete'){
		_init();
	} else {
		document.onready = _init;
	}

	return;

});

