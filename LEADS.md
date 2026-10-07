# Leads de Recorta: cómo llegan y qué hacer con ellos

## Cómo funciona

1. Un negocio rellena el formulario en `/revisar-factura/`, `/placas-solares/`, cualquier página de sector (`/negocios/sectores/...`) o en `/instaladores/` y `/profesionales/`.
2. La web lo envía al flujo de n8n **"Recorta · Recibir leads de la web"** (`https://leadshunters.app.n8n.cloud/webhook/recorta-lead`, configurado en `data/sitio.json` → `contacto.webhookLeads`).
3. n8n lo valida (descarta spam y envíos sin consentimiento), le pone una **puntuación de 0 a 100** y lo guarda en la tabla de n8n **"Recorta leads"**.
4. Te manda un email a villaseca.managements@gmail.com con todos los datos y el resumen del análisis de su factura.

Si quitas `webhookLeads` de `sitio.json`, la web vuelve al botón de contacto de antes (formulario externo, WhatsApp o email).

## Activarlo (2 minutos, solo tú)

1. Abre el flujo en n8n: https://leadshunters.app.n8n.cloud/workflow/4qKMC2qwWMgOOQZ9
2. En el nodo **"Avisarme por email"**, crea la credencial de Gmail (botón *Sign in with Google*).
3. Pulsa **Publish / Activate** arriba a la derecha.

Hasta que lo actives, el formulario de la web responde con error y el lead se pierde: actívalo antes de publicar la web o lanzar anuncios.

## Qué hacer con cada lead

| Puntuación | Qué es | Qué hacer |
|---|---|---|
| 70–100 | Teléfono, factura alta, interés en placas | Llamar el mismo día |
| 40–69 | Negocio normal | Llamar en 24–48 h |
| < 40 | Solo email o factura pequeña | Email con su análisis y plan amigo |

Columna `estado` de la tabla: cámbiala a `llamado`, `oferta enviada`, `cerrado` o `descartado` para llevar el seguimiento.

### Guion de llamada (60 segundos)

> Hola, [nombre], soy [tu nombre] de Recorta. Has revisado tu factura de luz en nuestra web y te salía un ahorro de unos [ahorroAnual] € al año. ¿Tienes un minuto? Te explico de dónde sale y, si quieres, te mando por escrito las ofertas. A ti no te cuesta nada: nos paga la compañía si decides cambiarte.

### Cómo se cobra cada lead

- **Cambio de comercializadora**: lo tramitas como agente colaborador (ver `COLABORADORAS.md`) y cobras la comisión.
- **Placas**: pasa el lead a un instalador socio. Precio orientativo de mercado: 25–45 € por lead residencial; para negocios, negocia un % de la obra.
- **Gestorías y administradores** (`tipo = profesional`): son canal, no cliente. Ofréceles una parte de la comisión por cada cliente de su cartera.

## Páginas de sector

`data/sectores.json` genera una página por sector en `/negocios/sectores/<slug>/` con equipos, fugas por orden, ejemplo de placas calculado con el simulador, consejos, preguntas frecuentes (con datos estructurados para Google) y el formulario con el sector ya puesto. Para añadir un sector, copia una entrada y cambia los textos: la página, el enlace del índice y el sitemap salen solos.
