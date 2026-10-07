// Páginas de ahorro en luz por sector (/negocios/sectores/<slug>/), generadas desde data/sectores.json.
import { leerJson, escaparHtml as e } from './contenido.mjs';
import { pagina, formularioNewsletter } from './plantillas.mjs';
import { formularioLead, scriptLeads } from './leads.mjs';
import { simularSolar } from '../../src/cliente/energia.js';
import { formatear } from '../../src/cliente/recorte.js';

const PARTE_ENERGIA = 0.65; // Igual que el simulador: parte de la factura que suponemos energía.
export const TEMAS = {
  reactiva: { titulo: 'Energía reactiva', ruta: '/negocios/energia-reactiva/' },
  potencia: { titulo: 'Potencia contratada', ruta: '/negocios/potencia-contratada/' },
  precio: { titulo: 'Precio de la energía', ruta: '/negocios/tarifas-2-0td-3-0td-6-1td/' },
  horario: { titulo: 'Horario y periodos', ruta: '/negocios/tarifas-2-0td-3-0td-6-1td/' },
  placas: { titulo: 'Placas solares', ruta: '/placas-solares/' },
};
const ENCAJE = { alto: 'Encaje alto', medio: 'Encaje medio', bajo: 'Encaje bajo' };

export const rutaSector = (slug) => `/negocios/sectores/${slug}/`;

export function cargarSectores() {
  const datos = leerJson('data/sectores.json');
  const vistos = new Set();
  for (const s of datos.sectores) {
    for (const k of ['slug', 'nombre', 'singular', 'corto', 'descripcion', 'entradilla']) if (!s[k]) throw new Error(`sectores.json: ${s.slug ?? '?'} sin ${k}`);
    if (!/^[a-z0-9-]+$/.test(s.slug)) throw new Error(`sectores.json: slug no válido ${s.slug}`);
    if (vistos.has(s.slug)) throw new Error(`sectores.json: slug repetido ${s.slug}`);
    vistos.add(s.slug);
    for (const f of s.fugas) if (!TEMAS[f.tema]) throw new Error(`sectores.json: ${s.slug} tema desconocido ${f.tema}`);
    if (!ENCAJE[s.placas?.encaje]) throw new Error(`sectores.json: ${s.slug} encaje de placas no válido`);
  }
  return datos.sectores;
}

export function ejemploPlacas(s, ref) {
  const precio = Math.round(ref.precioReferenciaKwh * 1.3 * 1000) / 1000;
  const consumoAnualKwh = (s.placas.ejemploMensual * 12 * PARTE_ENERGIA) / precio;
  return { precio, sim: simularSolar({ consumoAnualKwh, fraccionDiurna: s.placas.diurno, precioKwh: precio }, ref.solar) };
}

