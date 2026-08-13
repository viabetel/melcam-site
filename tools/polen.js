// LP Polen — /polen
//
// A página nasce como cópia do index.html: herda nav, rodapé, os 165 KB de CSS
// inline, o animator e os 3 breakpoints. As seções da home saem por CSS
// (nunca por recorte de DOM) e o conteúdo da Polen entra antes do <footer>.
const fs = require('fs');
const path = require('path');
const SITE = path.resolve(__dirname, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(SITE, 'melcam.config.json'), 'utf8'));
const P = cfg.paleta;
const POLEN = cfg.produtos.polen;
const polenUI = require('./polen-interacoes.js');

const listar = (rel, re) => {
  const d = path.join(SITE, 'melcam', 'img', rel);
  return fs.existsSync(d) ? fs.readdirSync(d).filter(f => re.test(f)).sort().map(f => `/melcam/img/${rel}/${f}`) : [];
};

// A BARRA FIXA DA POLEN SAIU — 13/08/2026, a pedido.
// Era a faixa sticky com Polen · Produto · Filtros · FAQ · preço · Comprar.
// Duas razões, as duas visíveis na captura do cliente: ela empurrava o hero
// para baixo da navbar principal criando uma segunda barra logo abaixo da
// primeira, e o CTA "Comprar" competia com o "Escolha sua cor" do hero, que é
// o próximo passo certo. As âncoras não ficaram órfãs: #produto continua sendo
// destino do CTA do hero e do CTA final, e #filtros e #faq seguem existindo.
// A Bee seguiu o mesmo caminho na tarde do mesmo dia, também a pedido, e com
// ela foi embora o CSS .mel-barra de tools/paginas.js: não sobrou usuário.

// ------------------------------------------------------------- 1. hero
//
// Reconstruído em 13/08/2026. O que havia antes era o cartão "Memória cheia"
// mais um packshot solto e uma nota dizendo que a animação 3D estava a decidir.
// O render 3D continua pendente e continua não sendo inventado: o hero agora se
// apoia no que existe de verdade — o packshot oficial — tratado como peça
// editorial, não como espera de outra arte.
//
// A Bee é "novidade"; a Polen é ESCOLHA. Por isso o CTA é único e leva à
// seleção de cores logo abaixo, em vez de "Comprar" genérico.
const HERO = {
  // Texto do cliente, no pedido de 13/08. Diz a mesma coisa que o copy aprovado
  // do bloco da home ("sem tela, apenas o momento"), com mais precisão para uma
  // abertura de LP. Não afirma nada novo sobre o produto.
  texto: 'Sem tela para conferir, apagar ou repetir. Você fotografa o momento e '
       + 'segue vivendo. O resto você descobre depois.',
  cta: 'Escolha sua cor',

  // FOTO PRINCIPAL — escolhida abrindo os arquivos, não pelo nome.
  // 1600x2400, a Polen preta dentro da caixa oficial em mel, com o padrão favo
  // e a etiqueta "Polen". É a única foto do acervo que mostra produto E marca
  // na mesma cena, e o mel da embalagem entrega o acento da identidade sem
  // precisar de nenhum enfeite.
  //
  // object-position: a câmera ocupa a faixa vertical de ~25% a ~67% do arquivo.
  // Num painel de meia tela em 1440x900 o cover recorta ~200px de topo e base
  // (em coordenadas do original), então a câmera fica inteira com o centro
  // padrão. Medido, não estimado.
  foto: '/melcam/img/header-fileira/polen-lp-1.jpg',
  fotoAlt: 'Câmera Polen preta dentro da caixa da Melcam, sobre outras caixas',

  // Cor que a seção de produto abre selecionada. É a mesma da foto do hero
  // (a Polen preta na caixa), então a passagem de uma seção para a outra não
  // troca de produto no meio do caminho.
  // ⚠️ produto() depende deste campo: sem ele nenhum swatch nasce marcado.
  corInicial: 'Preta',
};

