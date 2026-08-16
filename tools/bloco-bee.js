// Enriquece o BLOCO BEE da home (o card <a data-framer-name="Bee"> dentro do
// Header Grid) e inverte o peso dele com o card de Acessórios.
//
// POR QUE
// Medido em 14/08/2026, no desktop: o card da Bee tinha 432x277 e carregava a
// palavra "Bee", o selo "Novidade" e uma foto. Nada mais. O card da Polen ao
// lado, 432x481, trazia eyebrow, conceito, as 7 cores em packshot, o preço e um
// CTA. A Bee é o LANÇAMENTO — o <h1> do hero da home é "Chegou a Bee" — e era o
// card com menos informação da seção.
//
// ============ O LEQUE DE DESTAQUES — 15/08/2026 ============
// Pedido do cliente: "a seção das colunas onde temos o Polen de 7 cores que
// podemos passar o mouse em cima, preciso que faça o mesmo na coluna bee em
// relação ao key feature".
//
// A Polen usa as 7 CORES como leque: sete faixas verticais, e a que está sob o
// ponteiro se abre para o card inteiro. Na Bee não há sete cores — são duas, e
// "somente amarela e branca" é requisito do cliente registrado no PDF. Então o
// eixo do leque aqui é outro: são os DESTAQUES do produto, que é exatamente o
// que "key feature" quer dizer. Quatro, um por foto que o acervo já tem.
//
// 🔴 NENHUMA ESPECIFICAÇÃO NOVA FOI INVENTADA. Cada frase abaixo é copy que já
// existe no projeto, e a origem está escrita ao lado dela. Inventar um número
// de produto aqui viraria afirmação comercial sem lastro — a mesma proibição
// que vale para as descrições do scrollytelling da /polen.
//
// AS DUAS CORES NÃO SAÍRAM. Elas desceram para a linha do preço, em miniatura,
// onde continuam sendo produto visível e não bolinha de cor. O que era uma
// tira de duas fotos passivas virou uma escolha de quatro, e a informação
// comercial ficou onde a decisão de compra acontece.
//
// A INVERSÃO DE TAMANHO É CSS, e mora em tools/identidade.js — não aqui.
//
// POR QUE A BEE NÃO GANHA EYEBROW COMO A POLEN
// O eyebrow da Polen fica em top:1.25rem left:1.25rem, e é exatamente onde o
// selo "Novidade" da Bee já está (identidade.js, a[data-framer-name="Bee"]::before).
//
// SEM LINK ANINHADO: o CTA é um <span>, não um <a>. O bloco inteiro já é o link.
//
// SÓ A HOME: escreve apenas em index.html, como o bloco-polen.js.
//
// IDEMPOTENTE POR SUBSTITUIÇÃO, e não por presença — mudou em 15/08. Antes ele
// saía na porta se a marca já estivesse no arquivo, o que tornava impossível
// evoluir o bloco sem editar HTML à mão. Agora ele REMOVE o que escreveu antes
// e escreve de novo, como o hero-home.js faz. Rodar duas vezes dá o mesmo
// arquivo; rodar depois de mexer aqui aplica a mudança.
const fs = require('fs');
const path = require('path');

const SITE = path.resolve(__dirname, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(SITE, 'melcam.config.json'), 'utf8'));
const BEE = cfg.produtos.bee;

// Copy aprovada, a mesma do <h1> da /bee (tools/bee.js).
const CONCEITO = 'Pequena o bastante para ir junto.';
// 14/08/2026: era "Conheça a Bee". O topicos_alteracoes.pdf nomeia os dois
// botões da grade — "Conheça" e "Ver Modelos" —, e é a palavra do cliente.
const CTA = 'Conheça';

const MARCA = 'data-mel-bee-card';

// A foto do card de Acessórios. Ver o comentário no css() para os dois motivos
// da troca: assunto errado (mostrava a câmera num cartão de acessórios) e 41%
// da imagem descartada pelo recorte.
const FOTO_ACESSORIOS_ANTIGA = 'melcam/img/bee/bee-amarela-angulo-corrente.png';
const FOTO_ACESSORIOS = 'melcam/img/bee/bee-amarela-caixa.png';

// Os quatro destaques. `rot` é o chip; `frase` é a legenda que aparece no
// hover; `origem` é onde a afirmação já existia antes desta passagem.
const FEATURES = [
  {
    rot: 'Chaveiro',
    frase: 'Do tamanho de um chaveiro',
    origem: 'tools/bee.js > COPY["Bee Amarela"] e o alt do hero da /bee',
    img: '/melcam/img/bee/bee-amarela-angulo-corrente.png',
  },
  {
    rot: '26 g',
    frase: 'Aproximadamente 26 gramas',
    origem: 'tools/bee.js > ESPECIF e o <h2> "O que cabe em 26 gramas"',
    img: '/melcam/img/bee/bee-lifestyle-acessorio.jpg',
  },
  {
    rot: 'Full HD',
    frase: 'Vídeo Full HD 1080p e 720p',
    origem: 'tools/bee.js > ESPECIF, verbatim',
    img: '/melcam/img/bee/bee-lifestyle-tela.jpg',
  },
  {
    rot: '11 filtros',
    frase: '11 filtros, escolhidos no clique',
    origem: 'tools/bee.js > bloco "Filtros e estética retrô"',
    img: '/melcam/img/bee/bee-filtro-01.jpg',
  },
];

// O leque: as quatro fotos lado a lado, cada uma numa faixa vertical. Mesma
// mecânica do .mel-polen-troca, e o mesmo motivo para o veu existir — ver o
// bloco "OS DESTAQUES VIRAM ESCOLHA" em tools/identidade.js.
// 🔴 O LEQUE E DE CORES, e nao de destaques — corrigido em 15/08 depois do
// retorno do cliente: "la tem azul e amarelo, vc devia colocar o azul e o
// amarelo para aparecer ao passar a seta". A primeira versao usou os destaques
// como eixo e fotos de lifestyle como imagem; as duas coisas estavam erradas.
// O eixo e o mesmo da Polen (a cor), e a imagem e o packshot oficial de cada
// variante — que ja vem com o fundo na cor, entao a troca de foto troca o fundo
// junto, sem veu fazendo o trabalho. Os destaques continuam no cartao, mas como
// etiqueta estatica: eles informam, nao escolhem.
function leque() {
  const imgs = BEE.cores.map((c, i) =>
    `<img src="${c.img}" alt="" data-i="${i}" loading="lazy" decoding="async">`
  ).join('');
  return `<span class="mel-bee-veu" ${MARCA}="1" aria-hidden="true"></span>` +
    `<div class="mel-bee-troca" ${MARCA}="1" aria-hidden="true">${imgs}</div>`;
}

