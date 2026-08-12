// Vídeo do hero + carrossel de 3 banners + revive o ticker de produtos.
//
// Com a hidratação React desligada, o ticker do template parou. Aqui ele volta
// em JS próprio, junto com o carrossel que o briefing pede. Os timings seguem
// os do template (spring damping 100 / stiffness 200 -> ~520ms, easing suave).
const fs = require('fs');
const path = require('path');
const SITE = path.resolve(__dirname, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(SITE, 'melcam.config.json'), 'utf8'));
const P = cfg.paleta;

// ------------------------------------------------------------------ vídeo
//
// O template JÁ TEM um <video> — um único, no bloco "Shadow" dentro de
// "The first section", que é a faixa do topo. Ele apontava para um preview do
// Envato. Não se injeta vídeo nenhum: troca-se a fonte deste, que já vem
// posicionado e estilizado pelo template (width/height 100%, object-fit:cover).
//
// O template o deixa com preload="none" e sem autoplay porque quem dava play
// era o runtime do Framer. Com a hidratação desligada, o autoplay tem que
// estar no atributo.
function trocarVideo(s, n) {
  const h = cfg.home.hero;
  return s.replace(/<video\b[^>]*>/g, (tag) => {
    n.video++;
    let t = tag
      .replace(/\ssrc="[^"]*"/, ` src="${h.video}"`)
      .replace(/\spreload="[^"]*"/, ' preload="metadata"');
    if (!/\sautoplay/.test(t)) t = t.replace('<video', '<video autoplay');
    if (!/\sposter=/.test(t)) t = t.replace('<video', `<video poster="${h.poster}"`);
    if (!/\smuted/.test(t)) t = t.replace('<video', '<video muted');
    if (!/\splaysinline/.test(t)) t = t.replace('<video', '<video playsinline');
    if (!/\sloop/.test(t)) t = t.replace('<video', '<video loop');
    return t.replace('<video', '<video data-mel="hero-video"');
  });
}

// --------------------------------------------------------------- carrossel
function carrossel() {
  const b = cfg.home.banners;
  const slides = b.map((x, i) => `
    <li class="mel-slide" role="group" aria-roledescription="slide"
        aria-label="${i + 1} de ${b.length}" ${i ? 'aria-hidden="true"' : ''}>
      <a class="mel-slide-link" href="${x.href}">
        <img src="${x.img}" alt="" loading="${i ? 'lazy' : 'eager'}">
        <div class="mel-slide-txt"><h2>${x.titulo}</h2></div>
      </a>
    </li>`).join('');

  const dots = b.map((x, i) => `
    <button type="button" class="mel-dot" data-mel-ir="${i}"
            aria-label="Ir para o banner ${i + 1}: ${x.titulo}"
            ${i ? '' : 'aria-current="true"'}></button>`).join('');

  return `
<section class="mel-carrossel" data-mel="carrossel" aria-roledescription="carrossel"
         aria-label="Destaques da Melcam">
  <ul class="mel-trilho" data-mel-trilho>${slides}
  </ul>
  <button type="button" class="mel-seta mel-seta-ant" data-mel-ant aria-label="Banner anterior">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4 L7 12 L15 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
  </button>
  <button type="button" class="mel-seta mel-seta-prox" data-mel-prox aria-label="Próximo banner">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4 L17 12 L9 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
  </button>
  <div class="mel-controles">
    <div class="mel-dots" role="tablist" aria-label="Escolher banner">${dots}
    </div>
    <button type="button" class="mel-pausa" data-mel-pausa aria-label="Pausar rotação automática" aria-pressed="false">
      <span data-mel-pausa-txt>Pausar</span>
    </button>
  </div>
  <p class="mel-sr" aria-live="polite" data-mel-vivo></p>
</section>`;
}

