// Reaponta os links do template para as rotas MELCAM.
// As rotas de roupa (./sort-by/…, ./blue-jeans, ./shirt-*) morrem aqui.
const fs = require('fs');
const path = require('path');
const SITE = path.resolve(__dirname, '..');

const MAPA = [
  // navegação principal
  ['./sort-by/Sobre Nós', '/sobre'],
  ['./sort-by/Sneakers', '/acessorios'],
  ['./sort-by/Polen', '/polen'],
  ['./sort-by/Bee', '/bee'],
  // ajuda e institucional
  ['./contact', '/sobre#contato'],
  ['./blog', '/sobre#rastreio'],
  ['./faq', '/polen#faq'],
  ['./privacy-policy', '/privacidade'],
  ['./terms-and-conditions', '/termos'],
  ['./404', '/404'],
  // produtos do template -> a LP da linha correspondente
  ['./Acessórios-white', '/bee'], ['./Acessórios-black', '/bee'], ['./Acessórios-blue', '/bee'],
  ['./blue-jeans', '/polen'], ['./white-jeans', '/polen'], ['./black-jeans', '/polen'],
  ['./t-shirt-green-kids', '/polen'], ['./t-shirt-green-women-copy', '/polen'],
  ['./t-shirt-white-kids', '/polen'], ['./t-shirt-black-women', '/polen'],
  ['./t-shirt-black-kids', '/polen'],
  ['./shirt-blue-women', '/polen'], ['./shirt-white-women', '/polen'],
  ['./shirt-green-women', '/polen'], ['./shirt-white', '/polen'], ['./shirt-black', '/polen'],
  ['./comfort-curves', '/polen'], ['./high-rise-hustle', '/polen'], ['./vintage-vibes', '/polen'],
  ['./', '/'],
];

// O template exporta privacy-policy.html e terms-and-conditions.html, mas o MAPA
// aponta a navegação para /privacidade e /termos. Em hospedagem estática isso é
// 404 (o serve.js local mascara com fallback pro index), então cada rota nova
// ganha o arquivo correspondente.
const APELIDOS = [
  ['privacy-policy.html', 'privacidade.html'],
  ['terms-and-conditions.html', 'termos.html'],
];

function apelidos() {
  let n = 0;
  for (const [de, para] of APELIDOS) {
    const src = path.join(SITE, de);
    if (!fs.existsSync(src)) continue;
    fs.copyFileSync(src, path.join(SITE, para));
    n++;
  }
  return n;
}

function aplicar(walk) {
  let n = 0, arquivos = 0;
  for (const f of walk) {
    const rel = path.relative(SITE, f);
    if (rel.startsWith('melcam' + path.sep) || rel.startsWith('tools' + path.sep)) continue;
    if (!/\.html$/i.test(f)) continue;
    let s = fs.readFileSync(f, 'utf8');
    const antes = s;

    // Só dentro de href="…", para não pegar texto solto.
    s = s.replace(/href="([^"]*)"/g, (m, h) => {
      for (const [de, para] of MAPA) if (h === de) { n++; return `href="${para}"`; }
      return m;
    });

    // marca o item ativo da navegação pela rota do arquivo
    const rota = '/' + rel.replace(/\\/g, '/').replace(/index\.html$/, '').replace(/\.html$/, '');
    s = s.replace(/data-framer-page-link-current="true"/g, '');
    s = s.replace(new RegExp(`(<a[^>]*href="${rota.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*)>`, 'g'),
      '$1 aria-current="page">');

    if (s !== antes) { fs.writeFileSync(f, s, 'utf8'); arquivos++; }
  }
  return { n, arquivos, apelidos: apelidos() };
}

module.exports = { aplicar, MAPA };
