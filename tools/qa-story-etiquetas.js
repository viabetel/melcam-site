// QA dos tópicos do scrollytelling da /polen — 14/08/2026. Só lê.
//
//   node tools/qa-story-etiquetas.js [url] [largura] [altura]
//
// Duas perguntas, e as duas são verificáveis:
//
//   1. TODO TÓPICO TEM DESCRIÇÃO? Título sem linha de apoio era o estado de
//      13/08 em cinco dos nove capítulos.
//   2. A ETIQUETA NÃO É BOTÃO? Não basta olhar: um elemento parece e funciona
//      como botão por caminhos independentes — a tag, o cursor, a ordem de
//      tabulação, o foco, o hover, o papel ARIA. Cada um é conferido, e o
//      hover é conferido do jeito mais direto possível: lendo o estilo
//      computado antes e depois de um mouseover de verdade.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { CDP, pegarJSON, esperarDevTools } = require('./cdp');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const SAIDA = path.join(__dirname, 'shots-story-etiquetas');
const URL = process.argv[2] || 'http://localhost:3030/polen';
const LARG = Number(process.argv[3]) || 1440;
const ALT = Number(process.argv[4]) || 900;
const PORTA = 9416;
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
if (!fs.existsSync(SAIDA)) fs.mkdirSync(SAIDA, { recursive: true });

// Teto de tamanho: a etiqueta é rótulo, não CTA. O botão real da página
// (.mel-bt, "Escolha sua cor") mede 44px de altura por ser alvo de toque; a
// etiqueta não é alvo de nada e tem de ficar visivelmente abaixo disso.
const TETO_ALTURA = 30;

const SONDA = `(() => {
  const s = document.querySelector('[data-mel="polen-story"]');
  if (!s) return { erro: 'sem secao' };

  const passos = [].slice.call(s.querySelectorAll('[data-mel-story-step]'));
  const topicos = passos.map((p, i) => {
    const tit = p.querySelector('.mel-story-tit');
    const txt = p.querySelector('.mel-story-txt');
    return {
      i: i + 1,
      tit: tit ? tit.textContent.trim() : null,
      txt: txt ? txt.textContent.trim() : null,
      frases: txt ? txt.textContent.trim().split(/[.!?]+\\s/).filter(Boolean).length : 0,
    };
  });

  const etiqs = [].slice.call(s.querySelectorAll('.mel-polen-story-etiq'));
  // Tudo que o navegador considera foco/controle, para provar que a etiqueta
  // não está no conjunto.
  const focaveis = [].slice.call(document.querySelectorAll(
    'a[href], button, input, select, textarea, [tabindex], [role="button"], [role="link"], [contenteditable]'
  ));

  const cs0 = etiqs.length ? getComputedStyle(etiqs[0]) : null;
  const r0 = etiqs.length ? etiqs[0].getBoundingClientRect() : null;

  // A cena ativa é a câmera. A etiqueta não pode encostar nela.
  const cenaAtiva = s.querySelector('[data-mel-story-ativa][data-mel-story-scene]')
                 || s.querySelector('[data-mel-story-scene]');
  const rc = cenaAtiva ? cenaAtiva.getBoundingClientRect() : null;
  const cruza = (a, b) => !!a && !!b && !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);

  // A navbar do topo.
  const nav = document.querySelector('.mel-nav-links') || document.querySelector('nav');
  const rn = nav ? nav.getBoundingClientRect() : null;

  return {
    topicos,
    semDescricao: topicos.filter((t) => !t.txt).map((t) => t.i),
    etiquetas: etiqs.length,
    // ---- o inventário do "não é botão" ----
    tags: [...new Set(etiqs.map((e) => e.tagName))],
    comTabindex: etiqs.filter((e) => e.hasAttribute('tabindex')).length,
    comRole: etiqs.filter((e) => e.hasAttribute('role')).length,
    comHref: etiqs.filter((e) => e.hasAttribute('href')).length,
    comOnclick: etiqs.filter((e) => e.hasAttribute('onclick') || typeof e.onclick === 'function').length,
    comAria: etiqs.filter((e) => e.getAttributeNames().some((a) => a.indexOf('aria-') === 0)).length,
    dentroDeControle: etiqs.filter((e) => e.closest('a,button,[role="button"],label')).length,
    naListaDeFocaveis: etiqs.filter((e) => focaveis.indexOf(e) >= 0).length,
    cursor: cs0 ? cs0.cursor : null,
    // transitionProperty vem "all" por ser o valor inicial do CSS; o que diz se
    // há transição de fato é a duração.
    transicao: cs0 ? (cs0.transitionProperty + ' em ' + cs0.transitionDuration) : null,
    animaAlgo: cs0 ? cs0.transitionDuration !== '0s' : false,
    sombra: cs0 ? cs0.boxShadow : null,
    // Sombra externa é o que dá cara de elevação/botão. inset não conta.
    sombraExterna: cs0 ? (cs0.boxShadow !== 'none' && cs0.boxShadow.indexOf('inset') < 0) : false,
    cor: cs0 ? cs0.color : null,
    fundo: cs0 ? cs0.backgroundColor : null,
    raio: cs0 ? cs0.borderRadius : null,
    fonte: cs0 ? (cs0.fontSize + ' / ' + cs0.fontWeight) : null,
    altura: r0 ? Math.round(r0.height) : null,
    largura: r0 ? Math.round(r0.width) : null,
    // ---- não cobre nada ----
    cruzaCamera: etiqs.some((e) => cruza(e.getBoundingClientRect(), rc)),
    cruzaNav: etiqs.some((e) => cruza(e.getBoundingClientRect(), rn)),
    cruzaTexto: etiqs.some((e) => {
      const p = e.closest('[data-mel-story-step]');
      const t = p && p.querySelector('.mel-story-tit');
      return cruza(e.getBoundingClientRect(), t && t.getBoundingClientRect());
    }),
    // ---- cabe na coluna, inclusive estreita ----
    transbordaColuna: etiqs.some((e) => {
      const p = e.closest('[data-mel-story-step]');
      if (!p) return false;
      const re = e.getBoundingClientRect(), rp = p.getBoundingClientRect();
      return re.right > rp.right + 1 || re.left < rp.left - 1;
    }),
    quebrada: etiqs.some((e) => e.getClientRects().length > 1),
    overflowH: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  };
})()`;

