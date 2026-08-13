// Lê o JSON de tools/qa-paleta.js e resume: cores fora da paleta que PINTAM,
// falhas de contraste, foco e saúde por rota. Sem isto o JSON tem dezenas de
// milhares de linhas e ninguém acha o defeito.
//
//   node tools/resumo-paleta.js <rotulo> [--cor #FFFFFF] [--rota /polen]
const fs = require('fs');
const path = require('path');

const rotulo = process.argv[2] || 'antes';
const arq = path.join(__dirname, 'shots-paleta', `qa-paleta-${rotulo}.json`);
const r = JSON.parse(fs.readFileSync(arq, 'utf8'));

const iC = process.argv.indexOf('--cor');
const filtroCor = iC >= 0 ? process.argv[iC + 1].toUpperCase() : null;
const iR = process.argv.indexOf('--rota');
const filtroRota = iR >= 0 ? process.argv[iR + 1] : null;

// Tudo que a identidade autoriza — token, derivação documentada e amostra de
// packshot. Cor fora desta lista é o que a auditoria persegue.
const OK = new Set([
  // os cinco da marca
  '#221E17', '#F2A900', '#FBF7EE', '#EE6A4D', '#5E8C7B',
  // derivações declaradas em tools/identidade.js
  '#2B251C', '#9A9083', '#CFC6B8', '#FFC22E', '#0E0C09',
  // cores AMOSTRADAS dos packshots: régua da home e swatches das 7 Polen.
  // Não são escolhas de design, são o produto — recolori-las seria mentir
  // sobre a cor da câmera que a pessoa vai receber.
  '#F2C300', '#7A5A44', '#1A1714', '#E8A0AE',
  '#F4B233', '#DADADA', '#EF6C29', '#5F2D0B', '#2B2B2B', '#FBBAB6', '#303F1C',
]);

// Propriedades que a sonda coleta mas que, MEDIDAS neste site, não pintam
// nada. Não é palpite — foi contado no navegador em 13/08/2026:
//
//   column-rule ...... 1485 declarações, 0 pintam (column-rule-style:none em
//                      todas; o valor só existe porque o UA guarda um default)
//   outline em pseudo . 92 declarações, 0 pintam (outline-style:none)
//   color em pseudo ... 92 pseudos com content, só 2 com texto de verdade — e
//                      esses 2 são nossos (pílula "Novidade" e eyebrow Polen),
//                      ambos em cor de paleta
//   fill em <use> ..... o <use> declara um fill que o símbolo referenciado
//                      sobrescreve; ler o do <use> mede o que não aparece
//
// Sem este filtro o relatório abre com 4004 ocorrências de #000000 e 1965 de
// #0000EE que ninguém nunca viu, e o defeito de verdade fica soterrado.
const NAO_PINTA = (u) =>
  u.prop === 'columnRuleColor'
  || u.prop.startsWith('outlineColor::')
  || u.prop.startsWith('color::before') || u.prop.startsWith('color::after')
  // fill só pinta em forma. No <svg> e no <g> ele é herança; no <use>, o
  // símbolo referenciado manda. Medido: 54 nós com fill, 16 pintando.
  || (u.prop === 'fill' && !['path', 'rect', 'circle', 'ellipse', 'line', 'polygon', 'polyline', 'text'].includes(u.tag))
  || (u.prop === 'stroke' && !['path', 'rect', 'circle', 'ellipse', 'line', 'polygon', 'polyline', 'text'].includes(u.tag));

const cores = new Map();
const contraste = [];
const focoRuim = [];
const saude = [];

