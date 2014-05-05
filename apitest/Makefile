
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

all: lint

test:
# this would've run unit tests for the api tests, if there had been any.
# To run the apitests do "make run"

clean:

run:
	NODE_ENV=development $(DEBUG) $(MOCHA) --reporter spec $(TEST)

lint:
	$(JSHINT) $(REPORTER) $(test-js)

.PHONY: all clean run lint
