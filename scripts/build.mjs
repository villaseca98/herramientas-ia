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
  paginaCategoria, paginaArticulo, paginaHerramientas, paginaHerramienta, paginaEstatica,
  pagina404, paginaEnlaces, paginaTest, formularioNewsletter, rutaFicha,
} from './lib/plantillas.mjs';
import { cargarNegocios, cargarGuias, paginaInicioNegocios, paginaHubNegocios, paginaRevisar, paginaPlacas, paginaGuia } from './lib/negocios.mjs';
import { cargarSectores, paginaSector, paginaSectores, rutaSector } from './lib/sectores.mjs';
import { cargarFacturas, paginaHogar, paginaFactura, paginaBonos, redireccionesFacturas, rutaFactura } from './lib/facturas.mjs';
import { calendarioReels } from './lib/reels.mjs';
import { cargarStack, paginaRecorta, paginaAlternativa, paginaAlternativas, paginaGuias, paginaPrecios, paginaMigracion, rutaAlternativa } from './lib/recorta.mjs';

// Bloque de contacto para páginas de servicios: solo aparece si hay email o formulario en data/sitio.json.
function bloqueContacto(sitio) {
  const { email, urlFormulario } = sitio.contacto ?? {};
  if (urlFormulario) return `<p><a class="boton" href="${escaparHtml(urlFormulario)}" target="_blank" rel="noopener">Pedir presupuesto gratis</a></p>`;
  if (email) return `<p><a class="boton" href="mailto:${escaparHtml(email)}">Escríbenos: ${escaparHtml(email)}</a></p>`;
  return '<p class="nota">Pronto abriremos el formulario de contacto. Mientras, suscríbete a la newsletter y responde al primer correo.</p>';
}

