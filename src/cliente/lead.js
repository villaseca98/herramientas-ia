// Formularios de solicitud (form[data-lead]): validan, envían al webhook de n8n y muestran la confirmación.
const CLAVE_UTM = 'recorta-utm';
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

async function enviar(form, utm) {
  const estado = form.querySelector('.lead-estado');
  const boton = form.querySelector('button[type="submit"]');
  const d = datosLead(form, { pagina: location.pathname, utm });
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
    const r = await fetch(form.dataset.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
    if (!r.ok) throw new Error(String(r.status));
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
  for (const form of document.querySelectorAll('form[data-lead]')) {
    form.addEventListener('submit', (ev) => { ev.preventDefault(); enviar(form, utm); });
  }
}
