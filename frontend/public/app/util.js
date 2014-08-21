/* Catalog web application - utility methods

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Authors:
        Peter Liljenberg <peter@commonsmachinery.se>
        Elsa Balderrama <elsa@commonsmachinery.se>

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/


define(['jquery', 'underscore'],
	  function($, _)
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

    exports.bind = {
        aliasOrId: function aliasOrId($el, val, model){
            if($el.prop('tagName') === 'A'){
                $el.attr('href', model.href || model.get('href'));
            }
            if (val){
                $el.html(val);
            }
            else{
                $el.html(model.id);
            }
        },
        defOrRemove : function defOrRemove($el, val, model){
            if(val){
                $el.find('dd').html(val);
            }
            else{
                $el.remove();
            }
        },
        visibilityClass: function visibilityClass($el, val, model){
            if(model.get('_perms.write')){
                $el.removeClass('hidden');
                if (val){
                    $el.addClass('public');
                    $el.removeClass('private');
                }
                else {
                    $el.addClass('private');
                    $el.removeClass('public');
                }
            }
            else{
                $el.addClass('hidden');
            }
        }
    };

    exports.deletedURI = function deletedURI(view){
        view.$el.empty();
        view.stopListening();
        var msg = view.model.url() + ' successfully deleted.';
        view.$el.html(
            '<div class="dialog"><div class="success"><span>'+ 
                    msg +
                '</span>' +
                '<button class="back">Go Back</button>'+
            '</div></div>');
        view.$('.back').on('click', function(){
            window.history.back();
        });
    };

    exports.getNested = function getNested(model){
        return function(path){
            path = path.split('.');
            var attr = model.attributes;
            var len = path.length;
            for(var i=0; i < len; i++){
                if(attr === undefined){
                    return undefined;
                }
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
        // stop listening and empty view keeping the container
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
        var $el = view.$el;

        $el.find('.errorMsg').remove();

        if(Array.isArray(err)){
            var $ul = $('<ul class="errorMsg"></ul>');
            var len = err.length;
            for (var i=0; i < len; i++){
               var $li = $('<li></li>').text(err[i]);
                $ul.append($li);
            }
            $el.append($ul);
        }
        else{
            var $msg = $('<div class="errorMsg">' + err + '</div>').text(err);
            $el.append($msg);
        }
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

    return exports;
    });
