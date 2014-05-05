/* Catalog web application - browsing list of works
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

define(['jquery', 'views/postView', 'views/collectionView',
		'models/postModel', 'collections/postCollection'],
	   function($, PostView, CollectionView, Post, PostCollection)
{
	'use strict';

	var collection;
	function promptForm (ev) {
		var model = new Post();
		var $dialog = $($('#formTemplate').html())
			.attr('id','formDialog');
		$('#content').append($dialog);
		var form = new PostView(model, '#formDialog'); // jshint ignore:line
		$('#formDialog > .save').on('click', function(ev){
			model.urlRoot = window.location.pathname;
			model.sync('create', model);
			$dialog.remove();
			collection.add(model.toJSON());
			return;
		});
		return;
	}

	return function posts (router) {
		/* make initial models */
		var $bootstrapData = $('.bootstrapData');
		var postData = JSON.parse($bootstrapData.text()).data;
		$bootstrapData.remove();

		/* bind views */
		collection = new PostCollection(postData);
		var collectionView = new CollectionView({
			el: '#posts',
			template: '#postTemplate',
			childTag: '.post',
			childView: PostView,
			collection: collection
		});
		collectionView.render();

		$('#posts > .add').on('click', promptForm);
	};
});
