// Sonda avulsa: roda uma expressão JS numa URL e imprime o retorno.
// Existe para checar uma hipótese pontual sem escrever um medidor inteiro.
// Só lê — não altera arquivo nenhum do projeto.
//
//   node tools/sonda.js <url> "<expressao>" [saida.png]
//   LARG=390 ALT=844 node tools/sonda.js ...   # viewport por env
const path = require('path');
const { spawn } = require('child_process');
const { CDP, pegarJSON, esperarDevTools } = require('./cdp');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const url = process.argv[2];
const expr = process.argv[3];
const PORTA = 9370;
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const proc = spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
    '--no-default-browser-check', '--hide-scrollbars', '--mute-audio',
    '--remote-debugging-port=' + PORTA, '--user-data-dir=' + path.join(__dirname, 'edge-cdp-' + PORTA), 'about:blank',
  ], { stdio: 'ignore' });

  await esperarDevTools(PORTA);
  const alvos = await pegarJSON(PORTA, '/json/list');
  const c = await CDP.conectar(alvos.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await c.enviar('Page.enable');
  await c.enviar('Runtime.enable');

  const larg = Number(process.env.LARG) || 1440;
  const alt = Number(process.env.ALT) || 900;
  await c.enviar('Emulation.setDeviceMetricsOverride', {
    width: larg, height: alt, deviceScaleFactor: 1, mobile: larg < 810,
  });

  // REDUCED=1 liga prefers-reduced-motion, para conferir o estado que o site
  // entrega a quem pediu menos movimento.
  if (process.env.REDUCED) {
    await c.enviar('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    });
  }

  const carregou = new Promise((ok) => c.ao('Page.loadEventFired', ok));
  await c.enviar('Page.navigate', { url });
  await Promise.race([carregou, dormir(30000)]);
  // ESPERA=0 serve para medir animação de entrada, que já teria terminado
  // depois da espera padrão.
  await dormir(process.env.ESPERA !== undefined ? Number(process.env.ESPERA) : 2500);

  const r = await c.enviar('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  console.log(JSON.stringify(r.result.value, null, 2));

  // 3o argumento opcional: PNG. A captura sai DEPOIS da expressao, entao da
  // para rolar ate o trecho de interesse dentro dela.
  if (process.argv[4]) {
    await dormir(800);
    const shot = await c.enviar('Page.captureScreenshot', { format: 'png' });
    require('fs').writeFileSync(process.argv[4], Buffer.from(shot.data, 'base64'));
    console.log('captura: ' + process.argv[4]);
  }

  c.fechar();
  proc.kill();
  process.exit(0);
})().catch((e) => { console.error('FALHOU:', e.message); process.exit(1); });
