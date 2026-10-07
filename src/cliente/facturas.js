// Cálculo del ahorro en facturas del hogar: se usa en el build (Node) y en el navegador (calculadora de la portada).
// facturas: [{ slug, gastoMedioMes, precioReferencia?, ahorroPct?, opciones: [{ precioMes?, bono }] }]

// Precio al que puedes bajar la factura: el fijado en los datos o la opción más barata con precio conocido.
export function referenciaMes(factura) {
  if (Number.isFinite(factura.precioReferencia)) return factura.precioReferencia;
  const precios = (factura.opciones ?? []).map((o) => o.precioMes).filter(Number.isFinite);
  return precios.length ? Math.min(...precios) : null;
}

export function ahorroMes(factura, pago = factura.gastoMedioMes) {
  const ref = referenciaMes(factura);
  if (ref !== null) return Math.max(0, pago - ref);
  return Math.max(0, pago * (factura.ahorroPct ?? 0));
}

// Opción con el bono de bienvenida más alto para quien se cambia (a igualdad, la más barata).
export function mejorBono(factura) {
  return [...(factura.opciones ?? [])]
    .filter((o) => o.bono > 0)
    .sort((a, b) => b.bono - a.bono || (a.precioMes ?? Infinity) - (b.precioMes ?? Infinity))[0] ?? null;
}

// Opción que se recomienda primero: la más barata si hay precios; si no, la de mejor bono.
export function mejorOpcion(factura) {
  const ref = referenciaMes(factura);
  const conPrecio = (factura.opciones ?? []).filter((o) => Number.isFinite(o.precioMes));
  if (ref !== null && conPrecio.length) {
    return [...conPrecio].sort((a, b) => a.precioMes - b.precioMes || (b.bono ?? 0) - (a.bono ?? 0))[0];
  }
  return mejorBono(factura) ?? factura.opciones?.[0] ?? null;
}

// pagos: { slug: lo que paga el usuario al mes }. Las facturas sin pago no cuentan; a 0 € cuentan por su bono.
export function calcularFacturas(pagos, facturas) {
  const lineas = facturas
    .filter((f) => Number.isFinite(pagos[f.slug]) && pagos[f.slug] >= 0)
    .map((f) => {
      const pago = pagos[f.slug];
      const bono = mejorBono(f);
      return { factura: f, pago, ahorroMes: ahorroMes(f, pago), opcion: mejorOpcion(f), bono: bono?.bono ?? 0, opcionBono: bono };
    });
  const gastoMes = lineas.reduce((t, l) => t + l.pago, 0);
  const ahorro = lineas.reduce((t, l) => t + l.ahorroMes, 0);
  return {
    lineas,
    gastoMes,
    ahorroMes: ahorro,
    ahorroAnual: ahorro * 12,
    nuevoMes: gastoMes - ahorro,
    bonos: lineas.reduce((t, l) => t + l.bono, 0),
  };
}

// Todos los bonos por cambiarte, de mayor a menor.
export function listaBonos(facturas) {
  return facturas
    .flatMap((f) => (f.opciones ?? []).filter((o) => o.bono > 0).map((o) => ({ ...o, factura: f })))
    .sort((a, b) => b.bono - a.bono);
}
