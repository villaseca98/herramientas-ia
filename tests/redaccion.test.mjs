import { test } from 'node:test';
import assert from 'node:assert/strict';
import { construirEncargo, sanearCuerpo, componerArticulo } from '../scripts/lib/redaccion.mjs';
import { cargarAfiliados, separarFrontmatter, validarArticulo, cargarSitio } from '../scripts/lib/contenido.mjs';
import { llamarGemini } from '../scripts/redactar.mjs';

const afiliados = cargarAfiliados();

test('el encargo lista solo los slugs permitidos', () => {
  const e = construirEncargo({ tipo: 'comparativa', titulo: 'Make vs n8n', herramientas: ['make', 'n8n'] }, afiliados);
  assert.match(e, /slug "make"/);
  assert.match(e, /slug "n8n"/);
  assert.doesNotMatch(e, /slug "semrush"/);
});

test('sanearCuerpo elimina atajos no permitidos', () => {
  const c = sanearCuerpo('A\n\n{{boton:make}}\n\n{{boton:semrush}}\n\n{{tabla:make,semrush}}\n\n{{raro:make}}', ['make']);
  assert.equal(c, 'A\n\n{{boton:make}}\n\n{{tabla:make}}');
});

test('componerArticulo produce un borrador válido', () => {
  const md = componerArticulo({ titulo: 'Make vs n8n', descripcion: 'D', cuerpo: 'Texto' }, { tipo: 'comparativa', herramientas: ['make', 'n8n'] }, 'automatizacion', '2026-10-06');
  const { datos, cuerpo } = separarFrontmatter(md);
  assert.equal(datos.estado, 'borrador');
  const art = { ...datos, fecha: String(datos.fecha), cuerpo };
  assert.deepEqual(validarArticulo(art, afiliados, cargarSitio().categorias), []);
});

test('llamarGemini lee la respuesta JSON y reintenta ante 429', async () => {
  const original = globalThis.fetch;
  const llamadas = [];
  globalThis.fetch = async (url, opts) => {
    llamadas.push({ url, opts });
    if (llamadas.length === 1) return new Response('lento', { status: 429 });
    const texto = JSON.stringify({ titulo: 'T', descripcion: 'D', cuerpo: 'C' });
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: texto }] } }] }), { status: 200 });
  };
  try {
    const r = await llamarGemini('hola', { clave: 'k', modelo: 'm', intentos: 2 });
    assert.deepEqual(r, { titulo: 'T', descripcion: 'D', cuerpo: 'C' });
    assert.equal(llamadas.length, 2);
    assert.match(llamadas[1].url, /models\/m:generateContent$/);
    assert.equal(llamadas[1].opts.headers['x-goog-api-key'], 'k');
  } finally {
    globalThis.fetch = original;
  }
});

test('llamarGemini exige clave', async () => {
  await assert.rejects(llamarGemini('x', { clave: '' }), /GEMINI_API_KEY/);
});
