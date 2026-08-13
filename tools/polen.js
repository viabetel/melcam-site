// LP Polen — /polen
//
// A página nasce como cópia do index.html: herda nav, rodapé, os 165 KB de CSS
// inline, o animator e os 3 breakpoints. As seções da home saem por CSS
// (nunca por recorte de DOM) e o conteúdo da Polen entra antes do <footer>.
const fs = require('fs');
const path = require('path');
const SITE = path.resolve(__dirname, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(SITE, 'melcam.config.json'), 'utf8'));
const P = cfg.paleta;
const POLEN = cfg.produtos.polen;
const polenUI = require('./polen-interacoes.js');

const listar = (rel, re) => {
  const d = path.join(SITE, 'melcam', 'img', rel);
  return fs.existsSync(d) ? fs.readdirSync(d).filter(f => re.test(f)).sort().map(f => `/melcam/img/${rel}/${f}`) : [];
};

// A BARRA FIXA DA POLEN SAIU — 13/08/2026, a pedido.
// Era a faixa sticky com Polen · Produto · Filtros · FAQ · preço · Comprar.
// Duas razões, as duas visíveis na captura do cliente: ela empurrava o hero
// para baixo da navbar principal criando uma segunda barra logo abaixo da
// primeira, e o CTA "Comprar" competia com o "Escolha sua cor" do hero, que é
// o próximo passo certo. As âncoras não ficaram órfãs: #produto continua sendo
// destino do CTA do hero e do CTA final, e #filtros e #faq seguem existindo.
// A Bee NÃO foi afetada: ela tem a própria barra() em tools/bee.js, e o CSS
// .mel-barra em tools/paginas.js continua no lugar porque é ela quem usa.

// ------------------------------------------------------------- 1. hero
//
// Reconstruído em 13/08/2026. O que havia antes era o cartão "Memória cheia"
// mais um packshot solto e uma nota dizendo que a animação 3D estava a decidir.
// O render 3D continua pendente e continua não sendo inventado: o hero agora se
// apoia no que existe de verdade — o packshot oficial — tratado como peça
// editorial, não como espera de outra arte.
//
// A Bee é "novidade"; a Polen é ESCOLHA. Por isso o CTA é único e leva à
// seleção de cores logo abaixo, em vez de "Comprar" genérico.
const HERO = {
  // Texto do cliente, no pedido de 13/08. Diz a mesma coisa que o copy aprovado
  // do bloco da home ("sem tela, apenas o momento"), com mais precisão para uma
  // abertura de LP. Não afirma nada novo sobre o produto.
  texto: 'Sem tela para conferir, apagar ou repetir. Você fotografa o momento e '
       + 'segue vivendo. O resto você descobre depois.',
  cta: 'Escolha sua cor',

  // FOTO PRINCIPAL — escolhida abrindo os arquivos, não pelo nome.
  // 1600x2400, a Polen preta dentro da caixa oficial em mel, com o padrão favo
  // e a etiqueta "Polen". É a única foto do acervo que mostra produto E marca
  // na mesma cena, e o mel da embalagem entrega o acento da identidade sem
  // precisar de nenhum enfeite.
  //
  // object-position: a câmera ocupa a faixa vertical de ~25% a ~67% do arquivo.
  // Num painel de meia tela em 1440x900 o cover recorta ~200px de topo e base
  // (em coordenadas do original), então a câmera fica inteira com o centro
  // padrão. Medido, não estimado.
  foto: '/melcam/img/header-fileira/polen-lp-1.jpg',
  fotoAlt: 'Câmera Polen preta dentro da caixa da Melcam, sobre outras caixas',

  // Cor que a seção de produto abre selecionada. É a mesma da foto do hero
  // (a Polen preta na caixa), então a passagem de uma seção para a outra não
  // troca de produto no meio do caminho.
  // ⚠️ produto() depende deste campo: sem ele nenhum swatch nasce marcado.
  corInicial: 'Preta',
};

