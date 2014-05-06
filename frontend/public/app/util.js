/* Catalog web application - utility methods

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Authors:
        Peter Liljenberg <peter@commonsmachinery.se>

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/


define(['jquery'], function($) {
	'use strict'; 

	function enableInput (index, elem) {
		$(elem).attr('disabled', false);
		return;
	}
	function makeText(index, elem){
		$(elem).attr('disabled', true);
		return;
	}
	function save(ev, view){
		$(ev.target).val('edit');
		$(view.el).find('.editable').each(makeText);
		$(ev.target).one('click', function(ev){
			editMode(ev, view);
		});
		var model = view.model;
		var changes = model.changesMade;
		if (changes >= 1){
			model.sync('update', model);
		}
		else{
			/* ToDo: when only one change made, patch */
			console.log('a');
			model.sync('update', model);
		}
		return;
	}

	function editMode(ev, view) {
		$(ev.target).val('save');
		$(view.el).find('.editable').each(enableInput);
		$(ev.target).one('click', function(){
			save(ev, view);
		});
		return;
	}

	var bootstrapData = function bootstrapData(selector) {
		if (!selector) {
			selector = '.bootstrapData';
		}

		var rawData = $(selector).html();

		if (!rawData) {
			console.error('no bootstrap data in selector %s', selector);
			return null;
		}

		try {
			var data = JSON.parse(rawData);
			return data.data || null;
		}
		catch (e) {
			console.error('failed to parse bootstrap data in selector %s: %s', selector, e);
			return null;
		}
	};

	return {
		editMode: editMode,
		bootstrapData: bootstrapData,
	};
});
