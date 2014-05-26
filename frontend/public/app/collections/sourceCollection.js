/* Catalog web application - Backbone collection of works
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

define(['lib/backbone', 'models/sourceModel'],
       function(Backbone, Source)
{
    'use strict';

    var SourceCollection = Backbone.Collection.extend({
        model: Source,

        initialize: function(models, options) {
            this.url = options.parentURL + '/sources';
        }
    });

	return SourceCollection;
});
