// QA da abertura da /polen nos 3 breakpoints. Só mede e captura; não altera
// arquivo nenhum do projeto.
//
//   node tools/qa-polen.js [url]
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { CDP, pegarJSON, esperarDevTools } = require('./cdp');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const SAIDA = path.join(__dirname, 'shots-polen');
const URL = process.argv[2] || 'http://localhost:3030/polen';
const PORTA = 9390;
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
if (!fs.existsSync(SAIDA)) fs.mkdirSync(SAIDA, { recursive: true });

const TELAS = [
  { nome: 'desktop', w: 1440, h: 900 },
  { nome: 'tablet', w: 768, h: 1024 },
  { nome: 'mobile', w: 390, h: 844 },
];

const SONDA = `(() => {
  const q = (s) => document.querySelector(s);
  const cx = (el) => el ? el.getBoundingClientRect() : null;
  const hero = q('[data-mel="polen-hero"]');
  const prod = q('[data-mel="polen-produto"]');
  const cam = hero && hero.querySelector('[data-mel="polen-hero-main"]');
  const palco = prod && prod.querySelector('.mel-pr-palco');
  const sw = [].slice.call(document.querySelectorAll('[data-mel-cor]'));
  const cta = q('[data-mel="polen-cta"]');
  const rCta = cx(cta);

  // menor alvo de toque entre os controles novos
  const alvos = sw.concat(cta ? [cta] : []).map((e) => {
    const r = e.getBoundingClientRect();
    return Math.round(Math.min(r.width, r.height));
  });

  const imgs = [].slice.call(document.images).filter((i) => {
    const r = i.getBoundingClientRect(); return r.width > 0 && r.height > 0;
  });

  return {
    largura: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    overflowH: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    heroAltura: hero ? Math.round(cx(hero).height) : null,
    heroTopo: hero ? Math.round(cx(hero).top + scrollY) : null,
    produtoTopo: prod ? Math.round(cx(prod).top + scrollY) : null,
    cameraHero: cam ? Math.round(cx(cam).width) + 'x' + Math.round(cx(cam).height) : null,
    palco: palco ? Math.round(cx(palco).width) + 'x' + Math.round(cx(palco).height) : null,
    swatches: sw.length,
    swatchMin: alvos.length ? Math.min.apply(null, alvos) : null,
    ctaAltura: rCta ? Math.round(rCta.height) : null,
    h1: document.querySelectorAll('h1').length,
    quebradas: imgs.filter((i) => i.complete && i.naturalWidth === 0).length,
    semAlt: imgs.filter((i) => !i.hasAttribute('alt')).length,
    radiogroup: document.querySelectorAll('[role="radiogroup"]').length,
    checked: document.querySelectorAll('[data-mel-cor][aria-checked="true"]').length,
  };
})()`;

