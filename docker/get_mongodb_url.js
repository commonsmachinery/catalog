
// Construct a CATALOG_MONGODB_URL from the docker link env vars.
// Merge this with any existing URL to ensure that we retain the auth
// info in it.

'use strict';

var url = require('url');

var mongodbURL = process.env.CATALOG_MONGODB_URL;

var host, port;
for (var v in process.env) {
    var m;
    if ((m = v.match(/^MONGODB_PORT_(\d+)_TCP_ADDR$/))) {
        host = process.env[v];
        port = process.env['MONGODB_PORT_' + m[1] + '_TCP_PORT'];
        break;
    }
}

if (host && port) {
    if (mongodbURL) {
        var u = url.parse(mongodbURL);
        u.host = null;
        u.hostname = host;
        u.port = port;
        console.log(url.format(u));
    }
    else {
        console.log('mongodb://%s:%s/', host, port);
    }
}
else if (mongodbURL) {
    // Just use as-is, since the container might be running in --net=host mode
    console.log(mongodbURL);
}
else {
    process.exit(1);
}
