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

// HERO — "uma câmera para levar junto", 13/08/2026.
//
// SUBSTITUI a abertura anterior (a Bee branca girando e virando amarela, que
// era a "opção 1" do briefing). Aquela cena dependia de um loop infinito de
// rotateY e vivia numa página em carvão. O pedido novo é outro: hero clara,
// solar, editorial, com personalidade própria em relação à Polen — e sem nada
// se movendo depois da entrada. Loop infinito e falso giro 3D estão fora por
// escrito, então a cena antiga não podia sobreviver com retoque.
//
// O render 3D final da Bee continua em PENDENTES do melcam.config.json e
// continua não sendo inventado. A diferença é que a página parou de exibir
// essa espera como nota ao visitante: o hero se apoia nos packshots oficiais
// tratados como peça editorial, que é o mesmo caminho que a /polen tomou.
//
// ESCOLHA DOS DOIS ASSETS, com os arquivos abertos antes (nunca pelo nome):
//   bee-amarela-angulo-corrente.png  1072x620  RGBA, recorte de verdade
//     A câmera em três quartos COM a correntinha e o mosquetão. É o único par
//     de arquivos do acervo que traz a alça, e a alça é a linha de movimento
//     que o pedido descreve — sem precisar desenhar linha nenhuma.
//   bee-branca-frente.png             685x340  RGBA, recorte de verdade
//     De frente, silhueta chapada. Diferente da outra de propósito: duas
//     câmeras no mesmo ângulo leriam como repetição, não como par.
//
// Descartados, e por quê:
//   bee-branca-angulo-corrente.png — espelha a amarela, mesma pose, mesma
//     direção de corrente. Juntas ficavam duas fotos iguais em cores
//     diferentes.
//   bee-lifestyle-acessorio.jpg — a melhor foto de "acessório" do acervo, mas
//     ela JÁ É a imagem do bloco "Câmera como acessório" desta mesma página.
//     Repetir no hero seria a mesma foto duas vezes em /bee.
//   header-fileira/bee-lp-1169.jpg — as duas Bees na mão contra o mar do Rio.
//     Linda e solar, mas é azul de ponta a ponta: dominaria uma página cuja
//     assinatura é o mel, e azul não pertence à paleta.
//   *-caixa.png e *-traseira.png — embalagem e verso não abrem uma página.
function hero() {
  const amarela = '/melcam/img/bee/bee-amarela-angulo-corrente.png';
  const branca = '/melcam/img/bee/bee-branca-frente.png';
  // Derivado, não digitado: se o config ganhar uma terceira cor, a linha muda
  // sozinha. "foto e vídeo" e "filtros retrô" saem das SPECS_BEE abaixo, que
  // são as aprovadas — nenhuma especificação nova entra aqui.
  const apoio = `${BEE.cores.length} cores · foto e vídeo · filtros retrô`;

  return `
<section class="mel-bh" data-mel="bee-hero" aria-labelledby="mel-bee-tit">
  <div class="mel-bh-in">
    <div class="mel-bh-copy" data-mel="bee-hero-copy">
      <p class="mel-bh-eyebrow">Bee</p>
      <h1 id="mel-bee-tit" class="mel-bh-tit">Pequena o bastante para ir junto.</h1>
      <p class="mel-bh-txt">Sem peso, sem cerimônia. Uma câmera digital retrô
         feita para fotografar e continuar vivendo o momento.</p>
      <a class="mel-bt mel-bh-cta" data-mel="bee-hero-cta" href="#modelos">Escolha sua Bee</a>
      <p class="mel-bh-apoio">${apoio}</p>
    </div>
  </div>
  <!-- O palco vem DEPOIS do texto no DOM por dois motivos que apontam para o
       mesmo lado: no celular a coluna única precisa abrir pela manchete, que
       é o que explica a página, e para quem lê por leitor de tela a ordem
       lógica também é texto e depois produto. No desktop nada muda: o palco
       é posicionado, não empilhado.
       A forma de mel mora AQUI DENTRO, e não solta no hero: assim ela e as
       duas câmeras compartilham um sistema de coordenadas só. Enquanto ela
       ficou presa ao hero, o retrato media a altura dela contra a página
       inteira e o plano amarelo passava de 582px onde cabiam 190. -->
  <div class="mel-bh-palco">
    <div class="mel-bh-forma" aria-hidden="true"></div>
    <img class="mel-bh-cam mel-bh-branca" data-mel="bee-hero-branca"
         src="${branca}" width="685" height="340" decoding="async"
         alt="A Bee branca, de frente, com a faixa colorida sob a lente.">
    <img class="mel-bh-cam mel-bh-amarela" data-mel="bee-hero-amarela"
         src="${amarela}" width="1072" height="620" decoding="async"
         alt="A Bee amarela vista de três quartos, presa a uma correntinha com mosquetão, do tamanho de um chaveiro.">
    <p class="mel-bh-cores">
      <span class="mel-bh-cor mel-bh-cor-amarela" aria-hidden="true"></span>Amarela
      <i aria-hidden="true">·</i>
      <span class="mel-bh-cor mel-bh-cor-branca" aria-hidden="true"></span>Branca
    </p>
  </div>
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
    <!-- 13/08/2026 — este <h2> era "Pequena o bastante para ir junto", que
         passou a ser o <h1> do hero novo. Manter os dois deixaria a MESMA
         manchete duas vezes na mesma página, palavra por palavra — o defeito
         que já foi corrigido na /polen, onde o card do Header Grid repetia o
         título da seção de produto. O texto novo é derivado de spec aprovada
         ("Aproximadamente 26 g", logo abaixo nesta mesma seção): nada novo foi
         afirmado. Se o cliente preferir a frase antiga aqui, o hero é que
         precisa de outro título. -->
    <h2 id="mel-dest-tit" class="mel-tit">O que cabe em 26 gramas</h2>
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
  conteudo() { return barra() + hero() + modelos() + destaques(); },
};
