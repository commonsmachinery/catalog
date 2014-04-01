/*global define*/
'use strict';

define(function(req){
	var $ = require('jquery');
	var persona = require('persona');

	$('#login, #signup').on('click', function(ev){
		var btn = ev.target.id;
		if(btn == 'login'){
			authenticate('session');
			return;
		}
		authenticate('signup');
		return;
	}); 

	$('#logout-persona').one('click', function(){
		navigator.id.logout(); 
		return;
	});

	return;
});


function authenticate (action) {
	navigator.id.watch({
		loggedInUser: null,
		onlogin: function(assertion) {
			$.ajax({
				type: 'POST',
				url: '/' + action,
				data: {
					assertion: assertion,
					uid: $('#' + action + '-user').val(),
					provider: 'persona',
					_csrf: $('#token').val()
				},
				success: function(res, status, xhr) { 
					console.log('%s: success', action);
					window.location.href = '/users/' + res;
					return;
				},
				error: function(xhr, status, err) {
					navigator.id.logout();
					console.error("%s failure: %s", action, err);
					return;
				}
			});
			return;
		},
		onlogout: function() {
			$.ajax({
				type: 'DELETE',
				url: '/session',
				success: function(res, status, xhr) { 
					console.log('logged out');
					return;
				},
				error: function(xhr, status, err) { 
					console.log("Logout failure: " + err); 
					return;
				}
			});
		}
	});
	navigator.id.request(); 
	return;
}