export function paginaSector(sitio, s, sectores, ref) {
  const { precio, sim } = ejemploPlacas(s, ref);
  const coma = (n) => String(n).replace('.', ',');
  const otros = sectores.filter((x) => x.slug !== s.slug);
  const contenido = `<section class="hero hero-alt">
  <p class="antetitulo">Sectores · ${e(s.corto)}</p>
  <h1>Factura de luz en ${e(s.nombre.toLowerCase())}: dónde se va el dinero</h1>
  <p class="entradilla">${e(s.entradilla)}</p>
  <p class="hero-botones"><a class="boton" href="/revisar-factura/">Revisar mi factura gratis &rarr;</a> <a class="boton boton-sec" href="#lead-sector">Que me llamen</a></p>
</section>
<div class="sector-rejilla">
  <section class="sector-bloque">
    <h2>Lo que más gasta en ${e(s.singular)}</h2>
    <ul class="sector-equipos">${s.equipos.map((q) => `<li>${e(q)}</li>`).join('')}</ul>
  </section>
  <section class="sector-bloque">
    <h2>Dónde pierde dinero, por orden</h2>
    <ol class="sector-fugas">${s.fugas.map((f) => `<li><a class="sector-tema" href="${TEMAS[f.tema].ruta}">${e(TEMAS[f.tema].titulo)}</a><p>${e(f.texto)}</p></li>`).join('')}</ol>
  </section>
</div>
<section class="sector-placas">
  <div>
    <p class="antetitulo">Placas solares · ${e(ENCAJE[s.placas.encaje])}</p>
    <h2>¿Le salen las placas a ${e(s.singular)}?</h2>
    <p>${e(s.placas.texto)}</p>
    <p class="nota">Ejemplo calculado con nuestro simulador para una factura supuesta de ${formatear(s.placas.ejemploMensual)} €/mes, un ${Math.round(s.placas.diurno * 100)}% del consumo en horas de sol y ${coma(precio)} €/kWh. No es una media del sector: con tu factura sale tu número.</p>
    <a class="boton" href="/placas-solares/">Simular con mis datos &rarr;</a>
  </div>
  ${sim ? `<div class="solar-cifras">
    <div><span>Instalación</span><strong>${coma(sim.kWp)} kWp</strong><small>${sim.paneles} paneles</small></div>
    <div><span>Coste orientativo</span><strong>${formatear(sim.coste)} €</strong><small>antes de ayudas</small></div>
    <div><span>Ahorro al año</span><strong class="resalta">${formatear(sim.ahorroAnual)} €</strong><small>cubre ~${sim.cobertura}% del consumo</small></div>
    <div><span>Se paga en</span><strong>${sim.amortizacionAnos ? `${coma(sim.amortizacionAnos)} años` : '—'}</strong><small>luego todo es ahorro</small></div>
  </div>` : ''}
</section>
<section class="sector-bloque">
  <h2>Tres cosas que puedes hacer hoy</h2>
  <ol class="sector-consejos">${s.consejos.map((c) => `<li>${e(c)}</li>`).join('')}</ol>
</section>
${formularioLead(sitio, { id: 'lead-sector', sector: s.corto, titulo: `Revisamos gratis la factura de tu ${s.corto.toLowerCase()}`, texto: 'Te llamamos, miramos tu factura contigo y te pasamos ofertas por escrito. Si las placas te salen a cuenta, también presupuesto de un instalador de tu zona. Nos paga la compañía, no tú.' })}
<section class="prosa sector-faq">
  <h2>Preguntas frecuentes</h2>
  ${s.faq.map((q) => `<h3>${e(q.p)}</h3><p>${e(q.r)}</p>`).join('')}
</section>
<section><div class="cabecera-seccion"><h2>Otros sectores</h2><a href="/negocios/sectores/">Ver todos &rarr;</a></div><div class="tarjetas-guia">${otros.slice(0, 6).map(tarjetaSector).join('')}</div></section>
${formularioNewsletter(sitio)}
${scriptLeads(sitio)}`;
  return pagina(sitio, {
    titulo: `Ahorrar luz en ${s.nombre.toLowerCase()}`,
    descripcion: s.descripcion,
    ruta: rutaSector(s.slug),
    migas: [['/negocios/', 'Negocios'], ['/negocios/sectores/', 'Sectores'], [rutaSector(s.slug), s.corto]],
    contenido,
    tipoOg: 'article',
    jsonLd: [{ '@type': 'FAQPage', mainEntity: s.faq.map((q) => ({ '@type': 'Question', name: q.p, acceptedAnswer: { '@type': 'Answer', text: q.r } })) }],
  });
}

function tarjetaSector(s) {
  return `<a class="tarjeta-guia" href="${rutaSector(s.slug)}"><span class="antetitulo">${e(s.corto)} · placas: ${e(s.placas.encaje)}</span><strong>${e(s.nombre)}</strong><span>${e(s.descripcion)}</span></a>`;
}

export function paginaSectores(sitio, sectores, guiasSector = []) {
  return pagina(sitio, {
    titulo: 'Ahorro en luz por tipo de negocio',
    descripcion: `Guías de ahorro en la factura de luz para ${sectores.length} tipos de negocio: qué gasta más, dónde se pierde dinero y si salen a cuenta las placas solares.`,
    ruta: '/negocios/sectores/',
    migas: [['/negocios/', 'Negocios'], ['/negocios/sectores/', 'Sectores']],
    contenido: `<section class="hero hero-alt"><p class="antetitulo">Sectores</p><h1>Ahorro en luz para tu tipo de negocio</h1><p class="entradilla">Cada negocio pierde dinero en un sitio distinto. Elige el tuyo y ve qué equipos gastan más, qué recargos suelen aparecer y si te salen las placas.</p></section>
<section><div class="tarjetas-guia">${guiasSector.map((g) => `<a class="tarjeta-guia" href="${e(g.ruta)}"><span class="antetitulo">${e(g.antetitulo ?? 'Sector')}</span><strong>${e(g.titulo)}</strong><span>${e(g.descripcion)}</span></a>`).join('')}${sectores.map(tarjetaSector).join('')}</div></section>
${formularioLead(sitio, { id: 'lead-sector', titulo: '¿No ves tu negocio? Te lo miramos igual' })}
${formularioNewsletter(sitio)}
${scriptLeads(sitio)}`,
  });
}
