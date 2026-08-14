// Enriquece o BLOCO BEE da home (o card <a data-framer-name="Bee"> dentro do
// Header Grid) e inverte o peso dele com o card de Acessórios.
//
// POR QUE
// Medido em 14/08/2026, no desktop: o card da Bee tinha 432x277 e carregava a
// palavra "Bee", o selo "Novidade" e uma foto. Nada mais. O card da Polen ao
// lado, 432x481, trazia eyebrow, conceito, as 7 cores em packshot, o preço e um
// CTA. A Bee é o LANÇAMENTO — o <h1> do hero da home é "Chegou a Bee" — e era o
// card com menos informação da seção. O preço dela (R$ 299,00) existia em
// melcam.config.json e não aparecia em lugar nenhum da home.
//
// O QUE ESTA FERRAMENTA FAZ
//   1. insere o parágrafo de conceito, com a copy já aprovada da /bee;
//   2. acrescenta a tira de rodapé: as 2 cores em packshot oficial, o preço e
//      o CTA.
// O <a>, suas classes framer-*, o <h3> "Bee", o selo e a foto ficam intactos.
//
// A INVERSÃO DE TAMANHO É CSS, e mora em tools/identidade.js — não aqui.
// A altura dos cards vem de aspect-ratio: 0.897959 no grande (481px) e 1.55752
// no pequeno (277px), sobre 432px de largura. Trocar os dois entre a Bee e o
// Acessórios mantém a soma da coluna em 773px e não mexe no layout das outras.
//
// POR QUE A BEE NÃO GANHA EYEBROW COMO A POLEN
// O eyebrow da Polen fica em top:1.25rem left:1.25rem, e é exatamente onde o
// selo "Novidade" da Bee já está (identidade.js, a[data-framer-name="Bee"]::before).
// Empilhar os dois no mesmo canto seria colisão. Na Bee quem faz o papel de
// etiqueta é o selo, e o nome continua no <h3>, grande e centralizado.
//
// SEM LINK ANINHADO: o CTA é um <span>, não um <a>. O bloco inteiro já é o link.
//
// SÓ A HOME: escreve apenas em index.html, como o bloco-polen.js. As internas
// também têm Header Grid e não podem mudar.
//
// Idempotente: se a tira já existir, não faz nada.
const fs = require('fs');
const path = require('path');

const SITE = path.resolve(__dirname, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(SITE, 'melcam.config.json'), 'utf8'));
const BEE = cfg.produtos.bee;

// Copy aprovada, a mesma do <h1> da /bee (tools/bee.js). Não é frase nova:
// é a promessa do produto, repetida onde a decisão de compra começa.
const CONCEITO = 'Pequena o bastante para ir junto.';
const CTA = 'Conheça a Bee';

const MARCA = 'data-mel-bee-card';

function tira() {
  const minis = BEE.cores.map(c =>
    `<img src="${c.img}" alt="" loading="lazy" decoding="async" width="800" height="800">`
  ).join('');

  // Mesma regra da Polen: as miniaturas são decorativas e a cor nunca é a única
  // portadora da informação — a contagem vai no aria-label e o preço em texto.
  const nomes = BEE.cores.map(c => c.nome).join(' e ');
  const quantas = BEE.cores.length === 1 ? '1 cor' : BEE.cores.length + ' cores';

  return `<div class="mel-bee-tira" ${MARCA}="1">` +
    `<span class="mel-bee-cores" role="img" aria-label="As ${quantas} da Bee: ${nomes}.">${minis}</span>` +
    `<span class="mel-bee-linha">` +
      `<span class="mel-bee-preco">${BEE.preco}</span>` +
      `<span class="mel-bee-cta">${CTA}</span>` +
    `</span>` +
  `</div>`;
}

// Recorta um <a ...>...</a> a partir de um índice, com contagem equilibrada.
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
  if (antes.indexOf(MARCA) >= 0) return ['index.html: tira da Bee já presente, nada a fazer'];

  let html = antes;
  const feito = [];
  let tocados = 0;

  // De trás para frente, para os índices não se moverem a cada inserção.
  const abre = /<a[^>]*data-framer-name="Bee"[^>]*>/g;
  const pos = [];
  let m;
  while ((m = abre.exec(html))) pos.push(m.index);

  for (let i = pos.length - 1; i >= 0; i--) {
    const ini = pos[i];
    const fecha = recortarA(html, ini);
    if (!fecha) { feito.push('card em ' + ini + ': fechamento não encontrado, pulado'); continue; }
    let bloco = html.slice(ini, fecha.fim);

    const h3 = /<h3\b[^>]*>Bee<\/h3>/;
    if (!h3.test(bloco)) { feito.push('card em ' + ini + ': <h3>Bee</h3> não encontrado, pulado'); continue; }

    // 1. o conceito, logo depois do <h3>, dentro do mesmo RichTextContainer:
    //    é onde o parágrafo do card grande da Polen vive.
    bloco = bloco.replace(h3, (t) => t + `<p class="mel-bee-sub" ${MARCA}="1">${CONCEITO}</p>`);

    // 2. a tira como FILHO DIRETO do <a>, logo antes do </a>.
    //
    // ⚠️ Mesma armadilha documentada no bloco-polen.js: NÃO pendurar no
    // container de texto. Há um por variante SSR e só um renderiza por
    // breakpoint — pendurada ali, a tira dá 0x0 no desktop. Filho direto do <a>
    // fica fora de qualquer variante e vale nos três.
    const fechaA = bloco.lastIndexOf('</a>');
    if (fechaA < 0) { feito.push('card em ' + ini + ': </a> não encontrado, pulado'); continue; }
    bloco = bloco.slice(0, fechaA) + tira() + bloco.slice(fechaA);

    html = html.slice(0, ini) + bloco + html.slice(fecha.fim);
    tocados++;
  }

  if (!tocados) { feito.push('index.html: nenhum card Bee encontrado, NADA gravado'); return feito; }

  // Guardas: só pode ter entrado o que a ferramenta escreve.
  const conta = (s, t) => (s.match(new RegExp(t, 'g')) || []).length;
  const okA = conta(antes, '<a\\b') === conta(html, '<a\\b');
  const okSec = conta(antes, '<section\\b') === conta(html, '<section\\b');
  const okDiv = conta(html, '<div\\b') - conta(antes, '<div\\b') === tocados;
  const okImg = conta(html, '<img\\b') - conta(antes, '<img\\b') === tocados * BEE.cores.length;
  const okBal = conta(html, '<div\\b') - conta(html, '</div>') === conta(antes, '<div\\b') - conta(antes, '</div>');

  if (!(okA && okSec && okDiv && okImg && okBal)) {
    return ['index.html: guarda falhou, NADA gravado — ' +
      JSON.stringify({ okA, okSec, okDiv, okImg, okBal, tocados })];
  }

  fs.writeFileSync(arq, html, 'utf8');
  feito.push('index.html: ' + tocados + ' variante(s) do card Bee enriquecida(s) — ' +
    '"' + CONCEITO + '" + ' + BEE.cores.length + ' cores + ' + BEE.preco + ' + CTA');
  feito.push('  guardas: <a> e <section> inalterados, +' + tocados + ' div, +' +
    (tocados * BEE.cores.length) + ' img, balanço de div preservado');
  return feito;
}

module.exports = { aplicar, tira, CONCEITO, CTA };

if (require.main === module) console.log(aplicar().join('\n'));
