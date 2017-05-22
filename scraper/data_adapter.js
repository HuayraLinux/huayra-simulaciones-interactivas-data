const {readFileSync, writeFileSync} = require('fs');
const {write_json, mkdir} = require('./utils');

const orig_filename = './phet_scraper.json';
const dump_filename = 'data/simulations.json';

function _in(array) {
  const set = new Set(array);
  return val => set.has(val)
}

function not(f) {
  return val => !f(val);
}

function procesar_categorias(categorias) {
  const valida = _in(categorias_validas);
  const results = categorias.map(cat => valida(cat) ? cat : subcategorias[cat])
                            .filter(val => val); /* Si es undefined al tacho */
  return [...new Set(results)]; /* Hago que los resultados duplicados se vayan */
}

const categorias_invalidas = [
  'HTML5', 'Todas las Simulaciones', 'Por Dispositivo',
  'Simulaciones Traducidas', 'Por Grado Escolar'
];

const dump = JSON.parse(readFileSync(orig_filename, 'utf-8'));

const categorias_validas = dump.categorias.map(cat => cat.nombre)
                                          .filter(not(_in(categorias_invalidas)));

const subcategorias = dump.categorias
.filter(cat => _in(categorias_validas)(cat.nombre))
.map(cat => cat.subcategorias.reduce((acc, sub) =>
  Object.assign({[sub]: cat.nombre}, acc), {}))
.reduce((acc, cat) => Object.assign({}, cat, acc));

const short_info_regex = /<p class="simulation-panel-indent" itemprop="description about">(.+)<\/p>/;

const experimentos = dump.experimentos.map(exp => ({
  title: exp.nombre,
  description: exp.info.match(short_info_regex)[1],
  categorias: procesar_categorias(exp.categorias),
  thumb: exp.imagen,
  screenshot: exp.imagen,
  file: exp.filename
}));


mkdir('data').then(() => write_json(experimentos, dump_filename));