function hero() {
  // Os três números saem do config e das specs da própria página — nada aqui
  // é afirmação nova: 7 é POLEN.cores.length, 8 é POLEN.filtros.length e as
  // 1000 fotos estão nas specs e no FAQ (cartão de 4 GB).
  const apoio = `${POLEN.cores.length} cores · ${POLEN.filtros.length} filtros · até 1000 fotos`;

  return `
<section class="mel-ph" data-mel="polen-hero" aria-labelledby="mel-ph-tit">
  <div class="mel-ph-foto" data-mel="polen-hero-main">
    <img src="${HERO.foto}" alt="${HERO.fotoAlt}"
         width="1600" height="2400" fetchpriority="high">
  </div>

  <!-- Scrim: garante a leitura do texto por cima da borda da fotografia.
       Funcional, não enfeite. -->
  <div class="mel-ph-scrim" aria-hidden="true"></div>

  <div class="mel-ph-in">
    <div class="mel-ph-copy" data-mel="polen-hero-copy">
      <p class="mel-ph-eyebrow">${POLEN.nome}</p>
      <h1 id="mel-ph-tit" class="mel-ph-tit">A <span class="mel-ph-assin">Polen</span> guarda as que importam.</h1>
      <p class="mel-ph-txt">${HERO.texto}</p>
      <a class="mel-bt mel-bt-mel mel-ph-cta" href="#produto" data-mel="polen-hero-cta">${HERO.cta}</a>
      <p class="mel-ph-apoio">${apoio}</p>
    </div>
  </div>
</section>`;
}

// -------------------------------------------------- 2. produto e seleção
//
// Substitui a grade de 7 cards. O cliente pediu SELEÇÃO: um produto em
// destaque e um controle que troca a variante. Sete cards competiam entre si e
// repetiam preço e CTA sete vezes.
//
// O palco é quadrado e travado em aspect-ratio 1 com object-fit:contain,
// porque os packshots são 800x800 e trazem o próprio fundo — a caixa não muda
// de tamanho ao trocar de cor e a câmera nunca é cortada.
function produto() {
  const swatches = POLEN.cores.map((c, i) => {
    const sel = c.nome === HERO.corInicial;
    // A cor do disco é AMOSTRADA do PNG oficial em tempo de build; se o
    // arquivo sumir, cai numa superfície neutra e o nome continua sendo o
    // rótulo acessível.
    const cor = polenUI.corDoTile(c.img, '#2B251C');
    return `
        <button type="button" role="radio" class="mel-pr-swatch"
                aria-checked="${sel}" tabindex="${sel ? 0 : -1}"
                data-mel-cor="${i}" data-nome="${c.nome}" data-sub="${c.sub}"
                data-img="${c.img}" style="--sw:${cor}">
          <span class="mel-sr">${c.nome}</span>
        </button>`;
  }).join('');

  const ini = POLEN.cores.find((x) => x.nome === HERO.corInicial) || POLEN.cores[0];

  return `
<section class="mel-sec" id="produto" data-mel="polen-produto" aria-labelledby="mel-pr-tit">
  <div class="mel-sec-topo">
    <p class="mel-eyebrow">escolha sua Polen</p>
    <h2 id="mel-pr-tit" class="mel-tit">${POLEN.cores.length} cores. Uma decisão.</h2>
  </div>

  <div class="mel-pr-grade">
    <div class="mel-pr-palco">
      <img class="mel-pr-foto" data-mel="polen-palco-a" src="${ini.img}"
           alt="Câmera digital retrô Polen, na cor ${ini.nome}"
           width="800" height="800">
      <!-- Camada B do crossfade. Nasce com a MESMA imagem da A, não vazia: um
           <img> sem src conta como imagem quebrada na auditoria e pode desenhar
           o ícone de quebrado. Mesmo arquivo, mesma requisição em cache. -->
      <img class="mel-pr-foto mel-pr-foto-fora" data-mel="polen-palco-b" src="${ini.img}"
           alt="" aria-hidden="true" width="800" height="800">
    </div>

    <div class="mel-pr-info">
      <p class="mel-pr-linha">${POLEN.nome}</p>
      <p class="mel-pr-cor" data-mel="polen-nome">${ini.nome}</p>
      <p class="mel-pr-sub" data-mel="polen-sub">${ini.sub}</p>
      <p class="mel-pr-preco"><strong>${POLEN.preco}</strong> <span>${POLEN.condicao}</span></p>

      <p class="mel-pr-rot" id="mel-pr-cores-rot">Cor</p>
      <div class="mel-pr-cores" role="radiogroup" aria-labelledby="mel-pr-cores-rot"
           data-mel="polen-cores">${swatches}
      </div>

      <button type="button" class="mel-bt mel-bt-mel mel-pr-cta" data-mel="polen-cta"
              data-mel-add="Polen ${ini.nome}" data-mel-rotulo="${POLEN.cta}"
              aria-label="${POLEN.cta} Polen ${ini.nome}">${POLEN.cta}</button>

      <p class="mel-nota">${POLEN.nota}</p>
      <p class="mel-nota"><strong>a decidir:</strong> a pasta de catálogo usa “Coral”
         e o copy aprovado usa “Laranja”. Tratados como a mesma variante até
         confirmação. Não foi criada uma oitava cor.</p>
    </div>
  </div>

  <p class="mel-sr" aria-live="polite" data-mel="polen-vivo"></p>
</section>`;
}

