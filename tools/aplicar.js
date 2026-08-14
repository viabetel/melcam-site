// Reconstrói o site MELCAM a partir de _ORIGINAL/ aplicando melcam.config.json.
//
// ============================ DECISAO DE ARQUITETURA ========================
// A hidratacao React do Framer fica DESLIGADA neste projeto.
//
// Por que: cada texto do template existe em 3 camadas (HTML SSR, bundle .mjs
// minificado, catalogo .framercms). Com o React ativo, ele repinta a arvore a
// partir do bundle e desfaz qualquer edicao feita no HTML. A alternativa era
// editar os bundles minificados, e foi o que se tentou primeiro: palavras
// curtas como "Stock", "Product" ou "Promotions" nao sao so texto de tela, sao
// tambem identificadores e chaves de rota. Trocar solto invalidou 5 bundles e
// **a pagina ficou em branco**.
//
// Como: removemos o <script type="module" data-framer-bundle="main">, os 17
// <link rel="modulepreload"> e o js/rerouter.js.
//
// O que sobrevive: o `animator` inline de 10,8 KB, o JSON
// __framer__appearAnimationsContent e o __framer__breakpoints. Os tres sao
// inline e NAO tem nenhum import — verificado. Ou seja, as animacoes de
// entrada, o CSS inteiro (165 KB), o grid, os 3 breakpoints e o responsivo
// continuam funcionando exatamente como no template.
//
// O que se perde: as interacoes que o React dirigia (carrossel, menu mobile,
// sacola). Todas precisavam ser reescritas para a MELCAM de qualquer forma —
// o carrossel do template tem 1 slide de roupa, o nosso tem 3 banners, e a
// sacola precisa de Bee e Polen. Vao em JS proprio, respeitando os timings
// originais.
//
// Consequencia pratica: os bundles ficam intactos e o HTML passa a ser a
// unica fonte de verdade do conteudo. Edicao segura e auditavel.
// ===========================================================================
//
// Por que reconstruir do zero toda vez: o texto do template vive em 3 camadas
// (HTML SSR, bundle .mjs, catálogo .framercms). Aplicar substituição por cima
// de um arquivo já editado acumula erro e é impossível de auditar. Partindo
// sempre do original, o resultado é reproduzível e o diff é honesto.
const fs = require('fs');
const path = require('path');

const SITE = path.resolve(__dirname, '..');
const ORIG = path.join(SITE, '_ORIGINAL');
const cfg = JSON.parse(fs.readFileSync(path.join(SITE, 'melcam.config.json'), 'utf8'));

if (!fs.existsSync(ORIG)) { console.error('_ORIGINAL/ nao existe. Aborta.'); process.exit(1); }

