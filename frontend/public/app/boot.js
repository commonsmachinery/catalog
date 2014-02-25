

requirejs.config({
	baseUrl : '/app',
	paths : {
		lib : '/lib'
	}
});

require(['lib/jquery', 'lib/watch'], function($, watch){	
	function _init(){
		/* Map module loading */
		var path = window.location.pathname;
		switch(true){
			case '/' === path: 
				require(['home']);
				break;
			case /\/?works\/?$/.test(path): 
				require(['works']);
				break;
			case /\/?works\/[1-9]+$/.test(path): 
				require(['workPermalink']);
				break;
			case /\/?browse\/?$/.test(path): 
				require(['works']);
				break;
		}
	}
	if(document.readyState == 'complete'){
		_init();
	} else {
		document.onready = _init
	}
});

