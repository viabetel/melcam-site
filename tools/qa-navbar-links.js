// QA DA NAVEGAÇÃO VISÍVEL NA BARRA — 14/08/2026.
//
//   node tools/qa-navbar-links.js
//   LARGURAS=320,1280 node tools/qa-navbar-links.js
//   BASE_URL=https://melcam-site.vercel.app node tools/qa-navbar-links.js
//
// Por que existe: até 13/08 a barra mostrava dois controles e ZERO links —
// todos os destinos ficavam atrás do hambúrguer, inclusive em 1280px. A
// correção acrescentou os quatro links e a sacola, e trocou a linha por uma
// grade de três colunas para o logo não sair do centro.
//
// Cada uma dessas três coisas quebra de um jeito que print nenhum denuncia:
//
//   - o logo sai do centro quando as pontas mudam de largura;
//   - um controle nasce com o centro fora da tela e não recebe clique
//     (aconteceu de verdade em 13/08, em 320px);
//   - o alvo de toque encolhe abaixo de 44px;
//   - a grade ganha um quarto filho visível e rouba a coluna do meio.
//
// Então a sonda mede posição, quem recebe o clique, tamanho do alvo e
// transbordo. Nunca aparência.
const path = require('path');
const { spawn } = require('child_process');
const { CDP, pegarJSON, esperarDevTools } = require('./cdp');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = process.env.BASE_URL || 'http://localhost:3030';
const PORTA = 9333 + (Number(process.env.PORTA_OFF) || 96);
const LARGURAS = (process.env.LARGURAS || '320,375,390,430,768,1023,1024,1280,1440').split(',').map(Number);
const ROTAS = (process.env.ROTAS || '/,/bee,/polen').split(',');
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

// A partir daqui os links aparecem, a sacola sobe e a linha vira grade. O
// número saiu de medição: os 4 rótulos ocupam 375px com padding, a marca ocupa
// 178 fixos, então a grade simétrica pede 375+178+375 = 928px de linha útil, e
// a linha é a viewport menos ~63px. O piso real é 991; 1024 é o degrau redondo
// acima dele.
const DESKTOP = 1024;

const SONDA = `(function () {
  var navs = Array.prototype.slice.call(document.querySelectorAll('nav[data-framer-name]'));
  var nav = null;
  for (var i = 0; i < navs.length; i++) {
    if (navs[i].getBoundingClientRect().width > 0) { nav = navs[i]; break; }
  }
  if (!nav) return { erro: 'nenhuma nav visível' };

  var linha = nav.querySelector('[data-framer-name^="Section"]');
  var logo  = nav.querySelector('a[data-framer-name="MELCAM"]');
  var icone = nav.querySelector('[data-framer-name="Icon"]');
  var sac   = nav.querySelector('[data-mel-sacola-bt]');
  var conta = nav.querySelector('[data-mel-perfil]');
  var links = Array.prototype.slice.call(nav.querySelectorAll('.mel-nav-link'))
    .filter(function (a) { return a.getBoundingClientRect().width > 0; });

  function cx(e) {
    if (!e) return null;
    var r = e.getBoundingClientRect();
    if (r.width === 0) return { w: 0, h: 0 };
    var a = document.elementFromPoint(Math.round(r.x + r.width / 2), Math.round(r.y + r.height / 2));
    return {
      x: Math.round(r.x), dir: Math.round(r.right),
      w: Math.round(r.width), h: Math.round(r.height),
      centroDentro: (r.x + r.width / 2) >= 0 && (r.x + r.width / 2) <= window.innerWidth,
      recebeClique: !!(a && (a === e || e.contains(a)))
    };
  }

  var lr = linha.getBoundingClientRect();
  var rl = logo.getBoundingClientRect();
  return {
    nav: nav.getAttribute('data-framer-name'),
    display: getComputedStyle(linha).display,
    filhosVisiveis: Array.prototype.slice.call(linha.children)
      .filter(function (c) { return c.getBoundingClientRect().width > 0; }).length,
    desvioDoLogo: Math.round((rl.x + rl.width / 2) - (lr.x + lr.width / 2)),
    links: links.map(function (a) {
      var r = a.getBoundingClientRect();
      return { t: a.textContent, w: Math.round(r.width), h: Math.round(r.height), atual: a.getAttribute('aria-current') || '' };
    }),
    hamburguer: icone ? icone.getBoundingClientRect().width > 0 : false,
    sacola: cx(sac), conta: cx(conta),
    rotuloSacola: sac ? sac.getAttribute('aria-label') : null,
    transbordo: document.documentElement.scrollWidth - window.innerWidth
  };
})()`;

