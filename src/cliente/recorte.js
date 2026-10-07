// Cálculo del recorte: se usa en el build (Node) y en el navegador (calculadora).
// stack: [{ slug, precioMes, alternativas: [{ precioMes, afiliado?, ... }] }]

export function mejorAlternativa(herramienta) {
  return [...(herramienta.alternativas ?? [])].sort(
    (a, b) => a.precioMes - b.precioMes || Number(Boolean(b.afiliado)) - Number(Boolean(a.afiliado)),
  )[0] ?? null;
}

export function ahorroMaximo(herramienta) {
  const alt = mejorAlternativa(herramienta);
  return alt ? Math.max(0, herramienta.precioMes - alt.precioMes) : 0;
}

// precios: { slug: lo que paga de verdad el usuario al mes } para sustituir el precio de referencia.
export function calcularRecorte(slugs, stack, precios = {}) {
  const porSlug = new Map(stack.map((h) => [h.slug, h]));
  const lineas = [...new Set(slugs)]
    .map((s) => porSlug.get(s))
    .filter(Boolean)
    .map((h) => {
      const alternativa = mejorAlternativa(h);
      const pago = Number.isFinite(precios[h.slug]) && precios[h.slug] >= 0 ? precios[h.slug] : h.precioMes;
      return { herramienta: h, pago, alternativa, ahorroMes: alternativa ? Math.max(0, pago - alternativa.precioMes) : 0 };
    });
  const gastoMes = lineas.reduce((t, l) => t + l.pago, 0);
  const ahorroMes = lineas.reduce((t, l) => t + l.ahorroMes, 0);
  return {
    lineas,
    gastoMes,
    gastoAnual: gastoMes * 12,
    ahorroMes,
    ahorroAnual: ahorroMes * 12,
    nuevoMes: gastoMes - ahorroMes,
  };
}

// 1944 -> "1.944"; 19.99 -> "19,99". Agrupa siempre los miles (Intl no lo hace en es-ES con 4 cifras).
export function formatear(n, decimales = null) {
  const d = decimales ?? (Number.isInteger(Math.round(n * 100) / 100) ? 0 : 2);
  const [ent, dec] = Math.abs(n).toFixed(d).split('.');
  const miles = ent.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${n < 0 ? '-' : ''}${miles}${dec ? `,${dec}` : ''}`;
}
