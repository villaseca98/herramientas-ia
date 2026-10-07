// Recorta: calculadora de ahorro de software y páginas "alternativas más baratas a X".
import { leerJson, escaparHtml as e, enlaceIr } from './contenido.mjs';
import { pagina, formularioNewsletter, fechaLarga, huecoAnuncio } from './plantillas.mjs';
import { calcularRecorte, mejorAlternativa, ahorroMaximo, formatear } from '../../src/cliente/recorte.js';

// Carga data/stack.json y resuelve cada alternativa: nombre y enlace (/ir/<slug>/ si es afiliado).
export function cargarStack(afiliados) {
  const stack = leerJson('data/stack.json');
  for (const h of stack.herramientas) {
    if (!stack.categorias[h.categoria]) throw new Error(`stack.json: categoría desconocida en ${h.slug}`);
    h.alternativas = h.alternativas.map((alt) => {
      if (alt.afiliado) {
        const a = afiliados.get(alt.afiliado);
        if (!a) throw new Error(`stack.json: afiliado desconocido "${alt.afiliado}" en ${h.slug}`);
        return { ...alt, nombre: a.nombre, dominio: new URL(a.urlOficial).hostname.replace(/^www\./, ''), enlace: enlaceIr(a.slug), ficha: a.ficha ? `/herramientas/${a.slug}/` : null };
      }
      if (!alt.nombre || !alt.url) throw new Error(`stack.json: alternativa sin nombre o url en ${h.slug}`);
      return { ...alt, enlace: alt.url, ficha: null };
    });
  }
  return stack;
}

export const rutaAlternativa = (slug) => `/alternativas/${slug}/`;

const ICONO_TIJERA = '<svg class="icono-tijera" viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12"/></svg>';

function relAlt(alt) {
  return alt.afiliado ? 'sponsored nofollow noopener' : 'nofollow noopener';
}

function botonAlt(alt, texto) {
  return `<a class="boton" href="${e(alt.enlace)}" rel="${relAlt(alt)}" target="_blank">${e(texto)} &rarr;</a>`;
}

function precioTxt(n, moneda) {
  return n === 0 ? 'Gratis' : `${formatear(n)} ${moneda}/mes`;
}

// Enlace al formulario de migración gratis, con la herramienta de origen y destino ya rellenas.
export function enlaceMigracion(sitio, de = '', a = '') {
  const base = sitio.contacto?.urlFormulario || '/migracion-gratis/';
  const url = new URL(base, 'https://x.invalid');
  if (de) url.searchParams.set('de', de);
  if (a) url.searchParams.set('a', a);
  return base.startsWith('/') ? `${url.pathname}${url.search}` : url.href;
}

function datosCliente(stack, sitio) {
  return {
    moneda: stack.moneda,
    migracion: enlaceMigracion(sitio),
    herramientas: stack.herramientas.map((h) => ({
      slug: h.slug, nombre: h.nombre, plan: h.plan, precioMes: h.precioMes, dominio: h.dominio, color: h.color,
      alternativas: h.alternativas.map(({ nombre, plan, precioMes, gratis, porQue, pierdes, enlace, afiliado, dominio }) => ({ nombre, plan, precioMes, gratis, porQue, pierdes, enlace, afiliado: Boolean(afiliado), dominio })),
    })),
  };
}

// Logo de la herramienta: favicon de su dominio sobre un monograma de color (si la imagen no carga, queda el monograma).
export function logo(nombre, dominio, color = '#16140f', clase = 'logo') {
  const img = dominio ? `<img src="https://www.google.com/s2/favicons?domain=${e(dominio)}&amp;sz=64" alt="" loading="lazy" onerror="this.remove()">` : '';
  return `<span class="${clase}" style="--marca:${e(color)}" aria-hidden="true">${e(nombre.trim()[0].toUpperCase())}${img}</span>`;
}

