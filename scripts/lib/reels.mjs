// Texto final de cada reel en Instagram: el texto del reel + la llamada a subir la factura + hashtags comunes.

const MAX_HASHTAGS = 15;
const MAX_TEXTO = 2200;

// Separa las líneas finales que solo tienen hashtags del resto del texto.
function separarHashtags(texto) {
  const lineas = texto.trimEnd().split('\n');
  const tags = [];
  while (lineas.length && /^\s*(#[\p{L}\p{N}_]+\s*)+$/u.test(lineas[lineas.length - 1])) {
    tags.unshift(...lineas.pop().trim().split(/\s+/));
  }
  return { cuerpo: lineas.join('\n').trimEnd(), tags };
}

export function textoInstagram(reel, pie, base) {
  const { cuerpo, tags } = separarHashtags(reel.texto);
  if (!pie) return reel.texto;
  const web = String(base).replace(/^https?:\/\//, '').replace(/\/$/, '');
  const cta = pie.cta.replaceAll('{web}', web);
  const vistos = new Set();
  const hashtags = [...tags, ...(pie.hashtags || [])]
    .filter((t) => !vistos.has(t.toLowerCase()) && vistos.add(t.toLowerCase()))
    .slice(0, MAX_HASHTAGS);
  const texto = `${cuerpo}\n\n${cta}\n\n${hashtags.join(' ')}`;
  return texto.length <= MAX_TEXTO ? texto : `${cuerpo}\n\n${hashtags.join(' ')}`.slice(0, MAX_TEXTO);
}

export function calendarioReels(cola, base) {
  const { pie, ...resto } = cola;
  return { base, ...resto, reels: cola.reels.map((r) => ({ ...r, texto: textoInstagram(r, pie, base) })) };
}
