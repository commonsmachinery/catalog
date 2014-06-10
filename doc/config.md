Catalog configuration
=====================

The catalog can be configured with either files or environment
variables.

By default `config/$NODE_ENV.js` will be loaded, defaulting to
`development` if `NODE_ENV` isn't set or is nonsense.

This can be overridden by specifying a configuration file with the env
var `CATALOG_CONFIG_FILE`.  This must be an absolute path.

For details on available configuration file settings, see
`config/template.js`.

All settings in files can be overridden by environment variables.
Some commonly useful are listed below.  For full details on the
syntax, see https://www.npmjs.org/package/parse-env

Common settings
---------------

`CATALOG_MONGODB_URL` - Base URL for MongoDB accesses (omitting database).
Default: `mongodb://localhost:27017/`

If the database settings below are not a `mongodb:` URL, then they
should just be a database name which will be appended to the base
MongoDB URL.


Frontend
--------

`CATALOG_FRONTEND_PORT` - Port which the frontend listens on.
Default: `8004`

`CATALOG_BASE_URL` - Externally visible base URL (no trailing `/`).
Default: `http://localhost:8004`

`CATALOG_FRONTEND_SESSION_DB` - Session database (name or URL)
Default: `frontend-session-dev`

Auth
----

`CATALOG_AUTH_DB` - Auth module database (name or URL)
Default: `auth-dev`
