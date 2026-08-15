// PERFIL, SESSÃO E ACESSO À SACOLA — o controle de conta da navbar.
//
// Mesma forma dos outros módulos de página (css() + js(), injetados por
// tools/paginas.js e tools/hero-carrossel.js). Só que este não é de uma página:
// entra nas nove, porque a navbar é a mesma em todas.
//
// ⚠️ ARMADILHAS DO BUILD (as mesmas do bee-interacoes.js, e elas mordem):
//   - crase e abre-interpolação NÃO podem aparecer nem dentro de comentário,
//     porque tudo aqui mora em template literal;
//   - "\s" dentro do JS gerado vira "s": escreva "\\s";
//   - o JS gerado usa concatenação, nunca template literal, para não brigar
//     com a interpolação de fora.
//
// ---------------------------------------------------------------------------
// SEGURANÇA: O QUE ISTO É E O QUE ISTO NÃO É
//
// O site é estático. Não há servidor, não há banco, não há sessão de verdade —
// o `melcam.config.json` já declara em PENDENTES que nem o gateway de pagamento
// existe. Então esta autenticação é uma DEMONSTRAÇÃO LOCAL, e o código foi
// escrito para não mentir sobre isso em lugar nenhum:
//
//   - senha NUNCA é guardada, nem em texto puro nem em base64. O que fica no
//     navegador é PBKDF2-SHA-256 com 210.000 iterações e sal aleatório de 16
//     bytes por conta, pelo WebCrypto. Sem a senha, o registro não serve para
//     entrar;
//   - se `crypto.subtle` não existir (contexto inseguro, http:// que não seja
//     localhost), o cadastro é RECUSADO com a razão dita na tela. Guardar senha
//     fraca "só para funcionar" seria pior do que não funcionar;
//   - a tela avisa, com todas as letras, que a conta vale só neste navegador.
//
// O QUE FALTA PARA SER AUTENTICAÇÃO DE VERDADE, quando houver backend:
//   1. as contas saem do localStorage e vão para o servidor; o hash é feito lá,
//      com o mesmo PBKDF2 (ou Argon2id, melhor), nunca no cliente;
//   2. a sessão vira cookie httpOnly + Secure + SameSite, emitido pelo servidor.
//      Token em localStorage é legível por qualquer script da página;
//   3. limite de tentativas por conta e por IP, que só o servidor pode aplicar;
//   4. verificação de e-mail e fluxo de "esqueci a senha", os dois por e-mail;
//   5. as regras de senha passam a ser validadas também no servidor: tudo que
//      roda aqui o usuário edita.
// A troca é local: `Contas` e `Sessao` abaixo são as duas únicas portas de
// dados. Quem for ligar o backend reescreve as duas e não toca no resto.
// ---------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');

const SITE = path.resolve(__dirname, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(SITE, 'melcam.config.json'), 'utf8'));
const P = cfg.paleta;

// Derivações da paleta, não cores novas — a mesma disciplina do bee-interacoes.
const D = {
  papelBorda: 'rgba(34,30,23,.12)',
  papelFundo: '#F3EDE0',      // o mesmo dos cards claros da /bee
  carvaoBorda: 'rgba(251,247,238,.14)',
  carvaoSombra: '0 18px 40px -12px rgba(14,12,9,.7)',
  tinta2: '#6B6254',          // texto secundário sobre papel, 4,9:1
  erro: '#B3341C',            // coral da paleta escurecido até 5,3:1 no papel
  ok: '#3F6B58',              // verde-mar escurecido até 5,1:1 no papel
};

// ---------------------------------------------------------------------------
// ÍCONES — Phosphor, o mesmo desenho da lupa que o template já traz na navbar
// (viewBox 0 0 256 256, traço preenchido em currentColor). Não é biblioteca
// nova: é o path, copiado no mesmo estilo do que já existe no DOM, para o
// sistema visual continuar um só.
const ICONES = {
  usuario: 'M230.92,212c-15.23-26.33-38.7-45.21-66.09-54.16a72,72,0,1,0-73.66,0C63.78,166.78,40.31,185.66,25.08,212a8,8,0,1,0,13.85,8c18.84-32.56,52.14-52,89.07-52s70.23,19.44,89.07,52a8,8,0,1,0,13.85-8ZM72,96a56,56,0,1,1,56,56A56.06,56.06,0,0,1,72,96Z',
  entrar: 'M141.66,133.66l-40,40A8,8,0,0,1,88,168V136H24a8,8,0,0,1,0-16H88V88a8,8,0,0,1,13.66-5.66l40,40A8,8,0,0,1,141.66,133.66ZM192,32H136a8,8,0,0,0,0,16h48V208H136a8,8,0,0,0,0,16h56a8,8,0,0,0,8-8V40A8,8,0,0,0,192,32Z',
  criar: 'M256,136a8,8,0,0,1-8,8H232v16a8,8,0,0,1-16,0V144H200a8,8,0,0,1,0-16h16V112a8,8,0,0,1,16,0v16h16A8,8,0,0,1,256,136Zm-57.87,58.85a8,8,0,0,1-12.26,10.3C165.75,181.19,138.09,168,108,168s-57.75,13.19-77.87,37.15a8,8,0,0,1-12.25-10.3c14.94-17.78,33.52-30.41,54.17-37.17a68,68,0,1,1,71.9,0C164.6,164.44,183.18,177.07,198.13,194.85ZM108,152a52,52,0,1,0-52-52A52.06,52.06,0,0,0,108,152Z',
  sacola: 'M216,64H176a48,48,0,0,0-96,0H40A16,16,0,0,0,24,80V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V80A16,16,0,0,0,216,64ZM128,32a32,32,0,0,1,32,32H96A32,32,0,0,1,128,32Zm88,168H40V80H216V200Z',
  sair: 'M112,216a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V40a8,8,0,0,1,8-8h56a8,8,0,0,1,0,16H56V208h48A8,8,0,0,1,112,216Zm109.66-93.66-40-40a8,8,0,0,0-11.32,11.32L196.69,120H112a8,8,0,0,0,0,16h84.69l-26.35,26.34a8,8,0,0,0,11.32,11.32l40-40A8,8,0,0,0,221.66,122.34Z',
  fechar: 'M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z',
};

const svg = (nome, tam) => '<svg viewBox="0 0 256 256" width="' + tam + '" height="' + tam
  + '" aria-hidden="true" focusable="false"><path d="' + ICONES[nome] + '" fill="currentColor"/></svg>';

