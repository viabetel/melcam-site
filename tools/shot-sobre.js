// Capturas da faixa "Sobre Nós" nos estados que o pedido lista: fechada,
// durante a transição, aberta, e aberta com a navbar revelada por cima.
// A medição já provou a geometria; isto é para OLHAR o obturador e conferir
// que o efeito continua de pé.
//
//   node tools/shot-sobre.js        -> tools/shots-sobre/*.png
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { CDP, pegarJSON, esperarDevTools } = require('./cdp');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = process.env.BASE || 'http://localhost:3030';
const PORTA = Number(process.env.PORTA) || 9458;
const SAIDA = path.join(__dirname, 'shots-sobre');
const TELAS = [['desktop', 1440, 900], ['tablet', 768, 1024], ['mobile', 390, 844]];
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function av(c, e) {
  const r = await c.enviar('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
  return r.result.value;
}
async function tirar(c, nome) {
  const r = await c.enviar('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(SAIDA, nome + '.png'), Buffer.from(r.data, 'base64'));
  console.log('   ' + nome + '.png');
}

(async () => {
  fs.mkdirSync(SAIDA, { recursive: true });
  const proc = spawn(EDGE, ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
    '--no-default-browser-check', '--mute-audio', '--hide-scrollbars',
    '--remote-debugging-port=' + PORTA, '--user-data-dir=' + path.join(__dirname, 'edge-cdp-' + PORTA), 'about:blank'], { stdio: 'ignore' });
  await esperarDevTools(PORTA);
  const c = await CDP.conectar((await pegarJSON(PORTA, '/json/list')).find((t) => t.type === 'page').webSocketDebuggerUrl);
  await c.enviar('Page.enable'); await c.enviar('Runtime.enable');

  for (const [nome, larg, alt] of TELAS) {
    console.log('== ' + nome + ' ' + larg + 'x' + alt);
    await c.enviar('Emulation.setDeviceMetricsOverride', { width: larg, height: alt, deviceScaleFactor: 1, mobile: larg < 810 });
    const ok = new Promise((r) => c.ao('Page.loadEventFired', r));
    await c.enviar('Page.navigate', { url: BASE + '/' });
    await Promise.race([ok, dormir(45000)]);
    await av(c, 'document.fonts.ready.then(()=>1)');
    await dormir(1200);

    // fechada, com a faixa enquadrada e ainda longe do gatilho
    const topo = await av(c, `(async () => {
      let t = 0, e = document.querySelector('[data-mel-sobre]');
      while (e) { t += e.offsetTop; e = e.offsetParent; }
      window.scrollTo(0, t - window.innerHeight + 60);
      await new Promise(r => setTimeout(r, 800));
      return t;
    })()`);
    await tirar(c, nome + '-1-fechada');

    // durante a transição
    await av(c, `(async () => {
      window.scrollTo(0, ${topo} - 60);
      await new Promise(r => setTimeout(r, 400));
      const p = document.querySelector('[data-mel-sobre-palco]');
      if (!p.hasAttribute('data-aberto')) p.querySelector('[data-mel-sobre-bt]').click();
    })()`);
    await dormir(300);
    await tirar(c, nome + '-2-transicao');

    // aberta
    await dormir(1200);
    await tirar(c, nome + '-3-aberta');

    // aberta com a navbar revelada por cima do texto
    await av(c, `(async () => {
      const capa = document.querySelector('.mel-sobre-capa');
      window.scrollTo(0, Math.round(window.scrollY + capa.getBoundingClientRect().top - 40) + 140);
      await new Promise(r => setTimeout(r, 350));
      window.scrollTo(0, Math.round(window.scrollY) - 140);
      await new Promise(r => setTimeout(r, 450));
    })()`);
    await c.enviar('Input.dispatchMouseEvent', { type: 'mouseMoved', x: Math.round(larg / 2), y: 8, buttons: 0 });
    await dormir(700);
    await tirar(c, nome + '-4-aberta-navbar');
  }

  console.log('\ncapturas em ' + SAIDA);
  c.fechar(); proc.kill(); process.exit(0);
})().catch((e) => { console.error('FALHOU:', e.message); process.exit(2); });
