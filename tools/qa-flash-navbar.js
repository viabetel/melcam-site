// QA DO FLASH DA NAVBAR ANTIGA — 14/08/2026.
//
//   node tools/qa-flash-navbar.js
//   node tools/qa-flash-navbar.js /polen 1440x900 polen-desktop
//   VIA=/ node tools/qa-flash-navbar.js /bee 1440x900 clique-home-bee
//   SEM_FREIO=1 node tools/qa-flash-navbar.js
//
// Mede uma coisa só: em quantos QUADROS PINTADOS a barra aparece no estado
// antigo — hambúrguer à vista, sem os quatro destinos, sem as ações da direita.
//
// Por que amostragem por requestAnimationFrame e não screenshot: o rAF roda
// uma vez por quadro composto, então cada amostra corresponde a um quadro que
// o usuário teve chance de ver. Um estado que só existe entre dois rAF nunca
// foi pintado. As duas perguntas que isto responde:
//
//   1. o hambúrguer aparece em algum quadro? em quantos, e por quanto tempo?
//   2. quando o estado final (links à vista) passa a valer, e depois disso
//      ele volta a mudar? (hidratação do Framer desfazendo o DOM)
//
// A sonda entra por Page.addScriptToEvaluateOnNewDocument, ou seja, antes de
// qualquer script da página, e vale para o documento seguinte também: com VIA=
// o percurso é o real, um clique de rota em rota.
//
// Rede e CPU freados de propósito, como no qa-flash.js: o flash é uma corrida,
// e numa máquina rápida com cache quente ele pode não acontecer nem quando o
// defeito existe. SEM_FREIO=1 tira o freio.
//
// Só lê o site e grava em tools/shots-flash-navbar/. Não altera nada.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { CDP, pegarJSON, esperarDevTools } = require('./cdp');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ROTA = process.argv[2] || '/';
const [LARG, ALT] = (process.argv[3] || '1440x900').split('x').map(Number);
const ROTULO = process.argv[4] || 'navbar';
const BASE = process.env.BASE_URL || process.env.BASE || 'http://localhost:3030';
const PORTA = Number(process.env.PORTA) || 9421;
const SAIDA = path.join(__dirname, 'shots-flash-navbar');
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

// A sonda amostra a BARRA VISÍVEL, e não "a primeira <nav> do documento": o
// export do Framer traz três variantes SSR por página, uma por breakpoint, e
// as outras duas ficam com display:none. Medir a errada dá sempre zero.
const SONDA = `
(() => {
  const log = [];
  window.__melNav = log;
  const vis = (el) => {
    if (!el) return false;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < 0.05) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const barra = () => Array.prototype.slice.call(document.querySelectorAll('nav')).filter(vis)[0] || null;
  const amostrar = () => {
    const t = performance.now();
    const nav = barra();
    let e = null;
    if (nav) {
      const linha = nav.querySelector('[data-framer-name="Section "]') || nav;
      // O hambúrguer são as três barrinhas dentro do "Icon" do bloco "Meniu".
      const icone = linha.querySelector('[data-framer-name="Meniu"] [data-framer-name="Icon"]');
      const links = linha.querySelectorAll('.mel-nav-link');
      const marca = linha.querySelector('a[data-framer-name="MELCAM"]');
      const slot = linha.querySelector('[data-framer-name="Section Icon"]');
      const cs = getComputedStyle(linha);
      const rl = linha.getBoundingClientRect();
      const rm = marca ? marca.getBoundingClientRect() : null;
      e = {
        hamburguer: vis(icone),
        links: links.length,
        linksVisiveis: Array.prototype.slice.call(links).filter(vis).length,
        acoes: vis(linha.querySelector('.mel-nav-acoes')),
        slotIcones: vis(slot),
        layout: cs.display,
        // desvio do centro do logo: o sintoma geométrico do estado antigo
        logoFora: rm && rl.width ? Math.round(Math.abs((rm.left + rm.width / 2) - (rl.left + rl.width / 2))) : null,
      };
    }
    const pintou = performance.getEntriesByType('paint').map((p) => p.name[0] + Math.round(p.startTime));
    log.push({ t: Math.round(t), pronto: document.readyState, pintou: pintou.length, e: e });
    if (t < 8000) requestAnimationFrame(amostrar);
  };
  requestAnimationFrame(amostrar);
})();
`;

