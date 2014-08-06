/* Catalog web application - work details view
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

define(['jquery', 'lib/backbone', 'util',
        'lib/backbone.stickit'],
       function($, Backbone, util,
                stickit)
{
    'use strict';

    var WorkDetailsView = Backbone.View.extend({
        bindings:{
            '.title': {
                observe: 'alias',
                update: function($el, val, model){
                    if(val){
                        $el.find('dd h1').html(val);
                    }
                    else{
                        $el.find('dd').html(model.id);
                    }
                },
            },
            '.description': {
                observe: 'description',
                update: util.bindDefOrRemove
            },
            '.public, .private': {
                observe: 'public',
                update: function($el, val, model){
                    var className;
                    if (val){
                        className = 'public';
                    }
                    else{
                        className = 'private';
                    }
                    $el.attr('class', className);
                }
            }
        },

        events: {
            'click [data-action="edit"]': "onEditWork" 
        },

        initialize: function(opts) {
            this.template = opts.template;
            this.delegateEvents();
        },

        render: function() {
            this.$el.html($(this.template).html());
            this.stickit();
            return this;
        },

        onEditWork: function onEditProfile(){
            this.trigger('edit:start');
        }
    });

    return WorkDetailsView;
});
