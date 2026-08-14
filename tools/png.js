// Leitor de PNG mínimo, sem dependência externa — 14/08/2026.
//
// Existe porque medir cor de verdade é a única forma de provar continuidade de
// gradiente e contraste de barra contra o que está atrás dela. Captura do
// Chrome é PNG, e o Node já traz zlib: falta só desfazer os filtros de linha.
//
// Cobre exatamente o caso que o Chrome produz — 8 bits por canal, sem
// entrelaçamento, cor verdadeira com ou sem alfa. Qualquer outra combinação é
// erro explícito, nunca pixel errado em silêncio.
const zlib = require('zlib');

function lerPNG(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('não é PNG');
  let off = 8, larg = 0, alt = 0, prof = 0, tipo = 0, entrelace = 0;
  const idat = [];
  while (off < buf.length) {
    const tam = buf.readUInt32BE(off);
    const nome = buf.toString('ascii', off + 4, off + 8);
    const dados = buf.slice(off + 8, off + 8 + tam);
    if (nome === 'IHDR') {
      larg = dados.readUInt32BE(0); alt = dados.readUInt32BE(4);
      prof = dados[8]; tipo = dados[9]; entrelace = dados[12];
    } else if (nome === 'IDAT') idat.push(dados);
    else if (nome === 'IEND') break;
    off += 12 + tam;
  }
  if (prof !== 8 || entrelace !== 0 || (tipo !== 2 && tipo !== 6)) {
    throw new Error('PNG fora do caso esperado (prof ' + prof + ', tipo ' + tipo + ', entrelace ' + entrelace + ')');
  }
  const canais = tipo === 6 ? 4 : 3;
  const cru = zlib.inflateSync(Buffer.concat(idat));
  const linha = larg * canais;
  const px = Buffer.alloc(alt * linha);
  let ant = Buffer.alloc(linha);
  for (let y = 0; y < alt; y++) {
    const filtro = cru[y * (linha + 1)];
    const src = cru.slice(y * (linha + 1) + 1, (y + 1) * (linha + 1));
    const dst = px.slice(y * linha, (y + 1) * linha);
    for (let i = 0; i < linha; i++) {
      const a = i >= canais ? dst[i - canais] : 0;
      const b = ant[i];
      const c = i >= canais ? ant[i - canais] : 0;
      let v = src[i];
      if (filtro === 1) v += a;
      else if (filtro === 2) v += b;
      else if (filtro === 3) v += (a + b) >> 1;
      else if (filtro === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
      }
      dst[i] = v & 255;
    }
    ant = dst;
  }
  return { larg, alt, canais, px };
}

const pixel = (img, x, y) => {
  const i = y * img.larg * img.canais + x * img.canais;
  return [img.px[i], img.px[i + 1], img.px[i + 2]];
};

// WCAG 2.x — luminância relativa e razão de contraste.
const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const lum = (r) => 0.2126 * lin(r[0]) + 0.7152 * lin(r[1]) + 0.0722 * lin(r[2]);
const contraste = (a, b) => {
  const x = lum(a), y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
// "rgb(34, 30, 23)" e "rgba(34, 30, 23, 0.5)" -> [34,30,23]
const cor = (css) => (css.match(/\d+/g) || []).slice(0, 3).map(Number);
const perto = (a, b, t) => a.every((v, i) => Math.abs(v - b[i]) <= t);

module.exports = { lerPNG, pixel, lum, contraste, cor, perto };
