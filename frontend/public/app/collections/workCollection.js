/*global define*/

define(function(require){
	'use strict';

	var Backbone = require('lib/backbone');
	var Work = require('models/work');

	var WorkCollection = Backbone.Collection.extend({
		model: Work,
		initialize: function(comparator){
			this.comparator = comparator || 'created';
		}
	});
	return WorkCollection;
});