function tira() {
  // Os swatches são quem ESCOLHE: cada um carrega o data-i que as regras
  // geradas usam para abrir a foto da cor no cartão inteiro. Mesma estrutura
  // do .mel-polen-cor, e por isso o mesmo nome de papel.
  const minis = BEE.cores.map((c, i) =>
    `<span class="mel-bee-cor" data-i="${i}" data-nome="${c.nome}">` +
      `<img src="${c.img}" alt="" loading="lazy" decoding="async" width="800" height="800">` +
    `</span>`
  ).join('');
  const nomes = BEE.cores.map(c => c.nome).join(' e ');
  const quantas = BEE.cores.length === 1 ? '1 cor' : BEE.cores.length + ' cores';

  // Os destaques viraram etiqueta estática: informam, não escolhem. Quem
  // escolhe é a cor. Decorativos para leitor de tela porque o aria-label da
  // faixa já diz os quatro numa frase, e repetir chip a chip faria a navegação
  // ouvir quatro fragmentos soltos dentro de um link que já tem nome próprio.
  const chips = FEATURES.map((f) =>
    `<span class="mel-bee-chip">${f.rot}</span>`
  ).join('');
  const rotulo = 'Destaques da Bee: ' + FEATURES.map(f => f.frase).join('. ') + '.';

  return `<div class="mel-bee-tira" ${MARCA}="1">` +
    `<span class="mel-bee-legenda" aria-hidden="true"></span>` +
    `<span class="mel-bee-chips" role="img" aria-label="${rotulo}">${chips}</span>` +
    `<span class="mel-bee-linha">` +
      `<span class="mel-bee-cores" role="img" aria-label="As ${quantas} da Bee: ${nomes}.">${minis}</span>` +
      `<span class="mel-bee-preco">${BEE.preco}</span>` +
      `<span class="mel-bee-cta">${CTA}</span>` +
    `</span>` +
  `</div>`;
}

// 🔴 CSS NAO PROPAGA CUSTOM PROPERTY DE FILHO PARA PAI — a mesma razão que o
// bloco-polen.js documenta. O veu e a legenda são irmãos dos chips: não há como
// lerem qual chip está sob o ponteiro. Ou são regras explícitas por índice, ou
// entra JS. Geradas daqui, nunca saem de sincronia com FEATURES.
//
// A saída deste gerador está colada em tools/identidade.js, no bloco "OS
// DESTAQUES DA BEE VIRAM ESCOLHA" — mesma convenção do cssCores() da Polen.
// Para atualizar: mexer em FEATURES, rodar `node tools/bloco-bee.js --css` e
// substituir o trecho gerado na folha.
function cssFeatures() {
  const n = BEE.cores.length;
  const larg = (100 / n).toFixed(4);
  const A = 'a[data-framer-name="Bee"]';
  // As duas cores do anel do swatch saem dos packshots: amarela é o mel da
  // marca, branca é o azul do fundo do catálogo. Não são cores novas — são as
  // que a foto já traz, e é por isso que o anel combina com o que se vê.
  const anel = ['#F2A900', '#4F86C6'];
  return BEE.cores.map((c, i) => {
    const esq = (i * 100 / n).toFixed(4);
    const hov = A + ':has(.mel-bee-cor[data-i="' + i + '"]:hover) ';
    return [
      '.mel-bee-cor[data-i="' + i + '"]{ --mel-cor:' + (anel[i] || '#F2A900') + ' }',
      '.mel-bee-troca img[data-i="' + i + '"]{ left:' + esq + '%; width:' + larg + '% }',
      hov + '.mel-bee-troca img[data-i="' + i + '"]{ left:0; width:100%; opacity:1; z-index:2 }',
      hov + '.mel-bee-legenda::after{ content:"' + c.nome + '" }',
    ].join('\n');
  }).join('\n');
}

// Recorta um <a ...>...</a> a partir de um índice, com contagem equilibrada.
function recortarA(html, ini) {
  const re = /<(\/?)a\b[^>]*>/g;
  re.lastIndex = ini;
  let prof = 0, t;
  while ((t = re.exec(html))) {
    prof += t[1] ? -1 : 1;
    if (prof === 0) return { fim: t.index + t[0].length };
  }
  return null;
}

// Recorta um elemento pelo nome da tag, contando aninhamento da MESMA tag.
// Regex não serve: a tira tem spans dentro de spans, e um .*? corta no lugar
// errado e desbalanceia o documento — que é o que o preflight mede.
function fatiaTag(s, inicio, tag) {
  const abreRe = new RegExp('<' + tag + '\\b', 'g');
  const fechaTxt = '</' + tag + '>';
  let i = inicio, prof = 0;
  while (i < s.length) {
    abreRe.lastIndex = i;
    if (s.startsWith('<' + tag, i) && /[\s>]/.test(s[i + tag.length + 1] || '')) { prof++; i += tag.length + 1; continue; }
    if (s.startsWith(fechaTxt, i)) { prof--; i += fechaTxt.length; if (!prof) return i; continue; }
    i++;
  }
  return -1;
}

// Tira do HTML tudo que esta ferramenta escreveu antes, para poder reescrever.
function removerMarcados(html) {
  let n = 0;
  for (const tag of ['p', 'span', 'div']) {
    for (;;) {
      const marca = new RegExp('<' + tag + '\\b[^>]*' + MARCA + '="1"[^>]*>');
      const m = marca.exec(html);
      if (!m) break;
      const fim = fatiaTag(html, m.index, tag);
      if (fim < 0) break;
      html = html.slice(0, m.index) + html.slice(fim);
      n++;
    }
  }
  return { html, n };
}

