import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsearFeed, detectarHerramientas, ideasDelCatalogo, fusionarIdeas, ideaDesdeEntrada } from '../scripts/lib/ideas.mjs';
import { cargarAfiliados } from '../scripts/lib/contenido.mjs';

const afiliados = cargarAfiliados();

const RSS = `<?xml version="1.0"?><rss version="2.0"><channel><title>X</title>
<item><title>ElevenLabs lanza voces en español</title><link>https://ej.com/1</link><description>&lt;p&gt;Nueva función text to speech&lt;/p&gt;</description><pubDate>Mon, 05 Oct 2026 10:00:00 GMT</pubDate></item>
<item><title>Otra cosa</title><link>https://ej.com/2</link></item>
</channel></rss>`;

const ATOM = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><title>Y</title>
<entry><title>Automatiza con n8n</title><link rel="alternate" href="https://ej.com/a"/><updated>2026-10-04T00:00:00Z</updated><summary>agentes de IA</summary></entry>
</feed>`;

test('parsea RSS 2.0', () => {
  const e = parsearFeed(RSS);
  assert.equal(e.length, 2);
  assert.equal(e[0].enlace, 'https://ej.com/1');
  assert.equal(e[0].resumen, 'Nueva función text to speech');
  assert.equal(e[0].fecha, '2026-10-05T10:00:00.000Z');
});

test('parsea Atom', () => {
  const e = parsearFeed(ATOM);
  assert.equal(e.length, 1);
  assert.equal(e[0].enlace, 'https://ej.com/a');
});

test('detecta herramientas por palabra completa, sin falsos positivos', () => {
  assert.deepEqual(detectarHerramientas('Probamos ElevenLabs para doblaje', afiliados), ['elevenlabs']);
  assert.deepEqual(detectarHerramientas('How to make money online', afiliados), []);
});

test('las entradas de feed se puntúan y conservan la fuente', () => {
  const idea = ideaDesdeEntrada(parsearFeed(RSS)[0], 'Prueba', afiliados);
  assert.deepEqual(idea.herramientas, ['elevenlabs']);
  assert.equal(idea.fuente, 'Prueba');
  assert.ok(idea.puntuacion >= 10);
});

test('el catálogo genera comparativas solo dentro de la misma categoría', () => {
  const ideas = ideasDelCatalogo(afiliados);
  const comp = ideas.filter((i) => i.tipo === 'comparativa');
  assert.ok(comp.some((i) => i.titulo === 'Make vs n8n'));
  for (const i of comp) {
    const [a, b] = i.herramientas.map((s) => afiliados.get(s).categoria);
    assert.equal(a, b);
  }
  assert.equal(new Set(ideas.map((i) => i.id)).size, ideas.length);
});

test('fusionar no duplica ni pisa ideas ya redactadas', () => {
  const vieja = { id: 'a', estado: 'redactada', puntuacion: 1 };
  const r = fusionarIdeas([vieja], [{ id: 'a', estado: 'pendiente', puntuacion: 99 }, { id: 'b', estado: 'pendiente', puntuacion: 5 }]);
  assert.equal(r.length, 2);
  assert.equal(r.find((i) => i.id === 'a').estado, 'redactada');
});
