// O BLOCO DE TEXTO DA HERO DA HOME — 14/08/2026.
//
//   node tools/hero-home.js
//
// O que este arquivo faz, e por que ele existe.
//
// A hero da home é o <video> em position:fixed de 1440x900. Acima dele mora
// section[data-framer-name="The first section"], que estava VAZIA: 900px de
// altura, zero filhos, transparente. O texto que deveria estar ali vivia em
// dois lugares errados, os dois ABAIXO da dobra:
//
//   div[data-framer-name="Hero"]        y950   "Novo" + <h1> "Chegou a Bee"
//     dentro da seção carvão que vem DEPOIS do vídeo, centralizado
//   div[data-framer-name="Header Info"] y1609  <h2> "A câmera que vive com você."
//
// Ou seja: com a página no topo, a hero não dizia nada. Este arquivo move os
// três textos para dentro da seção que é a hero, à esquerda, e acrescenta os
// dois CTA e o indicador de rolagem.
//
// OS CTA NÃO SÃO INVENÇÃO. melcam.config.json já trazia home.hero.ctaPrimario
// ("Conhecer a Bee") e home.hero.ctaSecundario ("escolher modelo") desde o
// começo do projeto; eles nunca tinham sido construídos. Todo o texto daqui sai
// do config, que é a fonte de verdade do conteúdo.
//
// MOVER E NÃO COPIAR. O <h1> é um só na página. Duplicar "Chegou a Bee" daria
// dois <h1> na home e quebraria a etapa de "um <h1> por página" do aplicar.js,
// além do custo em leitor de tela. Por isso os nós de origem são REMOVIDOS.
//
// O QUE ESTE ARQUIVO NÃO TOCA: a navbar, o <video>, o container fixo dele, a
// section[data-framer-name="Shadow"] e a fileira de fotos. Nenhum seletor daqui
// alcança nenhum deles, e o bloco novo nasce dentro da hero, que estava vazia.
//
// Idempotente: rodar duas vezes dá o mesmo arquivo.
const fs = require('fs');
const path = require('path');

const SITE = path.resolve(__dirname, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(SITE, 'melcam.config.json'), 'utf8'));
const P = cfg.paleta;
const H = cfg.home.hero;

const ALVO_HTML = path.join(SITE, 'index.html');
const ALVO_CSS = path.join(SITE, 'melcam', 'identidade.css');

// O bloco da /bee é o ÚLTIMO da folha e o sincronizar-bee-css.js trunca nele.
// Por isso o CSS daqui entra ANTES desse marcador — depois dele seria apagado
// na próxima sincronização da /bee, em silêncio.
const MARCA_BEE = '/* ================== /bee — hero premium e claro ==================';
const ABRE = '/* ================== home — o bloco de texto da hero ==================';
const FECHA = '/* ============ fim do bloco de texto da hero da home ============ */';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ------------------------------------------------------------------- HTML
function html() {
  // O VÉU SAIU EM 15/08/2026, a pedido do cliente: "tem uma sombra no hero que
  // precisa ser removida, ela foi pra lá depois que adicionamos o texto".
  // Ele estava certo na origem — a sombra entrou junto com este bloco, em
  // 14/08. Quem passa a fazer o trabalho de contraste é a rampa do template
  // (a section "Shadow"), religada na mesma passagem; ver o comentário dela em
  // tools/bloco-bee.js > css(). Era escrito como elemento próprio justamente
  // para poder sair numa linha, e saiu numa linha.
  return '<div class="mel-hh" data-mel="hero-home">' +
    '<div class="mel-hh-in">' +
      '<p class="mel-hh-selo">' + esc(H.badge) + '</p>' +
      '<h1 class="mel-hh-tit">' + esc(H.headline) + '</h1>' +
      '<p class="mel-hh-sub">' + esc(H.sub) + '</p>' +
      '<div class="mel-hh-ctas">' +
        '<a class="mel-hh-cta mel-hh-cta-mel" href="/bee">' + esc(H.ctaPrimario) + '</a>' +
        '<a class="mel-hh-cta mel-hh-cta-linha" href="/bee#modelos">' + esc(H.ctaSecundario) + '</a>' +
      '</div>' +
    '</div>' +
    // O indicador de rolagem SAIU em 15/08/2026, a pedido do cliente. Ele era
    // aria-hidden e não recebia ponteiro, então nada de navegação nem de leitor
    // de tela dependia dele: a saída não deixa buraco de acessibilidade.
  '</div>';
}