// ----------------------------------------------------------- 3. benefícios
function beneficios() {
  const itens = POLEN.beneficios.map(b => `<li>${b}</li>`).join('');
  return `
<section class="mel-benef" aria-label="Benefícios da Polen">
  <ul class="mel-benef-lista">${itens}</ul>
</section>`;
}

// -------------------------------------------------------------- 4. galeria
function galeria() {
  const fotos = listar('galeria-polen', /\.(jpg|jpeg|png|webp)$/i);
  const itens = fotos.map(src => `
      <li class="mel-gal-item"><img src="${src}" alt="Foto real feita com a Polen, sem edição" loading="lazy"></li>`).join('');
  return `
<section class="mel-sec" aria-labelledby="mel-gal-tit">
  <div class="mel-sec-topo">
    <p class="mel-eyebrow">Feitas com a Polen</p>
    <h2 id="mel-gal-tit" class="mel-tit">Fotos reais, sem edição nenhuma</h2>
  </div>
  <ul class="mel-galeria">${itens}
  </ul>
</section>`;
}

// -------------------------------------------------------------- 5. filtros
function filtros() {
  const imgs = listar('filtros', /\.(jpg|jpeg|png|webp)$/i);
  const pills = POLEN.filtros.map((f, i) => `
      <button type="button" class="mel-pill" role="tab" id="pill-${i}"
              aria-selected="${i === 0}" aria-controls="mel-filtro-img"
              data-mel-filtro="${i}" data-src="${imgs[i] || '/melcam/img/a-decidir.svg'}">${f}</button>`).join('');

  return `
<section class="mel-sec" id="filtros" aria-labelledby="mel-fil-tit">
  <div class="mel-sec-topo">
    <p class="mel-eyebrow">experimente seu filtro favorito</p>
    <h2 id="mel-fil-tit" class="mel-tit">Uma foto. 8 filtros</h2>
  </div>
  <div class="mel-filtro-palco">
    <img id="mel-filtro-img" src="${imgs[0] || '/melcam/img/a-decidir.svg'}"
         alt="A mesma foto com o filtro ${POLEN.filtros[0]}" data-mel-filtro-img>
  </div>
  <div class="mel-pills" role="tablist" aria-label="Filtros da Polen">${pills}
  </div>
  <p class="mel-tag">Filtros aplicados na hora do clique, direto na câmera.</p>
  <p class="mel-sr" aria-live="polite" data-mel-filtro-vivo></p>
</section>`;
}

