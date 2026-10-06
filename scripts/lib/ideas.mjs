// Lógica pura de ideas: lectura de feeds, detección de herramientas y puntuación.
import { createHash } from 'node:crypto';
import { XMLParser } from 'fast-xml-parser';
import { slugificar } from './contenido.mjs';

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@', textNodeName: '#texto' });

function texto(v) {
  if (v == null) return '';
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  if (Array.isArray(v)) return texto(v[0]);
  return texto(v['#texto'] ?? v['@href'] ?? '');
}

function limpiarHtml(s) {
  return s.replace(/<[^>]*>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();
}

function enlaceAtom(link) {
  const lista = Array.isArray(link) ? link : [link];
  const alterno = lista.find((l) => l && typeof l === 'object' && (!l['@rel'] || l['@rel'] === 'alternate'));
  return texto(alterno ?? lista[0]);
}

// Convierte un feed RSS 2.0 o Atom en entradas { titulo, enlace, resumen, fecha }.
export function parsearFeed(xml) {
  const doc = parser.parse(xml);
  const items = doc?.rss?.channel?.item ?? doc?.feed?.entry ?? doc?.['rdf:RDF']?.item ?? [];
  return (Array.isArray(items) ? items : [items]).map((it) => {
    const fechaTxt = texto(it.pubDate ?? it.published ?? it.updated ?? it['dc:date']);
    const fecha = fechaTxt && !Number.isNaN(Date.parse(fechaTxt)) ? new Date(fechaTxt).toISOString() : null;
    return {
      titulo: limpiarHtml(texto(it.title)),
      enlace: it.link != null && typeof it.link === 'object' ? enlaceAtom(it.link) : texto(it.link ?? it.guid),
      resumen: limpiarHtml(texto(it.description ?? it.summary ?? it.content)).slice(0, 500),
      fecha,
    };
  }).filter((e) => e.titulo && e.enlace);
}

export function idDe(clave) {
  return createHash('sha1').update(clave).digest('hex').slice(0, 12);
}

// Devuelve los slugs de afiliados cuyas palabras clave aparecen en el texto.
// Solo se usan "palabrasClave": nombres genéricos como "Make" darían falsos positivos.
export function detectarHerramientas(textoLibre, afiliados) {
  const t = ` ${textoLibre.toLowerCase()} `;
  const encontrados = [];
  for (const a of afiliados.values()) {
    const claves = (a.palabrasClave ?? []).map((k) => k.toLowerCase());
    if (claves.some((k) => new RegExp(`(^|[^a-z0-9])${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`).test(t))) {
      encontrados.push(a.slug);
    }
  }
  return encontrados;
}

// Puntuación: más valor si hay herramientas con afiliado y si es reciente.
export function puntuar(idea, ahora = Date.now()) {
  let p = Math.min(idea.herramientas.length, 2) * 10;
  if (idea.tipo === 'comparativa') p += 8;
  if (idea.tipo === 'resena') p += 6;
  if (idea.fecha) {
    const dias = (ahora - Date.parse(idea.fecha)) / 864e5;
    p += Math.max(0, 7 - dias);
  }
  return Math.round(p * 10) / 10;
}

export function ideaDesdeEntrada(entrada, fuente, afiliados) {
  const herramientas = detectarHerramientas(`${entrada.titulo} ${entrada.resumen}`, afiliados);
  const idea = {
    id: idDe(entrada.enlace),
    tipo: 'noticia',
    titulo: entrada.titulo,
    enlace: entrada.enlace,
    resumen: entrada.resumen,
    fuente,
    fecha: entrada.fecha,
    herramientas,
    estado: 'pendiente',
  };
  idea.puntuacion = puntuar(idea);
  return idea;
}

// Ideas "siempre vigentes" a partir del catálogo: X vs Y, reseñas y alternativas.
export function ideasDelCatalogo(afiliados) {
  const lista = [...afiliados.values()];
  const ideas = [];
  for (const a of lista) {
    ideas.push({ tipo: 'resena', titulo: `${a.nombre}: reseña, precios y cómo empezar`, herramientas: [a.slug] });
    const mismos = lista.filter((b) => b.categoria === a.categoria && b.slug !== a.slug);
    if (mismos.length) ideas.push({ tipo: 'lista', titulo: `Alternativas a ${a.nombre}`, herramientas: [a.slug, ...mismos.map((b) => b.slug)] });
  }
  for (let i = 0; i < lista.length; i += 1) {
    for (let j = i + 1; j < lista.length; j += 1) {
      if (lista[i].categoria === lista[j].categoria) {
        ideas.push({ tipo: 'comparativa', titulo: `${lista[i].nombre} vs ${lista[j].nombre}`, herramientas: [lista[i].slug, lista[j].slug] });
      }
    }
  }
  return ideas.map((x) => {
    const idea = { id: idDe(`catalogo:${slugificar(x.titulo)}`), ...x, enlace: null, resumen: '', fuente: 'catálogo', fecha: null, estado: 'pendiente' };
    idea.puntuacion = puntuar(idea);
    return idea;
  });
}

// Une ideas nuevas con las existentes sin duplicar ni perder el estado de las ya tratadas.
export function fusionarIdeas(existentes, nuevas, maximo = 400) {
  const porId = new Map(existentes.map((i) => [i.id, i]));
  for (const n of nuevas) if (!porId.has(n.id)) porId.set(n.id, n);
  const todas = [...porId.values()];
  const pendientes = todas.filter((i) => i.estado === 'pendiente').sort((a, b) => b.puntuacion - a.puntuacion);
  const resto = todas.filter((i) => i.estado !== 'pendiente');
  return [...resto, ...pendientes].slice(0, Math.max(maximo, resto.length));
}