function hero() {
  // Os três números saem do config e das specs da própria página — nada aqui
  // é afirmação nova: 7 é POLEN.cores.length, 8 é POLEN.filtros.length e as
  // 1000 fotos estão nas specs e no FAQ (cartão de 4 GB).
  const apoio = `${POLEN.cores.length} cores · ${POLEN.filtros.length} filtros · até 1000 fotos`;

  return `
<section class="mel-ph" data-mel="polen-hero" aria-labelledby="mel-ph-tit">
  <div class="mel-ph-foto" data-mel="polen-hero-main">
    <img src="${HERO.foto}" alt="${HERO.fotoAlt}"
         width="1600" height="2400" fetchpriority="high">
  </div>

  <!-- Scrim: garante a leitura do texto por cima da borda da fotografia.
       Funcional, não enfeite. -->
  <div class="mel-ph-scrim" aria-hidden="true"></div>

  <div class="mel-ph-in">
    <div class="mel-ph-copy" data-mel="polen-hero-copy">
      <p class="mel-ph-eyebrow">${POLEN.nome}</p>
      <h1 id="mel-ph-tit" class="mel-ph-tit">A <span class="mel-ph-assin">Polen</span> guarda as que importam.</h1>
      <p class="mel-ph-txt">${HERO.texto}</p>
      <a class="mel-bt mel-bt-mel mel-ph-cta" href="#produto" data-mel="polen-hero-cta">${HERO.cta}</a>
      <p class="mel-ph-apoio">${apoio}</p>
    </div>
  </div>
</section>`;
}

// -------------------------------------------------- 2. produto e seleção
//
// Substitui a grade de 7 cards. O cliente pediu SELEÇÃO: um produto em
// destaque e um controle que troca a variante. Sete cards competiam entre si e
// repetiam preço e CTA sete vezes.
//
// O palco é quadrado e travado em aspect-ratio 1 com object-fit:contain,
// porque os packshots são 800x800 e trazem o próprio fundo — a caixa não muda
// de tamanho ao trocar de cor e a câmera nunca é cortada.
function produto() {
  const swatches = POLEN.cores.map((c, i) => {
    const sel = c.nome === HERO.corInicial;
    // A cor do disco é AMOSTRADA do PNG oficial em tempo de build; se o
    // arquivo sumir, cai numa superfície neutra e o nome continua sendo o
    // rótulo acessível.
    const cor = polenUI.corDoTile(c.img, '#2B251C');
    return `
        <button type="button" role="radio" class="mel-pr-swatch"
                aria-checked="${sel}" tabindex="${sel ? 0 : -1}"
                data-mel-cor="${i}" data-nome="${c.nome}" data-sub="${c.sub}"
                data-img="${c.img}" style="--sw:${cor}">
          <span class="mel-sr">${c.nome}</span>
        </button>`;
  }).join('');

  const ini = POLEN.cores.find((x) => x.nome === HERO.corInicial) || POLEN.cores[0];

  return `
<section class="mel-sec" id="produto" data-mel="polen-produto" aria-labelledby="mel-pr-tit">
  <div class="mel-sec-topo">
    <p class="mel-eyebrow">escolha sua Polen</p>
    <h2 id="mel-pr-tit" class="mel-tit">${POLEN.cores.length} cores. Uma decisão.</h2>
  </div>

  <div class="mel-pr-grade">
    <div class="mel-pr-palco">
      <img class="mel-pr-foto" data-mel="polen-palco-a" src="${ini.img}"
           alt="Câmera digital retrô Polen, na cor ${ini.nome}"
           width="800" height="800">
      <!-- Camada B do crossfade. Nasce com a MESMA imagem da A, não vazia: um
           <img> sem src conta como imagem quebrada na auditoria e pode desenhar
           o ícone de quebrado. Mesmo arquivo, mesma requisição em cache. -->
      <img class="mel-pr-foto mel-pr-foto-fora" data-mel="polen-palco-b" src="${ini.img}"
           alt="" aria-hidden="true" width="800" height="800">
    </div>

    <div class="mel-pr-info">
      <p class="mel-pr-linha">${POLEN.nome}</p>
      <p class="mel-pr-cor" data-mel="polen-nome">${ini.nome}</p>
      <p class="mel-pr-sub" data-mel="polen-sub">${ini.sub}</p>
      <p class="mel-pr-preco"><strong>${POLEN.preco}</strong> <span>${POLEN.condicao}</span></p>

      <p class="mel-pr-rot" id="mel-pr-cores-rot">Cor</p>
      <div class="mel-pr-cores" role="radiogroup" aria-labelledby="mel-pr-cores-rot"
           data-mel="polen-cores">${swatches}
      </div>

      <button type="button" class="mel-bt mel-bt-mel mel-pr-cta" data-mel="polen-cta"
              data-mel-add="Polen ${ini.nome}" data-mel-rotulo="${POLEN.cta}"
              aria-label="${POLEN.cta} Polen ${ini.nome}">${POLEN.cta}</button>

      <p class="mel-nota">${POLEN.nota}</p>
      <p class="mel-nota"><strong>a decidir:</strong> a pasta de catálogo usa “Coral”
         e o copy aprovado usa “Laranja”. Tratados como a mesma variante até
         confirmação. Não foi criada uma oitava cor.</p>
    </div>
  </div>

  <p class="mel-sr" aria-live="polite" data-mel="polen-vivo"></p>
</section>`;
}

