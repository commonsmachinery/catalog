/*global define*/
'use strict';

var $, kick, lock;

define(function(require){
    $ = require('jquery');
    $('.kick').on('click', kick);
    $('.lock').on('click', lock);
});

function kick (ev) {

    function success (data, status) {
        console.log('user kicked');
        $(ev.target).parent().remove();
        return false;
    }

    var dataset = ev.target.dataset;

    $.post('/kick', {uid: dataset.uid}, success);
    return false;
}

/* Lock is a toggle */
function lock (ev) {

    var dataset = ev.target.dataset;
    function success (data, status) {
        console.log('user locked');
        dataset.lock = !dataset.lock;
        ev.target.value = ev.target.value == 'lock' ? 'unlock' : 'lock';
        return false;
    }

    $.post('/lock', {
        uid: dataset.uid,
        lock: dataset.lock
    }, success);
    return false;
}