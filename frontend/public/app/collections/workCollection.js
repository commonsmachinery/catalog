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
        model: Work,
        url: '/works',

        state: {
            firstPage: 1,
            pageSize: 12,
            sort: 'added_at'
        },

        queryParams: {
            sortKey: 'sort',
            include: 'added_by',
            filter: ''
        },

        initialize: function(){
            var page;
            if(window.location.search){
                page = window.location.search.match(/(?:\&|\?)page=(\d+)/);
                var per_page = window.location.search.match(/per_page=(\d+)/);
                if(page){
                    this.state.currentPage = Number(page[1]);
                }
                if(per_page){
                    this.state.pageSize = Number(per_page[1]);
                }
            }
        }
    });

    return WorkCollection;
});