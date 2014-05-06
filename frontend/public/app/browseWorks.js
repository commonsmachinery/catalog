/* Catalog web application - browsing list of works
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

define(['jquery', 'underscore', 'lib/backbone', 'util',
		'models/workModel',
		'collections/workCollection',
		'views/collectionView'],
	   function($, _, Backbone, util,
				Work,
				WorkCollection,
				CollectionView)
{
	'use strict';

	var hub = _.extend({}, Backbone.Events);
	var collection = null;
	var view = null;

	var WorksActionView = Backbone.View.extend({
		events: {
			'click #batch-update': 'onBatchUpdate',
		},

		onBatchUpdate: function onBatchUpdate() {
			var changes = {};
			var trigger = false;

			var visibility = this.$('#new-visibility').val();
			if (visibility) {
				changes.visibility = visibility;
				trigger = true;
			}

			var state = this.$('#new-state').val();
			if (state) {
				changes.state = state;
				trigger = true;
			}

			if (trigger) {
				hub.trigger('batchUpdate', changes);
			}
		},
	});

	var WorkListItemView = Backbone.View.extend({
		initialize: function() {
			this._modelBinder = new Backbone.ModelBinder();
			this.listenTo(hub, 'batchUpdate', this.onBatchUpdate);
		},

		render: function() {
			var bindings = Backbone.ModelBinder.createDefaultBindings(this.el, 'data-bind');

			bindings.resource.elAttribute = 'href';

			this._modelBinder.bind(this.model, this.el, bindings);
		},

		remove: function() {
			this._modelBinder.unbind();
			Backbone.View.remove.apply(this, arguments);
		},

		onBatchUpdate: function onBatchUpdate(changes) {
			if (this.$('.batchSelectItem').prop('checked')) {
				this.model.save(changes);
			}
		},
	});


	var WorksBrowseView = Backbone.View.extend({
		initialize: function() {
			this._actionView = new WorksActionView({
				el: '#actions',
			});

			this._worksView = new CollectionView({
				el: '#works',
				collection: collection,

				ItemView: WorkListItemView,
				itemTemplate: $('#workListItemTemplate').html(),
			});

		},

		render: function() {
			this._actionView.render();
			this._worksView.render();
		},
	});

	return function browseWorks(router, filters) {
		console.log('activating works view');

		var data = util.bootstrapData();

		collection = new WorkCollection(data || []);
		collection.on('error', function (obj, response, options) {
			console.error('error syncing %s: %s %s %s',
						  obj.id, response.status, response.statusText,
						  response.responseText);
		});

		view = new WorksBrowseView();
		view.render();

		if (!data) {
			console.log('fetching works from server (no bootstrap data)');
			collection.fetch();
		}
	};
});
