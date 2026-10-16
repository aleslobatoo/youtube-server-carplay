import http from 'node:http';

const PORT = Number(process.env.PORT || 3000);
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || '';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://aleslobatoo.github.io';
const TTL_MS = 15 * 60 * 1000;
const cache = new Map();
const rate = new Map();

function json(res, code, data, origin = '') {
  const headers = {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'};
  if (origin === ALLOWED_ORIGIN) { headers['Access-Control-Allow-Origin'] = origin; headers['Vary'] = 'Origin'; }
  res.writeHead(code, headers);
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin || '';
  if (req.method === 'OPTIONS') {
    if (origin !== ALLOWED_ORIGIN) return json(res, 403, {error: 'Origen no permitido'});
    res.writeHead(204, {'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '3600', 'Vary':'Origin'});
    return res.end();
  }
  if (req.method !== 'GET') return json(res, 405, {error:'Método no permitido'}, origin);
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (url.pathname === '/health') return json(res, 200, {status:'ok'}, origin);
  if (url.pathname !== '/api/search') return json(res, 404, {error:'Ruta no encontrada'}, origin);
  if (origin && origin !== ALLOWED_ORIGIN) return json(res, 403, {error:'Origen no permitido'});
  const q = (url.searchParams.get('q') || '').trim().replace(/\s+/g, ' ');
  if (q.length < 2 || q.length > 100) return json(res, 400, {error:'Escribe entre 2 y 100 caracteres'}, origin);
  if (!YOUTUBE_API_KEY) return json(res, 503, {error:'Falta configurar YOUTUBE_API_KEY en Render'}, origin);
  const now = Date.now();
  const key = q.toLocaleLowerCase('es');
  const saved = cache.get(key);
  if (saved && saved.expires > now) return json(res, 200, {...saved.value, cached:true}, origin);
  // Límites básicos: 20 búsquedas no almacenadas/minuto por IP (no es autenticación).
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  const info = rate.get(ip);
  const bucket = !info || info.until < now ? {count:0, until:now+60000} : info;
  bucket.count++; rate.set(ip, bucket);
  if (bucket.count > 20) return json(res, 429, {error:'Demasiadas búsquedas. Espera un minuto.'}, origin);
  try {
    const query = new URL('https://www.googleapis.com/youtube/v3/search');
    query.search = new URLSearchParams({part:'snippet', q, type:'video', maxResults:'10', videoEmbeddable:'true', key:YOUTUBE_API_KEY});
    const response = await fetch(query, {signal:AbortSignal.timeout(12000)});
    const data = await response.json();
    if (!response.ok) {
      const msg = response.status === 403 ? 'YouTube no permite la consulta: revisa la API, la cuota y las restricciones de la clave.' : 'YouTube no ha podido procesar la búsqueda.';
      return json(res, response.status === 403 ? 503 : 502, {error:msg}, origin);
    }
    const videos = (data.items || []).filter(x=>/^[\w-]{11}$/.test(x.id?.videoId||'')).map(x=>({
      id:x.id.videoId, title:x.snippet?.title || 'Vídeo', thumbnail:x.snippet?.thumbnails?.medium?.url || '', channel:x.snippet?.channelTitle || ''
    }));
    const result = {videos};
    if (cache.size > 300) cache.clear();
    cache.set(key, {value:result, expires:now+TTL_MS});
    return json(res, 200, {...result, cached:false}, origin);
  } catch {
    return json(res, 502, {error:'No se pudo conectar con YouTube. Inténtalo de nuevo.'}, origin);
  }
});
server.listen(PORT, '0.0.0.0', ()=>console.log(`Servidor iniciado en puerto ${PORT}`));
