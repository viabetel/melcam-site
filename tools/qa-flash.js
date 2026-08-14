// QA do flash da hero antiga nas paginas internas.
//
// Grava um screencast do carregamento e, em paralelo, uma amostragem por
// requestAnimationFrame do estado computado dos blocos SO_HOME. Serve para
// responder duas perguntas que a inspecao estatica nao responde:
//
//   1. em algum quadro pintado a estrutura da home aparece?
//   2. quando o CSS que a esconde passa a valer?
//
// Le e grava so em tools/shots-flash/. Nao altera o site.
//
//   node tools/qa-flash.js [rota] [larguraxaltura] [rotulo]
//   node tools/qa-flash.js /polen 1440x900 polen-desktop
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { CDP, pegarJSON, esperarDevTools } = require('./cdp');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ROTA = process.argv[2] || '/polen';
const [LARG, ALT] = (process.argv[3] || '1440x900').split('x').map(Number);
const ROTULO = process.argv[4] || 'flash';
const BASE = process.env.BASE || 'http://localhost:3030';
const PORTA = Number(process.env.PORTA) || 9412;
const SAIDA = path.join(__dirname, 'shots-flash');
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

// Roda antes de qualquer script da pagina. Amostra a cada quadro, desde o
// primeiro possivel, o que o CSS diz sobre os blocos que sao so da home.
const SONDA = `
(() => {
  const SEL = [
    '[data-framer-name="Header Section"]',
    '[data-framer-name="Header Info"]',
    '[data-framer-name="Header Grid"]',
    '[data-framer-name="Header Grids"]',
    '[data-framer-name="The first section"]',
    '[data-framer-name="Shadow"]',
  ];
  const log = [];
  window.__melFlash = log;
  const amostrar = () => {
    const t = performance.now();
    const visiveis = [];
    for (const s of SEL) {
      for (const el of document.querySelectorAll(s)) {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) { visiveis.push(s + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); break; }
      }
    }
    const pintou = performance.getEntriesByType('paint').map(e => e.name + '@' + Math.round(e.startTime));
    log.push({ t: Math.round(t), estado: document.readyState, visiveis, pintou });
    if (t < 6000) requestAnimationFrame(amostrar);
  };
  requestAnimationFrame(amostrar);
})();
`;

(async () => {
  fs.mkdirSync(SAIDA, { recursive: true });
  const proc = spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
    '--no-default-browser-check', '--hide-scrollbars', '--mute-audio',
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

  // Rede e CPU freados de proposito: o flash e uma corrida, e numa maquina
  // rapida com cache quente ela pode nao acontecer nem quando o defeito existe.
  if (!process.env.SEM_FREIO) {
    await c.enviar('Network.emulateNetworkConditions', {
      offline: false, latency: 120, downloadThroughput: 900 * 1024, uploadThroughput: 400 * 1024,
    });
    await c.enviar('Emulation.setCPUThrottlingRate', { rate: 4 });
  }
  await c.enviar('Network.setCacheDisabled', { cacheDisabled: true });

  // ATRASO_CSS=3000 segura a folha externa por 3s. E o teste que separa "o
  // navegador bloqueia o paint ate a folha chegar" de "o navegador pinta antes
  // e o flash e real": se a estrutura da home aparecer aqui, a causa e a folha
  // externa; se nao aparecer, a causa esta noutro lugar.
  // BLOQUEAR_CSS=1 derruba a folha externa de vez. E o teste da rede de
  // seguranca: com identidade.css fora do ar, so o CSS critico inline segura o
  // DOM da home. Se ele nao existisse, a home inteira apareceria.
  if (process.env.BLOQUEAR_CSS) {
    await c.enviar('Network.setBlockedURLs', { urls: ['*identidade.css*'] });
  } else if (process.env.ATRASO_CSS) {
    await c.enviar('Fetch.enable', { patterns: [{ urlPattern: '*identidade.css*' }] });
    c.ao('Fetch.requestPaused', async (p) => {
      await dormir(Number(process.env.ATRASO_CSS));
      try { await c.enviar('Fetch.continueRequest', { requestId: p.requestId }); } catch {}
    });
  }

  await c.enviar('Page.addScriptToEvaluateOnNewDocument', { source: SONDA });

  const quadros = [];
  c.ao('Page.screencastFrame', async (p) => {
    quadros.push({ dados: p.data, t: p.metadata.timestamp, chegou: Date.now() });
    try { await c.enviar('Page.screencastFrameAck', { sessionId: p.sessionId }); } catch {}
  });
  await c.enviar('Page.startScreencast', { format: 'png', everyNthFrame: 1 });

  // VIA=/ carrega antes a rota indicada e so depois vai para a rota alvo, na
  // mesma aba. E o percurso real do visitante, e o unico que expoe o "paint
  // holding": o navegador segura os pixels da pagina anterior ate a nova
  // conseguir pintar.
  if (process.env.VIA) {
    const antes = new Promise((ok) => c.ao('Page.loadEventFired', ok));
    await c.enviar('Page.navigate', { url: BASE + process.env.VIA });
    await Promise.race([antes, dormir(45000)]);
    await dormir(3000);
  }

  const carregou = new Promise((ok) => c.ao('Page.loadEventFired', ok));
  const t0 = Date.now();
  await c.enviar('Page.navigate', { url: BASE + ROTA });
  await Promise.race([carregou, dormir(45000)]);
  await dormir(2500);
  await c.enviar('Page.stopScreencast');

  const r = await c.enviar('Runtime.evaluate', {
    expression: 'JSON.stringify(window.__melFlash || [])', returnByValue: true,
  });
  const log = JSON.parse(r.result.value || '[]');

  // Grava os 12 primeiros quadros: e neles que um flash caberia.
  const dir = path.join(SAIDA, ROTULO);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const depois = quadros.filter((q) => q.chegou >= t0);
  depois.slice(0, 14).forEach((q, i) => {
    const ms = String(q.chegou - t0).padStart(5, '0');
    fs.writeFileSync(path.join(dir, String(i).padStart(2, '0') + '-' + ms + 'ms.png'), Buffer.from(q.dados, 'base64'));
  });

  const comHome = log.filter((l) => l.visiveis.length);
  const primeiroPaint = log.find((l) => l.pintou.length);
  const saida = {
    rota: ROTA, viewport: LARG + 'x' + ALT, msTotal: Date.now() - t0,
    quadros: quadros.length, amostras: log.length,
    primeiroPaint: primeiroPaint ? primeiroPaint.pintou : null,
    amostrasComEstruturaDaHome: comHome.length,
    detalhe: comHome.slice(0, 8),
    primeirasAmostras: log.slice(0, 6),
  };
  console.log(JSON.stringify(saida, null, 2));

  c.fechar();
  proc.kill();
  process.exit(comHome.length ? 1 : 0);
})().catch((e) => { console.error('FALHOU:', e.message); process.exit(2); });