export function construir({ incluirBorradores = false, salida = join(RAIZ, 'dist') } = {}) {
  const sitio = cargarSitio();
  const afiliados = cargarAfiliados();
  const articulos = cargarArticulos({ incluirBorradores });
  const stack = cargarStack(afiliados);
  const facturas = cargarFacturas();
  const negocios = cargarNegocios();
  const guias = cargarGuias();
  const sectores = cargarSectores();

  rmSync(salida, { recursive: true, force: true });
  mkdirSync(salida, { recursive: true });
  const escribir = (ruta, contenido) => {
    const destino = join(salida, ruta);
    mkdirSync(dirname(destino), { recursive: true });
    writeFileSync(destino, contenido);
  };

  if (existsSync(join(RAIZ, 'public'))) cpSync(join(RAIZ, 'public'), salida, { recursive: true });
  escribir('estilos.css', readFileSync(join(RAIZ, 'src', 'estilos', 'sitio.css')));

  cpSync(join(RAIZ, 'src', 'cliente'), join(salida, 'js'), { recursive: true });
  // Cola de reels que lee el flujo de n8n para publicar en Instagram
  mkdirSync(join(salida, 'reels'), { recursive: true });
  // En Vercel, la URL pública de producción; Instagram descarga los vídeos desde ahí.
  const base = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : sitio.url;
  writeFileSync(join(salida, 'reels', 'calendario.json'), JSON.stringify(calendarioReels(JSON.parse(readFileSync(join(RAIZ, 'data', 'reels.json'), 'utf8')), base), null, 2));
  // pdf.js para leer las facturas en el navegador, servido desde el propio sitio.
  for (const f of ['pdf.min', 'pdf.worker.min']) cpSync(join(RAIZ, 'node_modules', 'pdfjs-dist', 'build', `${f}.mjs`), join(salida, 'js', 'pdfjs', `${f}.js`));

  escribir('index.html', paginaInicioNegocios(sitio, negocios, guias));
  escribir('negocios/index.html', paginaHubNegocios(sitio, guias));
  escribir('revisar-factura/index.html', paginaRevisar(sitio, negocios));
  escribir('placas-solares/index.html', paginaPlacas(sitio, negocios, guias));
  for (const g of guias) escribir(`${g.ruta.slice(1)}index.html`, paginaGuia(sitio, g, guias));
  escribir('negocios/sectores/index.html', paginaSectores(sitio, sectores, guias.filter((g) => g.grupo === 'sector')));
  for (const s of sectores) escribir(`${rutaSector(s.slug).slice(1)}index.html`, paginaSector(sitio, s, sectores, negocios.ref));
  escribir('hogar/index.html', paginaHogar(sitio, facturas));
  escribir('bonos/index.html', paginaBonos(sitio, facturas));
  for (const f of facturas.facturas) escribir(`${rutaFactura(f.slug).slice(1)}index.html`, paginaFactura(sitio, f, facturas));
  escribir('software/index.html', paginaRecorta(sitio, stack));
  escribir('alternativas/index.html', paginaAlternativas(sitio, stack));
  for (const h of stack.herramientas) escribir(`${rutaAlternativa(h.slug).slice(1)}index.html`, paginaAlternativa(sitio, h, stack));
  escribir('guias/index.html', paginaGuias(sitio, articulos));
  escribir('precios/index.html', paginaPrecios(sitio));
  escribir('migracion-gratis/index.html', paginaMigracion(sitio, stack));
  if (sitio.anuncios?.adsenseCliente) escribir('ads.txt', `google.com, ${sitio.anuncios.adsenseCliente.replace(/^ca-/, '')}, DIRECT, f08c47fec0942fa0\n`);
  for (const slug of Object.keys(sitio.categorias)) {
    escribir(`categoria/${slug}/index.html`, paginaCategoria(sitio, slug, articulos.filter((a) => a.categoria === slug), afiliados));
  }
  for (const art of articulos) {
    escribir(`${art.slug}/index.html`, paginaArticulo(sitio, art, renderizarMarkdown(art.cuerpo, afiliados), afiliados, articulos));
  }
  escribir('herramientas/index.html', paginaHerramientas(sitio, afiliados));
  const fichas = [];
  for (const a of afiliados.values()) {
    if (!a.ficha) continue;
    fichas.push(rutaFicha(a.slug));
    escribir(`${rutaFicha(a.slug).slice(1)}index.html`, paginaHerramienta(sitio, a, afiliados, articulos));
  }
  escribir('que-herramienta-necesito/index.html', paginaTest(sitio, afiliados));
  escribir('enlaces/index.html', paginaEnlaces(sitio, articulos));
  escribir('404.html', pagina404(sitio));

  // Páginas estáticas: legales (content/legal) y de negocio (content/paginas: recursos, servicios, patrocina...).
  const estaticas = [];
  for (const dir of ['legal', 'paginas']) {
    const carpeta = join(RAIZ, 'content', dir);
    if (!existsSync(carpeta)) continue;
    for (const nombre of readdirSync(carpeta).filter((n) => n.endsWith('.md'))) {
      const { datos, cuerpo } = separarFrontmatter(readFileSync(join(carpeta, nombre), 'utf8'));
      const ruta = `/${nombre.replace(/\.md$/, '')}/`;
      if (dir === 'paginas') estaticas.push(ruta);
      const md = cuerpo.replaceAll('{{sitio}}', sitio.nombre).replaceAll('{{url}}', sitio.url);
      const html = renderizarMarkdown(md, afiliados)
        .replaceAll(/<p>\{\{newsletter\}\}<\/p>|\{\{newsletter\}\}/g, formularioNewsletter(sitio))
        .replaceAll(/<p>\{\{contacto\}\}<\/p>|\{\{contacto\}\}/g, bloqueContacto(sitio));
      escribir(`${ruta.slice(1)}index.html`, paginaEstatica(sitio, { ruta, titulo: datos.titulo, descripcion: datos.descripcion, html }));
    }
  }

  // Redirecciones de afiliado: /ir/<slug>/ -> URL de afiliado (o la oficial si aún no hay).
  // Cloudflare Pages usa _redirects; la página HTML es el respaldo para otros hostings.
  const redirecciones = [];
  const destinos = [
    ...[...afiliados.values()].map((a) => ({ slug: a.slug, nombre: a.nombre, destino: destinoAfiliado(a) })),
    ...redireccionesFacturas(facturas),
  ];
  const vistos = new Set();
  for (const { slug, nombre, destino } of destinos) {
    if (vistos.has(slug)) throw new Error(`Enlace /ir/${slug}/ repetido entre afiliados.json y facturas.json`);
    vistos.add(slug);
    redirecciones.push(`/ir/${slug} ${destino} 302`, `/ir/${slug}/ ${destino} 302`);
    escribir(`ir/${slug}/index.html`, `<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0;url=${escaparHtml(destino)}"><title>Redirigiendo a ${escaparHtml(nombre)}</title><a href="${escaparHtml(destino)}" rel="sponsored nofollow">Ir a ${escaparHtml(nombre)}</a>`);
  }
  escribir('_redirects', `${redirecciones.join('\n')}\n`);

  const urls = ['/', '/negocios/', '/revisar-factura/', '/placas-solares/', ...guias.map((g) => g.ruta), '/negocios/sectores/', ...sectores.map((x) => rutaSector(x.slug)), '/hogar/', '/bonos/', ...facturas.facturas.map((f) => rutaFactura(f.slug)), '/software/', '/alternativas/', ...stack.herramientas.map((h) => rutaAlternativa(h.slug)), '/guias/', '/precios/', '/migracion-gratis/', '/herramientas/', '/que-herramienta-necesito/', ...fichas, ...Object.keys(sitio.categorias).map((s) => `/categoria/${s}/`), ...estaticas];
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

  return { articulos: articulos.length, afiliados: afiliados.size, alternativas: stack.herramientas.length, salida };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = construir({ incluirBorradores: process.argv.includes('--borradores') });
  console.log(`Sitio generado en ${r.salida}: ${r.articulos} artículos, ${r.afiliados} enlaces de afiliado.`);
}