// ----------------------------------------------------------- 6. diferencial
//
// SCROLLYTELLING — 13/08/2026. Era uma <ul> de nove itens; virou nove
// capítulos, cada um com a sua cena. O efeito EXPLICA o produto: a vantagem
// escrita e a imagem que a comprova entram juntas.
//
// AS NOVE VANTAGENS SÃO AS APROVADAS, PALAVRA POR PALAVRA. O texto do <h3> é
// a string que já estava aqui — nenhum número mexido, nenhuma especificação
// nova. O que mudou foi só o formato de apresentação.
//
// A LINHA DE APOIO SÓ EXISTE ONDE JÁ HAVIA COPY APROVADO. Sai do FAQ e do
// hero desta mesma página, verbatim. Quatro capítulos têm; cinco não têm, e
// ficam só com o título — inventar frase de apoio para emparelhar visualmente
// seria criar afirmação sobre o produto, que é justamente o que o pedido
// proíbe. A pendência está registrada no progresso.md.
//
// AS CENAS vêm de tools/polen-story-assets.js, geradas do acervo oficial do
// cliente. O capítulo 3 não tem imagem adequada no acervo e recebe um
// placeholder editorial que diz exatamente qual foto falta.
const CAPITULOS = [
  {
    n: 1,
    tit: 'Experiência analógica real',
    // hero desta página, texto do cliente em 13/08
    txt: 'Você fotografa o momento e segue vivendo. O resto você descobre depois.',
    img: 'polen-01-fotografando.jpg',
    alt: 'Pessoa fotografando com uma Polen amarela junto ao rosto, de frente para o Pão de Açúcar',
  },
  {
    n: 2,
    tit: 'Sem tela e sem distrações',
    // FAQ desta página: "A Polen tem tela?"
    txt: 'Sem tela, você fotografa olhando a cena e não o visor. A revisão acontece depois, no computador ou no celular.',
    img: 'polen-02-sem-tela.jpg',
    alt: 'Traseira da Polen preta: superfície lisa, sem visor de revisão, apenas o pequeno contador de fotos',
  },
  {
    n: 3,
    tit: 'Bateria recarregável para até 1000 fotos, dependendo do uso do flash',
    vaga: {
      nome: 'Bateria recarregável',
      direcao: 'Câmera em recarga pelo cabo USB-C, ou em uso com o cabo à vista',
    },
  },
  {
    n: 4,
    tit: 'Dimensões 11,4 × 6,4 × 2,5 cm',
    img: 'polen-04-dimensoes.jpg',
    alt: 'Polen preta de frente, packshot oficial em fundo escuro',
    // As cotas são desenhadas em SVG por cima, no HTML — não vêm queimadas na
    // foto. Os três números são os mesmos do título, sem arredondamento.
    cotas: { larg: '11,4 cm', alt: '6,4 cm', prof: '2,5 cm' },
  },
  {
    n: 5,
    tit: 'Flash LED integrado',
    img: 'polen-05-flash.jpg',
    alt: 'Close do topo da Polen marrom em luz baixa, com a janela do flash acesa ao lado do visor',
  },
  {
    n: 6,
    tit: 'Resolução de 12 MP',
    img: 'polen-06-doze-mp.jpg',
    alt: 'Foto feita com a Polen: a curva do Museu de Arte Contemporânea de Niterói contra o céu',
  },
  {
    n: 7,
    tit: 'Cartão de 4 GB para até 1000 fotos',
    img: 'polen-07-cartao.jpg',
    alt: 'O cartão MicroSD de 4 GB que acompanha a Polen',
  },
  {
    n: 8,
    tit: 'Carregamento e transferência por USB-C',
    // FAQ desta página: "Como vejo as fotos?"
    txt: 'Conectando a câmera ao computador pelo cabo USB-C. As fotos saem prontas, com o filtro já aplicado.',
    img: 'polen-08-usb-c.jpg',
    alt: 'O cabo USB-C que acompanha a Polen, com as duas pontas à mostra',
  },
  {
    n: 9,
    tit: 'Oito filtros com estética vintage',
    // FAQ desta página: "Como funcionam os filtros?"
    txt: 'Você escolhe antes de fotografar, como num filme: o filtro é aplicado na hora do clique, direto na câmera.',
    img: 'polen-09-filtros.jpg',
    alt: 'A mesma fotografia repetida oito vezes, uma por filtro da Polen',
  },
];

const STORY_DIR = '/melcam/img/polen-story/';
const dd = (n) => String(n).padStart(2, '0');