// Recorta um elemento balanceando <div>/</div> a partir do início dele.
// Regex não serve: os nós a remover têm divs aninhadas, e um .*? guloso ou
// preguiçoso corta no lugar errado e desbalanceia o documento — que é
// exatamente o que a etapa 8 do aplicar.js e o preflight medem.
function fatiaDiv(s, inicio) {
  let i = inicio, prof = 0;
  while (i < s.length) {
    if (s.startsWith('<div', i) && /[\s>]/.test(s[i + 4] || '')) { prof++; i += 4; continue; }
    if (s.startsWith('</div>', i)) { prof--; i += 6; if (!prof) return i; continue; }
    i++;
  }
  throw new Error('hero-home: </div> de fechamento não encontrado a partir de ' + inicio);
}

function removerPorClasse(s, classe, rot, n) {
  const marca = '<div class="' + classe + '"';
  const i = s.indexOf(marca);
  if (i < 0) return s;                       // já removido numa passada anterior
  if (s.indexOf(marca, i + 1) >= 0) throw new Error('hero-home: ' + rot + ' aparece 2x');
  n.removidos.push(rot);
  return s.slice(0, i) + s.slice(fatiaDiv(s, i));
}

function aplicar() {
  const n = { removidos: [], divAntes: 0, divDepois: 0 };
  let s = fs.readFileSync(ALVO_HTML, 'utf8');
  const conta = (t) => (t.match(/<\/div>/g) || []).length - (t.match(/<div[\s>]/g) || []).length;
  n.divAntes = conta(s);

  // 1. tira o bloco antigo deste arquivo, se já tiver rodado
  const j = s.indexOf('<div class="mel-hh" data-mel="hero-home">');
  if (j >= 0) s = s.slice(0, j) + s.slice(fatiaDiv(s, j));

  // 2. tira os nós de origem
  s = removerPorClasse(s, 'framer-12m7bjb', 'Hero (Novo + h1)', n);
  s = removerPorClasse(s, 'framer-1wb9l8v', 'subtítulo em Header Info', n);

  // 3. põe o bloco dentro da hero, que é a seção vazia de 900px
  const vazia = '<section class="framer-3f03z0" data-framer-name="The first section"></section>';
  const i = s.indexOf(vazia);
  if (i < 0) {
    // já tem conteúdo nosso lá dentro? então só reinsere
    const abre = '<section class="framer-3f03z0" data-framer-name="The first section">';
    const k = s.indexOf(abre);
    if (k < 0) throw new Error('hero-home: a seção da hero não foi encontrada em index.html');
    s = s.slice(0, k + abre.length) + html() + s.slice(k + abre.length);
  } else {
    s = s.replace(vazia,
      '<section class="framer-3f03z0" data-framer-name="The first section">' + html() + '</section>');
  }

  n.divDepois = conta(s);
  if (n.divAntes !== n.divDepois) {
    throw new Error('hero-home: o documento desbalanceou (' + n.divAntes + ' -> ' + n.divDepois + ')');
  }
  const h1s = (s.match(/<h1[\s>]/g) || []).length;
  if (h1s !== 1) throw new Error('hero-home: a home ficou com ' + h1s + ' <h1>, tem que ser 1');

  fs.writeFileSync(ALVO_HTML, s, 'utf8');
  return n;
}

