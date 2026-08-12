// Gera o placeholder honesto "a decidir" e captura tudo que sobrou apontando
// para o CDN do Framer. Depois disto o site nao faz nenhum pedido externo.
//
// Por que placeholder declarado em vez de imagem generica: o briefing proibe
// stock e proibe fingir. Um retangulo que diz "a decidir" comunica ao cliente
// exatamente onde falta arte, em vez de esconder a falta.
const fs = require('fs');
const path = require('path');
const SITE = path.resolve(__dirname, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(SITE, 'melcam.config.json'), 'utf8'));
const P = cfg.paleta;

function gerarSVG() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1200" role="img" aria-label="Arte a decidir">
  <rect width="1200" height="1200" fill="${P.carvao}"/>
  <rect x="24" y="24" width="1152" height="1152" fill="none" stroke="${P.mel}" stroke-width="3" stroke-dasharray="18 14" opacity=".55"/>
  <g fill="${P.mel}" opacity=".9">
    <circle cx="600" cy="530" r="96" fill="none" stroke="${P.mel}" stroke-width="10"/>
    <circle cx="600" cy="530" r="34"/>
    <rect x="470" y="382" width="86" height="34" rx="8"/>
  </g>
  <text x="600" y="742" text-anchor="middle" fill="${P.papel}"
        font-family="Georgia,serif" font-size="76" letter-spacing="1">a decidir</text>
  <text x="600" y="806" text-anchor="middle" fill="${P.papel}" opacity=".6"
        font-family="system-ui,sans-serif" font-size="34">arte oficial pendente</text>
</svg>`;
  const dir = path.join(SITE, 'melcam', 'img');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'a-decidir.svg'), svg, 'utf8');
}

function capturar(walk) {
  gerarSVG();
  const ALVO = '/melcam/img/a-decidir.svg';
  let n = 0, arquivos = 0;
  for (const f of walk) {
    const rel = path.relative(SITE, f);
    if (rel.startsWith('melcam' + path.sep) || rel.startsWith('tools' + path.sep)) continue;
    if (!/\.html$/i.test(f)) continue;   // bundles nao sao tocados
    let s = fs.readFileSync(f, 'utf8');
    const antes = s;
    const re = /https:\/\/framerusercontent\.com\/images\/[^"'\s,)\\]*/g;
    const achou = (s.match(re) || []).length;
    if (achou) { s = s.replace(re, ALVO); n += achou; }
    if (s !== antes) { fs.writeFileSync(f, s, 'utf8'); arquivos++; }
  }
  return { n, arquivos };
}

module.exports = { capturar };
