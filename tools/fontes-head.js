// Põe o bloco de fontes no topo do <head> das 7 páginas já geradas.
//
// A fonte da verdade é tools/identidade.js (blocoFontes / injetarFontes). Esta
// ferramenta existe pela mesma razão que tools/critico-internas.js: os .html do
// projeto não podem ser regerados em massa hoje, então a regra do handoff vale
// — editar a FONTE e o BUILD.
//
// O bloco traz, nesta ordem:
//   1. <link rel="preload" as="font" type="font/otf" crossorigin> das faces que
//      aparecem acima da dobra DAQUELA página;
//   2. <link rel="stylesheet" href="/melcam/fonts/fontes.css">, que substituiu
//      o @import que morava dentro de melcam/identidade.css.
//
// Idempotente: injetarFontes remove o bloco anterior e qualquer <link> solto de
// fontes.css ou preload de /melcam/fonts/ antes de inserir. Provado no fim.
//
//   node tools/fontes-head.js
const fs = require('fs');
const path = require('path');
const ident = require('./identidade.js');

const SITE = path.resolve(__dirname, '..');
const PAGINAS = Object.keys(ident.PRELOAD_POR_PAGINA);

const conta = (s, re) => (s.match(re) || []).length;

function medir(s) {
  return {
    div: conta(s, /<div\b/g) - conta(s, /<\/div>/g),
    section: conta(s, /<section\b/g) - conta(s, /<\/section>/g),
    header: conta(s, /<header\b/g) - conta(s, /<\/header>/g),
    style: conta(s, /<style\b/g),
    script: conta(s, /<script\b/g),
    h1: conta(s, /<h1\b/g),
    body: (s.match(/<body[^>]*>/i) || [''])[0],
    identidade: conta(s, /href="\/melcam\/identidade\.css"/g),
    critico: conta(s, /<style data-mel="critico">/g),
  };
}

let falhas = 0;
for (const arq of PAGINAS) {
  const p = path.join(SITE, arq);
  if (!fs.existsSync(p)) { console.log(`[PULOU]  ${arq} — não existe`); continue; }
  const antes = fs.readFileSync(p, 'utf8');
  const depois = ident.injetarFontes(antes, arq);

  const a = medir(antes), b = medir(depois);
  const erros = [];
  if (b.div !== a.div) erros.push(`balanço de <div> mudou (${a.div} → ${b.div})`);
  if (b.section !== a.section) erros.push('balanço de <section> mudou');
  if (b.header !== a.header) erros.push('balanço de <header> mudou');
  if (b.style !== a.style) erros.push('número de <style> mudou');
  if (b.script !== a.script) erros.push('número de <script> mudou');
  if (b.h1 !== a.h1) erros.push('número de <h1> mudou');
  if (b.body !== a.body) erros.push('a tag <body> mudou');
  if (b.critico !== a.critico) erros.push('o bloco de CSS crítico foi afetado');

  // identidade.css tem que continuar EXATAMENTE uma vez e no FIM do <head>:
  // ela vence o CSS inline do Framer por ordem de fonte, e subi-la quebraria a
  // paleta inteira (ver o comentário do seletor ":root,body").
  if (b.identidade !== 1) erros.push(`href de identidade.css aparece ${b.identidade}x`);
  const iFontes = depois.indexOf('/melcam/fonts/fontes.css');
  const iIdent = depois.indexOf('/melcam/identidade.css');
  const iHead = depois.indexOf('</head>');
  if (iFontes < 0) erros.push('fontes.css não ficou no documento');
  if (iFontes > iIdent) erros.push('fontes.css ficou DEPOIS de identidade.css');
  if (iIdent > iHead) erros.push('identidade.css saiu do <head>');
  if (conta(depois, /href="\/melcam\/fonts\/fontes\.css"/g) !== 1) erros.push('fontes.css duplicada');

  const preloads = conta(depois, /<link rel="preload" as="font"/g);
  const esperados = ident.PRELOAD_POR_PAGINA[arq].length;
  if (preloads !== esperados) erros.push(`preloads: esperados ${esperados}, vieram ${preloads}`);
  for (const [href] of ident.PRELOAD_POR_PAGINA[arq]) {
    if (!fs.existsSync(path.join(SITE, href.replace(/^\//, '')))) erros.push(`preload aponta para arquivo inexistente: ${href}`);
  }
  // crossorigin em todo preload de fonte: sem ele o navegador baixa DUAS vezes.
  const semCors = (depois.match(/<link rel="preload" as="font"[^>]*>/g) || []).filter((l) => !/crossorigin/.test(l));
  if (semCors.length) erros.push(`${semCors.length} preload sem crossorigin`);

  if (ident.injetarFontes(depois, arq) !== depois) erros.push('não é idempotente');

  if (erros.length) { console.log(`[FALHOU] ${arq}: ${erros.join(' · ')}`); falhas++; continue; }
  if (depois === antes) { console.log(`[IGUAL]  ${arq} — já estava em dia`); continue; }
  fs.writeFileSync(p, depois, 'utf8');
  console.log(`[OK]     ${arq.padEnd(16)} ${preloads} preload + fontes.css no topo do <head>  (${depois.length - antes.length >= 0 ? '+' : ''}${depois.length - antes.length} bytes)`);
}

process.exit(falhas ? 1 : 0);
