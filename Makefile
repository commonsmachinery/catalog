
subdirs = frontend backend apitest

all:
	for d in $(subdirs); do make -C "$$d" all; done

test:
	for d in $(subdirs); do make -C "$$d" test; done

clean:
	for d in $(subdirs); do make -C "$$d" clean; done

.PHONY: all test clean


# TODO: remove the lint  when buildbot has been updated to use make all
# Lint all code that should be linted
lint: lint-apitest lint-frontend

lint-apitest:
	$(MAKE) -C apitest lint

lint-frontend:
	$(MAKE) -C frontend lint

.PHONY: lint lint-apitest lint-frontend


# Run the API tests
apitest:
	$(MAKE) -C apitest run

.PHONY: apitest

