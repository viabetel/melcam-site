// PRÉ-VOO DO MELCAM — 13/08/2026
//
// Só diagnostica. Não escreve arquivo, não mata processo, não conserta nada.
// Sai com código != 0 assim que qualquer verificação reprova.
//
//   node tools/preflight.js
//
// Por que existe: em 13/08 descobrimos duas cópias do projeto. A oficial aqui e
// uma antiga em C:\Users\israe\Downloads\framer-teste, com a regressão da
// fileira. Um `node serve.js` iniciado na cópia antiga servia localhost:3030, e
// o navegador mostrava a animação quebrada enquanto os arquivos corretos
// seguiam intactos na oficial. Responder 200 não prova nada: prova é o caminho
// da raiz, o header de identidade e o SHA-256 do conteúdo servido contra o
// arquivo em disco.
const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');

const RAIZ = path.resolve(__dirname, '..');
const MARCADOR = path.join(RAIZ, '.melcam-project.json');
const PORTA = Number(process.env.PORT) || 3030;

let falhas = 0;
const ok = (msg) => console.log(`[OK]   ${msg}`);
const erro = (msg, detalhe) => {
  console.log(`[ERRO] ${msg}`);
  if (detalhe) String(detalhe).split('\n').forEach((l) => console.log(`       ${l}`));
  falhas++;
};

const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

function ler(rel) {
  try { return fs.readFileSync(path.join(RAIZ, rel)); } catch { return null; }
}

// GET simples; devolve status, headers e corpo. Nunca lança — a porta pode
// estar livre, e isso é um resultado válido, não um crash.
function pegar(caminho) {
  return new Promise((resolve) => {
    const req = http.get(
      { host: '127.0.0.1', port: PORTA, path: caminho, timeout: 4000 },
      (res) => {
        const partes = [];
        res.on('data', (c) => partes.push(c));
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, corpo: Buffer.concat(partes) }));
      }
    );
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.on('error', () => resolve(null));
  });
}

// --------------------------------------------------------------- 1. raiz
let marcador = null;
try {
  marcador = JSON.parse(fs.readFileSync(MARCADOR, 'utf8'));
} catch (e) {
  erro('marcador do projeto', `${MARCADOR}\n${e.message}`);
}

const mesmo = (a, b) => {
  const n = (p) => path.resolve(p).replace(/[\\/]+$/, '');
  return process.platform === 'win32' ? n(a).toLowerCase() === n(b).toLowerCase() : n(a) === n(b);
};

if (marcador) {
  if (marcador.project === 'melcam-site' && marcador.role === 'canonical') {
    ok('marcador do projeto');
  } else {
    erro('marcador do projeto', `project=${marcador.project} role=${marcador.role}`);
  }
  if (mesmo(RAIZ, marcador.canonicalRoot || '')) {
    ok(`raiz canônica  (${RAIZ})`);
  } else {
    erro('raiz canônica', `atual:      ${RAIZ}\nautorizada: ${marcador.canonicalRoot}`);
  }
}

// ------------------------------------------------- 2. arquivos obrigatórios
const OBRIGATORIOS = [
  'progresso.md', 'serve.js', 'index.html',
  'melcam/identidade.css', 'melcam/interacoes.js',
  'tools/hero-carrossel.js', 'tools/identidade.js',
];
const faltando = OBRIGATORIOS.filter((f) => !fs.existsSync(path.join(RAIZ, f)));
faltando.length ? erro('arquivos obrigatórios', 'faltando: ' + faltando.join(', '))
                : ok('arquivos obrigatórios');

// ------------------------------------------------------------- 3. o motor
const js = ler('melcam/interacoes.js');
if (!js) {
  erro('motor iniciarFileira', 'melcam/interacoes.js não existe');
} else {
  const s = js.toString('utf8');
  const temFileira = /function\s+iniciarFileira\b/.test(s);
  const temReveal = /function\s+iniciarReveal\b/.test(s);
  if (temFileira && !temReveal) ok('motor iniciarFileira');
  else if (!temFileira) erro('motor iniciarFileira', 'função ausente — este é o build antigo');
  else erro('motor iniciarFileira', 'iniciarReveal ainda presente — regressão da cópia antiga');
}

// ---------------------------------------------------------- 4. CSS da fileira
const cssBuf = ler('melcam/identidade.css');
if (!cssBuf) {
  erro('CSS da fileira', 'melcam/identidade.css não existe');
} else {
  const css = cssBuf.toString('utf8');
  // Sem os comentários: eles citam de propósito o que foi abandonado
  // (overflow-x:auto, scroll-snap), e procurar no arquivo cru daria falso
  // positivo em cima da própria documentação.
  const efetivo = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const regra = (efetivo.match(/\.framer-dtlgl4\s*\{[^}]*\}/) || [])[0] || '';

  const problemas = [];
  if (!regra) problemas.push('regra .framer-dtlgl4{...} não encontrada');
  if (regra && !/width:\s*max-content/.test(regra)) problemas.push('sem width:max-content');
  if (regra && !/overflow:\s*hidden/.test(regra)) problemas.push('sem overflow:hidden');
  if (/overflow-x:\s*auto/.test(regra)) problemas.push('overflow-x:auto presente (carrossel de swipe)');
  if (/scroll-snap-type/.test(regra)) problemas.push('scroll-snap-type presente');
  problemas.length ? erro('CSS da fileira', problemas.join('\n')) : ok('CSS da fileira');

  const abre = (css.match(/\{/g) || []).length;
  const fecha = (css.match(/\}/g) || []).length;
  abre === fecha ? ok(`CSS balanceado  (${abre}/${fecha})`)
                 : erro('CSS balanceado', `${abre} "{" contra ${fecha} "}"`);
}