// -------------------------------------------------------------------- CSS
function css() {
  return `
/* ---------------- Hero em vídeo ----------------
   O <video> é o do próprio template, já posicionado por ele. Aqui só cuidamos
   do que o template não previa: fundo enquanto carrega e reduced-motion. */
video[data-mel="hero-video"]{ background:${P.carvao} }
@media (prefers-reduced-motion:reduce){
  video[data-mel="hero-video"]{
    /* fica o poster, sem movimento */
    animation:none;
  }
}

/* ---------------- Carrossel de banners ---------------- */
.mel-carrossel{
  position:relative; width:100%; max-width:1440px; margin:0 auto;
  padding:0 24px; overflow:hidden;
}
.mel-trilho{
  display:flex; margin:0; padding:0; list-style:none;
  transition:transform 520ms cubic-bezier(.22,.61,.36,1);
}
.mel-slide{ flex:0 0 100%; min-width:100% }
.mel-slide-link{
  position:relative; display:block; border-radius:12px; overflow:hidden;
  aspect-ratio:24/10; text-decoration:none;
}
.mel-slide-link img{ width:100%; height:100%; object-fit:cover; display:block }
.mel-slide-txt{
  position:absolute; inset:auto auto 0 0; padding:clamp(20px,4vw,56px);
  max-width:60%;
}
.mel-slide-txt h2{
  margin:0; color:${P.papel};
  font-family:"Iowan Old Style",Georgia,serif; font-weight:700;
  font-size:clamp(1.5rem,3.4vw,3rem); line-height:1.1;
  text-shadow:0 2px 24px rgba(34,30,23,.6);
}
.mel-seta{
  position:absolute; top:50%; transform:translateY(-50%); z-index:2;
  width:44px; height:44px; border:0; border-radius:999px; cursor:pointer;
  display:grid; place-items:center;
  background:rgba(34,30,23,.62); color:${P.papel};
  backdrop-filter:blur(6px);
  transition:background 200ms ease, transform 200ms ease;
}
.mel-seta:hover{ background:${P.mel}; color:${P.carvao} }
.mel-seta svg{ width:22px; height:22px }
.mel-seta-ant{ left:38px } .mel-seta-prox{ right:38px }
.mel-controles{
  display:flex; align-items:center; justify-content:center; gap:20px;
  margin-top:18px;
}
.mel-dots{ display:flex; gap:9px }
.mel-dot{
  width:9px; height:9px; padding:0; border:0; border-radius:999px; cursor:pointer;
  background:rgba(251,247,238,.32); transition:background 200ms ease, width 200ms ease;
}
.mel-dot[aria-current="true"]{ background:${P.mel}; width:26px }
.mel-pausa{
  border:0; background:none; cursor:pointer; color:#9A9083;
  font-family:"Area",sans-serif; font-size:.78rem; letter-spacing:.06em;
  text-transform:uppercase;
}
.mel-pausa:hover{ color:${P.papel} }
.mel-sr{
  position:absolute; width:1px; height:1px; padding:0; margin:-1px;
  overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap; border:0;
}
@media (max-width:809.98px){
  .mel-carrossel{ padding:0 16px }
  .mel-slide-link{ aspect-ratio:4/5 }
  .mel-slide-txt{ max-width:100% }
  .mel-seta-ant{ left:24px } .mel-seta-prox{ right:24px }
  .mel-seta{ width:38px; height:38px }
}
@media (prefers-reduced-motion:reduce){
  .mel-trilho{ transition:none }
}
`;
}

