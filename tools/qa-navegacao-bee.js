// Navbar, menu e sacola na /bee — o item 7 do handoff de 13/08, que nunca foi
// reconferido depois que a página ganhou um hero de PAPEL.
//
//   node tools/qa-navegacao-bee.js
//
// Por que existe: até 13/08 toda a /bee era carvão, e navbar, menu e sacola
// foram desenhados contra carvão. O hero novo é claro e sangra até y=0, então
// três coisas passaram a poder falhar sem que nada quebre no console:
//   1. a barra sticky ganhou pele clara escopada — precisa continuar legível;
//   2. o abridor do menu é um ícone sobre a faixa da navbar;
//   3. o painel do menu abre POR CIMA do hero claro.
// Nada disso aparece em medida de layout, e nenhuma delas quebra o console.
//
// Três armadilhas que esta sonda já pisou, anotadas para quem for mexer:
//
// 1. O ABRIDOR NÃO É <button>. É `div[role="button"]` com
//    `aria-label="Abrir menu"` e `data-framer-name="Meniu"` (a grafia é do
//    template, não é erro de digitação aqui). Procurar por `nav button` devolve
//    só a lupa e conclui, errado, que a página não tem menu.
// 2. `.click()` NÃO abre. O Framer escuta pointer events; o clique tem de ser
//    despachado por coordenada com Input.dispatchMouseEvent.
// 3. O PAINEL NÃO É UMA CAPA DE TELA CHEIA. É uma gaveta de ~215px logo abaixo
//    da navbar. Filtrar candidatos por "altura > 50% da tela" descarta o painel
//    que está aberto na frente. O sinal confiável é `aria-expanded` no abridor.
// 4. EXISTEM DOIS ABRIDORES NO DOM, um por variante do template. Abaixo de
//    810px o PRIMEIRO colapsa para 0x0 e quem aparece é o SEGUNDO (24x24).
//    `querySelector` devolve o primeiro, então clicar nele no mobile clica em
//    (0,0) e o painel não abre — o que se lê, errado, como "no mobile não há
//    como sair da /bee". Medido em 7 larguras e 6 rotas: o abridor visível
//    existe sempre. Escolher pelo que TEM CAIXA é obrigatório.
//
// E o contraste: a barra sticky da Bee tem fundo papel a 86%. Pular fundo
// translúcido e usar o do ancestral dá 1:1 (carvão sobre carvão) e acusa uma
// falha que não existe na tela. Aqui as camadas são COMPOSTAS até o primeiro
// fundo opaco, que é o que o olho vê.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { CDP, pegarJSON, esperarDevTools } = require('./cdp');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = process.env.BASE_URL || 'http://localhost:3030';
const PORTA = 9333 + (Number(process.env.PORTA_OFF) || 91);
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

const TELAS = [
  { nome: 'desktop', w: 1440, h: 900 },
  { nome: 'mobile', w: 390, h: 844 },
];

const ABRIDOR = '[data-framer-name="Meniu"], nav [aria-label="Abrir menu"], nav [role="button"][aria-expanded]';

const AJUDA = `
  function lum(c){ var a=c.map(function(v){ v/=255; return v<=0.03928? v/12.92 : Math.pow((v+0.055)/1.055,2.4); });
    return 0.2126*a[0]+0.7152*a[1]+0.0722*a[2]; }
  function canal(s){ var m=String(s).match(/[\\d.]+/g); return m? m.slice(0,3).map(Number) : null; }
  function alfa(s){ var m=String(s).match(/[\\d.]+/g); return m && m.length>3 ? Number(m[3]) : 1; }
  function sobre(frente, af, atras){   /* composicao alfa, canal a canal */
    return frente.map(function(v,i){ return v*af + atras[i]*(1-af); });
  }
  /* Sobe a arvore compondo as camadas translucidas ate a primeira opaca.
     E o que o olho ve: a barra da Bee e papel a 86% sobre carvao. */
  function fundoReal(el){
    var pilha=[], e=el;
    while(e && e!==document.documentElement){
      var s=getComputedStyle(e), c=canal(s.backgroundColor), a=alfa(s.backgroundColor);
      if(c && a>0){ pilha.push([c,a]); if(a>=0.999) break; }
      e=e.parentElement;
    }
    var base=[255,255,255];
    for(var i=pilha.length-1;i>=0;i--) base = sobre(pilha[i][0], pilha[i][1], base);
    return base;
  }
  function razao(el){
    var s=getComputedStyle(el), f=canal(s.color), b=fundoReal(el);
    if(!f||!b) return null;
    var af=alfa(s.color); if(af<1) f=sobre(f,af,b);
    var l1=lum(f), l2=lum(b);
    return Math.round(((Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05))*100)/100;
  }
  function visivel(el){
    if(!el) return false;
    var b=el.getBoundingClientRect(), s=getComputedStyle(el);
    return b.width>0 && b.height>0 && s.visibility!=='hidden' && Number(s.opacity)>0.05;
  }
  function hex(c){ return '#'+c.map(function(v){ return ('0'+Math.round(v).toString(16)).slice(-2); }).join('').toUpperCase(); }
  function rotulo(e){ return (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0,20); }
  /* O abridor visível, nunca o primeiro do DOM: são dois, um por variante. */
  function abridorVisivel(){
    return [].slice.call(document.querySelectorAll(${JSON.stringify(ABRIDOR)}))
      .filter(function(e){ var b=e.getBoundingClientRect(); return b.width>0 && b.height>0; })[0] || null;
  }
  /* Ícone não tem texto: o contraste dele é o das barrinhas (background dos
     filhos) contra o fundo composto, não o do color herdado. */
  function contrasteIcone(el){
    var b = [].slice.call(el.querySelectorAll('*')).filter(function(e){
      var s=getComputedStyle(e), r=e.getBoundingClientRect();
      return r.height>0 && r.height<=6 && alfa(s.backgroundColor)>0.5;
    })[0];
    if(!b) return null;
    var f=canal(getComputedStyle(b).backgroundColor), atras=fundoReal(el);
    var l1=lum(f), l2=lum(atras);
    return Math.round(((Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05))*100)/100;
  }
`;

