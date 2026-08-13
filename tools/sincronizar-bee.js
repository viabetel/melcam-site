// Sincroniza os builds com as fontes DEPOIS do hero novo da /bee — 13/08/2026.
//
// Por que existe: `tools/aplicar.js` não pode rodar (apaga o trabalho de 12 e
// 13/08) e `paginas.js aplicar()` APENDA CSS, o que duplicaria a folha inteira.
// Então a sincronia é cirúrgica, com fronteiras verificadas antes de gravar.
//
// Idempotente: rodar de novo com tudo já sincronizado não muda byte nenhum.
// Não grava nada se qualquer verificação falhar.
const fs = require('fs');
const path = require('path');

const SITE = path.resolve(__dirname, '..');
const p = (r) => path.join(SITE, r);
const ler = (r) => fs.readFileSync(p(r), 'utf8');
const conta = (s, sub) => s.split(sub).length - 1;
const crlf = (s) => s.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');

const erros = [];
const passos = [];
function exigir(cond, msg) { if (!cond) erros.push(msg); return cond; }

// --------------------------------------------------------------- interacoes.js
// Este é o único build que o gerador escreve inteiro (writeFileSync, não
// append), então regenerar é seguro — e foi conferido antes de mexer que o
// arquivo em disco era byte a byte igual ao js() da fonte.
const jsNovo = require('./hero-carrossel.js').js();
const jsVelho = ler('melcam/interacoes.js');
exigir(jsNovo.includes('function iniciarHeroBee()'), 'interacoes.js: iniciarHeroBee ausente no gerado');
exigir(conta(jsNovo, 'iniciarHeroBee()') === 2, 'interacoes.js: iniciarHeroBee deveria aparecer 2x (definição + chamada)');
exigir(!/\r\n/.test(jsNovo), 'interacoes.js: gerado veio com CRLF');
// A guarda do handoff: crase e sintaxe. Se o template literal quebrou, o
// `new Function` estoura ANTES de o arquivo ser gravado.
try { new Function(jsNovo); } catch (e) { erros.push('interacoes.js: sintaxe inválida — ' + e.message); }
passos.push({ arq: 'melcam/interacoes.js', de: jsVelho.length, para: jsNovo.length, escrever: () => fs.writeFileSync(p('melcam/interacoes.js'), jsNovo, 'utf8') });

// --------------------------------------------------------------------- bee.html
// O bee.html traz o conteudo() da fonte inserido uma única vez. Substituir o
// bloco inteiro é mais seguro que remendar pedaço: se a fonte e o build
// divergirem, a checagem final (conteudo() presente exatamente 1x) reprova.
const beeHtml = ler('bee.html');
const beeNovo = require('./bee.js').conteudo();

// Fronteiras do trecho antigo: da abertura até o fim do conteudo().
// O fim é estável — o </section> que fecha "destaques", último do bloco.
//
// A abertura tem DUAS formas possíveis, e as duas precisam ser aceitas: quem
// roda isto pela primeira vez encontra a abertura pré-hero; quem roda depois de
// uma sincronia parcial (o caso de 13/08 — o hero já estava no build, com a
// ordem antiga do DOM) encontra o marcador do hero. Fixar só a primeira fazia o
// script reprovar com "abertura antiga não encontrada" e não gravar nada.
// A BARRA é a terceira forma possível de abertura, e a mais importante das
// três: quando ela sai da fonte (13/08, a pedido), o corte PRECISA começar
// nela. Se começasse no hero, o script gravaria um build que ainda contém a
// barra e mesmo assim passaria na prova final — conteudo() estaria lá, inteiro
// e uma vez só, com a barra sobrando em cima. A prova extra no fim fecha isso.
const ABRE_BARRA = '\n<div class="mel-barra" data-mel="barra-produto">';
const ABRE_PRE_HERO = '\n<section class="mel-sec mel-abertura mel-bee-abertura" aria-labelledby="mel-bee-tit">';
const ABRE_HERO = '\n<section class="mel-bh"';
const FIM = '</ul>\n  </div>\n</section>';

