/* Catalog web application - browsing list of sources
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

define(['jquery', 'underscore', 'lib/backbone', 'util',
        'lib/Backbone.ModelBinder',
        'models/sourceModel',
        'collections/sourceCollection',
        'views/collectionView'],
       function($, _, Backbone, util,
                ModelBinder,
                Source,
                SourceCollection,
                CollectionView)
{
    'use strict';

    var collection = null;
    var view = null;

    var SourceListItemView = Backbone.View.extend({
        events: {
            'dragstart img.sourceImage': 'onDragStart',
        },

        initialize: function() {
//            this._modelBinder = new ModelBinder();
        },

        render: function() {
//            this._modelBinder.bind(this.model, this.el, util.createDefaultBindings(this.el, 'source'));
        },

        remove: function() {
//			this._modelBinder.unbind();
            Backbone.View.remove.apply(this, arguments);
        },

        // Add source information to the drag item store so the
        // destination can use the metadata
        onDragStart: function(ev) {
            var orig = ev.originalEvent;
            var dt = orig.dataTransfer;

            if (dt) {
                dt.setData('application/x-catalog-entry', JSON.stringify(this.model.toJSON()));
                dt.effectAllowed = 'copyLink';
            }

            // No overriding the default, we want the drag operation to start
        },
    });

    var SourcesBrowseView = Backbone.View.extend({
        initialize: function() {
            this._sourcesView = new CollectionView({
                el: '#sources',
                collection: collection,

                ItemView: SourceListItemView,
                itemTemplate: '', // $('#sourceListItemTemplate').html(),
            });

        },

        render: function() {
            this._sourcesView.render();
        },
    });

    return function browseSources(router, parentURL) {
        console.log('activating sources view');

        var data = util.bootstrapData();

        collection = new SourceCollection(data || [], {
            parentURL: parentURL
        });
        collection.on('error', function (obj, response, options) {
            console.error('error syncing %s: %s %s %s',
                          obj.id, response.status, response.statusText,
                          response.responseText);
        });

        view = new SourcesBrowseView();
        view.render();

/*
        if (!data) {
            console.log('fetching sources from server (no bootstrap data)');
            collection.fetch();
        }
*/
    };
});
