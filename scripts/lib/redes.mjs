// Kit de redes por artículo: guiones de clips verticales y publicaciones listas para programar.

export const REDES = ['tiktok', 'instagram', 'youtube-shorts', 'x', 'linkedin', 'pinterest'];

export const INSTRUCCIONES_REDES = `Eres el guionista de redes de una web en español sobre herramientas de IA para emprendedores, freelancers y creadores.
Reglas:
- Español neutro, tuteo, frases cortas, tono cercano y concreto. Sin promesas de dinero fácil ni exageraciones.
- Usa solo datos que aparezcan en el artículo que te paso; no inventes precios ni cifras.
- Los clips duran de 30 a 45 segundos: un gancho en los primeros 3 segundos, 3 o 4 frases de valor y una llamada a la acción.
- En TikTok, Instagram y Shorts la llamada a la acción es "enlace en la bio"; nunca escribas URLs en los guiones.
- Indica que hay enlaces de afiliado con la etiqueta #publicidad o "enlace de afiliado" donde se mencione comprar.`;

export function enlaceUtm(sitio, slug, red) {
  const u = new URL(`/${slug}/`, sitio.url);
  u.searchParams.set('utm_source', red);
  u.searchParams.set('utm_medium', 'social');
  u.searchParams.set('utm_campaign', slug);
  return u.href;
}

export function construirEncargoRedes(art) {
  return `Crea el kit de redes para este artículo.

Título: ${art.titulo}
Descripción: ${art.descripcion}
Herramientas: ${art.herramientas.join(', ')}

Artículo:
${art.cuerpo.replace(/\{\{[^}]*\}\}/g, '').slice(0, 12000)}

Devuelve SOLO un objeto JSON con:
- "clips": array de 3 objetos { "titulo", "gancho", "guion": array de 3 o 4 frases, "textoPantalla": array de 3 textos de máximo 6 palabras, "llamada" }, cada uno con un ángulo distinto (problema, demostración, comparación).
- "x": un post de máximo 230 caracteres sin enlace.
- "hilo": array de 4 a 6 posts de máximo 260 caracteres sin enlaces.
- "linkedin": post de 600 a 1200 caracteres sin enlace, con saltos de línea.
- "instagram": descripción de 300 a 600 caracteres terminada en "Enlace en la bio".
- "pinterest": { "titulo" de máximo 100 caracteres, "descripcion" de máximo 450 }.
- "hashtags": array de 5 a 8 hashtags sin espacios, empezando por #.`;
}

const recortar = (s, n) => {
  const t = String(s ?? '').trim();
  return t.length <= n ? t : `${t.slice(0, n - 1).replace(/\s+\S*$/, '')}…`;
};

// Normaliza la respuesta de la IA y aplica los límites de cada red.
export function sanearKit(kit) {
  const hashtags = (Array.isArray(kit.hashtags) ? kit.hashtags : [])
    .map((h) => `#${String(h).replace(/^#+/, '').replace(/\s+/g, '')}`)
    .filter((h) => h.length > 1)
    .slice(0, 8);
  const sinUrls = (s) => String(s ?? '').replace(/https?:\/\/\S+/g, '').replace(/[ \t]{2,}/g, ' ').trim();
  return {
    clips: (Array.isArray(kit.clips) ? kit.clips : []).slice(0, 3).map((c) => ({
      titulo: sinUrls(c.titulo),
      gancho: sinUrls(c.gancho),
      guion: (Array.isArray(c.guion) ? c.guion : []).map(sinUrls).filter(Boolean),
      textoPantalla: (Array.isArray(c.textoPantalla) ? c.textoPantalla : []).map(sinUrls).filter(Boolean),
      llamada: sinUrls(c.llamada) || 'Enlace en la bio.',
    })),
    x: recortar(sinUrls(kit.x), 230),
    hilo: (Array.isArray(kit.hilo) ? kit.hilo : []).map((p) => recortar(sinUrls(p), 260)).filter(Boolean),
    linkedin: recortar(sinUrls(kit.linkedin), 2800),
    instagram: recortar(sinUrls(kit.instagram), 1900),
    pinterest: { titulo: recortar(sinUrls(kit.pinterest?.titulo), 100), descripcion: recortar(sinUrls(kit.pinterest?.descripcion), 450) },
    hashtags,
  };
}

