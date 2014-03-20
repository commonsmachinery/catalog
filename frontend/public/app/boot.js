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

require(['lib/jquery', 'lib/backbone'], function($, Backbone){	
	/* add backbone plugins */
	require(['lib/Backbone.ModelBinder']);

	var Router = Backbone.Router.extend({
		routes: {
			"": 'home',
			"users/:id/sources/": 'sources',
			"works(?:filters)(/)": 'works',
			"works/:id(/)": 'work',
			"works/:id/posts(/)": 'posts',
			"works/:id/sources(/)": 'sources',
		},
		home: function() {
			require(['home']);
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
	// function _init(){
		
	// }
	// if(document.readyState === 'complete'){
	// 	_init();
	// } else {
	// 	document.onready = _init;
	// }
});

