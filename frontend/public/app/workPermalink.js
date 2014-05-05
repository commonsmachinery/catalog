/* Catalog web application - browsing list of works
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

define(['jquery', 'models/workModel', 'views/workView'],
	   function($, Work, WorkView)
{
	'use strict'; 

	return function workPermalink (router) {
		var $bootstrapData = $('.bootstrapData');
		var workData = JSON.parse($bootstrapData.text());
		$bootstrapData.remove();
		var work = new Work(workData);
		var workView = new WorkView(work, '#work');
		workView.render();
	};
});
