/* Catalog web application - common actions
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

/*global requirejs, require*/

define(['lib/jquery', 'lib/backbone', 'views/createWorkView', 'models/work'], 
    function($, Backbone, CreateWorkView, WorkModel){
    'use strict';

    var NavView = Backbone.View.extend({
        initialize: function(){
            this.$('.newWork').on('click',function(ev){
                $('#content').append('<div class="dialog" id="workForm"></div>');
                var createWorkView = new CreateWorkView({
                    model: new WorkModel(),
                    el: '.dialog#workForm'
                }).render();

                this.listenToOnce(createWorkView, 'create:cancel', function(){
                    createWorkView.remove();
                })
            });
        }
    });
        

    return function(){
        var navView = new NavView({
            el: $('#navHeader')
        });
    }
});