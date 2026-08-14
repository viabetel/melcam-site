// Põe o CSS crítico inline no <head> das páginas internas já geradas.
//
// A fonte da regra é tools/paginas.js (SO_HOME + injetarCritico). Esta
// ferramenta existe porque os .html do projeto não podem ser regerados em
// massa hoje — paginas.aplicar() reconstrói tudo a partir do index.html e
// apenda CSS, então a regra do handoff vale: editar a FONTE e o BUILD.
//
// Idempotente: injetarCritico remove o bloco antigo antes de inserir o novo,
// então rodar de novo devolve o arquivo byte a byte igual. Provado no fim.
//
//   node tools/critico-internas.js
const fs = require('fs');
const path = require('path');
const paginas = require('./paginas.js');

const SITE = path.resolve(__dirname, '..');
const PAGINAS = ['polen.html', 'bee.html', 'acessorios.html', 'sobre.html', 'sacola.html', '404.html'];

const conta = (s, re) => (s.match(re) || []).length;

// O documento não pode ganhar nem perder um nó. O bloco crítico é um <style>
// no <head>: ele acrescenta exatamente 1 <style>, e mais nada.
function medir(s) {
  return {
    div: conta(s, /<div\b/g) - conta(s, /<\/div>/g),
    section: conta(s, /<section\b/g) - conta(s, /<\/section>/g),
    header: conta(s, /<header\b/g) - conta(s, /<\/header>/g),
    style: conta(s, /<style\b/g),
    styleFecha: conta(s, /<\/style>/g),
    body: (s.match(/<body[^>]*>/i) || [''])[0],
    h1: conta(s, /<h1\b/g),
    link: conta(s, /<link\b/g),
    script: conta(s, /<script\b/g),
  };
}

let falhas = 0;
for (const arq of PAGINAS) {
  const p = path.join(SITE, arq);
  if (!fs.existsSync(p)) { console.log(`[PULOU] ${arq} — não existe`); continue; }
  const antes = fs.readFileSync(p, 'utf8');

  if (!/<body[^>]*class="[^"]*mel-interna/i.test(antes)) {
    console.log(`[PULOU] ${arq} — não é mel-interna`);
    continue;
  }

  const depois = paginas.injetarCritico(antes);

  // Guardas antes de gravar. Se qualquer uma falhar, o arquivo não é tocado.
  const a = medir(antes), b = medir(depois);
  const jaTinha = antes.includes('<style data-mel="critico">');
  const erros = [];
  if (b.div !== a.div) erros.push(`balanço de <div> mudou (${a.div} → ${b.div})`);
  if (b.section !== a.section) erros.push(`balanço de <section> mudou (${a.section} → ${b.section})`);
  if (b.header !== a.header) erros.push(`balanço de <header> mudou (${a.header} → ${b.header})`);
  if (b.body !== a.body) erros.push('a tag <body> mudou');
  if (b.h1 !== a.h1) erros.push(`número de <h1> mudou (${a.h1} → ${b.h1})`);
  if (b.link !== a.link) erros.push('número de <link> mudou');
  if (b.script !== a.script) erros.push('número de <script> mudou');
  if (b.style !== a.style + (jaTinha ? 0 : 1)) erros.push(`<style> esperado ${a.style + (jaTinha ? 0 : 1)}, veio ${b.style}`);
  if (b.style !== b.styleFecha) erros.push('<style> desbalanceado');
  if (conta(depois, /<style data-mel="critico">/g) !== 1) erros.push('bloco crítico duplicado');
  if (depois.indexOf('<style data-mel="critico">') > depois.indexOf('</head>')) erros.push('bloco crítico caiu fora do <head>');

  // Idempotência provada, não afirmada: aplicar duas vezes tem que dar o mesmo.
  if (paginas.injetarCritico(depois) !== depois) erros.push('não é idempotente');

  if (erros.length) {
    console.log(`[FALHOU] ${arq}: ${erros.join(' · ')}`);
    falhas++;
    continue;
  }

  if (depois === antes) { console.log(`[IGUAL]  ${arq} — já estava em dia`); continue; }
  fs.writeFileSync(p, depois, 'utf8');
  console.log(`[OK]     ${arq} — +${depois.length - antes.length} bytes, crítico no topo do <head>`);
}

process.exit(falhas ? 1 : 0);
