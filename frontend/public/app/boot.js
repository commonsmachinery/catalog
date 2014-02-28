

requirejs.config({
	baseUrl : '/app',
	paths: {
		lib : '../lib',
		models: '../models',
		jquery : '../lib/jquery',
		underscore: '../lib/underscore'
	}
});

require(['lib/jquery', 'lib/backbone'], function($, Backbone){	

	var Router = Backbone.Router.extend({
		routes: {
			"": 'home',
			"works/:id": 'work',
			"works(?:filters)(/)": 'works',
		},
		home: function() {
			require(['home']);
		},
		works: function(filters) {
			require(['workCollection']);
		},
		work: function (id) {
			require(['workPermalink']);
		}
	});
	var app = new Router();
	console.log(Backbone.history.start({pushState: true, root:'/'}));

	function _init(){
		
	}
	if(document.readyState == 'complete'){
		_init();
	} else {
		document.onready = _init
	}
});

