
define(function(require){

	var Backbone = require('lib/backbone');
	var Work = Backbone.Model.extend({
		urlRoot: '/works',
		initialize: function(){
			this.on('change:created', setDate);
			return;
		}
	});

	function setDate (model, val, opt) {
		var date = new Date(val).getTime();
		model.set('created', date);
		return;
	}
	return Work;
})