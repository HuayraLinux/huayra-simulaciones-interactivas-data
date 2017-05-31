const fs = require('fs');

function write_json(data, filename, spaces = 4, cb = () => {}) {
  console.log('[write_json]', filename);
  fs.writeFile(filename, JSON.stringify(data, null, spaces), cb);
}

function log(prefijo) {
  return console.log.bind(console, `[${prefijo}]`);
}

function mkdir(dir) {
  return new Promise((resolve, reject) =>
    fs.mkdir(dir, err => err? reject(err) : resolve()));
}

module.exports = {write_json, log, mkdir};
