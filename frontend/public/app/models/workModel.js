
define(function(require){

	var Backbone = require('lib/backbone');
	var Work = Backbone.Model.extend({
		urlRoot: '/works',
		changesMade: '0',
		initialize: function(){
			var self = this;
			this.on('change', function(){
				self.changesMade++;
			})
			return;
		}
	});
	return Work;
})