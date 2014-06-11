/* Catalog web application - browsing list of works
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

define(['jquery', 'underscore', 'lib/backbone', 'util',
        'lib/Backbone.ModelBinder',
        'models/workModel',
		'collections/workCollection',
        'views/collectionView',
        'views/createWorkView'],
       function($, _, Backbone, util,
                ModelBinder,
				Work,
				WorkCollection,
                CollectionView,
                CreateWorkView)
{
	'use strict';

	var hub = _.extend({}, Backbone.Events);
	var collection = null;
	var view = null;

	var WorksActionView = Backbone.View.extend({
		events: {
			'click #batch-update': 'onBatchUpdate',
            'click #add-work': 'onAddWork'
		},

		onBatchUpdate: function onBatchUpdate() {
			var changes = {};
			var trigger = false;

            var visible = this.$('#new-visible').val();
			if (visible) {
				changes.visible = visible;
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

        onAddWork: function onAddWork() {
            var createView = new CreateWorkView({
                el: $($('#addWorkTemplate').html()),
            });

            $(document.body).append(createView.render().el);

            this.listenTo(createView, 'create:success', function (view, work) {
                createView.remove();

                // Just redirect to the new work
                document.location = work.get('resource');
            });

            this.listenTo(createView, 'create:cancel', function () {
                createView.remove();
            });
        }
	});

	var WorkListItemView = Backbone.View.extend({
		initialize: function() {
            this._modelBinder = new ModelBinder();
			this.listenTo(hub, 'batchUpdate', this.onBatchUpdate);
            this._perms = this.model.get('permissions') || {};

            // "working" indicator
            this.listenTo(this.model, 'request', this.onRequest);
            this.listenTo(this.model, 'sync', this.onSync);
		},

		render: function() {
			if (this._perms.edit) {
				// Disabled by default in the template
				this.$('.batchSelectItem').prop('disabled', false);
			}

            this._modelBinder.bind(this.model, this.el, util.createDefaultBindings(this.el, 'work'));
			$(this.el).removeClass('working');
		},

		remove: function() {
			this._modelBinder.unbind();
			Backbone.View.remove.apply(this, arguments);
		},

		onBatchUpdate: function onBatchUpdate(changes) {
			if (this._perms.edit && this.$('.batchSelectItem').prop('checked')) {
				this.model.save(changes, { wait: true });
			}
		},

        onRequest: function onRequest(){
            $(this.el).find('input').prop('checked', false);
            $(this.el).find('input').prop('disabled', true);
            $(this.el).addClass('working');
            $(this.el).prepend('<div class="overlay"></div>');
            $(this.el).find('.overlay').append('<div class="loading"></div>');
        },

        onSync: function onSync(){
            $(this.el).find('input').prop('disabled', false);
            $(this.el).find('input').prop('checked', true);
            $(this.el).removeClass('working');
            $(this.el).find('.overlay').remove();
        }
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
