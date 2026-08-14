// QA GEOMÉTRICO da faixa "Sobre Nós" — mede retângulos e prova colisão.
//
// A queixa é "o conteúdo aberto cobre a navbar". Isso pode ser cinco coisas
// diferentes, e cada uma pede uma correção diferente:
//
//   a) o texto chega fisicamente ao topo da janela (geometria);
//   b) o texto passa POR CIMA da navbar por z-index (pilha);
//   c) a navbar fica transparente e o que se vê é o conteúdo atrás (cor);
//   d) a abertura reposiciona o scroll e joga a seção para debaixo da barra;
//   e) o conteúdo escapa do palco (para cima, para baixo, ou por cima das
//      cortinas).
//
// Então aqui não se olha captura: mede-se retângulo por retângulo, no estado
// aberto, com as fontes oficiais já carregadas, e pergunta-se quem intersecta
// quem — e quem o navegador devolve em elementFromPoint sobre a barra, que é a
// prova de clicabilidade.
//
// Só lê a página. Não altera arquivo nenhum do projeto.
//
//   node tools/qa-sobre-geometria.js
const path = require('path');
const { spawn } = require('child_process');
const { CDP, pegarJSON, esperarDevTools } = require('./cdp');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = process.env.BASE || 'http://localhost:3030';
const PORTA = Number(process.env.PORTA) || 9455;
const TELAS = [['desktop', 1440, 900], ['tablet', 768, 1024], ['mobile', 390, 844]];
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

// Medidor: roda dentro da página e devolve todos os retângulos de uma vez.
// O "dono do pixel" vem de elementFromPoint no centro da navbar — é o teste de
// clique de verdade, não uma leitura de z-index.
const MEDIR = `(() => {
  const r = (el) => {
    if (!el) return null;
    const b = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      top: Math.round(b.top), bottom: Math.round(b.bottom),
      left: Math.round(b.left), right: Math.round(b.right),
      w: Math.round(b.width), h: Math.round(b.height),
      z: cs.zIndex, pos: cs.position, ov: cs.overflow,
      bg: cs.backgroundColor, transform: cs.transform,
    };
  };
  const q = (s) => document.querySelector(s);
  const nav = q('nav[data-framer-name^="Navigation"]');
  // O container fixo é o pai posicionado da nav: é ele que ocupa o topo.
  let barra = nav, e = nav && nav.parentElement;
  while (e && e !== document.body) {
    if (getComputedStyle(e).position === 'fixed') { barra = e; break; }
    e = e.parentElement;
  }
  const bar = r(barra);
  const dono = bar ? (() => {
    const pts = [
      [Math.round((bar.left + bar.right) / 2), Math.round((bar.top + bar.bottom) / 2)],
      [Math.round(bar.left + 40), Math.round((bar.top + bar.bottom) / 2)],
      [Math.round(bar.right - 40), Math.round((bar.top + bar.bottom) / 2)],
    ];
    return pts.map(([x, y]) => {
      const el = document.elementFromPoint(x, y);
      if (!el) return 'nada';
      const dentro = !!(el.closest && el.closest('[data-mel-sobre]'));
      return (el.tagName.toLowerCase()
        + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/)[0] : '')
        + (dentro ? ' <<SOBRE' : ''));
    });
  })() : null;
  const palco = q('[data-mel-sobre-palco]');
  return {
    vw: window.innerWidth, vh: window.innerHeight,
    scrollY: Math.round(window.scrollY),
    aberto: !!(palco && palco.hasAttribute('data-aberto')),
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    navbar: bar, donoDoPixelDaBarra: dono,
    secao: r(q('[data-mel-sobre]')),
    palco: r(palco),
    // Nada pode estar cortado EM REPOUSO: com 1fr a fileira do meio tem
    // exatamente a altura do conteúdo, então scrollHeight == clientHeight.
    vao: r(q('.mel-sobre-vao')),
    vaoCorte: (() => {
      const v = q('.mel-sobre-vao');
      if (!v) return null;
      return { rolagem: v.scrollHeight, visivel: v.clientHeight, corte: v.scrollHeight - v.clientHeight };
    })(),
    cima: r(q('.mel-sobre-cima')),
    baixo: r(q('.mel-sobre-baixo')),
    capa: r(q('.mel-sobre-capa')),
    tit: r(q('.mel-sobre-tit')),
    linha: r(q('.mel-sobre-linha')),
    miolo: r(q('.mel-sobre-miolo')),
    corpo: r(q('.mel-sobre-corpo')),
    cta: r(q('.mel-sobre-cta')),
    bt: r(q('[data-mel-sobre-bt]')),
  };
})()`;

function cruza(a, b) {
  if (!a || !b) return null;
  const x = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return x > 0 && y > 0 ? { x: Math.round(x), y: Math.round(y) } : null;
}

