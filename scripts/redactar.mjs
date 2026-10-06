// Redacta borradores con la API de Gemini a partir de las mejores ideas pendientes.
//   GEMINI_API_KEY=... node scripts/redactar.mjs            1 borrador
//   node scripts/redactar.mjs --n 3                          3 borradores
//   node scripts/redactar.mjs --tema "Cómo crear voces con IA" --herramientas elevenlabs --tipo tutorial
//   node scripts/redactar.mjs --simular                      sin API (prueba el flujo)
// Variables: GEMINI_API_KEY (obligatoria salvo --simular), GEMINI_MODEL (por defecto gemini-3.5-flash).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { RAIZ, DIR_ARTICULOS, cargarAfiliados, slugificar } from './lib/contenido.mjs';
import { idDe } from './lib/ideas.mjs';
import { pedirJson } from './lib/gemini.mjs';
import { INSTRUCCIONES_SISTEMA, construirEncargo, sanearCuerpo, componerArticulo, respuestaSimulada } from './lib/redaccion.mjs';

const RUTA_IDEAS = join(RAIZ, 'data', 'ideas.json');

function argumento(nombre) {
  const i = process.argv.indexOf(`--${nombre}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

export function llamarGemini(encargo, opciones = {}) {
  return pedirJson(encargo, { sistema: INSTRUCCIONES_SISTEMA, claves: ['titulo', 'descripcion', 'cuerpo'], ...opciones });
}

function elegirIdeas(ideas, n) {
  return ideas
    .filter((i) => i.estado === 'pendiente' && i.herramientas.length)
    .sort((a, b) => b.puntuacion - a.puntuacion)
    .filter((i) => !existsSync(join(DIR_ARTICULOS, `${slugificar(i.titulo)}.md`)))
    .slice(0, n);
}

export async function redactar({ n = 1, simular = false, tema, herramientas = [], tipo = 'resena', hoy = new Date().toISOString().slice(0, 10) } = {}) {
  const afiliados = cargarAfiliados();
  const ideas = existsSync(RUTA_IDEAS) ? JSON.parse(readFileSync(RUTA_IDEAS, 'utf8')) : [];
  const desconocidas = herramientas.filter((h) => !afiliados.has(h));
  if (desconocidas.length) throw new Error(`Herramientas desconocidas: ${desconocidas.join(', ')}`);

  const elegidas = tema
    ? [{ id: idDe(`tema:${tema}`), tipo, titulo: tema, herramientas, resumen: '', enlace: null, estado: 'pendiente', puntuacion: 0 }]
    : elegirIdeas(ideas, n);

  const creados = [];
  for (const idea of elegidas) {
    const respuesta = simular ? respuestaSimulada(idea) : await llamarGemini(construirEncargo(idea, afiliados));
    const cuerpo = sanearCuerpo(respuesta.cuerpo, idea.herramientas);
    const categoria = afiliados.get(idea.herramientas[0])?.categoria ?? 'automatizacion';
    let slug = slugificar(respuesta.titulo || idea.titulo);
    if (existsSync(join(DIR_ARTICULOS, `${slug}.md`))) slug = `${slug}-${idea.id.slice(0, 4)}`;
    const ruta = join(DIR_ARTICULOS, `${slug}.md`);
    writeFileSync(ruta, componerArticulo({ titulo: respuesta.titulo, descripcion: respuesta.descripcion, cuerpo }, idea, categoria, hoy));
    creados.push(`content/articulos/${slug}.md`);
    const enCola = ideas.find((i) => i.id === idea.id);
    if (enCola) Object.assign(enCola, { estado: 'redactada', archivo: `${slug}.md` });
  }
  if (!tema && creados.length) writeFileSync(RUTA_IDEAS, `${JSON.stringify(ideas, null, 2)}\n`);
  return creados;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const creados = await redactar({
    n: Number(argumento('n') ?? 1),
    simular: process.argv.includes('--simular'),
    tema: argumento('tema'),
    herramientas: (argumento('herramientas') ?? '').split(',').map((s) => s.trim()).filter(Boolean),
    tipo: argumento('tipo') ?? 'resena',
  });
  console.log(creados.length ? `Borradores creados:\n${creados.map((c) => `- ${c}`).join('\n')}` : 'No hay ideas pendientes con herramientas de afiliado. Ejecuta antes: npm run detectar');
}
