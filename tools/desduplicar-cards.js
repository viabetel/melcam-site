// Desduplica as fotos dos cards editoriais do Header Grid ("A câmera que vive
// com você"). NAO mexe em CSS, layout, tamanho, posicao, texto, link nem no
// ticker.
//
// O DEFEITO, MEDIDO EM 13/08/2026
// O card "Sobre Nós" do template tem DOIS slots de imagem, cada um num wrapper
// absoluto que sangra para fora do card — um pela borda de cima, outro pela de
// baixo. Medido no desktop, com o card em 953,2086 437x782:
//
//   wrapper A  953,1860  437x437   community-03.jpg
//   wrapper B  953,2658  437x437   community-03.jpg   <- a MESMA foto
//
// O overflow:hidden do card corta os dois. Da o sintoma relatado: a foto vai
// ate a metade do card e "continua do outro lado", como se estivesse partida.
//
// A causa NAO e CSS. tools/imagens.js troca por HASH do arquivo remoto, e os
// dois slots do template usam o MESMO hash (E60m9ySte60CtImTqU). A troca fez o
// que devia; quem repete e o template. Mesma historia na Polen: card-polen.jpg
// atende 3 slots, e dois deles caem em cards vizinhos separados por 15px, o que
// tambem le como uma imagem partida.
//
// Bee e Acessorios nao sofrem: cada um tem UM slot visivel so.
//
// A CORRECAO
// Dar asset proprio a cada slot repetido, dentro do card. E troca de src/srcset
// e alt, nada mais. O bitmap original esta integro e continua em uso no primeiro
// slot de cada card.
//
// Idempotente: se o segundo slot ja tiver o asset novo, nao faz nada.
const fs = require('fs');
const path = require('path');

const SITE = path.resolve(__dirname, '..');

// Por card: qual foto o 2o slot em diante passa a usar.
// Escolhas coerentes com o que cada card comunica, e todas de asset oficial ja
// no projeto — nenhuma imagem nova foi criada nem baixada.
// 13/08/2026, segunda passada: as duas fotos do "Sobre Nós" trocadas por
// material mais condizente com o que o card diz — marca brasileira, fotografia
// intencional e comunidade. As de comunidade eram paisagem de viagem ("por onde
// a Melcam passou"), que e o assunto da secao Colmeia, nao deste card.
//
//   slot 1 (inferior)  bee-lp-1237  pessoa fotografando com a Melcam a beira-mar
//   slot 2 (superior)  bee-lp-06    pessoa segurando a Bee nas cores do Brasil,
//                                   com "MELCAM . Bee" legivel na peca
//
// As duas em 1600x2400: cobrem 437x437 em tela 2x com folga. As de lifestyle/
// foram descartadas por resolucao — 600x800 nao cobre 2x.
const SOBRE_NOS = [
  { de: '/melcam/img/comunidade/community-03.jpg',
    para: '/melcam/img/header-fileira/bee-lp-1237.jpg',
    alt: 'Pessoa fotografando com a câmera Melcam à beira-mar' },
  { de: '/melcam/img/comunidade/community-05.jpg',
    para: '/melcam/img/header-fileira/bee-lp-06.jpg',
    alt: 'Câmera Bee nas cores do Brasil na mão de quem fotografa' },
];

const POLEN = {
    card: 'Polen',
    de: '/melcam/img/card-polen.jpg',
    para: '/melcam/img/header-fileira/polen-lp-1.jpg',
    alt: 'Câmera Polen preta com sua embalagem',
};

const REGRAS = [POLEN];

const PAGINAS = ['index.html', 'polen.html', 'bee.html', 'acessorios.html',
                 'sobre.html', 'sacola.html', '404.html'];

// Recorta cada <a data-framer-name="NOME"> com contagem equilibrada.
function cards(html, nome) {
  const re = new RegExp('<a[^>]*data-framer-name="' + nome + '"[^>]*>', 'g');
  const out = [];
  let m;
  while ((m = re.exec(html))) {
    const ini = m.index;
    const rx = /<(\/?)a\b[^>]*>/g;
    rx.lastIndex = ini;
    let prof = 0, t;
    while ((t = rx.exec(html))) {
      prof += t[1] ? -1 : 1;
      if (prof === 0) { out.push({ ini, fim: t.index + t[0].length }); break; }
    }
  }
  return out;
}

// Troca src, srcset e alt da N-esima ocorrencia em diante, dentro de um bloco.
function trocarDaSegunda(bloco, de, para, alt) {
  let n = 0, trocas = 0;
  // Cada <img ...> inteiro, para mexer em src/srcset/alt do mesmo no.
  const saida = bloco.replace(/<img\b[^>]*>/g, (tag) => {
    if (tag.indexOf(de) < 0) return tag;
    n++;
    if (n === 1) return tag;                       // o primeiro slot fica
    trocas++;
    return tag
      .split(de).join(para)                        // pega src E srcset
      .replace(/\salt="[^"]*"/, ' alt="' + alt + '"');
  });
  return { saida, trocas, encontrados: n };
}

