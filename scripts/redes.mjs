// Genera el kit de redes (guiones de clips y publicaciones) de cada artículo en social/<slug>/.
//   node scripts/redes.mjs                          artículos publicados que aún no tienen kit
//   node scripts/redes.mjs --articulo make-vs-n8n   uno concreto (también borradores)
//   node scripts/redes.mjs --rehacer                vuelve a generar todos los publicados
//   node scripts/redes.mjs --simular                sin API (prueba el flujo)
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { RAIZ, cargarSitio, cargarArticulos } from './lib/contenido.mjs';
import { pedirJson } from './lib/gemini.mjs';
import { INSTRUCCIONES_REDES, construirEncargoRedes, sanearKit, kitSimulado, renderizarKit } from './lib/redes.mjs';

export const DIR_SOCIAL = join(RAIZ, 'social');

function argumento(nombre) {
  const i = process.argv.indexOf(`--${nombre}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

export async function generarKits({ articulo, rehacer = false, simular = false, dirSalida = DIR_SOCIAL } = {}) {
  const sitio = cargarSitio();
  const todos = cargarArticulos({ incluirBorradores: Boolean(articulo) });
  const elegidos = articulo
    ? todos.filter((a) => a.slug === articulo)
    : todos.filter((a) => rehacer || !existsSync(join(dirSalida, a.slug, 'kit.md')));
  if (articulo && !elegidos.length) throw new Error(`No existe el artículo "${articulo}"`);

  const creados = [];
  for (const art of elegidos) {
    const bruto = simular
      ? kitSimulado(art)
      : await pedirJson(construirEncargoRedes(art), { sistema: INSTRUCCIONES_REDES, claves: ['clips', 'x', 'instagram'] });
    const archivos = renderizarKit(sanearKit(bruto), art, sitio);
    mkdirSync(join(dirSalida, art.slug), { recursive: true });
    for (const [nombre, contenido] of Object.entries(archivos)) writeFileSync(join(dirSalida, art.slug, nombre), contenido);
    creados.push(`social/${art.slug}/`);
  }
  return creados;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const creados = await generarKits({
    articulo: argumento('articulo'),
    rehacer: process.argv.includes('--rehacer'),
    simular: process.argv.includes('--simular'),
  });
  console.log(creados.length ? `Kits de redes creados:\n${creados.map((c) => `- ${c}`).join('\n')}` : 'Todos los artículos publicados ya tienen su kit de redes.');
}
