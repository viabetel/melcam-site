// Mede a fileira .framer-dtlgl4 num site publicado, em 3 breakpoints e ao longo
// do scroll, e grava capturas. Sem extensão de navegador: Edge headless por CDP.
//
//   node medir.js <url> <rotulo>
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { CDP, pegarJSON, esperarDevTools } = require('./cdp');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const SAIDA = path.join(__dirname, 'shots');
const url = process.argv[2];
const rotulo = process.argv[3];
const PORTA = 9333 + (Number(process.argv[4]) || 0);
const GRUPO = '.framer-dtlgl4';

const TELAS = [
  { nome: 'desktop', w: 1440, h: 900 },
  { nome: 'tablet', w: 768, h: 1024 },
  { nome: 'mobile', w: 390, h: 844 },
];

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
if (!fs.existsSync(SAIDA)) fs.mkdirSync(SAIDA, { recursive: true });

// Roda no navegador: lê a geometria real do grupo e dos 10 filhos.
const SONDA = `(() => {
  const g = document.querySelector('${GRUPO}');
  if (!g) return { achou: false };
  const cs = getComputedStyle(g);
  const r = g.getBoundingClientRect();
  // Os filhos diretos são wrappers ssr-variant (0x0). Os frames de verdade
  // carregam data-framer-name="Image N", e só o do breakpoint ativo renderiza.
  const frames = [...g.querySelectorAll('[data-framer-name^="Image"]')].filter((c) => c.offsetWidth > 0);
  const filhos = frames.map((c) => {
    const s = getComputedStyle(c);
    const cr = c.getBoundingClientRect();
    const img = c.querySelector('img');
    return {
      classe: [...c.classList].find((x) => x.startsWith('framer-')) || '',
      nome: c.getAttribute('data-framer-name') || '',
      layoutW: c.offsetWidth, layoutH: c.offsetHeight,
      telaW: +cr.width.toFixed(1), telaH: +cr.height.toFixed(1),
      proporcao: c.offsetHeight ? +(c.offsetWidth / c.offsetHeight).toFixed(4) : null,
      aspectRatio: s.aspectRatio, overflow: s.overflow, radius: s.borderRadius,
      objectFit: img ? getComputedStyle(img).objectFit : '(sem img)',
      imgNatural: img ? img.naturalWidth + 'x' + img.naturalHeight : '',
      imgSrc: img ? img.currentSrc.split('/').pop().slice(0, 42) : '',
    };
  });
  return {
    achou: true,
    scrollY: Math.round(scrollY),
    grupo: {
      opacity: +cs.opacity, transform: cs.transform,
      layoutW: g.offsetWidth, layoutH: g.offsetHeight,
      telaW: +r.width.toFixed(1), telaH: +r.height.toFixed(1),
      topoDoc: Math.round(r.top + scrollY),
      overflow: cs.overflow, gap: cs.gap, flexFlow: cs.flexFlow,
    },
    filhos,
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
  const pagina = alvos.find((t) => t.type === 'page');
  const c = await CDP.conectar(pagina.webSocketDebuggerUrl);

  const problemas = [];
  c.ao('Runtime.exceptionThrown', (p) =>
    problemas.push('exceção: ' + (p.exceptionDetails?.exception?.description || p.exceptionDetails?.text || '').slice(0, 200)));
  c.ao('Log.entryAdded', (p) => {
    if (p.entry.level === 'error') problemas.push('[' + p.entry.source + '] ' + p.entry.text.slice(0, 200));
  });

  await c.enviar('Page.enable');
  await c.enviar('Runtime.enable');
  await c.enviar('Log.enable');
  await c.enviar('Network.enable');

  const relatorio = { url, rotulo, telas: {}, problemas };

  for (const t of TELAS) {
    await c.enviar('Emulation.setDeviceMetricsOverride', {
      width: t.w, height: t.h, deviceScaleFactor: 1, mobile: t.nome === 'mobile',
    });

    const carregou = new Promise((ok) => c.ao('Page.loadEventFired', ok));
    await c.enviar('Page.navigate', { url });
    await Promise.race([carregou, dormir(30000)]);
    await dormir(4000); // runtime do Framer, fontes e imagens

    const base = await c.enviar('Runtime.evaluate', { expression: SONDA, returnByValue: true });
    const m0 = base.result.value;
    if (!m0.achou) { relatorio.telas[t.nome] = { erro: 'grupo ' + GRUPO + ' nao encontrado' }; continue; }

    // Amostra o scroll cobrindo a entrada do grupo na viewport.
    // Começa bem antes do grupo entrar, senão a primeira amostra já pega a
    // animação em andamento e o estado inicial nunca aparece.
    const inicio = Math.max(0, m0.grupo.topoDoc - Math.round(t.h * 2.0));
    const fim = m0.grupo.topoDoc + Math.round(t.h * 0.35);
    const passos = 7;
    const amostras = [];

    for (let i = 0; i < passos; i++) {
      const y = Math.round(inicio + ((fim - inicio) * i) / (passos - 1));
      await c.enviar('Runtime.evaluate', { expression: `scrollTo(0, ${y})` });
      await dormir(1100); // deixa a animação assentar no ponto
      const r = await c.enviar('Runtime.evaluate', { expression: SONDA, returnByValue: true });
      const v = r.result.value;
      amostras.push({
        passo: i, alvoY: y, scrollY: v.scrollY,
        opacity: v.grupo.opacity, transform: v.grupo.transform,
        telaW: v.grupo.telaW, telaH: v.grupo.telaH,
        layoutW: v.grupo.layoutW, layoutH: v.grupo.layoutH,
      });
      if (i === 0 || i === Math.floor(passos / 2) || i === passos - 1) {
        const marca = i === 0 ? 'inicial' : i === passos - 1 ? 'final' : 'meio';
        const shot = await c.enviar('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(SAIDA, `${rotulo}-${t.nome}-${marca}.png`), Buffer.from(shot.data, 'base64'));
      }
    }

    const fim2 = await c.enviar('Runtime.evaluate', { expression: SONDA, returnByValue: true });
    relatorio.telas[t.nome] = { viewport: t, grupo: fim2.result.value.grupo, filhos: fim2.result.value.filhos, amostras };
  }

  fs.writeFileSync(path.join(SAIDA, `medida-${rotulo}.json`), JSON.stringify(relatorio, null, 2));
  console.log(`gravado: medida-${rotulo}.json  (${problemas.length} problemas de console)`);
  c.fechar();
  proc.kill();
  process.exit(0);
})().catch((e) => { console.error('FALHOU:', e.message); process.exit(1); });
