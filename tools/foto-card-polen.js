// A FOTO DO CARD PEQUENO DA POLEN — 15/08/2026.
//
//   node tools/foto-card-polen.js          (aplica)
//   node tools/foto-card-polen.js --ver    (só relata)
//
// POR QUE ESTE ARQUIVO EXISTE, e por que a troca não podia ser só CSS.
//
// O cartão "Polen" pequeno da grade tem 437x340. O container da foto é 437x437
// ancorado em y116 — ele TRANSBORDA o cartão, e só 224px ficam visíveis, numa
// janela de proporção 1,95. A foto que estava lá, polen-lp-1.jpg, é retrato
// 1125x1687 (0,67) com a câmera na diagonal ocupando 766x1046 do quadro.
//
// Três tentativas de object-position (50%, 70%, 88%) não resolveram, e não
// tinham como: object-position escolhe QUAL pedaço aparece, não o zoom. Com
// cover a foto é escalada pela largura e a câmera nunca cabe nos 224px.
//
// Trocar para contain fez a câmera caber inteira e criou outro defeito, este
// relatado pelo cliente: "afastou demais e ficou num formato bem nada a ver" —
// a foto contida renderiza 149x224 dentro de um cartão de 437, ou seja, uma
// tira retrato no meio de um cartão largo.
//
// O PROBLEMA É A ORIENTAÇÃO DO MATERIAL, e por isso a solução é o material.
// Uma janela de 1,95 não comporta um assunto de 0,73 sem encolher: câmera
// inteira e câmera grande são excludentes com uma foto retrato. Com um packshot
// PAISAGEM (1440x960, 1,5), o cover corta 23% na vertical e a câmera — que fica
// centrada e ocupa a faixa do meio — sobrevive inteira e grande.
//
// A escolhida é polen-04-dimensoes.jpg: câmera de frente, inteira, centrada,
// sobre o fundo escuro com favo que combina com o carvão do cartão. Ela já está
// no acervo e já é usada no scrollytelling da /polen, então não entra arquivo
// novo no deploy.
//
// ⚠️ SÃO DOIS CARTÕES COM data-framer-name="Polen" — o grande ("7 cores. Uma
// decisão.") e este. A troca é feita SÓ dentro do <a> que contém a foto antiga,
// nunca por arquivo inteiro: a mesma imagem aparece noutros lugares do site.
//
// Idempotente: reescrever o que já está escrito não muda nada.
const fs = require('fs');
const path = require('path');

const SITE = path.resolve(__dirname, '..');
const VER = process.argv.includes('--ver');

// 🔴 REVERTIDO EM 15/08/2026. O packshot frontal resolvia a geometria — camera
// inteira e grande — mas o cliente nao gostou da foto: "nao curti, coloca
// aquela outra mesmo que estava antes". A troca volta ao arquivo original.
// O aprendizado da passagem fica: o problema NAO era enquadramento, era
// orientacao. Uma landscape da MESMA cena resolve os dois lados, e o cliente
// vai gerar uma — quando ela chegar, e so trocar as duas constantes abaixo.
// 16/08/2026: chegou a landscape que o cliente gerou a partir da referencia —
// 2752x1536, proporcao 1,792, contra 1,95 da janela do cartao. O corte vertical
// cai de 33% (retrato) para 8%, e a camera cabe inteira sem enquadramento
// forcado. E a mesma cena da foto original: a Polen na caixa aberta, sobre as
// caixas amarelas com o padrao de favo e as etiquetas "Polen".
const ANTIGA = 'header-fileira/polen-lp-1.jpg';
const NOVA = 'polen-card-landscape.jpg';

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

function aplicar() {
  const arq = path.join(SITE, 'index.html');
  const antes = fs.readFileSync(arq, 'utf8');
  let html = antes;
  let trocas = 0;

  const abre = /<a[^>]*data-framer-name="Polen"[^>]*>/g;
  const pos = [];
  let m;
  while ((m = abre.exec(html))) pos.push(m.index);

  for (let i = pos.length - 1; i >= 0; i--) {
    const fim = recortarA(html, pos[i]);
    if (fim < 0) continue;
    const bloco = html.slice(pos[i], fim);
    if (bloco.indexOf(ANTIGA) < 0) continue;          // é o cartão grande
    const novo = bloco.split(ANTIGA).join(NOVA);
    if (novo === bloco) continue;
    html = html.slice(0, pos[i]) + novo + html.slice(fim);
    trocas++;
  }

  if (!trocas) return ['index.html: nada a trocar (já está em ' + NOVA + ')'];

  // Guardas: só o caminho de uma imagem pode ter mudado.
  const conta = (s, t) => (s.match(new RegExp(t, 'g')) || []).length;
  const okImg = conta(antes, '<img\\b') === conta(html, '<img\\b');
  const okA = conta(antes, '<a\\b') === conta(html, '<a\\b');
  const okDiv = conta(antes, '<div\\b') === conta(html, '<div\\b');
  if (!(okImg && okA && okDiv)) {
    return ['index.html: guarda falhou, NADA gravado — ' + JSON.stringify({ okImg, okA, okDiv })];
  }

  if (!VER) fs.writeFileSync(arq, html, 'utf8');
  return [(VER ? '[ver] ' : '[ok]  ') + 'index.html: foto do card pequeno da Polen em ' +
    trocas + ' variante(s) — ' + ANTIGA + ' -> ' + NOVA];
}

module.exports = { aplicar, ANTIGA, NOVA };

if (require.main === module) console.log(aplicar().join('\n'));
