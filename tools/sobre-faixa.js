// O "Sobre Nós" sai da grade de produtos e vira faixa própria, com abertura
// em obturador. 14/08/2026.
//
//   node tools/sobre-faixa.js          (aplica)
//   node tools/sobre-faixa.js --ver    (só relata)
//
// POR QUE SAIR DA GRADE
// Numa home de e-commerce o "sobre" vem depois de tudo que vende e antes do
// fechamento: promessa, o que é, prova, quem somos, convite. Ele estava no
// segundo degrau — dentro de "A câmera que vive com você" —, ocupando a coluna
// 3 inteira, 432x773. Era o MAIOR elemento da seção de produtos e o único que
// não oferecia nada. Agora entra entre "A Melcam por aí" e "Entre para a
// Colméia", que é o fim da sequência de prova social.
//
// E resolve um segundo problema de graça: sem ele a grade cai de 3 para 2
// colunas, e os cards de produto passam de 432px para ~660px de largura — a
// queixa de "os cards estão pequenos demais para serem vistos".
//
// O EFEITO: OBTURADOR DE CORTINA
// As duas fotos que o card já carregava não são enfeite: no template uma
// sangra pelo topo e a outra pela base. São, literalmente, as duas cortinas de
// um obturador focal-plane — o mecanismo real de uma câmera analógica, onde
// duas cortinas correm e o vão entre elas é a exposição.
//
// Fechada, a faixa mostra as duas cortinas encostadas com o título por cima.
// Aberta, elas se afastam e o texto aparece no vão, com duas linhas de luz em
// mel nas bordas — a fresta por onde a luz entra.
//
// A GEOMETRIA FAZ O TRABALHO, NÃO UMA ANIMAÇÃO DE POSIÇÃO. A cortina de cima é
// ancorada em top:0 e a de baixo em bottom:0, as duas com altura fixa. Quem
// anima é a altura do palco: crescendo, o vão abre sozinho. Um translate em
// cada cortina daria o mesmo desenho e exigiria manter três números em
// sincronia — assim é um só.
//
// Idempotente: se a faixa já existir, não faz nada.
const fs = require('fs');
const path = require('path');

const SITE = path.resolve(__dirname, '..');
const VER = process.argv.includes('--ver');
const MARCA = 'data-mel-sobre';

// Copy: a mesma do card, que veio do copy deck aprovado. O CTA é novo e é o
// único texto criado aqui — o card não tinha nenhum.
const TITULO = 'Sobre Nós';
const LINHA = 'Marca brasileira de câmeras digitais retrô, fotografia intencional e comunidade.';
const CORPO = 'A Melcam nasceu para devolver a fotografia ao lugar de sempre: a memória. '
  + 'Câmeras sem tela, sem notificação e sem pressa, feitas para quem fotografa o que '
  + 'está vivendo em vez de conferir se ficou bom.';
const CTA = 'Conheça quem faz a Melcam';
const ABRIR = 'Abrir';
const FECHAR = 'Fechar';

// As duas fotos são as que o card já usava, e a escolha de qual vai em cima
// não é livre: bee-lp-06 tem a câmera na parte de baixo do quadro e bee-lp-1237
// tem a pessoa na parte de cima. Invertidas, as duas ficariam com o assunto
// justamente na faixa que o corte come.
const CIMA = '/melcam/img/header-fileira/bee-lp-06.jpg';
const BAIXO = '/melcam/img/header-fileira/bee-lp-1237.jpg';

