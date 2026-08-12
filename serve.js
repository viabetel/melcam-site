const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = 3030;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4',
  '.framercms': 'application/json; charset=utf-8',
};

// Framer exports pretty URLs (/contact) but ships files as contact.html.
function resolve(rel) {
  const candidates = [rel, rel + '.html', path.join(rel, 'index.html')];
  for (const c of candidates) {
    const f = path.resolve(ROOT, '.' + (c.startsWith('/') ? c : '/' + c));
    if (!f.startsWith(ROOT)) continue;
    if (fs.existsSync(f) && fs.statSync(f).isFile()) return f;
  }
  return null;
}

http.createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split('?')[0]);
  if (rel === '/' || rel === '') rel = '/index.html';

  const file = resolve(rel) || path.join(ROOT, 'index.html');
  const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';

  res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`servindo ${ROOT} em http://localhost:${PORT}`));
