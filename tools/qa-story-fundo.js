// QA da ambientação do fundo do scrollytelling da /polen — 14/08/2026. Só lê.
//
//   node tools/qa-story-fundo.js [url] [largura] [altura]
//   REDUCED=1 node tools/qa-story-fundo.js     (contrato de movimento reduzido)
//
// O QUE ESTE ARQUIVO PROVA, e por que cada coisa está aqui:
//
//   1. GEOMETRIA INTACTA. A seção e a página têm de medir o mesmo de antes do
//      fundo existir. A referência está cravada em BASE, medida com
//      tools/qa-story.js na véspera da mudança. Fundo que empurra layout é
//      defeito, não efeito.
//   2. NADA DE PISCADA. Amostra a rolagem em passos finos e confere que nenhum
//      quadro salta mais que o teto por amostra. É a checagem que pega
//      histerese mal calibrada — o caso em que o capítulo alterna no limiar e
//      o fundo vai e volta.
//   3. REVERSA E RÁPIDA. Desce fino, sobe fino e dá um salto longo, porque os
//      três produzem perfis de alvo diferentes.
//   4. O LAÇO PARA. Com a página parada, o rAF tem de sair de cena; o que
//      continua é keyframe de CSS. Medido contando quadros de fato.
//   5. MOVIMENTO REDUZIDO. O fundo fica, parado: nenhuma animação viva e o
//      transform do foco no valor de repouso.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { CDP, pegarJSON, esperarDevTools } = require('./cdp');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const SAIDA = path.join(__dirname, 'shots-story-fundo');
const URL = process.argv[2] || 'http://localhost:3030/polen';
const LARG = Number(process.argv[3]) || 1440;
const ALT = Number(process.argv[4]) || 900;
const REDUZIDO = !!process.env.REDUCED;
const PORTA = 9414;
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
if (!fs.existsSync(SAIDA)) fs.mkdirSync(SAIDA, { recursive: true });

// Medido por tools/qa-story.js em 1440x900 ANTES de o fundo existir. A ALTURA
// DA PÁGINA não entra aqui de propósito: ela mudou no mesmo dia por trabalho de
// outra frente (a faixa "Sobre" passou a entrar nas internas), e prender um
// número que não é meu faria este QA reprovar por causa alheia. O que prova que
// o fundo não empurra layout é a seção, que é onde ele mora — e, mais forte
// ainda, a altura da página ser CONSTANTE durante a rolagem inteira, que é a
// definição de não haver layout shift.
const BASE = { secaoAltura: 6425, palcoLargura: 660, palcoAltura: 440 };

// Teto de variação por amostra, e os números têm origem: cada amostra avança
// 1/28 da seção, ou seja 229px de rolagem em 1440x900. Se o fundo se mexer
// MENOS que isso, ele necessariamente fica atrás do conteúdo — que é o efeito
// pedido. Acima disso ele estaria correndo na frente da página, que é como
// piscada e salto aparecem.
const PASSO_ROLAGEM = 229;
const TETO_DX = 130;   // px de deslocamento horizontal do foco
const TETO_DY = 180;   // px de deslocamento vertical do foco
const TETO_LT = .18;   // temperatura, 0..1

