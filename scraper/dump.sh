#!/bin/bash
set -e -f

rm -rf data imagenes experimentos

npm install

node phet_scraper.js
node data_adapter.js
