/* Catalog web application - work list item view
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

define(['jquery', 'underscore', 'lib/backbone', 'util',
        'lib/backbone.stickit',
        'views/deleteMixin'],
       function($, _, Backbone, util,
                stickit,
                DeleteMixin)
{
    'use strict';

    var WorkListItemView = Backbone.View.extend(_.extend(DeleteMixin, {
        bindings: {
            '[data-bind="added_by"]': {
                observe: 'added_by',
                update: function ($el, val, model){
                    // override model by added_by subobject
                    util.bind.aliasOrId($el, val.alias, val);
                }
            },
            '[data-bind="added_on"] dd': {
                observe: 'added_at',
                onGet: function(val){
                    var date = new Date(val).toDateString();
                    return date.substring(3, date.length);
                }
            },
            '[data-bind="batch-select-item"]': {
                observe: '_perms.write',
                update: function($el, val, model){
                    if(val){
                        $el.prop('disabled', false);
                        $el.attr('id', 'batchSelect-' + model.id);
                        $el.attr('name', 'batchSelect-' + model.id);

                        var $label = $el.siblings('label');
                        $label.removeClass('hidden');
                        $label.attr('for', 'batchSelect-' + model.id);

                    }
                    else{
                        $el.prop('disabled', true);
                        $el.siblings('label').addClass('hidden');
                    }
                    // this is a one-time unidirectional binding
                    this.unstickit(model, '.batchSelectItem');
                },
            },
            '[data-action="delete"]': {
                observe: '_perms.admin',
                update: function($el, val, model){
                    if(val){
                        $el.removeClass('hidden');
                    }
                }
            },
            '[data-bind="meta-author"] dd': 'annotations.creator',
            '[data-bind="meta-title"] dd': 'annotations.title',
            '[data-bind="public"]': {
                observe: 'public',
                update: util.bind.visibilityClass
            },
            '[data-bind="title"]': {
                observe: 'alias',
                update: util.bind.aliasOrId
            },
            '[data-bind="url"] a': {
                observe: 'href',
                update: function($el, val, model){
                    $el.attr('href', val);
                    $el.html(val);
                }
            },
        },

        initialize: function() {
            this._perms = this.model.get('_perms') || {};

            // "working" indicator
            this.listenTo(this.model, 'request', this.onRequest);
            this.listenTo(this.model, 'sync', this.onSync);
            this.listenTo(this.model, 'error', this.onSync);
            this.listenTo(this.hub, 'batchUpdate', this.onBatchUpdate);

            return this;
        },

        render: function() {
            this.stickit();
            return this;
        },

        onBatchUpdate: function onBatchUpdate(changes) {
            if (this._perms.write && this.$('[data-bind="batch-select-item"]').prop('checked')) {
                this.model.save(changes, { wait: true });
            }
        },

        onRequest: function onRequest(){
            util.working('start', this.el);
            $(this.el).find('[data-bind="batch-select-item"]').prop('disabled', true);
        },

        onSync: function onSync(){
            util.working('stop', this.el);
            $(this.el).find('[data-bind="batch-select-item"]').prop('disabled', false);
        }
    }));

    return WorkListItemView;
});
