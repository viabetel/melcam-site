// Comunidade, clipes e barra de segurança. Entram antes do <footer>, na ordem
// do briefing: hero → blocos → carrossel → comunidade → clipes → segurança.
const fs = require('fs');
const path = require('path');
const SITE = path.resolve(__dirname, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(SITE, 'melcam.config.json'), 'utf8'));
const P = cfg.paleta;

function fotosComunidade() {
  const dir = path.join(SITE, 'melcam', 'img', 'comunidade');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f)).sort()
    .map(f => '/melcam/img/comunidade/' + f);
}

// ------------------------------------------------------------- comunidade
function comunidade() {
  const c = cfg.home.comunidade;
  const fotos = fotosComunidade();
  // 13/08/2026, a pedido: o rótulo [USUÁRIO E CIDADE A CONFIRMAR] saiu de dentro
  // dos cards. A pendência NÃO some do site — continua declarada na nota ao pé
  // da seção, que diz que a identificação de cada autor está a decidir. O que
  // saiu foi a etiqueta repetida oito vezes por cima das fotos.
  // (De quebra some um <figcaption> que vivia fora de um <figure>, que é markup
  // inválido — o <li> nunca foi <figure>.)
  const itens = fotos.map(src => `
      <li class="mel-com-item">
        <img src="${src}" alt="Foto da comunidade Melcam" loading="lazy">
      </li>`).join('');

  return `
<section class="mel-sec mel-comunidade" aria-labelledby="mel-com-tit">
  <div class="mel-sec-topo">
    <p class="mel-eyebrow">${c.eyebrow}</p>
    <h2 id="mel-com-tit" class="mel-tit">${c.titulo}</h2>
    <p class="mel-tag">${c.tag}</p>
  </div>
  <ul class="mel-com-grade">${itens}
  </ul>
  <p class="mel-nota">${fotos.length} de 16 a 20 fotos previstas no briefing.
     As demais, e a identificação de cada autor, estão <strong>a decidir</strong>.</p>
</section>`;
}

// ------------------------------------------------------------------ clipes
//
// 🔴 OS CLIPES CONTINUAM NÃO EXISTINDO — 14/08/2026.
// Não há MP4, MOV nem WebM no material local, e o briefing proíbe vídeo de
// banco. O que mudou é só o que ocupa o lugar deles: saiu o `a-decidir.svg` e
// entraram três FOTOS do mesmo ensaio, como pôster provisório. Elas reservam o
// espaço e a proporção com alguma vida em vez de um retângulo tracejado.
//
// Nada aqui finge ser vídeo, e essa é a regra: não existe <video>, não existe
// botão de play, não existe barra de progresso. O estado provisório é dito por
// escrito, uma vez, na etiqueta discreta do rodapé do card — "Clipe em
// produção" — e a nota ao pé da seção explica o que ainda falta gravar.
//
// O RECORTE É HORIZONTAL, E ISSO DECIDE O `object-position`.
// As três fotos são 1600x2400 (2:3 = 0,667) e o card é 9:16 (0,563). Com
// `cover`, o navegador escala pela ALTURA e sobra largura: no desktop o card
// tem 451x801 e a foto escalada fica com 534 de largura, ou seja 15,6% da
// largura é cortada — 7,8% de cada lado com o padrão de 50%. Não há corte
// vertical nenhum, então o segundo valor do `object-position` é inerte aqui;
// fica declarado por clareza e para o dia em que a proporção do card mudar.
// Quem carrega o valor é a variável `--mel-foco`, no próprio <img>: o dado é de
// cada foto, mas a declaração continua uma só, na folha.
const CLIPES = [
  {
    // Camera e mãos no centro do quadro (o corpo da Bee vai de 39% a 67% da
    // largura). 50% mantém as duas mãos inteiras e o recorte simétrico.
    src: '/melcam/img/header-fileira/bee-lp-0689.jpg',
    foco: '50% 50%',
    alt: 'Duas mãos seguram a Bee amarela na altura do rosto; na telinha aparece, sorrindo, a pessoa que está sendo fotografada.',
  },
  {
    // As duas câmeras penduradas ficam em 35% e 66%, e o par se centra em 51%.
    // O punho da esquerda encosta na borda e o antebraço da direita também, então
    // 50% é o único valor que não sacrifica um em favor do outro.
    src: '/melcam/img/header-fileira/bee-lp-1171.jpg',
    foco: '50% 50%',
    alt: 'Duas mãos suspendem pela correntinha duas câmeras Bee, uma amarela e uma com as cores da bandeira do Brasil, com o Pão de Açúcar e o mar ao fundo.',
  },
  {
    // A câmera presa à passante está em 67% da largura da foto, bem à direita
    // do centro. Subir o valor para 62% faz a janela comer mais da esquerda, e
    // com isso a câmera anda para dentro do quadro: cai em 68% da largura do
    // card em vez de 70%, na linha do terço da direita. A janela passa a
    // começar em 9,7% da foto, então a mão apoiada no bolso, que começa em 15%,
    // continua inteira.
    src: '/melcam/img/header-fileira/bee-lp-0761.jpg',
    foco: '62% 50%',
    alt: 'A Bee amarela presa por mosquetão à passante de uma calça jeans, na altura do quadril, dentro de uma livraria.',
  },
];

