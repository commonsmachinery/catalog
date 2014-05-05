
JSHINT = ./node_modules/.bin/jshint
STYLUS = ./node_modules/.bin/stylus

node-js = *.js lib/*.js lib/*/*.js
browser-js = public/app/*.js public/app/*/*.js

css-dir = public/css
style-css = $(css-dir)/style.css
css-src = styles/style.styl styles/unsemantic-custom.styl styles/theme/index.styl

REPORTER=
ifeq ($(EMACS),t)
REPORTER=--reporter=../.jshint-emacs.js
endif

all: lint style

clean:
	rm -rf $(css-dir)

lint:
	$(JSHINT) $(REPORTER) $(node-js) $(browser-js)

style: $(style-css)

$(style-css): $(css-dir) $(css-src)
	$(STYLUS) ./styles -o ./public/css

$(css-dir):
	mkdir -p $(css-dir)


# no tests yet
test:

.PHONY: all clean lint style test

