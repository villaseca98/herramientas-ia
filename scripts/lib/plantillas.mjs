// Plantillas HTML del sitio. Todo es HTML estático: rápido, gratis de alojar y bueno para SEO.
import { escaparHtml as e, enlaceIr } from './contenido.mjs';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export function fechaLarga(iso) {
  const [a, m, d] = iso.split('-').map(Number);
  return `${d} de ${MESES[m - 1]} de ${a}`;
}

const NOMBRE_TIPO = {
  comparativa: 'Comparativa',
  resena: 'Reseña',
  tutorial: 'Tutorial',
  lista: 'Lista',
  noticia: 'Noticia',
};

const AFILIADO = 'rel="sponsored nofollow noopener" target="_blank"';

export function rutaFicha(slug) {
  return `/herramientas/${slug}/`;
}

function botonAfiliado(a, texto = `Probar ${a.nombre}`, clase = 'boton') {
  return `<a class="${clase}" href="${enlaceIr(a.slug)}" ${AFILIADO}>${e(texto)} &rarr;</a>`;
}

export function formularioNewsletter(sitio) {
  const n = sitio.newsletter;
  let accion;
  if (n.urlEmbed) {
    accion = `<iframe class="embed-newsletter" src="${e(n.urlEmbed)}" title="Suscripción a ${e(n.nombre)}" loading="lazy" frameborder="0" scrolling="no"></iframe>`;
  } else if (n.urlSuscripcion) {
    accion = `<p><a class="boton" href="${e(n.urlSuscripcion)}" target="_blank" rel="noopener">Suscribirme gratis</a></p>`;
  } else {
    accion = '<p><a class="boton" href="/recursos/">Descargar los recursos gratis</a></p>';
  }
  return `<section class="newsletter"><h2>${e(n.nombre)}</h2><p>${e(n.descripcion)}</p>${accion}</section>`;
}

function migasDePan(sitio, migas) {
  if (!migas?.length) return { html: '', jsonLd: null };
  const todas = [['/', 'Inicio'], ...migas];
  const html = `<nav class="migas" aria-label="Ruta">${todas
    .map(([ruta, nombre], i) => (i === todas.length - 1 ? `<span>${e(nombre)}</span>` : `<a href="${ruta}">${e(nombre)}</a>`))
    .join(' / ')}</nav>`;
  const jsonLd = {
    '@type': 'BreadcrumbList',
    itemListElement: todas.map(([ruta, nombre], i) => ({ '@type': 'ListItem', position: i + 1, name: nombre, item: new URL(ruta, sitio.url).href })),
  };
  return { html, jsonLd };
}

