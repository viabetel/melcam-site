// Sincroniza os builds com o módulo de perfil/sessão — 13/08/2026.
//
//   node tools/sincronizar-perfil.js
//
// Mesma disciplina do sincronizar-bee.js: cirúrgico, com fronteiras
// verificadas, idempotente, e não grava NADA se qualquer checagem falhar.
// Existe pelo mesmo motivo: `tools/aplicar.js` não pode rodar (apaga o
// trabalho de 12 e 13/08) e `paginas.js aplicar()` apenda CSS, o que
// duplicaria a folha inteira.
//
// 🔴 A ORDEM DENTRO DA FOLHA NÃO É ESTÉTICA, É REQUISITO.
// O sincronizar-bee.js corta de "/* ===== /bee — hero premium e claro" até o
// FIM DO ARQUIVO e reescreve esse pedaço. Qualquer bloco que estivesse depois
// do marcador da Bee seria apagado na próxima sincronia dela, sem aviso: o
// script continuaria dizendo [OK], porque o que ele confere é o bloco da Bee.
// Por isso o bloco do perfil entra ANTES do bloco da /polen, que é onde ele
// está na fonte (tools/paginas.js), e a checagem final prova a posição.
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

// ------------------------------------------------------------ interacoes.js
// O gerador escreve este arquivo inteiro (writeFileSync, não append), então
// regenerar é seguro. A guarda `new Function` pega crase perdida e erro de
// sintaxe ANTES de o arquivo ser gravado — a armadilha nº 1 do projeto.
const jsNovo = require('./hero-carrossel.js').js();
const jsVelho = ler('melcam/interacoes.js');
exigir(jsNovo.includes('function iniciarPerfil()'), 'interacoes.js: iniciarPerfil ausente no gerado');
exigir(conta(jsNovo, 'iniciarPerfil()') === 2, 'interacoes.js: iniciarPerfil deveria aparecer 2x (definição + chamada)');
exigir(jsNovo.includes("dispatchEvent(new CustomEvent('mel:fechar-menus'"), 'interacoes.js: coordenação entre os dois menus ausente');
exigir(conta(jsNovo, "'mel:fechar-menus'") === 4, 'interacoes.js: mel:fechar-menus deveria aparecer 4x (2 emissores + 2 ouvintes)');
exigir(jsNovo.includes("'mel:sacola-mudou'"), 'interacoes.js: aviso da sacola ausente');
exigir(!/\r\n/.test(jsNovo), 'interacoes.js: gerado veio com CRLF');
exigir(!/senha[^\\n]{0,40}localStorage\.setItem/.test(jsNovo), 'interacoes.js: parece gravar senha no localStorage');
try { new Function(jsNovo); } catch (e) { erros.push('interacoes.js: sintaxe inválida — ' + e.message); }
passos.push({
  arq: 'melcam/interacoes.js', de: jsVelho.length, para: jsNovo.length,
  escrever: () => fs.writeFileSync(p('melcam/interacoes.js'), jsNovo, 'utf8'),
});

// --------------------------------------------------------- identidade.css
// A folha é 100% CRLF (editada à mão em passagens anteriores) e os geradores
// emitem LF. Todo texto novo entra convertido, senão o arquivo vira misto e
// qualquer diff futuro fica ilegível.
let css = ler('melcam/identidade.css');
const cssAntes = css.length;

const MARCA = '/* ================== conta, sessão e sacola na navbar ==================';
const ANCORA = '/* ================== /polen — hero premium ==================';
const blocoNovo = crlf(require('./perfil.js').css()).replace(/^\r\n/, '');

exigir(css.includes(ANCORA), 'identidade.css: âncora do bloco da /polen não encontrada');
if (css.includes(MARCA)) {
  // já existe: troca no lugar, da marca até a âncora
  const a = css.indexOf(MARCA);
  const b = css.indexOf(ANCORA, a);
  exigir(conta(css, MARCA) === 1, 'identidade.css: bloco do perfil duplicado');
  exigir(b > a, 'identidade.css: bloco do perfil não está antes do bloco da /polen');
  if (b > a) css = css.slice(0, a) + blocoNovo + css.slice(b);
} else {
  const b = css.indexOf(ANCORA);
  if (b > 0) css = css.slice(0, b) + blocoNovo + css.slice(b);
}

{
  const abre = conta(css, '{'), fecha = conta(css, '}');
  exigir(abre === fecha, 'identidade.css: chaves desbalanceadas ' + abre + '/' + fecha);
  exigir(!/\n(?!\r)/.test(css.replace(/\r\n/g, '')), 'identidade.css: sobrou LF puro — a folha é CRLF');
  passos.push({
    arq: 'melcam/identidade.css', de: cssAntes, para: css.length, chaves: abre + '/' + fecha,
    escrever: () => fs.writeFileSync(p('melcam/identidade.css'), css, 'utf8'),
  });
}

// ------------------------------------------------------------------ resultado
if (erros.length) {
  console.error('REPROVADO — nada foi gravado:');
  for (const e of erros) console.error('  - ' + e);
  process.exit(1);
}
for (const s of passos) {
  s.escrever();
  console.log('[OK] ' + s.arq.padEnd(24) + s.de + ' -> ' + s.para + (s.chaves ? '  chaves ' + s.chaves : ''));
}

// Provas finais, lidas do disco.
const folha = ler('melcam/identidade.css');
const iPerfil = folha.indexOf(MARCA);
const iPolen = folha.indexOf(ANCORA);
const iBee = folha.indexOf('/* ================== /bee — hero premium e claro');
const ordemOk = iPerfil > 0 && iPerfil < iPolen && (iBee < 0 || iPerfil < iBee);
console.log(ordemOk ? '[OK] bloco do perfil antes de /polen e /bee (sobrevive à sincronia da Bee)'
  : '[FALHA] bloco do perfil fora de ordem — a sincronia da Bee vai apagá-lo');
const motor = ler('melcam/interacoes.js');
const motorOk = conta(motor, 'function iniciarPerfil()') === 1;
console.log(motorOk ? '[OK] interacoes.js com iniciarPerfil, 1x' : '[FALHA] iniciarPerfil ausente ou duplicado');
process.exit(ordemOk && motorOk ? 0 : 1);
