// Inventário de cor do MELCAM — Fase 1 da auditoria de paleta.
//
// Varre HTML, CSS, JS, JSON e SVG procurando QUALQUER valor de cor: hex,
// rgb(), rgba(), hsl(), hsla(), color-mix(), gradientes, drop-shadow e nomes
// CSS. Normaliza tudo para hex+alfa, agrupa por cor e por arquivo, e classifica
// contra a paleta aprovada em melcam.config.json.
//
// Não altera nada. É leitura pura — o relatório sai em JSON no stdout ou em
// arquivo, e serve de base para AUDITORIA_PALETA.md.
//
// Uso:
//   node tools/auditoria-cores.js                 -> resumo legível
//   node tools/auditoria-cores.js --json saida.json
const fs = require('fs');
const path = require('path');

const SITE = path.resolve(__dirname, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(SITE, 'melcam.config.json'), 'utf8'));

// ----------------------------------------------------------- paleta oficial
const OFICIAL = {
  '#221E17': 'carvão',
  '#F2A900': 'mel',
  '#FBF7EE': 'papel',
  '#EE6A4D': 'coral',
  '#5E8C7B': 'verde-mar',
};
// Derivações já documentadas em tools/identidade.js e no progresso.md.
const DERIVADO = {
  '#2B251C': 'superfície elevada',
  '#9A9083': 'texto secundário',
};
// Cores autorais de amostra (régua da Polen) — amostradas dos packshots.
const AMOSTRA = {
  '#F2C300': 'swatch Polen amarela',
  '#7A5A44': 'swatch Polen marrom',
  '#1A1714': 'swatch Polen preta',
  '#E8A0AE': 'swatch Polen rosa',
};

// Legados conhecidos do template COMETICA/Framer.
const LEGADO = {
  '#0D0D0D': 'fundo do template',
  '#1C1C1C': 'superfície do template',
  '#DEDEDE': 'texto do template',
  '#696969': 'secundário do template',
  '#000000': 'preto puro',
  '#FFFFFF': 'branco puro',
  '#131314': 'overlay do template',
};

// ------------------------------------------------------- arquivos varridos
const IGNORAR_DIR = new Set(['node_modules', '.git', '_ORIGINAL', 'medidas', '.vercel']);
// Perfis do Edge que tools/cdp.js deixa para trás e as pastas de captura. São
// lixo de execução, não fonte do site — 17 mil arquivos que afogariam o
// inventário se entrassem.
const IGNORAR_RE = /^(edge-cdp-\d+|shots(-\w+)?)$/;
const EXT = new Set(['.html', '.css', '.js', '.mjs', '.json', '.svg', '.framercms', '.xml']);

function listar(dir, saida = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (IGNORAR_DIR.has(e.name) || IGNORAR_RE.test(e.name)) continue;
      listar(path.join(dir, e.name), saida);
    } else if (EXT.has(path.extname(e.name).toLowerCase()) && e.name !== path.basename(__filename)) {
      // O próprio auditor carrega tabelas de cor. Contá-las seria inventar
      // ocorrência que não existe no site.
      saida.push(path.join(dir, e.name));
    }
  }
  return saida;
}

// -------------------------------------------------------------- extração
// Nomes CSS que interessam para a auditoria. Não é a lista inteira de 148
// nomes de propósito: o que importa aqui é achar neutro genérico e azul de
// link, não catalogar "papayawhip".
const NOMES = {
  white: '#FFFFFF', black: '#000000', red: '#FF0000', blue: '#0000FF',
  gray: '#808080', grey: '#808080', silver: '#C0C0C0', darkgray: '#A9A9A9',
  lightgray: '#D3D3D3', dimgray: '#696969', whitesmoke: '#F5F5F5',
  green: '#008000', yellow: '#FFFF00', orange: '#FFA500', purple: '#800080',
  navy: '#000080', teal: '#008080', crimson: '#DC143C', tomato: '#FF6347',
};

function hex3para6(h) {
  return '#' + h.slice(1).split('').map((c) => c + c).join('').toUpperCase();
}

function normalizarHex(bruto) {
  let h = bruto.toUpperCase();
  if (h.length === 4) return { hex: hex3para6(h), alfa: 1 };
  if (h.length === 5) {
    const a = parseInt(h[4] + h[4], 16) / 255;
    return { hex: hex3para6(h.slice(0, 4)), alfa: +a.toFixed(3) };
  }
  if (h.length === 9) {
    const a = parseInt(h.slice(7), 16) / 255;
    return { hex: h.slice(0, 7), alfa: +a.toFixed(3) };
  }
  return { hex: h.slice(0, 7), alfa: 1 };
}

