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
            'click [data-action="save"]': 'onEditSave',
            'click [data-action="cancel"]': 'onEditCancel',
            'click button': 'preventSubmit'
        },

        initialize: function (opts) {
            this._editStartAttrs = util.deepClone(this.model.attributes);

            if(opts.template){
                this.$el.html($(opts.template).html());
            }
            // Disable Save until a change is made, and ensure it has
            // the right text.
            this.$('[data-action="save"]')
                .prop('disabled', true)
                .text('Save');

            this.$('[data-action="cancel"]').prop('disabled', false);

            this.listenToOnce(this.model, 'change', this.onEditModelChange);
        },

        preventSubmit: function preventSubmit(ev){
            // remove the undesired behavior of submiting the form on button click
            ev.preventDefault();
            return false;
        },

        onEditSave: function onEditSave() {
            var self = this;

            console.debug('start saving');

            // Indicate that we're working
            this.$('.actions').attr('disabled', true);
            this.$('[data-action="save"]').text('Saving...');
            util.working('start', this.el);

            try{
                this.listenToOnce(this.model, 'invalid', function(){
                    util.showError(this, this.model.validationError);
                });
                this.model.save(null, {
                    success: function(model, response, options) {
                        console.debug('start success');
                        self.trigger('edit:save:success', self);
                        self.stopListening(self.model, 'invalid');

                        // Go back to Edit button
                        self.$('[data-action="edit"]').show();

                        // Re-enable buttons
                        self.$('.actions').prop('disabled', false);
                        self.$('[data-action="save"]').text('Save');
                        util.working('stop', self.el);
                        self._editStartAttrs = null;
                    },

                    error: function(model, response) {
                        self.trigger('edit:save:error', self, response);
                        self.stopListening(self.model, 'invalid');

                        // TODO: proper error message handling
                        console.error('error saving %s: %s %s %s',
                                      model.id, response.status, response.statusText,
                                      response.responseText);

                        self.$('[data-action="save"]').text('Retry saving');
                        
                        util.showError(self, 'error saving: ' + response.responseText + ': status ' + response.status + ' ' + response.statusText);
                    },
                });
            }
            catch(err){
                console.error(err);
            }
        },

        onEditCancel: function onEditCancel() {
            console.debug('cancel editing');

            // Reset to original state. the cancel event should trigger after we reset values
            this.stopListening(this.model, 'change', this.onEditModelChange);
            var self = this;
            this.listenToOnce(this.model, 'change', function(){
                this._editStartAttrs = null;
                //if the model has changed, wait until reseted to trigger cancel.
                self.trigger('edit:cancel');
            });
            this.model.set(this._editStartAttrs);
            //if the model didn't change after reset, trigger cancel immediately
            if(!this.model.hasChanged()){
                self.trigger('edit:cancel');
            }
        },

        onEditModelChange: function onEditModelChange() {
            // Enable save button on first change to the model after
            // starting editing
            this.$('[data-action="save"]').prop('disabled', false);
        }
    };

    return EditMixin;
});