// ----------------------------------------------------------- 3. benefícios
function beneficios() {
  const itens = POLEN.beneficios.map(b => `<li>${b}</li>`).join('');
  return `
<section class="mel-benef" aria-label="Benefícios da Polen">
  <ul class="mel-benef-lista">${itens}</ul>
</section>`;
}

// -------------------------------------------------------------- 4. galeria
function galeria() {
  const fotos = listar('galeria-polen', /\.(jpg|jpeg|png|webp)$/i);
  const itens = fotos.map(src => `
      <li class="mel-gal-item"><img src="${src}" alt="Foto real feita com a Polen, sem edição" loading="lazy"></li>`).join('');
  return `
<section class="mel-sec" aria-labelledby="mel-gal-tit">
  <div class="mel-sec-topo">
    <p class="mel-eyebrow">Feitas com a Polen</p>
    <h2 id="mel-gal-tit" class="mel-tit">Fotos reais, sem edição nenhuma</h2>
  </div>
  <ul class="mel-galeria">${itens}
  </ul>
</section>`;
}

// -------------------------------------------------------------- 5. filtros
function filtros() {
  const imgs = listar('filtros', /\.(jpg|jpeg|png|webp)$/i);
  const pills = POLEN.filtros.map((f, i) => `
      <button type="button" class="mel-pill" role="tab" id="pill-${i}"
              aria-selected="${i === 0}" aria-controls="mel-filtro-img"
              data-mel-filtro="${i}" data-src="${imgs[i] || '/melcam/img/a-decidir.svg'}">${f}</button>`).join('');

  return `
<section class="mel-sec" id="filtros" aria-labelledby="mel-fil-tit">
  <div class="mel-sec-topo">
    <p class="mel-eyebrow">experimente seu filtro favorito</p>
    <h2 id="mel-fil-tit" class="mel-tit">Uma foto. 8 filtros</h2>
  </div>
  <div class="mel-filtro-palco">
    <img id="mel-filtro-img" src="${imgs[0] || '/melcam/img/a-decidir.svg'}"
         alt="A mesma foto com o filtro ${POLEN.filtros[0]}" data-mel-filtro-img>
  </div>
  <div class="mel-pills" role="tablist" aria-label="Filtros da Polen">${pills}
  </div>
  <p class="mel-tag">Filtros aplicados na hora do clique, direto na câmera.</p>
  <p class="mel-sr" aria-live="polite" data-mel-filtro-vivo></p>
</section>`;
}

// ----------------------------------------------------------- 6. diferencial
const SPECS = [
  'Experiência analógica real', 'Sem tela e sem distrações',
  'Bateria recarregável para até 1000 fotos, dependendo do uso do flash',
  'Dimensões 11,4 × 6,4 × 2,5 cm', 'Flash LED integrado', 'Resolução de 12 MP',
  'Cartão de 4 GB para até 1000 fotos', 'Carregamento e transferência por USB-C',
  'Oito filtros com estética vintage',
];
function diferencial() {
  return `
<section class="mel-sec" aria-labelledby="mel-dif-tit">
  <div class="mel-sec-topo">
    <p class="mel-eyebrow">o diferencial</p>
    <h2 id="mel-dif-tit" class="mel-tit">Analógica por fora, digital por dentro</h2>
  </div>
  <ul class="mel-specs">${SPECS.map(s => `<li>${s}</li>`).join('')}</ul>
</section>`;
}

