/* Catalog web application - view for showing/editing a work
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

define(['jquery', 'underscore', 'lib/backbone', 'util', 'views/editMixin'],
       function($, _, Backbone, util, EditMixin)
{
    'use strict';

    var WorkView = Backbone.View.extend(_.extend(EditMixin, {
        initialize: function() {
            this._binder = new Backbone.ModelBinder();
        },

        render: function() {
            var bindings = Backbone.ModelBinder.createDefaultBindings(this.el, 'data-bind');

            bindings.metadataGraph.converter = function(direction, value) {
                if (direction === Backbone.ModelBinder.Constants.ModelToView) {
                    return JSON.stringify(value, null, 2);
                }
                else {
                    return JSON.parse(value);
                }
            };

            this._binder.bind(this.model, this.el, bindings);
            return this;
        },
    }));

    return WorkView;
});
