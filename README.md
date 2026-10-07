# Recorta: calcula cuánto pagas de más en software

Web estática en español que ayuda a pagar menos por el software: una calculadora marca lo que pagas, te enseña tu "ticket" y te propone alternativas más baratas con precios oficiales y lo que pierdes con cada cambio. Monetiza con enlaces de afiliado en las alternativas, la newsletter "El Recorte" y auditorías de stack para empresas.

Coste: 0 €. Hosting en Vercel, automatización en GitHub Actions, redacción con Gemini (plan gratuito).

## Recorta en 3 piezas

| Pieza | Archivo | Qué hace |
| --- | --- | --- |
| Datos del recorte | `data/stack.json` | Herramientas caras (precio oficial, plan, enlace a precios) y sus alternativas (`afiliado` del catálogo o `nombre` + `url`), con `porQue` y `pierdes`. |
| Calculadora | `/` (`src/cliente/calculadora.js`) | El usuario marca lo que paga, ve su ticket y su ahorro anual, y lo comparte (`?s=kajabi,zapier`). |
| Páginas de alternativas | `/alternativas/<slug>/` | Una página SEO por herramienta cara ("alternativas más baratas a X") con tabla, FAQ y enlaces. |

Para añadir un recorte nuevo basta con añadir una entrada a `data/stack.json`: el build genera su página, la añade al sitemap y a la calculadora.

## Cómo funciona

| Pieza | Archivo | Qué hace |
| --- | --- | --- |
| Catálogo de afiliados | `data/afiliados.json` | Una entrada por herramienta. Pega tu enlace en `urlAfiliado` y toda la web lo usa. |
| Artículos | `content/articulos/*.md` | Markdown con frontmatter. Solo se publican los que tienen `estado: publicado`. |
| Web | `scripts/build.mjs` | Genera `dist/`: portada, categorías, artículos, directorio, páginas legales, sitemap, RSS y redirecciones `/ir/<herramienta>/`. |
| Fichas de herramientas | `/herramientas/<slug>/` | Precio, plan gratis, pros, contras y alternativas de cada herramienta (datos en `ficha` de `data/afiliados.json`). |
| Test | `/que-herramienta-necesito/` | 3 preguntas y recomienda 2 herramientas con su enlace de afiliado. |
| Páginas de negocio | `content/paginas/*.md` | Recursos gratis (imán de suscriptores), Servicios y Patrocina. Admiten `{{newsletter}}` y `{{contacto}}`. |
| Detector | `scripts/detectar.mjs` | Lee los feeds de `data/fuentes.json` y el catálogo, y guarda ideas priorizadas en `data/ideas.json`. |
| Redactor | `scripts/redactar.mjs` | Convierte las mejores ideas en borradores con Gemini. |
| Redes sociales | `scripts/redes.mjs` | Crea en `social/<artículo>/` 3 guiones de clips verticales y los textos para X, LinkedIn, Instagram y Pinterest, con enlaces UTM. |
| Enlace en la bio | `/enlaces/` | Página para la bio de TikTok, Instagram y YouTube con las últimas guías (sustituye a Linktree). |
| Automatización | `.github/workflows/contenido.yml` | Cada día a las 06:00 UTC detecta, redacta y abre un pull request. |
| Automatización de redes | `.github/workflows/redes.yml` | Al publicar un artículo genera su kit de redes y lo guarda en `social/`. |

### Atajos dentro de los artículos

Escríbelos en su propia línea:

- `{{boton:make}}`: botón "Probar Make".
- `{{herramienta:beehiiv}}`: tarjeta con resumen y botón.
- `{{tabla:make,n8n}}`: tabla comparativa.

Todos enlazan a `/ir/<herramienta>/` con `rel="sponsored nofollow"`, así que cambiar un enlace de afiliado es editar una línea.

### Reglas de seguridad del contenido

- El build falla si un artículo publicado conserva marcadores `[VERIFICAR: …]` o `[TU PRUEBA: …]`.
- El redactor borra cualquier atajo a herramientas no permitidas y nunca escribe URLs directas.
- Los borradores llevan `noindex` y no entran en el sitemap ni en el RSS.

## Comandos

```bash
npm install
npm run dev                # vista previa con borradores en http://localhost:4321
npm run build              # sitio final en dist/
npm test                   # pruebas
npm run detectar           # actualiza la cola de ideas
GEMINI_API_KEY=... npm run redactar -- --n 2
npm run redactar -- --tema "Cómo clonar tu voz con IA" --herramientas elevenlabs --tipo tutorial
npm run redactar -- --simular   # prueba sin API
npm run enlaces            # qué programas de afiliado faltan por activar
npm run redes              # kits de redes de los artículos publicados que no lo tengan
npm run redes -- --articulo make-vs-n8n --simular
```

## Puesta en marcha (una sola vez)

1. **Repositorio:** crea un repositorio en GitHub y sube esta carpeta (rama `main`).
2. **Hosting (Vercel):** en Vercel, Add New → Project, importa el repositorio y pulsa Deploy. `vercel.json` ya indica el build (`npm run build`) y la carpeta de salida (`dist`). Cada cambio en `main` publica la web sola.
   - Alternativa, Cloudflare Pages: Build command `npm run build`, Build output directory `dist`.
3. **Dirección:** en Vercel se usa sola la dirección de producción del proyecto. En otro hosting, o con dominio propio, define la variable `SITIO_URL` (por ejemplo `https://midominio.com`) o cambia `url` en `data/sitio.json`.
4. **IA:** crea una clave gratuita en [Google AI Studio](https://aistudio.google.com/apikey) y guárdala en GitHub → Settings → Secrets and variables → Actions como `GEMINI_API_KEY`. Opcional: variable `GEMINI_MODEL` para cambiar el modelo.
5. **Pull requests automáticos:** en GitHub → Settings → Actions → General, activa "Allow GitHub Actions to create and approve pull requests".
6. **Afiliados:** date de alta en cada programa siguiendo [ALTAS-AFILIADOS.md](ALTAS-AFILIADOS.md) y pega tus enlaces en `data/afiliados.json`.
7. **Newsletter:** crea la publicación en beehiiv o Kit y pega su enlace de suscripción en `newsletter.urlSuscripcion` (o el formulario incrustado en `urlEmbed`) de `data/sitio.json`.
8. **Contacto para servicios y patrocinios:** pon tu email o un formulario gratis en `contacto` de `data/sitio.json`.

## Publicar un artículo

1. Abre el pull request diario "Borradores nuevos para revisar".
2. En cada borrador, completa los `[VERIFICAR]`, añade tus capturas en los `[TU PRUEBA]` y cambia `estado: borrador` por `estado: publicado`.
3. Fusiona. Cloudflare publica la web y, a continuación, se genera su kit de redes en `social/<artículo>/`.
4. Graba los 3 clips con el guion de `kit.md` (CapCut o similar), súbelos y programa los textos de `publicaciones.csv` en Buffer. Pon `https://tu-web/enlaces/` en la bio de tus redes.
