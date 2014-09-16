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
            '[data-bind="title"]': {
                observe: 'alias',
                update: util.bind.aliasOrId,
            },
            '[data-bind="description"]': {
                observe: 'description'
            },
            '[data-bind="public"]': {
                observe: 'public',
                update: util.bind.visibilityClass
            }
        },

        events: {
            'click [data-action="edit"]': "onEditWork" 
        },

        initialize: function(opts) {
            this.template = opts.template;
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