// Hover e foco de verdade: dispara os eventos e compara o estilo computado.
// CONTRASTE DA ETIQUETA CONTRA O PIXEL, não contra o CSS.
//
// O tools/qa-paleta.js resolve a cor de fundo pela cascata e devolve o carvão,
// porque a luz do scrollytelling é pintada por cima e não está na cascata de
// ninguém. E há um segundo fator que ele também não vê: o capítulo INATIVO tem
// opacity < 1, o que mistura o texto com o backdrop daquele ponto. Os dois
// juntos foram o que derrubou o mel de 4,72 para 4,21 sem nenhum QA acusar.
//
// Aqui a medida é: opacidade real do passo, backdrop lido do pixel ao lado da
// etiqueta, e a composição feita à mão.
const SONDA_CONTRASTE = (base64) => `(async () => {
  const img = new Image();
  img.src = 'data:image/png;base64,${base64}';
  await img.decode();
  const cv = document.createElement('canvas');
  cv.width = img.width; cv.height = img.height;
  const cx = cv.getContext('2d');
  cx.drawImage(img, 0, 0);

  const lin = (v) => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); };
  const lum = (c) => .2126 * lin(c[0]) + .7152 * lin(c[1]) + .0722 * lin(c[2]);
  const raz = (a, b) => { const l = [lum(a), lum(b)].sort((p, q) => q - p); return (l[0] + .05) / (l[1] + .05); };
  const MEL = [242, 169, 0];

  const fora = [];
  document.querySelectorAll('.mel-polen-story-etiq').forEach((e) => {
    const r = e.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight || r.width < 4) return;
    const passo = e.closest('[data-mel-story-step]');
    const op = parseFloat(getComputedStyle(passo).opacity) || 1;

    // Backdrop: faixa de 6px logo à DIREITA da etiqueta, na mesma altura —
    // fora da pílula e do contorno, e ainda dentro da coluna do tópico.
    const x = Math.round(r.right + 8), y = Math.round(r.top + r.height / 2) - 3;
    if (x < 0 || x + 6 > cv.width || y < 0 || y + 6 > cv.height) return;
    const d = cx.getImageData(x, y, 6, 6).data;
    let R = 0, G = 0, B = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) { R += d[i]; G += d[i+1]; B += d[i+2]; n++; }
    const bd = [R / n, G / n, B / n];

    // O opacity mistura o texto com o backdrop; o fundo efetivo é o backdrop.
    const texto = MEL.map((v, i) => v * op + bd[i] * (1 - op));
    fora.push({
      num: e.textContent.trim(),
      opacidade: op,
      backdrop: bd.map(Math.round),
      razao: +raz(texto, bd).toFixed(2),
    });
  });
  return fora;
})()`;

