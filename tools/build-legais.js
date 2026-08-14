// Gera /privacidade e /termos — 14/08/2026.
//
//   node tools/build-legais.js
//
// Mesma disciplina do tools/build-produtos.js: usa paginas.gerar(), que é
// determinístico e nasce de uma cópia do index.html, em vez de rodar
// tools/aplicar.js (proibido, ver AGENTS.md).
//
// POR QUE ESTE ARQUIVO EXISTE. privacidade.html e termos.html eram cascas
// vazias do Framer — <div id="main"></div> e nada mais, sem navbar e sem
// rodapé, porque a hidratação React está desligada. O rodapé de todas as nove
// páginas aponta para as duas rotas, então eram dois links de suporte levando a
// tela branca. O conteúdo honesto que entrou no lugar está em tools/demais.js,
// nas funções privacidade() e termos(), com o porquê de cada decisão.
//
// OS APELIDOS EM INGLÊS entram junto e não são detalhe. O template exporta
// privacy-policy.html e terms-and-conditions.html, e o tools/rotas.js os copia
// para os nomes em português. Com cleanUrls ligado na Vercel, /privacy-policy e
// /terms-and-conditions continuam sendo endereços válidos e serviriam a casca
// vazia. Copiar a página boa por cima fecha essa porta.
const fs = require('fs');
const path = require('path');

const SITE = path.resolve(__dirname, '..');
const paginas = require('./paginas.js');
const d = require('./demais.js');

const PAGINAS = [
  ['privacidade.html', 'mel-interna mel-pagina-privacidade',
    'Política de privacidade | MELCAM',
    'A política de privacidade da Melcam está sendo preparada. Enquanto isso, fale com a gente pelo canal de atendimento.',
    d.privacidade(), 'privacy-policy.html'],
  ['termos.html', 'mel-interna mel-pagina-termos',
    'Termos e condições | MELCAM',
    'Os termos de uso e a política de trocas e devoluções da Melcam estão sendo preparados. Enquanto isso, fale com a gente.',
    d.termos(), 'terms-and-conditions.html'],
];

for (const [arq, classe, titulo, desc, conteudo, apelido] of PAGINAS) {
  const antes = fs.existsSync(path.join(SITE, arq)) ? fs.statSync(path.join(SITE, arq)).size : 0;
  paginas.gerar(arq, classe, titulo, desc, conteudo);
  const s = fs.readFileSync(path.join(SITE, arq), 'utf8');

  // Guardas: a página tem que ter nascido COM as peças que a casca não tinha.
  const faltando = [];
  if (!/data-framer-name="Section Produtos"/.test(s)) faltando.push('rodapé');
  if (!/nav[^>]*data-framer-name="Navigation/.test(s)) faltando.push('navbar');
  if (!s.includes('<h1')) faltando.push('h1');
  if (faltando.length) throw new Error(arq + ': gerado sem ' + faltando.join(', '));

  fs.copyFileSync(path.join(SITE, arq), path.join(SITE, apelido));
  console.log('ok  ' + arq.padEnd(20) + (antes / 1024).toFixed(0) + ' KB -> ' +
    (fs.statSync(path.join(SITE, arq)).size / 1024).toFixed(0) + ' KB   (apelido: ' + apelido + ')');
}

// A âncora que o rodapé usa precisa existir de verdade, ou "Trocas e
// devoluções" vira link para lugar nenhum dentro da própria página.
const termos = fs.readFileSync(path.join(SITE, 'termos.html'), 'utf8');
if (!/id="trocas"/.test(termos)) throw new Error('termos.html: âncora #trocas ausente — o link do rodapé quebraria');
console.log('ok  âncora #trocas presente em termos.html');
