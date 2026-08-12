(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------------------------------------------------
   * Header: transparent -> solid on scroll
   * ------------------------------------------------------------------- */
  function initHeader() {
    var header = document.querySelector(".site-header");
    if (!header || header.classList.contains("is-solid-always")) return;
    function onScroll() {
      if (window.scrollY > 40) header.classList.add("is-solid");
      else header.classList.remove("is-solid");
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------------------------------------------------------------------
   * Reveal on scroll (IntersectionObserver, once)
   * ------------------------------------------------------------------- */
  function initReveal() {
    var items = document.querySelectorAll(".reveal");
    if (!items.length) return;
    if (reduceMotion || !("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -60px 0px" }
    );
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------------------------------------------------------------------
   * Home hero background video — plays muted/looped behind the headline.
   * Autoplay is triggered from JS (rather than the HTML `autoplay`
   * attribute) so prefers-reduced-motion can be honored reliably: if we
   * relied on the attribute, the browser could start decoding/playing the
   * very moment the <video> tag is parsed, before this script ever runs,
   * making it impossible to guarantee reduced-motion users only ever see
   * the poster frame. Calling play() here (script runs immediately after
   * the full page parses, since it's the last tag in <body>) is visually
   * indistinguishable from native autoplay for everyone else.
   * ------------------------------------------------------------------- */
  function initHeroVideo() {
    var video = document.getElementById("hero-video");
    if (!video) return;
    if (reduceMotion) return; // leave paused — poster image stays visible
    var playPromise = video.play();
    if (playPromise && playPromise.catch) playPromise.catch(function () { /* autoplay blocked — poster stays visible */ });
  }

  /* ---------------------------------------------------------------------
   * Carousel (banner rolável) - scroll-snap track + autoplay + dots
   * ------------------------------------------------------------------- */
  function initCarousels() {
    document.querySelectorAll(".banner-carousel").forEach(function (root) {
      var track = root.querySelector(".carousel-track");
      var slides = Array.prototype.slice.call(root.querySelectorAll(".carousel-slide"));
      var dotsWrap = root.querySelector(".carousel-dots");
      var prevBtn = root.querySelector(".carousel-arrow.prev");
      var nextBtn = root.querySelector(".carousel-arrow.next");
      if (!track || slides.length < 2) return;

      var dots = [];
      if (dotsWrap) {
        slides.forEach(function (_, i) {
          var d = document.createElement("button");
          d.className = "carousel-dot" + (i === 0 ? " is-active" : "");
          d.type = "button";
          d.setAttribute("aria-label", "Ir para slide " + (i + 1));
          d.addEventListener("click", function () { goTo(i); });
          dotsWrap.appendChild(d);
          dots.push(d);
        });
      }

      var current = 0;
      var timer = null;
      var AUTOPLAY_MS = 6000;

      function goTo(i) {
        current = (i + slides.length) % slides.length;
        track.scrollTo({ left: slides[current].offsetLeft, behavior: reduceMotion ? "auto" : "smooth" });
        updateDots();
      }
      function updateDots() {
        dots.forEach(function (d, i) { d.classList.toggle("is-active", i === current); });
      }
      function next() { goTo(current + 1); }
      function prev() { goTo(current - 1); }

      if (nextBtn) nextBtn.addEventListener("click", function () { next(); restart(); });
      if (prevBtn) prevBtn.addEventListener("click", function () { prev(); restart(); });

      function play() {
        if (reduceMotion) return;
        stop();
        timer = window.setInterval(next, AUTOPLAY_MS);
      }
      function stop() { if (timer) { window.clearInterval(timer); timer = null; } }
      function restart() { stop(); play(); }

      root.addEventListener("mouseenter", stop);
      root.addEventListener("mouseleave", play);
      root.addEventListener("focusin", stop);
      root.addEventListener("focusout", play);

      // keep dots synced when user drags/swipes the track manually
      var scrollTimeout;
      track.addEventListener("scroll", function () {
        window.clearTimeout(scrollTimeout);
        scrollTimeout = window.setTimeout(function () {
          var idx = Math.round(track.scrollLeft / track.clientWidth);
          current = Math.max(0, Math.min(slides.length - 1, idx));
          updateDots();
        }, 120);
      }, { passive: true });

      play();
    });
  }

  /* ---------------------------------------------------------------------
   * Swatch color switcher (Polen #modelos / Bee #modelos)
   * Markup contract:
   *   <div class="models-photo"> <img data-color="amarela" class="is-active"> ... </div>
   *   <div class="swatches"> <button class="swatch" data-color="amarela" style="--sw-color:#F2A900"> ... </div>
   *   elements with [data-fill="name"], [data-fill="price"], [data-fill="installment"]
   * ------------------------------------------------------------------- */
  function initSwatches() {
    document.querySelectorAll("[data-swatch-group]").forEach(function (group) {
      var groupId = group.getAttribute("data-swatch-group");
      var photoWrap = document.querySelector('.models-photo[data-swatch-target="' + groupId + '"]');
      var nameEl = document.querySelector('[data-fill="name"][data-swatch-target="' + groupId + '"]');
      var subtitleEl = document.querySelector('[data-fill="subtitle"][data-swatch-target="' + groupId + '"]');
      var priceEl = document.querySelector('[data-fill="price"][data-swatch-target="' + groupId + '"]');
      var installEl = document.querySelector('[data-fill="installment"][data-swatch-target="' + groupId + '"]');
      if (!photoWrap) return;
      var imgs = photoWrap.querySelectorAll("img");
      var swatches = group.querySelectorAll(".swatch");

      swatches.forEach(function (sw) {
        sw.addEventListener("click", function () {
          var color = sw.getAttribute("data-color");
          swatches.forEach(function (s) { s.classList.toggle("is-active", s === sw); });
          imgs.forEach(function (img) {
            img.classList.toggle("is-active", img.getAttribute("data-color") === color);
          });
          if (nameEl) nameEl.textContent = sw.getAttribute("data-name") || "";
          if (subtitleEl && sw.getAttribute("data-subtitle")) subtitleEl.textContent = sw.getAttribute("data-subtitle");
          if (priceEl && sw.getAttribute("data-price")) priceEl.textContent = sw.getAttribute("data-price");
          if (installEl && sw.getAttribute("data-installment")) installEl.textContent = sw.getAttribute("data-installment");
          // A copy override (edited by the brand owner in edit mode) always wins
          // over the dynamic swap driven by which color swatch is selected.
          if (nameEl) reapplyCopyOverride(nameEl);
          if (subtitleEl) reapplyCopyOverride(subtitleEl);
          if (priceEl) reapplyCopyOverride(priceEl);
          if (installEl) reapplyCopyOverride(installEl);
        });
      });
    });
  }

  /* ---------------------------------------------------------------------
   * Filter pills (Polen "Uma foto. Vários filmes.")
   * ------------------------------------------------------------------- */
  function initFilterPills() {
    document.querySelectorAll(".filters-demo").forEach(function (root) {
      var img = root.querySelector(".filters-photo-wrap img");
      var pills = root.querySelectorAll(".filter-pill");
      if (!img || !pills.length) return;
      pills.forEach(function (pill) {
        pill.addEventListener("click", function () {
          pills.forEach(function (p) { p.classList.toggle("is-active", p === pill); });
          // Two supported mechanics: swap to a real photo shot with that
          // filter (data-filter-img — used when the same reference photo
          // exists across all filters), or fall back to a CSS filter()
          // applied on top of a single demo photo (data-filter-class).
          var imgSrc = pill.getAttribute("data-filter-img");
          if (imgSrc) {
            img.className = "";
            img.src = imgSrc;
          } else {
            img.className = "";
            img.classList.add(pill.getAttribute("data-filter-class"));
          }
        });
      });
    });
  }

  /* ---------------------------------------------------------------------
   * Polen hero "Memória cheia" — plays once on load, replay button resets it.
   * Sequence (timings in ms):
   *  0    - polaroids float in, phone frame visible
   *  200  - counter animates 0 -> 10000
   *  1400 - counter settles, sub caption fades in
   *  2600 - phone starts to shake/glitch
   *  3100 - crossfade/rotate into camera packshot
   *  3900 - final headline + CTA appear
   * ------------------------------------------------------------------- */
  function initPolenHero() {
    var root = document.getElementById("polen-hero");
    if (!root) return;
    var counter = root.querySelector("[data-counter]");
    var replayBtn = root.querySelector(".replay-btn");
    var timers = [];

    function clearTimers() { timers.forEach(window.clearTimeout); timers = []; }

    function animateCounter(duration) {
      if (!counter) return;
      var start = null;
      var target = 10000;
      function step(ts) {
        if (!start) start = ts;
        var p = Math.min(1, (ts - start) / duration);
        var eased = 1 - Math.pow(1 - p, 3);
        counter.textContent = Math.floor(eased * target).toLocaleString("pt-BR");
        if (p < 1) requestAnimationFrame(step);
        else counter.textContent = target.toLocaleString("pt-BR");
      }
      requestAnimationFrame(step);
    }

    function play() {
      clearTimers();
      root.classList.remove("is-glitching", "is-transformed", "is-final");
      root.classList.add("is-playing");
      if (counter) counter.textContent = "0";

      if (reduceMotion) {
        root.classList.add("is-transformed", "is-final");
        if (counter) counter.textContent = (10000).toLocaleString("pt-BR");
        return;
      }

      timers.push(window.setTimeout(function () { animateCounter(900); }, 250));
      timers.push(window.setTimeout(function () { root.classList.add("is-glitching"); }, 2500));
      timers.push(window.setTimeout(function () { root.classList.add("is-transformed"); }, 3050));
      timers.push(window.setTimeout(function () { root.classList.add("is-final"); }, 4300));
    }

    if (replayBtn) {
      replayBtn.addEventListener("click", play);
    }

    play();
  }

  /* ---------------------------------------------------------------------
   * Bee hero — Opção 1: pendulum swing + mid-arc color swap
   * ------------------------------------------------------------------- */
  function initBeePendulum() {
    var root = document.getElementById("bee-hero-1");
    if (!root) return;
    var replayBtn = root.querySelector(".replay-btn");
    var timers = [];

    function clearTimers() { timers.forEach(window.clearTimeout); timers = []; }

    function play() {
      clearTimers();
      root.classList.remove("is-swinging", "is-turning", "is-settled", "is-final");
      void root.offsetWidth; // force reflow to restart CSS animations

      if (reduceMotion) {
        root.classList.add("is-final", "is-settled");
        return;
      }

      root.classList.add("is-swinging");
      timers.push(window.setTimeout(function () { root.classList.add("is-turning"); }, 1500));
      timers.push(window.setTimeout(function () { root.classList.add("is-settled"); }, 2500));
      timers.push(window.setTimeout(function () { root.classList.add("is-final"); }, 3100));
    }

    if (replayBtn) replayBtn.addEventListener("click", play);
    play();
  }

  /* ---------------------------------------------------------------------
   * Bee hero — Opção 2: scroll-driven honey dive
   * ------------------------------------------------------------------- */
  function initBeeScroll() {
    var track = document.querySelector(".hero2-track");
    if (!track) return;
    var stage = track.querySelector(".hero2-stage");
    var honey = track.querySelector(".hero2-honey");
    var cam = track.querySelector(".hero2-cam");
    var camAmarela = track.querySelector(".hero2-cam-amarela");
    var camWrap = track.querySelector(".hero2-cam-wrap");
    var textSwapEl = track.querySelector(".hero2-text-swap");
    var part1 = track.querySelector(".hero2-part1");
    var part2 = track.querySelector(".hero2-part2");
    var bubbles = track.querySelector(".hero2-bubbles");
    if (!stage || !honey || !cam) return;

    if (reduceMotion) {
      track.style.height = "auto";
      stage.style.position = "relative";
      honey.style.height = "100%";
      cam.style.transform = "none";
      cam.style.opacity = "0";
      if (camAmarela) camAmarela.style.opacity = "1";
      if (part1) part1.style.opacity = "0";
      if (part2) part2.style.opacity = "1";
      if (bubbles) bubbles.style.opacity = "1";
      return;
    }

    var trackTop = 0;
    var trackHeight = 0;
    var winH = window.innerHeight;
    var maxDrop = 220;

    function cacheMetrics() {
      var rect = track.getBoundingClientRect();
      trackTop = rect.top + window.scrollY;
      trackHeight = track.offsetHeight;
      winH = window.innerHeight;

      // Recompute how far the camera can drop before it would ever touch the
      // headline text block — measured live (from the untransformed wrap, not
      // the img, which may already carry a translateY from a prior scroll
      // position) so it stays correct at any viewport size instead of
      // relying on a guessed constant.
      if (camWrap && textSwapEl) {
        var wrapRect = camWrap.getBoundingClientRect();
        var camHeight = cam.getBoundingClientRect().height;
        var textRect = textSwapEl.getBoundingClientRect();
        var safetyGap = 20;
        var available = textRect.top - (wrapRect.top + camHeight) - safetyGap;
        maxDrop = Math.max(0, Math.min(220, available));
      }
    }

    var ticking = false;
    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }

    function update() {
      ticking = false;
      var scrollY = window.scrollY;
      var start = trackTop;
      var end = trackTop + trackHeight - winH;
      var raw = (scrollY - start) / Math.max(1, end - start);
      var p = Math.max(0, Math.min(1, raw));

      // honey level rises 0 -> 100%
      honey.style.height = (p * 108) + "%";

      // camera descends, clamped so it never overlaps the headline area
      // (the .hero2-cam-wrap is already horizontally centered via CSS —
      // the img itself sits at left:0/width:100% inside it, so only a
      // vertical offset belongs here; adding translateX(-50%) here would
      // shift the camera a further half-width off-center)
      var camY = p * maxDrop;
      var camTransform = "translateY(" + camY.toFixed(1) + "px)";
      cam.style.transform = camTransform;
      if (camAmarela) camAmarela.style.transform = camTransform;

      // crossfade white -> amarela once past the honey surface (p ~0.42)
      var swap = Math.max(0, Math.min(1, (p - 0.38) / 0.14));
      cam.style.opacity = String(1 - swap);
      if (camAmarela) camAmarela.style.opacity = String(swap);

      // text swap
      var textSwap = Math.max(0, Math.min(1, (p - 0.55) / 0.18));
      if (part1) part1.style.opacity = String(1 - textSwap);
      if (part2) part2.style.opacity = String(textSwap);

      // bubbles appear when submerged
      if (bubbles) bubbles.style.opacity = String(Math.max(0, Math.min(1, (p - 0.6) / 0.3)));

      track.classList.toggle("is-submerged", p > 0.7);
    }

    cacheMetrics();
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", function () { cacheMetrics(); update(); });
  }

  /* ---------------------------------------------------------------------
   * Home — cards de produto (Bee | Polen)
   * O card inteiro navega para a LP (data-href), mas os dois links
   * internos ("Conheça" / "Ver modelos") mantêm hrefs próprios — um guard
   * em e.target.closest("a") evita que o clique neles também dispare a
   * navegação do card (equivalente a stopPropagation, sem exigir que cada
   * link chame preventDefault/stopPropagation individualmente).
   * isCopyEditOn() também é checado: com o modo de edição de textos ligado,
   * o título do card (h3, sem ser um <a>) precisa ser clicável só para
   * posicionar o cursor de edição — sem esse guard, o clique navegaria
   * para a LP antes de dar tempo de editar o texto (isCopyEditOn é
   * declarada mais abaixo neste mesmo arquivo, mas function declarations
   * são hoisted dentro da IIFE, então já está disponível aqui).
   * ------------------------------------------------------------------- */
  function initHomeProductCards() {
    document.querySelectorAll(".home-product-card[data-href]").forEach(function (card) {
      var href = card.getAttribute("data-href");
      card.setAttribute("role", "link");
      card.setAttribute("tabindex", "0");
      card.addEventListener("click", function (e) {
        if (isCopyEditOn() || e.target.closest("a")) return;
        window.location.href = href;
      });
      card.addEventListener("keydown", function (e) {
        if (isCopyEditOn() || e.target.closest("a")) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          window.location.href = href;
        }
      });
    });
  }

  /* ---------------------------------------------------------------------
   * Barra de produto fixa (CTA bar) — Polen / Bee / Bee2
   * Aparece deslizando abaixo do header assim que o visitante rola além do
   * hero da página. Markup contract: <div class="lp-cta-bar">...</div>
   * presente na página; o "fim do hero" é detectado a partir do primeiro
   * elemento de hero conhecido encontrado no DOM (cada LP só tem um).
   * ------------------------------------------------------------------- */
  function initLpCtaBar() {
    var bar = document.querySelector(".lp-cta-bar");
    if (!bar) return;

    var heroEl = document.querySelector(".hero2-track") ||
      document.getElementById("bee-hero-1") ||
      document.getElementById("polen-hero");
    if (!heroEl) return;

    var threshold = 0;
    function cacheThreshold() {
      var rect = heroEl.getBoundingClientRect();
      threshold = rect.bottom + window.scrollY;
    }

    var ticking = false;
    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }
    function update() {
      ticking = false;
      bar.classList.toggle("is-visible", window.scrollY > threshold - 4);
    }

    cacheThreshold();
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", function () { cacheThreshold(); update(); });
  }

  /* ---------------------------------------------------------------------
   * MODO DE EDIÇÃO DE TEXTOS
   * Compartilhado entre as 4 páginas via [data-copy="pagina.secao.campo"].
   *
   * localStorage:
   *   melcam-copy-originals -> { id: "texto original" }  (gravado 1x por id)
   *   melcam-copy-overrides -> { id: "texto editado" }   (gravado a cada input)
   *
   * COPY_MANIFEST é o catálogo completo (todas as páginas, mesmo as que não
   * estão carregadas agora) usado para: (a) exportar o copy deck inteiro em
   * qualquer página, e (b) servir de fallback de "original" para ids que o
   * navegador ainda não viu ao vivo nesta máquina.
   * ------------------------------------------------------------------- */
  var COPY_ORIGINALS_KEY = "melcam-copy-originals";
  var COPY_OVERRIDES_KEY = "melcam-copy-overrides";

  var COPY_MANIFEST = [
    { section: "Compartilhado — Navegação", ids: [
      { id: "nav.home", original: "Home" },
      { id: "nav.polen", original: "Polen" },
      { id: "nav.bee", original: "Bee" },
      { id: "nav.acessorios", original: "Acessórios" },
      { id: "nav.sobre", original: "Sobre Nós" }
    ]},
    { section: "Home", ids: [
      { id: "home.hero.badge", original: "Novo" },
      { id: "home.hero.headline", original: "Chegou a Bee" },
      { id: "home.hero.sub", original: "A câmera que vive com você." },
      { id: "home.hero.cta-bee", original: "Conhecer a Bee" },
      { id: "home.hero.cta-polen", original: "escolher modelo" },
      { id: "home.hero.scroll", original: "Role" },
      { id: "home.bloco-bee.titulo", original: "Bee" },
      { id: "home.bloco-bee.link-conheca", original: "Conheça" },
      { id: "home.bloco-bee.link-modelos", original: "Ver modelos" },
      { id: "home.bloco-polen.titulo", original: "Polen" },
      { id: "home.bloco-polen.link-conheca", original: "Conheça" },
      { id: "home.bloco-polen.link-modelos", original: "Ver modelos" },
      { id: "home.carrossel.bee.eyebrow", original: "Bee" },
      { id: "home.carrossel.bee.titulo", original: "Conheça a Bee" },
      { id: "home.carrossel.bee.cta", original: "Conhecer a Bee" },
      { id: "home.carrossel.polen.eyebrow", original: "Polen" },
      { id: "home.carrossel.polen.titulo", original: "Conheça a Polen" },
      { id: "home.carrossel.polen.cta", original: "Conhecer a Polen" },
      { id: "home.carrossel.parcelamento.eyebrow", original: "Pagamento" },
      { id: "home.carrossel.parcelamento.titulo", original: "Todo o site em até 3x sem juros" },
      { id: "home.carrossel.parcelamento.cta", original: "escolher modelo" },
      { id: "home.comunidade.eyebrow", original: "Por onde a Melcam passou" },
      { id: "home.comunidade.titulo", original: "Memórias da Colméia" },
      { id: "home.comunidade.legenda-1", original: "@nina.retro · Lisboa, Portugal" },
      { id: "home.comunidade.legenda-2", original: "@joaocam · Litoral da Bahia" },
      { id: "home.comunidade.legenda-3", original: "@marinaviagem · Rio de Janeiro" },
      { id: "home.comunidade.legenda-4", original: "@tuca.foto · Barcelona, Espanha" },
      { id: "home.comunidade.legenda-5", original: "@bebeldias · Igreja do Bonfim, Salvador" },
      { id: "home.comunidade.legenda-6", original: "@rochedomar · Edimburgo, Escócia" },
      { id: "home.comunidade.legenda-7", original: "@turmadapraia · Niterói, RJ" },
      { id: "home.comunidade.legenda-8", original: "@dupladeroteiro · Baía de Paraty" },
      { id: "home.comunidade.tag-line", original: "Marque @melcam para aparecer aqui." },
      { id: "home.clipes.eyebrow", original: "conteúdo em vídeo" },
      { id: "home.clipes.titulo", original: "Clipes" },
      { id: "home.clipes.label-1", original: "Clipe — conteúdo da marca" },
      { id: "home.clipes.label-2", original: "Clipe — conteúdo da marca" },
      { id: "home.trust.garantia", original: "Garantia de 90 dias" },
      { id: "home.trust.suporte", original: "Suporte humanizado via WhatsApp" },
      { id: "home.trust.trocas", original: "7 dias para trocar ou devolver" },
      { id: "home.trust.pagamento", original: "Pagamento 100% seguro" }
    ]},
    { section: "LP Polen", ids: [
      { id: "polen.hero.titulo", original: "Memória cheia" },
      { id: "polen.hero.alerta-prefixo", original: "Seu celular possui" },
      { id: "polen.hero.alerta-sufixo", original: "fotos." },
      { id: "polen.hero.alerta-sub", original: "Quantas realmente importam?" },
      { id: "polen.hero.fake-btn-gerenciar", original: "Gerenciar" },
      { id: "polen.hero.fake-btn-ok", original: "OK" },
      { id: "polen.hero.replay", original: "Replay" },
      { id: "polen.hero.headline-final", original: "A Polen guarda as que importam." },
      { id: "polen.hero.cta", original: "Comprar" },
      { id: "polen.modelos.eyebrow-cores", original: "7 cores" },
      { id: "polen.modelos.titulo", original: "Escolha sua Polen" },
      { id: "polen.modelos.eyebrow-produto", original: "Polen" },
      { id: "polen.modelos.nome", original: "Amarela" },
      { id: "polen.modelos.subtitulo", original: "Vibrante por essência." },
      { id: "polen.modelos.preco", original: "R$ 399,00" },
      { id: "polen.modelos.parcelamento", original: "ou 3x sem juros ou 12x de R$ 33,33" },
      { id: "polen.modelos.cta", original: "Adicionar à sacola" },
      { id: "polen.modelos.nota", original: "Envio para todo o Brasil · Cabo USB-C e cartão SD inclusos" },
      { id: "polen.beneficios.item-1", original: "Sem telas, sem distrações — apenas o momento." },
      { id: "polen.beneficios.item-2", original: "8 opções de filtro direto na câmera" },
      { id: "polen.beneficios.item-3", original: "12 Megapixels" },
      { id: "polen.beneficios.item-4", original: "USB-C pra carregar e transferir" },
      { id: "polen.beneficios.item-5", original: "Flash LED integrado" },
      { id: "polen.beneficios.item-6", original: "MicroSD 4GB incluso" },
      { id: "polen.beneficios.item-7", original: "Até 3x sem juros em todo o site" },
      { id: "polen.galeria.eyebrow", original: "Feitas com a Polen" },
      { id: "polen.galeria.titulo", original: "Fotos reais, sem edição nenhuma" },
      { id: "polen.filtros.eyebrow", original: "experimente seu filtro favorito" },
      { id: "polen.filtros.titulo", original: "Uma foto. 8 filtros" },
      { id: "polen.filtros.pill-retro", original: "Retro" },
      { id: "polen.filtros.pill-mono", original: "Mono" },
      { id: "polen.filtros.pill-natural", original: "Natural" },
      { id: "polen.filtros.pill-polar", original: "Polar" },
      { id: "polen.filtros.pill-vintage", original: "Vintage" },
      { id: "polen.filtros.pill-filmic", original: "Filmic" },
      { id: "polen.filtros.pill-noir", original: "Noir" },
      { id: "polen.filtros.pill-boost", original: "Boost" },
      { id: "polen.filtros.legenda", original: "Filtros aplicados na hora do clique, direto na câmera." },
      { id: "polen.diferencial.eyebrow", original: "o diferencial" },
      { id: "polen.diferencial.titulo", original: "Analógica por fora, digital por dentro" },
      { id: "polen.diferencial.item-1", original: "Experiência analógica real, sem tela, sem distrações" },
      { id: "polen.diferencial.item-2", original: "Bateria recarregável para até 1000 fotos (depende do uso do flash)" },
      { id: "polen.diferencial.item-3", original: "Tamanho de bolso: 11,4 × 6,4 × 2,5 cm" },
      { id: "polen.diferencial.item-4", original: "Flash LED integrado" },
      { id: "polen.diferencial.item-5", original: "Resolução 12MP" },
      { id: "polen.diferencial.item-6", original: "Cartão de 4GB armazena até 1000 fotos" },
      { id: "polen.diferencial.item-7", original: "Carregamento rápido e transferência via USB-C" },
      { id: "polen.diferencial.item-8", original: "8 filtros de cor customizados com estética Vintage" },
      { id: "polen.faq.titulo", original: "Perguntas frequentes" },
      { id: "polen.faq.p1-pergunta", original: "A câmera tem tela?" },
      { id: "polen.faq.p1-resposta", original: "Não — a experiência é analógica; as fotos ficam no cartão." },
      { id: "polen.faq.p2-pergunta", original: "Como vejo minhas fotos?" },
      { id: "polen.faq.p2-resposta", original: "As imagens são salvas em JPEG, prontas para visualizar e compartilhar (via USB-C ou cartão)." },
      { id: "polen.faq.p3-pergunta", original: "Quantas fotos cabem no cartão?" },
      { id: "polen.faq.p3-resposta", original: "Aproximadamente 1000 fotos; suporta MicroSD até 32GB." },
      { id: "polen.faq.p4-pergunta", original: "A bateria dura quanto?" },
      { id: "polen.faq.p4-resposta", original: "Até 1000 fotos por carga dependendo do uso do flash; recarrega via USB-C." },
      { id: "polen.faq.p5-pergunta", original: "Os filtros são digitais?" },
      { id: "polen.faq.p5-resposta", original: "São ajustáveis direto na câmera, pelo seletor físico, antes da foto — sem app, sem edição." },
      { id: "polen.faq.p6-pergunta", original: "Enviam para todo o Brasil?" },
      { id: "polen.faq.p6-resposta", original: "Sim, via Correios (PAC e Sedex) e Jadlog." },
      { id: "polen.faq.p7-pergunta", original: "Qual a garantia?" },
      { id: "polen.faq.p7-resposta", original: "7 dias de devolução por arrependimento e 90 dias de garantia legal para defeito de fabricação." },
      { id: "polen.ctafinal.titulo", original: "A última foto que você tirou valeu a pena?" },
      { id: "polen.ctafinal.texto", original: "Largue o celular, pegue sua Polen e redescubra o que é fotografar com intenção." },
      { id: "polen.ctafinal.cta", original: "Quero minha Polen" },
      { id: "polen.ctabar.nome", original: "Polen" },
      { id: "polen.ctabar.anchor-modelos", original: "Modelos" },
      { id: "polen.ctabar.anchor-filtros", original: "Filtros" },
      { id: "polen.ctabar.anchor-faq", original: "FAQ" },
      { id: "polen.ctabar.preco", original: "R$ 399,00" },
      { id: "polen.ctabar.cta", original: "Comprar" }
    ]},
    { section: "LP Bee (Opção 1 e Opção 2 — bee.html / bee2.html)", ids: [
      { id: "bee.hero.parte1", original: "Antes do mel,\né só uma câmera." },
      { id: "bee.hero.parte2-titulo", original: "Depois do mel,\né Bee." },
      { id: "bee.hero.parte2-sub", original: "A mini câmera-chaveiro que vai com você." },
      { id: "bee.hero.cta", original: "Comprar" },
      { id: "bee.hero1.replay", original: "Replay" },
      { id: "bee.modelos.eyebrow-cores", original: "2 cores" },
      { id: "bee.modelos.titulo", original: "Escolha sua Bee" },
      { id: "bee.modelos.amarela.nome", original: "Bee Amarela" },
      { id: "bee.modelos.amarela.preco", original: "R$ 299,00" },
      { id: "bee.modelos.amarela.parcelamento", original: "ou 12x de R$ 24,92" },
      { id: "bee.modelos.amarela.cta", original: "Adicionar à sacola" },
      { id: "bee.modelos.branca.nome", original: "Bee Branca" },
      { id: "bee.modelos.branca.preco", original: "R$ 299,00" },
      { id: "bee.modelos.branca.parcelamento", original: "ou 12x de R$ 24,92" },
      { id: "bee.modelos.branca.cta", original: "Adicionar à sacola" },
      { id: "bee.modelos.nota", original: "Envio em 24h · Cabo USB-C incluso" },
      { id: "bee.ctabar.nome", original: "Bee" },
      { id: "bee.ctabar.anchor-modelos", original: "Modelos" },
      { id: "bee.ctabar.anchor-destaques", original: "Destaques" },
      { id: "bee.ctabar.preco", original: "R$ 299,00" },
      { id: "bee.ctabar.cta", original: "Comprar" },
      { id: "bee.inclusos.eyebrow", original: "Inclusos" },
      { id: "bee.inclusos.titulo", original: "O que vem na caixa" },
      { id: "bee.inclusos.texto", original: "Sua Bee chega pronta pra pendurar na chave, na mochila ou no pescoço — é só tirar da caixa e sair fotografando." },
      { id: "bee.tela.eyebrow", original: "Tela embutida" },
      { id: "bee.tela.titulo", original: "Tela para rever na hora" },
      { id: "bee.tela.texto", original: "Mesmo pequena, a Bee tem uma telinha para conferir o clique na hora — sem precisar tirar o cartão ou esperar chegar em casa." },
      { id: "bee.sempre.eyebrow", original: "Sempre com você" },
      { id: "bee.sempre.titulo", original: "Cabe em qualquer história" },
      { id: "bee.sempre.texto", original: "Do tamanho de um chaveiro, mas com a alma retrô da Melcam. A Bee vai onde você for — pronta pro registro inesperado." }
    ]},
    { section: "Compartilhado — Colméia (Polen + Bee)", ids: [
      { id: "colmeia.eyebrow", original: "o clube da marca" },
      { id: "colmeia.titulo", original: "Entre para a Colméia" },
      { id: "colmeia.texto", original: "Acesso antecipado a lançamentos, encontros exclusivos com a comunidade e desafios fotográficos mensais para quem vive fotografando com a Melcam." },
      { id: "colmeia.perk1", original: "Acesso antecipado" },
      { id: "colmeia.perk2", original: "Encontros exclusivos" },
      { id: "colmeia.perk3", original: "Desafios mensais" },
      { id: "colmeia.cta", original: "Quero entrar na Colméia" }
    ]},
    { section: "Compartilhado — Footer", ids: [
      { id: "footer.tagline", original: "Câmeras digitais retrô com filtros vintage embutidos. Analógica por fora, digital por dentro." },
      { id: "footer.produtos.titulo", original: "Produtos" },
      { id: "footer.produtos.bee", original: "Bee" },
      { id: "footer.produtos.polen", original: "Polen" },
      { id: "footer.produtos.acessorios", original: "Acessórios" },
      { id: "footer.ajuda.titulo", original: "Ajuda" },
      { id: "footer.ajuda.rastrear", original: "Rastrear pedido" },
      { id: "footer.ajuda.trocas", original: "Trocas e devoluções" },
      { id: "footer.ajuda.contato", original: "Fale conosco" },
      { id: "footer.institucional.titulo", original: "sobre nós" },
      { id: "footer.cnpj", original: "Melcam LTDA · CNPJ 00.000.000/0001-00 · São Paulo, SP — Brasil" },
      { id: "footer.privacidade", original: "Privacidade" },
      { id: "footer.termos", original: "Termos" }
    ]}
  ];

  function copyStorageGet(key) {
    try {
      var raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }
  function copyStorageSet(key, obj) {
    try { window.localStorage.setItem(key, JSON.stringify(obj)); } catch (e) { /* storage indisponível */ }
  }
  function manifestOriginal(id) {
    for (var s = 0; s < COPY_MANIFEST.length; s++) {
      var ids = COPY_MANIFEST[s].ids;
      for (var i = 0; i < ids.length; i++) {
        if (ids[i].id === id) return ids[i].original;
      }
    }
    return "";
  }

  // Reaplica o override salvo (se houver) sobre um elemento [data-copy] —
  // usado sempre que outro script (ex.: troca de cor do swatch) reescreve o
  // textContent de um campo marcado, para que o texto editado nunca seja
  // perdido por causa de uma interação da demo.
  function reapplyCopyOverride(el) {
    if (!el || !el.hasAttribute || !el.hasAttribute("data-copy")) return;
    var overrides = copyStorageGet(COPY_OVERRIDES_KEY);
    var id = el.getAttribute("data-copy");
    if (Object.prototype.hasOwnProperty.call(overrides, id)) {
      el.textContent = overrides[id];
    }
  }

  // 1) Captura o texto ORIGINAL de cada [data-copy] presente NESTA página,
  //    uma única vez por id (o HTML fonte nunca muda, então isso é seguro
  //    em toda carga de página, mesmo com overrides já aplicados depois).
  function initCopyOriginals() {
    var originals = copyStorageGet(COPY_ORIGINALS_KEY);
    var changed = false;
    document.querySelectorAll("[data-copy]").forEach(function (el) {
      var id = el.getAttribute("data-copy");
      if (!Object.prototype.hasOwnProperty.call(originals, id)) {
        originals[id] = el.textContent;
        changed = true;
      }
    });
    if (changed) copyStorageSet(COPY_ORIGINALS_KEY, originals);
  }

  // 2) Aplica overrides salvos a todo [data-copy] desta página — roda em
  //    todo page load, então as edições valem em todas as páginas e
  //    sobrevivem a refresh.
  function applyCopyOverrides() {
    var overrides = copyStorageGet(COPY_OVERRIDES_KEY);
    document.querySelectorAll("[data-copy]").forEach(function (el) {
      var id = el.getAttribute("data-copy");
      if (Object.prototype.hasOwnProperty.call(overrides, id)) {
        el.textContent = overrides[id];
      }
    });
  }

  function isCopyEditOn() {
    return document.body.classList.contains("copy-edit-on");
  }

  function setCopyEditOn(on, bar) {
    document.body.classList.toggle("copy-edit-on", on);
    document.querySelectorAll("[data-copy]").forEach(function (el) {
      el.setAttribute("contenteditable", on ? "true" : "false");
      if (!on) el.blur();
    });
    var toggleBtn = bar.querySelector(".copy-bar-toggle");
    if (toggleBtn) {
      toggleBtn.classList.toggle("is-active", on);
      toggleBtn.innerHTML = (on ? "✏️ Editando…" : "✏️ Editar textos");
    }
  }

  function buildCopyMarkdown() {
    var overrides = copyStorageGet(COPY_OVERRIDES_KEY);
    var originals = copyStorageGet(COPY_ORIGINALS_KEY);
    var now = new Date();
    var dateStr = now.toLocaleDateString("pt-BR") + " " + now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    var lines = [];
    lines.push("# Textos finais do site Melcam");
    lines.push("");
    lines.push("Gerado em " + dateStr + ".");
    lines.push("");
    lines.push("Textos finais do novo site Melcam — enviar ao designer junto com o pacote.");
    lines.push("");

    COPY_MANIFEST.forEach(function (group) {
      lines.push("## " + group.section);
      lines.push("");
      group.ids.forEach(function (entry) {
        var original = Object.prototype.hasOwnProperty.call(originals, entry.id) ? originals[entry.id] : entry.original;
        var hasOverride = Object.prototype.hasOwnProperty.call(overrides, entry.id);
        var finalText = hasOverride ? overrides[entry.id] : original;
        var edited = hasOverride && overrides[entry.id] !== original;
        var flat = String(finalText).replace(/\n/g, " ");
        lines.push("**" + entry.id + "** — \"" + flat + "\"" + (edited ? " (editado)" : ""));
      });
      lines.push("");
    });

    lines.push("---");
    lines.push("");
    lines.push("Apêndice — objeto de overrides para reimportação automática:");
    lines.push("");
    lines.push("```json");
    lines.push(JSON.stringify(overrides, null, 2));
    lines.push("```");
    lines.push("");

    return lines.join("\n");
  }

  function exportCopyMarkdown() {
    var md = buildCopyMarkdown();
    var blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "melcam-textos-site.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function restoreCopyOriginals() {
    if (!window.confirm("Restaurar todos os textos do site para o original? As edições salvas serão apagadas em todas as páginas.")) return;
    copyStorageSet(COPY_OVERRIDES_KEY, {});
    var originals = copyStorageGet(COPY_ORIGINALS_KEY);
    document.querySelectorAll("[data-copy]").forEach(function (el) {
      var id = el.getAttribute("data-copy");
      var original = Object.prototype.hasOwnProperty.call(originals, id) ? originals[id] : manifestOriginal(id);
      el.textContent = original;
    });
  }

  function initCopyEditMode() {
    return; // desativado no pacote do designer
    // Ordem importa: primeiro captura os originais (texto puro do HTML),
    // só depois aplica overrides salvos por cima.
    initCopyOriginals();
    applyCopyOverrides();

    if (document.getElementById("melcam-copy-bar")) return;

    var bar = document.createElement("div");
    bar.id = "melcam-copy-bar";
    bar.innerHTML =
      '<button type="button" class="copy-bar-toggle is-toggle">✏️ Editar textos</button>' +
      '<button type="button" class="copy-bar-export">⬇️ Exportar textos</button>' +
      '<button type="button" class="copy-bar-restore">↺ Restaurar originais</button>' +
      '<span class="copy-bar-hint">Clique em qualquer texto para editar</span>';
    document.body.appendChild(bar);

    var toggleBtn = bar.querySelector(".copy-bar-toggle");
    var exportBtn = bar.querySelector(".copy-bar-export");
    var restoreBtn = bar.querySelector(".copy-bar-restore");

    toggleBtn.addEventListener("click", function () {
      // No mobile compacto, o primeiro toque expande a barra em vez de
      // ligar a edição direto, para o usuário ver as outras ações.
      if (window.innerWidth <= 640 && !bar.classList.contains("is-expanded")) {
        bar.classList.add("is-expanded");
        return;
      }
      setCopyEditOn(!isCopyEditOn(), bar);
    });
    exportBtn.addEventListener("click", exportCopyMarkdown);
    restoreBtn.addEventListener("click", function () { restoreCopyOriginals(); });

    // Salva a edição a cada input nos campos marcados.
    document.addEventListener("input", function (e) {
      var target = e.target;
      if (!isCopyEditOn() || !target || !target.hasAttribute || !target.hasAttribute("data-copy")) return;
      var overrides = copyStorageGet(COPY_OVERRIDES_KEY);
      overrides[target.getAttribute("data-copy")] = target.textContent;
      copyStorageSet(COPY_OVERRIDES_KEY, overrides);
    });

    // Enquanto a edição estiver ligada, cliques em links/botões que contêm
    // (ou são) um campo de copy não navegam — assim dá pra editar o texto
    // de um CTA sem sair da página. Outros controles (swatches, filtros,
    // setas do carrossel, seletor de animação da Bee) continuam funcionando.
    document.addEventListener("click", function (e) {
      if (!isCopyEditOn()) return;
      if (e.target.closest("#melcam-copy-bar")) return;
      var link = e.target.closest("a, button");
      if (!link) return;
      var hasCopy = (e.target.closest && e.target.closest("[data-copy]")) || link.querySelector("[data-copy]");
      if (hasCopy) e.preventDefault();
    }, true);
  }

  /* ---------------------------------------------------------------------
   * Boot
   * ------------------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", function () {
    initHeader();
    initHeroVideo();
    initReveal();
    initCarousels();
    initSwatches();
    initFilterPills();
    initPolenHero();
    initBeePendulum();
    initBeeScroll();
    initLpCtaBar();
    initHomeProductCards();
    initCopyEditMode();
  });
})();