(async () => {
  const perfil = path.join(process.env.TEMP || '.', 'edge-qa-navlinks');
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

  let passou = 0;
  const falhas = [];
  const ok = (m) => { passou++; console.log('  ok    ' + m); };
  const nao = (ctx, m, v) => { falhas.push(ctx + ' ' + m); console.log('  FALHA ' + m + '  << ' + v); };

  for (const rota of ROTAS) {
    for (const w of LARGURAS) {
      const ctx = `[${rota} @${w}]`;
      await c.enviar('Emulation.setDeviceMetricsOverride', { width: w, height: 800, deviceScaleFactor: 1, mobile: w < 810 });
      await c.enviar('Emulation.setEmulatedMedia', {
        features: w < 810 ? [{ name: 'hover', value: 'none' }, { name: 'pointer', value: 'coarse' }] : [],
      });
      const carregou = new Promise((r) => c.ao('Page.loadEventFired', r));
      await c.enviar('Page.navigate', { url: BASE + rota });
      await Promise.race([carregou, dormir(30000)]);
      await dormir(1200);

      const r = await av(SONDA);
      console.log(`\n== ${rota} @ ${w}px  ${r.nav || ''}`);
      if (!r || r.erro) { nao(ctx, 'sonda falhou', r && r.erro); continue; }

      const desktop = w >= DESKTOP;

      if (desktop) {
        r.links.length === 4 ? ok('4 links à vista') : nao(ctx, 'deveria mostrar 4 links', r.links.length);
        !r.hamburguer ? ok('hambúrguer recolhido') : nao(ctx, 'hambúrguer deveria sumir', 'visível');
        r.display === 'grid' ? ok('linha em grade') : nao(ctx, 'linha deveria ser grade', r.display);
        r.filhosVisiveis === 3 ? ok('3 colunas na grade') : nao(ctx, 'grade deveria ter 3 filhos visíveis', r.filhosVisiveis);
        Math.abs(r.desvioDoLogo) <= 1 ? ok('logo no centro (' + r.desvioDoLogo + 'px)') : nao(ctx, 'logo fora do centro', r.desvioDoLogo + 'px');
        // alvo de toque também vale para os links, que são o controle novo
        const baixinho = r.links.filter((l) => l.h < 36);
        !baixinho.length ? ok('links com 36px de altura') : nao(ctx, 'link mais baixo que 36px', JSON.stringify(baixinho));
      } else {
        r.links.length === 0 ? ok('links recolhidos') : nao(ctx, 'links não deveriam aparecer', r.links.length);
        r.hamburguer ? ok('hambúrguer no comando') : nao(ctx, 'hambúrguer deveria estar visível', 'oculto');
        /* Abaixo do desktop a barra tem de ficar COMO JÁ ESTAVA e passou no QA
           de 13/08: o logo nasce ~10px fora do centro porque o hambúrguer (64)
           e o botão de conta (44) não têm a mesma largura, e isso é do
           template. O limite de 12 é essa folga, não um chute. */
        Math.abs(r.desvioDoLogo) <= 12 ? ok('logo como antes (' + r.desvioDoLogo + 'px)') : nao(ctx, 'logo deslocado', r.desvioDoLogo + 'px');
      }

      const temSacola = r.sacola && r.sacola.w > 0;
      if (desktop) {
        temSacola ? ok('sacola na barra') : nao(ctx, 'sacola deveria estar na barra', 'ausente');
      } else {
        !temSacola ? ok('sacola fica no painel') : nao(ctx, 'sacola não cabe na barra nesta largura', r.sacola.w + 'px');
      }

      [['conta', r.conta], ['sacola', temSacola ? r.sacola : null]].forEach(function (par) {
        const nome = par[0], ct = par[1];
        if (!ct || !ct.w) return;
        ct.centroDentro ? ok(nome + ': centro dentro da tela') : nao(ctx, nome + ': centro fora da tela', ct.x + '..' + ct.dir);
        ct.recebeClique ? ok(nome + ': recebe o clique') : nao(ctx, nome + ': o clique vai para outro elemento', 'sim');
        (ct.w >= 44 && ct.h >= 44) ? ok(nome + ': alvo ' + ct.w + 'x' + ct.h) : nao(ctx, nome + ': alvo menor que 44px', ct.w + 'x' + ct.h);
      });

      if (temSacola) {
        /^Sacola, (vazia|\d+ (item|itens))$/.test(r.rotuloSacola || '')
          ? ok('sacola anunciada: "' + r.rotuloSacola + '"')
          : nao(ctx, 'rótulo da sacola sem contagem por extenso', r.rotuloSacola);
      }

      if (desktop && rota !== '/') {
        const marcados = r.links.filter((l) => l.atual === 'page');
        marcados.length === 1 ? ok('aria-current em ' + marcados[0].t)
          : nao(ctx, 'deveria marcar exatamente 1 link como página atual', marcados.length);
      }

      r.transbordo <= 0 ? ok('sem transbordo horizontal') : nao(ctx, 'transbordo horizontal', r.transbordo + 'px');
    }
  }

  try { edge.kill(); } catch (e) { /* já morreu */ }

  console.log('\n' + passou + ' verificações passaram, ' + falhas.length + ' falharam.');
  if (falhas.length) falhas.forEach((f) => console.log('  - ' + f));
  process.exit(falhas.length ? 1 : 0);
})();
