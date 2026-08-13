// QA de paleta no navegador — Fases 4 e 5 da auditoria.
//
// Busca textual não prova cor: o template escreve quase tudo como
// var(--token-…, <legado>), e o legado ali está morto. O que pinta é o estilo
// COMPUTADO. Este script abre cada rota no Edge headless, nos três
// breakpoints, e lê:
//
//   1. a cor computada de todo elemento visível (texto, fundo, borda, outline,
//      fill, stroke, box-shadow, sublinhado, caret) e dos ::before/::after;
//   2. as regras de :hover/:focus/:active/:disabled/::placeholder no CSSOM,
//      que estado nenhum de screenshot alcança sem simular tudo;
//   3. o contraste real de cada texto visível contra o fundo EFETIVO —
//      subindo a árvore até achar fundo opaco, e marcando quem cai sobre
//      imagem ou gradiente para conferência no olho.
//
//   node tools/qa-paleta.js [rotulo] [--rotas /,/polen] [--shots]
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { CDP, pegarJSON, esperarDevTools } = require('./cdp');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const SAIDA = path.join(__dirname, 'shots-paleta');
const BASE = process.env.BASE_URL || 'http://localhost:3030';
const PORTA = 9333 + (Number(process.env.PORTA_OFF) || 40);

const ROTAS = ['/', '/polen', '/bee', '/acessorios', '/sobre', '/sacola', '/404', '/privacidade', '/termos'];
const TELAS = [
  { nome: 'desktop', w: 1440, h: 900 },
  { nome: 'tablet', w: 768, h: 1024 },
  { nome: 'mobile', w: 390, h: 844 },
];

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

