// Enriquece o BLOCO POLEN da home (o card <a data-framer-name="Polen"> dentro do
// Header Grid), sem reconstruir DOM nenhum.
//
// POR QUE UMA FERRAMENTA NOVA, E NAO O tools/aplicar.js
// O aplicar.js reconstroi o site inteiro a partir de _ORIGINAL/. Roda-lo hoje
// apagaria grade.js, mover-secoes.js, mover-conteudo-interno.js, a animacao da
// fileira e todo o resto de 12 e 13/08. Entao a mudanca entra por uma ferramenta
// estreita e idempotente, como grade.js e mover-conteudo-interno.js ja fazem.
//
// O QUE O BLOCO TINHA
//   <a data-framer-name="Polen" href="/polen">
//     <div RichTextContainer><h3>Polen</h3></div>
//     <div><p>Sem telas, sem distracoes ...</p></div>      (so na variante grande)
//     <img src="/melcam/img/card-polen.jpg">
//   </a>
// Sao 4 <a> no arquivo: dois cards (um grande com paragrafo, um pequeno so com
// titulo), cada um em duas variantes de breakpoint. So 2 ficam visiveis por vez.
//
// Faltavam, contra o pedido do cliente: eyebrow, o titulo do conceito aprovado,
// a indicacao das 7 cores em produto (havia so 7 pontos de cor em CSS, pequenos
// e por cima da foto), o preco real e um CTA.
//
// O QUE ESTA FERRAMENTA FAZ, e so isso:
//   1. no card GRANDE, troca o texto do <h3> de "Polen" para o conceito
//      aprovado, e insere um eyebrow "Polen" logo antes dele;
//   2. acrescenta, depois do bloco de texto, uma tira com as 7 cores reais
//      (os packshots oficiais de melcam.config.json > produtos.polen.cores),
//      mais preco e CTA.
// O <a>, suas classes framer-*, seus data-framer-*, a foto e o paragrafo ficam
// intactos. O card pequeno nao e tocado.
//
// SEM LINK ANINHADO: o CTA e um <span>, nao um <a>. O bloco inteiro ja e o link.
//
// SO A HOME: a ferramenta escreve apenas em index.html. As internas tambem tem
// Header Grid (decisao de 13/08 de mante-lo la), e nao podem mudar. O CSS que
// acompanha e ancorado em body:not(.mel-interna), e ha uma regra que esconde a
// tira caso um dia o paginas.gerar() propague esses nos para as internas.
//
// Idempotente: se a tira ja existir, nao faz nada.
const fs = require('fs');
const path = require('path');

const SITE = path.resolve(__dirname, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(SITE, 'melcam.config.json'), 'utf8'));
const POLEN = cfg.produtos.polen;

// Conceito aprovado. O eyebrow carrega o nome da linha; o titulo carrega o
// argumento — ESCOLHA. A Bee e que comunica novidade; nao repetir isso aqui.
const EYEBROW = 'Polen';
const TITULO = '7 cores. Uma decisão.';
const CTA = 'Escolha sua Polen';

const MARCA = 'data-mel-polen';

function tira() {
  const minis = POLEN.cores.map(c =>
    `<img src="${c.img}" alt="" loading="lazy" decoding="async" width="800" height="800">`
  ).join('');

  // As miniaturas sao decorativas: cada uma e um packshot sobre o proprio fundo
  // de cor, entao a cor nunca e a UNICA portadora da informacao — a contagem e o
  // preco estao em texto ao lado, e os nomes das 7 cores vao no aria-label da
  // tira, para quem le por leitor de tela.
  const nomes = POLEN.cores.map(c => c.nome).join(', ');

  return `<div class="mel-polen-tira" ${MARCA}="1">` +
    `<span class="mel-polen-cores" role="img" aria-label="As 7 cores da Polen: ${nomes}.">${minis}</span>` +
    `<span class="mel-polen-linha">` +
      `<span class="mel-polen-preco">${POLEN.preco}</span>` +
      `<span class="mel-polen-cta">${CTA}</span>` +
    `</span>` +
  `</div>`;
}

