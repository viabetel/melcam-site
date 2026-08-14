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
//   favoPalco — o mesmo favo, agora sobre a superfície clara dos palcos de
//              modelo. Não pode ser o melTrama: sobre #F3EDE0 o mel vira um
//              segundo amarelo brigando com a câmera amarela em cima dele.
//              É o próprio papel escurecido, tom sobre tom, igual à lógica do
//              melTrama — só que do outro lado da paleta.
const D = {
  melTrama: '#DE9E04',
  favoPalco: '#E4D8C1',
  sombra: 'rgba(74,52,10,.26)',
  sombraCurta: 'rgba(74,52,10,.16)',
  papelBorda: 'rgba(34,30,23,.12)',
};

// O mel da marca em componentes, para poder entrar com alfa nos degraus do
// cenário sem virar uma segunda fonte de verdade para a cor. Derivado do
// próprio P.mel: se a paleta mudar, o gradiente muda junto.
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(',');
const MEL_RGB = rgb(P.mel);
// Um degrau do cenário: mel da marca com alfa. Baixar o alfa do mel é o que
// produz o "amarelo menos saturado e quente" pedido, em vez de inventar um
// segundo amarelo — sobre o papel, .135 dá rgb(250,238,212), um creme.
const cena = (a) => 'rgba(' + MEL_RGB + ',' + a + ')';

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
// Virou função em 14/08 para os palcos dos modelos poderem usar o MESMO
// desenho noutro tom. O caminho é um só: duplicar a string de path para trocar
// uma cor seria criar duas fontes de verdade para o mesmo grafismo.
const favo = (traco, espessura) =>
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='126'"
  + " height='72.75' viewBox='0 0 126 72.75'%3E%3Cpath d='M42 0L21 36.37L-21 36.37L-42 0"
  + "L-21 -36.37L21 -36.37ZM168 0L147 36.37L105 36.37L84 0L105 -36.37L147 -36.37ZM42 72.75"
  + "L21 109.12L-21 109.12L-42 72.75L-21 36.38L21 36.38ZM168 72.75L147 109.12L105 109.12"
  + "L84 72.75L105 36.38L147 36.38ZM105 36.37L84 72.74L42 72.74L21 36.37L42 0L84 0Z'"
  + " fill='none' stroke='%23" + traco.slice(1) + "' stroke-width='" + espessura + "'/%3E%3C/svg%3E";

const FAVO = favo(D.melTrama, 2);
// Mais fino no palco: o traço de 2px foi calibrado para o plano de mel do hero,
// que é grande e saturado. Sobre a superfície clara ele lê como grade; em 1,5
// volta a ser textura, que é o papel dele aqui.
const FAVO_PALCO = favo(D.favoPalco, 1.5);

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
/* ---------- O CENÁRIO ÚNICO: hero + as duas Bee Cam ----------
   14/08/2026. O pedido é uma transição contínua que COMEÇA no hero, atravessa
   a primeira Bee Cam e termina suavemente depois da segunda, sem parecer três
   fundos diferentes emendados.

   POR QUE NÃO TEM WRAPPER. Um <div> em volta dos três seria o caminho direto,
   e ele custaria caro aqui: o hero mede a própria posição para sangrar até a
   borda da janela (sangrar(), no js() abaixo) e as três seções são filhas
   diretas do stack do template — envelopá-las troca o pai de todas e mexe na
   geometria que o QA já mediu. Então o gradiente vai em background-image de
   cada bloco, que é a outra forma que o pedido autoriza. Não é pseudo-elemento
   por um motivo prático: em background-image não há camada nova, nada de
   z-index, nada por cima de texto e nada que possa cobrir a navbar.

   COMO A CONTINUIDADE É GARANTIDA sem saber a altura de ninguém: as pontas se
   encontram. O degrau em que um bloco TERMINA é o mesmo em que o próximo
   COMEÇA, então a emenda é contínua em cor mesmo quando as alturas mudam com a
   tela. As inclinações também foram aproximadas nas fronteiras, para não sobrar
   quina visível:

     hero        --mel-cena-0 (nada) ate 58%  ->  --mel-cena-1
     1a Bee Cam  --mel-cena-1  ->  --mel-cena-2 (52%)  ->  --mel-cena-3
     2a Bee Cam  --mel-cena-3  ->  quase parado ate 22%  ->  volta a --mel-cena-0

   O pico fica exatamente na costura entre as duas Bee Cam, e dos dois lados
   dela a curva está quase plana — é por isso que a fronteira mais arriscada da
   página não vira faixa. Depois da segunda câmera a descida é escalonada em
   quatro paradas, que é a "transição gradual para o fundo normal" pedida: em
   #destaques o fundo já é o carvão do editorial e o alfa aqui chegou a zero.

   O hero não é tocado nos primeiros 58% de propósito: ali estão a manchete, o
   plano de mel e as duas câmeras, e o pedido é não mexer na identidade dele. */
body.mel-pagina-bee{
  --mel-cena-0:${cena(0)};
  --mel-cena-1:${cena('.055')};
  --mel-cena-2:${cena('.105')};
  --mel-cena-3:${cena('.135')};
  --mel-cena-4:${cena('.128')};
  --mel-cena-5:${cena('.09')};
  --mel-cena-6:${cena('.035')};
}

.mel-bh{
  position:relative; isolation:isolate; overflow:hidden;
  background-color:${P.papel};
  background-image:linear-gradient(to bottom,
    var(--mel-cena-0) 0%, var(--mel-cena-0) 58%, var(--mel-cena-1) 100%);
  /* A DOBRA É DO HERO — 14/08/2026, corrigido.
     Estava clamp(520px,80svh,820px), e os 80svh eram DE PROPÓSITO: a ideia era
     deixar a próxima seção (a escolha da cor, destino do CTA) espiar o
     bastante para o eyebrow dela aparecer. Medido depois, em seis janelas, o
     que espiava era 144 a 250px — e em 1440x900 essa faixa é papel vazio, não
     o eyebrow: ele caía em y876, fora da dobra. Ou seja, a aposta não pagou em
     nenhuma janela de notebook, e a de 1920x1080, a única em que o eyebrow
     entrava inteiro, entregava 250px de seção seguinte por cima da cena.

     100svh, então: o hero termina exatamente onde a tela termina, e a próxima
     seção começa 10px depois, fora da dobra. Não é só sobre o que some — o
     hero é flex com align-items:center, então crescer 180px BAIXA a
     composição: em 1440x900 a manchete sai de y250 para y340 e o vazio de
     papel que sobrava embaixo da coluna de texto some, porque a forma de mel
     (absoluta, presa ao topo e à base) estica junto.

     Sem teto em px de propósito. O clamp antigo travava em 820, então de
     1080 de altura para cima o hero parava de acompanhar e a próxima seção
     voltava a espiar — era o que acontecia em 1920x1080 e em 810x1080. O piso
     de 560px fica no max() para janela baixa (notebook em 1366x600, janela
     recortada): abaixo disso a coluna de texto não cabe centrada. */
  min-height:max(560px,100svh);
  display:flex; align-items:center;
  /* LARGURA CERTA JÁ NO PRIMEIRO PAINT — 14/08/2026.
     Até aqui a largura cheia vinha SÓ do JS (sangrar(), em interacoes.js).
     Medido com tools/qa-hero-primeiro-paint.js: em 768 o hero pintava em
     "55,0 659x721" e só virava "0,0 768x721" aos 287 ms — o hero claro
     encaixotado, com faixas escuras dos dois lados, antes do layout definitivo.
     width:100% resolve contra a caixa de conteúdo do pai — o
     <header class="framer-vrbx7h">, o stack da página — que já tem a largura da
     janela até 1440. NÃO é 100vw: 100vw inclui a barra de rolagem e criaria
     transbordo horizontal, que foi o motivo de a sangria ter ido para o JS.
     O sangrar() FICA e não foi tocado: continua respondendo a resize e cobrindo
     janela acima de 1440, onde o stack para em max-width:1440px. */
  width:100%;
}

