// Servidor local mínimo para ver dist/ en http://localhost:4321
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { RAIZ } from './lib/contenido.mjs';

const DIST = join(RAIZ, 'dist');
const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.xml': 'application/xml', '.txt': 'text/plain', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
const PUERTO = Number(process.env.PORT ?? 4321);

createServer(async (req, res) => {
  const ruta = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  let archivo = join(DIST, ruta);
  try {
    if ((await stat(archivo)).isDirectory()) archivo = join(archivo, 'index.html');
    res.writeHead(200, { 'content-type': TIPOS[extname(archivo)] ?? 'application/octet-stream' });
    res.end(await readFile(archivo));
  } catch {
    res.writeHead(404, { 'content-type': TIPOS['.html'] });
    res.end(await readFile(join(DIST, '404.html')).catch(() => 'No encontrado'));
  }
}).listen(PUERTO, () => console.log(`Vista previa en http://localhost:${PUERTO}`));
