/* Catalog web application - browsing list of works
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

define(['jquery', 'underscore', 'lib/backbone', 'util', 
    'models/workModel', 
    'views/editWorkDetailsView',
    'views/workDetailsView',
    'views/deleteMixin'],
       function($, _, Backbone, util, 
            Work, 
            EditWorkDetailsView,
            WorkDetailsView,
            DeleteMixin)
{
    'use strict'; 

    var WorkView = Backbone.View.extend(_.extend(DeleteMixin, {
        initialize: function(){
            // just bind action events, but not render yet
            this._workDetailsView = new WorkDetailsView({
                el: this.$('#workDetails'),
                model: this.model
            });

            this.listenToOnce(this._workDetailsView, 'edit:start', this.onEditStart);
            this.listenToOnce(this, 'delete:success', function(){
                util.deletedURI(this);
            });
        },

        onEditStart: function onEditStart(){
            console.log('editing work details');

            // remove listeners from/to this view and empty container
            util.emptyViewElement(this._workDetailsView, this);

            this._editWorkDetailsView = new EditWorkDetailsView({
                el: this.$('#workDetails'),
                model: this.model,
                template: '#editWorkDetailsTemplate'
            }).render();

            this.listenToOnce(this._editWorkDetailsView, 'edit:save:success edit:cancel', this.onEditFinish);
        },

        onEditFinish: function onEditFinish(){
            util.emptyViewElement(this._editWorkDetailsView, this);

            this._workDetailsView = new WorkDetailsView({
                el: this.$('#workDetails'),
                model: this.model,
                template: '#workDetailsTemplate'
            }).render();

            this.listenToOnce(this._workDetailsView, 'edit:start', this.onEditStart);
        },
    }));

    return function workPermalink (router) {

        var data = util.bootstrapData();

        var workView = new WorkView({ // jshint ignore:line
            el: '#work',
            model: new Work(data),
        });
    };
});
