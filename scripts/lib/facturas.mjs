// Recorta en casa: calculadora de facturas del hogar, páginas por factura y página de bonos por cambiarte.
import { leerJson, escaparHtml as e, enlaceIr } from './contenido.mjs';
import { pagina, formularioNewsletter, fechaLarga, huecoAnuncio } from './plantillas.mjs';
import { calcularFacturas, referenciaMes, ahorroMes, mejorBono, mejorOpcion, listaBonos } from '../../src/cliente/facturas.js';
import { formatear } from '../../src/cliente/recorte.js';
import { logo } from './recorta.mjs';

const ICONO_TIJERA = '<svg class="icono-tijera" viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12"/></svg>';
const COLOR_FACTURA = { 'luz-y-gas': '#e8a400', 'fibra-y-movil': '#2b59f5', banco: '#1d7a4c', suscripciones: '#d8430e' };

export const rutaFactura = (slug) => `/facturas/${slug}/`;
const euros = (n) => `${formatear(Math.round(n))} €`;
const eurosMes = (n) => `${formatear(n)} €/mes`;

// Carga data/facturas.json, valida los datos y añade a cada opción su enlace /ir/<slug>/.
export function cargarFacturas() {
  const datos = leerJson('data/facturas.json');
  const slugs = new Set();
  for (const f of datos.facturas) {
    if (!(f.gastoMedioMes > 0)) throw new Error(`facturas.json: ${f.slug} sin gastoMedioMes`);
    if (!f.fuenteGasto?.url?.startsWith('https://')) throw new Error(`facturas.json: ${f.slug} sin fuente del gasto`);
    if (referenciaMes(f) === null && !(f.ahorroPct > 0)) throw new Error(`facturas.json: ${f.slug} sin precio de referencia ni ahorroPct`);
    for (const o of f.opciones) {
      if (slugs.has(o.slug)) throw new Error(`facturas.json: opción repetida ${o.slug}`);
      slugs.add(o.slug);
      if (!o.urlOficial?.startsWith('https://')) throw new Error(`facturas.json: ${o.slug} sin urlOficial`);
      o.enlace = enlaceIr(o.slug);
      o.referido = Boolean(o.enlaceReferido || o.codigo);
    }
  }
  return datos;
}

// Destino de /ir/<slug>/ para cada opción: el enlace de plan amigo si lo hay, si no la web oficial.
export function redireccionesFacturas(datos) {
  return datos.facturas.flatMap((f) => f.opciones.map((o) => ({ slug: o.slug, nombre: o.nombre, destino: o.enlaceReferido || o.urlOficial })));
}

function botonOpcion(o, texto) {
  return `<a class="boton" href="${e(o.enlace)}" rel="sponsored nofollow noopener" target="_blank">${e(texto)} &rarr;</a>`;
}

function codigoHtml(o) {
  return o.codigo ? `<p class="codigo">Código amigo: <code>${e(o.codigo)}</code> <button type="button" class="copiar-codigo" data-codigo="${e(o.codigo)}">Copiar</button></p>` : '';
}

function textoAhorro(f) {
  const ref = referenciaMes(f);
  return ref !== null
    ? `pasando a ${ref === 0 ? 'una opción sin comisiones' : `${eurosMes(ref)}`}`
    : `${Math.round((f.ahorroPct ?? 0) * 100)}% menos, de media`;
}

function datosCliente(datos) {
  return {
    facturas: datos.facturas.map((f) => ({
      slug: f.slug, nombre: f.nombre, corto: f.corto, gastoMedioMes: f.gastoMedioMes, precioReferencia: f.precioReferencia, ahorroPct: f.ahorroPct,
      color: COLOR_FACTURA[f.slug] ?? '#16140f', ruta: rutaFactura(f.slug),
      opciones: f.opciones.map(({ slug, nombre, dominio, precioMes, plan, bono, bonoTexto, que, enlace, codigo }) => ({ slug, nombre, dominio, precioMes, plan, bono, bonoTexto, que, enlace, codigo })),
    })),
  };
}

