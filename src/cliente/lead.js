// Formularios de solicitud (form[data-lead]): validan, envían al webhook de n8n y, a la vez, al respaldo
// de Leads Hunters (data-respaldo), y muestran la confirmación si cualquiera de los dos lo recibe.
// Así un fallo de n8n no pierde el lead. También recuerdan el código de partner (?p=CODIGO) durante 90 días.
const CLAVE_UTM = 'recorta-utm';
const CLAVE_PARTNER = 'recorta-partner';
const DIAS_PARTNER = 90;
const CODIGO_VALIDO = /^[A-Za-z0-9-]{2,30}$/;
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function validarLead(d) {
  const errores = [];
  if (String(d.nombre ?? '').trim().length < 2) errores.push('Pon tu nombre.');
  const tel = String(d.telefono ?? '').replace(/\D/g, '');
  const email = String(d.email ?? '').trim();
  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
  if (tel.length < 9 && !emailOk) errores.push('Necesitamos un teléfono o un email para contestarte.');
  if (email && !emailOk) errores.push('Revisa el email.');
  if (!d.consentimiento) errores.push('Marca la casilla de privacidad para poder contactarte.');
  return errores;
}

export function datosLead(form, extra = {}) {
  const d = Object.fromEntries(new FormData(form).entries());
  d.consentimiento = Boolean(form.elements.consentimiento?.checked);
  return { ...d, ...extra };
}

function utmGuardado() {
  try {
    const q = new URLSearchParams(location.search);
    const utm = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'fbclid', 'gclid']
      .filter((k) => q.get(k)).map((k) => `${k}=${q.get(k)}`).join('&');
    if (utm) sessionStorage.setItem(CLAVE_UTM, utm);
    return sessionStorage.getItem(CLAVE_UTM) ?? '';
  } catch {
    return '';
  }
}

export function normalizarCodigo(c) {
  const t = String(c ?? '').trim().toUpperCase();
  return CODIGO_VALIDO.test(t) ? t : '';
}

// El partner del enlace (?p= o ?partner=) se guarda 90 días: si el cliente vuelve más tarde sigue siendo suyo.
function partnerGuardado(ahora = Date.now()) {
  try {
    const q = new URLSearchParams(location.search);
    const nuevo = normalizarCodigo(q.get('p') ?? q.get('partner'));
    if (nuevo) localStorage.setItem(CLAVE_PARTNER, JSON.stringify({ codigo: nuevo, t: ahora }));
    const g = JSON.parse(localStorage.getItem(CLAVE_PARTNER) ?? 'null');
    if (g && ahora - g.t < DIAS_PARTNER * 864e5) return normalizarCodigo(g.codigo);
  } catch {
    // sin almacenamiento (modo privado): solo vale el código de la URL o el que escriba
  }
  return '';
}

// Envía a cada destino y da por recibido el lead si al menos uno contesta bien.
export async function enviarATodos(destinos, cuerpo, f = fetch) {
  const intentos = await Promise.allSettled(destinos.filter(Boolean).map(async (url) => {
    const r = await f(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
    if (!r.ok) throw new Error(String(r.status));
    return url;
  }));
  return intentos.some((x) => x.status === 'fulfilled');
}

async function enviar(form, utm) {
  const estado = form.querySelector('.lead-estado');
  const boton = form.querySelector('button[type="submit"]');
  const d = datosLead(form, { pagina: location.pathname, utm });
  d.partner = normalizarCodigo(d.partner) || partnerGuardado();
  const errores = validarLead(d);
  if (errores.length) {
    estado.textContent = errores.join(' ');
    estado.dataset.tipo = 'error';
    return;
  }
  boton.disabled = true;
  estado.textContent = 'Enviando…';
  estado.dataset.tipo = '';
  try {
    if (!(await enviarATodos([form.dataset.endpoint, form.dataset.respaldo], d))) throw new Error('sin destino');
    form.classList.add('enviado');
    form.innerHTML = `<div class="lead-gracias"><p class="antetitulo">Recibido</p><h3>Gracias, ${esc(d.nombre.trim().split(' ')[0])}.</h3><p>Te contactamos en menos de 24 horas laborables${d.telefono ? ' por teléfono' : ' por email'}. Si tienes la última factura a mano, tenla preparada: con ella te damos números exactos.</p></div>`;
    if (typeof window.fbq === 'function') window.fbq('track', 'Lead', { content_category: d.interes });
    if (typeof window.gtag === 'function') window.gtag('event', 'generate_lead', { lead_type: d.interes });
  } catch {
    boton.disabled = false;
    estado.textContent = 'No hemos podido enviarlo. Comprueba tu conexión e inténtalo otra vez.';
    estado.dataset.tipo = 'error';
  }
}

if (typeof document !== 'undefined') {
  const utm = utmGuardado();
  const partner = partnerGuardado();
  for (const form of document.querySelectorAll('form[data-lead]')) {
    const campo = form.elements.partner;
    if (campo && partner && !campo.value) campo.value = partner;
    form.addEventListener('submit', (ev) => { ev.preventDefault(); enviar(form, utm); });
  }
}