(async () => {
  const proc = spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
    '--no-default-browser-check', '--hide-scrollbars', '--mute-audio',
    '--remote-debugging-port=' + PORTA, '--user-data-dir=' + path.join(__dirname, 'edge-cdp-' + PORTA), 'about:blank',
  ], { stdio: 'ignore' });

  await esperarDevTools(PORTA);
  const alvos = await pegarJSON(PORTA, '/json/list');
  const c = await CDP.conectar(alvos.find((t) => t.type === 'page').webSocketDebuggerUrl);

  let erros = [];
  c.ao('Runtime.exceptionThrown', (p) =>
    erros.push('exceção: ' + (p.exceptionDetails?.exception?.description || p.exceptionDetails?.text || '').slice(0, 160)));
  c.ao('Log.entryAdded', (p) => { if (p.entry.level === 'error') erros.push('[' + p.entry.source + '] ' + p.entry.text.slice(0, 160)); });

  await c.enviar('Page.enable');
  await c.enviar('Runtime.enable');
  await c.enviar('Log.enable');
  await c.enviar('Network.enable');

  const rel = { url: URL, telas: {} };

  for (const t of TELAS) {
    for (const reduzido of [false, true]) {
      await c.enviar('Emulation.setDeviceMetricsOverride', {
        width: t.w, height: t.h, deviceScaleFactor: 1, mobile: t.nome === 'mobile',
      });
      await c.enviar('Emulation.setEmulatedMedia', {
        features: reduzido ? [{ name: 'prefers-reduced-motion', value: 'reduce' }] : [],
      });
      erros = [];

      const carregou = new Promise((ok) => c.ao('Page.loadEventFired', ok));
      await c.enviar('Page.navigate', { url: URL });
      await Promise.race([carregou, dormir(30000)]);
      await dormir(2600);

      // leva o hero para a viewport e deixa a animação assentar
      await c.enviar('Runtime.evaluate', {
        expression: `(async()=>{const h=document.querySelector('[data-mel="polen-hero"]');
          if(h){h.scrollIntoView({block:'start'});scrollBy(0,-90);}
          await new Promise(r=>setTimeout(r,1200));})()`,
        awaitPromise: true,
      });

      const r = await c.enviar('Runtime.evaluate', { expression: SONDA, returnByValue: true });
      const v = r.result.value;
      v.erros = [...new Set(erros)];

      // estado final da câmera: quem escreve é o JS
      const est = await c.enviar('Runtime.evaluate', {
        expression: `(()=>{const e=document.querySelector('[data-mel="polen-hero-main"]');
          if(!e)return null;const s=getComputedStyle(e);return {transform:s.transform,opacity:s.opacity};})()`,
        returnByValue: true,
      });
      v.camera = est.result.value;

      rel.telas[t.nome + (reduzido ? '-reduzido' : '')] = v;

      const shot = await c.enviar('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(SAIDA, 'hero-' + t.nome + (reduzido ? '-reduzido' : '') + '.png'),
        Buffer.from(shot.data, 'base64'));

      // segunda captura: a seção de produto
      if (!reduzido) {
        await c.enviar('Runtime.evaluate', {
          expression: `(async()=>{const p=document.querySelector('#produto');
            if(p){p.scrollIntoView({block:'start'});scrollBy(0,-90);}
            await new Promise(r=>setTimeout(r,900));})()`,
          awaitPromise: true,
        });
        const s2 = await c.enviar('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(SAIDA, 'produto-' + t.nome + '.png'), Buffer.from(s2.data, 'base64'));
      }
    }
  }

  fs.writeFileSync(path.join(SAIDA, 'qa-polen.json'), JSON.stringify(rel, null, 2));

  for (const [nome, v] of Object.entries(rel.telas)) {
    const p = [];
    if (v.overflowH) p.push('TRANSBORDA ' + v.scrollWidth + '>' + v.largura);
    if (v.h1 !== 1) p.push(v.h1 + ' <h1>');
    if (v.quebradas) p.push(v.quebradas + ' imagem(ns) quebrada(s)');
    if (v.semAlt) p.push(v.semAlt + ' sem alt');
    if (v.swatches !== 7) p.push(v.swatches + ' swatches');
    if (v.checked !== 1) p.push(v.checked + ' selecionados');
    if (v.erros.length) p.push(v.erros.length + ' erro(s) de console');
    if (v.swatchMin !== null && v.swatchMin < 44) p.push('alvo de toque ' + v.swatchMin + 'px');
    console.log((p.length ? 'X  ' : 'ok ') + nome.padEnd(18) +
      'hero ' + v.heroAltura + 'px · produto @' + v.produtoTopo + ' · palco ' + v.palco +
      ' · cta ' + v.ctaAltura + 'px' + (p.length ? '  <<< ' + p.join(' · ') : ''));
    console.log('     câmera: ' + (v.camera ? v.camera.transform + '  op ' + v.camera.opacity : '(ausente)'));
  }

  c.fechar();
  proc.kill();
  process.exit(0);
})().catch((e) => { console.error('FALHOU:', e.message); process.exit(1); });
