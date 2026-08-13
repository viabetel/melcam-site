// Troca o lettering COMETICA pelo logo MELCAM.
//
// O logo do template nao e texto: e um <symbol> SVG (id svg11961625616)
// referenciado por <use> na navbar e no rodape. Por isso a varredura de texto
// nunca o encontrou. Trocamos o conteudo do simbolo mantendo o mesmo id, e
// todos os <use> passam a desenhar a MELCAM sem tocar em uma linha de layout.
//
// A proporcao muda (COMETICA 178x27, MELCAM 1398x275.89). O <use> honra o
// preserveAspectRatio padrao, entao o logo encaixa por dentro sem distorcer —
// o briefing proibe alterar a proporcao do logo.
const fs = require('fs');
const path = require('path');
const SITE = path.resolve(__dirname, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(SITE, 'melcam.config.json'), 'utf8'));

const ID_LOGO = 'svg11961625616';

function corpoDoLogo() {
  const svg = fs.readFileSync(path.join(SITE, 'melcam', 'logo', 'horizontal-branco.svg'), 'utf8');
  const viewBox = (svg.match(/viewBox="([^"]+)"/) || [])[1] || '0 0 1398.02 275.89';
  // conteudo entre <svg ...> e </svg>, sem o <defs><style> (a cor vai inline)
  let corpo = svg.slice(svg.indexOf('>', svg.indexOf('<svg')) + 1, svg.lastIndexOf('</svg>'));
  corpo = corpo.replace(/<defs>[\s\S]*?<\/defs>/g, '');
  // A classe .cls-1 do arquivo vira fill="currentColor", nao a cor fixa.
  //
  // Era `fill="${cfg.paleta.papel}"`, papel cravado, e isso funcionou enquanto
  // TODO fundo atras do logo era carvao. Em 13/08/2026 a navbar da /bee passou
  // a vestir papel, e o logo sumiu: papel sobre papel. Recolorir o simbolo nao
  // resolvia — ele e um so, referenciado por cinco <use> na mesma pagina (as
  // duas variantes de navbar e o rodape), entao mudar a cor dele apagaria o
  // logo do rodape, que segue em carvao.
  //
  // Com currentColor cada <use> pinta com a cor do SEU contexto. Quem manda e
  // o CSS de [data-framer-name="MELCAM"]: papel por padrao (tools/identidade.js)
  // e carvao na navbar da /bee (tools/bee-interacoes.js). Um logo, dois fundos,
  // nenhuma copia.
  corpo = corpo.replace(/class="cls-\d+"/g, 'fill="currentColor"');
  return { viewBox, corpo: corpo.replace(/\s+/g, ' ').trim() };
}

function aplicar(walk) {
  const { viewBox, corpo } = corpoDoLogo();
  const novo = `<svg viewBox="${viewBox}" id="${ID_LOGO}" role="img" aria-label="MELCAM">${corpo}</svg>`;
  let n = 0, arquivos = 0;

  for (const f of walk) {
    const rel = path.relative(SITE, f);
    if (rel.startsWith('melcam' + path.sep) || rel.startsWith('tools' + path.sep)) continue;
    if (!/\.html$/i.test(f)) continue;
    let s = fs.readFileSync(f, 'utf8');
    const antes = s;

    // substitui o simbolo inteiro, seja qual for o conteudo atual
    const re = new RegExp(`<svg[^>]*id="${ID_LOGO}"[^>]*>[\\s\\S]*?<\\/svg>`, 'g');
    const achou = (s.match(re) || []).length;
    if (achou) { s = s.replace(re, novo); n += achou; }

    // data-framer-name do no do logo, para o proximo agente achar
    s = s.replace(/data-framer-name="COMETICA"/g, 'data-framer-name="MELCAM"');

    if (s !== antes) { fs.writeFileSync(f, s, 'utf8'); arquivos++; }
  }
  return { n, arquivos };
}

module.exports = { aplicar };
