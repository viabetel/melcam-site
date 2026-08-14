// Acessórios, Sobre Nós, 404 e Sacola.
const fs = require('fs');
const path = require('path');
const SITE = path.resolve(__dirname, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(SITE, 'melcam.config.json'), 'utf8'));
const P = cfg.paleta;

// -------------------------------------------------------------- acessórios
function acessorios() {
  return `
<section class="mel-sec mel-embreve" aria-labelledby="mel-ac-tit">
  <p class="mel-eyebrow">categoria futura</p>
  <h1 id="mel-ac-tit" class="mel-tit">Acessórios, em breve</h1>
  <p class="mel-col-txt">Alças, capas, cartões e o que mais fizer sentido para
     andar junto com a sua câmera. Ainda não temos produtos aqui — quando
     tivermos, você vai saber.</p>

  <form class="mel-aviso" data-mel-aviso novalidate>
    <label for="mel-aviso-email" class="mel-aviso-lab">Quer ser avisado no lançamento?</label>
    <div class="mel-aviso-linha">
      <input id="mel-aviso-email" name="email" type="email" autocomplete="email"
             placeholder="seu@email.com" required>
      <button type="submit" class="mel-bt mel-bt-mel">Avisar-me</button>
    </div>
    <p class="mel-aviso-msg" data-mel-aviso-msg role="status" aria-live="polite"></p>
  </form>

  <div class="mel-embreve-pattern" aria-hidden="true">
    <img src="/melcam/logo/pattern.svg" alt="">
  </div>

  <p class="mel-nota">Produtos <strong>a decidir</strong>. Nada foi inventado
     aqui. O cadastro de aviso ainda não tem backend, e por isso o formulário
     <strong>não afirma</strong> que o e-mail foi enviado.</p>
</section>`;
}

// ------------------------------------------------------------------- sobre
function sobre() {
  return `
<section class="mel-sec" aria-labelledby="mel-sob-tit">
  <p class="mel-eyebrow">sobre nós</p>
  <h1 id="mel-sob-tit" class="mel-tit">Câmeras para quem quer lembrar</h1>
  <p class="mel-col-txt mel-sob-lead">A Melcam é uma marca brasileira de câmeras
     digitais retrô. Duas linhas, a Polen e a Bee, nascidas da mesma ideia:
     fotografar com intenção, sem tela e sem distração, e guardar só o que
     importa.</p>

  <ul class="mel-sob-cards">
    <li>
      <h2>Fotografia intencional</h2>
      <p>Sem tela para conferir, você olha a cena e não o visor. A revisão vem
         depois — e a foto que sobra é a que você quis tirar.</p>
    </li>
    <li>
      <h2>Estética vintage</h2>
      <p>Filtros aplicados na hora do clique, direto na câmera. Analógica por
         fora, digital por dentro.</p>
    </li>
    <li>
      <h2>Comunidade</h2>
      <p>A Colméia reúne quem vive fotografando com a Melcam: acesso antecipado,
         encontros e desafios mensais.</p>
    </li>
  </ul>

  <p class="mel-nota">Texto institucional <strong>a decidir</strong>. O que está
     aqui usa só o que é comprovado pelo material da marca. Data de fundação,
     equipe, número de clientes e história da empresa <strong>não foram
     inventados</strong> e entram quando o cliente enviar.</p>
</section>

<section class="mel-sec" id="contato" aria-labelledby="mel-cont-tit">
  <p class="mel-eyebrow">fale conosco</p>
  <h2 id="mel-cont-tit" class="mel-tit">Precisa de ajuda?</h2>
  <ul class="mel-contato">
    <li><span>WhatsApp de suporte</span><strong>a decidir</strong></li>
    <li><span>E-mail</span><strong>melcam@melcam.com.br</strong></li>
    <li><span>Endereço</span><strong>a decidir</strong></li>
    <li><span>CNPJ</span><strong>a decidir</strong></li>
    <li><span>Redes sociais</span><strong>a decidir</strong></li>
  </ul>
  <p class="mel-nota">O e-mail acima é o que consta no briefing. Os demais dados
     não serão publicados até o cliente confirmar.</p>
</section>

<section class="mel-sec" id="rastreio" aria-labelledby="mel-rast-tit">
  <p class="mel-eyebrow">seu pedido</p>
  <h2 id="mel-rast-tit" class="mel-tit">Rastrear pedido</h2>
  <p class="mel-col-txt">A integração com a transportadora ainda não existe.
     Assim que existir, o rastreio acontece aqui.</p>
  <p class="mel-nota">Transportadora, prazos e link real de rastreio
     <strong>a decidir</strong>.</p>
</section>`;
}

