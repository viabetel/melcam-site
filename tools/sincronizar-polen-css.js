// Troca SÓ o bloco CSS da /polen na folha — 16/08/2026.
//
//   node tools/sincronizar-polen-css.js
//
// POR QUE ELE EXISTE, tendo build-produtos.js.
// O build-produtos faz três coisas: regera polen.html e bee.html por
// paginas.gerar(), reescreve melcam/interacoes.js, e troca o bloco CSS da
// /polen. Só a terceira é necessária quando o que mudou é CSS.
//
// E a primeira é perigosa: paginas.gerar() cria cada interna como CÓPIA do
// index.html e depende da lista SO_HOME para esconder o que é só da home. Foi
// exatamente assim que a faixa "Sobre Nós" vazou para a /polen e para a /bee em
// 14/08, virando hero e empurrando o hero verdadeiro para baixo da dobra. Com o
// index.html mexido nesta rodada (leque da Bee, foto de Acessórios, altura dos
// cartões), regerar as internas por causa de uma linha de CSS é trocar risco
// por nada.
//
// Este arquivo é a etapa 3 do build-produtos, isolada, com as mesmas fronteiras
// e as mesmas guardas. Não grava se qualquer checagem falhar.
//
// A CONVENÇÃO DE FIM DE LINHA É LIDA DO ARQUIVO, e não cravada. O
// build-produtos converte para CRLF sempre, e a folha virou 100% LF quando o
// identidade.js a regerou em 14/08 — a conversão fixa deixaria o arquivo misto.
// Mesma correção que o sincronizar-perfil.js recebeu.
const fs = require('fs');
const path = require('path');

const SITE = path.resolve(__dirname, '..');
const ALVO = path.join(SITE, 'melcam', 'identidade.css');
const polenUI = require('./polen-interacoes.js');

const INICIO = '/* ================== /polen — hero premium ==================';
const FIM_BASE = '.mel-pr-swatch{ transition:none }';

const conta = (s, sub) => s.split(sub).length - 1;
const erros = [];
const exigir = (c, m) => { if (!c) erros.push(m); return c; };

const atual = fs.readFileSync(ALVO, 'utf8');
const antes = atual.length;

const comCRLF = conta(atual, '\r\n');
const soLF = conta(atual.replace(/\r\n/g, '\n'), '\n') - comCRLF;
exigir(!(comCRLF && soLF), `identidade.css: fim de linha misto (${comCRLF} CRLF, ${soLF} LF)`);
const fim = comCRLF
  ? (s) => s.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n')
  : (s) => s.replace(/\r\n/g, '\n');

// O marcador de fim inclui a quebra e a chave de fechamento do @media, e a
// forma deles depende da convenção — por isso ele é montado, não literal.
const FIM = fim(FIM_BASE + '\n}\n');
const novo = fim(polenUI.css()).replace(/^[\r\n]+/, '');

const i = atual.indexOf(INICIO);
exigir(i >= 0, 'identidade.css: marcador de início do bloco /polen não encontrado');
exigir(conta(atual, INICIO) === 1, 'identidade.css: marcador de início aparece mais de uma vez');
const j = i >= 0 ? atual.indexOf(FIM, i) : -1;
exigir(j >= 0, 'identidade.css: marcador de fim do bloco /polen não encontrado');
exigir(novo.trimEnd().endsWith(FIM.trimEnd()),
  'polen-interacoes.css() não termina no marcador esperado — a fronteira mudou');

let saida = null;
if (!erros.length) {
  saida = atual.slice(0, i) + novo + atual.slice(j + FIM.length);

  const ab = conta(saida, '{'), fe = conta(saida, '}');
  exigir(ab === fe, `identidade.css: chaves desbalanceadas ${ab}/${fe}`);

  // A mesma guarda de comentário dos outros sincronizadores: um "*/" perdido
  // engole a regra seguinte sem mudar a contagem de chaves.
  let dentro = false, aspas = null, orfaos = 0;
  for (let k = 0; k < saida.length; k++) {
    const c = saida[k];
    if (aspas) { if (c === '\\') k++; else if (c === aspas) aspas = null; continue; }
    if (!dentro && (c === '"' || c === "'")) { aspas = c; continue; }
    if (!dentro && c === '/' && saida[k + 1] === '*') { dentro = true; k++; }
    else if (dentro && c === '*' && saida[k + 1] === '/') { dentro = false; k++; }
    else if (!dentro && c === '*' && saida[k + 1] === '/') { orfaos++; k++; }
  }
  exigir(!dentro, 'identidade.css: comentário aberto que nunca fecha');
  exigir(!orfaos, `identidade.css: ${orfaos} "*/" sem "/*" aberto`);
}

if (erros.length || !saida) {
  console.error('REPROVADO — nada foi gravado:');
  for (const e of erros) console.error('  - ' + e);
  process.exit(1);
}

fs.writeFileSync(ALVO, saida, 'utf8');
console.log('[OK] melcam/identidade.css  ' + antes + ' -> ' + saida.length +
  '  (bloco /polen: ' + (j + FIM.length - i) + ' -> ' + novo.length + ' bytes)');
