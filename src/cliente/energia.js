// Lector y análisis de facturas de luz, y simulador de placas solares.
// Funciones puras: se usan en el navegador (revisar-factura, placas-solares) y en las pruebas (Node).

// "1.234,56" -> 1234.56 · "4,6" -> 4.6 · "4.6" -> 4.6
export function numero(txt) {
  if (txt == null) return null;
  let s = String(txt).trim().replace(/\s/g, '');
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const IMPORTE = /(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})\s?€(?!\s*\/)/;

// Primer importe en euros que aparece tras una etiqueta (se salta precios unitarios tipo "0,08 €/kW día").
function importeTras(texto, etiqueta, ventana = 160) {
  const m = etiqueta.exec(texto);
  if (!m) return null;
  const trozo = texto.slice(m.index + m[0].length, m.index + m[0].length + ventana);
  const i = IMPORTE.exec(trozo);
  return i ? numero(i[1]) : null;
}

// Valores en kW (no kWh) de un tramo de texto, en orden.
function kwEn(trozo) {
  return [...trozo.matchAll(/(\d+(?:[.,]\d+)?)\s*kW(?![a-zA-Z])/g)].map((m) => numero(m[1])).filter((n) => n > 0 && n < 100000);
}

// Extrae de la factura (texto plano del PDF) lo que hace falta para analizarla. Lo que no encuentra queda en null.
export function extraerDatos(textoBruto) {
  const texto = String(textoBruto ?? '').replace(/\s+/g, ' ');
  const tarifa = /\b(2\.0|3\.0|6\.[1-4])\s?TD\b/i.exec(texto);
  const dias = [...texto.matchAll(/(\d{1,3})\s*d[ií]as/gi)].map((m) => Number(m[1])).find((n) => n >= 20 && n <= 95) ?? null;

  const iPot = texto.search(/potencia(s)? contratada/i);
  const potencias = iPot >= 0 ? kwEn(texto.slice(iPot, iPot + 260)).slice(0, 6) : [];
  const iMax = texto.search(/max[ií]metro/i);
  const maximetros = iMax >= 0 ? kwEn(texto.slice(iMax, iMax + 260)).slice(0, 6) : [];

  let consumo = null;
  const mc = /consumo(?: total)?(?: (?:del|en el) periodo)?(?: facturado)?[^0-9]{0,40}(\d[\d.]*(?:,\d+)?)\s*kWh/i.exec(texto);
  if (mc) consumo = numero(mc[1]);
  if (consumo === null) {
    const todos = [...texto.matchAll(/(\d[\d.]*(?:,\d+)?)\s*kWh/g)].map((m) => numero(m[1])).filter((n) => n > 0 && n < 1e7);
    if (todos.length) consumo = Math.max(...todos);
  }

  return {
    tarifa: tarifa ? `${tarifa[1]}TD` : null,
    dias,
    potencias,
    maximetros,
    consumoKwh: consumo,
    importeEnergia: importeTras(texto, /(t[eé]rmino de energ[ií]a|energ[ií]a consumida|por energ[ií]a consumida|importe por energ[ií]a)/i),
    importePotencia: importeTras(texto, /(t[eé]rmino de potencia|por potencia contratada|importe por potencia)/i),
    importeReactiva: importeTras(texto, /energ[ií]a reactiva/i),
    importeExcesos: importeTras(texto, /excesos? de potencia/i),
    total: importeTras(texto, /total (?:a pagar|factura|importe)|importe total/i),
  };
}

const redondear = (n) => Math.round(n);

