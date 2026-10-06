import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { construir } from '../scripts/build.mjs';

test('el build genera páginas, redirecciones, sitemap y RSS', () => {
  const salida = mkdtempSync(join(tmpdir(), 'web-'));
  const r = construir({ incluirBorradores: true, salida });
  assert.ok(r.articulos >= 1);
  for (const f of ['index.html', 'herramientas/index.html', 'aviso-afiliados/index.html', 'sitemap.xml', 'rss.xml', 'robots.txt', '_redirects', 'estilos.css', '404.html', 'ir/make/index.html']) {
    assert.ok(existsSync(join(salida, f)), `falta ${f}`);
  }
  const redir = readFileSync(join(salida, '_redirects'), 'utf8');
  assert.match(redir, /^\/ir\/make\/ https:\/\/www\.make\.com 302$/m);
  assert.match(readFileSync(join(salida, 'robots.txt'), 'utf8'), /Disallow: \/ir\//);
  const borrador = readFileSync(join(salida, 'make-vs-n8n', 'index.html'), 'utf8');
  assert.match(borrador, /noindex/);
  assert.doesNotMatch(readFileSync(join(salida, 'sitemap.xml'), 'utf8'), /make-vs-n8n/);
});