// ---------------------------------------------------------------- mapa
// Ordem importa: string mais longa primeiro, senão uma troca curta corta a longa.
const TEXTO = [
  // --- específicas primeiro: o mesmo termo tem sentidos diferentes por lugar ---
  // O <h1> do hero era a marca; agora é a headline aprovada. A marca segue
  // vivendo no logo e no rodapé, por isso a troca é ancorada na tag.
  ['>COMETICA</h1>', '>' + cfg.home.hero.headline + '</h1>'],
  // Blurb institucional do rodapé. Precisa vir antes de "Welcome to" solto,
  // que é o badge do hero.
  ['Welcome to, your fashion destination. Discover the latest trends, find perfect pieces for your wardrobe, and enjoy seamless online shopping.',
    'Marca brasileira de câmeras digitais retrô. A Bee e a Polen nasceram da mesma ideia: fotografar com intenção, sem tela e sem distração, e guardar só o que importa.'],
  ['COMETICA, your fashion destination. Discover the latest trends, find perfect pieces for your wardrobe, and enjoy seamless online shopping.',
    'Marca brasileira de câmeras digitais retrô. A Bee e a Polen nasceram da mesma ideia: fotografar com intenção, sem tela e sem distração, e guardar só o que importa.'],
  ['Passion for fashion and comfort is reflected in every pair of sneakers. Experience style and functionality in a single step.',
    'Acessórios pensados para andar junto com a sua câmera. Categoria em preparação: em breve por aqui.'],
  ['Explore exclusive deals on our top products. The perfect opportunity to enrich your wardrobe with trendy pieces at affordable prices.',
    'Marca brasileira de câmeras digitais retrô, fotografia intencional e comunidade. Conheça quem faz a Melcam.'],

  // marca
  ['Elevating Your Style Game', cfg.home.hero.sub],
  ['Discover the Perfect Blend of Comfort and Trend with Our Exclusive Collection. Explore Deals on Jeans, Sneakers, and More!', cfg.marca.descricao],
  ['Instantly access the latest fashion trends and exclusive deals on our site. Discover your perfect style in a few clicks!', cfg.colmeia.texto],
  ['Discover Style Just a Button Press Away!', cfg.colmeia.titulo],
  ['Style and comfort meet in our collection of jeans. Discover the latest trends and perfect cuts for an impeccable look.',
    'Sem telas, sem distrações — apenas o momento. A câmera que devolve a fotografia ao lugar de sempre: a memória.'],
  ['We give you more', 'Analógica por fora, digital por dentro.'],
  ['Welcome to', cfg.home.hero.badge],
  ['COMETICA', cfg.marca.nome],
  ['CCommerce', cfg.marca.nome],
  ['moisegdesign', cfg.footer.razaoSocial],

  // navegacao e categorias
  ['T-Shirts', 'Polen'],
  ['sneakers', 'Acessórios'],
  ['Shirts', 'Bee'],
  ['Promotions', 'Sobre Nós'],
  ['Advisable', 'Sobre Nós'],
  ['TRENDING NOW', 'DESTAQUES'],
  ['Subscribe', cfg.colmeia.cta],
  ['Your email address', 'Seu e-mail'],
  ['Company', 'Ajuda'],
  ['Product', 'Produtos'],
  ['Contact', 'Fale conosco'],
  ['Blog', 'Rastrear pedido'],
  ['Privacy', 'Privacidade'],
  ['Terms', 'Termos'],
  ['Legal', 'Institucional'],

  // catalogo: roupas -> cameras
  ['T-Shirt Green Women', 'Polen Verde'],
  ['T-Shirt Green Kids', 'Polen Verde'],
  ['T-Shirt Black Women', 'Polen Preta'],
  ['T-Shirt Black Kids', 'Polen Preta'],
  ['T-Shirt White Kids', 'Polen Branca'],
  ['Shirt White Women', 'Polen Branca'],
  ['Shirt Green Women', 'Polen Verde'],
  ['Shirt Blue Women', 'Polen Rosa'],
  ['Sneakers White', 'Bee Branca'],
  ['Sneakers black', 'Bee Amarela'],
  ['Sneakers Blue', 'Bee Amarela'],
  ['Shirt White', 'Polen Branca'],
  ['Shirt Black', 'Polen Preta'],
  ['Blue Jeans', 'Polen Amarela'],
  ['White Jeans', 'Polen Branca'],
  ['Black Jeans', 'Polen Preta'],
  ['Comfort Curves', 'Analógica por fora'],
  ['High-Rise Hustle', 'Digital por dentro'],
  ['Vintage Vibes', 'Estética vintage'],
  ['Full-Stock', 'Em estoque'],
  ['Out-Of-Stock', 'Esgotado'],
  ['Jeans', 'Polen'],
  ['Stock', 'Estoque'],

  // precos aprovados
  ['$150.00', cfg.produtos.polen.preco],
  ['$100.00', cfg.produtos.polen.preco],
  ['$94.00', cfg.produtos.bee.preco],
  ['$50.00', cfg.produtos.bee.preco],
  ['$200', cfg.produtos.polen.preco],
  ['$125', cfg.produtos.bee.preco],
  ['$100', cfg.produtos.polen.preco],

  ['2 Styles Available', '2 cores disponíveis'],
  ['3 Styles Available', '7 cores disponíveis'],
  ['1 Styles Available', '1 cor disponível'],
  ['© 2024', '© 2026'],
  ['. All rights reserved.', '. Todos os direitos reservados.'],
];

