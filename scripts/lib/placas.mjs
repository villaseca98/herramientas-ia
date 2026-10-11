// Placas solares para empresas: /placas-solares/empresas/ y una página por tipo de negocio (/placas-solares/<slug>/),
// generadas desde data/sectores.json con el mismo simulador que la web.
import { escaparHtml as e } from './contenido.mjs';
import { pagina, formularioNewsletter } from './plantillas.mjs';
import { formularioLead, scriptLeads } from './leads.mjs';
import { rutaSector } from './sectores.mjs';
import { simularSolar } from '../../src/cliente/energia.js';
import { formatear } from '../../src/cliente/recorte.js';

const PARTE_ENERGIA = 0.65; // Igual que el simulador: parte de la factura que suponemos energía.
const ORDEN_ENCAJE = { alto: 0, medio: 1, bajo: 2 };
const coma = (n) => String(n).replace('.', ',');

export const rutaPlacasSector = (slug) => `/placas-solares/${slug}/`;

export function sectoresConPlacas(sectores) {
  return sectores.filter((s) => s.placas.encaje !== 'bajo').sort((a, b) => ORDEN_ENCAJE[a.placas.encaje] - ORDEN_ENCAJE[b.placas.encaje]);
}

export function precioEjemplo(ref) {
  return Math.round(ref.precioReferenciaKwh * 1.3 * 1000) / 1000;
}

// Simulación para una factura mensual en euros.
export function simularFactura(facturaMensual, diurno, ref) {
  const precio = precioEjemplo(ref);
  const consumoAnualKwh = (facturaMensual * 12 * PARTE_ENERGIA) / precio;
  return simularSolar({ consumoAnualKwh, fraccionDiurna: diurno, precioKwh: precio }, ref.solar);
}

function tablaEscenarios(filas, ref, diurno) {
  const cuerpo = filas.map((f) => {
    const s = simularFactura(f, diurno, ref);
    return `<tr><td><b>${formatear(f)} €/mes</b></td><td>${coma(s.kWp)} kWp<br><small>${s.paneles} paneles</small></td><td>${formatear(s.coste)} €</td><td class="resalta">${formatear(s.ahorroAnual)} €</td><td>${coma(s.amortizacionAnos)} años</td><td>${formatear(s.ahorroVida)} €</td></tr>`;
  }).join('');
  return `<div class="tabla-scroll"><table class="comparativa tabla-placas">
  <thead><tr><th>Factura de luz</th><th>Instalación</th><th>Coste orientativo</th><th>Ahorro al año</th><th>Se paga en</th><th>Ganancia en ${ref.solar.vidaUtilAnos} años</th></tr></thead>
  <tbody>${cuerpo}</tbody>
</table></div>
<p class="nota">Cálculo con nuestro simulador: un ${Math.round(diurno * 100)}% del consumo en horas de sol, ${coma(precioEjemplo(ref))} €/kWh, ${formatear(ref.solar.produccionKwhKwp)} kWh por kWp al año y precios de instalación de 2026, antes de ayudas. Con tu factura y tu tejado sale tu número exacto.</p>`;
}

const ANTES = `<section class="sector-bloque">
  <h2>Antes de pedir presupuesto</h2>
  <ol class="sector-consejos">
    <li><b>Mira cuánto gastas de día.</b> Las placas solo ahorran lo que consumes mientras hay sol. Tu factura o Datadis te dicen el consumo por horas.</li>
    <li><b>Calcula el tejado.</b> Cuenta unos 5 m² libres por cada kWp, sin sombras de chimeneas, árboles o edificios.</li>
    <li><b>Pide la producción estimada por escrito.</b> Un buen presupuesto dice cuántos kWh producirá al año y cuántos usarás tú.</li>
    <li><b>Pregunta por las garantías.</b> Paneles, inversor y la propia instalación, cada una con sus años y por escrito.</li>
    <li><b>Desconfía de la «factura cero».</b> Siempre seguirás pagando potencia y la luz de la noche. Si te prometen cero, compara con otro instalador.</li>
  </ol>
</section>`;

function faqPlacas(nombre, ejemplo, ref) {
  return [
    { p: `¿Cuánto cuesta poner placas solares en ${nombre}?`, r: `Depende del tamaño. Por encima de ${ref.solar.umbralGrandeKwp} kWp, una instalación para empresa ronda los ${formatear(ref.solar.costeKwpGrande)} € por kWp; por debajo, unos ${formatear(ref.solar.costeKwpPequena)} €. En nuestro ejemplo, ${coma(ejemplo.kWp)} kWp cuestan unos ${formatear(ejemplo.coste)} € antes de ayudas.` },
    { p: '¿En cuántos años se pagan?', r: `En el ejemplo de esta página, en unos ${coma(ejemplo.amortizacionAnos)} años. Cuanto más consumes de día, antes se pagan: un negocio que abre de mañana y tarde suele recuperar la inversión bastante antes que una vivienda.` },
    { p: '¿Qué pasa con la energía que me sobra?', r: 'Con la compensación simplificada se descuenta de la energía que compras ese mes, a un precio más bajo que el que pagas, y nunca baja de cero. Por eso el tamaño ideal es el que cubre tu consumo de día, no el más grande posible.' },
    { p: '¿Hay ayudas o bonificaciones?', r: 'Muchos ayuntamientos bonifican el IBI y el ICIO a quien instala autoconsumo, y las comunidades autónomas abren convocatorias de ayudas que cambian cada año. En el estudio te decimos lo que aplica en tu municipio.' },
    { p: '¿Hace falta pedir permisos?', r: 'Sí, pero los gestiona el instalador: la licencia o comunicación al ayuntamiento, la legalización de la instalación y el alta del autoconsumo con la distribuidora. Tú solo firmas.' },
  ];
}

