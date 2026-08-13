// Move o conteudo das paginas internas para fora das ssr-variant.
//
// MESMO DEFEITO que o mover-secoes.js corrigiu na home, em outro lugar.
//
// tools/paginas.js gerava com s.replace(/(<footer)/), que pega o PRIMEIRO dos
// tres <footer> do template — e esse mora dentro de
// <div class="ssr-variant hidden-1g8fb3q hidden-wq5psc">, que e display:none
// fora do desktop. Medido em 13/08/2026 no /polen mobile:
//
//   div.mel-barra                              display:block    h=0
//   div.framer-8hdwjm-container                display:contents h=0
//   div.ssr-variant hidden-1g8fb3q hidden-...  display:NONE     h=0
//   header.framer-vrbx7h                       display:flex     h=3995
//
// Resultado: as SEIS internas ficavam com nav e rodape e mais nada no tablet e
// no mobile. As alturas eram identicas — 3995px nas seis, contra 9852 do
// /polen no desktop —, que e a assinatura de conteudo que nao renderiza.
//
// Passou despercebido ate agora porque o hero da home vazava para as internas e
// enchia a tela. Ao esconder o hero (SO_HOME ganhou "Header Section"), sobrou a
// pagina vazia, e o defeito de baixo apareceu.
//
// A correcao: recolocar o bloco como filho direto do stack (o
// <header class="framer-vrbx7h">, flex column), depois de todas as variantes.
// Fora de variante, renderiza nos tres breakpoints. Nada e removido do DOM:
// e recorte e recolagem, com conferencia de balanco antes de gravar.
//
// Idempotente: se o bloco ja estiver fora da variante, nao mexe.
const fs = require('fs');
const path = require('path');

const SITE = path.resolve(__dirname, '..');

// Cada interna e ancorada pela tag de abertura do proprio conteudo, que e unica
// no arquivo. Nao da para comparar o conteudo inteiro contra o gerador: rotas.js
// e imagens.js reescreveram href e src depois da geracao, entao o texto diverge.
// A tag de abertura, essa, sobreviveu intacta nas seis.
const PAGINAS = [
  // 13/08/2026: a barra fixa saiu da Polen, então a âncora passou a ser o hero,
  // que é o primeiro bloco da página agora.
  ['polen.html',      '<section class="mel-ph" data-mel="polen-hero"'],
  ['bee.html',        '<div class="mel-barra" data-mel="barra-produto">'],
  ['acessorios.html', '<section class="mel-sec mel-embreve" aria-labelledby="mel-ac-tit">'],
  ['sobre.html',      '<section class="mel-sec" aria-labelledby="mel-sob-tit">'],
  ['sacola.html',     '<section class="mel-sec" aria-labelledby="mel-sac-tit">'],
  ['404.html',        '<section class="mel-sec mel-404" aria-labelledby="mel-404-tit">'],
];

// Conta abre/fecha de div e section num trecho. O bloco recortado tem que estar
// equilibrado nos dois, senao o recorte pegou no meio de uma estrutura — foi
// esse o erro registrado em "nao recortar DOM por regex".
function balanco(html) {
  const par = (t) => [
    (html.match(new RegExp('<' + t + '\\b', 'g')) || []).length,
    (html.match(new RegExp('</' + t + '>', 'g')) || []).length,
  ];
  const [da, df] = par('div');
  const [sa, sf] = par('section');
  return { div: da + '/' + df, section: sa + '/' + sf, ok: da === df && sa === sf };
}

// Indice do </header> que fecha o <header class="...framer-vrbx7h...">.
function fimDoStack(html) {
  const abertura = /<header[^>]*class="[^"]*framer-vrbx7h[^"]*"[^>]*>/.exec(html);
  if (!abertura) return -1;
  const re = /<(\/?)header\b[^>]*>/g;
  re.lastIndex = abertura.index;
  let prof = 0, t;
  while ((t = re.exec(html))) {
    prof += t[1] ? -1 : 1;
    if (prof === 0) return t.index;
  }
  return -1;
}

function aplicar() {
  const feito = [];

  for (const [nome, ancora] of PAGINAS) {
    const arq = path.join(SITE, nome);
    if (!fs.existsSync(arq)) { feito.push(nome + ': ausente'); continue; }
    const antes = fs.readFileSync(arq, 'utf8');

    const ini = antes.indexOf(ancora);
    if (ini < 0) { feito.push(nome + ': âncora não encontrada, nada movido'); continue; }
    if (antes.indexOf(ancora, ini + 1) >= 0) {
      feito.push(nome + ': âncora aparece mais de uma vez, nada movido'); continue;
    }

    const fi = antes.indexOf('<footer', ini);
    if (fi < 0) { feito.push(nome + ': <footer> depois da âncora não encontrado'); continue; }

    const bloco = antes.slice(ini, fi);
    const b = balanco(bloco);
    if (!b.ok) {
      feito.push(nome + ': bloco desbalanceado (div ' + b.div + ', section ' + b.section + '), nada movido');
      continue;
    }

    const resto = antes.slice(0, ini) + antes.slice(fi);
    const corte = fimDoStack(resto);
    if (corte < 0) { feito.push(nome + ': fim do stack não encontrado, nada movido'); continue; }
    if (corte < ini) {
      // O bloco ja esta depois do stack: nada a fazer.
      feito.push(nome + ': já está fora da variante');
      continue;
    }

    const depois = resto.slice(0, corte) + bloco + resto.slice(corte);

    // Conferencia final: o documento inteiro tem que manter o mesmo balanco de
    // antes. Mover nao pode criar nem perder tag nenhuma.
    const ba = balanco(antes), bd = balanco(depois);
    if (ba.div !== bd.div || ba.section !== bd.section) {
      feito.push(nome + ': balanço mudou (' + ba.div + ' -> ' + bd.div + '), NÃO gravado');
      continue;
    }
    if (depois.length !== antes.length) {
      feito.push(nome + ': tamanho mudou, NÃO gravado');
      continue;
    }

    fs.writeFileSync(arq, depois, 'utf8');
    feito.push(nome + ': ' + bloco.length + ' chars movidos para o stack (div ' + b.div + ', section ' + b.section + ')');
  }

  return feito;
}

module.exports = { aplicar, PAGINAS };

if (require.main === module) console.log(aplicar().join('\n'));
