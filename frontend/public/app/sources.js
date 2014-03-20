/*global define, window, $*/

define(function(require){
	'use strict'; 

	var SourceView, collection;
	function promptForm (ev) {
		var Source = require('models/sourceModel');
		var model = new Source();
		var $dialog = $($('#formTemplate').html())
			.attr('id','formDialog');
		$('#content').append($dialog);
		var form = new SourceView(model, '#formDialog');
		$('#formDialog > .save').on('click', function(ev){
			model.urlRoot = window.location.pathname;
			model.sync('create', model);
			$dialog.remove();
			collection.add(model.toJSON());
			return;
		});
		return;
	}

	var $ = require('jquery');
	SourceView = require('views/sourceView');
	var CollectionView = require('views/collectionView');
	var SourceCollection = require('collections/sourceCollection');

	/* make initial models */
	var $bootstrapData = $('.bootstrapData');
	var sourceData = JSON.parse($bootstrapData.text()).data;
	$bootstrapData.remove();

	/* bind views */
	collection = new SourceCollection(sourceData);
	var collectionView = new CollectionView({
		el: '#sources',
		template: '#sourceTemplate',
		childTag: '.source',
		childView: SourceView,
		collection: collection
	});
	collectionView.render();

	$('#sources > .add').on('click', promptForm);

	return;
});