function calculadoraHtml(datos) {
  const filas = datos.facturas.map((f) => `<li class="fila activa" data-slug="${f.slug}">
  <label class="fila-label" for="chk-${f.slug}">
    <input type="checkbox" class="fila-check" id="chk-${f.slug}" data-slug="${f.slug}" checked>
    <span class="caja" aria-hidden="true"></span>
    ${logo(f.nombre, null, COLOR_FACTURA[f.slug])}
    <span class="fila-txt"><strong>${e(f.nombre)}</strong><small>Media: ${e(f.detalle)}</small></span>
  </label>
  <label class="fila-precio" for="precio-${f.slug}"><span class="sr">Lo que pagas al mes de ${e(f.corto)}</span><input type="number" inputmode="decimal" min="0" step="0.01" id="precio-${f.slug}" data-slug="${f.slug}" value="${f.gastoMedioMes}"><span>€/mes</span></label>
</li>`).join('');
  return `<section class="calc" id="calculadora">
  <div class="calc-lista">
    <div class="calc-cabeza">
      <div><p class="antetitulo">Paso 1 · pon lo que pagas</p><h2>Tus facturas de cada mes</h2></div>
    </div>
    <ul class="filas" id="filas">${filas}</ul>
    <p class="nota">Vienen rellenas con la media de un hogar en España. Cámbialas por lo que dice tu factura o desmarca lo que no pagas. Fuentes en cada <a href="#facturas">guía</a>.</p>
    <p class="nota">¿Pagas software para tu negocio? <a href="/software/">Calcula también ese recorte &rarr;</a></p>
  </div>
  <aside class="calc-res" id="resultado" aria-live="polite">
    <div class="res-cabeza">
      <p class="res-etq">Te ahorras</p>
      <div class="periodo" role="group" aria-label="Periodo"><button type="button" data-periodo="ano" aria-pressed="true">al año</button><button type="button" data-periodo="mes" aria-pressed="false">al mes</button></div>
    </div>
    <p class="res-grande"><span id="res-ahorro">0</span><span class="res-unidad" id="res-unidad"> €/año</span></p>
    <p class="res-bonos" id="res-bonos-linea"><span>+ hasta</span> <strong id="res-bonos">0 €</strong> <span>en bonos por cambiarte</span></p>
    <p class="res-sub" id="res-sub">Pon lo que pagas cada mes.</p>
    <div class="barras">
      <div class="barra"><span>Ahora</span><div class="pista"><i id="barra-ahora"></i></div><b id="res-ahora">0 €</b></div>
      <div class="barra"><span>Recortando</span><div class="pista"><i id="barra-nuevo"></i></div><b id="res-nuevo">0 €</b></div>
    </div>
    <ol class="res-cambios" id="res-cambios"></ol>
    <a class="boton boton-bloque" id="ver-plan" href="#plan">Ver qué cambiar y quién me paga &darr;</a>
    <div class="compartir"><span>Compartir:</span><a id="compartir-wa" href="#" target="_blank" rel="noopener">WhatsApp</a><a id="compartir-x" href="#" target="_blank" rel="noopener">X</a><button id="compartir-copiar" type="button">Copiar enlace</button></div>
  </aside>
</section>`;
}

function tarjetaFactura(f) {
  const bono = mejorBono(f);
  return `<a class="recorte-tarjeta" href="${rutaFactura(f.slug)}">
  <span class="recorte-logos">${logo(f.nombre, null, COLOR_FACTURA[f.slug], 'logo logo-peq')}</span>
  <span class="recorte-par"><strong>${e(f.nombre)}</strong></span>
  <span class="recorte-precios">Media ${eurosMes(f.gastoMedioMes)} &rarr; ${e(textoAhorro(f))}</span>
  <span class="sello">-${euros(ahorroMes(f) * 12)}/año${bono ? ` + ${euros(bono.bono)}` : ''}</span>
</a>`;
}

function tarjetaBono(b) {
  return `<article class="alternativa bono-tarjeta">
  <div class="alternativa-cabeza">${logo(b.nombre, b.dominio, COLOR_FACTURA[b.factura.slug], 'logo')}<span class="bono-cifra">${euros(b.bono)}</span></div>
  <h3>${e(b.nombre)} <span class="meta">· ${e(b.factura.corto)}</span></h3>
  <p>${e(b.bonoTexto)}</p>
  ${b.condiciones ? `<p class="pierdes"><strong>Condiciones:</strong> ${e(b.condiciones)}</p>` : ''}
  ${codigoHtml(b)}
  <p class="cambio-acciones">${botonOpcion(b, `Ir a ${b.nombre}`)} <a class="enlace-sec" href="${rutaFactura(b.factura.slug)}">Comparar ${e(b.factura.corto)}</a></p>
</article>`;
}

const SCRIPT_COPIAR = `<script>
document.querySelectorAll('.copiar-codigo').forEach((b) => b.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(b.dataset.codigo); b.textContent = '¡Copiado!'; } catch { b.textContent = 'Cópialo a mano'; }
}));
</script>`;

