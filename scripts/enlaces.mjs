// Muestra qué programas de afiliado faltan por activar (sin "urlAfiliado" en data/afiliados.json).
import { cargarAfiliados } from './lib/contenido.mjs';

const afiliados = [...cargarAfiliados().values()];
const pendientes = afiliados.filter((a) => !a.urlAfiliado);
console.log(`${afiliados.length - pendientes.length} de ${afiliados.length} enlaces de afiliado activos.\n`);
if (pendientes.length) {
  console.log('Pendientes (date de alta y pega tu enlace en "urlAfiliado"):');
  for (const a of pendientes) console.log(`- ${a.nombre.padEnd(18)} ${a.programa.comision.padEnd(28)} ${a.programa.url}`);
  console.log('\nMientras tanto, /ir/<herramienta>/ lleva a la web oficial, así que no se pierde ninguna visita.');
}