function calculadoraHtml(stack) {
  const M = stack.moneda;
  const filtros = [['todas', 'Todas'], ...Object.entries(stack.categorias)]
    .map(([id, nombre], i) => `<button type="button" class="filtro" data-cat="${id}" aria-pressed="${i === 0}">${e(nombre)}</button>`).join('');
  const filas = stack.herramientas.map((h) => `<li class="fila" data-slug="${h.slug}" data-cat="${h.categoria}" data-nombre="${e(h.nombre.toLowerCase())}">
  <label class="fila-label" for="chk-${h.slug}">
    <input type="checkbox" class="fila-check" id="chk-${h.slug}" data-slug="${h.slug}">
    <span class="caja" aria-hidden="true"></span>
    ${logo(h.nombre, h.dominio, h.color)}
    <span class="fila-txt"><strong>${e(h.nombre)}</strong><small>${e(h.plan)}</small></span>
  </label>
  <label class="fila-precio" for="precio-${h.slug}"><span class="sr">Lo que pagas al mes por ${e(h.nombre)}</span><input type="number" inputmode="decimal" min="0" step="0.01" id="precio-${h.slug}" data-slug="${h.slug}" value="${h.precioMes}"><span>${M}/mes</span></label>
</li>`).join('');
  return `<section class="calc" id="calculadora">
  <div class="calc-lista">
    <div class="calc-cabeza">
      <div><p class="antetitulo">Paso 1 · marca lo que pagas</p><h2>Tu factura de software</h2></div>
      <input type="search" id="buscar" class="buscar" placeholder="Busca: Zapier, Kajabi…" aria-label="Buscar herramienta" autocomplete="off">
    </div>
    <div class="filtros" role="group" aria-label="Categorías">${filtros}</div>
    <ul class="filas" id="filas">${filas}</ul>
    <p class="nota">¿Pagas otro precio? Cámbialo en la cifra. Precios de referencia de las webs oficiales del ${fechaLarga(stack.verificado)}, sin impuestos.</p>
  </div>
  <aside class="calc-res" id="resultado" aria-live="polite">
    <div class="res-cabeza">
      <p class="res-etq">Te ahorras</p>
      <div class="periodo" role="group" aria-label="Periodo"><button type="button" data-periodo="ano" aria-pressed="true">al año</button><button type="button" data-periodo="mes" aria-pressed="false">al mes</button></div>
    </div>
    <p class="res-grande"><span id="res-ahorro">0</span><span class="res-unidad" id="res-unidad"> ${M}/año</span></p>
    <p class="res-sub" id="res-sub">Marca a la izquierda lo que pagas cada mes.</p>
    <div class="barras">
      <div class="barra"><span>Ahora</span><div class="pista"><i id="barra-ahora"></i></div><b id="res-ahora">0 ${M}</b></div>
      <div class="barra"><span>Con Recorta</span><div class="pista"><i id="barra-nuevo"></i></div><b id="res-nuevo">0 ${M}</b></div>
    </div>
    <ol class="res-cambios" id="res-cambios"></ol>
    <a class="boton boton-bloque" id="ver-plan" href="#plan">Ver mi plan de recorte &darr;</a>
    <a class="res-pro" href="/migracion-gratis/"><strong>¿Te da pereza migrar?</strong> Te lo migro gratis si te cambias con mi enlace &rarr;</a>
    <div class="compartir"><span>Compartir:</span><a id="compartir-wa" href="#" target="_blank" rel="noopener">WhatsApp</a><a id="compartir-x" href="#" target="_blank" rel="noopener">X</a><button id="compartir-copiar" type="button">Copiar enlace</button></div>
  </aside>
</section>`;
}

function tarjetaRecorte(h, moneda) {
  const alt = mejorAlternativa(h);
  const anual = Math.round(ahorroMaximo(h) * 12);
  return `<a class="recorte-tarjeta" href="${rutaAlternativa(h.slug)}">
  <span class="recorte-logos">${logo(h.nombre, h.dominio, h.color, 'logo logo-peq')}<span class="flecha">&rarr;</span>${logo(alt.nombre, alt.dominio ?? null, '#1d7a4c', 'logo logo-peq')}</span>
  <span class="recorte-par"><s>${e(h.nombre)}</s> &rarr; <strong>${e(alt.nombre)}</strong></span>
  <span class="recorte-precios">${formatear(h.precioMes)} ${moneda}/mes &rarr; ${alt.precioMes === 0 ? 'gratis' : `${formatear(alt.precioMes)} ${moneda}/mes`}</span>
  <span class="sello">-${formatear(anual)} ${moneda}/año</span>
</a>`;
}

