// Recorta Negocios: portada, lector de facturas, simulador de placas y guías de content/negocios.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { RAIZ, leerJson, escaparHtml as e, separarFrontmatter, renderizarMarkdown } from './contenido.mjs';
import { pagina, formularioNewsletter, extraerPreguntas } from './plantillas.mjs';
import { formularioLead, hayLeads, scriptLeads } from './leads.mjs';
import { extraerDatos, analizarFactura } from '../../src/cliente/energia.js';
import { formatear } from '../../src/cliente/recorte.js';

const ICONO_TIJERA = '<svg class="icono-tijera" viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12"/></svg>';
const PARTE_ENERGIA = 0.65; // Parte de la factura que suponemos energía cuando el usuario solo da euros al mes.

export function cargarNegocios() {
  const ref = leerJson('data/negocios.json');
  const ejemplo = extraerDatos(readFileSync(join(RAIZ, 'data', 'factura-ejemplo.txt'), 'utf8'));
  return { ref, ejemplo, analisisEjemplo: analizarFactura(ejemplo, ref) };
}

// Guías en Markdown de content/negocios. Frontmatter: titulo, descripcion, ruta, antetitulo, entradilla, cta, grupo, orden.
export function cargarGuias() {
  const dir = join(RAIZ, 'content', 'negocios');
  return readdirSync(dir).filter((n) => n.endsWith('.md')).map((nombre) => {
    const { datos, cuerpo } = separarFrontmatter(readFileSync(join(dir, nombre), 'utf8'));
    for (const k of ['titulo', 'descripcion', 'ruta']) if (!datos[k]) throw new Error(`content/negocios/${nombre}: falta ${k}`);
    if (!/^\/[a-z0-9/-]+\/$/.test(datos.ruta)) throw new Error(`content/negocios/${nombre}: ruta no válida`);
    return { ...datos, archivo: nombre, cuerpo };
  }).sort((a, b) => (a.orden ?? 99) - (b.orden ?? 99));
}

export function enlacePeticion(sitio, texto = '') {
  const k = sitio.contacto ?? {};
  if (k.urlFormulario) return { href: k.urlFormulario, externo: true };
  if (k.whatsapp) return { href: `https://wa.me/${k.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(texto)}`, externo: true };
  if (k.email) return { href: `mailto:${k.email}?subject=${encodeURIComponent('Revisión de factura de luz')}`, externo: false };
  return null;
}

function bloqueCta(sitio, tipo, g = {}) {
  if (tipo === 'contacto' && hayLeads(sitio)) {
    const pro = g.ruta === '/instaladores/' ? 'instalador' : 'profesional';
    return formularioLead(sitio, {
      id: `lead-${pro}`,
      tipo: pro,
      interes: 'colaborar',
      titulo: pro === 'instalador' ? 'Quiero recibir clientes de placas' : 'Quiero ofrecer el ahorro a mis clientes',
      texto: 'Cuéntanos quién eres y dónde trabajas. Te escribimos con una propuesta concreta: sin cuotas, sin exclusividad y sin letra pequeña.',
      boton: 'Quiero colaborar',
    });
  }
  if (tipo === 'placas') {
    return `<aside class="cta-caja cta-placas"><div><p class="antetitulo">Simulador gratis</p><h3>¿Cuánto te ahorrarías con placas?</h3><p>Pon tu consumo o lo que pagas al mes y te decimos tamaño, coste, ahorro y en cuántos años se pagan.</p></div><a class="boton" href="/placas-solares/">Simular mis placas &rarr;</a></aside>`;
  }
  if (tipo === 'contacto') {
    const enl = enlacePeticion(sitio, 'Hola, quiero colaborar con Recorta.');
    const boton = enl
      ? `<a class="boton" href="${e(enl.href)}"${enl.externo ? ' target="_blank" rel="noopener"' : ''}>Quiero colaborar &rarr;</a>`
      : '<span class="boton boton-apagado">Formulario muy pronto</span>';
    return `<aside class="cta-caja"><div><p class="antetitulo">Hablemos</p><h3>Cuéntanos qué haces y dónde</h3><p>Te respondemos con una propuesta concreta. Sin cuotas, sin exclusividad y sin letra pequeña.</p></div>${boton}</aside>`;
  }
  return `<aside class="cta-caja"><div><p class="antetitulo">Gratis · 1 minuto</p><h3>¿Cuánto pagas tú de más?</h3><p>Sube el PDF de tu factura y te decimos qué recargos tienes, cuánta potencia te sobra y cuánto te ahorrarías con placas.</p></div><a class="boton" href="/revisar-factura/">Revisar mi factura &rarr;</a></aside>`;
}

