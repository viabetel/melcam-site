// 13/08/2026 — ATENCAO: um hash pode alimentar DOIS slots do mesmo card.
// O card "Sobre Nos" tem dois wrappers absolutos que sangram para fora, e os
// dois usam E60m9ySte60CtImTqU; card-polen.jpg atende 3 slots. Trocar por hash
// poe a MESMA foto nos dois lugares e o card parece partido ao meio.
// A desduplicacao por slot vive em tools/desduplicar-cards.js, que roda DEPOIS
// desta troca. Se acrescentar mapa aqui, conferir la tambem.
// Troca as imagens remotas do template (framerusercontent.com) pelos assets
// oficiais da MELCAM, nas 3 camadas, e reescreve os alt (que vinham em romeno).
//
// A troca e por hash do arquivo remoto, nao por posicao: assim o mesmo mapa
// vale para HTML, bundle e indice de busca, e nada depende da ordem do DOM.
const fs = require('fs');
const path = require('path');
const SITE = path.resolve(__dirname, '..');

// ---------------------------------------------------------------- o mapa
// hash remoto -> { arquivo local, alt em pt-BR }
// Contexto de cada grupo levantado por tools/mapear-imgs.js.
const M = {
  // --- A FILEIRA EDITORIAL ABAIXO DO HERO ---
  //
  // Sao os 10 nos "Image 1".."Image 10" dentro de data-framer-name="Header",
  // entre o <h1> do hero e o texto "A camera que vive com voce".
  // CSS do template: height:80vh, aspect-ratio:.666667 (2:3 vertical),
  // border-radius:4px, em flex-flow:row com gap:20px.
  //
  // E a banda de maior presenca visual da home. Alterna Bee e Polen, com as
  // fotos de maior resolucao disponiveis — nunca packshot de catalogo, que
  // aqui viraria miniatura.
  Xm41plWll9uX9U8FI6: ['/melcam/img/card-bee.jpg', 'Câmera Bee em uso'],
  '6V5Ya6DiTUPrbKLquU': ['/melcam/img/card-polen.jpg', 'Câmera Polen em detalhe'],
  sSBESgjiJWd6cwKIAm: ['/melcam/img/bee/bee-lifestyle-acessorio.jpg', 'Bee pendurada como acessório'],
  xLauhR5pIcD3jSEfJs: ['/melcam/img/galeria-polen/polen-gallery-01.jpg', 'Foto real feita com a Polen'],
  OJDNbGuzVk6A8Iq5bP: ['/melcam/img/bee/bee-lifestyle-tela.jpg', 'Bee, a menor da colmeia'],
  denWHUSajJRWeN8fw6: ['/melcam/img/galeria-polen/polen-gallery-03.jpg', 'Foto sem edição, direto da Polen'],
  jxfdnRKBIg3NgooyzF: ['/melcam/img/galeria-polen/polen-gallery-06.jpg', 'Memória guardada com a Polen'],
  df5MKiO9s4Enl3fzuk: ['/melcam/img/lifestyle/lifestyle-02.jpg', 'Registro do dia a dia feito na Melcam'],
  dOwh3KUyFEZINS7C79: ['/melcam/img/galeria-polen/polen-gallery-04.jpg', 'Foto real feita com a Polen'],
  w2y9F3Ob15aIghBkLt: ['/melcam/img/lifestyle/lifestyle-06.jpg', 'Analógica por fora, digital por dentro'],

  // --- blocos de categoria (2048x2048) — REVERTIDOS ao estado aprovado.
  // Estes NAO sao a fileira abaixo do hero. Mexer aqui foi engano.
  FjKNVoEAMRLGsukZcC: ['/melcam/img/card-polen.jpg', 'Câmera Polen em detalhe'],
  HNAuZFLWI8pxao4CT3: ['/melcam/img/card-polen.jpg', 'Câmera digital retrô Polen'],
  '4SVyyM18vIAscFF45M': ['/melcam/img/card-bee.jpg', 'Câmera Bee, a menor da colmeia'],
  zGHc2xM8TXfaP0Kill: ['/melcam/img/bee/bee-lifestyle-acessorio.jpg', 'Bee pendurada como acessório'],
  E60m9ySte60CtImTqU: ['/melcam/img/comunidade/community-03.jpg', 'Comunidade Melcam fotografando'],

  // --- marquee
  d20Z0EMhlfZPRfWYcd: ['/melcam/img/galeria-polen/polen-gallery-01.jpg', 'Foto feita com a Polen, sem edição'],

  // --- cards de produto (1024x1024): 7 cores da Polen + 2 da Bee, e o resto
  //     recebe galeria real em vez de repetir packshot.
  H2lD1wbQgNQJOFWzv6: ['/melcam/img/polen/polen-amarela.png', 'Polen Amarela'],
  hKi14x2EJdOqlY7tV0: ['/melcam/img/polen/polen-branca.png', 'Polen Branca'],
  '7pPtmQnOe0HtA5CzJM': ['/melcam/img/polen/polen-coral.png', 'Polen Laranja'],
  tm2naYCJCl1CpS0YJJ: ['/melcam/img/polen/polen-marrom.png', 'Polen Marrom'],
  JFVPvnkBFfpqh3p50q: ['/melcam/img/polen/polen-preto.png', 'Polen Preta'],
  N8n9AACRdqrIMFeKgg: ['/melcam/img/polen/polen-rosa.png', 'Polen Rosa'],
  HcYRufuH0L1i8HETbq: ['/melcam/img/polen/polen-verde.png', 'Polen Verde'],
  mxOD2EdPpQTvsdb7pn: ['/melcam/img/bee/bee-catalogo-amarela-frente.jpg', 'Bee Amarela'],
  oMv0h3P8whNPGwtUG1: ['/melcam/img/bee/bee-catalogo-branca-frente.jpg', 'Bee Branca'],
  B73PH8avLmaIeu8V9i: ['/melcam/img/polen/polen-angulo.png', 'Polen vista em ângulo'],
  '6isPgVJrEoLEhJsfo0': ['/melcam/img/polen/polen-conjunto.png', 'Conjunto de câmeras Polen'],
  JgKZzDalFFmq4lsQOc: ['/melcam/img/galeria-polen/polen-gallery-02.jpg', 'Foto feita com a Polen'],
  z55wVpasPB5T1MXnVm: ['/melcam/img/galeria-polen/polen-gallery-03.jpg', 'Foto feita com a Polen'],
  BhQQrZ1sE8Vmk7gijZ: ['/melcam/img/galeria-polen/polen-gallery-04.jpg', 'Foto feita com a Polen'],
  nxcW6ieYyqUGcBSMpc: ['/melcam/img/favicon.png', 'Símbolo da Melcam'],
  mikToIV1SoCqQhyveq: ['/melcam/img/galeria-polen/polen-gallery-05.jpg', 'Foto feita com a Polen'],
  BXSaHvzSYEqCOjcJMq: ['/melcam/img/galeria-polen/polen-gallery-06.jpg', 'Foto feita com a Polen'],
  q0bvSJ9ax4gsNAlPlR: ['/melcam/img/galeria-polen/polen-gallery-07.jpg', 'Foto feita com a Polen'],
  r7ZkwPqq1P5lz7Ebw2: ['/melcam/img/galeria-polen/polen-gallery-08.jpg', 'Foto feita com a Polen'],

  // --- rodape: bandeiras de pagamento. Sem gateway definido, nao afirmamos
  //     bandeira nenhuma. Viram o simbolo da marca e o texto vira "a decidir".
  Nw90SIdLQKIdHiNqfL: ['/melcam/logo/symbol-branco.svg', 'Meio de pagamento a decidir'],
  QUXCWKuepJu9WOicM1: ['/melcam/logo/symbol-branco.svg', 'Meio de pagamento a decidir'],
  mFN7qRFb6aBfqn8RZt: ['/melcam/logo/symbol-branco.svg', 'Meio de pagamento a decidir'],
  wF1FvkGQKavYUtCR8N: ['/melcam/logo/symbol-branco.svg', 'Meio de pagamento a decidir'],
  mP89rOLcHZd2NwwX4E: ['/melcam/img/bee/bee-catalogo-amarela-frente.jpg', 'Câmera Bee Amarela'],
};

