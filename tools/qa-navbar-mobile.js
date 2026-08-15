// A NAVBAR NO MOBILE, medida — /bee em foco, com as outras rotas de controle.
//
//   node tools/qa-navbar-mobile.js
//   ROTAS=/bee,/polen node tools/qa-navbar-mobile.js
//
// Larguras: 320, 375, 390, 430, 768. As cinco do pedido de 13/08/2026.
//
// O que se mede aqui é a lista de sintomas que "navbar bugada no mobile"
// costuma esconder, cada um com um número em vez de uma impressão:
//
//   1. sobreposição  — a nav cobre o conteúdo da seção seguinte?
//   2. clique morto  — quem recebe o clique no centro de cada controle?
//   3. stacking      — algum ancestral cria contexto novo (transform, filter,
//                      opacity<1, will-change, contain) e prende a nav?
//   4. sticky solto  — a nav continua no lugar depois de rolar?
//   5. transbordo    — a página rola de lado?
//   6. alvo de toque — algum controle abaixo de 44px?
//   7. menu atrás    — o painel abre na frente do conteúdo?
//   8. contraste     — o desenho do ícone contra o fundo que de fato pinta.
//
// Por que 3 importa mais do que parece: um ancestral com transform vira
// containing block de position:fixed. A nav "fixa" passa a rolar junto com a
// página e nenhum z-index conserta — foi por isso que o pedido pediu para achar
// a causa real antes de empilhar z-index.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { CDP, pegarJSON, esperarDevTools } = require('./cdp');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = process.env.BASE_URL || 'http://localhost:3030';
const PORTA = 9333 + (Number(process.env.PORTA_OFF) || 94);
const LARGURAS = (process.env.LARGURAS || '320,375,390,430,768').split(',').map(Number);
const ROTAS = (process.env.ROTAS || '/bee,/polen,/').split(',');
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

const AJUDA = `
  function lum(c){ var a=c.map(function(v){ v/=255; return v<=0.03928? v/12.92 : Math.pow((v+0.055)/1.055,2.4); });
    return 0.2126*a[0]+0.7152*a[1]+0.0722*a[2]; }
  function canal(s){ var m=String(s).match(/[\\d.]+/g); return m? m.slice(0,3).map(Number) : null; }
  function alfa(s){ var m=String(s).match(/[\\d.]+/g); return m && m.length>3 ? Number(m[3]) : 1; }
  function sobre(f,af,b){ return f.map(function(v,i){ return v*af + b[i]*(1-af); }); }
  function fundoReal(el){
    var pilha=[], e=el;
    while(e && e!==document.documentElement){
      var s=getComputedStyle(e), c=canal(s.backgroundColor), a=alfa(s.backgroundColor);
      if(c && a>0){ pilha.push([c,a]); if(a>=0.999) break; }
      e=e.parentElement;
    }
    var base=[255,255,255];
    for(var i=pilha.length-1;i>=0;i--) base=sobre(pilha[i][0],pilha[i][1],base);
    return base;
  }
  function contraste(cor, atras){
    var l1=lum(cor), l2=lum(atras);
    return Math.round(((Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05))*100)/100;
  }
  function visivel(el){
    if(!el) return false;
    var b=el.getBoundingClientRect(), s=getComputedStyle(el);
    return b.width>0 && b.height>0 && s.visibility!=='hidden' && Number(s.opacity)>0.05;
  }
  function rotulo(e){ return (e.getAttribute('aria-label')||e.textContent||'').trim().slice(0,22) || e.tagName; }
  function caixa(e){ var b=e.getBoundingClientRect();
    return { x:Math.round(b.x), y:Math.round(b.y), w:Math.round(b.width), h:Math.round(b.height) }; }
  /* A faixa que o olho chama de navbar: o ancestral posicionado do botão. */
  function faixaDaNav(){
    var b = [].slice.call(document.querySelectorAll('[data-framer-name="Meniu"]'))
      .filter(function(e){ return e.getBoundingClientRect().width>0; })[0];
    if(!b) return null;
    var e=b;
    while(e && e!==document.body){
      var p=getComputedStyle(e).position;
      if(p==='fixed'||p==='sticky') return e;
      e=e.parentElement;
    }
    return document.querySelector('nav');
  }
  /* Ancestrais que criam containing block para position:fixed. É a causa que
     nenhum z-index resolve, então ela é procurada por nome. */
  function prisoes(el){
    var out=[], e=el && el.parentElement;
    while(e && e!==document.documentElement){
      var s=getComputedStyle(e), m=[];
      if(s.transform && s.transform!=='none') m.push('transform');
      if(s.perspective && s.perspective!=='none') m.push('perspective');
      if(s.filter && s.filter!=='none') m.push('filter');
      if(s.backdropFilter && s.backdropFilter!=='none') m.push('backdrop-filter');
      if(s.willChange && /transform|filter|perspective/.test(s.willChange)) m.push('will-change:'+s.willChange);
      if(s.contain && /paint|layout|strict|content/.test(s.contain)) m.push('contain:'+s.contain);
      if(Number(s.opacity)<1) m.push('opacity:'+s.opacity);
      if(m.length) out.push({ cls:(e.className||'').toString().split(' ')[0]||e.tagName, motivos:m });
      e=e.parentElement;
    }
    return out;
  }
`;

