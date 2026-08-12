// Le a tabela 'name' dos .otf da Area para descobrir peso e estilo de cada
// arquivo numerado, e gera melcam/fonts/fontes.css com os @font-face.
const fs = require('fs');
const path = require('path');

const DIR = path.resolve(__dirname, '..', 'melcam', 'fonts');
const AREA = path.join(DIR, 'area');

function nomes(file) {
  const b = fs.readFileSync(file);
  const numTables = b.readUInt16BE(4);
  let nameOff = null;
  for (let i = 0; i < numTables; i++) {
    const p = 12 + i * 16;
    if (b.slice(p, p + 4).toString('latin1') === 'name') nameOff = b.readUInt32BE(p + 8);
  }
  if (nameOff === null) return {};
  const count = b.readUInt16BE(nameOff + 2);
  const strOff = nameOff + b.readUInt16BE(nameOff + 4);
  const out = {};
  for (let i = 0; i < count; i++) {
    const r = nameOff + 6 + i * 12;
    const platform = b.readUInt16BE(r);
    const nameId = b.readUInt16BE(r + 6);
    const len = b.readUInt16BE(r + 8);
    const off = b.readUInt16BE(r + 10);
    const raw = b.slice(strOff + off, strOff + off + len);
    const s = platform === 3 ? raw.swap16().toString('utf16le') : raw.toString('latin1');
    if (!out[nameId]) out[nameId] = s;
  }
  return { familia: out[1], estilo: out[2], completo: out[4] };
}

const PESOS = {
  thin: 100, extralight: 200, ultralight: 200, light: 300, book: 400,
  regular: 400, normal: 400, medium: 500, semibold: 600, demibold: 600,
  bold: 700, extrabold: 800, ultrabold: 800, black: 900, heavy: 900,
};
const pesoDe = est => {
  const e = (est || '').toLowerCase().replace(/[^a-z]/g, '');
  for (const k of Object.keys(PESOS).sort((a, b) => b.length - a.length)) if (e.includes(k)) return PESOS[k];
  return 400;
};

const lista = [];
if (fs.existsSync(AREA)) {
  for (const f of fs.readdirSync(AREA)) {
    if (!/\.otf$/i.test(f)) continue;
    try {
      const n = nomes(path.join(AREA, f));
      lista.push({ arquivo: 'area/' + f, ...n, peso: pesoDe(n.estilo), italico: /italic|oblique/i.test(n.estilo || '') });
    } catch (e) { console.log('  erro em', f, e.message); }
  }
}

lista.sort((a, b) => (a.familia || '').localeCompare(b.familia || '') || a.peso - b.peso);
console.log('=== Area: ' + lista.length + ' arquivos ===');
for (const f of lista) console.log(`  ${String(f.peso).padStart(3)} ${f.italico ? 'ital' : '    '}  ${(f.familia || '?').padEnd(22)} ${(f.estilo || '?').padEnd(18)} ${f.arquivo}`);

module.exports = { lista };
