// Move comunidade, clipes e barra de seguranca para fora das ssr-variant.
//
// O defeito: tools/comunidade.js injetava com s.replace(/(<footer)/), que pega o
// PRIMEIRO dos tres <footer> — e esse mora dentro de <div class="ssr-variant
// hidden-1g8fb3q">, que e display:none fora do desktop. Resultado: as tres
// secoes tinham altura 0 no tablet e no mobile.
//
// A correcao: tirar as tres de onde estao e recolocar como filhas diretas do
// stack da home (o <header data-framer-name="Header">, flex column), depois da
// ultima ssr-variant. Fora de qualquer variante, aparecem nos tres breakpoints.
//
// A ordem visual continua certa por causa das regras de `order` ja existentes em
// identidade.css: conteudo (0) -> Colmeia (1) -> rodape (2). As tres entram em
// order 0, entao caem antes da Colmeia.
const fs = require('fs');
const path = require('path');

const SITE = path.resolve(__dirname, '..');
const ALVOS = ['mel-comunidade', 'mel-clipes', 'mel-seguranca'];

// Recorta <section ...class contem `cls`...> ... </section> com contagem
// equilibrada, para nao cortar no meio de uma section aninhada.
function recortar(html, cls) {
  const abre = new RegExp(`<section[^>]*class="[^"]*${cls}[^"]*"[^>]*>`);
  const m = abre.exec(html);
  if (!m) return null;
  const ini = m.index;
  const re = /<(\/?)section\b[^>]*>/g;
  re.lastIndex = ini;
  let prof = 0, t;
  while ((t = re.exec(html))) {
    prof += t[1] ? -1 : 1;
    if (prof === 0) {
      const fim = t.index + t[0].length;
      return { bloco: html.slice(ini, fim), resto: html.slice(0, ini) + html.slice(fim) };
    }
  }
  return null;
}

function aplicar() {
  const paginas = ['index.html', 'polen.html', 'bee.html', 'acessorios.html',
                   'sobre.html', 'sacola.html', '404.html'];
  const feito = [];

  for (const nome of paginas) {
    const arq = path.join(SITE, nome);
    if (!fs.existsSync(arq)) continue;
    let html = fs.readFileSync(arq, 'utf8');
    const antes = html;
    const blocos = [];

    for (const cls of ALVOS) {
      const r = recortar(html, cls);
      if (!r) continue;
      blocos.push(r.bloco);
      html = r.resto;
    }
    if (!blocos.length) continue;

    // fim do stack da home: o </header> que fecha o <header ... framer-vrbx7h>
    const abertura = /<header[^>]*class="[^"]*framer-vrbx7h[^"]*"[^>]*>/.exec(html);
    if (!abertura) { feito.push(`${nome}: stack nao encontrado, nada movido`); continue; }
    const re = /<(\/?)header\b[^>]*>/g;
    re.lastIndex = abertura.index;
    let prof = 0, t, corte = -1;
    while ((t = re.exec(html))) {
      prof += t[1] ? -1 : 1;
      if (prof === 0) { corte = t.index; break; }
    }
    if (corte < 0) { feito.push(`${nome}: fim do stack nao encontrado`); continue; }

    html = html.slice(0, corte) + blocos.join('') + html.slice(corte);
    if (html !== antes) {
      fs.writeFileSync(arq, html, 'utf8');
      feito.push(`${nome}: ${blocos.length} seções movidas para o stack`);
    }
  }
  return feito;
}

module.exports = { aplicar };

if (require.main === module) console.log(aplicar().join('\n'));