const SONDA = `(function(){
  ${AJUDA}
  var faixa = faixaDaNav();
  var nav = document.querySelector('nav');
  /* Controle inerte não é alvo de toque e não entra na conta: a lupa do
     template é um botão invisível (color com alfa 0) que não faz nada, e desde
     13/08 leva aria-hidden, tabindex -1 e pointer-events none. Cobrar 44px de
     um controle que ninguém alcança seria inventar defeito — o defeito dela,
     que era receber foco de teclado, já foi corrigido. */
  var controles = [].slice.call(document.querySelectorAll(
    'nav a, nav button, nav [role="button"], [data-framer-name="Meniu"], [data-mel-perfil]'
  )).filter(visivel).filter(function(e){
    return e.getAttribute('aria-hidden') !== 'true'
      && getComputedStyle(e).pointerEvents !== 'none'
      && e.tabIndex >= 0;
  });

  var res = {
    faixa: faixa ? { caixa: caixa(faixa), pos: getComputedStyle(faixa).position,
                     z: getComputedStyle(faixa).zIndex, cls: (faixa.className||'').toString().split(' ')[0] } : null,
    navCaixa: nav ? caixa(nav) : null,
    /* prisões de position:fixed acima da faixa */
    prisoes: faixa ? prisoes(faixa) : [],
    transbordo: document.documentElement.scrollWidth - innerWidth,
    larguraDoc: document.documentElement.scrollWidth,
    controles: controles.map(function(e){
      var c = caixa(e);
      var alvo = document.elementFromPoint(c.x + c.w/2, c.y + c.h/2);
      var proprio = !!(alvo && (alvo===e || e.contains(alvo) || (alvo.contains && alvo.contains(e))));
      return { rot: rotulo(e), caixa: c, recebeClique: proprio,
               quemRecebe: proprio ? null : (alvo ? (alvo.tagName+'.'+(alvo.className||'').toString().split(' ')[0]) : 'nada'),
               alvoDeToque: Math.min(c.w, c.h) };
    }),
  };

  /* SOBREPOSIÇÃO, e a distinção que custou uma medição errada:
     a navbar é position:fixed, então o FUNDO do primeiro bloco passa por baixo
     dela em toda página cujo conteúdo começa em y=0. Isso é o normal de uma
     barra fixa e não é defeito. Defeito é CONTEÚDO coberto: texto, imagem ou
     controle cujo centro cai atrás da faixa. A primeira versão desta sonda
     comparava a caixa do primeiro filho do stack — um container de 0x0 em y=0 —
     e por isso acusava as internas todas, sempre. */
  if (faixa) {
    var f = faixa.getBoundingClientRect();
    var sob = document.elementFromPoint(Math.round(innerWidth/2), Math.round(f.bottom + 8));
    res.logoAbaixo = sob ? (sob.tagName+'.'+(sob.className||'').toString().split(' ')[0]) : null;
    var prim = [].slice.call(document.querySelectorAll(
      'header.framer-vrbx7h > *, main > *')).filter(function(e){
        return e.getBoundingClientRect().height > 4; })[0];
    res.primeiroBloco = prim ? { cls:(prim.className||'').toString().split(' ')[0], caixa: caixa(prim) } : null;
    res.fundoPassaPorBaixo = !!(prim && prim.getBoundingClientRect().top < f.bottom - 1);
    var cobertos = prim ? [].slice.call(prim.querySelectorAll(
      'h1,h2,h3,p,a,button,img,[data-mel-add]')).filter(function(e){
        var b = e.getBoundingClientRect();
        if (b.width < 4 || b.height < 4) return false;
        var s = getComputedStyle(e);
        if (s.visibility === 'hidden' || Number(s.opacity) < 0.05) return false;
        return b.top + b.height/2 < f.bottom;      /* centro atrás da faixa */
      }).map(function(e){ return e.tagName + ':' + (e.textContent||'').trim().slice(0,24); }) : [];
    res.conteudoCoberto = cobertos;
    res.faixaCobreConteudo = cobertos.length > 0;
    var cf = fundoReal(faixa);
    res.faixaFundo = 'rgb(' + cf.map(Math.round).join(',') + ')';
    /* contraste do desenho do hambúrguer contra a faixa */
    var barra = faixa.querySelector('[data-framer-name="1"]');
    res.contrasteIcone = barra ? contraste(canal(getComputedStyle(barra).backgroundColor), cf) : null;
  }
  return res;
})()`;