const vm = require('vm');
const jsOk = src => { try { new vm.SourceTextModule(src); return true; } catch (e) { return /SourceTextModule/.test(String(e)); } };

function aplicar(walk) {
  let trocas = 0, alts = 0, arquivos = 0;

  for (const f of walk) {
    const rel = path.relative(SITE, f);
    if (rel.startsWith('melcam' + path.sep) || rel.startsWith('tools' + path.sep)) continue;
    // Só HTML: a hidratação React está desligada (ver DECISAO DE ARQUITETURA
    // em aplicar.js), então o bundle não pinta nada e não deve ser tocado.
    if (!/\.html$/i.test(f)) continue;
    let s = fs.readFileSync(f, 'utf8');
    const antes = s;

    for (const [hash, [local]] of Object.entries(M)) {
      // qualquer URL do CDN que contenha o hash, com qualquer extensao/params
      const re = new RegExp('https://framerusercontent\\.com/images/' + hash + '[^"\'\\s,)\\\\]*', 'g');
      const n = (s.match(re) || []).length;
      if (n) { s = s.replace(re, local); trocas += n; }
    }

    // srcset do Framer aponta para variantes redimensionadas: some com ele,
    // senao o navegador volta a pedir o arquivo remoto. So no HTML — no JS
    // esses padroes aparecem dentro de codigo e a remocao quebra o bundle.
    if (/\.html$/i.test(f)) {
      s = s.replace(/\ssrcset="[^"]*framerusercontent[^"]*"/g, '');
      s = s.replace(/\ssizes="[^"]*"/g, '');
    }

    if (s !== antes && (!/\.(mjs|js)$/i.test(f) || jsOk(s))) {
      fs.writeFileSync(f, s, 'utf8'); arquivos++;
    }
  }

  // alt em romeno -> pt-BR, por arquivo local ja apontado
  for (const f of walk) {
    const rel = path.relative(SITE, f);
    if (rel.startsWith('melcam' + path.sep) || rel.startsWith('tools' + path.sep)) continue;
    if (!/\.html$/i.test(f)) continue;
    let s = fs.readFileSync(f, 'utf8');
    const antes = s;
    s = s.replace(/<img([^>]*?)>/g, (tag) => {
      const src = (tag.match(/src="([^"]+)"/) || [])[1] || '';
      const entrada = Object.values(M).find(([local]) => src.includes(local));
      if (!entrada) return tag;
      alts++;
      return /alt="/.test(tag)
        ? tag.replace(/alt="[^"]*"/, `alt="${entrada[1]}"`)
        : tag.replace(/<img/, `<img alt="${entrada[1]}"`);
    });
    if (s !== antes) fs.writeFileSync(f, s, 'utf8');
  }

  return { trocas, alts, arquivos };
}

module.exports = { aplicar, MAPA: M };
