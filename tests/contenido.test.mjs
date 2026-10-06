import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugificar, separarFrontmatter, expandirAtajos, validarArticulo, cargarAfiliados, cargarSitio, renderizarMarkdown } from '../scripts/lib/contenido.mjs';

const afiliados = cargarAfiliados();
const { categorias } = cargarSitio();

test('slugificar quita tildes y símbolos', () => {
  assert.equal(slugificar('Make vs n8n: ¿cuál elegir en 2026?'), 'make-vs-n8n-cual-elegir-en-2026');
});

test('separarFrontmatter lee YAML y cuerpo', () => {
  const { datos, cuerpo } = separarFrontmatter('---\ntitulo: Hola\nherramientas: [make]\n---\nTexto');
  assert.equal(datos.titulo, 'Hola');
  assert.deepEqual(datos.herramientas, ['make']);
  assert.equal(cuerpo, 'Texto');
});

test('los atajos generan enlaces /ir/ patrocinados', () => {
  const html = expandirAtajos('{{boton:make}}', afiliados);
  assert.match(html, /href="\/ir\/make\/"/);
  assert.match(html, /rel="sponsored nofollow noopener"/);
  assert.match(expandirAtajos('{{tabla:make,n8n}}', afiliados), /<table class="comparativa">/);
});

test('un atajo con herramienta desconocida se deja intacto', () => {
  assert.equal(expandirAtajos('{{boton:nada}}', afiliados), '{{boton:nada}}');
});

test('el Markdown conserva el HTML de los atajos', () => {
  const html = renderizarMarkdown('Intro\n\n{{boton:make}}\n', afiliados);
  assert.match(html, /<p class="cta"><a class="boton"/);
});

const base = { titulo: 'T', descripcion: 'D', fecha: '2026-10-06', categoria: 'automatizacion', tipo: 'resena', herramientas: ['make'], estado: 'borrador', cuerpo: 'x' };

test('validarArticulo acepta un artículo correcto', () => {
  assert.deepEqual(validarArticulo(base, afiliados, categorias), []);
});

test('validarArticulo detecta errores', () => {
  const errores = validarArticulo({ ...base, categoria: 'otra', herramientas: ['nada'], cuerpo: '{{boton:zzz}}' }, afiliados, categorias);
  assert.equal(errores.length, 3);
});

test('no se puede publicar con marcadores pendientes', () => {
  const errores = validarArticulo({ ...base, estado: 'publicado', cuerpo: 'Hola [TU PRUEBA: captura]' }, afiliados, categorias);
  assert.equal(errores.length, 1);
  assert.deepEqual(validarArticulo({ ...base, cuerpo: 'Hola [TU PRUEBA: captura]' }, afiliados, categorias), []);
});

test('urlPublica prioriza SITIO_URL, luego el dominio de Vercel', async () => {
  const { urlPublica } = await import('../scripts/lib/contenido.mjs');
  assert.equal(urlPublica({ SITIO_URL: 'https://mi.web/' }, 'https://x'), 'https://mi.web');
  assert.equal(urlPublica({ VERCEL_PROJECT_PRODUCTION_URL: 'herramientas-ia.vercel.app' }, 'https://x'), 'https://herramientas-ia.vercel.app');
  assert.equal(urlPublica({}, 'https://x'), 'https://x');
});