// --------------------------------------------------------------------- 404
function erro404() {
  return `
<section class="mel-sec mel-404" aria-labelledby="mel-404-tit">
  <p class="mel-eyebrow">erro 404</p>
  <h1 id="mel-404-tit" class="mel-tit">Essa foto não saiu</h1>
  <p class="mel-col-txt">A página que você procurou não existe, mudou de
     endereço ou nunca chegou a ser revelada.</p>
  <div class="mel-404-links">
    <a class="mel-bt mel-bt-mel" href="/">Voltar para a home</a>
    <a class="mel-bt mel-bt-linha" href="/polen">Conhecer a Polen</a>
    <a class="mel-bt mel-bt-linha" href="/bee">Conhecer a Bee</a>
  </div>
</section>`;
}

// ------------------------------------------------------------------ sacola
function sacola() {
  return `
<section class="mel-sec" aria-labelledby="mel-sac-tit">
  <p class="mel-eyebrow">sua sacola</p>
  <h1 id="mel-sac-tit" class="mel-tit">Sacola</h1>

  <div data-mel-sacola-vazia hidden>
    <p class="mel-col-txt">Sua sacola está vazia.</p>
    <div class="mel-404-links">
      <a class="mel-bt mel-bt-mel" href="/polen">Ver as Polen</a>
      <a class="mel-bt mel-bt-linha" href="/bee">Ver as Bee</a>
    </div>
  </div>

  <div data-mel-sacola-cheia hidden>
    <ul class="mel-sac-lista" data-mel-sacola-itens></ul>
    <div class="mel-sac-total">
      <span>Subtotal</span>
      <strong data-mel-sacola-subtotal>R$ 0,00</strong>
    </div>
    <button type="button" class="mel-bt mel-bt-mel mel-sac-fechar" data-mel-checkout>
      Finalizar compra
    </button>
    <p class="mel-nota" data-mel-checkout-msg role="status" aria-live="polite">
      <strong>Fluxo demonstrativo.</strong> Não há gateway de pagamento
      integrado, então nenhuma compra é processada. O checkout entra quando o
      meio de pagamento for definido.
    </p>
  </div>

  <p class="mel-sr" aria-live="polite" data-mel-sacola-vivo></p>
</section>`;
}

// ------------------------------------------- privacidade e termos, 14/08/2026
//
// POR QUE ESTAS DUAS PÁGINAS NASCERAM AGORA.
// Não foi capricho de escopo: o rodapé linka para /privacidade e /termos em
// TODAS as nove páginas, e as duas rotas serviam uma casca vazia do Framer —
// <div id="main"></div> e mais nada, porque a hidratação React está desligada
// (ver DECISAO DE ARQUITETURA em tools/aplicar.js). Medido: body com 3.475
// bytes e ZERO caracteres de texto útil, sem navbar e sem rodapé. Ou seja, dois
// links de suporte em cada página levavam a uma tela branca — é o "CTA falso"
// que o pedido proíbe, e o pedido do rodapé não fecha sem isto.
// As mesmas cascas existem em contact.html e faq.html; essas duas NÃO estão
// linkadas de lugar nenhum (a ajuda aponta para /sobre#contato e /polen#faq),
// então ficaram como estavam e viraram pendência registrada.
//
// O QUE ESTAS PÁGINAS NÃO FAZEM: não escrevem política de privacidade nem
// termos de uso. Texto jurídico é o item "textos jurídicos: Privacidade,
// Termos, Trocas e devoluções" de PENDENTES, e redigir cláusula em nome de uma
// empresa é exatamente o tipo de invenção que o projeto proíbe — aqui com risco
// regulatório, não só editorial. O que elas fazem é o que a /acessorios já fazia
// desde 13/08 e o cliente aprovou: dizer com todas as letras que o documento
// está sendo preparado, dizer o que ele vai cobrir e oferecer o caminho humano
// enquanto isso.
//
// Nenhuma classe nova entra: tudo aqui já existe na folha (.mel-sec, .mel-tit,
// .mel-eyebrow, .mel-col-txt, .mel-contato, .mel-nota, .mel-404-links).
function legal(eyebrow, id, titulo, lead, blocos, nota) {
  const secoes = blocos.map((b) => `
<section class="mel-sec" ${b.id ? `id="${b.id}" ` : ''}aria-labelledby="${b.rot}">
  <h2 id="${b.rot}" class="mel-tit">${b.titulo}</h2>
  <p class="mel-col-txt">${b.txt}</p>
</section>`).join('');

  return `
<section class="mel-sec" aria-labelledby="${id}">
  <p class="mel-eyebrow">${eyebrow}</p>
  <h1 id="${id}" class="mel-tit">${titulo}</h1>
  <p class="mel-col-txt">${lead}</p>
  <p class="mel-nota">${nota}</p>
  <div class="mel-404-links">
    <a class="mel-bt mel-bt-mel" href="/sobre#contato">Falar com a gente</a>
    <a class="mel-bt mel-bt-linha" href="/">Voltar para a home</a>
  </div>
</section>${secoes}`;
}