// La historia del creador: textos de data/sitio.json (autor). Sin datos, se usa el manifiesto de la marca.
function historiaHtml(sitio, stack) {
  const a = sitio.autor ?? {};
  const sinComision = stack.herramientas.flatMap((h) => h.alternativas).filter((x) => !x.afiliado);
  const nombresSinComision = [...new Set(sinComision.map((x) => x.nombre))];
  const foto = a.foto
    ? `<img class="autor-foto" src="${e(a.foto)}" alt="${e(a.nombre)}">`
    : `<span class="autor-foto autor-inicial" aria-hidden="true">${e((a.nombre || sitio.nombre)[0])}</span>`;
  const historia = a.historia
    ? a.historia.split(/\n\n+/).map((p) => `<p>${e(p)}</p>`).join('')
    : `<p>Hice Recorta porque las suscripciones se acumulan sin que nadie las revise: 20 $ aquí, 49 $ allá, y a fin de año has pagado una moto en software.</p>
<p>Las webs de "las mejores herramientas" te recomiendan casi siempre la más cara, porque es la que más comisión paga. Aquí es al revés.</p>`;
  return `<section class="historia" id="por-que">
  <div class="historia-carta">
    <p class="antetitulo">Por qué ahorrar conmigo</p>
    <h2>Gano cuando tú pagas menos, no cuando pagas más.</h2>
    ${historia}
    <div class="autor">${foto}<div><strong>${e(a.nombre || `El equipo de ${sitio.nombre}`)}</strong><span>${e(a.rol || 'Recorta')}</span></div></div>
  </div>
  <ul class="promesas">
    <li><span class="promesa-num">01</span><div><h3>Primero lo más barato, aunque no cobre</h3><p>${nombresSinComision.length} de mis recomendaciones no me pagan ni un céntimo (${e(nombresSinComision.join(', '))}). Salen igual, ordenadas por precio.</p></div></li>
    <li><span class="promesa-num">02</span><div><h3>Te digo lo que pierdes</h3><p>Cada cambio trae su letra pequeña. Si la herramienta cara te compensa, te digo que te la quedes.</p></div></li>
    <li><span class="promesa-num">03</span><div><h3>Precios de renovación, nunca de oferta</h3><p>Calculo con lo que pagarás el segundo año, no con el gancho del primer mes.</p></div></li>
    <li><span class="promesa-num">04</span><div><h3>La migración la paga la herramienta</h3><p>Soy programador. Si te cambias con mi enlace, te paso tus datos y tus flujos gratis: la comisión de tu alta paga mi trabajo.</p></div></li>
  </ul>
</section>`;
}

function botonProducto(sitio, p) {
  if (p.urlPago?.startsWith('/')) return `<a class="boton boton-bloque" href="${e(p.urlPago)}">${p.destacado ? 'Quiero mi migración gratis' : 'Ver cómo funciona'} &rarr;</a>`;
  if (p.urlPago) return `<a class="boton boton-bloque" href="${e(p.urlPago)}" target="_blank" rel="noopener">${p.destacado ? 'Quiero mi plan' : 'Pedirlo'} &rarr;</a>`;
  const { email, urlFormulario } = sitio.contacto ?? {};
  if (urlFormulario) return `<a class="boton boton-bloque" href="${e(urlFormulario)}" target="_blank" rel="noopener">Pedirlo &rarr;</a>`;
  if (email) return `<a class="boton boton-bloque" href="mailto:${e(email)}?subject=${encodeURIComponent(p.nombre)}">Pedirlo &rarr;</a>`;
  return '<span class="boton boton-bloque boton-apagado">Muy pronto</span>';
}

