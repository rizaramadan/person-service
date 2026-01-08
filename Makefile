# run rpm test from specs folder
test:
	make build
	cd specs && npm run test:no-build

# run rpm test from specs folder without building the docker image
test-only:
	cd specs && npm run test:no-build

# run unit tests
test-unit:
	cd source/app && go test -v ./...

# run unit tests with coverage
test-unit-coverage:
	cd source/app && go test -coverprofile=../../specs/coverage/unit.out ./...
	cd source/app && go tool cover -func=../../specs/coverage/unit.out

# run tests with coverage (integration + unit tests merged)
test-coverage:
	cd specs && npm run test:coverage

# merge coverage from unit tests and integration tests (run after test-coverage has collected go-data)
merge-coverage:
	cd specs && npm run coverage:merge

# serve the coverage report
serve-coverage:
	@echo "Serving coverage report at http://localhost:8181/report.html"
	cd specs/coverage && python3 -m http.server 8181

# build the docker image and npm install in the specs folder. Make this the default target
build:
	cd source && docker compose build
	cd specs && npm install