function aplicar() {
  const arq = path.join(SITE, 'index.html');
  const antes = fs.readFileSync(arq, 'utf8');
  const feito = [];

  // 1. limpa o que esta ferramenta escreveu em passagens anteriores
  const limpo = removerMarcados(antes);
  let html = limpo.html;
  if (limpo.n) feito.push('removidos ' + limpo.n + ' nó(s) de uma passagem anterior');

  let tocados = 0;
  // De trás para frente, para os índices não se moverem a cada inserção.
  const abre = /<a[^>]*data-framer-name="Bee"[^>]*>/g;
  const pos = [];
  let m;
  while ((m = abre.exec(html))) pos.push(m.index);

  for (let i = pos.length - 1; i >= 0; i--) {
    const ini = pos[i];
    const fecha = recortarA(html, ini);
    if (!fecha) { feito.push('card em ' + ini + ': fechamento não encontrado, pulado'); continue; }
    let bloco = html.slice(ini, fecha.fim);

    const h3 = /<h3\b[^>]*>Bee<\/h3>/;
    if (!h3.test(bloco)) { feito.push('card em ' + ini + ': <h3>Bee</h3> não encontrado, pulado'); continue; }

    // 1. o conceito, logo depois do <h3>, dentro do mesmo RichTextContainer.
    bloco = bloco.replace(h3, (t) => t + `<p class="mel-bee-sub" ${MARCA}="1">${CONCEITO}</p>`);

    // 2. o leque e a tira como FILHOS DIRETOS do <a>, logo antes do </a>.
    //
    // ⚠️ Mesma armadilha documentada no bloco-polen.js: NÃO pendurar no
    // container de texto. Há um por variante SSR e só um renderiza por
    // breakpoint — pendurada ali, a tira dá 0x0 no desktop.
    const fechaA = bloco.lastIndexOf('</a>');
    if (fechaA < 0) { feito.push('card em ' + ini + ': </a> não encontrado, pulado'); continue; }
    bloco = bloco.slice(0, fechaA) + leque() + tira() + bloco.slice(fechaA);

    html = html.slice(0, ini) + bloco + html.slice(fecha.fim);
    tocados++;
  }

  if (!tocados) { feito.push('index.html: nenhum card Bee encontrado, NADA gravado'); return feito; }

  // ---- a foto do card de Acessorios ----
  // Troca dentro do <a data-framer-name="Sneakers"> e SO ali: a mesma imagem
  // aparece noutros lugares do site e trocar por arquivo inteiro mudaria cartao
  // que ninguem pediu. Idempotente por natureza — reescrever o que ja esta
  // escrito nao muda nada.
  {
    const abreS = /<a[^>]*data-framer-name="Sneakers"[^>]*>/g;
    const posS = [];
    let ms;
    while ((ms = abreS.exec(html))) posS.push(ms.index);
    let trocas = 0;
    for (let k = posS.length - 1; k >= 0; k--) {
      const f = recortarA(html, posS[k]);
      if (!f) continue;
      const antesBloco = html.slice(posS[k], f.fim);
      const depoisBloco = antesBloco.split(FOTO_ACESSORIOS_ANTIGA).join(FOTO_ACESSORIOS);
      if (depoisBloco !== antesBloco) {
        html = html.slice(0, posS[k]) + depoisBloco + html.slice(f.fim);
        trocas++;
      }
    }
    if (trocas) feito.push('foto de Acessórios trocada em ' + trocas + ' variante(s): ' +
      FOTO_ACESSORIOS_ANTIGA.split('/').pop() + ' -> ' + FOTO_ACESSORIOS.split('/').pop());
  }

  // Guardas: só pode ter entrado o que a ferramenta escreve.
  const conta = (s, t) => (s.match(new RegExp(t, 'g')) || []).length;
  const porCard = BEE.cores.length * 2;   // as fotos do leque + os swatches
  const okA = conta(antes, '<a\\b') === conta(html, '<a\\b');
  const okSec = conta(antes, '<section\\b') === conta(html, '<section\\b');
  const okBalDiv = conta(html, '<div\\b') - conta(html, '</div>') === conta(antes, '<div\\b') - conta(antes, '</div>');
  const okBalSpan = conta(html, '<span\\b') - conta(html, '</span>') === conta(antes, '<span\\b') - conta(antes, '</span>');
  // A contagem de <img> é absoluta e não relativa: como a limpeza roda antes,
  // comparar com o arquivo de entrada mediria a diferença entre duas versões
  // desta ferramenta, e não o que ela escreveu.
  const imgsDoLeque = conta(html, 'class="mel-bee-troca"');
  const okImg = imgsDoLeque === tocados;

  if (!(okA && okSec && okBalDiv && okBalSpan && okImg)) {
    return ['index.html: guarda falhou, NADA gravado — ' +
      JSON.stringify({ okA, okSec, okBalDiv, okBalSpan, okImg, tocados })];
  }

  fs.writeFileSync(arq, html, 'utf8');
  feito.push('index.html: ' + tocados + ' variante(s) do card Bee — ' +
    FEATURES.length + ' destaques em leque + ' + BEE.cores.length + ' cores + ' +
    BEE.preco + ' + CTA "' + CTA + '"');
  feito.push('  destaques: ' + FEATURES.map(f => f.rot).join(' · '));
  feito.push('  guardas: <a> e <section> inalterados, balanço de div e span preservado, ' +
    porCard + ' img por card');
  return feito;
}

const P = cfg.paleta;

// Marcadores do bloco na folha. O sincronizador troca entre os dois.
const CSS_ABRE = '/* ============ OS DESTAQUES DA BEE VIRAM ESCOLHA — 15/08/2026 ============';
const CSS_FECHA = '/* ============ fim dos destaques da Bee ============ */';