// -------------------------------------------------------------------- CSS
function css() {
  return `
${ABRE}
   Entrou em 14/08/2026 com o pedido do bloco de texto da hero da home.

   ONDE ELE MORA. Dentro de section[data-framer-name="The first section"], que
   é a hero e estava vazia. Nada aqui alcança a navbar, o <video>, o container
   fixo dele ou a section "Shadow" — os quatro continuam exatamente como
   estavam, e nenhum seletor deste bloco os nomeia.

   O EMPILHAMENTO, medido antes de escolher o número:
     container do vídeo   position:fixed    z-index 0
     section "Shadow"     position:absolute z-index 1   (vazia, sem pintura)
     "The first section"  position:relative z-index auto
   Daí z-index:2 aqui: é o primeiro degrau acima dos dois, e não mexe em
   nenhum deles. A navbar não entra nessa conta porque este bloco NÃO RECEBE
   PONTEIRO — pointer-events:none no envelope, auto só nos dois links. Mesmo
   cobrindo a faixa dela em geometria, não há clique que ele possa roubar. */
/* align-items:flex-end desde 15/08/2026 — pedido do cliente, "título nunca fica
   em cima". Era "center", que punha a manchete em y338 numa hero de 900px, ou
   seja, no terço superior. Ancorado no pé, quem define o respiro até a base é o
   padding-bottom do .mel-hh-in, que já existia; não há número novo aqui.

   O rodapé ficou livre porque o indicador de rolagem saiu na mesma passada — se
   os dois convivessem, a coluna de texto cairia em cima dele. */
.mel-hh{
  position:absolute; inset:0; z-index:2;
  display:flex; align-items:flex-end;
  pointer-events:none;
}


/* A COLUNA É A MESMA DO RESTO DA HOME — corrigido em 15/08/2026.
   Era 1240px, herdado da /bee, e isso punha a coluna do hero em x124 numa tela
   de 1440 enquanto as seções logo abaixo começavam em x24: 100px de desencontro,
   que é o que o cliente viu.

   A grade canônica do projeto já estava escrita no comunidade.js — "largura
   1440, gutter 24" — e é o que .mel-sec aplica no carrossel, no "Por onde a
   Melcam passou" e nos selos de garantia. Aqui a caixa passa a ser a MESMA
   declaração, não um número parecido: max-width 1440 com 24px de gutter, e 16px
   abaixo de 810 (o mesmo degrau que .mel-sec faz na mesma quebra).

   Medido depois: hero e .mel-sec começam no mesmo x em 1920, 1440, 1280, 810
   e 390. O padding-bottom continua sendo o respiro do título ancorado no pé. */
.mel-hh-in{
  position:relative;
  width:100%; max-width:1440px; margin:0 auto;
  padding:0 24px clamp(56px,7vh,88px);
  display:flex; flex-direction:column; align-items:flex-start;
}

/* --- o selo ---
   Mel com texto carvão, e não o contrário: carvão sobre mel dá 8,25:1, que é
   o mesmo par já usado nas placas da /bee. Pílula de verdade (999px), porque
   é etiqueta e não botão — por isso também não tem hover, cursor nem foco. */
.mel-hh-selo{
  margin:0 0 clamp(18px,2.2vw,26px);
  padding:.42rem 1rem;
  border-radius:999px;
  background:${P.mel}; color:${P.carvao};
  font-family:"Area",sans-serif; font-size:.72rem; font-weight:700;
  letter-spacing:.16em; text-transform:uppercase; line-height:1;
}

.mel-hh-tit{
  margin:0; color:${P.papel};
  font-family:"Iowan Old Style",Georgia,serif; font-weight:700;
  font-size:clamp(2.4rem,5.2vw,4.6rem); line-height:1.02; letter-spacing:-.02em;
  /* A sombra não substitui o véu, soma a ele: ela salva a borda da letra
     quando um realce do vídeo passa por baixo entre um quadro e outro. */
  text-shadow:0 2px 18px rgba(18,15,11,.42);
}

/* --- o subtítulo, e a fonte dele ---
   GEORGIA E NÃO IOWAN, de propósito. O projeto carrega uma face só de Iowan
   Old Style: peso 700, estilo normal. Pedir italic dela faz o navegador
   SINTETIZAR o itálico inclinando o desenho bold, e o que sai é um serifado
   pesado torto, não um itálico. Georgia tem itálico de verdade e é o fallback
   que a manchete já declara, então a família não é estranha à página. */
.mel-hh-sub{
  margin:clamp(14px,1.8vw,20px) 0 0; color:${P.papel};
  font-family:Georgia,"Times New Roman",serif; font-style:italic;
  font-size:clamp(1.05rem,1.7vw,1.5rem); line-height:1.4; letter-spacing:.005em;
  max-width:34ch;
  text-shadow:0 1px 14px rgba(18,15,11,.42);
}

/* --- os dois CTA ---
   pointer-events volta a auto aqui: são os únicos nós clicáveis do bloco.
   min-height 44px é o alvo de toque que o resto do site usa. */
.mel-hh-ctas{
  margin-top:clamp(26px,3.4vw,40px);
  display:flex; flex-wrap:wrap; gap:14px;
  pointer-events:auto;
}
.mel-hh-cta{
  display:inline-flex; align-items:center; justify-content:center;
  min-height:44px; padding:0 1.65rem; border-radius:999px;
  font-family:"Area",sans-serif; font-size:.84rem; font-weight:700;
  letter-spacing:.09em; text-transform:uppercase; line-height:1;
  text-decoration:none; white-space:nowrap;
  transition:background-color 220ms ease, color 220ms ease, border-color 220ms ease;
}
.mel-hh-cta-mel{ background:${P.mel}; color:${P.carvao}; border:1px solid ${P.mel} }
.mel-hh-cta-mel:hover{ background:#FFB81A; border-color:#FFB81A }
/* O contorno é papel a 72%, não papel cheio: cheio competia com a manchete,
   que é o elemento que tem de ganhar a dobra. O TEXTO continua papel cheio,
   então o contraste do que se lê não muda. */
.mel-hh-cta-linha{
  background:rgba(18,15,11,.28); color:${P.papel};
  border:1px solid rgba(251,247,238,.72);
}
.mel-hh-cta-linha:hover{ background:rgba(251,247,238,.16); border-color:${P.papel} }

/* O INDICADOR DE ROLAGEM SAIU — 15/08/2026, a pedido do cliente.
   Saíram com ele a elipse de contraste que o sustentava sobre a camisa amarela
   do filme, o traço vertical e o keyframe próprio (melHhSobeCentro), que existia
   só porque o translateX(-50%) do centro não sobrevivia ao "transform:none" do
   melHhSobe. Nada mais na folha usa esse keyframe.

   Ele era aria-hidden e pointer-events:none, então não havia navegação nem
   leitura de tela apoiada nele. O rodapé da hero que ele ocupava é justamente
   onde a coluna de texto passou a morar — ver o align-items acima. */

/* Entrada em CSS puro, com "both", pela mesma razão da /bee: se o script
   falhar o conteúdo aparece do mesmo jeito. */
@keyframes melHhSobe{ from{ opacity:0; transform:translateY(18px) } to{ opacity:1; transform:none } }
.mel-hh-selo,
.mel-hh-tit,
.mel-hh-sub,
.mel-hh-ctas{ animation:melHhSobe 700ms cubic-bezier(.22,.61,.36,1) both }
.mel-hh-selo{ animation-delay:120ms }
.mel-hh-tit { animation-delay:220ms }
.mel-hh-sub { animation-delay:330ms }
.mel-hh-ctas{ animation-delay:430ms }

@media (max-width:1024px){
  .mel-hh-sub{ max-width:30ch }

  /* O CTA de contorno ganha mais fundo próprio aqui — 15/08/2026. MELHORIA
     PARCIAL, e está registrado como parcial de propósito.

     O que foi medido: com o alfa de .28 do desktop, três execuções do
     qa-hero-home deram 4,48 / 4,62 / 4,64 no 390 e 4,73 no 810, contra o
     mínimo de 4,5 — uma delas reprovou. Não é ruído da medição, a margem é
     fina mesmo. Com .38 os valores típicos subiram para a faixa de 5,5 a 8.

     O QUE ISTO NÃO RESOLVE. O fundo é filme, e o QA sorteia quadros: numa
     execução posterior um quadro mais claro no 810 ainda devolveu 4,54. E a
     conta mostra que perseguir isso por alfa não fecha — contra um quadro
     BRANCO, .38 dá 2,33, .52 dá 3,58 e nem .60 chega a 4,7. O alfa que
     garantiria qualquer quadro transforma o botão de contorno num botão
     preenchido, que passa a competir com o CTA principal em mel. Isso é
     decisão de desenho, não de implementação, e está aberta com o cliente.

     Por que só abaixo de 1024: no desktop o mesmo botão mede de 6 a 8:1, então
     escurecer lá seria mexer no desenho sem motivo. O contorno e o texto
     continuam papel; o que muda é quanto de filme aparece dentro do botão. */
  .mel-hh-cta-linha{ background:rgba(18,15,11,.38) }
}

@media (max-width:809.98px){
  /* A navbar tem 81px e fica POR CIMA do topo da página — o mesmo padding de
     104px das internas, pela mesma razão. */
  /* 16px e não 20px: é o gutter que .mel-sec assume nesta mesma quebra
     (max-width:809.98px). Com 20 o hero ficava 4px fora da coluna do resto da
     página no celular — pouco, e mesmo assim visível quando se rola de uma
     seção para a outra e a margem "pula". */
  .mel-hh-in{ padding:104px 16px clamp(70px,10vh,96px) }
  /* Mesma âncora do desktop. O padding-top de 104px continua valendo como piso
     contra a navbar: com o bloco no pé ele não empurra o texto para baixo, só
     impede que uma coluna alta encoste na barra quando a tela é curta. */
  .mel-hh{ align-items:flex-end }
  .mel-hh-sub{ max-width:26ch }
  .mel-hh-ctas{ gap:11px }
  .mel-hh-cta{ padding:0 1.25rem; font-size:.78rem }
}

@media (prefers-reduced-motion:reduce){
  .mel-hh-selo, .mel-hh-tit, .mel-hh-sub, .mel-hh-ctas{ animation:none }
}
${FECHA}
`;
}

