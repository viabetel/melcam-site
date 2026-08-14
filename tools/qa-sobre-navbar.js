// A PROVA da queixa "o Sobre Nós cobre a navbar".
//
// A primeira medição (qa-sobre-geometria.js) deu zero interseção — porque
// mediu a barra RETRAÍDA, em top=-81. A barra é retrátil: some ao rolar para
// baixo e volta com o mouse perto do topo (desktop) ou ao rolar para cima
// (toque). O defeito só existe com a barra REVELADA, e é isso que este teste
// monta na mão.
//
// Roteiro, por tela:
//   1. abre a faixa;
//   2. rola até que o texto do Sobre Nós fique na faixa dos 81px do topo;
//   3. REVELA a barra (mousemove perto do topo / rolagem para cima);
//   4. mede quem cruza quem e, principalmente, quem o navegador devolve em
//      elementFromPoint em cima da barra — que é o teste de clique real;
//   5. relata a ordem de pilha: z-index de cada um e posição no DOM.
//
// Só lê a página.
//
//   node tools/qa-sobre-navbar.js
const path = require('path');
const { spawn } = require('child_process');
const { CDP, pegarJSON, esperarDevTools } = require('./cdp');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = process.env.BASE || 'http://localhost:3030';
const PORTA = Number(process.env.PORTA) || 9456;
const TELAS = [['desktop', 1440, 900], ['tablet', 768, 1024], ['mobile', 390, 844]];
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function avaliar(c, expr) {
  const res = await c.enviar('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (res.exceptionDetails) throw new Error(res.exceptionDetails.text + ' ' + ((res.exceptionDetails.exception || {}).description || ''));
  return res.result.value;
}

function cruza(a, b) {
  if (!a || !b) return null;
  const x = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return x > 0 && y > 0 ? { x: Math.round(x), y: Math.round(y) } : null;
}

const MEDIR = `(() => {
  const r = (el) => {
    if (!el) return null;
    const b = el.getBoundingClientRect(), cs = getComputedStyle(el);
    return { top: Math.round(b.top), bottom: Math.round(b.bottom), left: Math.round(b.left),
             right: Math.round(b.right), w: Math.round(b.width), h: Math.round(b.height),
             z: cs.zIndex, pos: cs.position, bg: cs.backgroundColor };
  };
  const q = (s) => document.querySelector(s);
  let barra = q('[data-framer-name="Meniu"]');
  while (barra && getComputedStyle(barra).position !== 'fixed') barra = barra.parentElement;
  const nav = q('nav[data-framer-name^="Navigation"]');
  const bar = r(barra);
  const secao = q('[data-mel-sobre]');
  // Ordem no DOM entre a barra fixa e a faixa: com z-index igual, quem vem
  // depois pinta por cima. É a regra que decide o defeito.
  const ordem = (barra && secao)
    ? (barra.compareDocumentPosition(secao) & Node.DOCUMENT_POSITION_FOLLOWING
        ? 'a faixa vem DEPOIS da barra no DOM' : 'a faixa vem ANTES da barra no DOM')
    : '?';
  const pontos = bar ? [
    ['centro', Math.round((bar.left + bar.right) / 2), Math.round((bar.top + bar.bottom) / 2)],
    ['esquerda', Math.round(bar.left + 40), Math.round((bar.top + bar.bottom) / 2)],
    ['direita', Math.round(bar.right - 40), Math.round((bar.top + bar.bottom) / 2)],
    ['logo', Math.round(bar.left + 100), Math.round(bar.top + 40)],
  ] : [];
  const dono = pontos.map(([nome, x, y]) => {
    const el = document.elementFromPoint(x, y);
    if (!el) return nome + '=nada';
    const naFaixa = !!(el.closest && el.closest('[data-mel-sobre]'));
    const naBarra = !!(barra && barra.contains(el));
    const id = el.tagName.toLowerCase()
      + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\\s+/)[0] : '')
      + (el.getAttribute && el.getAttribute('data-framer-name') ? '[' + el.getAttribute('data-framer-name') + ']' : '');
    return nome + '=' + id + (naFaixa ? ' <<<SOBRE' : naBarra ? ' (barra)' : '');
  });
  return {
    vh: window.innerHeight, scrollY: Math.round(window.scrollY),
    aberto: !!(q('[data-mel-sobre-palco]') || {}).hasAttribute && q('[data-mel-sobre-palco]').hasAttribute('data-aberto'),
    barra: bar, navBg: nav ? getComputedStyle(nav).backgroundColor : null,
    navZ: nav ? getComputedStyle(nav).zIndex : null,
    ordemDom: ordem,
    donos: dono,
    palco: r(q('[data-mel-sobre-palco]')),
    capa: r(q('.mel-sobre-capa')), tit: r(q('.mel-sobre-tit')),
    linha: r(q('.mel-sobre-linha')), miolo: r(q('.mel-sobre-miolo')),
    corpo: r(q('.mel-sobre-corpo')), cta: r(q('.mel-sobre-cta')),
    bt: r(q('[data-mel-sobre-bt]')),
  };
})()`;

// Revela a barra pelos dois caminhos que o próprio site oferece: no toque, a
// rolagem para cima; no desktop, o mouse perto do topo.
//
// 🔴 O mousemove PRECISA vir de Input.dispatchMouseEvent, não de
// document.dispatchEvent — a primeira versão deste teste usava dispatchEvent e
// a barra nunca revelava, o que fazia todas as paradas darem "sem interseção"
// por engano. Evento sintético de DOM não é evento de entrada.
async function revelar(c, alvoY) {
  // 1. toque: chegar ao alvo ROLANDO PARA CIMA (vindo de 140px abaixo).
  await avaliar(c, `(async () => {
    window.scrollTo(0, ${alvoY + 140});
    await new Promise(r => setTimeout(r, 350));
    window.scrollTo(0, ${alvoY});
    await new Promise(r => setTimeout(r, 450));
  })()`);
  // 2. desktop: mouse perto do topo.
  await c.enviar('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 300, y: 8, buttons: 0 });
  await dormir(600);
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
    c.ao('Log.entryAdded', ouvirLog);

    await c.enviar('Emulation.setDeviceMetricsOverride', { width: larg, height: alt, deviceScaleFactor: 1, mobile: larg < 810 });
    const carregou = new Promise((ok) => c.ao('Page.loadEventFired', ok));
    await c.enviar('Page.navigate', { url: BASE + '/' });
    await Promise.race([carregou, dormir(45000)]);
    await avaliar(c, 'document.fonts.ready.then(()=>1)');
    await dormir(1200);

    console.log(`\n======== ${nome}  ${larg}x${alt} ========`);

    // Abre a faixa e espera a altura assentar.
    const topoSecao = await avaliar(c, `(async () => {
      let t = 0, e = document.querySelector('[data-mel-sobre]');
      while (e) { t += e.offsetTop; e = e.offsetParent; }
      window.scrollTo(0, t - window.innerHeight * 0.5);
      await new Promise(r => setTimeout(r, 700));
      const p = document.querySelector('[data-mel-sobre-palco]');
      if (!p.hasAttribute('data-aberto')) p.querySelector('[data-mel-sobre-bt]').click();
      await new Promise(r => setTimeout(r, 1400));
      return t;
    })()`);

    // Varre a seção passando por debaixo da barra e, em cada parada, revela a
    // barra e pergunta quem é o dono do pixel. A parada que interessa é
    // aquela em que o texto está na faixa dos 81px do topo.
    const paradas = [];
    for (const alvoTexto of ['capa', 'miolo', 'cta']) {
      const y = await avaliar(c, `(async () => {
        const el = document.querySelector('.mel-sobre-${alvoTexto === 'cta' ? 'cta' : alvoTexto}');
        const y = Math.round(window.scrollY + el.getBoundingClientRect().top - 40);
        window.scrollTo(0, y);
        await new Promise(r => setTimeout(r, 600));
        return Math.round(window.scrollY);
      })()`);
      await revelar(c, y);
      const m = await avaliar(c, MEDIR);
      paradas.push([alvoTexto, y, m]);
    }

    for (const [alvo, y, m] of paradas) {
      console.log(`\n-- ${alvo} na faixa do topo (scrollY=${y}, faixa ${m.aberto ? 'ABERTA' : 'fechada'}) --`);
      console.log(`   barra   top=${m.barra.top} bottom=${m.barra.bottom} z=${m.barra.z} pos=${m.barra.pos} bg=${m.barra.bg}`);
      console.log(`   <nav>   z=${m.navZ} bg=${m.navBg}`);
      console.log(`   ${m.ordemDom}`);
      for (const k of ['palco', 'capa', 'tit', 'linha', 'miolo', 'corpo', 'cta', 'bt']) {
        const x = m[k];
        if (!x) continue;
        const i = cruza(m.barra, x);
        console.log(`   ${k.padEnd(6)} top=${String(x.top).padStart(5)} bottom=${String(x.bottom).padStart(5)} z=${x.z.padEnd(4)}`
          + `  ${i ? 'CRUZA A BARRA ' + i.x + 'x' + i.y + 'px' : ''}`);
      }
      console.log(`   dono do pixel: ${m.donos.join(' | ')}`);
      const roubado = m.donos.filter((d) => /<<<SOBRE/.test(d));
      if (m.barra.top >= 0 && roubado.length) {
        console.log(`   [DEFEITO] a faixa recebe o clique em ${roubado.length}/${m.donos.length} pontos da barra`);
        falhas++;
      } else if (m.barra.top < 0) {
        console.log('   [aviso] a barra não revelou nesta parada');
      } else {
        console.log('   [ok] a barra é dona de todos os pontos');
      }
    }
    if (consola.length) console.log(`   console: ${consola.join(' | ')}`);
    c.eventos.set('Log.entryAdded', (c.eventos.get('Log.entryAdded') || []).filter((f) => f !== ouvirLog));
  }

  console.log(falhas ? `\n${falhas} parada(s) com a faixa por cima da barra.` : '\nnenhuma parada com a faixa por cima da barra.');
  c.fechar(); proc.kill();
  process.exit(falhas ? 1 : 0);
})().catch((e) => { console.error('FALHOU:', e.message); process.exit(2); });
