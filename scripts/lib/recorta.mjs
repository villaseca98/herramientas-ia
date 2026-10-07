// Recorta: calculadora de ahorro de software y páginas "alternativas más baratas a X".
import { leerJson, escaparHtml as e, enlaceIr } from './contenido.mjs';
import { pagina, formularioNewsletter, fechaLarga } from './plantillas.mjs';
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
        return { ...alt, nombre: a.nombre, enlace: enlaceIr(a.slug), ficha: a.ficha ? `/herramientas/${a.slug}/` : null };
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

function datosCliente(stack) {
  return {
    moneda: stack.moneda,
    herramientas: stack.herramientas.map((h) => ({
      slug: h.slug, nombre: h.nombre, plan: h.plan, precioMes: h.precioMes,
      alternativas: h.alternativas.map(({ nombre, plan, precioMes, gratis, porQue, pierdes, enlace, afiliado }) => ({ nombre, plan, precioMes, gratis, porQue, pierdes, enlace, afiliado: Boolean(afiliado) })),
    })),
  };
}

function ticketHtml(stack) {
  return `<aside class="ticket" id="ticket" aria-live="polite">
  <div class="ticket-papel">
    <p class="ticket-titulo">RECORTA · TICKET DE TU STACK</p>
    <p class="ticket-sub">Precios oficiales verificados el ${fechaLarga(stack.verificado)}</p>
    <hr class="corte">
    <ul class="ticket-lineas" id="ticket-lineas"><li class="ticket-vacio">Marca lo que pagas cada mes &larr;</li></ul>
    <p class="ticket-fila"><span>Total ahora</span><span id="ticket-actual">0 ${stack.moneda}/mes</span></p>
    <p class="ticket-fila fuerte"><span>Al año</span><span id="ticket-gasto">0 ${stack.moneda}</span></p>
    <hr class="corte">
    <p class="ticket-titulo">RECORTES</p>
    <ul class="ticket-lineas recortes" id="ticket-recortes"></ul>
    <p class="ticket-fila"><span>Pagarías</span><span id="ticket-nuevo">0 ${stack.moneda}/mes</span></p>
    <div class="ticket-ahorro"><span>Te ahorras al año</span><strong id="ticket-ahorro">0 ${stack.moneda}</strong></div>
    <button class="boton boton-bloque" id="ticket-ver" type="button">Ver cómo recortar</button>
    <div class="compartir">
      <span>Compártelo:</span>
      <a id="compartir-wa" href="#" target="_blank" rel="noopener">WhatsApp</a>
      <a id="compartir-x" href="#" target="_blank" rel="noopener">X</a>
      <button id="compartir-copiar" type="button">Copiar enlace</button>
    </div>
  </div>
</aside>`;
}

function piezasHtml(stack) {
  return Object.entries(stack.categorias).map(([cat, nombre]) => {
    const lista = stack.herramientas.filter((h) => h.categoria === cat);
    if (!lista.length) return '';
    return `<fieldset class="grupo"><legend>${e(nombre)}</legend><div class="piezas">${lista.map((h) => `<button class="pieza" type="button" data-slug="${h.slug}" aria-pressed="false">
  <span class="pieza-check" aria-hidden="true"></span>
  <span class="pieza-nombre">${e(h.nombre)}</span>
  <span class="pieza-plan">${e(h.plan)}</span>
  <span class="pieza-precio">${formatear(h.precioMes)} ${stack.moneda}<small>/mes</small></span>
</button>`).join('')}</div></fieldset>`;
  }).join('');
}

function tarjetaRecorte(h, moneda) {
  const alt = mejorAlternativa(h);
  const anual = Math.round(ahorroMaximo(h) * 12);
  return `<a class="recorte-tarjeta" href="${rutaAlternativa(h.slug)}">
  <span class="sello">-${formatear(anual)} ${moneda}/año</span>
  <span class="recorte-par"><s>${e(h.nombre)}</s> &rarr; <strong>${e(alt.nombre)}</strong></span>
  <span class="recorte-precios">${formatear(h.precioMes)} ${moneda}/mes &rarr; ${alt.precioMes === 0 ? 'gratis' : `${formatear(alt.precioMes)} ${moneda}/mes`}</span>
</a>`;
}

