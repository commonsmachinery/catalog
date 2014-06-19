
frontend = $(top)/frontend

jshint-files += $(frontend)/*.js
jshint-files += $(frontend)/lib/*.js
jshint-files += $(frontend)/lib/api/*.js
jshint-files += $(frontend)/public/app/*.js
jshint-files += $(frontend)/public/app/*/*.js

frontend-css-dir = $(frontend)/public/css
frontend-style-css = $(frontend-css-dir)/style.css
frontend-styles-dir = $(frontend)/styles
frontend-css-src = $(frontend-styles-dir)/style.styl $(frontend-styles-dir)/unsemantic-custom.styl $(frontend-styles-dir)/theme/index.styl

clean-dirs += $(frontend-css-dir)

all: $(frontend-style-css)

$(frontend-style-css): $(frontend-css-dir) $(frontend-css-src)
	$(STYLUS) $(frontend-styles-dir) -o $(frontend-css-dir)

$(frontend-css-dir):
	mkdir -p $(frontend-css-dir)
