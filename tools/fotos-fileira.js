// FOTOS DA FILEIRA DO HEADER — troca as paisagens por retratos. 14/08/2026.
//
//   node tools/fotos-fileira.js          (aplica)
//   node tools/fotos-fileira.js --ver    (só relata, não grava)
//
// O DEFEITO, MEDIDO
// A fileira é feita de cartões RETRATO 2:3 (480x720 no desktop, 240x360 em
// 1280) e as imagens entram com object-fit:cover e object-position 50% 50%.
// Medido nas dez fotos:
//
//   3 fotos em 0,67 (2:3 exato) ....... 0% de corte
//   3 fotos em 0,72–0,75 .............. 7% a 11% de corte
//   4 fotos da galeria da Polen, 4:3 .. 50% DA LARGURA jogada fora
//
// Metade da imagem descartada, e o que sobra é um recorte central arbitrário:
// assunto cortado ao meio, enquadramento sem intenção. É o que se lia como
// "bagunçado e cortado".
//
// A CORREÇÃO, E POR QUE ELA É DE ASSET E NÃO DE CSS
// Existe no projeto uma pasta chamada `header-fileira` — 16 fotos, TODAS
// 1600x2400, ou seja exatamente a proporção do cartão. Ela foi feita para esta
// fileira e a fileira não usava nenhuma delas. Então não se resolve isto com
// object-position nem com contain: resolve-se pondo no slot a foto que já
// existe e que nasceu na proporção certa. Corte final: 0%.
//
// 🔴 O REPLACE NÃO PODE SER GLOBAL.
// As quatro fotos da galeria aparecem de 9 a 13 vezes por arquivo, porque a
// galeria "Feitas com a Polen" da /polen usa as mesmas — e LÁ paisagem é o
// certo. Trocar por arquivo inteiro quebraria a /polen. Por isso a troca é
// recortada ao bloco .framer-dtlgl4, achando o fechamento por contagem de
// <div>, e é feita por POSIÇÃO na fileira, não por nome de arquivo.
//
// Idempotente: se o slot já tiver a foto nova, não faz nada.
const fs = require('fs');
const path = require('path');

const SITE = path.resolve(__dirname, '..');
const VER = process.argv.includes('--ver');

const PAGINAS = ['index.html', 'polen.html', 'bee.html', 'acessorios.html',
                 'sobre.html', 'sacola.html', '404.html'];

// Escolhas feitas olhando as 16 candidatas lado a lado, não pelo nome do
// arquivo. Dois critérios: proporção 2:3 (todas cumprem) e RITMO — a fileira
// alternava mal entre foto de gente e foto de objeto, e as quatro entradas
// arrumam isso. As já usadas em outros lugares do site ficaram de fora
// (bee-lp-06 e bee-lp-1237 no card "Sobre Nós", polen-lp-1 no card Polen).
const TROCAS = [
  { slot: 4,
    de: 'galeria-polen/polen-gallery-01.jpg',
    para: 'header-fileira/cards-01.jpg',
    alt: 'Detalhe da Polen marrom: o couro e a lente em primeiro plano' },
  { slot: 6,
    de: 'galeria-polen/polen-gallery-03.jpg',
    para: 'header-fileira/polen-lp-5.jpg',
    alt: 'Câmera Polen amarela vista de frente' },
  { slot: 7,
    de: 'galeria-polen/polen-gallery-06.jpg',
    para: 'header-fileira/bee-lp-1169.jpg',
    alt: 'Duas câmeras Bee na mão, com o mar do Rio de Janeiro ao fundo' },
  // 🟡 O slot 9 já foi trocado uma vez e teve de ser trocado de novo, e a
  // segunda troca só apareceu com o rodízio ligado: cards-19 (Bee sobre
  // girassóis) ficava a dois cartões de card-bee.jpg, que é OUTRA Bee sobre
  // girassóis. Na fileira parada isso não incomodava — os dois estão em pontas
  // opostas da sequência. Com o laço fechando, a ponta encosta no começo e as
  // duas passavam quase juntas, lendo como imagem repetida.
  // Por isso `de` aceita lista: o valor anterior E o intermediário.
  { slot: 9,
    de: ['galeria-polen/polen-gallery-04.jpg', 'header-fileira/cards-19.jpg'],
    para: 'header-fileira/bee-lp-0676.jpg',
    alt: 'Mesa de café com as câmeras Melcam sobre a toalha xadrez' },
];

