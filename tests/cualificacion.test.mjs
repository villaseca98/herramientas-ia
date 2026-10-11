import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { simularSolar, zonaPorCp, cualificarPlacas, analizarFactura, extraerDatos } from '../src/cliente/energia.js';
import { coordenadasValidas, produccionPvgis } from '../api/produccion.js';

const ref = JSON.parse(readFileSync('data/negocios.json', 'utf8'));
const provincias = JSON.parse(readFileSync('data/provincias.json', 'utf8'));

test('hay 52 provincias y la tabla se acerca a PVGIS en los tres puntos de calibrado', () => {
  assert.equal(provincias.provincias.length, 52);
  for (const [cp, pvgis] of [['48001', 1155], ['28013', 1632], ['38001', 1769]]) {
    const z = zonaPorCp(cp, provincias);
    assert.ok(Math.abs(z.produccionKwhKwp - pvgis) / pvgis < 0.05, `${cp}: ${z.produccionKwhKwp} vs ${pvgis}`);
  }
  assert.equal(zonaPorCp('99999', provincias), null);
  assert.equal(zonaPorCp('2801', provincias), null);
});

test('el norte necesita más placas que el sur para el mismo consumo y el tejado limita el tamaño', () => {
  const base = { consumoAnualKwh: 30000, fraccionDiurna: 0.6, precioKwh: 0.15 };
  const norte = simularSolar({ ...base, produccionKwhKwp: zonaPorCp('48001', provincias).produccionKwhKwp }, ref.solar);
  const sur = simularSolar({ ...base, produccionKwhKwp: zonaPorCp('41001', provincias).produccionKwhKwp }, ref.solar);
  assert.ok(norte.kWp > sur.kWp);
  const corto = simularSolar({ ...base, maxKwp: 50 / ref.solar.m2PorKwp }, ref.solar);
  assert.equal(corto.kWp, 10);
  assert.equal(corto.limitado, true);
  assert.equal(corto.kWpIdeal, 12);
});

test('la cualificación baja con alquiler, uralita y sombras y sube con local propio', () => {
  const s = simularSolar({ consumoAnualKwh: 30000, fraccionDiurna: 0.7, precioKwh: 0.16 }, ref.solar);
  assert.equal(cualificarPlacas(s, { propiedad: 'propio', cubierta: 'chapa', sombras: 'no' }).nivel, 'alto');
  const malo = cualificarPlacas(s, { propiedad: 'alquilado', cubierta: 'fibrocemento', sombras: 'muchas' });
  assert.equal(malo.nivel, 'bajo');
  assert.equal(malo.avisos.length, 3);
  assert.equal(cualificarPlacas(null), null);
});

test('usa el consumo de 12 meses de la factura si lo trae', () => {
  const d = extraerDatos('Tarifa 3.0TD 30 días Consumo del periodo 4.250 kWh Consumo de los últimos 12 meses: 38.900 kWh');
  assert.equal(d.consumoKwh, 4250);
  assert.equal(d.consumoAnualKwh, 38900);
  const r = analizarFactura({ ...d, potencias: [], maximetros: [], importeEnergia: 700 }, ref);
  assert.equal(r.consumoAnual, 38900);
  assert.equal(r.consumoAnualReal, true);
});

test('la API de producción solo acepta coordenadas de España y lee E_y de PVGIS', async () => {
  assert.equal(coordenadasValidas(40.42, -3.7), true);
  assert.equal(coordenadasValidas(48.8, 2.3), false);
  const falso = async (url) => {
    assert.match(url, /lat=40\.42&lon=-3\.7&peakpower=1&loss=14&optimalangles=1/);
    return { ok: true, json: async () => ({ outputs: { totals: { fixed: { E_y: 1632.4 } } } }) };
  };
  assert.equal(await produccionPvgis(40.42, -3.7, falso), 1632);
  await assert.rejects(produccionPvgis(40.42, -3.7, async () => ({ ok: true, json: async () => ({}) })));
});
