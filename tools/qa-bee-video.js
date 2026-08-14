// QA do vídeo do hero da /bee — 14/08/2026.
//
// O <video> do hero é a única peça do site cujo conteúdo depende de rede E de
// preferência do sistema. Três coisas precisam continuar verdadeiras, e
// nenhuma delas aparece numa captura normal:
//
//   1. Com prefers-reduced-motion o navegador NÃO PODE baixar vídeo. Quem
//      decide é o <script> síncrono do tools/bee.js, que mede a preferência
//      antes de escrever as <source>. Se alguém trocar aquilo por CSS ou por
//      um listener, o arquivo volta a ser baixado e o teste acusa.
//   2. Sem o vídeo — rede bloqueada, codec recusado, arquivo fora do ar — o
//      hero mostra o POSTER, nunca um buraco. Poster e primeiro quadro saem da
//      mesma cadeia de ffmpeg, então não há salto na troca.
//   3. Nada disso pode mexer na geometria. O poster tem a mesma razão do
//      vídeo e o <video> carrega width/height do arquivo, então a caixa existe
//      antes do primeiro byte.
//
// Uso: node tools/qa-bee-video.js [larguraxaltura ...]
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { CDP, pegarJSON, esperarDevTools } = require('./cdp');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = process.env.BASE || 'http://localhost:3030';
const PORTA = Number(process.env.PORTA) || 9459;
const SAIDA = path.join(__dirname, 'shots-bee-video');
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

const TELAS = (process.argv.slice(2).filter((a) => /^\d+x\d+$/.test(a)).length
  ? process.argv.slice(2).filter((a) => /^\d+x\d+$/.test(a))
  : ['1440x900', '390x844', '810x1080']).map((s) => s.split('x').map(Number));

const SONDA = `(function(){
  var h = document.querySelector('[data-mel="bee-hero"]');
  var v = document.querySelector('[data-mel="bee-hero-video"]');
  if (!h || !v) return { erro: 'hero ou video nao encontrado' };
  function cx(e){ var b = e.getBoundingClientRect();
    return Math.round(b.x)+','+Math.round(b.y)+' '+Math.round(b.width)+'x'+Math.round(b.height); }
  var cs = getComputedStyle(v);
  return {
    hero: cx(h),
    video: cx(v),
    fontes: [].slice.call(v.querySelectorAll('source')).map(function(s){ return s.getAttribute('src'); }),
    currentSrc: v.currentSrc || '',
    poster: v.getAttribute('poster') || '',
    /* readyState 0 = nada carregado, ou seja, o que aparece é o poster */
    readyState: v.readyState,
    pausado: v.paused,
    mistura: cs.mixBlendMode,
    opacidade: cs.opacity,
    transbordo: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  };
})()`;

