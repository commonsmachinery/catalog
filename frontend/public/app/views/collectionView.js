/* Catalog web application - common functionality for collection views
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */


define(['jquery', 'underscore', 'lib/backbone', 'util'],
       function($, _, Backbone, util)
{
    'use strict';

    var CollectionView = Backbone.View.extend({
        initialize: function initialize(options) {
            // To initialise new views
            this._ItemView = options.ItemView;
            this._itemOptions = options.itemOptions || {};
            this._itemTemplate = options.itemTemplate;

            // Existing item views
            this._items = {};

            // On the first render we link up to existing HTML
            // rendered by the server
            this._firstRender = true;

            // Use listenTo to bind and ensure all events are unbound
            // when the view is destroyed
            this.listenTo(this.collection, 'add', this.onAdd);
            this.listenTo(this.collection, 'remove', this.onRemove);
            this.listenTo(this.collection, 'destroy', this.onRemove);

            // "working" indicator
            this.listenTo(this.collection, 'request', this.onRequest);
            this.listenTo(this.collection, 'sync', this.onSync);
            this.listenTo(this.collection, 'error', this.onSync);
        },

        onAdd: function onAdd(model) {
            if (this._items[model.id]) {
                console.error('add event for model that already has a view');
                return;
            }

            // Create the element for the view
            var el = $(this._itemTemplate)
                .attr('id', this.getItemID(model.id));

            var opts = {
                el: el,
                model: model,
            };
            _.defaults(opts, this._itemOptions);

            var view = new this._ItemView(opts);
            view.render();

            this._items[model.id] = view;
            //insert in DOM by comparator order
            if(this.$('.entry').eq(this.collection.indexOf(model)).length){
                this.$('.entry').eq(this.collection.indexOf(model)).before(view.$el);
            }
            else{
                this.$el.append(view.$el);
            }
        },

        onRemove: function onRemove(model) {
            var view = this._items[model.id];

            if (view) {
                console.debug('removing view for model: %s', model.id);
                view.remove();
                delete this._items[model.id];
            }
        },

        render: function render() {
            var self = this;

            if (this._firstRender) {
                // Link up all pre-rendered HTML to the bootstrapped models
                this.collection.each(function(model) {
                    var itemID = self.getItemID(model.id);
                    var existingElement = self.$('#' + itemID);

                    if (existingElement.length !== 1) {
                        console.error("no existing element for %s", itemID);
                        // Add it as if it came from the server
                        self.onAdd(model);
                    }
                    else {
                        // Create a new view linked to the element
                        var opts = {
                            el: existingElement.get(0),
                            model: model,
                        };
                        _.defaults(opts, self._itemOptions);

                        var view = new self._ItemView(opts);
                        view.render();

                        self._items[model.id] = view;
                    }
                });

                this._firstRender = false;
            }
            else {
                // This will be needed when we add paging/sorting/filtering
                console.error('re-rendering CollectionView is not yet implemented');
            }

            return this;
        },

        getItemID: function getItemID(id) {
            return this.el.id + '-' + id;
        },

        onRequest: function onRequest(origin){
            if (this.collection === origin) {
                util.working('start', this.el);
            }
        },

        onSync: function onSync(origin){
            if (this.collection === origin) {
                util.working('stop', this.el);
            }
        }
    });

    return CollectionView;
});
