
JSLINT = ./frontend/node_modules/.bin/jslint
MOCHA = ./frontend/node_modules/.bin/mocha

# lint-dirs = . lib lib/* public/app public/app/*
lint-dirs = ./frontend frontend/lib fontend/lib/* frontend/public/app frontend/public/app/*

ifdef test
	TEST='./test/$(test).js'
else
	TEST='./test/*.js'
endif

ifdef debug
	DEBUG = DEBUG="test:*"
endif


lint:
	$(JSLINT) --node -- $(lint-dirs:%=%/*.js)

test:
	DEBUG=test:* NODE_ENV=test $(MOCHA) --reporter spec $(TEST)

.PHONY: test