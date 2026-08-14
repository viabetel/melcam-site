// Esvazia os cards EXCEDENTES da vitrine de produtos. 14/08/2026.
//
//   node tools/limpar-excedentes.js          (aplica)
//   node tools/limpar-excedentes.js --ver    (só relata)
//
// O QUE SÃO OS EXCEDENTES
// O template traz 19 posições de "Card Produtos" e o catálogo real tem 9 (as 7
// cores da Polen e as 2 da Bee). O tools/grade.js preenche as 9 primeiras e
// marca as 10 restantes com display:none e data-mel-excedente="1".
//
// O QUE ELE NÃO FAZ, E ESTE AQUI FAZ
// O grade.js esconde, mas não limpa: o conteúdo do template continua escrito
// dentro. Medido em 14/08, no index.html publicado:
//
//   "Polen Preta"  ·  "Esgotado"  ·  "50%"  ·  "R$ 299,00"
//
// Quatro dados falsos numa linha só. A Polen Preta não está esgotada, não tem
// desconto de 50%, e R$ 299,00 é o preço da BEE. Some-se a isso um card cujo
// packshot é /melcam/img/favicon.png. Nada disso aparece na tela, mas está no
// HTML servido: buscador lê, leitor de tela de alguns navegadores lê, e
// qualquer mexida futura no CSS traz tudo à superfície de uma vez.
//
// POR QUE ESVAZIAR E NÃO REMOVER
// Remover era o pedido inicial. A leitura do grade.js mostrou uma decisão já
// tomada e documentada contra isso, por dois motivos que continuam de pé:
//   1. o card é o elemento que carrega data-framer-appear-id="zfsne5", a única
//      appear animation declarada no template (MOTION_SPEC.md);
//   2. os slots voltam a ser úteis quando o catálogo crescer, e o grade.js já
//      sabe preenchê-los sozinho.
// Esvaziar entrega o mesmo resultado prático — nenhum dado falso no HTML — sem
// mexer na estrutura que o MOTION_SPEC manda preservar.
//
// Idempotente: se já estiverem vazios, não faz nada.
const fs = require('fs');
const path = require('path');

const SITE = path.resolve(__dirname, '..');
const VER = process.argv.includes('--ver');

const PAGINAS = ['index.html', 'polen.html', 'bee.html', 'acessorios.html',
                 'sobre.html', 'sacola.html', '404.html'];

// Recorta um <a ...>...</a> a partir de um índice, com contagem equilibrada.
function recortarA(html, ini) {
  const re = /<(\/?)a\b[^>]*>/g;
  re.lastIndex = ini;
  let prof = 0, t;
  while ((t = re.exec(html))) {
    prof += t[1] ? -1 : 1;
    if (prof === 0) return t.index + t[0].length;
  }
  return -1;
}

let total = 0, limpos = 0;
const erros = [];

for (const pag of PAGINAS) {
  const arq = path.join(SITE, pag);
  let html = fs.readFileSync(arq, 'utf8');
  const antes = html;

  // De trás para frente: os índices não se movem a cada edição.
  const re = /<a[^>]*data-mel-excedente="1"[^>]*>/g;
  const pos = [];
  let m;
  while ((m = re.exec(html))) pos.push(m.index);

  let n = 0;
  for (let i = pos.length - 1; i >= 0; i--) {
    const ini = pos[i];
    const fim = recortarA(html, ini);
    if (fim < 0) { erros.push(pag + ': card em ' + ini + ' sem fechamento'); continue; }
    let bloco = html.slice(ini, fim);
    const original = bloco;

    // Esvazia todo texto: <p>, <h5>, <h6>. As tags e as classes ficam — é o
    // mesmo que o grade.js faz com o desconto e o preço riscado dos cards
    // ativos, e o CSS já colapsa elemento vazio.
    bloco = bloco.replace(/(<(p|h[1-6])\b[^>]*>)([\s\S]*?)(<\/\2>)/g, '$1$4');
    // E o alt, que também descrevia produto que não está ali.
    bloco = bloco.replace(/\salt="[^"]*"/g, ' alt=""');

    if (bloco !== original) { n++; }
    html = html.slice(0, ini) + bloco + html.slice(fim);
  }

  total += pos.length;
  limpos += n;

  if (html !== antes) {
    // Guardas: nada além de texto pode ter mudado.
    const conta = (s, t) => (s.match(new RegExp(t, 'g')) || []).length;
    const ok = conta(antes, '<a\\b') === conta(html, '<a\\b')
      && conta(antes, '<div\\b') === conta(html, '<div\\b')
      && conta(antes, '<img\\b') === conta(html, '<img\\b')
      && conta(antes, 'data-framer-appear-id') === conta(html, 'data-framer-appear-id');
    if (!ok) { erros.push(pag + ': guarda falhou, NADA gravado'); continue; }
    if (!VER) fs.writeFileSync(arq, html, 'utf8');
  }
  console.log((VER ? '[ver] ' : '[ok]  ') + pag.padEnd(16) + pos.length + ' excedente(s), ' + n + ' limpo(s)');
}

// Prova: nenhum texto do template sobrou dentro de excedente.
console.log('');
const SUJEIRA = ['Esgotado', 'Em estoque', '>Estoque<', '>50%<', '>25%<'];
for (const pag of ['index.html', 'polen.html']) {
  const html = fs.readFileSync(path.join(SITE, pag), 'utf8');
  const achados = SUJEIRA.filter((s) => html.includes(s));
  console.log('  ' + pag.padEnd(14) + (achados.length ? 'AINDA TEM: ' + achados.join(', ') : 'limpo'));
}

if (erros.length) {
  console.error('\nPROBLEMAS:');
  erros.forEach((e) => console.error('  - ' + e));
  process.exit(1);
}
console.log('\n' + (VER ? 'nada gravado (--ver)' : limpos + ' card(s) esvaziado(s) de ' + total + ' excedente(s)'));