// 🔴 A SEÇÃO ESTÁ OCULTA A PEDIDO — 14/08/2026.
//
// O `topicos_alteracoes.pdf` pede "ocultação temporária da seção de conteúdo em
// vídeo e clipes, justificada pela ausência atual de material gravado pela
// marca". É o mesmo motivo que já estava escrito no cabeçalho acima: não há
// MP4, MOV nem WebM no material local, e o briefing proíbe vídeo de banco. A
// diferença é que até aqui o site mostrava três FOTOS reservando o lugar dos
// clipes; o cliente prefere não mostrar nada enquanto não houver vídeo.
//
// COMO RELIGAR, e é de propósito que seja assim de simples:
//
//     melcam.config.json  ->  home.clipes.visivel = true
//     node tools/sincronizar-clipes.js
//
// Nada foi apagado: nem esta função, nem a lista CLIPES com os três
// enquadramentos medidos, nem as fotos, nem o CSS de .mel-clipe*. As imagens
// continuam referenciadas no HTML — então continuam publicadas pelo
// verificar-assets-deploy.js — e voltam a aparecer no dia em que o interruptor
// virar. Se os vídeos chegarem antes disso, o que muda é o conteúdo do card;
// o interruptor continua sendo o mesmo.
//
// POR QUE `hidden` NO PRÓPRIO <section>, e não display:none na folha:
//   - `hidden` tira a seção do fluxo, então não sobra vão nenhum entre a
//     comunidade e a barra de segurança — o pedido diz isso com todas as
//     letras. Medido depois: a página encolheu de 8.436 para 7.223px e nenhuma
//     das seções vizinhas mudou de altura;
//   - `hidden` também esconde para leitor de tela e tira os links da ordem de
//     tabulação, o que display:none faz igual, mas `hidden` é atributo do
//     documento: quem abrir o HTML vê que a seção está desligada sem precisar
//     ler a folha de estilo;
//   - e o pedido é explícito em não resolver isto só com CSS no build sem
//     mexer na fonte. Quem decide é o config; a fonte lê o config; o build é
//     sincronizado a partir da fonte.
function clipes() {
  const ligada = cfg.home.clipes ? cfg.home.clipes.visivel !== false : true;
  const cards = CLIPES.map((c) => `
      <li class="mel-clipe">
        <div class="mel-clipe-box">
          <img src="${c.src}" alt="${c.alt}" style="--mel-foco:${c.foco}"
               width="1600" height="2400" loading="lazy" decoding="async">
          <span class="mel-clipe-spec">Clipe em produção</span>
        </div>
      </li>`).join('');

  return `
<section class="mel-sec mel-clipes" aria-labelledby="mel-clipes-tit"${ligada ? '' : ' hidden data-mel-oculta="sem clipes gravados"'}>
  <div class="mel-sec-topo">
    <p class="mel-eyebrow">em movimento</p>
    <h2 id="mel-clipes-tit" class="mel-tit">A Melcam por aí</h2>
  </div>
  <ul class="mel-clipes-grade">${cards}
  </ul>
  <p class="mel-nota">As imagens acima são fotos do ensaio, no lugar dos
     ${CLIPES.length} clipes verticais — que ainda <strong>não foram
     gravados</strong>. Cada um deles precisa entregar MP4 ou WebM, 1080 × 1920,
     8 a 20 s, sem texto essencial embutido.</p>
</section>`;
}

