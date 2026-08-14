// Varre as rotas e registra TODA requisição que falhou — não só imagem.
//
// Complementa tools/verificar-assets-deploy.js, que é estático: aqui o
// navegador de verdade pede tudo (fonte, vídeo, CSS, JS, favicon) e o que
// voltar != 2xx aparece. Fonte que 404 não deixa "imagem quebrada" nenhuma;
// sem isto passaria despercebida.
//
//   node tools/qa-rede.js [--base https://…] [--rotas /,/polen]
const path = require('path');
const { spawn } = require('child_process');
const { CDP, pegarJSON, esperarDevTools } = require('./cdp');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORTA = 9333 + (Number(process.env.PORTA_OFF) || 80);
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

const iB = process.argv.indexOf('--base');
const BASE = iB >= 0 ? process.argv[iB + 1] : (process.env.BASE_URL || 'http://localhost:3030');
const iR = process.argv.indexOf('--rotas');
// /privacidade e /termos entraram na lista em 14/08/2026, quando deixaram de
// ser cascas vazias do Framer e viraram páginas de verdade (tools/demais.js +
// tools/build-legais.js). Elas são destino do rodapé em todas as páginas: se
// alguma quebrar, quebra em nove lugares.
const ROTAS = iR >= 0 ? process.argv[iR + 1].split(',')
  : ['/', '/polen', '/bee', '/acessorios', '/sobre', '/sacola', '/404', '/privacidade', '/termos'];

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

  const pedidos = new Map();
  let falhas = [], consoleErros = [];

  c.ao('Network.requestWillBeSent', (p) => pedidos.set(p.requestId, p.request.url));
  c.ao('Network.responseReceived', (p) => {
    // A própria rota /404 responde 404 por projeto — é o documento, não asset.
    if (p.response.status >= 400 && p.type !== 'Document') {
      falhas.push(`HTTP ${p.response.status}  [${p.type}]  ${p.response.url}`);
    }
  });
  c.ao('Network.loadingFailed', (p) => {
    const u = pedidos.get(p.requestId) || '(url desconhecida)';
    if (!/net::ERR_ABORTED/.test(p.errorText || '')) falhas.push(`FALHOU  ${p.errorText}  ${u}`);
  });
  c.ao('Log.entryAdded', (p) => {
    if (p.entry.level === 'error') consoleErros.push(p.entry.text.slice(0, 140));
  });
  c.ao('Runtime.exceptionThrown', (p) =>
    consoleErros.push('exceção: ' + (p.exceptionDetails?.exception?.description || '').slice(0, 140)));

  await c.enviar('Network.enable');
  await c.enviar('Page.enable');
  await c.enviar('Runtime.enable');
  await c.enviar('Log.enable');
  await c.enviar('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

  let totalFalhas = 0;
  console.log('base: ' + BASE + '\n');

  for (const rota of ROTAS) {
    falhas = []; consoleErros = []; pedidos.clear();
    const carregou = new Promise((ok) => c.ao('Page.loadEventFired', ok));
    await c.enviar('Page.navigate', { url: BASE + rota });
    await Promise.race([carregou, dormir(30000)]);
    await dormir(2500);
    // desce a página para disparar o que carrega sob demanda
    await c.enviar('Runtime.evaluate', {
      expression: `(async()=>{const h=document.documentElement.scrollHeight;`
        + `for(let y=0;y<h;y+=Math.round(innerHeight*0.8)){scrollTo(0,y);`
        + `await new Promise(r=>setTimeout(r,110))}scrollTo(0,0)})()`,
      awaitPromise: true,
    });
    await dormir(1800);

    const est = await c.enviar('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        imgs: document.images.length,
        quebradas: [...document.images].filter(i=>i.complete&&i.naturalWidth===0).map(i=>i.currentSrc).slice(0,8),
        fontes: document.fonts ? document.fonts.size : -1,
        video: !!document.querySelector('video'),
        h1: document.querySelectorAll('h1').length,
      })`,
    });
    const v = est.result.value;
    const unicas = [...new Set(falhas)];
    totalFalhas += unicas.length + v.quebradas.length;

    console.log(`${rota.padEnd(13)} imgs=${String(v.imgs).padStart(3)}  quebradas=${v.quebradas.length}`
      + `  fontes=${v.fontes}  video=${v.video ? 'sim' : 'não'}  h1=${v.h1}`
      + `  req-falhas=${unicas.length}  console=${consoleErros.length}`);
    for (const f of unicas.slice(0, 12)) console.log('      ' + f);
    for (const q of v.quebradas) console.log('      IMG QUEBRADA  ' + q);
    for (const e of consoleErros.slice(0, 4)) console.log('      console: ' + e);
  }

  console.log('');
  console.log(totalFalhas ? `${totalFalhas} problema(s) de rede/asset.` : 'nenhum asset faltando nas rotas testadas.');
  c.fechar();
  proc.kill();
  process.exit(totalFalhas ? 1 : 0);
})().catch((e) => { console.error('FALHOU:', e.message); process.exit(1); });
