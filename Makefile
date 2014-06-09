
top := $(CURDIR)

# List all modules that participate in the build
modules := . lib frontend apitest
modules += modules/core
modules += modules/auth

# Modules should add files to be checked with jshint
jshint-files =

# Modules should add files to be run as unit tests
mocha-files =

# Modules should add files and dirs to be cleaned away
clean-files =
clean-dirs =


# Tools etc
JSHINT = $(top)/node_modules/.bin/jshint
MOCHA = $(top)/node_modules/.bin/mocha
STYLUS = $(top)/node_modules/.bin/stylus

SET_DEBUG =
DO_MOCHA = NODE_TLS_REJECT_UNAUTHORIZED=0 NODE_ENV=development $(SET_DEBUG) $(MOCHA) --reporter spec

REPORTER=
ifeq ($(EMACS),t)
REPORTER=--reporter=$(top)/.jshint-emacs.js
endif


# The submodules can add dependencies to these to do specific stuff.
# But do not add commands directly to these top-level targets!

all: lint

lint: $(jshint-files)
	$(JSHINT) $(REPORTER) $(jshint-files)

test: $(mocha-files)
#	$(DO_MOCHA) $(mocha-files)

clean:
	rm -f $(clean-files)
	rm -rf $(clean-dirs)


.PHONY: all lint test clean


# Include module-specific stuff to populate the variables
include $(modules:%=%/include.mk)
