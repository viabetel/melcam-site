// Sincroniza os DERIVADOS da /polen com as fontes, sem rodar aplicar().
//
//   node tools/build-polen.js
//
// POR QUE ESTE ARQUIVO EXISTE: tools/aplicar.js reconstrói o site inteiro a
// partir de _ORIGINAL/ e apagaria o trabalho de 12 e 13/08 (ver AGENTS.md), e
// paginas.aplicar() APENDA CSS em identidade.css — rodar de novo duplicaria o
// arquivo inteiro. Então aqui cada derivado é sincronizado sozinho, com
// fronteira verificada:
//
//   polen.html            regerado por paginas.gerar(), que é determinístico
//                         (provado em 13/08: regeração byte a byte idêntica)
//   melcam/interacoes.js  reescrito por hero-carrossel.js
//   melcam/identidade.css só o BLOCO da /polen é trocado, por marcador
const fs = require('fs');
const path = require('path');

const SITE = path.resolve(__dirname, '..');
const paginas = require('./paginas.js');
const polen = require('./polen.js');
const carrossel = require('./hero-carrossel.js');
const polenUI = require('./polen-interacoes.js');

// -------------------------------------------- 1. polen.html e bee.html
// As duas páginas de produto. Nasceu só com a polen em 13/08 e cresceu para a
// bee no mesmo dia, quando a Colméia saiu das duas — o bloco era o mesmo, e
// regerar uma sem a outra deixaria as duas fora de sincronia com a fonte.
// Os títulos e descrições são os mesmos que paginas.aplicar() usa; qualquer
// divergência aqui viraria SEO diferente do build oficial.
const bee = require('./bee.js');
const paginasProduto = [
  ['polen.html', 'mel-interna mel-pagina-polen',
    'Polen — câmera digital retrô | MELCAM',
    'A Polen guarda as fotos que importam. Câmera digital retrô, 7 cores, 8 filtros na hora do clique, 12 MP e sem tela. R$ 399,00 em até 3x sem juros.',
    polen.conteudo()],
  ['bee.html', 'mel-interna mel-pagina-bee',
    'Bee — a menor da colmeia | MELCAM',
    'Abelhas fazem mel, essa faz memórias. A Bee é a mini câmera-chaveiro da Melcam: 11 filtros, Full HD e 26 g. R$ 299,00 em até 12x.',
    bee.conteudo()],
];
for (const args of paginasProduto) {
  const feito = paginas.gerar.apply(null, args);
  console.log('ok  ' + feito + '  (' + (fs.statSync(path.join(SITE, feito)).size / 1024).toFixed(0) + ' KB)');
}

// -------------------------------------------------- 2. melcam/interacoes.js
const alvoJS = path.join(SITE, 'melcam', 'interacoes.js');
const js = carrossel.js();
// Guarda do projeto: crase em comentário quebra o template literal e só
// aparece na execução. new Function() pega antes de gravar.
new Function(js);
fs.writeFileSync(alvoJS, js, 'utf8');
console.log('ok  melcam/interacoes.js  (' + (fs.statSync(alvoJS).size / 1024).toFixed(0) + ' KB)');

// ------------------------------------------------- 3. melcam/identidade.css
// Troca só o trecho gerado por polen-interacoes.css(), delimitado por um
// marcador de início único e um de fim conferido também na saída nova. Se
// qualquer fronteira não bater, aborta sem escrever.
const alvoCSS = path.join(SITE, 'melcam', 'identidade.css');
const atual = fs.readFileSync(alvoCSS, 'utf8');
const CRLF = (s) => s.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
const novo = CRLF(polenUI.css()).trimStart();

const INICIO = '/* ================== /polen — hero premium ==================';
const FIM = '.mel-pr-swatch{ transition:none }\r\n}\r\n';

const i = atual.indexOf(INICIO);
if (i < 0) throw new Error('identidade.css: marcador de início não encontrado');
if (atual.indexOf(INICIO, i + 1) >= 0) throw new Error('identidade.css: marcador de início aparece 2x');
const j = atual.indexOf(FIM, i);
if (j < 0) throw new Error('identidade.css: marcador de fim não encontrado');
if (!novo.trimEnd().endsWith(FIM.trimEnd())) throw new Error('css() gerado não termina no marcador esperado');

const saida = atual.slice(0, i) + novo + atual.slice(j + FIM.length);
const ab = (saida.match(/\{/g) || []).length, fe = (saida.match(/\}/g) || []).length;
if (ab !== fe) throw new Error('identidade.css: chaves desbalanceadas ' + ab + '/' + fe);
fs.writeFileSync(alvoCSS, saida, 'utf8');
console.log('ok  melcam/identidade.css  (bloco /polen: ' + (j + FIM.length - i) + ' -> ' + novo.length +
  ' bytes, chaves ' + ab + '/' + fe + ')');
