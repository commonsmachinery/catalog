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
                        $el.find('dd').html(val);
                    }
                    else{
                        $el.find('dd').html(model.id);
                    }
                },
            },
            '.description': {
                observe: 'description',
            },
            '.public': {
                observe: 'public',
                update: 'renderOrNot'
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

        renderOrNot: function($el, val, model){
            if(val){
                $el.find('dd').html(val);
            }
            else{
                $el.remove();
            }
        },

        onEditWork: function onEditProfile(){
            this.trigger('edit:start');
        }
    });

    return WorkDetailsView;
});
