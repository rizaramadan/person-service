# run rpm test from specs folder
test:
	cd specs && npm test

# run rpm test from specs folder without building the docker image
test-only:
	cd specs && npm run test:no-build

# build the docker image
build:
	cd source && docker-compose build

# run the docker image