export function paginaRecorta(sitio, stack) {
  const top = [...stack.herramientas].sort((a, b) => ahorroMaximo(b) - ahorroMaximo(a)).slice(0, 6);
  const todo = calcularRecorte(stack.herramientas.map((h) => h.slug), stack.herramientas);
  const datos = JSON.stringify(datosCliente(stack)).replaceAll('<', '\\u003c');
  const contenido = `<section class="hero">
  <p class="antetitulo">${ICONO_TIJERA} Calculadora gratuita · sin registro</p>
  <h1>Pagas <span class="tachado">de más</span> por tu software.</h1>
  <p class="entradilla">Marca las herramientas que pagas cada mes y te decimos, con precios oficiales, cuánto te ahorras cambiando a alternativas igual de buenas. También lo que pierdes con cada cambio, para que decidas tú.</p>
  <ul class="hero-datos">
    <li><strong>${stack.herramientas.length}</strong> herramientas caras analizadas</li>
    <li><strong>${formatear(Math.round(todo.ahorroAnual))} ${stack.moneda}</strong> de recorte posible al año</li>
    <li><strong>0 €</strong> te cuesta usarla</li>
  </ul>
</section>
<section class="calculadora" id="calculadora">
  <div class="calc-piezas">
    <h2 class="calc-titulo"><span class="paso">1</span> ¿Qué pagas ahora?</h2>
    ${piezasHtml(stack)}
    <p class="nota">${e(stack.nota)} Calculamos con precios de renovación, nunca con ofertas de entrada.</p>
  </div>
  ${ticketHtml(stack)}
</section>
<a class="barra-movil" id="barra-movil" href="#ticket" hidden><span>Te ahorras al año</span><strong id="barra-ahorro">0 ${stack.moneda}</strong><span>Ver ticket &darr;</span></a>
<section class="bloque-cambios" id="bloque-cambios" hidden>
  <h2 class="calc-titulo"><span class="paso">2</span> Tu plan de recorte</h2>
  <div class="cambios" id="cambios"></div>
</section>
<section class="como">
  <h2>Por qué Recorta no es otra web de "las 10 mejores herramientas"</h2>
  <div class="tres">
    <div><span class="num">01</span><h3>Partimos de lo que ya pagas</h3><p>No te vendemos otra suscripción: buscamos qué sobra en tu factura y por qué cambiarlo.</p></div>
    <div><span class="num">02</span><h3>Precios oficiales, sin trampas</h3><p>Cada precio sale de la web oficial con fecha de verificación. Si una oferta sube al renovar, calculamos con la renovación.</p></div>
    <div><span class="num">03</span><h3>Te decimos lo que pierdes</h3><p>Cada recorte trae su letra pequeña. Si una herramienta cara te compensa, te lo decimos y no la cambies.</p></div>
  </div>
</section>
<section>
  <div class="cabecera-seccion"><h2>Los recortes más grandes</h2><a href="/alternativas/">Ver todas las alternativas &rarr;</a></div>
  <div class="recortes">${top.map((h) => tarjetaRecorte(h, stack.moneda)).join('')}</div>
</section>
<section class="empresas">
  <div>
    <p class="antetitulo">Para equipos y empresas</p>
    <h2>¿Tu empresa paga 20 suscripciones y nadie sabe para qué?</h2>
    <p>Revisamos el stack de software de tu equipo, licencia a licencia, y te entregamos un plan de recorte con lo que cambiar, lo que mantener y cómo migrar sin parar el trabajo.</p>
  </div>
  <a class="boton boton-claro" href="/servicios/">Pedir auditoría de stack &rarr;</a>
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
  <p class="cambio-acciones">${botonAlt(a, a.gratis ? `Probar ${a.nombre} gratis` : `Ver ${a.nombre}`)}${a.ficha ? ` <a class="enlace-sec" href="${a.ficha}">Ficha y precios de ${e(a.nombre)}</a>` : ''}</p>
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
