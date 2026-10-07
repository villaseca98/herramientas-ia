// Calculadora de la portada: el usuario marca lo que paga (y cuánto) y ve su ahorro y su plan de recorte.
import { calcularRecorte, formatear } from './recorte.js';

const D = JSON.parse(document.getElementById('datos-stack').textContent);
const M = D.moneda;
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const precio = (n) => `${formatear(n)} ${M}`;

const params = new URLSearchParams(location.search);
const elegidas = new Set(params.get('s')?.split(',').filter(Boolean) ?? []);
const precios = {};
for (const par of params.get('p')?.split(',') ?? []) {
  const [slug, valor] = par.split(':');
  if (slug && Number.isFinite(Number(valor))) precios[slug] = Number(valor);
}
let periodo = 'ano';
let filtro = 'todas';

function logo(nombre, dominio, color = '#16140f', clase = 'logo logo-peq') {
  const img = dominio ? `<img src="https://www.google.com/s2/favicons?domain=${esc(dominio)}&sz=64" alt="" loading="lazy" onerror="this.remove()">` : '';
  return `<span class="${clase}" style="--marca:${esc(color)}" aria-hidden="true">${esc(nombre.trim()[0].toUpperCase())}${img}</span>`;
}

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

function enlace(alt, texto) {
  const rel = alt.afiliado ? 'sponsored nofollow noopener' : 'nofollow noopener';
  return `<a class="boton" href="${esc(alt.enlace)}" rel="${rel}" target="_blank">${esc(texto)} &rarr;</a>`;
}

function pintar() {
  const r = calcularRecorte([...elegidas], D.herramientas, precios);
  const k = periodo === 'ano' ? 12 : 1;
  const sufijo = periodo === 'ano' ? '/año' : '/mes';

  for (const li of document.querySelectorAll('.fila')) {
    const sel = elegidas.has(li.dataset.slug);
    li.classList.toggle('activa', sel);
    li.querySelector('.fila-check').checked = sel;
    const visible = (filtro === 'todas' || li.dataset.cat === filtro) && li.dataset.nombre.includes($('buscar').value.trim().toLowerCase());
    li.hidden = !visible;
  }

  animar($('res-ahorro'), r.ahorroMes * k);
  $('res-unidad').textContent = ` ${M}${sufijo}`;
  $('resultado').classList.toggle('vacio', r.lineas.length === 0);
  $('res-sub').textContent = r.lineas.length
    ? `Pagas ${precio(Math.round(r.gastoMes * k))}${sufijo} y pagarías ${precio(Math.round(r.nuevoMes * k))}${sufijo}. Un ${r.gastoMes ? Math.round((r.ahorroMes / r.gastoMes) * 100) : 0}% menos.`
    : 'Marca lo que pagas cada mes.';
  $('res-ahora').textContent = `${precio(Math.round(r.gastoMes * k))}`;
  $('res-nuevo').textContent = `${precio(Math.round(r.nuevoMes * k))}`;
  $('barra-ahora').style.width = r.gastoMes ? '100%' : '0';
  $('barra-nuevo').style.width = r.gastoMes ? `${Math.max(2, (r.nuevoMes / r.gastoMes) * 100)}%` : '0';
  $('res-cambios').innerHTML = r.lineas
    .filter((l) => l.ahorroMes > 0)
    .sort((a, b) => b.ahorroMes - a.ahorroMes)
    .map((l) => `<li>${logo(l.herramienta.nombre, l.herramienta.dominio, l.herramienta.color)}<span class="res-cambio-txt">${esc(l.herramienta.nombre)} &rarr; <strong>${esc(l.alternativa.nombre)}</strong></span><b>-${precio(Math.round(l.ahorroMes * k))}</b></li>`)
    .join('');

  $('cambios').innerHTML = r.lineas
    .filter((l) => l.alternativa)
    .sort((a, b) => b.ahorroMes - a.ahorroMes)
    .map((l) => {
      const h = l.herramienta;
      const a = l.alternativa;
      return `<article class="cambio">
  <div class="cambio-logos">${logo(h.nombre, h.dominio, h.color, 'logo')}<span class="flecha">&rarr;</span>${logo(a.nombre, a.dominio, '#1d7a4c', 'logo')}${l.ahorroMes > 0 ? `<span class="sello">-${formatear(Math.round(l.ahorroMes * 12))} ${M}/año</span>` : '<span class="sello sello-neutro">mismo precio</span>'}</div>
  <p class="cambio-par"><s>${esc(h.nombre)}</s> <span class="flecha">&rarr;</span> <strong>${esc(a.nombre)}</strong></p>
  <p class="cambio-precio">${precio(l.pago)}/mes &rarr; ${a.precioMes === 0 ? 'gratis' : `${precio(a.precioMes)}/mes`} · ${esc(a.plan)}</p>
  <p>${esc(a.porQue)}</p>
  <p class="pierdes"><strong>Lo que pierdes:</strong> ${esc(a.pierdes)}</p>
  <p class="cambio-acciones">${enlace(a, a.gratis ? `Probar ${a.nombre} gratis` : `Ver ${a.nombre}`)} <a class="enlace-sec" href="/alternativas/${h.slug}/">Más alternativas</a></p>
</article>`;
    })
    .join('');
  $('plan').hidden = r.lineas.length === 0;
  $('barra-movil').hidden = r.ahorroAnual === 0;
  $('barra-ahorro').textContent = precio(Math.round(r.ahorroAnual));

  const url = new URL(location.href);
  url.hash = '';
  if (elegidas.size) url.searchParams.set('s', [...elegidas].join(',')); else url.searchParams.delete('s');
  const cambiados = Object.entries(precios).filter(([s]) => elegidas.has(s));
  if (cambiados.length) url.searchParams.set('p', cambiados.map(([s, v]) => `${s}:${v}`).join(',')); else url.searchParams.delete('p');
  try { history.replaceState(null, '', url); } catch {}
  const texto = r.ahorroAnual > 0
    ? `Estaba pagando ${precio(Math.round(r.ahorroAnual))} al año de más en software. Calcula lo tuyo:`
    : 'Calcula cuánto pagas de más en software:';
  $('compartir-wa').href = `https://wa.me/?text=${encodeURIComponent(`${texto} ${url.href}`)}`;
  $('compartir-x').href = `https://x.com/intent/post?text=${encodeURIComponent(texto)}&url=${encodeURIComponent(url.href)}`;
  $('compartir-copiar').dataset.url = url.href;
}

