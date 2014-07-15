/* Catalog web application - user profile view
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

define(['jquery', 'underscore', 'lib/backbone', 'util',
        'lib/backbone.stickit',
        'models/userModel',
        'views/editMixin'],
       function($, _, Backbone, util,
                stickit,
                User,
                EditMixin)
{
    'use strict';

    var EditUserProfileView = Backbone.View.extend(_.extend(EditMixin, {
        bindings:{
            '#input-alias': {
                observe: 'alias',
                onSet: function(val){
                    this.model.trigger('change');
                    this.model.parent.attributes.alias = val;
                    // do not return
                },
                onGet: function(val){
                    return this.model.parent.attributes.alias;

                },
            },
            '#input-name': 'name',
            '#input-email': 'email',
            '#input-website': 'website',
            '#input-location': 'location',
            '#input-gravatar_email': 'gravatar_email'
        },

        render: function(){
            this.stickit();
            return this;
        }
    }));

    return EditUserProfileView;
});
