'use strict';

var debug = require('debug')('frontend:persona');
var querystring = require('querystring');
var Promise = require('bluebird');
var https = require("https");
var env = process.env;


module.exports.verify = function verify(assertion){

    function promise (resolve, reject){
        
        function check (vres) {
            var body = "";
            vres.on('data', function(chunk) { 
                body += chunk; 
                return;
            })
            .on('end', function() {
                try {
                    var verifierResp = JSON.parse(body);
                    if (verifierResp && verifierResp.status === "okay") {
                        var email = verifierResp.email;
                        debug("persona verified successfully for email: %s", email);
                        resolve(email);
                    } else {
                        console.error("failed to verify assertion: %s", verifierResp.reason);
                        reject(verifierResp.reason);
                        return;
                    }
                } 
                catch(err) {
                    promiseObj.reject(err);
                    console.error("non-JSON response from verifier");
                }
                return;
            });

            return;
        }

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

        vreq.write(data);
        vreq.end();  

        return;
    }

    return new Promise(promise);
}
