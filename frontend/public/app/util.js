/*global define*/

define(function(require){
	'use strict'; 

	var $ = require('jquery');

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

	function editMode (ev, view) {
		$(ev.target).val('save');
		$(view.el).find('.editable').each(enableInput);
		$(ev.target).one('click', function(){
			save(ev, view);
		});
		return;
	}

	return {
		editMode: editMode
	};
});