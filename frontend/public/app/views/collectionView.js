/*global define*/

define(function(require){
	'use strict'; 

	var Backbone = require('lib/backbone');
	var _ = require('underscore');
	var $ = require('jquery');

	var CollectionView = Backbone.View.extend({
		initialize : function(options) {
			_(this).bindAll('add', 'remove');

			this.el = options.el;
			this.template = options.template;
			this.collection = options.collection;
			this.childView = options.childView;
			this.childTag = options.childTag;

			this.children = [];
			this.collection.each(this.add);
			
			this.collection.on('add', this.add);
			this.collection.on('remove', this.remove);
		},
		add : function(model) {
			var el = $($(this.template).html());
			var view = new this.childView(model, el);

			this.children.push(view);

			if (this._rendered) {
				$(this.el).append($(view.el).html());
			}
		},
		remove : function(model) {
			var removedView = _(this._children).find(
				function(view) { 
					return view.model === model; 
				}
			);
			this._children = _(this._children).without(removedView);
			if (this._rendered){
				$(removedView.el).remove();
			}
		},
		render : function() {
			var self = this;
			this._rendered = true;
			$(this.childTag).remove();
			_(this.children).each(function(view) {
				$(self.el).append(view.render().el);
			});
			return this;
		}
	});
	return CollectionView;
});