// ------------------------------------------------------------ sincronizar
function sincronizarCSS() {
  const atual = fs.readFileSync(ALVO_CSS, 'utf8');
  const crlf = (s) => s.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
  const bloco = crlf(css());

  let saida;
  const a = atual.indexOf(ABRE);
  if (a >= 0) {
    const f = atual.indexOf(FECHA, a);
    if (f < 0) throw new Error('hero-home: bloco aberto na folha e nunca fechado');
    saida = atual.slice(0, a) + bloco.replace(/^\r\n/, '') + atual.slice(f + FECHA.length);
  } else {
    const b = atual.indexOf(MARCA_BEE);
    if (b < 0) throw new Error('hero-home: marcador do bloco da /bee não encontrado na folha');
    saida = atual.slice(0, b) + bloco.replace(/^\r\n/, '') + '\r\n\r\n' + atual.slice(b);
  }

  const ab = (saida.match(/\{/g) || []).length;
  const fe = (saida.match(/\}/g) || []).length;
  if (ab !== fe) throw new Error('identidade.css: chaves desbalanceadas ' + ab + '/' + fe);

  // a mesma guarda de comentário do sincronizar-bee-css.js: um "*/" perdido
  // engole a regra seguinte sem mudar a contagem de chaves
  let dentro = false, aspas = null, orfaos = 0;
  for (let k = 0; k < saida.length; k++) {
    const c = saida[k];
    if (aspas) { if (c === '\\') k++; else if (c === aspas) aspas = null; continue; }
    if (!dentro && (c === '"' || c === "'")) { aspas = c; continue; }
    if (!dentro && c === '/' && saida[k + 1] === '*') { dentro = true; k++; }
    else if (dentro && c === '*' && saida[k + 1] === '/') { dentro = false; k++; }
    else if (!dentro && c === '*' && saida[k + 1] === '/') { orfaos++; k++; }
  }
  if (dentro) throw new Error('identidade.css: comentário aberto que nunca fecha');
  if (orfaos) throw new Error('identidade.css: ' + orfaos + ' "*/" sem "/*" aberto');

  fs.writeFileSync(ALVO_CSS, saida, 'utf8');
  return { antes: atual.length, depois: saida.length, bloco: bloco.length, chaves: ab };
}

module.exports = { css, html, aplicar, sincronizarCSS };

if (require.main === module) {
  const c = sincronizarCSS();
  console.log('ok  melcam/identidade.css  (bloco da hero: ' + c.bloco +
    ' bytes, folha ' + c.antes + ' -> ' + c.depois + ', chaves ' + c.chaves + ')');
  const n = aplicar();
  console.log('ok  index.html  (removidos: ' + (n.removidos.join(', ') || 'nada, já estavam fora') +
    '  |  divs ' + n.divAntes + ' -> ' + n.divDepois + ')');
}
