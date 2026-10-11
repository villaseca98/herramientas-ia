// Página /revisar-factura/: lee el PDF de la factura en el navegador, rellena el formulario y muestra el análisis.
import { extraerDatos, analizarFactura, resumenPeticion, numero, zonaPorCp, cualificarPlacas, HORARIOS } from './energia.js';
import { formatear } from './recorte.js';

const C = JSON.parse(document.getElementById('datos-revisar').textContent);
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const euros = (n) => `${formatear(Math.round(n))} €`;
const form = $('form-factura');
const CAMPOS = ['dias', 'consumoKwh', 'importeEnergia', 'importePotencia', 'importeReactiva', 'importeExcesos', 'total', 'consumoAnualKwh'];
const coma = (n) => String(n).replace('.', ',');
const ETIQUETAS = {
  propiedad: { propio: 'propio', alquilado: 'alquilado', compartido: 'nave o edificio compartido' },
  cubierta: { chapa: 'chapa o panel sándwich', teja: 'teja', plana: 'plana', fibrocemento: 'uralita o fibrocemento', nose: 'no lo sabe' },
  sombras: { no: 'ninguna', algunas: 'algunas', muchas: 'muchas' },
};

// Producción real de la provincia: se pide a PVGIS (vía /api/produccion) y, mientras o si falla, se usa la tabla.
const pvgis = new Map();
function zonaActual() {
  const z = zonaPorCp(form.cp.value, C.provincias);
  if (!z) return null;
  const real = pvgis.get(z.cp);
  if (real) return { ...z, produccionKwhKwp: real, fuente: 'PVGIS' };
  if (!pvgis.has(z.cp)) {
    pvgis.set(z.cp, null);
    fetch(`/api/produccion?lat=${z.lat}&lon=${z.lon}`, { signal: AbortSignal.timeout(9000) })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { pvgis.set(z.cp, j?.kwhKwp || false); pintar(); })
      .catch(() => { pvgis.set(z.cp, false); pintar(); });
  }
  return { ...z, fuente: pvgis.get(z.cp) === false ? 'aprox' : 'buscando' };
}

function leerFormulario() {
  const num = (v) => (String(v).trim() === '' ? null : numero(v));
  const d = { tarifa: form.tarifa.value, potencias: [], maximetros: [] };
  for (const c of CAMPOS) d[c] = num(form[c].value);
  for (let i = 1; i <= 6; i++) {
    const p = num(form[`p${i}`].value);
    const m = num(form[`m${i}`].value);
    if (p !== null) d.potencias.push(p);
    if (m !== null) d.maximetros.push(m);
  }
  return d;
}

const txt = (v) => (v == null ? '' : String(v).replace('.', ','));

function rellenar(d) {
  if (d.tarifa) form.tarifa.value = d.tarifa;
  for (const c of CAMPOS) form[c].value = txt(d[c]);
  for (let i = 1; i <= 6; i++) {
    form[`p${i}`].value = txt(d.potencias?.[i - 1]);
    form[`m${i}`].value = txt(d.maximetros?.[i - 1]);
  }
  mostrarPeriodos();
}

function mostrarPeriodos() {
  const seis = form.tarifa.value !== '2.0TD';
  document.querySelectorAll('.solo-seis').forEach((el) => { el.hidden = !seis; });
}

function enlacePeticion(texto) {
  const k = C.contacto;
  if (k.urlFormulario) { const u = new URL(k.urlFormulario); u.searchParams.set('resumen', texto); return { href: u.href, nuevo: true }; }
  if (k.whatsapp) return { href: `https://wa.me/${k.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(texto)}`, nuevo: true };
  if (k.email) return { href: `mailto:${k.email}?subject=${encodeURIComponent('Revisión de mi factura de luz')}&body=${encodeURIComponent(texto)}`, nuevo: false };
  return null;
}