function cifras(sim) {
  return `<div class="solar-cifras">
    <div><span>Instalación</span><strong>${coma(sim.kWp)} kWp</strong><small>${sim.paneles} paneles</small></div>
    <div><span>Coste orientativo</span><strong>${formatear(sim.coste)} €</strong><small>antes de ayudas</small></div>
    <div><span>Ahorro al año</span><strong class="resalta">${formatear(sim.ahorroAnual)} €</strong><small>cubre ~${sim.cobertura}% del consumo</small></div>
    <div><span>Se paga en</span><strong>${coma(sim.amortizacionAnos)} años</strong><small>luego todo es ahorro</small></div>
  </div>`;
}

function tarjetaPlacas(s) {
  return `<a class="tarjeta-guia" href="${rutaPlacasSector(s.slug)}"><span class="antetitulo">Placas · encaje ${e(s.placas.encaje)}</span><strong>Placas solares para ${e(s.nombre.toLowerCase())}</strong><span>${e(s.placas.texto)}</span></a>`;
}

const COMO = `<section class="pasos">
  <div><span class="promesa-num">01</span><h3>Nos pasas tu factura</h3><p>Con tu consumo real calculamos el tamaño justo, el coste y en cuántos años se paga. Gratis.</p></div>
  <div><span class="promesa-num">02</span><h3>Te traemos presupuesto</h3><p>De un instalador de tu zona, por escrito, con producción estimada y garantías. Sin compromiso.</p></div>
  <div><span class="promesa-num">03</span><h3>Tú decides</h3><p>Si te sale a cuenta, firmas con el instalador. A ti no te cuesta nada: nos paga él.</p></div>
</section>`;

export function paginaPlacasSector(sitio, s, sectores, ref) {
  const ejemplo = simularFactura(s.placas.ejemploMensual, s.placas.diurno, ref);
  const faq = faqPlacas(s.singular, ejemplo, ref);
  const otros = sectoresConPlacas(sectores).filter((x) => x.slug !== s.slug).slice(0, 6);
  const filas = [0.5, 1, 2].map((k) => Math.round((s.placas.ejemploMensual * k) / 10) * 10);
  const contenido = `<section class="hero hero-alt">
  <p class="antetitulo">Placas solares · ${e(s.corto)}</p>
  <h1>Placas solares para ${e(s.nombre.toLowerCase())}: cuánto cuestan y en cuánto se pagan</h1>
  <p class="entradilla">${e(s.placas.texto)} Te calculamos tu caso con tu factura, gratis y sin compromiso.</p>
  <p class="hero-botones"><a class="boton" href="/revisar-factura/">Calcular con mi factura &rarr;</a> <a class="boton boton-sec" href="#lead-placas">Pedir estudio gratis</a></p>
</section>
<section class="sector-placas">
  <div>
    <p class="antetitulo">Ejemplo · ${e(s.corto)} que paga ${formatear(s.placas.ejemploMensual)} €/mes de luz</p>
    <h2>${formatear(ejemplo.ahorroAnual)} € menos al año</h2>
    <p>Con un ${Math.round(s.placas.diurno * 100)}% del consumo en horas de sol, ${e(s.singular)} así necesita unos ${coma(ejemplo.kWp)} kWp. En ${coma(ejemplo.amortizacionAnos)} años la instalación está pagada y el resto es ahorro: unos ${formatear(ejemplo.ahorroVida)} € en ${ref.solar.vidaUtilAnos} años.</p>
    <a class="boton" href="/placas-solares/">Simular con mis datos &rarr;</a>
  </div>
  ${cifras(ejemplo)}
</section>
<section class="sector-bloque">
  <h2>Según lo que pagas de luz</h2>
  ${tablaEscenarios(filas, ref, s.placas.diurno)}
</section>
<div class="sector-rejilla">
  <section class="sector-bloque">
    <h2>Lo que más gasta en ${e(s.singular)}</h2>
    <ul class="sector-equipos">${s.equipos.map((q) => `<li>${e(q)}</li>`).join('')}</ul>
    <p class="nota">Todo lo que funciona mientras hay sol lo pueden cubrir las placas.</p>
  </section>
  ${ANTES}
</div>
${COMO}
${formularioLead(sitio, { id: 'lead-placas', interes: 'placas', sector: s.corto, titulo: `Estudio de placas gratis para tu ${s.corto.toLowerCase()}`, texto: 'Te llamamos, miramos tu factura y tu tejado y te traemos presupuesto por escrito de un instalador de tu zona. Sin compromiso: nos paga el instalador, no tú.', boton: 'Quiero mi estudio de placas' })}
<section class="prosa sector-faq">
  <h2>Preguntas frecuentes</h2>
  ${faq.map((q) => `<h3>${e(q.p)}</h3><p>${e(q.r)}</p>`).join('')}
  <p><a href="${rutaSector(s.slug)}">Cómo pagar menos luz en ${e(s.nombre.toLowerCase())} además de las placas &rarr;</a></p>
</section>
<section><div class="cabecera-seccion"><h2>Placas en otros negocios</h2><a href="/placas-solares/empresas/">Ver todos &rarr;</a></div><div class="tarjetas-guia">${otros.map(tarjetaPlacas).join('')}</div></section>
${formularioNewsletter(sitio)}
${scriptLeads(sitio)}`;
  return pagina(sitio, {
    titulo: `Placas solares para ${s.nombre.toLowerCase()}: precio y ahorro`,
    descripcion: `Cuánto cuestan las placas solares en ${s.singular}, cuánto ahorran al año y en cuántos años se pagan, con ejemplos según lo que pagas de luz. Estudio gratis con tu factura.`,
    ruta: rutaPlacasSector(s.slug),
    migas: [['/placas-solares/', 'Placas solares'], ['/placas-solares/empresas/', 'Empresas'], [rutaPlacasSector(s.slug), s.corto]],
    contenido,
    tipoOg: 'article',
    jsonLd: [{ '@type': 'FAQPage', mainEntity: faq.map((q) => ({ '@type': 'Question', name: q.p, acceptedAnswer: { '@type': 'Answer', text: q.r } })) }],
  });
}

