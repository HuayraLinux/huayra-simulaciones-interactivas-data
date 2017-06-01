const {readFileSync, writeFileSync} = require('fs');
const {write_json, mkdir} = require('./utils');

const orig_filename = './phet_scraper.json';
const dump_filename_simulations = 'data/simulations.json';
const dump_filename_categories = 'data/categories.json';

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

const experimentos = dump.experimentos
.map(exp => ({
  title: exp.nombre,
  description: exp.info.match(short_info_regex)[1],
  categorias: procesar_categorias(exp.categorias),
  screenshot: exp.imagen,
  file: exp.filename
}));

const cat_fondos = {
  'Física': 'fisica.png',
  'Química': 'quimica.png',
  'Biología': 'biologia.png',
  'Matemáticas': 'matematica.png',
  'Nuevas Simulaciones': 'nuevas.png',
  'Ciencias de la Tierra': 'tierra.png',
  'Investigaciones avanzadas': 'avanzadas.png'
};

const categorias = Object.assign({}, experimentos
.map(({categorias}, indice) => ({categorias, indice}))
.reduce((result, {categorias, indice}) =>
  Object.assign({}, result, categorias.reduce((acc, cat) => Object.assign({}, acc, {
    [cat]: {
      name: cat,
      fondo: cat_fondos[cat],
      simus: result[cat]? result[cat].simus.concat(indice) : [indice]
    }
  }), {})), {
}), {
  filtrar: {
    name: 'Resultados de búsqueda',
    fondo: 'buscar.png',
    simus: []
  }
});

mkdir('data')
.then(() => write_json(experimentos, dump_filename_simulations))
.then(() => write_json(categorias, dump_filename_categories));