export function paginaHogar(sitio, datos) {
  const media = calcularFacturas(Object.fromEntries(datos.facturas.map((f) => [f.slug, f.gastoMedioMes])), datos.facturas);
  const bonos = listaBonos(datos.facturas);
  const json = JSON.stringify(datosCliente(datos)).replaceAll('<', '\\u003c');
  const contenido = `<section class="hero">
  <p class="antetitulo">${ICONO_TIJERA} Calculadora gratuita · sin registro</p>
  <h1>Pagas <span class="tachado">de más</span> cada mes.</h1>
  <p class="entradilla">Luz, internet, banco y streaming. Pon lo que pagas y te digo cuánto te ahorras cambiándote, a qué compañía, y cuánto te pagan ellas por cambiarte.</p>
  <ul class="hero-datos">
    <li><strong>${euros(media.ahorroAnual)}</strong> al año pierde un hogar medio</li>
    <li><strong>${euros(bonos[0]?.bono ?? 0)}</strong> el bono más alto por cambiarte</li>
    <li><strong>0 €</strong> te cuesta usarla</li>
  </ul>
</section>
${calculadoraHtml(datos)}
<a class="barra-movil" id="barra-movil" href="#resultado" hidden><span>Te ahorras al año</span><strong id="barra-ahorro">0 €</strong><span>Ver &darr;</span></a>
<section class="bloque-cambios" id="plan" hidden>
  <div class="cabecera-seccion"><h2>Paso 2 · Qué cambiar (y quién te paga)</h2><a href="/bonos/">Todos los bonos &rarr;</a></div>
  <div class="cambios" id="cambios"></div>
</section>
${huecoAnuncio(sitio, 'portada')}
<section class="historia" id="por-que">
  <div class="historia-carta">
    <p class="antetitulo">Por qué existe Recorta</p>
    <h2>Las compañías pagan por clientes nuevos. Que te paguen a ti.</h2>
    <p>Luz, fibra y bancos se gastan una fortuna en captar clientes: bonos de bienvenida, planes amigo, descuentos de entrada. Y mientras, a quien lleva años con ellos le suben la cuota.</p>
    <p>Recorta hace las cuentas por ti: cuánto pagas de más, a dónde irte y qué bono te llevas al cambiarte. Sin letra pequeña escondida.</p>
  </div>
  <ul class="promesas">
    <li><span class="promesa-num">01</span><div><h3>Medias reales, con fuente</h3><p>Cada cifra enlaza al informe del que sale. Si tu factura es distinta, la cambias y recalcula.</p></div></li>
    <li><span class="promesa-num">02</span><div><h3>Primero lo que más ahorras</h3><p>Ordeno por ahorro, no por lo que me paga cada compañía. Incluyo opciones que no me pagan nada.</p></div></li>
    <li><span class="promesa-num">03</span><div><h3>Condiciones a la vista</h3><p>Si un bono pide domiciliar la nómina o hacer tres compras, te lo digo antes de que hagas clic.</p></div></li>
  </ul>
</section>
<section id="facturas">
  <div class="cabecera-seccion"><h2>Recorta factura a factura</h2></div>
  <div class="recortes">${datos.facturas.map(tarjetaFactura).join('')}<a class="recorte-tarjeta" href="/software/"><span class="recorte-par"><strong>Software para tu negocio</strong></span><span class="recorte-precios">Kajabi, Zapier, Mailchimp, Ahrefs…</span><span class="sello">Calculadora aparte</span></a></div>
</section>
<section>
  <div class="cabecera-seccion"><h2>Te pagan por cambiarte</h2><a href="/bonos/">Ver todos los bonos &rarr;</a></div>
  <div class="alternativas">${bonos.slice(0, 3).map(tarjetaBono).join('')}</div>
</section>
${formularioNewsletter(sitio)}
<script type="application/json" id="datos-facturas">${json}</script>
<script type="module" src="/js/hogar.js"></script>`;
  return pagina(sitio, {
    titulo: 'Calculadora de facturas del hogar: luz, fibra, banco y streaming',
    descripcion: 'Pon lo que pagas de luz, internet, banco y suscripciones y descubre cuánto te ahorras cambiándote y qué bonos te dan las compañías por hacerlo.',
    ruta: '/hogar/',
    migas: [['/hogar/', 'Hogar']],
    contenido,
    jsonLd: [
      { '@type': 'WebApplication', name: `Calculadora de facturas de ${sitio.nombre}`, applicationCategory: 'FinanceApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' }, url: new URL('/hogar/', sitio.url).href },
    ],
  });
}

