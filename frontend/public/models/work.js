
define(function(require){

	var Backbone = require('backbone');
	var Work = Backbone.Model.extend({
		initialize: function(){
			$('dd').on('click', edit);
		}
	})
})