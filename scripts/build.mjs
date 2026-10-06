// Genera el sitio estático en dist/.
//   node scripts/build.mjs              solo artículos publicados
//   node scripts/build.mjs --borradores incluye borradores (vista previa)
import { mkdirSync, writeFileSync, rmSync, cpSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import {
  RAIZ, cargarSitio, cargarAfiliados, cargarArticulos, renderizarMarkdown,
  destinoAfiliado, escaparHtml, separarFrontmatter,
} from './lib/contenido.mjs';
import {
  paginaInicio, paginaCategoria, paginaArticulo, paginaHerramientas, paginaLegal, pagina404,
} from './lib/plantillas.mjs';

export function construir({ incluirBorradores = false, salida = join(RAIZ, 'dist') } = {}) {
  const sitio = cargarSitio();
  const afiliados = cargarAfiliados();
  const articulos = cargarArticulos({ incluirBorradores });

  rmSync(salida, { recursive: true, force: true });
  mkdirSync(salida, { recursive: true });
  const escribir = (ruta, contenido) => {
    const destino = join(salida, ruta);
    mkdirSync(dirname(destino), { recursive: true });
    writeFileSync(destino, contenido);
  };

  if (existsSync(join(RAIZ, 'public'))) cpSync(join(RAIZ, 'public'), salida, { recursive: true });
  escribir('estilos.css', readFileSync(join(RAIZ, 'src', 'estilos', 'sitio.css')));

  escribir('index.html', paginaInicio(sitio, articulos));
  for (const slug of Object.keys(sitio.categorias)) {
    escribir(`categoria/${slug}/index.html`, paginaCategoria(sitio, slug, articulos.filter((a) => a.categoria === slug)));
  }
  for (const art of articulos) {
    escribir(`${art.slug}/index.html`, paginaArticulo(sitio, art, renderizarMarkdown(art.cuerpo, afiliados), afiliados));
  }
  escribir('herramientas/index.html', paginaHerramientas(sitio, afiliados));
  escribir('404.html', pagina404(sitio));

  const dirLegal = join(RAIZ, 'content', 'legal');
  const legales = [];
  for (const nombre of readdirSync(dirLegal).filter((n) => n.endsWith('.md'))) {
    const { datos, cuerpo } = separarFrontmatter(readFileSync(join(dirLegal, nombre), 'utf8'));
    const ruta = `/${nombre.replace(/\.md$/, '')}/`;
    legales.push(ruta);
    const html = renderizarMarkdown(cuerpo.replaceAll('{{sitio}}', sitio.nombre).replaceAll('{{url}}', sitio.url), afiliados);
    escribir(`${ruta.slice(1)}index.html`, paginaLegal(sitio, { ruta, titulo: datos.titulo, html }));
  }

  // Redirecciones de afiliado: /ir/<slug>/ -> URL de afiliado (o la oficial si aún no hay).
  // Cloudflare Pages usa _redirects; la página HTML es el respaldo para otros hostings.
  const redirecciones = [];
  for (const a of afiliados.values()) {
    const destino = destinoAfiliado(a);
    redirecciones.push(`/ir/${a.slug} ${destino} 302`, `/ir/${a.slug}/ ${destino} 302`);
    escribir(`ir/${a.slug}/index.html`, `<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0;url=${escaparHtml(destino)}"><title>Redirigiendo a ${escaparHtml(a.nombre)}</title><a href="${escaparHtml(destino)}" rel="sponsored nofollow">Ir a ${escaparHtml(a.nombre)}</a>`);
  }
  escribir('_redirects', `${redirecciones.join('\n')}\n`);

  const urls = ['/', '/herramientas/', ...Object.keys(sitio.categorias).map((s) => `/categoria/${s}/`), ...legales];
  const entradas = [
    ...urls.map((u) => ({ loc: new URL(u, sitio.url).href })),
    ...articulos.filter((a) => a.estado === 'publicado').map((a) => ({ loc: new URL(`/${a.slug}/`, sitio.url).href, lastmod: a.actualizado ?? a.fecha })),
  ];
  escribir('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entradas.map((x) => `  <url><loc>${escaparHtml(x.loc)}</loc>${x.lastmod ? `<lastmod>${x.lastmod}</lastmod>` : ''}</url>`).join('\n')}
</urlset>
`);
  escribir('robots.txt', `User-agent: *\nDisallow: /ir/\nSitemap: ${new URL('/sitemap.xml', sitio.url).href}\n`);

  const items = articulos.filter((a) => a.estado === 'publicado').slice(0, 30).map((a) => {
    const enlace = new URL(`/${a.slug}/`, sitio.url).href;
    return `<item><title>${escaparHtml(a.titulo)}</title><link>${escaparHtml(enlace)}</link><guid>${escaparHtml(enlace)}</guid><pubDate>${new Date(`${a.fecha}T08:00:00Z`).toUTCString()}</pubDate><description>${escaparHtml(a.descripcion)}</description></item>`;
  });
  escribir('rss.xml', `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>${escaparHtml(sitio.nombre)}</title><link>${escaparHtml(sitio.url)}</link><description>${escaparHtml(sitio.lema)}</description><language>${sitio.idioma}</language>
${items.join('\n')}
</channel></rss>
`);

  return { articulos: articulos.length, afiliados: afiliados.size, salida };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = construir({ incluirBorradores: process.argv.includes('--borradores') });
  console.log(`Sitio generado en ${r.salida}: ${r.articulos} artículos, ${r.afiliados} enlaces de afiliado.`);
}
