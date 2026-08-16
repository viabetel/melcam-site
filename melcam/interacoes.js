/* Interações MELCAM. A hidratação React do Framer está desligada
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
    /* "sobre" é o ponteiro em cima. O foco não precisa de variável: o próprio
       document.activeElement responde, e ele não mente sobre onde está. */
    var sobre = false;
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
      /* NÃO RE-ARMA ENQUANTO A PESSOA ESTÁ DENTRO — ponteiro em cima ou foco
         num dos controles.

         Sem esta linha o carrossel tinha um furo que só aparece operando: cada
         seta, dot e tecla termina chamando agendar(), e agendar() religava o
         timer mesmo com o foco dentro. Medido pelo qa-carrossel: com o foco no
         botão "seguinte", o banner pulou sozinho do slide 2 para o 0 seis
         segundos depois. Quem navega por teclado via o conteúdo trocar debaixo
         da própria mão — exatamente o que pausar no hover e no foco existe
         para impedir. Os listeners de mouseenter/focusin já paravam; o que
         faltava era o guarda no religamento. */
      if (sobre || raiz.contains(document.activeElement)) return;
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
    raiz.addEventListener('mouseenter', function () { sobre = true; parar(); });
    raiz.addEventListener('mouseleave', function () { sobre = false; agendar(); });
    raiz.addEventListener('focusin', parar);
    /* relatedTarget é para onde o foco FOI. Se ainda está dentro do carrossel,
       o foco só andou de um controle para o outro e não há nada a retomar —
       sem esta guarda, tabular entre as setas religaria o timer por um
       instante a cada salto. */
    raiz.addEventListener('focusout', function (e) {
      if (raiz.contains(e.relatedTarget)) return;
      agendar();
    });

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
    if (!lista) return;

    /* Nas internas o ticker vive dentro de [data-framer-name="Header Grids"],
       que passou a ser display:none em 13/08. Sem esta guarda ele media
       larguras de 0 e mantinha um requestAnimationFrame vivo movendo uma
       fileira que ninguem ve, em cinco paginas. offsetParent nulo e o teste
       barato de "nao esta sendo renderizado". */
    if (!raiz.offsetParent && raiz.style.position !== 'fixed') return;

    /* Os slots excedentes saem do FLUXO, nao so de vista.
       tools/grade.js esconde o <a> do slot que sobra (o catalogo tem 9 produtos
       para 10 posicoes no ticker) marcando-o com data-mel-excedente="1". Mas
       quem ocupa lugar na linha e o <li> em volta, e esse ficava. Medido em
       13/08/2026, identico nos tres breakpoints:

         <li> excedente: 252 x 0 px   -> altura zerada pelo <a>, largura inteira

       O que saia dai:
         1. um vao de 252px no fim de cada copia, invisivel mas ocupando lugar;
         2. o cloneNode(true) copiava o slot vazio junto, entao o vao aparecia
            duas vezes por ciclo, uma por copia (504px somados);
         3. o ciclo media 2720px em vez de 2448 — 272 deles de nada.

       O reinicio em si NAO saltava: medir() somava os mesmos 10 <li> que
       estavam no layout, entao a conta fechava e o clone caia no lugar certo.
       O defeito era o buraco viajando pela fileira, nao um tranco no loop.

       Escondemos o <li>, nao o removemos: o card la dentro e o unico elemento
       com data-framer-appear-id="zfsne5", e o MOTION_SPEC manda preservar essa
       estrutura. Quando o catalogo crescer, o slot esta no lugar.

       A marca e o data-mel-excedente, nunca a posicao: :nth-child(10) quebraria
       no dia em que entrar o decimo produto. */
    var itens = [];
    Array.prototype.forEach.call(lista.children, function (li) {
      if (li.querySelector('[data-mel-excedente="1"]')) {
        li.hidden = true;
        li.style.display = 'none';
        li.setAttribute('aria-hidden', 'true');
        return;
      }
      itens.push(li);
    });

    /* A limpeza acontece ANTES desta saida de proposito: com movimento
       reduzido nao ha clone nem animacao, mas o vao continuaria la. */
    if (!itens.length || menosMovimento.matches) return;

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

    /* ---------------- arrastar com o ponteiro ----------------
       ADITIVO. Nao mexe em aparencia, medida, espacamento, ritmo (40 px/s),
       sentido, links, hover, foco nem reduced-motion — com movimento reduzido
       a funcao ja saiu la em cima, entao nada disso existe. Nao ha indicacao
       visual nenhuma de que da para arrastar: a unica mudanca perceptivel
       acontece enquanto o gesto esta em curso.

       So MOUSE. Toque nao entra: quem arrasta com o dedo espera rolar a
       pagina, e sequestrar isso quebraria a rolagem vertical. Por isso
       tambem nao existe touch-action aqui — o comportamento no celular fica
       byte a byte o que era.

       O ponteiro escreve no MESMO x que a animacao usa. Nao ha segundo
       transform concorrente: durante o arrasto o passo() esta parado pelo
       flag arrastando, e quem pinta e o pointermove; ao soltar, o passo()
       retoma do x que ficou, entao nao ha salto nem volta.

       ATENCAO: nunca usar crase em comentario aqui — este JS mora dentro de
       um template literal e a crase fecha a string. Foi o que quebrou agora.

       LIMIAR de 6px separa clique de arrasto. Abaixo dele nada acontece e o
       link abre normal; acima, o clique daquele gesto — e so daquele — e
       engolido na fase de captura. */
    var LIMIAR = 6;
    var arrastando = false, apontando = false, idPonteiro = null;
    var xAoPegar = 0, telaAoPegar = 0, selecaoAntes = '';

    /* Traz x para dentro de UMA copia, em (-largura, 0]. O conteudo se repete
       a cada largura, entao qualquer x fora dessa faixa tem um equivalente
       exato dentro dela — e a mesma emenda que a animacao usa. Sem isso, o
       arrasto para a direita levaria x acima de 0 e apareceria borda vazia. */
    function normalizar() {
      if (largura <= 0) return;
      x = x % largura;
      if (x > 0) x -= largura;
    }

    /* Engole o clique nascido do arrasto, uma vez so. O timeout e a rede de
       seguranca para quando o gesto termina fora de um link e clique nenhum
       chega — senao o ouvinte ficaria armado e comeria o proximo clique bom. */
    function engolirClique(ev) {
      ev.preventDefault();
      ev.stopPropagation();
      lista.removeEventListener('click', engolirClique, true);
    }

    /* Imagem e link arrastam sozinhos no navegador, e o arrasto nativo
       roubaria o gesto. Desligar isso nao muda nada visualmente. */
    Array.prototype.forEach.call(lista.querySelectorAll('img, a'), function (n) {
      n.draggable = false;
    });

    lista.addEventListener('pointerdown', function (ev) {
      if (ev.pointerType !== 'mouse' || ev.button !== 0) return;
      apontando = true;
      arrastando = false;
      idPonteiro = ev.pointerId;
      telaAoPegar = ev.clientX;
      xAoPegar = x;
      /* Sem preventDefault aqui: ele mataria o foco e o clique do link. */
    });

    lista.addEventListener('pointermove', function (ev) {
      if (!apontando || ev.pointerId !== idPonteiro) return;
      var d = ev.clientX - telaAoPegar;
      if (!arrastando) {
        if (Math.abs(d) < LIMIAR) return;   // ainda pode virar clique
        arrastando = true;
        selecaoAntes = lista.style.userSelect;
        lista.style.userSelect = 'none';    // so durante o gesto
        if (lista.setPointerCapture) {
          try { lista.setPointerCapture(idPonteiro); } catch (e) { /* segue sem captura */ }
        }
      }
      x = xAoPegar + d;
      normalizar();
      lista.style.transform = 'translateX(' + x + 'px)';
    });

    function soltar(ev) {
      if (!apontando || (ev && ev.pointerId !== idPonteiro)) return;
      apontando = false;
      if (idPonteiro !== null && lista.releasePointerCapture &&
          lista.hasPointerCapture && lista.hasPointerCapture(idPonteiro)) {
        try { lista.releasePointerCapture(idPonteiro); } catch (e) { /* ja solto */ }
      }
      idPonteiro = null;
      if (arrastando) {
        lista.style.userSelect = selecaoAntes;
        lista.addEventListener('click', engolirClique, true);
        setTimeout(function () { lista.removeEventListener('click', engolirClique, true); }, 300);
      }
      arrastando = false;                   // libera o passo() do ponto atual
    }
    lista.addEventListener('pointerup', soltar);
    lista.addEventListener('pointercancel', soltar);

    function passo(t) {
      if (ultimo === null) ultimo = t;
      var dt = t - ultimo; ultimo = t;
      if (rodando && !arrastando && !document.hidden && largura > 0) {
        x -= (dt / 1000) * 40;            // 40 px/s, o ritmo do template
        if (-x >= largura) x += largura;
        lista.style.transform = 'translateX(' + x + 'px)';
      }
      requestAnimationFrame(passo);
    }
    requestAnimationFrame(passo);
  }

  /* ---------------- a mascara do rotulo dos botoes de mel ----------------
     O botao da AKI Capital (estudo do Norvin) troca a cor do texto ROLANDO
     dois rotulos empilhados dentro de uma mascara com overflow hidden: o de
     cima sobe e sai, o de baixo entra no lugar, na mesma curva e no mesmo
     tempo do preenchimento. E isso que faz a cor do texto virar sem passar por
     nenhum quadro ilegivel — uma transicao de "color" cruzaria o meio do
     caminho com o texto sumindo dentro do preenchimento.

     POR QUE EM JS, E NAO NO HTML DOS GERADORES. Estes botoes sao escritos por
     cinco arquivos diferentes (demais.js, bee.js, hero-home.js, bloco-bee.js,
     bloco-polen.js), e tres deles nao podem ser reexecutados sem efeito
     colateral. Envolver o rotulo aqui alcanca todos de uma vez, em toda pagina,
     e nao pede regeracao de HTML nenhum.

     DEGRADACAO HONESTA: sem JavaScript a mascara nao existe, e o CSS entao
     mantem o preenchimento num mel mais FUNDO, onde o rotulo em carvao
     continua legivel. O carvao cheio so entra quando a mascara existe — a
     regra e ":has(.mel-bt-mask)". Nenhum estado fica ilegivel nos dois casos.

     Idempotente: sai na porta se a mascara ja estiver montada.

     16/08/2026: a lista deixou de ser quatro e passou a seis. A varredura das 7
     rotas mediu o fundo de cada clicavel em repouso e sob hover, e achou dois
     botoes de rotulo que ficavam de fora do efeito:
       - .mel-sobre-cta, mel em repouso, na faixa Sobre da home;
       - .mel-bt-linha, a variante de contorno do mesmo componente .mel-bt, que
         vira mel no hover e aparece lado a lado com a .mel-bt-mel na /404.
     O terceiro achado, .mel-acesso-enviar, NAO entra aqui de proposito: ele
     nasce com o modal de conta, depois deste laco, e o modulo de perfil
     reescreve o rotulo dele em quatro pontos, o que apagaria a mascara no
     primeiro clique de aba. La so vale o preenchimento, pelo CSS. */
  function iniciarBotoesMel() {
    var alvos = document.querySelectorAll(
      '.mel-bt-mel, .mel-hh-cta-mel, .mel-bee-cta, .mel-polen-cta,'
      + ' .mel-sobre-cta, .mel-bt-linha');
    for (var i = 0; i < alvos.length; i++) {
      var b = alvos[i];
      if (b.querySelector('.mel-bt-mask')) continue;
      /* So rotulo de texto puro. Botao com icone, svg ou span proprio fica como
         esta: envolver o que ja tem estrutura quebraria o desenho dele. */
      if (b.children.length) continue;
      var txt = (b.textContent || '').trim();
      if (!txt) continue;

      var mask = document.createElement('span');
      mask.className = 'mel-bt-mask';
      var um = document.createElement('span');
      um.textContent = txt;
      var dois = document.createElement('span');
      dois.textContent = txt;
      /* O segundo e a mesma palavra: sem o aria-hidden o leitor de tela
         anunciaria o rotulo duas vezes. */
      dois.setAttribute('aria-hidden', 'true');
      mask.appendChild(um);
      mask.appendChild(dois);
      b.textContent = '';
      b.appendChild(mask);
    }
  }

  /* ---------------- nav some ao rolar, volta ao subir ----------------
     Pedido do cliente: rolou para baixo, a barra sai; voltou a subir, ela
     volta. O mouse chegando perto do topo tambem traz de volta.

     ⚠️ CORRIGIDO EM 15/08/2026 — o "volta ao subir" valia SO NO TOQUE.
     A condicao era "!temMouse && y < ultimoY", entao em qualquer maquina com
     mouse (hover:hover e pointer:fine) rolar para cima nao trazia a barra: o
     unico caminho de volta era passar o ponteiro nos 90px do topo. Era isso
     que o cliente relatou como "ela nao aparece quando scrollamos para cima"
     e como "a barra so aparece quando passo o mouse perto" — dois sintomas da
     mesma linha. Desktop e celular tinham comportamentos diferentes sem que
     nada no pedido pedisse essa diferenca.

     Agora a regra e uma so, para todo aparelho: subiu, aparece. O ponteiro
     perto do topo continua valendo onde existe ponteiro, mas como ATALHO a
     mais e nao como unico caminho de volta: ele serve a quem esta parado no
     meio da pagina e nao quer rolar so para alcancar o menu.

     Tres regras de seguranca em cima disso:
       - no topo da pagina (< 80px) a barra fica sempre visivel, senao a home
         abre sem navegacao;
       - com o menu aberto ela nao se esconde, senao o X sumia junto;
       - rolagem menor que o limiar nao conta. Sem isso o tremido de trackpad e
         a inercia do celular alternam mostrar/esconder no mesmo gesto, e a
         barra pisca. O limiar acumula: passos de 3px somam ate cruzar. */
  function iniciarNavRetratil() {
    var barra = document.querySelector('[data-framer-name="Meniu"]');
    while (barra && getComputedStyle(barra).position !== 'fixed') barra = barra.parentElement;
    if (!barra) return;

    var TOPO_SEGURO = 80;   // px de scroll em que a barra nunca some
    var PERTO = 90;         // px do topo da janela que contam como "mouse perto"
    var LIMIAR = 6;         // px de rolagem que separam intencao de tremido
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
      var d = y - ultimoY;
      if (y <= TOPO_SEGURO) mostrar();
      else if (d < -LIMIAR) mostrar();    // subiu: volta, em QUALQUER aparelho
      else if (d > LIMIAR) esconder();    // desceu: sai
      if (Math.abs(d) > LIMIAR) ultimoY = y;   // abaixo do limiar, ultimoY fica
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
  var NAV = [{"rotulo":"Home","href":"/"},{"rotulo":"Polen","href":"/polen"},{"rotulo":"Bee","href":"/bee"},{"rotulo":"Acessórios","href":"/acessorios"},{"rotulo":"Sobre Nós","href":"/sobre"}];

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
        + 'box-shadow:0 18px 40px -12px rgba(14,12,9,.7);'
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
      /* Avisa o menu de perfil, que mora 44px ao lado: dois paineis abertos ao
         mesmo tempo em 320px cobririam a tela inteira. Quem abre avisa; quem
         escuta fecha. */
      document.dispatchEvent(new CustomEvent('mel:fechar-menus', { detail: { quem: 'nav' } }));
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

    /* O outro lado do acordo: o menu de perfil abriu, este fecha. */
    document.addEventListener('mel:fechar-menus', function (e) {
      if (e.detail && e.detail.quem === 'nav') return;
      if (painel) alternar();
    });
  }

  /* iniciarFiltros() saiu em 14/08/2026 junto com o bloco "Uma foto. 8
     filtros" da LP Polen. Era o único consumidor de [data-mel-filtro]. Note
     que a tira de filtros da home é outra coisa: marca [data-mel-filtros], no
     plural, e não tem comportamento — é CSS. Seletor de atributo casa exato,
     então uma nunca respondeu pela outra. */

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
      /* O selo da navbar (iniciarPerfil) escuta isto. A sacola continua dona da
         chave e da conta; quem quiser mostrar o número se inscreve no evento em
         vez de reler o localStorage no seu proprio ritmo. */
      document.dispatchEvent(new CustomEvent('mel:sacola-mudou', { detail: { total: n } }));
      return n;
    }

    /* preço por linha, vindo do config */
    var PRECOS = { Polen: 39900, Bee: 29900 };
    function centavos(nome) { return /^Bee/.test(nome) ? PRECOS.Bee : PRECOS.Polen; }
    function moeda(c) {
      return 'R$ ' + (c / 100).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/, '.');
    }
    function foto(nome) {
      var slug = nome.toLowerCase().replace(/^bee\s+/, '').replace(/^polen\s+/, '');
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

  /* ---------------- fileira do Header: o transform ligado ao scroll --------
     Substitui o reveal por IntersectionObserver que existia aqui. Aquele
     animava os 10 FILHOS, um a um, com atraso escalonado — invencao nossa. O
     MOTION_SPEC (secao 3) e explicito: "sem rotacao, sem offset individual,
     sem movimento individual". Quem se move no template e o GRUPO inteiro, e
     o movimento e ligado ao scroll, nao disparado uma vez.

     O grupo estava congelado no estado inicial do export
     (transform: perspective(1200px) translateY(150px) scale(0.5) com
     opacity:1), porque quem o animava era o runtime React, desligado. Dai a
     fileira aparecer com metade do tamanho e parada. Aqui ele volta.

     A CURVA E MEDIDA, nao estimada. Fonte: medidas/medida-template.json —
     7 posicoes de scroll x 3 breakpoints no template publicado. O achado que
     resolve tudo: os tres breakpoints colapsam numa curva so quando o
     progresso e medido em ALTURAS DE JANELA que o topo do grupo ja subiu,
     contadas a partir da borda de baixo da janela:

       s = (alturaJanela - topoDoGrupoNaJanela) / alturaJanela

     Medido (s | escala | translateY), desktop/tablet/mobile lado a lado:
       0.107 0.130 0.104 | 0.500 0.500 0.500 | 150.0 150.0 150.0
       0.429 0.428 0.415 | 0.895 0.899 0.896 |  31.4  30.2  31.2
       0.751 0.727 0.724 | 0.989 0.990 0.989 |   3.2   3.1   3.2
       1.072 1.024 1.033 | 1.000 1.000 1.000 |   0.0   0.0   0.0

     Ajuste por minimos quadrados sobre esses 12 pontos: INICIO 0.13,
     FIM 1.40, expoente 6. RMS de 0.004 no progresso — erro maximo de 0.005
     na escala e 3px no translateY. Os parametros do ajuste estao abaixo
     como constantes nomeadas, para ficar claro o que e medicao e o que e
     ajuste.

     O topo do grupo e lido pela cadeia de offsetTop, nao por
     getBoundingClientRect: rect JA VEM com o transform aplicado, e o
     transform e o que estamos calculando — daria realimentacao, o grupo
     perseguindo a propria posicao. offsetTop e posicao de layout e ignora
     transform. Foi tambem o que fez as tres medicoes baterem entre si: nelas
     o topo usado e o do estado assentado, que e o de layout.

     DUAS COISAS A MAIS ANDAM COM O PROGRESSO DA PAGINA, nao com a entrada:

     1. O deslocamento HORIZONTAL. A fileira escorrega para a esquerda o
        tempo todo, e o total e uma constante: -1000px do topo ao rodape.
        Medido em motion-bruto-template.json, e o numero e exato e IDENTICO
        nos cinco viewports — -250 / -500 / -750 / -1000 em 25/50/75/100% de
        progresso, com erro de centesimo. Nao e derivado da largura da
        fileira nem da janela: e o parametro do efeito. Ele cabe na sobra:
        a fileira transborda ~1770px de cada lado no desktop e ~1300 no
        mobile, entao 1000px de arrasto nunca descobre a borda.
        Isso tinha passado despercebido na primeira leitura desta secao — a
        medicao e que pegou.

     2. A opacidade NAO para quando a geometria chega: assenta perto de 0,89
        e continua subindo devagar ate 1 no rodape. Conferido nas duas
        campanhas de medicao, que concordam nisso apesar de terem rodado em
        paginas de altura diferente. */
  var FILEIRA_INICIO = 0.13;   // s em que sai do estado inicial (ajustado)
  var FILEIRA_FIM    = 1.40;   // s em que chega ao final (ajustado)
  var FILEIRA_EXP    = 6;      // expoente da desaceleracao (ajustado)
  var FILEIRA_ESCALA_INICIAL = 0.5;    // MEDIDO, identico nos 5 viewports
  var FILEIRA_Y_INICIAL      = 150;    // MEDIDO, em px, identico nos 5
  var FILEIRA_X_TOTAL        = 1000;   // MEDIDO, em px, identico nos 5
  var FILEIRA_OP_GEOMETRIA   = 0.889;  // parte da opacidade que a entrada entrega
  var FILEIRA_OP_PAGINA      = 0.111;  // o resto, que sobe com o scroll da pagina

  /* ---- MOBILE: o desfile ---- 13/08/2026, a pedido -------------------------
     No celular a fileira tem 2993px numa janela de 390. Centralizada como no
     desktop, ela abria em left -1301, ou seja, no MEIO da fileira: a foto da
     esquerda entrava cortada ao meio e as fotos 1 a 4 nao apareciam nunca. O
     arrasto de -1000px so empurrava mais para o fim da fileira.

     Agora, abaixo de 810px: o grupo encosta na esquerda (CSS, align-self, com
     transform-origin na borda esquerda) e comeca na foto 1, e o arrasto passa
     a ser medido pela PASSAGEM do grupo pela janela, nao pelo progresso da
     pagina. Assim a fileira percorre exatamente o proprio transbordo enquanto
     cruza a tela: entra mostrando a foto 1 na esquerda e sai mostrando a 10 na
     direita. As dez ficam acessiveis sem swipe manual.

     Desktop e tablet NAO mudam: a curva medida do template continua valendo
     acima de 810px, incluindo o X_TOTAL de 1000px. */
  var FILEIRA_MOBILE_ATE = 809.98;   // o breakpoint do proprio template

  function iniciarFileira() {
    /* .framer-dtlgl4 e a fileira. NAO usar [data-framer-name="Header"]: o
       <header> da pagina tem o mesmo nome e o alvo vazaria para tudo. */
    var el = document.querySelector('.framer-dtlgl4');
    if (!el) return;

    el.style.willChange = 'transform, opacity';

    /* Com reduced-motion o template entrega o estado final direto — medido em
       MOTION_SPEC secao 6.3. Nada de meio caminho. */
    if (menosMovimento.matches) {
      el.style.transform = 'perspective(1200px) translate(0px, 0px) scale(1)';
      el.style.opacity = '1';
      return;
    }

    /* ---- RODIZIO CONTINUO — 14/08/2026, a pedido ------------------------
       Antes, a fileira so andava se a pagina rolasse: os -1000px do arrasto
       sao amarrados ao progresso do documento, entao parar de rolar
       congelava tudo. O pedido foi "em rotacao", ou seja, ela nao para.

       COMO O LACO FECHA SEM COSTURA. A sequencia de 10 cartoes mede 2580px
       de layout (10 x 240 + 9 x 20 de gap) e o container e flex com
       width:max-content. Duplicando a sequencia uma vez, o cartao i da copia
       nasce exatamente 2600px a direita do original — a sequencia mais um
       gap. Entao basta deslizar e voltar ao zero a cada 2600px: o quadro que
       sai pela esquerda e identico ao que entra pela direita, e nao existe
       salto para disfarcar.

       As copias sao decoracao: levam aria-hidden e saem do Tab. Quem le por
       leitor de tela ouve as 10 fotos uma vez, nao vinte.

       O RODIZIO SOMA COM O ARRASTO, NAO O SUBSTITUI. O -1000px medido do
       template continua valendo e continua ligado ao scroll; o laco entra
       como uma parcela a mais no mesmo translate. Rolar acelera, parar
       nao congela — que era o pedido. */
    var VEL_RODIZIO = 26;      // px de layout por segundo. Ritmo de leitura.
    var larguraSequencia = el.offsetWidth;   // MEDIR ANTES de duplicar
    var periodoLaco = 0;
    var xLaco = 0;

    /* ---- QUAL CAMERA FEZ CADA FOTO — 14/08/2026 -------------------------
       O pedido: passando o mouse, o cliente ve a camera daquela foto e tem
       para onde ir. Duas frases diferentes, porque as fotos sao de dois tipos
       e dizer "feita com" numa foto DA camera seria mentira:

         feita   — foto de uso, tirada com a camera
         naFoto  — foto do produto, onde a camera e o assunto

       A ordem e a mesma da fileira. Se um slot mudar de foto, a linha
       correspondente muda aqui — e tools/fotos-fileira.js e quem mexe nos
       slots. */
    var CAMERAS = [
      { linha: 'Bee',   cor: 'Amarela', tipo: 'naFoto', href: '/bee' },
      { linha: 'Polen', cor: 'Preta',   tipo: 'naFoto', href: '/polen' },
      { linha: 'Bee',   cor: 'Branca',  tipo: 'feita',  href: '/bee' },
      { linha: 'Polen', cor: 'Marrom',  tipo: 'naFoto', href: '/polen' },
      { linha: 'Bee',   cor: 'Amarela', tipo: 'feita',  href: '/bee' },
      { linha: 'Polen', cor: 'Amarela', tipo: 'naFoto', href: '/polen' },
      { linha: 'Bee',   cor: 'Branca',  tipo: 'naFoto', href: '/bee' },
      { linha: 'Polen', cor: 'Rosa',    tipo: 'feita',  href: '/polen' },
      { linha: 'Bee',   cor: 'Amarela', tipo: 'naFoto', href: '/bee' },
      { linha: 'Polen', cor: 'Verde',   tipo: 'feita',  href: '/polen' }
    ];

    /* Diafragma. E o mesmo desenho de lente que a marca usa, e serve de pista
       em repouso: um selo pequeno no canto diz que ali tem algo a ver. Sem
       ele o hover so seria descoberto por acidente. */
    var SVG_LENTE = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">'
      + '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6"/>'
      + '<circle cx="12" cy="12" r="3.4" fill="none" stroke="currentColor" stroke-width="1.6"/>'
      + '<path d="M12 3v5.6M21 12h-5.6M12 21v-5.6M3 12h5.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'
      + '</svg>';

    function marcarCartoes() {
      var cartoes = Array.prototype.slice.call(el.children);
      cartoes.forEach(function (envolt, i) {
        var cartao = envolt.firstElementChild;
        if (!cartao || cartao.querySelector('[data-mel-cam]')) return;
        var c = CAMERAS[i % CAMERAS.length];
        if (!c) return;
        var nome = c.linha + ' ' + c.cor;
        var frase = c.tipo === 'feita' ? 'Feita com a' : 'Nesta foto';

        /* O <a> cobre o cartao inteiro: quem passa o mouse na foto ja esta no
           alvo, e quem navega por teclado alcanca com um Tab so. O texto do
           aria-label diz tudo de uma vez, porque o painel visual aparece por
           hover e leitor de tela nao tem hover. */
        var a = document.createElement('a');
        a.className = 'mel-cam';
        a.href = c.href;
        a.setAttribute('data-mel-cam', '');
        a.setAttribute('aria-label', frase + ' ' + nome + '. Ver mais.');
        a.innerHTML =
          '<span class="mel-cam-selo" aria-hidden="true">' + SVG_LENTE + '</span>'
          + '<span class="mel-cam-painel" aria-hidden="true">'
          +   '<span class="mel-cam-frase">' + frase + '</span>'
          +   '<span class="mel-cam-nome">' + nome + '</span>'
          +   '<span class="mel-cam-mais">Ver mais</span>'
          + '</span>';
        cartao.appendChild(a);
      });
    }

    /* DUAS COPIAS, NAO UMA — e o motivo e geometrico, medido depois de a
       primeira versao falhar em tela.

       Com uma copia so, a fileira tinha 2 periodos (~5930px). O pai centraliza
       o grupo, entao a borda esquerda ja nasce em (janela - total) / 2, que em
       1440 e -2246. Somando o arrasto do scroll e a volta do laco, a ponta
       DIREITA subia para dentro da janela: sobrava carvao vazio a direita e a
       fileira aparecia com tres cartoes e um buraco. Foi o que a captura pegou.

       Com duas copias sao 3 periodos (~8910px) e a conta fecha com folga em
       qualquer ponto do laco. O par disto e a dobra do x em pintar(): como o
       conteudo se repete a cada periodo, dobrar o deslocamento total para
       dentro de (-periodo, 0] mostra exatamente a mesma imagem e garante que a
       janela nunca alcance nenhuma das duas pontas. */
    var COPIAS = 2;

    function duplicarSequencia() {
      if (el.querySelector('[data-mel-clone]')) return;
      var originais = Array.prototype.slice.call(el.children);
      if (!originais.length) return;
      var gap = parseFloat(getComputedStyle(el).gap) || 0;
      periodoLaco = larguraSequencia + gap;
      for (var k = 0; k < COPIAS; k++) {
        originais.forEach(function (n) {
          var c = n.cloneNode(true);
          c.setAttribute('data-mel-clone', '');
          c.setAttribute('aria-hidden', 'true');
          Array.prototype.forEach.call(c.querySelectorAll('a,button,[tabindex]'), function (f) {
            f.setAttribute('tabindex', '-1');
          });
          el.appendChild(c);
        });
      }
    }

    var topo = 0;
    function medirTopo() {
      var n = el, y = 0;
      while (n) { y += n.offsetTop; n = n.offsetParent; }
      topo = y;
    }

    var pendente = false;
    function pintar() {
      pendente = false;
      var vh = window.innerHeight || document.documentElement.clientHeight;
      if (!vh) return;

      /* d = quanto o topo do grupo ja subiu, em px. Os dois eixos saem daqui:
         s divide por vh (a curva medida da entrada) e q divide pela passagem
         inteira do grupo pela janela (o desfile do mobile). */
      var d = vh - (topo - window.scrollY);

      var s = d / vh;
      var u = (s - FILEIRA_INICIO) / (FILEIRA_FIM - FILEIRA_INICIO);
      if (u < 0) u = 0; else if (u > 1) u = 1;
      var e = 1 - Math.pow(1 - u, FILEIRA_EXP);

      var rolavel = (document.documentElement.scrollHeight || 0) - vh;
      var p = rolavel > 0 ? window.scrollY / rolavel : 1;
      if (p < 0) p = 0; else if (p > 1) p = 1;

      var escala = FILEIRA_ESCALA_INICIAL + (1 - FILEIRA_ESCALA_INICIAL) * e;
      var y = FILEIRA_Y_INICIAL * (1 - e);
      var op = FILEIRA_OP_GEOMETRIA * e + FILEIRA_OP_PAGINA * p;
      if (op > 1) op = 1;

      var x;
      var larguraJanela = document.documentElement.clientWidth || window.innerWidth;
      if (larguraJanela <= FILEIRA_MOBILE_ATE) {
        /* Percorre o proprio transbordo enquanto cruza a janela. O denominador
           e vh + altura do grupo: q vale 0 quando o topo do grupo encosta na
           borda de baixo e 1 quando a base sai por cima. */
        var q = d / (vh + (el.offsetHeight || 1));
        if (q < 0) q = 0; else if (q > 1) q = 1;
        /* larguraSequencia, NAO el.offsetWidth: a duplicacao do rodizio dobrou
           o offsetWidth, e usar o valor novo dobraria o arrasto do desfile —
           justamente a curva que foi medida e aprovada em 13/08. O desfile
           continua percorrendo o transbordo de UMA sequencia. */
        var transbordo = larguraSequencia - larguraJanela;
        x = transbordo > 0 ? -transbordo * q : 0;
      } else {
        x = -FILEIRA_X_TOTAL * p;
      }
      /* O rodizio entra como parcela do MESMO translate. Somar aqui, e nao
         escrever um segundo transform, e o que impede os dois de se
         atropelarem: quem manda na string continua sendo esta funcao. */
      x += xLaco;

      /* DOBRA. O conteudo se repete a cada periodo, entao x e x + periodo
         desenham a mesma coisa. Trazer o total para dentro de (-periodo, 0]
         mantem a janela sempre no miolo das tres sequencias — e o que impede
         a ponta de aparecer. Sem isto, o arrasto do scroll somado ao laco
         levava a fileira para fora e sobrava vazio na direita. */
      if (periodoLaco > 0) {
        x = x % periodoLaco;
        if (x > 0) x -= periodoLaco;
      }

      /* A ordem importa: as funcoes se aplicam da direita para a esquerda,
         entao o translate acontece FORA da escala — os 150px sao 150px de
         layout, nao 150 ja encolhidos. E a ordem do inline do template, e e o
         que faz a matriz medida bater: em scrollY 580 o template da
         matrix3d(0.895277, ..., -134.632, 31.417, 0, 1), com a translacao
         crua ao lado da diagonal escalada. Trocar a ordem move em dobro. */
      el.style.transform = 'perspective(1200px) translate(' + x.toFixed(2) + 'px, ' + y.toFixed(2) + 'px) scale(' + escala.toFixed(4) + ')';
      el.style.opacity = op.toFixed(4);
    }

    function agendar() {
      if (pendente) return;
      pendente = true;
      requestAnimationFrame(pintar);
    }

    /* ---- o relogio do rodizio ----
       Tres travas, e cada uma existe por um motivo:

       1. NA TELA. Um rAF permanente girando com a fileira fora de vista e
          bateria queimada a troco de nada. O IntersectionObserver liga e
          desliga o relogio.
       2. ABA VISIVEL. O navegador ja congela o rAF em aba escondida, mas ao
          voltar o delta viria gigante e a fileira daria um salto. Zerar a
          referencia de tempo na volta evita o pulo.
       3. MOUSE EM CIMA. Nao se persegue alvo em movimento: com o ponteiro
          sobre a fileira, ela para. E o que torna o giro do cartao clicavel.

       O tempo entra por delta medido, nao por contagem de quadros: assim a
       velocidade e a mesma em 60Hz e em 120Hz. */
    var ligado = false, ultimo = 0, parado = false;

    /* O laco so pode viver numa volta: a fileira tem DUAS sequencias, entao
       xLaco fora de (-periodo, 0] mostraria vazio. Tudo que mexe no x — laco,
       arrasto, roda, setas — passa por aqui. */
    function normalizar() {
      if (!(periodoLaco > 0)) return;
      while (xLaco <= -periodoLaco) xLaco += periodoLaco;
      while (xLaco > 0) xLaco -= periodoLaco;
    }

    /* Avanco por seta: um cartao mais um vao, com a mesma curva de 520ms que o
       carrossel de banners usa. Sem isso o clique teleporta e a pessoa perde a
       referencia de onde estava. */
    var TWEEN_MS = 520;
    var tween = null;
    function avancar(passos) {
      var envolt = el.children[0];
      var cartao = envolt && envolt.firstElementChild;
      var gap = parseFloat(getComputedStyle(el).gap) || 0;
      var salto = ((cartao ? cartao.offsetWidth : 260) + gap) * passos;
      normalizar();
      tween = { de: xLaco, para: xLaco - salto, t0: performance.now() };
    }

    function passo(agora) {
      if (!ligado) return;
      var dt = ultimo ? (agora - ultimo) / 1000 : 0;
      ultimo = agora;
      /* Um quadro perdido (aba voltando, GC) nao pode virar um salto. */
      if (dt > 0.1) dt = 0.1;

      if (tween) {
        var u = (agora - tween.t0) / TWEEN_MS;
        if (u >= 1) { xLaco = tween.para; tween = null; normalizar(); }
        else {
          var f = 1 - Math.pow(1 - u, 3);   // desacelera no fim
          xLaco = tween.de + (tween.para - tween.de) * f;
        }
      } else if (!parado && periodoLaco > 0) {
        xLaco -= VEL_RODIZIO * dt;
        normalizar();
      }
      pintar();
      requestAnimationFrame(passo);
    }

    /* ---- controle manual ----
       Tres formas, e todas escrevem no mesmo xLaco:

       ARRASTAR  — pegar e puxar. E o gesto mais direto e funciona no toque.
       RODA      — so o eixo HORIZONTAL (deltaX do trackpad, ou Shift+roda).
                   🔴 A roda vertical NAO e sequestrada de proposito: a fileira
                   e um laco infinito, entao capturar deltaY prenderia a pagina
                   — a pessoa rolaria para sempre sem passar da secao.
       SETAS     — um cartao por clique, nos dois sentidos. */
    var arrastando = false, xInicial = 0, lacoInicial = 0, arrastou = 0;

    el.addEventListener('pointerdown', function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      arrastando = true; arrastou = 0;
      xInicial = e.clientX; lacoInicial = xLaco;
      tween = null;
      el.setPointerCapture && el.setPointerCapture(e.pointerId);
    });
    el.addEventListener('pointermove', function (e) {
      if (!arrastando) return;
      var d = e.clientX - xInicial;
      arrastou = Math.abs(d);
      xLaco = lacoInicial + d;
      normalizar();
      pintar();
    });
    function soltar(e) {
      if (!arrastando) return;
      arrastando = false;
      try { el.releasePointerCapture && el.releasePointerCapture(e.pointerId); } catch (err) { /* já solto */ }
    }
    el.addEventListener('pointerup', soltar);
    el.addEventListener('pointercancel', soltar);
    /* Depois de arrastar, o ponteiro sobe em cima de um cartao e o navegador
       dispara o clique do <a>. Sem isto, todo arrasto terminava navegando. */
    el.addEventListener('click', function (e) {
      if (arrastou > 6) { e.preventDefault(); e.stopPropagation(); }
    }, true);

    el.addEventListener('wheel', function (e) {
      var dx = e.deltaX;
      if (!dx && e.shiftKey) dx = e.deltaY;
      if (!dx) return;
      e.preventDefault();
      tween = null;
      xLaco -= dx;
      normalizar();
      pintar();
    }, { passive: false });

    /* ---- as setas ----
       Ficam no PAI da fileira, nao dentro dela: a fileira tem overflow:hidden
       e vive escalada e transladada pelo scroll, entao um filho ancorado nela
       seria recortado e andaria junto. No pai elas ficam paradas, por cima.

       A altura e calculada, nao chutada: a fileira nao ocupa o pai inteiro (o
       titulo esta ali em cima), e o topo dela e lido pela MESMA soma de
       offsetTop que medirTopo usa — rect nao serve, porque ja vem com o
       transform que estamos calculando. */
    function posicaoDoc(n) { var y = 0; while (n) { y += n.offsetTop; n = n.offsetParent; } return y; }

    function montarSetas() {
      var pai = el.parentElement;
      if (!pai || pai.querySelector('[data-mel-fil-seta]')) return;
      if (getComputedStyle(pai).position === 'static') pai.style.position = 'relative';

      [['ant', -1, 'Ver fotos anteriores', 'M15 4 L7 12 L15 20'],
       ['prox', 1, 'Ver próximas fotos', 'M9 4 L17 12 L9 20']].forEach(function (s) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'mel-fil-seta mel-fil-seta-' + s[0];
        b.setAttribute('data-mel-fil-seta', '');
        b.setAttribute('aria-label', s[2]);
        b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + s[3]
          + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        b.addEventListener('click', function () { avancar(s[1]); });
        pai.appendChild(b);
      });
      alinharSetas();
    }

    function alinharSetas() {
      var pai = el.parentElement;
      if (!pai) return;
      var meio = posicaoDoc(el) - posicaoDoc(pai) + el.offsetHeight / 2;
      pai.style.setProperty('--mel-fil-meio', Math.round(meio) + 'px');
    }
    function ligar() {
      if (ligado) return;
      ligado = true; ultimo = 0;
      requestAnimationFrame(passo);
    }
    function desligar() { ligado = false; }

    /* ORDEM: marcar ANTES de duplicar. As copias saem de cloneNode(true),
       entao ja nascem com o painel dentro — e quem passa o mouse numa copia ve
       a mesma coisa. Marcar depois deixaria metade da fileira muda. */
    marcarCartoes();
    duplicarSequencia();
    remedirSequencia();
    montarSetas();
    medirTopo();
    pintar();
    window.addEventListener('scroll', agendar, { passive: true });
    /* A largura da sequencia muda com o breakpoint: o template troca as
       variantes do cartao, e em 390px a fileira mede 2993 contra 2580 no
       desktop. Como ela e a base do desfile do mobile, remedir no resize e
       obrigatorio.

       🔴 NAO SOMAR offsetWidth DOS FILHOS. Os dez filhos diretos sao
       div.ssr-variant com display:contents — elementos SEM CAIXA, cujo
       offsetWidth e 0. A primeira versao desta funcao somava exatamente isso
       e devolvia 180, que sao so os nove gaps; o desfile do mobile passaria a
       percorrer 180px em vez de 2603. O bug nao aparecia na carga (ali o
       valor vem de el.offsetWidth antes de duplicar) — so no primeiro resize,
       e foi a medicao que pegou.

       A conta certa sai do proprio total: duplicamos UMA vez, entao
       total = sequencia + gap + sequencia. */
    function remedirSequencia() {
      var gap = parseFloat(getComputedStyle(el).gap) || 0;
      var total = el.offsetWidth;
      var n = el.querySelector('[data-mel-clone]') ? COPIAS + 1 : 1;
      larguraSequencia = (total - gap * (n - 1)) / n;
      periodoLaco = larguraSequencia + gap;
    }
    window.addEventListener('resize', function () {
      remedirSequencia();
      alinharSetas();
      medirTopo(); agendar();
    }, { passive: true });
    /* As fotos entram depois e empurram o layout: sem remedir, o topo fica
       velho e a curva dispara na hora errada. */
    window.addEventListener('load', function () { medirTopo(); alinharSetas(); pintar(); });

    el.addEventListener('pointerenter', function () { parado = true; });
    el.addEventListener('pointerleave', function () { parado = false; });
    document.addEventListener('visibilitychange', function () { ultimo = 0; });

    if (window.IntersectionObserver) {
      new IntersectionObserver(function (ents) {
        ents[0] && ents[0].isIntersecting ? ligar() : desligar();
      }, { rootMargin: '200px 0px' }).observe(el);
    } else {
      ligar();
    }
  }


  /* ====== conta, sessão e sacola no topo ======
     Ver o cabeçalho de tools/perfil.js para o que esta autenticação é (uma
     demonstração local honesta) e o que falta para virar autenticação de
     verdade. Aqui embaixo estão só as decisões de comportamento. */

  /* ====== TEMA DA NAVBAR: DESLIGADO EM 15/08/2026 ======
     🔴 O CLIENTE ESCOLHEU UMA COR SÓ: a barra é carvão em todo o site. Esta
     função sai na primeira linha e não escreve data-mel-nav nenhum, então o
     <html> não carrega estado morto e o CSS trabalha só com os tokens de body.

     O CORPO FICA, INTEIRO E INTACTO. Ele é a implementação medida da inversão
     por região, com a histerese e o motivo de cada escolha escritos abaixo — e
     voltar atrás custa apagar UMA linha aqui e restaurar o bloco de tokens
     claros em css(). Apagar tudo economizaria linhas e jogaria fora a parte
     cara: o raciocínio. As marcas data-mel-tema="claro" continuam no HTML pelo
     mesmo motivo.

     ------------------------------------------------------------------
     O que segue descreve o comportamento QUANDO LIGADO.

     Escreve data-mel-nav="claro" ou "escuro" no <html>. Quem pinta é o CSS
     (ver "TEMA DA NAVBAR" em tools/perfil.js); esta função não toca em cor,
     em classe de elemento nem em estilo inline.

     POR QUE GEOMETRIA E NÃO IntersectionObserver.
     O IO responde "entrou/saiu de uma faixa", e só dispara nas bordas dessa
     faixa. O que a barra precisa saber é outra coisa: "qual região está
     debaixo da minha meia-altura AGORA", com uma zona morta em volta do limite
     para não trocar de cor com um tremido de trackpad. Esses dois limiares — o
     de virar claro e o de virar escuro — são pontos diferentes, e faixa de IO
     só tem duas bordas: para expressar histerese com IO seriam necessários
     sentinelas ou dois observadores, que é mais peça para manter e mais jeito
     de dessincronizar. A conta geométrica dá a resposta exata com três
     getBoundingClientRect, e a decisão é uma função pura da posição — o mesmo
     scroll sempre dá o mesmo tema, rolando devagar, rápido ou para trás.

     UM listener de rolagem, passivo, coalescido em requestAnimationFrame, e
     ele só é instalado em página que TEM região clara. No site escuro inteiro
     esta função sai na segunda linha sem instalar nada. */
  function iniciarTemaNavbar() {
    return;   // 15/08/2026: barra sempre carvão, por decisão do cliente

    var claras = [].slice.call(document.querySelectorAll('[data-mel-tema="claro"]'));
    if (!claras.length) return;

    var raiz = document.documentElement;
    var barra = document.querySelector('.framer-1gfj5qd-container')
             || document.querySelector('nav[data-framer-name^="Navigation"]');
    if (!barra) return;

    /* FOLGA cobre o vão de 10px que o stack do template deixa ENTRE seções
       (flex column com gap:10px). Sem ela, ao passar de uma região clara para
       a região clara seguinte a barra piscaria de escuro por 10px de rolagem —
       um defeito que só aparece na /bee, que tem três regiões claras seguidas.
       HISTERESE é a zona morta: uma vez claro, o limite para voltar a escuro
       desce 18px; uma vez escuro, o limite para virar claro sobe 18px. São 36px
       de folga total, e é isso que impede a barra de alternar quando o usuário
       para exatamente em cima de uma fronteira. */
    var FOLGA = 14;
    var HISTERESE = 18;
    var tema = null;
    var pendente = false;

    function decidir() {
      /* A meia-altura da barra, medida a cada quadro em que se decide: a altura
         muda entre breakpoints e a barra retrátil translada, mas o que importa
         é a faixa que ela ocupa quando visível, não onde ela está escondida. */
      var meia = (barra.getBoundingClientRect().height || 81) / 2;
      var linha = meia + (tema === 'claro' ? -HISTERESE : HISTERESE);
      for (var i = 0; i < claras.length; i++) {
        var r = claras[i].getBoundingClientRect();
        if (r.top - FOLGA <= linha && r.bottom + FOLGA > linha) return 'claro';
      }
      return 'escuro';
    }

    function pintar() {
      pendente = false;
      /* Com o menu aberto o tema CONGELA. O painel é ancorado na barra e a
         rolagem fica travada, então na prática nada muda debaixo dela — mas se
         algo mudar (um resize, um teclado virtual abrindo), trocar a cor da
         barra com o menu em cima dela é mudança de contraste sem causa visível
         para quem está lendo o menu. */
      if (document.querySelector('.mel-menu')) return;
      var novo = decidir();
      if (novo === tema) return;
      tema = novo;
      raiz.setAttribute('data-mel-nav', novo);
    }

    function agendar() {
      if (pendente) return;
      pendente = true;
      requestAnimationFrame(pintar);
    }

    /* O primeiro cálculo é síncrono e não passa pelo rAF: se o navegador
       restaurou a rolagem no meio da página, o tema certo tem que estar posto
       antes do próximo quadro, não um quadro depois. */
    pintar();
    window.addEventListener('scroll', agendar, { passive: true });
    window.addEventListener('resize', agendar, { passive: true });
    /* As fotos entram depois e empurram o layout: sem remedir, as regiões
       ficam com a geometria velha e o tema troca na altura errada. */
    window.addEventListener('load', agendar);
  }

  var PERFIL_ICONES = {"usuario":"M230.92,212c-15.23-26.33-38.7-45.21-66.09-54.16a72,72,0,1,0-73.66,0C63.78,166.78,40.31,185.66,25.08,212a8,8,0,1,0,13.85,8c18.84-32.56,52.14-52,89.07-52s70.23,19.44,89.07,52a8,8,0,1,0,13.85-8ZM72,96a56,56,0,1,1,56,56A56.06,56.06,0,0,1,72,96Z","entrar":"M141.66,133.66l-40,40A8,8,0,0,1,88,168V136H24a8,8,0,0,1,0-16H88V88a8,8,0,0,1,13.66-5.66l40,40A8,8,0,0,1,141.66,133.66ZM192,32H136a8,8,0,0,0,0,16h48V208H136a8,8,0,0,0,0,16h56a8,8,0,0,0,8-8V40A8,8,0,0,0,192,32Z","criar":"M256,136a8,8,0,0,1-8,8H232v16a8,8,0,0,1-16,0V144H200a8,8,0,0,1,0-16h16V112a8,8,0,0,1,16,0v16h16A8,8,0,0,1,256,136Zm-57.87,58.85a8,8,0,0,1-12.26,10.3C165.75,181.19,138.09,168,108,168s-57.75,13.19-77.87,37.15a8,8,0,0,1-12.25-10.3c14.94-17.78,33.52-30.41,54.17-37.17a68,68,0,1,1,71.9,0C164.6,164.44,183.18,177.07,198.13,194.85ZM108,152a52,52,0,1,0-52-52A52.06,52.06,0,0,0,108,152Z","sacola":"M216,64H176a48,48,0,0,0-96,0H40A16,16,0,0,0,24,80V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V80A16,16,0,0,0,216,64ZM128,32a32,32,0,0,1,32,32H96A32,32,0,0,1,128,32Zm88,168H40V80H216V200Z","sair":"M112,216a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V40a8,8,0,0,1,8-8h56a8,8,0,0,1,0,16H56V208h48A8,8,0,0,1,112,216Zm109.66-93.66-40-40a8,8,0,0,0-11.32,11.32L196.69,120H112a8,8,0,0,0,0,16h84.69l-26.35,26.34a8,8,0,0,0,11.32,11.32l40-40A8,8,0,0,0,221.66,122.34Z","fechar":"M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"};

  function perfilSvg(nome, tam) {
    return '<svg viewBox="0 0 256 256" width="' + tam + '" height="' + tam
      + '" aria-hidden="true" focusable="false"><path d="' + PERFIL_ICONES[nome]
      + '" fill="currentColor"/></svg>';
  }

  /* ---- porta de dados 1: contas ----
     Troque esta e a Sessao por chamadas ao backend, e nada mais muda. */
  var Contas = {
    CHAVE: 'melcam:contas',
    todas: function () {
      try { return JSON.parse(localStorage.getItem(this.CHAVE)) || []; } catch (e) { return []; }
    },
    gravar: function (v) {
      try { localStorage.setItem(this.CHAVE, JSON.stringify(v)); return true; } catch (e) { return false; }
    },
    achar: function (email) {
      var e = String(email).trim().toLowerCase();
      return this.todas().filter(function (c) { return c.email === e; })[0] || null;
    },
  };

  /* ---- porta de dados 2: sessão ----
     localStorage e não sessionStorage porque o pedido é explícito: a sessão
     sobrevive ao recarregar. Com backend isto vira cookie httpOnly. */
  var Sessao = {
    CHAVE: 'melcam:sessao',
    atual: function () {
      try { return JSON.parse(localStorage.getItem(this.CHAVE)) || null; } catch (e) { return null; }
    },
    abrir: function (conta) {
      try {
        localStorage.setItem(this.CHAVE, JSON.stringify({
          email: conta.email, nome: conta.nome, desde: Date.now(),
        }));
      } catch (e) {}
    },
    fechar: function () { try { localStorage.removeItem(this.CHAVE); } catch (e) {} },
  };

  /* ---- senha: PBKDF2-SHA-256, 210.000 iterações, sal de 16 bytes ----
     Nunca a senha. Se o WebCrypto não estiver disponível o cadastro é recusado
     com a razão na tela: guardar senha fraca para "funcionar mesmo assim" é o
     tipo de atalho que vira manchete. */
  var ITERACOES = 210000;
  function temCripto() {
    return !!(window.crypto && window.crypto.subtle && window.crypto.getRandomValues);
  }
  function hex(buf) {
    return Array.prototype.map.call(new Uint8Array(buf), function (b) {
      return ('0' + b.toString(16)).slice(-2);
    }).join('');
  }
  function derivar(senha, salHex) {
    var sal = new Uint8Array((salHex.match(/../g) || []).map(function (h) { return parseInt(h, 16); }));
    return crypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveBits'])
      .then(function (k) {
        return crypto.subtle.deriveBits(
          { name: 'PBKDF2', salt: sal, iterations: ITERACOES, hash: 'SHA-256' }, k, 256);
      }).then(hex);
  }
  function salNovo() {
    var a = new Uint8Array(16);
    crypto.getRandomValues(a);
    return hex(a.buffer);
  }
  /* Comparação em tempo constante. No cliente isto é quase teatro — quem tem o
     console tem o hash —, mas o hábito viaja para o servidor, onde importa. */
  function iguais(a, b) {
    if (a.length !== b.length) return false;
    var d = 0;
    for (var i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return d === 0;
  }

  /* ---- validação ----
     O mesmo texto de erro que a pessoa lê é o que o campo anuncia por
     aria-describedby. Uma frase só, dizendo o que fazer. */
  var RE_EMAIL = /^[^@\s]+@[^@\s.]+(\.[^@\s.]+)+$/;
  function validarNome(v) {
    v = (v || '').trim();
    if (!v) return 'Diga como quer ser chamada ou chamado.';
    if (v.length < 2) return 'Nome muito curto.';
    return '';
  }
  function validarEmail(v) {
    v = (v || '').trim();
    if (!v) return 'Digite seu e-mail.';
    if (!RE_EMAIL.test(v)) return 'E-mail inválido. Confira o @ e o ponto do domínio.';
    return '';
  }
  function validarSenha(v) {
    v = v || '';
    if (!v) return 'Digite uma senha.';
    if (v.length < 8) return 'Use pelo menos 8 caracteres.';
    if (!/[a-zA-Z]/.test(v) || !/[0-9]/.test(v)) return 'Misture letras e números.';
    return '';
  }
  function validarConfirma(a, b) {
    if (!b) return 'Repita a senha.';
    if (a !== b) return 'As senhas não são iguais.';
    return '';
  }

  function iniciarPerfil() {
    /* O template tem uma variante de navbar por breakpoint e só a do
       breakpoint ativo renderiza — a mesma armadilha do menu hambúrguer, que
       por isso liga em TODAS. Aqui é igual: um botão por variante. */
    var slots = Array.prototype.slice.call(
      document.querySelectorAll('nav [data-framer-name="Section Icon"]'));
    if (!slots.length) return;

    /* ---- higiene de acessibilidade da navbar do template ----
       Duas coisas que estavam erradas no export e ninguém via, porque as duas
       são invisíveis para quem usa mouse e olho.

       1. A lupa é um botão de 20px com color rgba(51,51,51,0): invisível, sem
          ação nenhuma, e mesmo assim recebia foco de teclado. Quem navega por
          Tab parava num controle que não existe na tela. Fica no DOM, como
          manda a casa, mas sai do caminho. */
    document.querySelectorAll('nav [aria-label="Search Icon"]').forEach(function (b) {
      b.setAttribute('tabindex', '-1');
      b.setAttribute('aria-hidden', 'true');
      b.style.pointerEvents = 'none';
    });
    /* 2. O link da marca vem com aria-hidden="true" E continua focável — é um
          <a href="/">. A combinação é proibida: o leitor de tela não anuncia
          nada, mas o Tab para ali mesmo assim, e a pessoa fica num link
          anônimo. Como ele É o caminho para a home, a correção é dar nome e
          tirar o aria-hidden, não esconder mais. */
    document.querySelectorAll('nav a[data-framer-name="MELCAM"]').forEach(function (a) {
      a.removeAttribute('aria-hidden');
      if (!a.getAttribute('aria-label')) a.setAttribute('aria-label', 'MELCAM, ir para a página inicial');
    });

    /* O SLOT VAZIO EMPURRAVA O BOTÃO PARA FORA EM 320px.
       Medido: em 320 a linha tem 272px úteis (320 menos os 24 de cada lado) e
       precisa acomodar hambúrguer (24) + marca (178, fixa) + slot (136, fixa)
       + botão (44) = 382. O slot é o único que não carrega nada: sobrou nele
       apenas a lupa inerte do template, invisível e sem ação. Com ele fora do
       cálculo sobra 246, e o botão encosta na margem direita como deve.

       Recolhido por medição, não por fé: só some se NÃO houver dentro dele
       nenhum controle visível e ainda alcançável. Se o template um dia puser
       algo de verdade ali, o slot fica — e é por isso que esta medição continua
       valendo mesmo quando o HTML já vem com o slot recolhido: ela é a
       autoridade, o atributo no arquivo é só quem chega primeiro. */
    function recolherSlot(slot) {
      var util = Array.prototype.slice.call(slot.querySelectorAll('a,button,[role="button"],img,svg'))
        .filter(function (e) {
          var r = e.getBoundingClientRect(), s = getComputedStyle(e);
          return r.width > 0 && r.height > 0 && s.visibility !== 'hidden'
            && Number(s.opacity) > 0.05 && s.pointerEvents !== 'none'
            && e.getAttribute('aria-hidden') !== 'true';
        });
      if (!util.length) slot.style.display = 'none';
    }

    var botoes = [];
    slots.forEach(function (slot) {
      /* O botão entra na LINHA da navbar, não dentro do slot de ícones.
         Medido em 13/08: o slot ("Section Icon") tem largura fixa vinda do
         Framer — 136px — e em 320px ele começa em x=226, ou seja, termina em
         362 numa tela de 320. Um botão anexado ali nascia em x=318 e o centro
         dele caía FORA da tela: aparecia recortado e não recebia clique. Não
         havia transbordo horizontal para denunciar, porque a faixa recorta.
         A linha (o pai do slot) é flex com space-between e respeita o padding
         de 24px da navbar, então o último filho dela encosta na margem direita
         em qualquer largura — que é onde o controle de conta tem de estar. */
      var linha = slot.parentElement || slot;
      /* A BARRA JÁ VEM MONTADA NO HTML desde 14/08 (tools/navbar-estatica.js),
         e é isso que acaba com o flash da barra antiga: o desenho final pinta
         no primeiro quadro, sem esperar este script. Aqui o caso passou a ser
         ADOTAR o que já existe, e não sair pela porta.

         Sair era o que este arquivo fazia, e com o HTML assado viraria defeito:
         a lista de botoes ficaria vazia, e o corte por lista vazia logo abaixo
         mataria o painel de conta, a contagem da sacola e o rótulo dos dois
         controles. A criação continua aqui, intacta, para o caso de uma página
         nova entrar no site sem passar pelo navbar-estatica. */
      var pronto = linha.querySelector('[data-mel-perfil]');

      /* ---- os quatro destinos, à vista ----
         Entram DENTRO do "Meniu", que é o bloco do hambúrguer e já é a coluna
         da esquerda. Pendurá-los direto na linha criaria um quarto filho e
         quebraria a grade de três colunas que centra o logo. A visibilidade é
         só do CSS: em telas estreitas eles ficam no DOM, escondidos, e o
         hambúrguer segue mandando. O menu do hambúrguer continua com os cinco
         itens, Home inclusive — aqui em cima Home é o próprio logo. */
      var meniu = linha.querySelector('[data-framer-name="Meniu"]') || linha;
      if (!meniu.querySelector('.mel-nav-links')) {
        var destinos = [
          { t: 'Polen', h: '/polen' },
          { t: 'Bee', h: '/bee' },
          { t: 'Acessórios', h: '/acessorios' },
          { t: 'Sobre', h: '/sobre' }
        ];
        var grupo = document.createElement('div');
        grupo.className = 'mel-nav-links';
        var aqui = location.pathname.replace(/\/$/, '') || '/';
        destinos.forEach(function (d) {
          var a = document.createElement('a');
          a.className = 'mel-nav-link';
          a.href = d.h;
          a.textContent = d.t;
          if (aqui === d.h) a.setAttribute('aria-current', 'page');
          grupo.appendChild(a);
        });
        meniu.appendChild(grupo);
      }

      /* ---- as ações da direita, num grupo só ----
         Sacola e conta viajam juntas dentro de .mel-nav-acoes: é ela que ocupa
         a terceira coluna da grade. Sem o grupo, os dois botões seriam dois
         filhos da linha e a grade perderia a conta das colunas. */
      if (pronto) {
        botoes.push(pronto);
        recolherSlot(slot);
        return;
      }
      var acoes = document.createElement('div');
      acoes.className = 'mel-nav-acoes';

      /* A sacola é <a>, não <button>: leva para /sacola, então é navegação.
         O selo dela é o MESMO data-mel-contador-selo que pintarSelo() já
         procura — a contagem não é duplicada, só passa a aparecer em dois
         lugares. O número segue escrito por extenso no aria-label, porque uma
         bolinha colorida não é informação para quem não a enxerga. */
      var sac = document.createElement('a');
      sac.className = 'mel-perfil-bt mel-sacola-bt';
      sac.href = '/sacola';
      sac.setAttribute('data-mel-sacola-bt', '');
      sac.innerHTML = perfilSvg('sacola', 24)
        + '<span class="mel-perfil-selo" data-mel-contador-selo aria-hidden="true">0</span>';
      acoes.appendChild(sac);

      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'mel-perfil-bt';
      b.setAttribute('data-mel-perfil', '');
      b.setAttribute('aria-haspopup', 'menu');
      b.setAttribute('aria-expanded', 'false');
      b.innerHTML = perfilSvg('usuario', 24)
        + '<span class="mel-perfil-selo" data-mel-contador-selo aria-hidden="true">0</span>';
      acoes.appendChild(b);

      linha.appendChild(acoes);
      botoes.push(b);

      recolherSlot(slot);
    });
    if (!botoes.length) return;

    var vivo = document.createElement('p');
    vivo.className = 'mel-sr';
    vivo.setAttribute('aria-live', 'polite');
    document.body.appendChild(vivo);

    var painel = null;
    var ultimoFoco = null;

    /* ---------- contagem da sacola ----------
       Lê a mesma chave que iniciarSacola() grava. Não duplica a lógica do
       carrinho: só mostra o que já existe, aqui em cima. */
    function naSacola() {
      try {
        return (JSON.parse(localStorage.getItem('melcam:sacola')) || [])
          .reduce(function (a, i) { return a + (i.qtd || 0); }, 0);
      } catch (e) { return 0; }
    }
    function pintarSelo() {
      var n = naSacola();
      document.querySelectorAll('[data-mel-contador-selo]').forEach(function (s) {
        s.textContent = n > 9 ? '9+' : String(n);
        if (n > 0) s.setAttribute('data-tem', ''); else s.removeAttribute('data-tem');
      });
      botoes.forEach(function (b) { b.setAttribute('aria-label', rotuloBotao(n)); });
      /* O selo da sacola é uma bolinha colorida com um número dentro: para quem
         usa leitor de tela ele é decoração (aria-hidden), então a contagem tem
         de estar escrita no nome do link, e por extenso. */
      document.querySelectorAll('[data-mel-sacola-bt]').forEach(function (s) {
        s.setAttribute('aria-label', n
          ? 'Sacola, ' + n + ' ' + (n === 1 ? 'item' : 'itens')
          : 'Sacola, vazia');
      });
      var item = painel && painel.querySelector('[data-mel-perfil-conta]');
      if (item) item.textContent = n ? String(n) : '';
    }
    function rotuloBotao(n) {
      var s = Sessao.atual();
      var quem = s ? 'Conta de ' + s.nome : 'Entrar ou criar conta';
      return quem + (n ? ', ' + n + ' na sacola' : '');
    }

    /* ---------- o painel ----------
       Ancorado embaixo da faixa e alinhado pela DIREITA do botão: o controle
       mora na ponta direita da navbar, e um painel crescendo para a direita
       sairia da tela em 320px. */
    function montar(botao) {
      var fixo = botao;
      while (fixo && getComputedStyle(fixo).position !== 'fixed') fixo = fixo.parentElement;
      var faixa = fixo ? fixo.getBoundingClientRect() : { bottom: 64 };
      var bt = botao.getBoundingClientRect();

      var p = document.createElement('div');
      p.className = 'mel-perfil-menu';
      p.setAttribute('role', 'menu');
      p.setAttribute('aria-label', 'Conta e sacola');
      p.style.top = Math.round(faixa.bottom) + 'px';
      p.style.right = Math.max(12, Math.round(innerWidth - bt.right)) + 'px';
      p.style.maxHeight = 'calc(100vh - ' + Math.round(faixa.bottom) + 'px - 1.5rem)';
      p.style.overflowY = 'auto';

      var sessao = Sessao.atual();
      if (sessao) {
        var quem = document.createElement('div');
        quem.className = 'mel-perfil-quem';
        quem.innerHTML = '<b></b><span></span>';
        quem.querySelector('b').textContent = sessao.nome;
        quem.querySelector('span').textContent = sessao.email;
        p.appendChild(quem);
      }

      function item(icone, texto, aoAtivar, extra) {
        var e = document.createElement(aoAtivar ? 'button' : 'a');
        if (aoAtivar) e.type = 'button'; else e.href = extra;
        e.className = 'mel-perfil-item';
        e.setAttribute('role', 'menuitem');
        e.innerHTML = perfilSvg(icone, 19) + '<span></span>';
        e.querySelector('span').textContent = texto;
        if (aoAtivar) e.addEventListener('click', function () { fechar(); aoAtivar(); });
        else e.addEventListener('click', fechar);
        p.appendChild(e);
        return e;
      }

      if (!sessao) {
        item('entrar', 'Entrar', function () { abrirAcesso('entrar'); });
        item('criar', 'Criar conta', function () { abrirAcesso('criar'); });
      }
      var sacola = item('sacola', 'Carrinho', null, '/sacola');
      var conta = document.createElement('span');
      conta.className = 'mel-perfil-conta';
      conta.setAttribute('data-mel-perfil-conta', '');
      var n = naSacola();
      conta.textContent = n ? String(n) : '';
      sacola.appendChild(conta);
      /* O número tem de chegar a quem usa leitor de tela como frase, não como
         algarismo solto grudado em "Carrinho". */
      sacola.setAttribute('aria-label', n ? 'Carrinho, ' + n + ' ' + (n === 1 ? 'item' : 'itens') : 'Carrinho, vazio');

      if (sessao) item('sair', 'Sair', sair);
      return p;
    }

    /* A mesma curva do menu de navegação (MOTION_SPEC, seção 7): smoothstep em
       400ms, não ease-out. Dois painéis vizinhos com entradas diferentes se
       notam na hora. */
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

    function itens() {
      return painel ? Array.prototype.slice.call(painel.querySelectorAll('[role="menuitem"]')) : [];
    }

    function fechar(devolverFoco) {
      if (!painel) return;
      painel.remove();
      painel = null;
      botoes.forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
      if (devolverFoco && ultimoFoco && ultimoFoco.focus) ultimoFoco.focus();
    }

    function abrir() {
      /* Não conflita com o hambúrguer: quem abre avisa, e o outro fecha.
         Dois painéis abertos ao mesmo tempo em 320px cobririam a tela toda. */
      document.dispatchEvent(new CustomEvent('mel:fechar-menus', { detail: { quem: 'perfil' } }));
      ultimoFoco = document.activeElement;
      var visivel = botoes.filter(function (b) { return b.offsetHeight > 0; })[0] || botoes[0];
      painel = montar(visivel);
      document.body.appendChild(painel);
      botoes.forEach(function (b) { b.setAttribute('aria-expanded', 'true'); });
      surgir(painel, function () {
        var p = itens()[0];
        if (p) p.focus();
      });
    }

    function alternar() { if (painel) fechar(true); else abrir(); }

    botoes.forEach(function (b) {
      b.addEventListener('click', function (e) { e.stopPropagation(); alternar(); });
      b.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown' && !painel) { e.preventDefault(); abrir(); }
      });
    });

    /* Teclado dentro do painel: setas andam, Home e End vão às pontas, Escape
       fecha e devolve o foco ao botão, Tab sai fechando (não deixa foco preso
       num painel invisível). */
    document.addEventListener('keydown', function (e) {
      if (!painel) return;
      var lista = itens();
      var i = lista.indexOf(document.activeElement);
      if (e.key === 'Escape') { e.preventDefault(); fechar(true); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); (lista[(i + 1) % lista.length] || lista[0]).focus(); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); (lista[(i - 1 + lista.length) % lista.length] || lista[0]).focus(); return; }
      if (e.key === 'Home') { e.preventDefault(); lista[0].focus(); return; }
      if (e.key === 'End') { e.preventDefault(); lista[lista.length - 1].focus(); return; }
      if (e.key === 'Tab') fechar(false);
    });

    document.addEventListener('click', function (e) {
      if (!painel) return;
      if (painel.contains(e.target)) return;
      for (var i = 0; i < botoes.length; i++) {
        if (botoes[i] === e.target || botoes[i].contains(e.target)) return;
      }
      fechar(false);
    }, true);

    /* A âncora é calculada na abertura; se a janela mudar de tamanho o painel
       fecha, em vez de flutuar no lugar errado. Mesma regra do menu. */
    window.addEventListener('resize', function () { fechar(false); });
    document.addEventListener('mel:fechar-menus', function (e) {
      if (e.detail && e.detail.quem === 'perfil') return;
      fechar(false);
    });

    /* ---------- sair ---------- */
    function sair() {
      var s = Sessao.atual();
      Sessao.fechar();
      pintarSelo();
      vivo.textContent = s ? 'Sessão encerrada. Até logo, ' + s.nome + '.' : 'Sessão encerrada.';
    }

    /* ---------- modal de acesso ---------- */
    var modal = null;

    function abrirAcesso(modo) {
      if (modal) return;
      var focoAntes = document.activeElement;

      var cortina = document.createElement('div');
      cortina.className = 'mel-acesso-cortina';

      var cartao = document.createElement('div');
      cartao.className = 'mel-acesso';
      cartao.setAttribute('role', 'dialog');
      cartao.setAttribute('aria-modal', 'true');
      cartao.setAttribute('aria-labelledby', 'mel-acesso-tit');

      cartao.innerHTML =
        '<button type="button" class="mel-acesso-x" aria-label="Fechar">' + perfilSvg('fechar', 20) + '</button>'
        + '<h2 class="mel-acesso-tit" id="mel-acesso-tit"></h2>'
        + '<p class="mel-acesso-sub"></p>'
        + '<div class="mel-acesso-abas" role="tablist" aria-label="Entrar ou criar conta">'
        +   '<button type="button" class="mel-acesso-aba" role="tab" data-modo="entrar">ENTRAR</button>'
        +   '<button type="button" class="mel-acesso-aba" role="tab" data-modo="criar">CRIAR CONTA</button>'
        + '</div>'
        + '<p class="mel-acesso-aviso" role="alert" hidden></p>'
        + '<form novalidate>'
        +   '<div class="mel-campo" data-campo="nome">'
        +     '<label for="mel-nome">Nome</label>'
        +     '<input id="mel-nome" name="nome" type="text" autocomplete="name" placeholder="Como quer ser chamado">'
        +     '<span class="mel-campo-erro" id="mel-nome-erro"></span>'
        +   '</div>'
        +   '<div class="mel-campo" data-campo="email">'
        +     '<label for="mel-email">E-mail</label>'
        +     '<input id="mel-email" name="email" type="email" autocomplete="email" inputmode="email" placeholder="voce@exemplo.com">'
        +     '<span class="mel-campo-erro" id="mel-email-erro"></span>'
        +   '</div>'
        +   '<div class="mel-campo" data-campo="senha">'
        +     '<label for="mel-senha">Senha</label>'
        +     '<input id="mel-senha" name="senha" type="password" placeholder="Sua senha">'
        +     '<span class="mel-campo-erro" id="mel-senha-erro"></span>'
        +     '<span class="mel-campo-dica" data-dica-senha>Pelo menos 8 caracteres, com letras e números.</span>'
        +   '</div>'
        +   '<div class="mel-campo" data-campo="confirma">'
        +     '<label for="mel-confirma">Repita a senha</label>'
        +     '<input id="mel-confirma" name="confirma" type="password" autocomplete="new-password" placeholder="A mesma senha">'
        +     '<span class="mel-campo-erro" id="mel-confirma-erro"></span>'
        +   '</div>'
        +   '<button type="submit" class="mel-acesso-enviar"></button>'
        + '</form>'
        + '<p class="mel-acesso-nota">Esta conta vale <strong>só neste navegador</strong>: o site ainda não '
        +   'tem servidor. Nada é enviado para lugar nenhum e nenhuma senha é guardada — fica apenas um '
        +   'resumo criptográfico dela (PBKDF2), do qual a senha não pode ser recuperada.</p>';

      cortina.appendChild(cartao);
      document.body.appendChild(cortina);
      modal = cortina;

      var form = cartao.querySelector('form');
      var aviso = cartao.querySelector('.mel-acesso-aviso');
      var enviar = cartao.querySelector('.mel-acesso-enviar');
      var abas = Array.prototype.slice.call(cartao.querySelectorAll('.mel-acesso-aba'));
      var campos = {
        nome: cartao.querySelector('#mel-nome'),
        email: cartao.querySelector('#mel-email'),
        senha: cartao.querySelector('#mel-senha'),
        confirma: cartao.querySelector('#mel-confirma'),
      };
      var enviando = false;
      var atual = modo;

      /* Trava de rolagem em <html>, não no <body>: no body a página pula para o
         topo ao reabrir. Mesma lição do menu do template. */
      var travaAntes = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'hidden';

      function mostrarErro(nome, msg) {
        var campo = campos[nome];
        var alvo = cartao.querySelector('#mel-' + nome + '-erro');
        if (!campo || !alvo) return;
        alvo.textContent = msg || '';
        if (msg) {
          campo.setAttribute('aria-invalid', 'true');
          campo.setAttribute('aria-describedby', 'mel-' + nome + '-erro');
        } else {
          campo.removeAttribute('aria-invalid');
          campo.removeAttribute('aria-describedby');
        }
      }
      function dizer(tipo, msg) {
        aviso.hidden = !msg;
        aviso.setAttribute('data-tipo', tipo);
        aviso.textContent = msg || '';
      }

      function pintar() {
        var criando = atual === 'criar';
        cartao.querySelector('.mel-acesso-tit').textContent = criando ? 'Criar conta' : 'Entrar';
        cartao.querySelector('.mel-acesso-sub').textContent = criando
          ? 'Para guardar sua sacola e acompanhar seus pedidos.'
          : 'Bem-vindo de volta à colmeia.';
        enviar.textContent = criando ? 'CRIAR CONTA' : 'ENTRAR';
        abas.forEach(function (a) {
          a.setAttribute('aria-selected', String(a.getAttribute('data-modo') === atual));
        });
        cartao.querySelector('[data-campo="nome"]').hidden = !criando;
        cartao.querySelector('[data-campo="confirma"]').hidden = !criando;
        cartao.querySelector('[data-dica-senha]').hidden = !criando;
        /* autocomplete muda com o modo, senão o gerenciador de senhas oferece
           a senha salva na hora de criar uma nova. */
        campos.senha.setAttribute('autocomplete', criando ? 'new-password' : 'current-password');
        ['nome', 'email', 'senha', 'confirma'].forEach(function (n) { mostrarErro(n, ''); });
        dizer('erro', '');
      }

      abas.forEach(function (a) {
        a.addEventListener('click', function () {
          if (enviando) return;
          atual = a.getAttribute('data-modo');
          pintar();
          campos[atual === 'criar' ? 'nome' : 'email'].focus();
        });
      });

      /* Valida ao sair do campo, nunca a cada tecla: acusar erro de e-mail na
         terceira letra é hostil com quem ainda está digitando. */
      campos.email.addEventListener('blur', function () {
        if (campos.email.value) mostrarErro('email', validarEmail(campos.email.value));
      });
      campos.senha.addEventListener('blur', function () {
        if (atual === 'criar' && campos.senha.value) mostrarErro('senha', validarSenha(campos.senha.value));
      });
      campos.confirma.addEventListener('blur', function () {
        if (campos.confirma.value) mostrarErro('confirma', validarConfirma(campos.senha.value, campos.confirma.value));
      });

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (enviando) return;             // trava de envio duplo, 1 de 2

        var criando = atual === 'criar';
        var erros = {
          email: validarEmail(campos.email.value),
          senha: criando ? validarSenha(campos.senha.value) : (campos.senha.value ? '' : 'Digite sua senha.'),
        };
        if (criando) {
          erros.nome = validarNome(campos.nome.value);
          erros.confirma = validarConfirma(campos.senha.value, campos.confirma.value);
        }
        var primeiro = null;
        Object.keys(erros).forEach(function (n) {
          mostrarErro(n, erros[n]);
          if (erros[n] && !primeiro) primeiro = n;
        });
        if (primeiro) {
          dizer('erro', 'Confira os campos marcados.');
          campos[primeiro].focus();
          return;
        }

        if (!temCripto()) {
          dizer('erro', 'Este navegador não expõe o WebCrypto nesta origem, então a senha não pode '
            + 'ser protegida. O acesso foi recusado de propósito: guardar senha sem proteção seria pior.');
          return;
        }

        enviando = true;                  // trava de envio duplo, 2 de 2
        enviar.disabled = true;
        var texto = enviar.textContent;
        enviar.innerHTML = '<span class="mel-acesso-giro"></span>' + (criando ? 'CRIANDO…' : 'ENTRANDO…');
        dizer('erro', '');

        var email = campos.email.value.trim().toLowerCase();

        function falhou(msg, foco) {
          enviando = false;
          enviar.disabled = false;
          enviar.textContent = texto;
          dizer('erro', msg);
          if (foco && campos[foco]) campos[foco].focus();
        }

        if (criando) {
          if (Contas.achar(email)) {
            falhou('Já existe uma conta com este e-mail neste navegador. Entre em vez de criar.', 'email');
            return;
          }
          var sal = salNovo();
          derivar(campos.senha.value, sal).then(function (h) {
            var lista = Contas.todas();
            var conta = { nome: campos.nome.value.trim(), email: email, sal: sal,
                          hash: h, iteracoes: ITERACOES, criadaEm: Date.now() };
            lista.push(conta);
            if (!Contas.gravar(lista)) {
              falhou('Não deu para guardar a conta neste navegador. O armazenamento local pode estar cheio ou bloqueado.');
              return;
            }
            Sessao.abrir(conta);
            concluir('Conta criada. Bem-vindo, ' + conta.nome + '.');
          }).catch(function () {
            falhou('Não foi possível proteger a senha neste navegador. Nada foi gravado.');
          });
        } else {
          var conta = Contas.achar(email);
          if (!conta) {
            /* Mesma frase para e-mail inexistente e senha errada: dizer qual
               dos dois falhou entrega quais e-mails têm conta. */
            falhou('E-mail ou senha incorretos.', 'senha');
            return;
          }
          derivar(campos.senha.value, conta.sal).then(function (h) {
            if (!iguais(h, conta.hash)) { falhou('E-mail ou senha incorretos.', 'senha'); return; }
            Sessao.abrir(conta);
            concluir('Tudo certo. Olá de novo, ' + conta.nome + '.');
          }).catch(function () {
            falhou('Não foi possível verificar a senha neste navegador.');
          });
        }
      });

      function concluir(msg) {
        enviar.innerHTML = '';
        enviar.textContent = 'PRONTO';
        dizer('ok', msg);
        vivo.textContent = msg;
        pintarSelo();
        setTimeout(function () { fecharAcesso(true); }, 1100);
      }

      function fecharAcesso(devolverFoco) {
        if (!modal) return;
        document.documentElement.style.overflow = travaAntes;
        modal.remove();
        modal = null;
        if (devolverFoco && focoAntes && focoAntes.focus) focoAntes.focus();
      }

      cartao.querySelector('.mel-acesso-x').addEventListener('click', function () { fecharAcesso(true); });
      cortina.addEventListener('mousedown', function (e) { if (e.target === cortina) fecharAcesso(true); });
      cortina.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { e.preventDefault(); fecharAcesso(true); return; }
        if (e.key !== 'Tab') return;
        /* Foco preso no cartão: sem isto o Tab passeia pela página atrás da
           cortina, que é exatamente o que um diálogo modal não pode deixar. */
        var focaveis = Array.prototype.slice.call(cartao.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
          .filter(function (el) { return el.offsetParent !== null && !el.disabled; });
        if (!focaveis.length) return;
        var pri = focaveis[0], ult = focaveis[focaveis.length - 1];
        if (e.shiftKey && document.activeElement === pri) { e.preventDefault(); ult.focus(); }
        else if (!e.shiftKey && document.activeElement === ult) { e.preventDefault(); pri.focus(); }
      });

      pintar();
      if (menosMovimento.matches) {
        cortina.style.opacity = '1';
        cartao.style.transform = 'none';
      } else {
        var t0 = 0;
        requestAnimationFrame(function passo(t) {
          if (!t0) t0 = t;
          var k = Math.min((t - t0) / 260, 1);
          var s = k * k * (3 - 2 * k);
          cortina.style.opacity = String(s);
          cartao.style.transform = 'translateY(' + (8 * (1 - s)).toFixed(2) + 'px) scale('
            + (0.985 + 0.015 * s).toFixed(4) + ')';
          if (k < 1) requestAnimationFrame(passo);
        });
      }
      (atual === 'criar' ? campos.nome : campos.email).focus();
    }

    /* A sacola muda em qualquer página e em qualquer aba: o selo escuta os dois
       caminhos. O evento próprio cobre a mesma aba; o storage cobre as outras. */
    document.addEventListener('mel:sacola-mudou', pintarSelo);
    window.addEventListener('storage', function (e) {
      if (e.key === 'melcam:sacola' || e.key === 'melcam:sessao') pintarSelo();
    });
    pintarSelo();
  }


  /* ================= /polen — hero premium ==================
     Roda so em body.mel-pagina-polen, porque data-mel="polen-hero" so existe
     la. Nao toca em iniciarFileira nem em nada da home.

     A ENTRADA E TODA EM CSS (keyframes com "both"), nao aqui. Motivo: keyframe
     roda sozinho e termina no estado final mesmo se este script nao carregar.
     Estado inicial escondido que so o JS desfaz foi o que produziu o "hero em
     branco" registrado no progresso.md. Entao sobra para o JS apenas:
       1. o efeito de scroll, discreto;
       2. a rolagem suave do CTA ate o seletor de cores. */
  function iniciarHeroPolen() {
    var hero = document.querySelector('[data-mel="polen-hero"]');
    if (!hero || hero.hasAttribute('data-mel-ligado')) return;
    hero.setAttribute('data-mel-ligado', '1');

    /* LARGURA CHEIA, MEDIDA — 13/08/2026.
       O hero nasce dentro do container do template, que em 1440 tem 983px:
       sobravam calhas pretas de 228px de cada lado. Estender por 100vw seria
       errado, porque 100vw INCLUI a barra de rolagem e criaria transbordo
       horizontal. clientWidth nao inclui. Entao a sangria e medida: largura =
       clientWidth, e a margem esquerda puxa o bloco ate a borda da janela.
       Sem JS o hero fica na largura do container — mais estreito, nunca quebrado. */
    function sangrar() {
      hero.style.width = '';
      hero.style.marginLeft = '';
      var vw = document.documentElement.clientWidth;
      /* A ORDEM IMPORTA: a largura vai PRIMEIRO. O pai e flex column com
         align-items:center, entao alargar o filho ja o recentra sozinho —
         medir a posicao antes disso e deslocar em dobro. Medido: dava
         -195..1245 em vez de 0..1440. */
      hero.style.width = vw + 'px';
      var esq = hero.getBoundingClientRect().left;
      hero.style.marginLeft = (-esq) + 'px';
    }
    sangrar();
    window.addEventListener('resize', sangrar, { passive: true });
    /* De novo no load: antes das imagens a pagina pode nao ter barra de
       rolagem, e clientWidth medido ali fica maior que o real. Sem esta
       segunda passada o hero abria com uma calha lateral. */
    window.addEventListener('load', sangrar);

    var foto = hero.querySelector('[data-mel="polen-hero-main"]');
    var cta = hero.querySelector('[data-mel="polen-hero-cta"]');

    /* CTA: rola suave ate o seletor. Com movimento reduzido, salta direto —
       a preferencia vale para rolagem tambem, nao so para animacao. */
    if (cta) {
      cta.addEventListener('click', function (ev) {
        var id = (cta.getAttribute('href') || '').replace('#', '');
        var alvo = id && document.getElementById(id);
        if (!alvo) return;
        ev.preventDefault();
        alvo.scrollIntoView({
          behavior: menosMovimento.matches ? 'auto' : 'smooth',
          block: 'start'
        });
      });
    }

    if (menosMovimento.matches) return;   /* sem paralaxe nenhum */
    if (!foto) return;

    /* Teto do deslocamento, em px. Baixo de proposito: o pedido e "muito
       discreto", e o que estraga esse efeito e exagero, nao falta. */
    var FOTO_MAX = 18;

    var topo = 0, altura = 1, pendente = false;

    /* Geometria lida so aqui, FORA do loop. Dentro do loop nao ha leitura
       nenhuma de layout — e isso que evita realimentacao e tremor. */
    function medir() {
      var r = hero.getBoundingClientRect();
      topo = r.top + window.scrollY;
      altura = hero.offsetHeight || 1;
    }

    /* Escritor unico: quem escreve o transform da foto e esta funcao, e so
       ela. A entrada e keyframe de CSS no <img> filho, entao nao colide. */
    function pintar() {
      pendente = false;
      var q = (window.scrollY - topo) / altura;
      if (q < 0) q = 0; else if (q > 1) q = 1;
      foto.style.transform = 'translate3d(0,' + (-FOTO_MAX * q).toFixed(2) + 'px,0)';
    }

    function agendar() {
      if (pendente) return;
      pendente = true;
      requestAnimationFrame(pintar);
    }

    medir();
    pintar();
    window.addEventListener('scroll', agendar, { passive: true });
    window.addEventListener('resize', function () { medir(); agendar(); }, { passive: true });
    window.addEventListener('load', function () { medir(); agendar(); });
  }


  /* ====== /polen — scrollytelling de "O diferencial" ======
     Roda so em body.mel-pagina-polen: [data-mel="polen-story"] nao existe em
     nenhuma outra pagina. NAO toca em iniciarFileira nem em variavel dela —
     tudo aqui e local a esta funcao.

     O QUE ESTE SCRIPT FAZ COM O PALCO: liga uma classe na secao e troca um
     atributo no capitulo ativo. So isso. Quem anima a cena e o painel e o
     CSS, por transition. Nenhuma leitura de layout dentro de listener.

     O FUNDO, acrescentado em 14/08/2026, e a unica parte com laco: ele precisa
     de progresso continuo, que o IntersectionObserver nao da. E um so scroll
     passivo, coalescido em rAF, que para de rodar assim que os valores
     assentam. A geometria dele tambem e lida fora do laco. O capitulo ativo
     continua sendo decidido num lugar so, ativar().

     O ESTADO SEM ESTE SCRIPT E VALIDO: sem a classe, o CSS deixa cada cena na
     propria linha ao lado do passo, todas visiveis. Por isso o palco so
     aparece depois que este codigo confirma que pode existir. */
  function iniciarScrollytellingPolen() {
    var raiz = document.querySelector('[data-mel="polen-story"]');
    if (!raiz || raiz.hasAttribute('data-mel-ligado')) return;
    raiz.setAttribute('data-mel-ligado', '1');

    var cenas  = [].slice.call(raiz.querySelectorAll('[data-mel-story-scene]'));
    var passos = [].slice.call(raiz.querySelectorAll('[data-mel-story-step]'));
    var conta  = raiz.querySelector('[data-mel-story-atual]');
    /* Descasou, nao liga nada: melhor a lista honesta de duas colunas do que
       um palco apontando para o capitulo errado. */
    if (!cenas.length || cenas.length !== passos.length) return;

    /* A cena 1 ja nasce com src; as outras esperam aqui. Sem isso as nove
       entrariam de uma vez, porque empilhadas elas contam como visiveis e
       loading="lazy" nao segura. */
    function carregar(i) {
      var c = cenas[i];
      if (!c) return;
      var img = c.querySelector('img[data-src]');
      if (!img) return;
      img.src = img.getAttribute('data-src');
      img.removeAttribute('data-src');
    }

    /* Movimento reduzido: nenhum palco, nenhuma troca automatica. O layout
       sequencial do CSS ja e o estado final; falta so trazer as imagens, para
       que nenhuma fique invisivel. */
    if (menosMovimento.matches) {
      for (var k = 0; k < cenas.length; k++) carregar(k);
      return;
    }

    /* Sem IntersectionObserver, fica o layout de duas colunas com tudo
       visivel. Nada de fallback com listener de scroll: seria pior que o
       estado estatico, que ja e legivel. */
    if (typeof IntersectionObserver !== 'function') {
      for (var k2 = 0; k2 < cenas.length; k2++) carregar(k2);
      return;
    }

    raiz.classList.add('mel-story-ligado');

    var ativo = -1;

    /* ============ ambientacao do fundo ============
       O palco continua sendo o assunto: tudo daqui e luz e profundidade atras
       da camera, em opacity e transform, sem tocar em geometria nenhuma.

       DE ONDE VEM O PROGRESSO. Duas grandezas, as duas da mesma secao:
         q    contInuo, 0..1, a secao atravessando a viewport;
         cap  o capitulo ativo, mas INTERPOLADO — persegue "ativo", que
              continua sendo escrito so por ativar(). Nao ha segunda
              autoridade sobre qual capitulo esta valendo.

       LISTENER UNICO. Um scroll passivo, coalescido em requestAnimationFrame,
       igual ao do hero. Nada de segundo observador e nada de leitura de layout
       dentro do laco: a geometria e lida em medirFundo(), fora dele.

       PARADO, O LACO PARA. Quando os dois valores assentam no alvo o rAF sai
       de cena. O movimento de repouso e todo do CSS — keyframes de 34s a 61s
       em alternate, que nunca reiniciam com salto. */
    var fundo  = raiz.querySelector('[data-mel-story-fundo]');
    var luz    = fundo && fundo.querySelector('[data-mel-story-luz]');
    var formas = fundo ? [].slice.call(fundo.querySelectorAll('[data-mel-story-forma]')) : [];

    /* Amplitude do parallax por plano, em px. E a DIFERENCA entre elas que
       produz profundidade; os numeros baixos sao o que a mantem lenta. */
    var AMP = [44, 96, 156];

    var topoS = 0, altS = 1, largF = 1, altF = 1;
    var qAlvo = 0, q = 0, capAlvo = 0, cap = 0, rodando = false;

    function medirFundo() {
      if (!fundo) return;
      var r = raiz.getBoundingClientRect();
      topoS = r.top + window.scrollY;
      altS  = raiz.offsetHeight || 1;
      largF = fundo.clientWidth || 1;
      altF  = fundo.clientHeight || 1;
    }

    /* O foco segue o LADO do capitulo, e o lado vem do data-lado que
       tools/polen.js escreveu na cena — a mesma fonte que o palco e o contador
       ja usam. Nada e recalculado aqui.

       .44 e .56, e nao .32 e .68. Medido em 1440: com o par largo a luz
       atravessava 500px a cada troca, e os capitulos alternam de lado — eram
       oito travessias de tela numa descida. Ficava um holofote de palco
       varrendo o fundo, exatamente o oposto de discreto. Em .44/.56 o
       deslocamento total e de 167px: a luz INCLINA para o lado da camera, que
       e o que o olho precisa para sentir de onde vem a iluminacao. */
    function ladoDe(i) {
      var n = cenas.length;
      var c = cenas[i < 0 ? 0 : (i >= n ? n - 1 : i)];
      return (c && c.getAttribute('data-lado') === 'dir') ? .56 : .44;
    }

    /* Escritor unico do fundo. Nenhuma leitura de layout aqui dentro. */
    function pintarFundo() {
      var n = cenas.length > 1 ? cenas.length - 1 : 1;
      var t = cap / n;                       /* 0..1 ao longo dos capitulos */
      var i = Math.floor(cap), f = cap - i;

      /* Trocar de coluna ATRAVESSA a tela em vez de saltar: a posicao e a
         interpolacao entre o lado deste capitulo e o do proximo. */
      var lx = ladoDe(i) + (ladoDe(i + 1) - ladoDe(i)) * f;
      /* Desce junto com a rolagem, mas a MEIA VELOCIDADE dela: .48 da altura
         da secao contra 1,0 do conteudo. E essa diferenca que poe o fundo
         atras do palco em vez de colado nele. */
      var ly = .22 + q * .48;

      luz.style.transform = 'translate(-50%,-50%) translate3d(' +
        ((lx - .5) * largF).toFixed(1) + 'px,' + ((ly - .5) * altF).toFixed(1) + 'px,0)';

      /* Intensidade abre e fecha em meia onda: mais luz no miolo da secao, que
         e onde os capitulos do meio pedem leitura. Temperatura anda de ambar
         para brasa, e quem cruza as duas camadas e a opacidade de uma so. */
      fundo.style.setProperty('--li', (.78 + .22 * Math.sin(t * Math.PI)).toFixed(3));
      fundo.style.setProperty('--lt', t.toFixed(3));

      for (var k = 0; k < formas.length; k++) {
        formas[k].style.transform =
          'translate3d(0,' + (-(q - .5) * (AMP[k] || 44)).toFixed(1) + 'px,0)';
      }
    }

    function quadro() {
      var meio = window.scrollY + window.innerHeight / 2;
      qAlvo = (meio - topoS) / altS;
      if (qAlvo < 0) qAlvo = 0; else if (qAlvo > 1) qAlvo = 1;
      capAlvo = ativo < 0 ? 0 : ativo;

      /* HISTERESE. O alvo pode pular um capitulo inteiro de uma vez; a saida
         nunca pula. A 0,065 por quadro uma troca leva cerca de 0,75s, entao um
         passo que entre e saia da faixa de ativacao no limiar move o fundo
         poucos por cento e volta — o olho le respiracao, nao piscada. Vale
         igual na rolagem reversa: e o mesmo caminho, ao contrario.

         Era 0,085 ate a primeira medicao: o salto maximo por amostra do
         qa-story-fundo dava 127px contra um teto de 130, folga nenhuma. Em
         0,065 a mesma travessia cai para menos de 100. */
      q   += (qAlvo - q) * .12;
      cap += (capAlvo - cap) * .065;
      pintarFundo();

      if (Math.abs(qAlvo - q) < .0005 && Math.abs(capAlvo - cap) < .004) {
        q = qAlvo; cap = capAlvo;
        pintarFundo();
        rodando = false;
        return;
      }
      requestAnimationFrame(quadro);
    }

    function acordarFundo() {
      if (!fundo || !luz || rodando) return;
      rodando = true;
      requestAnimationFrame(quadro);
    }

    if (fundo && luz) {
      medirFundo();
      window.addEventListener('scroll', acordarFundo, { passive: true });
      window.addEventListener('resize', function () { medirFundo(); acordarFundo(); }, { passive: true });
      /* A altura da secao muda quando as fotos entram; remedir no load evita
         que o foco fique calibrado para a pagina vazia. */
      window.addEventListener('load', function () { medirFundo(); acordarFundo(); });
    }

    function ativar(i) {
      if (i < 0 || i >= cenas.length || i === ativo) return;
      if (ativo >= 0) {
        cenas[ativo].removeAttribute('data-mel-story-ativa');
        passos[ativo].removeAttribute('data-mel-story-ativa');
      }
      ativo = i;
      cenas[i].setAttribute('data-mel-story-ativa', '');
      passos[i].setAttribute('data-mel-story-ativa', '');
      /* O contador muda de coluna junto com o painel. O lado nao e calculado
         aqui: vem do data-lado que tools/polen.js escreveu na cena, entao ha
         uma fonte de verdade so. */
      raiz.setAttribute('data-lado-ativo', cenas[i].getAttribute('data-lado') || 'esq');
      /* A cena de agora e a proxima. So elas: pre-carregar as nove seria o
         mesmo que nao ter adiado nada. */
      carregar(i);
      carregar(i + 1);
      if (conta) conta.textContent = (i + 1 < 10 ? '0' : '') + (i + 1);
      /* O fundo nao decide capitulo: ele so e avisado de que o alvo mudou e
         caminha ate la. */
      acordarFundo();
    }

    /* Usada uma vez, na largada. Cobre abrir a pagina no meio da secao, onde
       nenhum passo cruza a faixa central e o observer nao teria o que dizer. */
    function maisProximoDoCentro() {
      var meio = window.innerHeight / 2, melhor = 0, menor = Infinity;
      for (var i = 0; i < passos.length; i++) {
        var r = passos[i].getBoundingClientRect();
        var d = Math.abs((r.top + r.bottom) / 2 - meio);
        if (d < menor) { menor = d; melhor = i; }
      }
      return melhor;
    }
    ativar(maisProximoDoCentro());

    /* Faixa de ativacao: os 4% centrais da viewport. Um capitulo entra quando
       cruza o centro da tela, que e onde o olho esta. Como a faixa e estreita,
       raramente ha dois passos dentro dela; quando ha (passo curto no fim da
       secao), vence o de menor indice, o que mantem a ordem na descida e na
       subida. */
    var dentro = [];
    var observador = new IntersectionObserver(function (entradas) {
      for (var i = 0; i < entradas.length; i++) {
        var idx = +entradas[i].target.getAttribute('data-story-index');
        var p = dentro.indexOf(idx);
        if (entradas[i].isIntersecting) { if (p < 0) dentro.push(idx); }
        else if (p >= 0) dentro.splice(p, 1);
      }
      if (!dentro.length) return;   /* fora da faixa, segura o ultimo ativo */
      dentro.sort(function (a, b) { return a - b; });
      ativar(dentro[0]);
    }, { rootMargin: '-48% 0px -48% 0px', threshold: 0 });

    for (var j = 0; j < passos.length; j++) observador.observe(passos[j]);
  }


  /* ============ /polen — seletor das 7 cores ============
     As cores NAO vivem aqui: cada botao carrega data-nome, data-sub e
     data-img, escritos por tools/polen.js a partir de melcam.config.json. */
  function iniciarSeletorPolen() {
    var raiz = document.querySelector('[data-mel="polen-produto"]');
    if (!raiz || raiz.hasAttribute('data-mel-ligado')) return;

    var grupo  = raiz.querySelector('[data-mel="polen-cores"]');
    var botoes = Array.prototype.slice.call(raiz.querySelectorAll('[data-mel-cor]'));
    var elNome = raiz.querySelector('[data-mel="polen-nome"]');
    var elSub  = raiz.querySelector('[data-mel="polen-sub"]');
    var cta    = raiz.querySelector('[data-mel="polen-cta"]');
    var vivo   = raiz.querySelector('[data-mel="polen-vivo"]');
    var camadas = [
      raiz.querySelector('[data-mel="polen-palco-a"]'),
      raiz.querySelector('[data-mel="polen-palco-b"]')
    ];
    if (!grupo || !botoes.length || !elNome || !cta || !camadas[0] || !camadas[1]) return;
    raiz.setAttribute('data-mel-ligado', '1');

    var ativo = 0;    /* qual das duas camadas esta visivel */
    var atual = -1;   /* indice da cor selecionada */
    var pedido = 0;   /* o ultimo clique vence, mesmo se a rede inverter a ordem */

    /* Crossfade de estado explicito: exatamente uma camada visivel em repouso,
       a outra em opacidade 0 e fora da arvore de acessibilidade. */
    function trocarFoto(img, nome) {
      var entra = camadas[1 - ativo];
      var sai = camadas[ativo];
      entra.src = img;
      /* Mesmo texto que o HTML entrega no primeiro render, com acento. O que
         este arquivo proibe e crase e abre-interpolacao; acento passa. */
      entra.alt = 'Câmera digital retrô Polen, na cor ' + nome;
      entra.removeAttribute('aria-hidden');
      entra.classList.remove('mel-pr-foto-fora');
      sai.classList.add('mel-pr-foto-fora');
      sai.setAttribute('aria-hidden', 'true');
      sai.alt = '';
      ativo = 1 - ativo;
    }

    function selecionar(i, focar) {
      var b = botoes[i];
      if (!b) return;

      /* O estado do controle e imediato: nao espera imagem carregar. */
      for (var k = 0; k < botoes.length; k++) {
        var sel = k === i;
        botoes[k].setAttribute('aria-checked', sel ? 'true' : 'false');
        botoes[k].tabIndex = sel ? 0 : -1;
      }
      if (focar) b.focus();
      if (i === atual) return;
      atual = i;

      var nome = b.getAttribute('data-nome');
      var sub  = b.getAttribute('data-sub');
      var img  = b.getAttribute('data-img');

      elNome.textContent = nome;
      if (elSub) elSub.textContent = sub;
      cta.setAttribute('data-mel-add', 'Polen ' + nome);
      cta.setAttribute('aria-label', cta.getAttribute('data-mel-rotulo') + ' Polen ' + nome);
      if (vivo) vivo.textContent = 'Polen ' + nome + '. ' + sub;

      /* Pre-carrega e so troca depois: sem isso a caixa pisca em branco. */
      var meu = ++pedido;
      var pre = new Image();
      pre.onload = function () { if (meu === pedido) trocarFoto(img, nome); };
      pre.onerror = function () { if (meu === pedido) trocarFoto(img, nome); };
      pre.src = img;
    }

    for (var i = 0; i < botoes.length; i++) {
      (function (n) {
        botoes[n].addEventListener('click', function () { selecionar(n, false); });
      }(i));
    }

    grupo.addEventListener('keydown', function (ev) {
      var n = botoes.length, alvo = -1;
      if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') alvo = (atual + 1) % n;
      else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') alvo = (atual - 1 + n) % n;
      else if (ev.key === 'Home') alvo = 0;
      else if (ev.key === 'End') alvo = n - 1;
      else return;
      ev.preventDefault();
      selecionar(alvo, true);
    });

    /* Estado inicial: o indice ja marcado no HTML, que e o mesmo da camera do
       hero — a transicao de uma secao para a outra fica continua. */
    var inicial = 0;
    for (var j = 0; j < botoes.length; j++) {
      if (botoes[j].getAttribute('aria-checked') === 'true') { inicial = j; break; }
    }
    atual = inicial;
    for (var m = 0; m < botoes.length; m++) botoes[m].tabIndex = m === inicial ? 0 : -1;
  }


  /* ====== /bee — hero ======
     Sai imediatamente fora de body.mel-pagina-bee: o alvo [data-mel="bee-hero"]
     não existe em nenhuma outra página, então a primeira linha resolve.

     TODA a animação de entrada é keyframe de CSS com "both": roda sozinha e
     termina no estado final mesmo se este script não carregar. Estado inicial
     escondido que só o JS desfaz foi o que produziu o "hero em branco"
     registrado no progresso.md.

     Sobram para o JS exatamente duas coisas, e nenhuma delas move nada depois
     que a cena assenta — o pedido é "depois da entrada, tudo permanece
     estável", então NÃO há paralaxe aqui (a /polen tem; a /bee não).
       1. a largura cheia, que precisa de medição;
       2. a rolagem suave do CTA até a escolha da cor.
     Nada aqui toca em iniciarFileira() nem em variável dela. */
  function iniciarHeroBee() {
    var hero = document.querySelector('[data-mel="bee-hero"]');
    if (!hero || hero.hasAttribute('data-mel-ligado')) return;
    hero.setAttribute('data-mel-ligado', '1');

    /* LARGURA CHEIA, MEDIDA — mesma técnica da /polen, mesmo motivo.
       O hero nasce dentro do container do template, que em 1440 tem 983px:
       sobrariam calhas de papel de 228px de cada lado, e o plano de mel
       pararia no meio da tela em vez de sangrar. Estender por 100vw seria
       errado: 100vw INCLUI a barra de rolagem e criaria transbordo
       horizontal. clientWidth não inclui.
       Sem JS o hero fica na largura do container — mais estreito, nunca
       quebrado, e o plano de mel continua fazendo sentido. */
    function sangrar() {
      hero.style.width = '';
      hero.style.marginLeft = '';
      var vw = document.documentElement.clientWidth;
      /* A ORDEM IMPORTA: a largura vai PRIMEIRO. O pai é flex column com
         align-items:center, então alargar o filho já o recentra sozinho —
         medir a posição antes disso desloca em dobro. */
      hero.style.width = vw + 'px';
      var esq = hero.getBoundingClientRect().left;
      hero.style.marginLeft = (-esq) + 'px';
    }
    sangrar();
    window.addEventListener('resize', sangrar, { passive: true });
    /* De novo no load: antes das imagens a página pode não ter barra de
       rolagem, e o clientWidth medido ali fica maior que o real. */
    window.addEventListener('load', sangrar);

    /* O VÍDEO. Quase nada sobra para cá, e isso é de propósito: quem escolhe a
       versão (960 ou 576) e quem decide se existe <source> é o <script>
       síncrono que vem logo depois do elemento no HTML — ele roda durante o
       parse, antes de o navegador buscar byte nenhum. Ver tools/bee.js.

       O que só dá para fazer daqui é o depois: se a pessoa LIGAR "menos
       movimento" com a página aberta, o loop tem de parar sem recarregar. Volta
       ao quadro 1, que é o mesmo do poster — parar no meio deixaria a Bee
       torta e num quadro que ninguém escolheu. */
    var video = hero.querySelector('[data-mel="bee-hero-video"]');
    if (video && menosMovimento.addEventListener) {
      menosMovimento.addEventListener('change', function (ev) {
        if (ev.matches) { video.pause(); try { video.currentTime = 0; } catch (e) {} }
        else if (video.querySelector('source')) { var p = video.play(); if (p && p.catch) p.catch(function () {}); }
      });
    }

    /* CTA: rola suave até a escolha da cor. Com movimento reduzido salta
       direto — a preferência vale para rolagem também, não só para animação. */
    var cta = hero.querySelector('[data-mel="bee-hero-cta"]');
    if (!cta) return;
    cta.addEventListener('click', function (ev) {
      var id = (cta.getAttribute('href') || '').replace('#', '');
      var alvo = id && document.getElementById(id);
      if (!alvo) return;
      ev.preventDefault();
      alvo.scrollIntoView({
        behavior: menosMovimento.matches ? 'auto' : 'smooth',
        block: 'start'
      });
    });
  }

  /* ====== /bee — revelação por rolagem ======
     UM observador para a página inteira, e nenhum listener de scroll: quem
     conta quadro a quadro na rolagem é o navegador, de graça, fora da thread
     principal. Sai imediatamente em qualquer outra rota — data-mel-rev não
     existe em nenhum outro documento do site.

     O QUE ESTA FUNÇÃO PODE E NÃO PODE FAZER. Ela só ESCREVE data-mel-visto.
     Não esconde nada, nunca remove o atributo e não mexe em estilo inline: o
     estado inicial é do CSS e depende de html.mel-bee-rev, que é escrito por um
     <script> síncrono no topo do conteúdo (ver SINALIZADOR em tools/bee.js).
     Se este arquivo não carregar, nada fica escondido.

     REVELADO É DEFINITIVO — e é por isso que o unobserve vem junto do atributo,
     na mesma linha. Sem ele, um elemento parado exatamente no limite da
     viewport recebe entrada e saída a cada quadro de rolagem e fica piscando;
     com ele, o navegador para de olhar para a peça no instante em que ela
     aparece, e nem rolagem reversa nem resize trazem o estado escondido de
     volta. */
  function iniciarRevelarBee() {
    var alvos = [].slice.call(document.querySelectorAll('[data-mel-rev]'));
    if (!alvos.length) return;

    function revelar(el) { el.setAttribute('data-mel-visto', ''); }

    /* Motor sem IntersectionObserver, ou preferência por menos movimento:
       tudo revelado de uma vez. A preferência vale para a espera também — quem
       pediu menos movimento não deveria precisar rolar para ler. O CSS já
       garante isto sozinho; aqui é a segunda tranca, para o atributo ficar
       coerente com o que está na tela. */
    if (!window.IntersectionObserver || menosMovimento.matches) {
      alvos.forEach(revelar);
      return;
    }

    var obs = new IntersectionObserver(function (ents) {
      for (var k = 0; k < ents.length; k++) {
        var e = ents[k];
        /* boundingClientRect.top < 0 cobre o que JÁ passou por cima da tela:
           recarga com âncora (#modelos vem do CTA do hero) e restauração de
           rolagem do navegador. Sem esta metade, quem volta à página no meio
           dela encontra buracos acima do ponto em que parou, e eles só
           apareceriam rolando para trás. */
        if (e.isIntersecting || e.boundingClientRect.top < 0) {
          revelar(e.target);
          obs.unobserve(e.target);
        }
      }
    }, {
      /* Margem e limiar fixos, escolhidos uma vez e iguais para todo mundo:
         -10% embaixo faz a peça começar a entrar um pouco depois de encostar na
         borda, que é o que dá a leitura de "revelada ao entrar" em vez de "já
         estava lá"; 12% é baixo o bastante para o palco de 517px disparar cedo
         e alto o bastante para uma linha de texto não disparar de raspão. */
      rootMargin: '0px 0px -10% 0px',
      threshold: 0.12
    });
    alvos.forEach(function (el) { obs.observe(el); });
  }


  /* ====== Sobre Nós: a faixa que abre em obturador ======
     O desenho todo mora no CSS (ver "SOBRE NOS: a faixa em obturador" em
     identidade.css). Aqui e so o estado: um atributo no palco e o rotulo do
     botao. Sem JS a faixa fica fechada e legivel — titulo, linha e o link para
     /sobre continuam no DOM —, entao nada de conteudo depende deste script. */
  function iniciarSobre() {
    var palco = document.querySelector('[data-mel-sobre-palco]');
    if (!palco) return;
    var bt = palco.querySelector('[data-mel-sobre-bt]');
    var rot = palco.querySelector('[data-mel-sobre-rot]');
    if (!bt) return;

    function pintar(aberto) {
      if (aberto) palco.setAttribute('data-aberto', ''); else palco.removeAttribute('data-aberto');
      bt.setAttribute('aria-expanded', aberto ? 'true' : 'false');
      if (rot) rot.textContent = aberto ? 'Fechar' : 'Abrir';
    }

    var manual = false;
    var automaticoFeito = false;
    var obs = null;

    function encerrarObs() {
      if (obs) { obs.disconnect(); obs = null; }
    }

    bt.addEventListener('click', function () {
      /* O clique manda a partir daqui, e o observador sai de cena na hora —
         mesmo que a abertura automática ainda não tenha acontecido. Sem isso,
         fechar a faixa e rolar de leve a reabriria na cara de quem acabou de
         fechá-la. */
      manual = true;
      encerrarObs();
      pintar(!palco.hasAttribute('data-aberto'));
    });

    /* O OBTURADOR DISPARA SOZINHO QUANDO A FAIXA CHEGA — UMA VEZ SÓ.
       Como accordion parado ela era só um retângulo com um botão: o efeito
       existia, mas ninguém via sem clicar. Numa marca de câmera o gesto certo é
       o contrário — a exposição acontece quando o assunto entra no quadro.

       🔴 A OSCILAÇÃO, E POR QUE ELA ERA INEVITÁVEL — corrigido em 14/08/2026.

       A versão anterior observava o PRÓPRIO PALCO com "threshold: 0.55" e
       escrevia "pintar(isIntersecting)". Só que o CSS muda a altura desse mesmo
       elemento ao abrir — na época por "height", hoje pela fileira do meio da
       grade, que vai de 0fr ao tamanho do conteúdo; o que segue vale igual nas
       duas formas, porque o problema é a altura mudar, não como ela muda:

         fechado   altura = 2 x cortina            (600 no desktop, 400 no mobile)
         aberto    altura = 2 x cortina + conteúdo (~909 e ~764, medidos)

       O "threshold" é uma RAZÃO — parte visível dividida pela altura total. Ao
       abrir, o denominador cresce (600 -> 909 no desktop, 400 -> 764 no mobile)
       sem que a parte visível cresça junto, porque o palco cresce para BAIXO,
       além da dobra. A razão despenca abaixo de 0,55, o observador manda fechar,
       a altura volta ao valor pequeno, a razão sobe acima de 0,55 e ele manda
       abrir. O ciclo se sustenta com o scroll PARADO: o observador mede o que a
       própria animação acabou de mudar.

       Medido antes da correção (tools/qa-sobre.js), com o scroll imóvel por 10s:

         desktop 1440x900   152 alternâncias    94 aberturas + 94 fechamentos
         tablet  768x1024   202 alternâncias   124 aberturas + 124 fechamentos
         mobile  390x844    202 alternâncias   125 aberturas + 125 fechamentos

       Uma troca a cada ~35 ms, indefinidamente.

       DUAS mudanças, e cada uma sozinha já quebraria o laço — juntas, ele não
       tem por onde voltar:

       1. O ALVO passa a ser a <section data-mel-sobre>, não o palco. O palco
          cresce para baixo, então o TOPO da seção não se move quando a animação
          roda. É a geometria estável que o gatilho precisa.

       2. O GATILHO deixa de ser razão. "threshold: 0" com a borda de baixo da
          raiz puxada para 72% da janela ("rootMargin" -28%) pergunta apenas se
          o topo da seção cruzou uma linha — e altura nenhuma influencia isso.

          Os 72% saem de medição, não de gosto. O gatilho antigo caía em pontos
          DIFERENTES em cada tela, justamente porque dependia da altura do
          palco:

            desktop 1440x900   palco 600px   topo em 63,3% da janela
            tablet   768x1024  palco 400px   topo em 78,5%
            mobile   390x844   palco 400px   topo em 73,9%

          72% é a média dos três, e é a linha que menos desloca o momento da
          abertura: desvio máximo de 8,7 pontos, contra 15,5 se eu fixasse no
          valor do desktop. A primeira tentativa usou -37% (os 63,3% do
          desktop) e o QA pegou o preço: no tablet e no mobile a faixa deixava
          de abrir sozinha na posição testada.

          De quebra some uma falha latente: com razão, uma seção mais alta que a
          janela nunca alcançaria 0,55 e a faixa jamais abriria.

       3. Dispara UMA VEZ por carregamento e desconecta. Nunca fecha sozinha:
          dentro do observador só existe pintar(true). Sair e voltar à viewport
          não reabre nem fecha — depois da primeira exposição, quem manda é o
          botão. */
    var secao = palco.closest ? palco.closest('[data-mel-sobre]') : null;
    /* Sem a seção o palco volta a ser o alvo, mas o laço não volta com ele: o
       disparo único e o disconnect abaixo já o impedem sozinhos. */
    var alvoObs = secao || palco;

    if (window.IntersectionObserver) {
      obs = new IntersectionObserver(function (ents) {
        if (manual || automaticoFeito) { encerrarObs(); return; }
        for (var i = 0; i < ents.length; i++) {
          if (ents[i].isIntersecting) {
            automaticoFeito = true;
            pintar(true);
            encerrarObs();
            return;
          }
        }
      }, { threshold: 0, rootMargin: '0px 0px -28% 0px' });
      obs.observe(alvoObs);
    }

    /* Escape fecha, como o menu e o painel de conta ja fazem. */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && palco.hasAttribute('data-aberto')) {
        pintar(false);
        bt.focus();
      }
    });
  }

  /* ------------- Memórias da Colméia: a galeria vira interativa -------------
     O topicos_alteracoes.pdf pede, na home, "uma galeria INTERATIVA com
     fotografias enviadas por usuários". Interativo aqui é o que a palavra
     significa numa galeria: abrir a foto, andar entre elas, sair. Não é
     animação a mais.

     🔴 PROGRESSIVO, E É ISSO QUE DECIDE ONDE O MARKUP NASCE.
     O que vem no HTML é <li><img></li>, e é isso que continua valendo sem
     JavaScript: as oito fotos aparecem, e não há um único controle focável que
     não faça nada. O botão de cada foto e o diálogo são criados AQUI — então só
     existem onde podem funcionar. Foi a lição do "hero em branco" e a mesma
     regra do portão da /bee, aplicada ao contrário: lá o JS ESCONDE o que ele
     sabe revelar; aqui ele ACRESCENTA o que sabe operar.

     A LEGENDA JÁ TEM O LUGAR DO CRÉDITO, e ele não é inventado. Enquanto não
     houver "@usuário · cidade" autorizado (está em PENDENTES do
     melcam.config.json), a linha diz que a identificação está a confirmar. Cada
     <li> pode trazer data-mel-credito="..." e ele ganha da frase pendente — é
     por ali que o dado real entra, sem tocar nesta função. */
  function iniciarLupaComunidade() {
    var grade = document.querySelector('.mel-com-grade');
    if (!grade) return;
    var itens = [].slice.call(grade.querySelectorAll('.mel-com-item'));
    if (!itens.length) return;

    var PENDENTE = 'Autoria e cidade a confirmar com quem enviou.';
    var X = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6 L18 18 M18 6 L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    var ANT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4 L7 12 L15 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    var PROX = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4 L17 12 L9 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    /* Primeiro o inventário, depois os botões: um <li> sem <img> não vira foto,
       e se o índice do botão viesse do forEach dos <li> ele passaria a apontar
       para a foto errada a partir do primeiro buraco. */
    var fotos = [];
    itens.forEach(function (li) {
      var img = li.querySelector('img');
      if (!img) return;
      fotos.push({
        li: li, img: img,
        src: img.getAttribute('src'),
        alt: img.getAttribute('alt') || 'Foto da comunidade Melcam',
        credito: li.getAttribute('data-mel-credito') || '',
      });
    });
    if (!fotos.length) return;

    var botoes = fotos.map(function (f, i) {
      var bt = document.createElement('button');
      bt.type = 'button';
      bt.className = 'mel-com-botao';
      bt.setAttribute('aria-haspopup', 'dialog');
      bt.setAttribute('aria-label', 'Ampliar a foto ' + (i + 1) + ' de ' + fotos.length + ' da comunidade');
      f.li.insertBefore(bt, f.img);
      bt.appendChild(f.img);
      bt.addEventListener('click', function () { abrir(i); });
      return bt;
    });

    var lupa = document.createElement('div');
    lupa.className = 'mel-com-lupa';
    lupa.setAttribute('role', 'dialog');
    lupa.setAttribute('aria-modal', 'true');
    lupa.setAttribute('aria-label', 'Foto da comunidade, ampliada');
    lupa.hidden = true;
    lupa.innerHTML =
      '<button type="button" class="mel-com-x" aria-label="Fechar">' + X + '</button>'
      + '<button type="button" class="mel-com-nav mel-com-ant" aria-label="Foto anterior">' + ANT + '</button>'
      + '<button type="button" class="mel-com-nav mel-com-prox" aria-label="Próxima foto">' + PROX + '</button>'
      + '<figure class="mel-com-fig">'
      /* GIF transparente de 1x1, embutido, e não src vazio. Um <img> SEM src é
         contado como imagem quebrada por qualquer auditoria — o qa-rede
         acusava uma quebrada nas NOVE rotas por causa desta linha, porque a
         lupa é montada em toda página — e ainda desenha o ícone de quebrado
         com o texto do alt por cima. É a mesma armadilha já registrada em
         tools/polen.js, e a mesma solução: imagem válida, invisível e sem
         nenhuma ida à rede. O src real entra quando alguém abre uma foto. */
      +   '<img alt="" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7">'
      +   '<figcaption class="mel-com-cap">'
      +     '<span class="mel-com-conta"></span>'
      +     '<span class="mel-com-cred"></span>'
      +   '</figcaption>'
      + '</figure>';
    document.body.appendChild(lupa);

    var alvo = lupa.querySelector('.mel-com-fig img');
    var conta = lupa.querySelector('.mel-com-conta');
    var cred = lupa.querySelector('.mel-com-cred');
    var fig = lupa.querySelector('.mel-com-fig');
    var btX = lupa.querySelector('.mel-com-x');
    var btAnt = lupa.querySelector('.mel-com-ant');
    var btProx = lupa.querySelector('.mel-com-prox');
    var atual = 0;
    var voltarPara = null;

    /* Com uma foto só não há para onde ir: as setas saem de cena em vez de
       ficarem lá girando no mesmo lugar. */
    if (fotos.length < 2) { btAnt.hidden = true; btProx.hidden = true; }

    function pintar(i) {
      atual = (i + fotos.length) % fotos.length;
      var f = fotos[atual];
      alvo.src = f.src;
      alvo.alt = f.alt;
      conta.textContent = (atual + 1) + ' de ' + fotos.length;
      cred.textContent = f.credito || PENDENTE;
    }

    function abrir(i) {
      voltarPara = botoes[i] || null;
      pintar(i);
      lupa.hidden = false;
      btX.focus();
    }

    function fechar() {
      lupa.hidden = true;
      if (voltarPara) voltarPara.focus();
      voltarPara = null;
    }

    btX.addEventListener('click', fechar);
    btAnt.addEventListener('click', function () { pintar(atual - 1); });
    btProx.addEventListener('click', function () { pintar(atual + 1); });

    /* Clicar no fundo fecha; clicar na foto, na legenda ou num botão, não. */
    lupa.addEventListener('click', function (e) { if (e.target === lupa) fechar(); });

    /* O foco fica preso enquanto o diálogo está aberto — sem isso o Tab escapa
       para a página atrás, que continua no DOM. São quatro controles no máximo,
       então a "armadilha" é a própria lista deles. */
    lupa.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); fechar(); return; }
      if (e.key === 'ArrowLeft' && fotos.length > 1) { e.preventDefault(); pintar(atual - 1); return; }
      if (e.key === 'ArrowRight' && fotos.length > 1) { e.preventDefault(); pintar(atual + 1); return; }
      if (e.key !== 'Tab') return;
      var foco = [btX, btAnt, btProx].filter(function (b) { return !b.hidden; });
      var k = foco.indexOf(document.activeElement);
      e.preventDefault();
      if (k < 0) { foco[0].focus(); return; }
      foco[(k + (e.shiftKey ? -1 : 1) + foco.length) % foco.length].focus();
    });

    /* Arrastar no toque anda entre as fotos. 40px é o piso para não confundir
       com o toque parado que só quis fechar. O eixo importa: um arrasto mais
       vertical do que horizontal é rolagem, e não troca foto nenhuma. */
    var x0 = null, y0 = null;
    fig.addEventListener('touchstart', function (e) {
      x0 = e.changedTouches[0].clientX; y0 = e.changedTouches[0].clientY;
    }, { passive: true });
    fig.addEventListener('touchend', function (e) {
      if (x0 === null || fotos.length < 2) return;
      var dx = e.changedTouches[0].clientX - x0;
      var dy = e.changedTouches[0].clientY - y0;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) pintar(atual + (dx < 0 ? 1 : -1));
      x0 = null; y0 = null;
    }, { passive: true });
  }

  function iniciar() {
    document.querySelectorAll('[data-mel="carrossel"]').forEach(iniciarCarrossel);
    iniciarFileira();
    iniciarSobre();
    /* Só faz algo onde existe .mel-com-grade, que hoje é só a home. */
    iniciarLupaComunidade();
    /* Só fazem algo em /polen: os alvos data-mel="polen-*" não existem em
       nenhuma outra página, então saem no primeiro if. */
    iniciarHeroPolen();
    iniciarScrollytellingPolen();
    iniciarSeletorPolen();
    /* Só fazem algo em /bee: [data-mel="bee-hero"] e [data-mel-rev] não existem
       em nenhuma outra página, então as duas saem na primeira linha. */
    iniciarHeroBee();
    iniciarRevelarBee();
    iniciarFaq();
    iniciarSacola();
    iniciarAviso();
    document.querySelectorAll('[data-framer-name="Our products"]').forEach(iniciarTicker);
    iniciarMenu();
    /* Depois de iniciarMenu: o perfil escuta "mel:fechar-menus", e quem emite
       o evento é quem abre. A ordem só importa para o botão nascer à direita
       do que o template já tem na faixa. */
    iniciarPerfil();
    iniciarNavRetratil();
    /* Depois de iniciarPerfil: os links da barra nascem ali, e o tema pinta
       eles. Sai sozinho em página sem região clara. */
    iniciarTemaNavbar();
    /* Depois de iniciarPerfil também: ele cria o botão de conta, e a máscara
       precisa varrer a página já com todos os botões de mel no lugar. */
    iniciarBotoesMel();

    /* O vídeo pode ser bloqueado pelo navegador: nesse caso fica o poster,
       que o atributo já garante. Com reduced-motion nem tenta tocar. */
    document.querySelectorAll('video[data-mel="hero-video"]').forEach(function (v) {
      /* Nas internas o container do video e display:none desde 13/08 — ele e
         da home. Sem esta guarda o navegador baixava e tocava os 5 MB atras
         do conteudo em cinco paginas. Esconder por CSS nao impede o play;
         so o pause impede. */
      if (!v.offsetParent && getComputedStyle(v).position !== 'fixed') { v.pause(); return; }
      if (menosMovimento.matches) { v.pause(); return; }
      var p = v.play();
      if (p && p.catch) p.catch(function () { /* poster assume */ });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
