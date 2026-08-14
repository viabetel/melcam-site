// QA do banner rotativo da home — 14/08/2026. Só lê e opera os controles.
//
//   node tools/qa-carrossel.js [url] [largura] [altura]
//   REDUCED=1 node tools/qa-carrossel.js    (contrato de movimento reduzido)
//
// POR QUE ESTE ARQUIVO EXISTE. O motor do carrossel tem setas, dots, teclado,
// swipe, pausa e autoplay — tudo escrito e comentado. Ninguém tinha CONFERIDO
// que ele se comporta assim no navegador. Ler o código não é auditar: um
// listener registrado no elemento errado, um seletor que não casa ou um estado
// ARIA que não acompanha passam despercebidos numa leitura e aparecem aqui.
//
// Cada checagem OPERA o controle de verdade e mede o efeito no transform do
// trilho e nos atributos — nada é inferido do código-fonte.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { CDP, pegarJSON, esperarDevTools } = require('./cdp');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const SAIDA = path.join(__dirname, 'shots-carrossel');
const URL = process.argv[2] || 'http://localhost:3030/';
const LARG = Number(process.argv[3]) || 1440;
const ALT = Number(process.argv[4]) || 900;
const REDUZIDO = !!process.env.REDUCED;
const PORTA = 9420;
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
if (!fs.existsSync(SAIDA)) fs.mkdirSync(SAIDA, { recursive: true });

// O motor usa 6000ms. A espera do teste tem folga para o timer disparar sem
// depender de sincronia perfeita entre o relógio do CDP e o da página.
const INTERVALO = 6000;
const FOLGA = 1800;

// Índice atual lido do TRANSFORM do trilho, que é o estado de verdade:
// translateX(-100% * i). A matriz computada devolve pixels, então divide-se
// pela largura de um slide.
//
// ⚠️ O "+ 0" NO FIM NÃO É ENFEITE. No slide 0 a conta dá -0, e o CDP devolve
// -0 como unserializableValue: o `result.value` chega **undefined**. A primeira
// versão deste arquivo reprovou três checagens por isso, todas envolvendo o
// slide 0, e nenhuma era defeito do carrossel. `-0 + 0` é 0.
const INDICE = `(() => {
  const raiz = document.querySelector('[data-mel="carrossel"]');
  if (!raiz) return null;
  const t = raiz.querySelector('[data-mel-trilho]');
  const s = raiz.querySelector('.mel-slide');
  const m = getComputedStyle(t).transform;
  if (!m || m === 'none') return 0;
  const n = m.slice(m.indexOf('(') + 1, -1).split(',').map(Number);
  const px = n.length === 6 ? n[4] : n[12];
  const larg = s.getBoundingClientRect().width || 1;
  return Math.round(-px / larg) + 0;
})()`;

