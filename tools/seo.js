// robots.txt, sitemap.xml, Schema.org e Open Graph.
const fs = require('fs');
const path = require('path');
const SITE = path.resolve(__dirname, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(SITE, 'melcam.config.json'), 'utf8'));

// O domínio de produção ainda não foi definido. Fica num só lugar: trocar aqui
// regenera robots, sitemap, canonical e todo o Schema.
const BASE = cfg.site && cfg.site.baseUrl ? cfg.site.baseUrl : 'https://www.melcam.com.br';

const ROTAS = [
  { url: '/', arquivo: 'index.html', prio: '1.0', freq: 'weekly' },
  { url: '/polen', arquivo: 'polen.html', prio: '0.9', freq: 'weekly' },
  { url: '/bee', arquivo: 'bee.html', prio: '0.9', freq: 'weekly' },
  { url: '/acessorios', arquivo: 'acessorios.html', prio: '0.4', freq: 'monthly' },
  { url: '/sobre', arquivo: 'sobre.html', prio: '0.5', freq: 'monthly' },
  { url: '/sacola', arquivo: 'sacola.html', prio: '0.2', freq: 'monthly', noindex: true },
];

// ---------------------------------------------------------------- robots
function robots() {
  return `# MELCAM
User-agent: *
Allow: /
Disallow: /sacola
Disallow: /404

Sitemap: ${BASE}/sitemap.xml
`;
}

// --------------------------------------------------------------- sitemap
function sitemap() {
  const hoje = new Date().toISOString().slice(0, 10);
  const itens = ROTAS.filter(r => !r.noindex).map(r => `  <url>
    <loc>${BASE}${r.url}</loc>
    <lastmod>${hoje}</lastmod>
    <changefreq>${r.freq}</changefreq>
    <priority>${r.prio}</priority>
  </url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemap.org/schemas/sitemap/0.9".replace>
${itens}
</urlset>
`.replace('"http://www.sitemap.org/schemas/sitemap/0.9".replace', '"http://www.sitemaps.org/schemas/sitemap/0.9"');
}

// ------------------------------------------------------------- Schema.org
//
// Só afirma o que é verdade. Sem CNPJ, endereço, telefone e redes sociais
// confirmados, esses campos NAO entram — dado falso em Schema é pior que
// ausência: o Google usa para painel de conhecimento.
function organization() {
  return {
    '@type': 'Organization',
    '@id': BASE + '/#organizacao',
    name: 'MELCAM',
    url: BASE,
    logo: BASE + '/melcam/logo/horizontal-preto.svg',
    description: cfg.marca.tagline,
    email: 'melcam@melcam.com.br',
    // sameAs, address, taxID e telephone: a decidir, não publicados
  };
}

function website() {
  return {
    '@type': 'WebSite',
    '@id': BASE + '/#site',
    url: BASE,
    name: 'MELCAM',
    inLanguage: 'pt-BR',
    publisher: { '@id': BASE + '/#organizacao' },
  };
}

function produto(p, slug, imagens) {
  const preco = p.preco.replace(/[^\d,]/g, '').replace(',', '.');
  return {
    '@type': 'Product',
    '@id': BASE + '/' + slug + '#produto',
    name: 'Melcam ' + p.nome,
    url: BASE + '/' + slug,
    image: imagens.map(i => BASE + i),
    brand: { '@type': 'Brand', name: 'MELCAM' },
    description: slug === 'polen'
      ? 'Câmera digital retrô sem tela, com 8 filtros aplicados na hora do clique, 12 MP, flash LED e cartão MicroSD de 4 GB incluso.'
      : 'Mini câmera-chaveiro digital com 11 filtros, vídeo Full HD, tela LCD de 0,96", lente grande-angular de 130° e 26 g.',
    offers: {
      '@type': 'Offer',
      url: BASE + '/' + slug,
      priceCurrency: 'BRL',
      price: preco,
      // availability e seller ficam de fora: estoque real é a decidir
    },
  };
}

function breadcrumb(nome, url) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE + '/' },
      { '@type': 'ListItem', position: 2, name: nome, item: BASE + url },
    ],
  };
}

function grafo(rota) {
  const g = [organization(), website()];
  if (rota.url === '/polen') {
    g.push(produto(cfg.produtos.polen, 'polen', cfg.produtos.polen.cores.map(c => c.img)));
    g.push(breadcrumb('Polen', '/polen'));
  } else if (rota.url === '/bee') {
    g.push(produto(cfg.produtos.bee, 'bee', cfg.produtos.bee.cores.map(c => c.img)));
    g.push(breadcrumb('Bee', '/bee'));
  } else if (rota.url !== '/') {
    const nome = { '/acessorios': 'Acessórios', '/sobre': 'Sobre nós', '/sacola': 'Sacola' }[rota.url];
    if (nome) g.push(breadcrumb(nome, rota.url));
  }
  return { '@context': 'https://schema.org', '@graph': g };
}

// ------------------------------------------------------------------ aplica
function aplicar() {
  fs.writeFileSync(path.join(SITE, 'robots.txt'), robots(), 'utf8');
  fs.writeFileSync(path.join(SITE, 'sitemap.xml'), sitemap(), 'utf8');

  let n = 0;
  const todas = ROTAS.concat([{ url: '/404', arquivo: '404.html', noindex: true }]);
  for (const r of todas) {
    const f = path.join(SITE, r.arquivo);
    if (!fs.existsSync(f)) continue;
    let s = fs.readFileSync(f, 'utf8');

    // canonical
    s = s.replace(/<link[^>]+rel="canonical"[^>]*>/gi, '');
    let extra = `<link rel="canonical" href="${BASE}${r.url}">`;

    // og:url e og:image
    s = s.replace(/<meta[^>]+property="og:url"[^>]*>/gi, '');
    extra += `<meta property="og:url" content="${BASE}${r.url}">`
      + `<meta property="og:type" content="${r.url === '/' ? 'website' : 'article'}">`
      + `<meta property="og:locale" content="pt_BR">`
      + `<meta property="og:site_name" content="MELCAM">`;

    if (r.noindex) extra += `<meta name="robots" content="noindex,follow">`;

    // Schema
    s = s.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/gi, '');
    extra += `<script type="application/ld+json">${JSON.stringify(grafo(r))}</script>`;

    s = s.replace(/<\/head>/i, extra + '</head>');
    fs.writeFileSync(f, s, 'utf8');
    n++;
  }
  return { n, base: BASE };
}

module.exports = { aplicar, BASE };
