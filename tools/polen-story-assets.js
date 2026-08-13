// Cenas do scrollytelling de "O diferencial" — /polen
//
//   node tools/polen-story-assets.js
//
// Gera melcam/img/polen-story/*.jpg a partir do ACERVO OFICIAL do cliente.
// Nenhuma imagem de banco, de internet ou gerada. Cada cena declara a origem
// exata e o recorte, para o revisor conferir sem abrir o Photoshop.
//
// POR QUE UM GERADOR E NÃO ARQUIVOS SOLTOS: os recortes foram medidos em cima
// das fontes (grade de 100px sobre o original) para FUGIR DOS RÓTULOS GRAVADOS
// nas imagens de catálogo — elas trazem "FLASH", "ENTRADA USB-C" e as linhas de
// chamada queimadas no pixel, que não podem aparecer num scrollytelling onde o
// texto é HTML. Se um recorte precisar de ajuste, muda aqui e roda de novo;
// ninguém precisa adivinhar de onde veio o arquivo.
//
// POR QUE ALGUMAS CENAS NÃO PREENCHEM O QUADRO: o cartão de memória e o cabo
// aparecem no acervo dentro de uma composição 1200x1200, ocupando poucos
// pixels. Ampliar até encher 1440 de largura entregaria borrão. Então eles
// entram no tamanho quase nativo, centrados sobre a mesma superfície do palco.
// Fica nítido e lê como prancha de produto — que é o que é.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const SITE = path.resolve(__dirname, '..');
const SAIDA = path.join(SITE, 'melcam', 'img', 'polen-story');

// Acervo entregue pelo cliente. Fora do repositório de propósito: são
// originais de 4000x6000 que não vão para produção.
const ACERVO = 'C:/Users/israe/Downloads/melcam/IMAGENS';
const CAT = ACERVO + '/Catalogo Polen/Preto';
const LP = ACERVO + '/Landing page Polen';

// Todo palco é 3:2. Uniforme de propósito: cena com proporção diferente
// mudaria a altura do palco no meio do scroll, e isso é layout shift.
const L = 1440, A = 960;

const CENAS = [
  {
    id: '01-fotografando',
    cap: 1,
    origem: { dir: LP, trecho: 'DSCF0246' },
    nota: 'Acervo do cliente · Landing page Polen · DSCF0246 (4000x3000)',
    // Ela e a câmera no olho. Recorte pela altura: 4000/1.5 = 2667.
    filtro: `crop=4000:2667:0:170,scale=${L}:${A}`,
  },
  {
    id: '02-sem-tela',
    cap: 2,
    origem: CAT + '/Melcam_Camera_Preto_1200x1200_Costas.png',
    nota: 'Catálogo oficial · Preto · Costas (1200x1200)',
    // A imagem de catálogo traz "LIVRE DE TELAS", "CONTADOR DE FOTOS" e
    // "SWITCH FLASH" gravados, mais linhas de chamada. Medido na grade: o
    // corpo da câmera vai de x154 a x1046 e de y351 a y849, e a linha da
    // chamada de baixo desce a partir de y677 em x561. Por isso o corte
    // fecha em y672: pega a faixa de cima do corpo inteiro, sem um pixel
    // de rótulo.
    filtro: `crop=892:327:154:345,scale=1338:490`,
    placa: '#202020',
  },
  {
    id: '04-dimensoes',
    cap: 4,
    origem: CAT + '/Melcam_Camera_Preto_1200x1200_Frente_Solo.png',
    nota: 'Catálogo oficial · Preto · Frente_Solo (1200x1200)',
    // A única tomada do catálogo SEM rótulo gravado. Frontal e reta, que é o
    // que uma cena de dimensões pede — o diagrama de medidas é desenhado em
    // SVG por cima, no HTML, e não vem queimado na foto.
    filtro: `scale=900:900`,
    placa: '#2b2b2b',
  },
  {
    id: '05-flash',
    cap: 5,
    origem: { dir: LP, trecho: 'ASFOTOSDEJOAO-3' },
    nota: 'Acervo do cliente · Landing page Polen · ASFOTOSDEJOAO-3 (3587x5380)',
    // Editorial da Polen marrom em luz baixa. Fecha no topo da câmera: janela
    // do flash, visor e lente. Sem rótulo nenhum, e a luz baixa é o contexto
    // certo para falar de flash.
    filtro: `crop=2600:1733:500:1450,scale=${L}:${A}`,
  },
  {
    id: '06-doze-mp',
    cap: 6,
    origem: { dir: LP, trecho: '23c8db96' },
    nota: 'Acervo do cliente · Landing page Polen · MAC de Niterói (1280x960)',
    // Foto FEITA com a Polen, escolhida fora das 8 que já estão na galeria da
    // página: a seção não pode repetir a de cima. Geometria e céu aberto
    // mostram resolução melhor que uma cena escura.
    filtro: `crop=1280:853:0:54,scale=${L}:${A}`,
  },
  {
    id: '07-cartao',
    cap: 7,
    origem: CAT + '/Melcam_Camera_Preto_1200x1200_Frente_Conjunto.png',
    nota: 'Catálogo oficial · Preto · Frente_Conjunto (1200x1200)',
    // O microSD de 4 GB ocupa 163px do original. Entra a 1,5x e centrado, não
    // esticado até 1440: assim o "4GB microSDHC" continua legível. O corte
    // termina em y890 porque a linha de chamada de "CABO USB-C E CARTÃO SD
    // INCLUSOS" começa logo abaixo.
    filtro: `crop=300:190:850:690,scale=450:285`,
    placa: '#2b2b2b',
  },
  {
    id: '08-usb-c',
    cap: 8,
    origem: CAT + '/Melcam_Camera_Preto_1200x1200_Frente_Conjunto.png',
    nota: 'Catálogo oficial · Preto · Frente_Conjunto (1200x1200)',
    // O cabo USB-C oficial, com as duas pontas à mostra. Mesma fonte da cena
    // 07 mas OUTRO objeto e outro recorte — não é a mesma imagem repetida
    // para preencher. Entra a 1,5x, sem ampliação destrutiva.
    filtro: `crop=720:180:120:700,scale=1080:270`,
    placa: '#2b2b2b',
  },
  {
    id: '09-filtros',
    cap: 9,
    origem: SITE + '/melcam/img/filtros/filter-f%d.jpg',
    nota: 'Acervo do cliente · Variedade dos filtros · f1 a f8, já tratadas no site',
    // As oito oficiais, a MESMA foto com os oito filtros — que é exatamente o
    // argumento do capítulo. Montagem 4x2 em 360x480 por célula.
    filtro: `scale=360:480:force_original_aspect_ratio=increase,crop=360:480,tile=4x2`,
    quadro: true,
  },
];

