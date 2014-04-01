/*global define*/
'use strict';

define(function(req){
	var $ = require('jquery');
	var persona = require('persona');

	$('#login-persona').one('click', function(){
		navigator.id.watch({
			loggedInUser: $('#login-user').val(),
			onlogin: function(assertion) {
				$.ajax({
					type: 'POST',
					url: '/session',
					data: {
						assertion: assertion,
						uid: $('#login-user').val(),
						provider: 'persona',
						_csrf: $('#token').val()
					},
					success: function(res, status, xhr) { 
						console.log('logged in');
						return;
					},
					error: function(xhr, status, err) {
						navigator.id.logout();
						console.error("Login failure: " + err);
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
	});

	$('#logout-persona').one('click', function(){
		navigator.id.logout(); 
		return;
	});

	return;
});