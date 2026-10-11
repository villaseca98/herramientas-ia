// Simulador de placas solares (/placas-solares/): tamaño, coste, ahorro y amortización según tu consumo.
import { simularSolar, zonaPorCp } from './energia.js';
import { formatear } from './recorte.js';

const C = JSON.parse(document.getElementById('datos-placas').textContent);
const f = document.getElementById('form-placas');
const $ = (id) => document.getElementById(id);
const euros = (n) => `${formatear(Math.round(n))} €`;
const coma = (n) => String(n).replace('.', ',');

// Sol de la provincia del código postal: tabla aproximada y, en cuanto contesta, PVGIS.
const pvgis = new Map();
function zonaActual() {
  const z = zonaPorCp(f.cp.value, C.provincias);
  if (!z) return null;
  if (pvgis.get(z.cp)) return { ...z, produccionKwhKwp: pvgis.get(z.cp), fuente: 'PVGIS' };
  if (!pvgis.has(z.cp)) {
    pvgis.set(z.cp, null);
    fetch(`/api/produccion?lat=${z.lat}&lon=${z.lon}`, { signal: AbortSignal.timeout(9000) })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { pvgis.set(z.cp, j?.kwhKwp || false); pintar(); })
      .catch(() => { pvgis.set(z.cp, false); pintar(); });
  }
  return { ...z, fuente: 'aprox' };
}

function pintar() {
  const modo = f.modo.value;
  const precio = Number(f.precio.value.replace(',', '.')) || C.precio;
  const mensual = Number(f.cantidad.value.replace(',', '.')) || 0;
  const consumoAnual = modo === 'kwh' ? mensual * 12 : (mensual * 12 * C.parteEnergia) / precio;
  const fraccion = Number(f.diurno.value) / 100;
  $('diurno-valor').textContent = `${f.diurno.value}%`;
  $('cantidad-unidad').textContent = modo === 'kwh' ? 'kWh/mes' : '€/mes';
  const zona = zonaActual();
  const metros = Number(f.metrosTejado.value.replace(',', '.')) || 0;
  $('cp-zona').textContent = zona ? zona.nombre : '—';
  const s = simularSolar({ consumoAnualKwh: consumoAnual, fraccionDiurna: fraccion, precioKwh: precio, produccionKwhKwp: zona?.produccionKwhKwp, maxKwp: metros > 0 ? metros / C.solar.m2PorKwp : null }, C.solar);
  $('sim-vacio').hidden = Boolean(s);
  $('sim-res').hidden = !s;
  if (!s) return;
  $('sim-kwp').textContent = `${coma(s.kWp)} kWp`;
  $('sim-paneles').textContent = `${s.paneles} paneles de ${formatear(C.solar.potenciaPanelKw * 1000)} W`;
  $('sim-coste').textContent = euros(s.coste);
  $('sim-ahorro').textContent = euros(s.ahorroAnual);
  $('sim-amort').textContent = s.amortizacionAnos ? `${coma(s.amortizacionAnos)} años` : '—';
  $('sim-vida').textContent = euros(s.ahorroVida);
  $('sim-cobertura').textContent = `${s.cobertura}%`;
  $('sim-produccion').textContent = `${formatear(s.produccionAnual)} kWh/año`;
  $('sim-prod-kwp').textContent = `${formatear(s.produccionKwhKwp)} kWh por kWp${zona ? ` en ${zona.nombre}${zona.fuente === 'PVGIS' ? ' (PVGIS)' : ''}` : ' (media de España)'}`;
  $('sim-limite').hidden = !s.limitado;
  $('sim-limite').textContent = s.limitado ? `Tu tejado se queda corto: para tu consumo de día harían falta ${coma(s.kWpIdeal)} kWp y en ${formatear(metros)} m² caben unos ${coma(s.kWp)} kWp. Calculamos con lo que cabe.` : '';
  const lead = document.getElementById('lead-placas');
  if (lead) {
    lead.elements.ahorroAnual.value = String(Math.round(s.ahorroAnual));
    lead.elements.tipo.value = f.tipo.value;
    if (modo === 'euros' && lead.elements.facturaMensual && !lead.elements.facturaMensual.dataset.tocado) lead.elements.facturaMensual.value = String(mensual);
    if (/^\d{5}$/.test(f.cp.value.trim()) && !lead.elements.codigoPostal.value) lead.elements.codigoPostal.value = f.cp.value.trim();
    lead.elements.resumen.value = `Simulador de placas (${f.tipo.value})${zona ? `, ${zona.nombre} (CP ${f.cp.value.trim()})` : ''}${metros ? `, ${metros} m² de tejado libre` : ''}: ${modo === 'kwh' ? `${mensual} kWh/mes` : `${mensual} €/mes`}, ${f.diurno.value}% de consumo de día. Instalación de ${coma(s.kWp)} kWp (${s.paneles} paneles), coste orientativo ${euros(s.coste)}, ahorro ${euros(s.ahorroAnual)}/año, se paga en ${s.amortizacionAnos ? `${coma(s.amortizacionAnos)} años` : '—'}.`;
  }
  const anos = C.solar.vidaUtilAnos;
  const max = Math.max(s.ahorroVida + s.coste, s.coste);
  $('sim-grafico').innerHTML = Array.from({ length: anos + 1 }, (_, a) => {
    const saldo = s.ahorroAnual * a - s.coste;
    const alto = Math.max(2, (Math.abs(saldo) / max) * 100);
    return `<i class="${saldo >= 0 ? 'pos' : 'neg'}" title="Año ${a}: ${euros(saldo)}"><span style="--alto:${alto}%"></span></i>`;
  }).join('');
}

f.tipo.addEventListener('change', () => { f.diurno.value = Math.round((C.solar.autoconsumoPorDefecto[f.tipo.value] ?? 0.5) * 100); pintar(); });
f.addEventListener('input', pintar);
document.getElementById('lead-placas')?.elements.facturaMensual?.addEventListener('input', (ev) => { ev.target.dataset.tocado = '1'; });
pintar();