// UMA FONTE, DOIS CONSUMIDORES. Este texto e interpolado por tools/identidade.js
// (que monta a folha base) E trocado no lugar por tools/sincronizar-grade-bee.js
// (que nao pode reescrever a folha inteira, porque ela e montada em camadas:
// depois da base vem perfil, /polen, hero da home e /bee, todos inseridos por
// geradores proprios). Escrever o CSS aqui e a unica forma de os dois caminhos
// nunca divergirem.
function css() {
  return `${CSS_ABRE}
   Pedido do cliente: o mesmo hover da Polen na coluna da Bee, "em relacao ao
   key feature".

   O EIXO E OUTRO, DE PROPOSITO. Na Polen o leque e de CORES, porque sao sete e
   a escolha de cor e a decisao do produto. Na Bee sao duas cores, e "somente
   amarela e branca" e requisito registrado do cliente — um leque de dois nao e
   leque, e transformar duas variantes em sete faixas seria inventar produto.
   Entao o eixo aqui e o que o pedido nomeia: os DESTAQUES. Quatro, um por foto
   que o acervo ja tem, com a copy saindo de tools/bee.js — a origem de cada
   frase esta escrita ao lado dela em FEATURES, neste arquivo.

   AS DUAS CORES NAO SUMIRAM: desceram para a linha do preco, em miniatura.

   As regras por indice no fim do bloco sao geradas por cssFeatures(). */
.mel-bee-troca{
  position:absolute; top:34%; left:0; right:0; bottom:0; z-index:1;
  pointer-events:none; border-radius:inherit; overflow:hidden;
}
.mel-bee-troca img{
  position:absolute; top:0; bottom:0; height:100%;
  object-fit:cover; object-position:50% 50%;
  transition:left 480ms cubic-bezier(.22,.61,.36,1),
             width 480ms cubic-bezier(.22,.61,.36,1),
             opacity 360ms ease;
}
a[data-framer-name="Bee"]:has(.mel-bee-cor:hover) .mel-bee-troca img{ opacity:0 }

/* A foto original do template sai de cena: quem desenha a area agora e o
   leque. Ela fica no DOM, como manda a casa. */
body:not(.mel-interna) a[data-framer-name="Bee"]:has(.mel-bee-troca) [data-framer-name="Image"]{
  opacity:0;
}

/* O veu e mel, e nao a cor do destaque: aqui nao ha cor por item que faca
   sentido tingir. Ele so aquece a metade de cima do cartao, onde o leque nao
   chega, para a revelacao nao parecer um retangulo de foto trocando sozinho. */
.mel-bee-veu{
  position:absolute; inset:0; z-index:1; pointer-events:none;
  opacity:0; background:${P.mel}; border-radius:inherit;
  transition:opacity 420ms cubic-bezier(.22,.61,.36,1);
}
a[data-framer-name="Bee"]:has(.mel-bee-cor:hover) .mel-bee-veu{ opacity:.10 }

/* OS CHIPS SAO ETIQUETA, NAO BOTAO — e o desenho tem de dizer isso sozinho.
   Sem hover, sem cursor, sem sombra externa: quem escolhe no cartao e a cor,
   e dois alvos disputando a mesma intencao e o que faz uma interface parecer
   rascunho. Eles sao elasticos porque quatro chips de texto com largura de
   conteudo estouram o cartao em 390px. */
.mel-bee-chips{
  display:flex; flex-wrap:wrap; justify-content:center;
  gap:.34rem; width:100%; pointer-events:none;
}
.mel-bee-chip{
  display:inline-flex; align-items:center; justify-content:center;
  min-width:0; padding:.3rem .62rem; border-radius:999px;
  background:rgba(251,247,238,.07);
  box-shadow:inset 0 0 0 1px rgba(251,247,238,.16);
  color:rgba(251,247,238,.88);
  font-family:"Area",sans-serif; font-size:.66rem; font-weight:600;
  letter-spacing:.05em; line-height:1.1; white-space:nowrap;
}

/* OS SWATCHES SAO A ESCOLHA. Mesmo vocabulario do .mel-polen-cor: crescem sob
   o ponteiro, ganham anel na propria cor, e os vizinhos recuam para a escolha
   parecer escolha. Crescem para CIMA (transform-origin no rodape) porque para
   baixo bateriam no preco — a mesma armadilha ja medida na Polen. */
/* 🔴 pointer-events:auto E OBRIGATORIO AQUI. A .mel-bee-tira inteira e
   pointer-events:none, para o clique continuar sendo o do <a> que envolve o
   cartao — e sem devolver o ponteiro aos swatches eles nunca recebem :hover.
   Medido: o leque ficava travado em 50%/50% com a legenda em opacity 0, e a
   Polen (que ja tinha pointer-events:auto em .mel-polen-cores) abria normal. */
.mel-bee-cores{ pointer-events:auto }
.mel-bee-cor{
  display:block; flex:none; width:2.35rem; height:2.35rem;
  border-radius:5px; position:relative; overflow:visible;
  box-shadow:0 0 0 1px rgba(251,247,238,.10);
  transition:transform 380ms cubic-bezier(.22,.61,.36,1),
             box-shadow 380ms ease, opacity 380ms ease;
  transform-origin:50% 100%;
}
.mel-bee-cor img{
  width:100%; height:100%; object-fit:cover; display:block; border-radius:5px;
}
.mel-bee-cor:hover{
  transform:scale(1.22) translateY(-2px);
  box-shadow:0 6px 18px rgba(0,0,0,.45), 0 0 0 2px var(--mel-cor,${P.mel});
  z-index:2;
}
a[data-framer-name="Bee"]:has(.mel-bee-cor:hover) .mel-bee-cor:not(:hover){
  transform:scale(.94); opacity:.6;
}

/* A legenda ocupa o lugar mesmo vazia: sem isso a tira pula de altura quando o
   texto aparece e os chips se mexem debaixo do ponteiro. */
.mel-bee-legenda{
  display:block; min-height:1.05rem; margin-bottom:.45rem;
  font-family:"Area",sans-serif; font-size:.72rem; font-weight:600;
  letter-spacing:.02em; text-align:center; color:${P.papel};
  opacity:0; transition:opacity 260ms ease;
  text-shadow:0 1px 6px rgba(34,30,23,.9);
}
a[data-framer-name="Bee"]:has(.mel-bee-cor:hover) .mel-bee-legenda{ opacity:1 }

/* 🔴 NAO DECLARAR position AQUI. A .mel-bee-tira e ABSOLUTA no rodape do
   cartao, e o motivo esta no bloco "card da Bee na home" do identidade.js: o
   cartao tem altura fixa por aspect-ratio e nao cresce, entao em fluxo a tira
   era cortada e dava 0x0. Custou uma captura para lembrar — a primeira versao
   deste bloco escrevia "position:relative" e jogava a tira para o meio do
   cartao, com o scrim virando um retangulo de bordas duras sobre o leque.

   O QUE MUDA AQUI E SO O RESPIRO. A tira ganhou duas faixas novas (a legenda e
   os chips), entao a rampa do scrim precisa comecar mais cedo: com os 2.6rem
   originais ela nascia no meio dos chips e a metade de cima deles ficava sobre
   foto crua. */
.mel-bee-tira{ padding-top:4.2rem }
.mel-bee-chips{ margin-bottom:.85rem }
.mel-bee-linha .mel-bee-cores{ display:flex; flex:none; gap:.36rem }

${cssFeatures()}

@media (hover:none){
  .mel-bee-legenda{ display:none }
}
/* ---- A FOTO ABERTA NAO PODE CORTAR O PRODUTO — 15/08/2026 ----
   Relatado pelo cliente na Polen e valido para as duas colunas. Medido: os
   packshots sao quadrados (800x800) e a area do leque e 437x331 (proporcao
   1,32). Com cover a foto escala pela largura e perde 24% na vertical — o que
   sai do quadro e justamente o topo e a base da camera, ou seja, a peca que o
   cartao existe para mostrar. Em repouso isso nao incomoda, porque a faixa e
   estreita e le como composicao; ABERTA, o corte fica na cara.

   Contain so no estado aberto: a faixa em repouso continua sendo cover, senao
   sete miniaturas contidas viram sete selos flutuando com vao entre eles, e o
   leque deixa de ser um fundo continuo. O fundo colorido de cada packshot
   preenche o quadrado central; o que sobra nas laterais e o proprio cartao.

   ⚠️ POR QUE A REGRA DA POLEN MORA NO ARQUIVO DA BEE. A folha e montada em
   camadas e este bloco e o unico caminho cirurgico que existe hoje para
   publicar CSS novo na grade sem reescrever a folha inteira (ver o cabecalho
   do sincronizar-grade-bee.js). Quando a base for regerada, as duas regras
   voltam para o lugar natural delas no identidade.js. */
a[data-framer-name="Bee"]:has(.mel-bee-cor:hover) .mel-bee-troca img[data-i]{
  object-fit:contain;
  object-position:50% 50%;
}

/* ---- O LEQUE DA POLEN CABE, NAO E FATIADO — 15/08/2026 ----
   Em REPOUSO tambem, e nao so no hover: com cover, cada faixa de 62x331 exibia
   uma fatia de 19% de um packshot quadrado, e como a camera ocupa quase todo o
   quadro a fatia caia sobre a lente. Eram sete ampliacoes do mesmo pedaco de
   camera, em sete cores. Contido, cada faixa mostra a camera INTEIRA, e a cor
   de fundo por indice (gerada em bloco-polen.js > cssLeque, amostrada do
   proprio packshot) preenche o vao que sobra — sem ela o leque viraria sete
   selos flutuando sobre o carvao do cartao.

   A Bee fica em cover no repouso de propósito: la sao duas faixas de 218x331
   (0,66), e a camera dela e larga e centrada no quadro, entao o recorte nao
   come a peca. Medido antes de generalizar a regra. */
.mel-polen-troca img{
  object-fit:contain;
  object-position:50% 50%;
}
${require('./bloco-polen.js').cssLeque()}

/* A RAMPA DO TEMPLATE CONTINUA FORA — 15/08/2026.
   Eu religuei a section "Shadow" nesta mesma sessao, lendo "o template tem um
   efeito no hero sobre o video" como autorizacao para devolve-la. O cliente
   respondeu na hora que nao era isso, e a rampa saiu de novo. Fica escrito
   porque o comentario de 14/08 em hero-carrossel.js ja avisava — "nao
   'consertar' isso devolvendo o gradiente sem pedir" — e eu passei por cima.

   O hero fica sem rampa E sem veu: o veu proprio (.mel-hh-veu) saiu a pedido
   na mesma passagem, e nada entrou no lugar. O contraste do texto passa a
   depender do text-shadow das letras e do proprio filme. Medido depois da
   remocao, e o numero esta na secao do progresso.md. */

/* ============ OS BOTOES DE MEL GANHAM CARGA — 15/08/2026 ============
   Pedido: "podiam ter animacao ao passar o mouse, tipo aquela de carregamento
   que muda de cor ao carregar", e "nao quero nada generico".

   O QUE HAVIA. .mel-bt-mel:hover{ background:#FFC22E } — uma troca de cor
   chapada, instantanea no olho porque os dois amarelos sao vizinhos. O CTA do
   hero fazia o mesmo com #FFB81A. E so isso: nenhuma direcao, nenhuma duracao
   perceptivel. Dai "duros e sem vida".

   A IDEIA NAO E UM HOVER DE BIBLIOTECA, E A MARCA. Mel escorre e ASSENTA. O
   botao entao nao acende: ele ENCHE, da esquerda para a direita, com um mel
   mais FUNDO do que o de repouso. Quatro decisoes que separam isto de um
   preenchimento generico:

   1. ENCHE ESCURECENDO, e nao clareando. Todo hover de template clareia — vira
      brilho, e brilho nao e materia. #D98E00 e o mel de repouso puxado para
      baixo; le como liquido que pousou, nao como luz que acendeu. E o carvao do
      rotulo continua em 6,6:1 contra ele, entao a legibilidade sobe junto.

   2. UM FIO DE PROGRESSO NO PE, e e ele que da o nome de "carregamento". Sao
      2px de carvao correndo na base, e ele CHEGA ANTES: 380ms contra 520ms do
      mel. A defasagem e o efeito — com os dois no mesmo tempo o olho le uma
      coisa so crescendo; com o fio na frente, ele le o fio PUXANDO o mel.

      O fio precisa de um ::after proprio, e nao de uma segunda camada de
      background: background-size aceita UMA duracao para a propriedade
      inteira, entao duas camadas no mesmo elemento sao obrigadas a correr
      juntas. Escrevi assim na primeira versao e a afirmacao era falsa.

   3. SAIR NAO E REBOBINAR. O retorno usa outra duracao e outra curva —
      260ms com saida acelerada, contra 520ms com chegada que assenta. Espelhar
      o mesmo movimento para tras e o que faz hover parecer bug de CSS.

   4. NENHUMA ESCALA, NENHUM HALO, NENHUMA SOMBRA QUE CRESCE. O unico
      deslocamento e o translateY de 1 a 2px que os botoes ja tinham. O que
      muda e a superficie, nao o tamanho.

   COMO, SEM TOCAR EM HTML. Duas camadas de background-image sobre o
   background-color de repouso, e o que anima e o background-size. Nenhum
   pseudo-elemento novo, nenhum <span> duplicado — os botoes sao <a>, <button> e
   <span> escritos por cinco geradores diferentes, e mexer no HTML dos cinco
   para um efeito de superficie seria trocar risco por nada.

   ⚠️ ESPECIFICIDADE. .mel-bt-mel:hover mora na base da folha, depois deste
   bloco. Um seletor de mesmo peso perderia por posicao, entao entra o "body "
   na frente — vence por peso, e sem !important. */
/* A CONSTRUCAO E A DO BOTAO DA AKI CAPITAL — o estudo do Norvin.
   Lida do original em aki-capital/app/globals.css > .nv-btn, e nao reinventada:
   a primeira versao que entreguei era invencao minha (preenchimento por
   background-size mais um fio de progresso) e o cliente recusou.

   O QUE FAZ O EFEITO LA, e que vem para ca sem mudar o formato do botao:

   1. UM FILLER ABSOLUTO COM RECUO DE 3px. Nao e o fundo do botao que muda: e
      uma caixa por dentro dele, afastada 3px de cada borda. Esse recuo e a
      assinatura — ele deixa um FIO DA PROPRIA COR DO BOTAO como moldura
      quando o preenchimento chega ao fim. No Norvin o comentario original diz
      exatamente isso: "deixando um fio fino da COR DO PROPRIO BOTAO como
      moldura".

   2. QUEM ANIMA E A LARGURA, de 0 ate calc(100% - 6px). Largura e nao
      transform: com scaleX o raio do canto esticaria junto e a caixa
      arredondada viraria elipse no meio do caminho.

   3. A CURVA E cubic-bezier(0.76, 0, 0.24, 1) EM 0.55s, os dois valores do
      original. Ela e simetrica — entra devagar, atravessa rapido, encosta
      devagar. E o oposto da curva quase exponencial que eu tinha usado, e que
      a medicao mostrou chegando a 98% em 160ms, rapida demais para se ler
      como carregamento.

   4. A MESMA CURVA E O MESMO TEMPO NA SAIDA. No Norvin nao ha timing de volta
      diferente: a transicao mora na regra base e vale nos dois sentidos. Eu
      tinha inventado uma saida acelerada; saiu.

   O QUE FICA DIFERENTE, E POR QUE. La o filler e laranja sobre botao claro, e
   o rotulo ROLA entre dois <span> empilhados dentro de uma mascara de 19px —
   por isso o texto pode virar branco sem passar por estado ilegivel. Aqui o
   rotulo e um no de texto solto, escrito por cinco geradores diferentes, e sem
   o segundo <span> nao existe rolagem possivel. Entao o filler e um mel mais
   FUNDO em vez do carvao: o carvao do rotulo continua legivel do inicio ao fim
   do percurso (8,25:1 sobre o mel de repouso, 6,18:1 sobre o mel cheio), e
   nenhum quadro da animacao fica ilegivel.

   Para ter a rolagem do rotulo tambem, os cinco geradores precisam emitir
   <span class="mel-bt-mask"><span>rotulo</span><span>rotulo</span></span>.
   E mudanca de HTML, nao de CSS, e nao foi feita nesta passagem.

   ⚠️ O FILLER E ::before COM z-index:-1 E isolation:isolate NO BOTAO.
   Pseudo posicionado com z-index:0 pintaria POR CIMA do texto, que e conteudo
   em fluxo. Com -1 ele desce, e o isolation cria o contexto de empilhamento
   que impede o -1 de cair atras do fundo do proprio botao. */
/* ---- OS TRES QUE ENTRARAM NA PADRONIZACAO DE 16/08/2026 ----
   A varredura das 7 rotas foi por MEDICAO, e nao por leitura da folha: cada
   clicavel de cada rota teve o fundo lido em repouso e sob :hover forcado, com
   as transicoes congeladas para o computado devolver o valor final e nao um
   quadro do meio do caminho. O censo de fundo mel devolveu tres botoes de
   rotulo que estavam de fora, e eles entram nas listas que ja existiam:

   1. .mel-sobre-cta ("Conheca quem faz a Melcam", faixa Sobre da home). Mel em
      repouso, rotulo de texto puro, nenhum filho. E um CTA identico em papel
      aos quatro ja cobertos, e era o unico que trocava de cor de forma chapada.

   2. .mel-bt-linha, a variante de contorno do MESMO componente .mel-bt. Em
      repouso ela e transparente, mas o hover dela E o mel (medido:
      rgb(242,169,0)). Na /404 ela aparece LADO A LADO com a .mel-bt-mel, e era
      ali que a inconsistencia ficava visivel: um botao carregava, o vizinho
      piscava. Ela chega ao mesmo estado final dos outros, com a moldura de 3px
      e o miolo em carvao.

   3. .mel-acesso-enviar (ENTRAR / CRIAR CONTA, no modal de conta). Mel em
      repouso, 356x48, alcancavel de qualquer rota pelo icone de perfil.

   ⚠️ .mel-acesso-enviar NAO GANHA MASCARA, so o preenchimento, e a razao e o
   proprio modulo de perfil: ele reescreve o rotulo do botao em quatro pontos
   (troca de aba, "ENTRANDO...", "PRONTO"), com textContent e innerHTML. Uma
   mascara montada ali seria apagada no primeiro clique de aba. Sem mascara o
   :has la embaixo mantem o filler no mel fundo, que e a mesma degradacao ja
   prevista para o caso de o JS nao rodar, e o rotulo em carvao continua
   legivel do inicio ao fim do percurso.

   O QUE FICOU DE FORA, e por que (tudo medido, nao suposto):
     - .mel-seta, .mel-fil-seta, .mel-dot e .mel-qtd button viram mel no hover,
       mas sao controles de icone sem rotulo nenhum: nao ha texto para rolar, e
       um filler recuado 3px dentro de um circulo de 9 a 48px le como anel, e
       nao como carga. O mel deles ja e o proprio realce.
     - .mel-sobre-bt ("Abrir") vira mel no hover, mas e um botao de sanfona com
       chevron proprio, tem filhos e nao aceita a mascara. O giro do chevron ja
       e a resposta dele.
     - .mel-filtro-nome fica mel por regra com :has do cartao inteiro, ou seja
       quem e o controle e o cartao, nao a pilula de 24px de altura.
     - .mel-hh-selo, .mel-perfil-selo, .mel-bee-veu e o fundo da secao
       "Header Grid" sao mel mas nao sao botoes: etiqueta, contador, veu de
       revelacao e plano de fundo.
     - o botao "Quero entrar na Colmeia" do template Framer foi medido e NAO e
       mel: o fundo dele e papel, rgb(251,247,238). */
body .mel-bt-mel,
body .mel-hh-cta-mel,
body .mel-bee-cta,
body .mel-polen-cta,
body .mel-sobre-cta,
body .mel-bt-linha,
body .mel-acesso-enviar{
  position:relative;
  isolation:isolate;
  overflow:hidden;
}
body .mel-bt-mel::before,
body .mel-hh-cta-mel::before,
body .mel-bee-cta::before,
body .mel-polen-cta::before,
body .mel-sobre-cta::before,
body .mel-bt-linha::before,
body .mel-acesso-enviar::before{
  content:""; position:absolute; z-index:-1;
  top:3px; bottom:3px; left:3px;
  width:0;
  border-radius:inherit;
  background:#D98E00;
  pointer-events:none;
  transition:width .55s cubic-bezier(.76,0,.24,1);
}
/* 🔴 O GATILHO E O PROPRIO BOTAO, e nao o cartao — 15/08/2026, a pedido:
   "tem que separar ele do efeito do hover". As pilulas da grade vivem dentro
   de um <a> que e o cartao inteiro, e a .mel-bee-tira e pointer-events:none
   para o clique continuar sendo o do link. O efeito entao disparava quando o
   ponteiro entrava em QUALQUER lugar do cartao — o botao acendia sozinho, sem
   relacao com onde a pessoa estava. Devolver o ponteiro so a pilula separa as
   duas coisas: o cartao continua sendo o link e o botao reage por conta. */
body .mel-bee-cta,
body .mel-polen-cta{ pointer-events:auto }

/* 🔴 O .mel-sobre-cta TAMBEM PRECISA DO PONTEIRO DE VOLTA — 16/08/2026.
   Ele recebeu o efeito na padronizacao, mas medido com ponteiro de verdade o
   preenchimento ficava em 0: o computado dele e pointer-events:none, herdado do
   palco do obturador da faixa "Sobre Nos", que e none para as cortinas nao
   roubarem clique da pagina. Sem ponteiro nao ha :hover, e sem :hover o efeito
   nao existe — ele so aparecia se o estado fosse FORCADO por ferramenta.
   Mesma correcao das pilulas da grade, e pelo mesmo motivo. */
body .mel-sobre-cta{ pointer-events:auto }

body .mel-bt-mel:hover::before,
body .mel-bt-mel:focus-visible::before,
body .mel-hh-cta-mel:hover::before,
body .mel-hh-cta-mel:focus-visible::before,
body .mel-bee-cta:hover::before,
body .mel-polen-cta:hover::before,
body .mel-sobre-cta:hover::before,
body .mel-sobre-cta:focus-visible::before,
body .mel-bt-linha:hover::before,
body .mel-bt-linha:focus-visible::before,
body .mel-acesso-enviar:hover:not([disabled])::before,
body .mel-acesso-enviar:focus-visible:not([disabled])::before{
  width:calc(100% - 6px);
}

/* ---- A ROLAGEM DO ROTULO, que e o que troca a cor ----
   A mascara e montada em JS (hero-carrossel.js > iniciarBotoesMel) porque os
   botoes saem de cinco geradores diferentes. Dois rotulos empilhados: o de
   cima sai por cima, o de baixo entra. Mesma curva e mesmo tempo do
   preenchimento, entao a cor da letra vira exatamente quando o mel de baixo
   passa por ela.

   A ALTURA E EM em, e nao em px como no original. La o botao tem um tamanho
   so (12,5px de texto, mascara de 19px). Aqui os cinco botoes tem corpos
   diferentes — 0,84rem no hero, 0,85rem no .mel-bt, 0,76rem nas pilulas — e um
   valor fixo cortaria uns e sobraria noutros. 1,25em cobre a descendente do
   "ç" de "Conheça" sem mudar a altura da caixa, que e governada por padding e
   min-height nos cinco. */
.mel-bt-mask{
  position:relative; display:block;
  height:1.25em; overflow:hidden;
}
.mel-bt-mask > span{
  display:block; height:1.25em; line-height:1.25em;
  white-space:nowrap;
  transition:transform .55s cubic-bezier(.76,0,.24,1);
}
.mel-bt-mask > span:first-child{ color:inherit }
.mel-bt-mask > span:last-child{ color:${P.mel} }
body .mel-bt-mel:hover .mel-bt-mask > span,
body .mel-bt-mel:focus-visible .mel-bt-mask > span,
body .mel-hh-cta-mel:hover .mel-bt-mask > span,
body .mel-hh-cta-mel:focus-visible .mel-bt-mask > span,
body .mel-bee-cta:hover .mel-bt-mask > span,
body .mel-polen-cta:hover .mel-bt-mask > span,
body .mel-sobre-cta:hover .mel-bt-mask > span,
body .mel-sobre-cta:focus-visible .mel-bt-mask > span,
body .mel-bt-linha:hover .mel-bt-mask > span,
body .mel-bt-linha:focus-visible .mel-bt-mask > span{
  transform:translateY(-1.25em);
}

/* COM A MASCARA MONTADA, o preenchimento passa a ser CARVAO — que e a troca de
   cor de verdade, como o laranja do original sobre o botao claro. Sem ela (JS
   fora do ar) o ::before continua no mel fundo declarado acima, onde o rotulo
   em carvao permanece legivel. O :has separa os dois casos sozinho. */
body .mel-bt-mel:has(.mel-bt-mask)::before,
body .mel-hh-cta-mel:has(.mel-bt-mask)::before,
body .mel-bee-cta:has(.mel-bt-mask)::before,
body .mel-polen-cta:has(.mel-bt-mask)::before,
body .mel-sobre-cta:has(.mel-bt-mask)::before,
body .mel-bt-linha:has(.mel-bt-mask)::before{
  background:${P.carvao};
}

@media (prefers-reduced-motion:reduce){
  /* Sem movimento o preenchimento nao percorre: ele ja esta la, e o hover so
     troca o estado. */
  body .mel-bt-mel::before,
  body .mel-hh-cta-mel::before,
  body .mel-bee-cta::before,
  body .mel-polen-cta::before,
  body .mel-sobre-cta::before,
  body .mel-bt-linha::before,
  body .mel-acesso-enviar::before{ transition:none }
}

/* ============ A FOTO ENCOLHE DENTRO DA FAIXA — 16/08/2026 ============
   Pedido do Israel no video (1:21, sobre a faixa Sobre Nos): "nao tipo diminui
   isso aqui, mas diminui a camera so por dentro, a imagem por dentro, porque
   ta meio cortadinha". E depois, do cliente: "encolhe um pouco o suficiente pra
   gente ver bem o que tem por la, o mesmo pode fazer no Conheca a Bee".

   O PROBLEMA, MEDIDO NOS DOIS LUGARES:
     cortina do Sobre Nos   faixa 1392x300 (4,64)  foto 1600x2400 (0,67)  86% fora
     slide do carrossel     faixa 1392x580 (2,40)  foto 1066x1600 (0,67)  72% fora
   Sao fotos em pe dentro de faixas deitadas. Com object-fit:cover a escala e
   ditada pela LARGURA, entao o assunto renderiza maior que a altura da faixa e
   sai decepado em cima e embaixo. Nenhum object-position resolve — ele escolhe
   QUAL pedaco aparece, nao o zoom. E nao ha asset largo o bastante no projeto:
   varri as imagens todas e a mais deitada e 1,79.

   COMO SE ENCOLHE POR DENTRO, sem mexer na faixa. Com cover, a escala e
   max(largura da caixa / largura da foto, altura da caixa / altura da foto).
   Estreitando a CAIXA DA IMAGEM dentro da faixa, o primeiro termo cai e a
   escala cai junto: a foto renderiza menor e sobra mais cena visivel. A faixa
   nao muda de tamanho — muda quanto dela a foto ocupa, que e exatamente o que
   o pedido descreve.

   Contas, na largura escolhida:
     cortina a 72%  escala 0,92 -> 0,63   altura visivel da foto  14% -> 20%
     slide  a 68%   escala 1,31 -> 0,89   altura visivel da foto  28% -> 41%

   O CUSTO, ASSUMIDO: a lamina do obturador e o banner deixam de sangrar de
   borda a borda, e o carvao do fundo aparece dos lados. O cliente escolheu esta
   saida sabendo disso, entre trocar as fotos e gerar panoramicas novas.

   As tres laminas do carrossel levam a MESMA largura, inclusive a do banner de
   3x que e deitada e perdia so 37%. Larguras diferentes fariam a foto pular de
   tamanho a cada troca de slide, e o pulo apareceria mais que o corte. */
body:not(.mel-interna) .mel-sobre-cortina img{
  width:72%;
  margin-inline:auto;
}
body:not(.mel-interna) .mel-slide-link img{
  width:68%;
  margin-inline:auto;
}

/* ---- AS PILULAS DOS 8 FILTROS GANHAM PE — 16/08/2026 ----
   Pedido do Israel no video de 14/08, aos 0:57: "arruma esses filtros aqui
   tambem".

   O QUE ESTA ERRADO, medido no lugar: a .mel-filtros-tira tem padding
   "2.6rem 1rem 1.1rem". Os oito nomes quebram em duas fileiras, e 1.1rem —
   17,6px — e o que sobra entre a segunda fileira e a borda do cartao. Uma
   fileira encostada na borda le como corte, nao como rodape.

   O 1.1rem servia quando a tira era de UMA fileira, como as da Polen e da Bee.
   Com duas, o pe precisa do mesmo peso do topo do respiro. Vai para 1.6rem, e
   o vao entre as fileiras sobe de .35 para .45rem para as duas nao lerem como
   um bloco so.

   ⚠️ O RECORTE DE 30% DAS FOTOS FICA COMO ESTA, e e decisao, nao esquecimento.
   A cena e 437x471 (0,93) e as fotos sao 1200x900 (1,33): o cover descarta 30%
   na horizontal. Forcar a caixa para 4:3 daria 437x328 e abriria um buraco de
   210px no meio do cartao, porque a cena e ancorada em top:44% e o cartao tem
   altura fixa pela coluna. E sao fotos de PAISAGEM, nao de produto — cortar
   30% de um Pao de Acucar e enquadramento comum; cortar 30% de uma camera e
   que era defeito. O caso do card da Polen nao se aplica aqui. */
body:not(.mel-interna) a[data-framer-name="Sobre Nós"] .mel-filtros-tira{
  padding-bottom:1.6rem;
}
body:not(.mel-interna) a[data-framer-name="Sobre Nós"] .mel-filtros-lista{
  gap:.45rem;
}

/* ---- OS DOIS CARTOES BAIXOS CRESCEM — 15/08/2026 ----
   Pedido do cliente: "aumenta o proprio card junto com os outros que estao ao
   lado pra ter harmonia".

   A GEOMETRIA DA SECAO, medida antes de escolher o numero: sao tres colunas.
   A 1 tem Polen grande (486) sobre Polen pequeno (280); a 2 tem Bee (486) sobre
   Acessorios (280); a 3 tem os 8 filtros num cartao unico de 782. E 486 + 280 +
   16 de vao = 782 — nao e coincidencia, e o que faz as tres colunas terminarem
   na mesma linha.

   Entao crescer so um cartao quebraria o alinhamento das colunas. Os dois
   baixos crescem juntos, de 280 para 340, e a coluna dos filtros acompanha por
   stretch — a soma vai de 782 para 842 nas tres. O cartao alto nao precisa de
   numero novo: ele ja e stretch dentro da linha do grid.

   340 e nao mais: e a altura em que a foto do cartao pequeno da Polen para de
   cortar a camera com o enquadramento em 88%, medido no lugar. Acima disso os
   dois cartoes grandes ficariam proporcionalmente menores que os baixos, e a
   hierarquia da secao (produto grande, categoria pequena) se inverteria.

   O ALVO DO CARTAO PEQUENO E POR FOTO. Sao dois <a data-framer-name="Polen">, e
   o pequeno e o que carrega polen-lp-1 — as classes framer-* mudam a cada
   export e nao servem de ancora. */
body:not(.mel-interna) div[data-framer-name="Header Grid"] a[data-framer-name="Polen"]:has(img[src*="polen-lp-1"]),
body:not(.mel-interna) div[data-framer-name="Header Grid"] a[data-framer-name="Sneakers"]{
  aspect-ratio:1.285 !important;
}

/* ---- A FOTO DO CARD PEQUENO DA POLEN — 15/08/2026 ----
   O cartao tem 437x280 e a foto e um retrato de 1125x1687 numa caixa de
   437x437 ancorada em y95 — ou seja, a janela visivel e uma faixa de 185px
   sobre uma imagem que continua por baixo do corte. Com object-position em 50%
   o que aparecia era o meio da embalagem, com a camera encostando no fim da
   faixa e sendo cortada.

   Em 50% aparecia o meio da embalagem. Em 70% a camera entrou na faixa mas
   ainda encostava no corte de baixo. Em 88% ela sobe de vez e o corpo dela cabe
   na janela, com a tampa da caixa acima. Numero maior sobe MAIS a imagem
   dentro da caixa: object-position:Y% alinha o ponto Y da imagem com o ponto Y
   da caixa, entao 100% encostaria a base da foto na base da caixa.

   O alvo e por SRC e nao por classe: sao dois cartoes com
   data-framer-name="Polen" e as classes framer-* mudam a cada export, entao o
   arquivo da foto e a ancora estavel. */
body:not(.mel-interna) div[data-framer-name="Header Grid"] a[data-framer-name="Polen"] img[src*="polen-lp-1"]{
  object-position:50% 88% !important;
}

/* ---- A REGUA DE 7 PONTOS DA POLEN SAI — 15/08/2026 ----
   Relatado pelo cliente como "sinal de cores aleatorios" sobre a foto, e a
   medicao explica: a regra e a[data-framer-name="Polen"]::after, em
   tools/identidade.js, e ela pede width:7.5rem, height:.75rem e bottom:1.25rem.
   O computado devolve 436x280 — o tamanho do cartao inteiro. A geometria dela
   esta sendo sobrescrita, entao os sete pontos, que sao background-position em
   rem sobre uma caixa de 12px de altura, passam a se distribuir sobre uma caixa
   de 280px e caem no MEIO da foto, com o primeiro nascendo em 6px e sendo
   cortado pela borda do cartao.

   NAO E SO GEOMETRIA: ela e redundante. A regua nasceu em 13/08 como unica
   indicacao das 7 cores; desde 14/08 o cartao grande tem os packshots reais em
   swatch, e desde hoje tem o leque inteiro. Sobrou como ruido sobre a foto.

   ⚠️ SAO DOIS CARTOES COM data-framer-name="Polen" — o grande ("7 cores. Uma
   decisao.", 437x486) e o pequeno ("Polen", 437x280). Toda regra escopada por
   esse nome atinge os dois, e foi por isso que eu nao tinha visto o defeito:
   vinha medindo so o grande. Fica registrado para a proxima regra que use esse
   seletor.

   A fonte tambem foi corrigida em tools/identidade.js; esta linha e o caminho
   ate a folha enquanto a base nao for regerada.

   🔴 O !important NAO E PREGUICA, E POSICAO. Este bloco e inserido ANTES do
   marcador do "SOBRE NÓS", e a regra da regua mora bem depois dele na folha.
   Com a mesma especificidade, quem vem por ultimo ganha — a primeira tentativa
   sem !important nao apagou ponto nenhum, e a captura provou. Vale para
   qualquer override futuro escrito neste bloco. */
a[data-framer-name="Polen"]::after{ content:none !important }

/* ---- A FOTO DO CARD DE ACESSORIOS — 15/08/2026 ----
   Dois defeitos, os dois relatados pelo cliente e confirmados por medicao:

   1. ASSUNTO ERRADO. O cartao diz "Acessorios" e mostrava a propria camera
      (bee-amarela-angulo-corrente). Agora mostra a CAIXA, que e o que o
      cliente recebe junto — cabo, corrente e embalagem — e portanto o que a
      categoria promete.

   2. CORTE. A caixa da foto e 437x149 (proporcao 2,94) e a imagem anterior era
      1072x620 (1,73): o cover jogava fora 41% dela, decepando a camera no
      canto e cortando a corrente ao meio. Medido, nao estimado.

   A saida NAO e outro object-position. bee-amarela-caixa.png e um recorte com
   alfa real (ver o cabecalho de tools/bee.js), e recorte com alfa dentro de um
   cover e desperdicio garantido: nao existe enquadramento que caiba 1,25 em
   2,94 sem cortar. Com contain a peca aparece inteira, flutuando sobre o fundo
   do cartao, que e exatamente como um packshot recortado deve ser apresentado.
   Zero por cento descartado. */
body:not(.mel-interna) div[data-framer-name="Header Grid"] a[data-framer-name="Sneakers"] img{
  object-fit:contain !important;
  object-position:50% 100% !important;
}

@media (prefers-reduced-motion:reduce){
  .mel-bee-troca img,.mel-bee-veu,.mel-bee-cor,.mel-bee-legenda{ transition:none }
  .mel-bee-cor:hover{ transform:none }
}
${CSS_FECHA}`;
}

module.exports = {
  aplicar, tira, leque, css, cssFeatures, FEATURES, CONCEITO, CTA,
  CSS_ABRE, CSS_FECHA,
  // Quem governa o leque é a lista de CORES, e não a de destaques — o
  // sincronizador confere as regras por índice contra esta contagem.
  CORES: BEE.cores,
};

if (require.main === module) {
  if (process.argv.includes('--css')) console.log(cssFeatures());
  else console.log(aplicar().join('\n'));
}
