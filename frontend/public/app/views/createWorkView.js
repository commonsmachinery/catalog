/* Catalog web application - view for creating new works
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

define(['jquery', 'underscore', 'lib/backbone', 'util',
        'lib/Backbone.ModelBinder',
        'models/workModel',
        'views/createMixin'],
       function($, _, Backbone, util,
                ModelBinder,
                Work,
                CreateMixin)
{
    'use strict';

    var CreateWorkView = Backbone.View.extend(_.extend(CreateMixin, {
        initialize: function() {
            this.model = new Work({
                visibility: 'private',
                state: 'draft',
                metadataGraph: {}
            });
            this._binder = new ModelBinder();
        },

        render: function() {
            this._binder.bind(this.model, this.el, util.createDefaultBindings(this.el, 'work'));
            return this;
        },
    }));

    return CreateWorkView;
});
