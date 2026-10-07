# Cómo ganar dinero con las empresas (sin pagar nada)

Tres vías, de más rápida a más lenta. Las dos primeras no cuestan nada; la tercera (anuncios de pago) solo cuando las otras ya funcionen.

## 1. Altas de afiliado (hazlo ya)

Lista completa y prioridad en `ALTAS-AFILIADOS.md`. Cuando te aprueben, pega cada enlace en `urlAfiliado` de `data/afiliados.json`. Desde ese momento cada botón "Probar X" y cada migración gratis te genera comisión.

Las que más importan para Recorta (salen como alternativa más barata en la calculadora):

| Programa | Sale como alternativa a | Comisión | Alta |
| --- | --- | --- | --- |
| Systeme.io | Kajabi, ClickFunnels, Teachable | 60% de por vida | https://systeme.io/affiliate-program |
| Kit | Mailchimp | 50%, luego 10–20% | https://kit.com/affiliate |
| beehiiv | Kit Creator | 50–60% durante 12 meses | https://www.beehiiv.com/partners |
| Make | Zapier | 35% durante 12 meses | https://www.make.com/en/affiliate |
| n8n | Zapier | 30% durante 12 meses | https://n8n.io/affiliates/ |
| Tally | Typeform | 20% hasta 150 $ por cliente | https://tally.so/help/referral-program |
| Semrush | Ahrefs | 100–450 $ por venta | https://www.semrush.com/lp/affiliate-program/en/ |
| Surfer | Jasper | 75–125% del primer mes | https://surferseo.com/affiliate-program/ |
| Hostinger | Squarespace | desde 40% | https://www.hostinger.com/affiliates |
| MailerLite | Mailchimp, Kit | ~30% recurrente (confirmar al entrar) | desde su web, apartado afiliados |
| Brevo | Mailchimp | fija por alta y por cliente de pago | https://www.brevo.com/partners/affiliates/ |

## 2. Escribir a las empresas (mejores condiciones y patrocinios)

Cuando la web tenga algo de tráfico (o ya, si quieres probar), escribe al equipo de partners de cada herramienta. Lo normal es encontrar el email en su página de afiliados o en el panel de afiliado una vez dentro.

### Plantilla A: pedir mejor comisión o un cupón exclusivo

> **Asunto:** Recorta: enviamos usuarios de {{COMPETIDOR}} a {{HERRAMIENTA}}
>
> Hola, soy {{TU NOMBRE}}, programador y creador de Recorta ({{URL}}), una calculadora en español que enseña a la gente cuánto paga de más en software y a qué cambiarse.
>
> {{HERRAMIENTA}} sale como alternativa recomendada a {{COMPETIDOR}}, y además ofrezco migración gratis a quien se da de alta con mi enlace, así que los usuarios llegan ya decididos y con su cuenta montada.
>
> ¿Podríamos tener un cupón exclusivo para mis usuarios o una comisión mejorada? A cambio destaco el cupón en la calculadora y en la página de alternativas a {{COMPETIDOR}}.
>
> Gracias,
> {{TU NOMBRE}}

### Plantilla B: vender un espacio de anuncio o alternativa patrocinada

> **Asunto:** Aparecer ante quien está dejando {{COMPETIDOR}}
>
> Hola, soy {{TU NOMBRE}}, de Recorta ({{URL}}). Cada página de la web compara una herramienta cara con sus alternativas, y la gente llega buscando literalmente "alternativas a {{COMPETIDOR}}".
>
> Tengo un espacio de alternativa patrocinada en esa página, marcado como tal, desde 99 €/mes, y espacios de anuncio desde 49 €/mes. ¿Os interesa probar un mes?
>
> {{TU NOMBRE}}

### Plantilla C: alianza con agencias o consultores

> **Asunto:** Migraciones de software: te paso clientes
>
> Hola, soy {{TU NOMBRE}}, programador y creador de Recorta. Recibo peticiones de migración que son demasiado grandes para mí solo (equipos con muchos flujos e integraciones). ¿Te interesa recibirlas a cambio de un porcentaje del proyecto?

## 3. Anuncios de pago, estilo dropshipping (cuando ya convierta)

Solo cuando tengas los enlaces de afiliado aprobados y hayas visto altas reales. Mismo método que en dropshipping: probar barato, medir, escalar lo que funciona.

- **Qué anunciar:** los recortes más grandes (Kajabi → Systeme.io: −1.944 $/año; Ahrefs → Ahrefs Starter: −1.200 $/año; ClickFunnels → Systeme.io: −960 $/año).
- **A dónde mandar el tráfico:** a la página `/alternativas/<herramienta>/`, con UTM (`?utm_source=meta&utm_campaign=kajabi`).
- **Presupuesto de prueba:** 5 €/día durante 5 días por anuncio. Si un anuncio no trae altas, se apaga.
- **Ejemplos de texto:**
  - "¿Pagas 179 $/mes por Kajabi? Lo mismo cuesta 17 $ en Systeme.io. Y te migro gratis."
  - "Zapier te cobra por cada tarea. Make hace lo mismo por menos. Calcula cuánto te ahorras en 30 segundos."
  - "Tu factura de software tiene grasa. Recórtala gratis."
- **Cuenta:** la regla es simple. Si una alta te deja 60 % de 17 $/mes = 10 $/mes, y conseguirla te cuesta menos de 20 € en anuncios, en dos meses está pagada y el resto es beneficio.

## 4. AdSense (ingresos pasivos por visita)

Cuando tengas contenido y algo de tráfico, pide AdSense (https://adsense.google.com) con la URL de la web. Al aprobarte, pon tu `ca-pub-...` en `data/sitio.json` → `anuncios.adsenseCliente`. Los espacios de anuncio pasan a mostrar AdSense solos y se genera el `ads.txt`.
