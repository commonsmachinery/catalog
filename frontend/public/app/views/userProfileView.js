/* Catalog web application - user profile view
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

define(['jquery', 'underscore', 'lib/backbone', 'util',
        'lib/backbone.stickit'],
       function($, _, Backbone, util,
                stickit)
{
    'use strict';

    var UserProfileView = Backbone.View.extend({
        bindings:{
            '.user h1': {
                observe: 'alias',
                update: util.bind.aliasOrId,
            },
            '.name': {
                observe: 'profile.name',
                update: util.bind.defOrRemove
            },
            '.email': {
                observe: 'profile.email',
                update: util.bind.defOrRemove
            },
            '.location': {
                observe: 'profile.location',
                update: util.bind.defOrRemove
            },
            '.website': {
                observe: 'profile.website',
                update: util.bind.defOrRemove
            },
            '.gravatar_email': {
                observe: 'profile.gravatar_email',
                update: util.bind.defOrRemove
            }
        },

        events: {
            'click [data-action="edit"]': "onEditProfile" 
        },

        initialize: function(opts) {
            this.template = opts.template;
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

        onEditProfile: function onEditProfile(){
            this.trigger('edit:start');
        }
    });

    return UserProfileView;
});
