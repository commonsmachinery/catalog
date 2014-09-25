
fe-catalog = $(top)/frontend/catalog

jshint-files += $(fe-catalog)/*.js
jshint-files += $(fe-catalog)/lib/*.js
jshint-files += $(fe-catalog)/lib/model/*.js
jshint-files += $(fe-catalog)/public/app/*.js
jshint-files += $(fe-catalog)/public/app/*/*.js

fe-catalog-css-dir = $(fe-catalog)/public/css
fe-catalog-style-css = $(fe-catalog-css-dir)/style.css
fe-catalog-styles-dir = $(fe-catalog)/styles
fe-catalog-css-src = $(fe-catalog-styles-dir)/style.styl $(fe-catalog-styles-dir)/unsemantic-custom.styl $(fe-catalog-styles-dir)/theme/index.styl

clean-dirs += $(fe-catalog-css-dir)

all: $(fe-catalog-style-css)

$(fe-catalog-style-css): $(fe-catalog-css-dir) $(fe-catalog-css-src)
	$(STYLUS) $(fe-catalog-styles-dir) -o $(fe-catalog-css-dir) -U

$(fe-catalog-css-dir):
	mkdir -p $(fe-catalog-css-dir)
