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
const polenUI = require('./polen-interacoes.js');

// Conceito aprovado. O eyebrow carrega o nome da linha; o titulo carrega o
// argumento — ESCOLHA. A Bee e que comunica novidade; nao repetir isso aqui.
const EYEBROW = 'Polen';
const TITULO = '7 cores. Uma decisão.';
// 14/08/2026: era "Escolha sua Polen". O topicos_alteracoes.pdf nomeia os dois
// botoes da grade — "Conheca" e "Ver Modelos" — e e a palavra do cliente que
// fica. A Polen leva "Ver modelos" porque e ela que tem 7 variantes; a Bee, que
// tem duas e e o lancamento, leva "Conheca". Grafia em caixa mista: quem poe a
// caixa alta na tela e o text-transform da pilula, e assim o texto continua
// legivel para leitor de tela.
const CTA = 'Ver modelos';

const MARCA = 'data-mel-polen';

function tira() {
  // A cor de cada variante NAO e inventada: sai do proprio packshot oficial,
  // pelo corDoTile() que a /polen ja usa. Se o cliente reenviar um packshot
  // noutro tom, o veu e o swatch acompanham sozinhos.
  const minis = POLEN.cores.map((c, i) =>
    `<span class="mel-polen-cor" data-i="${i}" data-nome="${c.nome}" data-sub="${c.sub || ''}">` +
      `<img src="${c.img}" alt="" loading="lazy" decoding="async" width="800" height="800">` +
    `</span>`
  ).join('');

  // As miniaturas sao decorativas: cada uma e um packshot sobre o proprio fundo
  // de cor, entao a cor nunca e a UNICA portadora da informacao — a contagem e o
  // preco estao em texto ao lado, e os nomes das 7 cores vao no aria-label da
  // tira, para quem le por leitor de tela.
  const nomes = POLEN.cores.map(c => c.nome).join(', ');

  // A CAMADA QUE TROCA A FOTO GRANDE.
  // Os 7 packshots sao 800x800 e ja trazem o fundo NA COR da variante — entao
  // mostrar o packshot em tamanho grande troca a foto E o fundo de uma vez, sem
  // veu nenhum por cima. E sao os MESMOS arquivos dos swatches: o navegador ja
  // baixou cada um para desenhar a miniatura, entao a camada grande nao custa
  // requisicao nova.
  const trocas = POLEN.cores.map((c, i) =>
    `<img src="${c.img}" data-i="${i}" alt="" loading="lazy" decoding="async" width="800" height="800">`
  ).join('');

  return `<span class="mel-polen-troca" ${MARCA}="1" aria-hidden="true">${trocas}</span>` +
  `<span class="mel-polen-veu" ${MARCA}="1" aria-hidden="true"></span>` +
  `<div class="mel-polen-tira" ${MARCA}="1">` +
    `<span class="mel-polen-legenda" aria-hidden="true"></span>` +
    `<span class="mel-polen-cores" role="img" aria-label="As 7 cores da Polen: ${nomes}.">${minis}</span>` +
    `<span class="mel-polen-linha">` +
      `<span class="mel-polen-preco">${POLEN.preco}</span>` +
      `<span class="mel-polen-cta">${CTA}</span>` +
    `</span>` +
  `</div>`;
}

// TODAS as regras que dependem do indice da cor, num lugar so.
//
// Sao cinco famílias por variante e todas precisam do numero i:
//   1. a cor do veu, amostrada do packshot
//   2. a --mel-cor do swatch (usada no anel do hover)
//   3. a faixa que aquela foto ocupa em repouso
//   4. a expansao dela quando a cor e escolhida
//   5. o texto da legenda
//
// 🔴 CSS NAO PROPAGA CUSTOM PROPERTY DE FILHO PARA PAI. O veu e a legenda sao
// irmaos da tira: nao ha como eles lerem a --mel-cor ou o data-nome do swatch
// que esta sob o ponteiro. Ou sao regras explicitas por indice, ou entra JS.
// Geradas daqui, elas nunca saem de sincronia com o config.
function cssCores() {
  const alt = ['#F4B233', '#DADADA', '#EF6C29', '#5F2D0B', '#2B2B2B', '#FBBAB6', '#303F1C'];
  const n = POLEN.cores.length;
  const larg = (100 / n).toFixed(4);
  const A = 'a[data-framer-name="Polen"]';

  return POLEN.cores.map((c, i) => {
    const cor = polenUI.corDoTile(c.img, alt[i] || '#2B251C');
    const esq = (i * 100 / n).toFixed(4);
    const hov = A + ':has(.mel-polen-cor[data-i="' + i + '"]:hover) ';
    return [
      hov + '.mel-polen-veu{ background:' + cor + ' }',
      '.mel-polen-cor[data-i="' + i + '"]{ --mel-cor:' + cor + ' }',
      '.mel-polen-troca img[data-i="' + i + '"]{ left:' + esq + '%; width:' + larg + '% }',
      hov + '.mel-polen-troca img[data-i="' + i + '"]{ left:0; width:100%; opacity:1; z-index:2 }',
      hov + '.mel-polen-legenda::after{ content:"' + c.nome + ' · ' + (c.sub || '') + '" }'
    ].join('\n');
  }).join('\n');
}

// A COR DE FUNDO DE CADA FAIXA DO LEQUE — 15/08/2026.
//
// POR QUE ISTO EXISTE. Em repouso cada faixa tem 62px de largura por 331 de
// altura (proporcao 0,19) e recebe um packshot QUADRADO de 800x800. Com
// object-fit:cover o navegador escala pela altura e corta a largura: sobra uma
// fatia de 19% da foto, em altura cheia. Como a camera ocupa quase todo o
// quadro do packshot, essa fatia cai em cima da lente — e o cartao passa a
// mostrar sete ampliacoes do mesmo pedaco de camera, em sete cores, no lugar
// de sete cameras. Relatado pelo cliente ("a foto do polen ainda ta errada") e
// confirmado na captura.
//
// A SAIDA E contain, E ELA SO FUNCIONA COM ESTA COR. Contido, o packshot passa
// a caber inteiro na largura da faixa e sobra vao acima e abaixo dele. Sem
// fundo, esse vao mostraria o carvao do cartao e o leque viraria sete selos
// flutuando. Com a cor da variante — a MESMA que o veu e o anel do swatch ja
// usam, amostrada do proprio packshot — a faixa fica solida de cima a baixo e
// a emenda com o fundo da foto e invisivel. Sete bandas de cor com uma camera
// inteira em cada: e o que o titulo "7 cores. Uma decisao." promete.
//
// Vale tambem no estado aberto, e ali resolve outro defeito: com contain e sem
// cor, a foto expandida ficava com tarjas escuras nas laterais.
function cssLeque() {
  const alt = ['#F4B233', '#DADADA', '#EF6C29', '#5F2D0B', '#2B2B2B', '#FBBAB6', '#303F1C'];
  return POLEN.cores.map((c, i) => {
    const cor = polenUI.corDoTile(c.img, alt[i] || '#2B251C');
    return '.mel-polen-troca img[data-i="' + i + '"]{ background-color:' + cor + ' }';
  }).join('\n');
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

module.exports = { aplicar, tira, cssCores, cssLeque, TITULO, EYEBROW, CTA };

if (require.main === module) console.log(aplicar().join('\n'));
