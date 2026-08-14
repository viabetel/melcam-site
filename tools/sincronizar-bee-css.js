// Sincroniza SÓ o bloco de CSS da /bee dentro de melcam/identidade.css.
//
//   node tools/sincronizar-bee-css.js
//
// POR QUE ESTE ARQUIVO EXISTE. O tools/build-produtos.js regenera bee.html e
// polen.html e troca o bloco da /polen na folha — mas não encosta no bloco da
// /bee, que vive depois dele. Até 14/08 quem fazia isso era o
// tools/sincronizar-bee.js, e ele não serve mais para uso corrente: os passos 1
// a 3 dele recortam trechos por marcadores de uma migração que já aconteceu (a
// abertura antiga, a barra de produto, o bloco velho de modelos). Rodá-lo hoje
// é pedir para um marcador não bater.
//
// O que ficou de pé é o passo 4, que é simples e continua verdadeiro: o bloco
// da /bee é o ÚLTIMO da folha, então sincronizar é truncar no marcador dele e
// reescrever dali para a frente com o css() da fonte.
//
// ⚠️ SE ALGUM DIA ENTRAR UM BLOCO DEPOIS DO DA /BEE, este arquivo passa a
// apagá-lo em silêncio. A guarda contra isso é a checagem de que o marcador
// existe uma vez só somada à conferência de tamanho no fim: uma folha que
// encolhe muito mais do que o bloco novo cresce é o sintoma.
const fs = require('fs');
const path = require('path');

const SITE = path.resolve(__dirname, '..');
const ALVO = path.join(SITE, 'melcam', 'identidade.css');
const MARCA = '/* ================== /bee — hero premium e claro ==================';
const crlf = (s) => s.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');

const atual = fs.readFileSync(ALVO, 'utf8');
const i = atual.indexOf(MARCA);
if (i < 0) throw new Error('identidade.css: marcador do bloco da /bee não encontrado');
if (atual.indexOf(MARCA, i + 1) >= 0) throw new Error('identidade.css: marcador do bloco da /bee aparece 2x');

// A guarda do projeto: crase perdida ou erro de sintaxe no template literal
// aparece aqui, antes de qualquer gravação.
const novoBloco = crlf(require('./bee-interacoes.js').css()).replace(/^\r\n/, '');
const saida = atual.slice(0, i) + novoBloco;

const ab = (saida.match(/\{/g) || []).length;
const fe = (saida.match(/\}/g) || []).length;
if (ab !== fe) throw new Error('identidade.css: chaves desbalanceadas ' + ab + '/' + fe);

// Comentário desbalanceado não muda a contagem de chaves e engole a regra
// seguinte em silêncio — foi o que aconteceu em 14/08 na folha da /polen.
{
  let dentro = false, aspas = null, orfaos = 0;
  for (let k = 0; k < saida.length; k++) {
    const c = saida[k];
    if (aspas) { if (c === '\\') k++; else if (c === aspas) aspas = null; continue; }
    if (!dentro && (c === '"' || c === "'")) { aspas = c; continue; }
    if (!dentro && c === '/' && saida[k + 1] === '*') { dentro = true; k++; }
    else if (dentro && c === '*' && saida[k + 1] === '/') { dentro = false; k++; }
    else if (!dentro && c === '*' && saida[k + 1] === '/') { orfaos++; k++; }
  }
  if (dentro) throw new Error('identidade.css: comentário aberto que nunca fecha');
  if (orfaos) throw new Error('identidade.css: ' + orfaos + ' "*/" sem "/*" aberto');
}

fs.writeFileSync(ALVO, saida, 'utf8');
console.log('ok  melcam/identidade.css  (bloco /bee: ' + (atual.length - i) + ' -> ' +
  novoBloco.length + ' bytes, folha ' + atual.length + ' -> ' + saida.length +
  ', chaves ' + ab + '/' + fe + ')');