// Troca 1-para-1 dentro do card indicado. Cada slot tem destino proprio, entao
// nao ha como os dois voltarem a ser a mesma foto.
function trocarSlots(html, nomeCard, pares) {
  let total = 0;
  const blocos = cards(html, nomeCard);
  for (let i = blocos.length - 1; i >= 0; i--) {
    const { ini, fim } = blocos[i];
    let bloco = html.slice(ini, fim);
    const original = bloco;
    for (const p of pares) {
      bloco = bloco.replace(/<img\b[^>]*>/g, tag => tag.indexOf(p.de) < 0 ? tag
        : tag.split(p.de).join(p.para).replace(/\salt="[^"]*"/, ' alt="' + p.alt + '"'));
    }
    if (bloco !== original) { html = html.slice(0, ini) + bloco + html.slice(fim); total++; }
  }
  return { html, total };
}

function aplicar() {
  const feito = [];

  for (const nome of PAGINAS) {
    const arq = path.join(SITE, nome);
    if (!fs.existsSync(arq)) continue;
    const antes = fs.readFileSync(arq, 'utf8');
    let html = antes;
    let total = 0;
    const detalhe = [];

    // Primeiro as fotos proprias do Sobre Nós, uma por slot.
    const sn = trocarSlots(html, 'Sobre Nós', SOBRE_NOS);
    if (sn.total) { html = sn.html; total += sn.total; detalhe.push('Sobre Nós: ' + sn.total + ' card(s) com as duas fotos trocadas'); }

    for (const r of REGRAS) {
      // de tras para frente: os indices dos blocos anteriores nao se movem
      const blocos = cards(html, r.card);
      for (let i = blocos.length - 1; i >= 0; i--) {
        const { ini, fim } = blocos[i];
        const bloco = html.slice(ini, fim);
        const { saida, trocas, encontrados } = trocarDaSegunda(bloco, r.de, r.para, r.alt);
        if (encontrados > 1) detalhe.push(r.card + '[' + i + ']: ' + encontrados + ' slots com a mesma foto, ' + trocas + ' trocado(s)');
        if (trocas) { html = html.slice(0, ini) + saida + html.slice(fim); total += trocas; }
      }
    }

    // Cards VIZINHOS repetindo a mesma foto: o caso da Polen, dois cards
    // separados por 15px. O primeiro card fica; do segundo em diante troca.
    const blocosPolen = cards(html, 'Polen');
    if (blocosPolen.length > 1) {
      let visto = 0;
      for (let i = blocosPolen.length - 1; i >= 0; i--) {
        const { ini, fim } = blocosPolen[i];
        const bloco = html.slice(ini, fim);
        visto++;
        // ⚠️ NAO usar o indice no documento. Sao 4 <a>: dois cards x duas
        // variantes de breakpoint. Em 1440 os visiveis sao [0] e [1]; em 768 e
        // 390 sao [2] e [3]. A regra "indice 0 fica" salvou o card grande so no
        // desktop e trocou a foto dele nos outros dois. O que separa os dois
        // cards e o PARAGRAFO: o grande tem, o pequeno nao.
        const grande = bloco.indexOf('<p ') >= 0;
        if (grande) {
          // repara, caso uma passagem anterior tenha trocado o card grande
          if (bloco.indexOf(POLEN.para) < 0) continue;
          const volta = bloco.replace(/<img\b[^>]*>/g, tag => tag.indexOf(POLEN.para) < 0 ? tag
            : tag.split(POLEN.para).join('/melcam/img/card-polen.jpg')
                 .replace(/\salt="[^"]*"/, ' alt="Câmera Polen em detalhe"'));
          if (volta !== bloco) {
            html = html.slice(0, ini) + volta + html.slice(fim);
            total++;
            detalhe.push('Polen[' + i + '] (card grande): foto principal restaurada');
          }
          continue;
        }
        if (bloco.indexOf('/melcam/img/card-polen.jpg') < 0) continue;
        const saida = bloco
          .replace(/<img\b[^>]*>/g, tag => tag.indexOf('/melcam/img/card-polen.jpg') < 0 ? tag
            : tag.split('/melcam/img/card-polen.jpg').join(POLEN.para)
                 .replace(/\salt="[^"]*"/, ' alt="' + POLEN.alt + '"'));
        if (saida !== bloco) {
          html = html.slice(0, ini) + saida + html.slice(fim);
          total++;
          detalhe.push('Polen[' + i + ']: card vizinho repetia card-polen.jpg, trocado');
        }
      }
    }

    if (!total) { feito.push(nome + ': nada a trocar'); continue; }

    // Guardas: so pode ter mudado src/srcset/alt. Nada de estrutura.
    const conta = (s, t) => (s.match(new RegExp(t, 'g')) || []).length;
    const ok = ['<img\\b', '<a\\b', '<div\\b', '</div>', '<section\\b']
      .every(t => conta(antes, t) === conta(html, t));
    if (!ok) { feito.push(nome + ': guarda de estrutura falhou, NÃO gravado'); continue; }

    fs.writeFileSync(arq, html, 'utf8');
    feito.push(nome + ': ' + total + ' troca(s) — ' + detalhe.join(' · '));
  }

  return feito;
}

module.exports = { aplicar, REGRAS };

if (require.main === module) console.log(aplicar().join('\n'));
