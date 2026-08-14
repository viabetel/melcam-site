// Capturas da seção "A Melcam por aí" — é o olho conferindo o que a medição
// não decide: se o recorte de 15,6% da largura preservou câmera, mãos e rosto
// em cada uma das três fotos, e se a etiqueta se lê sobre a foto.
//
//   node tools/shot-clipes.js   -> tools/shots-clipes/*.png
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { CDP, pegarJSON, esperarDevTools } = require('./cdp');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = process.env.BASE || 'http://localhost:3030';
const PORTA = Number(process.env.PORTA) || 9463;
const SAIDA = path.join(__dirname, 'shots-clipes');
const TELAS = [['desktop', 1440, 900], ['mobile', 390, 844]];
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function av(c, e) {
  const r = await c.enviar('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
  return r.result.value;
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
    await c.enviar('Emulation.setDeviceMetricsOverride', { width: larg, height: alt, deviceScaleFactor: 1, mobile: larg < 810 });
    const ok = new Promise((r) => c.ao('Page.loadEventFired', r));
    await c.enviar('Page.navigate', { url: BASE + '/' });
    await Promise.race([ok, dormir(45000)]);
    await av(c, 'document.fonts.ready.then(()=>1)');
    await dormir(900);

    // No desktop a grade inteira cabe numa captura. No mobile é uma coluna,
    // então vale um recorte por card.
    const alvos = larg > 810
      ? [['grade', '.mel-clipes']]
      : [['card-1', '.mel-clipe:nth-child(1)'], ['card-2', '.mel-clipe:nth-child(2)'], ['card-3', '.mel-clipe:nth-child(3)']];

    for (const [rot, sel] of alvos) {
      // 🔴 O `clip` do Page.captureScreenshot é em coordenada de DOCUMENTO, não
      // de viewport. Passar getBoundingClientRect() cru devolveu um retângulo
      // de fundo carvão puro — a captura foi buscar o pedaço certo da página
      // errada, lá em cima. Soma-se o scroll, e `captureBeyondViewport` deixa
      // pegar o que não coube na janela.
      const caixa = await av(c, `(async () => {
        const el = document.querySelector('${sel}');
        el.scrollIntoView({ block: 'center' });
        await new Promise(r => setTimeout(r, 700));
        const b = el.getBoundingClientRect();
        return { x: Math.round(b.left + window.scrollX), y: Math.round(b.top + window.scrollY),
                 width: Math.round(b.width), height: Math.round(b.height) };
      })()`);
      const r = await c.enviar('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: true,
        clip: { x: caixa.x, y: caixa.y, width: caixa.width, height: caixa.height, scale: 1 },
      });
      const arq = nome + '-' + rot + '.png';
      fs.writeFileSync(path.join(SAIDA, arq), Buffer.from(r.data, 'base64'));
      console.log('   ' + arq + '  ' + caixa.width + 'x' + caixa.height);
    }
  }

  console.log('\ncapturas em ' + SAIDA);
  c.fechar(); proc.kill(); process.exit(0);
})().catch((e) => { console.error('FALHOU:', e.message); process.exit(2); });