// ---------------------------------------------------------------------------
function css() {
  return `
/* ================== conta, sessão e sacola na navbar ==================
   Duas peças: o controle na barra e o painel que desce dele. O painel
   repete o vocabulário do menu de navegação (carvão, raio 6, a mesma
   sombra), porque são vizinhos de 40px e ler como dois sistemas diferentes
   seria o defeito. Tudo com prefixo mel-, nada tocando classe do Framer.

   ⚠️ ESTA LINHA DE ABERTURA É FRONTEIRA DE BUILD, não título.
   tools/sincronizar-perfil.js acha o bloco do perfil na folha procurando
   exatamente por ela e substitui daqui até o marcador da /polen. Se ela deixar
   de ser a PRIMEIRA coisa que css() emite, a segunda sincronia passa a inserir
   um bloco novo sem apagar o velho, e a folha duplica em silêncio. Conteúdo
   novo entra DEPOIS dela.

   14/08/2026 — o bloco cresceu: além da conta e da sacola, ele carrega agora o
   TEMA DA NAVBAR, logo abaixo. Os dois assuntos moram juntos porque são a
   mesma barra, e porque o botão de conta é um dos elementos que invertem. */

/* ============ TEMA DA NAVBAR: inversão por região — 14/08/2026 ============
   O PDF pede header fixo com inversão dinâmica: marca, tipografia e ícones
   claros sobre fundo escuro, escuros sobre fundo claro, conforme a rolagem.

   O QUE HAVIA ANTES, e por que não bastava. A navbar era carvão com tinta de
   papel em todo o site, e a /bee tinha um bloco próprio que a virava do avesso
   — papel com tinta de carvão — **na página inteira**. Isso resolvia a primeira
   dobra da /bee, que é clara, e criava outro defeito adiante: de "Destaques"
   para baixo a /bee volta ao editorial escuro, e ali a barra clara virava uma
   lasca acesa atravessando uma página escura. Medido em /bee, scrollY 2500:
   fundo da nav rgb(251,247,238) sobre uma seção rgb(34,30,23).

   COMO O TEMA É DECIDIDO. Não por página, não por índice de seção, não por
   "primeira seção" e não por cor lida do fundo — todas essas quebram quando
   uma página mistura claro e escuro, que é justamente o caso da /bee e o da
   grade de produtos da home. Quem decide é uma **região explicitamente
   marcada**: só quem é claro leva data-mel-tema="claro" no HTML. O resto do
   site é escuro e continua sendo o padrão, sem marcação nenhuma.

   TRÊS CAMADAS, NESTA ORDEM DE PRECEDÊNCIA:
     1  os tokens em body — o escuro, que vale para tudo;
     2  o padrão da página, por classe (body.mel-pagina-bee abre em claro).
        É ELE que garante contraste certo no PRIMEIRO PAINT, sem JavaScript:
        a barra já nasce com o tema da região que estará debaixo dela em
        scrollY 0;
     3  html[data-mel-nav], escrito pelo controlador. Vence a camada 2 por
        construção — "html[...] body" tem uma especificidade a mais que
        "body.classe" —, então nunca precisou de !important para se impor.

   As regras abaixo consomem só os tokens. Nenhuma cor nova entra: os valores
   claros são os mesmos que a /bee já usava, e os escuros são os que a barra já
   tinha, medidos antes de mexer (fundo rgb(34,30,23), tinta rgb(251,247,238)). */
body{
  --mel-nav-fundo:${P.carvao};
  --mel-nav-tinta:${P.papel};
  --mel-nav-realce:${P.mel};
  --mel-nav-realce-fundo:rgba(251,247,238,.10);
  --mel-nav-borda:rgba(0,0,0,.05);
  --mel-nav-foco:${P.mel};
  /* O selo da sacola não inverte junto com a tinta: no escuro ele é mel sobre
     carvão, no claro ele é carvão sobre papel. Nos dois casos o anel é da cor
     da barra, que é o que o recorta do ícone. */
  --mel-nav-selo-fundo:${P.mel};
  --mel-nav-selo-tinta:${P.carvao};
}
/* O tema claro, num lugar só. #8A6A12 é o realce: mel sobre papel dá 1,88:1 e
   sumiria; este dá 4,73:1, e é o mesmo eyebrow que a /bee já usa. */
body.mel-pagina-bee,
html[data-mel-nav="claro"] body{
  --mel-nav-fundo:${P.papel};
  --mel-nav-tinta:${P.carvao};
  --mel-nav-realce:#8A6A12;
  --mel-nav-realce-fundo:rgba(34,30,23,.06);
  --mel-nav-borda:rgba(34,30,23,.12);
  --mel-nav-foco:${P.carvao};
  --mel-nav-selo-fundo:${P.carvao};
  --mel-nav-selo-tinta:${P.papel};
}
/* E o caminho de volta: o controlador precisa conseguir DESFAZER o padrão
   claro de uma página quando a barra sai da região clara. Sem esta regra a
   /bee ficaria presa no claro, que é exatamente o defeito de origem. */
html[data-mel-nav="escuro"] body{
  --mel-nav-fundo:${P.carvao};
  --mel-nav-tinta:${P.papel};
  --mel-nav-realce:${P.mel};
  --mel-nav-realce-fundo:rgba(251,247,238,.10);
  --mel-nav-borda:rgba(0,0,0,.05);
  --mel-nav-foco:${P.mel};
  --mel-nav-selo-fundo:${P.mel};
  --mel-nav-selo-tinta:${P.carvao};
}

/* 🔴 SÃO DUAS <nav>, COM NOMES DIFERENTES, e ignorar isso já custou uma
   correção inteira (registrado em progresso.md, 13/08): o template traz
   data-framer-name="Navigation Color" no desktop e "Navigation Mobile Coor" no
   mobile, com o nome truncado assim mesmo no export. Escopar pela primeira
   deixava o celular de fora — e como o ícone já tinha trocado de cor, o
   resultado era hambúrguer invisível, ainda clicável. O seletor casa pelo
   PREFIXO. O !important é porque o fundo vem de um token no atributo style da
   <nav>, e folha só vence style inline com ele. */
nav[data-framer-name^="Navigation"],
.framer-1gfj5qd-container{
  background-color:var(--mel-nav-fundo) !important;
  /* A troca é suave para não piscar entre uma região e a seguinte, e some com
     movimento reduzido (regra no fim deste bloco). 240ms é o tempo em que a
     barra retrátil já se move: as duas mudanças ficam no mesmo compasso. */
  transition:background-color 240ms ease;
}
nav[data-framer-name^="Navigation"]{ --border-color:var(--mel-nav-borda) }
/* As três barrinhas do hambúrguer, pintadas por token no style inline. */
[data-framer-name="Meniu"] [data-framer-name="1"],
[data-framer-name="Meniu"] [data-framer-name="2"],
[data-framer-name="Meniu"] [data-framer-name="3"]{
  background-color:var(--mel-nav-tinta) !important;
  transition:background-color 240ms ease;
}
/* O logo é um <symbol> só, referenciado por cinco <use> na página. Ele pinta em
   currentColor (tools/logo.js), então trocar a cor AQUI, na instância da
   navbar, não encosta na do rodapé. */
nav [data-framer-name="MELCAM"]{ color:var(--mel-nav-tinta); transition:color 240ms ease }
nav a:focus-visible,
nav button:focus-visible,
nav [tabindex]:focus-visible{ outline:2px solid var(--mel-nav-foco); outline-offset:3px }

@media (prefers-reduced-motion:reduce){
  nav[data-framer-name^="Navigation"],
  .framer-1gfj5qd-container,
  nav [data-framer-name="MELCAM"],
  [data-framer-name="Meniu"] [data-framer-name="1"],
  [data-framer-name="Meniu"] [data-framer-name="2"],
  [data-framer-name="Meniu"] [data-framer-name="3"],
  .mel-nav-link,
  .mel-perfil-bt{ transition:none }
}

/* ---- o botão de conta e o painel que desce dele ----
   A linha da navbar tem 27px de altura e o botão precisa de 44px de alvo de
   toque, então ele transborda ~8px para cada lado. Sem esta regra o transbordo
   é RECORTADO onde houver overflow:hidden: o clique funciona (a área existe),
   mas o realce redondo do hover aparece cortado em cima e embaixo. O :has
   limita a exceção à linha que de fato recebeu o botão. */
nav [data-framer-name="Section "]:has(.mel-perfil-bt),
nav [data-framer-name="Section Icon"]:has(.mel-perfil-bt){ overflow:visible }

.mel-perfil-bt{
  flex:0 0 auto;   /* a linha é flex: sem isto o botão é espremido em 320px */
  position:relative; display:inline-flex; align-items:center; justify-content:center;
  width:44px; height:44px; margin:-10px 0;   /* 44px de alvo dentro de uma faixa de 24 */
  padding:0; border:0; background:none; cursor:pointer;
  color:var(--mel-nav-tinta); border-radius:999px;
  transition:color 200ms ease, background 200ms ease, transform 200ms ease;
  -webkit-tap-highlight-color:transparent;
}
.mel-perfil-bt:hover{ color:var(--mel-nav-realce); background:var(--mel-nav-realce-fundo) }
.mel-perfil-bt:active{ transform:scale(.94) }
.mel-perfil-bt[aria-expanded="true"]{ color:var(--mel-nav-realce) }
.mel-perfil-bt svg{ display:block; width:24px; height:24px }

/* Contador da sacola: bolinha de mel no canto do ícone. Ela repete um número
   que também está escrito no item "Carrinho" do painel — nunca é a única
   fonte da informação, senão quem não enxerga cor perde o dado. */
.mel-perfil-selo{
  position:absolute; top:5px; right:4px; min-width:16px; height:16px; padding:0 4px;
  display:none; align-items:center; justify-content:center;
  background:var(--mel-nav-selo-fundo); color:var(--mel-nav-selo-tinta); border-radius:999px;
  font-family:"Area",sans-serif; font-size:.625rem; font-weight:700; line-height:1;
  /* o anel é da cor da barra: é ele que recorta o selo do ícone embaixo */
  box-shadow:0 0 0 2px var(--mel-nav-fundo);
}
.mel-perfil-selo[data-tem]{ display:flex }

/* ---- navegação visível na barra — 14/08/2026 ----
   Medido antes: em 1280px a barra mostrava DOIS controles (o logo e a conta) e
   ZERO links. Os cinco destinos existiam e funcionavam, mas só depois de
   clicar no hambúrguer — no desktop inteiro. A referência do cliente (REF MENU
   SUPERIOR, a Zerezes) traz sete links à vista. Isto fecha essa distância.

   🔴 A LINHA VIRA GRADE, E NÃO É PREFERÊNCIA.
   Ela é flex com space-between e três filhos. Acrescentar os links à esquerda
   empurraria o logo para a direita — com space-between, o filho do meio só cai
   no centro quando os dois das pontas têm a MESMA largura. Medido: o logo já
   nasce 10px fora do centro hoje, exatamente metade da diferença entre o
   hambúrguer (64) e o botão de conta (44). Com 375px de links de um lado só, o
   desvio viraria ~190px. A grade 1fr auto 1fr ancora o logo no centro
   independentemente do que cresce dos lados, e por isso as colunas são
   declaradas uma a uma: assim nenhum filho novo do template entra de penetra
   na conta e desloca tudo.

   O limiar de 1024px veio de medição, não de costume: os quatro rótulos
   ocupam 223px de texto e 375px com padding e vão. Com o logo de 178px fixo,
   a grade simétrica pede 375+178+375 = 928px de linha útil, e a linha é a
   viewport menos ~63px. O piso real é 991px; 1024 é o degrau redondo acima
   dele, com folga. */
.mel-nav-links{ display:none }
.mel-nav-acoes{ display:inline-flex; align-items:center; gap:2px; flex:0 0 auto }

.mel-nav-link{
  display:inline-flex; align-items:center; height:36px; margin-block:-5px;
  padding:0 14px; border-radius:999px;
  text-decoration:none; white-space:nowrap; color:var(--mel-nav-tinta);
  font-family:"Area",sans-serif; font-size:.85rem; font-weight:600; letter-spacing:.02em;
  transition:color 200ms ease, background 200ms ease;
  -webkit-tap-highlight-color:transparent;
}
.mel-nav-link:hover,.mel-nav-link:focus-visible{ background:var(--mel-nav-realce-fundo); color:var(--mel-nav-realce) }
/* A página atual não se distingue só por cor: leva aria-current, que o leitor
   de tela anuncia, e o peso muda junto. Cor sozinha reprova. */
.mel-nav-link[aria-current="page"]{ color:var(--mel-nav-realce); font-weight:700 }

@media (min-width:1024px){
  nav [data-framer-name="Section "]:has(.mel-nav-links){
    display:grid; grid-template-columns:1fr auto 1fr; align-items:center;
  }
  nav [data-framer-name="Section "]:has(.mel-nav-links) > [data-framer-name="Meniu"]{
    grid-column:1; justify-self:start;
  }
  nav [data-framer-name="Section "]:has(.mel-nav-links) > a[data-framer-name="MELCAM"]{
    grid-column:2; justify-self:center;
  }
  nav [data-framer-name="Section "]:has(.mel-nav-links) > .mel-nav-acoes{
    grid-column:3; justify-self:end;
  }
  /* o slot de ícones do template já sai vazio; na grade ele viraria uma quarta
     célula e roubaria a coluna do meio */
  nav [data-framer-name="Section "]:has(.mel-nav-links) > [data-framer-name="Section Icon"]{ display:none }
  .mel-nav-links{ display:flex; align-items:center; gap:2px }
  /* com os destinos à vista, o hambúrguer não tem o que abrir */
  nav [data-framer-name="Section "]:has(.mel-nav-links) [data-framer-name="Icon"]{ display:none }
}

/* A SACOLA SÓ SOBE PARA A BARRA ONDE A GRADE MANDA — e o motivo é geométrico,
   não estético. Abaixo de 1024px a linha continua flex com space-between, e
   nesse arranjo o logo só cai no centro se as duas pontas tiverem a mesma
   largura. Medido em 375px: a linha tem 327px úteis, a marca ocupa 178 (largura
   fixa do template), então sobram 74,5 para cada lado. O hambúrguer cabe (24);
   o par sacola+conta NÃO cabe (44+2+44 = 90). O logo, que hoje fica a 10px do
   centro, ia para 40px — visível, e lido como defeito.

   Não é caso de encolher os botões: 44px é alvo de toque, é requisito, e o
   qa-navbar-mobile mede exatamente isso. Também não é caso de centrar o logo
   no absoluto: em 375 a marca centrada iria de 98,5 a 276,5 e o par de botões
   começa em 261 — sobreporia por 15px. Não há espaço, e ponto.

   Então abaixo de 1024 a barra fica como já estava e passou no QA, e a
   contagem continua visível ali do mesmo jeito: o selo já mora no botão de
   conta, e o item "Carrinho" do painel repete o número por extenso. */
.mel-sacola-bt{ display:none }
@media (min-width:1024px){
  .mel-sacola-bt{ display:inline-flex }
}

.mel-perfil-menu{
  position:fixed; z-index:2147483000;
  min-width:212px; max-width:calc(100vw - 32px);
  padding:.5rem; background:${P.carvao};
  border:1px solid ${D.carvaoBorda}; border-radius:6px; box-shadow:${D.carvaoSombra};
  opacity:0; transform:translateY(-6px);
}
.mel-perfil-quem{
  padding:.5rem .625rem .625rem; margin-bottom:.25rem;
  border-bottom:1px solid ${D.carvaoBorda};
}
.mel-perfil-quem b{
  display:block; color:${P.papel}; font-family:"Area",sans-serif;
  font-size:.9375rem; font-weight:700; line-height:1.25;
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
}
.mel-perfil-quem span{
  display:block; margin-top:.15rem; color:#9A9083;
  font-family:"Area",sans-serif; font-size:.75rem; line-height:1.3;
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
}
.mel-perfil-item{
  display:flex; align-items:center; gap:.625rem; width:100%;
  min-height:44px; padding:.5rem .625rem; box-sizing:border-box;
  border:0; border-radius:4px; background:none; cursor:pointer; text-align:left;
  color:${P.papel}; text-decoration:none;
  font-family:"Area",sans-serif; font-size:.9375rem; font-weight:600; line-height:1.3;
  transition:background 180ms ease, color 180ms ease;
}
.mel-perfil-item svg{ flex:0 0 auto; width:19px; height:19px; color:#9A9083; transition:color 180ms ease }
.mel-perfil-item:hover,.mel-perfil-item:focus-visible{ background:rgba(251,247,238,.08); color:${P.mel} }
.mel-perfil-item:hover svg,.mel-perfil-item:focus-visible svg{ color:${P.mel} }
.mel-perfil-item:active{ background:rgba(251,247,238,.14) }
.mel-perfil-conta{ margin-left:auto; color:#9A9083; font-size:.8125rem; font-weight:700 }
.mel-perfil-item:hover .mel-perfil-conta{ color:${P.mel} }

/* ---- modal de acesso ----
   Cartão de papel sobre cortina escura. A escolha não é decorativa: formulário
   é a peça mais densa em texto do site, e papel dá 15,5:1 no carvão contra os
   ~8:1 do inverso. Os blocos claros da /bee já abriram esse caminho. */
.mel-acesso-cortina{
  position:fixed; inset:0; z-index:2147483100;
  display:flex; align-items:center; justify-content:center; padding:16px;
  background:rgba(14,12,9,.72); opacity:0;
  overflow-y:auto; overscroll-behavior:contain;
}
.mel-acesso{
  position:relative; width:100%; max-width:404px; box-sizing:border-box;
  padding:1.75rem 1.5rem 1.5rem; background:${P.papel};
  border-radius:10px; box-shadow:0 30px 70px -20px rgba(14,12,9,.8);
  transform:translateY(8px) scale(.985);
}
.mel-acesso-x{
  position:absolute; top:8px; right:8px; width:40px; height:40px;
  display:flex; align-items:center; justify-content:center;
  border:0; background:none; cursor:pointer; color:${D.tinta2}; border-radius:999px;
  transition:color 180ms ease, background 180ms ease;
}
.mel-acesso-x:hover{ color:${P.carvao}; background:rgba(34,30,23,.06) }
.mel-acesso-x svg{ width:20px; height:20px }
.mel-acesso-tit{
  margin:0 2rem .25rem 0; color:${P.carvao};
  font-family:"Iowan Old Style",Georgia,serif; font-weight:700;
  font-size:1.5rem; line-height:1.15; letter-spacing:-.01em;
}
.mel-acesso-sub{
  margin:0 0 1.125rem; color:${D.tinta2};
  font-family:"Area",sans-serif; font-size:.875rem; line-height:1.45;
}

/* Alternância Entrar / Criar conta: dois botões numa trilha, o ativo em papel.
   É radiogroup de verdade (role=tab), não dois links que trocam de cor. */
.mel-acesso-abas{
  display:flex; gap:4px; margin-bottom:1.125rem; padding:4px;
  background:${D.papelFundo}; border-radius:999px;
}
.mel-acesso-aba{
  flex:1; min-height:38px; padding:.5rem .75rem; border:0; border-radius:999px;
  background:none; cursor:pointer; color:${D.tinta2};
  font-family:"Area",sans-serif; font-size:.8125rem; font-weight:700;
  letter-spacing:.02em; transition:background 200ms ease, color 200ms ease;
}
.mel-acesso-aba:hover{ color:${P.carvao} }
.mel-acesso-aba[aria-selected="true"]{
  background:${P.papel}; color:${P.carvao}; box-shadow:0 1px 3px rgba(34,30,23,.12);
}

.mel-campo{ margin-bottom:.875rem }
.mel-campo label{
  display:block; margin-bottom:.3rem; color:${P.carvao};
  font-family:"Area",sans-serif; font-size:.8125rem; font-weight:700; letter-spacing:.01em;
}
.mel-campo input{
  width:100%; box-sizing:border-box; min-height:46px; padding:.7rem .875rem;
  background:#FFF; color:${P.carvao};
  border:1px solid ${D.papelBorda}; border-radius:6px;
  font-family:"Area",sans-serif; font-size:1rem; line-height:1.3;
  transition:border-color 180ms ease, box-shadow 180ms ease;
}
.mel-campo input::placeholder{ color:#9A9083 }
.mel-campo input:hover{ border-color:rgba(34,30,23,.24) }
.mel-campo input:focus{
  outline:none; border-color:${P.carvao}; box-shadow:0 0 0 3px rgba(242,169,0,.28);
}
/* O anel global de foco é mel, calibrado contra carvão: sobre papel ele dá
   1,88:1 e some. Nas zonas claras o anel é carvão — a mesma regra da /bee. */
.mel-acesso :focus-visible{ outline:2px solid ${P.carvao}; outline-offset:2px }
.mel-campo input[aria-invalid="true"]{ border-color:${D.erro} }
.mel-campo input[aria-invalid="true"]:focus{ box-shadow:0 0 0 3px rgba(179,52,28,.22) }
.mel-campo-erro{
  display:block; margin-top:.3rem; color:${D.erro};
  font-family:"Area",sans-serif; font-size:.75rem; line-height:1.35;
}
.mel-campo-dica{
  display:block; margin-top:.3rem; color:${D.tinta2};
  font-family:"Area",sans-serif; font-size:.75rem; line-height:1.35;
}

.mel-acesso-aviso{
  margin:0 0 .875rem; padding:.625rem .75rem; border-radius:6px;
  font-family:"Area",sans-serif; font-size:.8125rem; line-height:1.4;
}
.mel-acesso-aviso[data-tipo="erro"]{ background:rgba(179,52,28,.1); color:${D.erro} }
.mel-acesso-aviso[data-tipo="ok"]{ background:rgba(63,107,88,.12); color:${D.ok} }
.mel-acesso-aviso[hidden]{ display:none }

.mel-acesso-enviar{
  display:flex; align-items:center; justify-content:center; gap:.5rem;
  width:100%; min-height:48px; margin-top:.25rem;
  border:0; border-radius:999px; cursor:pointer;
  background:${P.mel}; color:${P.carvao};
  font-family:"Area",sans-serif; font-size:.9375rem; font-weight:700; letter-spacing:.02em;
  transition:background 200ms ease, transform 200ms ease;
}
.mel-acesso-enviar:hover:not([disabled]){ background:#FFC22E }
.mel-acesso-enviar:active:not([disabled]){ transform:translateY(1px) }
.mel-acesso-enviar[disabled]{ opacity:.72; cursor:progress }
.mel-acesso-giro{
  width:15px; height:15px; border-radius:999px;
  border:2px solid rgba(34,30,23,.3); border-top-color:${P.carvao};
  animation:mel-giro 700ms linear infinite;
}
@keyframes mel-giro{ to{ transform:rotate(360deg) } }

/* O rodapé do cartão é onde o site diz a verdade sobre o que esta conta é.
   Sem servidor, prometer "sua conta Melcam" seria promessa falsa. */
.mel-acesso-nota{
  margin:1rem 0 0; padding-top:.875rem; border-top:1px solid ${D.papelBorda};
  color:${D.tinta2}; font-family:"Area",sans-serif; font-size:.6875rem; line-height:1.5;
}

@media (max-width:400px){
  .mel-acesso{ padding:1.5rem 1.125rem 1.25rem }
  .mel-acesso-tit{ font-size:1.3125rem }
  .mel-perfil-menu{ min-width:0; width:calc(100vw - 24px) }
}
@media (prefers-reduced-motion:reduce){
  .mel-perfil-bt,.mel-perfil-item,.mel-acesso-aba,.mel-acesso-enviar,.mel-campo input{ transition:none }
  .mel-perfil-bt:active,.mel-acesso-enviar:active:not([disabled]){ transform:none }
  .mel-acesso-giro{ animation-duration:1800ms }
}
`;
}

