// Detecta ideas de contenido: lee los feeds de data/fuentes.json y el catálogo de afiliados,
// y guarda la cola priorizada en data/ideas.json.
//   node scripts/detectar.mjs            feeds + catálogo
//   node scripts/detectar.mjs --sin-red  solo catálogo (sin descargar feeds)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { RAIZ, cargarAfiliados, leerJson } from './lib/contenido.mjs';
import { parsearFeed, ideaDesdeEntrada, ideasDelCatalogo, fusionarIdeas } from './lib/ideas.mjs';

const RUTA_IDEAS = join(RAIZ, 'data', 'ideas.json');

async function descargar(url) {
  const res = await fetch(url, {
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; herramientas-ia-bot/1.0)' },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

export async function detectar({ conRed = true } = {}) {
  const afiliados = cargarAfiliados();
  const existentes = existsSync(RUTA_IDEAS) ? JSON.parse(readFileSync(RUTA_IDEAS, 'utf8')) : [];
  const nuevas = ideasDelCatalogo(afiliados);
  const informe = [];

  if (conRed) {
    for (const fuente of leerJson('data/fuentes.json')) {
      try {
        const entradas = parsearFeed(await descargar(fuente.url));
        const relevantes = entradas.map((e) => ideaDesdeEntrada(e, fuente.nombre, afiliados)).filter((i) => i.herramientas.length);
        nuevas.push(...relevantes);
        informe.push(`${fuente.nombre}: ${entradas.length} entradas, ${relevantes.length} relevantes`);
      } catch (err) {
        informe.push(`${fuente.nombre}: error (${err.message})`);
      }
    }
  }

  const ideas = fusionarIdeas(existentes, nuevas);
  writeFileSync(RUTA_IDEAS, `${JSON.stringify(ideas, null, 2)}\n`);
  const pendientes = ideas.filter((i) => i.estado === 'pendiente').length;
  return { informe, total: ideas.length, nuevas: ideas.length - existentes.length, pendientes };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = await detectar({ conRed: !process.argv.includes('--sin-red') });
  for (const linea of r.informe) console.log(linea);
  console.log(`Ideas: ${r.total} en total, ${r.nuevas} nuevas, ${r.pendientes} pendientes.`);
}