async function avaliar(c, expr) {
  const res = await c.enviar('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (res.exceptionDetails) throw new Error(res.exceptionDetails.text + ' ' + ((res.exceptionDetails.exception || {}).description || ''));
  return res.result.value;
}

function linhaRet(nome, x) {
  if (!x) return `   ${nome.padEnd(9)} —`;
  return `   ${nome.padEnd(9)} top=${String(x.top).padStart(5)} bottom=${String(x.bottom).padStart(5)}`
    + ` left=${String(x.left).padStart(4)} right=${String(x.right).padStart(5)}`
    + ` (${x.w}x${x.h})  pos=${x.pos} z=${x.z}`;
}

(async () => {
  const proc = spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
    '--no-default-browser-check', '--mute-audio', '--hide-scrollbars',
    '--remote-debugging-port=' + PORTA,
    '--user-data-dir=' + path.join(__dirname, 'edge-cdp-' + PORTA), 'about:blank',
  ], { stdio: 'ignore' });

  await esperarDevTools(PORTA);
  const alvos = await pegarJSON(PORTA, '/json/list');
  const c = await CDP.conectar(alvos.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await c.enviar('Page.enable'); await c.enviar('Runtime.enable');
  try { await c.enviar('Log.enable'); } catch {}

  let falhas = 0;
  for (const [nome, larg, alt] of TELAS) {
    const consola = [];
    const ouvirLog = (p) => { if (p.entry.level === 'error') consola.push(p.entry.text); };
    const ouvirExc = (p) => consola.push('exceção: ' + (p.exceptionDetails.text || ''));
    c.ao('Log.entryAdded', ouvirLog);
    c.ao('Runtime.exceptionThrown', ouvirExc);

    await c.enviar('Emulation.setDeviceMetricsOverride', { width: larg, height: alt, deviceScaleFactor: 1, mobile: larg < 810 });
    const carregou = new Promise((ok) => c.ao('Page.loadEventFired', ok));
    await c.enviar('Page.navigate', { url: BASE + '/' });
    await Promise.race([carregou, dormir(45000)]);
    // As fontes oficiais mudam a altura do texto. Medir antes delas é medir
    // outro layout.
    await avaliar(c, 'document.fonts.ready.then(()=>1)');
    await dormir(1200);

    console.log(`\n======== ${nome}  ${larg}x${alt} ========`);

    // --- fechada, com a seção enquadrada ---
    const posSecao = await avaliar(c, `(async () => {
      const s = document.querySelector('[data-mel-sobre]');
      let topo = 0, e = s; while (e) { topo += e.offsetTop; e = e.offsetParent; }
      return topo;
    })()`);
    // Parar ANTES do gatilho (-28% da janela) para medir o estado fechado.
    await avaliar(c, `(async () => {
      window.scrollTo(0, ${Math.max(0, posSecao - alt)});
      await new Promise(r => setTimeout(r, 900));
    })()`);
    const fechada = await avaliar(c, MEDIR);
    console.log(`-- fechada (scrollY=${fechada.scrollY}, aberto=${fechada.aberto}) --`);
    console.log(linhaRet('palco', fechada.palco));
    console.log(linhaRet('capa', fechada.capa));

    // --- abrir e medir o salto de scroll ---
    const scrollAntes = fechada.scrollY;
    await avaliar(c, `(async () => {
      const p = document.querySelector('[data-mel-sobre-palco]');
      const bt = p.querySelector('[data-mel-sobre-bt]');
      if (!p.hasAttribute('data-aberto')) bt.click();
      await new Promise(r => setTimeout(r, 200));
    })()`);
    // durante a transição
    await dormir(280);
    const durante = await avaliar(c, MEDIR);
    // fim da transição (720ms de altura + folga)
    await dormir(1000);
    const aberta = await avaliar(c, MEDIR);

    console.log(`-- ABERTA (scrollY=${aberta.scrollY}, era ${scrollAntes} → salto=${aberta.scrollY - scrollAntes}) --`);
    for (const k of ['navbar', 'secao', 'palco', 'cima', 'baixo', 'capa', 'tit', 'linha', 'miolo', 'corpo', 'cta', 'bt']) {
      console.log(linhaRet(k, aberta[k]));
    }
    console.log(`   navbar bg=${aberta.navbar ? aberta.navbar.bg : '—'}`);
    console.log(`   dono do pixel sobre a barra: ${JSON.stringify(aberta.donoDoPixelDaBarra)}`);
    console.log(`   overflow horizontal: ${aberta.overflowX}px`);

    // --- quem cruza quem ---
    const erros = [];
    const contra = ['capa', 'tit', 'linha', 'miolo', 'corpo', 'cta', 'bt'];
    console.log('-- interseções com a navbar --');
    for (const k of contra) {
      const i = cruza(aberta.navbar, aberta[k]);
      console.log(`   navbar x ${k.padEnd(6)}: ${i ? `CRUZA ${i.x}x${i.y}px` : 'sem interseção'}`);
      if (i) erros.push(`${k} cruza a navbar em ${i.x}x${i.y}px`);
    }
    // durante a transição também
    for (const k of contra) {
      const i = cruza(durante.navbar, durante[k]);
      if (i) erros.push(`DURANTE a transição: ${k} cruza a navbar em ${i.x}x${i.y}px`);
    }

    // --- conteúdo dentro do palco ---
    console.log('-- conteúdo dentro do palco --');
    for (const k of ['capa', 'miolo', 'cta', 'bt']) {
      const p = aberta.palco, x = aberta[k];
      if (!p || !x) continue;
      const fora = [];
      if (x.top < p.top) fora.push(`${p.top - x.top}px acima do topo`);
      if (x.bottom > p.bottom) fora.push(`${x.bottom - p.bottom}px abaixo da base`);
      if (x.left < p.left) fora.push(`${p.left - x.left}px à esquerda`);
      if (x.right > p.right) fora.push(`${x.right - p.right}px à direita`);
      console.log(`   ${k.padEnd(6)}: ${fora.length ? 'FORA — ' + fora.join(', ') : 'dentro'}`);
      if (fora.length) erros.push(`${k} sai do palco: ${fora.join(', ')}`);
    }

    // --- conteúdo dentro do VÃO (entre as cortinas) ---
    if (aberta.cima && aberta.baixo) {
      const vaoTopo = aberta.cima.bottom, vaoBase = aberta.baixo.top;
      console.log(`-- vão entre cortinas: ${vaoTopo}..${vaoBase} (${vaoBase - vaoTopo}px de altura) --`);
      for (const k of ['capa', 'miolo']) {
        const x = aberta[k];
        if (!x) continue;
        const fora = [];
        if (x.top < vaoTopo) fora.push(`${vaoTopo - x.top}px sobre a cortina de cima`);
        if (x.bottom > vaoBase) fora.push(`${x.bottom - vaoBase}px sobre a cortina de baixo`);
        console.log(`   ${k.padEnd(6)}: ${fora.length ? 'INVADE — ' + fora.join(', ') : 'dentro do vão'}`);
        if (fora.length) erros.push(`${k} invade cortina: ${fora.join(', ')}`);
      }
      const c1 = cruza(aberta.capa, aberta.miolo);
      console.log(`   capa x miolo: ${c1 ? `CRUZA ${c1.x}x${c1.y}px` : 'sem sobreposição'}`);
      if (c1) erros.push(`capa e miolo se sobrepõem em ${c1.x}x${c1.y}px`);
      const c2 = cruza(aberta.miolo, aberta.bt);
      console.log(`   miolo x botão: ${c2 ? `CRUZA ${c2.x}x${c2.y}px` : 'sem sobreposição'}`);
      if (c2) erros.push(`miolo e botão se sobrepõem em ${c2.x}x${c2.y}px`);
    }

    if (aberta.vaoCorte) {
      console.log(`-- área central: conteúdo ${aberta.vaoCorte.rolagem}px em ${aberta.vaoCorte.visivel}px visíveis --`);
      if (aberta.vaoCorte.corte > 0) erros.push(`${aberta.vaoCorte.corte}px de conteúdo cortados na área central`);
    }
    if (Math.abs(aberta.scrollY - scrollAntes) > 2) erros.push(`o scroll saltou ${aberta.scrollY - scrollAntes}px na abertura`);
    if (aberta.overflowX > 0) erros.push(`${aberta.overflowX}px de overflow horizontal`);
    if (aberta.donoDoPixelDaBarra && aberta.donoDoPixelDaBarra.some((s) => /<<SOBRE/.test(s))) {
      erros.push('a faixa Sobre Nós é quem recebe o clique sobre a navbar');
    }
    if (consola.length) erros.push(`${consola.length} erro(s) de console: ${consola.join(' | ')}`);

    console.log(erros.length ? '\n   [FALHOU] ' + erros.join('\n            ') : '\n   [OK] nenhuma colisão');
    if (erros.length) falhas++;

    c.eventos.set('Log.entryAdded', (c.eventos.get('Log.entryAdded') || []).filter((f) => f !== ouvirLog));
    c.eventos.set('Runtime.exceptionThrown', (c.eventos.get('Runtime.exceptionThrown') || []).filter((f) => f !== ouvirExc));
  }

  console.log(falhas ? `\n${falhas} tela(s) reprovaram.` : '\ntodas as telas passaram.');
  c.fechar(); proc.kill();
  process.exit(falhas ? 1 : 0);
})().catch((e) => { console.error('FALHOU:', e.message); process.exit(2); });