export function simularSolar({ consumoAnualKwh, fraccionDiurna, precioKwh }, ref) {
  if (!(consumoAnualKwh > 0) || !(precioKwh > 0)) return null;
  const kWpExacto = (consumoAnualKwh * fraccionDiurna) / ref.produccionKwhKwp;
  const kWp = Math.max(1.5, Math.round(kWpExacto * 10) / 10);
  const paneles = Math.max(3, Math.ceil(kWp / ref.potenciaPanelKw));
  const costeKwp = kWp > ref.umbralGrandeKwp ? ref.costeKwpGrande : ref.costeKwpPequena;
  const coste = kWp * costeKwp;
  const produccion = kWp * ref.produccionKwhKwp;
  const autoconsumido = Math.min(produccion, consumoAnualKwh * fraccionDiurna);
  const ahorroAnual = autoconsumido * precioKwh;
  return {
    kWp, paneles,
    coste: redondear(coste),
    produccionAnual: redondear(produccion),
    ahorroAnual: redondear(ahorroAnual),
    amortizacionAnos: ahorroAnual > 0 ? Math.round((coste / ahorroAnual) * 10) / 10 : null,
    ahorroVida: redondear(ahorroAnual * ref.vidaUtilAnos - coste),
    cobertura: Math.round((autoconsumido / consumoAnualKwh) * 100),
  };
}