// --------------------------------------------------------------- a sonda
// Roda dentro da página. Tudo em uma string: o CDP avalia como expressão.
const SONDA = `(() => {
  const PALETA = {
    '34,30,23':'carvão', '242,169,0':'mel', '251,247,238':'papel',
    '238,106,77':'coral', '94,140,123':'verde-mar',
    '43,37,28':'superfície', '154,144,131':'secundário',
  };
  const rgb = (s) => {
    const m = String(s).match(/rgba?\\(([^)]+)\\)/);
    if (!m) return null;
    const p = m[1].split(/[,\\/]/).map(x => parseFloat(x));
    return { r: p[0]|0, g: p[1]|0, b: p[2]|0, a: p.length > 3 ? p[3] : 1 };
  };
  const chave = (c) => c.r + ',' + c.g + ',' + c.b;
  const hex = (c) => '#' + [c.r,c.g,c.b].map(n => n.toString(16).padStart(2,'0')).join('').toUpperCase();
  const sobre = (f, fundo) => ({
    r: Math.round(f.r*f.a + fundo.r*(1-f.a)),
    g: Math.round(f.g*f.a + fundo.g*(1-f.a)),
    b: Math.round(f.b*f.a + fundo.b*(1-f.a)), a: 1,
  });
  const lum = (c) => {
    const v = [c.r,c.g,c.b].map(x => x/255).map(x => x <= 0.03928 ? x/12.92 : Math.pow((x+0.055)/1.055, 2.4));
    return 0.2126*v[0] + 0.7152*v[1] + 0.0722*v[2];
  };
  const razao = (a, b) => {
    const l1 = lum(a), l2 = lum(b);
    return +(((Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05))).toFixed(2);
  };
  const via = (el) => {
    const p = [];
    for (let n = el; n && n.nodeType === 1 && p.length < 4; n = n.parentElement) {
      let s = n.tagName.toLowerCase();
      const fn = n.getAttribute && n.getAttribute('data-framer-name');
      if (fn) s += '[' + fn + ']';
      else if (n.className && typeof n.className === 'string') {
        const cl = n.className.split(/\\s+/).filter(x => x.startsWith('mel-'))[0]
          || n.className.split(/\\s+/).filter(Boolean)[0];
        if (cl) s += '.' + cl;
      }
      p.unshift(s);
    }
    return p.join(' > ');
  };
  const visivel = (el, cs) => {
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };

  // Fundo efetivo: sobe a árvore compondo alfas até achar opaco.
  // Devolve também se cruzou imagem/gradiente — aí o número teórico não vale
  // sozinho e o caso vai para conferência no olho.
  const fundoDe = (el) => {
    let acc = null, imagem = false;
    for (let n = el; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') imagem = true;
      const c = rgb(cs.backgroundColor);
      if (!c || c.a === 0) continue;
      acc = acc ? sobre(acc, c) : c;
      if (acc.a === 1 || c.a === 1) { acc = acc.a === 1 ? acc : sobre(acc, c); break; }
    }
    if (!acc || acc.a < 1) acc = sobre(acc || {r:0,g:0,b:0,a:0}, {r:34,g:30,b:23,a:1});
    return { cor: acc, imagem };
  };

  const usos = [];     // toda cor computada visível
  const textos = [];   // contraste de texto
  const anota = (el, prop, valor, extra) => {
    const c = rgb(valor);
    if (!c || c.a === 0) return;
    usos.push({
      prop, hex: hex(c), alfa: +c.a.toFixed(3),
      oficial: !!PALETA[chave(c)], papel: PALETA[chave(c)] || '',
      onde: via(el), tag: el.tagName.toLowerCase(), extra: extra || '',
    });
  };

  const PROPS = ['color','backgroundColor','borderTopColor','borderRightColor',
    'borderBottomColor','borderLeftColor','outlineColor','fill','stroke',
    'textDecorationColor','caretColor','columnRuleColor'];

  for (const el of document.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    if (!visivel(el, cs)) continue;
    // sr-only: existe para leitor de tela, recortado em 1x1. Não está na tela,
    // então a cor dele não é achado de auditoria visual.
    const cxu = el.getBoundingClientRect();
    if (cxu.width * cxu.height <= 4) continue;

    const proprio = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    for (const p of PROPS) {
      const v = cs[p];
      if (!v || v === 'none') continue;
      // O filtro que separa cor que PINTA de cor que só existe na cascata.
      // Sem ele o relatório vira 1193 ocorrências de #0000EE — o azul de
      // sublinhado que o user-agent guarda em todo elemento e que nunca
      // aparece, porque text-decoration-line é 'none'.
      if (p.startsWith('border') && parseFloat(cs[p.replace('Color','Width')]) === 0) continue;
      if (p.startsWith('border') && /^(none|hidden)$/.test(cs[p.replace('Color','Style')])) continue;
      if (p === 'outlineColor' && (parseFloat(cs.outlineWidth) === 0 || cs.outlineStyle === 'none')) continue;
      // column-rule só pinta em elemento multicoluna, com estilo e largura.
      // Medido: 1485 declarações no site, zero pintando.
      if (p === 'columnRuleColor'
        && (parseFloat(cs.columnRuleWidth) === 0 || cs.columnRuleStyle === 'none'
          || cs.columnCount === 'auto')) continue;
      if (p === 'textDecorationColor' && (!proprio || cs.textDecorationLine === 'none')) continue;
      if (p === 'caretColor' && !/^(input|textarea)$/.test(el.tagName.toLowerCase())) continue;
      // fill/stroke só pintam em FORMA. No <svg>, no <g> e no <use> o valor é
      // herança ou é sobrescrito pelo símbolo referenciado — medir ali é medir
      // o que não aparece.
      const FORMA = ['path','rect','circle','ellipse','line','polygon','polyline','text'];
      if ((p === 'fill' || p === 'stroke') && !FORMA.includes(el.tagName.toLowerCase())) continue;
      if (p === 'stroke' && parseFloat(cs.strokeWidth) === 0) continue;
      // Cor de texto só interessa em nó que realmente tem texto próprio — e
      // dentro de SVG quem pinta texto é 'fill', não 'color'.
      if (p === 'color' && (!proprio || el.closest('svg'))) continue;
      anota(el, p, v);
    }

    // Placeholder é estado de fato pintado, e some de qualquer varredura
    // normal: só existe no pseudo-elemento.
    if (/^(input|textarea)$/.test(el.tagName.toLowerCase())) {
      const ph = getComputedStyle(el, '::placeholder');
      if (ph && ph.color) anota(el, 'color::placeholder', ph.color, el.getAttribute('placeholder') || '');
    }

    // Sombras e gradientes carregam cor que nenhuma prop simples devolve.
    for (const [p, v] of [['boxShadow', cs.boxShadow], ['filter', cs.filter], ['backgroundImage', cs.backgroundImage]]) {
      if (!v || v === 'none') continue;
      for (const m of String(v).matchAll(/rgba?\\([^)]+\\)/g)) anota(el, p, m[0], String(v).slice(0, 60));
    }

    for (const pseudo of ['::before','::after']) {
      const ps = getComputedStyle(el, pseudo);
      if (!ps.content || ps.content === 'none') continue;
      for (const p of ['color','backgroundColor','borderTopColor','outlineColor']) {
        if (p === 'borderTopColor'
          && (parseFloat(ps.borderTopWidth) === 0 || /^(none|hidden)$/.test(ps.borderTopStyle))) continue;
        if (p === 'outlineColor'
          && (parseFloat(ps.outlineWidth) === 0 || ps.outlineStyle === 'none')) continue;
        // 'color' num pseudo só pinta se o content trouxer texto. content:""
        // é caixa de cor, e a cor dela é o background, não o color.
        if (p === 'color' && !(/^"[^"]/.test(ps.content) || ps.content.includes('counter'))) continue;
        anota(el, p + pseudo, ps[p]);
      }
      if (ps.backgroundImage && ps.backgroundImage !== 'none') {
        for (const m of ps.backgroundImage.matchAll(/rgba?\\([^)]+\\)/g)) anota(el, 'backgroundImage' + pseudo, m[0]);
      }
    }

    // Contraste: só onde há texto próprio não vazio.
    const txt = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').trim();
    // Texto escondido de proposito nao entra: sr-only (1x1 recortado) existe
    // para leitor de tela, e opacidade 0 nao esta na tela. Medir contraste
    // deles enche o relatorio de reprovacao que nao afeta ninguem.
    const cx = el.getBoundingClientRect();
    const minusculo = cx.width * cx.height <= 4;
    if (txt && !minusculo) {
      // Em SVG quem pinta e 'fill', nao 'color'. Ler cs.color num <text>
      // devolve o preto herdado do UA e acusa contraste 1,27:1 num rotulo que
      // na tela esta em papel. Falso positivo caro: leva a "consertar" o que
      // esta certo.
      const fg0 = rgb(el.closest('svg') && cs.fill && cs.fill !== 'none' ? cs.fill : cs.color);
      const { cor: bg, imagem } = fundoDe(el);
      if (fg0) {
        const fg = fg0.a < 1 ? sobre(fg0, bg) : fg0;
        const px = parseFloat(cs.fontSize);
        const peso = parseInt(cs.fontWeight) || 400;
        const grande = px >= 24 || (px >= 18.66 && peso >= 700);
        // A opacidade herdada do ancestral também apaga o texto.
        let op = 1;
        for (let n = el; n && n.nodeType === 1; n = n.parentElement) op *= +getComputedStyle(n).opacity;
        if (op === 0) continue;
        const efetivo = op < 1 ? sobre({ ...fg, a: op }, bg) : fg;
        textos.push({
          texto: txt.slice(0, 48), onde: via(el),
          cor: hex(efetivo), fundo: hex(bg), sobreImagem: imagem,
          px: +px.toFixed(1), peso, grande, opacidade: +op.toFixed(2),
          razao: razao(efetivo, bg), minimo: grande ? 3 : 4.5,
        });
      }
    }
  }

  // ------------------------------------------------ regras de estado (CSSOM)
  const estados = [];
  let regrasLidas = 0;
  const RE_ESTADO = /(:hover|:focus|:focus-visible|:focus-within|:active|:disabled|:checked|:invalid|::placeholder|::selection|\\[disabled|\\[aria-(current|selected|expanded|pressed|invalid)|\\[data-mel-)/i;
  const RE_COR = /(color|background|border|outline|fill|stroke|shadow)/i;
  const varreFolha = (folha) => {
    let regras;
    try { regras = folha.cssRules; } catch { return; }   // folha de outra origem
    if (!regras) return;
    // Indice, e nao for..of: CSSRuleList nao e iteravel neste motor, e o
    // for..of devolvia lista vazia sem erro — a varredura dizia "0 regras de
    // estado" num site que tem 38.
    for (let i = 0; i < regras.length; i++) {
      const r = regras[i];
      if (r.cssRules && r.cssRules.length) { varreFolha(r); continue; }  // @media, @supports
      regrasLidas++;
      if (!r.selectorText || !RE_ESTADO.test(r.selectorText)) continue;
      const decl = (r.style && r.style.cssText) || '';
      if (!RE_COR.test(decl)) continue;
      estados.push({ seletor: r.selectorText.slice(0, 200), decl: decl.slice(0, 300) });
    }
  };
  for (let i = 0; i < document.styleSheets.length; i++) varreFolha(document.styleSheets[i]);

  // ------------------------------------------------------------ foco real
  // A regra de :focus-visible existe no CSSOM, mas só o navegador decide se
  // ela vale para um clique de teclado. Aqui o foco é DADO e a cor é lida do
  // computado — é a diferença entre "a regra está escrita" e "o anel aparece".
  const foco = [];
  const focaveis = [...document.querySelectorAll('a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])')]
    .filter(el => { const cs = getComputedStyle(el); return visivel(el, cs); });
  for (const el of focaveis.slice(0, 24)) {
    try { el.focus({ preventScroll: true }); } catch { continue; }
    const cs = getComputedStyle(el);
    const larg = parseFloat(cs.outlineWidth) || 0;
    const cor = rgb(cs.outlineColor);
    const { cor: bg } = fundoDe(el);
    // el.focus() por script NAO liga :focus-visible em link e botao — o
    // navegador so acende o anel quando o foco veio do teclado. Sem esta
    // marca o relatorio acusava 489 "focos invisiveis" que, medidos com Tab
    // de verdade, estavam todos corretos. Aqui so vale o que casa de fato.
    let casaFV = false;
    try { casaFV = el.matches(':focus-visible'); } catch {}
    foco.push({
      onde: via(el), tag: el.tagName.toLowerCase(),
      largura: larg, estilo: cs.outlineStyle,
      cor: cor ? hex(cor) : '', offset: cs.outlineOffset,
      sombra: cs.boxShadow === 'none' ? '' : cs.boxShadow.slice(0, 70),
      contraste: cor && larg ? razao(cor.a < 1 ? sobre(cor, bg) : cor, bg) : null,
      avaliavel: casaFV,
      visivel: larg > 0 && cs.outlineStyle !== 'none',
    });
  }
  try { document.activeElement && document.activeElement.blur(); } catch {}

  // ---------------------------------------------------------- saúde da rota
  const saude = {
    h1: document.querySelectorAll('h1').length,
    navbar: !!document.querySelector('nav, header'),
    rodape: !!document.querySelector('footer'),
    transbordo: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    larguraDoc: document.documentElement.scrollWidth,
    larguraJanela: document.documentElement.clientWidth,
    imgsQuebradas: [...document.images].filter(i => i.complete && i.naturalWidth === 0)
      .map(i => i.currentSrc.split('/').pop()).slice(0, 10),
    altura: document.documentElement.scrollHeight,
  };

  return { usos, textos, estados, regrasLidas, foco, saude };
})()`;