// --------------------------------------------------------------------- JS
function js() {
  return `/* Interações MELCAM. A hidratação React do Framer está desligada
   (ver DECISAO DE ARQUITETURA em tools/aplicar.js), então carrossel, ticker e
   menu mobile vivem aqui. Os timings acompanham os do template. */
(function () {
  'use strict';
  var menosMovimento = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------------- carrossel de banners ---------------- */
  function iniciarCarrossel(raiz) {
    var trilho = raiz.querySelector('[data-mel-trilho]');
    var slides = Array.prototype.slice.call(raiz.querySelectorAll('.mel-slide'));
    var dots = Array.prototype.slice.call(raiz.querySelectorAll('[data-mel-ir]'));
    var vivo = raiz.querySelector('[data-mel-vivo]');
    var btPausa = raiz.querySelector('[data-mel-pausa]');
    var txtPausa = raiz.querySelector('[data-mel-pausa-txt]');
    if (!trilho || slides.length < 2) return;

    var atual = 0, timer = null, pausado = false;
    var INTERVALO = 6000;

    function mostrar(i, anunciar) {
      atual = (i + slides.length) % slides.length;
      trilho.style.transform = 'translateX(' + (-100 * atual) + '%)';
      slides.forEach(function (s, k) {
        if (k === atual) s.removeAttribute('aria-hidden');
        else s.setAttribute('aria-hidden', 'true');
      });
      dots.forEach(function (d, k) {
        if (k === atual) d.setAttribute('aria-current', 'true');
        else d.removeAttribute('aria-current');
      });
      if (anunciar && vivo) vivo.textContent = 'Banner ' + (atual + 1) + ' de ' + slides.length;
    }

    function agendar() {
      parar();
      // Sem rotação automática para quem pediu menos movimento: o briefing
      // exige pausa acessível, e mover sozinho contraria a preferência.
      if (pausado || menosMovimento.matches) return;
      timer = setInterval(function () { mostrar(atual + 1, false); }, INTERVALO);
    }
    function parar() { if (timer) { clearInterval(timer); timer = null; } }

    dots.forEach(function (d) {
      d.addEventListener('click', function () {
        mostrar(parseInt(d.getAttribute('data-mel-ir'), 10), true); agendar();
      });
    });
    var ant = raiz.querySelector('[data-mel-ant]'), prox = raiz.querySelector('[data-mel-prox]');
    if (ant) ant.addEventListener('click', function () { mostrar(atual - 1, true); agendar(); });
    if (prox) prox.addEventListener('click', function () { mostrar(atual + 1, true); agendar(); });

    if (btPausa) btPausa.addEventListener('click', function () {
      pausado = !pausado;
      btPausa.setAttribute('aria-pressed', String(pausado));
      btPausa.setAttribute('aria-label', pausado ? 'Retomar rotação automática' : 'Pausar rotação automática');
      if (txtPausa) txtPausa.textContent = pausado ? 'Retomar' : 'Pausar';
      agendar();
    });

    /* teclado: setas quando o foco está dentro do carrossel */
    raiz.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); mostrar(atual - 1, true); agendar(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); mostrar(atual + 1, true); agendar(); }
    });

    /* pausa ao passar o mouse e ao focar, retoma ao sair */
    raiz.addEventListener('mouseenter', parar);
    raiz.addEventListener('mouseleave', agendar);
    raiz.addEventListener('focusin', parar);
    raiz.addEventListener('focusout', agendar);

    /* swipe */
    var x0 = null, y0 = null;
    raiz.addEventListener('touchstart', function (e) {
      x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
    }, { passive: true });
    raiz.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      var dy = e.changedTouches[0].clientY - y0;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
        mostrar(atual + (dx < 0 ? 1 : -1), true); agendar();
      }
      x0 = y0 = null;
    }, { passive: true });

    /* não gasta timer com a aba escondida */
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) parar(); else agendar();
    });

    mostrar(0, false);
    agendar();
  }

  /* ---------------- ticker de produtos ----------------
     O template rolava isto pelo runtime do Framer. Aqui volta em rAF, com a
     mesma sensação de rolagem contínua, e para quando não deve rolar. */
  function iniciarTicker(raiz) {
    var lista = raiz.querySelector('ul');
    if (!lista || menosMovimento.matches) return;
    var itens = Array.prototype.slice.call(lista.children);
    if (!itens.length) return;

    itens.forEach(function (li) {
      var c = li.cloneNode(true);
      c.setAttribute('aria-hidden', 'true');
      lista.appendChild(c);
    });

    var x = 0, largura = 0, rodando = true, ultimo = null;
    function medir() {
      largura = 0;
      for (var i = 0; i < itens.length; i++) largura += itens[i].getBoundingClientRect().width + 20;
    }
    medir();
    window.addEventListener('resize', medir);

    raiz.addEventListener('mouseenter', function () { rodando = false; });
    raiz.addEventListener('mouseleave', function () { rodando = true; });
    raiz.addEventListener('focusin', function () { rodando = false; });
    raiz.addEventListener('focusout', function () { rodando = true; });

    function passo(t) {
      if (ultimo === null) ultimo = t;
      var dt = t - ultimo; ultimo = t;
      if (rodando && !document.hidden && largura > 0) {
        x -= (dt / 1000) * 40;            // 40 px/s, o ritmo do template
        if (-x >= largura) x += largura;
        lista.style.transform = 'translateX(' + x + 'px)';
      }
      requestAnimationFrame(passo);
    }
    requestAnimationFrame(passo);
  }

  /* ---------------- nav some ao rolar, volta com o mouse ----------------
     Pedido do cliente: rolou, a barra sai; o mouse chegando perto do topo, ela
     volta.

     Tres regras de seguranca em cima disso:
       - no topo da pagina (< 80px) a barra fica sempre visivel, senao a home
         abre sem navegacao;
       - com o menu aberto ela nao se esconde, senao o X sumia junto;
       - quem nao tem mouse (toque) nunca dispararia o "chegar perto", entao
         ali a barra volta ao rolar para cima — o padrao conhecido de header
         retratil no celular. */
  function iniciarNavRetratil() {
    var barra = document.querySelector('[data-framer-name="Meniu"]');
    while (barra && getComputedStyle(barra).position !== 'fixed') barra = barra.parentElement;
    if (!barra) return;

    var TOPO_SEGURO = 80;   // px de scroll em que a barra nunca some
    var PERTO = 90;         // px do topo da janela que contam como "mouse perto"
    var escondida = false;
    var ultimoY = window.scrollY;
    var temMouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    /* A barra JA TEM transform proprio do template (um translateX de
       centralizacao, medido: matrix(1,0,0,1,-720,0) no desktop). Escrever
       translateY(-100%) direto apagava esse X e a barra escorregava 720px de
       lado enquanto subia. Entao guarda-se o transform de origem e compoe-se
       em cima dele. */
    var base = getComputedStyle(barra).transform;
    if (base === 'none') base = '';

    barra.style.transition = menosMovimento.matches ? 'none'
      : 'transform 300ms cubic-bezier(.4,0,.2,1)';
    barra.style.willChange = 'transform';

    function mostrar() {
      if (!escondida) return;
      escondida = false;
      barra.style.transform = base;
    }
    function esconder() {
      if (escondida) return;
      if (document.querySelector('.mel-menu')) return;   // menu aberto: fica
      if (window.scrollY <= TOPO_SEGURO) return;
      escondida = true;
      barra.style.transform = (base + ' translateY(-100%)').trim();
    }

    window.addEventListener('scroll', function () {
      var y = window.scrollY;
      if (y <= TOPO_SEGURO) mostrar();
      else if (!temMouse && y < ultimoY) mostrar();  // rolou pra cima, no toque
      else esconder();
      ultimoY = y;
    }, { passive: true });

    if (temMouse) {
      document.addEventListener('mousemove', function (e) {
        if (e.clientY <= PERTO) mostrar();
      }, { passive: true });
    }
  }

  /* ---------------- menu de navegacao ----------------
     Reproduz o comportamento medido no template original (MOTION_SPEC.md, sec. 7):
       - painel de tela cheia, criado no clique e removido no fechamento;
       - entrada so por opacidade, 0 -> 1 em ~400ms, desacelerando;
       - trava de scroll em <html>, nao no <body> (evita o pulo de scroll);
       - Escape fecha; o icone e toggle.
     A versao antiga procurava data-framer-name*="Menu", mas o botao do template
     se chama "Meniu" (romeno), entao nunca casava e o menu ficava morto. */
  var NAV = ${JSON.stringify(cfg.navegacao)};

  function iniciarMenu() {
    /* O template tem uma variante de nav por breakpoint, cada uma com o seu
       botao, e so a do breakpoint ativo renderiza. Pegar so o primeiro pegava o
       do desktop, que fica oculto no mobile — por isso liga em todos. */
    var botoes = Array.prototype.slice.call(document.querySelectorAll(
      '[data-framer-name="Meniu"],[data-framer-name*="Menu"],[data-framer-name*="Burger"]'));
    if (!botoes.length || !NAV.length) return;

    var painel = null;
    var ultimoFoco = null;

    botoes.forEach(function (botao) {
      botao.setAttribute('role', 'button');
      botao.setAttribute('tabindex', '0');
      botao.setAttribute('aria-expanded', 'false');
      botao.setAttribute('aria-label', 'Abrir menu');
      botao.style.cursor = 'pointer';
    });

    /* Menu suspenso ancorado na barra, nao overlay de tela cheia.
       Fica preso embaixo da nav, alinhado com o proprio botao, e ocupa so o
       espaco dos links. O resto da pagina continua a vista. */
    function montar(botao) {
      var fixo = botao;
      while (fixo && getComputedStyle(fixo).position !== 'fixed') fixo = fixo.parentElement;
      var barra = fixo ? fixo.getBoundingClientRect() : { bottom: 64 };
      var bt = botao.getBoundingClientRect();

      var p = document.createElement('nav');
      p.className = 'mel-menu';
      p.setAttribute('aria-label', 'Navegacao principal');
      p.style.cssText = 'position:fixed;top:' + Math.round(barra.bottom) + 'px;'
        + 'left:' + Math.round(bt.left) + 'px;z-index:2147483000;'
        + 'display:flex;flex-direction:column;gap:.1rem;'
        + 'padding:.75rem 2.5rem .9rem 1rem;background:#221E17;'
        + 'border:1px solid rgba(251,247,238,.14);border-radius:6px;'
        + 'box-shadow:0 18px 40px -12px rgba(0,0,0,.7);'
        + 'opacity:0;transform:translateY(-6px);max-height:calc(100vh - '
        + Math.round(barra.bottom) + 'px - 1.5rem);overflow-y:auto';

      NAV.forEach(function (item) {
        var a = document.createElement('a');
        a.href = item.href;
        a.textContent = item.rotulo;
        a.style.cssText = 'display:block;padding:.42rem 0;color:#FBF7EE;text-decoration:none;'
          + 'font-family:"Area",sans-serif;font-weight:700;font-size:1.0625rem;'
          + 'line-height:1.3;letter-spacing:-.01em;white-space:nowrap';
        if (location.pathname === item.href) {
          a.style.color = '#F2A900';
          a.setAttribute('aria-current', 'page');
        }
        function acende() { a.style.color = '#F2A900'; }
        function apaga() { if (location.pathname !== item.href) a.style.color = '#FBF7EE'; }
        a.addEventListener('focus', acende);
        a.addEventListener('blur', apaga);
        a.addEventListener('mouseenter', acende);
        a.addEventListener('mouseleave', apaga);
        p.appendChild(a);
      });
      return p;
    }

    /* 0 -> 1 em 400ms. A curva do original nao e ease-out: e um S, com partida
       lenta. Medido no template (MOTION_SPEC.md, sec. 7):

         80ms  160ms  240ms  320ms  400ms
         0.066 0.344  0.677  0.955  1

       smoothstep (k*k*(3-2k)) da 0.104 / 0.352 / 0.648 / 0.896, que acompanha o
       S de perto. Um ease-out simples daria 0.488 aos 80ms — sete vezes claro
       demais no comeco, e a diferenca se ve. */
    function surgir(el, aoFim) {
      if (menosMovimento.matches) {
        el.style.opacity = '1'; el.style.transform = 'none';
        if (aoFim) aoFim();
        return;
      }
      var t0 = 0;
      function passo(t) {
        if (!t0) t0 = t;
        var k = Math.min((t - t0) / 400, 1);
        var s = k * k * (3 - 2 * k);
        el.style.opacity = String(s);
        el.style.transform = 'translateY(' + (-6 * (1 - s)).toFixed(2) + 'px)';
        if (k < 1) requestAnimationFrame(passo); else if (aoFim) aoFim();
      }
      requestAnimationFrame(passo);
    }

    function marcar(estado) {
      botoes.forEach(function (b) {
        b.setAttribute('aria-expanded', String(estado));
        b.setAttribute('aria-label', estado ? 'Fechar menu' : 'Abrir menu');
      });
    }

    /* ---- o hamburguer vira X ----
       O icone do template e um frame com tres filhos chamados "1", "2" e "3":
       barras de 14x2, 10x2 e 14x2. Para virar X, a de cima desce ate o centro e
       gira 45, a do meio some, a de baixo sobe e gira -45.

       Os deslocamentos sao MEDIDOS no proprio DOM, nao chutados: cada barra tem
       o seu offsetTop dentro do icone, e o alvo e o centro do icone. Assim
       funciona mesmo se o template mudar o espacamento. */
    function barrasDe(botao) {
      var icone = botao.querySelector('[data-framer-name="Icon"]') || botao;
      var bs = [];
      ['1', '2', '3'].forEach(function (n) {
        var el = icone.querySelector('[data-framer-name="' + n + '"]');
        if (el) bs.push(el);
      });
      if (bs.length !== 3) bs = Array.prototype.slice.call(icone.children, 0, 3);
      return { icone: icone, bs: bs };
    }

    function animarIcone(abrindo) {
      botoes.forEach(function (botao) {
        var alvo = barrasDe(botao);
        if (alvo.bs.length !== 3) return;
        var meio = alvo.icone.offsetHeight / 2;
        var deslocs = alvo.bs.map(function (b) { return meio - (b.offsetTop + b.offsetHeight / 2); });

        alvo.bs.forEach(function (b, i) {
          b.style.transformOrigin = '50% 50%';
          if (menosMovimento.matches) b.style.transition = 'none';
          else b.style.transition = 'transform 400ms cubic-bezier(.4,0,.2,1), opacity 400ms cubic-bezier(.4,0,.2,1)';
          if (!abrindo) { b.style.transform = ''; b.style.opacity = ''; return; }
          if (i === 1) { b.style.opacity = '0'; b.style.transform = 'scaleX(.2)'; return; }
          b.style.transform = 'translateY(' + deslocs[i].toFixed(1) + 'px) rotate('
            + (i === 0 ? 45 : -45) + 'deg)';
        });
      });
    }

    function alternar() {
      if (painel) {
        painel.remove();
        painel = null;
        marcar(false);
        animarIcone(false);
        if (ultimoFoco && ultimoFoco.focus) ultimoFoco.focus();
        return;
      }
      ultimoFoco = document.activeElement;
      // ancora no botao que foi clicado — cada breakpoint tem o seu
      var visivel = botoes.filter(function (b) { return b.offsetHeight > 0; })[0] || botoes[0];
      painel = montar(visivel);
      document.body.appendChild(painel);
      marcar(true);
      animarIcone(true);
      surgir(painel, function () {
        var primeiro = painel && painel.querySelector('a');
        if (primeiro) primeiro.focus();
      });
    }

    botoes.forEach(function (botao) {
      botao.addEventListener('click', alternar);
      botao.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); alternar(); }
      });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && painel) alternar();
    });

    /* Sem overlay cobrindo a tela, quem fecha ao clicar fora e este ouvinte.
       O clique no proprio botao ja e tratado pelo toggle, entao aqui ele e
       ignorado — senao abriria e fecharia no mesmo clique. */
    document.addEventListener('click', function (e) {
      if (!painel) return;
      if (painel.contains(e.target)) return;
      for (var i = 0; i < botoes.length; i++) {
        if (botoes[i] === e.target || botoes[i].contains(e.target)) return;
      }
      alternar();
    }, true);

    /* A ancoragem e calculada na abertura; se a janela mudar de tamanho com o
       menu aberto, o menu fecha em vez de ficar solto no lugar errado. */
    window.addEventListener('resize', function () { if (painel) alternar(); });
  }

  /* ---------------- troca de filtro (LP Polen) ----------------
     Troca a foto sem recarregar, com crossfade. A imagem nova só entra depois
     de decodificar, senão pisca em branco no meio da transição. */
  function iniciarFiltros() {
    var alvo = document.querySelector('[data-mel-filtro-img]');
    var pills = Array.prototype.slice.call(document.querySelectorAll('[data-mel-filtro]'));
    var vivo = document.querySelector('[data-mel-filtro-vivo]');
    if (!alvo || !pills.length) return;

    pills.forEach(function (p) {
      p.addEventListener('click', function () {
        pills.forEach(function (o) { o.setAttribute('aria-selected', String(o === p)); });
        var src = p.getAttribute('data-src');
        var nome = p.textContent.trim();
        var pre = new Image();
        pre.onload = function () {
          alvo.classList.add('mel-trocando');
          setTimeout(function () {
            alvo.src = src;
            alvo.alt = 'A mesma foto com o filtro ' + nome;
            alvo.classList.remove('mel-trocando');
            if (vivo) vivo.textContent = 'Filtro ' + nome + ' aplicado';
          }, menosMovimento.matches ? 0 : 190);
        };
        pre.src = src;
      });

      /* setas navegam entre os filtros, como tablist manda */
      p.addEventListener('keydown', function (e) {
        var i = pills.indexOf(p), d = 0;
        if (e.key === 'ArrowRight') d = 1;
        else if (e.key === 'ArrowLeft') d = -1;
        else return;
        e.preventDefault();
        var n = pills[(i + d + pills.length) % pills.length];
        n.focus(); n.click();
      });
    });
  }

  /* ---------------- FAQ ---------------- */
  function iniciarFaq() {
    document.querySelectorAll('[data-mel-faq]').forEach(function (b) {
      b.addEventListener('click', function () {
        var aberto = b.getAttribute('aria-expanded') === 'true';
        var painel = document.getElementById(b.getAttribute('aria-controls'));
        b.setAttribute('aria-expanded', String(!aberto));
        if (painel) painel.hidden = aberto;
      });
    });
  }

  /* ---------------- sacola ----------------
     Guarda no localStorage e anuncia por aria-live. NAO simula pagamento: sem
     gateway integrado, o site nao afirma que a compra foi concluida. */
  function iniciarSacola() {
    var CHAVE = 'melcam:sacola';
    function ler() { try { return JSON.parse(localStorage.getItem(CHAVE)) || []; } catch (e) { return []; } }
    function gravar(v) { try { localStorage.setItem(CHAVE, JSON.stringify(v)); } catch (e) {} }

    var vivo = document.createElement('p');
    vivo.setAttribute('aria-live', 'polite');
    vivo.className = 'mel-sr';
    document.body.appendChild(vivo);

    function contar() {
      var n = ler().reduce(function (a, i) { return a + i.qtd; }, 0);
      document.querySelectorAll('[data-mel-contador]').forEach(function (e) { e.textContent = String(n); });
      return n;
    }

    /* preço por linha, vindo do config */
    var PRECOS = { Polen: 39900, Bee: 29900 };
    function centavos(nome) { return /^Bee/.test(nome) ? PRECOS.Bee : PRECOS.Polen; }
    function moeda(c) {
      return 'R$ ' + (c / 100).toFixed(2).replace('.', ',').replace(/\\B(?=(\\d{3})+(?!\\d))/, '.');
    }
    function foto(nome) {
      var slug = nome.toLowerCase().replace(/^bee\\s+/, '').replace(/^polen\\s+/, '');
      var mapa = { laranja: 'coral', preta: 'preto' };
      slug = mapa[slug] || slug;
      return /^Bee/.test(nome)
        ? '/melcam/img/bee/bee-catalogo-' + slug + '-frente.png'
        : '/melcam/img/polen/polen-' + slug + '.png';
    }

    /* ------- página da sacola ------- */
    function pintarSacola() {
      var lista = document.querySelector('[data-mel-sacola-itens]');
      if (!lista) return;
      var vazia = document.querySelector('[data-mel-sacola-vazia]');
      var cheia = document.querySelector('[data-mel-sacola-cheia]');
      var sub = document.querySelector('[data-mel-sacola-subtotal]');
      var itens = ler();

      if (vazia) vazia.hidden = itens.length > 0;
      if (cheia) cheia.hidden = itens.length === 0;

      lista.innerHTML = '';
      var total = 0;
      itens.forEach(function (it, idx) {
        var c = centavos(it.nome) * it.qtd;
        total += c;
        var li = document.createElement('li');
        li.className = 'mel-sac-item';
        li.innerHTML =
          '<img src="' + foto(it.nome) + '" alt="">' +
          '<div><p class="mel-sac-nome">' + it.nome + '</p>' +
          '<p class="mel-sac-preco">' + moeda(centavos(it.nome)) + ' cada</p></div>' +
          '<div class="mel-qtd">' +
          '<button type="button" data-menos="' + idx + '" aria-label="Diminuir quantidade de ' + it.nome + '">−</button>' +
          '<span>' + it.qtd + '</span>' +
          '<button type="button" data-mais="' + idx + '" aria-label="Aumentar quantidade de ' + it.nome + '">+</button>' +
          '</div>' +
          '<button type="button" class="mel-remover" data-remover="' + idx + '">Remover</button>';
        lista.appendChild(li);
      });
      if (sub) sub.textContent = moeda(total);
      contar();
    }

    document.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('[data-menos],[data-mais],[data-remover]') : null;
      if (!t) return;
      var s = ler(), i;
      if (t.hasAttribute('data-mais')) { i = +t.getAttribute('data-mais'); s[i].qtd++; }
      else if (t.hasAttribute('data-menos')) {
        i = +t.getAttribute('data-menos');
        s[i].qtd--; if (s[i].qtd < 1) s.splice(i, 1);
      } else {
        i = +t.getAttribute('data-remover');
        vivo.textContent = s[i].nome + ' removida da sacola.';
        s.splice(i, 1);
      }
      gravar(s); pintarSacola();
    });

    /* Checkout: NAO simula pagamento. Sem gateway, o site diz o que e. */
    var bt = document.querySelector('[data-mel-checkout]');
    if (bt) bt.addEventListener('click', function () {
      var msg = document.querySelector('[data-mel-checkout-msg]');
      if (msg) msg.innerHTML = '<strong>Checkout ainda não integrado.</strong> '
        + 'Nenhuma cobrança foi feita e nenhum pedido foi criado. '
        + 'O meio de pagamento está a decidir.';
    });

    pintarSacola();

    document.querySelectorAll('[data-mel-add]').forEach(function (b) {
      b.addEventListener('click', function () {
        var nome = b.getAttribute('data-mel-add');
        var s = ler();
        var achou = s.filter(function (i) { return i.nome === nome; })[0];
        if (achou) achou.qtd++; else s.push({ nome: nome, qtd: 1 });
        gravar(s);
        vivo.textContent = nome + ' adicionada à sacola. ' + contar() + ' na sacola.';
        pintarSacola();
      });
    });
    contar();
  }

  /* ---------------- aviso de lançamento (Acessórios) ----------------
     Sem backend, o site NAO afirma que o e-mail foi enviado. Guarda local e
     diz a verdade sobre o estado. */
  function iniciarAviso() {
    var form = document.querySelector('[data-mel-aviso]');
    if (!form) return;
    var msg = form.querySelector('[data-mel-aviso-msg]');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var campo = form.querySelector('input[type="email"]');
      var v = (campo.value || '').trim();
      if (!v || v.indexOf('@') < 1) {
        msg.textContent = 'Digite um e-mail válido.';
        campo.focus();
        return;
      }
      try {
        var fila = JSON.parse(localStorage.getItem('melcam:avisos') || '[]');
        if (fila.indexOf(v) < 0) fila.push(v);
        localStorage.setItem('melcam:avisos', JSON.stringify(fila));
      } catch (err) {}
      msg.textContent = 'Anotado neste navegador. O cadastro ainda não tem '
        + 'servidor, então o e-mail não foi enviado a ninguém.';
      campo.value = '';
    });
  }

  /* ---------------- reveal na entrada da seção ----------------
     O reveal do template morreu com a hidratação: só 1 dos 20 nós tinha
     entrada no JSON de appear. Aqui ele volta por IntersectionObserver,
     animando transform e opacity — nada que cause reflow. */
  function iniciarReveal() {
    /* .framer-dtlgl4 e a fileira. NAO usar [data-framer-name="Header"]: o
       <header> da pagina tem o mesmo nome e o reveal vazaria para tudo. */
    var alvos = document.querySelectorAll('.framer-dtlgl4 > div');
    if (!alvos.length) return;
    Array.prototype.forEach.call(alvos, function (el) { el.setAttribute('data-mel-reveal', ''); });

    if (menosMovimento.matches || !('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(alvos, function (el) { el.classList.add('mel-visivel'); });
      return;
    }
    var obs = new IntersectionObserver(function (ents) {
      ents.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('mel-visivel');
        obs.unobserve(e.target);           // anima uma vez só
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
    Array.prototype.forEach.call(alvos, function (el) { obs.observe(el); });

    /* Rede de seguranca: se por qualquer motivo o observer nao disparar, o
       conteudo nao pode ficar invisivel. Depois de 1,2s tudo aparece. */
    setTimeout(function () {
      Array.prototype.forEach.call(alvos, function (el) { el.classList.add('mel-visivel'); });
    }, 1200);
  }

  function iniciar() {
    document.querySelectorAll('[data-mel="carrossel"]').forEach(iniciarCarrossel);
    iniciarReveal();
    iniciarFiltros();
    iniciarFaq();
    iniciarSacola();
    iniciarAviso();
    document.querySelectorAll('[data-framer-name="Our products"]').forEach(iniciarTicker);
    iniciarMenu();
    iniciarNavRetratil();

    /* O vídeo pode ser bloqueado pelo navegador: nesse caso fica o poster,
       que o atributo já garante. Com reduced-motion nem tenta tocar. */
    document.querySelectorAll('video[data-mel="hero-video"]').forEach(function (v) {
      if (menosMovimento.matches) { v.pause(); return; }
      var p = v.play();
      if (p && p.catch) p.catch(function () { /* poster assume */ });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
`;
}

