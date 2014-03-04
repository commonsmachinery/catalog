
define(function(require){

	var $ = require('jquery');
	var Source = require('models/source');
	var SourceView = require('views/singleSource');

	var $bootstrapData = $('.bootstrapData');
	var sourceData = JSON.parse($bootstrapData.text());
	$bootstrapData.remove();
	delete $bootstrapData;
	var source = new Source(workData);
	var sourceView = new SourceView(source);
	sourceView.render();
	return;
})