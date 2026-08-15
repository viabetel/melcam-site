// A NAVBAR ATUAL, ASSADA NO HTML — 14/08/2026.
//
//   node tools/navbar-estatica.js
//
// POR QUE ESTE ARQUIVO EXISTE
//
// A barra tinha duas caras. A do export do Framer — hambúrguer à esquerda,
// logo no centro, slot de ícones à direita, nenhum destino à vista — vinha no
// HTML. A atual, com os quatro destinos, a sacola e a conta, nascia em
// iniciarPerfil(), ou seja, só no DOMContentLoaded.
//
// Entre o primeiro pixel e o DOMContentLoaded o visitante via a barra ANTIGA.
// Medido em 14/08 com tools/qa-flash-navbar.js, rede e CPU freadas, indo da
// home para /polen como quem clica: 42 quadros pintados com o hambúrguer,
// t=3344ms a t=5051ms — 1,7 segundo de barra velha em cada troca de página.
// Não era hidratação, não era media query, não era componente duplicado: era
// o HTML servido, que só tinha a barra velha para mostrar.
//
// O CONSERTO É NA ORIGEM: o mesmo DOM que iniciarPerfil() criaria já vem
// escrito no arquivo. O CSS que muda a linha para grade e recolhe o hambúrguer
// é escopado por :has(.mel-nav-links) — com os links no HTML, ele vale no
// primeiro paint, sem script nenhum. Nada de atraso, nada de esconder a barra
// até o JS chegar: o que pinta no quadro 1 já é o desenho final.
//
// 🔴 SÃO DUAS <nav> POR PÁGINA, e ignorar isso já custou uma correção inteira
// (progresso.md, 13/08). O export traz uma variante SSR por breakpoint:
// "Navigation Color" no desktop e "Navigation Mobile Coor" no mobile, com o
// nome truncado assim mesmo. As duas recebem o mesmo tratamento aqui, porque
// qual delas pinta quem decide é a media query do próprio Framer.
//
// O SLOT DE ÍCONES sai junto, e pelo mesmo motivo: iniciarPerfil() já o
// recolhe em toda largura (é o slot vazio que empurrava o botão de conta para
// fora da tela em 320px), então deixá-lo visível no primeiro paint seria
// mostrar uma quarta coluna que vai sumir. Só é recolhido aqui quando a
// medição estática concorda com a de lá: nada dentro dele além da lupa inerte
// do template. Se um dia o template puser algo de verdade ali, o slot fica, e
// a decisão continua sendo do iniciarPerfil(), que mede de verdade.
//
// O QUE ESTE ARQUIVO NÃO MUDA: nenhuma classe do Framer, nenhum atributo de
// estilo da barra, nenhuma cor, nenhuma medida, nenhum destino. O DOM que
// entra é caractere por caractere o que iniciarPerfil() criava — os ícones
// saem do mesmo tools/perfil.js, por require, para não haver duas verdades.
//
// Idempotente: rodar duas vezes dá o mesmo arquivo. Não grava nada se a
// contagem de <div> mudar ou se alguma barra ficar sem os dois blocos.
const fs = require('fs');
const path = require('path');
const { svg } = require('./perfil.js');

const SITE = path.resolve(__dirname, '..');

// Os mesmos quatro destinos de iniciarPerfil(), na mesma ordem. Home não entra:
// aqui em cima ela é o próprio logo.
const DESTINOS = [
  { t: 'Polen', h: '/polen' },
  { t: 'Bee', h: '/bee' },
  { t: 'Acessórios', h: '/acessorios' },
  { t: 'Sobre', h: '/sobre' },
];

// A rota de cada arquivo, para o aria-current sair certo já no HTML. As páginas
// que não estão aqui simplesmente não marcam nenhum link como atual.
const ROTA = {
  'index.html': '/',
  'polen.html': '/polen',
  'bee.html': '/bee',
  'acessorios.html': '/acessorios',
  'sobre.html': '/sobre',
};

const MARCA_LINKS = '<div class="mel-nav-links"';
const MARCA_ACOES = '<div class="mel-nav-acoes"';

