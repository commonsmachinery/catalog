/*global define*/

define(['jquery'], function($) {
	'use strict';

    // TODO: this should really be backbonified on a REST API

    function onLock (ev) {
        var dataset = ev.target.dataset;
        var lock = (dataset.locked !== "true");

        $.post('/admin/changeUserLock',
               {
                   uid: dataset.uid,
                   lock: lock,
               })
            .done(function() {
                console.log('user lock: %s', lock);
                dataset.locked = lock;
                ev.target.value = lock ? 'Unlock' : 'Lock';
            })
            .fail(function(xhr, status, error) {
                console.log('user lock failed: %s %s', status, error);
                alert('Could not change user lock:\n' + status + '\n' + error);
            });
    }

    $('.lock').on('click', onLock);
});


