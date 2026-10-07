# Altas en programas de afiliado

Ordenadas por lo que más puede pagar con poco tráfico. Datos comprobados en cada web oficial el 6 de octubre de 2026; las condiciones pueden cambiar.

| # | Programa | Comisión | Duración | Cookie | Dónde darse de alta |
| --- | --- | --- | --- | --- | --- |
| 1 | Systeme.io | 60% | De por vida | De por vida | https://systeme.io/affiliate-program |
| 2 | Semrush | 100 $ a 450 $ por venta + 10 $ por prueba | Pago único | 120 días | https://www.semrush.com/lp/affiliate-program/en/ |
| 3 | Surfer | 75% a 125% del primer mes | Solo primer pago | 90 días | https://surferseo.com/affiliate-program/ |
| 4 | beehiiv | 50% a 60% | 12 meses | 60 días | https://www.beehiiv.com/partners |
| 5 | GetResponse | 40% a 60% | 12 meses | 90 días | https://www.getresponse.com/affiliate-programs |
| 6 | Kit (ConvertKit) | 50%, luego 10% a 20% | 12 meses + recurrente por nivel | No indicado | https://kit.com/affiliate |
| 7 | Hostinger | Desde 40% | Por venta | No indicado | https://www.hostinger.com/affiliates |
| 8 | Make | 35% | 12 meses | 30 días | https://www.make.com/en/affiliate |
| 9 | HeyGen | 35% | 3 meses | 30 días | https://www.heygen.com/affiliate-program |
| 10 | n8n | 30% | 12 meses | No indicado | https://n8n.io/affiliates/ |
| 11 | ElevenLabs | 22% | 12 meses | No indicado | https://elevenlabs.io/affiliates |
| 12 | Tally | 20% (hasta 150 $ por cliente) | Mientras pague | No indicado | https://tally.so/help/referral-program |
| 13 | MailerLite | ~30% recurrente (confirmar) | Mientras pague | No indicado | Web de MailerLite, apartado afiliados |
| 14 | Brevo | Fija por alta y por cliente de pago | Por conversión | 90 días | https://www.brevo.com/partners/affiliates/ |

## Cómo activar cada enlace

1. Date de alta en el programa (algunos tardan unos días en aprobarte; di que tienes una web de comparativas de herramientas de IA en español y pon la URL de Vercel).
2. Copia tu enlace de afiliado.
3. Pégalo en `urlAfiliado` de esa herramienta en `data/afiliados.json` y sube el cambio.

Mientras `urlAfiliado` esté vacío, los botones llevan a la web oficial sin comisión, así que nada se rompe.

## Contactar con las empresas

Plantillas de email para pedir cupones, mejores comisiones y vender espacios de anuncio en `CONTACTO-EMPRESAS.md`.

## Extra recomendado

- **Hotmart** (https://hotmart.com): marketplace de cursos digitales en español con comisiones altas; útil para recomendar cursos de IA y marketing.
- **Newsletter**: crea la cuenta gratis de beehiiv o Kit y pega la URL de suscripción en `data/sitio.json` (`newsletter.urlSuscripcion`, o `urlEmbed` para el formulario incrustado).
- **Servicios**: pon tu email o un formulario (Tally o Google Forms, gratis) en `data/sitio.json` (`contacto`) para que aparezca el botón de presupuesto en /servicios/ y /patrocina/.