export function preguntasFactura(f) {
  const ref = referenciaMes(f);
  const bono = mejorBono(f);
  const opcion = mejorOpcion(f);
  const qs = [
    { pregunta: `¿Cuánto paga de media un hogar en ${f.corto}?`, respuesta: `Unos ${eurosMes(f.gastoMedioMes)} (${euros(f.gastoMedioMes * 12)} al año), según ${f.fuenteGasto.texto}.` },
    { pregunta: `¿Cuánto puedo ahorrar en ${f.corto}?`, respuesta: ref !== null
      ? `Con la opción más barata que comparamos (${opcion.nombre}${opcion.plan ? `, ${opcion.plan}` : ''}, ${ref === 0 ? 'sin comisiones' : eurosMes(ref)}) un hogar medio se ahorra ${euros(ahorroMes(f) * 12)} al año.`
      : `De media, un ${Math.round(f.ahorroPct * 100)}% (${euros(ahorroMes(f) * 12)} al año para un hogar medio). ${f.fuenteAhorro.texto}.` },
  ];
  if (bono) qs.push({ pregunta: `¿Qué compañía paga más por cambiarte en ${f.corto}?`, respuesta: `${bono.nombre}: ${bono.bonoTexto}${bono.condiciones ? ` ${bono.condiciones}` : ''}` });
  return qs;
}

export function paginaFactura(sitio, f, datos) {
  const ano = datos.verificado.slice(0, 4);
  const anual = ahorroMes(f) * 12;
  const preguntas = preguntasFactura(f);
  const opciones = [...f.opciones].sort((a, b) => (a.precioMes ?? Infinity) - (b.precioMes ?? Infinity) || b.bono - a.bono);
  const tarjetas = opciones.map((o, i) => `<article class="alternativa${i === 0 ? ' principal' : ''}">
  <div class="alternativa-cabeza">${logo(o.nombre, o.dominio, COLOR_FACTURA[f.slug], 'logo')}${o.bono > 0 ? `<span class="sello">+${euros(o.bono)} al cambiarte</span>` : ''}</div>
  <h3>${i + 1}. ${e(o.nombre)}</h3>
  ${Number.isFinite(o.precioMes) ? `<p class="meta">${e(o.plan ?? '')} · ${o.precioMes === 0 ? 'sin comisiones' : eurosMes(o.precioMes)}${f.gastoMedioMes > o.precioMes ? ` · -${euros((f.gastoMedioMes - o.precioMes) * 12)}/año frente a la media` : ''}</p>` : ''}
  <p>${e(o.que)}</p>
  ${o.bonoTexto ? `<p class="pierdes"><strong>Bono:</strong> ${e(o.bonoTexto)}${o.condiciones ? ` ${e(o.condiciones)}` : ''}</p>` : ''}
  ${codigoHtml(o)}
  <p class="cambio-acciones">${botonOpcion(o, `Ver ${o.nombre}`)}</p>
</article>`).join('');
  const otras = datos.facturas.filter((x) => x.slug !== f.slug);
  const contenido = `<section class="hero hero-alt">
  <p class="antetitulo">${ICONO_TIJERA} ${e(f.nombre)} · datos revisados el ${fechaLarga(datos.verificado)}</p>
  <h1>${e(f.titulo)} (${ano})</h1>
  <p class="entradilla">Un hogar medio paga <strong>${eurosMes(f.gastoMedioMes)}</strong> en ${e(f.corto)}. Puedes recortar <strong class="resalta">unos ${euros(anual)} al año</strong> (${e(textoAhorro(f))})${mejorBono(f) ? ` y llevarte hasta <strong class="resalta">${euros(mejorBono(f).bono)}</strong> de bono por cambiarte` : ''}.</p>
  <p><a class="boton" href="/hogar/#calculadora">Calcular con mis facturas</a></p>
</section>
${f.opciones.length ? `<p class="aviso-afiliado">Algunos enlaces son de plan amigo o de afiliado: si te das de alta podemos recibir un bono o una comisión, sin coste para ti (y a menudo con bono para ti también). El orden va por precio. <a href="/aviso-afiliados/">Más información</a>.</p>
<section class="alternativas">${tarjetas}</section>` : ''}
<section class="como"><h2>Cómo recortar ${e(f.corto)}</h2><ol class="consejos">${f.consejos.map((c) => `<li>${e(c)}</li>`).join('')}</ol></section>
<p class="meta">Gasto medio: <a href="${e(f.fuenteGasto.url)}" rel="nofollow noopener" target="_blank">${e(f.fuenteGasto.texto)}</a>.${f.fuenteAhorro ? ` Ahorro: <a href="${e(f.fuenteAhorro.url)}" rel="nofollow noopener" target="_blank">${e(f.fuenteAhorro.texto)}</a>.` : ''} ${e(datos.nota)}</p>
${huecoAnuncio(sitio, 'factura')}
<section class="faq"><h2>Preguntas frecuentes</h2>${preguntas.map((q) => `<details><summary>${e(q.pregunta)}</summary><p>${e(q.respuesta)}</p></details>`).join('')}</section>
<section><div class="cabecera-seccion"><h2>Otras facturas que puedes recortar</h2></div><div class="recortes">${otras.map(tarjetaFactura).join('')}</div></section>
${formularioNewsletter(sitio)}
${SCRIPT_COPIAR}`;
  return pagina(sitio, {
    titulo: `${f.titulo} (${ano})`,
    descripcion: `Un hogar paga de media ${eurosMes(f.gastoMedioMes)} en ${f.corto}. Te decimos cuánto puedes recortar, a qué compañía cambiarte y qué bono te dan por hacerlo.`.slice(0, 160),
    ruta: rutaFactura(f.slug),
    migas: [['/hogar/', 'Hogar'], [rutaFactura(f.slug), f.nombre]],
    contenido,
    jsonLd: [{ '@type': 'FAQPage', mainEntity: preguntas.map((q) => ({ '@type': 'Question', name: q.pregunta, acceptedAnswer: { '@type': 'Answer', text: q.respuesta } })) }],
  });
}

