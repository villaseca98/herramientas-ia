import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { construir } from '../scripts/build.mjs';
import { cargarNegocios } from '../scripts/lib/negocios.mjs';
import { cargarSectores } from '../scripts/lib/sectores.mjs';
import { sectoresConPlacas, simularFactura, rutaPlacasSector } from '../scripts/lib/placas.mjs';

const { ref } = cargarNegocios();
const sectores = cargarSectores();

test('cada sector con placas tiene un ejemplo que se paga en menos de 15 años', () => {
  const lista = sectoresConPlacas(sectores);
  assert.ok(lista.length >= 10);
  for (const s of lista) {
    const sim = simularFactura(s.placas.ejemploMensual, s.placas.diurno, ref);
    assert.ok(sim.ahorroAnual > 0 && sim.amortizacionAnos < 15, s.slug);
  }
});

test('genera la página de empresas y una por sector, enlazadas en el sitemap', () => {
  const salida = mkdtempSync(join(tmpdir(), 'placas-'));
  construir({ salida });
  const empresas = readFileSync(join(salida, 'placas-solares', 'empresas', 'index.html'), 'utf8');
  assert.match(empresas, /id="lead-placas"/);
  assert.match(empresas, /FAQPage/);
  const mapa = readFileSync(join(salida, 'sitemap.xml'), 'utf8');
  for (const s of sectoresConPlacas(sectores)) {
    const ruta = rutaPlacasSector(s.slug);
    const html = readFileSync(join(salida, ruta.slice(1), 'index.html'), 'utf8');
    assert.match(html, /name="interes" value="placas"/, ruta);
    assert.ok(mapa.includes(ruta), ruta);
    assert.ok(empresas.includes(`href="${ruta}"`), ruta);
  }
  assert.ok(existsSync(join(salida, 'placas-solares', 'guia', 'index.html')));
});