export function kitSimulado(art) {
  const h = art.herramientas.join(' y ') || 'esta herramienta';
  return {
    clips: [
      { titulo: 'Problema', gancho: `¿Pierdes horas en tareas que ${h} hace sola?`, guion: ['[VERIFICAR: frase 1]', '[VERIFICAR: frase 2]', '[VERIFICAR: frase 3]'], textoPantalla: ['Ahorra horas', 'Paso a paso', 'Gratis para empezar'], llamada: 'Enlace en la bio.' },
      { titulo: 'Demostración', gancho: `Te enseño ${h} en 30 segundos`, guion: ['[TU PRUEBA: graba la pantalla]', '[VERIFICAR: frase 2]', '[VERIFICAR: frase 3]'], textoPantalla: ['Mira esto', 'Así de fácil', 'Pruébalo'], llamada: 'Enlace en la bio.' },
      { titulo: 'Comparación', gancho: `${art.titulo}: la respuesta rápida`, guion: ['[VERIFICAR: frase 1]', '[VERIFICAR: frase 2]', '[VERIFICAR: frase 3]'], textoPantalla: ['¿Cuál elegir?', 'Depende de esto', 'Guía completa'], llamada: 'Enlace en la bio.' },
    ],
    x: art.descripcion,
    hilo: [art.titulo, art.descripcion],
    linkedin: `${art.titulo}\n\n${art.descripcion}`,
    instagram: `${art.descripcion}\n\nEnlace en la bio`,
    pinterest: { titulo: art.titulo, descripcion: art.descripcion },
    hashtags: ['#inteligenciaartificial', '#herramientasia', '#productividad', '#emprendedores', '#publicidad'],
  };
}

function celda(s) {
  return `"${String(s).replaceAll('"', '""')}"`;
}

// Devuelve los archivos del kit: kit.md (para leer y grabar) y publicaciones.csv (para programar).
export function renderizarKit(kit, art, sitio) {
  const tags = kit.hashtags.join(' ');
  const clips = kit.clips.map((c, i) => `### Clip ${i + 1}: ${c.titulo}

**Gancho (0 a 3 s):** ${c.gancho}

${c.guion.map((g, j) => `${j + 1}. ${g}`).join('\n')}

**Texto en pantalla:** ${c.textoPantalla.join(' · ')}

**Cierre:** ${c.llamada}`).join('\n\n');

  const md = `# Kit de redes: ${art.titulo}

Artículo: ${new URL(`/${art.slug}/`, sitio.url).href}

## Clips verticales (TikTok, Reels, Shorts)

Graba la pantalla mostrando la herramienta, pon tu voz o una voz de IA y subtítulos automáticos. Pon en la bio el enlace del artículo.

${clips}

**Descripción para TikTok, Reels y Shorts:**

${kit.instagram}

${tags}

## X

${kit.x}

${enlaceUtm(sitio, art.slug, 'x')}

### Hilo

${kit.hilo.map((p, i) => `${i + 1}/ ${p}`).join('\n\n')}

${kit.hilo.length + 1}/ Guía completa: ${enlaceUtm(sitio, art.slug, 'x')}

## LinkedIn

${kit.linkedin}

${enlaceUtm(sitio, art.slug, 'linkedin')}

## Pinterest

**Título:** ${kit.pinterest.titulo}

**Descripción:** ${kit.pinterest.descripcion}

**Enlace:** ${enlaceUtm(sitio, art.slug, 'pinterest')}
`;

  const filas = [
    ['red', 'texto', 'enlace'],
    ['x', kit.x, enlaceUtm(sitio, art.slug, 'x')],
    ['linkedin', kit.linkedin, enlaceUtm(sitio, art.slug, 'linkedin')],
    ['instagram', `${kit.instagram}\n\n${tags}`, ''],
    ['tiktok', `${kit.clips[0]?.gancho ?? art.titulo} ${tags}`, ''],
    ['pinterest', `${kit.pinterest.titulo}\n\n${kit.pinterest.descripcion}`, enlaceUtm(sitio, art.slug, 'pinterest')],
  ];
  const csv = `${filas.map((f) => f.map(celda).join(',')).join('\n')}\n`;
  return { 'kit.md': md, 'publicaciones.csv': csv };
}