// ------------------------------------------------------- 5. sintaxe do JS
{
  const { execFileSync } = require('child_process');
  const alvos = ['melcam/interacoes.js', 'serve.js', 'tools/hero-carrossel.js', 'tools/identidade.js']
    .filter((f) => fs.existsSync(path.join(RAIZ, f)));
  const quebrados = [];
  for (const f of alvos) {
    try { execFileSync(process.execPath, ['--check', path.join(RAIZ, f)], { stdio: 'pipe' }); }
    catch (e) { quebrados.push(`${f}: ${String(e.stderr || e.message).split('\n')[0]}`); }
  }
  quebrados.length ? erro('sintaxe JavaScript', quebrados.join('\n'))
                   : ok(`sintaxe JavaScript  (${alvos.length} arquivos)`);
}

// ------------------------------------------------- 6. index.html carrega os dois
{
  const html = ler('index.html');
  if (!html) erro('index.html', 'não existe');
  else {
    const s = html.toString('utf8');
    const falta = [];
    if (!s.includes('/melcam/identidade.css')) falta.push('/melcam/identidade.css');
    if (!s.includes('/melcam/interacoes.js')) falta.push('/melcam/interacoes.js');
    falta.length ? erro('index.html referencia CSS e JS', 'não carrega: ' + falta.join(', '))
                 : ok('index.html referencia CSS e JS');
  }
}

// ------------------------------------------ 7. assets que o deploy vai receber
//
// Em 13/08/2026 a hero da /polen abria sem foto no deploy e com foto no local.
// Nada aqui pegava: todo o pré-voo olhava o disco e o localhost, e o arquivo
// estava certo nos dois. O que faltava era conferir o que a VERCEL recebe —
// .vercelignore excluía a pasta inteira. Por isso esta etapa entrou.
{
  let r = null;
  try {
    r = require('./verificar-assets-deploy.js').rodar();
  } catch (e) {
    erro('assets do deploy', `verificar-assets-deploy.js falhou: ${e.message}`);
  }
  if (r) {
    const g = r.grupos;
    const linhas = [];
    for (const a of g.ignorado) linhas.push(`${a.url}\n  excluído por: ${a.regra}`);
    for (const a of g.ausente) linhas.push(`${a.url}\n  não existe no disco`);
    for (const a of g.caixa) linhas.push(`${a.url}\n  disco tem "${a.real}", a página pede "${a.esperado}"`);
    for (const a of g.naoVersionado) linhas.push(`${a.url}\n  existe, mas não está versionado`);
    for (const a of g.invalido) linhas.push(`${a.url}\n  ${a.motivo}`);
    linhas.length
      ? erro('assets do deploy', `${linhas.length} asset(s) usados não chegariam ao ar:\n` + linhas.join('\n'))
      : ok(`assets do deploy  (${g.ok.length} referenciados, todos publicáveis)`);
  }
}

// -------------------------------------------- 8. servidor: identidade e hashes
(async () => {
  const raiz = await pegar('/');

  if (!raiz) {
    console.log(`[--]   porta ${PORTA} livre — servidor não está de pé (não é erro)`);
  } else if (raiz.headers['x-melcam-project'] !== 'canonical') {
    erro(`servidor canônico na porta ${PORTA}`,
      `x-melcam-project: ${raiz.headers['x-melcam-project'] || '(ausente)'}\n` +
      'Outro projeto, ou uma cópia antiga do MELCAM, está ocupando a porta.');
  } else {
    ok(`servidor canônico  (x-melcam-project: canonical, x-melcam-root: ${raiz.headers['x-melcam-root']})`);

    // O header prova a identidade do código; o hash prova o conteúdo. Os dois
    // são necessários: um serve.js canônico apontado para outra pasta por
    // SERVE_ROOT passaria no header e falharia aqui.
    const divergentes = [];
    for (const rel of ['melcam/identidade.css', 'melcam/interacoes.js']) {
      const local = ler(rel);
      const remoto = await pegar('/' + rel);
      if (!local) { divergentes.push(`${rel}: ausente em disco`); continue; }
      if (!remoto || remoto.status !== 200) { divergentes.push(`${rel}: HTTP ${remoto ? remoto.status : 'sem resposta'}`); continue; }
      const a = sha(local), b = sha(remoto.corpo);
      if (a !== b) divergentes.push(`${rel}\n  disco: ${a.slice(0, 32)}\n  HTTP : ${b.slice(0, 32)}`);
    }
    divergentes.length
      ? erro('conteúdo HTTP sincronizado',
          'localhost está servindo outra cópia ou conteúdo desatualizado\n' + divergentes.join('\n'))
      : ok('conteúdo HTTP sincronizado  (SHA-256 confere)');
  }

  console.log('');
  if (falhas) {
    console.log(`${falhas} verificação(ões) reprovada(s).`);
    console.log('Comando correto:');
    console.log('  cd C:\\Users\\israe\\viabetel\\melcam-site');
    console.log('  node tools/preflight.js');
    console.log('  node serve.js');
    process.exit(1);
  }
  console.log('pré-voo limpo.');
  process.exit(0);
})();
