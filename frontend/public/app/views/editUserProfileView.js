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
            '#input-alias': 'alias',
            '#input-name': 'profile.name',
            '#input-email': 'profile.email',
            '#input-website': 'profile.website',
            '#input-location': 'profile.location',
            '#input-gravatar_email': 'profile.gravatar_email'
        },

        render: function(){
            this.stickit();
            return this;
        }
    }));

    return EditUserProfileView;
});
