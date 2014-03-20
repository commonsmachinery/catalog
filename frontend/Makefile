
JSLINT = ./node_modules/.bin/jslint

node-js-dirs = . lib lib/* public/app public/app/*

lint:
	$(JSLINT) --node -- $(node-js-dirs:%=%/*.js)
