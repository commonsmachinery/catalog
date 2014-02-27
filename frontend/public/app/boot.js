

requirejs.config({
	baseUrl : '/app',
	paths : {
		lib : '/lib'
	},
	shim: {
		backbone: {
			deps: ['underscore', 'jquery'],
			exports: 'Backbone'
		},
		underscore: {
			exports: '_'
		}
	}
});

require(['lib/jquery', 'lib/backbone'], function($, Backbone){	

	var routes = Backbone.Router.extend({
	routes: {
		"/": 'home',
		"/work/:id": 'work',
		"/works(?:filters)": 'works'
	},
	home: function() {
		require(['home']);
	},
	works: function(filters) {
		require(['works']);
	},
	work: function (id) {
		require(['workPermalink']);
	}
	});
	Backbone.history.start();

	function _init(){
		
	}
	if(document.readyState == 'complete'){
		_init();
	} else {
		document.onready = _init
	}
});

