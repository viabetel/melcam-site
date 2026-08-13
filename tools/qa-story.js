// QA do scrollytelling de "O diferencial" da /polen.
// Rola capítulo a capítulo, mede o estado e captura os nove. Só lê.
//
//   node tools/qa-story.js [url] [largura] [altura]
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { CDP, pegarJSON, esperarDevTools } = require('./cdp');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const SAIDA = path.join(__dirname, 'shots-story');
const URL = process.argv[2] || 'http://localhost:3030/polen';
const LARG = Number(process.argv[3]) || 1440;
const ALT = Number(process.argv[4]) || 900;
const REDUZIDO = !!process.env.REDUCED;
const PORTA = 9412;
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
if (!fs.existsSync(SAIDA)) fs.mkdirSync(SAIDA, { recursive: true });

const SONDA = `(() => {
  const s = document.querySelector('[data-mel="polen-story"]');
  if (!s) return { erro: 'sem secao' };
  const cenas = [].slice.call(s.querySelectorAll('[data-mel-story-scene]'));
  const passos = [].slice.call(s.querySelectorAll('[data-mel-story-step]'));
  const ativas = cenas.filter((c) => c.hasAttribute('data-mel-story-ativa'));
  const cx = (e) => e.getBoundingClientRect();
  const palco = cenas[0];
  const rp = cx(palco);
  const conta = s.querySelector('[data-mel-story-atual]');
  const imgs = [].slice.call(s.querySelectorAll('img'));
  return {
    ligado: s.classList.contains('mel-story-ligado'),
    cenas: cenas.length,
    passos: passos.length,
    ativas: ativas.length,
    indiceAtivo: ativas.length ? +ativas[0].getAttribute('data-story-index') : null,
    passosAtivos: passos.filter((p) => p.hasAttribute('data-mel-story-ativa')).length,
    contador: conta ? conta.textContent : null,
    palcoTopo: Math.round(rp.top),
    palcoAltura: Math.round(rp.height),
    palcoLargura: Math.round(rp.width),
    palcoCortado: innerWidth >= 1025 && s.classList.contains('mel-story-ligado') && (rp.top < 0 || rp.bottom > innerHeight + 1),
    carregadas: imgs.filter((i) => i.getAttribute('src')).length,
    pendentes: imgs.filter((i) => i.getAttribute('data-src')).length,
    quebradas: imgs.filter((i) => i.getAttribute('src') && i.complete && i.naturalWidth === 0).length,
    secaoAltura: Math.round(cx(s).height),
    paginaAltura: document.documentElement.scrollHeight,
    overflowH: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    h1: document.querySelectorAll('h1').length,
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

  const erros = [];
  c.ao('Runtime.exceptionThrown', (p) =>
    erros.push('exceção: ' + (p.exceptionDetails?.exception?.description || p.exceptionDetails?.text || '').slice(0, 160)));
  c.ao('Log.entryAdded', (p) => { if (p.entry.level === 'error') erros.push('[' + p.entry.source + '] ' + p.entry.text.slice(0, 160)); });

  await c.enviar('Page.enable');
  await c.enviar('Runtime.enable');
  await c.enviar('Log.enable');
  await c.enviar('Emulation.setDeviceMetricsOverride', {
    width: LARG, height: ALT, deviceScaleFactor: 1, mobile: LARG < 810,
  });
  if (REDUZIDO) {
    await c.enviar('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  }

  const carregou = new Promise((ok) => c.ao('Page.loadEventFired', ok));
  await c.enviar('Page.navigate', { url: URL });
  await Promise.race([carregou, dormir(30000)]);
  await dormir(2200);

  const rotulo = LARG + 'x' + ALT + (REDUZIDO ? '-reduzido' : '');
  const linhas = [];

  for (let i = 0; i < 9; i++) {
    // Leva o CENTRO do passo i para o centro da tela — é assim que o
    // observer decide o capítulo ativo.
    await c.enviar('Runtime.evaluate', {
      expression: `(async()=>{
        var p=document.querySelectorAll('[data-mel-story-step]')[${i}];
        var r=p.getBoundingClientRect();
        scrollBy({top:(r.top+r.bottom)/2 - innerHeight/2, behavior:'instant'});
        await new Promise(r=>setTimeout(r,900));
      })()`,
      awaitPromise: true,
    });
    const r = await c.enviar('Runtime.evaluate', { expression: SONDA, returnByValue: true });
    const v = r.result.value;
    linhas.push({ pedido: i, ...v });
    const shot = await c.enviar('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(SAIDA, `cap-${String(i + 1).padStart(2, '0')}-${rotulo}.png`), Buffer.from(shot.data, 'base64'));
  }

  // Volta subindo, para provar que o sentido inverso também acerta.
  const subida = [];
  for (let i = 8; i >= 0; i--) {
    await c.enviar('Runtime.evaluate', {
      expression: `(async()=>{
        var p=document.querySelectorAll('[data-mel-story-step]')[${i}];
        var r=p.getBoundingClientRect();
        scrollBy({top:(r.top+r.bottom)/2 - innerHeight/2, behavior:'instant'});
        await new Promise(r=>setTimeout(r,700));
      })()`,
      awaitPromise: true,
    });
    const r = await c.enviar('Runtime.evaluate', { expression: SONDA, returnByValue: true });
    subida.push({ pedido: i, ativo: r.result.value.indiceAtivo, ativas: r.result.value.ativas });
  }

  console.log('== ' + rotulo + ' ==');
  linhas.forEach((v) => {
    const p = [];
    // Com movimento reduzido o contrato é o OPOSTO: nenhum palco ligado,
    // nenhum capítulo ativo e nenhuma imagem pendente — o fluxo é sequencial
    // e tudo tem de estar visível.
    if (REDUZIDO) {
      if (v.ligado) p.push('palco ligado sob reduced-motion');
      if (v.ativas) p.push(v.ativas + ' cenas ativas sob reduced-motion');
      if (v.pendentes) p.push(v.pendentes + ' imagens sem carregar sob reduced-motion');
    } else {
      if (v.ativas !== 1) p.push(v.ativas + ' cenas ativas');
      if (v.passosAtivos !== 1) p.push(v.passosAtivos + ' passos ativos');
      if (v.indiceAtivo !== v.pedido) p.push('ativo=' + v.indiceAtivo + ' esperado=' + v.pedido);
    }
    if (v.palcoCortado) p.push('PALCO CORTADO topo=' + v.palcoTopo);
    if (v.quebradas) p.push(v.quebradas + ' quebradas');
    if (v.overflowH) p.push('TRANSBORDA');
    if (v.h1 !== 1) p.push(v.h1 + ' h1');
    console.log((p.length ? 'X  ' : 'ok ') + 'cap ' + String(v.pedido + 1).padStart(2, '0') +
      '  contador ' + v.contador + '  palco ' + v.palcoLargura + 'x' + v.palcoAltura + ' @y' + v.palcoTopo +
      '  imgs ' + v.carregadas + ' carregadas / ' + v.pendentes + ' pendentes' +
      (p.length ? '   <<< ' + p.join(' · ') : ''));
  });
  console.log(REDUZIDO
    ? 'subida: não se aplica — sob reduced-motion não existe capítulo ativo, por contrato'
    : 'subida: ' + subida.map((s) => s.pedido + '->' + s.ativo).join(' ') +
      (subida.every((s) => s.ativo === s.pedido) ? '  ok' : '  X DESCASOU'));
  console.log('seção ' + linhas[0].secaoAltura + 'px · página ' + linhas[0].paginaAltura +
    'px · ' + (linhas[0].paginaAltura / ALT).toFixed(1) + ' telas');
  console.log('console: ' + (erros.length ? erros.length + ' erro(s): ' + [...new Set(erros)].join(' | ') : '0 erros'));

  fs.writeFileSync(path.join(SAIDA, 'qa-story-' + rotulo + '.json'),
    JSON.stringify({ url: URL, viewport: rotulo, descida: linhas, subida, erros: [...new Set(erros)] }, null, 2));

  c.fechar();
  proc.kill();
  process.exit(0);
})().catch((e) => { console.error('FALHOU:', e.message); process.exit(1); });