const fonteTemBarra = beeNovo.includes('mel-barra');
let htmlSaida = beeHtml;
if (beeHtml.includes(beeNovo) && (fonteTemBarra || !beeHtml.includes('mel-barra'))) {
  passos.push({ arq: 'bee.html', de: beeHtml.length, para: beeHtml.length, escrever: () => {}, nota: 'já sincronizado' });
} else {
  const ABRE = (!fonteTemBarra && beeHtml.includes(ABRE_BARRA)) ? ABRE_BARRA
    : beeHtml.includes(ABRE_PRE_HERO) ? ABRE_PRE_HERO : ABRE_HERO;
  const i0 = beeHtml.indexOf(ABRE);
  const i1 = beeHtml.indexOf(FIM, i0);
  exigir(i0 > 0, 'bee.html: abertura não encontrada (barra, pré-hero ou hero)');
  exigir(i1 > i0, 'bee.html: fim do conteudo() não encontrado');
  exigir(conta(beeHtml, ABRE) === 1, 'bee.html: abertura aparece mais de uma vez');
  if (i0 > 0 && i1 > i0) {
    const fim = i1 + FIM.length;
    // O trecho trocado vai da abertura ao fim, e o conteudo() da fonte entra
    // inteiro no lugar: o que a fonte não tem mais, o build perde aqui.
    htmlSaida = beeHtml.slice(0, i0) + beeNovo + beeHtml.slice(fim);
    passos.push({ arq: 'bee.html', de: beeHtml.length, para: htmlSaida.length, escrever: () => fs.writeFileSync(p('bee.html'), htmlSaida, 'utf8') });
  }
}

// ---------------------------------------------------------------- identidade.css
// A folha é 100% CRLF (foi editada à mão em passagens anteriores), enquanto os
// geradores emitem LF. Todo texto novo entra convertido, senão o arquivo vira
// misto e qualquer diff futuro fica ilegível.
let css = ler('melcam/identidade.css');
const cssAntes = css.length;

// 1. bloco da abertura antiga -> comentário novo, com .mel-cores-2 preservado
const BEE_VELHO_INI = '/* ---- LP Bee: abertura, a opção 1 do briefing ---- */';
const BEE_VELHO_FIM = '.mel-cores-2{ grid-template-columns:repeat(2,1fr); max-width:820px; margin-inline:auto }';
const paginasNovo = require('./paginas.js').css();
const NOVO_INI = '/* ---- LP Bee: seleção de modelos ----';
const jn0 = paginasNovo.indexOf(NOVO_INI);
const jn1 = paginasNovo.indexOf(BEE_VELHO_FIM, jn0);
exigir(jn0 > 0 && jn1 > jn0, 'paginas.js: bloco novo da Bee não encontrado na fonte');
const blocoNovo = crlf(paginasNovo.slice(jn0, jn1 + BEE_VELHO_FIM.length));

if (css.includes(BEE_VELHO_INI)) {
  const c0 = css.indexOf(BEE_VELHO_INI);
  const c1 = css.indexOf(BEE_VELHO_FIM, c0);
  exigir(c1 > c0, 'identidade.css: fim do bloco antigo da Bee não encontrado');
  exigir(conta(css, BEE_VELHO_INI) === 1, 'identidade.css: bloco antigo da Bee duplicado');
  if (c1 > c0) css = css.slice(0, c0) + blocoNovo + css.slice(c1 + BEE_VELHO_FIM.length);
}

// 2. a sobra no breakpoint de retrato
const SOBRA_MQ = '  .mel-bee-palco{ max-width:280px }\r\n';
if (css.includes(SOBRA_MQ)) {
  exigir(conta(css, SOBRA_MQ) === 1, 'identidade.css: .mel-bee-palco do media query duplicado');
  css = css.replace(SOBRA_MQ, '');
}

// 3. o reduced-motion da animação antiga
const RM_VELHO = '@media (prefers-reduced-motion:reduce){\r\n'
  + '  /* Sem giro: entrega direto a Bee amarela, que é o final da animação. */\r\n'
  + '  .mel-bee-branca{ animation:none; opacity:0 }\r\n'
  + '  .mel-bee-amarela{ animation:none; opacity:1; transform:none }\r\n'
  + '}\r\n';
if (css.includes(RM_VELHO)) {
  exigir(conta(css, RM_VELHO) === 1, 'identidade.css: reduced-motion antigo da Bee duplicado');
  css = css.replace(RM_VELHO, '');
}

