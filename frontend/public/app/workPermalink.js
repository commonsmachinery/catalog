
define(function(require){

	var $ = require('jquery');
	var Work = require('models/work');
	var WorkView = require('views/singleWork');

	var $bootstrapData = $('.bootstrapData');
	var workData = JSON.parse($bootstrapData.text());
	$bootstrapData.remove();
	delete $bootstrapData;
	var work = new Work(workData);
	var workView = new WorkView(work);
	workView.render(work);
	return;
})