// ---------------------------------------------------------------- utilitarios
function trocar(texto, pares) {
  let n = 0;
  for (const [de, para] of pares) {
    if (!de || de === para) continue;
    const partes = texto.split(de);
    if (partes.length > 1) { n += partes.length - 1; texto = partes.join(para); }
  }
  return { texto, n };
}

// No JS minificado a mesma palavra pode ser texto de tela OU identificador,
// chave de rota, nome de campo. Trocar solto quebra o bundle e o Framer
// limpa a pagina inteira. Por isso, em .js/.mjs so trocamos quando a string
// esta entre aspas e fecha exatamente — "Jeans" sim, jeansTotal nao.
function trocarNoJS(texto, pares) {
  let n = 0;
  for (const [de, para] of pares) {
    if (!de || de === para) continue;
    for (const q of ['"', "'", '`']) {
      const alvo = q + de + q;
      const partes = texto.split(alvo);
      if (partes.length > 1) { n += partes.length - 1; texto = partes.join(q + para + q); }
    }
  }
  return { texto, n };
}

const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Guarda de sintaxe: se a edicao invalidar um bundle, ele volta ao original.
// Vale mais um texto em ingles depois da hidratacao do que a pagina em branco.
const vm = require('vm');
function jsValido(src) {
  try { new vm.SourceTextModule(src); return true; }
  catch (e) { return /SourceTextModule/.test(String(e)) ? true : false; }
}

const isTexto = f => /\.(html|mjs|js|json|css|framercms)$/i.test(f);

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    if (e.name === '_ORIGINAL') return [];
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

