/* Catalog web application - browsing list of works
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

define(['jquery', 'util', 'models/workModel', 'views/workView'],
       function($, util, Work, WorkView)
{
	'use strict'; 

    var work = null;
    var view = null;

    return function workPermalink (router, id) {
        console.log('activating work view');

        var data = util.bootstrapData();

        if (data) {
            work = new Work(data);
        }
        else {
            console.debug('fetching work %s from server (no bootstrap data)', id);
            work = new Work({ id: id });
            work.fetch();
        }

        // TODO: more generic error handling in util, please
        work.on('error', function (obj, response, options) {
            console.error('error syncing %s: %s %s %s',
                          obj.id, response.status, response.statusText,
                          response.responseText);
        });

        view = new WorkView({
            el: '#work',
            model: work,
        });
        view.render();
    };
});