const SONDA_INTERACAO = `(async () => {
  const e = document.querySelector('.mel-polen-story-etiq');
  if (!e) return { erro: 'sem etiqueta' };
  const foto = () => {
    const c = getComputedStyle(e);
    return [c.color, c.backgroundColor, c.boxShadow, c.transform, c.opacity, c.textDecorationLine].join('|');
  };
  const antes = foto();

  const r = e.getBoundingClientRect();
  ['mouseover', 'mouseenter', 'mousemove'].forEach((t) => e.dispatchEvent(
    new MouseEvent(t, { bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 })));
  await new Promise((r) => setTimeout(r, 400));
  const noHover = foto();

  // Tentar focar um span sem tabindex não deve mover o foco.
  const focoAntes = document.activeElement && document.activeElement.tagName;
  try { e.focus(); } catch (x) {}
  const pegouFoco = document.activeElement === e;
  const noFoco = foto();

  // E um clique não pode disparar navegação nem mudar nada.
  const urlAntes = location.href;
  e.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  await new Promise((r) => setTimeout(r, 300));

  return {
    mudouComHover: antes !== noHover,
    mudouComFoco: antes !== noFoco,
    pegouFoco,
    focoAntes,
    navegou: location.href !== urlAntes,
    antes, noHover,
  };
})()`;

