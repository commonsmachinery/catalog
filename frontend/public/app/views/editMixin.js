/* Catalog web application - mixin for editable views
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

define(['jquery', 'underscore', 'util'],
       function($, _, util)
{
    'use strict';

    var EditMixin = {
        /* Extend this with view-specific event handlers, if any */
        events: {
            'click [data-action="edit"]': 'onEditStart',
            'click [data-action="save"]': 'onEditSave',
            'click [data-action="cancel"]': 'onEditCancel',
        },

        onEditStart: function onEditStart() {
            console.debug('start editing');

            this.trigger('edit:start', this);

            this._editStartAttrs = _.clone(this.model.attributes);

            this.$('.editable').prop('disabled', false);

            // Disable Save until a change is made, and ensure it has
            // the right text.
            this.$('[data-action="save"]')
                .prop('disabled', true)
                .text('Save');

            this.$('[data-action="cancel"]').prop('disabled', false)

            this.listenToOnce(this.model, 'change', this.onEditModelChange);

            // Hide edit and show save/cancel
            this.$('[data-action="edit"]').hide();
            this.$('[data-action="save"], [data-action="cancel"]').show();
        },

        onEditSave: function onEditSave() {
            var self = this;

            console.debug('start saving');
            this.trigger('edit:save:start', this);

            this.$('.editable').prop('disabled', true);

            // Indicate that we're working
            this.$('.actions').prop('disabled', true);
            this.$('[data-action="save"]').text('Saving...');

            this.model.save(null, {
                success: function() {
                    console.debug('start success');
                    self.trigger('edit:save:success', self);

                    // Go back to Edit button
                    self.$('[data-action="save"], [data-action="cancel"]').hide();
                    self.$('[data-action="edit"]').show();

                    // Re-enable buttons
                    self.$('.actions').prop('disabled', false);

                    self._editStartAttrs = null;
                },

                error: function(model, response) {
                    self.trigger('edit:save:error', self, response);

                    // TODO: proper error message handling
                    console.error('error saving %s: %s %s %s',
                                  model.id, response.status, response.statusText,
                                  response.responseText);

                    // Re-enable buttons
                    self.$('.actions').prop('disabled', false);
                    self.$('[data-action="save"]').text('Retry saving');
                },
            });
        },

        onEditCancel: function onEditCancel() {
            console.debug('cancel editing');
            this.stopListening(this.model, 'change', this.onEditModelChange);

            this.$('.editable').prop('disabled', true);

            this.trigger('edit:cancel', this);

            // Reset to original state
            this.model.set(this._editStartAttrs);
            this._editStartAttrs = null;

            // Go back to Edit button
            this.$('[data-action="save"], [data-action="cancel"]').hide();
            this.$('[data-action="edit"]').show();
        },

        onEditModelChange: function onEditModelChange() {
            // Enable save button on first change to the model after
            // starting editing
            this.$('[data-action="save"]').prop('disabled', false);
        },
    };

    return EditMixin;
});
