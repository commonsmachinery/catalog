
UMLET = umlet

models = core

all: $(models:%=%.png)

%.png: %.uxf
	$(UMLET) -action=convert -format=png -filename=$^
