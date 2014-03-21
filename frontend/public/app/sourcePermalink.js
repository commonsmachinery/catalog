/*global define*/

define(function(require){
	'use strict'; 

	var $ = require('jquery');
	var Source = require('models/source');
	var SourceView = require('views/sourceView');

	var $bootstrapData = $('.bootstrapData');
	var sourceData = JSON.parse($bootstrapData.text());
	$bootstrapData.remove();
	var source = new Source(sourceData);
	var sourceView = new SourceView(source);
	sourceView.render();
	return;
});