// Cotas em SVG por cima do packshot. As posições são percentuais do quadro de
// 1440x960 e foram MEDIDAS na imagem gerada (o corpo da câmera ocupa de 26,8%
// a 73,2% na horizontal e de 30,1% a 69,6% na vertical). A profundidade não
// ganha cota: é uma vista frontal, e desenhar seta de profundidade onde ela
// não aparece seria afirmação visual falsa. Ela entra como texto.
function cotas(c) {
  return `
      <svg class="mel-story-cotas" viewBox="0 0 1440 960" aria-hidden="true" focusable="false">
        <g class="mel-story-cota">
          <path d="M386 712 L386 736 M1054 712 L1054 736 M386 724 L1054 724"/>
          <text x="720" y="770" text-anchor="middle">${c.cotas.larg}</text>
        </g>
        <g class="mel-story-cota">
          <path d="M1106 289 L1130 289 M1106 668 L1130 668 M1118 289 L1118 668"/>
          <text x="1160" y="486" text-anchor="start">${c.cotas.alt}</text>
        </g>
      </svg>
      <p class="mel-story-prof">profundidade ${c.cotas.prof}</p>`;
}

// PLACEHOLDER EDITORIAL, não retângulo genérico. Traz número do capítulo, nome
// da vantagem, o aviso de que a imagem oficial ainda vai entrar e a direção do
// asset que falta — para o cliente saber exatamente o que fotografar. Ocupa a
// MESMA proporção 3:2 das cenas reais, então a foto entra no lugar dele sem
// mudar uma linha de layout.
function vaga(c) {
  return `
      <div class="mel-story-vaga">
        <p class="mel-story-vaga-num">${dd(c.n)}</p>
        <p class="mel-story-vaga-nome">${c.vaga.nome}</p>
        <p class="mel-story-vaga-rot">imagem oficial a inserir</p>
        <p class="mel-story-vaga-dir">${c.vaga.direcao}</p>
      </div>`;
}

// GIF transparente de 1x1, embutido. Não é enfeite: um <img> SEM src é
// contado como imagem quebrada por qualquer auditoria — a deste projeto
// acusou "6 imagens quebradas" na primeira versão — e ainda desenha o ícone de
// quebrado com o texto do alt por cima. Com o placeholder o elemento é uma
// imagem válida e invisível, sem nenhuma ida à rede.
const VAZIO = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

// A cena 1 nasce com a foto; as outras guardam o caminho em data-src e só são
// buscadas quando o capítulo chega perto. Sem isso as oito entrariam de uma
// vez, porque no desktop elas ficam empilhadas dentro da viewport e
// loading="lazy" não segura imagem que o navegador considera visível.
// O <noscript> é o que garante a foto para quem está sem JavaScript.
function cena(c) {
  const primeira = c.n === 1;
  const dentro = c.vaga ? vaga(c) : `
      <img class="mel-story-img" src="${primeira ? STORY_DIR + c.img : VAZIO}"${primeira ? '' : `
           data-src="${STORY_DIR}${c.img}"`}
           alt="${c.alt}" width="1440" height="960" decoding="async">
      <noscript><img class="mel-story-img" src="${STORY_DIR}${c.img}" alt="${c.alt}"
           width="1440" height="960" loading="lazy" decoding="async"></noscript>${c.cotas ? cotas(c) : ''}`;

  // --linha crava a linha da grade. Sem isso a alternância quebra: a
  // auto-alocação do CSS Grid, ao ver um item com coluna definida MENOR que a
  // do anterior, pula uma linha — e o seguinte, com coluna maior, cabe na
  // mesma. Resultado medido em 13/08: capítulos 2 e 3 dividindo a linha 2, 4 e
  // 5 a linha 3, e por aí. Dois passos com o mesmo centro vertical fazem o
  // observer nunca ativar o de índice maior, e quatro capítulos ficaram
  // inalcançáveis. Com a linha cravada, cada capítulo tem a sua.
  return `
    <figure class="mel-story-cena${c.vaga ? ' mel-story-cena-vaga' : ''}"
            data-mel-story-scene data-story-index="${c.n - 1}" data-lado="${lado(c.n)}"
            style="--linha:${c.n}">${dentro}
    </figure>`;
}

// LADO ALTERNADO — 13/08/2026, a pedido.
// Capítulo ímpar: imagem à esquerda, texto à direita. Par: o contrário. A
// descida deixa de ser um painel parado num canto só e passa a jogar o olho de
// um lado para o outro a cada capítulo.
//
// O lado é escrito no HTML, não deduzido por :nth-of-type no CSS. A grade tem
// figuras, divs e um p misturados como irmãos, e contar por tipo ali é o
// caminho curto para o dia em que alguém acrescentar um elemento e a
// alternância inverter sozinha, sem ninguém entender por quê.
const lado = (n) => (n % 2 ? 'esq' : 'dir');