// ------------------------------------------------------------------ aplica
function aplicar(walk) {
  fs.writeFileSync(path.join(SITE, 'melcam', 'interacoes.js'), js(), 'utf8');
  fs.appendFileSync(path.join(SITE, 'melcam', 'identidade.css'), css(), 'utf8');

  let n = { video: 0, carrossel: 0, script: 0 };
  for (const f of walk) {
    const rel = path.relative(SITE, f);
    if (rel.startsWith('melcam' + path.sep) || rel.startsWith('tools' + path.sep)) continue;
    if (!/index\.html$/i.test(f)) continue;
    let s = fs.readFileSync(f, 'utf8');

    // Vídeo no lugar da fileira de 10 imagens editoriais.
    //
    // A "Header Section" tem dois filhos: "Hero" (badge + headline) e "Header"
    // (a fileira de imagens a 80vh). Colocar o vídeo como fundo da seção
    // inteira o jogava atrás dos dois — foi o erro da primeira tentativa.
    // O lugar certo é o da fileira: mesma banda visual, mesmo 80vh, mesmo
    // raio de 4px. Troca a colagem de moda pelo vídeo da marca sem mexer no
    // ritmo da composição.
    s = trocarVideo(s, n);

    // carrossel: logo depois da seção do hero fechar, antes de "Header Grids"
    s = s.replace(/(<section[^>]*data-framer-name="Header Grids"[^>]*>)/, (m0) => {
      n.carrossel++; return carrossel() + m0;
    });

    if (!s.includes('/melcam/interacoes.js')) {
      s = s.replace(/<\/body>/i, '<script src="/melcam/interacoes.js" defer></script></body>');
      n.script++;
    }
    fs.writeFileSync(f, s, 'utf8');
  }
  return n;
}

// `js` sai exportado para dar para regerar só o interacoes.js, sem rodar o
// `aplicar` inteiro (que também mexe no HTML das páginas).
module.exports = { aplicar, js };
