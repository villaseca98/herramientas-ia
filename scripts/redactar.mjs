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
import { INSTRUCCIONES_SISTEMA, construirEncargo, sanearCuerpo, componerArticulo, respuestaSimulada } from './lib/redaccion.mjs';

const RUTA_IDEAS = join(RAIZ, 'data', 'ideas.json');
const MODELO = process.env.GEMINI_MODEL || 'gemini-3.5-flash';

function argumento(nombre) {
  const i = process.argv.indexOf(`--${nombre}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

export async function llamarGemini(encargo, { clave = process.env.GEMINI_API_KEY, modelo = MODELO, intentos = 4 } = {}) {
  if (!clave) throw new Error('Falta GEMINI_API_KEY (consíguela gratis en https://aistudio.google.com/apikey) o usa --simular');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`;
  const cuerpo = {
    systemInstruction: { parts: [{ text: INSTRUCCIONES_SISTEMA }] },
    contents: [{ role: 'user', parts: [{ text: encargo }] }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0.7 },
  };
  for (let intento = 1; ; intento += 1) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': clave },
      body: JSON.stringify(cuerpo),
      signal: AbortSignal.timeout(120000),
    });
    if (res.ok) {
      const datos = await res.json();
      const texto = datos.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
      const json = JSON.parse(texto.replace(/^```(?:json)?\s*|\s*```$/g, ''));
      if (!json.titulo || !json.descripcion || !json.cuerpo) throw new Error('Respuesta de la IA incompleta');
      return json;
    }
    if ((res.status === 429 || res.status >= 500) && intento < intentos) {
      await espera(2 ** intento * 5000);
      continue;
    }
    throw new Error(`Gemini respondió ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
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
