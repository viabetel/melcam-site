// Reestrutura o rodapé nos HTML já construídos — 14/08/2026.
//
//   node tools/rodape.js [--conferir]
//
// POR QUE ISTO É UMA FERRAMENTA DE PÓS-PROCESSO, e não conteúdo gerado.
// O rodapé é DOM do template Framer: ele viaja dentro do index.html e de todas
// as páginas que nascem como cópia dele. Quem escrevia os textos dele era o
// tools/aplicar.js, e aplicar.js não pode rodar (ver AGENTS.md). Então a
// correção segue a mesma disciplina do tools/rotas.js: abre cada HTML, mexe
// só no que precisa mudar, com fronteira verificada, e é idempotente —
// rodar duas vezes dá o mesmo arquivo.
//
// O QUE ESTAVA ERRADO, medido no navegador antes de escrever uma linha:
//
//   coluna "Produtos"      Home · Sobre Nós · Sobre Nós
//     Nenhum produto. "Sobre Nós" DUAS VEZES, as duas apontando para /sobre.
//     A coluna que deveria levar a Bee, a Polen e os Acessórios não levava a
//     nenhum deles — e são as três páginas que o site existe para vender.
//   coluna "Institucional" Privacidade · Termos · 404
//     "404" é a página de erro. Ela não é destino de ninguém; estava ali
//     porque o template tinha um link para ./404 e o mapa de rotas o traduziu.
//   coluna "Ajuda"         Fale conosco · Rastrear pedido · FAQ
//     Faltava "Trocas e devoluções", que o pedido do cliente nomeia.
//   seis ícones de rede    href="#" target="_blank"
//     Link que não leva a lugar nenhum e ainda abre aba. As redes estão em
//     PENDENTES do melcam.config.json: não existe perfil confirmado.
//   "Melcam LTDA"          href="#" target="_blank"
//     Mesma coisa, na linha de copyright.
//
// O QUE ESTA FERRAMENTA NÃO FAZ, de propósito: não publica CNPJ, endereço nem
// WhatsApp. Os três continuam em PENDENTES e inventá-los seria dado cadastral
// falso num rodapé — o lugar do site onde dado falso custa mais caro.
const fs = require('fs');
const path = require('path');

const SITE = path.resolve(__dirname, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(SITE, 'melcam.config.json'), 'utf8'));

// A ORDEM DENTRO DE CADA COLUNA É A ORDEM DA TELA.
// "Section Conpany" é o nome do template, com o erro de digitação e tudo: é o
// atributo real do export e trocá-lo quebraria a busca.
const COLUNAS = [
  ['Section Produtos', 'Produtos', [
    ['Bee', '/bee'],
    ['Polen', '/polen'],
    ['Acessórios', '/acessorios'],
  ]],
  ['Section Conpany', 'Ajuda', [
    ['Rastrear pedido', '/sobre#rastreio'],
    ['Trocas e devoluções', '/termos#trocas'],
    ['Fale conosco', '/sobre#contato'],
    // A FAQ não saiu para dar lugar às trocas: a coluna ganhou uma quarta
    // linha. Ela é flex column com gap:20px e height:min-content (medido na
    // folha do template, .framer-1lverrc), então item novo só empilha — não há
    // grade fixa para estourar.
    //
    // O rótulo continua "FAQ", que é o que estava lá. "Perguntas frequentes"
    // foi tentado e medido: 158px de texto numa coluna cuja largura é
    // min-content de 146px, ou seja, a linha nova passava a mandar na largura
    // da coluna inteira e invadia a calha da coluna vizinha. Rótulo curto num
    // rodapé de quatro colunas não é economia de espaço, é o que faz as
    // colunas continuarem alinhadas.
    ['FAQ', '/polen#faq'],
  ]],
  ['Section Institucional', 'Institucional', [
    ['Sobre Nós', '/sobre'],
    ['Privacidade', '/privacidade'],
    ['Termos', '/termos'],
  ]],
];

