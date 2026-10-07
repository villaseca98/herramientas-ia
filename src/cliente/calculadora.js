// Calculadora de la portada: el usuario marca lo que paga y ve su ticket con el recorte.
import { calcularRecorte, formatear } from './recorte.js';

const D = JSON.parse(document.getElementById('datos-stack').textContent);
const M = D.moneda;
const elegidas = new Set(new URLSearchParams(location.search).get('s')?.split(',').filter(Boolean) ?? []);
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const precio = (n) => `${formatear(n)} ${M}`;

function animar(el, valor, sufijo = '') {
  const desde = Number(el.dataset.valor ?? 0);
  el.dataset.valor = valor;
  const t0 = performance.now();
  const paso = (t) => {
    const k = Math.min(1, (t - t0) / 450);
    const v = desde + (valor - desde) * (1 - (1 - k) ** 3);
    el.textContent = `${formatear(Math.round(v))}${sufijo}`;
    if (k < 1) requestAnimationFrame(paso);
  };
  requestAnimationFrame(paso);
}

function enlace(alt, texto, clase = 'boton') {
  const rel = alt.afiliado ? 'sponsored nofollow noopener' : 'nofollow noopener';
  return `<a class="${clase}" href="${esc(alt.enlace)}" rel="${rel}" target="_blank">${esc(texto)} &rarr;</a>`;
}

function pintar() {
  const r = calcularRecorte([...elegidas], D.herramientas);
  for (const b of document.querySelectorAll('.pieza')) b.setAttribute('aria-pressed', elegidas.has(b.dataset.slug));

  $('ticket').classList.toggle('vacio', r.lineas.length === 0);
  $('ticket-lineas').innerHTML = r.lineas.length
    ? r.lineas.map((l) => `<li><span>${esc(l.herramienta.nombre)}</span><span>${precio(l.herramienta.precioMes)}</span></li>`).join('')
    : '<li class="ticket-vacio">Marca lo que pagas cada mes &larr;</li>';
  $('ticket-recortes').innerHTML = r.lineas
    .filter((l) => l.ahorroMes > 0)
    .map((l) => `<li><span>${esc(l.herramienta.nombre)} &rarr; ${esc(l.alternativa.nombre)}</span><span>-${precio(l.ahorroMes)}</span></li>`)
    .join('');
  animar($('ticket-gasto'), r.gastoAnual, ` ${M}`);
  animar($('ticket-ahorro'), r.ahorroAnual, ` ${M}`);
  $('ticket-nuevo').textContent = `${precio(r.nuevoMes)}/mes`;
  $('ticket-actual').textContent = `${precio(r.gastoMes)}/mes`;

  $('cambios').innerHTML = r.lineas
    .filter((l) => l.alternativa)
    .sort((a, b) => b.ahorroMes - a.ahorroMes)
    .map((l) => {
      const h = l.herramienta;
      const a = l.alternativa;
      return `<article class="cambio">
  <div class="cambio-cabeza"><p class="cambio-par"><s>${esc(h.nombre)}</s> <span class="flecha">&rarr;</span> <strong>${esc(a.nombre)}</strong></p>${l.ahorroMes > 0 ? `<span class="sello">-${formatear(Math.round(l.ahorroMes * 12))} ${M}/año</span>` : '<span class="sello sello-neutro">mismo precio</span>'}</div>
  <p class="cambio-precio">${esc(h.plan)} · ${precio(h.precioMes)}/mes &nbsp;&rarr;&nbsp; ${esc(a.plan)} · ${a.precioMes === 0 ? 'gratis' : `${precio(a.precioMes)}/mes`}</p>
  <p>${esc(a.porQue)}</p>
  <p class="pierdes"><strong>Lo que pierdes:</strong> ${esc(a.pierdes)}</p>
  <p class="cambio-acciones">${enlace(a, a.gratis ? `Probar ${a.nombre} gratis` : `Ver ${a.nombre}`)} <a class="enlace-sec" href="/alternativas/${h.slug}/">Todas las alternativas a ${esc(h.nombre)}</a></p>
</article>`;
    })
    .join('');
  $('bloque-cambios').hidden = r.lineas.length === 0;
  $('barra-movil').hidden = r.ahorroAnual === 0;
  $('barra-ahorro').textContent = `${formatear(Math.round(r.ahorroAnual))} ${M}`;

  const url = new URL(location.href);
  if (elegidas.size) url.searchParams.set('s', [...elegidas].join(','));
  else url.searchParams.delete('s');
  history.replaceState(null, '', url);
  const texto = r.ahorroAnual > 0
    ? `Pagaba ${formatear(Math.round(r.ahorroAnual))} ${M} al año de más en software. Calcula cuánto pagas tú:`
    : 'Calcula cuánto pagas de más en software:';
  $('compartir-wa').href = `https://wa.me/?text=${encodeURIComponent(`${texto} ${url.href}`)}`;
  $('compartir-x').href = `https://x.com/intent/post?text=${encodeURIComponent(texto)}&url=${encodeURIComponent(url.href)}`;
  $('compartir-copiar').dataset.url = url.href;
}

document.querySelectorAll('.pieza').forEach((b) => b.addEventListener('click', () => {
  const s = b.dataset.slug;
  if (elegidas.has(s)) elegidas.delete(s); else elegidas.add(s);
  pintar();
}));
$('compartir-copiar').addEventListener('click', async (ev) => {
  try {
    await navigator.clipboard.writeText(ev.currentTarget.dataset.url);
    ev.currentTarget.textContent = '¡Enlace copiado!';
  } catch {
    ev.currentTarget.textContent = 'Copia la URL de arriba';
  }
});
$('ticket-ver').addEventListener('click', () => $('bloque-cambios').scrollIntoView({ behavior: 'smooth' }));
pintar();