/* --- o palco ---
   Faixa direita do hero. Não pinta nada e não recebe clique: existe para ser
   o ÚNICO sistema de coordenadas do plano de mel e do vídeo. Enquanto
   a forma ficou presa ao hero e as câmeras ao palco, o retrato media as duas
   contra caixas diferentes e o plano amarelo saía com 582px de altura onde
   cabiam 190.

   SEM z-index AQUI — 14/08/2026, e é decisão de mistura, não de pintura.
   O vídeo entra em mix-blend-mode:darken (ver .mel-bh-video). Mistura só
   enxerga o que está pintado DENTRO do grupo isolado mais próximo, e todo
   elemento que cria contexto de empilhamento isola. Com z-index:2 o palco
   virava esse grupo: o vídeo misturaria só com a forma de mel e o fundo de
   papel do hero ficaria de fora — ou seja, o retângulo branco do quadro
   voltaria a aparecer sobre o papel. Sem z-index o grupo passa a ser o
   próprio .mel-bh, que tem isolation:isolate e cujo background-color é papel.
   A ordem de pintura não muda: o texto (.mel-bh-in) é z-index:3 e continua
   por cima de tudo que mora aqui. */
.mel-bh-palco{
  position:absolute;
  /* A BASE NÃO É MAIS 0 — 14/08/2026. A faixa reservada embaixo é para a
     legenda das cores, que é absoluta aqui dentro em bottom:2%.
     Onde o quadro do vídeo é limitado pela LARGURA — 1440x900, 1280x800 — ele
     nem chega perto da base e isto não muda um pixel: a câmera continua
     terminando em y742 e y660. Onde ele é limitado pela ALTURA a conta aperta,
     e foi medido: em 1024x768 o corpo da câmera ia até y734 e a legenda
     começava em y739, cinco pixels — sem contar a sombra assada no arquivo,
     que desce mais uns dez. Com a faixa reservada a câmera para em y697 e
     sobram 42px de papel.
     Em vh e não em px porque o que aperta é janela baixa, e é a altura que
     decide se o vídeo cabe pela altura ou pela largura. */
  inset:0 0 clamp(40px,5vh,60px) 38%;
  pointer-events:none;
}

/* --- camada 0: o grande plano de mel ---
   Sangra no topo e na direita; o canto inferior esquerdo é um raio grande, e
   é ele que faz a divisão entre papel e mel ser curva em vez de reta. A base
   fica ACIMA do fim do hero de propósito: assim o hero termina em papel na
   largura inteira e emenda sem degrau na seção de modelos, que também é
   clara.

   A ALTURA MUDOU EM 14/08/2026 — de bottom:clamp(34px,6vh,88px), que descia
   quase até o fim do hero, para a faixa de cima. É consequência direta da
   mistura darken do vídeo, e o número saiu de medição:

     A Bee amarela NÃO PODE cair sobre o plano de mel. Darken pinta o menor
     valor canal a canal, e o corpo da câmera (205,186,41) é mais CLARO que o
     mel (242,169,0) no verde: o traço do favo atravessaria a peça e ela leria
     como vidro fumê. Foi visto na primeira montagem, não suposto.

     Onde a câmera anda, ao longo dos 86 quadros: y de 40,1% a 95,7% do quadro
     do vídeo, x de 5,8% a 93,8% (varredura dos quadros, pixels amarelos). Ou
     seja: os 40% de cima do quadro são SÓ ALÇA, e alça é preta — sobre mel o
     darken devolve preto, que é exatamente o que se quer.

   Daí a forma virar a faixa de cima: o mel fica onde só passa a alça, a Bee
   fica sobre o papel, e a alça atravessa o plano amarelo como se a câmera
   estivesse pendurada nele. O raio grande do canto continua sendo a curva que
   divide papel e mel — só que agora ele é a barriga da faixa.

   O TETO DE ALTURA É DUPLO porque a altura do vídeo também é:
     min(36%, 19vw). Quando a janela é alta, quem manda no vídeo é a altura do
     hero e a câmera começa em 40,1% dele — 36% passa por baixo com folga.
     Quando a janela é larga, quem manda é o teto de largura do vídeo (78% do
     palco, que é 62% do hero): a altura do quadro vira 0,78 x 0,62 x 1,1146 =
     53,9% da largura da janela, e a câmera começa em 40,1% disso, ou 21,6vw.
     19vw fica 2,6vw abaixo — em 1440 são 274px contra 311px medidos. */
