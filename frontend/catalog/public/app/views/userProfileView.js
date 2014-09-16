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
            '[data-bind="user"]': {
                observe: 'alias',
                update: util.bind.aliasOrId,
            },
            '[data-bind="name"]': {
                observe: 'profile.name',
                update: util.bind.defOrRemove
            },
            '[data-bind="email"]': {
                observe: 'profile.email',
                update: util.bind.defOrRemove
            },
            '[data-bind="location"]': {
                observe: 'profile.location',
                update: util.bind.defOrRemove
            },
            '[data-bind="website"]': {
                observe: 'profile.website',
                update: util.bind.defOrRemove
            },
            '[data-bind="gravatar_email"]': {
                observe: 'profile.gravatar_email',
                update: util.bind.defOrRemove
            },
            '[data-bind="gravatar_hash"]': {
                observe: 'profile.gravatar_hash',
                update: function($el, val, model){
                    var src = '//www.gravatar.com/avatar/'+ val +'?d=retro&s=237';
                    $('.gravatar img').attr('src', src);
                }
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
