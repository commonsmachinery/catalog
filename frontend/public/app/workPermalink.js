
define(function(require){

	var $ = require('jquery');
	var Work = require('models/work');

	function defToJSON (index, elem) {
		workData[elem.dataset.key] = $(elem).text();
	}
	function editMode (ev) {
		function makeInput (index, elem) {
			var value = $(elem).text();
			$(elem).empty();
			$(elem).append('<input type="text">');
			var input = $(elem).find('input');
			$(input).val(value);
			$(input).attr('data-key', elem.dataset.key);
			$(input).on('change', setVal);
		}
		function makeText(index, elem){
			var value = $(elem).find('input').val();
			$(elem).empty();
			$(elem).text(value);
		}
		function save(ev){
			$(ev.target).val('edit');
			$('.editable').each(makeText);
			$(ev.target).one('click', editMode);
			work.sync('update', work);
		}
		function setVal (ev) {
			var key = ev.target.dataset.key;
			var val = ev.target.value;
			work.set(key, val);
		}

		$(ev.target).val('save');
		$('.editable').each(makeInput);
		$(ev.target).one('click', save);
		return;
	}

	var workData = {};
	$('dd').each(defToJSON);
	workData.id = $('#id').text();
	var work = new Work(workData);
	$('.edit').one('click', editMode);
	return;
})