// --------------------------------------------------------------- segurança
const ICONES = {
  0: '<path d="M12 3 20 6.5v5.2c0 4.6-3.2 8.3-8 9.3-4.8-1-8-4.7-8-9.3V6.5L12 3Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M8.6 12.2l2.4 2.4 4.4-4.6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
  1: '<path d="M20.5 11.8a8.5 8.5 0 1 1-3.6-6.9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M3.6 20.4l1.3-3.6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M8.8 11.9h.01M12 11.9h.01M15.2 11.9h.01" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/>',
  2: '<path d="M20.5 12a8.5 8.5 0 1 1-2.5-6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M20.6 3.4v4.3h-4.3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
  3: '<rect x="4" y="10.4" width="16" height="10.1" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8.1 10.4V7.6a3.9 3.9 0 0 1 7.8 0v2.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
};

function seguranca() {
  const itens = cfg.home.seguranca.map((t, i) => `
      <li class="mel-seg-item">
        <svg class="mel-seg-ico" viewBox="0 0 24 24" aria-hidden="true">${ICONES[i] || ''}</svg>
        <span>${t}</span>
      </li>`).join('');

  return `
<section class="mel-seguranca" aria-label="Segurança na compra">
  <ul class="mel-seg-lista">${itens}
  </ul>
</section>`;
}

// --------------------------------------------------------------------- CSS
function css() {
  return `
/* ============ Seções MELCAM: comunidade, clipes, segurança ============
   Seguem o vocabulário do template: largura 1440, gutter 24, raio 4px,
   respiro generoso. Nada aqui altera nó do template. */
.mel-sec{ width:100%; max-width:1440px; margin:0 auto; padding:clamp(56px,7vw,110px) 24px }
.mel-sec-topo{ margin:0 0 clamp(28px,4vw,52px) }
.mel-eyebrow{
  margin:0 0 .6rem; color:${P.mel};
  font-family:"Area",sans-serif; font-size:.76rem; font-weight:600;
  letter-spacing:.14em; text-transform:uppercase;
}
.mel-tit{
  margin:0; color:${P.papel};
  font-family:"Iowan Old Style",Georgia,serif; font-weight:700;
  font-size:clamp(1.8rem,4vw,3.4rem); line-height:1.08; letter-spacing:-.01em;
}
.mel-tag{ margin:.9rem 0 0; color:#9A9083; font-family:"Area",sans-serif; font-size:.95rem }
.mel-nota{
  margin:clamp(20px,3vw,34px) 0 0; color:#9A9083;
  font-family:"Area",sans-serif; font-size:.82rem; line-height:1.55;
}
.mel-nota strong{ color:${P.mel}; font-weight:600 }

/* --- comunidade --- */
.mel-com-grade{
  list-style:none; margin:0; padding:0; display:grid; gap:12px;
  grid-template-columns:repeat(4,1fr);
}
.mel-com-item{ position:relative; border-radius:4px; overflow:hidden; background:#2B251C }
.mel-com-item img{
  width:100%; aspect-ratio:1; object-fit:cover; display:block;
  transition:transform 520ms cubic-bezier(.22,.61,.36,1);
}
.mel-com-item:hover img{ transform:scale(1.045) }
/* .mel-com-cap saiu em 13/08/2026 junto com a legenda que ele vestia. Regra
   morta e nao volta sozinha: quando houver @usuario e cidade de verdade, o
   estilo se reescreve com o conteudo. */

/* --- clipes --- */
.mel-clipes-grade{
  list-style:none; margin:0; padding:0; display:grid; gap:20px;
  grid-template-columns:repeat(3,1fr);
}
/* A BORDA TRACEJADA EM MEL SAIU JUNTO COM O PLACEHOLDER — 14/08/2026.
   Ela era a moldura do "a decidir": tracejado diz caixa vazia, e sobre um
   retangulo cinza dizia a verdade. Sobre uma foto de verdade passaria a dizer
   outra coisa — erro de carregamento, recorte provisorio, algo quebrado. O
   estado provisorio agora esta escrito na etiqueta, que e onde ele se le sem
   ambiguidade. Fica um fio da mesma familia da barra de seguranca, so para
   assentar a foto no fundo carvao. */
.mel-clipe-box{
  position:relative; border-radius:4px; overflow:hidden;
  aspect-ratio:9/16; background:${P.carvao};
  border:1px solid rgba(251,247,238,.07);
}
/* cover, nao contain: com contain sobrava fundo em cima e embaixo, que era o
   desenho certo para um SVG de placeholder e o errado para uma foto. O foco de
   cada uma vem do proprio <img>, em --mel-foco (ver CLIPES em comunidade.js). */
.mel-clipe-box img{
  width:100%; height:100%; display:block;
  object-fit:cover; object-position:var(--mel-foco,50% 50%);
}
/* A etiqueta agora cai SOBRE FOTO, entao precisa de veu: #9A9083 solto em cima
   de jeans claro ou de ceu nao se le. O gradiente morre antes da metade do
   card para nao virar tarja. */
.mel-clipe-spec{
  position:absolute; inset:auto 0 0 0; padding:1.7rem .6rem .7rem;
  text-align:center; color:rgba(251,247,238,.88);
  background:linear-gradient(to top,rgba(34,30,23,.88) 0%,rgba(34,30,23,.58) 52%,rgba(34,30,23,0) 100%);
  font-family:"Area",sans-serif; font-size:.7rem; letter-spacing:.05em;
  pointer-events:none;
}

/* --- barra de segurança --- */
.mel-seguranca{
  border-top:1px solid rgba(251,247,238,.07);
  border-bottom:1px solid rgba(251,247,238,.07);
}
.mel-seg-lista{
  list-style:none; margin:0 auto; padding:clamp(26px,3.4vw,44px) 24px;
  max-width:1440px; display:grid; gap:clamp(18px,2.6vw,36px);
  grid-template-columns:repeat(4,1fr);
}
.mel-seg-item{
  display:flex; align-items:center; gap:.85rem;
  color:${P.papel}; font-family:"Area",sans-serif; font-size:.92rem; line-height:1.35;
}
.mel-seg-ico{ width:26px; height:26px; flex:none; color:${P.mel} }

/* --- responsivo, nos breakpoints do próprio template --- */
@media (max-width:1439.98px){
  .mel-com-grade{ grid-template-columns:repeat(3,1fr) }
  .mel-seg-lista{ grid-template-columns:repeat(2,1fr) }
}
@media (max-width:809.98px){
  .mel-sec{ padding:clamp(44px,9vw,72px) 16px }
  .mel-com-grade{ grid-template-columns:repeat(2,1fr); gap:8px }
  .mel-clipes-grade{ grid-template-columns:1fr; gap:16px }
  .mel-clipe-box{ max-width:340px; margin:0 auto }
  .mel-seg-lista{ grid-template-columns:1fr; padding-left:16px; padding-right:16px }
}
@media (prefers-reduced-motion:reduce){
  .mel-com-item img{ transition:none }
  .mel-com-item:hover img{ transform:none }
}
`;
}