function pintar() {
  const d = leerFormulario();
  const zona = zonaActual();
  $('cp-zona').textContent = zona ? zona.nombre : '—';
  const metros = numero(form.metrosTejado.value);
  const r = analizarFactura(d, C.ref, { tipo: form.tipo.value, zona, metrosTejado: metros, diurno: HORARIOS[form.horario.value]?.diurno ?? null });
  const extra = {
    propiedad: form.propiedad.value, cubierta: form.cubierta.value, sombras: form.sombras.value, tipo: form.tipo.value,
  };
  const cualif = cualificarPlacas(r.solar, extra);
  const hay = d.consumoKwh > 0 || d.importeReactiva > 0 || d.importeExcesos > 0;
  $('resultado-factura').hidden = !hay;
  if (!hay) return;
  const total = r.ahorroAnual + (r.solar?.ahorroAnual ?? 0);
  $('rf-ahorro').textContent = euros(total);
  $('rf-sub').textContent = r.facturaAnual
    ? `Tu factura sale a unos ${euros(r.facturaAnual)} al año${total ? `: con placas${r.ahorroAnual ? ' y quitando lo que pagas de más' : ''} podrías recortar un ${Math.round((total / r.facturaAnual) * 100)}%` : ''}.`
    : 'Pon el total de la factura para ver el porcentaje.';
  $('rf-hallazgos').innerHTML = r.hallazgos.length
    ? r.hallazgos.map((h) => `<article class="hallazgo hallazgo-${h.gravedad}">
  <div class="hallazgo-cabeza"><h3>${esc(h.titulo)}</h3>${h.ahorroAnual ? `<span class="sello">-${euros(h.ahorroAnual)}/año</span>` : h.costeAnual ? `<span class="sello sello-alerta">${euros(h.costeAnual)}/año</span>` : ''}</div>
  <p>${esc(h.texto)}</p>
  <a class="enlace-sec" href="${esc(h.ruta)}">Entenderlo bien &rarr;</a>
</article>`).join('')
    : '<p class="nota">No vemos recargos evidentes con estos datos. Aun así, el precio y las placas pueden darte un buen recorte: míralo abajo.</p>';
  const s = r.solar;
  $('rf-solar').innerHTML = s ? `<div class="solar-cifras">
  <div><span>Instalación</span><strong>${String(s.kWp).replace('.', ',')} kWp</strong><small>${s.paneles} paneles</small></div>
  <div><span>Coste orientativo</span><strong>${euros(s.coste)}</strong><small>antes de ayudas</small></div>
  <div><span>Ahorro al año</span><strong class="resalta">${euros(s.ahorroAnual)}</strong><small>cubre ~${s.cobertura}% de tu consumo</small></div>
  <div><span>Se paga en</span><strong>${s.amortizacionAnos ? `${String(s.amortizacionAnos).replace('.', ',')} años` : '—'}</strong><small>luego todo es ahorro</small></div>
</div>
<ul class="solar-base">
  <li>${zona ? `Sol de <b>${esc(zona.nombre)}</b>: ${formatear(s.produccionKwhKwp)} kWh por kWp al año ${{ PVGIS: '(PVGIS, Comisión Europea)', buscando: '(aproximado; afinando con PVGIS…)', aprox: '(aproximado para tu provincia)' }[zona.fuente]}` : `Sol medio de España: ${formatear(s.produccionKwhKwp)} kWh por kWp. <b>Pon tu código postal</b> para usar el de tu zona.`}</li>
  <li>${r.consumoAnualReal ? `Consumo de tus últimos 12 meses: ${formatear(r.consumoAnual)} kWh.` : `Consumo anual estimado con un solo mes: ${formatear(r.consumoAnual)} kWh. <b>Pon el de los últimos 12 meses</b> si sale en tu factura: invierno y verano no se parecen.`}</li>
  <li>${metros > 0 ? `Tejado libre: ${formatear(metros)} m², caben unos ${coma(Math.floor((metros / C.ref.solar.m2PorKwp) * 10) / 10)} kWp.` : '<b>Pon los metros de tejado libres</b> para saber si cabe la instalación.'}</li>
</ul>
<p class="nota">Estimación previa con lo que nos has dicho. El instalador la confirma en una visita: orientación, inclinación, sombras, estructura y estado de la cubierta.</p>` : '';
  const nivel = { alto: 'Encaje alto', medio: 'Encaje medio', bajo: 'Encaje bajo' };
  $('rf-cualifica').innerHTML = cualif ? `<div class="cualifica cualifica-${cualif.nivel}"><p><span class="sello">${nivel[cualif.nivel]}</span> ${cualif.nivel === 'alto' ? 'Con estos datos, las placas pintan muy bien para tu negocio.' : cualif.nivel === 'medio' ? 'Pueden salir a cuenta, pero hay cosas que confirmar antes.' : 'Ahora mismo no lo vemos claro: mira por qué.'}</p>${cualif.avisos.map((a) => `<article class="aviso aviso-${a.gravedad}"><h4>${esc(a.titulo)}</h4><p>${esc(a.texto)}</p></article>`).join('')}</div>` : '';
  const texto = resumenPeticion(d, r, {
    zona: zona ? `${zona.nombre} (CP ${form.cp.value.trim()})` : '',
    metrosTejado: metros > 0 ? metros : null,
    horario: HORARIOS[form.horario.value]?.texto ?? '',
    propiedad: ETIQUETAS.propiedad[extra.propiedad] ?? '',
    cubierta: ETIQUETAS.cubierta[extra.cubierta] ?? '',
    sombras: ETIQUETAS.sombras[extra.sombras] ?? '',
    cualificacion: cualif,
  });
  const lead = $('lead-revisar');
  if (lead) {
    lead.elements.resumen.value = texto;
    lead.elements.ahorroAnual.value = String(Math.round(r.ahorroAnual + (r.solar?.ahorroAnual ?? 0)));
    lead.elements.tipo.value = form.tipo.value;
    if (/^\d{5}$/.test(form.cp.value.trim()) && !lead.elements.codigoPostal.value) lead.elements.codigoPostal.value = form.cp.value.trim();
    if (d.total) lead.elements.facturaMensual.value = String(Math.round((d.total / (d.dias || 30)) * 30));
  }
  $('rf-copiar').dataset.texto = texto;
  if (C.leads) return;
  const enlace = enlacePeticion(texto);
  const boton = $('rf-pedir');
  if (enlace) {
    boton.href = enlace.href;
    boton.classList.remove('boton-apagado');
    if (enlace.nuevo) { boton.target = '_blank'; boton.rel = 'noopener'; }
  }
}

