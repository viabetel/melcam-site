// LP Bee — /bee
const fs = require('fs');
const path = require('path');
const SITE = path.resolve(__dirname, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(SITE, 'melcam.config.json'), 'utf8'));
const BEE = cfg.produtos.bee;

const listar = (rel, re) => {
  const d = path.join(SITE, 'melcam', 'img', rel);
  return fs.existsSync(d) ? fs.readdirSync(d).filter(f => re.test(f)).sort().map(f => `/melcam/img/${rel}/${f}`) : [];
};

// A BARRA "Bee · Modelos · Destaques · R$ 299,00 · Comprar" FOI REMOVIDA a
// pedido, em 13/08/2026 — o mesmo destino da barra equivalente da /polen, pelos
// mesmos dois motivos: ela duplicava a navbar logo abaixo dela, e o "Comprar"
// dela competia com o "Escolha sua Bee" do hero, que é o próximo passo certo.
//
// Havia ainda um terceiro motivo, medido e não previsto: em 390px a barra
// (sticky, z-index 40, 366px de largura sobre uma tela de 390) cobria o botão
// "Abrir menu" da navbar, em x=24..48 · y=29..53. Teste de acerto na /bee em
// 390: quem recebia o clique era `.mel-barra-in`, não o abridor. Ou seja, no
// celular não havia como abrir o menu do site a partir desta página — nem a
// captura mostrava isso, porque a barra parecia só mais uma faixa no topo.
// Em 768 não colidia (a barra fica centrada, em x=201) e nas outras rotas a
// barra não existe, então o defeito era exclusivo da /bee no retrato estreito.
//
// Com a remoção sai também todo o CSS de `.mel-barra*`: a Bee era a única
// página que o usava. Ficou registrado em progresso.md.
// HERO — "uma câmera para levar junto", 13/08/2026.
//
// SUBSTITUI a abertura anterior (a Bee branca girando e virando amarela, que
// era a "opção 1" do briefing). Aquela cena dependia de um loop infinito de
// rotateY e vivia numa página em carvão. O pedido novo é outro: hero clara,
// solar, editorial, com personalidade própria em relação à Polen — e sem nada
// se movendo depois da entrada. Loop infinito e falso giro 3D estão fora por
// escrito, então a cena antiga não podia sobreviver com retoque.
//
// O render 3D final da Bee continua em PENDENTES do melcam.config.json e
// continua não sendo inventado. A diferença é que a página parou de exibir
// essa espera como nota ao visitante: o hero se apoia nos packshots oficiais
// tratados como peça editorial, que é o mesmo caminho que a /polen tomou.
//
// ESCOLHA DOS DOIS ASSETS, com os arquivos abertos antes (nunca pelo nome):
//   bee-amarela-angulo-corrente.png  1072x620  RGBA, recorte de verdade
//     A câmera em três quartos COM a correntinha e o mosquetão. É o único par
//     de arquivos do acervo que traz a alça, e a alça é a linha de movimento
//     que o pedido descreve — sem precisar desenhar linha nenhuma.
//   bee-branca-frente.png             685x340  RGBA, recorte de verdade
//     De frente, silhueta chapada. Diferente da outra de propósito: duas
//     câmeras no mesmo ângulo leriam como repetição, não como par.
//
// Descartados, e por quê:
//   bee-branca-angulo-corrente.png — espelha a amarela, mesma pose, mesma
//     direção de corrente. Juntas ficavam duas fotos iguais em cores
//     diferentes.
//   bee-lifestyle-acessorio.jpg — a melhor foto de "acessório" do acervo, mas
//     ela JÁ É a imagem do bloco "Câmera como acessório" desta mesma página.
//     Repetir no hero seria a mesma foto duas vezes em /bee.
//   header-fileira/bee-lp-1169.jpg — as duas Bees na mão contra o mar do Rio.
//     Linda e solar, mas é azul de ponta a ponta: dominaria uma página cuja
//     assinatura é o mel, e azul não pertence à paleta.
//   *-caixa.png e *-traseira.png — embalagem e verso não abrem uma página.
//
// ---------------------------------------------------------------------------
// 14/08/2026, À NOITE — OS DOIS PACKSHOTS SAÍRAM E ENTROU O VÍDEO DA BEE.
//
// O cliente entregou "MELCAM BEE.mp4": a Bee amarela pendurada pela alça,
// balançando e girando sobre fundo claro. Ele passa a ser o assunto do hero.
//
// O QUE SAIU, e é para continuar fora: as duas <img> do palco
// (bee-amarela-angulo-corrente.png e bee-branca-frente.png). Elas foram
// SUBSTITUÍDAS, não escondidas — display:none continuaria baixando os 827 KB
// atrás do vídeo, que é exatamente o que o pedido proíbe. Os arquivos seguem no
// acervo e seguem em uso nas duas seções de modelo, que não foram tocadas
// (aquelas usam as OUTRAS duas poses: amarela de frente e branca em ângulo).
//
// A LEGENDA "Amarela · Branca" FICA. O vídeo mostra só a amarela, mas a
// legenda é informação de produto e continua verdadeira — a página vende as
// duas, e os dois cards logo abaixo são o seletor de verdade.
//
// POR QUE O <video> NÃO NASCE COM <source> NO HTML, e um <script> síncrono
// escreve as fontes logo depois dele:
//   1. MOVIMENTO REDUZIDO. O pedido é "não reproduza a animação em loop, mostre
//      somente o poster". Pausar no /melcam/interacoes.js não serve: aquele
//      arquivo é `defer`, então roda depois do parse — o vídeo já teria sido
//      baixado e já teria tocado alguns quadros. Sem <source> escrito, quem
//      pediu menos movimento não baixa um byte de vídeo e fica com o poster,
//      que é o quadro 1 do próprio filme.
//   2. RETRATO. A escolha entre a versão de 960px e a de 576px teria de sair do
//      atributo `media` do <source>, e o suporte a ele em <video> (diferente de
//      <picture>) varia por motor. Aqui a escolha é medida com matchMedia, e o
//      navegador busca UMA versão só — nunca as duas.
// É o mesmo raciocínio do SINALIZADOR ANTIFLASH lá embaixo, e a mesma
// contrapartida honesta: sem JavaScript fica o poster, que é a cena inteira
// parada, nunca um buraco.
const VIDEO = {
  poster: '/melcam/img/bee/bee-hero-video-poster.jpg',
  // 960x1070 — o recorte útil do 4K original, ver progresso.md de 14/08.
  w: 960, h: 1070,
  webm: '/melcam/video/bee/bee-hero.webm',
  mp4: '/melcam/video/bee/bee-hero.mp4',
  webmRetrato: '/melcam/video/bee/bee-hero-retrato.webm',
  mp4Retrato: '/melcam/video/bee/bee-hero-retrato.mp4',
};

