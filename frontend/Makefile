
JSHINT = ./node_modules/.bin/jshint

node-js = *.js lib/*.js lib/*/*.js
browser-js = public/app/*.js public/app/*/*.js

REPORTER=
ifeq ($(EMACS),t)
REPORTER=--reporter=../.jshint-emacs.js
endif

lint:
	$(JSHINT) $(REPORTER) $(node-js) $(browser-js)

.PHONY: lint


# no tests yet
test:

.PHONY: test
