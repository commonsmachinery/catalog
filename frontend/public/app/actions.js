/* Catalog web application - common actions
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

/*global requirejs, require*/

define(['jquery', 'underscore', 'lib/backbone', 'views/createWorkView', 'models/workModel'], 
    function($, _, Backbone, CreateWorkView, WorkModel){
    'use strict';

    var NavView = Backbone.View.extend({
        events: {
            'click .createWork': function onCreateWork(){

                this.showDialog(CreateWorkView, {
                    model: new WorkModel(),
                    el: '.dialog#workForm',
                    template: '#workFormTemplate'
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

            $('#content').append('<div class="dialog" id="workForm"></div>');

            this.dialog = new View(opts);

            this.listenToOnce(view, 'create:cancel', function(){
                this.stopListening(this.dialog);
                this.dialog.remove();
            });

            return this.dialog;
        }
    });
        

    return function(){
        var navView = new NavView({ //jslint ignore: line
            el: $('nav#header')
        });
    }
});