function passo(c) {
  // O texto vai SEMPRE no lado oposto ao da imagem.
  return `
    <div class="mel-story-passo" data-mel-story-step data-story-index="${c.n - 1}"
         data-lado="${lado(c.n) === 'esq' ? 'dir' : 'esq'}" style="--linha:${c.n}">
      <p class="mel-story-num" aria-hidden="true">${dd(c.n)}</p>
      <h3 class="mel-story-tit">${c.tit}</h3>${c.txt ? `
      <p class="mel-story-txt">${c.txt}</p>` : ''}
    </div>`;
}

function diferencial() {
  // ORDEM DO DOM: cena, passo, cena, passo… intercalado. É isso que faz o
  // mobile funcionar sem duplicar nada — lá a grade vira uma coluna e cada
  // imagem já cai imediatamente antes do texto dela. No desktop o CSS coloca
  // TODAS as cenas na mesma célula (coluna 1, todas as linhas) e os passos na
  // coluna 2, e a sobreposição é o que permite o crossfade.
  const corpo = CAPITULOS.map((c) => cena(c) + passo(c)).join('');

  return `
<section class="mel-sec mel-story" id="diferencial" data-mel="polen-story"
         aria-labelledby="mel-dif-tit">
  <div class="mel-sec-topo">
    <p class="mel-eyebrow">o diferencial</p>
    <h2 id="mel-dif-tit" class="mel-tit">Analógica por fora, digital por dentro</h2>
  </div>

  <div class="mel-story-grade" style="--caps:${CAPITULOS.length}">${corpo}
    <p class="mel-story-conta" data-mel-story-conta aria-hidden="true"><span
      class="mel-story-conta-in"><span data-mel-story-atual>01</span><span
      class="mel-story-conta-de">/</span>${dd(CAPITULOS.length)}</span></p>
  </div>

  <!-- REDE DE SEGURANÇA DO CARREGAMENTO ADIADO.
       As cenas 2 a 9 esperam em data-src, e quem as promove é
       iniciarScrollytellingPolen(), em /melcam/interacoes.js. Se aquele arquivo
       não carregar — 404, rede caída, bloqueio —, o parser desta página teve o
       sinalizador de script LIGADO, então o <noscript> de cada cena continua
       inerte e oito capítulos ficariam com a moldura vazia. É a mesma armadilha
       do "hero em branco" registrada no progresso.md: conteúdo que só aparece
       se o JS rodar.
       Estas linhas são inline, então chegam junto com o HTML. Se meio segundo
       depois do load a seção não tiver sido ligada, elas trazem todas as fotos
       e o adiamento simplesmente não acontece. Com JavaScript desligado de vez,
       quem cobre é o <noscript>, que aí vira DOM de verdade. -->
  <script>(function(){
    var s=document.currentScript&&document.currentScript.previousElementSibling;
    while(s&&s.getAttribute&&s.getAttribute('data-mel')!=='polen-story')s=s.parentNode;
    if(!s)return;
    function tudo(){
      if(s.hasAttribute('data-mel-ligado'))return;
      var l=s.querySelectorAll('img[data-src]');
      for(var i=0;i<l.length;i++){l[i].src=l[i].getAttribute('data-src');l[i].removeAttribute('data-src');}
    }
    window.addEventListener('load',function(){setTimeout(tudo,500);});
  })();</script>
</section>`;
  // SEM aria-live aqui, de propósito. O capítulo ativo muda a cada rolagem;
  // uma região viva anunciaria nove vezes numa descida, o que atrapalha em vez
  // de ajudar. Nada se perde: os nove títulos e textos estão no DOM, em ordem,
  // e são lidos normalmente. O indicador numérico é aria-hidden porque é
  // duplicata visual da posição que a leitura já dá.
}