async function cenario(nome, larg, alt, ajustes) {
  const proc = spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
    '--no-default-browser-check', '--hide-scrollbars', '--mute-audio',
    '--autoplay-policy=no-user-gesture-required',
    ...(ajustes.reduz ? ['--force-prefers-reduced-motion'] : []),
    '--remote-debugging-port=' + PORTA,
    '--user-data-dir=' + path.join(__dirname, 'edge-cdp-' + PORTA), 'about:blank',
  ], { stdio: 'ignore' });
  await esperarDevTools(PORTA);
  const alvos = await pegarJSON(PORTA, '/json/list');
  const c = await CDP.conectar(alvos.find((t) => t.type === 'page').webSocketDebuggerUrl);

  const pedidos = [];
  const erros = [];
  c.ao('Network.requestWillBeSent', (p) => pedidos.push(p.request.url));
  c.ao('Runtime.exceptionThrown', (p) => erros.push('exc: ' +
    ((p.exceptionDetails.exception || {}).description || p.exceptionDetails.text || '').slice(0, 160)));
  c.ao('Log.entryAdded', (p) => { if (p.entry.level === 'error') erros.push(p.entry.text.slice(0, 160)); });

  await c.enviar('Page.enable');
  await c.enviar('Runtime.enable');
  await c.enviar('Log.enable');
  await c.enviar('Network.enable');
  if (ajustes.reduz) {
    await c.enviar('Emulation.setEmulatedMedia',
      { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  }
  if (ajustes.bloquear) await c.enviar('Network.setBlockedURLs', { urls: ['*/melcam/video/bee/*'] });
  if (ajustes.lento) {
    await c.enviar('Network.emulateNetworkConditions', {
      offline: false, latency: 300, downloadThroughput: 200 * 1024, uploadThroughput: 50 * 1024,
    });
  }
  await c.enviar('Emulation.setDeviceMetricsOverride',
    { width: larg, height: alt, deviceScaleFactor: 1, mobile: larg < 810 });

  const carregou = new Promise((ok) => c.ao('Page.loadEventFired', ok));
  await c.enviar('Page.navigate', { url: BASE + '/bee' });
  await Promise.race([carregou, dormir(ajustes.lento ? 60000 : 30000)]);
  await dormir(ajustes.lento ? 8000 : 2600);

  const m = (await c.enviar('Runtime.evaluate', { expression: SONDA, returnByValue: true })).result.value;
  m.pedidosDeVideo = pedidos.filter((u) => u.indexOf('/melcam/video/bee/') >= 0)
    .map((u) => u.split('/').pop());
  m.pedidoDoPoster = pedidos.some((u) => u.indexOf('bee-hero-video-poster') >= 0);
  m.erros = erros;

  const shot = await c.enviar('Page.captureScreenshot', { format: 'png' });
  const arq = path.join(SAIDA, nome + '-' + larg + 'x' + alt + '.png');
  fs.writeFileSync(arq, Buffer.from(shot.data, 'base64'));

  proc.kill();
  await dormir(300);
  return m;
}

(async () => {
  fs.mkdirSync(SAIDA, { recursive: true });
  const falhas = [];

  for (const [larg, alt] of TELAS) {
    console.log('\n=== ' + larg + 'x' + alt + ' ===');

    const normal = await cenario('normal', larg, alt, {});
    console.log('  normal    vídeo=' + (normal.currentSrc.split('/').pop() || '(nenhum)') +
      '  baixou=[' + normal.pedidosDeVideo.join(', ') + ']  readyState=' + normal.readyState +
      '  tocando=' + (!normal.pausado) + '  mistura=' + normal.mistura +
      '  hero ' + normal.hero + '  vídeo ' + normal.video);
    if (!normal.currentSrc) falhas.push(larg + ': o vídeo não tocou na carga normal');
    if (normal.mistura !== 'darken') falhas.push(larg + ': mistura deixou de ser darken');
    if (normal.transbordo) falhas.push(larg + ': transbordo horizontal na carga normal');

    const reduz = await cenario('reduzido', larg, alt, { reduz: true });
    console.log('  reduzido  fontes=' + reduz.fontes.length +
      '  baixou=[' + reduz.pedidosDeVideo.join(', ') + ']  poster pedido=' + reduz.pedidoDoPoster +
      '  hero ' + reduz.hero + '  vídeo ' + reduz.video + '  opacidade ' + reduz.opacidade);
    if (reduz.pedidosDeVideo.length) {
      falhas.push(larg + ': com movimento reduzido o navegador baixou ' + reduz.pedidosDeVideo.join(', '));
    }
    if (reduz.fontes.length) falhas.push(larg + ': com movimento reduzido o <video> ganhou <source>');
    if (Number(reduz.opacidade) < 0.99) falhas.push(larg + ': o poster ficou transparente no movimento reduzido');
    if (reduz.video !== normal.video) {
      falhas.push(larg + ': a caixa mudou no movimento reduzido (' + normal.video + ' -> ' + reduz.video + ')');
    }

    const bloqueado = await cenario('bloqueado', larg, alt, { bloquear: true });
    console.log('  bloqueado readyState=' + bloqueado.readyState +
      '  poster pedido=' + bloqueado.pedidoDoPoster +
      '  hero ' + bloqueado.hero + '  vídeo ' + bloqueado.video);
    if (bloqueado.video !== normal.video) {
      falhas.push(larg + ': a caixa mudou com o vídeo bloqueado (' + normal.video + ' -> ' + bloqueado.video + ')');
    }
    if (!bloqueado.pedidoDoPoster) falhas.push(larg + ': o poster não foi buscado com o vídeo bloqueado');
    if (bloqueado.transbordo) falhas.push(larg + ': transbordo horizontal com o vídeo bloqueado');

    const lento = await cenario('lento', larg, alt, { lento: true });
    console.log('  lento     poster pedido=' + lento.pedidoDoPoster +
      '  readyState=' + lento.readyState + '  hero ' + lento.hero + '  vídeo ' + lento.video);
    if (lento.video !== normal.video) {
      falhas.push(larg + ': a caixa mudou na conexão lenta (' + normal.video + ' -> ' + lento.video + ')');
    }

    for (const [nome, m] of [['normal', normal], ['reduzido', reduz], ['bloqueado', bloqueado], ['lento', lento]]) {
      /* o erro de rede do próprio bloqueio é o que se está provocando */
      const reais = m.erros.filter((e) => !/melcam\/video\/bee\//.test(e));
      if (reais.length) falhas.push(larg + ' [' + nome + ']: ' + reais.join(' | '));
    }
  }

  console.log('\ncapturas em ' + SAIDA);
  if (falhas.length) {
    console.log('\n[FALHOU]\n  ' + falhas.join('\n  '));
    process.exit(1);
  }
  console.log('\n[OK]  vídeo do hero da /bee');
  process.exit(0);
})();
