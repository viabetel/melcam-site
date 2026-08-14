// QA das duas seções de modelo da /bee — 14/08/2026. Só lê.
//
//   node tools/qa-bee-modelos.js [url] [largura] [altura]
//
// O que ele prova, na ordem em que a validação foi pedida:
//
//   1. SÃO DUAS, uma por Bee, com ids únicos e o #modelos preservado — é o
//      destino do CTA do hero, e trocá-lo quebraria a âncora em silêncio.
//   2. A ALTERNÂNCIA no desktop: palco à esquerda na primeira, à direita na
//      segunda. Medido por coordenada, não por classe.
//   3. A ORDEM NO MOBILE é a mesma nas duas — imagem, conteúdo, destaques.
//      É a checagem que pega o erro clássico de espelhar invertendo o DOM.
//   4. A IDENTIDADE CONTINUA SENDO A DA BEE: fundo papel, texto carvão, CTA em
//      mel. Se alguém colar aqui a pele escura da /polen, isto reprova.
//   5. AS FOTOS são duas, diferentes entre si e diferentes das duas do hero,
//      carregam de verdade, têm width/height (contra layout shift) e alt.
//   6. NADA REGREDIU: hero de pé em y=0, "Sobre nós" fora, sem transbordo.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { CDP, pegarJSON, esperarDevTools } = require('./cdp');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const SAIDA = path.join(__dirname, 'shots-bee-modelos');
const URL = process.argv[2] || 'http://localhost:3030/bee';
const LARG = Number(process.argv[3]) || 1440;
const ALT = Number(process.argv[4]) || 900;
const PORTA = 9418;
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
if (!fs.existsSync(SAIDA)) fs.mkdirSync(SAIDA, { recursive: true });

const PAPEL = 'rgb(251, 247, 238)';
const CARVAO = 'rgb(34, 30, 23)';
const MEL = 'rgb(242, 169, 0)';

