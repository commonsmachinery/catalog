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
            'click [data-action="cancel"]': 'onCreateCancel',
            'click [data-action="save"]': 'onCreateSave',
        },

        initialize: function(opts) {

            console.debug('creating new object: %j', this.model.attributes);

            if(opts.template){
                this.$el.html($(opts.template).html());
            }

            // Indicate that we are running
            this.$('[data-action="create"]').text('Creating...');

        },

        onCreateCancel: function onCreateCancel() {
            this.trigger('create:cancel', this);
        },

        onCreateSave: function onCreateSave(){
            var self = this;

            console.debug('start saving');

            // Indicate that we're working
            this.$('.actions').attr('disabled', true);
            this.$('[data-action="save"]').text('Saving...');
            util.working('start', this.el);

            try{
                this.listenToOnce(this.model, 'invalid', function(){
                    util.showError(this, this.model.validationError);
                    util.working('stop', self.el);
                    self.$('[data-action="save"]').text('Try Again');
                    self.$('.actions').prop('disabled', false);
                });
                this.model.save(null, {
                    wait: true,
                    success: function(model) {
                        console.debug('create success: %s', model.id);

                        self.stopListening(self.model, 'invalid');
                        self.trigger('create:success', self);

                        // Re-enable view, in case it is persistently visible
                        self.$('[data-action="create"]').text('Save');
                        util.working('stop', self.el);
                    },

                    error: function(model, response) {
                        self.stopListening(self.model, 'invalid');
                        self.trigger('create:error', self, response);

                        // TODO: proper error message handling
                        console.error('error creating: %s %s %s',
                                      response.status, response.statusText,
                                      response.responseText);

                        // Re-enable view
                        self.$('[data-action="save"]').text('Try Again');
                        self.$('.actions').prop('disabled', false);
                        util.working('stop', self.el);

                        util.showError(self, 'Error saving: ' + response.responseText + ': status ' + response.status + ' ' + response.statusText);
                    },
                });
            }
            catch(err){
                console.error(err);
            }
        }
    };

    return CreateMixin;
});