const ESTRUTURA = `(() => {
  const raiz = document.querySelector('[data-mel="carrossel"]');
  if (!raiz) return { erro: 'sem carrossel' };
  const slides = [].slice.call(raiz.querySelectorAll('.mel-slide'));
  const dots = [].slice.call(raiz.querySelectorAll('[data-mel-ir]'));
  const pausa = raiz.querySelector('[data-mel-pausa]');
  const vivo = raiz.querySelector('[data-mel-vivo]');
  return {
    slides: slides.length,
    dots: dots.length,
    seta_ant: !!raiz.querySelector('[data-mel-ant]'),
    seta_prox: !!raiz.querySelector('[data-mel-prox]'),
    pausa: !!pausa,
    pausaTag: pausa ? pausa.tagName : null,
    pausaPressed: pausa ? pausa.getAttribute('aria-pressed') : null,
    pausaRotulo: pausa ? pausa.getAttribute('aria-label') : null,
    roledescription: raiz.getAttribute('aria-roledescription'),
    rotulo: raiz.getAttribute('aria-label'),
    vivo: !!vivo,
    vivoLive: vivo ? vivo.getAttribute('aria-live') : null,
    // Só o slide visível pode estar fora do aria-hidden.
    visiveisParaLeitor: slides.filter((s) => !s.hasAttribute('aria-hidden')).length,
    comAriaCurrent: dots.filter((d) => d.getAttribute('aria-current') === 'true').length,
    overflowH: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
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
  if (REDUZIDO) {
    await c.enviar('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  }
  const carregou = new Promise((ok) => c.ao('Page.loadEventFired', ok));
  await c.enviar('Page.navigate', { url: URL });
  await Promise.race([carregou, dormir(30000)]);
  await dormir(2600);

  const av = async (expr, esperar) =>
    (await c.enviar('Runtime.evaluate', { expression: expr, awaitPromise: !!esperar, returnByValue: true })).result.value;

  const est = await av(ESTRUTURA);
  const p = [];
  const passos = [];
  const anota = (nome, ok, detalhe) => { passos.push({ nome, ok, detalhe }); if (!ok) p.push(nome + ': ' + detalhe); };

  if (est.erro) { p.push(est.erro); }
  else {
    // ---- estrutura ----
    anota('tem mais de um slide', est.slides >= 2, est.slides + ' slide(s)');
    anota('um dot por slide', est.dots === est.slides, est.dots + ' dots para ' + est.slides + ' slides');
    anota('as duas setas', est.seta_ant && est.seta_prox,
      'ant ' + est.seta_ant + ' prox ' + est.seta_prox);
    anota('botão de pausa', est.pausa && est.pausaTag === 'BUTTON', 'pausa ' + est.pausa + ' <' + est.pausaTag + '>');
    anota('aria-roledescription', est.roledescription === 'carrossel', String(est.roledescription));
    anota('região viva', est.vivo && est.vivoLive === 'polite', 'vivo ' + est.vivo + ' live ' + est.vivoLive);
    anota('só o slide atual exposto ao leitor', est.visiveisParaLeitor === 1,
      est.visiveisParaLeitor + ' slides sem aria-hidden');
    anota('um dot marcado', est.comAriaCurrent === 1, est.comAriaCurrent + ' com aria-current');
    anota('sem transbordo horizontal', !est.overflowH, 'transborda');

    // O carrossel precisa estar na tela para hover/foco fazerem sentido.
    await av(`(async()=>{ const r=document.querySelector('[data-mel="carrossel"]').getBoundingClientRect();
      scrollTo({top:r.top+scrollY-120,behavior:'instant'}); await new Promise(r=>setTimeout(r,600)); })()`, true);

    // ---- seta seguinte ----
    const i0 = await av(INDICE);
    await av(`document.querySelector('[data-mel-prox]').click()`);
    await dormir(900);
    const i1 = await av(INDICE);
    anota('a seta seguinte avança', i1 === (i0 + 1) % est.slides, 'de ' + i0 + ' para ' + i1);

    // ---- seta anterior ----
    await av(`document.querySelector('[data-mel-ant]').click()`);
    await dormir(900);
    const i2 = await av(INDICE);
    anota('a seta anterior volta', i2 === i0, 'de ' + i1 + ' para ' + i2);

    // ---- dot ----
    const alvo = est.slides - 1;
    await av(`document.querySelectorAll('[data-mel-ir]')[${alvo}].click()`);
    await dormir(900);
    const i3 = await av(INDICE);
    const dotOk = await av(`document.querySelectorAll('[data-mel-ir]')[${alvo}].getAttribute('aria-current') === 'true'`);
    anota('o dot leva ao slide dele', i3 === alvo, 'pedi ' + alvo + ', foi para ' + i3);
    anota('aria-current acompanha o dot', dotOk === true, 'aria-current não acompanhou');

    // ---- teclado ----
    await av(`document.querySelector('[data-mel-prox]').focus()`);
    const i4a = await av(INDICE);
    await av(`document.querySelector('[data-mel="carrossel"]').dispatchEvent(
      new KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true,cancelable:true}))`);
    await dormir(800);
    const i4 = await av(INDICE);
    anota('ArrowLeft volta um', i4 === (i4a - 1 + est.slides) % est.slides, 'de ' + i4a + ' para ' + i4);
    await av(`document.querySelector('[data-mel="carrossel"]').dispatchEvent(
      new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}))`);
    await dormir(800);
    const i5 = await av(INDICE);
    anota('ArrowRight avança um', i5 === i4a, 'de ' + i4 + ' para ' + i5);

    // ---- foco pausa a rotação ----
    // O foco continua no botão desde o passo anterior; se o timer respeitasse
    // só o hover, ele avançaria aqui.
    const f0 = await av(INDICE);
    await dormir(INTERVALO + FOLGA);
    const f1 = await av(INDICE);
    anota('o foco dentro do carrossel pausa', f1 === f0, 'avançou de ' + f0 + ' para ' + f1 + ' com foco dentro');

    // ---- autoplay ----
    // Tira o foco e o ponteiro de dentro para o timer poder correr.
    await av(`document.activeElement.blur();
      document.querySelector('[data-mel="carrossel"]').dispatchEvent(new MouseEvent('mouseleave',{bubbles:false}))`);
    const a0 = await av(INDICE);
    await dormir(INTERVALO + FOLGA);
    const a1 = await av(INDICE);
    if (REDUZIDO) {
      anota('sob reduced-motion NÃO gira sozinho', a1 === a0, 'girou de ' + a0 + ' para ' + a1);
    } else {
      anota('gira sozinho depois de ' + INTERVALO + 'ms', a1 !== a0, 'ficou parado em ' + a0);
      anota('gira um slide por vez', a1 === (a0 + 1) % est.slides, 'de ' + a0 + ' para ' + a1);
    }

    // ---- pausa ----
    if (est.pausa && !REDUZIDO) {
      await av(`document.querySelector('[data-mel-pausa]').click()`);
      const pressed = await av(`document.querySelector('[data-mel-pausa]').getAttribute('aria-pressed')`);
      const rotulo = await av(`document.querySelector('[data-mel-pausa]').getAttribute('aria-label')`);
      anota('o botão de pausa marca aria-pressed', pressed === 'true', 'aria-pressed ' + pressed);
      anota('o rótulo do botão muda', /retomar/i.test(rotulo || ''), 'rótulo "' + rotulo + '"');
      const q0 = await av(INDICE);
      await dormir(INTERVALO + FOLGA);
      const q1 = await av(INDICE);
      anota('pausado, não gira', q1 === q0, 'girou de ' + q0 + ' para ' + q1 + ' mesmo pausado');

      // e retoma
      await av(`document.querySelector('[data-mel-pausa]').click();
        document.activeElement.blur()`);
      const r0 = await av(INDICE);
      await dormir(INTERVALO + FOLGA);
      const r1 = await av(INDICE);
      anota('retomado, volta a girar', r1 !== r0, 'continuou parado em ' + r0);
    }
  }
  if (erros.length) p.push(erros.length + ' erro(s) de console');

  const rotulo = LARG + 'x' + ALT + (REDUZIDO ? '-reduzido' : '');
  console.log('== carrossel · ' + rotulo + ' ==');
  if (!est.erro) {
    console.log('  ' + est.slides + ' slides · ' + est.dots + ' dots · setas ' +
      (est.seta_ant && est.seta_prox ? 'sim' : 'NÃO') + ' · pausa ' + (est.pausa ? '<' + est.pausaTag + '>' : 'NÃO') +
      ' · ' + est.roledescription + ' · live ' + est.vivoLive);
    passos.forEach((s) => console.log('  ' + (s.ok ? 'ok  ' : 'X   ') + s.nome + (s.ok ? '' : '   <<< ' + s.detalhe)));
  }
  console.log(p.length ? '\nX  ' + p.join('\n   ') : '\n[OK]  carrossel · ' + rotulo);

  const shot = await c.enviar('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(SAIDA, 'carrossel-' + rotulo + '.png'), Buffer.from(shot.data, 'base64'));
  fs.writeFileSync(path.join(SAIDA, 'qa-carrossel-' + rotulo + '.json'),
    JSON.stringify({ url: URL, viewport: rotulo, estrutura: est, passos, problemas: p, erros: [...new Set(erros)] }, null, 2));

  c.fechar();
  proc.kill();
  process.exit(p.length ? 1 : 0);
})().catch((e) => { console.error('FALHOU:', e.message); process.exit(1); });
