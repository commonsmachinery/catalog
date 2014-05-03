
JSHINT = ./node_modules/.bin/jshint
STYLUS = ./node_modules/.bin/stylus

node-js = *.js lib/*.js lib/*/*.js
browser-js = public/app/*.js public/app/*/*.js

REPORTER=
ifeq ($(EMACS),t)
REPORTER=--reporter=../.jshint-emacs.js
endif

lint:
	$(JSHINT) $(REPORTER) $(node-js) $(browser-js)
style:
	$(STYLUS) ./styles -o ./public/css

.PHONY: lint style


# no tests yet
test:

.PHONY: test