// A tipografia do rodapé vem de presets do Framer. Reaproveitar as mesmas
// classes é o que faz a linha nova ser indistinguível das que já estavam lá.
const PRESET_P = 'framer-text framer-styles-preset-ik3gr0" data-styles-preset="vuFHPY4co';
const PRESET_A = 'framer-text framer-styles-preset-uvp883" data-styles-preset="T1MEnmGz0';
const TEXTO_ITEM = '--framer-text-color:var(--extracted-r6o4lv, var(--token-ee01c93a-c94e-42a3-8ebf-3f7c78c2647a, rgb(105, 105, 105)))';

// 🔴 O LAYOUT DA LINHA NOVA É EXPLÍCITO, E NÃO É EXCESSO DE ZELO.
// Medido na primeira tentativa: a linha acrescentada saiu com
// position:absolute e top:51px, sobrepondo as vizinhas. A causa é uma regra
// genérica do template para [data-framer-component-type="RichTextContainer"] —
// no Framer todo RichTextContainer nasce posicionado, e quem o devolve ao fluxo
// é a classe hasheada (.framer-67ctnt e irmãs), que só existe para as linhas
// que vieram do export. Uma linha nova não tem hash e cai na regra genérica.
//
// A saída não é reaproveitar um hash alheio: hash é identidade de nó do export,
// e duplicá-lo é armadilha para a próxima ferramenta que buscar por ele. A
// linha nova declara o próprio layout, copiado do que as irmãs computam:
// relative, fora de qualquer canto, flex item que não cresce nem encolhe.
const ESTILO_ITEM = 'position:relative;top:auto;left:auto;right:auto;bottom:auto;'
  + 'flex:0 0 auto;width:max-content;height:min-content;transform:none;'
  + '--extracted-r6o4lv:var(--token-ee01c93a-c94e-42a3-8ebf-3f7c78c2647a, rgb(105, 105, 105))';

const escapar = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Fim do <div> que abre em `abre`, contando profundidade. Mesma técnica do
// fimDoStack() em tools/paginas.js: regex sozinha não fecha aninhamento.
function fimDoDiv(html, abre) {
  const re = /<(\/?)div\b[^>]*>/g;
  re.lastIndex = abre;
  let prof = 0, t;
  while ((t = re.exec(html))) {
    prof += t[1] ? -1 : 1;
    if (prof === 0) return t.index;
  }
  return -1;
}

function linhaNova(rotulo, href) {
  return '<div class="mel-rodape-item" data-framer-component-type="RichTextContainer" style="' + ESTILO_ITEM + '">'
    + '<p class="' + PRESET_P + '" style="' + TEXTO_ITEM + '">'
    + '<!--$--><a class="' + PRESET_A + '" href="' + escapar(href) + '">' + escapar(rotulo) + '</a><!--/$-->'
    + '</p></div>';
}

// A rota que o arquivo serve, para o aria-current do rodapé.
function rotaDe(rel) {
  return '/' + rel.replace(/\\/g, '/').replace(/index\.html$/, '').replace(/\.html$/, '');
}

// Todos os índices em que `marca` aparece. 🔴 SÃO TRÊS RODAPÉS, um por
// variante de breakpoint (os <div class="ssr-variant">), e só o do breakpoint
// ativo renderiza. Tratar apenas o primeiro corrigiria o desktop e deixaria
// tablet e celular com a coluna velha — a mesma armadilha das duas <nav> e dos
// três <footer> já registrada em tools/paginas.js. Por isso tudo aqui é feito
// em TODAS as ocorrências, e de trás para frente: assim os índices das
// anteriores não se deslocam enquanto se reescreve.
function todosOsIndices(s, marca) {
  const ns = [];
  for (let i = s.indexOf(marca); i >= 0; i = s.indexOf(marca, i + 1)) ns.push(i);
  return ns;
}

