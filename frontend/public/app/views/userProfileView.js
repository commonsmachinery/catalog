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
            '.user': {
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
            '.name': {
                observe: 'profile.name',
                update: util.bindDefOrRemove
            },
            '.email': {
                observe: 'profile.email',
                update: util.bindDefOrRemove
            },
            '.location': {
                observe: 'profile.location',
                update: util.bindDefOrRemove
            },
            '.website': {
                observe: 'profile.website',
                update: util.bindDefOrRemove
            },
            '.gravatar_email': {
                observe: 'profile.gravatar_email',
                update: util.bindDefOrRemove
            }
        },

        events: {
            'click [data-action="edit"]': "onEditProfile" 
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
