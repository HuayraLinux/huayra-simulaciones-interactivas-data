#!/usr/bin/env python
# -*- coding: utf-8 -*-

import urllib2, json, os, shutil
import pprint
from BeautifulSoup import BeautifulSoup
import io
import sys

HOST = 'phet.colorado.edu'
PROTOCOL = 'http'
INDEX_URL = '/es/simulations/category/new'
INDEX_URL = '/es/simulations/index'
SIM_URL = '/es/simulation/'

DIR_BASE = 'data'
DIR_SIMULACIONES = os.path.join(DIR_BASE, 'simulaciones')
DIR_FONDOS = os.path.join(DIR_BASE, 'fondos')
DIR_SCREENSHOTS = os.path.join(DIR_BASE, 'screenshots')

NO_PARSEAR = [u'Todas las simulaciones', u'Simulaciones traducidas', u'Según el grado escolar',
              u'Nuevas Simulaciones', u'By Device']

if os.path.exists(DIR_BASE):
	shutil.rmtree(DIR_BASE)
os.makedirs(DIR_BASE)
os.makedirs(DIR_SCREENSHOTS)
os.makedirs(DIR_FONDOS)
os.makedirs(DIR_SIMULACIONES)

def pseudo_slug(path):
        return path.split('/')[::-1][0]


def http_download(url, dest):
	data = urllib2.urlopen(url).read()
	output = open(dest, 'w')
	output.write(data)
	output.close()


def parsear_simulacion(simu):
	sim_page = urllib2.urlopen('%s://%s%s' % (PROTOCOL, HOST, simu['url']))
	sim_soup = BeautifulSoup(sim_page)

	contenedor = sim_soup.find('table', attrs={'class': 'simulation-main-table'})

	screenshot_url = contenedor.find('img', attrs={'class': 'simulation-main-screenshot'}).get('src')
	archivo_url = contenedor.find('a', attrs={'class': 'sim-download sim-button'}).get('href')

	guardar_archivos(screenshot_url, archivo_url)

	return {'name': simu['name'],
		'description': contenedor.find('span', attrs={'itemprop': 'description about'}).contents[0],
		'screenshot': os.path.basename(screenshot_url),
		'file': os.path.basename(archivo_url).replace('?download','') }


def guardar_archivos(screenshot_url, archivo_url):
        archivo = os.path.basename(screenshot_url)
        http_download("%s://%s%s" % (PROTOCOL, HOST, screenshot_url),
                      os.path.join(DIR_SCREENSHOTS, archivo))

        archivo = os.path.basename(archivo_url).replace('?download','')
        http_download("%s://%s%s" % (PROTOCOL, HOST, archivo_url),
                      os.path.join(DIR_SIMULACIONES, archivo))

def guardar_fondos(d_screenshots, d_fondos):
    archivos = []
    for path, dname, files in os.walk(d_screenshots):
        archivos = map(lambda f:(os.path.join(d_screenshots, f),
                                 os.path.join(d_fondos, f)), files)

    for sshot, bg in archivos:
        # por decision unanime:
        os.system("convert -resize 340% -gaussian-blur 10x10 {orig} {dest}".format(orig=sshot,
                                                                                   dest=bg))

def guardar_json(archivo, data):
        with io.open(archivo, 'w', encoding='utf-8') as f:
                f.write(data)


index_page = urllib2.urlopen('%s://%s%s' % (PROTOCOL, HOST, INDEX_URL))
index_soup = BeautifulSoup(index_page)

lcategorias = index_soup.body.find('div', attrs={'class' : 'side-nav'}).findAll('a', attrs={'class' : 'nml-link nav1'})
links_categorias = dict([(pseudo_slug(l['href']),
                          {'name': l.contents[1].contents[0],
                           'url': l['href'].rstrip('/')+'/index',
                           'fondo': pseudo_slug(l['href']) + '.png',
                           'simus': []})
                         for l in filter(lambda l: l.text not in NO_PARSEAR, lcategorias)])


lsimulaciones = index_soup.body.find('div', attrs={'class' : 'simulation-index'}).findAll('a')
links_simulaciones = dict([(pseudo_slug(l['href']),
                            {'name':l.text,
                             'url': l['href']})
                           for l in lsimulaciones])
simulaciones_data = {}


for categoria in links_categorias:
	cat_page = urllib2.urlopen('%s://%s%s' % (PROTOCOL, HOST, links_categorias[categoria]['url']))
	cat_soup = BeautifulSoup(cat_page) # or ketchup
        links_sim_cat = cat_soup.body.find('div', attrs={'class' : 'simulation-index'}).findAll('a')
        links_categorias[categoria]['simus'] = [pseudo_slug(l['href']) for l in links_sim_cat]
        del links_categorias[categoria]['url']

for sim in links_simulaciones:
        simulaciones_data[sim] = parsear_simulacion(links_simulaciones[sim])

generar_fondos(DIR_SCREENSHOTS, DIR_FONDOS)

guardar_json(os.path.join(DIR_BASE, 'simulaciones.js'),
             u"var simulations = " + unicode(json.dumps(simulaciones_data, ensure_ascii=False, indent=4)))

guardar_json(os.path.join(DIR_BASE, 'categories.js'),
             u"var categories = " + unicode(json.dumps(links_categorias, ensure_ascii=False, indent=4)))