function hero() {
  // Derivado, não digitado: se o config ganhar uma terceira cor, a linha muda
  // sozinha. "foto e vídeo" e "filtros retrô" saem das SPECS_BEE abaixo, que
  // são as aprovadas — nenhuma especificação nova entra aqui.
  const apoio = `${BEE.cores.length} cores · foto e vídeo · filtros retrô`;

  return `
<!-- data-mel-tema="claro" — 14/08/2026.
     É o que diz ao controlador da navbar que a barra, enquanto estiver por cima
     desta região, tem que ser papel com tinta de carvão. As três regiões claras
     da /bee (este hero e as duas Bee Cam) levam a marca; de "Destaques" para
     baixo a página volta ao escuro e a barra volta junto. Ver "TEMA DA NAVBAR"
     em tools/perfil.js. -->
<section class="mel-bh" data-mel="bee-hero" data-mel-tema="claro" aria-labelledby="mel-bee-tit">
  <div class="mel-bh-in">
    <div class="mel-bh-copy" data-mel="bee-hero-copy">
      <p class="mel-bh-eyebrow">Bee</p>
      <h1 id="mel-bee-tit" class="mel-bh-tit">Pequena o bastante para ir junto.</h1>
      <p class="mel-bh-txt">Sem peso, sem cerimônia. Uma câmera digital retrô
         feita para fotografar e continuar vivendo o momento.</p>
      <a class="mel-bt mel-bh-cta" data-mel="bee-hero-cta" href="#modelos">Escolha sua Bee</a>
      <p class="mel-bh-apoio">${apoio}</p>
    </div>
  </div>
  <!-- O palco vem DEPOIS do texto no DOM por dois motivos que apontam para o
       mesmo lado: no celular a coluna única precisa abrir pela manchete, que
       é o que explica a página, e para quem lê por leitor de tela a ordem
       lógica também é texto e depois produto. No desktop nada muda: o palco
       é posicionado, não empilhado.
       A forma de mel mora AQUI DENTRO, e não solta no hero: assim ela e o
       vídeo compartilham um sistema de coordenadas só. Enquanto ela ficou
       presa ao hero, o retrato media a altura dela contra a página inteira e o
       plano amarelo passava de 582px onde cabiam 190. -->
  <div class="mel-bh-palco">
    <div class="mel-bh-forma" aria-hidden="true"></div>
    <!-- aria-hidden porque é decorativo: o que o vídeo mostra já está dito no
         <h1>, no parágrafo e na legenda de cores. Sem controles, sem áudio e
         sem foco — não há nada aqui para operar.
         disablepictureinpicture e disableremoteplayback fecham as duas portas
         que sobram para interação acidental; o pointer-events:none do CSS fecha
         o resto, inclusive o toque que abriria tela cheia no celular.
         width/height são os do arquivo: dão a proporção antes do primeiro byte
         e é o que impede salto de layout enquanto o poster carrega. -->
    <video class="mel-bh-video" data-mel="bee-hero-video" aria-hidden="true"
           muted loop playsinline preload="metadata"
           disablepictureinpicture disableremoteplayback
           width="${VIDEO.w}" height="${VIDEO.h}" poster="${VIDEO.poster}"
           data-mel-webm="${VIDEO.webm}" data-mel-mp4="${VIDEO.mp4}"
           data-mel-webm-retrato="${VIDEO.webmRetrato}"
           data-mel-mp4-retrato="${VIDEO.mp4Retrato}"></video><script data-mel="bee-hero-video-fonte">(function(){var v=document.currentScript.previousElementSibling;if(!v||v.tagName!=="VIDEO")return;if(window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches)return;var r=window.matchMedia&&matchMedia("(max-width: 809.98px)").matches?"-retrato":"";var f=[["webm","video/webm"],["mp4","video/mp4"]];for(var i=0;i<f.length;i++){var u=v.getAttribute("data-mel-"+f[i][0]+r);if(!u)continue;var s=document.createElement("source");s.src=u;s.type=f[i][1];v.appendChild(s)}v.setAttribute("autoplay","");if(v.load)v.load()})()</script>
    <p class="mel-bh-cores">
      <span class="mel-bh-cor mel-bh-cor-amarela" aria-hidden="true"></span>Amarela
      <i aria-hidden="true">·</i>
      <span class="mel-bh-cor mel-bh-cor-branca" aria-hidden="true"></span>Branca
    </p>
  </div>
</section>`;
}

