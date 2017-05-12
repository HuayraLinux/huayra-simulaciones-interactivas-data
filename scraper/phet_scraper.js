const osmosis = require('osmosis');
const fs = require('fs');

const dump_filename = 'phet_scraper.json';

function all_data(osmosis_instance) {
  const data_list = [];
  return new Promise((resolve) =>
    osmosis_instance.data((data) => data_list.push(data))
                    .done(() => resolve(data_list)));
}

function unificar_experimentos([descargas, metadata]) {
  /* Creo un objeto { nombre => experimento }  */
  const experimentos_obj = descargas.reduce((obj, experimento) => {
    return Object.assign({[experimento.nombre]: experimento}, obj)
  }, {});

  /* Le agrego la data */
  const result = metadata.reduce((obj, data) => {
    const experimento = Object.assign({}, data, experimentos_obj[data.nombre]);
    return Object.assign({}, obj, { [data.nombre]: experimento });
  }, {});

  return result;
}

function print(osmosis_instance) {
  all_data(osmosis_instance).then(console.log);
}

function write_json(data, filename = dump_filename, spaces = 4, cb = () => {}) {
  fs.writeFile(filename, JSON.stringify(data, null, spaces), cb);
}

function log(prefijo) {
  return console.log.bind(console, `[${prefijo}]`);
}

const experimentos_descargas_url = 'https://phet.colorado.edu/es/offline-access';
const experimentos_descargas = osmosis(experimentos_descargas_url)
.find('#offline-access tr.offline-access')
.set({
    'nombre': '.oa-title > span',
    'html5': '.oa-html5 > a@href',
    'flash': '.oa-flash > a@href',
    'java': '.oa-java > a@href'
})
.log(log('experimentos'))
.error(log('experimentos'));

const experimentos_data_url = 'https://phet.colorado.edu/es/simulations'
const experimentos_data = osmosis(experimentos_data_url)
.follow('a.simulation-link@href')
.set({
  'nombre': '.simulation-main-title',
  'imagen': '.simulation-main-screenshot@src',
  'categorias': ['.nml-link-label.selected'],
  'info': '#about:html',
  'credits': '#credits:html'
})
.log(log('experimentos_data'))
.error(log('experimentos_data'));

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

const experimentos = Promise.all([experimentos_descargas, experimentos_data].map(all_data))
                            .then(unificar_experimentos);

Promise.all([experimentos, all_data(categorias)])
.then(([experimentos, categorias]) => ({ experimentos, categorias }))
.then(write_json)
.catch(log('ERROR'));

//
// Esto no funciona, lo comento por si en alg�n momento puedo hacerlo andar
//
//const actividades_parse_table = (context, data, next) => {
//  context
//  .find('tr')
//  .set({
//    'key': 'td:first',
//    'value': 'td:last'
//  })
//  .data(({key, value}) => data[key] = value)
//  .done(() => next(context, data));
//};
//
//const actividades_url = 'https://phet.colorado.edu/es/teaching-resources/browse-activities?sims=all&types=all&levels=all&locales=es&locales=es_CO&locales=es_CR&locales=es_ES&locales=es_MX&locales=es_PE';
//const actividades = osmosis(actividades_url)
//.find('a')
//.set('link', '@href')
//.follow('@href')
//.find('table:first')
//.then(actividades_parse_table)
//.set({
//  autor: osmosis.find('table:last').then(actividades_parse_table)
//})
//.log(log('actividades'))
//.error(log('actividades'));
//
//all_data(actividades).then((a) => JSON.stringify(a, null, 4)).then(console.log);
