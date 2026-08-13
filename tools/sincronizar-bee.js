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

// Fronteiras do trecho antigo: da abertura antiga até o fim do conteudo().
// O fim é estável — o </section> que fecha "destaques", último do bloco.
const ABRE = '\n<section class="mel-sec mel-abertura mel-bee-abertura" aria-labelledby="mel-bee-tit">';
const FIM = '</ul>\n  </div>\n</section>';

let htmlSaida = beeHtml;
if (beeHtml.includes(beeNovo)) {
  passos.push({ arq: 'bee.html', de: beeHtml.length, para: beeHtml.length, escrever: () => {}, nota: 'já sincronizado' });
} else {
  const i0 = beeHtml.indexOf(ABRE);
  const i1 = beeHtml.indexOf(FIM, i0);
  exigir(i0 > 0, 'bee.html: abertura antiga não encontrada');
  exigir(i1 > i0, 'bee.html: fim do conteudo() não encontrado');
  exigir(conta(beeHtml, ABRE) === 1, 'bee.html: abertura antiga aparece mais de uma vez');
  if (i0 > 0 && i1 > i0) {
    const fim = i1 + FIM.length;
    // A barra() é idêntica antes e depois; o trecho trocado vai da abertura
    // ao fim, e a barra fica onde está. Por isso o corte começa em ABRE e o
    // texto novo entra sem a barra.
    const novoSemBarra = beeNovo.slice(beeNovo.indexOf(ABRE.slice(0, 20)) >= 0 ? 0 : 0);
    const iHero = novoSemBarra.indexOf('\n<section class="mel-bh"');
    exigir(iHero > 0, 'bee.js: hero novo não encontrado no conteudo()');
    htmlSaida = beeHtml.slice(0, i0) + novoSemBarra.slice(iHero) + beeHtml.slice(fim);
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
process.exit(ok ? 0 : 1);