// MODELOS — 14/08/2026, reescrito.
//
// Era uma grade de dois cards pequenos: nome, packshot de catálogo, preço e
// botão. O pedido é trazer para cá a LÓGICA de apresentação da /polen — palco
// grande, hierarquia clara, produto com espaço — em duas seções consecutivas,
// uma por Bee, com a imagem alternando de lado.
//
// O QUE FOI REAPROVEITADO DA POLEN é a composição, não a arte: a divisão em
// palco e coluna de informação, a ordem (nome, descrição, destaques, preço,
// CTA) e o peso dado à foto. Nada de cor, tipografia ou classe da Polen entra
// aqui — .mel-pr-* continua exclusiva de lá e este bloco tem classes próprias,
// .mel-bee-mod-*, escopadas em body.mel-pagina-bee.
//
// AS FOTOS, escolhidas com os arquivos abertos e o canal alfa conferido:
//   bee-amarela-frente.png        683x339   alfa 0 nas bordas, recorte real
//   bee-branca-angulo-corrente.png 1090x550  alfa 0 nas bordas, recorte real
//
// O verde e o azul que aparecem ao abrir esses PNGs num visualizador são o
// matte descartado SOB alfa 0 — no navegador não pintam nada. Foi medido, não
// suposto: quatro pontos da linha 4 de cada arquivo, todos com alfa 0.
//
// Por que não os packshots de catálogo, que seriam o caminho óbvio:
//   bee-catalogo-branca-frente.jpg  é 800x800 com FUNDO AZUL CHAPADO. Em card
//     pequeno passava; num palco do tamanho deste, vira um plano azul dominando
//     uma página cuja assinatura é o mel. É o mesmo motivo pelo qual a
//     bee-lp-1169.jpg foi descartada do hero, registrado logo acima.
//   bee-catalogo-amarela-frente.jpg  já traz o próprio plano de mel com favo.
//     Sobre o palco desta seção seria mel sobre mel, e ainda brigaria com o
//     plano de mel do hero, que é dele.
//
// E por que estas duas e não as do hero: o hero usa a amarela em três quartos e
// a branca de frente. Aqui as poses são as OUTRAS duas — amarela de frente,
// branca em três quartos com a correntinha. Nenhuma foto se repete na página, e
// o par lido de cima para baixo alterna a pose junto com o lado.
const FOTOS_BEE = {
  'Bee Amarela': {
    src: '/melcam/img/bee/bee-amarela-frente.png',
    w: 683, h: 339,
    alt: 'A Bee amarela de frente, com o padrão de favo impresso sob a lente e a argola do chaveiro à esquerda.',
    // A câmera é uma faixa horizontal larga e baixa: centrada, sobra ar em cima
    // e embaixo, que é o que o palco quer.
    pos: '50% 50%',
  },
  'Bee Branca': {
    src: '/melcam/img/bee/bee-branca-angulo-corrente.png',
    w: 1090, h: 550,
    alt: 'A Bee branca vista de três quartos, com a correntinha e o mosquetão estendidos à frente.',
    // A corrente ocupa o terço inferior esquerdo. Puxar o enquadramento para
    // cima cortaria o mosquetão; 50% mantém câmera e alça inteiras.
    pos: '50% 50%',
  },
};

