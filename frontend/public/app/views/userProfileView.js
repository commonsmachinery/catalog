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
                update: function($el, val, model){
                    model = model.parent.attributes;
                    if(model.alias){
                        $el.find('dd').html(model.alias);
                    }
                    else{
                        $el.find('dd').html(model.id);
                    }
                },
            },
            '.name': {
                observe: 'name',
                update: function($el, val){
                    this.renderOrNot($el.find('dd'), val, $el);
                }
            },
            '.email': {
                observe: 'email',
                update: function($el, val){
                    this.renderOrNot($el.find('dd'), val, $el);
                }
            },
            '.location': {
                observe: 'location',
                update: function($el, val){
                    this.renderOrNot($el.find('dd'), val, $el);
                }
            },
            '.website': {
                observe: 'website',
                update: function($el, val){
                    this.renderOrNot($el.find('dd'), val, $el);
                }
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

        renderOrNot: function($el, val, $rm){
            if (!$rm){
                $rm = $el;
            }
            if(val){
                $el.html(val);
            }
            else{
                $rm.remove();
            }
        },

        onEditProfile: function onEditProfile(){
            this.trigger('edit:start');
        }
    });

    return UserProfileView;
});
