//- Catalog web - model for a work
//-
//- Copyright 2014 Commons Machinery http://commonsmachinery.se/
//- Distributed under an AGPL_v3 license, please see LICENSE in the top dir.

define(['lib/backbone'], function(Backbone) {
	'use strict'; 

	var Work = Backbone.Model.extend({
		urlRoot: '/works',

		changesMade: '0',

		initialize: function() {
			var self = this;
			this.on('change', function(){
				self.changesMade++;
			});
		},

		// TODO: validate dates, RDF/JSON etc
	});
	return Work;
});
