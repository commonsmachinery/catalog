
UMLET = umlet

models = siteviews

all: $(models:%=%.png)

%.png: %.uxf
	$(UMLET) -action=convert -format=png -filename=$<
