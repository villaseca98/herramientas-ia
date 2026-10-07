// Calculadora de facturas de la portada: el usuario pone lo que paga y ve su ahorro, los bonos y qué cambiar.
import { calcularFacturas } from './facturas.js';
import { formatear } from './recorte.js';

const D = JSON.parse(document.getElementById('datos-facturas').textContent);
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const euros = (n) => `${formatear(Math.round(n))} €`;

// Estado: lo que paga el usuario por factura (null = desmarcada). Se puede compartir por URL: ?f=luz-y-gas:80,banco:0
const pagos = Object.fromEntries(D.facturas.map((f) => [f.slug, f.gastoMedioMes]));
const params = new URLSearchParams(location.search);
if (params.get('f') !== null) {
  for (const f of D.facturas) pagos[f.slug] = null;
  for (const par of params.get('f').split(',')) {
    const [slug, valor] = par.split(':');
    if (slug in pagos && Number.isFinite(Number(valor))) pagos[slug] = Number(valor);
  }
}
let periodo = 'ano';

function animar(el, valor) {
  const desde = Number(el.dataset.valor ?? 0);
  el.dataset.valor = valor;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = formatear(Math.round(valor)); return; }
  const t0 = performance.now();
  const paso = (t) => {
    const k = Math.min(1, (t - t0) / 500);
    el.textContent = formatear(Math.round(desde + (valor - desde) * (1 - (1 - k) ** 3)));
    if (k < 1) requestAnimationFrame(paso);
  };
  requestAnimationFrame(paso);
}

function logo(nombre, dominio, color) {
  const img = dominio ? `<img src="https://www.google.com/s2/favicons?domain=${esc(dominio)}&sz=64" alt="" loading="lazy" onerror="this.remove()">` : '';
  return `<span class="logo" style="--marca:${esc(color)}" aria-hidden="true">${esc(nombre.trim()[0].toUpperCase())}${img}</span>`;
}

function tarjeta(l) {
  const f = l.factura;
  const o = l.opcion;
  const b = l.opcionBono;
  const precio = o && Number.isFinite(o.precioMes) ? ` · ${o.precioMes === 0 ? 'sin comisiones' : `${formatear(o.precioMes)} €/mes`}` : '';
  const destino = o
    ? `<p class="cambio-par">${esc(f.nombre)} <span class="flecha">&rarr;</span> <strong>${esc(o.nombre)}</strong></p>
  <p class="cambio-precio">Pagas ${formatear(l.pago)} €/mes${precio}${o.plan ? ` · ${esc(o.plan)}` : ''}</p>
  <p>${esc(o.que)}</p>`
    : `<p class="cambio-par">${esc(f.nombre)}</p><p class="cambio-precio">Pagas ${formatear(l.pago)} €/mes</p>`;
  const bono = b ? `<p class="pierdes"><strong>Bono:</strong> ${esc(b.bonoTexto)}</p>` : '';
  const acciones = [
    o ? `<a class="boton" href="${esc(o.enlace)}" rel="sponsored nofollow noopener" target="_blank">Ver ${esc(o.nombre)} &rarr;</a>` : '',
    b && b !== o ? `<a class="enlace-sec" href="${esc(b.enlace)}" rel="sponsored nofollow noopener" target="_blank">Bono de ${esc(b.nombre)}</a>` : '',
    `<a class="enlace-sec" href="${esc(f.ruta)}">${o ? 'Comparar opciones' : 'Cómo recortarla'}</a>`,
  ].join(' ');
  return `<article class="cambio">
  <div class="cambio-logos">${logo(f.nombre, null, f.color)}${o ? `<span class="flecha">&rarr;</span>${logo(o.nombre, o.dominio, f.color)}` : ''}<span class="sello">-${euros(l.ahorroMes * 12)}/año${l.bono ? ` + ${euros(l.bono)}` : ''}</span></div>
  ${destino}
  ${bono}
  <p class="cambio-acciones">${acciones}</p>
</article>`;
}