const chave = (a) => (a ? [a.hamburguer, a.links, a.linksVisiveis, a.acoes, a.slotIcones, a.layout].join('|') : 'sem barra');

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
  if (!process.env.SEM_FREIO) {
    await c.enviar('Network.emulateNetworkConditions', {
      offline: false, latency: 120, downloadThroughput: 900 * 1024, uploadThroughput: 400 * 1024,
    });
    await c.enviar('Emulation.setCPUThrottlingRate', { rate: 4 });
  }
  await c.enviar('Network.setCacheDisabled', { cacheDisabled: true });
  await c.enviar('Page.addScriptToEvaluateOnNewDocument', { source: SONDA });

  const quadros = [];
  c.ao('Page.screencastFrame', async (p) => {
    quadros.push({ dados: p.data, chegou: Date.now() });
    try { await c.enviar('Page.screencastFrameAck', { sessionId: p.sessionId }); } catch {}
  });
  await c.enviar('Page.startScreencast', { format: 'png', everyNthFrame: 1 });

  // VIA=/rota carrega antes outra página e só depois vai para a alvo, na mesma
  // aba. É o percurso do pedido: "ao clicar em qualquer botão da navbar".
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
  await dormir(3000);
  await c.enviar('Page.stopScreencast');

  const r = await c.enviar('Runtime.evaluate', {
    expression: 'JSON.stringify(window.__melNav || [])', returnByValue: true,
  });
  const log = JSON.parse(r.result.value || '[]');

  const dir = path.join(SAIDA, ROTULO);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  quadros.filter((q) => q.chegou >= t0).slice(0, 16).forEach((q, i) => {
    const ms = String(q.chegou - t0).padStart(5, '0');
    fs.writeFileSync(path.join(dir, String(i).padStart(2, '0') + '-' + ms + 'ms.png'), Buffer.from(q.dados, 'base64'));
  });

  // Só conta quadro em que a barra ESTAVA PINTADA: antes do primeiro paint não
  // havia pixel nenhum na tela, e um estado que ninguém viu não é flash.
  const pintados = log.filter((l) => l.pintou > 0 && l.e);
  const comHamburguer = pintados.filter((l) => l.e.hamburguer);
  const semLinks = pintados.filter((l) => !l.e.linksVisiveis && l.e.layout !== 'none');
  const final = pintados.length ? pintados[pintados.length - 1] : null;

  // Transições de estado: quantas vezes a barra muda de cara depois de pintar.
  const trocas = [];
  let ant = null;
  for (const l of pintados) {
    const k = chave(l.e);
    if (k !== ant) { trocas.push({ t: l.t, estado: k }); ant = k; }
  }

  const desktop = LARG >= 1024;
  console.log('=== ' + ROTA + '  ' + LARG + 'x' + ALT + (process.env.VIA ? '  (via ' + process.env.VIA + ')' : '') + ' ===');
  console.log('  amostras pintadas: ' + pintados.length + '  |  quadros do screencast: ' + quadros.length);
  console.log('  quadros com hambúrguer à vista: ' + comHamburguer.length
    + (comHamburguer.length ? '  (de t=' + comHamburguer[0].t + ' a t=' + comHamburguer[comHamburguer.length - 1].t + 'ms)' : ''));
  console.log('  quadros sem os destinos à vista: ' + semLinks.length
    + (semLinks.length ? '  (de t=' + semLinks[0].t + ' a t=' + semLinks[semLinks.length - 1].t + 'ms)' : ''));
  console.log('  estado final: ' + (final ? chave(final.e) + '  logo fora do centro: ' + final.e.logoFora + 'px' : 'sem barra'));
  console.log('  trocas de cara depois de pintar: ' + trocas.length);
  for (const t of trocas) console.log('    t=' + String(t.t).padStart(5) + 'ms  ' + t.estado);
  console.log('  capturas em ' + dir);

  // No desktop o estado antigo é defeito. Abaixo de 1024 o hambúrguer é o
  // desenho aprovado da barra, e ali o que não pode é a barra MUDAR de cara.
  const falhou = desktop ? (comHamburguer.length > 0 || semLinks.length > 0) : trocas.length > 1;
  console.log(falhou ? '\n[FALHA] a barra antiga foi pintada' : '\n[OK] nenhum quadro com a barra antiga');

  c.fechar();
  proc.kill();
  process.exit(falhou ? 1 : 0);
})().catch((e) => { console.error('FALHOU:', e.message); process.exit(2); });
