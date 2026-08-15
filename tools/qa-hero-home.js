// QA do bloco de texto da hero da home — 14/08/2026.
//
//   node tools/qa-hero-home.js [larguraxaltura ...]
//
// Três coisas que nenhuma captura solta prova, e que este arquivo prova:
//
//   1. A NAVBAR NÃO MUDOU. É a exigência absoluta do pedido, e a primeira
//      montagem a quebrou sem ninguém notar na hora: o véu tinha inset:0 e
//      z-index:2, e passava por cima da barra — o lettering MELCAM caiu de
//      rgb(251,247,238) para rgb(142,139,132). O teste captura a página duas
//      vezes, uma normal e outra com o bloco em display:none, e compara a
//      faixa da barra PIXEL A PIXEL. Qualquer diferença reprova.
//
//   2. O TEXTO É LEGÍVEL SOBRE O VÍDEO. O fundo é filme, e filme muda de
//      quadro. Medir um quadro só não prova nada, então o teste pausa o vídeo
//      em vários tempos e mede o pior caso de cada caixa de texto contra o
//      fundo COMPOSTO (vídeo + véu), com o texto escondido por visibility —
//      não por display, para a geometria não se mexer. Esconder é obrigatório:
//      sem isso a medida pega os próprios pixels da letra e devolve 1,00:1.
//
//   3. A GEOMETRIA É A DA REFERÊNCIA. Bloco à esquerda, selo acima do título,
//      subtítulo abaixo, CTA depois, indicador centrado na tela. O indicador
//      já saiu 22px fora do centro uma vez, porque o keyframe terminava em
//      transform:none e apagava o translateX(-50%) que o centra.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { CDP, pegarJSON, esperarDevTools } = require('./cdp');
const { lerPNG, pixel, contraste } = require('./png');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = process.env.BASE_URL || 'http://localhost:3030';
const PORTA = Number(process.env.PORTA) || 9464;
const SAIDA = path.join(__dirname, 'shots-hero-home');
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

const PAPEL = [251, 247, 238];
const CARVAO = [34, 30, 23];
// 6 pontos com 2,2s de reprodução entre eles: cobre cerca de 13s do filme,
// que é o bastante para pegar as cenas claras e as escuras.
const AMOSTRAS = 6;
const ESPERA = 2200;

const TELAS = (() => {
  const a = process.argv.slice(2).filter((s) => /^\d+x\d+$/.test(s));
  return (a.length ? a : ['1440x900', '1280x800', '810x1080', '390x844']).map((s) => s.split('x').map(Number));
})();

const SONDA_GEO = `(() => {
  const r = (s) => { const e = document.querySelector(s); if (!e) return null;
    const b = e.getBoundingClientRect();
    return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; };
  return {
    hero:  r('[data-framer-name="The first section"]'),
    bloco: r('[data-mel="hero-home"]'),
    selo:  r('.mel-hh-selo'),
    tit:   r('.mel-hh-tit'),
    sub:   r('.mel-hh-sub'),
    ctas:  r('.mel-hh-ctas'),
    ctaA:  r('.mel-hh-cta-mel'),
    ctaB:  r('.mel-hh-cta-linha'),
    role:  r('.mel-hh-role'),
    // Em retrato o <nav> de desktop mede 0x0 e quem aparece é o nav mobile.
    // Pegar o primeiro fazia a faixa comparada ter ALTURA ZERO, ou seja, o
    // teste da navbar passava sem comparar pixel nenhum.
    navbar: (() => {
      const vis = [].slice.call(document.querySelectorAll('nav'))
        .map((e) => e.getBoundingClientRect())
        .filter((b) => b.width > 0 && b.height > 0)
        .sort((a, b) => b.height - a.height)[0];
      return vis ? { x: Math.round(vis.x), y: Math.round(vis.y),
        w: Math.round(vis.width), h: Math.round(vis.height) } : null;
    })(),
    h1s: document.querySelectorAll('h1').length,
    h1: (document.querySelector('h1') || {}).textContent,
    textos: {
      selo: (document.querySelector('.mel-hh-selo') || {}).textContent,
      tit: (document.querySelector('.mel-hh-tit') || {}).textContent,
      sub: (document.querySelector('.mel-hh-sub') || {}).textContent,
      ctaA: (document.querySelector('.mel-hh-cta-mel') || {}).textContent,
      ctaB: (document.querySelector('.mel-hh-cta-linha') || {}).textContent,
    },
    hrefs: [].slice.call(document.querySelectorAll('.mel-hh-cta')).map((a) => a.getAttribute('href')),
    // o envelope não pode receber ponteiro, senão rouba clique da barra
    ponteiroEnvelope: getComputedStyle(document.querySelector('[data-mel="hero-home"]')).pointerEvents,
    ponteiroCta: getComputedStyle(document.querySelector('.mel-hh-cta-mel')).pointerEvents,
    // Quem responde na faixa da barra tem que ser a PRÓPRIA barra. O alvo em
    // (60,40) é o <a> do link, então a pergunta certa é se ele está DENTRO do
    // <nav> — perguntar a tag reprovava o comportamento correto.
    sobNav: (() => { const e = document.elementFromPoint(60, 40); if (!e) return 'nada';
      const naNav = !!e.closest('nav');
      const noBloco = !!e.closest('[data-mel="hero-home"]');
      return (naNav ? 'navbar' : noBloco ? 'BLOCO DA HERO' : 'outro') + ' (' +
        e.tagName.toLowerCase() + '.' + String(e.className || '').trim().split(/\\s+/)[0] + ')'; })(),
    transbordo: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  };
})()`;

