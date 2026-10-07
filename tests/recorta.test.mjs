import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { construir } from '../scripts/build.mjs';
import { cargarAfiliados } from '../scripts/lib/contenido.mjs';
import { cargarStack, preguntasAlternativa } from '../scripts/lib/recorta.mjs';
import { calcularRecorte, mejorAlternativa, formatear } from '../src/cliente/recorte.js';

const stack = cargarStack(cargarAfiliados());

test('todas las herramientas del stack tienen alternativas con precio y texto honesto', () => {
  for (const h of stack.herramientas) {
    assert.ok(h.precioMes > 0, h.slug);
    assert.ok(h.urlPrecios.startsWith('https://'), h.slug);
    assert.ok(h.alternativas.length >= 1, h.slug);
    for (const a of h.alternativas) {
      assert.ok(a.porQue && a.pierdes, `${h.slug} -> ${a.nombre} sin porQue/pierdes`);
      assert.ok(a.enlace.startsWith('/ir/') || a.enlace.startsWith('https://'), a.enlace);
    }
  }
});

test('calcula el recorte con la alternativa más barata y prefiere afiliados en empate', () => {
  const r = calcularRecorte(['kajabi', 'mailchimp', 'kajabi', 'nada'], stack.herramientas);
  assert.equal(r.lineas.length, 2);
  assert.equal(r.gastoMes, 179 + 20);
  assert.equal(r.ahorroMes, 162 + 20);
  assert.equal(r.ahorroAnual, 182 * 12);
  assert.equal(mejorAlternativa(stack.herramientas.find((h) => h.slug === 'mailchimp')).afiliado, 'kit');
  assert.equal(calcularRecorte([], stack.herramientas).ahorroAnual, 0);
  const propio = calcularRecorte(['kajabi'], stack.herramientas, { kajabi: 143 });
  assert.equal(propio.gastoMes, 143);
  assert.equal(propio.ahorroMes, 143 - 17);
});

test('formatea cifras al estilo español', () => {
  assert.equal(formatear(1944), '1.944');
  assert.equal(formatear(19.99), '19,99');
  assert.equal(formatear(1234567), '1.234.567');
});

test('genera la calculadora, el directorio y una página por alternativa', () => {
  const salida = mkdtempSync(join(tmpdir(), 'recorta-'));
  construir({ salida });
  const inicio = readFileSync(join(salida, 'software/index.html'), 'utf8');
  assert.match(inicio, /id="datos-stack"/);
  assert.match(inicio, /\/js\/calculadora\.js/);
  assert.ok(existsSync(join(salida, 'js/recorte.js')));
  const kajabi = readFileSync(join(salida, 'alternativas/kajabi/index.html'), 'utf8');
  assert.match(kajabi, /FAQPage/);
  assert.match(kajabi, /href="\/ir\/systeme\/" rel="sponsored nofollow noopener"/);
  assert.match(readFileSync(join(salida, 'sitemap.xml'), 'utf8'), /\/alternativas\/zapier\//);
  assert.ok(existsSync(join(salida, 'guias/index.html')));
  assert.match(inicio, /id="por-que"/);
  assert.match(inicio, /Te lo migro gratis/);
  assert.match(readFileSync(join(salida, 'migracion-gratis/index.html'), 'utf8'), /comisión/);
  assert.match(inicio, /class="anuncio"/);
  assert.match(readFileSync(join(salida, 'precios/index.html'), 'utf8'), /Así gano dinero/);
  assert.equal(preguntasAlternativa(stack.herramientas.find((h) => h.slug === 'kajabi'), '$').length, 3);
});