// ---------------------------------------------------------------- utilidades
// Fim (exclusivo) do elemento que começa em i, contando abre e fecha da mesma
// tag. Regex com ".*?" corta no lugar errado: estas caixas têm divs aninhadas.
function fatia(s, i) {
  const tag = (s.slice(i, i + 12).match(/^<([a-z0-9]+)/i) || [])[1];
  if (!tag) throw new Error('fatia: não é uma tag em ' + i);
  const re = new RegExp('<\\/?' + tag + '[\\s>]', 'gi');
  re.lastIndex = i;
  let d = 0, m;
  while ((m = re.exec(s))) {
    if (m[0][1] === '/') {
      d--;
      if (d === 0) return s.indexOf('>', m.index) + 1;
    } else d++;
  }
  throw new Error('fatia: <' + tag + '> aberta em ' + i + ' e nunca fechada');
}

// Início da tag de abertura que contém o índice i (o "<div" mais próximo à
// esquerda que ainda envolve o atributo encontrado).
function abertura(s, i) {
  const a = s.lastIndexOf('<', i);
  if (a < 0) throw new Error('abertura: nada antes de ' + i);
  return a;
}

// ------------------------------------------------------------------ o que entra
function htmlLinks(rota) {
  const aqui = String(rota || '').replace(/\/$/, '') || '/';
  return MARCA_LINKS + ' data-mel-estatico="">'
    + DESTINOS.map((d) => '<a class="mel-nav-link" href="' + d.h + '"'
      + (aqui === d.h ? ' aria-current="page"' : '') + '>' + d.t + '</a>').join('')
    + '</div>';
}

// O selo nasce em "0" e sem data-tem, que é o estado de sacola vazia: é o
// mesmo que pintarSelo() escreve para quem chega sem nada guardado. Os
// aria-label são os de sessão nenhuma e sacola vazia, pela mesma razão — o
// script reescreve os dois assim que lê o localStorage.
const SELO = '<span class="mel-perfil-selo" data-mel-contador-selo aria-hidden="true">0</span>';

function htmlAcoes() {
  return MARCA_ACOES + ' data-mel-estatico="">'
    + '<a class="mel-perfil-bt mel-sacola-bt" href="/sacola" data-mel-sacola-bt=""'
    + ' aria-label="Sacola, vazia">' + svg('sacola', 24) + SELO + '</a>'
    + '<button type="button" class="mel-perfil-bt" data-mel-perfil=""'
    + ' aria-haspopup="menu" aria-expanded="false"'
    + ' aria-label="Entrar ou criar conta">' + svg('usuario', 24) + SELO + '</button>'
    + '</div>';
}

// ------------------------------------------------------------------- limpeza
// Tira o que este arquivo pôs numa passagem anterior, para poder repor. Só sai
// o que tem data-mel-estatico: DOM criado em tempo de execução não é gravado
// em disco, então não há como confundir os dois.
function limpar(s) {
  for (const marca of [MARCA_LINKS, MARCA_ACOES]) {
    for (;;) {
      const i = s.indexOf(marca + ' data-mel-estatico=""');
      if (i < 0) break;
      s = s.slice(0, i) + s.slice(fatia(s, i));
    }
  }
  return s.split(' data-mel-slot="oculto" style="display:none"').join('');
}