async function abrir(larg, alt) {
  const proc = spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
    '--no-default-browser-check', '--hide-scrollbars', '--mute-audio',
    '--autoplay-policy=no-user-gesture-required',
    '--remote-debugging-port=' + PORTA,
    '--user-data-dir=' + path.join(__dirname, 'edge-cdp-' + PORTA), 'about:blank',
  ], { stdio: 'ignore' });
  await esperarDevTools(PORTA);
  const alvos = await pegarJSON(PORTA, '/json/list');
  const c = await CDP.conectar(alvos.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await c.enviar('Page.enable');
  await c.enviar('Runtime.enable');
  await c.enviar('Emulation.setDeviceMetricsOverride',
    { width: larg, height: alt, deviceScaleFactor: 1, mobile: larg < 810 });
  const carregou = new Promise((ok) => c.ao('Page.loadEventFired', ok));
  await c.enviar('Page.navigate', { url: BASE + '/' });
  await Promise.race([carregou, dormir(30000)]);
  await dormir(2600);
  return { proc, c };
}

const rodar = (c, js) => c.enviar('Runtime.evaluate', { expression: js, returnByValue: true })
  .then((r) => r.result.value);

async function tirar(c, arq) {
  const s = await c.enviar('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(arq, Buffer.from(s.data, 'base64'));
  return lerPNG(Buffer.from(s.data, 'base64'));
}

// Pausa o vídeo ONDE ELE ESTIVER. Sem isso duas capturas seguidas caem em
// quadros diferentes e nenhuma comparação de pixel vale.
//
// NÃO SE BUSCA POSIÇÃO AQUI, e a razão é o servidor: o serve.js responde 200 a
// tudo, sem Accept-Ranges e ignorando o cabeçalho Range. Sem Range o navegador
// não consegue buscar, e `v.currentTime = 8` volta em 0 calado. A primeira
// versão deste arquivo fazia isso e mediu SEIS VEZES O MESMO QUADRO — o de
// t=0, que por acaso é o mais escuro do filme, e por isso o contraste saía
// folgado. Mexer no serve.js para atender Range consertaria o teste e não o
// site, então o caminho é outro: deixar tocar e pausar em pontos sucessivos.
const parar = `(() => { const v = document.querySelector('[data-mel="hero-video"]');
  if (!v) return null; v.pause();
  return [Number(v.currentTime.toFixed(2)), Number((v.duration || 0).toFixed(2))]; })()`;
const tocar = `(() => { const v = document.querySelector('[data-mel="hero-video"]');
  if (!v) return null; v.play(); return 1; })()`;

const estilo = (css) => `(() => { let e = document.getElementById('qa-hero-home');
  if (!e) { e = document.createElement('style'); e.id = 'qa-hero-home'; document.head.appendChild(e); }
  e.textContent = ${JSON.stringify(css)}; return 1; })()`;

function medir(img, cx, tinta) {
  let pior = Infinity, min = null, n = 0, abaixo = 0;
  for (let y = cx.y; y < cx.y + cx.h; y++) {
    for (let x = cx.x; x < cx.x + cx.w; x++) {
      if (x < 0 || y < 0 || x >= img.larg || y >= img.alt) continue;
      const p = pixel(img, x, y), c = contraste(tinta, p);
      n++; if (c < 4.5) abaixo++;
      if (c < pior) { pior = c; min = p; }
    }
  }
  return { pior, min, n, abaixo };
}

(async () => {
  fs.mkdirSync(SAIDA, { recursive: true });
  const falhas = [];

  for (const [larg, alt] of TELAS) {
    console.log('\n=== ' + larg + 'x' + alt + ' ===');
    const { proc, c } = await abrir(larg, alt);

    const g = await rodar(c, SONDA_GEO);
    if (!g.bloco) { falhas.push(larg + ': o bloco da hero não existe na página'); proc.kill(); continue; }

    console.log('  bloco ' + g.bloco.x + ',' + g.bloco.y + ' ' + g.bloco.w + 'x' + g.bloco.h +
      '  | selo y' + g.selo.y + '  tit y' + g.tit.y + ' x' + g.tit.x + '-' + (g.tit.x + g.tit.w) +
      '  sub y' + g.sub.y + '  ctas y' + g.ctas.y + '  role x' + g.role.x + '-' + (g.role.x + g.role.w) + ' y' + g.role.y);
    console.log('  textos  "' + g.textos.selo + '" / "' + g.textos.tit + '" / "' + g.textos.sub +
      '" / "' + g.textos.ctaA + '" + "' + g.textos.ctaB + '"  -> ' + g.hrefs.join(' , '));

    // ---- ordem e lado
    if (!(g.selo.y < g.tit.y && g.tit.y < g.sub.y && g.sub.y < g.ctas.y)) {
      falhas.push(larg + ': a ordem selo / título / subtítulo / CTA saiu trocada');
    }
    if (g.tit.x > larg * 0.35) falhas.push(larg + ': o bloco não está do lado esquerdo (x' + g.tit.x + ')');
    const centro = g.role.x + g.role.w / 2;
    if (Math.abs(centro - larg / 2) > 2) {
      falhas.push(larg + ': o indicador "Role" está em ' + centro.toFixed(0) + ' e o centro é ' + (larg / 2));
    }
    if (g.role.y + g.role.h > g.hero.h) falhas.push(larg + ': o indicador "Role" passou do fim da hero');
    if (g.h1s !== 1) falhas.push(larg + ': a home tem ' + g.h1s + ' <h1>, tem que ser 1');
    if ((g.h1 || '').trim() !== 'Chegou a Bee') falhas.push(larg + ': o <h1> é "' + g.h1 + '"');
    if (g.transbordo) falhas.push(larg + ': transbordo horizontal');

    // ---- a navbar não pode receber nada do bloco
    if (g.ponteiroEnvelope !== 'none') falhas.push(larg + ': o envelope do bloco recebe ponteiro');
    if (g.ponteiroCta === 'none') falhas.push(larg + ': os CTA não recebem ponteiro');
    if (!/^navbar/.test(g.sobNav || '')) {
      falhas.push(larg + ': em (60,40), dentro da barra, quem responde é ' + g.sobNav);
    }

    // ---- a navbar pixel a pixel, com e sem o bloco
    await rodar(c, parar);
    await dormir(700);
    const comBloco = await tirar(c, path.join(SAIDA, 'com-' + larg + 'x' + alt + '.png'));
    await rodar(c, estilo('[data-mel="hero-home"]{display:none!important}'));
    await dormir(500);
    const semBloco = await tirar(c, path.join(SAIDA, 'sem-' + larg + 'x' + alt + '.png'));
    await rodar(c, estilo(''));

    let pior = 0, onde = null, cont = 0;
    const hNav = g.navbar && g.navbar.h ? g.navbar.h : 81;
    if (!g.navbar || !g.navbar.h) falhas.push(larg + ': nenhuma <nav> visível para comparar');
    for (let y = 0; y < hNav; y++) {
      for (let x = 0; x < larg; x++) {
        const a = pixel(comBloco, x, y), b = pixel(semBloco, x, y);
        const d = Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
        cont++; if (d > pior) { pior = d; onde = [x, y, a, b]; }
      }
    }
    console.log('  navbar  ' + cont + ' pixels na faixa de ' + hNav + 'px  |  maior diferenca com/sem o bloco: ' + pior);
    if (pior !== 0) {
      falhas.push(larg + ': o bloco mudou a navbar em (' + onde[0] + ',' + onde[1] + '): rgb(' +
        onde[3] + ') -> rgb(' + onde[2] + ')');
    }

    // ---- contraste contra o fundo composto, em vários quadros
    const caixas = [
      ['titulo', g.tit, PAPEL], ['subtitulo', g.sub, PAPEL],
      ['CTA contorno', g.ctaB, PAPEL], ['Role', g.role, PAPEL],
    ];
    const pi = {}, mn = {}, ab = {}, tt = {}, quadros = [];
    // Esconde o TEXTO, não o que está atrás dele. Esconder ".mel-hh-role"
    // inteiro apagava junto o ::before, que é a elipse que dá contraste ao
    // indicador — o teste media o vídeo cru e acusava 4,49:1 num lugar onde a
    // página entrega bem mais. Por isso a regra desce para os filhos.
    await rodar(c, estilo('.mel-hh-in,.mel-hh-role>span,.mel-hh-role>i{visibility:hidden!important}'));
    for (let k = 0; k < AMOSTRAS; k++) {
      await rodar(c, tocar);
      await dormir(ESPERA);
      const tr = await rodar(c, parar);
      await dormir(280);
      const img = await tirar(c, path.join(SAIDA, 'fundo-' + larg + 'x' + alt + '-' + k + '.png'));
      // A assinatura prova que os quadros são DIFERENTES. Se ela se repetir, a
      // medida não cobre o filme e o resultado não vale, mesmo saindo verde.
      quadros.push('t=' + (tr ? tr[0] : '?') + ' rgb(' + pixel(img, Math.min(1200, larg - 1), 300) + ')');
      for (const [rot, cx, tinta] of caixas) {
        const m = medir(img, cx, tinta);
        pi[rot] = Math.min(pi[rot] === undefined ? Infinity : pi[rot], m.pior);
        if (pi[rot] === m.pior) mn[rot] = 'quadro ' + k + ' rgb(' + m.min + ')';
        ab[rot] = (ab[rot] || 0) + m.abaixo; tt[rot] = (tt[rot] || 0) + m.n;
      }
    }
    await rodar(c, estilo(''));
    const unicos = new Set(quadros.map(q => q.split(' ')[1])).size;
    console.log('  quadros medidos: ' + quadros.join(' | ') + '  -> ' + unicos + ' distintos');
    if (unicos < 3) falhas.push(larg + ': a medida de contraste caiu em so ' + unicos + ' quadro(s) distinto(s); o video nao avancou');
    console.log('  contraste do papel contra o fundo composto, ' + AMOSTRAS + ' quadros:');
    for (const [rot] of caixas) {
      const pct = 100 * ab[rot] / tt[rot];
      console.log('    ' + rot.padEnd(14) + ' pior ' + pi[rot].toFixed(2) +
        '  abaixo de 4,5: ' + pct.toFixed(1) + '%   (' + mn[rot] + ')');
      if (pi[rot] < 4.5) {
        falhas.push(larg + ': "' + rot + '" cai a ' + pi[rot].toFixed(2) + ':1 em ' + mn[rot]);
      }
    }

    // o selo é carvão sobre mel, par fixo: não depende do vídeo
    console.log('    selo           carvão sobre mel = ' + contraste(CARVAO, [242, 169, 0]).toFixed(2) + ':1 (fixo)');

    proc.kill();
    await dormir(300);
  }

  console.log('\ncapturas em ' + SAIDA);
  if (falhas.length) { console.log('\n[FALHOU]\n  ' + falhas.join('\n  ')); process.exit(1); }
  console.log('\n[OK]  bloco de texto da hero da home');
  process.exit(0);
})();