function canal(v) {
  v = v.trim();
  if (v.endsWith('%')) return Math.round((parseFloat(v) / 100) * 255);
  return Math.round(parseFloat(v));
}

function alfaDe(v) {
  if (v === undefined) return 1;
  v = v.trim();
  if (v.endsWith('%')) return +(parseFloat(v) / 100).toFixed(3);
  return +parseFloat(v).toFixed(3);
}

function paraHex(r, g, b) {
  const c = (n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0').toUpperCase();
  return '#' + c(r) + c(g) + c(b);
}

function hslParaHex(h, s, l) {
  h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return paraHex(Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255));
}

// Um passo só, com alternativas: assim a posição de cada achado é real e dá
// para recortar o contexto ao redor.
const RE = new RegExp([
  '#[0-9a-fA-F]{8}\\b',
  '#[0-9a-fA-F]{6}\\b',
  '#[0-9a-fA-F]{4}\\b',
  '#[0-9a-fA-F]{3}\\b',
  'rgba?\\(([^()]{1,80})\\)',
  'hsla?\\(([^()]{1,80})\\)',
  '\\b(' + Object.keys(NOMES).join('|') + ')\\b',
].join('|'), 'g');

function contexto(txt, i, raio = 90) {
  const a = Math.max(0, i - raio), b = Math.min(txt.length, i + raio);
  return txt.slice(a, b).replace(/\s+/g, ' ').trim();
}