export function paginaGuia(sitio, g, guias) {
  const html = renderizarMarkdown(g.cuerpo, new Map())
    .replace(/<p>\{\{(lector|placas|contacto)\}\}<\/p>/g, (_, t) => bloqueCta(sitio, t, g));
  const preguntas = extraerPreguntas(g.cuerpo);
  const indice = [...g.cuerpo.matchAll(/^## (.+)$/gm)].map((m) => m[1]).filter((t) => t !== 'Preguntas frecuentes');
  const idDe = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const conIds = html.replace(/<h2>(.+?)<\/h2>/g, (m, t) => `<h2 id="${idDe(t.replace(/<[^>]+>/g, ''))}">${t}</h2>`);
  const hermanas = guias.filter((x) => x.ruta !== g.ruta && (x.grupo === g.grupo || !x.grupo)).slice(0, 4);
  const migas = g.ruta.startsWith('/placas-solares/')
    ? [['/placas-solares/', 'Placas solares'], [g.ruta, g.antetitulo?.split('·').pop().trim() ?? g.titulo]]
    : g.ruta.startsWith('/negocios/') ? [['/negocios/', 'Negocios'], [g.ruta, g.antetitulo?.split('·').pop().trim() ?? g.titulo]] : [[g.ruta, g.titulo]];
  const contenido = `<section class="hero hero-alt">
  <p class="antetitulo">${ICONO_TIJERA} ${e(g.antetitulo ?? 'Recorta')}</p>
  <h1>${e(g.titulo)}</h1>
  ${g.entradilla ? `<p class="entradilla">${e(g.entradilla)}</p>` : ''}
</section>
<div class="guia">
  ${indice.length > 2 ? `<nav class="guia-indice" aria-label="En esta página"><p class="antetitulo">En esta página</p><ol>${indice.map((t) => `<li><a href="#${idDe(t)}">${e(t)}</a></li>`).join('')}</ol></nav>` : ''}
  <article class="prosa guia-cuerpo">${conIds}</article>
</div>
${g.grupo === 'sector' ? formularioLead(sitio, { id: 'lead-sector', sector: g.antetitulo?.split('·').pop().trim() ?? '', titulo: 'Revisamos la factura de tu negocio gratis' }) : ''}
${hermanas.length ? `<section><div class="cabecera-seccion"><h2>Sigue leyendo</h2></div><div class="tarjetas-guia">${hermanas.map(tarjetaGuia).join('')}</div></section>` : ''}
${formularioNewsletter(sitio)}
${/\{\{contacto\}\}/.test(g.cuerpo) || g.grupo === 'sector' ? scriptLeads(sitio) : ''}`;
  return pagina(sitio, {
    titulo: g.titulo,
    descripcion: g.descripcion,
    ruta: g.ruta,
    migas,
    contenido,
    tipoOg: 'article',
    jsonLd: preguntas.length ? [{ '@type': 'FAQPage', mainEntity: preguntas.map((q) => ({ '@type': 'Question', name: q.pregunta, acceptedAnswer: { '@type': 'Answer', text: q.respuesta } })) }] : [],
  });
}

function tarjetaGuia(g) {
  return `<a class="tarjeta-guia" href="${e(g.ruta)}"><span class="antetitulo">${e(g.antetitulo ?? '')}</span><strong>${e(g.titulo)}</strong><span>${e(g.descripcion)}</span></a>`;
}

const PASOS = `<section class="pasos">
  <div><span class="promesa-num">01</span><h3>Subes tu factura</h3><p>El PDF tal cual. Se lee en tu navegador en segundos: no la guardamos en ningún servidor.</p></div>
  <div><span class="promesa-num">02</span><h3>Ves lo que pagas de más</h3><p>Recargos por reactiva, potencia que no usas, precio de la energía y lo que te ahorrarían unas placas.</p></div>
  <div><span class="promesa-num">03</span><h3>Si quieres, lo gestionamos</h3><p>Pedimos ofertas, hacemos el papeleo y te buscamos instalador. Gratis: nos paga la compañía, no tú.</p></div>
</section>`;

export function paginaInicioNegocios(sitio, neg, guias) {
  const a = neg.analisisEjemplo;
  const sectores = guias.filter((g) => g.grupo === 'sector');
  const contenido = `<section class="hero hero-negocios">
  <div>
    <p class="antetitulo">${ICONO_TIJERA} Revisión gratis · sin registro · 1 minuto</p>
    <h1>Tu negocio paga <span class="tachado">de más</span> luz.</h1>
    <p class="entradilla">Sube tu factura y te decimos exactamente dónde se va el dinero: recargos por energía reactiva, potencia que no usas, precio caro y lo que te ahorrarías con placas solares. Si quieres, lo arreglamos nosotros, gratis.</p>
    <p class="hero-botones"><a class="boton" href="/revisar-factura/">Revisar mi factura gratis &rarr;</a> <a class="boton boton-sec" href="/placas-solares/">Simular placas</a></p>
    <ul class="hero-datos">
      <li><strong>0 €</strong> te cuesta la revisión y la gestión</li>
      <li><strong>Tu PDF</strong> no sale de tu navegador</li>
      <li><strong>Sin llamadas</strong> que no pidas</li>
    </ul>
  </div>
  <aside class="factura-ejemplo" aria-label="Ejemplo de análisis">
    <p class="res-etq">Ejemplo de análisis · bar con tarifa 3.0TD</p>
    <p class="res-grande">${formatear(a.ahorroAnual)}<span class="res-unidad"> €/año</span></p>
    <p class="res-sub">que paga de más en su factura de ${formatear(a.facturaAnual)} € al año</p>
    <ul class="ejemplo-lista">${a.hallazgos.filter((h) => h.ahorroAnual).map((h) => `<li><span>${e(h.titulo)}</span><b>-${formatear(h.ahorroAnual)} €</b></li>`).join('')}
      ${a.solar ? `<li><span>Placas de ${String(a.solar.kWp).replace('.', ',')} kWp (se pagan en ${String(a.solar.amortizacionAnos).replace('.', ',')} años)</span><b>-${formatear(a.solar.ahorroAnual)} €</b></li>` : ''}</ul>
    <a class="boton boton-bloque boton-claro" href="/revisar-factura/?ejemplo=1">Ver el análisis completo &rarr;</a>
  </aside>
</section>
${PASOS}
<section>
  <div class="cabecera-seccion"><h2>Dónde pierde dinero un negocio</h2><a href="/negocios/">Todas las guías &rarr;</a></div>
  <div class="fugas">
    <a class="fuga" href="/negocios/energia-reactiva/"><span class="fuga-num">01</span><h3>Energía reactiva</h3><p>Un recargo por motores, frío y climatización que se elimina para siempre con un aparato. Muchos lo pagan cada mes sin saberlo.</p><span class="enlace-sec">Cómo quitarla &rarr;</span></a>
    <a class="fuga" href="/negocios/potencia-contratada/"><span class="fuga-num">02</span><h3>Potencia que no usas</h3><p>Se paga todos los días, abras o no. Si tu maxímetro está muy por debajo de lo contratado, te sobra.</p><span class="enlace-sec">Cómo ajustarla &rarr;</span></a>
    <a class="fuga" href="/negocios/tarifas-2-0td-3-0td-6-1td/"><span class="fuga-num">03</span><h3>Precio sin revisar</h3><p>Contratos de hace años, promociones que acabaron, precios por periodo que nadie comparó.</p><span class="enlace-sec">Entender tu tarifa &rarr;</span></a>
    <a class="fuga" href="/placas-solares/"><span class="fuga-num">04</span><h3>Un tejado vacío</h3><p>Si trabajas de día, las placas producen justo cuando consumes. En muchos negocios se pagan en pocos años.</p><span class="enlace-sec">Simular placas &rarr;</span></a>
  </div>
</section>
<section>
  <div class="cabecera-seccion"><h2>Por tipo de negocio</h2><a href="/negocios/sectores/">Ver todos los sectores &rarr;</a></div>
  <div class="tarjetas-guia">${sectores.map(tarjetaGuia).join('')}<a class="tarjeta-guia" href="/negocios/sectores/"><span class="antetitulo">Más sectores</span><strong>Panaderías, talleres, gimnasios, hoteles…</strong><span>Guías de ahorro para cada tipo de negocio, con placas incluidas.</span></a></div>
</section>
<section class="historia" id="por-que">
  <div class="historia-carta">
    <p class="antetitulo">Por qué es gratis</p>
    <h2>Nos paga la compañía, no tú. Y solo si de verdad pagas menos.</h2>
    <p>Las comercializadoras y los instaladores ya pagan por captar clientes: comerciales, anuncios, llamadas. Nosotros cobramos esa comisión solo cuando un negocio cambia porque le sale a cuenta.</p>
    <p>Si tu factura ya está bien, te lo decimos y no ganamos nada. Así de simple. <a href="/como-funciona/">Cómo funciona &rarr;</a></p>
  </div>
  <ul class="promesas">
    <li><span class="promesa-num">01</span><div><h3>Cuentas con tu factura, no con medias</h3><p>El análisis sale de tus kWh, tu potencia y tus importes. Nada de "ahorra hasta un 50%".</p></div></li>
    <li><span class="promesa-num">02</span><div><h3>Todo por escrito antes de firmar</h3><p>Precio de cada periodo, potencia y permanencia. Si no lo ves claro, no se firma.</p></div></li>
    <li><span class="promesa-num">03</span><div><h3>Instaladores con condiciones</h3><p>Presupuesto con producción estimada, garantías por escrito y sin prometer "factura cero".</p></div></li>
  </ul>
</section>
<section class="profesionales-bloque">
  <a class="tarjeta-pro" href="/profesionales/"><span class="antetitulo">Gestorías y administradores de fincas</span><h3>Ahorro para tus clientes, comisión para ti</h3><p>Nos pasas las facturas de tu cartera y te devolvemos un informe por cliente.</p><span class="enlace-sec">Ver programa &rarr;</span></a>
  <a class="tarjeta-pro" href="/instaladores/"><span class="antetitulo">Instaladores de placas</span><h3>Clientes de autoconsumo ya analizados</h3><p>Negocios y comunidades de tu zona con su consumo y su ahorro calculados.</p><span class="enlace-sec">Quiero clientes &rarr;</span></a>
  <a class="tarjeta-pro" href="/hogar/"><span class="antetitulo">¿Buscas ahorrar en casa?</span><h3>Calculadora de facturas del hogar</h3><p>Luz, fibra, banco y streaming, con los bonos que te dan por cambiarte.</p><span class="enlace-sec">Ir a hogar &rarr;</span></a>
</section>
${formularioNewsletter(sitio)}`;
  return pagina(sitio, {
    titulo: sitio.nombre,
    descripcion: sitio.lema,
    ruta: '/',
    contenido,
    jsonLd: [
      { '@type': 'WebSite', name: sitio.nombre, url: sitio.url, inLanguage: sitio.idioma },
      { '@type': 'Service', name: 'Revisión gratuita de la factura de luz para negocios', provider: { '@type': 'Organization', name: sitio.nombre, url: sitio.url }, areaServed: 'ES', offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' } },
    ],
  });
}

export function paginaHubNegocios(sitio, guias) {
  const deNegocio = guias.filter((g) => g.ruta.startsWith('/negocios/'));
  const temas = deNegocio.filter((g) => g.grupo !== 'sector');
  const sectores = deNegocio.filter((g) => g.grupo === 'sector');
  return pagina(sitio, {
    titulo: 'Ahorro en la factura de luz para negocios: guía completa',
    descripcion: 'Todo lo que puede recortar un negocio en su factura de luz: energía reactiva, potencia contratada, tarifas 3.0TD y placas solares, explicado por sectores.',
    ruta: '/negocios/',
    migas: [['/negocios/', 'Negocios']],
    contenido: `<section class="hero hero-alt"><p class="antetitulo">${ICONO_TIJERA} Guía para negocios</p><h1>Todo lo que tu negocio puede recortar en la luz</h1><p class="entradilla">Cuatro fugas de dinero que se repiten en casi todas las facturas de negocio, explicadas sin jerga, y cómo arreglar cada una.</p><p><a class="boton" href="/revisar-factura/">Revisar mi factura gratis &rarr;</a></p></section>
<section><div class="cabecera-seccion"><h2>Entiende tu factura</h2></div><div class="tarjetas-guia">${temas.map(tarjetaGuia).join('')}<a class="tarjeta-guia" href="/placas-solares/guia/"><span class="antetitulo">Placas solares · guía</span><strong>Placas solares para empresas y negocios</strong><span>Precios, ahorro, excedentes y qué preguntar al instalador.</span></a></div></section>
<section><div class="cabecera-seccion"><h2>Por tipo de negocio</h2><a href="/negocios/sectores/">Todos los sectores &rarr;</a></div><div class="tarjetas-guia">${sectores.map(tarjetaGuia).join('')}<a class="tarjeta-guia" href="/negocios/sectores/"><span class="antetitulo">Más sectores</span><strong>Panaderías, talleres, gimnasios, hoteles…</strong><span>Guías de ahorro para 15 tipos de negocio más, con placas incluidas.</span></a></div></section>
${bloqueCta(sitio, 'lector')}
${formularioNewsletter(sitio)}`,
  });
}

function campo(nombre, etiqueta, unidad, extra = '') {
  return `<label class="campo"${extra}><span>${etiqueta}</span><span class="campo-entrada"><input name="${nombre}" inputmode="decimal" autocomplete="off"><em>${unidad}</em></span></label>`;
}

export function paginaRevisar(sitio, neg) {
  const leads = hayLeads(sitio);
  const datos = JSON.stringify({ ref: neg.ref, ejemplo: neg.ejemplo, contacto: sitio.contacto ?? {}, leads }).replaceAll('<', '\\u003c');
  const enl = leads ? { href: '#lead-revisar' } : enlacePeticion(sitio);
  const periodos = [1, 2, 3, 4, 5, 6].map((i) => `<div class="periodo-fila${i > 2 ? ' solo-seis' : ''}"><b>P${i}</b>${campo(`p${i}`, `Potencia P${i}`, 'kW')}${campo(`m${i}`, `Maxímetro P${i}`, 'kW')}</div>`).join('');
  const contenido = `<section class="hero hero-alt">
  <p class="antetitulo">${ICONO_TIJERA} Lector de facturas · gratis</p>
  <h1>Revisa tu factura de luz en un minuto</h1>
  <p class="entradilla">Sube el PDF de tu última factura. Leemos los datos en tu propio navegador (no se sube a ningún servidor) y te decimos qué te sobra, qué te cobran de más y cuánto te ahorrarías con placas.</p>
</section>
<section class="lector">
  <label class="zona-pdf" id="zona-pdf" for="archivo-pdf">
    <input type="file" id="archivo-pdf" accept="application/pdf,.pdf" class="sr">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M12 18v-6M9 15l3-3 3 3"/></svg>
    <strong>Arrastra aquí tu factura en PDF</strong>
    <span>o pulsa para elegirla · Iberdrola, Endesa, Naturgy, Repsol, TotalEnergies y la mayoría de comercializadoras</span>
  </label>
  <p class="estado-lectura" id="estado-lectura" aria-live="polite">¿No la tienes a mano? <button type="button" class="enlace-boton" id="cargar-ejemplo">Prueba con una factura de ejemplo</button> o rellena los datos abajo.</p>
</section>
<section class="lector-datos" id="paso-datos">
  <form id="form-factura" class="form-factura" onsubmit="return false">
    <div class="form-cabeza"><h2>Datos de tu factura</h2><p class="nota">Los encuentras en la primera página. Si algo no aparece en tu factura, déjalo en blanco.</p></div>
    <div class="campos-rejilla">
      <label class="campo"><span>Tipo de cliente</span><select name="tipo"><option value="negocio">Negocio</option><option value="comunidad">Comunidad de vecinos</option><option value="vivienda">Vivienda</option></select></label>
      <label class="campo"><span>Tarifa de acceso</span><select name="tarifa"><option>3.0TD</option><option>2.0TD</option><option>6.1TD</option></select></label>
      ${campo('dias', 'Días facturados', 'días')}
      ${campo('consumoKwh', 'Consumo del periodo', 'kWh')}
      ${campo('importeEnergia', 'Importe término de energía', '€')}
      ${campo('importePotencia', 'Importe término de potencia', '€')}
      ${campo('importeReactiva', 'Energía reactiva', '€')}
      ${campo('importeExcesos', 'Excesos de potencia', '€')}
      ${campo('total', 'Total de la factura', '€')}
    </div>
    <details class="periodos" open><summary>Potencia contratada y maxímetro por periodo</summary><div class="periodos-rejilla">${periodos}</div></details>
  </form>
</section>
<section class="resultado-factura" id="resultado-factura" hidden>
  <div class="rf-cabeza">
    <div><p class="res-etq">Pagas de más, al año</p><p class="res-grande"><span id="rf-ahorro">0 €</span></p><p class="res-sub" id="rf-sub"></p></div>
    <div class="rf-acciones">
      ${enl ? `<a class="boton" id="rf-pedir" href="${e(enl.href)}">Quiero que me lo gestionéis gratis &rarr;</a>` : '<a class="boton boton-apagado" id="rf-pedir" href="#">Gestión gratuita muy pronto</a>'}
      <button type="button" class="enlace-boton" id="rf-copiar">Copiar el resumen</button>
    </div>
  </div>
  <div class="hallazgos" id="rf-hallazgos"></div>
  <div class="rf-solar"><h3>Y si pusieras placas solares</h3><div id="rf-solar"></div></div>
  ${formularioLead(sitio, { id: 'lead-revisar', titulo: 'Quiero que me lo gestionéis gratis', texto: 'Te mandamos ofertas por escrito con estos datos y, si te interesa, presupuesto de placas de un instalador de tu zona. Nos paga la compañía, no tú.', conFactura: false, oscuro: true })}
</section>
<section class="como"><h2>Tu factura no sale de tu ordenador</h2><p class="como-texto">El PDF se procesa con JavaScript en tu navegador. No lo subimos ni lo guardamos. Solo nos llega algo si pulsas "Quiero que me lo gestionéis" y decides enviarnos el resumen.</p></section>
${bloqueCta(sitio, 'placas')}
<script type="application/json" id="datos-revisar">${datos}</script>
<script type="module" src="/js/revisar.js"></script>
${scriptLeads(sitio)}
<script type="module">if (new URLSearchParams(location.search).has('ejemplo')) addEventListener('load', () => document.getElementById('cargar-ejemplo').click());</script>`;
  return pagina(sitio, {
    titulo: 'Revisa gratis tu factura de luz: lector automático para negocios',
    descripcion: 'Sube el PDF de tu factura de luz y descubre en un minuto si pagas energía reactiva, potencia que no usas o un precio caro, y cuánto ahorrarías con placas.',
    ruta: '/revisar-factura/',
    migas: [['/revisar-factura/', 'Revisar factura']],
    contenido,
    jsonLd: [{ '@type': 'WebApplication', name: 'Lector de facturas de luz de Recorta', applicationCategory: 'FinanceApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' } }],
  });
}

export function paginaPlacas(sitio, neg, guias) {
  const s = neg.ref.solar;
  const datos = JSON.stringify({ solar: s, precio: neg.ref.precioReferenciaKwh, parteEnergia: PARTE_ENERGIA }).replaceAll('<', '\\u003c');
  const deplacas = guias.filter((g) => g.ruta.startsWith('/placas-solares/'));
  const contenido = `<section class="hero hero-alt">
  <p class="antetitulo">${ICONO_TIJERA} Simulador de placas solares</p>
  <h1>¿Cuánto te ahorrarías con placas solares?</h1>
  <p class="entradilla">Pon tu consumo o lo que pagas de luz al mes. Te decimos qué instalación necesitas, cuánto cuesta, cuánto ahorras y en cuántos años se paga.</p>
</section>
<section class="simulador">
  <form id="form-placas" class="sim-form" onsubmit="return false">
    <label class="campo"><span>¿Para qué es?</span><select name="tipo"><option value="negocio">Negocio que abre de día</option><option value="comunidad">Comunidad de vecinos</option><option value="vivienda">Vivienda</option></select></label>
    <fieldset class="campo modo"><legend>Sé mi consumo en</legend><label><input type="radio" name="modo" value="euros" checked> euros al mes</label><label><input type="radio" name="modo" value="kwh"> kWh al mes</label></fieldset>
    <label class="campo"><span>Lo que gastas al mes</span><span class="campo-entrada"><input name="cantidad" inputmode="decimal" value="400"><em id="cantidad-unidad">€/mes</em></span></label>
    <label class="campo"><span>Precio de tu energía</span><span class="campo-entrada"><input name="precio" inputmode="decimal" value="${String(neg.ref.precioReferenciaKwh * 1.3).slice(0, 5).replace('.', ',')}"><em>€/kWh</em></span></label>
    <label class="campo rango"><span>Consumo en horas de sol <b id="diurno-valor">60%</b></span><input type="range" name="diurno" min="10" max="90" step="5" value="60"></label>
    <p class="nota">Si solo pones euros, suponemos que un ${Math.round(PARTE_ENERGIA * 100)}% de tu factura es energía. Con kWh el cálculo es más fino.</p>
  </form>
  <div class="sim-res calc-res" aria-live="polite">
    <p id="sim-vacio" class="res-sub">Pon cuánto gastas para ver el resultado.</p>
    <div id="sim-res" hidden>
      <p class="res-etq">Ahorro al año</p>
      <p class="res-grande"><span id="sim-ahorro">0 €</span></p>
      <div class="sim-cifras">
        <div><span>Instalación</span><b id="sim-kwp"></b><small id="sim-paneles"></small></div>
        <div><span>Coste orientativo</span><b id="sim-coste"></b><small>antes de ayudas</small></div>
        <div><span>Se paga en</span><b id="sim-amort"></b><small>después, todo ahorro</small></div>
        <div><span>Ganancia en ${s.vidaUtilAnos} años</span><b id="sim-vida"></b><small>ya descontado el coste</small></div>
        <div><span>Produce</span><b id="sim-produccion"></b><small>${formatear(s.produccionKwhKwp)} kWh por kWp</small></div>
        <div><span>Cubre</span><b id="sim-cobertura"></b><small>de tu consumo</small></div>
      </div>
      <div class="sim-grafico" id="sim-grafico" aria-label="Saldo acumulado año a año"></div>
      <p class="sim-leyenda"><span class="neg">Recuperando la inversión</span><span class="pos">Ganancia</span></p>
      <a class="boton boton-bloque" href="${hayLeads(sitio) ? '#lead-placas' : '/revisar-factura/'}">${hayLeads(sitio) ? 'Pedir presupuesto gratis &rarr;' : 'Afinar con mi factura real &rarr;'}</a>
    </div>
  </div>
</section>
${formularioLead(sitio, { id: 'lead-placas', interes: 'placas', titulo: 'Pide presupuesto de placas gratis', texto: 'Te ponemos en contacto con un instalador de tu zona con este estudio ya hecho. Presupuesto por escrito, con producción estimada y garantías. Sin compromiso.', boton: 'Quiero presupuesto' })}
<p class="meta">Cálculo orientativo. Producción: ${e(s.fuenteProduccion.texto)} (<a href="${e(s.fuenteProduccion.url)}" rel="nofollow noopener" target="_blank">PVGIS</a>). Coste: ${formatear(s.costeKwpPequena)} €/kWp hasta ${s.umbralGrandeKwp} kWp y ${formatear(s.costeKwpGrande)} €/kWp por encima, a partir de los <a href="${e(s.fuenteCoste.url)}" rel="nofollow noopener" target="_blank">precios de SotySolar 2026</a>. Dimensionamos la instalación para cubrir tu consumo en horas de sol, que es la energía que más ahorra.</p>
${PASOS.replace('Subes tu factura', 'Simulas o subes tu factura').replace('Si quieres, lo gestionamos', 'Te buscamos instalador')}
<section><div class="cabecera-seccion"><h2>Antes de pedir presupuesto</h2></div><div class="tarjetas-guia">${deplacas.map(tarjetaGuia).join('')}<a class="tarjeta-guia" href="/instaladores/"><span class="antetitulo">Para instaladores</span><strong>¿Instalas placas?</strong><span>Recibe clientes de tu zona con el consumo ya analizado.</span></a></div></section>
${formularioNewsletter(sitio)}
<script type="application/json" id="datos-placas">${datos}</script>
<script type="module" src="/js/placas.js"></script>
${scriptLeads(sitio)}`;
  return pagina(sitio, {
    titulo: 'Simulador de placas solares para negocios y comunidades',
    descripcion: 'Calcula gratis qué instalación de placas solares necesitas, cuánto cuesta, cuánto ahorras al año y en cuántos años se paga, para negocios, comunidades y viviendas.',
    ruta: '/placas-solares/',
    migas: [['/placas-solares/', 'Placas solares']],
    contenido,
    jsonLd: [{ '@type': 'WebApplication', name: 'Simulador de placas solares de Recorta', applicationCategory: 'FinanceApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' } }],
  });
}
