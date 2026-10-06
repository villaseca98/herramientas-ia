// Construcción del encargo para la IA y conversión de su respuesta en un artículo Markdown.
import { stringify as yamlStringify } from 'yaml';
import { TIPOS } from './contenido.mjs';

export const INSTRUCCIONES_SISTEMA = `Eres el redactor de una web en español que compara y enseña herramientas de IA y software para emprendedores, freelancers y creadores.
Reglas:
- Escribe en español neutro, claro y directo, con frases cortas. Tutea al lector.
- Empieza con una "Respuesta rápida" en negrita de 1 o 2 frases que resuelva la búsqueda.
- Usa subtítulos ## y, si ayuda, una tabla Markdown.
- No inventes precios, cifras, límites ni funciones. Si no conoces un dato con seguridad, escribe [VERIFICAR: qué dato] para que la persona lo compruebe.
- Inserta marcadores [TU PRUEBA: ...] donde la persona debe añadir una captura u opinión propia (al menos dos).
- Para enlazar una herramienta usa SOLO estos atajos, en su propia línea: {{boton:SLUG}}, {{herramienta:SLUG}} o {{tabla:SLUG1,SLUG2}}, con los slugs permitidos. Nunca escribas URLs de las herramientas.
- Termina con una sección "## Preguntas frecuentes" de 2 a 4 preguntas.
- Nada de promesas de dinero fácil ni lenguaje exagerado.`;

const GUIAS_TIPO = {
  comparativa: 'Compara las herramientas punto por punto (para quién es cada una, facilidad, funciones clave, plan gratuito) y termina con una tabla "Si tú… / Elige".',
  resena: 'Reseña la herramienta: qué es, para quién, funciones clave, pros y contras, plan gratuito y cómo empezar paso a paso.',
  tutorial: 'Explica paso a paso cómo conseguir el resultado con la herramienta, con pasos numerados.',
  lista: 'Presenta cada herramienta con un subtítulo numerado, para qué sirve y para quién es mejor.',
  noticia: 'Explica la novedad, por qué importa al lector y qué hacer ahora, y enlaza las herramientas relacionadas.',
};

export function construirEncargo(idea, afiliados) {
  const tipo = TIPOS.includes(idea.tipo) ? idea.tipo : 'resena';
  const herramientas = idea.herramientas.map((s) => afiliados.get(s)).filter(Boolean);
  const fichas = herramientas.map((a) => `- slug "${a.slug}": ${a.nombre}. ${a.resumen}`).join('\n');
  return `Escribe un artículo de tipo "${tipo}" sobre: ${idea.titulo}
${idea.resumen ? `Contexto de la fuente: ${idea.resumen}\n` : ''}${idea.enlace ? `Fuente: ${idea.enlace}\n` : ''}
${GUIAS_TIPO[tipo]}

Herramientas y slugs permitidos:
${fichas || '- (ninguna)'}

Devuelve SOLO un objeto JSON con estas claves:
- "titulo": título SEO en español, máximo 65 caracteres, con el año 2026 si encaja.
- "descripcion": meta descripción de 140 a 160 caracteres.
- "cuerpo": el artículo en Markdown, entre 900 y 1500 palabras, sin repetir el título.`;
}

// Elimina atajos con slugs no permitidos y cualquier URL directa a las herramientas.
export function sanearCuerpo(cuerpo, permitidos) {
  const ok = new Set(permitidos);
  return cuerpo
    .replace(/\{\{\s*(\w+)\s*:\s*([^}]*)\}\}/g, (orig, tipo, args) => {
      if (!['boton', 'herramienta', 'tabla'].includes(tipo)) return '';
      const slugs = args.split(',').map((s) => s.trim()).filter((s) => ok.has(s));
      return slugs.length ? `{{${tipo}:${slugs.join(',')}}}` : '';
    })
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function componerArticulo({ titulo, descripcion, cuerpo }, idea, categoria, fecha) {
  const frontmatter = yamlStringify({
    titulo,
    descripcion,
    fecha,
    categoria,
    tipo: TIPOS.includes(idea.tipo) ? idea.tipo : 'resena',
    herramientas: idea.herramientas,
    estado: 'borrador',
    ...(idea.enlace ? { fuente: idea.enlace } : {}),
  });
  return `---\n${frontmatter}---\n${cuerpo}\n`;
}

// Respuesta de ejemplo para probar el pipeline sin clave de API.
export function respuestaSimulada(idea) {
  const slugs = idea.herramientas;
  return {
    titulo: idea.titulo.slice(0, 65),
    descripcion: `Guía en español sobre ${idea.titulo}: para quién es, cómo empezar gratis y qué tener en cuenta antes de pagar.`.slice(0, 160),
    cuerpo: `**Respuesta rápida:** [VERIFICAR: conclusión principal].

${slugs.length > 1 ? `{{tabla:${slugs.join(',')}}}` : ''}

## Para quién es

[TU PRUEBA: explica tu experiencia.]

${slugs.map((s) => `{{boton:${s}}}`).join('\n\n')}

## Preguntas frecuentes

**¿Se puede empezar gratis?** [VERIFICAR: plan gratuito].`,
  };
}