function pintar() {
  const activos = Object.fromEntries(Object.entries(pagos).filter(([, v]) => v !== null));
  const r = calcularFacturas(activos, D.facturas);
  const k = periodo === 'ano' ? 12 : 1;
  const sufijo = periodo === 'ano' ? '/año' : '/mes';

  for (const li of document.querySelectorAll('.fila')) {
    const sel = pagos[li.dataset.slug] !== null;
    li.classList.toggle('activa', sel);
    li.querySelector('.fila-check').checked = sel;
  }

  animar($('res-ahorro'), r.ahorroMes * k);
  $('res-unidad').textContent = ` €${sufijo}`;
  $('res-bonos').textContent = euros(r.bonos);
  $('res-bonos-linea').hidden = r.bonos === 0;
  $('resultado').classList.toggle('vacio', r.lineas.length === 0);
  $('res-sub').textContent = r.lineas.length
    ? `Pagas ${euros(r.gastoMes * k)}${sufijo} y podrías pagar ${euros(r.nuevoMes * k)}${sufijo}. Un ${r.gastoMes ? Math.round((r.ahorroMes / r.gastoMes) * 100) : 0}% menos.`
    : 'Pon lo que pagas cada mes.';
  $('res-ahora').textContent = euros(r.gastoMes * k);
  $('res-nuevo').textContent = euros(r.nuevoMes * k);
  $('barra-ahora').style.width = r.gastoMes ? '100%' : '0';
  $('barra-nuevo').style.width = r.gastoMes ? `${Math.max(2, (r.nuevoMes / r.gastoMes) * 100)}%` : '0';
  const orden = [...r.lineas].sort((a, b) => b.ahorroMes * 12 + b.bono - (a.ahorroMes * 12 + a.bono));
  $('res-cambios').innerHTML = orden
    .filter((l) => l.ahorroMes > 0)
    .map((l) => `<li>${logo(l.factura.nombre, null, l.factura.color).replace('class="logo"', 'class="logo logo-peq"')}<span class="res-cambio-txt">${esc(l.factura.nombre)}${l.opcion ? ` &rarr; <strong>${esc(l.opcion.nombre)}</strong>` : ''}</span><b>-${euros(l.ahorroMes * k)}</b></li>`)
    .join('');
  $('cambios').innerHTML = orden.map(tarjeta).join('');
  $('plan').hidden = r.lineas.length === 0;
  $('barra-movil').hidden = r.ahorroAnual === 0;
  $('barra-ahorro').textContent = euros(r.ahorroAnual);

  const url = new URL(location.href);
  url.hash = '';
  const cambiado = D.facturas.some((f) => pagos[f.slug] !== f.gastoMedioMes);
  if (cambiado) url.searchParams.set('f', Object.entries(activos).map(([s, v]) => `${s}:${v}`).join(',')); else url.searchParams.delete('f');
  try { history.replaceState(null, '', url); } catch {}
  const texto = r.ahorroAnual > 0
    ? `Estaba pagando ${euros(r.ahorroAnual)} al año de más en facturas, y encima me pagan ${euros(r.bonos)} por cambiarme. Calcula lo tuyo:`
    : 'Calcula cuánto pagas de más en tus facturas:';
  $('compartir-wa').href = `https://wa.me/?text=${encodeURIComponent(`${texto} ${url.href}`)}`;
  $('compartir-x').href = `https://x.com/intent/post?text=${encodeURIComponent(texto)}&url=${encodeURIComponent(url.href)}`;
  $('compartir-copiar').dataset.url = url.href;
}

document.querySelectorAll('.fila-check').forEach((c) => c.addEventListener('change', () => {
  const inp = $(`precio-${c.dataset.slug}`);
  const v = Number(inp.value.replace(',', '.'));
  pagos[c.dataset.slug] = c.checked ? (Number.isFinite(v) ? v : 0) : null;
  pintar();
}));
document.querySelectorAll('.fila-precio input').forEach((inp) => {
  const slug = inp.dataset.slug;
  if (pagos[slug] !== null) inp.value = pagos[slug];
  inp.addEventListener('input', () => {
    const v = Number(inp.value.replace(',', '.'));
    pagos[slug] = inp.value === '' || !Number.isFinite(v) ? 0 : v;
    pintar();
  });
});
document.querySelectorAll('.periodo button').forEach((b) => b.addEventListener('click', () => {
  periodo = b.dataset.periodo;
  document.querySelectorAll('.periodo button').forEach((x) => x.setAttribute('aria-pressed', x === b));
  pintar();
}));
$('compartir-copiar').addEventListener('click', async (ev) => {
  const b = ev.currentTarget;
  try { await navigator.clipboard.writeText(b.dataset.url); b.textContent = '¡Copiado!'; } catch { b.textContent = 'Copia la URL de arriba'; }
});
pintar();