// Os nomes do acervo comecam com "Cópia de", e o acento chega do Windows em
// NFD enquanto a string daqui e NFC: comparar caminho literal falha mesmo com
// o arquivo existindo. Entao o arquivo e RESOLVIDO por trecho distintivo,
// normalizando os dois lados.
function resolver(dir, trecho) {
  const n = (s) => s.normalize('NFC').toLowerCase();
  const achado = fs.readdirSync(dir).find((f) => n(f).includes(n(trecho)));
  return achado ? path.join(dir, achado) : null;
}

function ffmpeg(args) {
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error'].concat(args), { stdio: 'inherit' });
}

function gerar(c) {
  const destino = path.join(SAIDA, 'polen-' + c.id + '.jpg');
  if (c.quadro) {
    // Montagem: várias entradas numeradas.
    ffmpeg(['-i', c.origem, '-vf', c.filtro, '-frames:v', '1', '-q:v', '4', '-y', destino]);
  } else if (c.placa) {
    // Conteúdo centrado, SEM ampliar além do que a fonte aguenta, sobre um
    // fundo tirado da própria imagem e desfocado.
    //
    // POR QUE NÃO PADDING DE COR CHAPADA: foi a primeira tentativa e deixou
    // emenda visível. O fundo do catálogo não é liso — tem vinheta e o padrão
    // favo —, então nenhuma cor única casa com a borda do recorte, e a
    // costura aparecia como retângulo. Espalhar o mesmo recorte desfocado
    // resolve porque a cor de fundo passa a ser, literalmente, a da imagem.
    ffmpeg(['-i', c.origem, '-filter_complex',
      `[0:v]${c.filtro},split=2[a][b];` +
      `[a]scale=${L}:${A},boxblur=luma_radius=48:luma_power=2[bg];` +
      `[bg][b]overlay=(W-w)/2:(H-h)/2`,
      '-q:v', '4', '-y', destino]);
  } else {
    ffmpeg(['-i', c.origem, '-vf', c.filtro, '-q:v', '4', '-y', destino]);
  }
  const kb = (fs.statSync(destino).size / 1024).toFixed(0);
  console.log(`cap ${String(c.cap).padStart(2, '0')}  ${path.basename(destino).padEnd(28)} ${kb} KB   <- ${c.nota}`);
}

if (!fs.existsSync(SAIDA)) fs.mkdirSync(SAIDA, { recursive: true });

// Resolve as origens declaradas por trecho antes de qualquer geração.
CENAS.forEach((c) => {
  if (c.origem && typeof c.origem === 'object') {
    c.origem = fs.existsSync(c.origem.dir) ? resolver(c.origem.dir, c.origem.trecho) : null;
  }
});

// Guarda: sem o acervo montado, não invente caminho nem gere arquivo vazio.
const faltando = CENAS.filter((c) => !c.quadro && (!c.origem || !fs.existsSync(c.origem)));
if (faltando.length) {
  console.error('acervo ausente — nao gerei nada:');
  faltando.forEach((c) => console.error('  cap ' + c.cap + ': ' + (c.origem || c.nota)));
  process.exit(1);
}

CENAS.forEach(gerar);
fs.writeFileSync(path.join(SAIDA, 'ORIGEM.txt'),
  'Cenas do scrollytelling de "O diferencial" da /polen.\n' +
  'Geradas por tools/polen-story-assets.js a partir do acervo oficial do\n' +
  'cliente. Nenhuma imagem de banco, de internet ou gerada.\n\n' +
  CENAS.map((c) => `cap ${String(c.cap).padStart(2, '0')}  polen-${c.id}.jpg\n     ${c.nota}\n     recorte: ${c.filtro}\n`).join('\n'),
  'utf8');
console.log('\nORIGEM.txt gravado.');

module.exports = { CENAS };
