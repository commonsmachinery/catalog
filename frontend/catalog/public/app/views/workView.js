/* Catalog web application - view for showing/editing a work
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

define(['jquery', 'underscore', 'lib/backbone', 'util',
        'lib/Backbone.ModelBinder',
        'views/editMixin', 'views/deleteMixin'],
       function($, _, Backbone, util,
                ModelBinder,
                EditMixin, DeleteMixin)
{
    'use strict';

    var WorkView = Backbone.View.extend(_.extend(EditMixin, DeleteMixin, {
        events: _.extend(EditMixin.events, DeleteMixin.events, {

        }),

        initialize: function() {
            this._binder = new ModelBinder();
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

            this._binder.bind(this.model, this.el, util.createDefaultBindings(this.el, 'work'));
            return this;
        },
    }));

    return WorkView;
});