export function productosHtml(sitio) {
  return `<div class="productos">${(sitio.productos ?? []).map((p) => `<article class="producto${p.destacado ? ' destacado' : ''}" id="${e(p.id)}">
  ${p.destacado ? '<span class="producto-etq">El más pedido</span>' : ''}
  <h3>${e(p.nombre)}</h3>
  <p class="producto-precio"><strong>${e(p.precio)}</strong> <span>${e(p.pago)}</span></p>
  <p>${e(p.resumen)}</p>
  <ul>${p.incluye.map((i) => `<li>${e(i)}</li>`).join('')}</ul>
  ${botonProducto(sitio, p)}
</article>`).join('')}</div>`;
}

export function paginaRecorta(sitio, stack) {
  const top = [...stack.herramientas].sort((a, b) => ahorroMaximo(b) - ahorroMaximo(a)).slice(0, 6);
  const todo = calcularRecorte(stack.herramientas.map((h) => h.slug), stack.herramientas);
  const datos = JSON.stringify(datosCliente(stack, sitio)).replaceAll('<', '\\u003c');
  const contenido = `<section class="hero">
  <p class="antetitulo">${ICONO_TIJERA} Calculadora gratuita · sin registro</p>
  <h1>Pagas <span class="tachado">de más</span> por tu software.</h1>
  <p class="entradilla">Marca lo que pagas cada mes y te digo cuánto te ahorras cambiándote a alternativas igual de buenas, con precios oficiales y la letra pequeña de cada cambio.</p>
  <ul class="hero-datos">
    <li><strong>${stack.herramientas.length}</strong> herramientas caras analizadas</li>
    <li><strong>${formatear(Math.round(todo.ahorroAnual))} ${stack.moneda}</strong> de recorte posible al año</li>
    <li><strong>0 €</strong> te cuesta usarla</li>
  </ul>
</section>
${calculadoraHtml(stack)}
<a class="barra-movil" id="barra-movil" href="#resultado" hidden><span>Te ahorras al año</span><strong id="barra-ahorro">0 ${stack.moneda}</strong><span>Ver &darr;</span></a>
<section class="bloque-cambios" id="plan" hidden>
  <div class="cabecera-seccion"><h2>Paso 2 · Tu plan de recorte</h2><a href="/migracion-gratis/">¿Te lo migro gratis? &rarr;</a></div>
  <div class="cambios" id="cambios"></div>
</section>
${huecoAnuncio(sitio, 'portada')}
${historiaHtml(sitio, stack)}
<section>
  <div class="cabecera-seccion"><h2>Los recortes más grandes</h2><a href="/alternativas/">Ver todas las alternativas &rarr;</a></div>
  <div class="recortes">${top.map((h) => tarjetaRecorte(h, stack.moneda)).join('')}</div>
</section>
<section class="seccion-productos" id="servicios">
  <div class="cabecera-seccion"><div><p class="antetitulo">¿Sin tiempo para hacerlo tú?</p><h2>Te lo migro yo, y casi siempre gratis</h2></div><a href="/precios/">Cómo gano dinero &rarr;</a></div>
  ${productosHtml(sitio)}
</section>
${formularioNewsletter(sitio)}
<script type="application/json" id="datos-stack">${datos}</script>
<script type="module" src="/js/calculadora.js"></script>`;
  return pagina(sitio, {
    titulo: sitio.nombre,
    descripcion: sitio.lema,
    ruta: '/',
    contenido,
    jsonLd: [
      { '@type': 'WebSite', name: sitio.nombre, url: sitio.url, inLanguage: sitio.idioma },
      { '@type': 'WebApplication', name: `Calculadora de ${sitio.nombre}`, applicationCategory: 'FinanceApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' }, url: sitio.url },
    ],
  });
}

