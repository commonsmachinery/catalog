
define(function(require){
	var Backbone = require('lib/backbone');
	var Work = require('models/work');

	var workCollection = Backbone.Collection.extend({
		model: Work
		initialize: function(comparator){
			this.comparator = comparator ? comparator : 'created';
		}
	})
})