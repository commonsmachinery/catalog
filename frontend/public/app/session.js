/*global navigator*/

define(['jquery'], function($) {
	'use strict';

    function init() {
        var personaEmail = null;

        if ($('body').data('loginType') === 'persona') {
            personaEmail = $('body').data('loginEmail') || null;
        }

        console.log('persona login: %s', personaEmail);

        // watch() must be called on all pages with login or logout
        // button, and should be called everywhere.  So call it.
        navigator.id.watch({
            loggedInUser: personaEmail,

            onlogin: function(assertion) {
                $.ajax({
                    type: 'POST',
                    url: '/persona/verify',
                    data: {
                        assertion: assertion,
                    },
                    dataType: 'json',
                    success: function(res, status, xhr) {
                        if (res.status === 'okay') {
                            console.log('persona login: success');

                            // Redirect for now to the start page, later
                            // this should be more sophisticated in terms
                            // of what happen
                            window.location.href = '/';
                        }
                        else {
                            console.error('persona login failed: %s %s', res.status, res.reason);
                            navigator.id.logout();
                            alert('Could not login with Persona:\n' + res.reason);
                        }
                    },
                    error: function(xhr, status, err) {
                        console.error("persona login failure: %s", err);
                        navigator.id.logout();
                        alert('Could not login with Persona: ' + status + ' ' + err);
                    }
                });
            },

            onlogout: function() {
                $.ajax({
                    type: 'POST',
                    url: '/persona/logout',
                    success: function(res, status, xhr) {
                        console.log('persona logout: success');

                        // Redirect for now, later it might make sense to
                        // stay on the page but just update the dynamic state.
                        window.location.href = '/';
                    },
                    error: function(xhr, status, err) {
                        console.log("persona logout failure: %s %s", status, err);

                    }
                });
            }
        });

        // Wire up the buttons to the persona logic
        $('#login-persona').on('click', function() {
            navigator.id.request();
        });

        $('#logout-persona').on('click', function() {
            navigator.id.logout();
        });
    }

    return {
        init: init,
    };
});
