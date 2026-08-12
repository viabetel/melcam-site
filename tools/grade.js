// Corrige a grade de produtos da home ("Header Grids").
//
// O problema: rotulo e imagem estavam descolados. As imagens vinham de
// tools/imagens.js, trocadas por HASH do Framer (posicao no template), e os
// nomes vinham de tools/aplicar.js, trocados por replace global cego — dai
// "Polen Verde" com foto de Polen branca, e "Sobre Nos" virando nome de camera.
//
// A correcao: cada card passa a ser preenchido a partir de UM objeto de
// melcam.config.json > produtos, onde nome, imagem e preco vivem juntos e nao
// tem como divergir.
//
// Regra dura: NAO substituir o card. A raiz dele e .framer-a0g3Z, a mesma
// classe do appear-id zfsne5 — a unica appear animation declarada no template
// (ver MOTION_SPEC.md). Trocar o card por markup proprio mataria essa animacao.
// Aqui so se reescreve o conteudo de dentro.
const fs = require('fs');
const path = require('path');

const SITE = path.resolve(__dirname, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(SITE, 'melcam.config.json'), 'utf8'));

// ------------------------------------------------------------ catalogo real
function catalogo() {
  const itens = [];
  const p = cfg.produtos.polen;
  const b = cfg.produtos.bee;

  p.cores.forEach((c) => itens.push({
    nome: `${p.nome} ${c.nome}`,
    img: c.img,
    alt: `Câmera ${p.nome} ${c.nome}`,
    preco: p.preco,
    variantes: p.cores.length,
    href: '/polen',
  }));

  (b.cores || b.modelos || []).forEach((c) => itens.push({
    nome: c.nome.startsWith(b.nome) ? c.nome : `${b.nome} ${c.nome}`,
    img: c.img,
    alt: `Câmera ${c.nome.startsWith(b.nome) ? c.nome : b.nome + ' ' + c.nome}`,
    preco: b.preco,
    variantes: (b.cores || b.modelos || []).length,
    href: '/bee',
  }));

  return itens;
}

const PROD = catalogo();

function plural(n) {
  return n === 1 ? '1 cor disponível' : `${n} cores disponíveis`;
}

// ------------------------------------------------------------ reescrita
// Cada bloco de card no HTML publicado tem, nesta ordem:
//   <p> selo de estoque · <h5> nome · <p> desconto · <h6> preco ·
//   <h6> preco antigo · <p> "N cores disponiveis"
// mais um <img> com src e alt.
//
// Selo, desconto e preco riscado sao dado INVENTADO, herdado do template
// (COMETICA). Nao ha estoque, nem promocao, nem preco antigo em lugar nenhum do
// briefing. Entao saem: o selo vira o produto ("Polen" / "Bee"), e desconto e
// preco antigo ficam vazios, que o CSS colapsa.
function reescrever(html, contador) {
  // A raiz do card e um <a>, nao um <div>, e carrega o proprio
  // data-framer-appear-id="zfsne5". O `"` fechando o nome evita casar com o
  // container "Section Card Produtos".
  const marca = /<a[^>]*data-framer-name="Card Produtos"[^>]*>/g;
  const inicios = [];
  let m;
  while ((m = marca.exec(html))) inicios.push(m.index);
  if (!inicios.length) return { html, n: 0 };

  let saida = '';
  let cursor = 0;
  let n = 0;

  for (let i = 0; i < inicios.length; i++) {
    const ini = inicios[i];
    const fim = i + 1 < inicios.length ? inicios[i + 1] : html.length;
    saida += html.slice(cursor, ini);
    let bloco = html.slice(ini, fim);

    // Sao 19 posicoes no template para 9 produtos reais. O cliente pediu os 9,
    // sem repetir: os excedentes saem de cena.
    //
    // Esconder, e nao recortar do DOM: o card e o elemento com
    // data-framer-appear-id="zfsne5". Remover no HTML significaria mexer na
    // estrutura que o MOTION_SPEC manda preservar, e um dia esses slots voltam
    // a ser uteis (o catalogo cresce). display:none nao anima nem ocupa espaco.
    if (contador.i >= PROD.length) {
      const bl = html.slice(ini, fim);
      saida += bl.replace(/(<a\b[^>]*?)\sstyle="([^"]*)"/, '$1 style="$2;display:none" data-mel-excedente="1"');
      cursor = fim;
      contador.escondidos++;
      continue;
    }

    const p = PROD[contador.i];
    contador.i++;
    n++;

    // 1. imagem: src (todas as variantes de srcset tambem) e alt
    bloco = bloco.replace(/(<img\b[^>]*?)\ssrc="[^"]*"/g, `$1 src="${p.img}"`);
    bloco = bloco.replace(/(<img\b[^>]*?)\ssrcset="[^"]*"/g, `$1 srcset="${p.img} 800w"`);
    bloco = bloco.replace(/(<img\b[^>]*?)\salt="[^"]*"/g, `$1 alt="${p.alt}"`);

    // 2. textos, na ordem em que aparecem no card
    let vezP = 0;
    bloco = bloco.replace(/(<p\b[^>]*class="framer-text[^"]*"[^>]*>)([\s\S]*?)(<\/p>)/g, (t, ab, _c, fe) => {
      vezP++;
      if (vezP === 1) return ab + (p.href === '/bee' ? 'Bee' : 'Polen') + fe; // era o selo de estoque
      if (vezP === 2) return ab + fe;                                        // era "50%": sai
      if (vezP === 3) return ab + plural(p.variantes) + fe;
      return t;
    });

    bloco = bloco.replace(/(<h5\b[^>]*>)([\s\S]*?)(<\/h5>)/g, `$1${p.nome}$3`);

    let vezH6 = 0;
    bloco = bloco.replace(/(<h6\b[^>]*>)([\s\S]*?)(<\/h6>)/g, (t, ab, _c, fe) => {
      vezH6++;
      if (vezH6 === 1) return ab + p.preco + fe;
      if (vezH6 === 2) return ab + fe;   // preco antigo riscado: sai
      return t;
    });

    // 3. o card inteiro leva para a pagina do produto
    bloco = bloco.replace(/(<a\b[^>]*?)\shref="[^"]*"/g, `$1 href="${p.href}"`);

    saida += bloco;
    cursor = fim;
  }
  saida += html.slice(cursor);
  return { html: saida, n };
}

function aplicar() {
  const paginas = ['index.html', 'polen.html', 'bee.html', 'acessorios.html',
                   'sobre.html', 'sacola.html', '404.html'];
  const feito = [];
  for (const nome of paginas) {
    const arq = path.join(SITE, nome);
    if (!fs.existsSync(arq)) continue;
    const antes = fs.readFileSync(arq, 'utf8');
    const contador = { i: 0, escondidos: 0 };
    const { html, n } = reescrever(antes, contador);
    if (n && html !== antes) {
      fs.writeFileSync(arq, html, 'utf8');
      feito.push(`${nome}: ${n} cards com produto, ${contador.escondidos} escondidos`);
    }
  }
  return feito;
}

module.exports = { aplicar, catalogo, PROD };

if (require.main === module) {
  console.log(`catalogo real: ${PROD.length} produtos`);
  PROD.forEach((p, i) => console.log(`  ${String(i + 1).padStart(2)}. ${p.nome.padEnd(16)} ${p.preco.padEnd(10)} ${p.img}`));
  console.log('\n' + aplicar().join('\n'));
}
