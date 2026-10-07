import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { construir } from '../scripts/build.mjs';
import { cargarSitio, cargarAfiliados } from '../scripts/lib/contenido.mjs';
import { paginaArticulo, extraerPreguntas, recomendar } from '../scripts/lib/plantillas.mjs';

const salida = mkdtempSync(join(tmpdir(), 'web-'));
const r = construir({ salida });
const leer = (f) => readFileSync(join(salida, f), 'utf8');

test('el build genera páginas, redirecciones, sitemap y RSS', () => {
  assert.ok(r.articulos >= 1);
  for (const f of ['index.html', 'herramientas/index.html', 'aviso-afiliados/index.html', 'sitemap.xml', 'rss.xml', 'robots.txt', '_redirects', 'estilos.css', '404.html', 'ir/make/index.html', 'enlaces/index.html', 'favicon.svg']) {
    assert.ok(existsSync(join(salida, f)), `falta ${f}`);
  }
  assert.match(leer('_redirects'), /^\/ir\/make\/ https:\/\/www\.make\.com 302$/m);
  assert.match(leer('robots.txt'), /Disallow: \/ir\//);
});

test('genera fichas de herramientas, test y páginas de negocio', () => {
  for (const f of ['herramientas/make/index.html', 'herramientas/systeme/index.html', 'que-herramienta-necesito/index.html', 'recursos/index.html', 'servicios/index.html', 'patrocina/index.html']) {
    assert.ok(existsSync(join(salida, f)), `falta ${f}`);
  }
  const ficha = leer('herramientas/make/index.html');
  assert.match(ficha, /SoftwareApplication/);
  assert.match(ficha, /href="\/ir\/make\/" rel="sponsored nofollow/);
  const mapa = leer('sitemap.xml');
  for (const ruta of ['/herramientas/make/', '/que-herramienta-necesito/', '/recursos/', '/make-vs-n8n/']) assert.ok(mapa.includes(ruta), `sitemap sin ${ruta}`);
  assert.doesNotMatch(leer('recursos/index.html'), /\{\{newsletter\}\}/);
  assert.doesNotMatch(leer('servicios/index.html'), /\{\{contacto\}\}/);
});

test('los artículos publicados llevan FAQ en JSON-LD y no quedan atajos sin expandir', () => {
  const html = leer('make-vs-n8n/index.html');
  assert.match(html, /FAQPage/);
  assert.doesNotMatch(html, /noindex/);
  assert.doesNotMatch(html, /\{\{\w+:/);
});

test('los borradores llevan noindex', () => {
  const sitio = cargarSitio();
  const art = { slug: 'x', titulo: 'X', descripcion: 'd', fecha: '2026-10-07', categoria: 'automatizacion', tipo: 'tutorial', herramientas: [], estado: 'borrador', cuerpo: '' };
  assert.match(paginaArticulo(sitio, art, '', cargarAfiliados(), []), /noindex/);
});

test('extrae preguntas frecuentes y recomienda herramientas', () => {
  const qs = extraerPreguntas('Intro\n\n## Preguntas frecuentes\n\n**¿Es gratis?** Sí, del todo.\n\n**¿Y fácil?** Mucho.\n');
  assert.deepEqual(qs.map((q) => q.pregunta), ['¿Es gratis?', '¿Y fácil?']);
  const af = cargarAfiliados();
  assert.equal(recomendar('automatizar', 'cero', 'no', af)[0], 'make');
  assert.equal(recomendar('automatizar', 'cero', 'si', af)[0], 'n8n');
  assert.equal(recomendar('newsletter', 'cero', 'no', af)[0], 'beehiiv');
});
