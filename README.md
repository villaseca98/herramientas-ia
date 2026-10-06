# Herramientas IA: web de afiliados con contenido automatizado

Web estática en español que compara herramientas de IA y software y monetiza con enlaces de afiliado. Un pipeline diario detecta ideas, redacta borradores con la API gratuita de Gemini y abre un pull request para que solo tengas que revisar y publicar.

Coste: 0 €. Hosting en Cloudflare Pages, automatización en GitHub Actions, redacción con Gemini (plan gratuito).

## Cómo funciona

| Pieza | Archivo | Qué hace |
| --- | --- | --- |
| Catálogo de afiliados | `data/afiliados.json` | Una entrada por herramienta. Pega tu enlace en `urlAfiliado` y toda la web lo usa. |
| Artículos | `content/articulos/*.md` | Markdown con frontmatter. Solo se publican los que tienen `estado: publicado`. |
| Web | `scripts/build.mjs` | Genera `dist/`: portada, categorías, artículos, directorio, páginas legales, sitemap, RSS y redirecciones `/ir/<herramienta>/`. |
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
2. **Hosting:** en Cloudflare, Workers & Pages → Create → Pages → conectar con Git, elige el repositorio y configura:
   - Build command: `npm run build`
   - Build output directory: `dist`
   Cada fusión en `main` publica la web sola.
3. **Dirección:** cambia `url` en `data/sitio.json` por la dirección que te dé Cloudflare (`*.pages.dev`) o tu dominio.
4. **IA:** crea una clave gratuita en [Google AI Studio](https://aistudio.google.com/apikey) y guárdala en GitHub → Settings → Secrets and variables → Actions como `GEMINI_API_KEY`. Opcional: variable `GEMINI_MODEL` para cambiar el modelo.
5. **Pull requests automáticos:** en GitHub → Settings → Actions → General, activa "Allow GitHub Actions to create and approve pull requests".
6. **Afiliados:** date de alta en cada programa (`npm run enlaces` muestra la lista) y pega tus enlaces en `data/afiliados.json`.
7. **Newsletter:** crea la publicación en beehiiv y pega su enlace de suscripción en `newsletter.urlSuscripcion` de `data/sitio.json`.

## Publicar un artículo

1. Abre el pull request diario "Borradores nuevos para revisar".
2. En cada borrador, completa los `[VERIFICAR]`, añade tus capturas en los `[TU PRUEBA]` y cambia `estado: borrador` por `estado: publicado`.
3. Fusiona. Cloudflare publica la web y, a continuación, se genera su kit de redes en `social/<artículo>/`.
4. Graba los 3 clips con el guion de `kit.md` (CapCut o similar), súbelos y programa los textos de `publicaciones.csv` en Buffer. Pon `https://tu-web/enlaces/` en la bio de tus redes.
