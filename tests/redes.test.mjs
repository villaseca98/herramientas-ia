import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { enlaceUtm, sanearKit, kitSimulado, renderizarKit, construirEncargoRedes } from '../scripts/lib/redes.mjs';
import { generarKits } from '../scripts/redes.mjs';

const sitio = { url: 'https://ejemplo.pages.dev' };
const art = { slug: 'make-vs-n8n', titulo: 'Make vs n8n', descripcion: 'Desc', herramientas: ['make', 'n8n'], cuerpo: 'Hola {{boton:make}} mundo' };

test('enlaceUtm etiqueta la red y la campaña', () => {
  assert.equal(enlaceUtm(sitio, 'make-vs-n8n', 'x'), 'https://ejemplo.pages.dev/make-vs-n8n/?utm_source=x&utm_medium=social&utm_campaign=make-vs-n8n');
});

test('el encargo no incluye los atajos de afiliado', () => {
  assert.doesNotMatch(construirEncargoRedes(art), /\{\{/);
});

test('sanearKit quita URLs, recorta y normaliza hashtags', () => {
  const k = sanearKit({
    clips: [{ titulo: 't', gancho: 'Mira https://spam.com ya', guion: ['a'], textoPantalla: ['b'], llamada: '' }],
    x: 'x'.repeat(400),
    hilo: ['uno'],
    hashtags: ['ia', '#Productividad', 'dos palabras', '#'],
  });
  assert.equal(k.clips[0].gancho, 'Mira ya');
  assert.equal(k.clips[0].llamada, 'Enlace en la bio.');
  assert.ok(k.x.length <= 230);
  assert.deepEqual(k.hashtags, ['#ia', '#Productividad', '#dospalabras']);
});

test('renderizarKit produce kit.md y un CSV válido', () => {
  const archivos = renderizarKit(sanearKit(kitSimulado(art)), art, sitio);
  assert.match(archivos['kit.md'], /### Clip 3/);
  assert.match(archivos['kit.md'], /utm_source=linkedin/);
  const lineas = archivos['publicaciones.csv'].trim().split('\n');
  assert.equal(lineas[0], '"red","texto","enlace"');
});

test('generarKits escribe un kit por artículo publicado', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'social-'));
  await generarKits({ articulo: 'make-vs-n8n', simular: true, dirSalida: dir });
  assert.ok(existsSync(join(dir, 'make-vs-n8n', 'kit.md')));
  assert.match(readFileSync(join(dir, 'make-vs-n8n', 'publicaciones.csv'), 'utf8'), /pinterest/);
});