export function paginaPrecios(sitio) {
  return pagina(sitio, {
    titulo: 'Precios y cómo gano dinero',
    descripcion: `La calculadora de ${sitio.nombre} es gratis. Así gano dinero: comisiones que no cambian tu precio, planes de recorte personales y auditorías para empresas.`,
    ruta: '/precios/',
    migas: [['/precios/', 'Precios']],
    contenido: `<section class="hero hero-alt"><p class="antetitulo">${ICONO_TIJERA} Transparencia total</p><h1>Así gano dinero (y por qué te conviene saberlo)</h1><p class="entradilla">La calculadora, las comparativas y la mayoría de migraciones son gratis para ti. Esto es lo que paga Recorta:</p></section>
<section class="ingresos">
  <div><span class="promesa-num">01</span><h3>Comisiones que no cambian tu precio</h3><p>Si te das de alta en una alternativa desde mis enlaces, la herramienta me paga una parte. Tú pagas lo mismo, y a veces menos si hay cupón. Nunca cambia el orden: las alternativas van de más barata a más cara, cobre o no.</p></div>
  <div><span class="promesa-num">02</span><h3>Migraciones gratis que paga la herramienta</h3><p>Si te cambias con mi enlace, te migro gratis: la comisión de tu alta paga mi trabajo. Solo cobro las migraciones grandes y las auditorías para empresas.</p></div>
  <div><span class="promesa-num">03</span><h3>Publicidad señalada</h3><p>Hay espacios de anuncio y patrocinios de la newsletter "El Recorte", siempre marcados y fuera de los rankings. <a href="/patrocina/">Anúnciate</a>.</p></div>
</section>
<section class="seccion-productos"><div class="cabecera-seccion"><h2>Servicios</h2></div>${productosHtml(sitio)}</section>
<section class="faq"><h2>Preguntas frecuentes</h2>
<details><summary>¿La calculadora es gratis de verdad?</summary><p>Sí. No pide registro ni tarjeta. Se paga con las comisiones de las alternativas y con los servicios de pago, que son opcionales.</p></details>
<details><summary>¿Por qué la migración es gratis?</summary><p>Porque si te das de alta en la alternativa con mi enlace, la herramienta me paga una comisión. Esa comisión paga mi trabajo y tú no pagas nada extra.</p></details>
<details><summary>¿Recomiendas herramientas que no te pagan comisión?</summary><p>Sí, y salen igual que las demás. Si la mejor opción para ti es gratis y no me paga nada, es la que te recomiendo.</p></details>
</section>`,
  });
}

export function preguntasAlternativa(h, moneda) {
  const alt = mejorAlternativa(h);
  const anual = Math.round(ahorroMaximo(h) * 12);
  const gratis = h.alternativas.filter((a) => a.precioMes === 0);
  return [
    { pregunta: `¿Cuánto cuesta ${h.nombre}?`, respuesta: `El plan ${h.plan} de ${h.nombre} cuesta ${formatear(h.precioMes)} ${moneda} al mes. ${h.detalle}` },
    { pregunta: `¿Cuál es la alternativa más barata a ${h.nombre}?`, respuesta: `${alt.nombre} (${alt.plan}), ${alt.precioMes === 0 ? 'gratis' : `por ${formatear(alt.precioMes)} ${moneda} al mes`}. ${anual > 0 ? `Supone un ahorro de hasta ${formatear(anual)} ${moneda} al año.` : 'Cuesta lo mismo, pero puede encajarte mejor.'}` },
    { pregunta: `¿Hay alguna alternativa gratis a ${h.nombre}?`, respuesta: gratis.length ? `Sí: ${gratis.map((a) => a.nombre).join(', ')} ${gratis.length > 1 ? 'tienen' : 'tiene'} plan gratis que cubre lo básico.` : `No del todo, pero ${h.alternativas.filter((a) => a.gratis).map((a) => a.nombre).join(', ') || alt.nombre} permite empezar con plan gratis o prueba.` },
  ];
}

