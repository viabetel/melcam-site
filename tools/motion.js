// FASE 1 — auditoria de motion do template original publicado.
// Não toca no canvas. Lê os valores DECLARADOS pelo Framer (script framer/appear)
// e mede o comportamento REAL em 5 viewports, via Edge headless por CDP.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { CDP, pegarJSON, esperarDevTools } = require('./cdp');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const P = 9600;
const URL_BASE = process.argv[2] || 'https://teste123456321654.framer.website';
const dormir = (t) => new Promise((r) => setTimeout(r, t));

const TELAS = [
  { n: 'desktop-1440', w: 1440, h: 900 },
  { n: 'laptop-1024', w: 1024, h: 768 },
  { n: 'tablet-768', w: 768, h: 1024 },
  { n: 'mobile-390', w: 390, h: 844 },
  { n: 'mobile-360', w: 360, h: 800 },
];

// Extrai o JSON declarado + o mapa de appear-id -> elemento nomeado.
const DECLARADO = `(() => {
  const s = document.getElementById('__framer__appearAnimationsContent');
  const json = s ? JSON.parse(s.textContent) : {};
  const nos = {};
  for (const el of document.querySelectorAll('[data-framer-appear-id]')) {
    const id = el.getAttribute('data-framer-appear-id');
    // sobe até achar um ancestral com nome, para saber a que seção pertence
    let sec = el, nomeSec = '';
    while (sec && !nomeSec) {
      const n = sec.getAttribute && sec.getAttribute('data-framer-name');
      if (n && sec !== el) nomeSec = n;
      sec = sec.parentElement;
    }
    nos[id] = {
      nome: el.getAttribute('data-framer-name') || '',
      secao: nomeSec,
      tag: el.tagName,
      classe: (el.className || '').toString().split(' ').filter(Boolean)[0] || '',
      texto: (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 60),
    };
  }
  return { json, nos };
})()`;

// Mede grupos com transform ligado a scroll (os que não são appear).
const SCROLL = `(() => {
  const cands = [...document.querySelectorAll('[style*="will-change"], [data-framer-name]')]
    .filter((e) => {
      const t = getComputedStyle(e).transform;
      return e.offsetHeight > 60 && t && t !== 'none';
    });
  const vistos = new Set();
  return cands.slice(0, 40).map((e) => {
    const cs = getComputedStyle(e);
    const r = e.getBoundingClientRect();
    return {
      nome: e.getAttribute('data-framer-name') || '',
      classe: (e.className || '').toString().split(' ').filter(Boolean)[0] || '',
      appearId: e.getAttribute('data-framer-appear-id') || '',
      opacity: +cs.opacity, transform: cs.transform,
      perspective: cs.perspective, transformOrigin: cs.transformOrigin,
      overflow: cs.overflow, filter: cs.filter,
      telaW: +r.width.toFixed(1), telaH: +r.height.toFixed(1),
      topoDoc: Math.round(r.top + scrollY),
    };
  }).filter((x) => { const k = x.classe + x.nome; if (vistos.has(k)) return false; vistos.add(k); return true; });
})()`;

function decompor(m) {
  const n = (m.match(/matrix3d\((.*)\)/) || m.match(/matrix\((.*)\)/) || [, ''])[1].split(',').map(Number);
  if (m.startsWith('matrix3d')) return { escala: +n[0].toFixed(4), y: +n[13].toFixed(1), x: +n[12].toFixed(1) };
  if (m.startsWith('matrix')) return { escala: +n[0].toFixed(4), y: +n[5].toFixed(1), x: +n[4].toFixed(1) };
  return { escala: null, y: null, x: null };
}

(async () => {
  const proc = spawn(EDGE, [
    '--headless=new','--disable-gpu','--no-sandbox','--no-first-run','--hide-scrollbars',
    '--remote-debugging-port=' + P, '--user-data-dir=' + path.join(__dirname, 'edge-motion'), 'about:blank',
  ], { stdio: 'ignore' });
  await esperarDevTools(P);
  const t0 = (await pegarJSON(P, '/json/list')).find((x) => x.type === 'page');
  const c = await CDP.conectar(t0.webSocketDebuggerUrl);
  await c.enviar('Page.enable'); await c.enviar('Runtime.enable'); await c.enviar('Log.enable');
  const erros = [];
  c.ao('Log.entryAdded', (p) => { if (p.entry.level === 'error') erros.push(p.entry.text.slice(0, 140)); });

  const relatorio = { url: URL_BASE, declarado: null, nos: null, telas: {}, erros };

  for (const tela of TELAS) {
    await c.enviar('Emulation.setDeviceMetricsOverride', {
      width: tela.w, height: tela.h, deviceScaleFactor: 1, mobile: tela.w <= 500 });
    const carregou = new Promise((r) => c.ao('Page.loadEventFired', r));
    await c.enviar('Page.navigate', { url: URL_BASE });
    await Promise.race([carregou, dormir(35000)]);
    await dormir(4500);

    if (!relatorio.declarado) {
      const d = (await c.enviar('Runtime.evaluate', { expression: DECLARADO, returnByValue: true })).result.value;
      relatorio.declarado = d.json; relatorio.nos = d.nos;
    }

    // percorre a página inteira em 5 marcos de progresso
    const alturaDoc = (await c.enviar('Runtime.evaluate', {
      expression: 'document.documentElement.scrollHeight - innerHeight', returnByValue: true })).result.value;
    const marcos = [0, 0.25, 0.5, 0.75, 1];
    const amostras = [];
    for (const m of marcos) {
      await c.enviar('Runtime.evaluate', { expression: `scrollTo(0, ${Math.round(alturaDoc * m)})` });
      await dormir(1300);
      const v = (await c.enviar('Runtime.evaluate', { expression: SCROLL, returnByValue: true })).result.value;
      amostras.push({ progresso: m, itens: v.map((x) => ({ ...x, ...decompor(x.transform) })) });
    }
    relatorio.telas[tela.n] = { viewport: tela, alturaDoc, amostras };
    console.log(`  ${tela.n}: ${amostras[0].itens.length} elementos com transform, doc ${alturaDoc}px`);
  }

  fs.writeFileSync(path.join(__dirname, 'motion-bruto.json'), JSON.stringify(relatorio, null, 2));
  console.log(`\ndeclarados: ${Object.keys(relatorio.declarado || {}).length} appear-ids`);
  console.log(`nos mapeados: ${Object.keys(relatorio.nos || {}).length}`);
  console.log(`erros de console: ${erros.length}`);
  c.fechar(); proc.kill(); process.exit(0);
})().catch((e) => { console.error('FALHOU:', e.message); process.exit(1); });
