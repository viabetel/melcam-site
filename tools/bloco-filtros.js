// A coluna 3 da grade da home deixa de ser "Sobre Nós" e vira os 8 FILTROS.
// 14/08/2026.
//
//   node tools/bloco-filtros.js          (aplica)
//   node tools/bloco-filtros.js --ver    (só relata)
//
// POR QUE
// O "Sobre Nós" saiu da grade para virar faixa própria mais abaixo, no lugar
// que uma home de e-commerce reserva para ele. Só que tirar o card e deixar a
// coluna vazia quebrou o mosaico do template: a grade é de três colunas com
// alturas alternadas (481/277, 481/277, 773) e o ritmo vem dessa alternância.
// Com quatro cards ela virou 2x2 simétrico e perdeu o movimento.
//
// Então a coluna 3 continua existindo, com a mesma caixa de 432x773, e recebe
// conteúdo que APOIA a proposta da seção. O título dela é "A câmera que vive
// com você": as colunas 1 e 2 dizem QUAIS são as câmeras, a 3 passa a dizer o
// que elas FAZEM. É o argumento comum às duas linhas.
//
// O ASSET JÁ EXISTE E É PERFEITO PARA ISSO
// `melcam/img/filtros/` traz oito fotos da MESMA CENA (Pão de Açúcar, Praia
// Vermelha) com os oito filtros aplicados. Trocar a foto no hover de cada nome
// mostra o efeito real, na mesma imagem — que é exatamente o que um seletor de
// filtro deveria fazer.
//
// 🟡 O MAPEAMENTO NOME→ARQUIVO SAIU DE MEDIÇÃO, NÃO DA ORDEM DOS ARQUIVOS.
// Os nomes vêm de melcam.config.json (Retro, Mono, Natural, Polar, Vintage,
// Filmic, Noir, Boost) e os arquivos são filter-f1..f8. Casar por ordem daria
// "Mono" numa foto azul saturada. Medido R/G/B, saturação e temperatura de
// cada uma:
//
//   f7  sat 1,9%  ................ preto e branco suave  -> Mono
//   f8  sat 0,0%  contraste maior . preto e branco duro   -> Noir
//   f4  R-B +14, único quente ..... sépia                 -> Vintage
//   f2  sat 35,7%  R-B -50 ........ céu e mar realçados   -> Polar
//   f6  sat 28,5%  R-B -36 ........ saturação alta        -> Boost
//   f5  R-B -19 com R alto ........ rosado, lavado        -> Retro
//   f1  sat 17,6%  R-B -9 ......... o mais neutro         -> Natural
//   f3  sat 20,6%  R-B -25 ........ frio discreto         -> Filmic
//
// É inferência a partir da imagem, não informação que o cliente deu. Se ele
// confirmar outra correspondência, muda só a tabela abaixo.
//
// Idempotente: se o card já tiver os filtros, não faz nada.
const fs = require('fs');
const path = require('path');

const SITE = path.resolve(__dirname, '..');
const VER = process.argv.includes('--ver');
const MARCA = 'data-mel-filtros';

const EYEBROW = 'Na própria câmera';
const TITULO = '8 filtros. Nenhum aplicativo.';
const LINHA = 'A mesma cena, oito revelações. Escolha na câmera, antes do clique — e não depois, no celular.';

// nome do config -> arquivo, pelo que a medição mostrou (ver cabeçalho)
const FILTROS = [
  { nome: 'Natural', img: '/melcam/img/filtros/filter-f1.jpg' },
  { nome: 'Retro',   img: '/melcam/img/filtros/filter-f5.jpg' },
  { nome: 'Vintage', img: '/melcam/img/filtros/filter-f4.jpg' },
  { nome: 'Filmic',  img: '/melcam/img/filtros/filter-f3.jpg' },
  { nome: 'Polar',   img: '/melcam/img/filtros/filter-f2.jpg' },
  { nome: 'Boost',   img: '/melcam/img/filtros/filter-f6.jpg' },
  { nome: 'Mono',    img: '/melcam/img/filtros/filter-f7.jpg' },
  { nome: 'Noir',    img: '/melcam/img/filtros/filter-f8.jpg' },
];

