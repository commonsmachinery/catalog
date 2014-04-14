
JSLINT = ./node_modules/.bin/jslint
TESTS = ${1:-*}

node-js-dirs = . lib lib/* public/app public/app/*

lint:
	$(JSLINT) --node -- $(node-js-dirs:%=%/*.js)

test:
	@NODE_ENV=test ./node_modules/.bin/mocha --reporter spec

.PHONY: test