async function leerPdf(archivo) {
  const estado = $('estado-lectura');
  estado.textContent = 'Leyendo tu factura…';
  try {
    const pdfjs = await import('/js/pdfjs/pdf.min.js');
    pdfjs.GlobalWorkerOptions.workerSrc = '/js/pdfjs/pdf.worker.min.js';
    const doc = await pdfjs.getDocument({ data: await archivo.arrayBuffer() }).promise;
    let texto = '';
    for (let i = 1; i <= Math.min(doc.numPages, 6); i++) {
      const pagina = await doc.getPage(i);
      const contenido = await pagina.getTextContent();
      texto += ` ${contenido.items.map((x) => x.str).join(' ')}`;
    }
    const d = extraerDatos(texto);
    const encontrados = [d.tarifa, d.consumoKwh, d.importeEnergia, d.importePotencia, d.total, d.potencias.length || null].filter((x) => x !== null).length;
    rellenar(d);
    estado.textContent = encontrados >= 3
      ? `Listo: hemos leído ${encontrados} datos de tu factura. Repásalos abajo y corrige lo que haga falta.`
      : 'Tu factura tiene un formato que no reconocemos bien. Rellena abajo los datos que faltan (están en la primera página).';
    document.getElementById('paso-datos').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch {
    estado.textContent = 'No hemos podido leer ese archivo. ¿Es un PDF de la factura? Si es una foto, rellena los datos a mano abajo.';
  }
  pintar();
}

const zona = $('zona-pdf');
$('archivo-pdf').addEventListener('change', (ev) => ev.target.files[0] && leerPdf(ev.target.files[0]));
['dragenter', 'dragover'].forEach((t) => zona.addEventListener(t, (ev) => { ev.preventDefault(); zona.classList.add('encima'); }));
['dragleave', 'drop'].forEach((t) => zona.addEventListener(t, (ev) => { ev.preventDefault(); zona.classList.remove('encima'); }));
zona.addEventListener('drop', (ev) => ev.dataTransfer.files[0] && leerPdf(ev.dataTransfer.files[0]));
$('cargar-ejemplo').addEventListener('click', () => { rellenar(C.ejemplo); form.tipo.value = 'negocio'; $('estado-lectura').textContent = 'Hemos cargado la factura de ejemplo de un bar con tarifa 3.0TD.'; pintar(); document.getElementById('resultado-factura').scrollIntoView({ behavior: 'smooth' }); });
form.addEventListener('input', () => { mostrarPeriodos(); pintar(); });
// Conversión para los anuncios de Meta: el negocio pide que le gestionemos la factura.
$('rf-pedir').addEventListener('click', () => { if (window.fbq && !C.leads) window.fbq('track', 'Lead'); });
$('rf-copiar').addEventListener('click', async (ev) => {
  const b = ev.currentTarget;
  try { await navigator.clipboard.writeText(b.dataset.texto); b.textContent = '¡Copiado!'; } catch { b.textContent = 'No se pudo copiar'; }
});
mostrarPeriodos();
