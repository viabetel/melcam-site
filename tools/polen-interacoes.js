// Módulo da abertura da /polen: hero premium + seleção das 7 cores.
//
// Três exports, todos consumidos por geradores existentes — não há segunda
// fonte:
//   js()   -> injetado no bundle único por tools/hero-carrossel.js
//   css()  -> injetado na folha de /polen por tools/paginas.js
//   corDoTile(arquivo) -> amostra a cor de fundo do packshot oficial
//
// ⚠️ js() e css() voltam DENTRO de template literal. Nada de crase, de "${" e
// de "\s" em regex aqui — as três coisas já quebraram o build antes (ver
// progresso.md, regras aprendidas do handoff de 13/08).
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SITE = path.resolve(__dirname, '..');

// A paleta e resolvida AQUI. css() volta como valor interpolado dentro do
// template literal de tools/paginas.js, entao um "${P.papel}" escrito neste
// arquivo sairia como texto cru na folha — quem interpola tem que ser este
// modulo, nao o consumidor.
const P = JSON.parse(fs.readFileSync(path.join(SITE, 'melcam.config.json'), 'utf8')).paleta;

// ---------------------------------------------------------------------------
// A cor do swatch NAO e inventada: e lida do proprio PNG oficial.
//
// Os 7 packshots sao 800x800 RGB SEM canal alfa — cada um traz o fundo ja na
// cor da camera, com o padrao favo. Entao o pixel do canto superior esquerdo e
// exatamente a cor daquela variante. Amostrar e melhor que cravar hex a mao:
// se o cliente reenviar um packshot noutro tom, o swatch acompanha sozinho.
//
// Medido em 13/08/2026 (canto 18,18 e 780,18 batem nos 7):
//   Amarela #F4B233 · Branca #DADADA · Laranja #EF6C29 · Marrom #5F2D0B
//   Preta   #2B2B2B · Rosa    #FBBAB6 · Verde   #303F1C
function corDoTile(rel, alternativa) {
  const arq = path.join(SITE, rel.replace(/^\//, ''));
  try {
    const b = fs.readFileSync(arq);
    if (b.readUInt32BE(0) !== 0x89504e47) return alternativa;

    let i = 8, w = 0, tipo = -1;
    const idat = [];
    while (i < b.length) {
      const len = b.readUInt32BE(i);
      const nome = b.toString('ascii', i + 4, i + 8);
      if (nome === 'IHDR') { w = b.readUInt32BE(i + 8); tipo = b[i + 17]; }
      else if (nome === 'IDAT') idat.push(b.slice(i + 8, i + 8 + len));
      else if (nome === 'IEND') break;
      i += 12 + len;
    }
    if (tipo !== 2 || !w) return alternativa;   // só RGB de 8 bits

    const raw = zlib.inflateSync(Buffer.concat(idat));
    const bpp = 3, stride = w * bpp + 1;
    const AMOSTRA_Y = 18, AMOSTRA_X = 18;

    // Desfiltra só até a linha amostrada — não precisa da imagem inteira.
    let ant = Buffer.alloc(w * bpp);
    let lin = ant;
    for (let y = 0; y <= AMOSTRA_Y; y++) {
      const f = raw[y * stride];
      lin = Buffer.from(raw.slice(y * stride + 1, y * stride + 1 + w * bpp));
      for (let x = 0; x < w * bpp; x++) {
        const a = x >= bpp ? lin[x - bpp] : 0;
        const bb = ant[x];
        const c = x >= bpp ? ant[x - bpp] : 0;
        let v = lin[x];
        if (f === 1) v += a;
        else if (f === 2) v += bb;
        else if (f === 3) v += (a + bb) >> 1;
        else if (f === 4) {
          const p = a + bb - c;
          const pa = Math.abs(p - a), pb = Math.abs(p - bb), pc = Math.abs(p - c);
          v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? bb : c);
        }
        lin[x] = v & 255;
      }
      ant = lin;
    }
    const o = AMOSTRA_X * bpp;
    return '#' + [lin[o], lin[o + 1], lin[o + 2]]
      .map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
  } catch (e) {
    return alternativa;
  }
}

// ---------------------------------------------------------------------------
function js() {
  return `
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
`;
}

// ---------------------------------------------------------------------------
function css() {
  return `
/* ================== /polen — hero premium ==================
   Direção da referência de 13/08: fundo escuro, texto editorial à esquerda,
   fotografia oficial grande à direita sangrando na borda.

   TRÊS CAMADAS, nesta ordem de pilha:
     1  foto      — a Polen na caixa oficial, sangra até a borda direita
     2  scrim     — gradiente em carvão que garante a leitura do texto
     3  copy      — dentro de uma largura máxima, nunca colado na borda

   O scrim vem DEPOIS da foto de propósito: é ele que dissolve a borda
   esquerda da fotografia no carvão, que é o que a referência faz. Sem ele a
   foto teria um corte reto no meio da tela.

   A COLAGEM SAIU em 13/08 e não volta: as 4 fotos da galeria escurecidas
   atrás da principal nunca leram como fotografia, só como retângulos escuros.
   Nenhuma variação de opacidade, blur ou máscara resolveu. A fotografia
   principal sozinha é mais premium — e é a única camada de imagem daqui. */
.mel-ph{
  position:relative; isolation:isolate; overflow:hidden;
  /* MESMA ALTURA DO HERO DA HOME. Medido em 13/08: o <video> da home e
     1440x900 em 1440x900 e 390x844 em 390x844, ou seja a viewport inteira,
     object-fit:cover, sempre. O hero da /polen passou a ser a mesma coisa: a
     fotografia ocupa a tela toda, canto a canto, e o texto vem POR CIMA. A
     composicao anterior era um painel de 48% a direita com carvao a esquerda —
     lia como caixa dentro da pagina, que e exatamente o que o pedido recusou.

     92svh, e nao 100: a home pode tomar a tela inteira porque o hero dela e a
     pagina abrindo, mas aqui a proxima secao e a ESCOLHA da cor, que e o
     proximo passo do CTA. Os 8% que sobram sao ~72px em 1440x900 — o bastante
     para "Escolha sua Polen" espiar na dobra e convidar ao scroll. O eixo do
     cover nao muda com isso: quem fixa a escala e a largura. */
  min-height:92svh;
  display:flex; align-items:center;
  /* Cor de base sob a foto, para o caso de ela ainda nao ter pintado. Nao ha
     mais gradiente de saida aqui: quem dissolve a emenda com a proxima secao e
     a terceira camada do scrim, que fecha em #0d0d0d — o fundo da pagina,
     cravado em .framer-vrbx7h pelo template. */
  background:${P.carvao};
  /* A largura cheia e escrita por JS (sangrar(), em interacoes.js), medida em
     document.documentElement.clientWidth — que NAO inclui a scrollbar. 100vw
     incluiria, e criaria transbordo horizontal. Sem JS, fica na largura do
     container e nao quebra nada. */
}

/* --- camada 1: a fotografia, sangrando nos QUATRO lados --- */
.mel-ph-foto{
  position:absolute; z-index:1; inset:0;
  width:100%;
  will-change:transform;
  /* Sem mascara. Ela existia para dissolver a borda ESQUERDA do painel contra
     o carvao; nao ha mais painel nem borda — a foto encosta nos quatro cantos,
     e quem garante a leitura do texto e o scrim. */
}
.mel-ph-foto img{
  width:100%; height:100%; display:block;
  /* 57% no eixo Y centra a JANELA na camera, nao na foto.
     Medido: em 1440x900 o cover escala 1440/1600 = 0,9, entao a foto renderiza
     1440x2160 e a janela mostra 900/2160 = 41,7% da altura. A camera ocupa a
     faixa de 30,5% a 78% do arquivo (47,5%), maior que a janela — nao cabe
     inteira em nenhum enquadramento de tela cheia com uma fonte 2:3. Com
     offset = (2160-900)*0,57 = 718px, a janela vai de 33% a 75% e o corte fica
     nas sobras (topo da aba da caixa e sombra da base), com lente, flash,
     visor, marca e etiqueta inteiros. */
  object-fit:cover; object-position:50% 57%;
  /* Entrada: a foto já existe no primeiro frame (opacidade parte de 0 mas o
     elemento está montado), então não há flash de fundo vazio. */
  animation:melPhFoto 1000ms cubic-bezier(.22,.61,.36,1) both;
}
@keyframes melPhFoto{
  /* Sem translateX: ele existia para a foto entrar deslizando pela direita,
     movimento que so fazia sentido quando ela era um painel lateral. */
  from{ opacity:0; transform:scale(1.04) }
  to  { opacity:1; transform:none }
}

/* --- camada 2: o scrim ---
   Tres gradientes, cada um com uma tarefa:
     90deg   — a coluna de leitura. Vai de quase opaco na esquerda a quase
               limpo na direita, sem parar em carvao chapado como antes: nada
               aqui pode virar retangulo de novo.
     180deg  — assenta a navbar sobre a foto no topo.
     0deg    — dissolve a base no #0d0d0d da pagina, para o hero terminar sem
               linha reta e emendar na secao de produto. */
.mel-ph-scrim{
  position:absolute; z-index:2; inset:0; pointer-events:none;
  background:
    linear-gradient(90deg,
      rgba(34,30,23,.94) 0%, rgba(34,30,23,.86) 28%,
      rgba(34,30,23,.62) 46%, rgba(34,30,23,.26) 68%, rgba(34,30,23,.08) 100%),
    linear-gradient(180deg, rgba(34,30,23,.70) 0%, rgba(34,30,23,.16) 18%, rgba(34,30,23,0) 38%),
    linear-gradient(0deg, #0d0d0d 0%, rgba(13,13,13,.62) 7%, rgba(13,13,13,0) 20%);
}

/* --- camada 3: o texto --- */
.mel-ph-in{
  position:relative; z-index:3;
  width:100%; max-width:1240px; margin:0 auto;
  padding:clamp(56px,6vw,88px) 24px;
}
.mel-ph-copy{ max-width:min(44%, 34rem) }
.mel-ph-eyebrow{
  margin:0 0 1rem; color:${P.mel};
  font-family:"Area",sans-serif; font-size:.74rem; font-weight:700;
  letter-spacing:.24em; text-transform:uppercase;
}
.mel-ph-tit{
  margin:0; color:${P.papel};
  font-family:"Iowan Old Style",Georgia,serif; font-weight:700;
  /* ~12 a 15 caracteres por linha na medida cheia */
  font-size:clamp(2.2rem,4.4vw,3.6rem); line-height:1.06; letter-spacing:-.015em;
  /* 16ch e a medida que produz "A Polen guarda / as que importam." no desktop:
     a primeira linha tem 14 caracteres e cabe, a segunda nao alcanca. Medido
     na fonte real, nao estimado. text-wrap:balance fica FORA de proposito —
     ele reequilibra as linhas e devolve a quebra em tres. */
  max-width:16ch;
}
/* A Brooklyn é a assinatura da linha Polen no toolkit — este é o único lugar
   da página onde ela entra, e é exatamente o papel documentado no config. */
.mel-ph-assin{
  font-family:"Brooklyn Heritage","Iowan Old Style",Georgia,serif;
  font-weight:600; font-size:1.16em; line-height:1;
  padding-inline:.04em;
}
.mel-ph-txt{
  margin:clamp(18px,2.4vw,28px) 0 0;
  max-width:44ch;                       /* mais estreito que o titulo, de proposito */
  color:#CFC6B8; font-family:"Area",sans-serif;
  font-size:clamp(1rem,1.15vw,1.09rem); line-height:1.66;
}
.mel-ph-cta{
  margin-top:clamp(24px,3vw,36px); min-height:44px; line-height:1.6;
  letter-spacing:.06em; text-transform:uppercase; font-size:.86rem;
}
.mel-ph-apoio{
  margin:1.1rem 0 0; color:#9A9083;
  font-family:"Area",sans-serif; font-size:.82rem; letter-spacing:.06em;
}

/* Entrada do texto: keyframes de CSS, sem depender de JS.
   Se o script falhar, o conteúdo aparece do mesmo jeito — é a lição do "hero
   em branco" registrada no progresso.md. Cada peça tem classe própria e
   atraso próprio; nada de nth-child. */
@keyframes melPhCopy{ from{ opacity:0; transform:translateY(16px) } to{ opacity:1; transform:none } }
.mel-ph-eyebrow,
.mel-ph-tit,
.mel-ph-txt,
.mel-ph-cta,
.mel-ph-apoio{ animation:melPhCopy 620ms cubic-bezier(.22,.61,.36,1) both }
.mel-ph-eyebrow{ animation-delay:60ms }
.mel-ph-tit    { animation-delay:150ms }
.mel-ph-txt    { animation-delay:250ms }
.mel-ph-cta    { animation-delay:340ms }
.mel-ph-apoio  { animation-delay:420ms }

/* --- tablet ---
   A foto continua sangrando nos quatro lados; muda so a medida do texto. */
@media (max-width:1024px){
  .mel-ph-copy{ max-width:min(58%, 26rem) }
  .mel-ph-tit{ font-size:clamp(2rem,4.4vw,2.9rem) }
}

/* --- retrato: mesma tela cheia, scrim virado para a vertical ---
   A quebra em coluna com a foto virando bloco depois do texto SAIU: ela era
   o oposto de sangrar canto a canto, e o hero da home nao faz isso — em 390
   ele tambem e 390x844, cover, viewport inteira.

   Aqui o cover inverte de eixo: a fonte e 2:3 (0,667) e a tela e mais estreita
   que isso (390/844 = 0,462), entao quem manda na escala passa a ser a ALTURA.
   A foto aparece inteira de cima a baixo e o corte vai para as laterais, que e
   onde so ha caixa. A camera fica centrada e completa na vertical. */
@media (max-width:809.98px){
  .mel-ph{ align-items:flex-start }
  /* A navbar tem 81px e fica POR CIMA do topo da pagina; um padding menor que
     isso esconde o eyebrow e a primeira linha do titulo atras dela. Medido em
     390: com 56px o titulo entrava debaixo da barra. */
  .mel-ph-in{ padding:104px 20px clamp(28px,7vw,44px) }
  .mel-ph-copy{ max-width:none }
  .mel-ph-txt{ max-width:46ch }
  .mel-ph-foto img{ object-position:50% 50% }

  /* Em retrato o texto ocupa a largura toda, entao o gradiente de leitura tem
     de vir de CIMA, nao da esquerda: horizontal ali escureceria a coluna
     inteira e apagaria a foto. A base continua fechando em #0d0d0d. */
  .mel-ph-scrim{
    background:
      linear-gradient(180deg,
        rgba(34,30,23,.94) 0%, rgba(34,30,23,.88) 34%,
        rgba(34,30,23,.60) 56%, rgba(34,30,23,.18) 78%, rgba(34,30,23,.05) 100%),
      linear-gradient(0deg, #0d0d0d 0%, rgba(13,13,13,.60) 8%, rgba(13,13,13,0) 24%);
  }
}

/* Emenda com a seção de produto: as duas em carvão, sem corte branco. A
   diferença é de composição e de espaço, não de cor de fundo.

   72px NAO SERVE MAIS. Com o hero em 92svh, em 1440x900 a secao comeca em 838
   e sobram 62px de dobra — mas o padding de 72 jogava o eyebrow para y=910,
   dez pixels ABAIXO do corte. O que espiava era uma faixa preta, nao a proxima
   secao: pior que nao espiar nada, porque le como vao. Com 48px o eyebrow cai
   em 886 e aparece inteiro, e 48 e o piso do respiro pedido (48–80px). */
.mel-ph + .mel-sec{ padding-top:clamp(32px,3.4vw,48px) }

@media (prefers-reduced-motion:reduce){
  /* Estado final direto: nada escondido, nada escalonado, layout igual. */
  .mel-ph-foto img,
  .mel-ph-eyebrow, .mel-ph-tit, .mel-ph-txt, .mel-ph-cta, .mel-ph-apoio{
    animation:none;
  }
}


/* ================== /polen — produto e seletor ================== */
.mel-pr-grade{
  max-width:1240px; margin:clamp(24px,4vw,48px) auto 0;
  display:grid; grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);
  gap:clamp(24px,4.5vw,64px); align-items:center;
}
.mel-pr-palco{
  position:relative; width:100%; aspect-ratio:1;
  border-radius:12px; overflow:hidden; background:#2B251C;
  box-shadow:0 24px 60px rgba(0,0,0,.42), 0 0 0 1px rgba(251,247,238,.07);
}
/* As duas camadas do crossfade. Em repouso so uma tem opacidade 1; o estado
   e mandado pela classe, escrita por um unico ponto do JS. */
.mel-pr-foto{
  position:absolute; inset:0; width:100%; height:100%;
  object-fit:contain; display:block;
  opacity:1; transition:opacity 260ms cubic-bezier(.22,.61,.36,1);
}
.mel-pr-foto-fora{ opacity:0 }

.mel-pr-info{ min-width:0 }
.mel-pr-linha{
  margin:0; color:${P.mel}; font-family:"Area",sans-serif;
  font-size:.74rem; font-weight:700; letter-spacing:.22em; text-transform:uppercase;
}
.mel-pr-cor{
  margin:.5rem 0 0; color:${P.papel};
  font-family:"Iowan Old Style",Georgia,serif; font-weight:700;
  font-size:clamp(1.8rem,3.4vw,2.6rem); line-height:1.1;
}
.mel-pr-sub{ margin:.35rem 0 0; color:#C9BFB0; font-family:"Area",sans-serif; font-size:1rem }
.mel-pr-preco{ margin:clamp(18px,2.4vw,28px) 0 0; font-family:"Area",sans-serif; color:#9A9083 }
.mel-pr-preco strong{
  display:block; color:${P.papel}; font-size:clamp(1.5rem,2.6vw,1.95rem);
  font-weight:700; letter-spacing:-.01em;
}
.mel-pr-preco span{ display:block; margin-top:.25rem; font-size:.88rem }

/* --- o seletor --- */
.mel-pr-rot{
  margin:clamp(20px,2.6vw,30px) 0 .7rem; color:#9A9083;
  font-family:"Area",sans-serif; font-size:.78rem;
  letter-spacing:.14em; text-transform:uppercase;
}
.mel-pr-cores{ display:flex; flex-wrap:wrap; gap:.7rem }
.mel-pr-swatch{
  position:relative; width:44px; height:44px; padding:0; cursor:pointer;
  border:0; border-radius:50%; background:transparent;
  transition:transform 220ms cubic-bezier(.22,.61,.36,1);
}
/* O disco de cor e um filho, para o anel de selecao ficar por fora sem mexer
   no tamanho do alvo de toque (44px, o minimo confortavel). */
.mel-pr-swatch::before{
  content:""; position:absolute; inset:5px; border-radius:50%;
  background:var(--sw,#2B251C);
  box-shadow:inset 0 0 0 1px rgba(251,247,238,.22);
}
/* Anel de selecao em mel. NAO e o unico sinal: o nome da cor selecionada esta
   escrito em .mel-pr-cor e o botao carrega aria-checked. */
.mel-pr-swatch::after{
  content:""; position:absolute; inset:0; border-radius:50%;
  box-shadow:inset 0 0 0 2px transparent;
  transition:box-shadow 220ms ease;
}
.mel-pr-swatch:hover{ transform:translateY(-2px) }
.mel-pr-swatch[aria-checked="true"]::after{ box-shadow:inset 0 0 0 2px ${P.mel} }
.mel-pr-swatch:focus-visible{ outline:2px solid ${P.mel}; outline-offset:3px }

.mel-pr-cta{ margin-top:clamp(22px,3vw,32px); min-height:44px; line-height:1.6 }
.mel-pr-info .mel-nota{ margin-top:.9rem }

/* Ancora nao pode ficar embaixo da barra fixa. */
/* A barra fixa da Polen saiu em 13/08; o unico elemento que pode cobrir uma
   ancora agora e a navbar principal, medida em 81px. */
#produto, #filtros, #faq{ scroll-margin-top:96px }

@media (max-width:900px){
  /* Imagem primeiro, informacao depois. */
  .mel-pr-grade{ grid-template-columns:1fr; gap:clamp(20px,4vw,32px) }
  .mel-pr-palco{ max-width:min(88vw,480px); margin-inline:auto }
}
@media (max-width:420px){
  /* 7 discos de 44px + gap nao cabem em 390: quebram em duas linhas, com o
     mesmo alvo de toque. Nada de encolher abaixo do confortavel. */
  .mel-pr-cores{ gap:.6rem }
}

@media (prefers-reduced-motion:reduce){
  .mel-ph-pronto .mel-ph-eyebrow,
  .mel-ph-pronto .mel-ph-tit,
  .mel-ph-pronto .mel-ph-txt,
  .mel-ph-pronto .mel-ph-cta,
  .mel-ph-pronto .mel-ph-apoio{ animation:none }
  .mel-pr-foto{ transition:none }
  .mel-pr-swatch{ transition:none }
}
`;
}

module.exports = { js, css, corDoTile };
