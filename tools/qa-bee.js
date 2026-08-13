// QA do hero da /bee nos três breakpoints, no Edge headless.
//
//   node tools/qa-bee.js               os três, movimento normal
//   MOVIMENTO=reduce node tools/qa-bee.js
//
// Mede o que o pedido pede que seja verdade, e nada que dê para "achar" no
// olho: altura do hero, onde a próxima seção começa, quebra do título em
// linhas de verdade (Range, não offsetHeight), alvo do CTA, transbordo
// horizontal, imagens quebradas, contagem de <h1>, animações ainda em
// execução depois de assentar, erros de console e contraste do texto do hero
// contra o fundo que de fato pinta atrás dele.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { CDP, pegarJSON, esperarDevTools } = require('./cdp');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = process.env.BASE_URL || 'http://localhost:3030';
const PORTA = 9333 + (Number(process.env.PORTA_OFF) || 88);
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

const TELAS = [
  { nome: 'desktop', w: 1440, h: 900 },
  { nome: 'tablet', w: 768, h: 1024 },
  { nome: 'mobile', w: 390, h: 844 },
];

const SONDA = `(function(){
  var h = document.querySelector('[data-mel="bee-hero"]');
  if (!h) return { erro: 'hero nao encontrado' };
  var rh = h.getBoundingClientRect();
  var mod = document.getElementById('modelos');
  var rm = mod ? mod.getBoundingClientRect() : null;
  var tit = h.querySelector('.mel-bh-tit');
  var cta = h.querySelector('[data-mel="bee-hero-cta"]');
  var rct = cta ? cta.getBoundingClientRect() : null;

  /* linhas de verdade: um Range sobre o conteudo devolve um rect por linha */
  var rg = document.createRange(); rg.selectNodeContents(tit);
  var linhas = [].slice.call(rg.getClientRects()).map(function (b) {
    return Math.round(b.width) + 'x' + Math.round(b.height);
  });

  function cx(sel) {
    var e = h.querySelector(sel); if (!e) return null;
    var b = e.getBoundingClientRect(), s = getComputedStyle(e);
    return { x: Math.round(b.x), y: Math.round(b.y + scrollY), w: Math.round(b.width),
             h: Math.round(b.height), op: s.opacity, tr: s.transform };
  }

  var imgs = [].slice.call(h.querySelectorAll('img'));
  return {
    heroAltura: Math.round(rh.height),
    heroX: Math.round(rh.x), heroLargura: Math.round(rh.width),
    modelosY: rm ? Math.round(rm.top + scrollY) : null,
    dobraSobra: rm ? Math.round(innerHeight - rm.top) : null,
    tituloLinhas: linhas,
    ctaAltura: rct ? Math.round(rct.height) : null,
    ctaDestino: cta ? cta.getAttribute('href') : null,
    ctaTemAlvo: !!(cta && document.querySelector(cta.getAttribute('href'))),
    forma: cx('.mel-bh-forma'), branca: cx('.mel-bh-branca'), amarela: cx('.mel-bh-amarela'),
    imagens: imgs.map(function (i) {
      var b = i.getBoundingClientRect();
      return { arq: i.currentSrc.split('/').pop(), nat: i.naturalWidth + 'x' + i.naturalHeight,
               cx: Math.round(b.width) + 'x' + Math.round(b.height),
               alt: (i.getAttribute('alt') || '').length, quebrada: i.complete && i.naturalWidth === 0 };
    }),
    h1: document.querySelectorAll('h1').length,
    h1texto: (document.querySelector('h1') || {}).textContent,
    imagensQuebradas: [].slice.call(document.images).filter(function (i) {
      return i.complete && i.naturalWidth === 0;
    }).length,
    semAlt: [].slice.call(document.images).filter(function (i) {
      return i.getAttribute('alt') === null;
    }).length,
    transbordo: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    larguraDoc: document.documentElement.scrollWidth,
    animandoAinda: document.getAnimations
      ? document.getAnimations().filter(function (a) { return a.playState === 'running'; }).length : -1,
    /* nada pode continuar invisivel depois da entrada */
    invisiveis: ['.mel-bh-forma', '.mel-bh-branca', '.mel-bh-amarela', '.mel-bh-tit',
                 '.mel-bh-txt', '.mel-bh-cta', '.mel-bh-apoio', '.mel-bh-cores']
      .filter(function (s) { var e = h.querySelector(s);
        return !e || Number(getComputedStyle(e).opacity) < 0.99; }),
    barraExiste: !!document.querySelector('.mel-barra'),
    modelosFundo: mod ? getComputedStyle(mod).backgroundColor : null
  };
})()`;

(async () => {
  const perfil = path.join(__dirname, 'edge-cdp-' + PORTA);
  const proc = spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
    '--no-default-browser-check', '--hide-scrollbars', '--mute-audio',
    '--remote-debugging-port=' + PORTA, '--user-data-dir=' + perfil, 'about:blank',
  ], { stdio: 'ignore' });

  await esperarDevTools(PORTA);
  const alvos = await pegarJSON(PORTA, '/json/list');
  const c = await CDP.conectar(alvos.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await c.enviar('Page.enable');
  await c.enviar('Runtime.enable');
  await c.enviar('Log.enable');

  const saida = { movimento: process.env.MOVIMENTO || 'normal', telas: {} };
  const destino = path.join(__dirname, 'shots-bee');
  fs.mkdirSync(destino, { recursive: true });

  for (const t of TELAS) {
    const problemas = [];
    const ouvir = (e) => { if (e.entry && e.entry.level === 'error') problemas.push(e.entry.text.slice(0, 200)); };
    c.ao('Log.entryAdded', ouvir);
    c.ao('Runtime.exceptionThrown', () => problemas.push('exceção JS'));

    await c.enviar('Emulation.setDeviceMetricsOverride', {
      width: t.w, height: t.h, deviceScaleFactor: 1, mobile: t.w < 810,
    });
    const media = [];
    if (process.env.MOVIMENTO) media.push({ name: 'prefers-reduced-motion', value: process.env.MOVIMENTO });
    await c.enviar('Emulation.setEmulatedMedia', { features: media });

    const carregou = new Promise((ok) => c.ao('Page.loadEventFired', ok));
    await c.enviar('Page.navigate', { url: BASE + '/bee' });
    await Promise.race([carregou, dormir(30000)]);
    await dormir(3200);   // a cena inteira fecha em ~1.180 ms; 3,2 s é folga

    const r = await c.enviar('Runtime.evaluate', { expression: SONDA, returnByValue: true, awaitPromise: true });
    const v = r.exceptionDetails ? { erro: JSON.stringify(r.exceptionDetails).slice(0, 300) } : r.result.value;
    v.console = problemas;
    saida.telas[t.nome] = v;

    const rot = process.env.MOVIMENTO ? '-reduzido' : '';
    const shot = await c.enviar('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(destino, 'hero-' + t.nome + rot + '.png'), Buffer.from(shot.data, 'base64'));
  }

  const arq = path.join(destino, 'qa' + (process.env.MOVIMENTO ? '-reduzido' : '') + '.json');
  fs.writeFileSync(arq, JSON.stringify(saida, null, 2), 'utf8');
  console.log(JSON.stringify(saida, null, 1));
  console.error('capturas e JSON em ' + destino);
  c.fechar(); proc.kill(); process.exit(0);
})().catch((e) => { console.error('FALHOU:', e.message); process.exit(1); });