export function paginaAlternativa(sitio, h, stack) {
  const M = stack.moneda;
  const alt = mejorAlternativa(h);
  const anual = Math.round(ahorroMaximo(h) * 12);
  const ano = stack.verificado.slice(0, 4);
  const preguntas = preguntasAlternativa(h, M);
  const otras = stack.herramientas.filter((o) => o.slug !== h.slug && o.categoria === h.categoria);
  const filas = [
    `<tr class="fila-actual"><td><strong>${e(h.nombre)}</strong><br><span class="meta">${e(h.plan)} · lo que pagas</span></td><td class="cifra">${formatear(h.precioMes)} ${M}/mes</td><td class="cifra">${formatear(Math.round(h.precioMes * 12))} ${M}</td><td>—</td></tr>`,
    ...[...h.alternativas].sort((a, b) => a.precioMes - b.precioMes).map((a) => `<tr><td><strong>${e(a.nombre)}</strong><br><span class="meta">${e(a.plan)}</span></td><td class="cifra">${precioTxt(a.precioMes, M)}</td><td class="cifra">${formatear(Math.round(a.precioMes * 12))} ${M}</td><td class="cifra ahorro">${h.precioMes > a.precioMes ? `-${formatear(Math.round((h.precioMes - a.precioMes) * 12))} ${M}` : '0'}</td></tr>`),
  ].join('');
  const tarjetas = [...h.alternativas].sort((a, b) => a.precioMes - b.precioMes).map((a, i) => `<article class="alternativa${i === 0 ? ' principal' : ''}">
  <div class="alternativa-cabeza"><h3>${i + 1}. ${e(a.nombre)}</h3>${h.precioMes > a.precioMes ? `<span class="sello">-${formatear(Math.round((h.precioMes - a.precioMes) * 12))} ${M}/año</span>` : ''}</div>
  <p class="meta">${e(a.plan)} · ${precioTxt(a.precioMes, M)}${a.gratis && a.precioMes > 0 ? ' · tiene plan gratis o prueba' : ''}</p>
  <p>${e(a.porQue)}</p>
  <p class="pierdes"><strong>Lo que pierdes:</strong> ${e(a.pierdes)}</p>
  <p class="cambio-acciones">${botonAlt(a, a.gratis ? `Probar ${a.nombre} gratis` : `Ver ${a.nombre}`)}${a.afiliado ? ` <a class="enlace-sec" href="${e(enlaceMigracion(sitio, h.nombre, a.nombre))}">Migrármelo gratis</a>` : ''}${a.ficha ? ` <a class="enlace-sec" href="${a.ficha}">Ficha y precios</a>` : ''}</p>
</article>`).join('');
  const contenido = `<section class="hero hero-alt">
  <p class="antetitulo">${ICONO_TIJERA} Alternativas · precios verificados el ${fechaLarga(stack.verificado)}</p>
  <h1>Alternativas más baratas a ${e(h.nombre)} (${ano})</h1>
  <p class="entradilla">Si pagas ${e(h.nombre)} ${e(h.plan)} (${formatear(h.precioMes)} ${M}/mes), ${anual > 0 ? `puedes recortar <strong class="resalta">hasta ${formatear(anual)} ${M} al año</strong> cambiándote a ${e(alt.nombre)}` : `estas son las opciones que hay`}. Aquí tienes cada opción con su precio oficial y lo que pierdes al cambiar.</p>
  <p><a class="boton" href="/?s=${h.slug}#calculadora">Calcular mi recorte completo</a></p>
</section>
<p class="aviso-afiliado">Algunos enlaces son de afiliado: si te das de alta podemos cobrar una comisión, sin coste para ti. Nunca cambia el orden, que va de más barato a más caro. <a href="/aviso-afiliados/">Más información</a>.</p>
<div class="tabla-scroll"><table class="comparativa"><thead><tr><th>Opción</th><th>Precio</th><th>Al año</th><th>Recorte</th></tr></thead><tbody>${filas}</tbody></table></div>
<p class="meta">${e(h.detalle)} Precio de ${e(h.nombre)} en <a href="${e(h.urlPrecios)}" rel="nofollow noopener" target="_blank">su web oficial</a>. ${e(stack.nota)}</p>
<section class="alternativas">${tarjetas}</section>
${huecoAnuncio(sitio, 'alternativa')}
<section class="faq"><h2>Preguntas frecuentes</h2>${preguntas.map((q) => `<details><summary>${e(q.pregunta)}</summary><p>${e(q.respuesta)}</p></details>`).join('')}</section>
${otras.length ? `<section><div class="cabecera-seccion"><h2>Otros recortes en ${e(stack.categorias[h.categoria].toLowerCase())}</h2></div><div class="recortes">${otras.map((o) => tarjetaRecorte(o, M)).join('')}</div></section>` : ''}
${formularioNewsletter(sitio)}`;
  return pagina(sitio, {
    titulo: `Alternativas más baratas a ${h.nombre} (${ano}): ahorra hasta ${formatear(anual)} ${M}/año`,
    descripcion: `${h.nombre} cuesta ${formatear(h.precioMes)} ${M}/mes. Comparamos ${h.alternativas.map((a) => a.nombre).join(', ')} con precios oficiales y lo que pierdes al cambiar.`.slice(0, 160),
    ruta: rutaAlternativa(h.slug),
    migas: [['/alternativas/', 'Alternativas'], [rutaAlternativa(h.slug), h.nombre]],
    contenido,
    jsonLd: [
      { '@type': 'FAQPage', mainEntity: preguntas.map((q) => ({ '@type': 'Question', name: q.pregunta, acceptedAnswer: { '@type': 'Answer', text: q.respuesta } })) },
      { '@type': 'ItemList', name: `Alternativas a ${h.nombre}`, itemListElement: h.alternativas.map((a, i) => ({ '@type': 'ListItem', position: i + 1, name: a.nombre })) },
    ],
  });
}

