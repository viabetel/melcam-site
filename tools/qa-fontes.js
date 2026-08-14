// QA de carregamento de fontes: mede o FOUT de verdade, nao por inferencia.
//
// Tres medidas independentes, porque nenhuma sozinha fecha o caso:
//
//   1. REDE — quando cada arquivo de fonte e PEDIDO e quando termina, contra o
//      instante do primeiro paint. E o que revela a cascata
//      HTML -> identidade.css -> @import fontes.css -> .otf.
//   2. GEOMETRIA — a caixa do titulo do hero a cada quadro. Se ela muda depois
//      do primeiro paint, houve troca de fonte com reflow. E o sintoma que o
//      visitante ve.
//   3. FONTE REAL — CSS.getPlatformFontsForNode diz qual familia o motor
//      REALMENTE usou para desenhar cada no, com contagem de glifos. E o unico
//      jeito de provar que o texto saiu em Iowan e nao em Georgia.
//
// So le. Nao altera arquivo nenhum do projeto.
//
//   node tools/qa-fontes.js /polen 1440x900
//   SEM_FREIO=1 node tools/qa-fontes.js /bee 390x844
const path = require('path');
const { spawn } = require('child_process');
const { CDP, pegarJSON, esperarDevTools } = require('./cdp');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ROTA = process.argv[2] || '/polen';
const [LARG, ALT] = (process.argv[3] || '1440x900').split('x').map(Number);
const BASE = process.env.BASE || 'http://localhost:3030';
const PORTA = Number(process.env.PORTA) || 9430;
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

// Os nos que importam: e o texto acima da dobra das paginas de produto.
const ALVOS = [
  ['titulo do hero', '.mel-ph-tit, .mel-bh-tit, h1'],
  ['eyebrow', '.mel-ph-eyebrow, .mel-bh-eyebrow'],
  ['paragrafo do hero', '.mel-ph-txt, .mel-bh-txt'],
  ['navbar', 'nav a, header a'],
];

