// QA da seção "A Melcam por aí" depois da troca dos placeholders.
//
// O que precisa ser provado, e nenhuma dessas coisas se enxerga em captura:
//
//   1. as três fotos CARREGARAM (naturalWidth > 0) — src errado não dá erro
//      visível, dá caixa vazia sobre fundo carvão, que é exatamente a cara do
//      placeholder que saiu;
//   2. o recorte é `cover` e o `object-position` de cada uma é o declarado;
//   3. quanto da foto é cortado, e em qual eixo — o número que justifica os
//      valores de `--mel-foco`;
//   4. a proporção do card continua 9:16;
//   5. não sobrou texto de placeholder ("a decidir", "vídeo a decidir") na
//      seção, nem em texto visível nem em alt;
//   6. não existe <video>, <source>, nem botão/ícone de play — nada finge ser
//      vídeo;
//   7. todo <img> tem alt não vazio e descritivo;
//   8. zero transbordo horizontal e zero erro de console.
//
// Só lê a página.
//
//   node tools/qa-clipes.js
const path = require('path');
const { spawn } = require('child_process');
const { CDP, pegarJSON, esperarDevTools } = require('./cdp');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = process.env.BASE || 'http://localhost:3030';
const PORTA = Number(process.env.PORTA) || 9462;
const TELAS = [['desktop', 1440, 900], ['tablet', 768, 1024], ['mobile', 390, 844]];
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function av(c, e) {
  const r = await c.enviar('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + ((r.exceptionDetails.exception || {}).description || ''));
  return r.result.value;
}

const MEDIR = `(async () => {
  const sec = document.querySelector('.mel-clipes');
  if (!sec) return null;
  sec.scrollIntoView({ block: 'center' });
  await new Promise(r => setTimeout(r, 500));
  const imgs = Array.from(sec.querySelectorAll('.mel-clipe-box img'));
  await Promise.all(imgs.map(im => im.complete ? 1 : new Promise(r => {
    im.addEventListener('load', r, { once: true });
    im.addEventListener('error', r, { once: true });
  })));
  await new Promise(r => setTimeout(r, 400));

  const cards = imgs.map((im) => {
    const box = im.closest('.mel-clipe-box');
    const rb = box.getBoundingClientRect();
    const cs = getComputedStyle(im);
    // Com cover, a foto é escalada pelo MAIOR fator necessário; o corte cai no
    // eixo em que ela sobra.
    const escala = Math.max(rb.width / im.naturalWidth, rb.height / im.naturalHeight);
    const larguraEscalada = im.naturalWidth * escala;
    const alturaEscalada = im.naturalHeight * escala;
    const etiqueta = box.querySelector('.mel-clipe-spec');
    return {
      src: im.getAttribute('src').split('/').pop(),
      carregou: im.naturalWidth > 0 && im.naturalHeight > 0,
      natural: im.naturalWidth + 'x' + im.naturalHeight,
      caixa: Math.round(rb.width) + 'x' + Math.round(rb.height),
      proporcaoCaixa: +(rb.width / rb.height).toFixed(3),
      fit: cs.objectFit,
      pos: cs.objectPosition,
      foco: im.style.getPropertyValue('--mel-foco').trim(),
      cortadoX: Math.round(larguraEscalada - rb.width),
      cortadoY: Math.round(alturaEscalada - rb.height),
      cortadoXpct: +(((larguraEscalada - rb.width) / larguraEscalada) * 100).toFixed(1),
      cortadoYpct: +(((alturaEscalada - rb.height) / alturaEscalada) * 100).toFixed(1),
      alt: im.getAttribute('alt') || '',
      etiqueta: etiqueta ? etiqueta.textContent.trim() : null,
      etiquetaSobrepoeFoto: !!etiqueta,
    };
  });

  return {
    vw: window.innerWidth,
    cards,
    colunas: getComputedStyle(sec.querySelector('.mel-clipes-grade')).gridTemplateColumns.split(' ').length,
    textoDaSecao: sec.textContent.replace(/\\s+/g, ' ').trim(),
    videos: sec.querySelectorAll('video, source, [class*="play"], [aria-label*="play" i], [aria-label*="reproduz" i]').length,
    botoes: sec.querySelectorAll('button, [role="button"]').length,
    semAlt: Array.from(sec.querySelectorAll('img')).filter(im => !(im.getAttribute('alt') || '').trim()).length,
    transbordo: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
})()`;

(async () => {
  const proc = spawn(EDGE, ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
    '--no-default-browser-check', '--mute-audio', '--hide-scrollbars',
    '--remote-debugging-port=' + PORTA, '--user-data-dir=' + path.join(__dirname, 'edge-cdp-' + PORTA), 'about:blank'], { stdio: 'ignore' });
  await esperarDevTools(PORTA);
  const c = await CDP.conectar((await pegarJSON(PORTA, '/json/list')).find((t) => t.type === 'page').webSocketDebuggerUrl);
  await c.enviar('Page.enable'); await c.enviar('Runtime.enable');
  try { await c.enviar('Log.enable'); } catch {}

  const PROIBIDO = /a decidir|vídeo a decidir|video a decidir/i;
  let falhas = 0;

  for (const [nome, larg, alt] of TELAS) {
    const consola = [];
    const ouvir = (p) => { if (p.entry.level === 'error') consola.push(p.entry.text); };
    c.ao('Log.entryAdded', ouvir);

    await c.enviar('Emulation.setDeviceMetricsOverride', { width: larg, height: alt, deviceScaleFactor: 1, mobile: larg < 810 });
    const ok = new Promise((r) => c.ao('Page.loadEventFired', r));
    await c.enviar('Page.navigate', { url: BASE + '/' });
    await Promise.race([ok, dormir(45000)]);
    await av(c, 'document.fonts.ready.then(()=>1)');
    await dormir(900);

    const m = await av(c, MEDIR);
    console.log(`\n======== ${nome} ${larg}x${alt} ========`);
    if (!m) { console.log('   [FALHOU] seção .mel-clipes não encontrada'); falhas++; continue; }

    const erros = [];
    console.log(`   grade: ${m.colunas} coluna(s)`);
    for (const k of m.cards) {
      console.log(`   ${k.src}`);
      console.log(`      natural ${k.natural} → caixa ${k.caixa} (proporção ${k.proporcaoCaixa}; 9:16 = 0.563)`);
      console.log(`      ${k.fit} · object-position ${k.pos} · --mel-foco "${k.foco}"`);
      console.log(`      corte: ${k.cortadoX}px na horizontal (${k.cortadoXpct}%) · ${k.cortadoY}px na vertical (${k.cortadoYpct}%)`);
      console.log(`      etiqueta: "${k.etiqueta}"`);
      console.log(`      alt: "${k.alt}"`);
      if (!k.carregou) erros.push(`${k.src} NÃO carregou`);
      if (k.fit !== 'cover') erros.push(`${k.src} está com object-fit:${k.fit}`);
      if (!k.foco) erros.push(`${k.src} sem --mel-foco`);
      if (Math.abs(k.proporcaoCaixa - 0.5625) > 0.01) erros.push(`${k.src}: caixa em ${k.proporcaoCaixa}, não 9:16`);
      if (!k.alt || k.alt.length < 30) erros.push(`${k.src}: alt curto demais para ser descritivo`);
      if (PROIBIDO.test(k.alt)) erros.push(`${k.src}: alt ainda diz "a decidir"`);
      if (k.etiqueta !== 'Clipe em produção') erros.push(`${k.src}: etiqueta "${k.etiqueta}"`);
    }

    if (m.cards.length !== 3) erros.push(`${m.cards.length} cards, esperados 3`);
    if (PROIBIDO.test(m.textoDaSecao)) erros.push('a seção ainda mostra texto de placeholder ("a decidir")');
    if (m.videos > 0) erros.push(`${m.videos} elemento(s) de vídeo/play na seção — nada pode fingir ser vídeo`);
    if (m.botoes > 0) erros.push(`${m.botoes} botão(ões) na seção — não pode haver play falso`);
    if (m.semAlt > 0) erros.push(`${m.semAlt} <img> sem alt`);
    if (m.transbordo > 0) erros.push(`${m.transbordo}px de transbordo horizontal`);
    if (consola.length) erros.push(`${consola.length} erro(s) de console: ${consola.join(' | ')}`);

    console.log(`   <video>/<source>/play na seção: ${m.videos}  ·  botões: ${m.botoes}  ·  <img> sem alt: ${m.semAlt}`);
    console.log(`   transbordo horizontal: ${m.transbordo}px  ·  console: ${consola.length} erro(s)`);
    console.log(erros.length ? '\n   [FALHOU] ' + erros.join('\n            ') : '\n   [OK]');
    if (erros.length) falhas++;

    c.eventos.set('Log.entryAdded', (c.eventos.get('Log.entryAdded') || []).filter((f) => f !== ouvir));
  }

  console.log(falhas ? `\n${falhas} tela(s) reprovaram.` : '\ntodas as telas passaram.');
  c.fechar(); proc.kill();
  process.exit(falhas ? 1 : 0);
})().catch((e) => { console.error('FALHOU:', e.message); process.exit(2); });