export function paginaAlternativas(sitio, stack) {
  const secciones = Object.entries(stack.categorias).map(([cat, nombre]) => {
    const lista = stack.herramientas.filter((h) => h.categoria === cat).sort((a, b) => ahorroMaximo(b) - ahorroMaximo(a));
    return lista.length ? `<section><div class="cabecera-seccion"><h2>${e(nombre)}</h2></div><div class="recortes">${lista.map((h) => tarjetaRecorte(h, stack.moneda)).join('')}</div></section>` : '';
  }).join('');
  return pagina(sitio, {
    titulo: 'Alternativas más baratas al software que pagas',
    descripcion: 'Alternativas más baratas (o gratis) a Kajabi, ClickFunnels, Mailchimp, Zapier, Ahrefs, Typeform y más, con precios oficiales y lo que pierdes al cambiar.',
    ruta: '/alternativas/',
    migas: [['/alternativas/', 'Alternativas']],
    contenido: `<section class="hero hero-alt"><p class="antetitulo">${ICONO_TIJERA} Directorio de recortes</p><h1>Alternativas más baratas al software que pagas</h1><p class="entradilla">Cada página compara la herramienta cara con sus alternativas, con precios oficiales y la letra pequeña de cada cambio.</p><p><a class="boton" href="/#calculadora">Calcular mi recorte</a></p></section>${secciones}`,
  });
}

export function paginaGuias(sitio, articulos) {
  const lista = articulos.filter((a) => a.estado === 'publicado');
  return pagina(sitio, {
    titulo: 'Guías y comparativas',
    descripcion: `Guías, comparativas y tutoriales de ${sitio.nombre} para pagar menos y trabajar mejor con software e IA.`,
    ruta: '/guias/',
    migas: [['/guias/', 'Guías']],
    contenido: `<section class="hero hero-alt"><p class="antetitulo">Guías</p><h1>Guías y comparativas</h1><p class="entradilla">Para cuando ya sabes qué recortar y quieres hacerlo bien.</p></section>
<section class="rejilla">${lista.map((a) => `<article class="tarjeta"><p class="meta">${e(sitio.categorias[a.categoria] ?? '')}</p><h2><a href="/${a.slug}/">${e(a.titulo)}</a></h2><p>${e(a.descripcion)}</p></article>`).join('')}</section>`,
  });
}

