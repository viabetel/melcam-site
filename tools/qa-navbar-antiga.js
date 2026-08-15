// O QUE AINDA É "NAVBAR ANTIGA" — auditoria do DOM entregue no primeiro paint.
//
//   node tools/qa-navbar-antiga.js
//   BASE_URL=https://melcam-site.vercel.app node tools/qa-navbar-antiga.js
//   LARGURAS=1440,390 ROTAS=/,/polen node tools/qa-navbar-antiga.js
//
// Existe para responder, com número, a lista de verificação do pedido de
// 14/08/2026 — e para separar o que é resto do template do que é a barra
// atual usando os nós do template como matéria-prima.
//
// A pergunta que este arquivo responde não é "existe 'Meniu' no HTML?" (existe,
// e `grep` já diz isso). É:
//
//   1. quantas <nav> o arquivo traz, e quantas PINTAM ao mesmo tempo;
//   2. o "Meniu" é o hambúrguer solto do template, ou é o container que hoje
//      segura os quatro destinos da barra atual?
//   3. o ícone de três barras aparece em quais larguras — e ali ele é resto,
//      ou é o controle aprovado do mobile?
//   4. algum destino da barra atual nasce fora da <nav> que pinta?
//
// Só lê. Não grava nada além do relatório em stdout.
const { spawn } = require('child_process');
const { CDP, pegarJSON, esperarDevTools } = require('./cdp');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = process.env.BASE_URL || 'http://localhost:3030';
const PORTA = Number(process.env.PORTA) || 9424;
const LARGURAS = (process.env.LARGURAS || '1920,1440,1024,810,390').split(',').map(Number);
const ROTAS = (process.env.ROTAS || '/,/polen,/bee,/acessorios,/sobre,/sacola,/404').split(',');
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

// Visível de verdade: caixa com área, sem display:none/visibility/opacity 0 em
// nenhum ancestral. Uma <nav> de breakpoint inativo continua no DOM e continua
// respondendo a querySelector — só não pinta. Contar nó não serve; contar
// pintura serve.
const SONDA = `(() => {
  function visivel(el){
    if(!el) return false;
    var r = el.getBoundingClientRect();
    if(r.width <= 0 || r.height <= 0) return false;
    var e = el;
    while(e && e !== document.documentElement){
      var s = getComputedStyle(e);
      if(s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return false;
      e = e.parentElement;
    }
    return true;
  }
  var navs = Array.prototype.slice.call(document.querySelectorAll('nav'));
  var navsVis = navs.filter(visivel);

  var meniu = Array.prototype.slice.call(document.querySelectorAll('[data-framer-name="Meniu"]'));
  var meniuVis = meniu.filter(visivel);

  // O ícone de três barras. Ele mora DENTRO do Meniu, e o Meniu pode estar
  // visível com o ícone recolhido — são duas perguntas diferentes.
  var icones = meniu.map(function(m){ return m.querySelector('[data-framer-name="Icon"]'); }).filter(Boolean);
  var iconesVis = icones.filter(visivel);

  var links = Array.prototype.slice.call(document.querySelectorAll('.mel-nav-links'));
  var linksVis = links.filter(visivel);
  var destinos = Array.prototype.slice.call(document.querySelectorAll('.mel-nav-link'));
  var destinosVis = destinos.filter(visivel);

  // Os quatro destinos nascem dentro do Meniu? Se sim, "remover o Meniu" é
  // remover a barra atual, não o resto do template.
  var dentroDoMeniu = destinosVis.filter(function(a){ return a.closest('[data-framer-name="Meniu"]'); }).length;
  var foraDaNav = destinosVis.filter(function(a){ return !a.closest('nav'); }).length;

  // Seletores mortos do iniciarMenu: casam alguma coisa nesta página?
  var casaMenu = document.querySelectorAll('[data-framer-name*="Menu"]').length;
  var casaBurger = document.querySelectorAll('[data-framer-name*="Burger"]').length;

  return JSON.stringify({
    navs: navs.length,
    navsVis: navsVis.length,
    meniu: meniu.length,
    meniuVis: meniuVis.length,
    iconesVis: iconesVis.length,
    linksVis: linksVis.length,
    destinosVis: destinosVis.length,
    dentroDoMeniu: dentroDoMeniu,
    foraDaNav: foraDaNav,
    casaMenu: casaMenu,
    casaBurger: casaBurger,
    rotulos: destinosVis.map(function(a){ return a.textContent.trim(); }).join('|')
  });
})()`;

