/*global define*/

define(function(require){
	'use strict'; 

	var Backbone = require('lib/backbone');
	var Source = Backbone.Model.extend({
		changesMade: '0',
		defaults: {
			metadata: '{\n\t"testMeta": "meta meta"\n}'
		},
		initialize: function(){
			var self = this;
			this.on('change', function(){
				self.changesMade++;
			});
			return;
		}
	});
	return Source;
});