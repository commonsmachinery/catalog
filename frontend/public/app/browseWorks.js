/* Catalog web application - browsing list of works
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

define(['jquery', 'underscore', 'lib/backbone', 'util',
        'collections/workCollection',
        'views/collectionView',
        'views/createWorkView',
        'views/deleteMixin'],
       function($, _, Backbone, util,
                WorkCollection,
                CollectionView,
                CreateWorkView,
                DeleteMixin)
{
    'use strict';

    var hub = _.extend({}, Backbone.Events);
    var collection;

    var WorkActionsView = Backbone.View.extend({
        
        events: {
            'click .apply-batch-update': "onBatchUpdate",
        },

        initialize: function(opts) {
            this.template = opts.template;
            this.collection = opts.collection;
            this.delegateEvents();
            return this;
        },

        render: function() {
            this.$el.html($(this.template).html());
            return this;
        },

        onBatchUpdate: function onBatchUpdate() {
            var changes = {};
            var trigger = false;

            var setPublic = this.$('#input-public').val();
            if (setPublic) {
                if(setPublic === 'true'){
                    changes.public = true;
                }
                else{
                    changes.public = false;
                }
                trigger = true;
            }

            if (trigger) {
                hub.trigger('batchUpdate', changes);
            }
        }
    });

    var WorkFiltersView = Backbone.View.extend({
        
        events: {
            'click .apply-filters': "onApplyFilters"
        },

        initialize: function(opts) {
            this.template = opts.template;
            this.collection = opts.collection;
            this.delegateEvents();
            return this;
        },

        render: function() {
            this.$el.html($(this.template).html());
            return this;
        },

        onApplyFilters: function onApplyFilters(ev) {
            var query = this.collection.queryParams;
            var trigger = false;

            var $byMe = this.$('#input-by');
            var attr = $byMe.parent().data('filter');
            if($byMe.is(':checked')){
                var val = $byMe.siblings('input').eq(0).val();
                query.filter = attr + ':' + val;
                trigger = true;
            }
            else{
                var exp = new RegExp(attr + '\:' + '[^,\&]*,?');
                query.filter = query.filter.replace(exp, '');
            }
            var self = this;
            this.collection.fetch();
        }
    });


    var WorkListItemView = Backbone.View.extend(_.extend(DeleteMixin, {
        bindings: {
            '.added_on': {
                observe: 'added_at',
                update: util.bindDefOrRemove
            },
            '.added_by a': {
                observe: 'added_by',
                update: function($el, val, model){
                    $el.attr('href', val.href);
                    if (val.alias){
                        $el.html(val.alias);
                    }
                    else{
                        $el.html(model.get('added_by.id'));
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
            '.delete': {
                observe: '_perms.admin',
                update: function($el, val, model){
                    if(val){
                        $el.removeClass('hidden');
                    }
                }
            },
            '.public, .private': {
                observe: 'public',
                update: function($el, val, model){
                    if (val){
                        $el.addClass('public');
                        $el.removeClass('private');
                    }
                    else {
                        $el.addClass('private');
                        $el.removeClass('public');
                    }
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
                    $el.attr('href', model.href);
                }
            },
            '.url a': {
                observe: 'href',
                update: function($el, val, model){
                    $el.attr('href', val);
                    $el.html(val);
                }
            },
        },

        initialize: function() {
            this.listenTo(hub, 'batchUpdate', this.onBatchUpdate);
            this._perms = this.model.get('_perms') || {};

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
            if (this._perms.write && this.$('.batchSelectItem').prop('checked')) {
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
    }));


    var WorksBrowseView = Backbone.View.extend({
        events: {
            'click .pagination a': 'gotoPage',
        },

        initialize: function() {
            this._actionView = new WorkActionsView({
                el: '#actions',
                template: '#actionsTemplate',
                collection: collection
            }).render();

            this._filtersView = new WorkFiltersView({
                el: '#filters',
                template: '#filtersTemplate',
                collection: collection
            }).render();

            this._worksView = new CollectionView({
                el: '#works',
                collection: collection,

                ItemView: WorkListItemView,
                itemTemplate: $('#workListItemTemplate').html(),
            });
            this.delegateEvents();
            collection.comparator = 'added_at';
        },

        render: function() {
            this._actionView.render();
            this._worksView.render();
        },

        gotoPage: function gotoPage(ev){
            ev.preventDefault();
            this._worksView.collection['get'+ ev.target.dataset.goto +'Page']()
                .done(_.bind(this.onFetch, this, ev));
            return false;
        },

        onFetch: function onFetch(ev, data){
            var current = this._worksView.collection.state.currentPage;
            window.history.pushState(null, null, ev.target.href);
            var link;
            var $prev = this.$('[data-goto=Previous]');
            if(current == 1){
                $prev.hide();
            }
            else{
                link = window.location.href.replace(/([^_])page=\d+/, '$1page='+ (current - 1))
                $prev.attr('href', link);
                $prev.show();
            };
            link = window.location.href.replace(/([^_])page=\d+/, '$1page='+ (current + 1))
            this.$('[data-goto=Next]').attr('href', link);
            this.$('.pagination .current').html(current);
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