// A distinção que separa ruído de defeito.
//
// O template escreve quase toda cor como `var(--token-<uuid>, <cor original>)`.
// O segundo argumento é FALLBACK: só pinta se o token não existir. Como
// identidade.css define os 9 tokens, esses valores estão mortos — contá-los
// como legado visível encheria o relatório de 472 falsos positivos de #2e2e2e.
//
// Já `--framer-link-text-color:rgb(0,153,255)` não tem token nenhum: é cor
// literal, e essa pinta de verdade. É essa que a auditoria persegue.
const RE_FALLBACK = /var\(\s*--token-[0-9a-f-]{36}\s*,\s*$/i;

function ehFallbackDeToken(txt, i) {
  return RE_FALLBACK.test(txt.slice(Math.max(0, i - 60), i));
}

// Só conta o nome CSS quando ele está mesmo num lugar de cor. "black" solto
// dentro de uma palavra de conteúdo ou de um nome de arquivo não é cor.
function nomeEhCor(txt, i) {
  // Precisa haver uma propriedade de cor logo antes, na mesma declaração.
  const antes = txt.slice(Math.max(0, i - 70), i);
  return /(color|background|border|fill|stroke|shadow|outline)[^;{}]*$/i.test(antes);
}

function extrair(txt) {
  const achados = [];
  let m;
  RE.lastIndex = 0;
  while ((m = RE.exec(txt)) !== null) {
    const bruto = m[0];
    let hex = null, alfa = 1;

    if (bruto[0] === '#') {
      ({ hex, alfa } = normalizarHex(bruto));
    } else if (/^rgba?\(/i.test(bruto)) {
      const partes = m[1].split(/[,/]/).map((s) => s.trim()).filter(Boolean);
      if (partes.length < 3) continue;
      if (partes.some((p) => /var\(|calc\(/i.test(p))) continue;
      hex = paraHex(canal(partes[0]), canal(partes[1]), canal(partes[2]));
      alfa = alfaDe(partes[3]);
    } else if (/^hsla?\(/i.test(bruto)) {
      const partes = m[2].split(/[,/]/).map((s) => s.trim()).filter(Boolean);
      if (partes.length < 3) continue;
      if (partes.some((p) => /var\(|calc\(/i.test(p))) continue;
      hex = hslParaHex(parseFloat(partes[0]), parseFloat(partes[1]), parseFloat(partes[2]));
      alfa = alfaDe(partes[3]);
    } else {
      const nome = bruto.toLowerCase();
      if (!NOMES[nome]) continue;
      if (!nomeEhCor(txt, m.index)) continue;
      hex = NOMES[nome];
      alfa = 1;
    }
    if (!hex || Number.isNaN(alfa)) continue;
    achados.push({ hex, alfa, bruto, i: m.index, fallback: ehFallbackDeToken(txt, m.index) });
  }
  return achados;
}

// ------------------------------------------------------------ classificação
function classificar(hex) {
  if (OFICIAL[hex]) return { classe: 'token oficial', papel: OFICIAL[hex] };
  if (DERIVADO[hex]) return { classe: 'derivação legítima', papel: DERIVADO[hex] };
  if (AMOSTRA[hex]) return { classe: 'cor de asset', papel: AMOSTRA[hex] };
  if (LEGADO[hex]) return { classe: 'legado do template', papel: LEGADO[hex] };
  return { classe: 'a decidir', papel: '' };
}

// --------------------------------------------------------------- contraste
function lum(hex) {
  const v = [1, 3, 5].map((i) => parseInt(hex.substr(i, 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}
function contraste(a, b) {
  const l1 = lum(a), l2 = lum(b);
  return +(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05))).toFixed(2);
}
// Cor sobre fundo, com alfa: o que o olho vê.
function achatar(hex, alfa, fundo) {
  const mix = (i) => Math.round(parseInt(hex.substr(i, 2), 16) * alfa
    + parseInt(fundo.substr(i, 2), 16) * (1 - alfa));
  return paraHex(mix(1), mix(3), mix(5));
}

// -------------------------------------------------------------------- main
function rodar() {
  const arquivos = listar(SITE);
  const porCor = new Map();

  for (const abs of arquivos) {
    const rel = path.relative(SITE, abs).replace(/\\/g, '/');
    let txt;
    try { txt = fs.readFileSync(abs, 'utf8'); } catch { continue; }
    for (const a of extrair(txt)) {
      const chave = a.hex + (a.alfa === 1 ? '' : '@' + a.alfa);
      if (!porCor.has(chave)) {
        porCor.set(chave, {
          hex: a.hex, alfa: a.alfa, total: 0, literais: 0, fallbacks: 0,
          arquivos: new Map(), ...classificar(a.hex),
        });
      }
      const c = porCor.get(chave);
      c.total++;
      if (a.fallback) c.fallbacks++; else c.literais++;
      if (!c.arquivos.has(rel)) c.arquivos.set(rel, { n: 0, lit: 0, exemplos: [] });
      const f = c.arquivos.get(rel);
      f.n++;
      if (!a.fallback) {
        f.lit++;
        if (f.exemplos.length < 3) f.exemplos.push(contexto(txt, a.i));
      }
    }
  }

  const lista = [...porCor.values()]
    .map((c) => ({
      cor: c.hex + (c.alfa === 1 ? '' : ' @' + c.alfa),
      hex: c.hex, alfa: c.alfa, classe: c.classe, papel: c.papel,
      total: c.total, literais: c.literais, fallbacks: c.fallbacks,
      sobreCarvao: contraste(achatar(c.hex, c.alfa, '#221E17'), '#221E17'),
      arquivos: [...c.arquivos.entries()]
        .sort((a, b) => b[1].lit - a[1].lit || b[1].n - a[1].n)
        .map(([f, v]) => ({ arquivo: f, n: v.n, literais: v.lit, exemplos: v.exemplos })),
    }))
    .sort((a, b) => b.literais - a.literais || b.total - a.total);

  return { arquivosVarridos: arquivos.length, cores: lista.length, lista };
}

if (require.main === module) {
  const r = rodar();
  const i = process.argv.indexOf('--json');
  if (i >= 0 && process.argv[i + 1]) {
    fs.writeFileSync(process.argv[i + 1], JSON.stringify(r, null, 2), 'utf8');
    console.log(`${r.cores} cores distintas em ${r.arquivosVarridos} arquivos -> ${process.argv[i + 1]}`);
  } else {
    console.log(`${r.cores} cores distintas em ${r.arquivosVarridos} arquivos\n`);
    console.log('cor                literais  fallback  classe');
    for (const c of r.lista) {
      console.log(`${c.cor.padEnd(18)} ${String(c.literais).padStart(8)}  ${String(c.fallbacks).padStart(8)}  ${c.classe.padEnd(20)} ${c.papel}`);
      for (const f of c.arquivos.slice(0, 6)) {
        if (!f.literais) continue;
        console.log(`      ${String(f.literais).padStart(5)}  ${f.arquivo}`);
      }
    }
  }
}

module.exports = { rodar, contraste, achatar, extrair };
