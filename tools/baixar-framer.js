// baixar-framer.js — traz o site publicado no Framer para estático local,
// COM O RUNTIME INTEIRO.
//
// Correção de arquitetura de 12/08/2026.
//
// A abordagem anterior (tools/aplicar.js) tratava o export como código-fonte:
// editava bundles minificados por substituição de texto, quebrava a sintaxe, e
// a "solução" foi arrancar a hidratação React. Isso matou as animações — entre
// elas o scroll transform do grupo .framer-dtlgl4, que ficou congelado em
// translateY(150px) scale(0.5).
//
// Aqui a premissa é outra: o Framer é a fonte. Este script NÃO edita nenhum
// bundle. Ele só:
//   1. baixa o HTML publicado de cada rota;
//   2. baixa recursivamente todo asset remoto (js, css, fontes, imagens, vídeo);
//   3. reescreve as URLs remotas para caminhos locais;
//   4. preserva script_main, modulepreload e todo o runtime.
//
// Consequência: animações, variants, scroll transforms, hover, carrossel, menu
// e breakpoints continuam funcionando, porque quem os executa continua no ar.
//
// A identidade MELCAM entra ANTES daqui, no canvas do Framer, e é publicada.
// Este script apenas materializa o resultado.

const fs = require('fs');
const path = require('path');

const BASE = process.env.FRAMER_BASE || 'https://busy-buttons-865629.framer.app';
const OUT = path.resolve(__dirname, '..', process.env.FRAMER_OUT || 'site');
const ROTAS = (process.env.FRAMER_ROTAS || '/').split(',').map(r => r.trim()).filter(Boolean);
const CONCORRENCIA = 8;

// Hosts cujo conteúdo precisa virar local para o site abrir offline.
const HOSTS = [
  'framerusercontent.com',
  'app.framerstatic.com',
  'fonts.gstatic.com',
  'fonts.googleapis.com',
];

// Casa URLs cruas e as escapadas que aparecem dentro de JS ("https:\/\/...").
const RE_URL = new RegExp(
  'https?:(?:\\\\?/){2}(?:' + HOSTS.map(h => h.replace(/\./g, '\\.')).join('|') + ')(?:\\\\?/[^\\s"\'`\\\\)<>]*)*',
  'g'
);

const baixados = new Map(); // urlNormalizada -> caminho local (root-relative)
const falhas = [];
let bytes = 0;

