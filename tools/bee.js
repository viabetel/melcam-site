// LP Bee — /bee
const fs = require('fs');
const path = require('path');
const SITE = path.resolve(__dirname, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(SITE, 'melcam.config.json'), 'utf8'));
const BEE = cfg.produtos.bee;

const listar = (rel, re) => {
  const d = path.join(SITE, 'melcam', 'img', rel);
  return fs.existsSync(d) ? fs.readdirSync(d).filter(f => re.test(f)).sort().map(f => `/melcam/img/${rel}/${f}`) : [];
};

function barra() {
  return `
<div class="mel-barra" data-mel="barra-produto">
  <div class="mel-barra-in">
    <span class="mel-barra-nome">${BEE.nome}</span>
    <nav class="mel-barra-anc" aria-label="Seções da Bee">
      <a href="#modelos">Modelos</a>
      <a href="#destaques">Destaques</a>
    </nav>
    <span class="mel-barra-preco">${BEE.preco}</span>
    <a class="mel-bt mel-bt-mel" href="#modelos">Comprar</a>
  </div>
</div>`;
}

// Abertura — OPÇÃO 1 do briefing, escolhida.
// Motivo: a opção 1 (Bee branca balança, gira e vira amarela) se apoia em
// transform de um elemento único, que é exatamente o que o `animator` inline
// do template sabe fazer sem o runtime React. A opção 2 (a página mergulha no
// mel durante o scroll) exigiria scroll-linked animation, que morreu junto com
// a hidratação. Escolher a 1 preserva movimento de verdade em vez de simular
// mal a 2. As duas não foram misturadas.
function abertura() {
  const branca = '/melcam/img/bee/bee-branca-frente.png';
  const amarela = '/melcam/img/bee/bee-amarela-frente.png';
  return `
<section class="mel-sec mel-abertura mel-bee-abertura" aria-labelledby="mel-bee-tit">
  <p class="mel-eyebrow">antes do mel</p>
  <p class="mel-ab-l1 mel-bee-l1">Antes do mel, é só uma câmera.</p>
  <div class="mel-bee-palco" data-mel-bee-palco>
    <img class="mel-bee-cam mel-bee-branca" src="${branca}" alt="Câmera Bee branca">
    <img class="mel-bee-cam mel-bee-amarela" src="${amarela}" alt="Câmera Bee amarela">
  </div>
  <h1 id="mel-bee-tit" class="mel-tit">Abelhas fazem mel, essa faz memórias</h1>
  <p class="mel-col-txt">Bee, a menor da colmeia</p>
  <a class="mel-bt mel-bt-mel mel-ab-cta" href="#modelos">Comprar</a>
  <p class="mel-nota">Render 3D final <strong>a decidir</strong>. A animação usa
     os packshots oficiais: a Bee branca gira e vira amarela, que é a
     <strong>opção 1</strong> do briefing. A opção 2 depende de animação ligada
     ao scroll, que não sobrevive sem o runtime do Framer.</p>
</section>`;
}

function modelos() {
  const cards = BEE.cores.map((c, i) => `
      <li class="mel-cor mel-cor-bee">
        <h3 class="mel-cor-nome">${c.nome}</h3>
        <div class="mel-cor-img"><img src="${c.img}" alt="${c.nome}" loading="${i ? 'lazy' : 'eager'}"></div>
        <p class="mel-preco-linha"><strong>${BEE.preco}</strong> <span>${BEE.condicao}</span></p>
        <button type="button" class="mel-bt mel-bt-mel" data-mel-add="${c.nome}">${BEE.cta}</button>
      </li>`).join('');

  return `
<section class="mel-sec" id="modelos" aria-labelledby="mel-bmod-tit">
  <div class="mel-sec-topo">
    <p class="mel-eyebrow">escolha sua Bee</p>
    <h2 id="mel-bmod-tit" class="mel-tit">Duas cores. Uma companheira.</h2>
  </div>
  <ul class="mel-cores mel-cores-2">${cards}
  </ul>
  <p class="mel-nota">${BEE.nota}</p>
</section>`;
}

// Destaques na hierarquia obrigatória do briefing.
const SPECS_BEE = [
  'Vídeo Full HD 1080p e 720p', 'Tela LCD TFT de 0,96"', 'Lente grande-angular de 130°',
  'MicroSD/TF de até 128 GB, não incluso', 'Bateria de 300 mAh',
  'Autonomia estimada de 30 a 40 minutos', 'USB-C 5V/1A', 'Aproximadamente 26 g',
  'Fotos', 'Gravação de áudio', 'Disparo contínuo', 'Gravação em loop', 'Filtros criativos',
];
function destaques() {
  const fotos = listar('bee', /lifestyle|filtro/i);
  const acessorio = fotos.find(f => /acessor/i.test(f)) || '/melcam/img/a-decidir.svg';
  const tela = fotos.find(f => /tela/i.test(f)) || '/melcam/img/a-decidir.svg';

  return `
<section class="mel-sec" id="destaques" aria-labelledby="mel-dest-tit">
  <div class="mel-sec-topo">
    <p class="mel-eyebrow">destaques</p>
    <h2 id="mel-dest-tit" class="mel-tit">Pequena o bastante para ir junto</h2>
  </div>

  <div class="mel-dest">
    <div class="mel-dest-img"><img src="${acessorio}" alt="Bee pendurada como acessório" loading="lazy"></div>
    <div class="mel-dest-txt">
      <h3>Câmera como acessório</h3>
      <p>Sua Bee chega pronta pra pendurar na chave, na mochila ou no pescoço — é
         só tirar da caixa e sair fotografando. Uma câmera pequena que te
         acompanha em cada lugar.</p>
    </div>
  </div>

  <div class="mel-dest mel-dest-inv">
    <div class="mel-dest-img"><img src="${tela}" alt="Foto feita com a Bee, com filtro retrô" loading="lazy"></div>
    <div class="mel-dest-txt">
      <h3>Filtros e estética retrô</h3>
      <p>A Bee tem 11 filtros para escolher, aplicados no momento da foto ou do
         vídeo. Estética vintage lembrando os anos 2000.</p>
    </div>
  </div>

  <div class="mel-dest-specs">
    <h3>Filmagem e fotografia</h3>
    <ul class="mel-specs">${SPECS_BEE.map(s => `<li>${s}</li>`).join('')}</ul>
  </div>
</section>`;
}

// A COLMÉIA SAIU EM 13/08/2026, a pedido, junto com a da /polen.
//
// Era a seção "o clube da marca / Entre para a Colméia" fechando a página, com
// eyebrow, título, parágrafo, os três perks, o CTA "Quero entrar na Colméia" e
// a nota de cadastro a decidir. As duas páginas de produto usavam o mesmo
// bloco, então saíram na mesma passada — o pedido numa vale para a equivalente.
//
// A home NÃO foi tocada: lá o bloco é a seção do template Framer
// (data-framer-name "Speed On"), outra implementação, e não foi pedida.
// `cfg.colmeia` continua no config, com o texto aprovado intacto.
module.exports = {
  conteudo() { return barra() + abertura() + modelos() + destaques(); },
};
