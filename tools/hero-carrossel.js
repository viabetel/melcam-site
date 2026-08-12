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

  /* ---------------- menu mobile ---------------- */
  function iniciarMenu() {
    var botoes = document.querySelectorAll('[data-framer-name*="Menu"],[data-framer-name*="Burger"],[data-framer-name*="Hamburger"]');
    var nav = document.querySelector('nav[data-framer-name*="Mobile"]');
    if (!botoes.length || !nav) return;
    var aberto = false;
    Array.prototype.forEach.call(botoes, function (b) {
      b.setAttribute('role', 'button');
      b.setAttribute('tabindex', '0');
      b.setAttribute('aria-expanded', 'false');
      b.addEventListener('click', function () {
        aberto = !aberto;
        b.setAttribute('aria-expanded', String(aberto));
        nav.classList.toggle('mel-menu-aberto', aberto);
      });
    });
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

module.exports = { aplicar };
