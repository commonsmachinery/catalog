/* Catalog web application - mixin for views that create new objects
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

define(['jquery', 'underscore', 'util'],
       function($, _, util)
{
    'use strict';

    var CreateMixin = {
        /* Extend this with view-specific event handlers, if any */
        events: {
            'click [data-action="create"]': 'onCreateStart',
            'click [data-action="cancel"]': 'onCreateCancel',
        },

        onCreateStart: function onCreateStart() {
            var self = this;

            console.debug('creating new object: %j', this.model.attributes);

            this.trigger('create:start', this);

            // Disable both buttons and edit fields while running
            this.$('.editable, .actions').prop('disabled', true);

            // Indicate that we are running
            this.$('[data-action="create"]').text('Creating...');

            this.model.save(null, {
                success: function(model) {
                    console.debug('create success: %s', model.id);

                    // Let others listen to this to determine what to do on success
                    self.trigger('create:success', self, model);

                    // Re-enable view, in case it is persistently visible
                    self.$('[data-action="create"]').text('Create');
                    self.$('.editable, .actions').prop('disabled', false);
                },

                error: function(model, response) {
                    self.trigger('create:error', self, response);

                    // TODO: proper error message handling
                    console.error('error creating: %s %s %s',
                                  response.status, response.statusText,
                                  response.responseText);

                    self.$('[data-action="create"]').text('Retry create');

                    // Re-enable view
                    self.$('.editable, .actions').prop('disabled', false);
                },
            });
        },

        onCreateCancel: function onCreateCancel() {
            this.trigger('create:cancel', this);
        },
    };

    return CreateMixin;
});
