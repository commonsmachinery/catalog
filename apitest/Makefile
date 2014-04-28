
JSHINT = ./node_modules/.bin/jshint
MOCHA = ./node_modules/.bin/mocha

ifdef test
TEST = './$(test).js'
else
TEST = './*.js'
endif

ifdef debug
DEBUG = DEBUG="test:*"
endif


test-js = *.js modules/*.js

REPORTER=
ifeq ($(EMACS),t)
REPORTER=--reporter=../.jshint-emacs.js
endif


run:
	NODE_ENV=test $(DEBUG) $(MOCHA) --reporter spec $(TEST)

.PHONY: run


lint:
	$(JSHINT) $(REPORTER) $(test-js)

.PHONY: lint