export function paginaPlacasEmpresas(sitio, sectores, ref) {
  const diurno = 0.65;
  const ejemplo = simularFactura(1000, diurno, ref);
  const faq = faqPlacas('un negocio', ejemplo, ref);
  const lista = sectoresConPlacas(sectores);
  const contenido = `<section class="hero hero-alt">
  <p class="antetitulo">Placas solares para empresas</p>
  <h1>Tu tejado puede pagar buena parte de tu factura de luz</h1>
  <p class="entradilla">Si tu negocio trabaja de día, las placas producen justo cuando consumes. Con tu factura te decimos el tamaño justo, lo que cuesta y en cuántos años se paga. Y te traemos presupuesto de un instalador de tu zona, gratis.</p>
  <p class="hero-botones"><a class="boton" href="/revisar-factura/">Calcular con mi factura &rarr;</a> <a class="boton boton-sec" href="#lead-placas">Pedir estudio gratis</a></p>
</section>
<section class="sector-bloque">
  <h2>Cuánto ahorra un negocio según lo que paga de luz</h2>
  ${tablaEscenarios([300, 600, 1000, 2000, 4000], ref, diurno)}
</section>
${COMO}
<section><div class="cabecera-seccion"><h2>Por tipo de negocio</h2></div><div class="tarjetas-guia">${lista.map(tarjetaPlacas).join('')}<a class="tarjeta-guia" href="/placas-solares/comunidades/"><span class="antetitulo">Comunidades</span><strong>Placas en comunidades de vecinos</strong><span>Autoconsumo colectivo paso a paso.</span></a></div></section>
${ANTES}
${formularioLead(sitio, { id: 'lead-placas', interes: 'placas', titulo: 'Estudio de placas gratis para tu negocio', texto: 'Te llamamos, miramos tu factura y tu tejado y te traemos presupuesto por escrito de un instalador de tu zona. Sin compromiso: nos paga el instalador, no tú.', boton: 'Quiero mi estudio de placas' })}
<section class="prosa sector-faq">
  <h2>Preguntas frecuentes</h2>
  ${faq.map((q) => `<h3>${e(q.p)}</h3><p>${e(q.r)}</p>`).join('')}
  <p><a href="/placas-solares/guia/">Guía completa de placas para empresas &rarr;</a></p>
</section>
${formularioNewsletter(sitio)}
${scriptLeads(sitio)}`;
  return pagina(sitio, {
    titulo: 'Placas solares para empresas: precio, ahorro y amortización',
    descripcion: 'Cuánto cuestan las placas solares para un negocio, cuánto ahorran al año según tu factura y en cuántos años se pagan. Ejemplos por sector y estudio gratis con presupuesto de instalador.',
    ruta: '/placas-solares/empresas/',
    migas: [['/placas-solares/', 'Placas solares'], ['/placas-solares/empresas/', 'Empresas']],
    contenido,
    jsonLd: [{ '@type': 'FAQPage', mainEntity: faq.map((q) => ({ '@type': 'Question', name: q.p, acceptedAnswer: { '@type': 'Answer', text: q.r } })) }],
  });
}