// Destaques por seção. VERBATIM de SPECS_BEE, logo abaixo — nenhum número, nenhuma
// unidade e nenhuma capacidade foi reescrita. A divisão é só de ênfase: o corpo
// e o que se vê na mão de um lado, o que a câmera faz do outro. As duas Bees são
// a MESMA câmera, e o texto diz isso com todas as letras em vez de sugerir que
// cada cor tem recurso próprio.
const DESTAQUES_BEE = {
  'Bee Amarela': ['Aproximadamente 26 g', 'Lente grande-angular de 130°',
                  'Tela LCD TFT de 0,96"', 'USB-C 5V/1A'],
  'Bee Branca': ['Vídeo Full HD 1080p e 720p', 'Filtros criativos',
                 'Gravação de áudio', 'Disparo contínuo'],
};

// As duas descrições saem de copy já aprovado desta mesma página, e a âncora
// está escrita ao lado de cada uma. Nenhuma especificação, número, preço,
// disponibilidade ou benefício novo entra aqui.
const TEXTO_BEE = {
  // "do tamanho de um chaveiro" é o alt do hero; o resto é a frase do bloco
  // "Câmera como acessório", em Destaques, palavra por palavra.
  'Bee Amarela': 'O amarelo da Melcam, do tamanho de um chaveiro. Chega pronta '
               + 'pra pendurar na chave, na mochila ou no pescoço.',
  // Os 11 filtros e a estética vintage são do bloco "Filtros e estética retrô",
  // em Destaques. "A mesma câmera, em branco" existe para não deixar no ar que
  // as cores tenham recursos diferentes: não têm.
  'Bee Branca': 'A mesma câmera, em branco. Os mesmos 11 filtros aplicados na '
              + 'hora da foto ou do vídeo, com a estética vintage dos anos 2000.',
};