// ---------------------------------------------------------------------------
function js() {
  return `
  /* ====== conta, sessão e sacola no topo ======
     Ver o cabeçalho de tools/perfil.js para o que esta autenticação é (uma
     demonstração local honesta) e o que falta para virar autenticação de
     verdade. Aqui embaixo estão só as decisões de comportamento. */

  /* ====== TEMA DA NAVBAR: um controlador, e só um ======
     Escreve data-mel-nav="claro" ou "escuro" no <html>. Quem pinta é o CSS
     (ver "TEMA DA NAVBAR" em tools/perfil.js); esta função não toca em cor,
     em classe de elemento nem em estilo inline.

     POR QUE GEOMETRIA E NÃO IntersectionObserver.
     O IO responde "entrou/saiu de uma faixa", e só dispara nas bordas dessa
     faixa. O que a barra precisa saber é outra coisa: "qual região está
     debaixo da minha meia-altura AGORA", com uma zona morta em volta do limite
     para não trocar de cor com um tremido de trackpad. Esses dois limiares — o
     de virar claro e o de virar escuro — são pontos diferentes, e faixa de IO
     só tem duas bordas: para expressar histerese com IO seriam necessários
     sentinelas ou dois observadores, que é mais peça para manter e mais jeito
     de dessincronizar. A conta geométrica dá a resposta exata com três
     getBoundingClientRect, e a decisão é uma função pura da posição — o mesmo
     scroll sempre dá o mesmo tema, rolando devagar, rápido ou para trás.

     UM listener de rolagem, passivo, coalescido em requestAnimationFrame, e
     ele só é instalado em página que TEM região clara. No site escuro inteiro
     esta função sai na segunda linha sem instalar nada. */
  function iniciarTemaNavbar() {
    var claras = [].slice.call(document.querySelectorAll('[data-mel-tema="claro"]'));
    if (!claras.length) return;

    var raiz = document.documentElement;
    var barra = document.querySelector('.framer-1gfj5qd-container')
             || document.querySelector('nav[data-framer-name^="Navigation"]');
    if (!barra) return;

    /* FOLGA cobre o vão de 10px que o stack do template deixa ENTRE seções
       (flex column com gap:10px). Sem ela, ao passar de uma região clara para
       a região clara seguinte a barra piscaria de escuro por 10px de rolagem —
       um defeito que só aparece na /bee, que tem três regiões claras seguidas.
       HISTERESE é a zona morta: uma vez claro, o limite para voltar a escuro
       desce 18px; uma vez escuro, o limite para virar claro sobe 18px. São 36px
       de folga total, e é isso que impede a barra de alternar quando o usuário
       para exatamente em cima de uma fronteira. */
    var FOLGA = 14;
    var HISTERESE = 18;
    var tema = null;
    var pendente = false;

    function decidir() {
      /* A meia-altura da barra, medida a cada quadro em que se decide: a altura
         muda entre breakpoints e a barra retrátil translada, mas o que importa
         é a faixa que ela ocupa quando visível, não onde ela está escondida. */
      var meia = (barra.getBoundingClientRect().height || 81) / 2;
      var linha = meia + (tema === 'claro' ? -HISTERESE : HISTERESE);
      for (var i = 0; i < claras.length; i++) {
        var r = claras[i].getBoundingClientRect();
        if (r.top - FOLGA <= linha && r.bottom + FOLGA > linha) return 'claro';
      }
      return 'escuro';
    }

    function pintar() {
      pendente = false;
      /* Com o menu aberto o tema CONGELA. O painel é ancorado na barra e a
         rolagem fica travada, então na prática nada muda debaixo dela — mas se
         algo mudar (um resize, um teclado virtual abrindo), trocar a cor da
         barra com o menu em cima dela é mudança de contraste sem causa visível
         para quem está lendo o menu. */
      if (document.querySelector('.mel-menu')) return;
      var novo = decidir();
      if (novo === tema) return;
      tema = novo;
      raiz.setAttribute('data-mel-nav', novo);
    }

    function agendar() {
      if (pendente) return;
      pendente = true;
      requestAnimationFrame(pintar);
    }

    /* O primeiro cálculo é síncrono e não passa pelo rAF: se o navegador
       restaurou a rolagem no meio da página, o tema certo tem que estar posto
       antes do próximo quadro, não um quadro depois. */
    pintar();
    window.addEventListener('scroll', agendar, { passive: true });
    window.addEventListener('resize', agendar, { passive: true });
    /* As fotos entram depois e empurram o layout: sem remedir, as regiões
       ficam com a geometria velha e o tema troca na altura errada. */
    window.addEventListener('load', agendar);
  }

  var PERFIL_ICONES = ${JSON.stringify(ICONES)};

  function perfilSvg(nome, tam) {
    return '<svg viewBox="0 0 256 256" width="' + tam + '" height="' + tam
      + '" aria-hidden="true" focusable="false"><path d="' + PERFIL_ICONES[nome]
      + '" fill="currentColor"/></svg>';
  }

  /* ---- porta de dados 1: contas ----
     Troque esta e a Sessao por chamadas ao backend, e nada mais muda. */
  var Contas = {
    CHAVE: 'melcam:contas',
    todas: function () {
      try { return JSON.parse(localStorage.getItem(this.CHAVE)) || []; } catch (e) { return []; }
    },
    gravar: function (v) {
      try { localStorage.setItem(this.CHAVE, JSON.stringify(v)); return true; } catch (e) { return false; }
    },
    achar: function (email) {
      var e = String(email).trim().toLowerCase();
      return this.todas().filter(function (c) { return c.email === e; })[0] || null;
    },
  };

  /* ---- porta de dados 2: sessão ----
     localStorage e não sessionStorage porque o pedido é explícito: a sessão
     sobrevive ao recarregar. Com backend isto vira cookie httpOnly. */
  var Sessao = {
    CHAVE: 'melcam:sessao',
    atual: function () {
      try { return JSON.parse(localStorage.getItem(this.CHAVE)) || null; } catch (e) { return null; }
    },
    abrir: function (conta) {
      try {
        localStorage.setItem(this.CHAVE, JSON.stringify({
          email: conta.email, nome: conta.nome, desde: Date.now(),
        }));
      } catch (e) {}
    },
    fechar: function () { try { localStorage.removeItem(this.CHAVE); } catch (e) {} },
  };

  /* ---- senha: PBKDF2-SHA-256, 210.000 iterações, sal de 16 bytes ----
     Nunca a senha. Se o WebCrypto não estiver disponível o cadastro é recusado
     com a razão na tela: guardar senha fraca para "funcionar mesmo assim" é o
     tipo de atalho que vira manchete. */
  var ITERACOES = 210000;
  function temCripto() {
    return !!(window.crypto && window.crypto.subtle && window.crypto.getRandomValues);
  }
  function hex(buf) {
    return Array.prototype.map.call(new Uint8Array(buf), function (b) {
      return ('0' + b.toString(16)).slice(-2);
    }).join('');
  }
  function derivar(senha, salHex) {
    var sal = new Uint8Array((salHex.match(/../g) || []).map(function (h) { return parseInt(h, 16); }));
    return crypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveBits'])
      .then(function (k) {
        return crypto.subtle.deriveBits(
          { name: 'PBKDF2', salt: sal, iterations: ITERACOES, hash: 'SHA-256' }, k, 256);
      }).then(hex);
  }
  function salNovo() {
    var a = new Uint8Array(16);
    crypto.getRandomValues(a);
    return hex(a.buffer);
  }
  /* Comparação em tempo constante. No cliente isto é quase teatro — quem tem o
     console tem o hash —, mas o hábito viaja para o servidor, onde importa. */
  function iguais(a, b) {
    if (a.length !== b.length) return false;
    var d = 0;
    for (var i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return d === 0;
  }

  /* ---- validação ----
     O mesmo texto de erro que a pessoa lê é o que o campo anuncia por
     aria-describedby. Uma frase só, dizendo o que fazer. */
  var RE_EMAIL = /^[^@\\s]+@[^@\\s.]+(\\.[^@\\s.]+)+$/;
  function validarNome(v) {
    v = (v || '').trim();
    if (!v) return 'Diga como quer ser chamada ou chamado.';
    if (v.length < 2) return 'Nome muito curto.';
    return '';
  }
  function validarEmail(v) {
    v = (v || '').trim();
    if (!v) return 'Digite seu e-mail.';
    if (!RE_EMAIL.test(v)) return 'E-mail inválido. Confira o @ e o ponto do domínio.';
    return '';
  }
  function validarSenha(v) {
    v = v || '';
    if (!v) return 'Digite uma senha.';
    if (v.length < 8) return 'Use pelo menos 8 caracteres.';
    if (!/[a-zA-Z]/.test(v) || !/[0-9]/.test(v)) return 'Misture letras e números.';
    return '';
  }
  function validarConfirma(a, b) {
    if (!b) return 'Repita a senha.';
    if (a !== b) return 'As senhas não são iguais.';
    return '';
  }

  function iniciarPerfil() {
    /* O template tem uma variante de navbar por breakpoint e só a do
       breakpoint ativo renderiza — a mesma armadilha do menu hambúrguer, que
       por isso liga em TODAS. Aqui é igual: um botão por variante. */
    var slots = Array.prototype.slice.call(
      document.querySelectorAll('nav [data-framer-name="Section Icon"]'));
    if (!slots.length) return;

    /* ---- higiene de acessibilidade da navbar do template ----
       Duas coisas que estavam erradas no export e ninguém via, porque as duas
       são invisíveis para quem usa mouse e olho.

       1. A lupa é um botão de 20px com color rgba(51,51,51,0): invisível, sem
          ação nenhuma, e mesmo assim recebia foco de teclado. Quem navega por
          Tab parava num controle que não existe na tela. Fica no DOM, como
          manda a casa, mas sai do caminho. */
    document.querySelectorAll('nav [aria-label="Search Icon"]').forEach(function (b) {
      b.setAttribute('tabindex', '-1');
      b.setAttribute('aria-hidden', 'true');
      b.style.pointerEvents = 'none';
    });
    /* 2. O link da marca vem com aria-hidden="true" E continua focável — é um
          <a href="/">. A combinação é proibida: o leitor de tela não anuncia
          nada, mas o Tab para ali mesmo assim, e a pessoa fica num link
          anônimo. Como ele É o caminho para a home, a correção é dar nome e
          tirar o aria-hidden, não esconder mais. */
    document.querySelectorAll('nav a[data-framer-name="MELCAM"]').forEach(function (a) {
      a.removeAttribute('aria-hidden');
      if (!a.getAttribute('aria-label')) a.setAttribute('aria-label', 'MELCAM, ir para a página inicial');
    });

    /* O SLOT VAZIO EMPURRAVA O BOTÃO PARA FORA EM 320px.
       Medido: em 320 a linha tem 272px úteis (320 menos os 24 de cada lado) e
       precisa acomodar hambúrguer (24) + marca (178, fixa) + slot (136, fixa)
       + botão (44) = 382. O slot é o único que não carrega nada: sobrou nele
       apenas a lupa inerte do template, invisível e sem ação. Com ele fora do
       cálculo sobra 246, e o botão encosta na margem direita como deve.

       Recolhido por medição, não por fé: só some se NÃO houver dentro dele
       nenhum controle visível e ainda alcançável. Se o template um dia puser
       algo de verdade ali, o slot fica — e é por isso que esta medição continua
       valendo mesmo quando o HTML já vem com o slot recolhido: ela é a
       autoridade, o atributo no arquivo é só quem chega primeiro. */
    function recolherSlot(slot) {
      var util = Array.prototype.slice.call(slot.querySelectorAll('a,button,[role="button"],img,svg'))
        .filter(function (e) {
          var r = e.getBoundingClientRect(), s = getComputedStyle(e);
          return r.width > 0 && r.height > 0 && s.visibility !== 'hidden'
            && Number(s.opacity) > 0.05 && s.pointerEvents !== 'none'
            && e.getAttribute('aria-hidden') !== 'true';
        });
      if (!util.length) slot.style.display = 'none';
    }

    var botoes = [];
    slots.forEach(function (slot) {
      /* O botão entra na LINHA da navbar, não dentro do slot de ícones.
         Medido em 13/08: o slot ("Section Icon") tem largura fixa vinda do
         Framer — 136px — e em 320px ele começa em x=226, ou seja, termina em
         362 numa tela de 320. Um botão anexado ali nascia em x=318 e o centro
         dele caía FORA da tela: aparecia recortado e não recebia clique. Não
         havia transbordo horizontal para denunciar, porque a faixa recorta.
         A linha (o pai do slot) é flex com space-between e respeita o padding
         de 24px da navbar, então o último filho dela encosta na margem direita
         em qualquer largura — que é onde o controle de conta tem de estar. */
      var linha = slot.parentElement || slot;
      /* A BARRA JÁ VEM MONTADA NO HTML desde 14/08 (tools/navbar-estatica.js),
         e é isso que acaba com o flash da barra antiga: o desenho final pinta
         no primeiro quadro, sem esperar este script. Aqui o caso passou a ser
         ADOTAR o que já existe, e não sair pela porta.

         Sair era o que este arquivo fazia, e com o HTML assado viraria defeito:
         a lista de botoes ficaria vazia, e o corte por lista vazia logo abaixo
         mataria o painel de conta, a contagem da sacola e o rótulo dos dois
         controles. A criação continua aqui, intacta, para o caso de uma página
         nova entrar no site sem passar pelo navbar-estatica. */
      var pronto = linha.querySelector('[data-mel-perfil]');

      /* ---- os quatro destinos, à vista ----
         Entram DENTRO do "Meniu", que é o bloco do hambúrguer e já é a coluna
         da esquerda. Pendurá-los direto na linha criaria um quarto filho e
         quebraria a grade de três colunas que centra o logo. A visibilidade é
         só do CSS: em telas estreitas eles ficam no DOM, escondidos, e o
         hambúrguer segue mandando. O menu do hambúrguer continua com os cinco
         itens, Home inclusive — aqui em cima Home é o próprio logo. */
      var meniu = linha.querySelector('[data-framer-name="Meniu"]') || linha;
      if (!meniu.querySelector('.mel-nav-links')) {
        var destinos = [
          { t: 'Polen', h: '/polen' },
          { t: 'Bee', h: '/bee' },
          { t: 'Acessórios', h: '/acessorios' },
          { t: 'Sobre', h: '/sobre' }
        ];
        var grupo = document.createElement('div');
        grupo.className = 'mel-nav-links';
        var aqui = location.pathname.replace(/\\/$/, '') || '/';
        destinos.forEach(function (d) {
          var a = document.createElement('a');
          a.className = 'mel-nav-link';
          a.href = d.h;
          a.textContent = d.t;
          if (aqui === d.h) a.setAttribute('aria-current', 'page');
          grupo.appendChild(a);
        });
        meniu.appendChild(grupo);
      }

      /* ---- as ações da direita, num grupo só ----
         Sacola e conta viajam juntas dentro de .mel-nav-acoes: é ela que ocupa
         a terceira coluna da grade. Sem o grupo, os dois botões seriam dois
         filhos da linha e a grade perderia a conta das colunas. */
      if (pronto) {
        botoes.push(pronto);
        recolherSlot(slot);
        return;
      }
      var acoes = document.createElement('div');
      acoes.className = 'mel-nav-acoes';

      /* A sacola é <a>, não <button>: leva para /sacola, então é navegação.
         O selo dela é o MESMO data-mel-contador-selo que pintarSelo() já
         procura — a contagem não é duplicada, só passa a aparecer em dois
         lugares. O número segue escrito por extenso no aria-label, porque uma
         bolinha colorida não é informação para quem não a enxerga. */
      var sac = document.createElement('a');
      sac.className = 'mel-perfil-bt mel-sacola-bt';
      sac.href = '/sacola';
      sac.setAttribute('data-mel-sacola-bt', '');
      sac.innerHTML = perfilSvg('sacola', 24)
        + '<span class="mel-perfil-selo" data-mel-contador-selo aria-hidden="true">0</span>';
      acoes.appendChild(sac);

      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'mel-perfil-bt';
      b.setAttribute('data-mel-perfil', '');
      b.setAttribute('aria-haspopup', 'menu');
      b.setAttribute('aria-expanded', 'false');
      b.innerHTML = perfilSvg('usuario', 24)
        + '<span class="mel-perfil-selo" data-mel-contador-selo aria-hidden="true">0</span>';
      acoes.appendChild(b);

      linha.appendChild(acoes);
      botoes.push(b);

      recolherSlot(slot);
    });
    if (!botoes.length) return;

    var vivo = document.createElement('p');
    vivo.className = 'mel-sr';
    vivo.setAttribute('aria-live', 'polite');
    document.body.appendChild(vivo);

    var painel = null;
    var ultimoFoco = null;

    /* ---------- contagem da sacola ----------
       Lê a mesma chave que iniciarSacola() grava. Não duplica a lógica do
       carrinho: só mostra o que já existe, aqui em cima. */
    function naSacola() {
      try {
        return (JSON.parse(localStorage.getItem('melcam:sacola')) || [])
          .reduce(function (a, i) { return a + (i.qtd || 0); }, 0);
      } catch (e) { return 0; }
    }
    function pintarSelo() {
      var n = naSacola();
      document.querySelectorAll('[data-mel-contador-selo]').forEach(function (s) {
        s.textContent = n > 9 ? '9+' : String(n);
        if (n > 0) s.setAttribute('data-tem', ''); else s.removeAttribute('data-tem');
      });
      botoes.forEach(function (b) { b.setAttribute('aria-label', rotuloBotao(n)); });
      /* O selo da sacola é uma bolinha colorida com um número dentro: para quem
         usa leitor de tela ele é decoração (aria-hidden), então a contagem tem
         de estar escrita no nome do link, e por extenso. */
      document.querySelectorAll('[data-mel-sacola-bt]').forEach(function (s) {
        s.setAttribute('aria-label', n
          ? 'Sacola, ' + n + ' ' + (n === 1 ? 'item' : 'itens')
          : 'Sacola, vazia');
      });
      var item = painel && painel.querySelector('[data-mel-perfil-conta]');
      if (item) item.textContent = n ? String(n) : '';
    }
    function rotuloBotao(n) {
      var s = Sessao.atual();
      var quem = s ? 'Conta de ' + s.nome : 'Entrar ou criar conta';
      return quem + (n ? ', ' + n + ' na sacola' : '');
    }

    /* ---------- o painel ----------
       Ancorado embaixo da faixa e alinhado pela DIREITA do botão: o controle
       mora na ponta direita da navbar, e um painel crescendo para a direita
       sairia da tela em 320px. */
    function montar(botao) {
      var fixo = botao;
      while (fixo && getComputedStyle(fixo).position !== 'fixed') fixo = fixo.parentElement;
      var faixa = fixo ? fixo.getBoundingClientRect() : { bottom: 64 };
      var bt = botao.getBoundingClientRect();

      var p = document.createElement('div');
      p.className = 'mel-perfil-menu';
      p.setAttribute('role', 'menu');
      p.setAttribute('aria-label', 'Conta e sacola');
      p.style.top = Math.round(faixa.bottom) + 'px';
      p.style.right = Math.max(12, Math.round(innerWidth - bt.right)) + 'px';
      p.style.maxHeight = 'calc(100vh - ' + Math.round(faixa.bottom) + 'px - 1.5rem)';
      p.style.overflowY = 'auto';

      var sessao = Sessao.atual();
      if (sessao) {
        var quem = document.createElement('div');
        quem.className = 'mel-perfil-quem';
        quem.innerHTML = '<b></b><span></span>';
        quem.querySelector('b').textContent = sessao.nome;
        quem.querySelector('span').textContent = sessao.email;
        p.appendChild(quem);
      }

      function item(icone, texto, aoAtivar, extra) {
        var e = document.createElement(aoAtivar ? 'button' : 'a');
        if (aoAtivar) e.type = 'button'; else e.href = extra;
        e.className = 'mel-perfil-item';
        e.setAttribute('role', 'menuitem');
        e.innerHTML = perfilSvg(icone, 19) + '<span></span>';
        e.querySelector('span').textContent = texto;
        if (aoAtivar) e.addEventListener('click', function () { fechar(); aoAtivar(); });
        else e.addEventListener('click', fechar);
        p.appendChild(e);
        return e;
      }

      if (!sessao) {
        item('entrar', 'Entrar', function () { abrirAcesso('entrar'); });
        item('criar', 'Criar conta', function () { abrirAcesso('criar'); });
      }
      var sacola = item('sacola', 'Carrinho', null, '/sacola');
      var conta = document.createElement('span');
      conta.className = 'mel-perfil-conta';
      conta.setAttribute('data-mel-perfil-conta', '');
      var n = naSacola();
      conta.textContent = n ? String(n) : '';
      sacola.appendChild(conta);
      /* O número tem de chegar a quem usa leitor de tela como frase, não como
         algarismo solto grudado em "Carrinho". */
      sacola.setAttribute('aria-label', n ? 'Carrinho, ' + n + ' ' + (n === 1 ? 'item' : 'itens') : 'Carrinho, vazio');

      if (sessao) item('sair', 'Sair', sair);
      return p;
    }

    /* A mesma curva do menu de navegação (MOTION_SPEC, seção 7): smoothstep em
       400ms, não ease-out. Dois painéis vizinhos com entradas diferentes se
       notam na hora. */
    function surgir(el, aoFim) {
      if (menosMovimento.matches) {
        el.style.opacity = '1'; el.style.transform = 'none';
        if (aoFim) aoFim();
        return;
      }
      var t0 = 0;
      function passo(t) {
        if (!t0) t0 = t;
        var k = Math.min((t - t0) / 400, 1);
        var s = k * k * (3 - 2 * k);
        el.style.opacity = String(s);
        el.style.transform = 'translateY(' + (-6 * (1 - s)).toFixed(2) + 'px)';
        if (k < 1) requestAnimationFrame(passo); else if (aoFim) aoFim();
      }
      requestAnimationFrame(passo);
    }

    function itens() {
      return painel ? Array.prototype.slice.call(painel.querySelectorAll('[role="menuitem"]')) : [];
    }

    function fechar(devolverFoco) {
      if (!painel) return;
      painel.remove();
      painel = null;
      botoes.forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
      if (devolverFoco && ultimoFoco && ultimoFoco.focus) ultimoFoco.focus();
    }

    function abrir() {
      /* Não conflita com o hambúrguer: quem abre avisa, e o outro fecha.
         Dois painéis abertos ao mesmo tempo em 320px cobririam a tela toda. */
      document.dispatchEvent(new CustomEvent('mel:fechar-menus', { detail: { quem: 'perfil' } }));
      ultimoFoco = document.activeElement;
      var visivel = botoes.filter(function (b) { return b.offsetHeight > 0; })[0] || botoes[0];
      painel = montar(visivel);
      document.body.appendChild(painel);
      botoes.forEach(function (b) { b.setAttribute('aria-expanded', 'true'); });
      surgir(painel, function () {
        var p = itens()[0];
        if (p) p.focus();
      });
    }

    function alternar() { if (painel) fechar(true); else abrir(); }

    botoes.forEach(function (b) {
      b.addEventListener('click', function (e) { e.stopPropagation(); alternar(); });
      b.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown' && !painel) { e.preventDefault(); abrir(); }
      });
    });

    /* Teclado dentro do painel: setas andam, Home e End vão às pontas, Escape
       fecha e devolve o foco ao botão, Tab sai fechando (não deixa foco preso
       num painel invisível). */
    document.addEventListener('keydown', function (e) {
      if (!painel) return;
      var lista = itens();
      var i = lista.indexOf(document.activeElement);
      if (e.key === 'Escape') { e.preventDefault(); fechar(true); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); (lista[(i + 1) % lista.length] || lista[0]).focus(); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); (lista[(i - 1 + lista.length) % lista.length] || lista[0]).focus(); return; }
      if (e.key === 'Home') { e.preventDefault(); lista[0].focus(); return; }
      if (e.key === 'End') { e.preventDefault(); lista[lista.length - 1].focus(); return; }
      if (e.key === 'Tab') fechar(false);
    });

    document.addEventListener('click', function (e) {
      if (!painel) return;
      if (painel.contains(e.target)) return;
      for (var i = 0; i < botoes.length; i++) {
        if (botoes[i] === e.target || botoes[i].contains(e.target)) return;
      }
      fechar(false);
    }, true);

    /* A âncora é calculada na abertura; se a janela mudar de tamanho o painel
       fecha, em vez de flutuar no lugar errado. Mesma regra do menu. */
    window.addEventListener('resize', function () { fechar(false); });
    document.addEventListener('mel:fechar-menus', function (e) {
      if (e.detail && e.detail.quem === 'perfil') return;
      fechar(false);
    });

    /* ---------- sair ---------- */
    function sair() {
      var s = Sessao.atual();
      Sessao.fechar();
      pintarSelo();
      vivo.textContent = s ? 'Sessão encerrada. Até logo, ' + s.nome + '.' : 'Sessão encerrada.';
    }

    /* ---------- modal de acesso ---------- */
    var modal = null;

    function abrirAcesso(modo) {
      if (modal) return;
      var focoAntes = document.activeElement;

      var cortina = document.createElement('div');
      cortina.className = 'mel-acesso-cortina';

      var cartao = document.createElement('div');
      cartao.className = 'mel-acesso';
      cartao.setAttribute('role', 'dialog');
      cartao.setAttribute('aria-modal', 'true');
      cartao.setAttribute('aria-labelledby', 'mel-acesso-tit');

      cartao.innerHTML =
        '<button type="button" class="mel-acesso-x" aria-label="Fechar">' + perfilSvg('fechar', 20) + '</button>'
        + '<h2 class="mel-acesso-tit" id="mel-acesso-tit"></h2>'
        + '<p class="mel-acesso-sub"></p>'
        + '<div class="mel-acesso-abas" role="tablist" aria-label="Entrar ou criar conta">'
        +   '<button type="button" class="mel-acesso-aba" role="tab" data-modo="entrar">ENTRAR</button>'
        +   '<button type="button" class="mel-acesso-aba" role="tab" data-modo="criar">CRIAR CONTA</button>'
        + '</div>'
        + '<p class="mel-acesso-aviso" role="alert" hidden></p>'
        + '<form novalidate>'
        +   '<div class="mel-campo" data-campo="nome">'
        +     '<label for="mel-nome">Nome</label>'
        +     '<input id="mel-nome" name="nome" type="text" autocomplete="name" placeholder="Como quer ser chamado">'
        +     '<span class="mel-campo-erro" id="mel-nome-erro"></span>'
        +   '</div>'
        +   '<div class="mel-campo" data-campo="email">'
        +     '<label for="mel-email">E-mail</label>'
        +     '<input id="mel-email" name="email" type="email" autocomplete="email" inputmode="email" placeholder="voce@exemplo.com">'
        +     '<span class="mel-campo-erro" id="mel-email-erro"></span>'
        +   '</div>'
        +   '<div class="mel-campo" data-campo="senha">'
        +     '<label for="mel-senha">Senha</label>'
        +     '<input id="mel-senha" name="senha" type="password" placeholder="Sua senha">'
        +     '<span class="mel-campo-erro" id="mel-senha-erro"></span>'
        +     '<span class="mel-campo-dica" data-dica-senha>Pelo menos 8 caracteres, com letras e números.</span>'
        +   '</div>'
        +   '<div class="mel-campo" data-campo="confirma">'
        +     '<label for="mel-confirma">Repita a senha</label>'
        +     '<input id="mel-confirma" name="confirma" type="password" autocomplete="new-password" placeholder="A mesma senha">'
        +     '<span class="mel-campo-erro" id="mel-confirma-erro"></span>'
        +   '</div>'
        +   '<button type="submit" class="mel-acesso-enviar"></button>'
        + '</form>'
        + '<p class="mel-acesso-nota">Esta conta vale <strong>só neste navegador</strong>: o site ainda não '
        +   'tem servidor. Nada é enviado para lugar nenhum e nenhuma senha é guardada — fica apenas um '
        +   'resumo criptográfico dela (PBKDF2), do qual a senha não pode ser recuperada.</p>';

      cortina.appendChild(cartao);
      document.body.appendChild(cortina);
      modal = cortina;

      var form = cartao.querySelector('form');
      var aviso = cartao.querySelector('.mel-acesso-aviso');
      var enviar = cartao.querySelector('.mel-acesso-enviar');
      var abas = Array.prototype.slice.call(cartao.querySelectorAll('.mel-acesso-aba'));
      var campos = {
        nome: cartao.querySelector('#mel-nome'),
        email: cartao.querySelector('#mel-email'),
        senha: cartao.querySelector('#mel-senha'),
        confirma: cartao.querySelector('#mel-confirma'),
      };
      var enviando = false;
      var atual = modo;

      /* Trava de rolagem em <html>, não no <body>: no body a página pula para o
         topo ao reabrir. Mesma lição do menu do template. */
      var travaAntes = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'hidden';

      function mostrarErro(nome, msg) {
        var campo = campos[nome];
        var alvo = cartao.querySelector('#mel-' + nome + '-erro');
        if (!campo || !alvo) return;
        alvo.textContent = msg || '';
        if (msg) {
          campo.setAttribute('aria-invalid', 'true');
          campo.setAttribute('aria-describedby', 'mel-' + nome + '-erro');
        } else {
          campo.removeAttribute('aria-invalid');
          campo.removeAttribute('aria-describedby');
        }
      }
      function dizer(tipo, msg) {
        aviso.hidden = !msg;
        aviso.setAttribute('data-tipo', tipo);
        aviso.textContent = msg || '';
      }

      function pintar() {
        var criando = atual === 'criar';
        cartao.querySelector('.mel-acesso-tit').textContent = criando ? 'Criar conta' : 'Entrar';
        cartao.querySelector('.mel-acesso-sub').textContent = criando
          ? 'Para guardar sua sacola e acompanhar seus pedidos.'
          : 'Bem-vindo de volta à colmeia.';
        enviar.textContent = criando ? 'CRIAR CONTA' : 'ENTRAR';
        abas.forEach(function (a) {
          a.setAttribute('aria-selected', String(a.getAttribute('data-modo') === atual));
        });
        cartao.querySelector('[data-campo="nome"]').hidden = !criando;
        cartao.querySelector('[data-campo="confirma"]').hidden = !criando;
        cartao.querySelector('[data-dica-senha]').hidden = !criando;
        /* autocomplete muda com o modo, senão o gerenciador de senhas oferece
           a senha salva na hora de criar uma nova. */
        campos.senha.setAttribute('autocomplete', criando ? 'new-password' : 'current-password');
        ['nome', 'email', 'senha', 'confirma'].forEach(function (n) { mostrarErro(n, ''); });
        dizer('erro', '');
      }

      abas.forEach(function (a) {
        a.addEventListener('click', function () {
          if (enviando) return;
          atual = a.getAttribute('data-modo');
          pintar();
          campos[atual === 'criar' ? 'nome' : 'email'].focus();
        });
      });

      /* Valida ao sair do campo, nunca a cada tecla: acusar erro de e-mail na
         terceira letra é hostil com quem ainda está digitando. */
      campos.email.addEventListener('blur', function () {
        if (campos.email.value) mostrarErro('email', validarEmail(campos.email.value));
      });
      campos.senha.addEventListener('blur', function () {
        if (atual === 'criar' && campos.senha.value) mostrarErro('senha', validarSenha(campos.senha.value));
      });
      campos.confirma.addEventListener('blur', function () {
        if (campos.confirma.value) mostrarErro('confirma', validarConfirma(campos.senha.value, campos.confirma.value));
      });

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (enviando) return;             // trava de envio duplo, 1 de 2

        var criando = atual === 'criar';
        var erros = {
          email: validarEmail(campos.email.value),
          senha: criando ? validarSenha(campos.senha.value) : (campos.senha.value ? '' : 'Digite sua senha.'),
        };
        if (criando) {
          erros.nome = validarNome(campos.nome.value);
          erros.confirma = validarConfirma(campos.senha.value, campos.confirma.value);
        }
        var primeiro = null;
        Object.keys(erros).forEach(function (n) {
          mostrarErro(n, erros[n]);
          if (erros[n] && !primeiro) primeiro = n;
        });
        if (primeiro) {
          dizer('erro', 'Confira os campos marcados.');
          campos[primeiro].focus();
          return;
        }

        if (!temCripto()) {
          dizer('erro', 'Este navegador não expõe o WebCrypto nesta origem, então a senha não pode '
            + 'ser protegida. O acesso foi recusado de propósito: guardar senha sem proteção seria pior.');
          return;
        }

        enviando = true;                  // trava de envio duplo, 2 de 2
        enviar.disabled = true;
        var texto = enviar.textContent;
        enviar.innerHTML = '<span class="mel-acesso-giro"></span>' + (criando ? 'CRIANDO…' : 'ENTRANDO…');
        dizer('erro', '');

        var email = campos.email.value.trim().toLowerCase();

        function falhou(msg, foco) {
          enviando = false;
          enviar.disabled = false;
          enviar.textContent = texto;
          dizer('erro', msg);
          if (foco && campos[foco]) campos[foco].focus();
        }

        if (criando) {
          if (Contas.achar(email)) {
            falhou('Já existe uma conta com este e-mail neste navegador. Entre em vez de criar.', 'email');
            return;
          }
          var sal = salNovo();
          derivar(campos.senha.value, sal).then(function (h) {
            var lista = Contas.todas();
            var conta = { nome: campos.nome.value.trim(), email: email, sal: sal,
                          hash: h, iteracoes: ITERACOES, criadaEm: Date.now() };
            lista.push(conta);
            if (!Contas.gravar(lista)) {
              falhou('Não deu para guardar a conta neste navegador. O armazenamento local pode estar cheio ou bloqueado.');
              return;
            }
            Sessao.abrir(conta);
            concluir('Conta criada. Bem-vindo, ' + conta.nome + '.');
          }).catch(function () {
            falhou('Não foi possível proteger a senha neste navegador. Nada foi gravado.');
          });
        } else {
          var conta = Contas.achar(email);
          if (!conta) {
            /* Mesma frase para e-mail inexistente e senha errada: dizer qual
               dos dois falhou entrega quais e-mails têm conta. */
            falhou('E-mail ou senha incorretos.', 'senha');
            return;
          }
          derivar(campos.senha.value, conta.sal).then(function (h) {
            if (!iguais(h, conta.hash)) { falhou('E-mail ou senha incorretos.', 'senha'); return; }
            Sessao.abrir(conta);
            concluir('Tudo certo. Olá de novo, ' + conta.nome + '.');
          }).catch(function () {
            falhou('Não foi possível verificar a senha neste navegador.');
          });
        }
      });

      function concluir(msg) {
        enviar.innerHTML = '';
        enviar.textContent = 'PRONTO';
        dizer('ok', msg);
        vivo.textContent = msg;
        pintarSelo();
        setTimeout(function () { fecharAcesso(true); }, 1100);
      }

      function fecharAcesso(devolverFoco) {
        if (!modal) return;
        document.documentElement.style.overflow = travaAntes;
        modal.remove();
        modal = null;
        if (devolverFoco && focoAntes && focoAntes.focus) focoAntes.focus();
      }

      cartao.querySelector('.mel-acesso-x').addEventListener('click', function () { fecharAcesso(true); });
      cortina.addEventListener('mousedown', function (e) { if (e.target === cortina) fecharAcesso(true); });
      cortina.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { e.preventDefault(); fecharAcesso(true); return; }
        if (e.key !== 'Tab') return;
        /* Foco preso no cartão: sem isto o Tab passeia pela página atrás da
           cortina, que é exatamente o que um diálogo modal não pode deixar. */
        var focaveis = Array.prototype.slice.call(cartao.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
          .filter(function (el) { return el.offsetParent !== null && !el.disabled; });
        if (!focaveis.length) return;
        var pri = focaveis[0], ult = focaveis[focaveis.length - 1];
        if (e.shiftKey && document.activeElement === pri) { e.preventDefault(); ult.focus(); }
        else if (!e.shiftKey && document.activeElement === ult) { e.preventDefault(); pri.focus(); }
      });

      pintar();
      if (menosMovimento.matches) {
        cortina.style.opacity = '1';
        cartao.style.transform = 'none';
      } else {
        var t0 = 0;
        requestAnimationFrame(function passo(t) {
          if (!t0) t0 = t;
          var k = Math.min((t - t0) / 260, 1);
          var s = k * k * (3 - 2 * k);
          cortina.style.opacity = String(s);
          cartao.style.transform = 'translateY(' + (8 * (1 - s)).toFixed(2) + 'px) scale('
            + (0.985 + 0.015 * s).toFixed(4) + ')';
          if (k < 1) requestAnimationFrame(passo);
        });
      }
      (atual === 'criar' ? campos.nome : campos.email).focus();
    }

    /* A sacola muda em qualquer página e em qualquer aba: o selo escuta os dois
       caminhos. O evento próprio cobre a mesma aba; o storage cobre as outras. */
    document.addEventListener('mel:sacola-mudou', pintarSelo);
    window.addEventListener('storage', function (e) {
      if (e.key === 'melcam:sacola' || e.key === 'melcam:sessao') pintarSelo();
    });
    pintarSelo();
  }
`;
}

module.exports = { css, js, ICONES, svg };
