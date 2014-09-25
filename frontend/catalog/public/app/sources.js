/* Catalog web application - browsing list of sources
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

define(['jquery', 'underscore', 'lib/backbone', 'util',
        'rdflib', 'lib/libcredit',
        'lib/Backbone.ModelBinder',
        'models/sourceModel',
        'collections/sourceCollection',
        'views/collectionView'],
       function($, _, Backbone, util,
                rdflib, libcredit,
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
                var kb = libcredit.parseRDFJSON(this.model.get('cachedExternalMetadataGraph'));
                var credit = libcredit.credit(kb, this.model.get('resource'));

                if (credit) {
                    // Create HTML for the image with the attribution
                    // and replace the drag data store with that instead

                    var topDiv = $('<div></div>');
                    var objectDiv = $('<div></div>').appendTo(topDiv);
                    var img = $('<img>').appendTo(objectDiv);

                    // cheat a bit, just grab the URL from the image
                    // element rather than digging into metadataGraph
                    var src = ev.target.src;

                    img.attr('src', src);

                    var formatter = libcredit.htmlCreditFormatter(document);
                    credit.format(formatter, 2, null, src);

                    topDiv.append($(formatter.getRoot()));

                    // Rebuild the drag contents
                    dt.clearData();
                    dt.setData('text/html', topDiv.html());
                    dt.setData('text/uri-list', src);
                    dt.setData('text/plain', src);
                }

                // Always add full info about the image, even if we didn't get the credit built
                dt.setData('application/x-catalog-entry', JSON.stringify(this.model.toJSON()));
                dt.effectAllowed = 'copy';
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
