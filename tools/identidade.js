// Gera a camada de identidade MELCAM: @font-face das fontes oficiais e
// sobrescrita dos 9 tokens de cor do template.
//
// Por que sobrescrever token em vez de trocar cor no CSS: o template define
// toda a cor em 9 custom properties. Redefinindo elas, o design inteiro troca
// de paleta sem que uma única regra de layout, espaçamento ou animação seja
// tocada. É o que mantém a Regra de Ouro.
const fs = require('fs');
const path = require('path');

const SITE = path.resolve(__dirname, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(SITE, 'melcam.config.json'), 'utf8'));
const P = cfg.paleta;

// ---------------------------------------------------------------- fontes
const PESO_POR_FAMILIA = {
  'Area Extended Hairline': 100, 'Area Extended Thin': 200,
  'Area Extended Extralight': 275, 'Area Extended Light': 300,
  'Area Extended': 400, 'Area Extended Medium': 500,
  'Area Extended SemiBold': 600, 'Area Extended Semibold': 600,
  'Area Extended ExtraBold': 800, 'Area Extended Extrabold': 800,
  'Area Extended Black': 900, 'Area Extended Extrablack': 950,
};

function tabelaNome(file) {
  const b = fs.readFileSync(file);
  const n = b.readUInt16BE(4);
  let off = null;
  for (let i = 0; i < n; i++) {
    const p = 12 + i * 16;
    if (b.slice(p, p + 4).toString('latin1') === 'name') off = b.readUInt32BE(p + 8);
  }
  if (off === null) return {};
  const count = b.readUInt16BE(off + 2), strOff = off + b.readUInt16BE(off + 4), out = {};
  for (let i = 0; i < count; i++) {
    const r = off + 6 + i * 12;
    const plat = b.readUInt16BE(r), id = b.readUInt16BE(r + 6);
    const len = b.readUInt16BE(r + 8), o = b.readUInt16BE(r + 10);
    const raw = b.slice(strOff + o, strOff + o + len);
    if (!out[id]) out[id] = plat === 3 ? raw.swap16().toString('utf16le') : raw.toString('latin1');
  }
  return { familia: out[1], estilo: out[2] };
}

function gerarFontes() {
  const dir = path.join(SITE, 'melcam', 'fonts');
  const area = path.join(dir, 'area');
  let css = `/* Fontes oficiais MELCAM. Gerado por tools/identidade.js — nao editar a mao. */\n\n`;

  if (fs.existsSync(area)) {
    for (const f of fs.readdirSync(area).filter(f => /\.otf$/i.test(f))) {
      const { familia, estilo } = tabelaNome(path.join(area, f));
      const peso = PESO_POR_FAMILIA[familia] ?? 400;
      const ital = /italic|oblique/i.test(estilo || '') || /Italic/i.test(familia || '');
      css += `@font-face{font-family:"Area";src:url("/melcam/fonts/area/${f}") format("opentype");`
        + `font-weight:${peso};font-style:${ital ? 'italic' : 'normal'};font-display:swap}\n`;
    }
  }
  // Iowan: o toolkit só tem o peso Bold. Decisão do cliente: display apenas.
  css += `\n@font-face{font-family:"Iowan Old Style";src:url("/melcam/fonts/iowan-old-style-bold.otf") format("opentype");font-weight:700;font-style:normal;font-display:swap}\n`;
  css += `@font-face{font-family:"Brooklyn Heritage";src:url("/melcam/fonts/brooklyn-heritage-semibold.otf") format("opentype");font-weight:600;font-style:normal;font-display:swap}\n`;

  fs.writeFileSync(path.join(dir, 'fontes.css'), css, 'utf8');
  return css.split('@font-face').length - 1;
}

// ---------------------------------------------------------------- cores
// As derivações neutras da identidade, num lugar só. Não são cores novas: são
// os valores que o projeto já usava espalhados como literal em vários
// geradores. Ficam aqui para que o MAPA_TOKEN abaixo e os `--mel-*` publicados
// no CSS nasçam da MESMA constante — uma fonte, não duas concorrentes.
const D = {
  superficie: '#2B251C',                 // card e área elevada sobre carvão
  secundario: '#9A9083',                 // descrição e metadado — 5,28:1 no carvão, AA
  papelSuave: '#CFC6B8',                 // texto de apoio com mais presença — 9,81:1
  borda: 'rgba(251,247,238,.07)',        // hairline sobre escuro
  overlay: 'rgba(34,30,23,.35)',         // véu sobre foto
  melClaro: '#FFC22E',                   // só o hover do botão de mel
};

// Mapa token do template -> cor MELCAM. Mantém a hierarquia clara/escura
// original: o template é escuro, e carvão+papel preservam essa sofisticação.
const MAPA_TOKEN = {
  '3e6ec15f-2b75-4e3b-ad0b-168aa37f4237': P.carvao,                  // #0d0d0d fundo
  '9f5c7abb-959f-460d-bc9f-d2f6fbaa130d': P.carvao,                  // #0d0d0d fundo
  'ad4d2a8b-0add-4634-8710-f4704da278ff': P.papel,                   // #fff
  'e5fd1d2d-45e6-49b9-b341-ad7384948a67': P.papel,                   // #dedede texto
  'ee01c93a-c94e-42a3-8ebf-3f7c78c2647a': D.secundario,              // #696969 secundário
  '1d4f7ead-bfa1-40e6-9e94-a738e2b2b3fc': D.superficie,              // #1c1c1c superfície
  '30e9a435-77d0-4905-81f2-ed32927858c6': D.superficie,              // #1c1c1c superfície
  'cb084d69-fb3a-43a7-b50a-e7506bdef46c': D.borda,                   // borda sutil
  'ab591a21-7f4d-4730-9bd6-d3f6304cf2d9': D.overlay,                 // overlay
};