// Desfaz o escape de JS ("https:\/\/") e as entidades de HTML — o srcset do
// Framer traz "&amp;" separando os parâmetros, e pedir assim devolve HTTP 400.
function normalizar(u) {
  return u.replace(/\\\//g, '/').replace(/&amp;/g, '&');
}

// framerusercontent.com/sites/X/a.mjs  ->  /_framer/framerusercontent.com/sites/X/a.mjs
function localDe(urlLimpa) {
  const u = new URL(urlLimpa);
  let p = decodeURIComponent(u.pathname);
  if (!p || p === '/') p = '/index';
  // A query faz parte da identidade do asset (fontes do Google usam).
  if (u.search) {
    const hash = Buffer.from(u.search).toString('hex').slice(0, 10);
    const ext = path.extname(p);
    p = ext ? p.slice(0, -ext.length) + '-' + hash + ext : p + '-' + hash;
  }
  return '/_framer/' + u.hostname + p;
}

function seguro(local) {
  const abs = path.resolve(OUT, '.' + local);
  if (!abs.startsWith(OUT + path.sep)) throw new Error('caminho inseguro: ' + local);
  return abs;
}

async function buscar(url, binario) {
  const r = await fetch(url, {
    redirect: 'follow',
    headers: { 'user-agent': 'Mozilla/5.0 (melcam-mirror)' },
  });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return binario ? Buffer.from(await r.arrayBuffer()) : await r.text();
}

// Texto (html/js/css) precisa ser varrido de novo: bundles importam bundles.
function ehTexto(local) {
  return /\.(mjs|js|css|json|map|svg)$/i.test(local);
}

async function coletar(texto, fila) {
  const achados = new Set();
  for (const bruto of texto.match(RE_URL) || []) {
    achados.add(normalizar(bruto));
  }
  for (const u of achados) {
    // Menção ao host sem caminho (preconnect) não é asset.
    let p;
    try {
      p = new URL(u).pathname;
    } catch {
      continue;
    }
    if (!p || p === '/') continue;
    if (!baixados.has(u)) fila.add(u);
  }
  return achados;
}

function reescrever(texto) {
  // Substitui tanto a forma crua quanto a escapada, pela mesma local.
  return texto.replace(RE_URL, bruto => {
    const local = baixados.get(normalizar(bruto));
    if (!local) return bruto;
    // Preserva o escape se a origem estava escapada.
    return bruto.includes('\\/') ? local.replace(/\//g, '\\/') : local;
  });
}

async function baixarAsset(url) {
  const local = localDe(url);
  baixados.set(url, local);
  const abs = seguro(local);
  fs.mkdirSync(path.dirname(abs), { recursive: true });

  const texto = ehTexto(local);
  const dado = await buscar(url, !texto);
  bytes += dado.length;
  return { url, local, abs, texto, dado };
}

async function emLotes(itens, tamanho, fn) {
  const saida = [];
  for (let i = 0; i < itens.length; i += tamanho) {
    saida.push(...(await Promise.all(itens.slice(i, i + tamanho).map(fn))));
  }
  return saida;
}

async function main() {
  console.log(`origem : ${BASE}`);
  console.log(`destino: ${OUT}`);
  console.log(`rotas  : ${ROTAS.join(' · ')}\n`);

  const paginas = [];
  const fila = new Set();

  // 1. HTML de cada rota.
  for (const rota of ROTAS) {
    const url = BASE + (rota === '/' ? '/' : rota);
    try {
      const html = await buscar(url, false);
      const nome = rota === '/' ? 'index.html' : rota.replace(/^\//, '').replace(/\/$/, '') + '.html';
      paginas.push({ nome, html });
      await coletar(html, fila);
      console.log(`  html  ${rota} -> ${nome} (${(html.length / 1024).toFixed(0)} KB)`);
    } catch (e) {
      falhas.push(`${url} — ${e.message}`);
      console.log(`  FALHA ${rota} — ${e.message}`);
    }
  }

  // 2. Assets, em ondas: cada texto baixado pode revelar novos imports.
  let onda = 0;
  const pendentesTexto = [];
  while (fila.size) {
    const lote = [...fila];
    fila.clear();
    onda++;
    process.stdout.write(`  onda ${onda}: ${lote.length} assets… `);
    const res = await emLotes(lote, CONCORRENCIA, async u => {
      try {
        return await baixarAsset(u);
      } catch (e) {
        falhas.push(`${u} — ${e.message}`);
        baixados.delete(u);
        return null;
      }
    });
    for (const r of res) {
      if (!r) continue;
      if (r.texto) {
        pendentesTexto.push(r);
        await coletar(r.dado, fila);
      } else {
        fs.writeFileSync(r.abs, r.dado);
      }
    }
    console.log(`ok (${res.filter(Boolean).length})`);
  }

  // 3. Só agora reescreve: o mapa completo já existe.
  for (const r of pendentesTexto) {
    fs.writeFileSync(r.abs, reescrever(r.dado), 'utf8');
  }

  for (const p of paginas) {
    let html = reescrever(p.html);
    // Badge/telemetria do editor não pertence ao estático.
    html = html.replace(/<link[^>]+framer\.com\/edit\/init\.mjs[^>]*>/gi, '');
    html = html.replace(/<script[^>]*framer\.com\/edit[^>]*>[\s\S]*?<\/script>/gi, '');
    fs.writeFileSync(path.join(OUT, p.nome), html, 'utf8');
  }

  // 4. Verificação: nenhum host remoto pode sobrar.
  console.log('\n--- verificação ---');
  let restantes = 0;
  for (const p of paginas) {
    const txt = fs.readFileSync(path.join(OUT, p.nome), 'utf8');
    const n = (txt.match(RE_URL) || []).length;
    restantes += n;
    const runtime = /script_main/.test(txt) ? 'sim' : 'NAO';
    const preload = (txt.match(/modulepreload/g) || []).length;
    console.log(`  ${p.nome}: remotos ${n} · runtime ${runtime} · modulepreload ${preload}`);
  }
  console.log(`  assets locais: ${baixados.size} · ${(bytes / 1048576).toFixed(1)} MB`);
  console.log(`  URLs remotas restantes: ${restantes}`);
  if (falhas.length) {
    console.log(`  FALHAS (${falhas.length}):`);
    for (const f of falhas.slice(0, 15)) console.log('    ' + f);
  }
  process.exitCode = restantes === 0 && !falhas.length ? 0 : 1;
}

main().catch(e => {
  console.error(e);
  process.exitCode = 1;
});
