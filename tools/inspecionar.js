// Avalia uma expressão JS numa rota do site, no Edge headless. É o bisturi da
// auditoria: quando o inventário aponta uma cor, é aqui que se pergunta ao
// navegador de qual regra ela veio.
//
//   node tools/inspecionar.js <rota> <largura> <arquivo-com-a-expressao>
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { CDP, pegarJSON, esperarDevTools } = require('./cdp');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = process.env.BASE_URL || 'http://localhost:3030';
const PORTA = 9333 + (Number(process.env.PORTA_OFF) || 60);
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

const rota = process.argv[2] || '/';
const larg = Number(process.argv[3]) || 1440;
const alt = Number(process.env.ALTURA) || 900;
const expr = fs.readFileSync(process.argv[4], 'utf8');

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
  await c.enviar('Emulation.setDeviceMetricsOverride', {
    width: larg, height: alt, deviceScaleFactor: 1, mobile: larg < 810,
  });
  // O template traz uma pele clara e uma escura (@media prefers-color-scheme).
  // Auditar só a que o headless escolhe sozinho deixaria metade do site sem
  // olhar. ESQUEMA=light|dark força a que interessa.
  const media = [];
  if (process.env.ESQUEMA) media.push({ name: 'prefers-color-scheme', value: process.env.ESQUEMA });
  if (process.env.MOVIMENTO) media.push({ name: 'prefers-reduced-motion', value: process.env.MOVIMENTO });
  if (media.length) await c.enviar('Emulation.setEmulatedMedia', { features: media });
  const carregou = new Promise((ok) => c.ao('Page.loadEventFired', ok));
  await c.enviar('Page.navigate', { url: BASE + rota });
  await Promise.race([carregou, dormir(30000)]);
  await dormir(3500);

  // --tab N: N pressionadas de Tab de verdade, pelo protocolo. É a única forma
  // honesta de medir :focus-visible — o navegador só liga o anel quando o foco
  // veio do teclado, e el.focus() por script não conta.
  const iT = process.argv.indexOf('--tab');
  if (iT >= 0) {
    const n = Number(process.argv[iT + 1]) || 1;
    for (let k = 0; k < n; k++) {
      for (const type of ['keyDown', 'keyUp']) {
        await c.enviar('Input.dispatchKeyEvent', {
          type, key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9,
        });
      }
      await dormir(90);
    }
    await dormir(400);
  }

  const r = await c.enviar('Runtime.evaluate', {
    expression: expr, returnByValue: true, awaitPromise: true,
  });

  // A captura vem DEPOIS da expressão: assim ela pode rolar até a seção que
  // interessa, abrir o menu ou focar um elemento antes do clique do obturador.
  const iS = process.argv.indexOf('--shot');
  if (iS >= 0 && process.argv[iS + 1]) {
    const dest = path.resolve(process.argv[iS + 1]);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    await dormir(700);
    const shot = await c.enviar('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(dest, Buffer.from(shot.data, 'base64'));
    console.error('captura: ' + dest);
  }
  if (r.exceptionDetails) {
    console.error('EXCEÇÃO:', JSON.stringify(r.exceptionDetails).slice(0, 800));
  } else {
    console.log(typeof r.result.value === 'string'
      ? r.result.value : JSON.stringify(r.result.value, null, 2));
  }
  c.fechar();
  proc.kill();
  process.exit(0);
})().catch((e) => { console.error('FALHOU:', e.message); process.exit(1); });
