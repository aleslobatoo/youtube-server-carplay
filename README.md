# Servidor de búsqueda para YouTube Audi MMI

Backend Node.js sin dependencias, listo para Render. Obtiene resultados de YouTube Data API v3 y mantiene una caché de 15 minutos en memoria. No descarga vídeos.

## Variables de entorno en Render

- `YOUTUBE_API_KEY`: tu clave privada de YouTube Data API v3 (nunca la subas a GitHub).
- `ALLOWED_ORIGIN`: `https://aleslobatoo.github.io` (valor por defecto).

## Publicación en Render

1. Sube estos archivos a un repositorio **nuevo** de GitHub, por ejemplo `audi-youtube-servidor`.
2. Render > New > Web Service > conecta el repositorio.
3. Language: Node. Build Command: `npm install`. Start Command: `npm start`.
4. Selecciona instancia Free (si está disponible).
5. Añade `YOUTUBE_API_KEY` en Environment y despliega.
6. Verifica `https://TU-SERVIDOR.onrender.com/health` (debe devolver `{"status":"ok"}`).
7. En el archivo frontend `index.html` incluido en el ZIP, modifica `const API_BASE = 'https://TU-SERVIDOR.onrender.com';` por tu URL real. Súbelo a GitHub Pages.

## Google Cloud

Crea un proyecto, habilita YouTube Data API v3 y crea una API Key. Restringe la clave **solo a YouTube Data API v3**. **No la restrinjas por HTTP referrer de GitHub Pages**: las solicitudes salen desde Render, no del navegador. Si restringes por IP, solo funcionará si Render proporciona una IP de salida fija compatible con esa restricción. Controla el uso en Google Cloud y considera configurar alertas/presupuestos.

## Limitaciones

- La cuota de YouTube Data API se comparte entre usuarios. Una búsqueda `search.list` cuesta habitualmente 100 unidades. La caché solo se conserva mientras viva el proceso en Render.
- El servidor gratuito de Render puede suspenderse por inactividad, y la primera petición puede tardar en responder.
- CORS limita qué páginas pueden **leer** las respuestas en navegadores, pero **no impide que terceros hagan peticiones directas al servidor**. El ejemplo incorpora un límite básico de frecuencia; para compartir públicamente a gran escala sería conveniente autenticación y límites adicionales.
- Úsalo con el vehículo estacionado.
