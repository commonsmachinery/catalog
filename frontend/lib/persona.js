'use strict';

var debug = require('debug')('frontend:persona');
var Promise = require('bluebird');
var https = require("https");

module.exports.verify = function verify(assertion){
    var vreq = https.request({
        host: "verifier.login.persona.org",
        path: "/verify",
        method: "POST"
    }, check);

    vreq.setHeader('Content-Type', 'application/x-www-form-urlencoded');

    var data = querystring.stringify({
        assertion: assertion,
        audience: env.CATALOG_BASE_URL
    });

    vreq.setHeader('Content-Length', data.length);

    function promise (resolve, reject){
        vreq.write(data);
        vreq.end()
        .then(
            function(){
                return;
            }, function(err){
                return;
            }
        );

        return;
    }
    

    return new Promise(promise);
}

function check (vres) {
    var body = "";
    vres.on('data', function(chunk) { 
        body += chunk; 
        console.log('//////// Chunk: %s', chunk);
        return;
    })
    .on('end', function() {
        function promise (resolve, reject) {
            try {
                var data = JSON.parse(body);
                if (verifierResp && verifierResp.status === "okay") {
                    var email = verifierResp.email;
                    resolve(email);
                } else {
                    console.error("failed to verify assertion: %s", verifierResp.reason);
                    res.send(verifierResp.reason, 403);
                }
            } 
            catch(e) {
                reject(e);
                console.error("non-JSON response from verifier");
            }
        }
        return new Promise(promise);
    });

    return;
}