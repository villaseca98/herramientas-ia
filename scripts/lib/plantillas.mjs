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

function formularioNewsletter(sitio) {
  const n = sitio.newsletter;
  if (!n.urlSuscripcion) {
    return `<section class="newsletter"><h2>${e(n.nombre)}</h2><p>${e(n.descripcion)}</p><p class="nota">Próximamente.</p></section>`;
  }
  return `<section class="newsletter"><h2>${e(n.nombre)}</h2><p>${e(n.descripcion)}</p><p><a class="boton" href="${e(n.urlSuscripcion)}" target="_blank" rel="noopener">Suscribirme gratis</a></p></section>`;
}

export function pagina(sitio, { titulo, descripcion, ruta, contenido, tipoOg = 'website', jsonLd = null, noIndex = false }) {
  const tituloCompleto = ruta === '/' ? `${sitio.nombre}: ${sitio.lema}` : `${titulo} | ${sitio.nombre}`;
  const canonica = new URL(ruta, sitio.url).href;
  const cats = Object.entries(sitio.categorias)
    .map(([slug, nombre]) => `<a href="/categoria/${slug}/">${e(nombre)}</a>`)
    .join('');
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
<meta property="og:locale" content="es_ES">
<link rel="alternate" type="application/rss+xml" title="${e(sitio.nombre)}" href="/rss.xml">
<link rel="stylesheet" href="/estilos.css">
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd).replaceAll('<', '\\u003c')}</script>` : ''}
</head>
<body>
<header class="cabecera">
  <div class="contenedor">
    <a class="marca" href="/">${e(sitio.nombre)}</a>
    <nav class="menu">${cats}<a href="/herramientas/">Todas las herramientas</a></nav>
  </div>
</header>
<main class="contenedor">
${contenido}
</main>
<footer class="pie">
  <div class="contenedor">
    <p>${e(sitio.nombre)} participa en programas de afiliación: si compras desde nuestros enlaces podemos recibir una comisión, sin coste extra para ti. Solo recomendamos lo que probamos.</p>
    <p><a href="/aviso-afiliados/">Aviso de afiliados</a> · <a href="/privacidad/">Privacidad</a> · <a href="/cookies/">Cookies</a> · <a href="/rss.xml">RSS</a></p>
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

export function paginaInicio(sitio, articulos) {
  const lista = articulos.length
    ? articulos.map((a) => tarjetaArticulo(sitio, a)).join('\n')
    : '<p class="vacio">Todavía no hay artículos publicados.</p>';
  return pagina(sitio, {
    titulo: sitio.nombre,
    descripcion: sitio.lema,
    ruta: '/',
    contenido: `<section class="portada"><h1>${e(sitio.lema)}</h1></section>
<section class="rejilla">${lista}</section>
${formularioNewsletter(sitio)}`,
    jsonLd: { '@context': 'https://schema.org', '@type': 'WebSite', name: sitio.nombre, url: sitio.url, inLanguage: sitio.idioma },
  });
}

export function paginaCategoria(sitio, slug, articulos) {
  const nombre = sitio.categorias[slug];
  const lista = articulos.length
    ? articulos.map((a) => tarjetaArticulo(sitio, a)).join('\n')
    : '<p class="vacio">Todavía no hay artículos en esta categoría.</p>';
  return pagina(sitio, {
    titulo: nombre,
    descripcion: `Guías, comparativas y reseñas de herramientas de ${nombre.toLowerCase()}.`,
    ruta: `/categoria/${slug}/`,
    contenido: `<h1>${e(nombre)}</h1><section class="rejilla">${lista}</section>`,
  });
}

export function paginaArticulo(sitio, art, html, afiliados) {
  const herramientas = art.herramientas.map((s) => afiliados.get(s));
  const lateral = herramientas.length
    ? `<aside class="lateral"><h2>Herramientas de este artículo</h2>${herramientas
        .map((a) => `<p><a class="boton boton-sec" href="${enlaceIr(a.slug)}" rel="sponsored nofollow noopener" target="_blank">${e(a.nombre)} &rarr;</a></p>`)
        .join('')}</aside>`
    : '';
  const fechas = art.actualizado && art.actualizado !== art.fecha
    ? `Publicado el ${fechaLarga(art.fecha)} · Actualizado el ${fechaLarga(art.actualizado)}`
    : `Publicado el ${fechaLarga(art.fecha)}`;
  const contenido = `<article class="articulo">
  <p class="meta">${e(NOMBRE_TIPO[art.tipo] ?? 'Artículo')} · <a href="/categoria/${art.categoria}/">${e(sitio.categorias[art.categoria])}</a></p>
  <h1>${e(art.titulo)}</h1>
  <p class="meta">${fechas}</p>
  ${art.estado === 'borrador' ? '<p class="aviso-borrador">Borrador: no se publica hasta cambiar "estado" a "publicado".</p>' : ''}
  <p class="aviso-afiliado">Este artículo contiene enlaces de afiliado. Si compras a través de ellos podemos recibir una comisión, sin coste extra para ti. <a href="/aviso-afiliados/">Más información</a>.</p>
  <div class="cuerpo">${html}</div>
  ${lateral}
