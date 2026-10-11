import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { formularioLead, hayLeads } from '../scripts/lib/leads.mjs';
import { enviarATodos, normalizarCodigo, validarLead } from '../src/cliente/lead.js';
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

test('el formulario lleva el respaldo de Leads Hunters y el campo de código de partner', () => {
  const html = formularioLead({ ...sitio, contacto: { webhookLeads: 'https://ejemplo.n8n.cloud/webhook/x', respaldoLeads: 'https://crm.ejemplo/api/public/lead' } }, { id: 'f' });
  assert.match(html, /data-respaldo="https:\/\/crm\.ejemplo\/api\/public\/lead"/);
  assert.match(html, /name="partner"/);
  const sinRespaldo = formularioLead({ ...sitio, contacto: { webhookLeads: 'https://ejemplo.n8n.cloud/webhook/x' } }, { id: 'f' });
  assert.doesNotMatch(sinRespaldo, /data-respaldo/);
  const pro = formularioLead({ ...sitio, contacto: { webhookLeads: 'https://ejemplo.n8n.cloud/webhook/x' } }, { id: 'f', tipo: 'profesional' });
  assert.doesNotMatch(pro, /name="partner"/);
});

test('códigos de partner: solo letras, números y guiones, en mayúsculas', () => {
  assert.equal(normalizarCodigo(' gestoria-perez '), 'GESTORIA-PEREZ');
  assert.equal(normalizarCodigo('a'), '');
  assert.equal(normalizarCodigo('<script>'), '');
  assert.equal(normalizarCodigo(undefined), '');
});

test('el lead cuenta como recibido si llega a n8n o al respaldo', async () => {
  const llamadas = [];
  const f = (ok) => async (url) => { llamadas.push(url); return { ok: ok(url) }; };
  assert.equal(await enviarATodos(['https://n8n', 'https://crm'], {}, f((u) => u === 'https://crm')), true);
  assert.equal(await enviarATodos(['https://n8n', undefined], {}, f(() => false)), false);
  assert.equal(await enviarATodos(['https://n8n', 'https://crm'], {}, async () => { throw new Error('red'); }), false);
  assert.deepEqual(llamadas, ['https://n8n', 'https://crm', 'https://n8n']);
});
