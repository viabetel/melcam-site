// /bee — hero premium e claro. CSS e comportamento, num módulo só.
//
// Espelha tools/polen-interacoes.js na forma (css() + js(), injetados por
// tools/paginas.js e tools/hero-carrossel.js), mas NÃO na direção de arte: a
// Polen é cinema escuro em carvão, a Bee é papel, sol e mel. Ver o cabeçalho
// de css() para o porquê de cada decisão.
//
// ⚠️ ARMADILHAS DO BUILD (handoff de 13/08, e uma que custou caro na Polen):
//   - crase e abre-interpolação NÃO podem aparecer nem dentro de comentário,
//     porque tudo aqui mora em template literal;
//   - "\s" dentro de sonda em template literal vira "s": use "\\s".
const fs = require('fs');
const path = require('path');

const SITE = path.resolve(__dirname, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(SITE, 'melcam.config.json'), 'utf8'));
const P = cfg.paleta;

// Derivações da própria paleta, não cores novas.
//   melFundo  — o mel do plano de fundo é o mel da marca, sem alteração.
//   melTrama  — o traço do favo, tom sobre tom: o mesmo mel escurecido ~9%.
//              É o único valor derivado aqui, e existe para o pattern não
//              virar um segundo amarelo.
//   sombra    — contato dos packshots. Marrom quente vindo do carvão, nunca
//              preto puro (auditoria de paleta, 13/08).
const D = {
  melTrama: '#DE9E04',
  sombra: 'rgba(74,52,10,.26)',
  sombraCurta: 'rgba(74,52,10,.16)',
  papelBorda: 'rgba(34,30,23,.12)',
};

// ---------------------------------------------------------------------------
// PATTERN DO FAVO, tom sobre tom.
//
// Hexágono de topo plano e vértices à esquerda e à direita — a mesma
// orientação impressa na frente da câmera, conferida nas fotos oficiais, não
// suposta. Circunraio R=42: largura do ladrilho 3R=126, altura √3R≈72,75, com
// duas colunas por ladrilho (a segunda deslocada meia altura). Os quatro
// hexágonos de canto entram junto para a emenda do ladrilho não aparecer.
//
// É desenho de marca em CSS, não imagem: nada é baixado, nada vira asset novo.
const FAVO = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='126'"
  + " height='72.75' viewBox='0 0 126 72.75'%3E%3Cpath d='M42 0L21 36.37L-21 36.37L-42 0"
  + "L-21 -36.37L21 -36.37ZM168 0L147 36.37L105 36.37L84 0L105 -36.37L147 -36.37ZM42 72.75"
  + "L21 109.12L-21 109.12L-42 72.75L-21 36.38L21 36.38ZM168 72.75L147 109.12L105 109.12"
  + "L84 72.75L105 36.38L147 36.38ZM105 36.37L84 72.74L42 72.74L21 36.37L42 0L84 0Z'"
  + " fill='none' stroke='%23" + D.melTrama.slice(1) + "' stroke-width='2'/%3E%3C/svg%3E";