// -------------------------------------------------------------- 7. colméia
function colmeia() {
  const c = cfg.colmeia;
  return `
<section class="mel-sec mel-colmeia" aria-labelledby="mel-col-tit">
  <p class="mel-eyebrow">${c.eyebrow}</p>
  <h2 id="mel-col-tit" class="mel-tit">${c.titulo}</h2>
  <p class="mel-col-txt">${c.texto}</p>
  <ul class="mel-perks">${c.perks.map(p => `<li>${p}</li>`).join('')}</ul>
  <a class="mel-bt mel-bt-mel" href="#" data-mel-colmeia>${c.cta}</a>
  <p class="mel-nota">Cadastro da Colméia <strong>a decidir</strong>: sem backend
     integrado, o site não afirma que o envio foi feito.</p>
</section>`;
}

// ------------------------------------------------------------------ 8. FAQ
const FAQ = [
  ['A Polen tem tela?', 'Não. É proposital: sem tela, você fotografa olhando a cena e não o visor. A revisão acontece depois, no computador ou no celular.'],
  ['Como vejo as fotos?', 'Pelo cabo USB-C, conectando a câmera ao computador, ou tirando o cartão MicroSD. As fotos saem prontas, com o filtro já aplicado.'],
  ['Quantas fotos cabem?', 'O cartão de 4 GB que vem incluso armazena até 1000 fotos.'],
  ['Quanto dura a bateria?', 'A bateria recarregável dá conta de até 1000 fotos, variando conforme o uso do flash.'],
  ['Como funcionam os filtros?', 'São 8 filtros aplicados na hora do clique, direto na câmera. Você escolhe antes de fotografar, como num filme.'],
  ['Como funciona o envio?', 'Envio para todo o Brasil. <strong>Prazos e transportadora a decidir.</strong>'],
  ['Qual é a garantia?', 'Garantia de 90 dias, mais 7 dias para trocar ou devolver.'],
];
function faq() {
  const itens = FAQ.map(([q, a], i) => `
      <li class="mel-faq-item">
        <button type="button" class="mel-faq-q" aria-expanded="false"
                aria-controls="faq-r-${i}" id="faq-q-${i}" data-mel-faq>
          <span>${q}</span>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9.5 12 15.5 18 9.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <div class="mel-faq-r" id="faq-r-${i}" role="region" aria-labelledby="faq-q-${i}" hidden>
          <p>${a}</p>
        </div>
      </li>`).join('');

  return `
<section class="mel-sec" id="faq" aria-labelledby="mel-faq-tit">
  <div class="mel-sec-topo">
    <p class="mel-eyebrow">dúvidas</p>
    <h2 id="mel-faq-tit" class="mel-tit">Perguntas frequentes</h2>
  </div>
  <ul class="mel-faq">${itens}
  </ul>
</section>`;
}

// ------------------------------------------------------------ 9. CTA final
function ctaFinal() {
  return `
<section class="mel-sec mel-cta-final">
  <h2 class="mel-tit">A última foto que você tirou valeu a pena?</h2>
  <p class="mel-col-txt">Largue o celular, pegue sua Polen e redescubra o que é fotografar com intenção.</p>
  <a class="mel-bt mel-bt-mel" href="#produto">Quero minha Polen</a>
</section>`;
}

module.exports = {
  hero, produto, beneficios, galeria, filtros,
  diferencial, colmeia, faq, ctaFinal,
  conteudo() {
    // hero() e produto() substituíram abertura() e modelos() em 13/08/2026.
    // O resto da página não mudou de ordem: a Colméia fecha, depois do CTA
    // final, igual à Bee — o convite para a comunidade é o último passo, não
    // uma interrupção entre o diferencial e o FAQ.
    return hero() + produto() + beneficios() + galeria()
      + filtros() + diferencial() + faq() + ctaFinal() + colmeia();
  },
};