</article>
${formularioNewsletter(sitio)}`;
  return pagina(sitio, {
    titulo: art.titulo,
    descripcion: art.descripcion,
    ruta: `/${art.slug}/`,
    tipoOg: 'article',
    noIndex: art.estado === 'borrador',
    contenido,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: art.titulo,
      description: art.descripcion,
      datePublished: art.fecha,
      dateModified: art.actualizado ?? art.fecha,
      inLanguage: sitio.idioma,
      author: { '@type': 'Organization', name: sitio.autor },
      mainEntityOfPage: new URL(`/${art.slug}/`, sitio.url).href,
    },
  });
}

export function paginaHerramientas(sitio, afiliados) {
  const porCategoria = Object.entries(sitio.categorias)
    .map(([slug, nombre]) => {
      const lista = [...afiliados.values()].filter((a) => a.categoria === slug);
      if (!lista.length) return '';
      const filas = lista
        .map((a) => `<tr><td><strong>${e(a.nombre)}</strong></td><td>${e(a.resumen)}</td><td><a class="boton boton-sec" href="${enlaceIr(a.slug)}" rel="sponsored nofollow noopener" target="_blank">Ver</a></td></tr>`)
        .join('');
      return `<h2>${e(nombre)}</h2><div class="tabla-scroll"><table class="comparativa"><thead><tr><th>Herramienta</th><th>Para qué sirve</th><th></th></tr></thead><tbody>${filas}</tbody></table></div>`;
    })
    .join('\n');
  return pagina(sitio, {
    titulo: 'Todas las herramientas de IA que recomendamos',
    descripcion: 'Directorio de herramientas de IA y software que hemos probado, por categoría.',
    ruta: '/herramientas/',
    contenido: `<h1>Herramientas que recomendamos</h1>${porCategoria}`,
  });
}

export function paginaLegal(sitio, { ruta, titulo, html }) {
  return pagina(sitio, { titulo, descripcion: `${titulo} de ${sitio.nombre}.`, ruta, contenido: `<article class="articulo"><h1>${e(titulo)}</h1><div class="cuerpo">${html}</div></article>` });
}

export function pagina404(sitio) {
  return pagina(sitio, {
    titulo: 'Página no encontrada',
    descripcion: 'Esta página no existe.',
    ruta: '/404.html',
    noIndex: true,
    contenido: '<h1>Página no encontrada</h1><p><a href="/">Volver al inicio</a></p>',
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
    contenido: `<section class="bio"><h1>${e(sitio.nombre)}</h1><p>${e(sitio.lema)}</p><ul class="lista-bio">${suscripcion}${lista}<li><a class="enlace-bio" href="/herramientas/">Todas las herramientas que recomendamos</a></li></ul></section>`,
  });
}