function bloco(nome, i) {
  const f = FOTOS_BEE[nome];
  const id = 'mel-bee-' + (i ? 'branca' : 'amarela') + '-tit';
  const itens = DESTAQUES_BEE[nome].map((d) => `
          <li>${d}</li>`).join('');

  // A ORDEM DO DOM É SEMPRE PALCO, DEPOIS INFORMAÇÃO — nas duas seções.
  // O espelhamento do desktop é feito por grid-column no CSS, não invertendo o
  // HTML. É isso que garante que no celular as duas empilhem igual (imagem,
  // conteúdo, destaques) em vez de a segunda abrir pelo texto.
  //
  // O NOME É <h2>, NÃO <h3> — 14/08/2026, à noite.
  // Ele virou h3 porque o <h2> "Duas cores. Uma companheira." abria a faixa e
  // era o pai lógico dos dois. Com aquele bloco removido a pedido, um h3 solto
  // debaixo do <h1> do hero pularia um nível do sumário do documento. Agora
  // cada Bee é uma seção de segundo nível, que é o que ela sempre foi na tela,
  // e o `aria-labelledby` das duas <section> aponta para o próprio nome.
  //
  // data-mel-rev / data-mel-rev-passo / data-mel-rev-fade são os alvos da
  // revelação por rolagem. Ficam no HTML de propósito: assim o CSS e o
  // IntersectionObserver não precisam de um seletor genérico de tag ou de
  // classe estrutural para achar o que animar. O que os liga está em
  // tools/bee-interacoes.js; sem JavaScript nenhum deles esconde nada.
  //   esq/dir  — o palco entra pelo lado em que ele fica no desktop.
  //   grupo    — não tem estado próprio: é só o gatilho dos filhos em passo.
  //   passo N  — escalonamento curto do texto, na ordem de leitura.
  //   fade     — só opacidade. É o CTA: mexer no transform dele atropelaria o
  //              realce de hover que .mel-bt já tem.
  return `
  <div class="mel-bee-mod-grade">
    <div class="mel-bee-mod-palco" data-mel-rev="${i ? 'dir' : 'esq'}">
      <img class="mel-bee-mod-foto" src="${f.src}" width="${f.w}" height="${f.h}"
           alt="${f.alt}" style="--pos:${f.pos}"
           loading="${i ? 'lazy' : 'eager'}" decoding="async">
    </div>

    <div class="mel-bee-mod-info" data-mel-rev="grupo">
      <h2 id="${id}" class="mel-bee-mod-nome" data-mel-rev-passo="1">${nome}</h2>
      <p class="mel-bee-mod-txt" data-mel-rev-passo="2">${TEXTO_BEE[nome]}</p>

      <ul class="mel-bee-mod-lista" data-mel-rev-passo="3">${itens}
      </ul>

      <p class="mel-bee-mod-preco" data-mel-rev-passo="4"><strong>${BEE.preco}</strong> <span>${BEE.condicao}</span></p>
      <button type="button" class="mel-bt mel-bt-mel mel-bee-mod-cta" data-mel-rev-fade
              data-mel-add="${nome}" aria-label="${BEE.cta} ${nome}">${BEE.cta}</button>
    </div>
  </div>`;
}

