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
