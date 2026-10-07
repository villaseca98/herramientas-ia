import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { formularioLead, hayLeads } from '../scripts/lib/leads.mjs';
import { validarLead } from '../src/cliente/lead.js';
import { cargarSectores, ejemploPlacas, rutaSector, TEMAS } from '../scripts/lib/sectores.mjs';
import { cargarNegocios } from '../scripts/lib/negocios.mjs';
import { construir } from '../scripts/build.mjs';

const sitio = JSON.parse(readFileSync('data/sitio.json', 'utf8'));

test('sin webhook no se pinta formulario', () => {
  const sin = { ...sitio, contacto: { ...sitio.contacto, webhookLeads: '' } };
  assert.equal(hayLeads(sin), false);
  assert.equal(formularioLead(sin), '');
});

test('el formulario lleva webhook, campos ocultos, trampa y consentimiento', () => {
  const html = formularioLead({ ...sitio, contacto: { webhookLeads: 'https://ejemplo.n8n.cloud/webhook/x' } }, { id: 'f', sector: 'Taller' });
  assert.match(html, /data-endpoint="https:\/\/ejemplo\.n8n\.cloud\/webhook\/x"/);
  assert.match(html, /name="sector" value="Taller"/);
  assert.match(html, /name="web"/);
  assert.match(html, /name="consentimiento"/);
  assert.throws(() => formularioLead({ contacto: { webhookLeads: 'https://x' } }, { tipo: 'otro' }));
});

test('validarLead pide nombre, contacto y consentimiento', () => {
  assert.equal(validarLead({}).length, 3);
  assert.deepEqual(validarLead({ nombre: 'Paco', telefono: '600 123 123', consentimiento: true }), []);
  assert.deepEqual(validarLead({ nombre: 'Ana', email: 'ana@bar.es', consentimiento: true }), []);
  assert.equal(validarLead({ nombre: 'Ana', email: 'ana@', consentimiento: true }).length, 2);
});

test('sectores: datos completos y ejemplo de placas calculable', () => {
  const { ref } = cargarNegocios();
  const sectores = cargarSectores();
  assert.ok(sectores.length >= 15);
  for (const s of sectores) {
    assert.ok(s.fugas.length >= 3 && s.faq.length >= 2 && s.consejos.length >= 3, s.slug);
    assert.ok(s.fugas.every((f) => TEMAS[f.tema]));
    const { sim } = ejemploPlacas(s, ref);
    assert.ok(sim && sim.kWp > 0 && sim.amortizacionAnos > 0, s.slug);
  }
});

test('el build genera las páginas de sector, el formulario y las mete en el sitemap', () => {
  const salida = mkdtempSync(join(tmpdir(), 'recorta-'));
  construir({ salida });
  const sectores = cargarSectores();
  const pagina = readFileSync(join(salida, rutaSector(sectores[0].slug).slice(1), 'index.html'), 'utf8');
  assert.match(pagina, /id="lead-sector"/);
  assert.match(pagina, /"@type":"FAQPage"/);
  assert.match(pagina, /\/js\/lead\.js/);
  const mapa = readFileSync(join(salida, 'sitemap.xml'), 'utf8');
  for (const s of sectores) assert.ok(mapa.includes(rutaSector(s.slug)), s.slug);
  assert.match(readFileSync(join(salida, 'revisar-factura', 'index.html'), 'utf8'), /id="lead-revisar"/);
  assert.match(readFileSync(join(salida, 'placas-solares', 'index.html'), 'utf8'), /id="lead-placas"/);
  assert.match(readFileSync(join(salida, 'instaladores', 'index.html'), 'utf8'), /id="lead-instalador"/);
});
