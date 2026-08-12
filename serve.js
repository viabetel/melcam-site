// Servidor estático do projeto MELCAM.
//
// Regras (auditoria de 12/08/2026):
//   - rota conhecida  -> HTML correspondente, 200
//   - rota desconhecida -> 404.html, HTTP 404   (nunca a home)
//   - asset ausente   -> HTTP 404 seco          (nunca index.html)
//   - path traversal  -> HTTP 403
//   - URL malformada  -> HTTP 400
const http = require('http');
const fs = require('fs');
const path = require('path');

// SERVE_ROOT permite servir o espelho do Framer (site/) no mesmo servidor,
// numa porta separada, para comparação lado a lado com o build antigo.
const ROOT = path.resolve(__dirname, process.env.SERVE_ROOT || '.');
const PORT = Number(process.env.PORT) || 3030;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
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
  '.otf': 'font/otf',
  '.ttf': 'font/ttf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.framercms': 'application/json; charset=utf-8',
};

// Mapa explícito de rota -> arquivo. É a fonte de verdade das URLs públicas.
// Nada fora daqui vira página; o resto é asset ou 404.
const ROTAS = {
  '/': 'index.html',
  '/bee': 'bee.html',
  '/polen': 'polen.html',
  '/acessorios': 'acessorios.html',
  '/sobre': 'sobre.html',
  '/sacola': 'sacola.html',
  // O pipeline gera os dois nomes, byte a byte iguais. A rota aponta para o
  // nome em português, que é o canônico; os nomes do template continuam
  // acessíveis direto, para auditoria.
  '/privacidade': 'privacidade.html',
  '/termos': 'termos.html',
  '/404': '404.html',
};

function tipo(arquivo) {
  return MIME[path.extname(arquivo).toLowerCase()] || 'application/octet-stream';
}

// Resolve para um caminho absoluto garantidamente dentro de ROOT.
// Devolve null se escapar (path traversal) ou não for arquivo.
function dentroDaRaiz(rel) {
  const alvo = path.resolve(ROOT, '.' + (rel.startsWith('/') ? rel : '/' + rel));
  if (alvo !== ROOT && !alvo.startsWith(ROOT + path.sep)) return null;
  return alvo;
}

function ehArquivo(abs) {
  try {
    return fs.statSync(abs).isFile();
  } catch {
    return false;
  }
}

function responder(res, status, corpo, contentType) {
  res.writeHead(status, {
    'content-type': contentType,
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  });
  res.end(corpo);
}

function enviarArquivo(res, abs, status = 200) {
  let info;
  try {
    info = fs.statSync(abs);
  } catch {
    return naoEncontrado(res, '/');
  }
  res.writeHead(status, {
    'content-type': tipo(abs),
    'content-length': info.size,
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  });
  fs.createReadStream(abs).pipe(res);
}

// Rota desconhecida: 404.html de verdade, com HTTP 404.
function naoEncontrado(res, rel) {
  const pagina = path.join(ROOT, '404.html');
  if (ehArquivo(pagina)) return enviarArquivo(res, pagina, 404);
  responder(res, 404, `404 — não encontrado: ${rel}\n`, 'text/plain; charset=utf-8');
}

// Asset ausente: 404 seco. Devolver HTML aqui é o que fazia imagem quebrada
// virar "200 com index.html" e esconder o erro.
function assetAusente(res, rel) {
  responder(res, 404, `404 — asset não encontrado: ${rel}\n`, 'text/plain; charset=utf-8');
}

const servidor = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return responder(res, 405, '405 — método não permitido\n', 'text/plain; charset=utf-8');
  }

  let bruto = (req.url || '/').split('?')[0].split('#')[0];
  let rel;
  try {
    rel = decodeURIComponent(bruto);
  } catch {
    return responder(res, 400, '400 — URL malformada\n', 'text/plain; charset=utf-8');
  }
  if (rel.includes('\0')) {
    return responder(res, 400, '400 — URL inválida\n', 'text/plain; charset=utf-8');
  }

  // /polen/ e /polen são a mesma rota.
  const normal = rel.length > 1 ? rel.replace(/\/+$/, '') || '/' : '/';

  // 1. Rota pública declarada.
  const mapeada = ROTAS[normal] || ROTAS[normal.toLowerCase()];
  if (mapeada) {
    const abs = dentroDaRaiz('/' + mapeada);
    if (abs && ehArquivo(abs)) {
      return enviarArquivo(res, abs, normal === '/404' ? 404 : 200);
    }
    return naoEncontrado(res, rel);
  }

  const abs = dentroDaRaiz(rel);
  if (!abs) return responder(res, 403, '403 — caminho fora da raiz\n', 'text/plain; charset=utf-8');

  const ext = path.extname(abs).toLowerCase();

  // 2. Asset (tem extensão): existe ou 404 seco. Nunca cai para HTML.
  if (ext && ext !== '.html') {
    return ehArquivo(abs) ? enviarArquivo(res, abs) : assetAusente(res, rel);
  }

  // 3. .html direto continua servindo (auditoria e comparação).
  if (ext === '.html') {
    return ehArquivo(abs) ? enviarArquivo(res, abs) : naoEncontrado(res, rel);
  }

  // 4. Qualquer outra coisa é rota desconhecida.
  return naoEncontrado(res, rel);
});

servidor.listen(PORT, () => {
  console.log(`servindo ${ROOT} em http://localhost:${PORT}`);
  console.log(`rotas: ${Object.keys(ROTAS).join(' · ')}`);
});
