/* Catalog web application - browsing list of works
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

define(['jquery', 'views/sourceView', 'views/collectionView',
		'models/sourceModel', 'collections/sourceCollection'],
	   function($, SourceView, CollectionView, Source, SourceCollection)
{
	'use strict';

	var collection;
	function promptForm (ev) {
		var model = new Source();
		var $dialog = $($('#formTemplate').html())
			.attr('id','formDialog');
		$('#content').append($dialog);
		var form = new SourceView(model, '#formDialog'); // jshint ignore:line
		$('#formDialog > .save').on('click', function(ev){
			model.urlRoot = window.location.pathname;
			model.sync('create', model);
			$dialog.remove();
			collection.add(model.toJSON());
			return;
		});
		return;
	}

	return function sources (router) {
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
	};
});