// ---------------------------------------------------------------------------
function css() {
  return `
/* ================== /bee — hero premium e claro ==================
   Conceito: "uma câmera para levar junto". A Bee não é a Polen em amarelo —
   é acessório antes de ser equipamento, e a página abre clara por isso.

   A MEDIÇÃO QUE DEFINIU A COMPOSIÇÃO (13/08/2026, amostrando os PNG):
   o corpo da Bee amarela é #CDBA29 e o da branca é #B5B5B4. Contra o mel
   ${P.mel} os dois dão 1,02:1 — luminância praticamente igual. Ou seja:
   nenhuma das duas pode simplesmente deitar sobre o plano amarelo, porque
   sumiria nele. Contra o papel dão 1,84 e 1,92:1, melhor mas ainda pouco.

   Daí as três decisões de arte, todas consequência do número:
     1  cada Bee tem SOMBRA DE CONTATO própria (drop-shadow em marrom quente).
        É o que separa objeto de fundo quando a luminância não separa. Não é
        glow: tem deslocamento vertical e não circunda a peça.
     2  a amarela — o foco — fica majoritariamente sobre o PAPEL, onde a
        correntinha dela também desenha a linha de movimento do conjunto.
     3  a branca ATRAVESSA a curva do plano de mel. Metade sobre mel, metade
        sobre papel: a própria borda vira leitura, e o encontro das duas cores
        de fundo passa a ser assunto da composição em vez de acidente.

   O QUE ESTE HERO NÃO FAZ, de propósito, para não repetir a Polen:
     - não é foto sangrando canto a canto com scrim por cima;
     - não é divisão 50/50;
     - não é escuro;
     - não tem paralaxe. O pedido é "depois da entrada, tudo permanece
       estável", então ao JS sobrou largura cheia e rolagem do CTA. Mais nada.

   OS PACKSHOTS TÊM RECORTE DE VERDADE — e a Polen não tinha.
   Medido: PNG RGBA de 8 bits, alfa 0 fora da peça, ~3% de borda parcial. Foi
   isso que liberou a composição gráfica que a /polen não pôde ter (lá os 7
   packshots são RGB sem alfa, com o fundo da variante embutido).
   Ressalva honesta: a borda parcial carrega o verde do fundo de estúdio
   original (rgb ~17,65,32), então sobra um fio escuro de 1 a 2 px em volta do
   recorte. Sobre mel é imperceptível; sobre papel lê como contorno. Não foi
   "corrigido" retocando o arquivo oficial. */
.mel-bh{
  position:relative; isolation:isolate; overflow:hidden;
  background:${P.papel};
  /* 80svh, não os 92 da Polen. Duas razões, as duas medidas em 1440x900:
     a próxima seção aqui É a escolha da cor, destino do CTA, e com 80svh ela
     começa em 799 — sobram 101px de dobra, o bastante para o eyebrow E parte
     do título dela aparecerem, não só uma faixa; e o hero fica em 720px, o
     que fecha o vazio de papel que sobrava embaixo da coluna de texto (o
     mesmo defeito que a /polen levou três passadas para resolver). */
  min-height:clamp(520px,80svh,820px);
  display:flex; align-items:center;
  /* A largura cheia é escrita por JS (sangrar(), em interacoes.js), medida em
     document.documentElement.clientWidth — que NÃO inclui a barra de rolagem.
     100vw incluiria e criaria transbordo horizontal. Sem JS o hero fica na
     largura do container: mais estreito, nunca quebrado. */
}

/* --- o palco ---
   Faixa direita do hero. Não pinta nada e não recebe clique: existe para ser
   o ÚNICO sistema de coordenadas do plano de mel e das duas câmeras. Enquanto
   a forma ficou presa ao hero e as câmeras ao palco, o retrato media as duas
   contra caixas diferentes e o plano amarelo saía com 582px de altura onde
   cabiam 190. */
.mel-bh-palco{
  position:absolute; z-index:2; inset:0 0 0 38%;
  pointer-events:none;
}

/* --- camada 0: o grande plano de mel ---
   Sangra no topo e na direita; o canto inferior esquerdo é um raio grande, e
   é ele que faz a divisão entre papel e mel ser curva em vez de reta. A base
   fica ACIMA do fim do hero de propósito: assim o hero termina em papel na
   largura inteira e emenda sem degrau na seção de modelos, que também é
   clara. */
.mel-bh-forma{
  position:absolute; z-index:0; top:0; right:0;
  bottom:clamp(34px,6vh,88px);
  width:87%;
  border-radius:0 0 0 clamp(150px,21vw,320px);
  background-color:${P.mel};
  background-image:url("${FAVO}");
  background-size:126px 72.75px;
  animation:melBhForma 900ms cubic-bezier(.22,.61,.36,1) both;
}
@keyframes melBhForma{
  /* Só translateX e opacidade. Escalar a forma distorceria o raio de 320px do
     canto, que é justamente o que dá a curva. */
  from{ opacity:0; transform:translateX(72px) }
  to  { opacity:1; transform:none }
}

/* --- camada 1: os dois packshots --- */
.mel-bh-cam{
  position:absolute; z-index:1; display:block; height:auto;
  /* contain: o packshot é recorte, nunca pode ser cortado nem deformado */
  object-fit:contain;
  /* A sombra de contato. Dois passos: um longo, que assenta a peça no plano,
     e um curto, que dá a aresta. Marrom quente derivado do carvão — preto
     puro joga halo frio numa página quente (auditoria de paleta). */
  filter:drop-shadow(0 20px 26px ${D.sombra}) drop-shadow(0 3px 5px ${D.sombraCurta});
}
/* A branca ATRAVESSA a curva: parte sobre mel, parte sobre papel. */
.mel-bh-branca{
  left:8%; top:6%; width:34%;
  transform:rotate(-8deg);
  animation:melBhBranca 780ms cubic-bezier(.22,.61,.36,1) 200ms both;
}
/* A amarela é o foco: maior, à frente, e majoritariamente sobre o papel. A
   correntinha dela sai pela esquerda e é a linha de movimento da composição —
   asset oficial, não enfeite desenhado. */
.mel-bh-amarela{
  left:3%; bottom:7%; width:80%;
  transform:rotate(-2deg);
  animation:melBhAmarela 860ms cubic-bezier(.22,.61,.36,1) 320ms both;
}
@keyframes melBhBranca{
  from{ opacity:0; transform:translate(-22px,16px) rotate(-15deg) }
  to  { opacity:1; transform:rotate(-8deg) }
}
@keyframes melBhAmarela{
  from{ opacity:0; transform:translate(34px,24px) rotate(2.5deg) scale(.965) }
  to  { opacity:1; transform:rotate(-2deg) }
}

/* As duas indicações de cor, junto do produto.
   NÃO é seletor: o seletor funcional são os dois cards de "Escolha sua Bee",
   logo abaixo. Aqui é legenda, e por isso o nome vem escrito — a informação
   não pode viajar só na cor da bolinha. */
.mel-bh-cores{
  position:absolute; z-index:3; right:6%; bottom:2%;
  margin:0; display:flex; align-items:center; gap:.5rem;
  color:${P.carvao}; font-family:"Area",sans-serif;
  font-size:.74rem; font-weight:600; letter-spacing:.1em; text-transform:uppercase;
  animation:melBhCopy 620ms cubic-bezier(.22,.61,.36,1) 520ms both;
}
.mel-bh-cor{
  width:11px; height:11px; border-radius:50%; display:inline-block;
  box-shadow:inset 0 0 0 1px ${D.papelBorda};
}
.mel-bh-cor-amarela{ background:${P.mel} }
.mel-bh-cor-branca { background:${P.papel} }
.mel-bh-cores i{ font-style:normal; opacity:.42; margin:0 .1rem }

/* --- camada 3: o texto --- */
.mel-bh-in{
  position:relative; z-index:3;
  width:100%; max-width:1240px; margin:0 auto;
  padding:clamp(48px,6vw,84px) 24px;
}
.mel-bh-copy{ max-width:min(46%,33rem) }
.mel-bh-eyebrow{
  margin:0 0 1rem; color:${P.carvao};
  font-family:"Area",sans-serif; font-size:.74rem; font-weight:700;
  letter-spacing:.28em; text-transform:uppercase;
}
.mel-bh-tit{
  margin:0; color:${P.carvao};
  font-family:"Iowan Old Style",Georgia,serif; font-weight:700;
  /* 3rem, e não os 3,4rem da /polen. Medido: em 54,4px "Pequena o bastante"
     ocupa ~520px; em 48px, ~460px. A quebra pedida é em DUAS linhas
     ("Pequena o bastante / para ir junto."), e com a coluna estreita a
     manchete caía em três, com "junto." órfão sozinho na última.
     A correção veio dos dois lados: a fonte desceu para 48px E a coluna subiu
     para 33rem — só baixar a fonte deixaria a manchete pequena demais para um
     hero, e só alargar a coluna empurraria o texto para debaixo da Bee
     branca. Foi por isso que a branca também andou para a direita. */
  font-size:clamp(2rem,3.6vw,3rem); line-height:1.06; letter-spacing:-.015em;
  /* 20ch é o teto que garante a quebra: cabe "Pequena o bastante" e não cabe
     "Pequena o bastante para". text-wrap:balance fica FORA de propósito — na
     /polen ele reequilibrava as linhas e devolvia a quebra em três. */
  max-width:20ch;
}
.mel-bh-txt{
  margin:clamp(18px,2.4vw,26px) 0 0; max-width:42ch;
  color:#4A4236; font-family:"Area",sans-serif;
  font-size:clamp(1rem,1.15vw,1.08rem); line-height:1.66;
}
/* CTA em carvão, não em mel: numa página cuja assinatura já é um grande
   plano amarelo, o botão de mel se dissolveria no assunto. Carvão sobre
   papel dá 15,51:1 e é o elemento mais escuro da dobra, que é onde o olho
   precisa parar. O mel continua sendo a cor da marca aqui — ele é o fundo. */
.mel-bh-cta{
  margin-top:clamp(24px,3vw,34px); min-height:44px; line-height:1.6;
  background:${P.carvao}; color:${P.papel};
  letter-spacing:.06em; text-transform:uppercase; font-size:.86rem;
}
.mel-bh-cta:hover{ background:#332C22; color:${P.papel} }
.mel-bh-apoio{
  margin:1.1rem 0 0; color:#6B6254;
  font-family:"Area",sans-serif; font-size:.82rem; letter-spacing:.06em;
}

/* Entrada do texto: keyframes de CSS com "both", sem depender de JS. Se o
   script falhar, o conteúdo aparece do mesmo jeito — é a lição do "hero em
   branco" registrada no progresso.md. Cada peça tem classe e atraso próprios;
   nada de nth-child. Ordem total da cena: forma 0-900, branca 200-980,
   amarela 320-1180, texto 80-1060. Fecha em 1.180 ms. */
@keyframes melBhCopy{ from{ opacity:0; transform:translateY(16px) } to{ opacity:1; transform:none } }
.mel-bh-eyebrow,
.mel-bh-tit,
.mel-bh-txt,
.mel-bh-cta,
.mel-bh-apoio{ animation:melBhCopy 620ms cubic-bezier(.22,.61,.36,1) both }
.mel-bh-eyebrow{ animation-delay:80ms }
.mel-bh-tit    { animation-delay:170ms }
.mel-bh-txt    { animation-delay:270ms }
.mel-bh-cta    { animation-delay:360ms }
.mel-bh-apoio  { animation-delay:440ms }

/* --- tablet: menos sobreposição, as duas Bees ainda reconhecíveis --- */
@media (max-width:1024px){
  .mel-bh-copy{ max-width:min(52%,24rem) }
  .mel-bh-tit{ font-size:clamp(1.9rem,4.4vw,2.7rem) }
  .mel-bh-palco{ inset:0 0 0 30% }
  .mel-bh-forma{ width:90%; border-radius:0 0 0 clamp(120px,20vw,220px) }
  .mel-bh-branca{ left:2%; top:9%; width:38% }
  .mel-bh-amarela{ left:4%; bottom:9%; width:88% }
}

/* --- retrato: uma coluna, texto primeiro ---
   Texto antes do produto porque a manchete é o que explica a página, e no
   celular a primeira tela é curta. Duas imagens, as mesmas duas — nenhuma
   camada decorativa a mais. O plano de mel vira uma faixa embaixo do texto,
   com o mesmo canto arredondado, e as Bees se assentam nela sem corte. */
@media (max-width:809.98px){
  .mel-bh{
    display:block; min-height:0;
    /* A navbar tem 81px e fica POR CIMA do topo da página. Com padding menor
       que isso o eyebrow entra debaixo dela — foi o defeito medido na /polen
       em 390. */
    padding:104px 0 0;
  }
  .mel-bh-in{ padding:0 20px clamp(20px,5vw,30px) }
  .mel-bh-copy{ max-width:none }
  /* Sem teto em ch aqui: quem manda é a largura da coluna. Medido nos dois
     retratos, a manchete fecha em duas linhas — 22ch cabe "Pequena o
     bastante" e não cabe "…bastante para", que é a quebra pedida. */
  .mel-bh-tit{ max-width:22ch; font-size:clamp(1.95rem,8.4vw,2.5rem) }
  .mel-bh-txt{ max-width:46ch }

  /* O palco deixa de ser sobreposição e passa a ser bloco no fluxo — e como
     a forma agora mora dentro dele, o plano de mel acompanha sozinho. */
  .mel-bh-palco{
    position:relative; z-index:auto; inset:auto; width:100%;
    height:clamp(226px,58vw,300px);
  }
  .mel-bh-forma{
    top:auto; bottom:0; right:0; height:80%;
    width:min(80%,400px); border-radius:clamp(80px,22vw,140px) 0 0 0;
  }
  .mel-bh-branca{ left:3%; top:0; width:42% }
  .mel-bh-amarela{ left:5%; bottom:8%; width:84% }
  .mel-bh-cores{ right:auto; left:20px; bottom:2px }
}

/* Emenda com a seção de modelos.
   As duas são claras, então não há degrau de cor nenhum — o que separa é
   espaço. E o padding cheio de .mel-sec (até 110px) NÃO serve aqui: com ele o
   eyebrow de "Escolha sua Bee" cairia abaixo da dobra em 1440x900 e o que
   espiaria seria uma faixa vazia, que é pior do que não espiar. Mesmo defeito
   medido na /polen em 13/08. */
.mel-bh + .mel-sec{ padding-top:clamp(30px,3.2vw,46px) }

@media (prefers-reduced-motion:reduce){
  /* Estado final direto: nada escondido, nada escalonado, layout igual.
     As duas rotações de repouso FICAM — elas são composição, não movimento. */
  .mel-bh-forma,
  .mel-bh-cores,
  .mel-bh-eyebrow, .mel-bh-tit, .mel-bh-txt, .mel-bh-cta, .mel-bh-apoio{
    animation:none;
  }
  .mel-bh-branca { animation:none; transform:rotate(-8deg) }
  .mel-bh-amarela{ animation:none; transform:rotate(-2deg) }
}

/* ============ /bee — a página clara continua na escolha da cor ============
   O pedido é passagem contínua: o hero termina em papel, então a seção
   seguinte não pode abrir em carvão. Só a faixa de MODELOS muda de pele; de
   "Destaques" em diante a página volta ao editorial escuro do site, e essa
   volta é uma divisão declarada, não um acidente.

   Tudo aqui é escopado em body.mel-pagina-bee: a /polen, a home e as demais
   internas não enxergam uma linha disto. */
body.mel-pagina-bee #modelos{
  position:relative;
  background:${P.papel};
  padding-bottom:clamp(52px,6vw,88px);
}
/* A COSTURA DE 10 px — medida, não suposta.
   O stack do template (header.framer-vrbx7h) é flex column com gap:10px e
   fundo carvão. Esse vão existe entre TODAS as seções do site e nunca se viu
   porque os dois lados sempre foram carvão. Entre o hero de papel e esta
   seção de papel ele virou uma linha escura atravessando a página, exatamente
   a "mudança brusca para preto" que o pedido proíbe.
   O vão é pintado, não fechado: nada de margem negativa: puxar a seção para
   cima mudaria a geometria de toda a página por causa de um problema de cor. */
body.mel-pagina-bee #modelos::before{
  content:""; position:absolute; left:0; right:0; top:-10px; height:10px;
  background:${P.papel}; pointer-events:none;
}
body.mel-pagina-bee #modelos .mel-eyebrow{ color:#8A6A12 }   /* 4,73:1 no papel */
body.mel-pagina-bee #modelos .mel-tit{ color:${P.carvao} }
body.mel-pagina-bee #modelos .mel-nota{ color:#6B6254 }
body.mel-pagina-bee #modelos .mel-cor{
  background:#F3EDE0;
  box-shadow:inset 0 0 0 1px ${D.papelBorda};
}
body.mel-pagina-bee #modelos .mel-cor-img{ background:${P.papel} }
body.mel-pagina-bee #modelos .mel-cor-nome{ color:${P.carvao} }
body.mel-pagina-bee #modelos .mel-preco-linha{ color:#6B6254 }
body.mel-pagina-bee #modelos .mel-preco-linha strong{ color:${P.carvao} }
/* O botão de mel volta a ser o certo aqui: o fundo é papel, não amarelo, e
   este É o passo de compra. Carvão sobre mel dá 8,25:1. */
body.mel-pagina-bee #modelos .mel-bt-mel{ background:${P.mel}; color:${P.carvao} }

/* Foco de teclado nas zonas claras.
   A regra global desenha o anel em mel, calibrado contra o carvão (9,67:1 na
   auditoria). Sobre papel o mel dá 1,88:1 e o anel praticamente some. Nas
   duas zonas claras da Bee ele passa a carvão. */
body.mel-pagina-bee .mel-bh a:focus-visible,
body.mel-pagina-bee .mel-bh button:focus-visible,
body.mel-pagina-bee #modelos a:focus-visible,
body.mel-pagina-bee #modelos button:focus-visible{
  outline:2px solid ${P.carvao}; outline-offset:3px;
}

/* A pele clara da barra saiu junto com a barra, removida a pedido em 13/08.
   O porquê está em tools/bee.js, onde a barra morava. */

/* ---- A NAVBAR NA /bee, 13/08/2026 à noite ----
   CAUSA MEDIDA, não impressão: a navbar do template é position:fixed com 81px
   de altura, portanto FORA DO FLUXO. Nas páginas internas o primeiro bloco
   começa em y=0 — na /bee, section.mel-bh (o hero) —, então os 81px de cima do
   hero ficam ATRÁS da faixa. Na home isso não acontece porque o stack começa em
   y=844, depois do vídeo. Na /polen acontece igual e ninguém vê: carvão sobre
   carvão. Na /bee, cujo hero é papel, a mesma faixa vira uma tarja escura
   atravessando uma composição clara — o mesmo defeito da costura de 10px, em
   escala maior.

   Não se resolve com z-index: não é ordem de pilha, é fluxo. Empurrar o hero
   para baixo (padding-top de 81px) resolveria a sobreposição e criaria outra
   coisa: uma tira de papel morta sob a faixa e um hero 81px mais alto, longe da
   dobra medida. O que a página quer é a faixa fazendo parte do hero.

   Então a faixa veste a pele da página, escopada em body.mel-pagina-bee: papel
   no fundo, carvão no desenho. Os 81px deixam de ser tarja e passam a ser o
   alto do hero. Nada global muda, e as outras oito páginas continuam de carvão.

   O que precisa mudar de cor junto, e por quê:
     - o container fixo E a nav: o fundo carvão vem do token no atributo style
       da <nav>, então a folha só vence com !important;
     - as três barrinhas do hambúrguer e o SVG da marca, que são papel;
     - o botão de perfil, que herda color e já acompanha;
     - o anel de foco, que em mel sobre papel dá 1,88:1.

   🔴 SÃO DUAS <nav>, COM NOMES DIFERENTES, e é exatamente aqui que a primeira
   tentativa desta correção falhou. O template traz
   data-framer-name="Navigation Color" (desktop) e "Navigation Mobile Coor"
   (mobile, com o nome truncado assim mesmo no export). Escopar pela primeira
   deixou o mobile de fora — e como as barrinhas do ícone JÁ tinham virado
   carvão, o resultado foi pior que o defeito original: faixa carvão com ícone
   carvão, hambúrguer e perfil invisíveis em 390px, ainda clicáveis. Um QA que
   só medisse clique passaria; foi a captura que mostrou.
   Por isso o seletor casa pelo PREFIXO do nome, não pelo nome inteiro. */
body.mel-pagina-bee nav[data-framer-name^="Navigation"],
body.mel-pagina-bee .framer-1gfj5qd-container{
  background-color:${P.papel} !important;
}
body.mel-pagina-bee nav[data-framer-name^="Navigation"]{
  --border-color:${D.papelBorda};
}
/* As barrinhas do ícone: o template as pinta por token no style inline. */
body.mel-pagina-bee [data-framer-name="Meniu"] [data-framer-name="1"],
body.mel-pagina-bee [data-framer-name="Meniu"] [data-framer-name="2"],
body.mel-pagina-bee [data-framer-name="Meniu"] [data-framer-name="3"]{
  background-color:${P.carvao} !important;
}
/* O logo é um <symbol> só, referenciado por cinco <use> na mesma página. Ele
   pinta em currentColor (tools/logo.js), então basta trocar a cor AQUI, na
   instância da navbar: o rodapé continua papel sobre carvão. */
body.mel-pagina-bee nav [data-framer-name="MELCAM"]{ color:${P.carvao} }
body.mel-pagina-bee .mel-perfil-bt{ color:${P.carvao} }
body.mel-pagina-bee .mel-perfil-bt:hover{ color:#8A6A12; background:rgba(34,30,23,.06) }
body.mel-pagina-bee .mel-perfil-bt[aria-expanded="true"]{ color:#8A6A12 }
/* O selo de mel some contra papel: sobre a faixa clara ele é carvão. */
body.mel-pagina-bee .mel-perfil-selo{
  background:${P.carvao}; color:${P.papel}; box-shadow:0 0 0 2px ${P.papel};
}
/* Os links da barra nasceram em papel (14/08). Sobre a faixa clara da /bee
   isso é papel sobre papel: sumiriam. Mesma gramática do botão de conta logo
   acima — carvão em repouso, #8A6A12 no realce, que é o eyebrow desta página e
   dá 4,73:1 sobre papel. A página atual não perde o aria-current: só troca de
   cor junto. */
body.mel-pagina-bee .mel-nav-link{ color:${P.carvao} }
body.mel-pagina-bee .mel-nav-link:hover,
body.mel-pagina-bee .mel-nav-link:focus-visible{ color:#8A6A12; background:rgba(34,30,23,.06) }
body.mel-pagina-bee .mel-nav-link[aria-current="page"]{ color:#8A6A12 }
body.mel-pagina-bee nav a:focus-visible,
body.mel-pagina-bee nav button:focus-visible,
body.mel-pagina-bee nav [tabindex]:focus-visible{
  outline:2px solid ${P.carvao}; outline-offset:3px;
}
`;
}

// ---------------------------------------------------------------------------
function js() {
  return `
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
`;
}

module.exports = { css, js };
