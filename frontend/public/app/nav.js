/* Catalog web application - common actions
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

define(['jquery', 'underscore', 'lib/backbone', 'views/createWorkView', 'models/workModel'], 
    function($, _, Backbone, CreateWorkView, WorkModel){
    'use strict';

    var NavView = Backbone.View.extend({
        events: {
            'click .createWork': function onCreateWork(){
                this.showDialog(CreateWorkView, {
                    model: new WorkModel(null, {wait:true}),
                    el: '.dialog#createWorkForm',
                    template: '#createWorkTemplate'
                }).render();
            }
        },

        initialize: function(){
            this.delegateEvents();
        },

        showDialog: function showDialog(View, opts){
            var currentDialog = this.dialog;
            if(currentDialog){
                this.stopListening(currentDialog);
                currentDialog.remove();
            }

            $('#content').append('<div class="dialog" id="createWorkForm"></div>');

            this.dialog = new View(opts);
            this.listenToOnce(this.dialog, 'create:cancel', function(){
                this.stopListening(this.dialog);
                this.dialog.remove();
            });
            this.listenToOnce(this.dialog, 'create:success', function(){
                window.location.assign(this.dialog.model.url());
            });

            return this.dialog;
        }
    });
        

    return function(){
        var navView = new NavView({ // jshint ignore: line
            el: $('nav#header')
        });
    };
});