/* DEPOIS DE ROLAR — e o alarme falso que esta sonda deu na primeira versão.
   A barra SOME ao rolar para baixo: é pedido do cliente, está implementado em
   iniciarNavRetratil() e documentado. Cobrar "o abridor recebe clique" com a
   página rolada acusava as três rotas em cinco larguras, todas por um
   comportamento correto. O que de fato precisa ser verdade no toque é a volta:
   rolou para cima, a barra reaparece e volta a receber clique. É isso que se
   mede agora, nos dois momentos. */
const APOS_ROLAR = `(function(){
  ${AJUDA}
  var faixa = faixaDaNav();
  if(!faixa) return { erro:'sem faixa' };
  var b = [].slice.call(document.querySelectorAll('[data-framer-name="Meniu"]'))
    .filter(function(e){ return e.getBoundingClientRect().width>0; })[0];
  function clicavel(){
    if(!b) return false;
    var r = b.getBoundingClientRect();
    var a = document.elementFromPoint(Math.round(r.x+r.width/2), Math.round(r.y+r.height/2));
    return !!(a && (a===b || b.contains(a)));
  }
  return { caixa: caixa(faixa), scrollY: Math.round(scrollY),
           presaNaJanela: getComputedStyle(faixa).position === 'fixed',
           escondida: caixa(faixa).y <= -10,
           /* qual dos dois caminhos de volta vale nesta máquina */
           temMouse: matchMedia('(hover: hover) and (pointer: fine)').matches,
           clicavel: clicavel() };
})()`;

const MENU_NA_FRENTE = `(function(){
  ${AJUDA}
  var p = document.querySelector('.mel-menu');
  if(!p) return { abriu:false };
  var b = p.getBoundingClientRect();
  var pts = [[b.x+8, b.y+8], [b.x+b.width/2, b.y+b.height/2], [b.x+b.width-8, b.y+b.height-8]];
  var atras = pts.filter(function(pt){
    var e = document.elementFromPoint(Math.round(pt[0]), Math.round(pt[1]));
    return !(e && (e===p || p.contains(e)));
  }).length;
  return { abriu:true, caixa: caixa(p), z: getComputedStyle(p).zIndex,
           pontosCobertos: 3-atras, transbordo: document.documentElement.scrollWidth - innerWidth,
           dentroDaTela: b.left >= -1 && b.right <= innerWidth + 1 };
})()`;