// Recorta o bloco da fileira contando <div> até fechar. O regex não serve:
// são ~40 divs aninhadas e a primeira </div> não é a do bloco.
function blocoFileira(html) {
  const abre = html.indexOf('class="framer-dtlgl4"');
  if (abre < 0) return null;
  const ini = html.lastIndexOf('<div', abre);
  let i = ini, prof = 0;
  while (i < html.length) {
    const proxA = html.indexOf('<div', i);
    const proxF = html.indexOf('</div>', i);
    if (proxF < 0) return null;
    if (proxA >= 0 && proxA < proxF) { prof++; i = proxA + 4; }
    else {
      prof--; i = proxF + 6;
      if (prof === 0) return { ini, fim: i };
    }
  }
  return null;
}

let mudou = 0, intactos = 0;
const erros = [];

for (const pag of PAGINAS) {
  const arq = path.join(SITE, pag);
  let html = fs.readFileSync(arq, 'utf8');
  const b = blocoFileira(html);
  if (!b) { erros.push(pag + ': bloco .framer-dtlgl4 não encontrado'); continue; }

  let trecho = html.slice(b.ini, b.fim);
  const antes = trecho;

  // as <img> na ordem em que aparecem dentro da fileira
  const imgs = trecho.match(/<img\b[^>]*>/g) || [];
  const relato = [];

  for (const t of TROCAS) {
    const idx = t.slot - 1;
    const tag = imgs[idx];
    if (!tag) { erros.push(pag + ': slot ' + t.slot + ' não existe (a fileira tem ' + imgs.length + ' imagens)'); continue; }
    if (tag.includes(t.para)) { relato.push('slot ' + t.slot + ' já trocado'); intactos++; continue; }
    const aceitos = Array.isArray(t.de) ? t.de : [t.de];
    const atual = aceitos.find((d) => tag.includes(d));
    if (!atual) {
      erros.push(pag + ': slot ' + t.slot + ' não tem nenhuma de [' + aceitos.join(', ') + '] — não vou trocar às cegas');
      continue;
    }
    const novo = tag
      .split(atual).join(t.para)
      .replace(/alt="[^"]*"/, 'alt="' + t.alt + '"')
      // as dimensões do template descreviam a foto antiga (828x824, quase
      // quadrada). A nova é 1600x2400; sem corrigir, a proporção declarada
      // mente para o navegador antes da imagem chegar.
      .replace(/\bwidth="\d+"/, 'width="1600"')
      .replace(/\bheight="\d+"/, 'height="2400"');
    trecho = trecho.split(tag).join(novo);
    relato.push('slot ' + t.slot + ': ' + atual.split('/').pop() + ' -> ' + t.para.split('/').pop());
  }

  if (trecho !== antes) {
    html = html.slice(0, b.ini) + trecho + html.slice(b.fim);
    if (!VER) fs.writeFileSync(arq, html, 'utf8');
    mudou++;
  }
  console.log((VER ? '[ver] ' : '[ok]  ') + pag.padEnd(16) + (relato.length ? relato.join(' · ') : 'nada a fazer'));
}

// Prova: as fotos antigas continuam onde deviam continuar (a galeria da
// /polen), e a fileira não ficou com paisagem nenhuma.
console.log('');
for (const pag of ['index.html', 'polen.html']) {
  const html = fs.readFileSync(path.join(SITE, pag), 'utf8');
  const b = blocoFileira(html);
  const dentro = html.slice(b.ini, b.fim);
  const fora = html.slice(0, b.ini) + html.slice(b.fim);
  const lista = (t) => Array.isArray(t.de) ? t.de : [t.de];
  const paisagensNaFileira = TROCAS.filter((t) => lista(t).some((d) => dentro.includes(d))).length;
  const galeriaIntacta = TROCAS.filter((t) => lista(t).some((d) => d.startsWith('galeria-polen') && fora.includes(d))).length;
  console.log('  ' + pag.padEnd(14) + 'paisagens ainda na fileira: ' + paisagensNaFileira
    + '   |   as mesmas fotos fora da fileira (galeria): ' + galeriaIntacta + '/4');
}

if (erros.length) {
  console.error('\nPROBLEMAS:');
  erros.forEach((e) => console.error('  - ' + e));
  process.exit(1);
}
console.log('\n' + (VER ? 'nada gravado (--ver)' : mudou + ' arquivo(s) alterado(s)') + (intactos ? ', ' + intactos + ' slot(s) já estavam certos' : ''));
