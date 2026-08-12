// Mapeia cada imagem remota do template ao contexto onde ela aparece, para
// decidir qual asset MELCAM entra no lugar.
const fs = require('fs');
const path = require('path');
const SITE = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8');

// cada <img> com seu alt, tamanho e a seção (data-framer-name) mais próxima acima
const imgs = [...html.matchAll(/<img[^>]*>/g)].map(m => m[0]);
const linhas = [];
for (const tag of imgs) {
  const src = (tag.match(/src="([^"]+)"/) || [])[1] || '';
  const alt = (tag.match(/alt="([^"]*)"/) || [])[1] || '';
  const w = (tag.match(/width="(\d+)"/) || [])[1] || '';
  const h = (tag.match(/height="(\d+)"/) || [])[1] || '';
  const i = html.indexOf(tag);
  const antes = html.slice(Math.max(0, i - 2500), i);
  const nomes = [...antes.matchAll(/data-framer-name="([^"]+)"/g)].map(x => x[1]);
  const secao = nomes.slice(-3).join(' > ');
  const arq = (src.match(/images\/([^.?]+)/) || [])[1] || src.slice(0, 40);
  linhas.push({ arq, alt, dim: w && h ? `${w}x${h}` : '', secao });
}

// agrupa por arquivo
const porArq = new Map();
for (const l of linhas) {
  if (!porArq.has(l.arq)) porArq.set(l.arq, { ...l, n: 0 });
  porArq.get(l.arq).n++;
}

console.log(`<img> na home: ${linhas.length} | arquivos distintos: ${porArq.size}\n`);
for (const [arq, l] of porArq) {
  console.log(`${arq.slice(0, 18).padEnd(19)} x${String(l.n).padEnd(2)} ${l.dim.padEnd(11)} alt=${JSON.stringify(l.alt).slice(0, 34).padEnd(36)} ${l.secao.slice(0, 60)}`);
}

// backgrounds via CSS
const bgs = [...new Set([...html.matchAll(/url\(&quot;(https:\/\/framerusercontent[^&]+)&quot;\)/g)].map(m => m[1]))];
console.log(`\nbackground-image distintos: ${bgs.length}`);
bgs.slice(0, 20).forEach(u => console.log('  ' + (u.match(/images\/([^.?]+)/) || [])[1]));
