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
  return '<div class="mel-hh" data-mel="hero-home">' +
    // O véu é um elemento próprio, e não background do bloco, para poder sair
    // numa linha se o cliente pedir. Ver o comentário do CSS: sem ele 24% da
    // área do texto fica abaixo de 4,5:1 contra o papel.
    '<div class="mel-hh-veu" aria-hidden="true"></div>' +
    '<div class="mel-hh-in">' +
      '<p class="mel-hh-selo">' + esc(H.badge) + '</p>' +
      '<h1 class="mel-hh-tit">' + esc(H.headline) + '</h1>' +
      '<p class="mel-hh-sub">' + esc(H.sub) + '</p>' +
      '<div class="mel-hh-ctas">' +
        '<a class="mel-hh-cta mel-hh-cta-mel" href="/bee">' + esc(H.ctaPrimario) + '</a>' +
        '<a class="mel-hh-cta mel-hh-cta-linha" href="/bee#modelos">' + esc(H.ctaSecundario) + '</a>' +
      '</div>' +
    '</div>' +
    // aria-hidden porque é dica visual de rolagem: quem usa leitor de tela já
    // recebe a estrutura da página inteira e não precisa ser mandado rolar.
    '<div class="mel-hh-role" aria-hidden="true"><span>Role</span><i></i></div>' +
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
.mel-hh{
  position:absolute; inset:0; z-index:2;
  display:flex; align-items:center;
  pointer-events:none;
}

/* --- o véu, que é obrigação de contraste e não gosto ---
   O texto é papel (${P.papel}) sobre vídeo, e o vídeo é uma cena de rua clara.
   Medido na área que o bloco ocupa (x124..700, y250..700, 7.372 amostras do
   quadro publicado): o pior contraste do papel contra o vídeo é 1,47:1, e
   24% das amostras ficam abaixo de 4,5:1. Sem véu, um quarto do texto é
   ilegível, e o vídeo se move — o quadro seguinte pode ser pior.

   NÃO É O VÉU QUE SAIU EM 13/08. Aquele era a section "Shadow": uma rampa de
   100vh sobre a hero inteira, que comia 17% no topo e 81% no pé. Este é uma
   faixa horizontal presa à ESQUERDA, que termina em transparente antes da
   metade da tela e nunca encosta no lado direito da cena. Ela existe para o
   texto e acaba onde o texto acaba.

   Os degraus saíram da conta, não do olho: sobre o pixel mais claro medido
   (rgb(202,215,92)) um preto a 50% devolve 5,24:1 e a 45% devolve 4,52:1. A
   parada de 38% mantém .66 até depois do fim da manchete, que em 1440 termina
   em x660, ou 46% da tela. */
