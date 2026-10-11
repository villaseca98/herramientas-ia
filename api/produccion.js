// Producción solar real de unas coordenadas de España, pedida a PVGIS (Comisión Europea).
// PVGIS no deja llamarse desde el navegador, así que la web pregunta aquí: GET /api/produccion?lat=40.42&lon=-3.70
// Devuelve { kwhKwp } con inclinación y orientación óptimas y un 14 % de pérdidas. La respuesta se cachea un mes.
const PVGIS = 'https://re.jrc.ec.europa.eu/api/v5_3/PVcalc';
const ESPANA = { lat: [27, 44.5], lon: [-18.5, 4.5] };

export function coordenadasValidas(lat, lon) {
  return Number.isFinite(lat) && Number.isFinite(lon)
    && lat >= ESPANA.lat[0] && lat <= ESPANA.lat[1] && lon >= ESPANA.lon[0] && lon <= ESPANA.lon[1];
}

export async function produccionPvgis(lat, lon, f = fetch) {
  const url = `${PVGIS}?lat=${lat}&lon=${lon}&peakpower=1&loss=14&optimalangles=1&outputformat=json`;
  const r = await f(url, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`PVGIS ${r.status}`);
  const j = await r.json();
  const e = j?.outputs?.totals?.fixed?.E_y;
  if (!(e > 500 && e < 2500)) throw new Error('PVGIS sin dato');
  return Math.round(e);
}

export default async function handler(req, res) {
  const q = new URL(req.url, 'http://x').searchParams;
  const lat = Math.round(Number(q.get('lat')) * 100) / 100;
  const lon = Math.round(Number(q.get('lon')) * 100) / 100;
  if (!coordenadasValidas(lat, lon)) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'Coordenadas fuera de España' }));
  }
  try {
    const kwhKwp = await produccionPvgis(lat, lon);
    res.setHeader('Cache-Control', 'public, s-maxage=2592000, stale-while-revalidate=86400');
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ kwhKwp, fuente: 'PVGIS' }));
  } catch {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'PVGIS no responde' }));
  }
}
