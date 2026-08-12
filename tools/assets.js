// Copia os assets oficiais da MELCAM para dentro do site, com nomes limpos.
// Fonte preferencial: a pasta "site de referencia", que ja tem tudo tratado
// para web. Originais de 4000x6000 ficam de fora por peso.
const fs = require('fs');
const path = require('path');

const SITE = path.resolve(__dirname, '..');
const MEL = 'C:\\Users\\israe\\Downloads\\melcam';
const REF = path.join(MEL, 'TEXTOS', 'melcam-novo-site-briefing 3', 'site (baixar e abrir index no pc) site de referencia', 'assets');
const TK = path.join(MEL, 'IMAGENS', 'Toolkit (Logo, fontes, estampa))');

const OUT = path.join(SITE, 'melcam');
const mk = d => fs.mkdirSync(d, { recursive: true });
['fonts', 'logo', 'img', 'video'].forEach(d => mk(path.join(OUT, d)));

let copiados = 0, faltando = [];
function cp(src, dstRel) {
  const dst = path.join(OUT, dstRel);
  if (!fs.existsSync(src)) { faltando.push(src); return false; }
  mk(path.dirname(dst));
  fs.copyFileSync(src, dst);
  copiados++;
  return true;
}

// ---- fontes (.otf servidas direto; todo navegador atual le OTF) ----
cp(path.join(TK, 'Fonts', 'Principal - Iowan Old Style', 'Iowan Old Style BT Bold.otf'), 'fonts/iowan-old-style-bold.otf');
cp(path.join(TK, 'Fonts', 'Polen - Brooklin', 'Brooklyn Heritage Script Semi Bold.otf'), 'fonts/brooklyn-heritage-semibold.otf');

// Area: escolher os pesos uteis entre os 22 arquivos numerados
const areaDir = path.join(TK, 'Fonts', 'Apoio - Area');
if (fs.existsSync(areaDir)) {
  for (const f of fs.readdirSync(areaDir)) cp(path.join(areaDir, f), 'fonts/area/' + f);
}

// ---- logos SVG, preto e branco ----
for (const tom of ['Black', 'White']) {
  for (const v of ['Horizontal', 'Symbol', 'Type', 'Vertical']) {
    cp(path.join(TK, 'Logo', 'SVG', tom, `MELCAM_Logo_${v}.svg`), `logo/${v.toLowerCase()}-${tom === 'Black' ? 'preto' : 'branco'}.svg`);
  }
}
cp(path.join(TK, 'Pattern', 'MELCAM_Pattern.svg'), 'logo/pattern.svg');

// ---- video do hero (o tratado, 4,9 MB, em vez do original) ----
cp(path.join(REF, 'video-hero.mp4'), 'video/hero.mp4');

// ---- imagens ja tratadas do site de referencia ----
const mapa = {
  'logo.png': 'img/logo.png',
  'favicon.png': 'img/favicon.png',
  'home-bee-sunflowers.jpg': 'img/card-bee.jpg',
  'home-polen-macro.jpg': 'img/card-polen.jpg',
  'banner-bee-keychain.jpg': 'img/banner-bee.jpg',
  'banner-polen-pink.jpg': 'img/banner-polen.jpg',
  'banner-3x-honey.jpg': 'img/banner-3x.jpg',
  'lifestyle-hero-pb.jpg': 'img/hero-poster.jpg',
};
for (const [de, para] of Object.entries(mapa)) cp(path.join(REF, de), para);

// comunidade, filtros, galeria polen, lifestyle
for (const f of fs.existsSync(REF) ? fs.readdirSync(REF) : []) {
  if (/^community-\d+\.jpg$/.test(f)) cp(path.join(REF, f), 'img/comunidade/' + f);
  else if (/^filter-f\d\.jpg$/.test(f)) cp(path.join(REF, f), 'img/filtros/' + f);
  else if (/^polen-gallery-\d+\.jpg$/.test(f)) cp(path.join(REF, f), 'img/galeria-polen/' + f);
  else if (/^lifestyle-\d+\.jpg$/.test(f)) cp(path.join(REF, f), 'img/lifestyle/' + f);
  else if (/^polen-(amarela|branca|coral|marrom|preto|rosa|verde)\.png$/.test(f)) cp(path.join(REF, f), 'img/polen/' + f);
  else if (/^polen-(angulo|conjunto|amarela-frontal)\.png$/.test(f)) cp(path.join(REF, f), 'img/polen/' + f);
}
const beeDir = path.join(REF, 'bee');
for (const f of fs.existsSync(beeDir) ? fs.readdirSync(beeDir) : []) cp(path.join(beeDir, f), 'img/bee/' + f);

console.log(`copiados: ${copiados}`);
if (faltando.length) console.log('NAO ENCONTRADOS:\n' + faltando.map(f => '  ' + f).join('\n'));

// relatorio
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const todos = walk(OUT);
const mb = todos.reduce((a, f) => a + fs.statSync(f).size, 0) / 1048576;
console.log(`melcam/: ${todos.length} arquivos, ${mb.toFixed(1)} MB`);
