// Acha o painel do menu por DIFERENÇA de DOM antes/depois do clique.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { CDP, pegarJSON, esperarDevTools } = require('./cdp');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const P = 9811;
const BASE = 'https://teste123456321654.framer.website';
const dormir = (t) => new Promise((r) => setTimeout(r, t));

const MARCAR = `(() => { let i = 0; for (const e of document.querySelectorAll('*')) e.setAttribute('data-antes', String(i++)); return i; })()`;

const NOVOS = `(() => {
  const novos = [...document.querySelectorAll('*')].filter((e) => !e.hasAttribute('data-antes') && e.getBoundingClientRect().width > 40);
  return novos.slice(0, 10).map((e) => {
    const cs = getComputedStyle(e), r = e.getBoundingClientRect();
    return { tag: e.tagName, nome: e.getAttribute('data-framer-name') || '',
      classe: (e.className || '').toString().split(' ').filter(Boolean).slice(0,2).join(' '),
      position: cs.position, opacity: +cs.opacity, transform: cs.transform, bg: cs.backgroundColor,
      backdrop: cs.backdropFilter, zIndex: cs.zIndex, display: cs.display,
      w: Math.round(r.width), h: Math.round(r.height), topo: Math.round(r.top), esq: Math.round(r.left),
      texto: (e.textContent || '').replace(/\\s+/g,' ').trim().slice(0, 70) };
  });
})()`;

const TRAVA = `({ html: getComputedStyle(document.documentElement).overflow,
                  body: getComputedStyle(document.body).overflow,
                  bodyPos: getComputedStyle(document.body).position,
                  scrollY: Math.round(scrollY) })`;

(async () => {
  const proc = spawn(EDGE, ['--headless=new','--disable-gpu','--no-sandbox','--no-first-run','--hide-scrollbars',
    '--remote-debugging-port=' + P, '--user-data-dir=' + path.join(__dirname, 'edge-ov2'), 'about:blank'], { stdio: 'ignore' });
  await esperarDevTools(P);
  const t0 = (await pegarJSON(P, '/json/list')).find((x) => x.type === 'page');
  const c = await CDP.conectar(t0.webSocketDebuggerUrl);
  await c.enviar('Page.enable'); await c.enviar('Runtime.enable');
  await c.enviar('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  const ok = new Promise((r) => c.ao('Page.loadEventFired', r));
  await c.enviar('Page.navigate', { url: BASE });
  await Promise.race([ok, dormir(35000)]); await dormir(4500);

  const n = (await c.enviar('Runtime.evaluate', { expression: MARCAR, returnByValue: true })).result.value;
  console.log(`marcados ${n} elementos antes do clique`);
  console.log('trava antes:', JSON.stringify((await c.enviar('Runtime.evaluate', { expression: TRAVA, returnByValue: true })).result.value));

  await c.enviar('Input.dispatchMouseEvent', { type: 'mousePressed', x: 36, y: 41, button: 'left', clickCount: 1 });
  await c.enviar('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 36, y: 41, button: 'left', clickCount: 1 });

  const quadros = [];
  for (let i = 0; i < 9; i++) {
    await dormir(80);
    const v = (await c.enviar('Runtime.evaluate', { expression: NOVOS, returnByValue: true })).result.value;
    quadros.push({ ms: (i + 1) * 80, novos: v });
  }
  await dormir(800);
  const fim = (await c.enviar('Runtime.evaluate', { expression: NOVOS, returnByValue: true })).result.value;

  console.log(`\n=== elementos NOVOS apos abrir: ${fim.length} ===`);
  fim.forEach((e, i) => console.log(`  [${i}] <${e.tag}> nome="${e.nome}" .${e.classe}\n      ${e.position} z=${e.zIndex} op=${e.opacity} bg=${e.bg} backdrop=${e.backdrop}\n      ${e.w}x${e.h} @(${e.esq},${e.topo}) transform=${e.transform}\n      texto: "${e.texto}"`));

  console.log('\n=== animacao de entrada do painel (elemento novo [0]) ===');
  quadros.forEach((q) => { const e = q.novos[0];
    console.log(`  +${String(q.ms).padStart(3)}ms  ` + (e ? `op=${e.opacity} tr=${e.transform} ${e.w}x${e.h} @(${e.esq},${e.topo})` : '(ainda nao existe)')); });

  console.log('\ntrava com menu aberto:', JSON.stringify((await c.enviar('Runtime.evaluate', { expression: TRAVA, returnByValue: true })).result.value));

  const shot = await c.enviar('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(__dirname, 'shots', 'menu-aberto.png'), Buffer.from(shot.data, 'base64'));

  // Escape
  for (const tipo of ['keyDown', 'keyUp'])
    await c.enviar('Input.dispatchKeyEvent', { type: tipo, key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
  await dormir(1000);
  const posEsc = (await c.enviar('Runtime.evaluate', { expression: NOVOS, returnByValue: true })).result.value;
  const travaEsc = (await c.enviar('Runtime.evaluate', { expression: TRAVA, returnByValue: true })).result.value;
  console.log(`\n=== apos ESC: ${posEsc.length} elementos novos restantes, trava=${JSON.stringify(travaEsc)}`);

  // clique de novo no icone (fecha?)
  await c.enviar('Input.dispatchMouseEvent', { type: 'mousePressed', x: 36, y: 41, button: 'left', clickCount: 1 });
  await c.enviar('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 36, y: 41, button: 'left', clickCount: 1 });
  await dormir(1000);
  const posClique = (await c.enviar('Runtime.evaluate', { expression: NOVOS, returnByValue: true })).result.value;
  const travaClique = (await c.enviar('Runtime.evaluate', { expression: TRAVA, returnByValue: true })).result.value;
  console.log(`=== apos 2o clique no icone: ${posClique.length} novos, trava=${JSON.stringify(travaClique)}`);

  fs.writeFileSync(path.join(__dirname, 'overlay2.json'), JSON.stringify({ quadros, fim, posEsc, travaEsc, posClique, travaClique }, null, 2));
  c.fechar(); proc.kill(); process.exit(0);
})().catch((e) => { console.error('FALHOU:', e.message); process.exit(1); });