function privacidade() {
  return legal(
    'política de privacidade', 'mel-priv-tit', 'Privacidade',
    'Esta é a página onde a política de privacidade da Melcam vai morar. O '
    + 'documento está sendo preparado e ainda não foi publicado.',
    [
      { rot: 'mel-priv-o-que', titulo: 'O que o documento vai cobrir',
        txt: 'Quais dados a Melcam coleta quando você navega, cria conta ou faz '
           + 'um pedido, para que eles são usados, por quanto tempo ficam '
           + 'guardados e como pedir a exclusão deles.' },
      { rot: 'mel-priv-enquanto', titulo: 'Enquanto ele não sai',
        txt: 'Qualquer dúvida sobre os seus dados pode ser enviada para o '
           + 'e-mail de contato da marca, na página <a href="/sobre#contato">Fale conosco</a>. '
           + 'Nenhum dado é compartilhado com terceiros para publicidade.' },
    ],
    'Texto jurídico <strong>a decidir</strong>. Nada foi redigido em nome da '
    + 'empresa: cláusula de privacidade tem efeito legal e só entra no ar depois '
    + 'que o cliente enviar o documento aprovado.'
  );
}

function termos() {
  return legal(
    'termos e condições', 'mel-term-tit', 'Termos e condições',
    'Esta é a página onde os termos de uso e as condições de compra da Melcam '
    + 'vão morar. O documento está sendo preparado e ainda não foi publicado.',
    [
      { rot: 'mel-term-o-que', titulo: 'O que o documento vai cobrir',
        txt: 'As condições de uso do site, as regras de compra, prazos de '
           + 'entrega, formas de pagamento e a garantia das câmeras.' },
      // O id "trocas" é destino do rodapé: a coluna "Ajuda" leva
      // "Trocas e devoluções" para /termos#trocas (ver tools/rodape.js). Se
      // este id sumir, aquele link vira âncora morta.
      { id: 'trocas', rot: 'mel-term-trocas', titulo: 'Trocas e devoluções',
        txt: 'A política de trocas e devoluções faz parte deste documento e '
           + 'ainda não foi publicada. Prazos, condições do produto e quem paga '
           + 'o frete de retorno são definidos por ela — e por isso não estão '
           + 'escritos aqui antes da hora. Para um caso concreto, fale com a '
           + 'gente pelo <a href="/sobre#contato">canal de atendimento</a>.' },
    ],
    'Texto jurídico <strong>a decidir</strong>. Prazos, condições e política de '
    + 'devolução não foram inventados: eles têm efeito legal e valor comercial, '
    + 'e entram quando o cliente enviar o documento aprovado.'
  );
}