function tratar(html, rota) {
  const notas = [];
  let s = html;

  // IDEMPOTÊNCIA DE VERDADE, e uma armadilha que já mordeu.
  // As linhas acrescentadas por esta ferramenta são reescritas no laço abaixo
  // pelo TEXTO e pelo href — mas o laço não encosta no atributo style delas,
  // porque na segunda passada elas já são "linha existente". Resultado medido:
  // corrigir ESTILO_ITEM não corrigia nada, o arquivo continuava com o estilo
  // da passada anterior e a linha seguia em position:absolute por cima das
  // vizinhas. Então o estilo das linhas próprias é normalizado ANTES de tudo,
  // toda vez.
  s = s.replace(/(<div class="mel-rodape-item"[^>]*?)\sstyle="[^"]*"/g, '$1 style="' + ESTILO_ITEM + '"');

  for (const [nome, titulo, itens] of COLUNAS) {
    const marca = 'data-framer-name="' + nome + '"';
    const ocorrencias = todosOsIndices(s, marca);
    if (!ocorrencias.length) { notas.push('coluna "' + nome + '" não encontrada'); continue; }
    for (const iMarca of ocorrencias.reverse()) {
    const abre = s.lastIndexOf('<div', iMarca);
    const fecha = fimDoDiv(s, abre);
    if (fecha < 0) { notas.push('coluna "' + nome + '" sem </div> equilibrado'); continue; }

    let bloco = s.slice(abre, fecha);
    const ancoras = bloco.match(/<a\b[^>]*>[\s\S]*?<\/a>/g) || [];
    if (ancoras.length < 3) { notas.push('coluna "' + nome + '": só ' + ancoras.length + ' link(s) — bloco errado?'); continue; }

    // 1. o título da coluna: é o primeiro <p> do bloco, e ele não tem <a>.
    let feitoTitulo = false;
    bloco = bloco.replace(/(<p\b[^>]*>)([\s\S]*?)(<\/p>)/, (m, a, meio, z) => {
      if (feitoTitulo || /<a\b/.test(meio)) return m;
      feitoTitulo = true;
      return a + escapar(titulo) + z;
    });

    // 2. os links que já existem, na ordem, um por vez.
    let k = 0;
    bloco = bloco.replace(/<a\b[^>]*>[\s\S]*?<\/a>/g, () => {
      const item = itens[k++];
      if (!item) return '';   // sobrou linha: esvazia o <a>, o <div> fica vazio
      const atual = item[1] === rota ? ' aria-current="page"' : '';
      return '<a class="' + PRESET_A + '" href="' + escapar(item[1]) + '"' + atual + '>' + escapar(item[0]) + '</a>';
    });

    // 3. e os que faltam entram como linhas novas, antes do fim da coluna.
    if (k < itens.length) {
      const extras = itens.slice(k).map(([r, h]) => {
        const atual = h === rota ? ' aria-current="page"' : '';
        return linhaNova(r, h).replace('href="' + escapar(h) + '"', 'href="' + escapar(h) + '"' + atual);
      }).join('');
      bloco = bloco + extras;
    }

    s = s.slice(0, abre) + bloco + s.slice(fecha);
    }
  }

  // 4. OS ÍCONES DE REDE PARAM DE PROMETER.
  // Continuam desenhados — a marca tem redes, só não temos os endereços
  // confirmados. O que sai é a promessa: sem href não há link, o elemento sai
  // da ordem de tabulação e o leitor de tela deixa de anunciá-lo como destino.
  // Quando os perfis chegarem, é trocar aqui e rodar de novo.
  {
    const ocorrencias = todosOsIndices(s, 'data-framer-name="Social Media Icon"');
    if (!ocorrencias.length) notas.push('bloco de redes sociais não encontrado');
    for (const iSocial of ocorrencias.reverse()) {
      const abre = s.lastIndexOf('<div', iSocial);
      const fecha = fimDoDiv(s, abre);
      if (fecha < 0) notas.push('bloco de redes sem </div> equilibrado');
      else {
        let bloco = s.slice(abre, fecha);
        bloco = bloco.replace(/<a\b([^>]*)>/g, (m, at) => {
          let novo = at
            .replace(/\s*href="[^"]*"/g, '')
            .replace(/\s*target="[^"]*"/g, '')
            .replace(/\s*rel="[^"]*"/g, '')
            .replace(/\s*aria-hidden="[^"]*"/g, '')
            .replace(/\s*data-mel-pendente="[^"]*"/g, '');
          return '<a' + novo + ' aria-hidden="true" data-mel-pendente="rede-social">';
        });
        s = s.slice(0, abre) + bloco + s.slice(fecha);
      }
    }
  }

  // 5. A RAZÃO SOCIAL VIRA TEXTO. Era <a href="#" target="_blank">, ou seja,
  // um link que abre aba nova para lugar nenhum na linha de copyright.
  {
    const razao = cfg.footer.razaoSocial;
    const re = new RegExp('<a\\b[^>]*>(' + razao.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')</a>', 'g');
    const antes = s;
    s = s.replace(re, '$1');
    if (s === antes && !s.includes(razao)) notas.push('razão social não encontrada no rodapé');
  }

  return { s, notas };
}

