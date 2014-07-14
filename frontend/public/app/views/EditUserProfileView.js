/* Catalog web application - view for creating new works
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

define(['jquery', 'underscore', 'lib/backbone', 'util',
        'lib/Backbone.stickit',
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
            },
            '#input-email': 'email',
            '#input-website': 'website'
        },

        render: function(){
            this.stickit();
            return this;
        }
    }));

    return EditUserProfileView;
});