// ------------------------------------------------------------------ aplicação
function aplicarArquivo(arq) {
  const alvo = path.join(SITE, arq);
  const original = fs.readFileSync(alvo, 'utf8');
  const conta = (t) => (t.match(/<div[\s>]/g) || []).length - (t.match(/<\/div>/g) || []).length;
  const divAntes = conta(original);

  let s = limpar(original);
  const rota = ROTA[arq];

  // De trás para frente: inserir muda os índices de tudo que vem depois.
  const linhas = [];
  {
    const re = /data-framer-name="Section "/g;
    let m;
    while ((m = re.exec(s))) linhas.push(abertura(s, m.index));
  }
  // Só as linhas que são de navbar: a que tem o bloco "Meniu" dentro.
  const alvos = [];
  for (const i of linhas) {
    const fim = fatia(s, i);
    const trecho = s.slice(i, fim);
    if (trecho.includes('data-framer-name="Meniu"')) alvos.push({ i, fim });
  }
  if (!alvos.length) return { arq, barras: 0 };

  for (const { i, fim } of alvos.reverse()) {
    let linha = s.slice(i, fim);

    // 1. o slot de ícones, recolhido quando não carrega nada de verdade
    const j = linha.indexOf('data-framer-name="Section Icon"');
    if (j >= 0) {
      const a = abertura(linha, j);
      const b = fatia(linha, a);
      const slot = linha.slice(a, b);
      const controles = (slot.match(/<a[\s>]|<img[\s>]|<button[\s>]/g) || []);
      const soLupa = controles.length === (slot.match(/<button[\s>]/g) || []).length
        && controles.length === (slot.match(/aria-label="Search Icon"/g) || []).length;
      if (soLupa) {
        const cabeca = slot.slice(0, slot.indexOf('>'));
        // O slot não tem style próprio no export; se um dia tiver, não mexemos.
        if (!/\sstyle=/.test(cabeca)) {
          linha = linha.slice(0, a)
            + cabeca + ' data-mel-slot="oculto" style="display:none"' + slot.slice(slot.indexOf('>'))
            + linha.slice(b);
        }
      }
    }

    // 2. os quatro destinos, dentro do "Meniu" — que é a coluna da esquerda.
    //    Pendurá-los direto na linha criaria um quarto filho e quebraria a
    //    grade de três colunas que centra o logo.
    const k = linha.indexOf('data-framer-name="Meniu"');
    if (k < 0) continue;
    const ma = abertura(linha, k);
    const mb = fatia(linha, ma);
    const fechaMeniu = linha.lastIndexOf('</div>', mb);
    linha = linha.slice(0, fechaMeniu) + htmlLinks(rota) + linha.slice(fechaMeniu);

    // 3. sacola e conta, num grupo só, no fim da linha: é ele que ocupa a
    //    terceira coluna da grade.
    const fechaLinha = linha.lastIndexOf('</div>');
    linha = linha.slice(0, fechaLinha) + htmlAcoes() + linha.slice(fechaLinha);

    s = s.slice(0, i) + linha + s.slice(fim);
  }

  // ------------------------------------------------------------------ provas
  const divDepois = conta(s);
  if (divAntes !== divDepois) {
    throw new Error(arq + ': documento desbalanceado (' + divAntes + ' -> ' + divDepois + ')');
  }
  const nLinks = (s.match(/class="mel-nav-links"/g) || []).length;
  const nAcoes = (s.match(/class="mel-nav-acoes"/g) || []).length;
  if (nLinks !== alvos.length || nAcoes !== alvos.length) {
    throw new Error(arq + ': ' + alvos.length + ' barras, mas ' + nLinks
      + ' blocos de links e ' + nAcoes + ' de ações');
  }
  const nPerfil = (s.match(/data-mel-perfil=""/g) || []).length;
  if (nPerfil !== alvos.length) throw new Error(arq + ': botão de conta duplicado ou faltando');

  const mudou = s !== original;
  if (mudou) fs.writeFileSync(alvo, s, 'utf8');
  return { arq, barras: alvos.length, mudou, de: original.length, para: s.length };
}

function aplicar() {
  return fs.readdirSync(SITE)
    .filter((f) => f.endsWith('.html'))
    .map(aplicarArquivo)
    .filter((r) => r.barras);
}

module.exports = { aplicar, htmlLinks, htmlAcoes };

if (require.main === module) {
  const r = aplicar();
  for (const x of r) {
    console.log('[OK] ' + x.arq.padEnd(28) + x.barras + ' barra(s)  '
      + x.de + ' -> ' + x.para + (x.mudou ? '' : '  (já estava)'));
  }
  console.log('\n' + r.length + ' páginas com a barra atual no HTML servido.');
}
