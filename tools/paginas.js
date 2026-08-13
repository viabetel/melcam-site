// Gera as páginas MELCAM a partir do index.html já transformado.
//
// Cada página herda nav, rodapé, os 165 KB de CSS inline, o animator e os 3
// breakpoints. As seções que são só da home saem por CSS, via classe no <body>
// — nunca por recorte de DOM (ver REGRA APRENDIDA no progresso.md).
const fs = require('fs');
const path = require('path');
const SITE = path.resolve(__dirname, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(SITE, 'melcam.config.json'), 'utf8'));
const P = cfg.paleta;

// blocos que existem só na home
const SO_HOME = [
  '[data-framer-name="The first section"]',
  // 13/08/2026 — o hero. Faltava aqui, e por isso as 6 internas abriam com a
  // manchete "Chegou a Bee" e a fileira de 10 fotos por cima da abertura
  // propria de cada uma (a Polen tem "Memoria cheia", a Bee tem a dela).
  // Numa pagina de produto Polen, o titulo era o da Bee. So ficou visivel
  // quando a fileira voltou ao tamanho real; antes, encolhida a 50%, passava
  // por faixa decorativa.
  '[data-framer-name="Header Section"]',
  // 13/08/2026 — irmão do anterior, não filho: a regra acima não o alcançava.
  // Carrega "A câmera que vive com você." e o subtítulo, que são manchete da
  // home e ficavam por cima da abertura de cada interna.
  '[data-framer-name="Header Info"]',
  // 13/08/2026, segunda passada — PEDIDO NOVO, reverte a decisão anterior.
  // Estes dois eram o que sobrava da home acima da abertura de cada interna,
  // 1.705px medidos antes da barra da Polen:
  //
  //   Header Grid  (982px) — os blocos Polen · Bee · Acessórios · Sobre Nós.
  //     Tinham sido mantidos como "navegação entre as linhas". Só que na
  //     /polen o bloco Polen repete, palavra por palavra, o que a página já
  //     diz logo abaixo: o título "7 cores. Uma decisão." é o mesmo da seção
  //     de produto e o parágrafo é o mesmo do hero.
  //   Header Grids (723px) — a faixa "DESTAQUES" com os cards e o ticker.
  //     É vitrine de home; numa página de produto compete com o produto.
  //
  // A navegação entre as linhas continua existindo: está na navbar e no
  // rodapé, os dois presentes em todas as páginas.
  '[data-framer-name="Header Grid"]',
  '[data-framer-name="Header Grids"]',
  // 13/08/2026 — os dois últimos restos da home no topo das internas.
  // Só apareceram quando o hero da Polen subiu para y≈69: antes ficavam
  // escondidos ATRÁS do Header Grid, que ocupava os primeiros 982px.
  //
  //   Shadow — faixa de 1440x900 com um gradiente até #0d0d0d e z-index 1.
  //     Não é filha de "The first section", é elemento de topo, por isso
  //     nenhuma regra anterior a alcançava. Como tem z maior que o hero, ela
  //     lavava o título, o parágrafo e o CTA — o mel do botão chegava a
  //     renderizar como oliva.
  //   o vídeo do hero da home — num container "position:fixed" de 1440x900,
  //     que estava BAIXANDO E TOCANDO os 5 MB em toda página interna, atrás
  //     do conteúdo. Medido: paused=false na /polen.
  //
  // O container do vídeo não tem data-framer-name, só classe hasheada, que
  // muda a cada export. Ancorar em :has(> video[data-mel]) é estável e não
  // depende do hash. O ":has" já é usado neste projeto (regra do bloco Polen).
  '[data-framer-name="Shadow"]',
  ':has(> video[data-mel="hero-video"])',
  '[data-framer-name="Speed On"]',
  '.mel-carrossel', '.mel-comunidade', '.mel-clipes', '.mel-seguranca',
];

// Índice do </header> que fecha o <header class="...framer-vrbx7h...">, que é o
// stack da página. É o único ponto de inserção seguro: fora de toda ssr-variant.
function fimDoStack(html) {
  const abertura = /<header[^>]*class="[^"]*framer-vrbx7h[^"]*"[^>]*>/.exec(html);
  if (!abertura) return -1;
  const re = /<(\/?)header\b[^>]*>/g;
  re.lastIndex = abertura.index;
  let prof = 0, t;
  while ((t = re.exec(html))) {
    prof += t[1] ? -1 : 1;
    if (prof === 0) return t.index;
  }
  return -1;
}