// Analiza los datos de una factura. Cada hallazgo dice qué es, cuánto cuesta al año y qué hacer.
// ahorroAnual es null cuando el ahorro no se puede calcular con la factura (se explica en el texto).
export function analizarFactura(d, ref, { tipo = 'negocio' } = {}) {
  const dias = d.dias > 0 ? d.dias : 30;
  const anual = 365 / dias;
  const hallazgos = [];

  if (d.importeReactiva > 0) {
    hallazgos.push({
      id: 'reactiva', gravedad: 'alta',
      titulo: 'Pagas penalización por energía reactiva',
      costeAnual: redondear(d.importeReactiva * anual),
      ahorroAnual: redondear(d.importeReactiva * anual),
      texto: 'Es un recargo por equipos con motor (cámaras, climatización, maquinaria) que devuelven energía a la red. Se elimina instalando una batería de condensadores, que suele pagarse sola en poco tiempo.',
      ruta: '/negocios/energia-reactiva/',
    });
  }

  if (d.importeExcesos > 0) {
    hallazgos.push({
      id: 'excesos', gravedad: 'alta',
      titulo: 'Pagas excesos de potencia',
      costeAnual: redondear(d.importeExcesos * anual),
      ahorroAnual: null,
      texto: 'Tu maxímetro supera la potencia contratada en algún periodo y la distribuidora te lo cobra aparte. Ajustar la potencia de ese periodo suele salir más barato que pagar el exceso cada mes.',
      ruta: '/negocios/potencia-contratada/',
    });
  }

  const pot = d.potencias ?? [];
  const max = d.maximetros ?? [];
  const sumaPot = pot.reduce((t, p) => t + p, 0);
  if (pot.length && max.length && d.importePotencia > 0 && sumaPot > 0) {
    const precioKwDia = d.importePotencia / (sumaPot * dias);
    let sobrante = 0;
    pot.forEach((p, i) => {
      const m = max[i];
      if (m > 0 && p > m * 1.25 && p - m > 0.5) sobrante += p - Math.max(m * 1.15, m + 0.5);
    });
    if (sobrante > 0.3) {
      hallazgos.push({
        id: 'potencia', gravedad: 'media',
        titulo: 'Tienes más potencia contratada de la que usas',
        costeAnual: redondear(sobrante * precioKwDia * 365),
        ahorroAnual: redondear(sobrante * precioKwDia * 365),
        texto: `Tu maxímetro marca bastante menos de lo que tienes contratado: sobran unos ${String(Math.round(sobrante * 10) / 10).replace('.', ',')} kW${pot.length > 1 ? ` sumando tus ${pot.length} periodos` : ''} que pagas cada día. Bajarlos dejando un margen de seguridad recorta el término de potencia${pot.length > 2 ? ' (en 3.0TD cada periodo tiene que ser igual o mayor que el anterior)' : ''}.`,
        ruta: '/negocios/potencia-contratada/',
      });
    }
  } else if (pot.length && !max.length) {
    hallazgos.push({
      id: 'sin-maximetro', gravedad: 'info',
      titulo: 'Revisa tu potencia con el maxímetro',
      costeAnual: null, ahorroAnual: null,
      texto: 'Tu factura no muestra el maxímetro (la potencia máxima que has usado). Se puede pedir a la distribuidora o ver en su área de clientes: si usas bastante menos de lo contratado, hay ahorro.',
      ruta: '/negocios/potencia-contratada/',
    });
  }

  const precioMedio = d.consumoKwh > 0 && d.importeEnergia > 0 ? d.importeEnergia / d.consumoKwh : null;
  if (precioMedio && d.tarifa === '2.0TD' && precioMedio > ref.precioReferenciaKwh * 1.1) {
    const ahorro = (precioMedio - ref.precioReferenciaKwh) * d.consumoKwh * anual;
    hallazgos.push({
      id: 'precio', gravedad: 'media',
      titulo: `Pagas la energía a ${precioMedio.toFixed(3).replace('.', ',')} €/kWh`,
      costeAnual: redondear(ahorro), ahorroAnual: redondear(ahorro),
      texto: `La tarifa fija más barata del mercado está en torno a ${String(ref.precioReferenciaKwh).replace('.', ',')} €/kWh. Cambiando de comercializadora (gratis, sin cortes de luz) pagarías la energía a ese precio o cerca.`,
      ruta: '/negocios/tarifas-2-0td-3-0td-6-1td/',
    });
  } else if (precioMedio && d.tarifa !== '2.0TD') {
    hallazgos.push({
      id: 'precio-empresa', gravedad: 'info',
      titulo: `Pagas la energía a ${precioMedio.toFixed(3).replace('.', ',')} €/kWh de media`,
      costeAnual: null, ahorroAnual: null,
      texto: 'En tarifas de empresa el precio depende de tu curva de consumo por periodos. Con tu factura podemos pedir ofertas a varias comercializadoras y compararlas con la tuya.',
      ruta: '/negocios/tarifas-2-0td-3-0td-6-1td/',
    });
  }

  const consumoAnual = d.consumoKwh > 0 ? d.consumoKwh * anual : null;
  const solar = consumoAnual
    ? simularSolar({ consumoAnualKwh: consumoAnual, fraccionDiurna: ref.solar.autoconsumoPorDefecto[tipo] ?? 0.5, precioKwh: precioMedio ?? ref.precioReferenciaKwh }, ref.solar)
    : null;

  const ahorroAnual = hallazgos.reduce((t, h) => t + (h.ahorroAnual ?? 0), 0);
  return {
    facturaAnual: d.total > 0 ? redondear(d.total * anual) : null,
    consumoAnual: consumoAnual ? redondear(consumoAnual) : null,
    precioMedio,
    hallazgos: hallazgos.sort((a, b) => (b.ahorroAnual ?? b.costeAnual ?? 0) - (a.ahorroAnual ?? a.costeAnual ?? 0)),
    ahorroAnual,
    solar,
  };
}

// Texto que acompaña la petición de gestión (WhatsApp, email o formulario).
export function resumenPeticion(d, r) {
  const lineas = [
    'Hola, quiero que me reviséis la factura de luz de mi negocio.',
    d.tarifa ? `Tarifa: ${d.tarifa}` : '',
    d.consumoKwh ? `Consumo: ${d.consumoKwh} kWh en ${d.dias ?? 30} días` : '',
    d.potencias?.length ? `Potencia contratada: ${d.potencias.join(' / ')} kW` : '',
    d.total ? `Total factura: ${d.total} €` : '',
    r.ahorroAnual ? `La web me dice que podría ahorrar unos ${r.ahorroAnual} € al año.` : '',
    r.solar ? `Placas: unos ${r.solar.kWp} kWp, ahorro estimado ${r.solar.ahorroAnual} €/año.` : '',
  ];
  return lineas.filter(Boolean).join('\n');
}