// --------------------------------------------------------------------- CSS
function css() {
  return `
/* ============ Acessórios, Sobre, 404 e Sacola ============ */
.mel-embreve,.mel-404{ text-align:center; position:relative }
.mel-embreve .mel-col-txt,.mel-404 .mel-col-txt{ margin-inline:auto }
.mel-embreve-pattern{ margin-top:clamp(36px,6vw,80px); opacity:.13 }
.mel-embreve-pattern img{ width:100%; max-width:900px; height:auto }

.mel-aviso{ max-width:460px; margin:clamp(26px,4vw,44px) auto 0; text-align:left }
.mel-aviso-lab{
  display:block; margin-bottom:.6rem; color:#9A9083;
  font-family:"Area",sans-serif; font-size:.85rem;
}
.mel-aviso-linha{ display:flex; gap:.5rem }
.mel-aviso-linha input{
  flex:1; min-width:0; padding:.65rem .9rem; border-radius:999px;
  border:1px solid rgba(251,247,238,.22); background:#2B251C; color:${P.papel};
  font-family:"Area",sans-serif; font-size:.9rem;
}
/* O placeholder tem de ser declarado. Sem regra, o campo cai no cinza padrao
   do navegador (#757575 medido no Edge), que da 3,29:1 sobre a superficie e
   reprova AA. O secundario da marca da 4,83:1 no mesmo fundo. */
.mel-aviso-linha input::placeholder{ color:#9A9083; opacity:1 }
.mel-aviso-linha input:focus-visible{ outline:2px solid ${P.mel}; outline-offset:2px }
.mel-aviso-msg{
  margin:.7rem 0 0; min-height:1.2em; color:${P.mel};
  font-family:"Area",sans-serif; font-size:.82rem;
}

.mel-sob-lead{ max-width:64ch }
.mel-sob-cards{
  list-style:none; margin:clamp(32px,5vw,64px) 0 0; padding:0;
  display:grid; gap:clamp(18px,2.6vw,32px); grid-template-columns:repeat(3,1fr);
}
.mel-sob-cards li{ background:#2B251C; border-radius:8px; padding:clamp(18px,2.4vw,28px) }
.mel-sob-cards h2{
  margin:0 0 .6rem; color:${P.papel};
  font-family:"Iowan Old Style",Georgia,serif; font-size:1.2rem; font-weight:700;
}
.mel-sob-cards p{ margin:0; color:#9A9083; font-family:"Area",sans-serif; font-size:.92rem; line-height:1.6 }

.mel-contato{ list-style:none; margin:0; padding:0; max-width:640px }
.mel-contato li{
  display:flex; justify-content:space-between; gap:1rem; padding:.85rem 0;
  border-top:1px solid rgba(251,247,238,.07);
  font-family:"Area",sans-serif; font-size:.94rem;
}
.mel-contato span{ color:#9A9083 }
.mel-contato strong{ color:${P.papel}; font-weight:500 }

.mel-404-links{
  display:flex; flex-wrap:wrap; gap:.6rem; justify-content:center;
  margin-top:clamp(22px,3vw,34px);
}

.mel-sac-lista{ list-style:none; margin:0; padding:0; max-width:760px }
.mel-sac-item{
  display:grid; grid-template-columns:64px 1fr auto auto; gap:1rem;
  align-items:center; padding:1rem 0;
  border-top:1px solid rgba(251,247,238,.07);
}
.mel-sac-item img{ width:64px; height:64px; object-fit:contain; border-radius:4px; background:#2B251C }
.mel-sac-nome{ color:${P.papel}; font-family:"Area",sans-serif; font-size:.95rem }
.mel-sac-preco{ color:#9A9083; font-family:"Area",sans-serif; font-size:.85rem }
.mel-qtd{ display:flex; align-items:center; gap:.4rem }
.mel-qtd button{
  width:30px; height:30px; border:0; border-radius:999px; cursor:pointer;
  background:#2B251C; color:${P.papel}; font-size:1rem; line-height:1;
}
.mel-qtd button:hover{ background:${P.mel}; color:${P.carvao} }
.mel-qtd span{ min-width:2ch; text-align:center; color:${P.papel}; font-family:"Area",sans-serif }
.mel-remover{
  border:0; background:none; cursor:pointer; color:#9A9083;
  font-family:"Area",sans-serif; font-size:.8rem; text-decoration:underline;
}
.mel-remover:hover{ color:${P.coral} }
.mel-sac-total{
  display:flex; justify-content:space-between; max-width:760px;
  padding:1.2rem 0; border-top:1px solid rgba(251,247,238,.16);
  color:#9A9083; font-family:"Area",sans-serif;
}
.mel-sac-total strong{ color:${P.papel}; font-size:1.3rem }
.mel-sac-fechar{ margin-top:.4rem }

@media (max-width:1439.98px){ .mel-sob-cards{ grid-template-columns:1fr } }
@media (max-width:809.98px){
  .mel-aviso-linha{ flex-direction:column }
  .mel-sac-item{ grid-template-columns:56px 1fr; row-gap:.6rem }
  .mel-contato li{ flex-direction:column; gap:.2rem }
}
`;
}

module.exports = { acessorios, sobre, erro404, sacola, privacidade, termos, css };