function aplicar() {
  const arquivos = fs.readdirSync(SITE).filter((f) => /\.html$/i.test(f));
  const conferir = process.argv.includes('--conferir');
  const relato = [];
  let falhas = 0;

  for (const f of arquivos) {
    const alvo = path.join(SITE, f);
    const antes = fs.readFileSync(alvo, 'utf8');
    // As cascas vazias do template (privacy-policy, terms-and-conditions,
    // contact, faq) não têm rodapé no HTML: o conteúdo delas seria hidratado
    // pelo React, que está desligado. Não é erro desta ferramenta.
    if (!antes.includes('data-framer-name="Section Produtos"')) {
      relato.push({ f, pulou: 'sem rodapé no HTML (casca do template)' });
      continue;
    }
    const { s, notas } = tratar(antes, rotaDe(f));
    if (notas.length) { falhas++; relato.push({ f, notas }); continue; }

    // Guardas antes de gravar: o documento continua equilibrado e os links
    // que deveriam existir existem.
    const div1 = (s.match(/<div\b/g) || []).length, div2 = (s.match(/<\/div>/g) || []).length;
    const divA = (antes.match(/<div\b/g) || []).length, divB = (antes.match(/<\/div>/g) || []).length;
    if (div1 - div2 !== divA - divB) {
      falhas++; relato.push({ f, notas: ['divs desequilibrados: ' + div1 + '/' + div2 + ' (antes ' + divA + '/' + divB + ')'] });
      continue;
    }
    for (const [, , itens] of COLUNAS) {
      for (const [rotulo, href] of itens) {
        if (!s.includes('href="' + href + '"')) {
          falhas++; relato.push({ f, notas: ['link "' + rotulo + '" -> ' + href + ' não ficou no arquivo'] });
        }
      }
    }
    // Toda linha própria tem que carregar o layout explícito. Sem isto ela cai
    // na regra genérica de RichTextContainer do template e sai posicionada.
    for (const m of s.match(/<div class="mel-rodape-item"[^>]*>/g) || []) {
      if (!/position:relative/.test(m)) {
        falhas++; relato.push({ f, notas: ['linha própria sem position:relative — vai sair absoluta'] });
        break;
      }
    }
    if (/href="#"/.test(s.slice(s.indexOf('data-framer-name="Section Info"')))) {
      // sobrou algum href="#" na metade de baixo: é o sintoma do link falso
      relato.push({ f, aviso: 'ainda há href="#" depois do início do rodapé' });
    }

    if (!conferir && s !== antes) fs.writeFileSync(alvo, s, 'utf8');
    relato.push({ f, mudou: s !== antes, de: antes.length, para: s.length });
  }
  return { relato, falhas, conferir };
}

if (require.main === module) {
  const { relato, falhas, conferir } = aplicar();
  for (const r of relato) {
    if (r.pulou) console.log('  --  ' + r.f.padEnd(28) + r.pulou);
    else if (r.notas) console.log('  X   ' + r.f.padEnd(28) + r.notas.join(' · '));
    else console.log('  ok  ' + r.f.padEnd(28) + (r.mudou ? r.de + ' -> ' + r.para : 'já estava certo') +
      (r.aviso ? '   (' + r.aviso + ')' : ''));
  }
  console.log(falhas ? '\nREPROVADO: ' + falhas + ' arquivo(s) com problema.'
    : '\nrodapé ' + (conferir ? 'conferido' : 'reestruturado') + ' em ' + relato.filter((r) => !r.pulou).length + ' página(s).');
  process.exit(falhas ? 1 : 0);
}

module.exports = { aplicar, COLUNAS };
