
define(function(require){

	var $ = require('jquery');
	var Work = require('models/workModel');
	var WorkView = require('views/workView');

	var $bootstrapData = $('.bootstrapData');
	var workData = JSON.parse($bootstrapData.text());
	$bootstrapData.remove();
	delete $bootstrapData;
	var work = new Work(workData);
	var workView = new WorkView(work, '#work');
	workView.render();
	return;
})