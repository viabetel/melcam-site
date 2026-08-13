// Comunidade, clipes e barra de segurança. Entram antes do <footer>, na ordem
// do briefing: hero → blocos → carrossel → comunidade → clipes → segurança.
const fs = require('fs');
const path = require('path');
const SITE = path.resolve(__dirname, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(SITE, 'melcam.config.json'), 'utf8'));
const P = cfg.paleta;

function fotosComunidade() {
  const dir = path.join(SITE, 'melcam', 'img', 'comunidade');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f)).sort()
    .map(f => '/melcam/img/comunidade/' + f);
}

// ------------------------------------------------------------- comunidade
function comunidade() {
  const c = cfg.home.comunidade;
  const fotos = fotosComunidade();
  // 13/08/2026, a pedido: o rótulo [USUÁRIO E CIDADE A CONFIRMAR] saiu de dentro
  // dos cards. A pendência NÃO some do site — continua declarada na nota ao pé
  // da seção, que diz que a identificação de cada autor está a decidir. O que
  // saiu foi a etiqueta repetida oito vezes por cima das fotos.
  // (De quebra some um <figcaption> que vivia fora de um <figure>, que é markup
  // inválido — o <li> nunca foi <figure>.)
  const itens = fotos.map(src => `
      <li class="mel-com-item">
        <img src="${src}" alt="Foto da comunidade Melcam" loading="lazy">
      </li>`).join('');

  return `
<section class="mel-sec mel-comunidade" aria-labelledby="mel-com-tit">
  <div class="mel-sec-topo">
    <p class="mel-eyebrow">${c.eyebrow}</p>
    <h2 id="mel-com-tit" class="mel-tit">${c.titulo}</h2>
    <p class="mel-tag">${c.tag}</p>
  </div>
  <ul class="mel-com-grade">${itens}
  </ul>
  <p class="mel-nota">${fotos.length} de 16 a 20 fotos previstas no briefing.
     As demais, e a identificação de cada autor, estão <strong>a decidir</strong>.</p>
</section>`;
}

// ------------------------------------------------------------------ clipes
function clipes() {
  // Os clipes não existem ainda. O briefing proíbe vídeo de banco, então o
  // espaço e a proporção ficam reservados com o placeholder declarado.
  const n = 3;
  const cards = Array.from({ length: n }, (_, i) => `
      <li class="mel-clipe">
        <div class="mel-clipe-box">
          <img src="/melcam/img/a-decidir.svg" alt="Clipe ${i + 1}: vídeo a decidir">
          <span class="mel-clipe-spec">1080 × 1920 · 8 a 20 s</span>
        </div>
      </li>`).join('');

  return `
<section class="mel-sec mel-clipes" aria-labelledby="mel-clipes-tit">
  <div class="mel-sec-topo">
    <p class="mel-eyebrow">em movimento</p>
    <h2 id="mel-clipes-tit" class="mel-tit">A Melcam por aí</h2>
  </div>
  <ul class="mel-clipes-grade">${cards}
  </ul>
  <p class="mel-nota">${n} clipes verticais <strong>a decidir</strong>.
     MP4 ou WebM, 1080 × 1920, 8 a 20 s, sem texto essencial embutido, com poster
     1080 × 1920 para cada.</p>
</section>`;
}

// --------------------------------------------------------------- segurança
const ICONES = {
  0: '<path d="M12 3 20 6.5v5.2c0 4.6-3.2 8.3-8 9.3-4.8-1-8-4.7-8-9.3V6.5L12 3Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M8.6 12.2l2.4 2.4 4.4-4.6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
  1: '<path d="M20.5 11.8a8.5 8.5 0 1 1-3.6-6.9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M3.6 20.4l1.3-3.6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M8.8 11.9h.01M12 11.9h.01M15.2 11.9h.01" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/>',
  2: '<path d="M20.5 12a8.5 8.5 0 1 1-2.5-6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M20.6 3.4v4.3h-4.3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
  3: '<rect x="4" y="10.4" width="16" height="10.1" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8.1 10.4V7.6a3.9 3.9 0 0 1 7.8 0v2.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
};

function seguranca() {
  const itens = cfg.home.seguranca.map((t, i) => `
      <li class="mel-seg-item">
        <svg class="mel-seg-ico" viewBox="0 0 24 24" aria-hidden="true">${ICONES[i] || ''}</svg>
        <span>${t}</span>
      </li>`).join('');

  return `
<section class="mel-seguranca" aria-label="Segurança na compra">
  <ul class="mel-seg-lista">${itens}
  </ul>
</section>`;
}

