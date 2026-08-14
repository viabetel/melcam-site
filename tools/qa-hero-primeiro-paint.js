// Mede a geometria do hero das paginas de produto DESDE O PRIMEIRO QUADRO.
//
// Existe porque a sonda comum so mede depois que a pagina assentou, e o defeito
// que interessa aqui vive antes disso: entre o primeiro paint e a execucao do
// interacoes.js o hero pode estar com a largura errada.
//
// Imprime a primeira geometria observada, a geometria no primeiro paint e a
// final, mais o instante em que ela para de mudar.
//
//   node tools/qa-hero-primeiro-paint.js /polen 1440x900
const path = require('path');
const { spawn } = require('child_process');
const { CDP, pegarJSON, esperarDevTools } = require('./cdp');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ROTA = process.argv[2] || '/polen';
const [LARG, ALT] = (process.argv[3] || '1440x900').split('x').map(Number);
const BASE = process.env.BASE || 'http://localhost:3030';
const PORTA = Number(process.env.PORTA) || 9422;
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

const SONDA = `
(() => {
  const log = []; window.__hero = log;
  const passo = () => {
    const t = performance.now();
    const h = document.querySelector('.mel-ph, .mel-bh');
    if (h) {
      const r = h.getBoundingClientRect();
      log.push({
        t: Math.round(t),
        cx: Math.round(r.left), cy: Math.round(r.top),
        w: Math.round(r.width), h: Math.round(r.height),
        vw: document.documentElement.clientWidth,
        paints: performance.getEntriesByType('paint').length,
      });
    }
    if (t < 5000) requestAnimationFrame(passo);
  };
  requestAnimationFrame(passo);
})();
`;

(async () => {
  const proc = spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
    '--no-default-browser-check', '--mute-audio', '--hide-scrollbars',
    '--remote-debugging-port=' + PORTA,
    '--user-data-dir=' + path.join(__dirname, 'edge-cdp-' + PORTA), 'about:blank',
  ], { stdio: 'ignore' });

  await esperarDevTools(PORTA);
  const alvos = await pegarJSON(PORTA, '/json/list');
  const c = await CDP.conectar(alvos.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await c.enviar('Page.enable');
  await c.enviar('Runtime.enable');
  await c.enviar('Network.enable');
  await c.enviar('Emulation.setDeviceMetricsOverride', {
    width: LARG, height: ALT, deviceScaleFactor: 1, mobile: LARG < 810,
  });
  await c.enviar('Network.setCacheDisabled', { cacheDisabled: true });
  await c.enviar('Page.addScriptToEvaluateOnNewDocument', { source: SONDA });

  const carregou = new Promise((ok) => c.ao('Page.loadEventFired', ok));
  await c.enviar('Page.navigate', { url: BASE + ROTA });
  await Promise.race([carregou, dormir(45000)]);
  await dormir(5200);

  const r = await c.enviar('Runtime.evaluate', { expression: 'JSON.stringify(window.__hero || [])', returnByValue: true });
  const log = JSON.parse(r.result.value || '[]');
  const cx = (s) => s.cx + ',' + s.cy + ' ' + s.w + 'x' + s.h;

  const primeira = log[0] || null;
  const noPaint = log.find((s) => s.paints > 0) || null;
  const final = log[log.length - 1] || null;
  // Ultimo instante em que a caixa ainda mudou: e o tamanho do salto visivel.
  let assentou = null;
  for (let i = log.length - 1; i > 0; i--) {
    if (cx(log[i]) !== cx(log[i - 1])) { assentou = log[i].t; break; }
  }
  const saltou = primeira && final && cx(primeira) !== cx(final);

  console.log(JSON.stringify({
    rota: ROTA, viewport: LARG + 'x' + ALT,
    primeiraCaixa: primeira ? cx(primeira) + ' @' + primeira.t + 'ms' : null,
    caixaNoPrimeiroPaint: noPaint ? cx(noPaint) + ' @' + noPaint.t + 'ms' : null,
    caixaFinal: final ? cx(final) : null,
    ultimaMudanca: assentou,
    saltouDepoisDoPrimeiroQuadro: !!saltou,
    larguraCorretaJaNoPrimeiroQuadro: !!(primeira && final && primeira.w === final.w && primeira.cx === final.cx),
  }, null, 2));

  c.fechar(); proc.kill();
  process.exit(0);
})().catch((e) => { console.error('FALHOU:', e.message); process.exit(1); });