export function paginaBonos(sitio, datos) {
  const bonos = listaBonos(datos.facturas);
  // Solo cuenta el mejor bono de cada factura: no puedes tener dos compañías de luz a la vez.
  const total = datos.facturas.reduce((t, f) => t + (mejorBono(f)?.bono ?? 0), 0);
  const ano = datos.verificado.slice(0, 4);
  const preguntas = [
    { pregunta: '¿Qué es un plan amigo?', respuesta: 'Un programa con el que una compañía premia a sus clientes por traer a otros. Normalmente cobran los dos: quien invita y quien entra con su enlace o código.' },
    { pregunta: '¿Tengo que conocer a quien me invita?', respuesta: 'No. Los enlaces y códigos amigo valen para cualquiera que sea cliente nuevo.' },
    { pregunta: '¿Los bonos tributan?', respuesta: 'Sí. El dinero que te ingresan suele llevar una retención del 19% y va en la declaración de la renta. Los descuentos en factura funcionan como una rebaja del recibo.' },
  ];
  return pagina(sitio, {
    titulo: `Te pagan hasta ${euros(total)} por cambiarte de compañía (${ano})`,
    descripcion: `Bancos, luz y fibra que te dan dinero por hacerte cliente: ${bonos.slice(0, 3).map((b) => `${b.nombre} (${euros(b.bono)})`).join(', ')} y más, con sus condiciones.`.slice(0, 160),
    ruta: '/bonos/',
    migas: [['/bonos/', 'Bonos por cambiarte']],
    contenido: `<section class="hero hero-alt">
  <p class="antetitulo">${ICONO_TIJERA} Bonos revisados el ${fechaLarga(datos.verificado)}</p>
  <h1>Te pagan hasta <span class="resalta">${euros(total)}</span> por cambiarte.</h1>
  <p class="entradilla">Bancos, luz y fibra pagan por cada cliente nuevo. Estos son los bonos que te puedes llevar al cambiarte, de mayor a menor, con sus condiciones. La cifra de arriba suma el mejor bono de cada factura.</p>
  <p><a class="boton" href="/hogar/#calculadora">Calcular también lo que ahorro</a></p>
</section>
<p class="aviso-afiliado">Son enlaces de plan amigo o de afiliado: si entras con ellos, la compañía nos da a nosotros también un bono o comisión. Tú recibes lo mismo o más que entrando por tu cuenta. <a href="/aviso-afiliados/">Más información</a>.</p>
<section class="alternativas">${bonos.map(tarjetaBono).join('')}</section>
${huecoAnuncio(sitio, 'bonos')}
<section class="faq"><h2>Preguntas frecuentes</h2>${preguntas.map((q) => `<details><summary>${e(q.pregunta)}</summary><p>${e(q.respuesta)}</p></details>`).join('')}</section>
<p class="meta">${e(datos.nota)}</p>
${formularioNewsletter(sitio)}
${SCRIPT_COPIAR}`,
    jsonLd: [
      { '@type': 'ItemList', name: 'Bonos por cambiarte de compañía', itemListElement: bonos.map((b, i) => ({ '@type': 'ListItem', position: i + 1, name: `${b.nombre}: ${euros(b.bono)}` })) },
      { '@type': 'FAQPage', mainEntity: preguntas.map((q) => ({ '@type': 'Question', name: q.pregunta, acceptedAnswer: { '@type': 'Answer', text: q.respuesta } })) },
    ],
  });
}
