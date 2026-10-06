// Carga de datos y artículos, frontmatter y Markdown con atajos de afiliado.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { Marked } from 'marked';

export const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const DIR_ARTICULOS = join(RAIZ, 'content', 'articulos');

export const ESTADOS = ['borrador', 'publicado'];
export const TIPOS = ['comparativa', 'resena', 'tutorial', 'lista', 'noticia'];

export function leerJson(ruta) {
  return JSON.parse(readFileSync(join(RAIZ, ruta), 'utf8'));
}

// La URL pública sale de SITIO_URL, o del dominio de producción que Vercel expone al compilar,
// o en último caso de data/sitio.json.
export function urlPublica(entorno = process.env, porDefecto = '') {
  if (entorno.SITIO_URL) return entorno.SITIO_URL.replace(/\/+$/, '');
  if (entorno.VERCEL_PROJECT_PRODUCTION_URL) return `https://${entorno.VERCEL_PROJECT_PRODUCTION_URL}`;
  return porDefecto;
}

export function cargarSitio() {
  const sitio = leerJson('data/sitio.json');
  return { ...sitio, url: urlPublica(process.env, sitio.url) };
}

export function cargarAfiliados() {
  const lista = leerJson('data/afiliados.json');
  const porSlug = new Map();
  for (const a of lista) {
    if (porSlug.has(a.slug)) throw new Error(`Afiliado duplicado: ${a.slug}`);
    porSlug.set(a.slug, a);
  }
  return porSlug;
}

export function escaparHtml(texto) {
  return String(texto ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function slugificar(texto) {
  return String(texto)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}

export function separarFrontmatter(fuente) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(fuente);
  if (!m) return { datos: {}, cuerpo: fuente };
  return { datos: parseYaml(m[1]) ?? {}, cuerpo: m[2] };
}

function aFecha(valor) {
  if (!valor) return null;
  const d = valor instanceof Date ? valor : new Date(String(valor));
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

// Valida un artículo y devuelve la lista de errores (vacía si es correcto).
export function validarArticulo(art, afiliados, categorias) {
  const errores = [];
  if (!art.titulo) errores.push('falta "titulo"');
  if (!art.descripcion) errores.push('falta "descripcion"');
  if (!art.fecha) errores.push('falta "fecha" válida (AAAA-MM-DD)');
  if (!ESTADOS.includes(art.estado)) errores.push(`"estado" debe ser ${ESTADOS.join(' o ')}`);
  if (art.tipo && !TIPOS.includes(art.tipo)) errores.push(`"tipo" debe ser uno de: ${TIPOS.join(', ')}`);
  if (!categorias[art.categoria]) errores.push(`categoría desconocida "${art.categoria}"`);
  for (const h of art.herramientas) {
    if (!afiliados.has(h)) errores.push(`herramienta desconocida "${h}" (añádela a data/afiliados.json)`);
  }
  if (art.estado === 'publicado' && /\[(VERIFICAR|TU PRUEBA)[^\]]*\]/.test(art.cuerpo)) {
    errores.push('quedan marcadores [VERIFICAR] o [TU PRUEBA] sin resolver; complétalos antes de publicar');
  }
  for (const m of art.cuerpo.matchAll(/\{\{\s*(\w+)\s*:\s*([^}]*)\}\}/g)) {
    for (const s of m[2].split(',').map((x) => x.trim()).filter(Boolean)) {
      if (!afiliados.has(s)) errores.push(`atajo {{${m[1]}:${m[2]}}} usa la herramienta desconocida "${s}"`);
    }
  }
  return errores;
}

export function leerArticulo(ruta, nombreArchivo) {
  const { datos, cuerpo } = separarFrontmatter(readFileSync(ruta, 'utf8'));
  return {
    archivo: nombreArchivo,
    slug: datos.slug ? slugificar(datos.slug) : nombreArchivo.replace(/\.md$/, ''),
    titulo: datos.titulo ?? '',
    descripcion: datos.descripcion ?? '',
    fecha: aFecha(datos.fecha),
    actualizado: aFecha(datos.actualizado),
    categoria: datos.categoria ?? '',
    tipo: datos.tipo ?? 'resena',
    herramientas: Array.isArray(datos.herramientas) ? datos.herramientas.map(String) : [],
    estado: datos.estado ?? 'borrador',
    cuerpo,
  };
}