(async () => {
  const perfil = require('path').join(__dirname, 'edge-cdp-' + PORTA);
  const edge = spawn(EDGE, [
    '--headless=new', '--remote-debugging-port=' + PORTA,
    '--user-data-dir=' + perfil, '--no-first-run', '--no-default-browser-check',
    '--disable-lcd-text', '--disable-font-subpixel-positioning',
    'about:blank'
  ], { stdio: 'ignore' });

  const falhas = [];
  try {
    await esperarDevTools(PORTA);
    const alvos = await pegarJSON(PORTA, '/json/list');
    var c = await CDP.conectar(alvos.find((t) => t.type === 'page').webSocketDebuggerUrl);
    await c.enviar('Page.enable');
    await c.enviar('Runtime.enable');

    console.log(`barra antiga x barra atual  |  ${BASE}\n`);
    console.log('  rota         larg   <nav>  pintando   Meniu(vis)  ícone  links  destinos  dentro do Meniu  fora da <nav>');

    for (const rota of ROTAS) {
      for (const larg of LARGURAS) {
        await c.enviar('Emulation.setDeviceMetricsOverride', {
          width: larg, height: 900, deviceScaleFactor: 1, mobile: larg < 810,
        });
        const ok = new Promise((r) => c.ao('Page.loadEventFired', r));
        await c.enviar('Page.navigate', { url: BASE + rota });
        await Promise.race([ok, dormir(45000)]);
        // A barra nasce no arquivo, mas o tema e o recolhimento do slot ainda
        // rodam no DOMContentLoaded. 2,5s é o mesmo assentamento dos outros QA.
        await dormir(2500);
        const r = await c.enviar('Runtime.evaluate', { expression: SONDA, returnByValue: true });
        const d = JSON.parse(r.result.value);

        const linha = [
          rota.padEnd(12), String(larg).padStart(5),
          String(d.navs).padStart(6), String(d.navsVis).padStart(10),
          String(d.meniuVis + '/' + d.meniu).padStart(12),
          (d.iconesVis ? 'sim' : 'não').padStart(7),
          String(d.linksVis).padStart(7), String(d.destinosVis).padStart(9),
          String(d.dentroDoMeniu).padStart(17), String(d.foraDaNav).padStart(14)
        ].join('');
        console.log(linha);

        // As reprovas de verdade, e só elas.
        //
        // O que se espera muda com a largura, e isso é desenho aprovado desde
        // 13/08: a partir de 1024 os quatro destinos ficam à vista na linha;
        // abaixo disso quem aparece é o hambúrguer, e os destinos moram no
        // painel que ele abre. Cobrar "4 destinos visíveis" no mobile seria o
        // teste reprovando a navbar aprovada.
        if (d.navsVis > 1) falhas.push(`${rota} ${larg}: ${d.navsVis} <nav> pintando ao mesmo tempo`);
        if (d.navsVis < 1) falhas.push(`${rota} ${larg}: nenhuma <nav> pintando`);
        if (larg >= 1024) {
          if (d.destinosVis !== 4) falhas.push(`${rota} ${larg}: ${d.destinosVis} destinos à vista, esperado 4`);
          if (d.iconesVis) falhas.push(`${rota} ${larg}: hambúrguer à vista no desktop`);
        } else {
          if (!d.iconesVis) falhas.push(`${rota} ${larg}: hambúrguer ausente no mobile`);
          if (d.destinosVis > 0) falhas.push(`${rota} ${larg}: ${d.destinosVis} destinos soltos na linha do mobile`);
        }
        if (d.foraDaNav > 0) falhas.push(`${rota} ${larg}: ${d.foraDaNav} destino(s) fora da <nav>`);
        if (d.casaMenu || d.casaBurger) {
          falhas.push(`${rota} ${larg}: seletor *="Menu"/*="Burger" casou ${d.casaMenu}/${d.casaBurger} nó(s)`);
        }
      }
    }
  } finally {
    try { c.fechar(); } catch {}
    edge.kill();
  }

  console.log('');
  if (falhas.length) {
    falhas.forEach((f) => console.log('X  ' + f));
    process.exitCode = 1;
  } else {
    console.log('[OK] uma <nav> pintando por vez; no desktop os 4 destinos à vista e o');
    console.log('     hambúrguer recolhido, no mobile o hambúrguer à vista e os destinos no');
    console.log('     painel; nenhum destino fora da <nav>; e os seletores *="Menu" /');
    console.log('     *="Burger" não casam nó nenhum em nenhuma página.');
  }
})();