// 3b. o CSS órfão da barra de produto, que saiu com ela em 13/08. Duas
//     regiões: o bloco de regras e as três linhas do breakpoint de retrato.
//     O texto que entra no lugar vem da FONTE (paginas.js), não é escrito
//     aqui: assim o registro do porquê existe em um lugar só.
const BARRA_CSS_INI = '/* ---- barra de produto fixa, referência apple.com/ipad-air ---- */';
const BARRA_CSS_FIM = '.mel-barra-preco{ color:#9A9083; font-family:"Area",sans-serif; font-size:.85rem }';
if (css.includes(BARRA_CSS_INI)) {
  const NOTA_INI = '/* A barra de produto fixa (referência apple.com/ipad-air) saiu do projeto em';
  const NOTA_FIM = '   Não recriar sem pedido: a navbar já faz o trabalho. */';
  const n0 = paginasNovo.indexOf(NOTA_INI);
  const n1 = paginasNovo.indexOf(NOTA_FIM, n0);
  exigir(n0 > 0 && n1 > n0, 'paginas.js: nota da barra removida não encontrada na fonte');
  const d0 = css.indexOf(BARRA_CSS_INI);
  const d1 = css.indexOf(BARRA_CSS_FIM, d0);
  exigir(d1 > d0, 'identidade.css: fim do bloco da barra não encontrado');
  exigir(conta(css, BARRA_CSS_INI) === 1, 'identidade.css: bloco da barra duplicado');
  if (n0 > 0 && n1 > n0 && d1 > d0) {
    css = css.slice(0, d0) + crlf(paginasNovo.slice(n0, n1 + NOTA_FIM.length)) + css.slice(d1 + BARRA_CSS_FIM.length);
  }
}
const BARRA_MQ = '  .mel-barra-in{ padding:.55rem 16px; gap:10px; overflow-x:auto }\r\n'
  + '  .mel-barra-anc{ gap:12px }\r\n'
  + '  .mel-barra-preco{ display:none }\r\n';
if (css.includes(BARRA_MQ)) {
  exigir(conta(css, BARRA_MQ) === 1, 'identidade.css: media query da barra duplicado');
  css = css.replace(BARRA_MQ, '');
}

// 4. o bloco novo, no fim — a mesma posição relativa da fonte (depois do
//    bloco da /polen, que hoje é o último da folha).
const beeCss = crlf(require('./bee-interacoes.js').css());
const MARCA_BEE = '/* ================== /bee — hero premium e claro ==================';
if (css.includes(MARCA_BEE)) {
  const b0 = css.indexOf(MARCA_BEE);
  exigir(conta(css, MARCA_BEE) === 1, 'identidade.css: bloco do hero da Bee duplicado');
  css = css.slice(0, b0) + beeCss.replace(/^\r\n/, '');
} else {
  css = css + beeCss;
}

// A busca roda na folha SEM COMENTÁRIO: o registro da remoção cita os
// seletores antigos de propósito ("saíram .mel-bee-l1, .mel-bee-palco, ..."),
// e uma varredura no texto cru reprovaria o próprio registro. O que não pode
// sobrar é regra, não menção.
const semComentario = css.replace(/\/\*[\s\S]*?\*\//g, '');
exigir(!/\.mel-bee-(l1|palco|cam|branca|amarela)\s*[,{]/.test(semComentario), 'identidade.css: sobrou seletor da abertura antiga');
exigir(!/\.mel-barra[\w-]*\s*[,{]/.test(semComentario), 'identidade.css: sobrou regra da barra de produto');
exigir(!/@keyframes\s+mel-bee-(gira|revela)/.test(semComentario), 'identidade.css: sobrou keyframe da abertura antiga');
{
  const abre = conta(css, '{'), fecha = conta(css, '}');
  exigir(abre === fecha, 'identidade.css: chaves desbalanceadas ' + abre + '/' + fecha);
  passos.push({ arq: 'melcam/identidade.css', de: cssAntes, para: css.length, chaves: abre + '/' + fecha, escrever: () => fs.writeFileSync(p('melcam/identidade.css'), css, 'utf8') });
}

// ------------------------------------------------------------------- resultado
if (erros.length) {
  console.error('REPROVADO — nada foi gravado:');
  for (const e of erros) console.error('  - ' + e);
  process.exit(1);
}
for (const s of passos) {
  s.escrever();
  console.log('[OK] ' + s.arq.padEnd(24) + s.de + ' -> ' + s.para
    + (s.chaves ? '  chaves ' + s.chaves : '') + (s.nota ? '  (' + s.nota + ')' : ''));
}

// Prova final, lida do disco: o conteudo() da fonte tem de estar no build,
// inteiro e uma vez só.
const conf = fs.readFileSync(p('bee.html'), 'utf8');
const ok = conta(conf, require('./bee.js').conteudo()) === 1;
console.log(ok ? '[OK] bee.html contém conteudo() da fonte, 1x'
  : '[FALHA] bee.html NÃO bate com conteudo() da fonte');
// A prova de que a barra realmente saiu do BUILD. Sem ela, um corte começando
// no hero deixaria a barra no HTML e esta linha ainda diria [OK] acima.
const semBarra = fonteTemBarra || !/class="mel-barra/.test(conf);
console.log(semBarra ? '[OK] bee.html sem a barra de produto'
  : '[FALHA] bee.html ainda tem a barra que saiu da fonte');
process.exit(ok && semBarra ? 0 : 1);