const SONDA = `(() => {
  const secs = [].slice.call(document.querySelectorAll('.mel-bee-mod'));
  if (secs.length !== 2) return { erro: secs.length + ' seções .mel-bee-mod (esperado 2)' };

  const r = (e) => { const b = e.getBoundingClientRect(); return {
    x: Math.round(b.left), y: Math.round(b.top + scrollY),
    w: Math.round(b.width), h: Math.round(b.height) }; };

  const bloco = secs.map((s) => {
    const palco = s.querySelector('.mel-bee-mod-palco');
    const info = s.querySelector('.mel-bee-mod-info');
    const img = s.querySelector('.mel-bee-mod-foto');
    const nome = s.querySelector('.mel-bee-mod-nome');
    const txt = s.querySelector('.mel-bee-mod-txt');
    const itens = s.querySelectorAll('.mel-bee-mod-lista li');
    const cta = s.querySelector('.mel-bee-mod-cta');
    const preco = s.querySelector('.mel-bee-mod-preco');
    const cs = getComputedStyle(s);
    const csImg = img ? getComputedStyle(img) : null;
    return {
      id: s.id,
      fundo: cs.backgroundColor,
      nome: nome ? nome.textContent.trim() : null,
      corNome: nome ? getComputedStyle(nome).color : null,
      fundoNome: nome ? getComputedStyle(nome).backgroundColor : null,
      txt: txt ? txt.textContent.trim() : null,
      corTxt: txt ? getComputedStyle(txt).color : null,
      destaques: [].slice.call(itens).map((li) => li.textContent.trim()),
      preco: preco ? preco.textContent.replace(/\\s+/g, ' ').trim() : null,
      cta: cta ? cta.textContent.trim() : null,
      ctaFundo: cta ? getComputedStyle(cta).backgroundColor : null,
      ctaCor: cta ? getComputedStyle(cta).color : null,
      ctaTag: cta ? cta.tagName : null,
      img: img ? {
        src: (img.getAttribute('src') || '').split('/').pop(),
        larguraAttr: img.getAttribute('width'),
        alturaAttr: img.getAttribute('height'),
        alt: (img.getAttribute('alt') || '').slice(0, 60),
        carregou: img.complete && img.naturalWidth > 0,
        natural: img.naturalWidth + 'x' + img.naturalHeight,
        fit: csImg.objectFit,
        pos: csImg.objectPosition,
        loading: img.getAttribute('loading'),
      } : null,
      palco: palco ? r(palco) : null,
      info: info ? r(info) : null,
      // O palco precisa CABER na foto sem cortar: contain garante isso, mas a
      // conta abaixo confirma que a imagem renderizada não estourou a caixa.
      transbordaPalco: (palco && img)
        ? (img.getBoundingClientRect().width > palco.getBoundingClientRect().width + 1 ||
           img.getBoundingClientRect().height > palco.getBoundingClientRect().height + 1)
        : false,
    };
  });

  // As duas fotos do hero, para provar que nenhuma se repete na página.
  const heroImgs = [].slice.call(document.querySelectorAll('.mel-bh-cam'))
    .map((i) => (i.getAttribute('src') || '').split('/').pop());

  const hero = document.querySelector('.mel-bh');
  const sobre = document.querySelector('.mel-sobre');
  const nav = document.querySelector('nav');
  const rn = nav ? nav.getBoundingClientRect() : null;
  const cruzaNav = (e) => { if (!rn) return false; const b = e.getBoundingClientRect();
    return !(b.right <= rn.left || b.left >= rn.right || b.bottom <= rn.top || b.top >= rn.bottom); };

  return {
    bloco,
    heroImgs,
    ids: secs.map((s) => s.id),
    heroExiste: !!hero,
    heroTopo: hero ? Math.round(hero.getBoundingClientRect().top + scrollY) : null,
    heroAltura: hero ? Math.round(hero.getBoundingClientRect().height) : null,
    sobreVisivel: sobre ? getComputedStyle(sobre).display !== 'none' : false,
    destaquesExiste: !!document.querySelector('#destaques'),
    // Nenhum texto ou etiqueta pode cobrir a navegação.
    cobreNav: [].slice.call(document.querySelectorAll('.mel-bee-mod *')).some(cruzaNav),
    overflowH: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    largura: innerWidth,
    // Ids duplicados em qualquer lugar da página.
    idsDuplicados: (() => {
      const vistos = {}, dup = [];
      document.querySelectorAll('[id]').forEach((e) => {
        if (vistos[e.id]) { if (dup.indexOf(e.id) < 0) dup.push(e.id); } else vistos[e.id] = 1;
      });
      return dup;
    })(),
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
  await dormir(2600);

  // Rola até o fim para promover qualquer loading="lazy" antes de medir.
  await c.enviar('Runtime.evaluate', {
    expression: `(async()=>{ scrollTo({top:document.body.scrollHeight,behavior:'instant'});
      await new Promise(r=>setTimeout(r,1200)); scrollTo({top:0,behavior:'instant'});
      await new Promise(r=>setTimeout(r,600)); })()`,
    awaitPromise: true,
  });

  const v = (await c.enviar('Runtime.evaluate', { expression: SONDA, returnByValue: true })).result.value;

  const p = [];
  if (v.erro) p.push(v.erro);
  else {
    const [a, b] = v.bloco;
    const desktop = LARG >= 900;

    if (v.ids[0] !== 'modelos') p.push('a primeira seção perdeu o id "modelos" (âncora do CTA do hero)');
    if (v.ids[0] === v.ids[1]) p.push('as duas seções têm o mesmo id');
    if (v.idsDuplicados.length) p.push('ids duplicados na página: ' + v.idsDuplicados.join(', '));

    // 2 e 3 — alternância e ordem
    if (desktop) {
      if (!(a.palco.x < a.info.x)) p.push('seção 1: imagem não está à esquerda (palco x' + a.palco.x + ', info x' + a.info.x + ')');
      if (!(b.palco.x > b.info.x)) p.push('seção 2: imagem não está à direita (palco x' + b.palco.x + ', info x' + b.info.x + ')');
    } else {
      for (const [i, s] of v.bloco.entries()) {
        if (!(s.palco.y < s.info.y)) p.push('seção ' + (i + 1) + ': no mobile o conteúdo vem antes da imagem');
      }
    }

    // 4 — identidade da Bee
    for (const [i, s] of v.bloco.entries()) {
      const n = 'seção ' + (i + 1) + ': ';
      if (s.fundo !== PAPEL) p.push(n + 'fundo ' + s.fundo + ' (esperado papel ' + PAPEL + ')');
      // 14/08, à noite — o nome era carvão liso e virou PLACA: letra em mel
      // sobre carvão, a pedido. A regra continua sendo "a identidade é a da
      // Bee", só que agora ela pede o par invertido do CTA. Quem mede a placa
      // inteira (contraste, raio, e que ela não vira botão) é
      // tools/qa-bee-cena.js; aqui fica só a cor, que é o que esta checagem
      // sempre olhou.
      if (s.corNome !== MEL) p.push(n + 'nome em ' + s.corNome + ' (esperado mel, na placa)');
      if (s.fundoNome !== CARVAO) p.push(n + 'placa do nome em ' + s.fundoNome + ' (esperado carvão)');
      if (s.ctaFundo !== MEL) p.push(n + 'CTA em ' + s.ctaFundo + ' (esperado mel)');
      if (s.ctaCor !== CARVAO) p.push(n + 'texto do CTA em ' + s.ctaCor + ' (esperado carvão)');
      if (s.ctaTag !== 'BUTTON') p.push(n + 'CTA é <' + s.ctaTag + '>');
      if (!s.nome) p.push(n + 'sem nome');
      if (!s.txt) p.push(n + 'sem descrição');
      if (s.destaques.length < 3) p.push(n + 'só ' + s.destaques.length + ' destaque(s)');
      if (!s.preco || s.preco.indexOf('R$') < 0) p.push(n + 'sem preço');
    }

    // 5 — as fotos
    const [ia, ib] = v.bloco.map((s) => s.img);
    if (!ia || !ib) p.push('faltou <img> em alguma seção');
    else {
      if (ia.src === ib.src) p.push('as duas seções usam a mesma foto: ' + ia.src);
      for (const [i, im] of [ia, ib].entries()) {
        const n = 'seção ' + (i + 1) + ': ';
        if (!im.carregou) p.push(n + 'a foto não carregou (' + im.src + ')');
        if (!im.larguraAttr || !im.alturaAttr) p.push(n + 'a foto não tem width/height — risco de layout shift');
        if (!im.alt || im.alt.length < 12) p.push(n + 'alt ausente ou curto demais');
        if (im.fit !== 'contain') p.push(n + 'object-fit ' + im.fit + ' (esperado contain: recorte não pode ser cortado)');
        if (v.heroImgs.indexOf(im.src) >= 0) p.push(n + 'repete uma foto do hero: ' + im.src);
      }
      if (v.bloco.some((s) => s.transbordaPalco)) p.push('a foto estourou o palco');
    }

    // 6 — nada regrediu
    if (!v.heroExiste) p.push('o hero da Bee sumiu');
    if (v.heroExiste && v.heroTopo !== 0) p.push('o hero não está no topo (y' + v.heroTopo + ')');
    if (v.sobreVisivel) p.push('"Sobre nós" voltou a aparecer na /bee');
    if (!v.destaquesExiste) p.push('a seção Destaques sumiu');
    if (v.cobreNav) p.push('algum elemento das seções cobre a navegação');
    if (v.overflowH) p.push('TRANSBORDA na horizontal');
  }
  if (erros.length) p.push(erros.length + ' erro(s) de console');

  // ------------------------------------------------------------- relatório
  console.log('== ' + LARG + 'x' + ALT + ' ==');
  if (!v.erro) {
    v.bloco.forEach((s, i) => {
      console.log('  seção ' + (i + 1) + '  #' + s.id + '  "' + s.nome + '"');
      console.log('     foto     ' + s.img.src + '  ' + s.img.natural + '  attr ' +
        s.img.larguraAttr + 'x' + s.img.alturaAttr + '  ' + s.img.fit + ' @ ' + s.img.pos +
        '  loading=' + s.img.loading + '  ' + (s.img.carregou ? 'carregou' : 'NÃO CARREGOU'));
      console.log('     posição  palco x' + s.palco.x + ' y' + s.palco.y + ' ' + s.palco.w + 'x' + s.palco.h +
        '   info x' + s.info.x + ' y' + s.info.y + ' ' + s.info.w + 'x' + s.info.h);
      console.log('     conteúdo ' + s.destaques.length + ' destaques · ' + s.preco + ' · "' + s.cta + '"');
      console.log('     pele     fundo ' + s.fundo + ' · nome ' + s.corNome + ' sobre ' + s.fundoNome + ' · CTA ' + s.ctaFundo);
    });
    console.log('  hero      ' + (v.heroExiste ? 'de pé em y' + v.heroTopo + ', ' + v.heroAltura + 'px' : 'AUSENTE') +
      ' · fotos do hero: ' + v.heroImgs.join(', '));
    console.log('  regressão "Sobre nós" visível: ' + (v.sobreVisivel ? 'SIM' : 'não') +
      ' · Destaques: ' + (v.destaquesExiste ? 'de pé' : 'AUSENTE') +
      ' · cobre a nav: ' + (v.cobreNav ? 'SIM' : 'não') +
      ' · transborda: ' + (v.overflowH ? 'SIM' : 'não') +
      ' · ids duplicados: ' + (v.idsDuplicados.length || 'nenhum'));
  }
  console.log(p.length ? '\nX  ' + p.join('\n   ') : '\n[OK]  ' + LARG + 'x' + ALT);

  const shot = await c.enviar('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(path.join(SAIDA, 'bee-modelos-' + LARG + 'x' + ALT + '.png'), Buffer.from(shot.data, 'base64'));
  fs.writeFileSync(path.join(SAIDA, 'qa-bee-modelos-' + LARG + 'x' + ALT + '.json'),
    JSON.stringify({ url: URL, viewport: LARG + 'x' + ALT, ...v, problemas: p, erros: [...new Set(erros)] }, null, 2));

  c.fechar();
  proc.kill();
  process.exit(p.length ? 1 : 0);
})().catch((e) => { console.error('FALHOU:', e.message); process.exit(1); });