(async () => {
  const proc = spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
    '--no-default-browser-check', '--hide-scrollbars', '--mute-audio',
    '--remote-debugging-port=' + PORTA,
    '--user-data-dir=' + path.join(__dirname, 'edge-cdp-' + PORTA), 'about:blank',
  ], { stdio: 'ignore' });

  await esperarDevTools(PORTA);
  const alvos = await pegarJSON(PORTA, '/json/list');
  const c = await CDP.conectar(alvos.find((t) => t.type === 'page').webSocketDebuggerUrl);

  const erros = [];
  c.ao('Runtime.exceptionThrown', (p) =>
    erros.push('exceção: ' + (p.exceptionDetails?.exception?.description || p.exceptionDetails?.text || '').slice(0, 160)));
  c.ao('Log.entryAdded', (p) => { if (p.entry.level === 'error') erros.push('[' + p.entry.source + '] ' + p.entry.text.slice(0, 160)); });

  await c.enviar('Page.enable');
  await c.enviar('Runtime.enable');
  await c.enviar('Log.enable');
  await c.enviar('Emulation.setDeviceMetricsOverride', {
    width: LARG, height: ALT, deviceScaleFactor: 1, mobile: LARG < 810,
  });

  const carregou = new Promise((ok) => c.ao('Page.loadEventFired', ok));
  await c.enviar('Page.navigate', { url: URL });
  await Promise.race([carregou, dormir(30000)]);
  await dormir(2200);

  // Leva o capítulo 2 ao centro: com um tópico ativo a cena está pintada, que é
  // a condição em que faz sentido perguntar se a etiqueta cobre a câmera.
  await c.enviar('Runtime.evaluate', {
    expression: `(async()=>{
      const p=document.querySelectorAll('[data-mel-story-step]')[1];
      const r=p.getBoundingClientRect();
      scrollBy({top:(r.top+r.bottom)/2 - innerHeight/2, behavior:'instant'});
      await new Promise(r=>setTimeout(r,1100));
    })()`, awaitPromise: true,
  });

  const v = (await c.enviar('Runtime.evaluate', { expression: SONDA, returnByValue: true })).result.value;
  const ix = (await c.enviar('Runtime.evaluate', { expression: SONDA_INTERACAO, awaitPromise: true, returnByValue: true })).result.value;

  const shot = await c.enviar('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(SAIDA, 'etiquetas-' + LARG + 'x' + ALT + '.png'), Buffer.from(shot.data, 'base64'));

  // Contraste medido varrendo a seção, e NÃO capítulo a capítulo.
  //
  // Centralizar um capítulo mede só o ATIVO, que tem opacity 1 e é o caso
  // fácil: no desktop cada passo tem 68vh, então quando um está no centro os
  // vizinhos estão fora da tela. O caso difícil é o inativo, que só aparece
  // junto com outro em posições intermediárias. Varrer a seção em passos finos
  // pega os dois, e ainda cobre a luz do fundo em toda a sua faixa.
  const contrastes = [];
  const AMOSTRAS = 24;
  for (let i = 0; i <= AMOSTRAS; i++) {
    await c.enviar('Runtime.evaluate', {
      expression: `(async()=>{
        const s=document.querySelector('[data-mel="polen-story"]');
        const r=s.getBoundingClientRect();
        scrollTo({top: r.top+scrollY - innerHeight/2 + r.height*${i / AMOSTRAS}, behavior:'instant'});
        await new Promise(r=>setTimeout(r,650));
      })()`, awaitPromise: true,
    });
    const s = await c.enviar('Page.captureScreenshot', { format: 'png' });
    const m = await c.enviar('Runtime.evaluate', {
      expression: SONDA_CONTRASTE(s.data), awaitPromise: true, returnByValue: true,
    });
    (m.result.value || []).forEach((x) => contrastes.push({ amostra: i, ...x }));
  }
  const pior = contrastes.reduce((a, b) => (!a || b.razao < a.razao ? b : a), null);
  const piorInativo = contrastes.filter((x) => x.opacidade < 1)
    .reduce((a, b) => (!a || b.razao < a.razao ? b : a), null);

  // ------------------------------------------------------------- veredito
  const p = [];
  if (v.erro) p.push(v.erro);
  if (v.semDescricao.length) p.push('tópicos sem descrição: ' + v.semDescricao.join(', '));
  if (v.etiquetas !== 9) p.push(v.etiquetas + ' etiquetas (esperado 9)');
  if (v.topicos.some((t) => t.txt && (t.frases < 1 || t.frases > 2))) {
    p.push('descrição fora de 1–2 frases: ' + v.topicos.filter((t) => t.txt && (t.frases < 1 || t.frases > 2)).map((t) => t.i).join(', '));
  }

  if (v.tags.join() !== 'SPAN') p.push('etiqueta não é span: ' + v.tags.join(', '));
  if (v.comTabindex) p.push(v.comTabindex + ' com tabindex');
  if (v.comRole) p.push(v.comRole + ' com role');
  if (v.comHref) p.push(v.comHref + ' com href');
  if (v.comOnclick) p.push(v.comOnclick + ' com onclick');
  if (v.comAria) p.push(v.comAria + ' com atributo aria-');
  if (v.dentroDeControle) p.push(v.dentroDeControle + ' dentro de a/button/label');
  if (v.naListaDeFocaveis) p.push(v.naListaDeFocaveis + ' na lista de focáveis');
  if (v.cursor === 'pointer') p.push('cursor pointer');
  if (v.sombraExterna) p.push('sombra externa (cara de botão): ' + v.sombra);
  if (v.altura > TETO_ALTURA) p.push('etiqueta com ' + v.altura + 'px de altura (teto ' + TETO_ALTURA + ')');

  if (ix.erro) p.push(ix.erro);
  else {
    if (ix.mudouComHover) p.push('muda no hover: ' + ix.antes + '  ->  ' + ix.noHover);
    if (ix.pegouFoco) p.push('recebeu foco');
    if (ix.mudouComFoco) p.push('muda no foco');
    if (ix.navegou) p.push('o clique navegou');
  }

  if (v.cruzaCamera) p.push('etiqueta sobre a câmera');
  if (v.cruzaNav) p.push('etiqueta sobre a navegação');
  if (v.cruzaTexto) p.push('etiqueta sobre o título');
  if (v.transbordaColuna) p.push('etiqueta fora da coluna do tópico');
  if (v.quebrada) p.push('etiqueta quebrada em duas linhas');
  if (v.overflowH) p.push('TRANSBORDA na horizontal');
  if (!pior) p.push('não consegui medir contraste de nenhuma etiqueta');
  else if (pior.razao < 4.5) {
    p.push('contraste da etiqueta em ' + pior.razao + ':1 na amostra ' + pior.amostra +
      ' (opacidade ' + pior.opacidade + ', backdrop rgb(' + pior.backdrop.join(',') + '))');
  }
  // O capítulo inativo é o caso que já reprovou uma vez. Se a varredura não
  // encontrar nenhum, o QA não mediu o que precisava — e isso não é "passou".
  if (LARG >= 1025 && !piorInativo) p.push('nenhuma etiqueta de capítulo inativo foi medida');
  if (erros.length) p.push(erros.length + ' erro(s) de console');

  console.log('== ' + LARG + 'x' + ALT + ' ==');
  console.log('  tópicos com título e descrição: ' +
    v.topicos.filter((t) => t.tit && t.txt).length + ' de ' + v.topicos.length);
  v.topicos.forEach((t) => console.log('    ' + String(t.i).padStart(2, '0') + '  ' +
    (t.txt ? t.frases + ' frase(s)' : 'SEM DESCRIÇÃO') + '  · ' + (t.tit || '').slice(0, 52)));
  console.log('  etiquetas  ' + v.etiquetas + ' · <' + v.tags.join('/').toLowerCase() + '> · ' +
    v.largura + 'x' + v.altura + 'px · raio ' + v.raio + ' · ' + v.fonte);
  console.log('             cor ' + v.cor + ' sobre ' + v.fundo);
  console.log('             sombra ' + (v.sombraExterna ? 'EXTERNA' : 'só inset') + ' · cursor ' + v.cursor +
    ' · transition ' + v.transicao);
  console.log('  não-botão  tabindex ' + v.comTabindex + ' · role ' + v.comRole + ' · href ' + v.comHref +
    ' · onclick ' + v.comOnclick + ' · aria- ' + v.comAria + ' · dentro de controle ' + v.dentroDeControle +
    ' · na lista de focáveis ' + v.naListaDeFocaveis);
  console.log('             hover muda: ' + (ix.mudouComHover ? 'SIM' : 'não') +
    ' · pega foco: ' + (ix.pegouFoco ? 'SIM' : 'não') +
    ' · clique navega: ' + (ix.navegou ? 'SIM' : 'não'));
  console.log('  não cobre  câmera ' + (v.cruzaCamera ? 'SIM' : 'não') + ' · navegação ' + (v.cruzaNav ? 'SIM' : 'não') +
    ' · título ' + (v.cruzaTexto ? 'SIM' : 'não') + ' · fora da coluna ' + (v.transbordaColuna ? 'SIM' : 'não'));
  if (pior) {
    const op = [...new Set(contrastes.map((x) => x.opacidade))].sort();
    console.log('  contraste  pior ' + pior.razao + ':1 (mín 4,5) · backdrop rgb(' + pior.backdrop.join(',') +
      ') · opacidades vistas ' + op.join(' e ') + ' · ' + contrastes.length + ' medições em pixel');
    if (piorInativo) console.log('             pior capítulo INATIVO: ' + piorInativo.razao +
      ':1 com opacidade ' + piorInativo.opacidade + ' sobre rgb(' + piorInativo.backdrop.join(',') + ')');
  }
  console.log(p.length ? '\nX  ' + p.join('\n   ') : '\n[OK]  ' + LARG + 'x' + ALT);

  fs.writeFileSync(path.join(SAIDA, 'qa-story-etiquetas-' + LARG + 'x' + ALT + '.json'),
    JSON.stringify({ url: URL, viewport: LARG + 'x' + ALT, ...v, interacao: ix, problemas: p, erros: [...new Set(erros)] }, null, 2));

  c.fechar();
  proc.kill();
  process.exit(p.length ? 1 : 0);
})().catch((e) => { console.error('FALHOU:', e.message); process.exit(1); });
