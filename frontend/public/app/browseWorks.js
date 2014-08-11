/* Catalog web application - browsing list of works
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

define(['jquery', 'underscore', 'lib/backbone', 'util',
        'collections/workCollection',
        'views/collectionView',
        'views/workListItemView'],
       function($, _, Backbone, util,
                WorkCollection,
                CollectionView,
                WorkListItemView)
{
    'use strict';

    var hub = _.extend({}, Backbone.Events);
    var collection;
    var appRouter;

    var WorkActionsView = Backbone.View.extend({
        
        events: {
            'click .apply-batch-update': "onBatchUpdate",
        },

        initialize: function(opts) {
            this.template = opts.template;
            this.collection = opts.collection;
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

            // toggle the inclusion of filter
            var $byMe = this.$('#input-by');
            var attr = $byMe.parent().data('filter');
            if($byMe.is(':checked')){
                var val = $byMe.siblings('input').eq(0).val();
                query.filter = attr + ':' + val;
                trigger = true;
            }
            else{
                var exp = new RegExp(attr + ':' + '[^,&]*,?');
                query.filter = query.filter.replace(exp, '');
            }

            this.collection.fetch().done(function(){
                appRouter.navigate(decodeURIComponent(this.url), {trigger:false});
            });
        }
    });

    var WorksBrowseView = Backbone.View.extend({
        events: {
            'click .pagination a': 'gotoPage'
        },

        initialize: function() {

            this._actionView = new WorkActionsView({
                el: '#actions',
                template: '#actionsTemplate',
                collection: collection
            });

            this._filtersView = new WorkFiltersView({
                el: '#filters',
                template: '#filtersTemplate',
                collection: collection
            });

            // expose hub
            WorkListItemView.prototype.hub = hub;
            this._worksView = new CollectionView({
                el: '#works',
                collection: collection,

                ItemView: WorkListItemView,
                itemTemplate: $('#workListItemTemplate').html(),
            });

            collection.comparator = 'added_at';
        },

        render: function() {
            this._actionView.render();
            this._filtersView.render();
            this._worksView.render();
        },

        gotoPage: function gotoPage(ev){
            this._worksView.collection['get'+ ev.target.dataset.goto +'Page']()
                .done(_.bind(this.onFetch, this, ev));
            return false;
        },

        onFetch: function onFetch(ev, data){
            var current = this._worksView.collection.state.currentPage;

            window.location.hash = '#works';
            appRouter.navigate(ev.target.href.replace(ev.target.origin, ''), {trigger: false});

            //update or hide previous button
            var link = window.location.href;
            var $prev = this.$('[data-goto=Previous]');
            var $first = this.$('[data-goto=First]');
            if(current === 1){
                $prev.addClass('hidden');
                $first.addClass('hidden');
            }
            else{
                link = link.replace(/([^_])page=\d+/, '$1page='+ (current - 1));
                $prev.attr('href', link);
                $prev.removeClass('hidden');
                $first.removeClass('hidden');
            }

            //update next button
            link = link.replace(/([^_])page=\d+/, '$1page='+ (current + 1));
            this.$('[data-goto=Next]').attr('href', link);
            //update current

            this.$('.pagination .current').html(current);
        }
    });

    return function browseWorks(router, filters) {
        appRouter = router;
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
