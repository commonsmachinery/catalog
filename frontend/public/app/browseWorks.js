/* Catalog web application - browsing list of works
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

define(['jquery', 'underscore', 'lib/backbone', 'util',
        'collections/workCollection',
        'views/collectionView',
        'views/createWorkView'],
       function($, _, Backbone, util,
                WorkCollection,
                CollectionView,
                CreateWorkView)
{
    'use strict';

    var hub = _.extend({}, Backbone.Events);
    var collection;

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
        bindings: {
            '.delete': {
                observe: '_perms.admin',
                update: function($el, val, model){
                    if(val){
                        $el.removeClass('hidden');
                    }
                    else if(! $el.hasClass('hidden')){
                        $el.addClass('hidden');
                    }
                }
            },
            '.batchSelectItem': {
                observe: '_perms.write',
                update: function($el, val, model){
                    if(val){
                        $el.prop('disabled', false);
                    }
                    else{
                        $el.prop('disabled', true);
                    }
                }
            },
            '.public, .private': {
                observe: 'public',
                update: function($el, val, model){
                    var className;
                    if (val){
                        className = 'public';
                    }
                    else{
                        className = 'private';
                    }
                    $el.attr('class', className);
                }
            },
            '.title': {
                observe: 'alias',
                update: function($el, val, model){
                    if(val){
                        $el.html(val);
                    }
                    else{
                        $el.html(model.id);
                    }
                    $el.attr('href', model.id);
                }
            }
        },

        initialize: function() {
            this.listenTo(hub, 'batchUpdate', this.onBatchUpdate);
            this._perms = this.model.get('permissions') || {};

            // "working" indicator
            this.listenTo(this.model, 'request', this.onRequest);
            this.listenTo(this.model, 'sync', this.onSync);
            this.listenTo(this.model, 'error', this.onSync);
        },

        render: function() {
            this.stickit();
            return this;
        },

        onBatchUpdate: function onBatchUpdate(changes) {
            if (this._perms.edit && this.$('.batchSelectItem').prop('checked')) {
                this.model.save(changes, { wait: true });
            }
        },

        onRequest: function onRequest(){
            util.working('start', this.el);
            $(this.el).find('.batchSelectItem').prop('disabled', true);
        },

        onSync: function onSync(){
            util.working('stop', this.el);
            $(this.el).find('.batchSelectItem').prop('disabled', false);
        }
    });


    var WorksBrowseView = Backbone.View.extend({
        events: {
            'click .pagination a': 'gotoPage'
        },

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

            this.delegateEvents();
        },

        render: function() {
            this._actionView.render();
            this._worksView.render();
        },

        gotoPage: function gotoPage(ev){
            ev.preventDefault();
            this._worksView.collection['get'+ ev.target.dataset.goto +'Page']();
            window.history.pushState(null, null, ev.target.href);
            return false;
        }
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

        var view = new WorksBrowseView({
            el: '#browseWorks'
        });
        view.render();

        if (!data) {
            console.log('fetching works from server (no bootstrap data)');
            collection.fetch();
        }
    };
});
