/* Catalog web application - utility methods

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Authors:
        Peter Liljenberg <peter@commonsmachinery.se>
        Elsa Balderrama <elsa@commonsmachinery.se>

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

    var deepClone = exports.deepClone = function deepClone(src){ // jshint ignore: line
        var curr;
        var obj = {};
        for(var i in src){
            if(src.hasOwnProperty(i)){
                curr = src[i];
                if(typeof curr === 'object'){
                    obj[i] = _.clone(deepClone(curr));
                }
                else{
                    obj[i] = curr;
                }
            }
        }
        return obj;
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

    exports.getNested = function getNested(model){
        return function(path){
            path = path.split('.');
            var attr = model.attributes;
            var len = path.length;
            for(var i=0; i < len; i++){
                attr = attr[path[i]];
            }
            return attr;
        };
    };

    exports.setNested = function setNested(model, options){
        return function(obj){
            var attr;
            var path;
            var len;
            for(var i in obj){
                if(obj.hasOwnProperty(i)){
                    path = i.split('.');
                    attr = model.attributes;
                    len = path.length;
                    for(var j=0; j < len-1; j++){
                       attr = attr[path[j]];
                    }
                    attr[path[j]] = obj[i];
                    model.trigger('change:' + i, model, obj[i], options);
                }
            }
            model.trigger('change');
            return true;
        };
    };

    exports.emptyViewElement = function emptyViewElement(view, parent){
        // don't want to remove the container and do want to stop listening to this view
        view.stopListening();
        parent.stopListening(view);
        view.$el.empty();
        view.$el.unbind();
    };

    exports.isInvalid = function isInvalid(format, val){
        if(format === 'email'){
            //almost every RFC 5322 email
            if (!/^[a-z0-9!#$%&'*+\/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+\/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(val)){
                
                return 'Please check your email format';
            }
        }
        else if (format === 'url'){
            //supports TLDs
            if(!/^(?:http|https)\:\/\/(?:www\.)?(?:\w[\w-]*[\w]\.)+[\w]+[\/#?]?(\x00-\x80)*/.test(val)){

                return 'Please check your url format';
            }
        }
        else if (format === 'alphanum'){
            if(!/^[\w-]*$/.test(val)){

                return 'Valid characters are A-Z, a-z, 0-0, -_';
            }
        }
        else{
            throw new Error('Unknown validation string: ' + format);
        }
    };      

    exports.showError = function showError(view, err){
        working('stop', view.el);
        view.$('.actions').prop('disabled', false);

        var $el = view.$el;
        var $ul;

        $el.find('.errorMsg').remove();

        if(Array.isArray(err)){
            $el.append('<ul class="errorMsg"></ul>');
            $ul = $el.find('.errorMsg');
            var len = err.length;
            for (var i=0; i < len; i++){
                $ul.append('<li>' + err[i] + '</li>');
            }
        }
        else{
            $el.append('<div class="errorMsg">' + err + '</div>');
        }
        view.$('[data-action="save"]').text('Try again');
        view.$('.actions').prop('disabled', false);
    };

    var working = exports.working = function working(status, el){
        if(status === 'start'){
            $(el).addClass('working');
            $(el).prepend('<div class="overlay"><div class="loading"></div></div>');
        }
        else if(status === 'stop'){ 
            $(el).removeClass('working');
            $(el).find('.overlay').remove();
        }
    };

    return exports;
    });