const SONDA_BASE = `(function(){
  ${AJUDA}
  var nav = document.querySelector('nav');
  var faixa = nav && [].slice.call(nav.querySelectorAll('*')).filter(function(e){
    var b=e.getBoundingClientRect(); return b.height>30 && b.width>innerWidth*0.8;
  })[0];
  var barra = document.querySelector('.mel-barra');
  var abridor = abridorVisivel();
  var clicaveis = [].slice.call(document.querySelectorAll(
    'nav a, nav button, nav [role="button"], .mel-barra a, .mel-barra button')).filter(visivel);

  function cx(el){ if(!el) return null; var b=el.getBoundingClientRect();
    return { x:Math.round(b.x), y:Math.round(b.y), w:Math.round(b.width), h:Math.round(b.height) }; }

  return {
    navCaixa: cx(nav),
    faixaCaixa: cx(faixa),
    faixaFundo: faixa ? getComputedStyle(faixa).backgroundColor : null,
    abridoresNoDom: document.querySelectorAll(${JSON.stringify(ABRIDOR)}).length,
    abridor: abridor ? { rotulo: rotulo(abridor), tag: abridor.tagName, papel: abridor.getAttribute('role'),
                         expandido: abridor.getAttribute('aria-expanded'), foco: abridor.tabIndex,
                         caixa: cx(abridor), contrasteIcone: contrasteIcone(abridor) } : null,
    barra: barra ? { caixa: cx(barra), fundoDeclarado: getComputedStyle(barra).backgroundColor,
                     fundoComposto: hex(fundoReal(barra)),
                     posicao: getComputedStyle(barra).position } : null,
    /* Controle sem texto é ícone: medir a propriedade color dele devolve
       número sem significado (a lupa do template tem color com alfa 0). Nesses
       casos vale o contraste do desenho, e o tipo diz qual dos dois foi medido.
       Sem crase neste comentário: ele mora dentro de template literal. */
    itens: clicaveis.map(function(e){
      var temTexto = (e.textContent || '').trim().length > 0;
      return { txt: rotulo(e), tipo: temTexto ? 'texto' : 'ícone',
               r: temTexto ? razao(e) : contrasteIcone(e),
               h: Math.round(e.getBoundingClientRect().height),
               onde: e.closest('.mel-barra') ? 'barra' : 'navbar' };
    }).filter(function(x){ return x.txt; }),
  };
})()`;

const SONDA_PAINEL = `(function(){
  ${AJUDA}
  var ab = abridorVisivel();
  var expandido = ab && ab.getAttribute('aria-expanded') === 'true';
  /* O painel e uma gaveta, nao uma capa: procura o bloco visivel mais alto que
     apareceu abaixo da navbar, com pelo menos 3 links dentro. */
  var p = [].slice.call(document.querySelectorAll('body *')).filter(function(e){
    if(!visivel(e)) return false;
    var b=e.getBoundingClientRect();
    return b.height>=90 && b.width>=120 && b.y<innerHeight*0.5
      && e.querySelectorAll('a').length>=3 && !e.querySelector('nav');
  }).sort(function(a,b){ return a.getBoundingClientRect().height - b.getBoundingClientRect().height; })[0];
  if(!expandido || !p) return { abriu:false, expandido: !!expandido };
  var b = p.getBoundingClientRect();
  var itens = [].slice.call(p.querySelectorAll('a')).filter(visivel).map(function(e){
    var cb=e.getBoundingClientRect();
    return { txt: rotulo(e), href: e.getAttribute('href'), r: razao(e), h: Math.round(cb.height) };
  });
  /* O painel cobre o hero claro? Se for translucido, o mel do hero atravessa. */
  var s = getComputedStyle(p);
  return {
    abriu: true, expandido: true,
    caixa: { x:Math.round(b.x), y:Math.round(b.y), w:Math.round(b.width), h:Math.round(b.height) },
    fundoDeclarado: s.backgroundColor, fundoComposto: hex(fundoReal(p)),
    opaco: alfa(s.backgroundColor) >= 0.99,
    piorContraste: itens.length ? Math.min.apply(null, itens.map(function(i){ return i.r||99; })) : null,
    alvosPequenos: itens.filter(function(i){ return i.h < 44; }).length,
    itens: itens,
  };
})()`;