export function pagina(sitio, { titulo, descripcion, ruta, contenido, tipoOg = 'website', jsonLd = [], noIndex = false, migas = null }) {
  const tituloCompleto = ruta === '/' ? `${sitio.nombre}: ${sitio.lema}` : `${titulo} | ${sitio.nombre}`;
  const canonica = new URL(ruta, sitio.url).href;
  const migasPan = migasDePan(sitio, migas);
  const grafo = [...(Array.isArray(jsonLd) ? jsonLd : [jsonLd]), migasPan.jsonLd].filter(Boolean);
  const menu = (sitio.menu ?? []).map(([r, n]) => `<a href="${r}">${e(n)}</a>`).join('');
  const cats = Object.entries(sitio.categorias).map(([slug, nombre]) => `<a href="/categoria/${slug}/">${e(nombre)}</a>`).join(' · ');
  return `<!doctype html>
<html lang="${e(sitio.idioma)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(tituloCompleto)}</title>
<meta name="description" content="${e(descripcion)}">
<link rel="canonical" href="${e(canonica)}">
${noIndex ? '<meta name="robots" content="noindex">' : ''}
<meta property="og:type" content="${tipoOg}">
<meta property="og:title" content="${e(titulo)}">
<meta property="og:description" content="${e(descripcion)}">
<meta property="og:url" content="${e(canonica)}">
<meta property="og:site_name" content="${e(sitio.nombre)}">
<meta property="og:locale" content="es_ES">
<meta name="twitter:card" content="summary">
<link rel="alternate" type="application/rss+xml" title="${e(sitio.nombre)}" href="/rss.xml">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/estilos.css">
${grafo.length ? `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': grafo }).replaceAll('<', '\\u003c')}</script>` : ''}
</head>
<body>
<header class="cabecera">
  <div class="contenedor">
    <a class="marca" href="/">${e(sitio.nombre)}</a>
    <nav class="menu">${menu}</nav>
  </div>
</header>
<main class="contenedor">
${migasPan.html}
${contenido}
</main>
<footer class="pie">
  <div class="contenedor">
    <p class="pie-cats">${cats}</p>
    <p>${e(sitio.nombre)} participa en programas de afiliación: si compras desde nuestros enlaces podemos recibir una comisión, sin coste extra para ti. Solo recomendamos herramientas que hemos analizado.</p>
    <p><a href="/servicios/">Servicios</a> · <a href="/patrocina/">Patrocina</a> · <a href="/aviso-afiliados/">Aviso de afiliados</a> · <a href="/privacidad/">Privacidad</a> · <a href="/cookies/">Cookies</a> · <a href="/rss.xml">RSS</a></p>
  </div>
</footer>
</body>
</html>
`;
}

function tarjetaArticulo(sitio, a) {
  return `<article class="tarjeta">
  <p class="meta">${e(NOMBRE_TIPO[a.tipo] ?? 'Artículo')} · ${e(sitio.categorias[a.categoria])}${a.estado === 'borrador' ? ' · <span class="borrador">Borrador</span>' : ''}</p>
  <h2><a href="/${a.slug}/">${e(a.titulo)}</a></h2>
  <p>${e(a.descripcion)}</p>
</article>`;
}

function rejilla(sitio, articulos, vacio) {
  return articulos.length
    ? `<section class="rejilla">${articulos.map((a) => tarjetaArticulo(sitio, a)).join('\n')}</section>`
    : `<p class="vacio">${e(vacio)}</p>`;
}

export function paginaInicio(sitio, articulos, afiliados) {
  const destacadas = [...afiliados.values()].filter((a) => a.ficha?.planGratis?.startsWith('Sí')).slice(0, 6);
  const gratis = destacadas
    .map((a) => `<a class="chip" href="${rutaFicha(a.slug)}"><strong>${e(a.nombre)}</strong><span>${e(a.ficha.precioDesde)}</span></a>`)
    .join('');
  return pagina(sitio, {
    titulo: sitio.nombre,
    descripcion: sitio.lema,
    ruta: '/',
    contenido: `<section class="portada"><h1>${e(sitio.lema)}</h1>
<p class="entradilla">Comparativas honestas, precios reales verificados y guías paso a paso para emprendedores, freelancers y creadores.</p>
<p><a class="boton" href="/que-herramienta-necesito/">Encuentra tu herramienta en 30 segundos</a> <a class="boton boton-sec" href="/herramientas/">Ver comparador</a></p></section>
<h2 class="seccion">Herramientas con plan gratis</h2>
<div class="chips">${gratis}</div>
<h2 class="seccion">Últimas guías</h2>
${rejilla(sitio, articulos, 'Todavía no hay artículos publicados.')}
${formularioNewsletter(sitio)}`,
    jsonLd: { '@type': 'WebSite', name: sitio.nombre, url: sitio.url, inLanguage: sitio.idioma },
  });
}

export function paginaCategoria(sitio, slug, articulos, afiliados) {
  const nombre = sitio.categorias[slug];
  const herramientas = [...afiliados.values()].filter((a) => a.categoria === slug);
  return pagina(sitio, {
    titulo: `Las mejores herramientas de ${nombre.toLowerCase()}`,
    descripcion: `Guías, comparativas, precios y reseñas de herramientas de ${nombre.toLowerCase()}.`,
    ruta: `/categoria/${slug}/`,
    migas: [[`/categoria/${slug}/`, nombre]],
    contenido: `<h1>${e(nombre)}</h1>
${herramientas.length ? tablaComparador(herramientas) : ''}
<h2 class="seccion">Guías y comparativas</h2>
${rejilla(sitio, articulos, 'Todavía no hay artículos en esta categoría.')}`,
  });
}

// Preguntas frecuentes del artículo: líneas "**¿Pregunta?** Respuesta" bajo "## Preguntas frecuentes".
export function extraerPreguntas(cuerpo) {
  const i = cuerpo.search(/^##\s+Preguntas frecuentes\s*$/m);
  if (i < 0) return [];
  const resto = cuerpo.slice(i).split('\n').slice(1);
  const fin = resto.findIndex((l) => /^##\s/.test(l));
  const bloque = (fin < 0 ? resto : resto.slice(0, fin)).join('\n');
  return [...bloque.matchAll(/\*\*(¿[^*]+\?)\*\*\s*([^\n]+(?:\n(?!\s*\n|\*\*)[^\n]+)*)/g)].map((m) => ({
    pregunta: m[1].trim(),
    respuesta: m[2].replace(/\{\{[^}]*\}\}/g, '').replace(/\*\*|__|\[([^\]]+)\]\([^)]+\)/g, '$1').trim(),
  }));
}

export function relacionados(art, todos, n = 3) {
  return todos
    .filter((o) => o.slug !== art.slug && o.estado === 'publicado')
    .map((o) => ({ o, p: (o.categoria === art.categoria ? 2 : 0) + o.herramientas.filter((h) => art.herramientas.includes(h)).length * 3 }))
    .filter((x) => x.p > 0)
    .sort((a, b) => b.p - a.p)
    .slice(0, n)
    .map((x) => x.o);
}

export function paginaArticulo(sitio, art, html, afiliados, todos = []) {
  const herramientas = art.herramientas.map((s) => afiliados.get(s));
  const lateral = herramientas.length
    ? `<aside class="lateral"><h2>Herramientas de este artículo</h2><div class="mini-fichas">${herramientas
        .map((a) => `<div class="mini-ficha"><strong>${e(a.nombre)}</strong><span>${e(a.ficha?.precioDesde ?? '')}</span><p>${botonAfiliado(a, 'Probar', 'boton boton-sec')} <a href="${rutaFicha(a.slug)}">Ficha y precios</a></p></div>`)
        .join('')}</div></aside>`
    : '';
  const otros = relacionados(art, todos);
  const masLecturas = otros.length ? `<section class="relacionados"><h2>También te puede interesar</h2>${rejilla(sitio, otros, '')}</section>` : '';
  const fechas = art.actualizado && art.actualizado !== art.fecha
    ? `Publicado el ${fechaLarga(art.fecha)} · Actualizado el ${fechaLarga(art.actualizado)}`
    : `Publicado el ${fechaLarga(art.fecha)}`;
  const preguntas = extraerPreguntas(art.cuerpo);
  const contenido = `<article class="articulo">
  <p class="meta">${e(NOMBRE_TIPO[art.tipo] ?? 'Artículo')} · <a href="/categoria/${art.categoria}/">${e(sitio.categorias[art.categoria])}</a></p>
  <h1>${e(art.titulo)}</h1>
  <p class="meta">${fechas}</p>
  ${art.estado === 'borrador' ? '<p class="aviso-borrador">Borrador: no se publica hasta cambiar "estado" a "publicado".</p>' : ''}
  <p class="aviso-afiliado">Este artículo contiene enlaces de afiliado. Si compras a través de ellos podemos recibir una comisión, sin coste extra para ti. <a href="/aviso-afiliados/">Más información</a>.</p>
  <div class="cuerpo">${html}</div>
  ${lateral}
</article>
${masLecturas}
${formularioNewsletter(sitio)}`;
  const jsonLd = [{
    '@type': 'Article',
    headline: art.titulo,
    description: art.descripcion,
    datePublished: art.fecha,
    dateModified: art.actualizado ?? art.fecha,
    inLanguage: sitio.idioma,
    author: { '@type': 'Organization', name: sitio.autor },
    publisher: { '@type': 'Organization', name: sitio.nombre },
    mainEntityOfPage: new URL(`/${art.slug}/`, sitio.url).href,
  }];
  if (preguntas.length) {
    jsonLd.push({
      '@type': 'FAQPage',
      mainEntity: preguntas.map((q) => ({ '@type': 'Question', name: q.pregunta, acceptedAnswer: { '@type': 'Answer', text: q.respuesta } })),
    });
  }
  return pagina(sitio, {
    titulo: art.titulo,
    descripcion: art.descripcion,
    ruta: `/${art.slug}/`,
    tipoOg: 'article',
    noIndex: art.estado === 'borrador',
    migas: [[`/categoria/${art.categoria}/`, sitio.categorias[art.categoria]], [`/${art.slug}/`, art.titulo]],
    contenido,
    jsonLd,
  });
}

function tablaComparador(lista) {
  const filas = lista
    .map((a) => `<tr><td><a href="${rutaFicha(a.slug)}"><strong>${e(a.nombre)}</strong></a><br><span class="meta">${e(a.resumen)}</span></td><td>${e(a.ficha?.precioDesde ?? '')}</td><td>${e(a.ficha?.planGratis ?? '')}</td><td>${botonAfiliado(a, 'Probar', 'boton boton-sec')}</td></tr>`)
    .join('');
  return `<div class="tabla-scroll"><table class="comparativa"><thead><tr><th>Herramienta</th><th>Precio</th><th>Plan gratis</th><th></th></tr></thead><tbody>${filas}</tbody></table></div>`;
}

export function paginaHerramientas(sitio, afiliados) {
  const porCategoria = Object.entries(sitio.categorias)
    .map(([slug, nombre]) => {
      const lista = [...afiliados.values()].filter((a) => a.categoria === slug);
      return lista.length ? `<h2 id="${slug}">${e(nombre)}</h2>${tablaComparador(lista)}` : '';
    })
    .join('\n');
  return pagina(sitio, {
    titulo: 'Comparador de herramientas de IA: precios y planes gratis',
    descripcion: 'Compara precios, planes gratis y para quién es cada herramienta de IA y software, con datos verificados en sus webs oficiales.',
    ruta: '/herramientas/',
    migas: [['/herramientas/', 'Herramientas']],
    contenido: `<h1>Comparador de herramientas</h1>
<p class="entradilla">Precios y planes gratis comprobados en la web oficial de cada herramienta. Pulsa en un nombre para ver su ficha completa.</p>
<p><a class="boton" href="/que-herramienta-necesito/">¿No sabes cuál elegir? Haz el test</a></p>
${porCategoria}`,
  });
}

export function paginaHerramienta(sitio, a, afiliados, articulos) {
  const f = a.ficha;
  const alternativas = [...afiliados.values()].filter((b) => b.categoria === a.categoria && b.slug !== a.slug);
  const guias = articulos.filter((x) => x.estado === 'publicado' && x.herramientas.includes(a.slug));
  const titulo = `${a.nombre}: precio, plan gratis y opinión (${f.verificado.slice(0, 4)})`;
  const contenido = `<article class="articulo ficha">
  <p class="meta"><a href="/categoria/${a.categoria}/">${e(sitio.categorias[a.categoria])}</a></p>
  <h1>${e(a.nombre)}: precio, plan gratis y opinión</h1>
  <p class="entradilla">${e(a.resumen)}</p>
  <p class="aviso-afiliado">Esta página contiene enlaces de afiliado. <a href="/aviso-afiliados/">Más información</a>.</p>
  <div class="tabla-scroll"><table class="comparativa ficha-datos"><tbody>
    <tr><th>Precio</th><td>${e(f.precioDesde)}</td></tr>
    <tr><th>Plan gratis</th><td>${e(f.planGratis)}</td></tr>
    <tr><th>Planes</th><td>${e(f.precios)}</td></tr>
    <tr><th>Ideal para</th><td>${e(f.paraQuien)}</td></tr>
  </tbody></table></div>
  <p class="meta">Precios comprobados el ${fechaLarga(f.verificado)} en <a href="${e(f.urlPrecios)}" rel="nofollow noopener" target="_blank">la web oficial</a>. Pueden cambiar.</p>
  <p class="cta">${botonAfiliado(a)}</p>
  <div class="pros-contras">
    <div><h2>Ventajas</h2><ul>${f.pros.map((p) => `<li>${e(p)}</li>`).join('')}</ul></div>
    <div><h2>Inconvenientes</h2><ul>${f.contras.map((p) => `<li>${e(p)}</li>`).join('')}</ul></div>
  </div>
  <h2>¿Merece la pena ${e(a.nombre)}?</h2>
  <p>${e(f.paraQuien)} ${f.planGratis.startsWith('Sí') ? 'Como tiene plan gratis, lo más sensato es empezar sin pagar y subir de plan solo cuando se te quede pequeño.' : 'No tiene plan gratis permanente, así que aprovecha la prueba o la garantía para comprobar que encaja antes de comprometerte.'}</p>
  ${alternativas.length ? `<h2>Alternativas a ${e(a.nombre)}</h2>${tablaComparador(alternativas)}` : ''}
  ${guias.length ? `<h2>Guías sobre ${e(a.nombre)}</h2>${rejilla(sitio, guias, '')}` : ''}
  <p class="cta">${botonAfiliado(a, `Empezar con ${a.nombre}`)}</p>
</article>
${formularioNewsletter(sitio)}`;
  return pagina(sitio, {
    titulo,
    descripcion: `${a.nombre}: ${f.precioDesde}. ${f.planGratis.split(';')[0]}. Ventajas, inconvenientes y alternativas.`.slice(0, 160),
    ruta: rutaFicha(a.slug),
    migas: [['/herramientas/', 'Herramientas'], [rutaFicha(a.slug), a.nombre]],
    contenido,
    jsonLd: { '@type': 'SoftwareApplication', name: a.nombre, applicationCategory: 'BusinessApplication', operatingSystem: 'Web', url: a.urlOficial, description: a.resumen },
  });
}

export function paginaEstatica(sitio, { ruta, titulo, descripcion, html, migas = null }) {
  return pagina(sitio, {
    titulo,
    descripcion: descripcion ?? `${titulo} de ${sitio.nombre}.`,
    ruta,
    migas: migas ?? [[ruta, titulo]],
    contenido: `<article class="articulo"><h1>${e(titulo)}</h1><div class="cuerpo">${html}</div></article>`,
  });
}

export function pagina404(sitio) {
  return pagina(sitio, {
    titulo: 'Página no encontrada',
    descripcion: 'Esta página no existe.',
    ruta: '/404.html',
    noIndex: true,
    contenido: '<h1>Página no encontrada</h1><p><a href="/">Volver al inicio</a> o prueba el <a href="/que-herramienta-necesito/">buscador de herramientas</a>.</p>',
  });
}

// Página "enlace en la bio" para TikTok, Instagram y YouTube: sustituye a Linktree, gratis.
export function paginaEnlaces(sitio, articulos) {
  const ultimos = articulos.filter((a) => a.estado === 'publicado').slice(0, 8);
  const lista = ultimos.length
    ? ultimos.map((a) => `<li><a class="enlace-bio" href="/${a.slug}/">${e(a.titulo)}</a></li>`).join('')
    : '<li class="vacio">Pronto habrá guías nuevas aquí.</li>';
  const suscripcion = sitio.newsletter.urlSuscripcion
    ? `<li><a class="enlace-bio destacado" href="${e(sitio.newsletter.urlSuscripcion)}" target="_blank" rel="noopener">${e(sitio.newsletter.nombre)}: suscríbete gratis</a></li>`
    : '';
  return pagina(sitio, {
    titulo: 'Enlaces',
    descripcion: `Las guías más recientes de ${sitio.nombre}.`,
    ruta: '/enlaces/',
    contenido: `<section class="bio"><h1>${e(sitio.nombre)}</h1><p>${e(sitio.lema)}</p><ul class="lista-bio">${suscripcion}<li><a class="enlace-bio destacado" href="/que-herramienta-necesito/">¿Qué herramienta de IA necesito? Haz el test</a></li><li><a class="enlace-bio" href="/recursos/">Recursos gratis</a></li>${lista}<li><a class="enlace-bio" href="/herramientas/">Comparador de herramientas</a></li></ul></section>`,
  });
}

// Test "¿Qué herramienta necesito?": recomienda herramientas según objetivo, presupuesto y nivel.
export const OBJETIVOS = [
  { id: 'vender', texto: 'Vender un curso, producto digital o servicio', herramientas: ['systeme', 'kit', 'getresponse'] },
  { id: 'newsletter', texto: 'Crear y monetizar una newsletter', herramientas: ['beehiiv', 'kit', 'systeme'] },
  { id: 'automatizar', texto: 'Automatizar tareas y ahorrar horas', herramientas: ['make', 'n8n'] },
  { id: 'video', texto: 'Hacer vídeos o voces con IA', herramientas: ['heygen', 'elevenlabs'] },
  { id: 'seo', texto: 'Posicionar mi web o blog en Google', herramientas: ['surfer', 'semrush'] },
  { id: 'web', texto: 'Tener mi propia web', herramientas: ['hostinger', 'systeme'] },
];

export function recomendar(objetivo, presupuesto, tecnico, afiliados) {
  const obj = OBJETIVOS.find((o) => o.id === objetivo);
  if (!obj) return [];
  let lista = obj.herramientas.map((s) => afiliados.get(s)).filter(Boolean);
  if (presupuesto === 'cero') {
    const gratis = lista.filter((a) => a.ficha.planGratis.startsWith('Sí') || a.ficha.precioDesde.startsWith('Gratis'));
    if (gratis.length) lista = [...gratis, ...lista.filter((a) => !gratis.includes(a))];
  }
  if (objetivo === 'automatizar') {
    lista = tecnico === 'si' ? lista.sort((a) => (a.slug === 'n8n' ? -1 : 1)) : lista.sort((a) => (a.slug === 'make' ? -1 : 1));
  }
  return lista.slice(0, 2).map((a) => a.slug);
}

export function paginaTest(sitio, afiliados) {
  const datos = Object.fromEntries([...afiliados.values()].map((a) => [a.slug, {
    nombre: a.nombre, resumen: a.resumen, precio: a.ficha.precioDesde, gratis: a.ficha.planGratis, ficha: rutaFicha(a.slug), ir: enlaceIr(a.slug),
    gratisOk: a.ficha.planGratis.startsWith('Sí') || a.ficha.precioDesde.startsWith('Gratis'),
  }]));
  const opciones = OBJETIVOS.map((o, i) => `<label class="opcion"><input type="radio" name="objetivo" value="${o.id}"${i === 0 ? ' checked' : ''}> ${e(o.texto)}</label>`).join('');
  const script = `
const H=${JSON.stringify(datos).replaceAll('<', '\\u003c')};
const O=${JSON.stringify(Object.fromEntries(OBJETIVOS.map((o) => [o.id, o.herramientas])))};
const f=document.getElementById('test'),r=document.getElementById('resultado');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
f.addEventListener('submit',ev=>{ev.preventDefault();
const d=new FormData(f),obj=d.get('objetivo'),pre=d.get('presupuesto'),tec=d.get('tecnico');
let l=O[obj].slice();
if(pre==='cero'){l.sort((a,b)=>H[b].gratisOk-H[a].gratisOk);}
if(obj==='automatizar'){l.sort((a,b)=>(tec==='si'?(a==='n8n'?-1:1):(a==='make'?-1:1)));}
l=l.slice(0,2);
r.innerHTML='<h2>Te recomendamos</h2>'+l.map((s,i)=>{const h=H[s];return '<div class="tarjeta-herramienta'+(i===0?' principal':'')+'"><p class="meta">'+(i===0?'Mejor opción para ti':'Alternativa')+'</p><strong>'+esc(h.nombre)+'</strong><p>'+esc(h.resumen)+'</p><p class="meta">Precio: '+esc(h.precio)+'</p><p><a class="boton" href="'+h.ir+'" rel="sponsored nofollow noopener" target="_blank">Probar '+esc(h.nombre)+' &rarr;</a> <a href="'+h.ficha+'">Ver ficha</a></p></div>';}).join('');
r.scrollIntoView({behavior:'smooth'});});`;
  return pagina(sitio, {
    titulo: '¿Qué herramienta de IA necesito? Test gratuito',
    descripcion: 'Responde 3 preguntas y descubre qué herramienta de IA o software encaja con tu objetivo, tu presupuesto y tu nivel.',
    ruta: '/que-herramienta-necesito/',
    migas: [['/que-herramienta-necesito/', 'Test de herramientas']],
    contenido: `<section class="articulo"><h1>¿Qué herramienta de IA necesito?</h1>
<p class="entradilla">Responde 3 preguntas y te decimos qué herramienta encaja contigo, con su precio real.</p>
<form id="test" class="test">
<fieldset><legend>1. ¿Qué quieres conseguir?</legend>${opciones}</fieldset>
<fieldset><legend>2. ¿Cuánto quieres gastar al principio?</legend>
<label class="opcion"><input type="radio" name="presupuesto" value="cero" checked> Nada, quiero empezar gratis</label>
<label class="opcion"><input type="radio" name="presupuesto" value="bajo"> Puedo pagar algo si merece la pena</label></fieldset>
<fieldset><legend>3. ¿Te manejas con herramientas técnicas?</legend>
<label class="opcion"><input type="radio" name="tecnico" value="no" checked> Prefiero lo más fácil</label>
<label class="opcion"><input type="radio" name="tecnico" value="si"> Sí, no me asusta configurar cosas</label></fieldset>
<button class="boton" type="submit">Ver mi recomendación</button>
</form>
<div id="resultado" aria-live="polite"></div>
<p class="aviso-afiliado">Algunas recomendaciones usan enlaces de afiliado. <a href="/aviso-afiliados/">Más información</a>.</p>
</section>
<script>${script}</script>`,
  });
}
