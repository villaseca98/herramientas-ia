// Cliente mínimo de la API de Gemini que devuelve JSON.
// Variables: GEMINI_API_KEY (gratis en https://aistudio.google.com/apikey), GEMINI_MODEL (por defecto gemini-3.5-flash).
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

export async function pedirJson(encargo, {
  sistema,
  claves = [],
  clave = process.env.GEMINI_API_KEY,
  modelo = process.env.GEMINI_MODEL || 'gemini-3.5-flash',
  intentos = 4,
  temperatura = 0.7,
} = {}) {
  if (!clave) throw new Error('Falta GEMINI_API_KEY (consíguela gratis en https://aistudio.google.com/apikey) o usa --simular');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`;
  const cuerpo = {
    ...(sistema ? { systemInstruction: { parts: [{ text: sistema }] } } : {}),
    contents: [{ role: 'user', parts: [{ text: encargo }] }],
    generationConfig: { responseMimeType: 'application/json', temperature: temperatura },
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
      const faltan = claves.filter((k) => json[k] == null || json[k] === '');
      if (faltan.length) throw new Error(`Respuesta de la IA incompleta: falta ${faltan.join(', ')}`);
      return json;
    }
    if ((res.status === 429 || res.status >= 500) && intento < intentos) {
      await espera(2 ** intento * 5000);
      continue;
    }
    throw new Error(`Gemini respondió ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
}
