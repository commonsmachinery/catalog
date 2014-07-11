/* Catalog web application - utility methods

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Authors:
        Peter Liljenberg <peter@commonsmachinery.se>

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/


define(['jquery', 'underscore', 'lib/Backbone.ModelBinder'],
	  function($, _, ModelBinder)
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

	// Helper functions for the default bindings
	var convertUserURI = function convertUserURI(direction, value) {
		if (value) {
			var pos = value.search(/\/[^\/]+$/);
			value = pos > 0 ? value.slice(pos + 1) : value;
		}

		return value;
	};

	var mergeBindings = function mergeBindings() {
		var bindings = arguments[0];

		for (var i = 1; i < arguments.length; i++) {
			var merging = arguments[i];
			for (var k in merging) {
				if (merging.hasOwnProperty(k)) {
					var b = bindings[k];
					var m = merging[k];

					if (b) {
						if (!_.isArray(b)) {
							bindings[k] = b = [b];
						}

						if (_.isArray(m)) {
							b.concat(m);
						}
						else {
							b.push(m);
						}
					}
					else {
						bindings[k] = m;
					}
				}
			}
		}

		return bindings;
	};

	/* Create default bindings for a view, setting up standard converters etc.
	   * The returned object can be passed to ModelBinder.bind().
	  */
	exports.createDefaultBindings = function createDefaultBindings(el, entryType) {
		var content = ModelBinder.createDefaultBindings(el, 'data-bind');
		var href = ModelBinder.createDefaultBindings(el, 'data-bind-href');

		for (var b in href) {
			if (href.hasOwnProperty(b)) {
				href[b].elAttribute = 'href';
			}
		}

		// Special converters for content

		if (content.metadataGraph) {
            content.metadataGraph.converter = function(direction, value) {
                if (direction === ModelBinder.Constants.ModelToView) {
                    return JSON.stringify(value, null, 2);
                }
                else {
					// TODO: Error handling here stinks. However, we
					// will probably never expose raw RDF/JSON in the
					// gui once we're past this initial work
                    return JSON.parse(value);
                }
            };
		}

		// TODO: the frontend should send us a proper user profile and
		// not just the URI.  Until then, at least strip away the base URL.
		if (content.creator) {
			content.creator.converter = convertUserURI;
		}

		if (content.updatedBy) {
			content.updatedBy.converter = convertUserURI;
		}

		if (content.addedBy) {
			content.addedBy.converter = convertUserURI;
		}

		return mergeBindings(content, href);
	};

	exports.working = function working(status, el){
        if(status === 'start'){
            $(el).addClass('working');
            $(el).prepend('<div class="overlay"><div class="loading"></div></div>');
        }
        else if(status === 'stop'){ 
            $(el).removeClass('working');
            $(el).find('.overlay').remove();
        }
	};

	exports.emptyViewElement = function emptyViewElement(view, parent){
		var id = parent.$el.attr('id');
		parent.$el.wrap('<div id="' + id + '">');
		parent._profileView.remove();
		parent.stopListening(view);
		parent.$el = $('#' + id);
	}

	return exports;
});