(async () => {
  const perfil = path.join(process.env.TEMP || '.', 'edge-qa-nav-bee');
  const edge = spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-port=' + PORTA, '--user-data-dir=' + perfil, 'about:blank',
  ], { stdio: 'ignore' });

  await esperarDevTools(PORTA);
  const alvos = await pegarJSON(PORTA, '/json/list');
  const c = await CDP.conectar(alvos.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await c.enviar('Page.enable');
  await c.enviar('Runtime.enable');
  await c.enviar('Log.enable');

  const destino = path.join(__dirname, 'shots-bee');
  fs.mkdirSync(destino, { recursive: true });
  const saida = { quando: new Date().toISOString(), base: BASE, telas: {} };

  const av = async (expr) => {
    const r = await c.enviar('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    return r.exceptionDetails ? { erro: JSON.stringify(r.exceptionDetails).slice(0, 240) } : r.result.value;
  };
  const clicar = async (pt) => {
    for (const type of ['mousePressed', 'mouseReleased']) {
      await c.enviar('Input.dispatchMouseEvent', { type, x: pt.x, y: pt.y, button: 'left', clickCount: 1 });
    }
  };

  for (const t of TELAS) {
    const problemas = [];
    c.ao('Log.entryAdded', (e) => { if (e.entry && e.entry.level === 'error') problemas.push(e.entry.text.slice(0, 160)); });
    c.ao('Runtime.exceptionThrown', () => problemas.push('exceção JS'));

    await c.enviar('Emulation.setDeviceMetricsOverride', { width: t.w, height: t.h, deviceScaleFactor: 1, mobile: t.w < 810 });
    const carregou = new Promise((ok) => c.ao('Page.loadEventFired', ok));
    await c.enviar('Page.navigate', { url: BASE + '/bee' });
    await Promise.race([carregou, dormir(30000)]);
    await dormir(2600);

    const base = await av(SONDA_BASE);

    let menu = { tentou: false };
    if (base.abridor && base.abridor.caixa) {
      const k = base.abridor.caixa;
      await clicar({ x: k.x + Math.round(k.w / 2), y: k.y + Math.round(k.h / 2) });
      await dormir(900);
      menu = await av(SONDA_PAINEL);
      menu.tentou = true;

      const shot = await c.enviar('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(destino, 'nav-menu-' + t.nome + '.png'), Buffer.from(shot.data, 'base64'));

      // fechar: Escape primeiro; se o template não escutar, o próprio abridor
      await c.enviar('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
      await c.enviar('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
      await dormir(700);
      menu.fechaComEsc = (await av(SONDA_PAINEL)).abriu === false;
      if (!menu.fechaComEsc) {
        await clicar({ x: k.x + Math.round(k.w / 2), y: k.y + Math.round(k.h / 2) });
        await dormir(700);
        menu.fechaNoBotao = (await av(SONDA_PAINEL)).abriu === false;
      }
    }

    saida.telas[t.nome] = { base, menu, console: problemas };
  }

  await c.enviar('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  const cs = new Promise((ok) => c.ao('Page.loadEventFired', ok));
  await c.enviar('Page.navigate', { url: BASE + '/sacola' });
  await Promise.race([cs, dormir(30000)]);
  await dormir(2200);
  saida.sacola = await av(`(function(){
    ${AJUDA}
    var h1 = document.querySelector('h1');
    return {
      h1: h1 ? h1.textContent.trim().slice(0,60) : null,
      h1s: document.querySelectorAll('h1').length,
      contrasteH1: h1 ? razao(h1) : null,
      transbordo: document.documentElement.scrollWidth > innerWidth + 1,
      imgsQuebradas: [].slice.call(document.images).filter(function(i){ return i.complete && i.naturalWidth===0; }).length,
      abridorMenu: !!document.querySelector(${JSON.stringify(ABRIDOR)}),
    };
  })()`);
  const shotS = await c.enviar('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(destino, 'sacola-desktop.png'), Buffer.from(shotS.data, 'base64'));

  fs.writeFileSync(path.join(destino, 'qa-navegacao.json'), JSON.stringify(saida, null, 2), 'utf8');
  console.log(JSON.stringify(saida, null, 1));
  console.error('capturas e JSON em ' + destino);
  try { edge.kill(); } catch (e) {}
  process.exit(0);
})();
