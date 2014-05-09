/* Catalog web application - utility methods

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Authors:
        Peter Liljenberg <peter@commonsmachinery.se>

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/


define(['jquery', 'lib/Backbone.ModelBinder'],
	  function($, ModelBinder)
{
	'use strict';

	var exports = {};

	/* Locate, parse and return bootstrapped data.  If there isn't
	 * any, or it can't be parsed, return null.
	 */
	exports.bootstrapData = function bootstrapData(selector) {
		if (!selector) {
			selector = '.bootstrapData';
		}

		var rawData = $(selector).html();

		if (!rawData) {
			console.error('no bootstrap data in selector %s', selector);
			return null;
		}

		try {
			var data = JSON.parse(rawData);
			return data.data || null;
		}
		catch (e) {
			console.error('failed to parse bootstrap data in selector %s: %s', selector, e);
			return null;
		}
	};

	/* Create default bindings for a view, setting up standard converters etc.
	   * The returned object can be passed to ModelBinder.bind().
	  */
	exports.createDefaultBindings = function createDefaultBindings(el, entryType) {
		var bindings = ModelBinder.createDefaultBindings(el, 'data-bind');

		// TODO: these should have a proper converter function that
		// detects <a> and sets href on them, on others just set
		// the contents as normal

		if (bindings.resource) {
			bindings.resource.elAttribute = 'href';
		}

		if (bindings.metadata) {
			bindings.metadata.elAttribute = 'href';
		}

		if (bindings.metadataGraph) {
            bindings.metadataGraph.converter = function(direction, value) {
                if (direction === ModelBinder.Constants.ModelToView) {
                    return JSON.stringify(value, null, 2);
                }
                else {
                    return JSON.parse(value);
                }
            };
		}

		return bindings;
	};

	return exports;
});
