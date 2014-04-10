/*global define, navigator, window*/
'use strict';

var $, authenticate;

define(function(require){
	$ = require('jquery');
	require('persona');

	/* Remember logout happens outside */
	return {
		init: init
	};
});


function init(){
	$('#login, #signup').on('click', function(ev){
		var btn = ev.target.id;
		if(btn == 'login'){
			authenticate('session');
		}
		else {
			authenticate('signup');
		}
		return false;
	}); 
	$('#logout').on('click', function(){
		authenticate('logout');
		return false;
	});
	return;
}

function authenticate (action) {
	navigator.id.watch({
		loggedInUser: null,
		onlogin: function(assertion) {
			$.ajax({
				type: 'POST',
				url: '/' + action,
				data: {
					assertion: assertion,
					uid: $('#' + action + '-user').val()
				},
				success: function(res, status, xhr) { 
					console.log('%s: success', action);
					window.location.href = '/users/' + res;
					return false;
				},
				error: function(xhr, status, err) {
					navigator.id.logout();
					console.error("%s failure: %s", action, err);
					return false;
				}
			});
			return false;
		},
		onlogout: function() {
			$.ajax({
				type: 'DELETE',
				url: '/session',
				success: function(res, status, xhr) { 
					console.log('logged out');
					window.location.href = '/';
					return false;
				},
				error: function(xhr, status, err) { 
					console.log("Logout failure: " + err); 
					return false;
				}
			});
			return false;
		}
	});
	if(action == 'logout'){
		navigator.id.logout(); 
	}
	else {
	 	navigator.id.request(); 
	}
	return;
}



