import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { construir } from '../scripts/build.mjs';
import { cargarNegocios, cargarGuias } from '../scripts/lib/negocios.mjs';
import { menuHtml } from '../scripts/lib/plantillas.mjs';
import { numero, extraerDatos, analizarFactura, simularSolar } from '../src/cliente/energia.js';

const { ref } = cargarNegocios();
const sitio = JSON.parse(readFileSync('data/sitio.json', 'utf8'));

test('numero entiende formatos españoles', () => {
  assert.equal(numero('1.234,56'), 1234.56);
  assert.equal(numero('4,6'), 4.6);
  assert.equal(numero('17.2'), 17.2);
  assert.equal(numero('4.250'), 4250);
  assert.equal(numero('abc'), null);
});

test('lee la factura de ejemplo y encuentra potencia sobrante y reactiva', () => {
  const d = extraerDatos(readFileSync('data/factura-ejemplo.txt', 'utf8'));
  assert.equal(d.tarifa, '3.0TD');
  assert.equal(d.dias, 30);
  assert.deepEqual(d.potencias, [30, 30, 30, 30, 30, 30]);
  assert.deepEqual(d.maximetros, [17.2, 18, 16.4, 15.1, 14, 9.8]);
  assert.equal(d.consumoKwh, 4250);
  assert.equal(d.importePotencia, 245.1);
  assert.equal(d.importeEnergia, 701.25);
  assert.equal(d.importeReactiva, 49.03);
  assert.equal(d.total, 1282.24);
  const r = analizarFactura(d, ref, { tipo: 'negocio' });
  assert.deepEqual(r.hallazgos.map((h) => h.id).sort(), ['potencia', 'precio-empresa', 'reactiva']);
  assert.equal(r.ahorroAnual, 1855);
  assert.ok(r.solar.kWp > 15 && r.solar.amortizacionAnos < 8);
});

test('en 2.0TD avisa si la energía está cara frente a la referencia', () => {
  const r = analizarFactura({ tarifa: '2.0TD', dias: 30, consumoKwh: 300, importeEnergia: 60, potencias: [], maximetros: [] }, ref);
  const precio = r.hallazgos.find((h) => h.id === 'precio');
  assert.ok(precio && precio.ahorroAnual > 0);
});

test('simulador solar dimensiona y calcula amortización', () => {
  const s = simularSolar({ consumoAnualKwh: 10000, fraccionDiurna: 0.6, precioKwh: 0.15 }, ref.solar);
  assert.equal(s.kWp, 4);
  assert.equal(s.coste, 6000);
  assert.equal(s.ahorroAnual, 900);
  assert.equal(s.amortizacionAnos, 6.7);
  assert.equal(simularSolar({ consumoAnualKwh: 0, fraccionDiurna: 0.5, precioKwh: 0.1 }, ref.solar), null);
});

test('cada guía tiene título, descripción, ruta y preguntas frecuentes', () => {
  const guias = cargarGuias();
  assert.ok(guias.length >= 11);
  for (const g of guias) {
    assert.match(g.ruta, /^\/.+\/$/, g.ruta);
    assert.match(g.cuerpo ?? g.contenido ?? JSON.stringify(g), /Preguntas frecuentes/, g.ruta);
  }
});

test('el menú agrupa enlaces en desplegables', () => {
  const html = menuHtml(sitio.menu, '/revisar-factura/');
  assert.equal((html.match(/class="menu-grupo/g) || []).length, sitio.menu.length);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /href="\/revisar-factura\/"/);
});

test('genera portada de negocios, lector, placas, guías y pdf.js local', () => {
  const salida = mkdtempSync(join(tmpdir(), 'negocios-'));
  construir({ salida });
  const leer = (f) => readFileSync(join(salida, f), 'utf8');
  const inicio = leer('index.html');
  assert.match(inicio, /href="\/revisar-factura\/"/);
  assert.match(inicio, /"@type":\s*"Service"/);
  assert.match(leer('revisar-factura/index.html'), /id="datos-revisar"/);
  assert.match(leer('placas-solares/index.html'), /\/js\/placas\.js/);
  assert.match(leer('negocios/energia-reactiva/index.html'), /FAQPage/);
  assert.ok(existsSync(join(salida, 'js/pdfjs/pdf.min.js')));
  assert.ok(existsSync(join(salida, 'js/pdfjs/pdf.worker.min.js')));
  const mapa = leer('sitemap.xml');
  for (const g of sitio.menu.flatMap((x) => x.enlaces)) assert.ok(mapa.includes(g.ruta), `sitemap sin ${g.ruta}`);
});