const SONDA = `
(() => {
  const log = []; window.__f = log;
  const passo = () => {
    const t = performance.now();
    const alvo = document.querySelector('.mel-ph-tit, .mel-bh-tit, h1');
    const linha = { t: Math.round(t), paints: performance.getEntriesByType('paint').length };
    if (alvo) {
      const r = alvo.getBoundingClientRect();
      linha.cx = Math.round(r.left) + ',' + Math.round(r.top);
      linha.w = Math.round(r.width); linha.h = Math.round(r.height);
      linha.ff = getComputedStyle(alvo).fontFamily.split(',')[0].replace(/["']/g, '');
    }
    if (document.fonts) {
      linha.fontsStatus = document.fonts.status;
      linha.carregadas = document.fonts.size;
    }
    log.push(linha);
    if (t < 6000) requestAnimationFrame(passo);
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
  await c.enviar('DOM.enable');
  await c.enviar('CSS.enable');
  await c.enviar('Emulation.setDeviceMetricsOverride', {
    width: LARG, height: ALT, deviceScaleFactor: 1, mobile: LARG < 810,
  });
  // Cache limpo e rede lenta de proposito: com cache quente o FOUT some
  // sozinho e a medicao vira falso negativo.
  await c.enviar('Network.setCacheDisabled', { cacheDisabled: true });
  // KBPS=150 força o caso extremo: a fonte chega DEPOIS do primeiro paint. É o
  // teste que separa "não aparece fonte velha porque deu tempo" de "não aparece
  // fonte velha porque font-display:block não deixa".
  const kbps = Number(process.env.KBPS) || 700;
  if (!process.env.SEM_FREIO) {
    await c.enviar('Network.emulateNetworkConditions', {
      offline: false, latency: 150, downloadThroughput: kbps * 1024, uploadThroughput: 350 * 1024,
    });
  }

  const rede = new Map();
  const falhas = [];
  const t0 = Date.now();
  c.ao('Network.requestWillBeSent', (p) => {
    if (/\/melcam\/(fonts|identidade)/.test(p.request.url) || /\.(otf|woff2?|ttf)(\?|$)/i.test(p.request.url)) {
      rede.set(p.requestId, { url: p.request.url.replace(BASE, ''), pedido: Date.now() - t0 });
    }
  });
  c.ao('Network.responseReceived', (p) => {
    const r = rede.get(p.requestId);
    if (r) { r.status = p.response.status; r.tipo = p.response.mimeType; }
  });
  c.ao('Network.loadingFinished', (p) => {
    const r = rede.get(p.requestId);
    if (r) { r.fim = Date.now() - t0; r.bytes = p.encodedDataLength; }
  });
  c.ao('Network.loadingFailed', (p) => {
    const r = rede.get(p.requestId);
    if (r) { r.erro = p.errorText; falhas.push(r.url + ' — ' + p.errorText); }
  });

  const consola = [];
  c.ao('Runtime.exceptionThrown', (p) => consola.push('exceção: ' + (p.exceptionDetails.text || '')));
  c.ao('Log.entryAdded', (p) => { if (p.entry.level === 'error') consola.push(p.entry.text); });
  try { await c.enviar('Log.enable'); } catch {}

  await c.enviar('Page.addScriptToEvaluateOnNewDocument', { source: SONDA });
  const carregou = new Promise((ok) => c.ao('Page.loadEventFired', ok));
  await c.enviar('Page.navigate', { url: BASE + ROTA });
  await Promise.race([carregou, dormir(60000)]);
  await dormir(4000);

  // Qual familia o motor REALMENTE usou em cada no.
  const doc = await c.enviar('DOM.getDocument', { depth: -1 });
  const usadas = {};
  for (const [rotulo, sel] of ALVOS) {
    try {
      const n = await c.enviar('DOM.querySelector', { nodeId: doc.root.nodeId, selector: sel });
      if (!n.nodeId) { usadas[rotulo] = 'nó não encontrado'; continue; }
      const pf = await c.enviar('CSS.getPlatformFontsForNode', { nodeId: n.nodeId });
      usadas[rotulo] = (pf.fonts || []).map((f) => f.familyName + ' (' + f.glyphCount + ' glifos'
        + (f.isCustomFont ? ', web font' : ', do sistema') + ')').join(' + ') || 'sem glifo';
    } catch (e) { usadas[rotulo] = 'erro: ' + e.message; }
  }

  const r = await c.enviar('Runtime.evaluate', { expression: 'JSON.stringify(window.__f || [])', returnByValue: true });
  const log = JSON.parse(r.result.value || '[]');
  const comCaixa = log.filter((l) => l.w !== undefined);
  const primeiro = comCaixa[0] || null;
  const ultimo = comCaixa[comCaixa.length - 1] || null;
  const caixa = (l) => l.cx + ' ' + l.w + 'x' + l.h;
  // O que denuncia troca de fonte e a MEDIDA do texto mudar — largura e altura.
  // A posicao muda por outro motivo, legitimo: o hero tem entrada e paralaxe,
  // que mexem em translateY sem tocar na tipografia. Misturar os dois faria a
  // sonda acusar FOUT onde ha so animacao.
  const medida = (l) => l.w + 'x' + l.h;
  let trocou = null, moveu = null;
  for (let i = comCaixa.length - 1; i > 0; i--) {
    if (!trocou && medida(comCaixa[i]) !== medida(comCaixa[i - 1])) {
      trocou = { em: comCaixa[i].t, de: medida(comCaixa[i - 1]), para: medida(comCaixa[i]) };
    }
    if (!moveu && caixa(comCaixa[i]) !== caixa(comCaixa[i - 1])) {
      moveu = { em: comCaixa[i].t, de: caixa(comCaixa[i - 1]), para: caixa(comCaixa[i]) };
    }
    if (trocou && moveu) break;
  }

  const pt = await c.enviar('Runtime.evaluate', {
    expression: "JSON.stringify(performance.getEntriesByType('paint').map(p=>p.name+'@'+Math.round(p.startTime)))",
    returnByValue: true,
  });

  console.log(JSON.stringify({
    rota: ROTA, viewport: LARG + 'x' + ALT, freio: process.env.SEM_FREIO ? 'nenhum' : kbps + ' KB/s · 150 ms',
    paint: JSON.parse(pt.result.value),
    rede: [...rede.values()].sort((a, b) => a.pedido - b.pedido)
      .map((x) => `${String(x.pedido).padStart(5)}→${String(x.fim ?? '?').padStart(5)}ms  ${x.status || '?'}  ${String(x.bytes ?? '?').padStart(7)}B  ${x.url}${x.erro ? '  ERRO ' + x.erro : ''}`),
    fontes404: falhas,
    tituloPrimeiraCaixa: primeiro ? caixa(primeiro) + ' @' + primeiro.t + 'ms' : null,
    tituloCaixaFinal: ultimo ? caixa(ultimo) : null,
    ultimaMudancaDeMEDIDA: trocou,
    ultimaMudancaDeCAIXA: moveu,
    houveReflowTipografico: !!trocou,
    familiaCSSDoTitulo: ultimo ? ultimo.ff : null,
    familiaREALMENTEusada: usadas,
    console: consola,
  }, null, 2));

  c.fechar(); proc.kill();
  process.exit(falhas.length || consola.length ? 1 : 0);
})().catch((e) => { console.error('FALHOU:', e.message); process.exit(2); });