function conteudo() {
  const fotos = FILTROS.map((f, i) =>
    `<img src="${f.img}" data-i="${i}" alt="${i === 0 ? 'A mesma paisagem do Rio de Janeiro, com o filtro ' + f.nome : ''}" loading="lazy" decoding="async" width="1080" height="1080">`
  ).join('');

  const nomes = FILTROS.map((f, i) =>
    `<span class="mel-filtro-nome" data-i="${i}">${f.nome}</span>`
  ).join('');

  return `<span class="mel-filtros-cena" ${MARCA}="1" aria-hidden="true">${fotos}</span>`
    + `<div class="mel-filtros-tira" ${MARCA}="1">`
    +   `<span class="mel-filtros-lista" role="img" aria-label="Os 8 filtros da Melcam: ${FILTROS.map(f => f.nome).join(', ')}.">${nomes}</span>`
    + `</div>`;
}

// Recorta um <a ...>...</a> com contagem equilibrada.
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

// 🔴 A APLICACAO MORA NUMA FUNCAO, e nao no corpo do modulo. A primeira
// versao executava ao ser carregada: quem desse require so para ler a
// tabela FILTROS acabava aplicando o HTML e saindo com process.exit(0).
function aplicar() {
  const arq = path.join(SITE, 'index.html');
  const antes = fs.readFileSync(arq, 'utf8');
  let html = antes;
  const feito = [];
  let tocados = 0;

  if (html.indexOf(MARCA) >= 0) {
    console.log('[--] index.html: filtros já presentes, nada a fazer');
    process.exit(0);
  }

  // De trás para frente: os índices não se movem a cada edição.
  const abre = /<a[^>]*data-framer-name="Sobre Nós"[^>]*>/g;
  const pos = [];
  let m;
  while ((m = abre.exec(html))) pos.push(m.index);

  for (let i = pos.length - 1; i >= 0; i--) {
    const ini = pos[i];
    const fim = recortarA(html, ini);
    if (fim < 0) { feito.push('card em ' + ini + ': fechamento não encontrado'); continue; }
    let bloco = html.slice(ini, fim);

    const h3 = /(<h3\b[^>]*>)Sobre Nós(<\/h3>)/;
    if (!h3.test(bloco)) { feito.push('card em ' + ini + ': <h3>Sobre Nós</h3> não encontrado'); continue; }

    // 1. eyebrow + título novo
    bloco = bloco.replace(h3, `<p class="mel-filtros-eyebrow" ${MARCA}="1">${EYEBROW}</p>$1${TITULO}$2`);

    // 2. a linha de apoio, no lugar do parágrafo institucional
    bloco = bloco.replace(/(<p class="framer-text[^"]*"[^>]*>)[^<]*Marca brasileira[^<]*(<\/p>)/g,
      `$1${LINHA}$2`);

    // 3. o card passa a levar para a /polen, que é onde os filtros vivem
    bloco = bloco.replace(/(<a\b[^>]*?)\shref="\/sobre"/, '$1 href="/polen"');

    // 4. a cena e a lista, como filhos diretos do <a> — a mesma regra do
    //    bloco-polen.js: pendurar num container de variante SSR daria 0x0 num
    //    dos breakpoints.
    const fechaA = bloco.lastIndexOf('</a>');
    if (fechaA < 0) { feito.push('card em ' + ini + ': </a> não encontrado'); continue; }
    bloco = bloco.slice(0, fechaA) + conteudo() + bloco.slice(fechaA);

    html = html.slice(0, ini) + bloco + html.slice(fim);
    tocados++;
  }

  if (!tocados) {
    console.error('index.html: nenhum card "Sobre Nós" encontrado, NADA gravado');
    feito.forEach((f) => console.error('  - ' + f));
    process.exit(1);
  }

  const conta = (s, t) => (s.match(new RegExp(t, 'g')) || []).length;
  const okA = conta(antes, '<a\\b') === conta(html, '<a\\b');
  const okSec = conta(antes, '<section\\b') === conta(html, '<section\\b');
  const okImg = conta(html, '<img\\b') - conta(antes, '<img\\b') === tocados * FILTROS.length;
  const okBal = conta(html, '<div\\b') - conta(html, '</div>') === conta(antes, '<div\\b') - conta(antes, '</div>');

  if (!(okA && okSec && okImg && okBal)) {
    console.error('index.html: guarda falhou, NADA gravado — ' + JSON.stringify({ okA, okSec, okImg, okBal, tocados }));
    process.exit(1);
  }

  if (!VER) fs.writeFileSync(arq, html, 'utf8');
  console.log((VER ? '[ver] ' : '[ok]  ') + 'index.html: ' + tocados + ' variante(s) do card virou filtros — '
    + '"' + TITULO + '" + ' + FILTROS.length + ' cenas');
  console.log('  guardas: <a> e <section> inalterados, +' + (tocados * FILTROS.length) + ' img, balanço de div preservado');

}

module.exports = { aplicar, FILTROS, TITULO, EYEBROW, LINHA };

if (require.main === module) aplicar();
