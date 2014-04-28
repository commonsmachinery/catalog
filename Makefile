
# Lint all code that should be linted
lint: lint-apitest lint-frontend

lint-apitest:
	$(MAKE) -C apitest lint

lint-frontend:
	$(MAKE) -C frontend lint

.PHONY: lint lint-apitest lint-frontend


# Run all unit tests
test: test-frontend test-backend

test-frontend:
	$(MAKE) -C frontend test

test-backend:
	$(MAKE) -C backend test

.PHONY: test-frontend test-backend


# Run the API tests
apitest:
	$(MAKE) -C apitest run

.PHONY: apitest

