# Con quién hacerte colaborador (luz de negocios + placas solares)

Guía práctica para empezar a cobrar por los clientes que te lleguen desde la web (el lector de facturas en `/revisar-factura/`). Revisada el 7 de octubre de 2026.

## La regla de oro

Solo recomendamos compañías con las que el cliente **sale ganando**: sin permanencia o con permanencia razonable, precios claros y buena atención. Si un día cambias a un negocio a una tarifa peor por cobrar más comisión, pierdes al cliente, la reseña y la recomendación a su vecino. Tu negocio es la confianza.

## Antes de nada: lo que necesitas

| Qué | Cuándo | Por qué |
|---|---|---|
| Darte de alta como **autónomo** (o tener una sociedad) | Cuando te firmen el primer contrato de colaboración y vayas a facturar | Las comercializadoras te pagan contra factura. Con tarifa plana de autónomo el primer año cuesta poco; consúltalo con una gestoría. |
| Un **WhatsApp o email de contacto** en la web | Ya | Sin él, el botón "Quiero que lo gestionéis" del lector no lleva a ningún sitio. Ponlo en `data/sitio.json` → `contacto.whatsapp` (o `urlFormulario` si usas Tally/Google Forms). |
| Que el cliente te dé su **factura y su permiso** por escrito (vale un WhatsApp) | En cada cambio | Es la base de la venta a distancia legal. La venta puerta a puerta de luz está prohibida desde el RDL 15/2018; online y por teléfono a quien te contacta, sí. |

**Las comisiones exactas no son públicas.** Cada compañía te las da al firmar y dependen de la tarifa (2.0TD, 3.0TD, 6.1TD) y del consumo. Pregunta siempre tres cosas: cuánto por contrato, si hay comisión recurrente (un % de cada factura mientras siga el cliente) y qué pasa si el cliente se da de baja en los primeros meses (las "devoluciones de comisión").

## Orden recomendado

### 1. Holaluz: plan amigo de placas (hoy mismo, sin papeleo)

- **Qué es:** su programa de recomendación. Si alguien instala placas con Holaluz a través de tu enlace, te pagan una recompensa (hasta **400 €** según sus condiciones actuales; compruébalas al darte de alta).
- **Barreras:** ninguna. No necesitas ser autónomo ni firmar contrato de agente. Solo ser cliente o registrarte en su web.
- **Para el cliente:** bien. Instalación llave en mano, financiación y compensación de excedentes. No siempre es la más barata en negocios grandes, así que compárala con un instalador local.
- **Cómo:** entra en holaluz.com, busca "Plan Amigos" o "Recomienda", copia tu enlace y pégalo en `data/afiliados.json` como `urlAfiliado` de Holaluz.

### 2. Gana Energía: agente colaborador (la más amable con el cliente)

- **Qué es:** comercializadora online con tarifas simples, sin permanencia y precio de la energía al coste más un margen fijo publicado. Tiene programa de colaboradores y partners.
- **Barreras:** bajas. Contrato mercantil sin exclusividad. Necesitas facturar (autónomo).
- **Para el cliente:** muy bien. Sin permanencia, sin servicios añadidos que no pide, área de cliente clara. Es la que menos "te puede salir mal".
- **Encaja con:** bares, comercios y talleres en 2.0TD y 3.0TD.
- **Cómo:** en su web, sección "Colaboradores" / "Partners", rellena el formulario. Di que tienes una herramienta online que analiza facturas de negocios y que les traes clientes ya cualificados.

### 3. Ecoenergy (Ecoenergy Gas y Electricidad): luz + placas en el mismo contrato

- **Qué es:** comercializadora que trabaja mucho con red de agentes y que también ofrece autoconsumo solar.
- **Barreras:** bajas. Dan formación, materiales y no piden exclusividad.
- **Para el cliente:** bien si comparas la oferta concreta con su factura. Revisa siempre permanencias en tarifas de empresa.
- **Por qué te interesa:** cobras por la luz **y** por las placas con el mismo cliente, que es justo lo que vende Recorta.
- **Cómo:** formulario "Hazte agente" en su web o llamada a su departamento de canal.

### 4. Bualá: agente para pymes

- **Qué es:** comercializadora centrada en empresas y autónomos, con programa de agentes y comisión recurrente.
- **Barreras:** bajas. Contrato de colaboración estándar.
- **Para el cliente:** correcta. Comprueba el precio de 3.0TD frente a Gana y Ecoenergy con la factura real antes de recomendarla.
- **Cómo:** sección de agentes/colaboradores de su web.

### 5. Más adelante (cuando tengas volumen)

| Compañía | Por qué esperar |
|---|---|
| **Mega Energía** | Buena para consumos grandes (6.1TD), pero suele pedir objetivos o volumen mínimo para darte buenas condiciones. |
| **MiLuzSolar / instaladores de comparador** | Pagan por cliente de placas enviado, pero algunos mandan el mismo contacto a varios instaladores: el cliente recibe muchas llamadas. Úsalo solo si lo avisas. |
| **Comunidad Solar** y similares | Para comunidades de vecinos: te interesa cuando tengas trato con administradores de fincas. |

## Placas: el instalador local

Además de Holaluz, busca **uno o dos instaladores de tu zona** (Google Maps, buenas reseñas, más de 5 años) y propónles:

- Les pasas el negocio con la factura ya analizada y el tamaño de instalación estimado (lo da el lector).
- Te pagan **un % de la obra firmada** (habitual entre el 3 % y el 8 %; se negocia) o un fijo por cliente.
- Pídelo por escrito, aunque sea un email.

Una instalación de 20 kWp en un bar sale por unos 20.000 €: un 5 % son 1.000 € por un solo cliente.

## Lo que nunca debes hacer

- Cambiar a alguien a una tarifa con permanencia larga o servicios de mantenimiento que no ha pedido.
- Decir que trabajas "para" una distribuidora o "de parte de" Iberdrola, Endesa, etc.
- Tramitar un cambio sin la factura y el sí expreso del titular.

## Siguiente paso

1. Hoy: alta en el plan amigo de Holaluz y pega el enlace en `data/afiliados.json`.
2. Hoy: pon tu WhatsApp en `data/sitio.json` → `contacto.whatsapp`.
3. Esta semana: formularios de colaborador en Gana Energía y Ecoenergy.
4. Cuando te llegue el primer contrato: alta de autónomo.