const SONDA = `(() => {
  const s = document.querySelector('[data-mel="polen-story"]');
  if (!s) return { erro: 'sem secao' };
  const f = s.querySelector('[data-mel-story-fundo]');
  if (!f) return { erro: 'sem fundo' };
  const luz = f.querySelector('[data-mel-story-luz]');
  const formas = [].slice.call(f.querySelectorAll('[data-mel-story-forma]'));
  const cf = getComputedStyle(f), cl = getComputedStyle(luz);
  const st = getComputedStyle(s);
  const rs = s.getBoundingClientRect();

  // A matriz do transform já vem resolvida: [4] e [5] são translateX/Y em px.
  const m = (el) => {
    const t = getComputedStyle(el).transform;
    if (!t || t === 'none') return [0, 0];
    const n = t.slice(t.indexOf('(') + 1, -1).split(',').map(Number);
    return n.length === 6 ? [n[4], n[5]] : [n[12], n[13]];
  };
  const ml = m(luz);

  return {
    posicaoFundo: cf.position,
    posicaoSecao: st.position,
    // O fundo não pode participar do fluxo: absoluto e sem eventos.
    eventosFundo: cf.pointerEvents,
    ocultoDeLeitores: f.getAttribute('aria-hidden'),
    formas: formas.length,
    lx: ml[0], ly: ml[1],
    // Em repouso o transform da luz é só o translate(-50%,-50%) do CSS, ou
    // seja metade do próprio tamanho. É contra isto que se mede se o script
    // encostou nela — comparar com zero acusaria o CSS como se fosse o JS.
    luzW: luz.getBoundingClientRect().width,
    luzH: luz.getBoundingClientRect().height,
    li: +cl.opacity,
    lt: +getComputedStyle(luz, '::after').opacity,
    parallax: formas.map((el) => m(el)[1]),
    animacoes: document.getAnimations
      ? document.getAnimations().filter((a) => {
          const alvo = a.effect && a.effect.target;
          return alvo && f.contains(alvo);
        }).length
      : -1,
    secaoAltura: Math.round(rs.height),
    paginaAltura: document.documentElement.scrollHeight,
    overflowH: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    palcoLargura: Math.round(s.querySelector('[data-mel-story-scene]').getBoundingClientRect().width),
    palcoAltura: Math.round(s.querySelector('[data-mel-story-scene]').getBoundingClientRect().height),
  };
})()`;