function aplicar(walk) {
  fs.appendFileSync(path.join(SITE, 'melcam', 'identidade.css'), css(), 'utf8');
  let n = 0;
  for (const f of walk) {
    const rel = path.relative(SITE, f);
    if (rel.startsWith('melcam' + path.sep) || rel.startsWith('tools' + path.sep)) continue;
    if (!/index\.html$/i.test(f)) continue;
    let s = fs.readFileSync(f, 'utf8');
    // Só insere, nunca recorta.
    //
    // ⚠️ NÃO voltar a inserir antes do primeiro `<footer>`. São três rodapés,
    // um por ssr-variant, e o primeiro mora dentro de
    // `<div class="ssr-variant hidden-1g8fb3q">`, que é `display:none` fora do
    // desktop. As três seções ficavam com altura 0 no tablet e no mobile — o
    // defeito passou despercebido porque no desktop aparecia tudo certo.
    //
    // O lugar certo é como filha direta do stack da home (o
    // `<header data-framer-name="Header">`, flex column), depois de todas as
    // variantes. Fora de variante, renderiza nos três breakpoints. A ordem
    // visual continua correta pelas regras de `order` em identidade.css:
    // conteúdo (0) → Colméia (1) → rodapé (2).
    const abertura = /<header[^>]*class="[^"]*framer-vrbx7h[^"]*"[^>]*>/.exec(s);
    if (abertura) {
      const re = /<(\/?)header\b[^>]*>/g;
      re.lastIndex = abertura.index;
      let prof = 0, t, corte = -1;
      while ((t = re.exec(s))) {
        prof += t[1] ? -1 : 1;
        if (prof === 0) { corte = t.index; break; }
      }
      if (corte > 0) {
        s = s.slice(0, corte) + comunidade() + clipes() + seguranca() + s.slice(corte);
        n++;
      }
    }
    fs.writeFileSync(f, s, 'utf8');
  }
  return { n, fotos: fotosComunidade().length };
}

// `clipes` e `css` saem exportados para dar para SINCRONIZAR o build sem rodar
// o `aplicar`, que só sabe INSERIR — rodá-lo de novo duplicaria as três seções
// no index.html e a folha inteira em identidade.css. Com o gerador na mão, a
// sincronia deixa de ser cópia manual e vira comparação: o trecho do
// index.html tem de bater byte a byte com o que `clipes()` devolve.
module.exports = { aplicar, clipes, css };