// Recorta um <a ...>...</a> a partir de um indice, com contagem equilibrada.
function recortarA(html, ini) {
  const re = /<(\/?)a\b[^>]*>/g;
  re.lastIndex = ini;
  let prof = 0, t;
  while ((t = re.exec(html))) {
    prof += t[1] ? -1 : 1;
    if (prof === 0) return { fim: t.index + t[0].length };
  }
  return null;
}

function aplicar() {
  const arq = path.join(SITE, 'index.html');
  const antes = fs.readFileSync(arq, 'utf8');
  if (antes.indexOf(MARCA) >= 0) return ['index.html: tira já presente, nada a fazer'];

  let html = antes;
  const feito = [];
  let tocados = 0;

  // Varre de tras para frente, para os indices nao se moverem a cada insercao.
  const abre = /<a[^>]*data-framer-name="Polen"[^>]*>/g;
  const pos = [];
  let m;
  while ((m = abre.exec(html))) pos.push(m.index);

  for (let i = pos.length - 1; i >= 0; i--) {
    const ini = pos[i];
    const fecha = recortarA(html, ini);
    if (!fecha) { feito.push('card em ' + ini + ': fechamento não encontrado, pulado'); continue; }
    let bloco = html.slice(ini, fecha.fim);

    // So o card GRANDE — o que tem paragrafo. O pequeno fica como esta.
    if (bloco.indexOf('<p ') < 0) continue;

    const h3 = /(<h3\b[^>]*>)Polen(<\/h3>)/;
    if (!h3.test(bloco)) { feito.push('card em ' + ini + ': <h3>Polen</h3> não encontrado, pulado'); continue; }

    // 1. eyebrow antes do <h3>, e o conceito aprovado dentro dele
    bloco = bloco.replace(h3,
      `<p class="mel-polen-eyebrow" ${MARCA}="1">${EYEBROW}</p>$1${TITULO}$2`);

    // 2. a tira como FILHO DIRETO do <a>, logo antes do </a>.
    //
    // ⚠️ NAO pendurar no container do paragrafo. O card grande tem DOIS desses,
    // um por variante SSR, e so um renderiza por breakpoint. Medido em
    // 13/08/2026: pendurada no ultimo deles, a tira dava 0x0 no desktop (a
    // variante ali e a do mobile) e 27x27 no tablet e no mobile. Filho direto do
    // <a> fica fora de qualquer variante e vale nos tres.
    const fechaA = bloco.lastIndexOf('</a>');
    if (fechaA < 0) { feito.push('card em ' + ini + ': </a> não encontrado, pulado'); continue; }
    bloco = bloco.slice(0, fechaA) + tira() + bloco.slice(fechaA);

    html = html.slice(0, ini) + bloco + html.slice(fecha.fim);
    tocados++;
  }

  if (!tocados) { feito.push('index.html: nenhum card grande encontrado, NADA gravado'); return feito; }

  // Guardas: so pode ter entrado o que a ferramenta escreve.
  const conta = (s, t) => (s.match(new RegExp(t, 'g')) || []).length;
  const okA = conta(antes, '<a\\b') === conta(html, '<a\\b');
  const okSec = conta(antes, '<section\\b') === conta(html, '<section\\b');
  const okDiv = conta(html, '<div\\b') - conta(antes, '<div\\b') === tocados;         // 1 div por card
  const okImg = conta(html, '<img\\b') - conta(antes, '<img\\b') === tocados * POLEN.cores.length;
  const okBal = conta(html, '<div\\b') - conta(html, '</div>') === conta(antes, '<div\\b') - conta(antes, '</div>');

  if (!(okA && okSec && okDiv && okImg && okBal)) {
    return ['index.html: guarda falhou, NADA gravado — ' +
      JSON.stringify({ okA, okSec, okDiv, okImg, okBal, tocados })];
  }

  fs.writeFileSync(arq, html, 'utf8');
  feito.push('index.html: ' + tocados + ' variante(s) do card grande enriquecida(s) — ' +
    'eyebrow + "' + TITULO + '" + ' + POLEN.cores.length + ' cores + ' + POLEN.preco + ' + CTA');
  feito.push('  guardas: <a> e <section> inalterados, +' + tocados + ' div, +' +
    (tocados * POLEN.cores.length) + ' img, balanço de div preservado');
  return feito;
}

module.exports = { aplicar, tira, TITULO, EYEBROW, CTA };

if (require.main === module) console.log(aplicar().join('\n'));
