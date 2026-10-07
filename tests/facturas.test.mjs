import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { construir } from '../scripts/build.mjs';
import { cargarFacturas, preguntasFactura } from '../scripts/lib/facturas.mjs';
import { calcularFacturas, referenciaMes, ahorroMes, mejorBono, listaBonos } from '../src/cliente/facturas.js';

const datos = cargarFacturas();
const porSlug = (s) => datos.facturas.find((f) => f.slug === s);

test('cada factura tiene media con fuente, forma de ahorro y opciones con enlace', () => {
  for (const f of datos.facturas) {
    assert.ok(f.gastoMedioMes > 0, f.slug);
    assert.ok(f.fuenteGasto.url.startsWith('https://'), f.slug);
    assert.ok(f.consejos.length >= 3, f.slug);
    assert.ok(referenciaMes(f) !== null || f.ahorroPct > 0, f.slug);
    for (const o of f.opciones) {
      assert.equal(o.enlace, `/ir/${o.slug}/`);
      if (o.bono > 0) assert.ok(o.bonoTexto, `${o.slug} con bono sin explicar`);
    }
  }
});

test('calcula ahorro por precio de referencia o por porcentaje, y suma el mejor bono de cada factura', () => {
  assert.equal(referenciaMes(porSlug('fibra-y-movil')), 30);
  assert.equal(ahorroMes(porSlug('fibra-y-movil'), 50), 20);
  assert.equal(ahorroMes(porSlug('fibra-y-movil'), 25), 0);
  assert.equal(ahorroMes(porSlug('suscripciones'), 40), 20);
  assert.equal(mejorBono(porSlug('banco')).slug, 'ing');
  assert.equal(mejorBono(porSlug('suscripciones')), null);
  const r = calcularFacturas({ 'fibra-y-movil': 50, banco: 10, suscripciones: 0, nada: 99 }, datos.facturas);
  assert.equal(r.lineas.length, 3);
  assert.equal(r.gastoMes, 60);
  assert.equal(r.ahorroMes, 30);
  assert.equal(r.ahorroAnual, 360);
  assert.equal(r.bonos, 60 + 250);
  assert.deepEqual(listaBonos(datos.facturas).map((b) => b.bono), [...listaBonos(datos.facturas).map((b) => b.bono)].sort((a, b) => b - a));
  assert.ok(preguntasFactura(porSlug('banco')).length === 3);
});

test('genera la portada de facturas, una página por factura, bonos, software y enlaces /ir/', () => {
  const salida = mkdtempSync(join(tmpdir(), 'facturas-'));
  construir({ salida });
  const leer = (f) => readFileSync(join(salida, f), 'utf8');
  const inicio = leer('index.html');
  assert.match(inicio, /id="datos-facturas"/);
  assert.match(inicio, /\/js\/hogar\.js/);
  assert.ok(existsSync(join(salida, 'js/facturas.js')));
  const banco = leer('facturas/banco/index.html');
  assert.match(banco, /FAQPage/);
  assert.match(banco, /href="\/ir\/ing\/" rel="sponsored nofollow noopener"/);
  assert.match(leer('bonos/index.html'), /Te pagan hasta/);
  assert.match(leer('software/index.html'), /id="datos-stack"/);
  assert.match(leer('_redirects'), /^\/ir\/octopus-energy\/ https:\/\/octopusenergy\.es\/ 302$/m);
  const mapa = leer('sitemap.xml');
  for (const ruta of ['/bonos/', '/facturas/luz-y-gas/', '/software/']) assert.ok(mapa.includes(ruta), `sitemap sin ${ruta}`);
});
