// Reaplica o símbolo do logo nos HTML — 13/08/2026.
//
//   node tools/sincronizar-logo.js
//
// Existe porque o logo passou a pintar em currentColor (o porquê está em
// tools/logo.js) e o símbolo mora dentro de cada HTML, não numa folha
// compartilhada. `tools/logo.js aplicar()` já faz a troca por id e é
// idempotente; aqui ele recebe a lista certa de arquivos e as provas.
//
// Não roda `tools/aplicar.js`: aquele reconstrói o site de _ORIGINAL/ e apaga o
// trabalho de 12 e 13/08. Este toca só no bloco <svg id="svg11961625616">.
const fs = require('fs');
const path = require('path');

const SITE = path.resolve(__dirname, '..');
const PAGINAS = ['index.html', 'polen.html', 'bee.html', 'acessorios.html', 'sobre.html',
  'sacola.html', '404.html', 'privacidade.html', 'privacy-policy.html',
  'termos.html', 'terms-and-conditions.html', 'contact.html', 'faq.html'];

const alvos = PAGINAS.map((f) => path.join(SITE, f)).filter((f) => fs.existsSync(f));
const antes = alvos.map((f) => ({ f, tam: fs.statSync(f).size }));

const r = require('./logo.js').aplicar(alvos);

let usos = 0, fixos = 0, correntes = 0, faltando = [];
for (const f of alvos) {
  const s = fs.readFileSync(f, 'utf8');
  usos += (s.match(/href="#svg11961625616"/g) || []).length;
  const sim = (s.match(/<svg[^>]*id="svg11961625616"[^>]*>[\s\S]*?<\/svg>/) || [])[0] || '';
  fixos += (sim.match(/fill="#FBF7EE"/g) || []).length;
  correntes += (sim.match(/fill="currentColor"/g) || []).length;
  // Só é falta se a página USA o logo. As jurídicas e as de contato/FAQ são
  // páginas próprias (tools/rotas.js), sem a navbar do template: elas não
  // referenciam o símbolo, e cobrar o símbolo delas seria inventar defeito.
  if (!sim && (s.match(/href="#svg11961625616"/g) || []).length) faltando.push(path.basename(f));
}

console.log('[OK] símbolo reescrito em ' + r.arquivos + ' arquivo(s), ' + r.n + ' ocorrência(s)');
console.log('     ' + usos + ' <use> apontando para o símbolo, em ' + alvos.length + ' páginas');
console.log('     fill="currentColor": ' + correntes + '   fill fixo de papel restante: ' + fixos);
for (const { f, tam } of antes) {
  const novo = fs.statSync(f).size;
  if (novo !== tam) console.log('     ' + path.basename(f).padEnd(26) + tam + ' -> ' + novo);
}

// ---------------------------------------------------------------- a cor
// Com currentColor, quem NÃO definir color entrega o logo em azul de link —
// foi o que aconteceu na home na primeira tentativa. A regra vive em
// tools/identidade.js; aqui ela é levada para a folha construída, na mesma
// posição relativa (logo antes do bloco de foco visível).
const CSS = path.join(SITE, 'melcam', 'identidade.css');
const REGRA = '[data-framer-name="MELCAM"]{ color:#FBF7EE }';
const ANCORA = '/* Acessibilidade: foco visivel que o template nao trazia. */';
let folha = fs.readFileSync(CSS, 'utf8');
let corOk = folha.includes(REGRA);
if (!corOk) {
  const i = folha.indexOf(ANCORA);
  if (i > 0) {
    const nota = [
      '/* O LOGO PINTA EM currentColor desde 13/08/2026 (ver tools/logo.js), entao',
      '   quem decide a cor e esta regra. Sem ela o logo herda o color do <a>, que',
      '   e o azul de link padrao do navegador. Papel e o padrao porque o fundo',
      '   padrao do logo e carvao; a /bee sobrescreve so a instancia da navbar. */',
      REGRA, '', '',
    ].join('\r\n');
    folha = folha.slice(0, i) + nota + folha.slice(i);
    fs.writeFileSync(CSS, folha, 'utf8');
    corOk = true;
    console.log('[OK] regra de cor do logo inserida em melcam/identidade.css');
  }
} else {
  console.log('[OK] regra de cor do logo já estava na folha');
}
const chaves = [folha.split('{').length - 1, folha.split('}').length - 1];
const balanceado = chaves[0] === chaves[1];
if (!balanceado) console.log('[FALHA] chaves desbalanceadas na folha: ' + chaves.join('/'));

const ok = fixos === 0 && correntes > 0 && !faltando.length && corOk && balanceado;
if (faltando.length) console.log('[FALHA] símbolo ausente em: ' + faltando.join(', '));
console.log(ok ? '[OK] nenhum fill de papel cravado sobrou no símbolo'
  : '[FALHA] ainda há cor fixa no símbolo do logo');
process.exit(ok ? 0 : 1);