// --------------------------------------------------------------------- CSS
function css() {
  return `
/* ============ Seções MELCAM: comunidade, clipes, segurança ============
   Seguem o vocabulário do template: largura 1440, gutter 24, raio 4px,
   respiro generoso. Nada aqui altera nó do template. */
.mel-sec{ width:100%; max-width:1440px; margin:0 auto; padding:clamp(56px,7vw,110px) 24px }
.mel-sec-topo{ margin:0 0 clamp(28px,4vw,52px) }
.mel-eyebrow{
  margin:0 0 .6rem; color:${P.mel};
  font-family:"Area",sans-serif; font-size:.76rem; font-weight:600;
  letter-spacing:.14em; text-transform:uppercase;
}
.mel-tit{
  margin:0; color:${P.papel};
  font-family:"Iowan Old Style",Georgia,serif; font-weight:700;
  font-size:clamp(1.8rem,4vw,3.4rem); line-height:1.08; letter-spacing:-.01em;
}
.mel-tag{ margin:.9rem 0 0; color:#9A9083; font-family:"Area",sans-serif; font-size:.95rem }
.mel-nota{
  margin:clamp(20px,3vw,34px) 0 0; color:#9A9083;
  font-family:"Area",sans-serif; font-size:.82rem; line-height:1.55;
}
.mel-nota strong{ color:${P.mel}; font-weight:600 }

/* --- comunidade --- */
.mel-com-grade{
  list-style:none; margin:0; padding:0; display:grid; gap:12px;
  grid-template-columns:repeat(4,1fr);
}
.mel-com-item{ position:relative; border-radius:4px; overflow:hidden; background:#2B251C }
.mel-com-item img{
  width:100%; aspect-ratio:1; object-fit:cover; display:block;
  transition:transform 520ms cubic-bezier(.22,.61,.36,1);
}
.mel-com-item:hover img{ transform:scale(1.045) }
/* .mel-com-cap saiu em 13/08/2026 junto com a legenda que ele vestia. Regra
   morta e nao volta sozinha: quando houver @usuario e cidade de verdade, o
   estilo se reescreve com o conteudo. */

/* --- clipes --- */
.mel-clipes-grade{
  list-style:none; margin:0; padding:0; display:grid; gap:20px;
  grid-template-columns:repeat(3,1fr);
}
.mel-clipe-box{
  position:relative; border-radius:4px; overflow:hidden;
  aspect-ratio:9/16; background:${P.carvao};
  border:1px dashed rgba(242,169,0,.42);
}
.mel-clipe-box img{ width:100%; height:100%; object-fit:contain; display:block }
.mel-clipe-spec{
  position:absolute; inset:auto 0 0 0; padding:.6rem;
  text-align:center; color:#9A9083;
  font-family:"Area",sans-serif; font-size:.7rem; letter-spacing:.05em;
}

/* --- barra de segurança --- */
.mel-seguranca{
  border-top:1px solid rgba(251,247,238,.07);
  border-bottom:1px solid rgba(251,247,238,.07);
}
.mel-seg-lista{
  list-style:none; margin:0 auto; padding:clamp(26px,3.4vw,44px) 24px;
  max-width:1440px; display:grid; gap:clamp(18px,2.6vw,36px);
  grid-template-columns:repeat(4,1fr);
}
.mel-seg-item{
  display:flex; align-items:center; gap:.85rem;
  color:${P.papel}; font-family:"Area",sans-serif; font-size:.92rem; line-height:1.35;
}
.mel-seg-ico{ width:26px; height:26px; flex:none; color:${P.mel} }

/* --- responsivo, nos breakpoints do próprio template --- */
@media (max-width:1439.98px){
  .mel-com-grade{ grid-template-columns:repeat(3,1fr) }
  .mel-seg-lista{ grid-template-columns:repeat(2,1fr) }
}
@media (max-width:809.98px){
  .mel-sec{ padding:clamp(44px,9vw,72px) 16px }
  .mel-com-grade{ grid-template-columns:repeat(2,1fr); gap:8px }
  .mel-clipes-grade{ grid-template-columns:1fr; gap:16px }
  .mel-clipe-box{ max-width:340px; margin:0 auto }
  .mel-seg-lista{ grid-template-columns:1fr; padding-left:16px; padding-right:16px }
}
@media (prefers-reduced-motion:reduce){
  .mel-com-item img{ transition:none }
  .mel-com-item:hover img{ transform:none }
}
`;
}

function aplicar(walk) {
  fs.appendFileSync(path.join(SITE, 'melcam', 'identidade.css'), css(), 'utf8');
  let n = 0;
  for (const f of walk) {
    const rel = path.relative(SITE, f);
    if (rel.startsWith('melcam' + path.sep) || rel.startsWith('tools' + path.sep)) continue;
    if (!/index\.html$/i.test(f)) continue;
    let s = fs.readFileSync(f, 'utf8');
    // Só insere, nunca recorta.
    //
    // ⚠️ NÃO voltar a inserir antes do primeiro `<footer>`. São três rodapés,
    // um por ssr-variant, e o primeiro mora dentro de
    // `<div class="ssr-variant hidden-1g8fb3q">`, que é `display:none` fora do
    // desktop. As três seções ficavam com altura 0 no tablet e no mobile — o
    // defeito passou despercebido porque no desktop aparecia tudo certo.
    //
    // O lugar certo é como filha direta do stack da home (o
    // `<header data-framer-name="Header">`, flex column), depois de todas as
    // variantes. Fora de variante, renderiza nos três breakpoints. A ordem
    // visual continua correta pelas regras de `order` em identidade.css:
    // conteúdo (0) → Colméia (1) → rodapé (2).
    const abertura = /<header[^>]*class="[^"]*framer-vrbx7h[^"]*"[^>]*>/.exec(s);
    if (abertura) {
      const re = /<(\/?)header\b[^>]*>/g;
      re.lastIndex = abertura.index;
      let prof = 0, t, corte = -1;
      while ((t = re.exec(s))) {
        prof += t[1] ? -1 : 1;
        if (prof === 0) { corte = t.index; break; }
      }
      if (corte > 0) {
        s = s.slice(0, corte) + comunidade() + clipes() + seguranca() + s.slice(corte);
        n++;
      }
    }
    fs.writeFileSync(f, s, 'utf8');
  }
  return { n, fotos: fotosComunidade().length };
}

module.exports = { aplicar };
