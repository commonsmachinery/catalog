/* Catalog web application - view for showing/editing a work
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

define(['jquery', 'underscore', 'lib/backbone', 'util',
        'views/editMixin', 'views/deleteMixin'],
       function($, _, Backbone, util,
                EditMixin, DeleteMixin)
{
    'use strict';

    var WorkView = Backbone.View.extend(_.extend(EditMixin, DeleteMixin, {
        events: _.extend(EditMixin.events, DeleteMixin.events, {

        }),

        initialize: function() {
            this._binder = new Backbone.ModelBinder();
            this._perms = this.model.get('permissions') || {};

            this.listenTo(this, 'delete:success', function () {
                document.location = '/works';
            });
        },

        render: function() {
            if (this._perms.delete) {
                // This is hidden by default by the template
                this.$('[data-action="delete"]').show();
            }

            var bindings = Backbone.ModelBinder.createDefaultBindings(this.el, 'data-bind');

            bindings.metadata.elAttribute = 'href';

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
