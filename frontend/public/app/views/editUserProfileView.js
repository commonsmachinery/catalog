/* Catalog web application - user profile view
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

define(['jquery', 'underscore', 'lib/backbone', 'util',
        'lib/backbone.stickit',
        'views/editMixin'],
       function($, _, Backbone, util,
                stickit,
                EditMixin)
{
    'use strict';

    var EditUserProfileView = Backbone.View.extend(_.extend(EditMixin, {
        bindings:{
            '[data-bind="alias"]': 'alias',
            '[data-bind="name"]': 'profile.name',
            '[data-bind="email"]': 'profile.email',
            '[data-bind="website"]': 'profile.website',
            '[data-bind="location"]': 'profile.location',
            '[data-bind="gravatar_email"]': 'profile.gravatar_email'
        },

        render: function(){
            this.stickit();
            return this;
        }
    }));

    return EditUserProfileView;
});
