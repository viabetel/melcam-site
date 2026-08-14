// A GRADE DE PRODUTOS DA HOME, EM FUNDO MEL — pós-processo sobre os HTML
// construídos. Mesma disciplina do tools/rotas.js e do tools/rodape.js: abre
// cada arquivo, mexe só no que precisa mudar, com fronteira verificada, e é
// idempotente.
//
//   node tools/grade-mel.js         (aplica)
//   node tools/grade-mel.js --ver   (só relata, não grava)
//
// POR QUE EXISTE
// O `topicos_alteracoes.pdf` (item 1) pede a grade Bee/Polen "caracterizada por
// um fundo amarelo distinto e botões de chamada para ação". O fundo e a pílula
// são CSS e moram em tools/identidade.js. Faltavam duas coisas que são HTML:
//
//   1. data-mel-tema="claro" na <section>. É o contrato do controlador de tema
//      da navbar (iniciarTemaNavbar, em tools/perfil.js): região clara é a que
//      LEVA A MARCA, nunca a que "parece clara". Sem isto a barra continuaria
//      carvão por cima da faixa amarela.
//   2. o texto dos dois CTA, que o cliente nomeia: "Conheça" e "Ver Modelos".
//      A fonte deles é bloco-bee.js e bloco-polen.js — aqui só se SINCRONIZA o
//      build com a constante da fonte, nunca se escreve a palavra à mão.
//
// POR QUE NÃO DÁ PARA SÓ RODAR bloco-bee.aplicar() DE NOVO
// Aqueles dois só sabem INSERIR, e são idempotentes por presença da marca: com
// a tira já no arquivo eles saem sem fazer nada. Trocar o texto de um CTA que
// já está gravado é trabalho de sincronia, e é este arquivo.
//
// ⚠️ A MARCA VAI EM TODAS AS PÁGINAS, e é de propósito.
// As internas herdam a seção inteira do index.html (paginas.gerar() copia), e
// lá ela é `display:none` — medido na /polen: display none, rect 0x0. O
// controlador decide por getBoundingClientRect, e uma caixa 0x0 nunca cruza a
// meia-altura da barra, então a marca é inerte fora da home. Marcar só o
// index.html daria o mesmo resultado na tela e um arquivo fora de sincronia com
// os outros dez no primeiro gerar() que rodasse.
const fs = require('fs');
const path = require('path');

const SITE = path.resolve(__dirname, '..');
const VER = process.argv.includes('--ver');

const CTA_BEE = require('./bloco-bee.js').CTA;
const CTA_POLEN = require('./bloco-polen.js').CTA;

const SECAO = /<section\b([^>]*)data-framer-name="Header Grid"([^>]*)>/;
const MARCA = 'data-mel-tema="claro"';

// Troca o miolo de <span class="X">...</span>. Sem regex gulosa: o miolo destes
// dois é texto puro escrito por bloco-bee.js / bloco-polen.js, e a busca do
// </span> mais próximo é exata porque não há span aninhado dentro deles.
function trocarSpan(html, classe, texto) {
  const abre = `<span class="${classe}">`;
  let n = 0, i = 0, saida = '';
  for (;;) {
    const k = html.indexOf(abre, i);
    if (k < 0) break;
    const ini = k + abre.length;
    const fim = html.indexOf('</span>', ini);
    if (fim < 0) break;
    saida += html.slice(i, ini) + texto;
    i = fim;
    if (html.slice(ini, fim) !== texto) n++;
  }
  return { html: saida + html.slice(i), n };
}

function paginas() {
  return fs.readdirSync(SITE)
    .filter((f) => /\.html$/i.test(f))
    .filter((f) => SECAO.test(fs.readFileSync(path.join(SITE, f), 'utf8')));
}

const conta = (t, r) => (t.match(r) || []).length;
const balanco = (t) => ({
  section: conta(t, /<section[\s>]/g) - conta(t, /<\/section>/g),
  div: conta(t, /<div[\s>]/g) - conta(t, /<\/div>/g),
  span: conta(t, /<span[\s>]/g) - conta(t, /<\/span>/g),
  a: conta(t, /<a[\s>]/g) - conta(t, /<\/a>/g),
});

function aplicar() {
  const relato = [];
  let falhou = 0;

  for (const nome of paginas()) {
    const arq = path.join(SITE, nome);
    const antes = fs.readFileSync(arq, 'utf8');
    let html = antes;
    const mudou = [];

    // 1. a marca de região clara, NA SEÇÃO — e a pergunta é sobre a seção, não
    //    sobre o arquivo: a bee.html já tem três data-mel-tema="claro" (o hero e
    //    as duas Bee Cam), e procurar a marca no arquivo inteiro concluiria
    //    "já feito" numa página onde a grade continua sem marca.
    const secAntes = SECAO.exec(html);
    if (secAntes && secAntes[0].indexOf(MARCA) < 0) {
      html = html.replace(SECAO, (t) => t.slice(0, -1) + ' ' + MARCA + '>');
      mudou.push('tema=claro');
    }

    // 2. os dois CTA, sincronizados com a fonte
    const b = trocarSpan(html, 'mel-bee-cta', CTA_BEE);
    html = b.html;
    if (b.n) mudou.push(`CTA da Bee -> "${CTA_BEE}" (${b.n})`);
    const p = trocarSpan(html, 'mel-polen-cta', CTA_POLEN);
    html = p.html;
    if (p.n) mudou.push(`CTA da Polen -> "${CTA_POLEN}" (${p.n})`);

    if (!mudou.length) { relato.push(`[--] ${nome}: já em dia`); continue; }

    // guardas: só pode ter mudado texto e um atributo. Nenhuma tag entra, sai
    // ou desemparelha.
    const bA = balanco(antes), bD = balanco(html);
    const okBal = ['section', 'div', 'span', 'a'].every((k) => bA[k] === bD[k]);
    const okTags = ['section', 'div', 'span', 'a', 'img', 'li'].every(
      (t) => conta(antes, new RegExp('<' + t + '[\\s>]', 'g')) === conta(html, new RegExp('<' + t + '[\\s>]', 'g'))
    );
    // a marca não pode ter entrado duas vezes na mesma tag, e o total do
    // arquivo só pode ter subido no máximo 1 (a seção da grade).
    const secDepois = SECAO.exec(html);
    const okMarca = !!secDepois
      && conta(secDepois[0], new RegExp(MARCA, 'g')) === 1
      && conta(html, new RegExp(MARCA, 'g')) - conta(antes, new RegExp(MARCA, 'g')) <= 1;
    if (!(okBal && okTags && okMarca)) {
      relato.push(`[ERRO] ${nome}: guarda falhou, NADA gravado — ${JSON.stringify({ okBal, okTags, okMarca })}`);
      falhou++;
      continue;
    }

    if (!VER) fs.writeFileSync(arq, html, 'utf8');
    relato.push(`${VER ? '[ver]' : '[ok] '} ${nome}: ${mudou.join(' · ')}`);
  }

  return { relato, falhou };
}

module.exports = { aplicar, CTA_BEE, CTA_POLEN };

if (require.main === module) {
  const { relato, falhou } = aplicar();
  console.log(relato.join('\n'));
  process.exit(falhou ? 1 : 0);
}
