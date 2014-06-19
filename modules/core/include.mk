
core = $(top)/modules/core

jshint-files += $(core)/*.js
jshint-files += $(core)/lib/*.js
jshint-files += $(core)/tests/*.js

mocha-files += $(core)/tests/*.js