function markup() {
  return `<section class="mel-sobre" ${MARCA}="1" aria-labelledby="mel-sobre-tit">
<div class="mel-sobre-palco" data-mel-sobre-palco>
<div class="mel-sobre-cortina mel-sobre-cima" aria-hidden="true"><img src="${CIMA}" alt="" loading="lazy" decoding="async" width="1600" height="2400"></div>
<div class="mel-sobre-cortina mel-sobre-baixo" aria-hidden="true"><img src="${BAIXO}" alt="" loading="lazy" decoding="async" width="1600" height="2400"></div>
<div class="mel-sobre-capa">
<h2 class="mel-sobre-tit" id="mel-sobre-tit">${TITULO}</h2>
<p class="mel-sobre-linha">${LINHA}</p>
</div>
<div class="mel-sobre-miolo" data-mel-sobre-miolo>
<p class="mel-sobre-corpo">${CORPO}</p>
<a class="mel-sobre-cta" href="/sobre">${CTA}</a>
</div>
<button type="button" class="mel-sobre-bt" data-mel-sobre-bt aria-expanded="false" aria-controls="mel-sobre-tit">
<span data-mel-sobre-rot>${ABRIR}</span>
<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9 L12 15 L18 9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
</button>
</div>
</section>`;
}

// Recorta <section ...classe...> ... </section> com contagem equilibrada.
function recortarSection(html, ini) {
  const re = /<(\/?)section\b[^>]*>/g;
  re.lastIndex = ini;
  let prof = 0, t;
  while ((t = re.exec(html))) {
    prof += t[1] ? -1 : 1;
    if (prof === 0) return t.index + t[0].length;
  }
  return -1;
}

const erros = [];
let tocados = 0;

// Só a home: as internas não têm nem a grade nem esta faixa.
const arq = path.join(SITE, 'index.html');
let html = fs.readFileSync(arq, 'utf8');
const antes = html;

if (html.indexOf(MARCA) >= 0) {
  console.log('[--] index.html: faixa já presente, nada a fazer');
} else {
  // Entra imediatamente ANTES da barra de segurança, que é a última seção do
  // stack. Assim fica depois de "A Melcam por aí" e antes de "Entre para a
  // Colméia", sem depender de order nenhum: todos os filhos do stack estão em
  // order 0, então quem manda é a posição no DOM.
  const i = html.indexOf('<section class="mel-seguranca"');
  if (i < 0) {
    erros.push('index.html: <section class="mel-seguranca"> não encontrada — é ela que ancora a posição');
  } else {
    html = html.slice(0, i) + markup() + html.slice(i);
    tocados++;
  }
}

if (!erros.length && tocados) {
  const conta = (s, t) => (s.match(new RegExp(t, 'g')) || []).length;
  const okSec = conta(html, '<section\\b') - conta(antes, '<section\\b') === 1;
  const okBal = conta(html, '<section\\b') - conta(html, '</section>') === conta(antes, '<section\\b') - conta(antes, '</section>');
  const okDivBal = conta(html, '<div\\b') - conta(html, '</div>') === conta(antes, '<div\\b') - conta(antes, '</div>');
  if (!(okSec && okBal && okDivBal)) {
    erros.push('index.html: guarda falhou — ' + JSON.stringify({ okSec, okBal, okDivBal }));
  } else if (!VER) {
    fs.writeFileSync(arq, html, 'utf8');
  }
}

if (erros.length) {
  console.error('PROBLEMAS (nada gravado):');
  erros.forEach((e) => console.error('  - ' + e));
  process.exit(1);
}

if (tocados) {
  console.log((VER ? '[ver] ' : '[ok]  ') + 'index.html: faixa "Sobre Nós" inserida antes da barra de segurança');
  console.log('  guardas: +1 <section>, balanço de section e div preservado');
}

// Prova de posição, lida do disco.
if (!VER && tocados) {
  const v = fs.readFileSync(arq, 'utf8');
  const pComunidade = v.lastIndexOf('mel-comunidade');
  const pSobre = v.indexOf('class="mel-sobre"');
  const pSeg = v.indexOf('<section class="mel-seguranca"');
  const ordemOk = pComunidade > 0 && pSobre > pComunidade && pSeg > pSobre;
  console.log(ordemOk
    ? '[OK] ordem no DOM: comunidade -> sobre -> segurança'
    : '[FALHA] ordem errada: comunidade=' + pComunidade + ' sobre=' + pSobre + ' seg=' + pSeg);
  process.exit(ordemOk ? 0 : 1);
}

module.exports = { markup, TITULO, LINHA, CORPO, CTA, ABRIR, FECHAR };