.mel-bh-forma{
  position:absolute; z-index:0; top:0; right:0;
  height:min(36%,19vw);
  width:87%;
  border-radius:0 0 0 clamp(90px,13vw,220px);
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

/* --- camada 1: o vídeo da Bee ---
   14/08/2026. Entrou no lugar dos dois packshots. O arquivo do cliente é a Bee
   amarela pendurada pela alça, balançando e girando sobre fundo claro.

   O TRUQUE QUE FAZ O QUADRO SUMIR — e é medido, não estimado.
   O fundo do filme original é UM valor só, rgb(250,245,235), constante nos 138
   quadros: varredura pixel a pixel, mínimo igual ao máximo. Isso permitiu
   trocá-lo por BRANCO PURO na conversão (ver progresso.md), e branco puro é
   mais claro que tudo que existe atrás dele neste hero:
     papel     ${P.papel}  = 251,247,238
     mel       ${P.mel}  = 242,169,0
     o degrau mais escuro do cenário ≈ 250,243,225
   Com mix-blend-mode:darken o navegador pinta, canal a canal, o MENOR entre o
   vídeo e o fundo. Onde o quadro é branco, o fundo vence sempre — o retângulo
   não existe em pixel nenhum, sobre papel, sobre o plano de mel e sobre o
   gradiente do cenário. Não é fade de borda nem máscara: é aritmética, e por
   isso não tem emenda para procurar.

   E é por isso que NÃO há filter aqui. A sombra de contato que os packshots
   tinham em drop-shadow foi ASSADA NO ARQUIVO, quadro a quadro, a partir do
   alfa da própria peça (marrom ${D.sombra.replace('rgba(', '').replace(')', '')} a 30%, deslocada e
   borrada em ffmpeg). Dois motivos: drop-shadow num <video> desenha a sombra do
   RETÂNGULO, não da câmera; e filter cria contexto de empilhamento, que
   isolaria a mistura e traria o quadro de volta.
   A sombra continua fazendo o trabalho medido em 13/08: a luminância da Bee
   amarela contra o mel dá 1,02:1, então o que separa peça de fundo não é cor,
   é sombra.

   Nada de object-fit:cover: a alça e o mosquetão são a linha de movimento da
   cena e cortar qualquer um dos dois é perder o assunto. Sempre contain. */
.mel-bh-video{
  position:absolute; z-index:1; display:block;
  /* Preso ao TOPO do hero: a alça sai de quadro por cima, atrás da navbar
     opaca, e a Bee lê como pendurada em algo fora da tela. Ancorar pelo meio
     ou pela base deixaria a alça cortada no ar. */
  top:0; right:2%;
  height:100%; width:auto;
  /* O teto de largura é o que mantém distância da coluna de texto: em 1440 o
     palco tem 893px e 78% dele são 696, o que deixa ~140px de respiro entre a
     última linha do parágrafo e a lateral da câmera. Quando o teto morde, o
     contain reduz o conteúdo dentro da caixa em vez de esticá-lo, e o
     object-position 50% 0 mantém a alça encostada no topo. */
  max-width:78%;
  object-fit:contain; object-position:50% 0;
  mix-blend-mode:darken;
  /* Nada de clique, nada de toque: no celular o toque num <video> é o que abre
     o player em tela cheia. */
  pointer-events:none;
  /* A entrada acompanha a da forma de mel, sem escala: escalar vídeo custa
     recomposição a cada quadro e a peça já entra se movendo sozinha. */
  animation:melBhVideo 900ms cubic-bezier(.22,.61,.36,1) 160ms both;
}
@keyframes melBhVideo{
  from{ opacity:0; transform:translateY(-18px) }
  to  { opacity:1; transform:none }
}

/* As duas indicações de cor, junto do produto.
   NÃO é seletor: o seletor funcional são os dois cards de "Escolha sua Bee",
   logo abaixo. Aqui é legenda, e por isso o nome vem escrito — a informação
   não pode viajar só na cor da bolinha. */
.mel-bh-cores{
  /* top:calc(100% + …) e não bottom, porque ela é absoluta DENTRO do palco e
     ali "embaixo" é onde a câmera termina. Com bottom:2% ela encolhia junto
     com o palco e a faixa reservada acima não adiantava nada — as duas coisas
     andavam juntas. Assim a legenda cai na faixa de papel logo abaixo do
     palco, que existe só para ela. */
  position:absolute; z-index:3; right:6%; top:calc(100% + 12px);
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

/* --- tablet: menos sobreposição, a Bee ainda inteira --- */
@media (max-width:1024px){
  .mel-bh-copy{ max-width:min(52%,24rem) }
  .mel-bh-tit{ font-size:clamp(1.9rem,4.4vw,2.7rem) }
  .mel-bh-palco{ inset:0 0 clamp(40px,5vh,60px) 30% }
  .mel-bh-forma{ width:90%; border-radius:0 0 0 clamp(120px,20vw,220px) }
  /* O palco aqui é mais estreito em px do que no desktop, e a janela costuma
     ser mais alta que larga: com o teto de 78% a Bee encolhia demais. 96%
     devolve o tamanho e o contain continua garantindo que nada seja cortado. */
  .mel-bh-video{ right:0; max-width:96% }
}

/* --- retrato: uma coluna, texto primeiro ---
   Texto antes do produto porque a manchete é o que explica a página, e no
   celular a primeira tela é curta. Duas imagens, as mesmas duas — nenhuma
   camada decorativa a mais. O plano de mel vira uma faixa embaixo do texto,
   com o mesmo canto arredondado, e as Bees se assentam nela sem corte.

   A CONDIÇÃO DEIXOU DE SER SÓ LARGURA — 14/08/2026, e é consequência do vídeo.
   Era "max-width:809.98px". Medido em 810x1080 (tablet em pé, que é o formato
   do iPad Air e do Pro de 11"), a sobreposição do desktop desmoronava: câmera
   presa no alto e QUINHENTOS pixels de papel morto embaixo dela.

   A causa é aritmética e não tem conserto dentro daquele layout. Ali o quadro
   do vídeo é limitado pela LARGURA, não pela altura: o palco é 70% da janela,
   o teto do vídeo é 96% dele, e a razão do recorte (0,897) fecha em 0,749 x
   largura de altura possível — 607px numa janela de 1080. O produto não tem
   como preencher a dobra, então o vazio é inevitável; a única escolha é onde
   ele cai. Sobreposto, cai todo no rodapé. Em coluna, ele se reparte entre
   texto e produto, que é o que a régua do retrato já resolve.

   "orientation:portrait" e não mais largura sozinha porque o defeito é de
   PROPORÇÃO. Em 1024x768 — o mesmo tablet deitado — a sobreposição funciona e
   continua valendo; é só a janela em pé que precisa da coluna.

   NOTA sobre o arquivo de vídeo: o <script> do tools/bee.js continua trocando
   para o recorte de retrato em 809.98px, então de 810 a 1024 em pé a coluna
   usa o arquivo de DESKTOP. É de propósito e não é descuido — os dois saem do
   mesmo recorte, com a mesma razão, e o de desktop tem 960px de largura para
   um render de cerca de 480. O de retrato tem 576 e ficaria no limite. */
@media (max-width:809.98px), (max-width:1024px) and (orientation:portrait){
  .mel-bh{
    /* A DOBRA TAMBÉM É DO HERO AQUI — 14/08/2026.
       Era display:block com min-height:0, ou seja, altura do conteúdo: 674px
       medidos em 390x844, e os 170px que sobravam mostravam a foto da Bee da
       seção seguinte antes de qualquer rolagem. Mesmo defeito do desktop.

       Coluna flex com space-between, e não block com min-height: com block o
       conteúdo ficaria colado no topo e o que cresceria seria um vazio de
       papel no rodapé do hero, que é trocar um defeito por outro. Assim o
       texto fica no alto, o palco assenta na base da tela e o respiro fica
       entre os dois, que é onde ele serve para alguma coisa.
       A ordem visual não muda: o DOM já é texto e depois palco. */
    display:flex; flex-direction:column; justify-content:space-between;
    /* align-items volta a stretch: o hero herda center do desktop, e em coluna
       o center passa a ser HORIZONTAL — encolheria o texto e o palco para a
       largura do conteúdo em vez da largura da tela. */
    align-items:stretch;
    min-height:max(560px,100svh);
    /* A navbar tem 81px e fica POR CIMA do topo da página. Com padding menor
       que isso o eyebrow entra debaixo dela — foi o defeito medido na /polen
       em 390.

       Os 30px embaixo entraram em 14/08/2026 com o vídeo, e são para a
       legenda das cores. Ela é absoluta no hero (bottom:2px, ou seja y828 em
       390x844) e o corpo da câmera desce até y830 no quadro mais baixo dos
       86 — encostavam. Como o hero é coluna com space-between, padding
       embaixo sobe o palco inteiro: a câmera passa a terminar perto de y800
       e sobram cerca de 18px de papel até a legenda, já contando a sombra
       assada no arquivo. Encolher o palco resolveria a colisão do mesmo
       jeito, mas custaria tamanho de produto na única tela em que ele é o
       assunto. */
    padding:104px 0 30px;
  }
  .mel-bh-in{
    padding:0 20px clamp(20px,5vw,30px);
    /* O texto toma a altura que sobra e se centra DENTRO dela. Sem isto o
       space-between do hero joga todo o excedente num vão único entre a
       última linha de apoio e as câmeras — medido em 390x844: 170px de papel
       vazio no meio do hero, que é pior do que o defeito que a mudança veio
       corrigir. Assim a sobra se divide acima e abaixo do texto e o hero
       respira em vez de abrir um buraco. */
    flex:1 1 auto; display:flex; flex-direction:column; justify-content:center;
  }
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
    /* 14/08/2026: subiu de clamp(226px,58vw,300px). O palco era dimensionado
       para dois packshots deitados; o vídeo é uma peça em pé — câmera mais
       alça — e naquela altura a Bee saía com 175px de largura em 390, pequena
       demais para ser o assunto da tela. Medido em 390x844: com 320px de palco
       a câmera fica com 233px (60% da tela) e ainda sobram 420px para o texto,
       que precisa de 330.

       O "min()" com 50svh entrou junto com o tablet em pé. Só 82vw entregaria
       430px de palco numa janela de 810 — câmera de 386px, 48% da tela, em
       vez dos 74% que ela ocupa no celular, e o produto deixaria de ser o
       assunto justamente onde há mais espaço. Com metade da dobra o palco vai
       a 540px em 810x1080 e a câmera volta a 484px, 60% da largura. Abaixo de
       cerca de 640px de altura quem manda continua sendo o 82vw, ou seja, no
       celular NADA muda: 320px em 390x844, o mesmo de antes. O teto subiu para
       560px pelo mesmo motivo, e ele existe para a janela muito alta não comer
       a altura de que o texto precisa. */
    height:clamp(300px,min(82vw,50svh),560px);
    /* flex:0 0 auto porque o hero virou coluna flex: sem isso o palco seria
       esticado pelo espaço que sobra e a altura em clamp() — que é a que
       mantém as duas Bees na proporção do recorte — deixaria de valer. */
    flex:0 0 auto;
  }
  /* A FAIXA DE MEL TAMBÉM VIROU O BLOCO DE CIMA AQUI — 14/08/2026.
     Era bottom:0; height:80%, herança dos dois packshots deitados que
     assentavam nela. Com o vídeo isso virou defeito, e é o MESMO do desktop:
     medido em 390x844, o mel ia de y588 a y844 e o corpo da câmera de y652 a
     y830 — a peça inteira caía sobre o amarelo e o darken devolvia vidro fumê,
     porque o corpo (205,186,41) é mais claro que o mel (242,169,0) no verde.

     A régua é a mesma da regra do desktop e vale aqui sem conversão, porque no
     retrato o quadro do vídeo tem EXATAMENTE a altura do palco: o vídeo é
     height:100% com width:auto, e a razão do recorte (576x642) sempre deixa a
     largura sobrando — 287px de quadro em 390px de palco, 386 em 809. Ou seja,
     o corpo começa nos mesmos 40,1% do palco: 128px em 390x844. 36% dá 115px e
     passa por baixo com 13px de folga.

     Os DOIS cantos da esquerda são arredondados, e isso é diferença de posição,
     não de gosto: no desktop a faixa sangra pelo topo do hero e só o canto de
     baixo aparece. Aqui o topo dela cai no meio da página, logo abaixo do
     texto, e um corte reto atravessando a tela ali seria uma emenda dura no
     lugar da curva que divide papel e mel no resto do site. Sangrando só pela
     direita, com as duas curvas, a faixa lê como uma aba de mel entrando pela
     borda — e a alça atravessa ela como no desktop.

     O resto do hero fica em PAPEL, que é o que o desktop já fazia: a emenda
     com a seção de modelos, também clara, continua sem degrau. */
  .mel-bh-forma{
    top:0; bottom:auto; right:0; height:36%;
    width:min(88%,620px);
    border-radius:clamp(56px,14vw,110px) 0 0 clamp(56px,14vw,110px);
  }
  /* O VÍDEO NO RETRATO — 14/08/2026.
     Aqui o palco não é sobreposição: é bloco no fluxo, embaixo do texto. Então
     a alça NÃO tem por onde sair de quadro; ela começaria cortada no ar. Quem
     resolve é a máscara de topo logo abaixo, e não um corte: os primeiros 14%
     do quadro desvanecem, e a alça entra na cena em vez de aparecer decepada.
     Os 14% do quadro são 45px em 390x844, e a faixa de mel tem 115px: a
     máscara inteira acontece DENTRO do amarelo, então a alça nasce da faixa —
     o que é melhor do que o papel, porque dá a ela de onde estar pendurada.
     O enquadramento vem antes do preenchimento, como pedido: contain, largura
     livre e altura do palco. Nada de cover — em 390px o cover comeria a alça
     inteira e metade do mosquetão. */
  .mel-bh-video{
    top:0; right:auto; left:50%; transform:translateX(-50%);
    height:100%; width:auto; max-width:100%;
    object-position:50% 0;
    -webkit-mask-image:linear-gradient(to bottom,
      transparent 0, rgba(0,0,0,.55) 7%, #000 14%);
    mask-image:linear-gradient(to bottom,
      transparent 0, rgba(0,0,0,.55) 7%, #000 14%);
    animation:melBhVideoRetrato 900ms cubic-bezier(.22,.61,.36,1) 160ms both;
  }
  /* A entrada do retrato não pode usar melBhVideo: aquele keyframe termina em
     transform:none e apagaria o translateX(-50%) que centra a peça. */
  @keyframes melBhVideoRetrato{
    from{ opacity:0; transform:translate(-50%,-14px) }
    to  { opacity:1; transform:translateX(-50%) }
  }
  /* A legenda sai DE DENTRO do palco e vai para os 30px de papel logo abaixo
     dele — top:100% e não bottom, porque ela é absoluta no palco, e no palco
     "embaixo" é onde a câmera termina. Com bottom:2px o corpo da peça
     (y800 no quadro mais baixo) encostava nela (y798). Aqui a legenda fica em
     papel limpo, alinhada com a margem do texto acima, e a única coisa que
     divide a linha de base do hero com ela é a sombra assada no arquivo. */
  .mel-bh-cores{ right:auto; left:20px; top:calc(100% + 9px) }
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
     O TEXTO E O CTA CONTINUAM INTEIROS — o que sai é movimento, não conteúdo. */
  .mel-bh-forma,
  .mel-bh-cores,
  .mel-bh-eyebrow, .mel-bh-tit, .mel-bh-txt, .mel-bh-cta, .mel-bh-apoio{
    animation:none;
  }
  /* O vídeo fica no lugar, do mesmo tamanho, exibindo só o poster: quem
     escreve (ou deixa de escrever) as <source> é o <script> síncrono do
     tools/bee.js, que mede a mesma preferência ANTES de o navegador buscar
     qualquer byte. Aqui só cai a animação de entrada. O translateX do retrato
     é posição, não movimento, e por isso é reposto na regra própria. */
  .mel-bh-video{ animation:none }
  @media (max-width:809.98px), (max-width:1024px) and (orientation:portrait){
    .mel-bh-video{ transform:translateX(-50%) }
  }
}

/* ============ /bee — a página clara continua na escolha da cor ============
   O pedido é passagem contínua: o hero termina em papel, então a seção
   seguinte não pode abrir em carvão. Só a faixa de MODELOS muda de pele; de
   "Destaques" em diante a página volta ao editorial escuro do site, e essa
   volta é uma divisão declarada, não um acidente.

   Tudo aqui é escopado em body.mel-pagina-bee: a /polen, a home e as demais
   internas não enxergam uma linha disto.

   14/08/2026 — a faixa clara passou a ser DUAS seções, uma por Bee, e o
   seletor mudou de #modelos para .mel-bee-mod. Motivo: com duas seções o id
   deixa de descrever o conjunto, e regra presa a id não alcança a segunda.
   Todo o bloco continua escopado em body.mel-pagina-bee. */
body.mel-pagina-bee .mel-bee-mod{
  position:relative;
  background-color:${P.papel};
  padding-top:clamp(40px,5vw,72px);
  padding-bottom:clamp(44px,5.5vw,80px);
  /* A revelação entra com deslocamento lateral (o palco da segunda seção vem
     de +30px, e a direita dele já encosta na margem). Sem recorte isso vira
     transbordo horizontal por alguns quadros — barra de rolagem que aparece e
     some, que é layout shift com outro nome.
     É "clip" e não "hidden" de propósito, e só no eixo x: hidden criaria um
     container de rolagem e recortaria também o vão de 10px que o ::before
     pinta ACIMA da seção, que é o remendo da costura logo abaixo. */
  overflow-x:clip;
  overflow-y:visible;
}
/* A primeira seção abre logo abaixo do hero e não repete o respiro dele.
   14/08 — o motivo mudou, o valor não. Este padding curto existia para o
   eyebrow de "escolha sua Bee" espiar acima da dobra em 1440x900. Aquele bloco
   saiu a pedido, e o valor continua certo por outra razão: agora quem espia é
   a própria Bee Cam. Medido depois da remoção, em 1440x900: o hero fecha em
   720, a costura come 10 e o palco começa em 782 — 118px de câmera na dobra,
   e nenhuma tira de papel vazio no lugar do bloco removido. */
body.mel-pagina-bee #modelos{ padding-top:clamp(30px,3.6vw,56px) }

/* Os dois trechos do cenário. Ver o cabeçalho "O CENÁRIO ÚNICO", acima. */
body.mel-pagina-bee #modelos{
  background-image:linear-gradient(to bottom,
    var(--mel-cena-1) 0%, var(--mel-cena-2) 52%, var(--mel-cena-3) 100%);
}
body.mel-pagina-bee #bee-branca{
  background-image:linear-gradient(to bottom,
    var(--mel-cena-3) 0%, var(--mel-cena-4) 22%, var(--mel-cena-5) 55%,
    var(--mel-cena-6) 82%, var(--mel-cena-0) 100%);
}
/* A COSTURA DE 10 px — medida, não suposta.
   O stack do template (header.framer-vrbx7h) é flex column com gap:10px e
   fundo carvão. Esse vão existe entre TODAS as seções do site e nunca se viu
   porque os dois lados sempre foram carvão. Entre o hero de papel e esta
   seção de papel ele virou uma linha escura atravessando a página, exatamente
   a "mudança brusca para preto" que o pedido proíbe.
   O vão é pintado, não fechado: nada de margem negativa: puxar a seção para
   cima mudaria a geometria de toda a página por causa de um problema de cor. */
/* AGORA SÃO DUAS COSTURAS, não uma. A de cima da primeira seção (hero/papel
   contra papel) e a que nasceu entre as duas seções novas, que também tem
   papel dos dois lados. Cada .mel-bee-mod pinta o vão ACIMA de si, então as
   duas ficam cobertas pela mesma regra.
   O vão ABAIXO da segunda continua carvão de propósito: ali começa
   "Destaques", e a volta ao editorial escuro é divisão declarada. */
body.mel-pagina-bee .mel-bee-mod::before{
  content:""; position:absolute; left:0; right:0; top:-10px; height:10px;
  background-color:${P.papel}; pointer-events:none;
}
/* E A COSTURA ENTROU NO CENÁRIO JUNTO — 14/08.
   Papel liso nesses 10px passou a ser um defeito novo: entre dois blocos já
   tingidos, uma tira sem tinta lê como risco claro atravessando a página, que
   é a "divisão visível entre as seções" que o pedido proíbe. Cada costura
   recebe o degrau EXATO da fronteira que ela cobre — a de cima do #modelos é a
   base do hero, a de cima do #bee-branca é a base do #modelos —, então ela
   deixa de existir aos olhos. */
body.mel-pagina-bee #modelos::before{
  background-image:linear-gradient(var(--mel-cena-1),var(--mel-cena-1));
}
body.mel-pagina-bee #bee-branca::before{
  background-image:linear-gradient(var(--mel-cena-3),var(--mel-cena-3));
}
/* .mel-eyebrow e .mel-tit dentro de .mel-bee-mod SAÍRAM em 14/08: os únicos
   elementos que casavam eram o eyebrow e o h2 do bloco de topo, removido a
   pedido (ver tools/bee.js). Regra sem alvo é armadilha para quem ler depois.
   .mel-nota fica: é a nota de envio que fecha o par, e ela continua de pé. */
