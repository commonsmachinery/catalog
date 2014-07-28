/* Catalog web application - edit work details view
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

    var EditWorkDetailsView = Backbone.View.extend(_.extend(EditMixin, {
        bindings:{
            '#input-alias': 'alias',
            '#input-description': 'description',
            '#input-public': 'public'
        },

        render: function(){
            this.stickit();
            return this;
        }
    }));

    return EditWorkDetailsView;
});