document.querySelectorAll('.fila-check').forEach((c) => c.addEventListener('change', () => {
  if (c.checked) elegidas.add(c.dataset.slug); else elegidas.delete(c.dataset.slug);
  pintar();
}));
document.querySelectorAll('.fila-precio input').forEach((inp) => {
  const h = D.herramientas.find((x) => x.slug === inp.dataset.slug);
  if (precios[h.slug] !== undefined) inp.value = precios[h.slug];
  inp.addEventListener('input', () => {
    const v = Number(inp.value.replace(',', '.'));
    if (inp.value === '' || !Number.isFinite(v)) delete precios[h.slug]; else precios[h.slug] = v;
    elegidas.add(h.slug);
    pintar();
  });
});
document.querySelectorAll('.filtro').forEach((b) => b.addEventListener('click', () => {
  filtro = b.dataset.cat;
  document.querySelectorAll('.filtro').forEach((x) => x.setAttribute('aria-pressed', x === b));
  pintar();
}));
document.querySelectorAll('.periodo button').forEach((b) => b.addEventListener('click', () => {
  periodo = b.dataset.periodo;
  document.querySelectorAll('.periodo button').forEach((x) => x.setAttribute('aria-pressed', x === b));
  pintar();
}));
$('buscar').addEventListener('input', pintar);
$('compartir-copiar').addEventListener('click', async (ev) => {
  const b = ev.currentTarget;
  try { await navigator.clipboard.writeText(b.dataset.url); b.textContent = '¡Copiado!'; } catch { b.textContent = 'Copia la URL de arriba'; }
});
pintar();