export function paginaMigracion(sitio, stack) {
  const formulario = sitio.contacto?.urlFormulario || '';
  const pares = stack.herramientas.map((h) => ({ h, alt: mejorAlternativa(h) })).filter((x) => x.alt?.afiliado);
  const boton = formulario
    ? `<a class="boton" id="pedir-migracion" href="${e(enlaceMigracion(sitio))}" target="_blank" rel="noopener">Pedir mi migración gratis &rarr;</a>`
    : '<span class="boton boton-apagado">Formulario muy pronto</span>';
  return pagina(sitio, {
    titulo: 'Te migro gratis a una herramienta más barata',
    descripcion: 'Si te cambias a la alternativa con mi enlace, te migro gratis contactos, cursos, embudos y automatizaciones. La comisión de tu alta paga mi trabajo.',
    ruta: '/migracion-gratis/',
    migas: [['/migracion-gratis/', 'Migración gratis']],
    contenido: `<section class="hero hero-alt">
  <p class="antetitulo">${ICONO_TIJERA} Migración gratis</p>
  <h1>Ahorrar no debería costarte un fin de semana.</h1>
  <p class="entradilla" id="migracion-par">Ya tienes tus flujos montados y cambiar da pereza. Lo entiendo. Así que te lo migro yo, gratis, si te das de alta en la alternativa con mi enlace.</p>
  <p>${boton}</p>
</section>
<section class="pasos">
  <div><span class="promesa-num">01</span><h3>Te das de alta con mi enlace</h3><p>En la alternativa que te sale en la calculadora. Pagas lo mismo que por tu cuenta, y muchas tienen plan gratis.</p></div>
  <div><span class="promesa-num">02</span><h3>Me cuentas qué tienes montado</h3><p>Rellenas un formulario corto: qué herramienta usas, cuántos contactos, cursos o automatizaciones tienes.</p></div>
  <div><span class="promesa-num">03</span><h3>Te lo dejo funcionando</h3><p>Soy programador: muevo tus datos con scripts y rehago tus flujos. Cancelas la herramienta cara solo cuando todo funciona.</p></div>
</section>
<section class="como">
  <h2>¿Por qué gratis?</h2>
  <p class="como-texto">Cuando te das de alta con mi enlace, la herramienta nueva me paga una comisión, en muchos casos cada mes mientras sigas con ella. Esa comisión paga mi trabajo. Tú te ahorras la cuota cara y la migración.</p>
</section>
<section>
  <div class="cabecera-seccion"><h2>Migraciones que hago gratis</h2></div>
  <div class="recortes">${pares.map(({ h, alt }) => `<a class="recorte-tarjeta" href="${e(enlaceMigracion(sitio, h.nombre, alt.nombre))}"${formulario ? ' target="_blank" rel="noopener"' : ''}><span class="recorte-par"><s>${e(h.nombre)}</s> &rarr; <strong>${e(alt.nombre)}</strong></span><span class="recorte-precios">Te ahorras hasta ${formatear(Math.round(ahorroMaximo(h) * 12))} ${stack.moneda}/año</span><span class="sello">Migración gratis</span></a>`).join('')}</div>
</section>
<section class="faq"><h2>Preguntas frecuentes</h2>
<details><summary>¿Qué entra en la migración gratis?</summary><p>Contactos y listas, productos y cursos, páginas y embudos, y hasta 5 automatizaciones. Si tienes mucho más, te hago un presupuesto de migración a medida antes de empezar.</p></details>
<details><summary>¿Y si ya me di de alta sin tu enlace?</summary><p>Entonces la herramienta no me paga nada por ti, y la migración pasa a ser de pago (desde 149 €).</p></details>
<details><summary>¿Necesitas mis contraseñas?</summary><p>No. Me invitas como colaborador en las dos herramientas o exportas tus datos, y retiras el acceso cuando acabo.</p></details>
</section>
<script>
(() => {
  const q = new URLSearchParams(location.search);
  const de = q.get('de'), a = q.get('a');
  if (de && a) document.getElementById('migracion-par').textContent = 'Te paso de ' + de + ' a ' + a + ' gratis si te das de alta en ' + a + ' con mi enlace. Tú ahorras la cuota y no tocas nada.';
  const b = document.getElementById('pedir-migracion');
  if (b && (de || a)) { const u = new URL(b.href); if (de) u.searchParams.set('de', de); if (a) u.searchParams.set('a', a); b.href = u.href; }
})();
</script>`,
  });
}
