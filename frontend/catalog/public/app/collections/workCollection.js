/* Catalog web application - Backbone collection of works
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

define(['lib/backbone', 'lib/backbone.paginator', 'models/workModel'],
       function(Backbone, Paginator, Work)
{
    'use strict';

    var WorkCollection = Backbone.PageableCollection.extend({
        mode: 'infinite',
        model: Work,
        url: '/works',

        state: {
            currentPage: 1,
            firstPage: 1,
            pageSize: 12,
            sort: 'added_at'
        },

        queryParams: {
            sortKey: 'sort',
            include: 'all',
            filter: ''
        },

        initialize: function(data, opt){
            var per_page;
            var filter;
            if(window.location.search){
                per_page = window.location.search.match(/per_page=(\d+)/);
                if(per_page){
                    this.state.pageSize = Number(per_page[1]);
                }

                filter = window.location.search.match(/filter=([^&]+)/);
                if(filter){
                    this.state.filter = filter;
                }
            }
        }
    });

    return WorkCollection;
});