function modelos() {
  const [amarela, branca] = BEE.cores.map((c) => c.nome);

  // Duas <section> irmãs e consecutivas. O id "modelos" fica na primeira porque
  // é o destino do CTA do hero ("Escolha sua Bee") — mudá-lo quebraria a
  // âncora. A segunda tem id próprio: nada de id duplicado.
  //
  // O TOPO SAIU EM 14/08/2026, a pedido.
  //
  // Era <div class="mel-sec-topo"> com o eyebrow "escolha sua Bee" e o
  // <h2 id="mel-bmod-tit"> "Duas cores. Uma companheira." — as duas linhas que
  // o pedido nomeia como uma frase só, e é assim que elas liam na tela: um
  // bloco de abertura colado embaixo do hero, na largura inteira da página.
  //
  // Só ele saiu. O CTA do hero continua escrito "Escolha sua Bee" e continua
  // apontando para #modelos: ele é botão, não a frase, e o pedido manda
  // preservar o resto do conteúdo do hero.
  //
  // O que a remoção obriga a acertar junto, e está feito:
  //   - o `aria-labelledby` desta seção apontava para o h2 removido. Agora
  //     aponta para o nome da Bee amarela, que é o título dela de fato.
  //   - o nome de cada Bee subiu de <h3> para <h2> (ver bloco(), acima): sem o
  //     h2 do topo, um h3 debaixo do <h1> do hero pularia um nível.
  //   - o vão que sobraria some pelo padding-top já reduzido do #modelos
  //     (tools/bee-interacoes.js), medido depois: a primeira Bee Cam passa a
  //     abrir a faixa, sem tira vazia entre ela e o hero.
  return `
<section class="mel-sec mel-bee-mod" id="modelos" data-mel-tema="claro"
         aria-labelledby="mel-bee-amarela-tit">${bloco(amarela, 0)}
</section>
<section class="mel-sec mel-bee-mod mel-bee-mod-inv" id="bee-branca" data-mel-tema="claro"
         aria-labelledby="mel-bee-branca-tit">${bloco(branca, 1)}
  <p class="mel-nota mel-bee-mod-nota" data-mel-rev="sobe">${BEE.nota}</p>
</section>`;
}

// Destaques na hierarquia obrigatória do briefing.
const SPECS_BEE = [
  'Vídeo Full HD 1080p e 720p', 'Tela LCD TFT de 0,96"', 'Lente grande-angular de 130°',
  'MicroSD/TF de até 128 GB, não incluso', 'Bateria de 300 mAh',
  'Autonomia estimada de 30 a 40 minutos', 'USB-C 5V/1A', 'Aproximadamente 26 g',
  'Fotos', 'Gravação de áudio', 'Disparo contínuo', 'Gravação em loop', 'Filtros criativos',
];
function destaques() {
  const fotos = listar('bee', /lifestyle|filtro/i);
  const acessorio = fotos.find(f => /acessor/i.test(f)) || '/melcam/img/a-decidir.svg';
  const tela = fotos.find(f => /tela/i.test(f)) || '/melcam/img/a-decidir.svg';

  return `
<section class="mel-sec" id="destaques" aria-labelledby="mel-dest-tit">
  <div class="mel-sec-topo" data-mel-rev="grupo">
    <p class="mel-eyebrow" data-mel-rev-passo="1">destaques</p>
    <!-- 13/08/2026 — este <h2> era "Pequena o bastante para ir junto", que
         passou a ser o <h1> do hero novo. Manter os dois deixaria a MESMA
         manchete duas vezes na mesma página, palavra por palavra — o defeito
         que já foi corrigido na /polen, onde o card do Header Grid repetia o
         título da seção de produto. O texto novo é derivado de spec aprovada
         ("Aproximadamente 26 g", logo abaixo nesta mesma seção): nada novo foi
         afirmado. Se o cliente preferir a frase antiga aqui, o hero é que
         precisa de outro título. -->
    <h2 id="mel-dest-tit" class="mel-tit" data-mel-rev-passo="2">O que cabe em 26 gramas</h2>
  </div>

  <div class="mel-dest">
    <div class="mel-dest-img" data-mel-rev="alto"><img src="${acessorio}" alt="Bee pendurada como acessório" loading="lazy"></div>
    <div class="mel-dest-txt" data-mel-rev="grupo">
      <h3 data-mel-rev-passo="1">Câmera como acessório</h3>
      <p data-mel-rev-passo="2">Sua Bee chega pronta pra pendurar na chave, na mochila ou no pescoço — é
         só tirar da caixa e sair fotografando. Uma câmera pequena que te
         acompanha em cada lugar.</p>
    </div>
  </div>

  <div class="mel-dest mel-dest-inv">
    <div class="mel-dest-img" data-mel-rev="alto"><img src="${tela}" alt="Foto feita com a Bee, com filtro retrô" loading="lazy"></div>
    <div class="mel-dest-txt" data-mel-rev="grupo">
      <h3 data-mel-rev-passo="1">Filtros e estética retrô</h3>
      <p data-mel-rev-passo="2">A Bee tem 11 filtros para escolher, aplicados no momento da foto ou do
         vídeo. Estética vintage lembrando os anos 2000.</p>
    </div>
  </div>

  <div class="mel-dest-specs" data-mel-rev="grupo">
    <h3 data-mel-rev-passo="1">Filmagem e fotografia</h3>
    <ul class="mel-specs" data-mel-rev-passo="2">${SPECS_BEE.map(s => `<li>${s}</li>`).join('')}</ul>
  </div>
</section>`;
}

