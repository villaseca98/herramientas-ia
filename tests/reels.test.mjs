import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { construir } from '../scripts/build.mjs';
import { pagina } from '../scripts/lib/plantillas.mjs';

const cola = JSON.parse(readFileSync('data/reels.json', 'utf8'));
const sitio = JSON.parse(readFileSync('data/sitio.json', 'utf8'));

test('cada reel de la cola tiene vídeo, portada y texto, sin ids repetidos', () => {
  assert.ok(cola.reels.length >= 6);
  assert.equal(new Set(cola.reels.map((r) => r.id)).size, cola.reels.length);
  for (const r of cola.reels) {
    assert.ok(existsSync(join('public', r.video)), r.video);
    assert.ok(existsSync(join('public', r.portada)), r.portada);
    assert.ok(r.texto.length > 50 && r.texto.length <= 2200, `${r.id}: texto de Instagram vacío o demasiado largo`);
  }
});

test('el build publica la cola de reels y los vídeos', () => {
  const salida = mkdtempSync(join(tmpdir(), 'reels-'));
  construir({ salida });
  const publicada = JSON.parse(readFileSync(join(salida, 'reels/calendario.json'), 'utf8'));
  assert.deepEqual(publicada.reels.map((r) => r.id), cola.reels.map((r) => r.id));
  assert.match(publicada.base, /^https?:\/\//);
  assert.ok(existsSync(join(salida, cola.reels[0].video)));
});

test('el píxel de Meta solo aparece si está configurado', () => {
  const base = { titulo: 'x', descripcion: 'y', ruta: '/x/', contenido: '' };
  assert.doesNotMatch(pagina({ ...sitio, anuncios: { metaPixel: '' } }, base), /fbevents/);
  const con = pagina({ ...sitio, anuncios: { metaPixel: '123456' } }, base);
  assert.match(con, /fbq\('init','123456'\)/);
});