// ---------------------------------------------------------------- 1. restaurar
console.log('1. restaurando de _ORIGINAL/');
for (const src of walk(ORIG)) {
  const rel = path.relative(ORIG, src);
  const dst = path.join(SITE, rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
}

// ---------------------------------------------------------------- 2. texto
console.log('2. aplicando substituicoes de texto nas 3 camadas');
const relatorio = {};
const quebrados = [];
for (const f of walk(SITE)) {
  const rel = path.relative(SITE, f);
  if (rel.startsWith('melcam' + path.sep) || rel.startsWith('tools' + path.sep)) continue;
  if (!isTexto(f)) continue;

  // .framercms e binario: trata como latin1 para nao corromper bytes
  const bin = /\.framercms$/i.test(f);
  const js = /\.(mjs|js)$/i.test(f);
  const enc = bin ? 'latin1' : 'utf8';
  let src = fs.readFileSync(f, enc);

  // Os bundles .mjs/.js NAO sao mais tocados. Ver "DECISAO DE ARQUITETURA"
  // no topo deste arquivo: a hidratacao React foi desligada, entao o que o
  // bundle contem deixou de importar. Editar codigo minificado a cego era a
  // causa da pagina em branco.
  if (js) continue;

  let texto, n;
  if (bin) {
    // No binario so trocamos quando o tamanho bate, senao os offsets quebram.
    ({ texto, n } = trocar(src, TEXTO.filter(([de, para]) => Buffer.byteLength(de) === Buffer.byteLength(para))));
  } else {
    ({ texto, n } = trocar(src, TEXTO));
  }

  if (n) { fs.writeFileSync(f, texto, enc); relatorio[rel] = n; }
}

const total = Object.values(relatorio).reduce((a, b) => a + b, 0);
console.log(`   ${total} substituicoes em ${Object.keys(relatorio).length} arquivos`);
for (const [f, n] of Object.entries(relatorio).sort((a, b) => b[1] - a[1]).slice(0, 12)) {
  console.log(`     ${String(n).padStart(4)}  ${f}`);
}

// ---------------------------------------------------------------- 3. limpeza
console.log('3. removendo rastreio e links de afiliado do autor do template');
let limpos = 0;
for (const f of walk(SITE)) {
  const rel = path.relative(SITE, f);
  if (rel.startsWith('melcam' + path.sep) || rel.startsWith('tools' + path.sep)) continue;
  if (!/\.html$/i.test(f)) continue;   // limpeza de tags e so no HTML
  let s = fs.readFileSync(f, 'utf8');
  const antes = s;

  // --- estado inicial de SSR ---
  // O Framer marca 19 nos com style="...opacity:0.001..." como placeholder de
  // pre-hidratacao: quem apaga isso e o React ao assumir a arvore. Com a
  // hidratacao desligada, esses nos ficariam invisiveis para sempre — foi o
  // que aconteceu (hero e cards em branco, so o rodape aparecia).
  //
  // So 1 dos 20 nos com data-framer-appear-id tem entrada no JSON de animacao.
  // Esse continua animando: o animator aplica o proprio `initial` a partir do
  // JSON, entao nao depende do style inline. Os outros 18 passam a nascer
  // visiveis, que e exatamente o que o React faria.
  // Vale para os dois placeholders que o Framer usa: 0.001 e 0.
  // Excecao: os nos chamados "Glow" sao zero por design (brilho de hover).
  s = s.replace(/<[a-z]+[^>]*>/gi, (tag) => {
    if (!/style="[^"]*opacity:\s*0(?:\.001)?\s*[;"]/.test(tag)) return tag;
    if (/data-framer-name="Glow"/.test(tag)) return tag;
    return tag.replace(/(style="[^"]*?)opacity:\s*0(?:\.001)?\s*([;"])/g, '$1opacity:1$2');
  });

  // --- desliga a hidratacao React (ver DECISAO DE ARQUITETURA no topo) ---
  s = s.replace(/<script[^>]*data-framer-bundle="main"[^>]*>\s*<\/script>/gi, '');
  s = s.replace(/<script[^>]*\bsrc="js\/script_main[^"]*"[^>]*>\s*<\/script>/gi, '');
  s = s.replace(/<link[^>]*rel="modulepreload"[^>]*>/gi, '');
  s = s.replace(/<script[^>]*\bsrc="js\/rerouter\.js"[^>]*>\s*<\/script>/gi, '');

  // bloco do Google Tag Manager
  s = s.replace(/<script[^>]*googletagmanager[^>]*><\/script>/g, '');
  s = s.replace(/<script(?![^>]*\bsrc=)[^>]*>[^<]*gtag\('config'[^<]*<\/script>/g, '');
  // Links de afiliado do autor. Eram os perfis sociais dele. Redes sociais da
  // MELCAM sao PENDENTE, e o briefing proibe publicar link falso — entao o
  // icone fica sem destino e declarado como pendente, em vez de apontar para
  // a home fingindo que existe.
  s = s.replace(/href="https?:\/\/dub\.sh\/[^"]*"/g, 'href="#" aria-disabled="true" title="a decidir"');
  s = s.replace(/https?:\/\/dub\.sh\/[^"'\s)]*/g, '#');
  // conserta o que a troca de texto ja tinha estragado antes desta etapa
  s = s.replace(/href="\/\s*(?:Melcam\s+)?LTDA"/g, 'href="#" aria-disabled="true" title="a decidir"');

  // Preload das fontes Inter do CDN. A @font-face pode ficar (o navegador so
  // baixa se usar), mas o preload forca o pedido externo mesmo sem uso — e a
  // Area assumiu o corpo do texto, entao Inter nao e mais buscada.
  s = s.replace(/<link[^>]+rel="preload"[^>]*(?:framerusercontent|fonts\.gstatic)[^>]*>/gi, '');
  s = s.replace(/<link[^>]+(?:framerusercontent|fonts\.gstatic)[^>]*rel="preload"[^>]*>/gi, '');
  s = s.replace(/<link[^>]+rel="preconnect"[^>]*(?:framerusercontent|gstatic|googleapis|framerstatic)[^>]*>/gi, '');

  if (s !== antes) { fs.writeFileSync(f, s, 'utf8'); limpos++; }
}
console.log(`   limpos: ${limpos} arquivos`);
if (quebrados.length) {
  console.log(`   REVERTIDOS por sintaxe (bundle preservado): ${quebrados.length}`);
  quebrados.forEach(f => console.log('     ' + f));
}

// ---------------------------------------------------------------- 4. identidade
console.log('4. identidade: fontes, paleta, favicon');
const ident = require('./identidade.js');
console.log(`   @font-face: ${ident.gerarFontes()}  |  tokens de cor: ${ident.gerarIdentidade()}`);

const TITULOS = {
  'index.html': ['MELCAM — Câmeras digitais retrô', cfg.marca.descricao],
  'contact.html': ['Fale conosco — MELCAM', 'Fale com a Melcam. Suporte humanizado, trocas, devoluções e dúvidas sobre a Bee e a Polen.'],
  'faq.html': ['Perguntas frequentes — MELCAM', 'Dúvidas sobre as câmeras Bee e Polen: filtros, bateria, envio, garantia de 90 dias e devolução.'],
  'privacy-policy.html': ['Política de privacidade — MELCAM', 'Como a Melcam trata os seus dados.'],
  'terms-and-conditions.html': ['Termos e condições — MELCAM', 'Termos de uso e condições de compra da Melcam.'],
};

let paginas = 0;
for (const f of walk(SITE)) {
  const rel = path.relative(SITE, f);
  if (rel.startsWith('melcam' + path.sep) || rel.startsWith('tools' + path.sep)) continue;
  if (!/\.html$/i.test(f)) continue;
  let s = fs.readFileSync(f, 'utf8');

  // idioma correto
  s = s.replace(/<html([^>]*)\slang="[^"]*"/i, '<html$1 lang="pt-BR"');
  if (!/<html[^>]*\blang=/i.test(s)) s = s.replace(/<html/i, '<html lang="pt-BR"');

  // titulo e description por pagina
  const [titulo, desc] = TITULOS[rel.replace(/\\/g, '/')] || [
    `${cfg.marca.nome} — Câmeras digitais retrô`, cfg.marca.descricao];
  s = s.replace(/<title>[\s\S]*?<\/title>/i, `<title>${titulo}</title>`);
  s = s.replace(/(<meta\s+name="description"\s+content=")[^"]*(")/i, `$1${desc}$2`);
  s = s.replace(/(<meta\s+property="og:title"\s+content=")[^"]*(")/i, `$1${titulo}$2`);
  s = s.replace(/(<meta\s+name="twitter:title"\s+content=")[^"]*(")/i, `$1${titulo}$2`);
  s = s.replace(/(<meta\s+(?:property="og:description"|name="twitter:description")\s+content=")[^"]*(")/gi, `$1${desc}$2`);

  // Um <h1> por página: o primeiro fica (é o hero), os demais viram <h2>.
  // Só o nome da tag muda, o DOM segue balanceado.
  let primeiro = true;
  s = s.replace(/<h1(\s[^>]*)?>([\s\S]*?)<\/h1>/g, (m, at, dentro) => {
    if (primeiro) { primeiro = false; return m; }
    return `<h2${at || ''}>${dentro}</h2>`;
  });

  // favicon antigo do template fora
  s = s.replace(/<link[^>]+rel="icon"[^>]*>/gi, '');

  // identidade entra por ultimo no head, para vencer o CSS inline do Framer
  if (!s.includes('/melcam/identidade.css')) s = s.replace(/<\/head>/i, ident.blocoHead() + '</head>');

  // Fontes no TOPO do head: preload das faces de cima da dobra + a folha de
  // @font-face, que substituiu o @import de dentro do identidade.css.
  // Idempotente — injetarFontes remove o bloco antigo antes de por o novo.
  s = ident.injetarFontes(s, path.basename(f));

  fs.writeFileSync(f, s, 'utf8');
  paginas++;
}
console.log(`   ${paginas} paginas com lang, title, description, OG e favicon MELCAM`);

// ---------------------------------------------------------------- 4b. logo
const logo = require('./logo.js').aplicar(walk(SITE));
console.log(`   logo MELCAM no lugar do lettering COMETICA: ${logo.n} simbolos em ${logo.arquivos} paginas`);

// ---------------------------------------------------------------- 5. imagens
console.log('5. imagens: CDN do Framer -> assets oficiais MELCAM');
const imgs = require('./imagens.js');
const r = imgs.aplicar(walk(SITE));
console.log(`   ${r.trocas} URLs trocadas em ${r.arquivos} arquivos  |  ${r.alts} alt reescritos em pt-BR`);

const sobrou = walk(SITE)
  .filter(f => /\.(html|mjs|js)$/i.test(f) && !path.relative(SITE, f).startsWith('melcam'))
  .map(f => (fs.readFileSync(f, 'utf8').match(/framerusercontent\.com\/images\/[A-Za-z0-9]+/g) || []))
  .flat();
const restantes = [...new Set(sobrou.map(u => u.split('/').pop()))];
if (restantes.length) {
  const cap = require('./a-decidir.js').capturar(walk(SITE));
  console.log(`   ${restantes.length} sem mapa -> placeholder "a decidir" (${cap.n} URLs em ${cap.arquivos} arquivos)`);
} else {
  console.log('   nenhuma imagem remota restante');
}

const externas = walk(SITE)
  .filter(f => /\.(html|mjs|js)$/i.test(f) && !path.relative(SITE, f).startsWith('melcam'))
  .flatMap(f => (fs.readFileSync(f, 'utf8').match(/https?:\/\/(framerusercontent|app\.framerstatic|fonts\.gstatic|dub\.sh|www\.googletagmanager)[^"'\s)]*/g) || []));
console.log(`   dependencias externas restantes: ${new Set(externas.map(u => new URL(u).host)).size} host(s) ${[...new Set(externas.map(u => new URL(u).host))].join(', ') || '(nenhum)'}`);

// ------------------------------------------------------- 6. hero e carrossel
console.log('6. video do hero, carrossel de banners e ticker');
const hc = require('./hero-carrossel.js').aplicar(walk(SITE));
console.log(`   video: ${hc.video}  |  carrossel: ${hc.carrossel}  |  interacoes.js: ${hc.script}`);

// -------------------------------------- 7. comunidade, clipes, seguranca
console.log('7. comunidade, clipes e barra de seguranca');
const cs = require('./comunidade.js').aplicar(walk(SITE));
console.log(`   inseridas em ${cs.n} pagina  |  ${cs.fotos} fotos de comunidade`);

// ------------------------------------------------------- 7b. LP Polen
const pgs = require('./paginas.js').aplicar();
console.log(`   paginas internas geradas: ${pgs.join(', ')}`);

// --------------------------------------------------------- 7c. rotas
const rt = require('./rotas.js').aplicar(walk(SITE));
console.log(`   rotas reapontadas: ${rt.n} href em ${rt.arquivos} paginas`);

// ----------------------------------------------------------- 7d. SEO
const seo = require('./seo.js').aplicar();
console.log(`   SEO: robots.txt, sitemap.xml e Schema.org em ${seo.n} paginas (base ${seo.base})`);

// ------------------------------------------------- 8. integridade do DOM
const alvo = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8');
const base = fs.readFileSync(path.join(ORIG, 'index.html'), 'utf8');
const dif = t => (t.match(/<\/div>/g) || []).length - (t.match(/<div/g) || []).length;
const secOk = (alvo.match(/<section/g) || []).length === (alvo.match(/<\/section>/g) || []).length;
console.log('8. integridade do DOM');
console.log(`   div (fecha - abre): atual ${dif(alvo)} | original ${dif(base)} ${dif(alvo) === dif(base) ? 'OK' : '<<< DESBALANCEADO'}`);
console.log(`   section balanceadas: ${secOk ? 'OK' : '<<< DESBALANCEADO'}`);

console.log('\npronto. servidor: node serve.js  ->  http://localhost:3030');