function gerar(arquivo, classe, titulo, descricao, conteudo) {
  const base = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8');
  let s = base;

  s = s.replace(/<title>[\s\S]*?<\/title>/i, `<title>${titulo}</title>`);
  s = s.replace(/(<meta\s+name="description"\s+content=")[^"]*(")/i, `$1${descricao}$2`);
  s = s.replace(/(<meta\s+property="og:title"\s+content=")[^"]*(")/i, `$1${titulo}$2`);
  s = s.replace(/(<meta\s+name="twitter:title"\s+content=")[^"]*(")/i, `$1${titulo}$2`);
  s = s.replace(/(<meta\s+(?:property="og:description"|name="twitter:description")\s+content=")[^"]*(")/gi, `$1${descricao}$2`);

  // marca a página; o CSS usa isso para esconder o que é da home
  s = s.replace(/<body([^>]*)>/i, (m, at) => {
    const cls = (at.match(/class="([^"]*)"/) || [])[1] || '';
    const novo = (cls + ' ' + classe).trim();
    return `<body${at.replace(/class="[^"]*"/, '')} class="${novo}">`;
  });

  // Um <h1> por página. Os <h1> que vieram do template pertencem a blocos da
  // home que ficam escondidos por CSS — mas escondido por CSS ainda conta no
  // outline do documento e para o leitor de tela. Viram <h2>.
  // A troca é só de nome de tag: nada abre ou fecha a mais, o DOM segue
  // balanceado. Feita ANTES de inserir o conteúdo, então o <h1> da página nova
  // não é afetado.
  s = s.replace(/<h1(\s[^>]*)?>/g, (m, at) => `<h2${at || ''}>`).replace(/<\/h1>/g, '</h2>');

  // Só insere — nunca recorta. Mas o ONDE importa.
  //
  // ⚠️ NUNCA voltar a usar s.replace(/(<footer)/). O template tem TRÊS
  // <footer>, e o primeiro mora dentro de
  // <div class="ssr-variant hidden-1g8fb3q hidden-wq5psc">, que é
  // display:none fora do desktop. Inserir ali deixava as seis internas com
  // nav e rodapé e mais nada no tablet e no mobile — medido em 13/08/2026,
  // altura idêntica de 3995px nas seis. É o mesmo erro que o
  // tools/comunidade.js cometeu na home e que o mover-secoes.js corrigiu.
  //
  // O lugar certo é como filho direto do stack (o <header class="framer-vrbx7h">,
  // flex column), depois de todas as variantes. As páginas já geradas foram
  // realocadas por tools/mover-conteudo-interno.js.
  const corte = fimDoStack(s);
  if (corte < 0) throw new Error(`${arquivo}: stack framer-vrbx7h não encontrado — inserção abortada`);
  s = s.slice(0, corte) + conteudo + s.slice(corte);

  fs.writeFileSync(path.join(SITE, arquivo), s, 'utf8');
  return arquivo;
}

function css() {
  const esconder = SO_HOME.map(sel => `body.mel-interna ${sel}`).join(',\n');
  return `
/* ============ Páginas internas MELCAM ============
   O que é só da home some nas internas. Nada é removido do DOM. */
${esconder}{ display:none !important }

/* A barra de produto fixa (referência apple.com/ipad-air) saiu do projeto em
   13/08/2026. A /polen perdeu a dela mais cedo no mesmo dia; a /bee, a pedido,
   à tarde — e com a /bee foi embora o último uso destas regras. O motivo e a
   medição do defeito de sobreposição no mobile estão em tools/bee.js.
   Não recriar sem pedido: a navbar já faz o trabalho. */

.mel-bt{
  display:inline-block; border:0; cursor:pointer; text-decoration:none;
  border-radius:999px; padding:.62rem 1.25rem;
  font-family:"Area",sans-serif; font-size:.85rem; font-weight:600;
  letter-spacing:.02em; transition:transform 200ms ease, background 200ms ease, color 200ms ease;
}
.mel-bt:hover{ transform:translateY(-1px) }
.mel-bt-mel{ background:${P.mel}; color:${P.carvao} }
.mel-bt-mel:hover{ background:#FFC22E }
.mel-bt-linha{ background:transparent; color:${P.papel}; box-shadow:inset 0 0 0 1px rgba(251,247,238,.28) }
.mel-bt-linha:hover{ background:${P.mel}; color:${P.carvao}; box-shadow:none }

/* ---- abertura ---- */
.mel-abertura{ text-align:center; position:relative }
.mel-ab-alerta{
  max-width:520px; margin:0 auto clamp(28px,4vw,52px);
  padding:1.4rem 1.6rem; border-radius:14px;
  /* Sombra em carvao escurecido, nao em preto puro: a pagina e quente e o
     preto cru joga um halo frio na borda do card. Mesma densidade. */
  background:#2B251C; box-shadow:0 24px 60px rgba(14,12,9,.42);
  text-align:left;
}
.mel-ab-badge{
  display:inline-block; margin-bottom:.6rem; padding:.2rem .6rem; border-radius:6px;
  background:${P.coral}; color:${P.papel};
  font-family:"Area",sans-serif; font-size:.68rem; font-weight:700;
  letter-spacing:.1em; text-transform:uppercase;
}
.mel-ab-l1{ margin:0; color:${P.papel}; font-family:"Area",sans-serif; font-size:1rem }
.mel-ab-l2{ margin:.3rem 0 0; color:#9A9083; font-family:"Area",sans-serif; font-size:1rem }
.mel-ab-tit{ max-width:16ch; margin:0 auto }
.mel-ab-cta{ margin-top:clamp(22px,3vw,34px) }
.mel-ab-camera{ margin:clamp(30px,5vw,64px) auto 0; max-width:640px }
.mel-ab-camera img{ width:100%; height:auto; display:block }

/* ---- cores ---- */
.mel-preco-linha{ margin:1rem 0 0; font-family:"Area",sans-serif; color:#9A9083; font-size:.95rem }
.mel-preco-linha strong{ color:${P.papel}; font-size:1.25rem; margin-right:.5rem }
.mel-cores{
  list-style:none; margin:0; padding:0; display:grid; gap:clamp(16px,2.2vw,28px);
  grid-template-columns:repeat(4,1fr);
}
.mel-cor{
  background:#2B251C; border-radius:8px; padding:1.1rem;
  display:flex; flex-direction:column; gap:.35rem;
  transition:transform 420ms cubic-bezier(.22,.61,.36,1);
}
.mel-cor:hover{ transform:translateY(-4px) }
.mel-cor-img{ aspect-ratio:1; border-radius:6px; overflow:hidden; background:${P.carvao} }
.mel-cor-img img{ width:100%; height:100%; object-fit:contain; display:block }
.mel-cor-nome{ margin:.6rem 0 0; color:${P.papel}; font-family:"Iowan Old Style",Georgia,serif; font-size:1.15rem }
.mel-cor-sub{ margin:0 0 .8rem; color:#9A9083; font-family:"Area",sans-serif; font-size:.82rem }
.mel-cor .mel-bt{ margin-top:auto; text-align:center }

/* ---- benefícios ---- */
.mel-benef{ border-top:1px solid rgba(251,247,238,.07); border-bottom:1px solid rgba(251,247,238,.07) }
.mel-benef-lista{
  list-style:none; margin:0 auto; padding:clamp(24px,3vw,40px) 24px; max-width:1440px;
  display:flex; flex-wrap:wrap; gap:.7rem 1.6rem; justify-content:center;
}
.mel-benef-lista li{
  color:${P.papel}; font-family:"Area",sans-serif; font-size:.88rem;
  padding-left:1.2rem; position:relative;
}
.mel-benef-lista li::before{
  content:""; position:absolute; left:0; top:.52em;
  width:6px; height:6px; border-radius:50%; background:${P.mel};
}

/* ---- galeria ---- */
.mel-galeria{
  list-style:none; margin:0; padding:0; display:grid; gap:12px;
  grid-template-columns:repeat(4,1fr);
}
.mel-gal-item{ border-radius:4px; overflow:hidden; background:#2B251C }
.mel-gal-item img{
  width:100%; aspect-ratio:3/4; object-fit:cover; display:block;
  transition:transform 520ms cubic-bezier(.22,.61,.36,1);
}
.mel-gal-item:hover img{ transform:scale(1.04) }

/* ---- filtros ---- */
.mel-filtro-palco{
  border-radius:8px; overflow:hidden; background:#2B251C; aspect-ratio:4/3;
  max-width:900px; margin:0 auto;
}
.mel-filtro-palco img{
  width:100%; height:100%; object-fit:cover; display:block;
  transition:opacity 380ms ease;
}
.mel-filtro-palco img.mel-trocando{ opacity:0 }
.mel-pills{
  display:flex; flex-wrap:wrap; gap:.5rem; justify-content:center;
  margin:clamp(18px,2.4vw,28px) 0 0;
}
.mel-pill{
  border:0; cursor:pointer; border-radius:999px; padding:.48rem 1rem;
  background:transparent; color:#9A9083;
  box-shadow:inset 0 0 0 1px rgba(251,247,238,.2);
  font-family:"Area",sans-serif; font-size:.82rem;
  transition:background 200ms ease, color 200ms ease, box-shadow 200ms ease;
}
.mel-pill:hover{ color:${P.papel} }
.mel-pill[aria-selected="true"]{ background:${P.mel}; color:${P.carvao}; box-shadow:none }

/* ---- specs ---- */
.mel-specs{
  list-style:none; margin:0; padding:0; display:grid; gap:.9rem 2rem;
  grid-template-columns:repeat(3,1fr);
}
.mel-specs li{
  color:${P.papel}; font-family:"Area",sans-serif; font-size:.92rem;
  padding:.9rem 0 .9rem 1.3rem; position:relative;
  border-top:1px solid rgba(251,247,238,.07);
}
.mel-specs li::before{
  content:""; position:absolute; left:0; top:1.35em;
  width:6px; height:6px; border-radius:50%; background:${P.verdeMar};
}

/* ---- colméia ---- */
.mel-colmeia{ text-align:center }
.mel-col-txt{
  max-width:60ch; margin:1rem auto 0; color:#9A9083;
  font-family:"Area",sans-serif; font-size:1rem; line-height:1.65;
}
.mel-perks{
  list-style:none; margin:clamp(20px,3vw,32px) 0; padding:0;
  display:flex; flex-wrap:wrap; gap:.6rem; justify-content:center;
}
.mel-perks li{
  padding:.42rem 1rem; border-radius:999px;
  background:rgba(94,140,123,.16); color:${P.papel};
  box-shadow:inset 0 0 0 1px rgba(94,140,123,.4);
  font-family:"Area",sans-serif; font-size:.82rem;
}

/* ---- FAQ ---- */
.mel-faq{ list-style:none; margin:0; padding:0; max-width:880px }
.mel-faq-item{ border-top:1px solid rgba(251,247,238,.07) }
.mel-faq-item:last-child{ border-bottom:1px solid rgba(251,247,238,.07) }
.mel-faq-q{
  width:100%; border:0; background:none; cursor:pointer;
  display:flex; align-items:center; justify-content:space-between; gap:1rem;
  padding:1.15rem 0; text-align:left; color:${P.papel};
  font-family:"Area",sans-serif; font-size:1rem; font-weight:500;
}
.mel-faq-q svg{ width:22px; height:22px; flex:none; color:${P.mel}; transition:transform 280ms ease }
.mel-faq-q[aria-expanded="true"] svg{ transform:rotate(180deg) }
.mel-faq-r p{
  margin:0; padding:0 0 1.25rem; max-width:70ch;
  color:#9A9083; font-family:"Area",sans-serif; font-size:.94rem; line-height:1.65;
}

/* ---- LP Bee: seleção de modelos ----
   A ABERTURA ANTIGA SAIU EM 13/08/2026, com o hero novo da /bee.
   Eram .mel-bee-l1, .mel-bee-palco, .mel-bee-cam, .mel-bee-branca,
   .mel-bee-amarela e os keyframes mel-bee-gira / mel-bee-revela: a "opção 1"
   do briefing, em que a Bee branca balançava, girava em rotateY e entregava o
   quadro para a amarela, em loop infinito, sobre carvão.
   O pedido novo proíbe por escrito loop infinito e falso giro 3D, e pede uma
   página clara — nada daquilo sobreviveria a retoque, então foi removido em
   vez de escondido. O que veio no lugar está em tools/bee-interacoes.js.
   .mel-cores-2 e .mel-cor-bee FICAM: são da seção de modelos, que continua. */
.mel-cores-2{ grid-template-columns:repeat(2,1fr); max-width:820px; margin-inline:auto }
.mel-cor-bee{ text-align:center }
.mel-cor-bee .mel-cor-nome{ margin:0 0 .8rem; font-size:1.3rem }

/* ---- LP Bee: destaques ---- */
.mel-dest{
  display:grid; grid-template-columns:1fr 1fr; gap:clamp(20px,4vw,56px);
  align-items:center; margin-bottom:clamp(36px,5vw,72px);
}
.mel-dest-inv .mel-dest-img{ order:2 }
.mel-dest-img{ border-radius:8px; overflow:hidden; background:#2B251C }
/* O 4/5 sozinho abria um buraco nas duas colunas: numa coluna de 668px ele dá
   835px de foto ao lado de um texto de 135px, e com align-items:center sobravam
   ~350px de vazio acima e abaixo do texto — duas linhas dessas, mais da metade
   da seção em branco. O teto resolve sem trocar o enquadramento: acima de
   ~1150px de tela a foto para de crescer e a linha encolhe junto; abaixo disso
   o 4/5 ainda cabe e continua valendo. object-fit:cover recorta, então nenhuma
   foto deforma. Em uma coluna o teto sai — ali o texto fica EMBAIXO da foto,
   não ao lado, então não há vazio nenhum e o retrato alto é o que se quer. */
.mel-dest-img img{
  width:100%; aspect-ratio:4/5; max-height:clamp(380px,32vw,460px);
  object-fit:cover; display:block;
}
.mel-dest-txt h3,.mel-dest-specs h3{
  margin:0 0 .8rem; color:${P.papel};
  font-family:"Iowan Old Style",Georgia,serif; font-weight:700;
  font-size:clamp(1.3rem,2.4vw,2rem);
}
.mel-dest-txt p{
  margin:0; max-width:52ch; color:#9A9083;
  font-family:"Area",sans-serif; font-size:1rem; line-height:1.65;
}
.mel-dest-specs{ margin-top:clamp(20px,3vw,32px) }

@media (max-width:809.98px){
  .mel-dest{ grid-template-columns:1fr }
  .mel-dest-inv .mel-dest-img{ order:0 }
  .mel-dest-img img{ max-height:none }   /* uma coluna: sem vazio, retrato cheio */
  .mel-cores-2{ grid-template-columns:1fr }
}

/* ---- CTA final ---- */
.mel-cta-final{ text-align:center }
.mel-cta-final .mel-tit{ max-width:20ch; margin:0 auto }
.mel-cta-final .mel-bt{ margin-top:clamp(22px,3vw,32px) }

/* ---- responsivo, nos breakpoints do template ---- */
@media (max-width:1439.98px){
  .mel-cores{ grid-template-columns:repeat(3,1fr) }
  .mel-galeria{ grid-template-columns:repeat(3,1fr) }
  .mel-specs{ grid-template-columns:repeat(2,1fr) }
}
@media (max-width:809.98px){
  .mel-cores{ grid-template-columns:repeat(2,1fr) }
  .mel-galeria{ grid-template-columns:repeat(2,1fr); gap:8px }
  .mel-specs{ grid-template-columns:1fr }
  .mel-filtro-palco{ aspect-ratio:1 }
}
@media (prefers-reduced-motion:reduce){
  .mel-cor,.mel-gal-item img,.mel-filtro-palco img,.mel-faq-q svg{ transition:none }
  .mel-cor:hover,.mel-gal-item:hover img{ transform:none }
}
${require('./perfil.js').css()}
${require('./polen-interacoes.js').css()}
${require('./bee-interacoes.js').css()}
`;
}

function aplicar() {
  fs.appendFileSync(path.join(SITE, 'melcam', 'identidade.css'), css(), 'utf8');
  const polen = require('./polen.js');
  const feitas = [];
  feitas.push(gerar(
    'polen.html', 'mel-interna mel-pagina-polen',
    'Polen — câmera digital retrô | MELCAM',
    'A Polen guarda as fotos que importam. Câmera digital retrô, 7 cores, 8 filtros na hora do clique, 12 MP e sem tela. R$ 399,00 em até 3x sem juros.',
    polen.conteudo()
  ));
  const d = require('./demais.js');
  fs.appendFileSync(path.join(SITE, 'melcam', 'identidade.css'), d.css(), 'utf8');

  feitas.push(gerar('acessorios.html', 'mel-interna mel-pagina-acessorios',
    'Acessórios — em breve | MELCAM',
    'A categoria de acessórios da Melcam está a caminho. Deixe seu e-mail e saiba do lançamento.',
    d.acessorios()));

  feitas.push(gerar('sobre.html', 'mel-interna mel-pagina-sobre',
    'Sobre nós | MELCAM',
    'A Melcam é uma marca brasileira de câmeras digitais retrô. Conheça a Polen, a Bee e a comunidade Colméia.',
    d.sobre()));

  feitas.push(gerar('404.html', 'mel-interna mel-pagina-404',
    'Página não encontrada | MELCAM',
    'A página que você procurou não existe ou mudou de endereço.',
    d.erro404()));

  feitas.push(gerar('sacola.html', 'mel-interna mel-pagina-sacola',
    'Sacola | MELCAM',
    'Os itens que você escolheu na Melcam.',
    d.sacola()));

  const bee = require('./bee.js');
  feitas.push(gerar(
    'bee.html', 'mel-interna mel-pagina-bee',
    'Bee — a menor da colmeia | MELCAM',
    'Abelhas fazem mel, essa faz memórias. A Bee é a mini câmera-chaveiro da Melcam: 11 filtros, Full HD e 26 g. R$ 299,00 em até 12x.',
    bee.conteudo()
  ));
  return feitas;
}

module.exports = { aplicar, gerar, css, SO_HOME };