for (const [rota, telas] of Object.entries(r.rotas)) {
  if (filtroRota && rota !== filtroRota) continue;
  for (const [tela, v] of Object.entries(telas)) {
    if (!v || !v.usos) continue;
    for (const u of v.usos) {
      if (NAO_PINTA(u)) continue;
      if (OK.has(u.hex)) continue;
      if (filtroCor && u.hex !== filtroCor) continue;
      const k = u.hex + (u.alfa === 1 ? '' : '@' + u.alfa);
      if (!cores.has(k)) cores.set(k, { n: 0, props: new Map(), rotas: new Set(), telas: new Set(), ex: [] });
      const e = cores.get(k);
      e.n++; e.rotas.add(rota); e.telas.add(tela);
      e.props.set(u.prop, (e.props.get(u.prop) || 0) + 1);
      if (e.ex.length < 4 && !e.ex.some((x) => x.onde === u.onde)) {
        e.ex.push({ onde: u.onde, prop: u.prop, extra: u.extra, rota });
      }
    }
    for (const t of v.textos || []) {
      if (t.razao >= t.minimo) continue;
      contraste.push({ rota, tela, ...t });
    }
    for (const f of v.foco || []) {
      // Só conta quem o navegador de fato marcou como :focus-visible; o resto
      // não é avaliável por script (ver comentário em qa-paleta.js).
      if (!f.avaliavel) continue;
      if (!f.visivel || (f.contraste !== null && f.contraste < 3)) focoRuim.push({ rota, tela, ...f });
    }
    saude.push({
      rota, tela, h1: v.saude.h1, transbordo: v.saude.transbordo,
      doc: v.saude.larguraDoc, janela: v.saude.larguraJanela,
      quebradas: v.saude.imgsQuebradas.length, console: (v.consoleErros || []).length,
      navbar: v.saude.navbar, rodape: v.saude.rodape, altura: v.saude.altura,
      estados: (v.estados || []).length, regras: v.regrasLidas,
    });
  }
}

console.log(`\n### CORES FORA DA PALETA QUE PINTAM  (${rotulo})\n`);
console.log('cor            ocorr  rotas  props / exemplo');
for (const [k, v] of [...cores].sort((a, b) => b[1].n - a[1].n)) {
  const props = [...v.props].sort((a, b) => b[1] - a[1]).map(([p, n]) => `${p}:${n}`).join(' ');
  console.log(`${k.padEnd(14)} ${String(v.n).padStart(6)} ${String(v.rotas.size).padStart(6)}  ${props}`);
  for (const e of v.ex) console.log(`                              ${e.rota} · ${e.onde}${e.extra ? '  «' + e.extra + '»' : ''}`);
}

console.log(`\n### CONTRASTE ABAIXO DO MÍNIMO WCAG 2.2 AA  (${contraste.length} nós)\n`);
const porTexto = new Map();
for (const c of contraste) {
  const k = c.cor + '/' + c.fundo + '|' + c.onde;
  if (!porTexto.has(k)) porTexto.set(k, { ...c, n: 0, rotas: new Set() });
  porTexto.get(k).n++; porTexto.get(k).rotas.add(c.rota);
}
for (const v of [...porTexto.values()].sort((a, b) => a.razao - b.razao)) {
  console.log(`${String(v.razao).padStart(5)}:1 (min ${v.minimo})  ${v.cor} sobre ${v.fundo}`
    + `${v.sobreImagem ? ' [SOBRE IMAGEM]' : ''}  ${v.px}px/${v.peso}${v.opacidade < 1 ? ' op' + v.opacidade : ''}`);
  console.log(`            ${[...v.rotas].join(' ')} · ${v.onde}`);
  console.log(`            "${v.texto}"`);
}

console.log(`\n### FOCO SEM ANEL OU COM CONTRASTE < 3:1  (${focoRuim.length})\n`);
for (const f of focoRuim.slice(0, 20)) {
  console.log(`${f.rota} ${f.tela}  ${f.tag}  largura=${f.largura} estilo=${f.estilo} cor=${f.cor} contraste=${f.contraste}`);
  console.log(`     ${f.onde}`);
}

console.log(`\n### SAÚDE POR ROTA\n`);
console.log('rota          tela      h1  transb  doc/janela   img✗  console  nav  rod  altura  regras(estado)');
for (const s of saude) {
  console.log(`${s.rota.padEnd(13)} ${s.tela.padEnd(9)} ${String(s.h1).padStart(2)}`
    + `  ${(s.transbordo ? 'SIM' : 'não').padStart(6)}  ${(s.doc + '/' + s.janela).padStart(11)}`
    + `  ${String(s.quebradas).padStart(4)}  ${String(s.console).padStart(7)}`
    + `  ${(s.navbar ? 'ok' : 'NÃO').padStart(3)}  ${(s.rodape ? 'ok' : 'NÃO').padStart(3)}`
    + `  ${String(s.altura).padStart(6)}  ${s.regras}(${s.estados})`);
}