// A COLMÉIA SAIU EM 13/08/2026, a pedido, junto com a da /polen.
//
// Era a seção "o clube da marca / Entre para a Colméia" fechando a página, com
// eyebrow, título, parágrafo, os três perks, o CTA "Quero entrar na Colméia" e
// a nota de cadastro a decidir. As duas páginas de produto usavam o mesmo
// bloco, então saíram na mesma passada — o pedido numa vale para a equivalente.
//
// A home NÃO foi tocada: lá o bloco é a seção do template Framer
// (data-framer-name "Speed On"), outra implementação, e não foi pedida.
// `cfg.colmeia` continua no config, com o texto aprovado intacto.
// O SINALIZADOR ANTIFLASH — 14/08/2026.
//
// A revelação por rolagem precisa de um estado inicial escondido, e estado
// inicial escondido é exatamente o que produziu o "hero em branco" registrado
// no progresso.md: se o JS não roda, o conteúdo nunca aparece. O pedido é
// explícito nos dois lados — animar, mas garantir conteúdo visível caso o
// JavaScript falhe.
//
// A saída é fazer o próprio CSS depender de uma marca que só o JavaScript
// escreve: sem script, `html.mel-bee-rev` não existe, nenhuma regra de
// escondido casa e a página fica igual à de hoje. Com script, a marca está
// posta ANTES de o navegador pintar o que vem depois dela.
//
// POR QUE INLINE E POR QUE AQUI, e não no bundle de /melcam/interacoes.js:
// aquele arquivo é `defer`, ou seja, roda depois do parse do documento. Marcar
// ali deixaria a janela em que o navegador já pode ter pintado a versão
// revelada — o "mostrar uma versão antiga antes da final" que o pedido proíbe.
// Um <script> síncrono executa durante o parse, e tudo que carrega
// data-mel-rev vem DEPOIS dele no documento: nenhum desses elementos chega a
// existir sem a marca já no <html>.
//
// Fica dentro do conteúdo da /bee, e não no <head> compartilhado, porque é
// regra desta página só. <script> tem display:none por padrão, então ele é
// filho do stack sem ocupar linha nem alterar o layout de nada.
const SINALIZADOR = `
<script data-mel="bee-rev">document.documentElement.className+=" mel-bee-rev"</script>`;

module.exports = {
  conteudo() { return SINALIZADOR + hero() + modelos() + destaques(); },
};