(async () => {
  const perfil = path.join(process.env.TEMP || '.', 'edge-qa-navbar');
  const edge = spawn(EDGE, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-port=' + PORTA, '--user-data-dir=' + perfil, 'about:blank'], { stdio: 'ignore' });
  await esperarDevTools(PORTA);
  const alvos = await pegarJSON(PORTA, '/json/list');
  const c = await CDP.conectar(alvos.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await c.enviar('Page.enable'); await c.enviar('Runtime.enable'); await c.enviar('Log.enable');

  const av = async (e) => {
    const r = await c.enviar('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true });
    return r.exceptionDetails ? { erro: JSON.stringify(r.exceptionDetails).slice(0, 240) } : r.result.value;
  };

  const saida = { quando: new Date().toISOString(), rotas: {} };
  const falhas = [];

  for (const rota of ROTAS) {
    saida.rotas[rota] = {};
    for (const w of LARGURAS) {
      const problemas = [];
      c.ao('Log.entryAdded', (e) => { if (e.entry && e.entry.level === 'error') problemas.push(e.entry.text.slice(0, 140)); });

      await c.enviar('Emulation.setDeviceMetricsOverride', { width: w, height: 844, deviceScaleFactor: 1, mobile: w < 810 });
      /* TOQUE DE VERDADE, e não só uma janela estreita.
         setDeviceMetricsOverride sozinho NÃO muda as media queries de ponteiro:
         o headless continua respondendo "(hover: hover) and (pointer: fine)"
         verdadeiro. E iniciarNavRetratil usa exatamente essa consulta para
         decidir como a barra volta — com mouse, ao aproximar do topo; no toque,
         ao rolar para cima. Sem isso, a sonda testava o caminho errado e
         acusava as três rotas em cinco larguras.
         São as MEDIA FEATURES que se emulam aqui, não o input:
         setTouchEmulationEnabled + setEmitTouchEventsForMouse trocam também a
         entrega de eventos, e nesta versão do Edge a sessão CDP travou com as
         duas ligadas — 15 combinações sem terminar em 10 minutos. */
      await c.enviar('Emulation.setEmulatedMedia', {
        features: w < 810 ? [{ name: 'hover', value: 'none' }, { name: 'pointer', value: 'coarse' }] : [],
      });
      const ok = new Promise((r) => c.ao('Page.loadEventFired', r));
      await c.enviar('Page.navigate', { url: BASE + rota });
      await Promise.race([ok, dormir(30000)]);
      await dormir(2000);

      // ESPERA O CONTROLADOR, E NÃO O RELÓGIO. Numa execução de 15/08 a
      // PRIMEIRA carga de um navegador frio não coube nos 2s acima: a sonda
      // rolou antes de iniciarNavRetratil estar de pé e o teste acusou "a barra
      // não se escondeu" numa página onde ela se esconde — conferido logo
      // depois, isolado, passando duas vezes. Dormir mais só empurra o
      // problema; o sinal certo é o controlador ter escrito o transition inline
      // na barra, que é a última coisa que ele faz ao iniciar.
      for (let t = 0; t < 50; t++) {
        const pronto = await av(`(() => {
          var b = document.querySelector('[data-framer-name="Meniu"]');
          while (b && getComputedStyle(b).position !== 'fixed') b = b.parentElement;
          return !!(b && b.style.transition);
        })()`);
        if (pronto) break;
        await dormir(100);
      }

      const topo = await av(SONDA);

      // rolando para baixo: a barra tem de se esconder (pedido do cliente) e
      // continuar presa à janela, não rolar junto com a página
      await av('window.scrollTo(0,900)');
      await dormir(800);
      const rolado = await av(APOS_ROLAR);
      // A VOLTA É UMA SÓ, EM TODO APARELHO, DESDE 15/08: rolar para cima.
      // Até aqui este teste AJUDAVA a barra com um mouseMoved quando a máquina
      // tinha ponteiro — e era isso que escondia o defeito relatado pelo
      // cliente: no desktop a barra só voltava pelo ponteiro, e o QA passava
      // porque ele mesmo fazia o gesto que faltava. Sem ajuda nenhuma agora.
      await av('window.scrollTo(0,520)');
      await dormir(800);
      const voltou = await av(APOS_ROLAR);

      // O atalho do ponteiro continua valendo onde há ponteiro, e é testado
      // DEPOIS e em separado, para nunca mais mascarar o caminho principal.
      let atalho = null;
      if (rolado.temMouse) {
        await av('window.scrollTo(0,900)');
        await dormir(800);
        await c.enviar('Input.dispatchMouseEvent', { type: 'mouseMoved', x: Math.round(w / 2), y: 20 });
        await dormir(700);
        atalho = await av(APOS_ROLAR);
      }
      await av('window.scrollTo(0,0)');
      await dormir(700);

      // menu aberto: abre na frente? cabe na tela?
      let menu = { abriu: false };
      const abridor = (topo.controles || []).find((x) => /menu/i.test(x.rot));
      if (abridor && abridor.recebeClique) {
        const k = abridor.caixa;
        for (const type of ['mousePressed', 'mouseReleased']) {
          await c.enviar('Input.dispatchMouseEvent', { type, x: k.x + Math.round(k.w / 2), y: k.y + Math.round(k.h / 2), button: 'left', clickCount: 1 });
        }
        await dormir(800);
        menu = await av(MENU_NA_FRENTE);
        await c.enviar('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await c.enviar('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await dormir(400);
      }

      saida.rotas[rota][w] = { topo, rolado, voltou, atalho, menu, console: problemas };

      // veredito por largura
      const mortos = (topo.controles || []).filter((x) => !x.recebeClique);
      const pequenos = (topo.controles || []).filter((x) => x.alvoDeToque < 24);
      if (topo.transbordo > 0) falhas.push(rota + ' @' + w + ': transbordo horizontal de ' + topo.transbordo + 'px');
      if (mortos.length) falhas.push(rota + ' @' + w + ': ' + mortos.map((m) => m.rot + ' coberto por ' + m.quemRecebe).join('; '));
      if (topo.prisoes.length) falhas.push(rota + ' @' + w + ': faixa presa por ' + JSON.stringify(topo.prisoes));
      if (topo.faixaCobreConteudo) falhas.push(rota + ' @' + w + ': conteúdo atrás da faixa — ' + topo.conteudoCoberto.join(', '));
      if (!rolado.presaNaJanela) falhas.push(rota + ' @' + w + ': a faixa perdeu o position:fixed ao rolar');
      // Descer tem que esconder: sem isto o "voltou" passaria de graça, porque
      // uma barra que nunca sai também nunca deixa de estar visível.
      if (!rolado.escondida) falhas.push(rota + ' @' + w + ': rolando para baixo a barra não se escondeu');
      if (!voltou.clicavel) falhas.push(rota + ' @' + w + ': rolando para cima a barra não volta clicável');
      if (voltou.escondida) falhas.push(rota + ' @' + w + ': rolando para cima a barra continua escondida');
      if (atalho && atalho.escondida) falhas.push(rota + ' @' + w + ': o ponteiro perto do topo não traz a barra de volta');
      if (menu.abriu && menu.pontosCobertos < 3) falhas.push(rota + ' @' + w + ': menu abriu atrás do conteúdo');
      if (menu.abriu && !menu.dentroDaTela) falhas.push(rota + ' @' + w + ': menu sai da tela');
      if (pequenos.length) falhas.push(rota + ' @' + w + ': alvo de toque < 24px em ' + pequenos.map((p) => p.rot).join(', '));
      if (problemas.length) falhas.push(rota + ' @' + w + ': ' + problemas.length + ' erro(s) de console');
    }
  }

  const destino = path.join(__dirname, 'shots-navbar');
  fs.mkdirSync(destino, { recursive: true });
  fs.writeFileSync(path.join(destino, 'qa-navbar-mobile.json'), JSON.stringify(saida, null, 2), 'utf8');

  console.log('rota      larg  faixa(pos,y,h)      transb  controles(ok/total)  menu  console');
  for (const rota of ROTAS) for (const w of LARGURAS) {
    const d = saida.rotas[rota][w], t = d.topo;
    const ok = (t.controles || []).filter((x) => x.recebeClique).length;
    console.log(rota.padEnd(9) + String(w).padEnd(6)
      + ((t.faixa ? t.faixa.pos + ',' + t.faixa.caixa.y + ',' + t.faixa.caixa.h : '-')).padEnd(20)
      + String(t.transbordo).padEnd(8)
      + (ok + '/' + (t.controles || []).length).padEnd(21)
      + (d.menu.abriu ? 'ok' : '-').padEnd(6) + d.console.length);
  }
  console.log('');
  if (falhas.length) { console.log('FALHAS (' + falhas.length + '):'); falhas.forEach((f) => console.log('  - ' + f)); }
  else console.log('navbar mobile: nenhuma falha nas ' + LARGURAS.length + ' larguras x ' + ROTAS.length + ' rotas.');
  try { edge.kill(); } catch (e) {}
  process.exit(0);
})();
