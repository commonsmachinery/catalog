/*global define, window, $*/

define(function(require){
	'use strict'; 

	var PostView, collection;
	function promptForm (ev) {
		var Post = require('models/postModel');
		var model = new Post();
		var $dialog = $($('#formTemplate').html())
			.attr('id','formDialog');
		$('#content').append($dialog);
		var form = new PostView(model, '#formDialog');
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

	PostView = require('./views/postView');
	var CollectionView = require('views/collectionView');
	var PostCollection = require('collections/postCollection');

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

	return;
});