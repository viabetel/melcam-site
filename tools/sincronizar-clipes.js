// Sincroniza o index.html com tools/comunidade.js na seção "A Melcam por aí".
//
// POR QUE NÃO `aplicar()`: o `aplicar` do comunidade.js só sabe INSERIR — ele
// não recorta nada. Rodá-lo de novo colaria uma segunda cópia das três seções
// no index.html e uma segunda cópia da folha em identidade.css. Então a
// sincronia é feita aqui: recorta a <section class="mel-sec mel-clipes"> atual
// e põe no lugar o que `clipes()` devolve.
//
// Guardas antes de gravar, porque um recorte errado num HTML de 400 KB não dá
// erro — dá página quebrada:
//   - a contagem de <section> tem de ficar IGUAL (troca 1 por 1);
//   - o balanço de <div>, <li> e <ul> tem de ficar igual;
//   - o resto do arquivo, byte a byte, tem de ser idêntico fora do trecho.
//
// Idempotente: rodar duas vezes dá o mesmo arquivo.
//
//   node tools/sincronizar-clipes.js         (aplica)
//   node tools/sincronizar-clipes.js --ver   (só relata)
const fs = require('fs');
const path = require('path');
const { clipes } = require('./comunidade.js');

const SITE = path.resolve(__dirname, '..');
const VER = process.argv.includes('--ver');
const ARQ = path.join(SITE, 'index.html');
const ABRE = '<section class="mel-sec mel-clipes"';

// Recorta a <section> a partir de `ini`, com contagem equilibrada de aberturas
// e fechamentos — não vale procurar o primeiro </section>, que fecharia errado
// se algum dia houver seção aninhada.
function fimDaSection(html, ini) {
  const re = /<(\/?)section\b[^>]*>/g;
  re.lastIndex = ini;
  let prof = 0, t;
  while ((t = re.exec(html))) {
    prof += t[1] ? -1 : 1;
    if (prof === 0) return t.index + t[0].length;
  }
  return -1;
}

const antes = fs.readFileSync(ARQ, 'utf8');
const i = antes.indexOf(ABRE);
if (i < 0) { console.error('não achei ' + ABRE + ' em index.html'); process.exit(1); }
const j = fimDaSection(antes, i);
if (j < 0) { console.error('a seção dos clipes não fecha'); process.exit(1); }

const atual = antes.slice(i, j);
const novo = clipes().trim();

if (atual === novo) {
  console.log('[--] index.html: seção dos clipes já em dia com a fonte');
  process.exit(0);
}

const html = antes.slice(0, i) + novo + antes.slice(j);

const conta = (t, r) => (t.match(r) || []).length;
const balanco = (t) => ({
  section: conta(t, /<section[\s>]/g) - conta(t, /<\/section>/g),
  div: conta(t, /<div[\s>]/g) - conta(t, /<\/div>/g),
  li: conta(t, /<li[\s>]/g) - conta(t, /<\/li>/g),
  ul: conta(t, /<ul[\s>]/g) - conta(t, /<\/ul>/g),
});
const bA = balanco(antes), bD = balanco(html);
const okBal = ['section', 'div', 'li', 'ul'].every((k) => bA[k] === bD[k]);
const okSec = conta(html, /<section[\s>]/g) === conta(antes, /<section[\s>]/g);
const okFora = html.slice(0, i) === antes.slice(0, i)
  && html.slice(i + novo.length) === antes.slice(j);

if (!(okBal && okSec && okFora)) {
  console.error('GUARDA FALHOU (nada gravado): ' + JSON.stringify({ okBal, okSec, okFora, bA, bD }));
  process.exit(1);
}

if (!VER) fs.writeFileSync(ARQ, html, 'utf8');

console.log((VER ? '[ver] ' : '[ok]  ') + 'index.html: seção dos clipes sincronizada com a fonte');
console.log(`  ${atual.length} -> ${novo.length} bytes  ·  balanço de section/div/li/ul preservado`);
console.log('  o restante do arquivo é idêntico byte a byte');

// Prova lida do disco, não da variável que acabou de ser escrita.
if (!VER) {
  const v = fs.readFileSync(ARQ, 'utf8');
  const k = v.indexOf(ABRE);
  const bate = v.slice(k, fimDaSection(v, k)) === novo;
  console.log(bate ? '[OK] o disco confere com clipes()' : '[FALHA] o disco NÃO confere com clipes()');
  process.exit(bate ? 0 : 1);
}