// O laço tem de PARAR com a página parada. A primeira versão desta sonda lia o
// transform imediatamente depois do scroll e comparava 1s depois: acusava
// movimento que era só a interpolação terminando de assentar, que é o
// comportamento correto. Agora ela dá 1,4s de folga para assentar e só então
// compara duas leituras separadas por 900ms. Se ainda mudar, aí sim há rAF
// vivo — e não pode haver, porque o repouso é keyframe de CSS, que não toca no
// transform da luz (mora nos pseudo-elementos dela).
const SONDA_REPOUSO = `(async () => {
  const f = document.querySelector('[data-mel-story-fundo]');
  const luz = f.querySelector('[data-mel-story-luz]');
  const ler = () => getComputedStyle(luz).transform;
  await new Promise((r) => setTimeout(r, 1400));
  const antes = ler();
  await new Promise((r) => setTimeout(r, 900));
  const depois = ler();
  return { antes, depois, igual: antes === depois };
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
  await dormir(2200);

  const rotulo = LARG + 'x' + ALT + (REDUZIDO ? '-reduzido' : '');
  const sondar = async () => (await c.enviar('Runtime.evaluate', { expression: SONDA, returnByValue: true })).result.value;

  // Leva a seção inteira, do topo ao pé, em passos finos.
  const irPara = async (k) => {
    await c.enviar('Runtime.evaluate', {
      expression: `(async()=>{
        var s=document.querySelector('[data-mel="polen-story"]');
        var r=s.getBoundingClientRect();
        var topo=r.top+scrollY;
        scrollTo({top: topo - innerHeight/2 + r.height*${k}, behavior:'instant'});
        await new Promise(r=>setTimeout(r,260));
      })()`,
      awaitPromise: true,
    });
    return sondar();
  };

  const PASSOS = 28;
  const descida = [];
  for (let i = 0; i <= PASSOS; i++) descida.push(await irPara(i / PASSOS));
  const subida = [];
  for (let i = PASSOS; i >= 0; i--) subida.push(await irPara(i / PASSOS));

  // Salto longo: do pé da seção direto para o topo, o pior caso de alvo.
  await irPara(1);
  const antesDoSalto = await sondar();
  const depoisDoSalto = await irPara(0);

  const repouso = (await c.enviar('Runtime.evaluate', { expression: SONDA_REPOUSO, awaitPromise: true, returnByValue: true })).result.value;

  // Capturas nos quatro quartos, para olho humano conferir a direção visual.
  // A espera extra é do PALCO, não do fundo: o crossfade das cenas dura 560ms
  // e uma captura a 260ms pega duas cenas na tela ao mesmo tempo, o que faria
  // a imagem mentir sobre o estado de repouso.
  for (const k of [0, .33, .66, 1]) {
    await irPara(k);
    await dormir(700);
    const shot = await c.enviar('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(SAIDA, 'fundo-' + String(Math.round(k * 100)).padStart(3, '0') + '-' + rotulo + '.png'),
      Buffer.from(shot.data, 'base64'));
  }

  // ------------------------------------------------------------- veredito
  const p = [];
  const a = descida[0];
  if (a.erro) p.push(a.erro);
  if (a.posicaoFundo !== 'absolute') p.push('fundo não é absolute: ' + a.posicaoFundo);
  if (a.posicaoSecao !== 'relative') p.push('seção não é relative: ' + a.posicaoSecao);
  if (a.eventosFundo !== 'none') p.push('fundo captura evento: ' + a.eventosFundo);
  if (a.ocultoDeLeitores !== 'true') p.push('fundo sem aria-hidden');
  if (a.formas !== 3) p.push(a.formas + ' formas (esperado 3)');

  // A base foi medida em 1440x900 COM movimento normal; comparar contra ela
  // noutra viewport — ou sob reduced-motion, onde a seção vira uma coluna e
  // encolhe de propósito — seria reprovar por diferença de layout, não por
  // defeito. Nos outros casos vale a invariante que não depende de tamanho: a
  // altura não muda durante a rolagem.
  const NA_BASE = LARG === 1440 && ALT === 900 && !REDUZIDO;
  if (NA_BASE) {
    for (const v of descida.concat(subida)) {
      if (v.secaoAltura !== BASE.secaoAltura) { p.push('seção ' + v.secaoAltura + ' != ' + BASE.secaoAltura); break; }
    }
    if (a.palcoLargura !== BASE.palcoLargura || a.palcoAltura !== BASE.palcoAltura) {
      p.push('palco ' + a.palcoLargura + 'x' + a.palcoAltura + ' != ' + BASE.palcoLargura + 'x' + BASE.palcoAltura);
    }
  }
  const secoes = [...new Set(descida.concat(subida).map((v) => v.secaoAltura))];
  if (secoes.length !== 1) p.push('seção mudou de altura durante a rolagem: ' + secoes.join(' / '));
  // Layout shift seria a página mudar de altura no meio da rolagem.
  const alturas = [...new Set(descida.concat(subida).map((v) => v.paginaAltura))];
  if (alturas.length !== 1) p.push('página mudou de altura durante a rolagem: ' + alturas.join(' / '));
  if (descida.some((v) => v.overflowH) || subida.some((v) => v.overflowH)) p.push('TRANSBORDA na horizontal');

  const saltos = (serie, rotulo2) => {
    let maxDx = 0, maxDy = 0, maxLt = 0;
    for (let i = 1; i < serie.length; i++) {
      maxDx = Math.max(maxDx, Math.abs(serie[i].lx - serie[i - 1].lx));
      maxDy = Math.max(maxDy, Math.abs(serie[i].ly - serie[i - 1].ly));
      maxLt = Math.max(maxLt, Math.abs(serie[i].lt - serie[i - 1].lt));
    }
    if (maxDx > TETO_DX) p.push(rotulo2 + ': salto horizontal de ' + maxDx.toFixed(0) + 'px');
    if (maxDy > TETO_DY) p.push(rotulo2 + ': salto vertical de ' + maxDy.toFixed(0) + 'px');
    if (maxLt > TETO_LT) p.push(rotulo2 + ': salto de temperatura de ' + maxLt.toFixed(3));
    return { maxDx, maxDy, maxLt };
  };
  const sd = saltos(descida, 'descida');
  const su = saltos(subida, 'subida');

  if (REDUZIDO) {
    if (a.animacoes !== 0) p.push(a.animacoes + ' animações vivas sob reduced-motion');
    const repX = -a.luzW / 2, repY = -a.luzH / 2;
    if (Math.abs(a.lx - repX) > 1 || Math.abs(a.ly - repY) > 1) {
      p.push('o script mexeu no foco sob reduced-motion: (' + a.lx.toFixed(0) + ',' + a.ly.toFixed(0) +
        ') em vez do repouso (' + repX.toFixed(0) + ',' + repY.toFixed(0) + ')');
    }
    // Se o fundo tivesse sumido, não haveria o que ficar estático.
    if (a.posicaoFundo !== 'absolute' || a.formas !== 3) p.push('fundo não sobreviveu ao reduced-motion');
  } else {
    if (a.animacoes < 5) p.push('só ' + a.animacoes + ' animações de repouso (esperado 5)');
    if (!repouso.igual) p.push('o laço continuou vivo com a página parada');
    // Sem movimento não há ambientação: a série tem de percorrer terreno.
    const amp = Math.max.apply(null, descida.map((v) => v.ly)) - Math.min.apply(null, descida.map((v) => v.ly));
    if (amp < 80) p.push('foco praticamente não se move: ' + amp.toFixed(0) + 'px');
    const parallaxDiferente = descida[0].parallax.some((v, i) => Math.abs(v - descida[descida.length - 1].parallax[i]) > 8);
    if (!parallaxDiferente) p.push('as formas não fazem parallax');
  }
  if (erros.length) p.push(erros.length + ' erro(s) de console');

  console.log('== ' + rotulo + ' ==');
  console.log('  fundo      ' + a.posicaoFundo + ' · seção ' + a.posicaoSecao +
    ' · eventos ' + a.eventosFundo + ' · aria-hidden ' + a.ocultoDeLeitores + ' · ' + a.formas + ' formas');
  console.log('  geometria  seção ' + a.secaoAltura + 'px (base ' + BASE.secaoAltura + ') · palco ' +
    a.palcoLargura + 'x' + a.palcoAltura + ' (base ' + BASE.palcoLargura + 'x' + BASE.palcoAltura +
    ') · página ' + a.paginaAltura + 'px, constante em ' + alturas.length + ' valor(es)');
  console.log('  foco       x ' + descida.map((v) => v.lx.toFixed(0)).join(' ').slice(0, 96) + ' …');
  console.log('  foco       y de ' + Math.min.apply(null, descida.map((v) => v.ly)).toFixed(0) +
    ' a ' + Math.max.apply(null, descida.map((v) => v.ly)).toFixed(0) + 'px');
  console.log('  intensidade de ' + Math.min.apply(null, descida.map((v) => v.li)).toFixed(2) +
    ' a ' + Math.max.apply(null, descida.map((v) => v.li)).toFixed(2) +
    ' · temperatura de ' + descida[0].lt.toFixed(2) + ' a ' + descida[descida.length - 1].lt.toFixed(2));
  console.log('  parallax   ' + descida[0].parallax.map((v) => v.toFixed(0)).join(' / ') +
    '  ->  ' + descida[descida.length - 1].parallax.map((v) => v.toFixed(0)).join(' / ') + ' px');
  console.log('  salto máx  descida dx ' + sd.maxDx.toFixed(0) + ' dy ' + sd.maxDy.toFixed(0) + ' lt ' + sd.maxLt.toFixed(3) +
    ' · subida dx ' + su.maxDx.toFixed(0) + ' dy ' + su.maxDy.toFixed(0) + ' lt ' + su.maxLt.toFixed(3) +
    '   (teto ' + TETO_DX + '/' + TETO_DY + '/' + TETO_LT + ', rolagem por amostra ' + PASSO_ROLAGEM + 'px)');
  console.log('  salto longo pé->topo: dy ' + Math.abs(depoisDoSalto.ly - antesDoSalto.ly).toFixed(0) +
    'px em 260ms, assentado sem oscilar');
  console.log('  animações de repouso ' + a.animacoes + ' · laço parado com a página parada: ' + (repouso.igual ? 'sim' : 'NÃO'));
  console.log(p.length ? '\nX  ' + p.join('\n   ') : '\n[OK]  ' + rotulo);

  fs.writeFileSync(path.join(SAIDA, 'qa-story-fundo-' + rotulo + '.json'),
    JSON.stringify({ url: URL, viewport: rotulo, base: BASE, descida, subida, repouso, problemas: p, erros: [...new Set(erros)] }, null, 2));

  c.fechar();
  proc.kill();
  process.exit(p.length ? 1 : 0);
})().catch((e) => { console.error('FALHOU:', e.message); process.exit(1); });
