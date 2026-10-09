// Formulario de solicitud (lead) que se envía al webhook de n8n de data/sitio.json (contacto.webhookLeads).
// Si no hay webhook configurado no se pinta nada y las páginas siguen usando el enlace de contacto de siempre.
import { escaparHtml as e } from './contenido.mjs';

export const TIPOS_LEAD = ['negocio', 'comunidad', 'vivienda', 'instalador', 'profesional'];

export function hayLeads(sitio) {
  return /^https:\/\//.test(sitio.contacto?.webhookLeads ?? '');
}

// opciones: id, interes (luz | placas | luz+placas | colaborar), tipo, sector, titulo, texto, boton, conFactura, oscuro
export function formularioLead(sitio, opciones = {}) {
  if (!hayLeads(sitio)) return '';
  const o = {
    id: 'lead',
    interes: 'luz+placas',
    tipo: 'negocio',
    sector: '',
    titulo: 'Te lo gestionamos gratis',
    texto: 'Déjanos cómo contactarte y te llamamos con ofertas reales para tu factura. Sin compromiso y sin llamadas que no pidas.',
    boton: 'Quiero mi estudio gratis',
    conFactura: true,
    ...opciones,
  };
  if (!TIPOS_LEAD.includes(o.tipo)) throw new Error(`Tipo de lead no válido: ${o.tipo}`);
  const esPro = o.tipo === 'instalador' || o.tipo === 'profesional';
  const oculto = (n, v = '') => `<input type="hidden" name="${n}" value="${e(v)}">`;
  const respaldo = /^https:\/\//.test(sitio.contacto.respaldoLeads ?? '') ? ` data-respaldo="${e(sitio.contacto.respaldoLeads)}"` : '';
  return `<form class="form-lead${o.oscuro ? ' form-lead-oscuro' : ''}" id="${e(o.id)}" data-lead data-endpoint="${e(sitio.contacto.webhookLeads)}"${respaldo} novalidate>
  <div class="lead-cabeza"><p class="antetitulo">Gratis · sin compromiso</p><h3>${e(o.titulo)}</h3><p>${e(o.texto)}</p></div>
  ${oculto('interes', o.interes)}${oculto('tipo', o.tipo)}${oculto('resumen')}${oculto('ahorroAnual')}
  <div class="lead-campos">
    <label class="campo"><span>${esPro ? 'Nombre y empresa' : 'Tu nombre'}</span><input class="lead-input" name="nombre" autocomplete="name" required maxlength="80"></label>
    <label class="campo"><span>Teléfono</span><input class="lead-input" name="telefono" type="tel" autocomplete="tel" inputmode="tel" maxlength="20"></label>
    <label class="campo"><span>Email</span><input class="lead-input" name="email" type="email" autocomplete="email" maxlength="120"></label>
    <label class="campo"><span>Código postal</span><input class="lead-input" name="codigoPostal" autocomplete="postal-code" inputmode="numeric" maxlength="5"></label>
    ${esPro
    ? `<label class="campo"><span>${o.tipo === 'instalador' ? 'Zona en la que instalas' : 'Clientes en cartera (aprox.)'}</span><input class="lead-input" name="sector" maxlength="60"></label>`
    : `${o.sector ? oculto('sector', o.sector) : '<label class="campo"><span>Tipo de negocio</span><input class="lead-input" name="sector" placeholder="Bar, taller, comunidad…" maxlength="60"></label>'}
    ${o.conFactura ? '<label class="campo"><span>Lo que pagas de luz al mes</span><span class="campo-entrada"><input name="facturaMensual" inputmode="decimal" maxlength="8"><em>€</em></span></label>' : oculto('facturaMensual')}
    <label class="campo campo-partner"><span>Código de tu gestoría o administrador <small>(opcional)</small></span><input class="lead-input" name="partner" autocomplete="off" maxlength="30" pattern="[A-Za-z0-9-]{2,30}"></label>`}
  </div>
  <label class="lead-trampa" aria-hidden="true">No rellenes esto <input name="web" tabindex="-1" autocomplete="off"></label>
  <label class="lead-consentimiento"><input type="checkbox" name="consentimiento" required> <span>Acepto que ${e(sitio.nombre)} me contacte sobre esta solicitud y, si lo pido, comparta mis datos con la comercializadora o el instalador que elija. <a href="/privacidad/">Privacidad</a>.</span></label>
  <p class="lead-estado" role="status" aria-live="polite"></p>
  <button class="boton" type="submit">${e(o.boton)} &rarr;</button>
  <p class="nota lead-nota">Necesitamos teléfono o email. Puedes darte de baja cuando quieras.</p>
</form>`;
}

export function scriptLeads(sitio) {
  return hayLeads(sitio) ? '<script type="module" src="/js/lead.js"></script>' : '';
}
