/* Catalog web/REST frontend - REST API

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Authors: 
        Peter Liljenberg <peter@commonsmachinery.se>
        Elsa Balderrama <elsa@commonsmachinery.se>

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

function app (){
    app.get('/', getHome);
    app.get('/browse', getBrowse);
}

function getBrowse (req, res) {
	res.render('browse');
}
function getHome (req, res) {
    res.render('home');
}

module.exports = app;