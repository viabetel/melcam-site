// Refaz reduced-motion com scroll progressivo (pular direto pro fim não dispara
// o transform: o grupo nunca entra na viewport) e a transição com link real.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { CDP, pegarJSON, esperarDevTools } = require('./cdp');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const P = 9711;
const BASE = 'https://teste123456321654.framer.website';
const dormir = (t) => new Promise((r) => setTimeout(r, t));

const FILEIRA = `(() => {
  const g = document.querySelector('.framer-dtlgl4');
  if (!g) return null;
  const cs = getComputedStyle(g);
  const r = g.getBoundingClientRect();
  return { opacity: +cs.opacity, transform: cs.transform, telaW: +r.width.toFixed(1),
           topoDoc: Math.round(r.top + scrollY), layoutW: g.offsetWidth };
})()`;

const dec = (m) => {
  const n = (m.match(/matrix3d\((.*)\)/) || m.match(/matrix\((.*)\)/) || [, ''])[1].split(',').map(Number);
  if (m.startsWith('matrix3d')) return { escala: +n[0].toFixed(4), y: +n[13].toFixed(1) };
  if (m.startsWith('matrix')) return { escala: +n[0].toFixed(4), y: +n[5].toFixed(1) };
  return { escala: null, y: null };
};

(async () => {
  const proc = spawn(EDGE, [
    '--headless=new','--disable-gpu','--no-sandbox','--no-first-run','--hide-scrollbars',
    '--remote-debugging-port=' + P, '--user-data-dir=' + path.join(__dirname, 'edge-extras2'), 'about:blank',
  ], { stdio: 'ignore' });
  await esperarDevTools(P);
  const t0 = (await pegarJSON(P, '/json/list')).find((x) => x.type === 'page');
  const c = await CDP.conectar(t0.webSocketDebuggerUrl);
  await c.enviar('Page.enable'); await c.enviar('Runtime.enable');

  const saida = {};

  // ---------- reduced-motion, com scroll progressivo ----------
  for (const modo of ['no-preference', 'reduce']) {
    await c.enviar('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: modo }] });
    await c.enviar('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    const ok = new Promise((r) => c.ao('Page.loadEventFired', r));
    await c.enviar('Page.navigate', { url: BASE });
    await Promise.race([ok, dormir(35000)]);
    await dormir(4500);

    const m0 = (await c.enviar('Runtime.evaluate', { expression: FILEIRA, returnByValue: true })).result.value;
    const inicio = Math.max(0, m0.topoDoc - 1800);
    const fim = m0.topoDoc + 315;
    const curva = [];
    for (let i = 0; i < 7; i++) {
      const y = Math.round(inicio + ((fim - inicio) * i) / 6);
      await c.enviar('Runtime.evaluate', { expression: `scrollTo(0, ${y})` });
      await dormir(1200);
      const v = (await c.enviar('Runtime.evaluate', { expression: FILEIRA, returnByValue: true })).result.value;
      curva.push({ y, opacity: +v.opacity.toFixed(3), ...dec(v.transform), telaW: v.telaW });
    }
    saida[modo] = curva;
    console.log(`\n=== prefers-reduced-motion: ${modo} ===`);
    curva.forEach((x) => console.log(`  y=${String(x.y).padStart(5)}  opacity=${String(x.opacity).padEnd(6)} scale=${String(x.escala).padEnd(7)} translateY=${x.y != null ? x.y : ''}${''}  ty=${x.y0 ?? ''}`));
    curva.forEach(() => {});
  }

  // imprime limpo
  for (const modo of Object.keys(saida)) {
    console.log(`\n--- ${modo} ---`);
    saida[modo].forEach((x) => console.log(`  scrollY=${String(x.y).padStart(5)}  opacity=${String(x.opacity).padEnd(6)}  scale=${String(x.escala).padEnd(7)}  telaW=${x.telaW}`));
  }

  // ---------- transição de página, com destino real ----------
  await c.enviar('Emulation.setEmulatedMedia', { features: [] });
  const ok2 = new Promise((r) => c.ao('Page.loadEventFired', r));
  await c.enviar('Page.navigate', { url: BASE });
  await Promise.race([ok2, dormir(35000)]); await dormir(4000);

  const r = await c.enviar('Runtime.evaluate', { returnByValue: true, expression: `(() => {
    const a = [...document.querySelectorAll('a[href]')].find((x) => {
      const h = x.getAttribute('href'); return h && h !== './' && /^\\.\\//.test(h);
    });
    if (!a) return { erro: 'sem link' };
    const alvo = a.getAttribute('href');
    window.__marcas = []; window.__t0 = performance.now();
    const rec = () => { const cs = getComputedStyle(document.body);
      window.__marcas.push({ dt: Math.round(performance.now() - window.__t0),
        path: location.pathname, op: +cs.opacity, tr: cs.transform }); };
    rec(); const id = setInterval(rec, 60); setTimeout(() => clearInterval(id), 2200);
    a.click();
    return { alvo };
  })()` });
  console.log('\nclicou em:', JSON.stringify(r.result.value));
  await dormir(2600);
  const marcas = (await c.enviar('Runtime.evaluate', {
    expression: 'JSON.stringify(window.__marcas || [])', returnByValue: true })).result.value;
  let m = [];
  try { m = JSON.parse(marcas); } catch {}
  console.log('amostras durante a navegação:', m.length);
  m.slice(0, 14).forEach((x) => console.log(`  +${String(x.dt).padStart(4)}ms  path=${x.path}  bodyOpacity=${x.op}  transform=${x.tr}`));
  saida.transicao = m;

  fs.writeFileSync(path.join(__dirname, 'extras2.json'), JSON.stringify(saida, null, 2));
  c.fechar(); proc.kill(); process.exit(0);
})().catch((e) => { console.error('FALHOU:', e.message); process.exit(1); });