export function cargarArticulos({ incluirBorradores = false } = {}) {
  if (!existsSync(DIR_ARTICULOS)) return [];
  const sitio = cargarSitio();
  const afiliados = cargarAfiliados();
  const articulos = [];
  const fallos = [];
  for (const nombre of readdirSync(DIR_ARTICULOS).filter((n) => n.endsWith('.md')).sort()) {
    const art = leerArticulo(join(DIR_ARTICULOS, nombre), nombre);
    const errores = validarArticulo(art, afiliados, sitio.categorias);
    if (errores.length) fallos.push(`${nombre}: ${errores.join('; ')}`);
    articulos.push(art);
  }
  if (fallos.length) throw new Error(`Artículos con errores:\n- ${fallos.join('\n- ')}`);
  const slugs = new Set();
  for (const a of articulos) {
    if (slugs.has(a.slug)) throw new Error(`Slug repetido: ${a.slug}`);
    slugs.add(a.slug);
  }
  return articulos
    .filter((a) => incluirBorradores || a.estado === 'publicado')
    .sort((a, b) => (b.actualizado ?? b.fecha).localeCompare(a.actualizado ?? a.fecha));
}

// Enlace interno de redirección; la URL real vive solo en data/afiliados.json.
export function enlaceIr(slug) {
  return `/ir/${slug}/`;
}

export function destinoAfiliado(afiliado) {
  return afiliado.urlAfiliado || afiliado.urlOficial;
}

const ATRIBUTOS_AFILIADO = 'rel="sponsored nofollow noopener" target="_blank"';

function boton(a) {
  return `<p class="cta"><a class="boton" href="${enlaceIr(a.slug)}" ${ATRIBUTOS_AFILIADO}>Probar ${escaparHtml(a.nombre)} &rarr;</a></p>`;
}

function tarjeta(a) {
  return `<div class="tarjeta-herramienta"><strong>${escaparHtml(a.nombre)}</strong><p>${escaparHtml(a.resumen)}</p><a class="boton" href="${enlaceIr(a.slug)}" ${ATRIBUTOS_AFILIADO}>Ver ${escaparHtml(a.nombre)} &rarr;</a></div>`;
}

function tabla(lista) {
  const filas = lista
    .map((a) => `<tr><td><strong>${escaparHtml(a.nombre)}</strong></td><td>${escaparHtml(a.resumen)}</td><td><a href="${enlaceIr(a.slug)}" ${ATRIBUTOS_AFILIADO}>Probar</a></td></tr>`)
    .join('');
  return `<div class="tabla-scroll"><table class="comparativa"><thead><tr><th>Herramienta</th><th>Para qué sirve</th><th></th></tr></thead><tbody>${filas}</tbody></table></div>`;
}

// Atajos disponibles en los artículos:
//   {{boton:make}}            botón de llamada a la acción
//   {{herramienta:make}}      tarjeta con resumen y botón
//   {{tabla:make,n8n}}        tabla comparativa
export function expandirAtajos(cuerpo, afiliados) {
  return cuerpo.replace(/\{\{\s*(\w+)\s*:\s*([^}]*)\}\}/g, (original, tipo, args) => {
    const lista = args.split(',').map((s) => s.trim()).filter(Boolean).map((s) => afiliados.get(s));
    if (lista.some((a) => !a)) return original;
    if (tipo === 'boton') return boton(lista[0]);
    if (tipo === 'herramienta') return lista.map(tarjeta).join('');
    if (tipo === 'tabla') return tabla(lista);
    return original;
  });
}

const marked = new Marked({ gfm: true });

export function renderizarMarkdown(cuerpo, afiliados) {
  return marked.parse(expandirAtajos(cuerpo, afiliados));
}
