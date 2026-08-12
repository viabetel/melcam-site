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

const listar = (rel, re) => {
  const d = path.join(SITE, 'melcam', 'img', rel);
  return fs.existsSync(d) ? fs.readdirSync(d).filter(f => re.test(f)).sort().map(f => `/melcam/img/${rel}/${f}`) : [];
};

// ------------------------------------------------------- barra fixa (Apple)
function barra() {
  return `
<div class="mel-barra" data-mel="barra-produto">
  <div class="mel-barra-in">
    <span class="mel-barra-nome">${POLEN.nome}</span>
    <nav class="mel-barra-anc" aria-label="Seções da Polen">
      <a href="#modelos">Modelos</a>
      <a href="#filtros">Filtros</a>
      <a href="#faq">FAQ</a>
    </nav>
    <span class="mel-barra-preco">${POLEN.preco}</span>
    <a class="mel-bt mel-bt-mel" href="#modelos">Comprar</a>
  </div>
</div>`;
}

// ------------------------------------------------------------- 1. abertura
function abertura() {
  return `
<section class="mel-sec mel-abertura" aria-labelledby="mel-ab-tit">
  <div class="mel-ab-alerta" role="presentation">
    <span class="mel-ab-badge">Memória cheia</span>
    <p class="mel-ab-l1">Seu celular possui 10.000 fotos.</p>
    <p class="mel-ab-l2">Quantas realmente importam?</p>
  </div>
  <h1 id="mel-ab-tit" class="mel-tit mel-ab-tit">A Polen guarda as que importam.</h1>
  <a class="mel-bt mel-bt-mel mel-ab-cta" href="#modelos">Comprar</a>
  <div class="mel-ab-camera">
    <img src="/melcam/img/polen/polen-amarela.png" alt="Câmera digital retrô Polen">
  </div>
  <p class="mel-nota">Animação 3D de abertura <strong>a decidir</strong>.
     Composição temporária com os packshots oficiais; o scroll, a transição e a
     transformação já estão no lugar.</p>
</section>`;
}

// -------------------------------------------------------------- 2. modelos
function modelos() {
  const cards = POLEN.cores.map((c, i) => `
      <li class="mel-cor">
        <div class="mel-cor-img"><img src="${c.img}" alt="Polen ${c.nome}" loading="${i < 3 ? 'eager' : 'lazy'}"></div>
        <h3 class="mel-cor-nome">${c.nome}</h3>
        <p class="mel-cor-sub">${c.sub}</p>
        <button type="button" class="mel-bt mel-bt-linha" data-mel-add="Polen ${c.nome}">${POLEN.cta}</button>
      </li>`).join('');

  return `
<section class="mel-sec" id="modelos" aria-labelledby="mel-mod-tit">
  <div class="mel-sec-topo">
    <p class="mel-eyebrow">escolha sua Polen</p>
    <h2 id="mel-mod-tit" class="mel-tit">7 cores. Uma decisão.</h2>
    <p class="mel-preco-linha"><strong>${POLEN.preco}</strong> <span>${POLEN.condicao}</span></p>
  </div>
  <ul class="mel-cores">${cards}
  </ul>
  <p class="mel-nota">${POLEN.nota}</p>
  <p class="mel-nota"><strong>a decidir:</strong> a pasta de catálogo usa “Coral”
     e o copy aprovado usa “Laranja”. Tratados como a mesma variante até
     confirmação. Não foi criada uma oitava cor.</p>
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
  <a class="mel-bt mel-bt-mel" href="#modelos">Quero minha Polen</a>
</section>`;
}

module.exports = {
  barra, abertura, modelos, beneficios, galeria, filtros,
  diferencial, colmeia, faq, ctaFinal,
  conteudo() {
    return barra() + abertura() + modelos() + beneficios() + galeria()
      + filtros() + diferencial() + colmeia() + faq() + ctaFinal();
  },
};