// -------------------------------------------------------------- 7. colméia
//
// SAIU EM 13/08/2026, a pedido, junto com a da /bee.
//
// Era a seção "o clube da marca / Entre para a Colméia", fechando a página:
// eyebrow, título, o parágrafo da comunidade, os três perks (Acesso antecipado
// · Encontros exclusivos · Desafios mensais), o CTA "Quero entrar na Colméia"
// e a nota de cadastro a decidir.
//
// A HOME NÃO FOI TOCADA. Lá o bloco é outro: a seção do template Framer
// (data-framer-name "Speed On"), que tools/identidade.js reordena de propósito
// para fechar a home. Removê-la é decisão à parte, e não foi pedida.
//
// O que sobrou de pé, e por quê:
//   melcam.config.json  a chave `colmeia` continua lá — é conteúdo aprovado do
//                       cliente, e apagar dado do config por causa de uma
//                       remoção de layout é perder o texto sem precisar.
//   tools/paginas.js    .mel-colmeia e .mel-perks continuam no CSS. São regras
//                       de sistema e voltam a ser usadas no dia em que o bloco
//                       voltar; nenhuma delas casa com nada hoje.
//   /sobre              o card "Comunidade" cita a Colméia em texto corrido.
//                       Não é este bloco e não foi pedido.

// ------------------------------------------------------------------ 8. FAQ
const FAQ = [
  ['A Polen tem tela?', 'Não. É proposital: sem tela, você fotografa olhando a cena e não o visor. A revisão acontece depois, no computador ou no celular.'],
  ['Como vejo as fotos?', 'Pelo cabo USB-C, conectando a câmera ao computador, ou tirando o cartão MicroSD. As fotos saem prontas, com o filtro já aplicado.'],
  ['Quantas fotos cabem?', 'O cartão de 4 GB que vem incluso armazena até 1000 fotos.'],
  ['Quanto dura a bateria?', 'A bateria recarregável dá conta de até 1000 fotos, variando conforme o uso do flash.'],
  ['Como funcionam os filtros?', 'São 8 filtros aplicados na hora do clique, direto na câmera. Você escolhe antes de fotografar, como num filme.'],
  ['Como funciona o envio?', 'Envio para todo o Brasil. <strong>Prazos e transportadora a decidir.</strong>'],
  ['Qual é a garantia?', 'Garantia de 90 dias, mais 7 dias para trocar ou devolver.'],
];
function faq() {
  const itens = FAQ.map(([q, a], i) => `
      <li class="mel-faq-item">
        <button type="button" class="mel-faq-q" aria-expanded="false"
                aria-controls="faq-r-${i}" id="faq-q-${i}" data-mel-faq>
          <span>${q}</span>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9.5 12 15.5 18 9.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <div class="mel-faq-r" id="faq-r-${i}" role="region" aria-labelledby="faq-q-${i}" hidden>
          <p>${a}</p>
        </div>
      </li>`).join('');

  return `
<section class="mel-sec" id="faq" aria-labelledby="mel-faq-tit">
  <div class="mel-sec-topo">
    <p class="mel-eyebrow">dúvidas</p>
    <h2 id="mel-faq-tit" class="mel-tit">Perguntas frequentes</h2>
  </div>
  <ul class="mel-faq">${itens}
  </ul>
</section>`;
}

// ------------------------------------------------------------ 9. CTA final
function ctaFinal() {
  return `
<section class="mel-sec mel-cta-final">
  <h2 class="mel-tit">A última foto que você tirou valeu a pena?</h2>
  <p class="mel-col-txt">Largue o celular, pegue sua Polen e redescubra o que é fotografar com intenção.</p>
  <a class="mel-bt mel-bt-mel" href="#produto">Quero minha Polen</a>
</section>`;
}

module.exports = {
  hero, produto, beneficios, galeria, filtros,
  diferencial, faq, ctaFinal,
  conteudo() {
    // hero() e produto() substituíram abertura() e modelos() em 13/08/2026.
    // A Colméia fechava a página, depois do CTA final; saiu em 13/08 a pedido.
    // Agora quem fecha é o CTA final, que é o passo certo numa página de
    // produto: o último bloco convida a comprar, não a entrar num clube.
    return hero() + produto() + beneficios() + galeria()
      + filtros() + diferencial() + faq() + ctaFinal();
  },
};
