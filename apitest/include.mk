
apitest = $(top)/apitest

jshint-files += $(apitest)/*.js $(apitest)/modules/*.js

ifdef test
apitest-files += '$(apitest)/$(test).js'
else
apitest-files += '$(apitest)/*.js'
endif

ifdef debug
SET_DEBUG = DEBUG="test:*"
endif


apitest:
	$(DO_MOCHA) $(apitest-files)

.PHONY: apitest
