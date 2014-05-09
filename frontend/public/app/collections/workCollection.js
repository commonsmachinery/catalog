/* Catalog web application - Backbone collection of works
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

define(['lib/backbone', 'models/workModel'],
	   function(Backbone, Work)
{
	'use strict';

	var WorkCollection = Backbone.Collection.extend({
		model: Work,
		url: '/works',

		initialize: function() {
		}
	});
	return WorkCollection;
});
