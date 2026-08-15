// Troca o bloco dos DESTAQUES DA BEE na folha, no lugar — 15/08/2026.
//
//   node tools/sincronizar-grade-bee.js
//
// POR QUE ELE EXISTE, e por que nao basta rodar o tools/identidade.js.
// A folha e montada em CAMADAS: o identidade.js escreve a base inteira com
// writeFileSync, e depois dela vem o bloco do perfil, o da /polen, o do hero da
// home e o da /bee, cada um inserido pelo seu proprio gerador. Rodar o
// identidade.js hoje apaga essas quatro camadas de uma vez — foi assim que a
// folha virou 100% LF em 14/08, e e por isso que o handoff registra a
// regeneracao como evento, e nao como rotina.
//
// Entao o CSS mora numa funcao (tools/bloco-bee.js > css()), o identidade.js a
// interpola quando a base for regerada um dia, e este arquivo troca o bloco no
// lugar enquanto isso. Os dois caminhos leem o MESMO texto: nao ha como
// divergirem.
//
// ONDE O BLOCO ENTRA: logo antes do marcador do "SOBRE NÓS", que e onde ele
// esta na fonte. A posicao importa pelo mesmo motivo registrado no
// sincronizar-perfil.js — o sincronizar-bee.js corta da marca da /bee ate o FIM
// DO ARQUIVO, entao qualquer bloco depois dela seria apagado sem aviso.
//
// Nao grava NADA se qualquer checagem falhar.
const fs = require('fs');
const path = require('path');

const SITE = path.resolve(__dirname, '..');
const ALVO = path.join(SITE, 'melcam', 'identidade.css');
const bee = require('./bloco-bee.js');

const ANCORA = '/* ============ SOBRE NÓS: a faixa em obturador';
const conta = (s, sub) => s.split(sub).length - 1;

const erros = [];
const exigir = (cond, msg) => { if (!cond) erros.push(msg); return cond; };

const atual = fs.readFileSync(ALVO, 'utf8');
const antes = atual.length;

// A convencao de fim de linha e LIDA do arquivo, nunca cravada — mesma correcao
// que o sincronizar-perfil.js recebeu em 14/08, quando a folha deixou de ser
// CRLF e a conversao fixa virou o defeito que ela existia para evitar.
const comCRLF = conta(atual, '\r\n');
const soLF = conta(atual.replace(/\r\n/g, '\n'), '\n') - comCRLF;
exigir(!(comCRLF && soLF), `identidade.css: fim de linha misto (${comCRLF} CRLF, ${soLF} LF)`);
const fim = comCRLF
  ? (s) => s.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n')
  : (s) => s.replace(/\r\n/g, '\n');

const bloco = fim(bee.css());

let saida;
const a = atual.indexOf(bee.CSS_ABRE);
if (a >= 0) {
  const f = atual.indexOf(bee.CSS_FECHA, a);
  exigir(f > a, 'identidade.css: bloco da Bee aberto e nunca fechado');
  exigir(conta(atual, bee.CSS_ABRE) === 1, 'identidade.css: bloco da Bee duplicado');
  if (f > a) saida = atual.slice(0, a) + bloco + atual.slice(f + bee.CSS_FECHA.length);
} else {
  const b = atual.indexOf(ANCORA);
  exigir(b > 0, 'identidade.css: ancora do "SOBRE NÓS" nao encontrada');
  if (b > 0) saida = atual.slice(0, b) + bloco + fim('\n\n\n') + atual.slice(b);
}

if (saida) {
  const ab = conta(saida, '{'), fe = conta(saida, '}');
  exigir(ab === fe, `identidade.css: chaves desbalanceadas ${ab}/${fe}`);

  // A mesma guarda de comentario do hero-home.js: um "*/" perdido engole a
  // regra seguinte sem mudar a contagem de chaves.
  let dentro = false, aspas = null, orfaos = 0;
  for (let k = 0; k < saida.length; k++) {
    const c = saida[k];
    if (aspas) { if (c === '\\') k++; else if (c === aspas) aspas = null; continue; }
    if (!dentro && (c === '"' || c === "'")) { aspas = c; continue; }
    if (!dentro && c === '/' && saida[k + 1] === '*') { dentro = true; k++; }
    else if (dentro && c === '*' && saida[k + 1] === '/') { dentro = false; k++; }
    else if (!dentro && c === '*' && saida[k + 1] === '/') { orfaos++; k++; }
  }
  exigir(!dentro, 'identidade.css: comentario aberto que nunca fecha');
  exigir(!orfaos, `identidade.css: ${orfaos} "*/" sem "/*" aberto`);

  // O bloco tem de ficar ANTES da marca da /bee, senao a proxima sincronia dela
  // o apaga em silencio.
  const iBee = saida.indexOf('/* ================== /bee — hero premium e claro');
  const iEste = saida.indexOf(bee.CSS_ABRE);
  exigir(iEste > 0, 'identidade.css: bloco da Bee nao entrou');
  exigir(iBee < 0 || iEste < iBee, 'identidade.css: bloco da Bee DEPOIS da marca da /bee — seria apagado');

  // Duas regras por item do leque (a posicao em repouso e a aberta no hover),
  // e o leque e de CORES desde a correcao de 15/08 — nao de destaques.
  exigir(conta(saida, '.mel-bee-troca img[data-i=') === bee.CORES.length * 2,
    'identidade.css: regras por indice do leque incompletas (esperado ' +
    (bee.CORES.length * 2) + ')');
}

if (erros.length || !saida) {
  console.error('REPROVADO — nada foi gravado:');
  for (const e of erros) console.error('  - ' + e);
  process.exit(1);
}

fs.writeFileSync(ALVO, saida, 'utf8');
console.log('[OK] melcam/identidade.css  ' + antes + ' -> ' + saida.length +
  '  (bloco da Bee: ' + bloco.length + ' bytes, ' + bee.FEATURES.length + ' destaques)');