body.mel-pagina-bee .mel-bee-mod .mel-nota{ color:#6B6254 }
/* O botão de mel volta a ser o certo aqui: o fundo é papel, não amarelo, e
   este É o passo de compra. Carvão sobre mel dá 8,25:1. */
body.mel-pagina-bee .mel-bee-mod .mel-bt-mel{ background:${P.mel}; color:${P.carvao} }

/* ---------- as duas seções de modelo — 14/08/2026 ----------
   A COMPOSIÇÃO VEM DA /POLEN, A ARTE NÃO. De lá vieram a divisão em palco e
   coluna de informação, a ordem (nome, descrição, destaques, preço, CTA) e o
   espaço dado ao produto. Nenhuma classe .mel-pr-*, nenhuma cor e nenhuma
   tipografia da Polen atravessou: aquela página é carvão e cinema, esta é
   papel e sol. Tudo aqui nasce das cores e dos grafismos que a Bee já tinha.

   ESPELHAMENTO SEM INVERTER O DOM. Nas duas seções o HTML é palco e depois
   informação. Quem troca os lados no desktop é grid-column, e só nele. Assim o
   celular empilha as duas na mesma ordem — imagem, conteúdo, destaques —, que
   era um requisito explícito: alternar pelo DOM deixaria a segunda seção
   abrindo pelo texto, e a leitura de cima para baixo perderia o ritmo. */
body.mel-pagina-bee .mel-bee-mod-grade{
  display:grid;
  grid-template-columns:minmax(0,1fr);
  gap:clamp(20px,3vw,44px);
  align-items:center;
}
@media (min-width:900px){
  /* O palco fica com a fatia maior: é o produto que manda na composição. */
  body.mel-pagina-bee .mel-bee-mod-grade{
    grid-template-columns:minmax(0,1.08fr) minmax(0,1fr);
    column-gap:clamp(36px,4.5vw,72px);
  }
  body.mel-pagina-bee .mel-bee-mod-palco{ grid-column:1; grid-row:1 }
  body.mel-pagina-bee .mel-bee-mod-info{ grid-column:2; grid-row:1 }
  /* O espelho, e é a única diferença entre as duas seções.
     A PROPORÇÃO VIRA JUNTO, e sem isso não é espelho: com 1.08fr fixo na
     primeira coluna, a seção invertida punha o palco na coluna estreita e as
     duas fotos saíam de tamanhos diferentes — medido, 689px contra 638px. */
  body.mel-pagina-bee .mel-bee-mod-inv .mel-bee-mod-grade{
    grid-template-columns:minmax(0,1fr) minmax(0,1.08fr);
  }
  body.mel-pagina-bee .mel-bee-mod-inv .mel-bee-mod-palco{ grid-column:2 }
  body.mel-pagina-bee .mel-bee-mod-inv .mel-bee-mod-info{ grid-column:1 }
  /* A coluna de texto encosta na borda de dentro nos dois lados: na invertida
     ela fica à esquerda, então o alinhamento à direita é o que mantém a calha
     central igual à da primeira seção. */
  body.mel-pagina-bee .mel-bee-mod-inv .mel-bee-mod-info{ justify-self:end }
}

/* O PALCO. Superfície clara com o favo tom sobre tom — o grafismo é da Bee, o
   mesmo do plano do hero, noutro tom e mais fino. O plano de MEL continua
   exclusivo do hero: repeti-lo aqui tiraria dele a primazia que ele tem. */
body.mel-pagina-bee .mel-bee-mod-palco{
  position:relative;
  display:flex; align-items:center; justify-content:center;
  aspect-ratio:4/3;
  padding:clamp(18px,3vw,42px);
  border-radius:clamp(14px,2vw,24px);
  /* O PALCO PASSOU A SER TRANSLÚCIDO — 14/08, e sem mudar de cor.
     Era #F3EDE0 chapado. Sobre o cenário novo, um retângulo opaco no meio da
     faixa tingida ficaria de fora dela: o gradiente passaria em volta e a
     câmera continuaria sobre um plano frio, que é o oposto de "parte de um
     único cenário".
     rgba(235,227,210,.5) sobre o papel compõe exatamente rgb(243,237,224) —
     o mesmo #F3EDE0 de antes, pixel a pixel, onde não há tinta. Onde há, o
     palco esquenta junto com o resto. Nada de identidade mudou; o que mudou é
     que ele agora deixa o cenário atravessá-lo. */
  background-color:rgba(235,227,210,.5);
  background-image:url("${FAVO_PALCO}");
  background-size:126px 72.75px;
  box-shadow:inset 0 0 0 1px ${D.papelBorda};
  overflow:hidden;
}
/* aspect-ratio no palco + width/height no <img> = a caixa tem altura final
   antes de a foto existir. Zero layout shift, com ou sem cache. */
body.mel-pagina-bee .mel-bee-mod-foto{
  width:100%; height:100%; display:block;
  /* contain, nunca cover: são recortes e cortar a câmera é justamente o que
     não pode acontecer. object-position vem por --pos, no HTML, para cada foto
     poder ser enquadrada por conta própria. */
  object-fit:contain;
  object-position:var(--pos,50% 50%);
  /* A MESMA sombra de contato do hero, verbatim: dois passos, marrom quente
     derivado do carvão, nunca preto puro. */
  filter:drop-shadow(0 20px 26px ${D.sombra}) drop-shadow(0 3px 5px ${D.sombraCurta});
}

/* A COLUNA DE INFORMAÇÃO. */
body.mel-pagina-bee .mel-bee-mod-info{ max-width:46ch }
/* O NOME DA BEE, EM PLACA — 14/08/2026.
   O pedido: amarelo no título e um destaque visual inspirado nos botões e
   etiquetas que a página já tem, parecendo título destacado e NÃO um controle
   clicável.

   POR QUE A PLACA É CARVÃO E A LETRA É MEL, e não o contrário. Amarelo tem que
   ser o TÍTULO, então a letra é que precisa ser mel — e mel sobre papel dá
   1,88:1, ou seja, título ilegível. Sobre carvão o mesmo mel dá 8,25:1,
   medido em tools/qa-bee-cena.js. É também vocabulário próprio da página, não
   importado: o CTA do hero já é carvão com letra clara, e o CTA de compra é o
   inverso exato desta placa — mel com letra carvão.

   COMO ELE DEIXA CLARO QUE NÃO É BOTÃO. Nesta página botão é sempre pílula
   (border-radius:999px em .mel-bt), texto curto em Area, 0,85rem, quase caixa
   alta. A placa é o oposto em cada um desses eixos: raio de cartão — o mesmo
   do palco ao lado —, serifada, 2,15rem, caixa mista. Além disso não tem
   cursor de mão, hover, transição, foco, tabindex nem href: continua sendo o
   <h2> da seção, com o id que o aria-labelledby dela aponta.

   width:fit-content em vez de inline-block: inline-block cria caixa de linha e
   sobra um vão de descendente embaixo, que empurraria o parágrafo. Com
   max-width:100% a placa quebra o texto DENTRO dela quando a coluna aperta, em
   vez de vazar da coluna — que é o que o pedido pede para o celular. */
body.mel-pagina-bee .mel-bee-mod-nome{
  display:block; width:fit-content; max-width:100%;
  margin:0; padding:.3em .62em .34em;
  border-radius:clamp(12px,1.6vw,18px);
  background:${P.carvao}; color:${P.mel};
  box-shadow:0 12px 28px ${D.sombraCurta};
  font-family:"Iowan Old Style",Georgia,serif; font-weight:700;
  font-size:clamp(1.5rem,2.6vw,2.15rem); line-height:1.2; letter-spacing:-.01em;
}
body.mel-pagina-bee .mel-bee-mod-txt{
  /* #5A5245 dá 7,1:1 sobre papel. O #6B6254 das notas é rótulo; isto é leitura
     corrida e pede mais contraste. */
  margin:.85rem 0 0; color:#5A5245;
  font-family:"Area",sans-serif; font-size:clamp(.96rem,1.05vw,1.03rem); line-height:1.62;
}

/* OS DESTAQUES. Lista sem marcador, com o favo reduzido a um losango de mel
   fazendo o papel do bullet — o grafismo da página em escala de detalhe. */
body.mel-pagina-bee .mel-bee-mod-lista{
  list-style:none; margin:clamp(16px,2vw,24px) 0 0; padding:0;
  display:grid; grid-template-columns:repeat(2,minmax(0,1fr));
  gap:.5rem clamp(12px,1.6vw,22px);
}
body.mel-pagina-bee .mel-bee-mod-lista li{
  position:relative; padding-left:1.05rem;
  color:#5A5245; font-family:"Area",sans-serif;
  font-size:clamp(.84rem,.92vw,.9rem); line-height:1.45;
}
body.mel-pagina-bee .mel-bee-mod-lista li::before{
  content:""; position:absolute; left:0; top:.52em;
  width:7px; height:7px; border-radius:1px;
  background:${D.melTrama}; transform:rotate(45deg);
}
@media (max-width:520px){
  /* Duas colunas em 390px espremem "Vídeo Full HD 1080p e 720p" em três
     linhas. Uma coluna respira e mantém a lista escaneável. */
  body.mel-pagina-bee .mel-bee-mod-lista{ grid-template-columns:minmax(0,1fr) }
}

body.mel-pagina-bee .mel-bee-mod-preco{
  margin:clamp(18px,2.2vw,26px) 0 0; color:#6B6254;
  font-family:"Area",sans-serif; font-size:.92rem;
}
body.mel-pagina-bee .mel-bee-mod-preco strong{
  color:${P.carvao}; font-size:1.3rem; font-weight:700; margin-right:.4rem;
}
body.mel-pagina-bee .mel-bee-mod-cta{
  margin-top:clamp(14px,1.8vw,20px);
  min-height:44px; line-height:1.6;
}
/* A nota fecha o PAR, não cada seção: o envio é o mesmo para as duas cores e
   repetir a frase seria dizer a mesma coisa duas vezes na mesma tela. */
body.mel-pagina-bee .mel-bee-mod-nota{
  margin-top:clamp(28px,3.4vw,44px); text-align:center;
}

/* ============ /bee — revelação por rolagem, 14/08/2026 ============
   Entrada sutil das imagens e dos textos conforme entram na viewport. Só na
   /bee: todo seletor daqui exige body.mel-pagina-bee e um data-mel-rev*, que é
   atributo escrito à mão no HTML desta página (tools/bee.js). Nenhuma regra
   pega "section", "img" ou "span" solto, e nenhuma outra rota enxerga isto.

   🔴 html.mel-bee-rev NÃO É DECORAÇÃO — é o portão do fallback.
   A marca no <html> só existe se o <script> síncrono no topo do conteúdo da
   página tiver rodado. Sem JavaScript ela não aparece, nenhuma regra de
   escondido casa e a página inteira fica visível como está hoje. É a lição do
   "hero em branco" do progresso.md aplicada de novo: estado inicial escondido
   que só o JS desfaz é como se perde conteúdo em silêncio.
   E porque o script é síncrono e vem ANTES de qualquer data-mel-rev no
   documento, nenhum desses elementos chega a ser pintado revelado: não há
   piscada nem "versão antiga antes da final" para quem abre a página já com
   parte dela na tela.

   Só transform e opacidade, as duas propriedades que o compositor resolve sem
   recalcular layout. Nada de filtro, nada de clip-path — a escala de .986
   entrega o "muito leve" pedido sem custo de repintura, e como transform não
   ocupa espaço, nenhum destes elementos empurra a página ao entrar. */
html.mel-bee-rev body.mel-pagina-bee [data-mel-rev="esq"],
html.mel-bee-rev body.mel-pagina-bee [data-mel-rev="dir"],
html.mel-bee-rev body.mel-pagina-bee [data-mel-rev="sobe"],
html.mel-bee-rev body.mel-pagina-bee [data-mel-rev="alto"],
html.mel-bee-rev body.mel-pagina-bee [data-mel-rev-passo]{
  opacity:0;
  transition:opacity 620ms cubic-bezier(.22,.61,.36,1),
             transform 760ms cubic-bezier(.22,.61,.36,1);
}
/* A DIREÇÃO ACOMPANHA O LAYOUT nas duas seções de produto: no desktop o palco
   da primeira fica à esquerda e o da segunda à direita, então cada um entra
   pelo lado em que mora. Quem decide é o atributo no HTML, não a ordem. */
html.mel-bee-rev body.mel-pagina-bee [data-mel-rev="esq"]{ transform:translate3d(-30px,0,0) scale(.986) }
html.mel-bee-rev body.mel-pagina-bee [data-mel-rev="dir"]{ transform:translate3d(30px,0,0) scale(.986) }
html.mel-bee-rev body.mel-pagina-bee [data-mel-rev="sobe"]{ transform:translate3d(0,20px,0) }
html.mel-bee-rev body.mel-pagina-bee [data-mel-rev="alto"]{ transform:translate3d(0,26px,0) scale(.99) }
html.mel-bee-rev body.mel-pagina-bee [data-mel-rev-passo]{ transform:translate3d(0,14px,0) }

/* [data-mel-rev="grupo"] não tem estado próprio de propósito: ele é só o alvo
   observado, e quem anima são os filhos em passo. Um bloco de texto que se
   move inteiro E tem os filhos escalonados por dentro anda em dobro. */
html.mel-bee-rev body.mel-pagina-bee [data-mel-rev-passo="1"]{ transition-delay:70ms }
html.mel-bee-rev body.mel-pagina-bee [data-mel-rev-passo="2"]{ transition-delay:150ms }
html.mel-bee-rev body.mel-pagina-bee [data-mel-rev-passo="3"]{ transition-delay:230ms }
html.mel-bee-rev body.mel-pagina-bee [data-mel-rev-passo="4"]{ transition-delay:310ms }

/* O CTA entra SÓ em opacidade, e a lista de transições é explícita.
   .mel-bt tem hover que levanta 1px com transform, e é ele que carrega a
   affordance de "isto clica". Se a revelação mandasse no transform do botão, a
   regra revelada (transform:none, especificidade muito maior) mataria o hover
   depois; e uma transição só de opacidade apagaria o amortecimento do hover.
   Por isso o transform continua com os 200ms de .mel-bt e o atraso do
   escalonamento é aplicado apenas à opacidade, item a item da lista. */
html.mel-bee-rev body.mel-pagina-bee [data-mel-rev-fade]{
  opacity:0;
  transition:opacity 560ms cubic-bezier(.22,.61,.36,1),
             transform 200ms ease, background 200ms ease, color 200ms ease;
  transition-delay:390ms, 0s, 0s, 0s;
}

/* REVELADO É PARA SEMPRE. O atributo é escrito uma vez e o observador larga o
   elemento na mesma linha (ver iniciarRevelarBee), então nada aqui volta ao
   estado inicial — nem rolando de volta, nem parando em cima do limite da
   viewport, nem redimensionando a janela. */
html.mel-bee-rev body.mel-pagina-bee [data-mel-rev][data-mel-visto],
html.mel-bee-rev body.mel-pagina-bee [data-mel-visto] [data-mel-rev-passo],
html.mel-bee-rev body.mel-pagina-bee [data-mel-visto] [data-mel-rev-fade]{
  opacity:1; transform:none;
}
/* E o hover do CTA volta a valer depois de revelado, com o mesmo 1px de
   sempre: sem esta linha o transform:none acima venceria o .mel-bt:hover. */
html.mel-bee-rev body.mel-pagina-bee [data-mel-visto] [data-mel-rev-fade]:hover{
  transform:translateY(-1px);
}

@media (prefers-reduced-motion:reduce){
  /* Tudo visível na hora e no lugar final: sem deslocamento, sem escala, sem
     espera pelo observador. Vale mesmo antes de o JS rodar, então quem pediu
     menos movimento nunca vê um quadro deslocado. */
  html.mel-bee-rev body.mel-pagina-bee [data-mel-rev="esq"],
  html.mel-bee-rev body.mel-pagina-bee [data-mel-rev="dir"],
  html.mel-bee-rev body.mel-pagina-bee [data-mel-rev="sobe"],
  html.mel-bee-rev body.mel-pagina-bee [data-mel-rev="alto"],
  html.mel-bee-rev body.mel-pagina-bee [data-mel-rev-passo],
  html.mel-bee-rev body.mel-pagina-bee [data-mel-rev-fade]{
    opacity:1; transform:none; transition:none; transition-delay:0s;
  }
}

/* ---- o cenário e a revelação no retrato ----
   DOIS AJUSTES, os dois pelo mesmo motivo: a tela é estreita e tudo pesa mais.

   1. O CENÁRIO PERDE FORÇA. Em 1440 a tinta divide a largura com o papel das
      calhas e com o palco; em 390 ela cobre a linha inteira, e o mesmo alfa que
      é atmosfera no desktop vira uma mancha amarela dominando a página. Os sete
      degraus caem para ~62% do alfa, na mesma proporção: a curva é idêntica, só
      mais leve, e as fronteiras continuam se encontrando.
   2. O DESLOCAMENTO LATERAL ENCOLHE. 30px numa coluna de 350px é um terço da
      viagem que seria em 689px. 16px mantém a leitura de "entrou pelo lado" sem
      a peça sair correndo. A direção não muda: o pedido é que ela acompanhe o
      layout, e no retrato a ordem empilhada continua sendo imagem e depois
      conteúdo nas duas. */
@media (max-width:809.98px){
  body.mel-pagina-bee{
    --mel-cena-1:${cena('.034')};
    --mel-cena-2:${cena('.065')};
    --mel-cena-3:${cena('.085')};
    --mel-cena-4:${cena('.08')};
    --mel-cena-5:${cena('.056')};
    --mel-cena-6:${cena('.022')};
  }
  html.mel-bee-rev body.mel-pagina-bee [data-mel-rev="esq"]{ transform:translate3d(-16px,0,0) scale(.99) }
  html.mel-bee-rev body.mel-pagina-bee [data-mel-rev="dir"]{ transform:translate3d(16px,0,0) scale(.99) }
}

/* Foco de teclado nas zonas claras.
   A regra global desenha o anel em mel, calibrado contra o carvão (9,67:1 na
   auditoria). Sobre papel o mel dá 1,88:1 e o anel praticamente some. Nas
   duas zonas claras da Bee ele passa a carvão. */
body.mel-pagina-bee .mel-bh a:focus-visible,
body.mel-pagina-bee .mel-bh button:focus-visible,
body.mel-pagina-bee .mel-bee-mod a:focus-visible,
body.mel-pagina-bee .mel-bee-mod button:focus-visible{
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

   Então a faixa veste a pele da página: papel no fundo, carvão no desenho. Os
   81px deixam de ser tarja e passam a ser o alto do hero.

   ⚠️ 14/08/2026, À NOITE — ESTE BLOCO FOI EMBORA, E O MOTIVO É UM DEFEITO.
   A correção acima era escopada em body.mel-pagina-bee e valia para a PÁGINA
   INTEIRA. Ela acertava a primeira dobra e errava o resto: de "Destaques" para
   baixo a /bee volta ao editorial escuro, e ali a barra clara virava uma lasca
   acesa atravessando uma página escura. Medido em scrollY 2500: nav em
   rgb(251,247,238) sobre seção em rgb(34,30,23).

   O que ficou no lugar, e onde:
     - as REGRAS de cor da barra saíram daqui e viraram tokens em
       tools/perfil.js, na seção "TEMA DA NAVBAR". Lá elas valem para o site
       todo e trocam por região, que é o que o PDF pede;
     - o PADRÃO DE PRIMEIRO PAINT da /bee continua existindo e continua sendo
       por classe: "body.mel-pagina-bee" está na lista do tema claro, em
       perfil.js. É ele que garante que a barra já nasça clara em scrollY 0,
       sem depender de JavaScript;
     - o que decide o tema durante a rolagem é o atributo data-mel-tema="claro"
       nas três regiões claras desta página (hero e as duas Bee Cam), escrito
       em tools/bee.js.

   Nenhuma cor mudou de valor: o claro daqui é o claro de lá, verbatim. O que
   mudou é quem manda nele. */
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

    /* O VÍDEO. Quase nada sobra para cá, e isso é de propósito: quem escolhe a
       versão (960 ou 576) e quem decide se existe <source> é o <script>
       síncrono que vem logo depois do elemento no HTML — ele roda durante o
       parse, antes de o navegador buscar byte nenhum. Ver tools/bee.js.

       O que só dá para fazer daqui é o depois: se a pessoa LIGAR "menos
       movimento" com a página aberta, o loop tem de parar sem recarregar. Volta
       ao quadro 1, que é o mesmo do poster — parar no meio deixaria a Bee
       torta e num quadro que ninguém escolheu. */
    var video = hero.querySelector('[data-mel="bee-hero-video"]');
    if (video && menosMovimento.addEventListener) {
      menosMovimento.addEventListener('change', function (ev) {
        if (ev.matches) { video.pause(); try { video.currentTime = 0; } catch (e) {} }
        else if (video.querySelector('source')) { var p = video.play(); if (p && p.catch) p.catch(function () {}); }
      });
    }

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

  /* ====== /bee — revelação por rolagem ======
     UM observador para a página inteira, e nenhum listener de scroll: quem
     conta quadro a quadro na rolagem é o navegador, de graça, fora da thread
     principal. Sai imediatamente em qualquer outra rota — data-mel-rev não
     existe em nenhum outro documento do site.

     O QUE ESTA FUNÇÃO PODE E NÃO PODE FAZER. Ela só ESCREVE data-mel-visto.
     Não esconde nada, nunca remove o atributo e não mexe em estilo inline: o
     estado inicial é do CSS e depende de html.mel-bee-rev, que é escrito por um
     <script> síncrono no topo do conteúdo (ver SINALIZADOR em tools/bee.js).
     Se este arquivo não carregar, nada fica escondido.

     REVELADO É DEFINITIVO — e é por isso que o unobserve vem junto do atributo,
     na mesma linha. Sem ele, um elemento parado exatamente no limite da
     viewport recebe entrada e saída a cada quadro de rolagem e fica piscando;
     com ele, o navegador para de olhar para a peça no instante em que ela
     aparece, e nem rolagem reversa nem resize trazem o estado escondido de
     volta. */
  function iniciarRevelarBee() {
    var alvos = [].slice.call(document.querySelectorAll('[data-mel-rev]'));
    if (!alvos.length) return;

    function revelar(el) { el.setAttribute('data-mel-visto', ''); }

    /* Motor sem IntersectionObserver, ou preferência por menos movimento:
       tudo revelado de uma vez. A preferência vale para a espera também — quem
       pediu menos movimento não deveria precisar rolar para ler. O CSS já
       garante isto sozinho; aqui é a segunda tranca, para o atributo ficar
       coerente com o que está na tela. */
    if (!window.IntersectionObserver || menosMovimento.matches) {
      alvos.forEach(revelar);
      return;
    }

    var obs = new IntersectionObserver(function (ents) {
      for (var k = 0; k < ents.length; k++) {
        var e = ents[k];
        /* boundingClientRect.top < 0 cobre o que JÁ passou por cima da tela:
           recarga com âncora (#modelos vem do CTA do hero) e restauração de
           rolagem do navegador. Sem esta metade, quem volta à página no meio
           dela encontra buracos acima do ponto em que parou, e eles só
           apareceriam rolando para trás. */
        if (e.isIntersecting || e.boundingClientRect.top < 0) {
          revelar(e.target);
          obs.unobserve(e.target);
        }
      }
    }, {
      /* Margem e limiar fixos, escolhidos uma vez e iguais para todo mundo:
         -10% embaixo faz a peça começar a entrar um pouco depois de encostar na
         borda, que é o que dá a leitura de "revelada ao entrar" em vez de "já
         estava lá"; 12% é baixo o bastante para o palco de 517px disparar cedo
         e alto o bastante para uma linha de texto não disparar de raspão. */
      rootMargin: '0px 0px -10% 0px',
      threshold: 0.12
    });
    alvos.forEach(function (el) { obs.observe(el); });
  }
`;
}

module.exports = { css, js };