function gerarIdentidade() {
  let css = `/* Identidade MELCAM. Gerado por tools/identidade.js — nao editar a mao.
   Sobrescreve os 9 tokens de cor do template e a familia tipografica.
   Nenhuma regra de layout, espacamento, transicao ou animacao e tocada. */

@import url("/melcam/fonts/fontes.css");

/* O SELETOR PRECISA SER ":root,body" — auditoria de paleta, 13/08/2026.

   Ate esta data o bloco declarava so :root, e a paleta MELCAM nunca chegou a
   pintar nada. O template declara os NOVE tokens em "body", duas vezes:

     body{ --token-3e6ec15f:#f5f5f5; --token-e5fd1d2d:#333; ... }
     @media (prefers-color-scheme:dark){ body{ --token-3e6ec15f:#0d0d0d; ... } }

   Custom property herda. Heranca perde para QUALQUER declaracao direta no
   proprio elemento — nao e questao de especificidade nem de ordem. Entao o
   valor MELCAM valia so para o <html>, e tudo dentro de <body> lia de volta o
   legado do template: fundo #0d0d0d, texto #dedede, secundario #696969 (3,54:1
   no rodape, reprova AA), superficie #1c1c1c, borda #ffffff0d.

   Pior: com "prefers-color-scheme: light" no sistema, o site inteiro abria na
   pele CLARA do template — fundo #f5f5f5, texto #333. Medido no navegador, nao
   deduzido.

   Declarando tambem em "body", a especificidade empata com a do template
   (0,0,1) e vence por ordem de fonte: identidade.css entra depois do <style>
   do export, em todas as paginas. O @media dark do template tambem perde, pelo
   mesmo motivo — @media nao soma especificidade. E como os dois esquemas caem
   no mesmo valor, a paleta passa a ser a mesma com o sistema claro ou escuro,
   que e o que a marca pede.

   :root fica junto de proposito: e o que pinta a area fora do wrapper de
   1440px em telas largas, que e filha de <html>, nao de <body>. */
:root,body{
  /* os cinco da marca */
  --mel-carvao:${P.carvao}; --mel-mel:${P.mel}; --mel-papel:${P.papel};
  --mel-coral:${P.coral}; --mel-verde:${P.verdeMar};
  /* as derivacoes neutras, declaradas em vez de repetidas como literal */
  --mel-superficie:${D.superficie}; --mel-secundario:${D.secundario};
  --mel-papel-suave:${D.papelSuave}; --mel-borda:${D.borda};
  --mel-overlay:${D.overlay}; --mel-mel-claro:${D.melClaro};
`;
  for (const [id, cor] of Object.entries(MAPA_TOKEN)) css += `  --token-${id}:${cor};\n`;
  css += `}\n\n`;

  css += `/* Tipografia. Area assume o texto corrido; Iowan fica em display,
   porque o toolkit so entrega o peso Bold dela. */
:root{ --framer-font-family:"Area","Inter",sans-serif; }
body,.framer-text{ font-family:"Area","Inter",sans-serif; }
h1,h2,.framer-text h1,.framer-text h2{
  font-family:"Iowan Old Style",Georgia,serif; font-weight:700;
  letter-spacing:-.01em;
}

/* Mel e a cor expressiva: entra em CTA e destaque, nao no fundo das secoes. */
[data-framer-name="Button"], .framer-button, button[data-framer-component-type]{
  --mel-acento:${P.mel};
}

/* --------------------------------------------------------------------
   CATALOGO DE DOIS PRODUTOS
   O template foi feito para vitrine de muitos SKUs. A MELCAM tem duas
   linhas, entao dois cards iguais lado a lado achatariam as duas. A saida
   e dar a cada uma um destaque de natureza diferente, nao de tamanho:

   POLEN — o argumento e ESCOLHA. E a linha madura, 7 cores. Ganha a
   moldura em papel (claro sobre escuro), que puxa o olho primeiro, e a
   régua de cores como assinatura visual.

   BEE — o argumento e NOVIDADE. E o lancamento, 2 cores, de levar junto.
   Ganha o selo em mel e a borda viva, que comunica "chegou agora" sem
   precisar competir em area com a Polen.
   -------------------------------------------------------------------- */

[data-framer-name="Polen"]{ --mel-produto:${P.papel}; }
[data-framer-name="Bee"]{ --mel-produto:${P.mel}; }

/* ATENCAO AO SELETOR (corrigido em 12/08/2026)
   data-framer-name="Polen" casa com 8 elementos por pagina e "Bee" com 4:
   os cards <a> (duas variantes de breakpoint cada) E os <div> de rich text
   que carregam so o rotulo. Sem ancorar na tag, o selo e a regua eram
   desenhados tambem em cima do texto "Polen" e "Bee" — as "particulas de
   cor" que o cliente reportou.
   Os cards sao <a>; os rotulos sao <div data-framer-component-type=
   "RichTextContainer">. Ancorar o seletor na tag "a" separa os dois sem
   depender de classe hasheada, que muda a cada export. */

/* Selo de novidade da Bee.

   O SEGUNDO BRACO DO SELETOR SAIU — auditoria de paleta, 13/08/2026.
   Era ".framer-text:first-child:not(h1):not(h2)", escrito para pintar um
   eyebrow em carvao dentro da pilula de mel. So que o card da Bee nao tem
   eyebrow: o primeiro .framer-text dele e o <h3> com o titulo "Bee", e h3 nao
   estava na lista de excecoes. Resultado medido no navegador: o titulo do card
   saia em carvao #221E17 sobre o card escuro — 1,17:1, texto fantasma.
   A pilula "Novidade" nao dependia disso; ela pinta a propria cor no ::before
   logo abaixo. O braco so fazia estrago. */
[data-framer-name="Bee"] [data-framer-name="Eyebrow"]{
  color:${P.carvao};
}
a[data-framer-name="Bee"]::before{
  content:"Novidade";
  position:absolute; z-index:3; top:1.25rem; left:1.25rem;
  padding:.35rem .75rem; border-radius:999px;
  background:${P.mel}; color:${P.carvao};
  font-family:"Area",sans-serif; font-size:.72rem; font-weight:700;
  letter-spacing:.09em; text-transform:uppercase;
  pointer-events:none;
}
a[data-framer-name="Bee"]{ position:relative; }


/* ============ card da Bee na home — 14/08/2026 ============
   Medido antes: o card do LANCAMENTO tinha 432x277 e trazia a palavra "Bee",
   o selo e uma foto. O da Polen, ao lado, tinha 432x481 com eyebrow, conceito,
   7 packshots, preco e CTA. O preco da Bee (R$ 299,00) estava no config e nao
   aparecia em lugar nenhum da home.

   A INVERSAO DE PESO. A altura destes cards vem de aspect-ratio sobre 432px:
   0.897959 da 481px (grande) e 1.55752 da 277px (pequeno). Trocar os dois
   entre a Bee e o Acessorios mantem a soma da coluna em 773px (481+15+277) e
   nao mexe nas outras duas colunas. O Acessorios ainda nao vende nada — o
   proprio texto dele diz "categoria em preparacao" — entao ocupava o maior
   espaco da coluna 2 para nao oferecer nada.

   SO NA HOME. As internas tambem tem Header Grid (decisao de 13/08) e nao
   podem mudar: por isso body:not(.mel-interna) em tudo aqui.

   A BEE NAO GANHA EYEBROW COMO A POLEN, e nao e esquecimento: o eyebrow da
   Polen mora em top/left 1.25rem, exatamente onde o selo "Novidade" da Bee ja
   esta. Aqui quem faz o papel de etiqueta e o selo, e o nome segue no <h3>. */

body:not(.mel-interna) a[data-framer-name="Bee"]{ aspect-ratio:.897959 !important }
body:not(.mel-interna) a[data-framer-name="Sneakers"]{ aspect-ratio:1.55752 !important }

/* O conceito. Fica no fluxo do RichTextContainer, logo abaixo do <h3>, que e
   centralizado — entao ele herda o eixo e nao precisa de posicionamento. */
.mel-bee-sub{
  margin:.35rem 0 0; padding:0 1.25rem;
  font-family:"Area",sans-serif; font-size:.9rem; font-weight:500;
  line-height:1.35; text-align:center; color:rgba(251,247,238,.82);
}

/* ABSOLUTA no rodape, pelo mesmo motivo da tira da Polen: o card tem altura
   fixa por aspect-ratio e nao cresce. Em fluxo, a tira era simplesmente
   cortada e dava 0x0. O scrim e funcional, nao enfeite — e ele que garante
   contraste do preco e do CTA sobre a foto. */
.mel-bee-tira{
  position:absolute; z-index:3; left:0; right:0; bottom:0;
  display:flex; flex-direction:column; align-items:center; gap:.55rem;
  padding:2.6rem 1.25rem 1.1rem;
  pointer-events:none;                    /* o clique continua sendo o do <a> */
  background:linear-gradient(180deg,rgba(34,30,23,0) 0%,rgba(34,30,23,.78) 42%,rgba(34,30,23,.94) 100%);
}

/* As 2 cores, em packshot oficial: mostra produto e cor ao mesmo tempo, como
   na Polen. Nenhuma informacao depende so da cor — a contagem vai no
   aria-label da tira e o preco esta em texto ao lado. */
.mel-bee-cores{ display:flex; gap:.4rem }
.mel-bee-cores img{
  width:2.1rem; height:2.1rem; border-radius:3px;
  object-fit:cover; display:block; flex:none;
  border:1px solid rgba(251,247,238,.07);
  transition:transform 420ms cubic-bezier(.22,.61,.36,1);
}
a[data-framer-name="Bee"]:hover .mel-bee-cores img{ transform:translateY(-2px) }

.mel-bee-linha{
  display:flex; align-items:baseline; justify-content:center;
  gap:.75rem; flex-wrap:wrap;
}
.mel-bee-preco{
  font-family:"Iowan Old Style",Georgia,serif; font-size:1.15rem;
  color:#FBF7EE;
}
/* CTA e TEXTO, nao <a>: o bloco inteiro ja e o link, e link dentro de link e
   invalido. O sublinhado deixa claro que e acionavel sem depender de cor. */
.mel-bee-cta{
  font-family:"Area",sans-serif; font-size:.82rem; font-weight:700;
  color:#F2A900; text-decoration:underline; text-underline-offset:3px;
}

/* Se um dia o paginas.gerar() propagar estes nos para as internas, a tira sai
   de cena em vez de aparecer fora de contexto. Mesma guarda da Polen. */
body.mel-interna .mel-bee-tira,
body.mel-interna .mel-bee-sub{ display:none }

@media (prefers-reduced-motion:reduce){
  .mel-bee-cores img{ transition:none }
}


/* A FOTO DO CARD DA BEE, reposicionada para o card grande — 14/08/2026.
   O template ancorava o container da foto em inset 290px 46px -148px 47px:
   numeros calibrados para o card de 277px de altura, quando a foto entrava
   logo abaixo do titulo e sangrava pela base. Com o card em 481px esses 290px
   viraram um vazio de quase metade do cartao entre o texto e a imagem, e a
   foto ficava pequena e solta no meio.

   Em porcentagem, e nao em px, porque a altura do card vem de aspect-ratio:
   assim a ancora acompanha qualquer largura sem uma media query por
   breakpoint. 34% deixa o titulo e a linha de conceito respirarem acima; o
   -6% embaixo mantem o sangramento do template, que e o que faz a foto passar
   por tras da tira de preco em vez de terminar numa borda reta.

   O rotate(2deg) e inline no HTML do template e NAO e tocado: e a inclinacao
   que da o ar de foto jogada na mesa, e ela e do desenho original. */
body:not(.mel-interna) a[data-framer-name="Bee"] > div > [data-framer-name="Image"]{
  inset:32% 0 0 0 !important;
}


/* O CARD "SOBRE NOS", recomposto — 14/08/2026.
   Medido antes, no card de 432x773:
     foto de cima  visivel de   0 a 206
     VAZIO                206 a 326   (120px)
     titulo               326 a 368
     paragrafo            392 a 446
     VAZIO                446 a 568   (122px)
     foto de baixo visivel de 568 a 773
   Ou seja 242px de carvao vazio, 31% do cartao, com o texto espremido entre
   dois buracos. Era o que se lia como "mal colocada".

   As duas fotos crescem para fechar os vazios, deixando 40px de respiro de
   cada lado do texto. O ponto de corte e o mesmo para as duas, 63% da altura
   do card: a de cima termina ali, a de baixo comeca ali. Em porcentagem
   porque a altura do card vem de aspect-ratio e muda com a largura.

   AS DUAS SE DISTINGUEM PELA PROPRIA FOTO, com :has. Sao dois
   [data-framer-name="Image"] irmaos e identicos em tag, classe e atributo —
   nth-of-type nao os separa, e a ordem deles no DOM e o inverso da ordem na
   tela (o primeiro no HTML e o de BAIXO). Ancorar no src e o unico jeito que
   nao depende de ordem e nao quebra se o export reorganizar. */
body:not(.mel-interna) a[data-framer-name="Sobre Nós"] [data-framer-name="Image"]:has(img[src*="bee-lp-06"]){
  /* 🔴 MEXER NO TOP, NAO NO BOTTOM. O container tem aspect-ratio 1:1 e a
     altura dele sai da largura — o bottom do inset e simplesmente
     ignorado. A primeira tentativa mudou o bottom para 63% e a foto nao
     andou um pixel; foi a medicao que pegou, porque o inset COMPUTADO
     mostrava o valor novo e a caixa continuava no lugar velho. */
  top:-19% !important; bottom:auto !important;
}
body:not(.mel-interna) a[data-framer-name="Sobre Nós"] [data-framer-name="Image"]:has(img[src*="bee-lp-1237"]){
  inset:63% 0 -227px !important;
}


/* O ROTULO DOS CARDS PEQUENOS ESTAVA ATRAS DA FOTO — 14/08/2026.
   Defeito anterior a esta passagem, achado por medicao e nao por print: a
   sonda perguntou ao elementFromPoint quem estava no centro de cada <h3> e
   respondeu <img> nos dois cards de 277px. Os titulos "Polen" e "Acessorios"
   existiam, tinham caixa e eram contados como visiveis por qualquer conta de
   geometria — so nao apareciam, porque a foto do card cobre o cartao inteiro
   e vem depois no DOM.

   Os cards grandes nao sofrem: neles a foto comeca abaixo do texto.

   O scrim so entra nos dois pequenos. Nos grandes ele seria carvao sobre
   carvao, invisivel na maior parte, mas desenhava uma borda mais escura no
   topo do cartao — apareceu na primeira tentativa e foi descartado.
   Medido atras do texto do card de Acessorios: brilho 59 no titulo e 65 no
   paragrafo, contra papel #FBF7EE. Passa com folga, e o scrim ainda escurece
   mais por cima. */
body:not(.mel-interna) div[data-framer-name="Header Grid"] a [data-framer-component-type="RichTextContainer"]{
  position:relative; z-index:2;
}
body:not(.mel-interna) div[data-framer-name="Header Grid"] a[data-framer-name="Polen"]:not(:has(.mel-polen-tira)) [data-framer-component-type="RichTextContainer"]::before,
body:not(.mel-interna) div[data-framer-name="Header Grid"] a[data-framer-name="Sneakers"] [data-framer-component-type="RichTextContainer"]::before{
  content:""; position:absolute; z-index:-1;
  inset:-3.2rem -1.5rem -2rem;
  background:linear-gradient(180deg,rgba(34,30,23,.94) 0%,rgba(34,30,23,.86) 45%,rgba(34,30,23,.5) 78%,rgba(34,30,23,0) 100%);
  pointer-events:none;
}


/* MOBILE: as ancoras do desktop nao servem aqui — 14/08/2026.
   Os cards mudam de proporcao abaixo de 810px (a grade vira uma coluna de
   327px) e o texto quebra em mais linhas, entao as porcentagens calibradas em
   1440 saem do lugar. Medido em 390px, ANTES desta regra:

     Bee ....... texto ate 129, foto comecando em 85  -> foto EM CIMA do texto
     Acessorios  texto ate 163, foto so 16px visiveis -> foto praticamente sumia

   Depois: Bee com 19px de respiro, Acessorios com a foto cobrindo o cartao
   inteiro atras do scrim, como o card pequeno da Polen ja fazia.

   🔴 O SELETOR AQUI NAO PODE TER `> div >`. A regra do desktop usa o caminho
   direto porque naquela variante a foto e neta do <a>. No mobile o export
   monta outra arvore e o mesmo seletor nao casa com nada — a primeira versao
   desta media query nao moveu um pixel, e so a medicao mostrou. */
@media (max-width:809.98px){
  body:not(.mel-interna) div[data-framer-name="Header Grid"] a[data-framer-name="Bee"] [data-framer-name="Image"]{
    inset:42% 8% -6% 8% !important;
  }
  body:not(.mel-interna) div[data-framer-name="Header Grid"] a[data-framer-name="Sneakers"] [data-framer-name="Image"]{
    top:0 !important; bottom:auto !important;
  }
}



/* ============ AS 7 CORES VIRAM ESCOLHA — 14/08/2026 ============
   Pedido: "o polen tem que ser tipo key feature nas cores; ao passar o mouse os
   cards das cores aumentam e o fundo muda de acordo", "os cards estao pequenos
   demais para serem vistos", "a foto do card macro deveria mudar tambem" e "a
   foto padrao deveria ser mais generalista, respeitando a proposta do card".

   O QUE MUDOU, na ordem em que a pessoa percebe:

   1. EM REPOUSO, AS 7 CORES ESTAO NA FOTO. O card mostrava um macro do couro
      MARROM — uma cor so, num cartao cujo titulo e "7 cores. Uma decisao.".
      Agora a area da foto e dividida em sete faixas verticais, uma por
      variante. As cameras ficam alinhadas entre as faixas (mesmo
      enquadramento em todos os packshots), entao lê como composicao, nao como
      colagem.

   2. NO HOVER, A FAIXA VIRA O CARD INTEIRO. A cor escolhida se abre de 14,29%
      para 100% da largura, as outras somem, e o nome e a frase daquela
      variante aparecem acima dos swatches.

   3. OS SWATCHES CRESCERAM. Eram 2.1rem (33.6px) e nao respondiam a nada.
      Agora tem 2.9rem em repouso e 3.6rem sob o ponteiro, com anel na propria
      cor, e os vizinhos recuam para a escolha parecer escolha.

   NADA DISSO CUSTA DOWNLOAD NOVO. As sete fotos grandes sao os MESMOS arquivos
   dos swatches — o navegador ja baixou cada um para desenhar a miniatura. E o
   fundo de cada packshot ja vem na cor da variante, entao trocar a foto troca
   o fundo junto, sem veu por cima fazendo o trabalho.

   As regras por indice sao geradas por tools/bloco-polen.js > cssCores(),
   direto de melcam.config.json. Nao editar a mao aqui: mexer no config e
   rodar o gerador. */

/* SANGRA ATE AS BORDAS. Com left/right em 8% sobravam 52px de carvao de cada
   lado e o leque ficava boiando dentro do cartao em vez de ser o fundo dele.
   E 32% em vez de 38%: com o card quadrado, os 38% deixavam 138px de vazio
   entre o titulo e a primeira faixa. */
.mel-polen-troca{
  position:absolute; top:32%; left:0; right:0; bottom:0; z-index:1;
  pointer-events:none; border-radius:inherit; overflow:hidden;
}
.mel-polen-troca img{
  position:absolute; top:0; bottom:0; height:100%;
  object-fit:cover; object-position:50% 50%;
  transition:left 480ms cubic-bezier(.22,.61,.36,1),
             width 480ms cubic-bezier(.22,.61,.36,1),
             opacity 360ms ease;
}
/* Some so quando ALGUMA cor esta sob o ponteiro; a escolhida volta a 1 na
   regra gerada, que vem depois desta. */
a[data-framer-name="Polen"]:has(.mel-polen-cor:hover) .mel-polen-troca img{ opacity:0 }

/* A foto original do template sai de cena: quem desenha a area agora e o
   leque. Ela fica no DOM, como manda a casa. */
body:not(.mel-interna) a[data-framer-name="Polen"]:has(.mel-polen-troca) [data-framer-name="Image"]{
  opacity:0;
}

/* O veu so reforca a cor na METADE DE CIMA do card, onde o leque nao chega.
   0.12 e normal, nao multiply: multiply sobre carvao virava marrom e nao lia
   como a cor escolhida. */
.mel-polen-veu{
  position:absolute; inset:0; z-index:1; pointer-events:none;
  opacity:0; background:transparent; border-radius:inherit;
  transition:opacity 420ms cubic-bezier(.22,.61,.36,1), background 420ms ease;
}
a[data-framer-name="Polen"]:has(.mel-polen-cor:hover) .mel-polen-veu{ opacity:.12 }

/* Os swatches. 2.9rem em repouso ja se le como produto, e nao como bolinha. */
/* 🔴 OS SWATCHES SAO ELASTICOS, NAO FIXOS. Medido em 390px com largura
   cravada em 2.9rem: sete de 46px mais seis vaos pedem 351px, e o card tem
   327 — o primeiro nascia em x=-13 e o ultimo terminava 13px depois da borda
   direita. Nao havia transbordo na PAGINA para denunciar, porque o card
   recorta. Com flex:1 1 0 e max-width eles ficam nos 46px onde cabe e
   encolhem para 34px onde nao cabe, sem media query e sem numero magico. */
.mel-polen-cores{ display:flex; width:100%; justify-content:center; gap:clamp(.2rem,1.4%,.45rem); pointer-events:auto }
.mel-polen-cor{
  display:block; flex:1 1 0; width:auto; height:auto; max-width:2.9rem; aspect-ratio:1;
  border-radius:5px; position:relative; overflow:visible;
  box-shadow:0 0 0 1px rgba(251,247,238,.10);
  transition:transform 380ms cubic-bezier(.22,.61,.36,1), box-shadow 380ms ease, opacity 380ms ease;
  transform-origin:50% 100%;   /* cresce para CIMA: para baixo bateria no preco */
}
.mel-polen-cor img{ width:100%; height:100%; object-fit:cover; display:block; border-radius:5px }
.mel-polen-cor:hover{
  transform:scale(1.24) translateY(-2px);
  box-shadow:0 6px 18px rgba(0,0,0,.45), 0 0 0 2px var(--mel-cor,#F2A900);
  z-index:2;
}
/* Os vizinhos recuam de leve: e o que faz a escolha parecer escolha, e nao
   sete itens iguais com um maior no meio. */
a[data-framer-name="Polen"]:has(.mel-polen-cor:hover) .mel-polen-cor:not(:hover){
  transform:scale(.94); opacity:.6;
}

/* A LEGENDA E CENTRADA NO CARD, e nao presa ao swatch.
   A primeira versao desenhava o texto num ::after do proprio swatch. No
   ultimo da fileira, o texto nascia alinhado ao centro dele e vazava pela
   borda direita do cartao — "Verde · Natural em cada" cortado no meio da
   palavra. Aqui ela mora na tira, centralizada, e o conteudo vem das regras
   geradas por indice.

   A faixa ocupa o lugar mesmo vazia: sem isso a tira inteira pula de altura
   quando o nome aparece, e a fileira de cores se mexeria debaixo do ponteiro. */
.mel-polen-legenda{
  display:block; min-height:1.05rem; margin-bottom:.35rem;
  font-family:"Area",sans-serif; font-size:.72rem; font-weight:600;
  letter-spacing:.02em; text-align:center; color:#FBF7EE;
  opacity:0; transition:opacity 260ms ease;
  text-shadow:0 1px 6px rgba(34,30,23,.9);
}
a[data-framer-name="Polen"]:has(.mel-polen-cor:hover) .mel-polen-legenda{ opacity:1 }

a[data-framer-name="Polen"]:has(.mel-polen-cor[data-i="0"]:hover) .mel-polen-veu{ background:#F4B233 }
.mel-polen-cor[data-i="0"]{ --mel-cor:#F4B233 }
.mel-polen-troca img[data-i="0"]{ left:0.0000%; width:14.2857% }
a[data-framer-name="Polen"]:has(.mel-polen-cor[data-i="0"]:hover) .mel-polen-troca img[data-i="0"]{ left:0; width:100%; opacity:1; z-index:2 }
a[data-framer-name="Polen"]:has(.mel-polen-cor[data-i="0"]:hover) .mel-polen-legenda::after{ content:"Amarela · Vibrante por essência." }
a[data-framer-name="Polen"]:has(.mel-polen-cor[data-i="1"]:hover) .mel-polen-veu{ background:#DADADA }
.mel-polen-cor[data-i="1"]{ --mel-cor:#DADADA }
.mel-polen-troca img[data-i="1"]{ left:14.2857%; width:14.2857% }
a[data-framer-name="Polen"]:has(.mel-polen-cor[data-i="1"]:hover) .mel-polen-troca img[data-i="1"]{ left:0; width:100%; opacity:1; z-index:2 }
a[data-framer-name="Polen"]:has(.mel-polen-cor[data-i="1"]:hover) .mel-polen-legenda::after{ content:"Branca · Suave como a luz natural." }
a[data-framer-name="Polen"]:has(.mel-polen-cor[data-i="2"]:hover) .mel-polen-veu{ background:#EF6C29 }
.mel-polen-cor[data-i="2"]{ --mel-cor:#EF6C29 }
.mel-polen-troca img[data-i="2"]{ left:28.5714%; width:14.2857% }
a[data-framer-name="Polen"]:has(.mel-polen-cor[data-i="2"]:hover) .mel-polen-troca img[data-i="2"]{ left:0; width:100%; opacity:1; z-index:2 }
a[data-framer-name="Polen"]:has(.mel-polen-cor[data-i="2"]:hover) .mel-polen-legenda::after{ content:"Laranja · Vibrante como o pôr do sol." }
a[data-framer-name="Polen"]:has(.mel-polen-cor[data-i="3"]:hover) .mel-polen-veu{ background:#5F2D0B }
.mel-polen-cor[data-i="3"]{ --mel-cor:#5F2D0B }
.mel-polen-troca img[data-i="3"]{ left:42.8571%; width:14.2857% }
a[data-framer-name="Polen"]:has(.mel-polen-cor[data-i="3"]:hover) .mel-polen-troca img[data-i="3"]{ left:0; width:100%; opacity:1; z-index:2 }
a[data-framer-name="Polen"]:has(.mel-polen-cor[data-i="3"]:hover) .mel-polen-legenda::after{ content:"Marrom · Nostalgia em cada clique." }
a[data-framer-name="Polen"]:has(.mel-polen-cor[data-i="4"]:hover) .mel-polen-veu{ background:#2B2B2B }
.mel-polen-cor[data-i="4"]{ --mel-cor:#2B2B2B }
.mel-polen-troca img[data-i="4"]{ left:57.1429%; width:14.2857% }
a[data-framer-name="Polen"]:has(.mel-polen-cor[data-i="4"]:hover) .mel-polen-troca img[data-i="4"]{ left:0; width:100%; opacity:1; z-index:2 }
a[data-framer-name="Polen"]:has(.mel-polen-cor[data-i="4"]:hover) .mel-polen-legenda::after{ content:"Preta · Clássica por natureza." }
a[data-framer-name="Polen"]:has(.mel-polen-cor[data-i="5"]:hover) .mel-polen-veu{ background:#FBBAB6 }
.mel-polen-cor[data-i="5"]{ --mel-cor:#FBBAB6 }
.mel-polen-troca img[data-i="5"]{ left:71.4286%; width:14.2857% }
a[data-framer-name="Polen"]:has(.mel-polen-cor[data-i="5"]:hover) .mel-polen-troca img[data-i="5"]{ left:0; width:100%; opacity:1; z-index:2 }
a[data-framer-name="Polen"]:has(.mel-polen-cor[data-i="5"]:hover) .mel-polen-legenda::after{ content:"Rosa · Leve como o momento." }
a[data-framer-name="Polen"]:has(.mel-polen-cor[data-i="6"]:hover) .mel-polen-veu{ background:#303F1C }
.mel-polen-cor[data-i="6"]{ --mel-cor:#303F1C }
.mel-polen-troca img[data-i="6"]{ left:85.7143%; width:14.2857% }
a[data-framer-name="Polen"]:has(.mel-polen-cor[data-i="6"]:hover) .mel-polen-troca img[data-i="6"]{ left:0; width:100%; opacity:1; z-index:2 }
a[data-framer-name="Polen"]:has(.mel-polen-cor[data-i="6"]:hover) .mel-polen-legenda::after{ content:"Verde · Natural em cada detalhe." }

@media (hover:none){
  /* Sem ponteiro nao ha o que revelar: o leque fica, a legenda nao ocupa
     espaco, e os swatches nao crescem. */
  .mel-polen-legenda{ display:none }
}
@media (prefers-reduced-motion:reduce){
  .mel-polen-troca img,.mel-polen-veu,.mel-polen-cor,.mel-polen-legenda{ transition:none }
  .mel-polen-cor:hover{ transform:none }
}


/* ============ SOBRE NÓS: a faixa em obturador — 14/08/2026 ============
   O card institucional saiu da grade de produtos (ver tools/sobre-faixa.js) e
   virou faixa propria entre "A Melcam por ai" e o fechamento. Aqui esta so o
   desenho dela.

   O EFEITO E O MECANISMO DA PROPRIA MARCA. As duas fotos nao sao enfeite: no
   card do template uma sangrava pelo topo e a outra pela base. Sao as duas
   cortinas de um obturador focal-plane — o mecanismo real de uma camera
   analogica, em que duas cortinas correm e o vao entre elas e a exposicao.
   Fechada, a faixa mostra as cortinas encostadas com o titulo por cima.
   Aberta, elas se afastam e o texto aparece no vao.

   🔴 QUEM ANIMA E A ALTURA DO PALCO, NAO A POSICAO DAS CORTINAS.
   A de cima e ancorada em top:0 e a de baixo em bottom:0, as duas com altura
   fixa. Crescendo o palco, o vao abre sozinho. Animar translateY em cada
   cortina daria o mesmo desenho e exigiria manter tres numeros em sincronia —
   altura do palco, deslocamento de cima, deslocamento de baixo — e qualquer
   um fora do lugar abre fresta ou sobrepoe. Aqui e um numero so.

   As duas linhas em mel nas bordas do vao sao a fresta de luz: elas nao
   existem fechado (altura 0 entre as cortinas) e nascem com a abertura. */

.mel-sobre{
  width:100%; max-width:1440px; margin:0 auto; padding:0 24px 4rem;
  order:0;   /* mesmo patamar das outras secoes do stack; a ordem e a do DOM */
}

/* 🟡 A FAIXA ACOMPANHA A LARGURA DAS VIZINHAS.
   A primeira versao limitou o palco em 1000px para a cortina nao virar uma
   tira. Medido depois, ao lado das outras secoes: comunidade, clipes e
   carrossel tem 1425 e a faixa tinha 1000 — ela aparecia visivelmente menor
   e desalinhada no meio da pagina. A saida nao e estreitar a faixa, e
   ENGORDAR a cortina: em 1425 de largura, 300px de altura dao 4,6:1, perto
   dos 4,2:1 que ja funcionavam. */
/* 🔴 A PROPORCAO DA CORTINA E O QUE DECIDE SE A FOTO FUNCIONA.
   Com o palco em 1377px de largura e cortinas de 180px, cada uma era um
   recorte de 7,6:1 sobre uma foto 2:3 — sobrava uma tira de 11% da altura
   original, e o que aparecia era um pedaco de queixo em cima e ceu azul
   embaixo. Nenhum object-position salva um recorte desses.
   Em 1000px de largura e 240px de cortina a proporcao cai para 4,2:1, e o
   assunto de cada foto (a camera na mao) cabe inteiro. */
.mel-sobre-palco{
  position:relative; overflow:hidden; border-radius:10px;
  height:clamp(400px,42vw,600px);
  background:#221E17;
  transition:height 720ms cubic-bezier(.22,.61,.36,1);
}
.mel-sobre-palco[data-aberto]{ height:clamp(700px,63vw,900px) }

/* AS CORTINAS. Altura fixa: e o palco que cresce entre elas. */
.mel-sobre-cortina{
  position:absolute; left:0; right:0; height:clamp(200px,21vw,300px);
  overflow:hidden;
}
.mel-sobre-cortina img{
  width:100%; height:100%; object-fit:cover; display:block;
  transform:scale(1.06);
  transition:transform 900ms cubic-bezier(.22,.61,.36,1);
}
/* A cortina de cima mostra a parte de BAIXO da foto e a de baixo mostra a de
   CIMA: e o que mantem o assunto de cada uma dentro do recorte, e o que faz as
   duas parecerem duas metades de um mesmo movimento. */
.mel-sobre-cima{ top:0 }
.mel-sobre-cima img{ object-position:50% 46% }
.mel-sobre-baixo{ bottom:0 }
.mel-sobre-baixo img{ object-position:50% 40% }

/* A fresta de luz. Fechada ela e uma linha so, porque as cortinas se tocam. */
.mel-sobre-cima::after,
.mel-sobre-baixo::before{
  content:""; position:absolute; left:0; right:0; height:2px;
  background:linear-gradient(90deg,#F2A90000 0%,#F2A900 22%,#F2A900 78%,#F2A90000 100%);
  opacity:0; transition:opacity 620ms ease;
}
.mel-sobre-cima::after{ bottom:0 }
.mel-sobre-baixo::before{ top:0 }
.mel-sobre-palco[data-aberto] .mel-sobre-cima::after,
.mel-sobre-palco[data-aberto] .mel-sobre-baixo::before{ opacity:1 }

/* A capa: o que se le com a faixa fechada, sobre a emenda das cortinas. */
/* O titulo cai sobre a emenda das cortinas, que e onde a foto e mais clara
   (a camera na mao). Sem o scrim ele disputa com o produto; com ele, a emenda
   ganha peso e o texto se le. */
.mel-sobre-capa::before{
  content:''; position:absolute; inset:-2.6rem -10% -2.2rem;
  background:radial-gradient(ellipse at center,rgba(34,30,23,.86) 0%,rgba(34,30,23,.62) 55%,rgba(34,30,23,0) 100%);
  pointer-events:none; z-index:-1;
}
.mel-sobre-capa{
  position:absolute; left:0; right:0; top:50%; transform:translateY(-50%);
  z-index:2; padding:0 clamp(1.25rem,5vw,3rem); text-align:center;
  transition:opacity 420ms ease, transform 620ms cubic-bezier(.22,.61,.36,1);
}
.mel-sobre-tit{
  margin:0 0 .5rem; color:#FBF7EE;
  font-family:"Iowan Old Style",Georgia,serif; font-weight:700;
  font-size:clamp(1.6rem,3.6vw,2.4rem); line-height:1.1;
  text-shadow:0 2px 20px rgba(34,30,23,.85);
}
.mel-sobre-linha{
  margin:0 auto; max-width:44ch; color:rgba(251,247,238,.9);
  font-family:"Area",sans-serif; font-size:clamp(.85rem,1.6vw,1rem); line-height:1.45;
  text-shadow:0 1px 12px rgba(34,30,23,.9);
}
/* ABERTA, TODO O TEXTO MIGRA PARA O VAO.
   A primeira versao mantinha o titulo dentro da cortina de cima. Medido: ele
   caia exatamente sobre a camera Bee, que e o assunto da foto e a parte mais
   clara dela — titulo e produto disputando o mesmo pixel. Agora capa e miolo
   ficam empilhados no vao, na ordem natural de leitura: titulo, linha, corpo,
   CTA. O deslocamento de ambos parte da altura da cortina, entao os tres
   valores acompanham o clamp sozinhos. */
.mel-sobre-palco[data-aberto] .mel-sobre-capa{
  top:calc(clamp(200px,21vw,300px) + 34px); transform:none;
}
/* No vao o fundo ja e carvao: o scrim da capa nao tem mais o que resolver. */
.mel-sobre-palco[data-aberto] .mel-sobre-capa::before{ opacity:0 }
.mel-sobre-palco[data-aberto] .mel-sobre-miolo{
  top:calc(clamp(200px,21vw,300px) + 154px); transform:none;
}

/* O MIOLO. Fechado ele existe no DOM e nao ocupa nada: quem le por leitor de
   tela pode alcanca-lo, e o botao diz o estado. */
.mel-sobre-miolo{
  position:absolute; left:0; right:0; top:50%; transform:translateY(-50%);
  z-index:2; padding:0 clamp(1.25rem,6vw,4rem); text-align:center;
  opacity:0; pointer-events:none;
  transition:opacity 520ms ease 160ms;
}
.mel-sobre-palco[data-aberto] .mel-sobre-miolo{ opacity:1; pointer-events:auto }
.mel-sobre-corpo{
  margin:0 auto 1.25rem; max-width:56ch; color:#FBF7EE;
  font-family:"Area",sans-serif; font-size:clamp(.9rem,1.7vw,1.05rem); line-height:1.6;
}
.mel-sobre-cta{
  display:inline-block; padding:.62rem 1.25rem; border-radius:999px;
  background:#F2A900; color:#221E17; text-decoration:none;
  font-family:"Area",sans-serif; font-size:.85rem; font-weight:700;
  transition:transform 200ms ease, background 200ms ease;
}
.mel-sobre-cta:hover{ background:#FFC22E; transform:translateY(-1px) }

/* O botao fica na base, sempre visivel: e ele que diz que a faixa abre. */
.mel-sobre-bt{
  position:absolute; left:50%; bottom:clamp(14px,2vw,22px); transform:translateX(-50%);
  z-index:3; display:inline-flex; align-items:center; gap:.4rem;
  min-height:44px; padding:.5rem 1.1rem; border:0; border-radius:999px; cursor:pointer;
  background:rgba(251,247,238,.14); color:#FBF7EE;
  font-family:"Area",sans-serif; font-size:.8rem; font-weight:700;
  letter-spacing:.02em;
  backdrop-filter:blur(6px);
  transition:background 220ms ease, color 220ms ease;
  -webkit-tap-highlight-color:transparent;
}
.mel-sobre-bt:hover{ background:#F2A900; color:#221E17 }
.mel-sobre-bt:focus-visible{ outline:2px solid #F2A900; outline-offset:3px }
.mel-sobre-bt svg{ width:16px; height:16px; transition:transform 520ms cubic-bezier(.22,.61,.36,1) }
.mel-sobre-bt[aria-expanded="true"] svg{ transform:rotate(180deg) }

/* O CARD "SOBRE NOS" CONTINUA NA GRADE — 14/08/2026, revertido.

   🔴 TIREI ELE DAQUI E QUEBREI O MOSAICO. A grade do template nao e uma lista
   de cards iguais: e um mosaico de tres colunas com alturas alternadas
   (481/277 na primeira, 277/481 na segunda, 773 na terceira). O ritmo vem
   justamente dessa alternancia. Com o Sobre Nos fora sobraram quatro cards,
   virou 2x2 simetrico, e o desenho perdeu o movimento — "sem graca", e com
   razao.

   Pior: em 2 colunas o card foi de 432 para 655 de largura e, como a altura
   vem de aspect-ratio, ela subiu junto de 481 para 729. A grade inflou de
   1085 para 1492 e a pagina de 7398 para 8358. Medir so a largura escondeu
   isso, porque o numero que eu olhava melhorava enquanto o layout piorava.

   A grade volta ao que o template entrega. O "Sobre Nos" continua sendo o
   card alto da terceira coluna. */
@media (prefers-reduced-motion:reduce){
  .mel-sobre-palco,.mel-sobre-cortina img,.mel-sobre-capa,.mel-sobre-miolo,
  .mel-sobre-cima::after,.mel-sobre-baixo::before,.mel-sobre-bt svg{ transition:none }
  .mel-sobre-cortina img{ transform:none }
}


/* ============ A COLUNA 3: OS 8 FILTROS — 14/08/2026 ============
   O "Sobre Nos" saiu da grade e virou faixa propria mais abaixo. Tirar o card
   e deixar a coluna vazia quebrava o mosaico do template (tres colunas com
   alturas alternadas 481/277, 481/277, 773): com quatro cards a grade virava
   2x2 simetrico e perdia o movimento.

   Entao a coluna 3 mantem a caixa de 432x773 e passa a carregar o que APOIA a
   proposta da secao. O titulo dela e "A camera que vive com voce": as colunas
   1 e 2 dizem QUAIS sao as cameras, esta diz o que elas FAZEM. E o argumento
   comum as duas linhas.

   O ASSET FAZ O TRABALHO SOZINHO. As oito fotos de melcam/img/filtros/ sao a
   MESMA CENA com os oito filtros aplicados — passar o mouse num nome troca a
   revelacao da mesma imagem, que e exatamente o que um seletor de filtro
   deveria fazer. Nao ha texto explicando o efeito porque o efeito se explica.

   A gramatica e a mesma do leque de cores da Polen, de proposito: as duas
   colunas do meio ensinam que passar o mouse troca a imagem, e a terceira
   colhe isso sem precisar ensinar de novo. */

/* 🔴 O TEXTO PRECISA IR PARA O TOPO, e nao e o eyebrow que decide isso.
   O card do template e flex com o conteudo centrado verticalmente: o bloco de
   texto nascia em 294..478 de um cartao de 773, ou seja bem no meio da cena.
   Medido: a cena comecava em 294 e o titulo em 334 — texto POR CIMA da foto,
   ilegivel. Um eyebrow em position:absolute nao resolvia nada, porque quem
   estava fora do lugar era o bloco inteiro.
   Com justify-content:flex-start o texto sobe: eyebrow 24, titulo 84..168,
   linha 192..228, e a cena comeca em 340 — 112px de respiro. */
body:not(.mel-interna) a[data-framer-name="Sobre Nós"]{
  justify-content:flex-start !important;
  align-content:flex-start !important;
  padding-top:1.5rem !important;
}
.mel-filtros-eyebrow{
  padding:0 1.25rem; margin:0 0 .35rem;
  font-family:"Area",sans-serif; font-size:.72rem; font-weight:700;
  letter-spacing:.16em; text-transform:uppercase; color:#F2A900;
  pointer-events:none;
}

/* A CENA. Ocupa a metade de baixo do cartao; em cima ficam eyebrow, titulo e a
   linha de apoio, que precisam continuar legiveis sobre carvao. */
.mel-filtros-cena{
  position:absolute; left:0; right:0; top:44%; bottom:0; z-index:1;
  overflow:hidden; border-radius:inherit; pointer-events:none;
}
.mel-filtros-cena img{
  position:absolute; inset:0; width:100%; height:100%;
  object-fit:cover; object-position:50% 50%;
  opacity:0; transition:opacity 520ms cubic-bezier(.22,.61,.36,1);
}
/* Em repouso mostra a primeira, que e a Natural: a cena como ela e, antes de
   qualquer filtro. As outras entram por cima no hover. */
.mel-filtros-cena img[data-i="0"]{ opacity:1 }

/* A TIRA DE NOMES, no rodape, sobre o scrim — mesma anatomia da tira da Polen
   e da Bee, para as tres colunas terminarem na mesma linha visual. */
.mel-filtros-tira{
  position:absolute; z-index:3; left:0; right:0; bottom:0;
  padding:2.6rem 1rem 1.1rem;
  pointer-events:none;
  background:linear-gradient(180deg,rgba(34,30,23,0) 0%,rgba(34,30,23,.78) 42%,rgba(34,30,23,.94) 100%);
}
.mel-filtros-lista{
  display:flex; flex-wrap:wrap; gap:.35rem; justify-content:center;
  pointer-events:auto;
}
.mel-filtro-nome{
  display:inline-block; padding:.32rem .6rem; border-radius:999px;
  background:rgba(251,247,238,.10); color:#FBF7EE;
  font-family:"Area",sans-serif; font-size:.72rem; font-weight:600;
  letter-spacing:.02em; white-space:nowrap; cursor:default;
  transition:background 260ms ease, color 260ms ease, transform 260ms ease;
}
.mel-filtro-nome:hover{ transform:translateY(-1px) }

body:not(.mel-interna) a[data-framer-name="Sobre Nós"]:has(.mel-filtro-nome[data-i="0"]:hover) .mel-filtros-cena img[data-i="0"]{ opacity:1 }
body:not(.mel-interna) a[data-framer-name="Sobre Nós"]:has(.mel-filtro-nome[data-i="0"]:hover) .mel-filtro-nome[data-i="0"]{ background:#F2A900; color:#221E17 }
body:not(.mel-interna) a[data-framer-name="Sobre Nós"]:has(.mel-filtro-nome[data-i="1"]:hover) .mel-filtros-cena img[data-i="1"]{ opacity:1 }
body:not(.mel-interna) a[data-framer-name="Sobre Nós"]:has(.mel-filtro-nome[data-i="1"]:hover) .mel-filtro-nome[data-i="1"]{ background:#F2A900; color:#221E17 }
body:not(.mel-interna) a[data-framer-name="Sobre Nós"]:has(.mel-filtro-nome[data-i="2"]:hover) .mel-filtros-cena img[data-i="2"]{ opacity:1 }
body:not(.mel-interna) a[data-framer-name="Sobre Nós"]:has(.mel-filtro-nome[data-i="2"]:hover) .mel-filtro-nome[data-i="2"]{ background:#F2A900; color:#221E17 }
body:not(.mel-interna) a[data-framer-name="Sobre Nós"]:has(.mel-filtro-nome[data-i="3"]:hover) .mel-filtros-cena img[data-i="3"]{ opacity:1 }
body:not(.mel-interna) a[data-framer-name="Sobre Nós"]:has(.mel-filtro-nome[data-i="3"]:hover) .mel-filtro-nome[data-i="3"]{ background:#F2A900; color:#221E17 }
body:not(.mel-interna) a[data-framer-name="Sobre Nós"]:has(.mel-filtro-nome[data-i="4"]:hover) .mel-filtros-cena img[data-i="4"]{ opacity:1 }
body:not(.mel-interna) a[data-framer-name="Sobre Nós"]:has(.mel-filtro-nome[data-i="4"]:hover) .mel-filtro-nome[data-i="4"]{ background:#F2A900; color:#221E17 }
body:not(.mel-interna) a[data-framer-name="Sobre Nós"]:has(.mel-filtro-nome[data-i="5"]:hover) .mel-filtros-cena img[data-i="5"]{ opacity:1 }
body:not(.mel-interna) a[data-framer-name="Sobre Nós"]:has(.mel-filtro-nome[data-i="5"]:hover) .mel-filtro-nome[data-i="5"]{ background:#F2A900; color:#221E17 }
body:not(.mel-interna) a[data-framer-name="Sobre Nós"]:has(.mel-filtro-nome[data-i="6"]:hover) .mel-filtros-cena img[data-i="6"]{ opacity:1 }
body:not(.mel-interna) a[data-framer-name="Sobre Nós"]:has(.mel-filtro-nome[data-i="6"]:hover) .mel-filtro-nome[data-i="6"]{ background:#F2A900; color:#221E17 }
body:not(.mel-interna) a[data-framer-name="Sobre Nós"]:has(.mel-filtro-nome[data-i="7"]:hover) .mel-filtros-cena img[data-i="7"]{ opacity:1 }
body:not(.mel-interna) a[data-framer-name="Sobre Nós"]:has(.mel-filtro-nome[data-i="7"]:hover) .mel-filtro-nome[data-i="7"]{ background:#F2A900; color:#221E17 }

/* As duas fotos institucionais do card antigo saem de cena: quem desenha a
   area agora e a cena dos filtros. Ficam no DOM, como manda a casa. */
body:not(.mel-interna) a[data-framer-name="Sobre Nós"] [data-framer-name="Image"]{
  opacity:0;
}

@media (max-width:809.98px){
  /* No celular o cartao e mais baixo: a cena comeca mais cedo e os nomes
     ganham a largura toda. */
  .mel-filtros-cena{ top:44% }
  .mel-filtros-tira{ padding:2.2rem .75rem 1rem }
  .mel-filtro-nome{ font-size:.68rem; padding:.28rem .5rem }
}
@media (prefers-reduced-motion:reduce){
  .mel-filtros-cena img,.mel-filtro-nome{ transition:none }
  .mel-filtro-nome:hover{ transform:none }
}


/* ============ OS CARDS PEQUENOS: TEXTO LIMPO, FOTO EMBAIXO — 14/08/2026 ==
   O scrim que eu tinha posto atras do rotulo saiu. Ele existia para o texto
   se ler sobre a foto, e resolvia isso — mas o preco era uma mancha escura
   borrada por cima da imagem, mais visivel ainda no card de Acessorios, cuja
   foto e clara. Trocar borrao por composicao: o texto sobe para uma faixa de
   carvao limpo e a foto ocupa o resto, sangrando ate as bordas.

   Medido no card de 432x277:
     Polen ....... texto ate 64,  foto de 94 a 277 (183px), respiro 30
     Acessorios .. texto ate 142, foto de 177 a 277 (100px), respiro 35
   O de Acessorios sobra menos porque ele carrega titulo E paragrafo; por isso
   a foto dele comeca em 64% e a do Polen em 34%. */
body:not(.mel-interna) div[data-framer-name="Header Grid"] a[data-framer-name="Polen"]:not(:has(.mel-polen-tira)) [data-framer-component-type="RichTextContainer"]::before,
body:not(.mel-interna) div[data-framer-name="Header Grid"] a[data-framer-name="Sneakers"] [data-framer-component-type="RichTextContainer"]::before{
  content:none;
}
body:not(.mel-interna) div[data-framer-name="Header Grid"] a[data-framer-name="Polen"]:not(:has(.mel-polen-tira)),
body:not(.mel-interna) div[data-framer-name="Header Grid"] a[data-framer-name="Sneakers"]{
  justify-content:flex-start !important;
  align-content:flex-start !important;
  padding-top:1.4rem !important;
}
body:not(.mel-interna) div[data-framer-name="Header Grid"] a[data-framer-name="Polen"]:not(:has(.mel-polen-tira)) [data-framer-name="Image"]{
  inset:34% 0 0 0 !important;
}
/* 🟡 A FOTO DO CARD DE ACESSORIOS TROCOU JUNTO. Era bee-lifestyle-acessorio,
   uma camera no bolso da calca: num recorte de 432x100 sobrava um pedaco de
   jeans e um braco, sem acessorio nenhum a vista. Agora e
   bee-amarela-angulo-corrente, que mostra a camera COM a correntinha — o
   proprio acessorio — e ja e paisagem (1072x620), que e a forma do recorte. */
/* 🔴 TIRAR O aspect-ratio E O QUE FAZ O inset VALER. O container da foto tem
   aspect-ratio 1/1 vindo do template: com ele, a altura sai da largura e o
   "bottom" do inset e ignorado. Medido: a caixa ficava 432x432 dentro de um
   card de 277, entao so os 147px de cima da imagem apareciam — e nenhum
   object-position resolvia, porque nao sobrava altura para deslocar. Com
   aspect-ratio:auto a caixa passa a 432x147, a foto escala por largura e o
   object-position volta a mandar. Mesmo defeito que o Sobre Nos teve, e a
   mesma correcao. */
body:not(.mel-interna) div[data-framer-name="Header Grid"] a[data-framer-name="Sneakers"] [data-framer-name="Image"]{
  aspect-ratio:auto !important;
  height:auto !important;
  inset:47% 0 0 0 !important;
}
/* O ENQUADRAMENTO E 45%, e o numero saiu de olhar a foto recortada nas tres
   alturas possiveis. Em 25% aparece a camera inteira e quase nada da corrente;
   em 65% a corrente fica otima mas a camera perde o topo. Em 45% cabem as
   duas: o logo "MELCAM · Bee" legivel e a corrente descendo pela esquerda —
   que e o acessorio, e o motivo de a foto ter sido trocada. */
body:not(.mel-interna) div[data-framer-name="Header Grid"] a[data-framer-name="Sneakers"] [data-framer-name="Image"] img{
  object-position:50% 45% !important;
}

/* Regua de cores da Polen: 7 pontos, a assinatura da linha. */
a[data-framer-name="Polen"]::after{
  content:""; position:absolute; z-index:3; left:1.25rem; bottom:1.25rem;
  width:7.5rem; height:.75rem; pointer-events:none;
  background:
    radial-gradient(circle .34rem at .375rem 50%, #F2C300 99%, transparent) 0 0/1.07rem 100% no-repeat,
    radial-gradient(circle .34rem at .375rem 50%, ${P.papel} 99%, transparent) 1.07rem 0/1.07rem 100% no-repeat,
    radial-gradient(circle .34rem at .375rem 50%, ${P.coral} 99%, transparent) 2.14rem 0/1.07rem 100% no-repeat,
    radial-gradient(circle .34rem at .375rem 50%, #7A5A44 99%, transparent) 3.21rem 0/1.07rem 100% no-repeat,
    radial-gradient(circle .34rem at .375rem 50%, #1A1714 99%, transparent) 4.28rem 0/1.07rem 100% no-repeat,
    radial-gradient(circle .34rem at .375rem 50%, #E8A0AE 99%, transparent) 5.35rem 0/1.07rem 100% no-repeat,
    radial-gradient(circle .34rem at .375rem 50%, ${P.verdeMar} 99%, transparent) 6.42rem 0/1.07rem 100% no-repeat;
}
a[data-framer-name="Polen"]{ position:relative; }

/* No mobile o selo e a regua encolhem junto, para nao cobrir a foto. */
@media (max-width:809.98px){
  a[data-framer-name="Bee"]::before{ top:.75rem; left:.75rem; font-size:.62rem; padding:.28rem .6rem }
  a[data-framer-name="Polen"]::after{ left:.75rem; bottom:.75rem; width:5.6rem; height:.56rem;
    background-size:.8rem 100%,.8rem 100%,.8rem 100%,.8rem 100%,.8rem 100%,.8rem 100%,.8rem 100%;
    background-position:0 0,.8rem 0,1.6rem 0,2.4rem 0,3.2rem 0,4rem 0,4.8rem 0 }
}

/* --------------------------------------------------------------------
   BLOCO POLEN DA HOME — 13/08/2026

   O argumento da Polen e ESCOLHA: linha madura, 7 cores. O card ja tinha
   moldura em papel e a regua de 7 pontos; faltavam o conceito aprovado, as
   cores em PRODUTO, o preco real e um CTA. tools/bloco-polen.js insere isso
   dentro do <a> que ja existe, sem tocar em classe framer-* nem em DOM.

   ESCOPO: body:not(.mel-interna). As internas tambem tem Header Grid, e a
   decisao de 13/08 foi mante-lo la como navegacao entre as linhas — entao
   nada disso pode vazar para elas.

   Onde ha miniatura de verdade, os 7 pontos em CSS saem: dois indicadores da
   mesma coisa e ruido. A regua continua valendo no card pequeno e nas
   internas, que nao recebem a tira.
   -------------------------------------------------------------------- */
body:not(.mel-interna) a[data-framer-name="Polen"]:has(.mel-polen-tira)::after{ content:none }

/* FORA DO FLUXO, como o selo da Bee. O card tem altura fixa: medido em
   13/08, o eyebrow em fluxo mais o titulo de duas linhas empurravam o
   paragrafo para fora e ele sumia. Em absolute o eyebrow nao custa linha
   nenhuma e o texto volta. Nao e pilula como o da Bee de proposito — la o
   argumento e NOVIDADE e pede etiqueta; aqui e ESCOLHA, e pede rotulo seco. */
.mel-polen-eyebrow{
  position:absolute; z-index:3; top:1.25rem; left:1.25rem; margin:0;
  font-family:"Area",sans-serif; font-size:.72rem; font-weight:700;
  letter-spacing:.16em; text-transform:uppercase; color:${P.mel};
  pointer-events:none;
}

/* ABSOLUTA, no rodape do card, e nao em fluxo.
   O card do template tem ALTURA FIXA e o packshot sangra em position:absolute
   para fora da base. Medido em 13/08: com a tira em fluxo ela dava 0x0 no
   desktop — o card nao cresce, entao o conteudo novo era simplesmente cortado,
   e a altura da pagina nao mudava um pixel. Em absolute ela ocupa o lugar que a
   regua de 7 pontos ja ocupava, sem alterar altura de card, de grade ou de
   pagina. */
.mel-polen-tira{
  position:absolute; z-index:3; left:0; right:0; bottom:0;
  display:flex; flex-direction:column; align-items:center; gap:.55rem;
  padding:2.6rem 1.25rem 1.1rem;
  pointer-events:none;                    /* o clique continua sendo o do <a> */
  /* Scrim funcional, nao enfeite: e ele que garante AA do preco e do CTA sobre
     a foto. Sem ele o texto cai em cima do couro claro da camera. */
  background:linear-gradient(180deg,rgba(34,30,23,0) 0%,rgba(34,30,23,.78) 42%,rgba(34,30,23,.94) 100%);
}

/* As 7 cores. Cada miniatura ja e o packshot sobre o proprio fundo de cor,
   entao mostra produto e cor ao mesmo tempo — mais honesto que um ponto
   abstrato, e e asset oficial, nao amostra inventada. */
.mel-polen-cores{ display:flex; gap:.4rem; }
.mel-polen-cores img{
  width:2.1rem; height:2.1rem; border-radius:3px;   /* raio pequeno, como o card */
  object-fit:cover; display:block; flex:none;
  border:1px solid rgba(251,247,238,.07);
  transition:transform 420ms cubic-bezier(.22,.61,.36,1);
}
/* Hover contido, no mesmo easing do resto do site. So enfeite: nenhuma
   informacao depende dele. */
a[data-framer-name="Polen"]:hover .mel-polen-cores img{ transform:translateY(-2px) }

.mel-polen-linha{
  display:flex; align-items:baseline; justify-content:center;
  gap:.75rem; flex-wrap:wrap;
}
.mel-polen-preco{
  font-family:"Iowan Old Style",Georgia,serif; font-size:1.15rem;
  color:${P.papel};
}
/* CTA e TEXTO, nao <a>: o bloco inteiro ja e o link, e link dentro de link
   e invalido. O sublinhado deixa claro que e acionavel sem depender de cor. */
.mel-polen-cta{
  font-family:"Area",sans-serif; font-size:.82rem; font-weight:700;
  letter-spacing:.06em; color:${P.mel};
  text-decoration:underline; text-underline-offset:.28em;
  text-decoration-thickness:1px;
}

@media (max-width:809.98px){
  .mel-polen-tira{ margin:.85rem .75rem 0; gap:.55rem; padding-top:.75rem }
  .mel-polen-cores{ gap:.3rem }
  .mel-polen-cores img{ width:1.7rem; height:1.7rem }
  .mel-polen-preco{ font-size:1rem }
}

@media (prefers-reduced-motion:reduce){
  .mel-polen-cores img{ transition:none }
  a[data-framer-name="Polen"]:hover .mel-polen-cores img{ transform:none }
}

/* Rede de seguranca: se um dia paginas.gerar() propagar esses nos para as
   internas, eles nao aparecem la. */

/* O PARAGRAFO SAI DESTE CARD — divergencia declarada, nao descuido.
   O card do template tem ALTURA FIXA (437x486 no desktop) e o packshot sangra
   em absolute por cima. Medido em 13/08: com eyebrow + titulo de duas linhas +
   tira, o paragrafo nao cabe — em fluxo ele era cortado, e com o eyebrow fora
   do fluxo ele reaparecia ATRAS da foto, ilegivel. Entregar texto por baixo de
   imagem e pior do que nao entregar.
   O recado de fotografia intencional e sem tela continua na home, no subtitulo
   logo acima da grade: "cameras digitais retro da Melcam. Fotografia
   intencional, filtros vintage embutidos e menos distracao."
   Para trazer o paragrafo de volta seria preciso mexer na altura do card, que
   e estrutura do template — decisao que nao cabia nesta tarefa. */
body:not(.mel-interna) a[data-framer-name="Polen"]:has(.mel-polen-tira) p.framer-text{
  display:none;
}


/* Enquadramento das duas fotos do card Sobre Nos — 13/08/2026.
   Os slots sao QUADRADOS (437x437) e as fotos sao 2:3, entao o cover corta uma
   faixa vertical. Com o padrao 50% 50% a faixa escolhida caia no meio da foto e
   o card, que so revela a parte de baixo do wrapper sangrado, mostrava dedo e
   boca — a camera e o rosto ficavam fora. Subindo a faixa, o assunto entra no
   pedaco visivel. Ancorado no data-framer-name do card: nao alcanca a fileira do
   hero, que usa as MESMAS fotos e cujo object-position e center por spec. */
a[data-framer-name="Sobre Nós"] img{ object-position:50% 18% !important }

body.mel-interna .mel-polen-tira,
body.mel-interna .mel-polen-eyebrow{ display:none !important }

/* --------------------------------------------------------------------
   BLOCOS EDITORIAIS ABAIXO DO HERO

   O template posiciona o packshot em absolute sangrando para fora da base
   do card (.framer-f91ze bottom:-67px, .framer-1c6kfm4 -165px,
   .framer-1np01p -148px), com drop-shadow e z-index:1. O card e so o fundo.

   O que faltava: as fotos com fundo ficavam em object-fit:cover e apareciam
   recortadas dentro do retangulo. Packshot transparente pede contain, para
   a camera aparecer inteira e o sangramento funcionar.

   NOTA: nunca usar crase em comentario aqui — este CSS mora dentro de um
   template literal e a crase fecha a string. Foi o que quebrou o build.
   -------------------------------------------------------------------- */
/* A fileira em si: os 10 nos a 80vh, 2:3, em linha com gap 20px.

   O template declara height:80vh, mas a regra vem prefixada por uma classe de
   escopo de pagina e nem sempre vence. Aqui o tamanho e cravado, com piso em
   px para nao encolher em tela baixa. Sem isso as fotos ficam do tamanho
   intrinseco e parecem miniatura, que foi o defeito relatado. */
/* ATENCAO AO SELETOR: existem DOIS nos com data-framer-name="Header" — o
   <header class="framer-vrbx7h"> que envolve a pagina inteira, e o
   .framer-dtlgl4 que e a fileira. Usar o atributo pegava o de fora e
   vazava para as imagens de outras secoes. Alvo correto e a CLASSE. */

/* 13/08/2026 — a fileira volta a ser fileira.
   Ela tinha virado carrossel de swipe (width:100%, overflow-x:auto,
   scroll-snap) para contornar o "parece miniatura". So que a miniatura nao
   vinha da largura do container: vinha do GRUPO congelado em scale(0.5) pelo
   export sem React. Com o transform de volta (interacoes.js, iniciarFileira)
   a causa some, e o remendo passou a ser a divergencia — a medicao do build
   antigo mostrava grupo de 1392px e overflow "auto hidden" contra os 4980px e
   "hidden" do template. Aqui a geometria medida volta.

   max-content, e nao o min-content do template: o numero e o mesmo (4980 =
   10x480 + 9x20, porque os filhos tem altura fixa e aspect-ratio, entao a
   largura e derivada), mas min-content colapsa para o tamanho intrinseco da
   foto se a regra de altura abaixo por qualquer motivo nao vencer. Era esse
   colapso o "parece miniatura" original. max-content nao tem esse modo de
   falha e mede igual. */
.framer-dtlgl4{
  width:max-content !important;
  max-width:none !important;
  height:min-content !important;
  gap:20px !important;
  overflow:hidden !important;
}

/* O template declara height:80vh, mas prefixado por uma classe de escopo de
   pagina, e nem sempre vence. Aqui e cravado. O piso em px evita a fileira
   virar tira fina em janela baixa. */
.framer-dtlgl4 > div{
  height:80vh !important;
  min-height:560px !important;
  aspect-ratio:.666667 !important;
  width:auto !important;
  flex:0 0 auto !important;
  border-radius:4px; overflow:hidden;
}
/* As fotos precisam PREENCHER o frame — cover, nao contain, senao sobra fundo. */
.framer-dtlgl4 img{
  width:100% !important; height:100% !important;
  object-fit:cover !important; object-position:50% 50%;
}
/* Abaixo de 810px o template troca 80vh por 50vh — e so isso que muda entre
   breakpoints nesta secao. Medido: 341x512 no tablet, 281x422 no mobile.
   Estava 78svh, herdado da fase de carrossel, quando fazia sentido a foto
   ocupar a tela toda porque so uma aparecia. */
@media (max-width:809.98px){
  .framer-dtlgl4 > div{ height:50vh !important; min-height:340px !important }

  /* 13/08/2026 — a fileira comeca na foto 1 no celular.
     O pai (section.framer-1da55c7) e flex-column com align-items:center, e era
     ele que centralizava o grupo de 2993px numa janela de 390: a fileira abria
     em left -1301, no MEIO dela, com a foto da esquerda cortada ao meio e as
     fotos 1 a 4 inalcancaveis. align-self solta so o grupo — o titulo e o
     resto da coluna continuam centralizados.

     transform-origin na borda esquerda e o par obrigatorio: com origem no
     centro (o padrao), o scale(0.5) da entrada puxaria a borda esquerda 748px
     para dentro e a foto 1 sairia de vista justamente no comeco da animacao.
     Com origem na esquerda, a foto 1 fica ancorada e a fileira cresce para a
     direita. Quem desfila e o translateX, em interacoes.js (iniciarFileira).

     Acima de 810px nada disso vale: a geometria medida do template continua. */
  .framer-dtlgl4{
    align-self:flex-start !important;
    transform-origin:0 50% !important;
  }
}

/* O reveal por IntersectionObserver que animava os 10 filhos um a um saiu:
   MOTION_SPEC secao 3 mede "sem movimento individual" na fileira. Quem se
   move e o grupo, ligado ao scroll, em interacoes.js. As regras de
   [data-mel-reveal] saem junto — nada mais recebe o atributo. */

/* Hover: zoom contido na foto, dentro da mascara do container — o frame nao
   muda de tamanho, entao nao ha layout shift. */
.framer-dtlgl4 img{ transition:transform 520ms cubic-bezier(.22,.61,.36,1) }
.framer-dtlgl4 > div:hover img{ transform:scale(1.05) }

@media (prefers-reduced-motion:reduce){
  /* estado final, mantendo escala e impacto — nao some com nada.
     O grupo tambem: interacoes.js escreve escala 1 / y 0 / opacidade 1 direto,
     sem passar pelo caminho do meio. */
  .framer-dtlgl4 img{ transition:none }
  .framer-dtlgl4 > div:hover img{ transform:none }
}

/* Placeholder honesto: onde a arte ainda nao existe, o site diz isso. */
img[src$="a-decidir.svg"]{ background:${P.carvao}; object-fit:contain }

/* Pastilhas dos metodos de pagamento, no rodape — auditoria de 13/08/2026.
   Seis retangulos em branco puro, escritos no atributo style do proprio no
   pelo export. Eram a coisa mais clara da pagina inteira e destoavam do papel
   em todas as rotas. Papel mantem o fundo claro que as marcas de cartao
   precisam e para de brigar com o resto.
   O !important e necessario: estilo inline so perde para ele. Nao alcanca as
   marcas dentro das pastilhas — logo de terceiro nao se recolore. */
[data-framer-name="Payment methods"] > div[data-border]{
  background-color:${P.papel} !important;
}

/* O LOGO PINTA EM currentColor desde 13/08/2026 (ver tools/logo.js), então
   quem decide a cor é esta regra. Sem ela o logo herdaria o color do <a>, que
   é o azul de link padrão do navegador: os cinco <use> da página ficariam
   azuis. Papel é o padrão porque o fundo padrão do logo é carvão — na navbar e
   no rodapé. A /bee sobrescreve só a instância da navbar. */
[data-framer-name="MELCAM"]{ color:${P.papel} }

/* Acessibilidade: foco visivel que o template nao trazia. */
a:focus-visible,button:focus-visible,[tabindex]:focus-visible{
  outline:2px solid ${P.mel}; outline-offset:3px; border-radius:2px;
}

/* --------------------------------------------------------------------
   CAMPO DE NEWSLETTER DO TEMPLATE — auditoria de paleta, 13/08/2026

   O campo "Seu e-mail" que fecha a home e um componente de formulario do
   Framer. Fundo, borda e placeholder dele saem de token e ja entraram na
   paleta junto com o resto. Sobravam tres coisas medidas no navegador:

   1. cor do texto digitado e do icone em rgb(153,153,153) — cinza frio, e
      escrito no atributo style do wrapper. Sobrescrever a custom property
      perderia para o inline; o que vence e pintar a propriedade consumida
      (.framer-form-input{color:var(--framer-input-font-color)}), com a
      mesma especificidade e depois na ordem.
   2. borda de foco em #09f, o azul padrao do Framer. Ela pinta de verdade,
      pelo ::after de .framer-form-text-input:focus-within.
   3. .framer-form-input:focus-visible{outline:none} no proprio template.
      Nossa regra de foco acima nao alcanca <input>, entao o campo ficava
      sem indicador nenhum para quem navega no teclado.
   -------------------------------------------------------------------- */
.framer-form-input{ color:${P.papel}; caret-color:${P.papel} }
.framer-form-text-input:focus-within::after{ border-color:${P.mel} }
.framer-form-text-input.framer-form-text-input{
  --framer-input-focused-border-color:${P.mel};
}
.framer-form-input:focus-visible,
input:focus-visible,textarea:focus-visible,select:focus-visible{
  outline:2px solid ${P.mel}; outline-offset:2px;
}

/* A Colmeia fecha a home.

   Pedido de 12/08/2026: a secao "Entre para a Colmeia" (data-framer-name
   "Speed On") sai do meio da pagina e vira a ultima, antes do rodape.

   Feito com "order" e nao recortando DOM. Recortar DOM neste arquivo ja
   custou caro antes; ver a REGRA APRENDIDA no progresso.md.

   O detalhe que complica: o rodape NAO e irmao da Colmeia. Ele mora dentro do
   .framer-8hdwjm-container, junto com comunidade, clipes e seguranca. Um
   order:1 solto na Colmeia jogava ela para depois do rodape, o que e pior do
   que estava.

   Por isso o wrapper vira display:contents. Ele e um bloco vazio de estilo
   (sem padding, margem, fundo, transform, radius ou overflow — conferido no
   navegador), entao apagar a caixa dele nao muda nada visualmente, e os
   filhos sobem para o mesmo nivel de flex da Colmeia. Ai da para ordenar os
   tres grupos:

     conteudo (order 0) -> Colmeia (order 1) -> rodape (order 2)  */
.framer-8hdwjm-container{ display:contents }
.framer-bx6rvt-container{ order:1 }
.framer-8hdwjm-container > footer{ order:2 }

/* Respeita quem pediu menos movimento.

   NAO usar display:none em video aqui. Foi o que apagou o hero: com "reduzir
   movimento" ligado no sistema, a regra escondia o <video> do template e
   sobrava o fundo, preto. Video pausado ja mostra o proprio poster — o
   interacoes.js chama pause(), e a imagem fica. Esconder e desnecessario e
   destrutivo. */
@media (prefers-reduced-motion:reduce){
  *,*::before,*::after{
    animation-duration:.01ms!important; animation-iteration-count:1!important;
    transition-duration:.01ms!important; scroll-behavior:auto!important;
  }
}
`;
  fs.writeFileSync(path.join(SITE, 'melcam', 'identidade.css'), css, 'utf8');
  return Object.keys(MAPA_TOKEN).length;
}

// ---------------------------------------------------------------- injecao
function blocoHead() {
  return `<link rel="stylesheet" href="/melcam/identidade.css">`
    + `<link rel="icon" href="/melcam/logo/symbol-preto.svg" type="image/svg+xml">`;
}

module.exports = { gerarFontes, gerarIdentidade, blocoHead };

if (require.main === module) {
  console.log('@font-face gerados:', gerarFontes());
  console.log('tokens sobrescritos:', gerarIdentidade());
}
