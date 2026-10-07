// Simulador de placas solares (/placas-solares/): tamaño, coste, ahorro y amortización según tu consumo.
import { simularSolar } from './energia.js';
import { formatear } from './recorte.js';

const C = JSON.parse(document.getElementById('datos-placas').textContent);
const f = document.getElementById('form-placas');
const $ = (id) => document.getElementById(id);
const euros = (n) => `${formatear(Math.round(n))} €`;
const coma = (n) => String(n).replace('.', ',');

function pintar() {
  const modo = f.modo.value;
  const precio = Number(f.precio.value.replace(',', '.')) || C.precio;
  const mensual = Number(f.cantidad.value.replace(',', '.')) || 0;
  const consumoAnual = modo === 'kwh' ? mensual * 12 : (mensual * 12 * C.parteEnergia) / precio;
  const fraccion = Number(f.diurno.value) / 100;
  $('diurno-valor').textContent = `${f.diurno.value}%`;
  $('cantidad-unidad').textContent = modo === 'kwh' ? 'kWh/mes' : '€/mes';
  const s = simularSolar({ consumoAnualKwh: consumoAnual, fraccionDiurna: fraccion, precioKwh: precio }, C.solar);
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
  const lead = document.getElementById('lead-placas');
  if (lead) {
    lead.elements.ahorroAnual.value = String(Math.round(s.ahorroAnual));
    lead.elements.tipo.value = f.tipo.value;
    if (modo === 'euros' && lead.elements.facturaMensual && !lead.elements.facturaMensual.dataset.tocado) lead.elements.facturaMensual.value = String(mensual);
    lead.elements.resumen.value = `Simulador de placas (${f.tipo.value}): ${modo === 'kwh' ? `${mensual} kWh/mes` : `${mensual} €/mes`}, ${f.diurno.value}% de consumo de día. Instalación de ${coma(s.kWp)} kWp (${s.paneles} paneles), coste orientativo ${euros(s.coste)}, ahorro ${euros(s.ahorroAnual)}/año, se paga en ${s.amortizacionAnos ? `${coma(s.amortizacionAnos)} años` : '—'}.`;
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
