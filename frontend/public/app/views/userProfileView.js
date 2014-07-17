/* Catalog web application - user profile view
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

define(['jquery', 'underscore', 'lib/backbone', 'util',
        'lib/backbone.stickit',
        'models/userModel'],
       function($, _, Backbone, util,
                stickit,
                User)
{
    'use strict';

    var UserProfileView = Backbone.View.extend({
        bindings:{
            '.user': {
                observe: 'alias',
                update: 'renderOrNot',
            },
            '.name': {
                observe: 'profile.name',
                update: 'renderOrNot'
            },
            '.email': {
                observe: 'profile.email',
                update: 'renderOrNot'
            },
            '.location': {
                observe: 'profile.location',
                update: 'renderOrNot'
            },
            '.website': {
                observe: 'profile.website',
                update: 'renderOrNot'
            },
            '.gravatar_email': {
                observe: 'profile.gravatar_email',
                update: 'renderOrNot'
            }
        },

        events: {
            'click [data-action="edit-profile"]': "onEditProfile" 
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

        onEditProfile: function onEditProfile(){
            this.trigger('edit:start');
        }
    });

    return UserProfileView;
});
