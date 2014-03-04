

requirejs.config({
	baseUrl : '/app',
	paths: {
		lib : '../lib',
		models: '../app/models',
		underscore: '../lib/underscore',
		jquery : '../lib/jquery',
	},
	map: {
		'lib': {
			backbone: 'lib/backbone',
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
			"works/:id": 'work',
			"works/:id/sources": 'sources',
			"works(?:filters)(/)": 'works',
		},
		home: function() {
			require(['home']);
		},
		sources: function(id){
			require(['sourceCollection']);
		},
		works: function(filters) {
			require(['workCollection']);
		},
		work: function (id) {
			require(['workPermalink']);
		}
	});
	var app = new Router();
	console.log('route: ', Backbone.history.start({pushState: true, root:'/'}));

	function _init(){
		
	}
	if(document.readyState == 'complete'){
		_init();
	} else {
		document.onready = _init
	}
});

