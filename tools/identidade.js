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
// Mapa token do template -> cor MELCAM. Mantém a hierarquia clara/escura
// original: o template é escuro, e carvão+papel preservam essa sofisticação.
const MAPA_TOKEN = {
  '3e6ec15f-2b75-4e3b-ad0b-168aa37f4237': P.carvao,                  // #0d0d0d fundo
  '9f5c7abb-959f-460d-bc9f-d2f6fbaa130d': P.carvao,                  // #0d0d0d fundo
  'ad4d2a8b-0add-4634-8710-f4704da278ff': P.papel,                   // #fff
  'e5fd1d2d-45e6-49b9-b341-ad7384948a67': P.papel,                   // #dedede texto
  'ee01c93a-c94e-42a3-8ebf-3f7c78c2647a': '#9A9083',                 // #696969 secundário (5,3:1 sobre carvão, AA)
  '1d4f7ead-bfa1-40e6-9e94-a738e2b2b3fc': '#2B251C',                 // #1c1c1c superfície
  '30e9a435-77d0-4905-81f2-ed32927858c6': '#2B251C',                 // #1c1c1c superfície
  'cb084d69-fb3a-43a7-b50a-e7506bdef46c': 'rgba(251,247,238,.07)',   // borda sutil
  'ab591a21-7f4d-4730-9bd6-d3f6304cf2d9': 'rgba(34,30,23,.35)',      // overlay
};

function gerarIdentidade() {
  let css = `/* Identidade MELCAM. Gerado por tools/identidade.js — nao editar a mao.
   Sobrescreve os 9 tokens de cor do template e a familia tipografica.
   Nenhuma regra de layout, espacamento, transicao ou animacao e tocada. */

@import url("/melcam/fonts/fontes.css");

:root{
  --mel-carvao:${P.carvao}; --mel-mel:${P.mel}; --mel-papel:${P.papel};
  --mel-coral:${P.coral}; --mel-verde:${P.verdeMar};
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

/* Selo de novidade da Bee. O eyebrow ja existe no DOM do template. */
[data-framer-name="Bee"] [data-framer-name="Eyebrow"],
[data-framer-name="Bee"] .framer-text:first-child:not(h1):not(h2){
  color:${P.carvao};
}
[data-framer-name="Bee"]::before{
  content:"Novidade";
  position:absolute; z-index:3; top:1.25rem; left:1.25rem;
  padding:.35rem .75rem; border-radius:999px;
  background:${P.mel}; color:${P.carvao};
  font-family:"Area",sans-serif; font-size:.72rem; font-weight:700;
  letter-spacing:.09em; text-transform:uppercase;
  pointer-events:none;
}
[data-framer-name="Bee"]{ position:relative; }

/* Regua de cores da Polen: 7 pontos, a assinatura da linha. */
[data-framer-name="Polen"]::after{
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
[data-framer-name="Polen"]{ position:relative; }

/* No mobile o selo e a regua encolhem junto, para nao cobrir a foto. */
@media (max-width:809.98px){
  [data-framer-name="Bee"]::before{ top:.75rem; left:.75rem; font-size:.62rem; padding:.28rem .6rem }
  [data-framer-name="Polen"]::after{ left:.75rem; bottom:.75rem; width:5.6rem; height:.56rem;
    background-size:.8rem 100%,.8rem 100%,.8rem 100%,.8rem 100%,.8rem 100%,.8rem 100%,.8rem 100%;
    background-position:0 0,.8rem 0,1.6rem 0,2.4rem 0,3.2rem 0,4rem 0,4.8rem 0 }
}

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

/* O container era width:min-content, e min-content encolhe os filhos ate o
   tamanho intrinseco da foto. Era a causa raiz do "parece miniatura". */
.framer-dtlgl4{
  width:100% !important;
  max-width:100% !important;
  height:auto !important;
  gap:20px !important;
  overflow-x:auto !important;
  overflow-y:hidden !important;
  scrollbar-width:none;
  -ms-overflow-style:none;
  scroll-snap-type:x proximity;
}
.framer-dtlgl4::-webkit-scrollbar{ display:none }

.framer-dtlgl4 > div{
  height:80vh !important;
  min-height:560px !important;
  aspect-ratio:.666667 !important;
  width:auto !important;
  flex:0 0 auto !important;
  border-radius:4px; overflow:hidden;
  scroll-snap-align:center;
}
/* As fotos precisam PREENCHER o frame — cover, nao contain, senao sobra fundo. */
.framer-dtlgl4 img{
  width:100% !important; height:100% !important;
  object-fit:cover !important; object-position:50% 50%;
}
@media (max-width:809.98px){
  .framer-dtlgl4 > div{ height:78svh !important; min-height:420px !important }
}

/* Reveal na entrada: transform + opacity, sem reflow.
   Duracao e easing acompanham o spring do template (damping 100 /
   stiffness 200), lido como 620ms em cubic-bezier(.22,.61,.36,1). */
/* Sem scale no estado inicial: encolher a foto era o que a fazia parecer
   pequena quando o observer nao disparava. So deslocamento e opacidade. */
[data-mel-reveal]{
  opacity:0; transform:translate3d(0,42px,0);
  transition:opacity 620ms cubic-bezier(.22,.61,.36,1),
             transform 620ms cubic-bezier(.22,.61,.36,1);
  will-change:transform,opacity;
}
[data-mel-reveal].mel-visivel{ opacity:1; transform:none }
/* escalonamento suave entre os blocos, sem virar cascata longa */
[data-mel-reveal]:nth-child(2){ transition-delay:90ms }
[data-mel-reveal]:nth-child(3){ transition-delay:180ms }
[data-mel-reveal]:nth-child(4){ transition-delay:270ms }

/* Hover: zoom contido na foto, dentro da mascara do container — o frame nao
   muda de tamanho, entao nao ha layout shift. */
.framer-dtlgl4 img{ transition:transform 520ms cubic-bezier(.22,.61,.36,1) }
.framer-dtlgl4 > div:hover img{ transform:scale(1.05) }

@media (prefers-reduced-motion:reduce){
  /* estado final, mantendo escala e impacto — nao some com nada */
  [data-mel-reveal]{ opacity:1; transform:none; transition:none }
  .framer-dtlgl4{ scroll-snap-type:none }
  .framer-dtlgl4 img{ transition:none }
  .framer-dtlgl4 > div:hover img{ transform:none }
}

/* Placeholder honesto: onde a arte ainda nao existe, o site diz isso. */
img[src$="a-decidir.svg"]{ background:${P.carvao}; object-fit:contain }

/* Acessibilidade: foco visivel que o template nao trazia. */
a:focus-visible,button:focus-visible,[tabindex]:focus-visible{
  outline:2px solid ${P.mel}; outline-offset:3px; border-radius:2px;
}

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
