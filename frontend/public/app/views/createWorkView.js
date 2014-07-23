/* Catalog web application - view to create new works
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

define(['jquery', 'underscore', 'lib/backbone', 'util',
        'lib/backbone.stickit',
        'views/createMixin'],
       function($, _, Backbone, util,
                stickit,
                CreateMixin)
{
    'use strict';

    var CreateWorkView = Backbone.View.extend(_.extend(CreateMixin, {
        bindings:{
            '#input-alias': 'alias',
            '#input-public': 'public',
            '#input-description': 'description'
        },

        render: function(){
            this.stickit();
            return this;
        }
    }));

    return CreateWorkView;
});