.mel-hh-veu{
  position:absolute; inset:0; pointer-events:none;
  /* A MÁSCARA EXISTE PARA A NAVBAR, e é a única razão dela.
     Primeira montagem: o véu tinha inset:0 e z-index:2, então passava POR CIMA
     da barra. Medido no pixel: o lettering MELCAM caiu de rgb(251,247,238) para
     rgb(142,139,132) e o fundo da barra de rgb(34,30,23) para rgb(22,18,14).
     A barra ficou visivelmente lavada, e ela não pode mudar.

     A máscara zera o véu nos 81px da barra e o traz por completo só aos 150px.
     Não é um corte em 81: corte reto deixaria um degrau horizontal aparecendo
     logo abaixo da barra, do lado escuro. Os 69px de rampa fazem o véu nascer
     de dentro dela.

     Mascarar em vez de reposicionar o bloco de propósito: assim a coluna de
     texto continua centrada nos 900px inteiros da hero, que é onde a
     referência a põe. */
  -webkit-mask-image:linear-gradient(to bottom, transparent 0, transparent 81px, #000 150px);
  mask-image:linear-gradient(to bottom, transparent 0, transparent 81px, #000 150px);
  background-image:linear-gradient(90deg,
    rgba(18,15,11,.74) 0%,
    rgba(18,15,11,.66) 38%,
    rgba(18,15,11,.34) 58%,
    rgba(18,15,11,0)   78%);
}

/* A mesma caixa de conteúdo da /bee: 1240px com 24px de respiro. Em 1440 isso
   põe a coluna em x124, que é onde a referência a coloca. Reaproveitar a
   medida em vez de cravar um px novo mantém a home alinhada com as internas. */
.mel-hh-in{
  position:relative;
  width:100%; max-width:1240px; margin:0 auto;
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

/* --- o indicador de rolagem ---
   Centralizado na hero inteira, não na coluna de texto: na referência ele fica
   no meio da tela, e é dica de página, não do bloco. */
.mel-hh-role{
  position:absolute; left:50%; bottom:clamp(18px,3vh,34px);
  transform:translateX(-50%);
  isolation:isolate;
  display:flex; flex-direction:column; align-items:center; gap:9px;
  color:rgba(251,247,238,.78);
  font-family:"Area",sans-serif; font-size:.66rem; font-weight:500;
  letter-spacing:.22em; text-transform:uppercase;
  text-shadow:0 1px 12px rgba(18,15,11,.6);
  pointer-events:none;
}
/* O indicador fica no MEIO da tela, e ali o véu já acabou — ele termina em
   transparente aos 78%. Sem nada atrás, o fundo é a camisa amarela do filme:
   rgb(162,160,5), que contra o papel dá 2,60:1.

   A resposta é local e do tamanho da peça, não mais véu: uma elipse suave
   presa ao próprio indicador. Medida em seis quadros distintos do filme, em
   quatro janelas, ela entrega de 8,7:1 a 12,6:1 no pior caso de cada uma —
   folga, e não empate no mínimo.

   O isolation:isolate acima existe para o z-index:-1 daqui parar no
   indicador: sem ele, o pseudo desceria para trás do véu e do vídeo. */
.mel-hh-role::before{
  content:""; position:absolute; z-index:-1;
  left:50%; top:50%; transform:translate(-50%,-50%);
  width:220px; height:136px; pointer-events:none;
  /* closest-side, e não o farthest-corner que o radial-gradient assume sozinho.
     Com o padrão, a elipse é dimensionada pela DIAGONAL (129px numa caixa de
     220x136), então no meio de cada lado ela ainda tem alfa e o desenho termina
     no corte reto da caixa: aparecia um retângulo escuro no meio da cena. Com
     closest-side os raios viram 110 e 68, que é a caixa inscrita, e a tinta
     chega a zero antes da borda em todas as direções. */
  background:radial-gradient(closest-side ellipse at center,
    rgba(18,15,11,.50) 0%, rgba(18,15,11,.42) 44%, rgba(18,15,11,0) 100%);
}
.mel-hh-role i{
  display:block; width:1px; height:clamp(22px,3.4vh,34px);
  background:linear-gradient(to bottom, rgba(251,247,238,.72), rgba(251,247,238,0));
}

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
/* O indicador NÃO pode usar melHhSobe: aquele keyframe termina em
   transform:none e apagaria o translateX(-50%) que o centra. Medido antes de
   perceber: a caixa saía em x720 com 45px de largura, ou seja, encostada no
   meio pela ESQUERDA em vez de centrada nele — 22px fora. É a mesma armadilha
   já registrada no vídeo do retrato da /bee. */
@keyframes melHhSobeCentro{
  from{ opacity:0; transform:translate(-50%,18px) }
  to  { opacity:1; transform:translateX(-50%) }
}
.mel-hh-role{ animation:melHhSobeCentro 700ms cubic-bezier(.22,.61,.36,1) 620ms both }

@media (max-width:1024px){
  /* O véu fecha mais cedo e mais forte: a coluna ocupa proporcionalmente mais
     da tela, então a parada de 78% deixaria o fim da manchete sem cobertura. */
  .mel-hh-veu{
    background-image:linear-gradient(90deg,
      rgba(18,15,11,.78) 0%,
      rgba(18,15,11,.70) 52%,
      rgba(18,15,11,.38) 74%,
      rgba(18,15,11,0)   92%);
  }
  .mel-hh-sub{ max-width:30ch }
}

@media (max-width:809.98px){
  /* A navbar tem 81px e fica POR CIMA do topo da página — o mesmo padding de
     104px das internas, pela mesma razão. */
  .mel-hh-in{ padding:104px 20px clamp(70px,10vh,96px) }
  .mel-hh{ align-items:center }
  /* Em retrato o véu passa a ser vertical: a coluna ocupa a largura toda, e um
     gradiente horizontal deixaria o fim de cada linha sem cobertura. */
  .mel-hh-veu{
    background-image:linear-gradient(180deg,
      rgba(18,15,11,.34) 0%,
      rgba(18,15,11,.62) 34%,
      rgba(18,15,11,.68) 74%,
      rgba(18,15,11,.46) 100%);
  }
  .mel-hh-sub{ max-width:26ch }
  .mel-hh-ctas{ gap:11px }
  .mel-hh-cta{ padding:0 1.25rem; font-size:.78rem }
}

@media (prefers-reduced-motion:reduce){
  .mel-hh-selo, .mel-hh-tit, .mel-hh-sub, .mel-hh-ctas{ animation:none }
  /* O translateX do indicador é POSIÇÃO, não movimento: reposto na mão, senão
     o "animation:none" o devolveria para o meio deslocado meia largura. */
  .mel-hh-role{ animation:none; transform:translateX(-50%) }
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