// -------------------------------------------------------------------- main
(async () => {
  const rotulo = (process.argv[2] && !process.argv[2].startsWith('--')) ? process.argv[2] : 'paleta';
  const iR = process.argv.indexOf('--rotas');
  const rotas = iR >= 0 ? process.argv[iR + 1].split(',') : ROTAS;
  const comShots = process.argv.includes('--shots');

  if (!fs.existsSync(SAIDA)) fs.mkdirSync(SAIDA, { recursive: true });

  const perfil = path.join(__dirname, 'edge-cdp-' + PORTA);
  const proc = spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
    '--no-default-browser-check', '--hide-scrollbars', '--mute-audio',
    '--remote-debugging-port=' + PORTA, '--user-data-dir=' + perfil, 'about:blank',
  ], { stdio: 'ignore' });

  await esperarDevTools(PORTA);
  const alvos = await pegarJSON(PORTA, '/json/list');
  const c = await CDP.conectar(alvos.find((t) => t.type === 'page').webSocketDebuggerUrl);

  let consoleErros = [];
  c.ao('Runtime.exceptionThrown', (p) =>
    consoleErros.push('exceção: ' + (p.exceptionDetails?.exception?.description || p.exceptionDetails?.text || '').slice(0, 160)));
  c.ao('Log.entryAdded', (p) => {
    if (p.entry.level === 'error') consoleErros.push('[' + p.entry.source + '] ' + p.entry.text.slice(0, 160));
  });

  await c.enviar('Page.enable');
  await c.enviar('Runtime.enable');
  await c.enviar('Log.enable');

  const relatorio = { base: BASE, rotulo, quando: new Date().toISOString(), rotas: {} };

  for (const rota of rotas) {
    relatorio.rotas[rota] = {};
    for (const t of TELAS) {
      await c.enviar('Emulation.setDeviceMetricsOverride', {
        width: t.w, height: t.h, deviceScaleFactor: 1, mobile: t.nome === 'mobile',
      });
      consoleErros = [];
      const carregou = new Promise((ok) => c.ao('Page.loadEventFired', ok));
      await c.enviar('Page.navigate', { url: BASE + rota });
      await Promise.race([carregou, dormir(30000)]);
      await dormir(3500);

      // Desce a página inteira antes de medir. Sem isso o scrollytelling da
      // /polen, os clipes e tudo que depende de IntersectionObserver nunca
      // montam, e a auditoria diria "sem defeito" sobre o que nem existia.
      await c.enviar('Runtime.evaluate', {
        expression: `(async()=>{const h=document.documentElement.scrollHeight;`
          + `for(let y=0;y<h;y+=Math.round(innerHeight*0.8)){scrollTo(0,y);`
          + `await new Promise(r=>setTimeout(r,120))}scrollTo(0,0);`
          + `await new Promise(r=>setTimeout(r,400))})()`,
        awaitPromise: true,
      });
      await dormir(1200);

      const r = await c.enviar('Runtime.evaluate', { expression: SONDA, returnByValue: true });
      const v = r.result.value || {};
      v.consoleErros = [...consoleErros];
      relatorio.rotas[rota][t.nome] = v;

      if (comShots) {
        const shot = await c.enviar('Page.captureScreenshot', { format: 'png' });
        const nome = `${rotulo}-${rota.replace(/\W+/g, '') || 'home'}-${t.nome}.png`;
        fs.writeFileSync(path.join(SAIDA, nome), Buffer.from(shot.data, 'base64'));
      }
      process.stdout.write(`. ${rota} ${t.nome}\n`);
    }
  }

  const destino = path.join(SAIDA, `qa-paleta-${rotulo}.json`);
  fs.writeFileSync(destino, JSON.stringify(relatorio, null, 2));
  console.log('gravado: ' + destino);
  c.fechar();
  proc.kill();
  process.exit(0);
})().catch((e) => { console.error('FALHOU:', e.message); process.exit(1); });
