const osmosis = require('osmosis');
const fs = require('fs');
const {get} = require('https');
const path = require('path').parse;
const {write_json, log, mkdir} = require('./utils');

const dump_filename = 'phet_scraper.json';

function all_data(osmosis_instance) {
  const data_list = [];
  return new Promise(resolve => osmosis_instance
    .data(data => data_list.push(data))
    .done(() => resolve(data_list)));
}

function print(osmosis_instance) {
  all_data(osmosis_instance)
  .then(console.log);
}

function download_file(url, filename) {
  /* debug log */
  console.log('[download_file]', url, filename, 'STARTED');

  const file = fs.createWriteStream(filename);
  return new Promise((resolve, reject) => get(url, res => (res.on('close', resolve), res.pipe(file))))
    .then(use(() => console.log('[download_file]', url, filename, 'FINISHED')));
}

function create_dirs() {
  return Promise.all([
    mkdir('imagenes'),
    mkdir('experimentos')
  ]);
}

function download_data(experimentos) {
  return Promise.all(experimentos.map(({imagen, descarga}) => {
    const url = 'https://phet.colorado.edu';
    const imagen_filename = path(imagen).base;
    const descarga_filename = path(descarga).base.replace(/\?[^?]*$/, '');

    return Promise.all([
      download_file(`${url}${imagen}`, `imagenes/${imagen_filename}`),
      download_file(`${url}${descarga}`, `experimentos/${descarga_filename}`)
    ]);
  }));
}

function update_filenames(experimentos) {
  return experimentos.map(experimento => Object.assign({}, experimento, {
    imagen: path(experimento.imagen).base,
    filename: path(experimento.descarga).base.replace(/\?[^?]*$/, ''),
    descarga: undefined
  }));
}

function use(fun) {
  return val => (fun(val), val);
}

const experimentos_url = 'https://phet.colorado.edu/es/simulations'
const experimentos = osmosis(experimentos_url)
.follow('a.simulation-link@href')
.set({
  'nombre': '.simulation-main-title',
  'imagen': '.simulation-main-screenshot@src',
  'descarga': '#sim-download@href',
  'categorias': ['.nml-link-label.selected'],
  'info': '#about:html',
  'credits': '#credits:html'
})
.log(log('experimentos'))
.error(log('experimentos'));

const categorias_url = 'https://phet.colorado.edu/es/simulations';
const categorias = osmosis(categorias_url)
.find('#nav-location-nav-simulations + ul a')
.set('nombre', '.nml-link-label')
.follow('@href')
.set({
  'subcategorias': ['.nav2 .nml-link-label']
})
.log(log('categorias'))
.error(log('categorias'));

const experimentos_descargados = create_dirs()
.then(() => all_data(experimentos))
.then(use(download_data))
.then(update_filenames);

Promise.all([
  experimentos_descargados,
  all_data(categorias)
])
.then(([experimentos, categorias]) => ({experimentos, categorias}))
.then(data => write_json(data, dump_filename))
.catch(log('ERROR'));
