all: clean
	npm install
	nodejs phet_scraper.js
	nodejs data_adapter.js

clean:
	rm -rf data imagenes experimentos phet_scraper.json node_modules
