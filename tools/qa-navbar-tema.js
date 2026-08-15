// QA da cor da navbar — 14/08/2026, régua trocada em 15/08/2026. Só lê.
//
//   node tools/qa-navbar-tema.js [largura]
//
// 🔴 A REGRA VIROU "UMA COR SÓ, CARVÃO" EM 15/08, por decisão do cliente.
// Este arquivo nasceu provando a inversão dinâmica que o PDF pedia, e a
// máquina dele continua útil — o que mudou é o que se cobra dela. As leituras
// (pixel atrás da barra, contraste dentro dela, contagem de trocas) são as
// mesmas; os vereditos foram invertidos onde precisavam ser. O texto original
// de cada checagem está preservado junto da nova, para o dia em que a inversão
// voltar: ver o cabeçalho do tema em tools/perfil.js.
//
// As afirmações que este arquivo prova hoje, e como:
//
//   1. A BARRA É CARVÃO EM QUALQUER POSIÇÃO DE QUALQUER ROTA. Não por classe e
//      não por página: a navbar fixa é escondida, a página é capturada, e o
//      pixel que estava EMBAIXO da barra é lido do PNG — inclusive sobre as
//      regiões que continuam marcadas como claras, que agora são inertes.
//      Junto: o controlador tem de estar mudo, sem escrever data-mel-nav.
//   2. O CONTRASTE DA BARRA NUNCA CAI. Marca, links e ícones contra o fundo da
//      própria barra, em todos os pontos de parada, nas sete rotas. Esta é a
//      checagem que sustenta a decisão: a barra tem fundo sólido, então o que
//      está atrás dela não participa da conta e nenhuma seção a torna ilegível.
//   3. NÃO TROCA DE COR. Rolagem lenta (de 40 em 40px), rápida e reversa:
//      o esperado é ZERO troca de tema, atravessando quantas regiões forem.
//   4. HISTERESE. Parado em cima de uma fronteira, tremendo ±6px: no máximo UMA
//      troca, e depois dela nenhuma. É o "não fique alternando em limites
//      específicos de scroll" do pedido.
//
//      ⚠️ ERA "ZERO TROCAS" ATÉ 14/08, e essa régua estava errada — corrigida
//      quando a grade da home virou região clara. O ponto de parada é a rolagem
//      em que a base da região cruza a MEIA-ALTURA da barra, e a histerese põe
//      os dois limiares a 18px de cada lado dela: ali os DOIS temas são
//      estáveis, e qual deles está posto depende de por onde se chegou. Chegando
//      pelo lado "errado", o primeiro tremor assenta no outro — e assentar uma
//      vez é a histerese funcionando, não faltando. O que reprova é oscilar.
//      Medido na home: escuro, e depois 24 leituras "claro" seguidas.
//   5. PRIMEIRO PAINT. Sem JavaScript nenhum, a barra já nasce com o tema da
//      região que está debaixo dela em scrollY 0.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { CDP, pegarJSON, esperarDevTools } = require('./cdp');
const { lerPNG, pixel, lum, contraste, cor } = require('./png');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const SAIDA = path.join(__dirname, 'shots-navbar-tema');
const BASE = process.env.BASE || 'http://localhost:3030';
const LARG = Number(process.argv[2]) || 1440;
const ALT = LARG < 810 ? 844 : 900;
const PORTA = 9423;
const ROTAS = ['/', '/polen', '/bee', '/acessorios', '/sobre', '/sacola', '/404'];
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
if (!fs.existsSync(SAIDA)) fs.mkdirSync(SAIDA, { recursive: true });

const PAPEL = [251, 247, 238];
const CARVAO = [34, 30, 23];

// COMO SE CLASSIFICA UM FUNDO — e por que não é por luminância.
//
// A primeira versão usava L > 0,5 e reprovava o hero da /bee: o plano de mel
// (#F2A900) mede L=0,473, meio ponto abaixo do corte, e seria chamado de fundo
// escuro. Ele não é: carvão sobre mel dá 8,25:1 e papel sobre mel dá 1,88:1.
// Ou seja, mel é um fundo CLARO para todo efeito prático — quem decide isso é
// a tinta que sobrevive nele, não onde ele cai numa escala.
//
// Então a régua é a mesma que a direção de arte usa: o fundo é claro quando
// tinta de carvão contrasta melhor que tinta de papel. E a resposta só conta
// como firme quando uma ganha da outra com folga (MARGEM); no meio-tom de uma
// fotografia as duas empatam, e ali não há resposta certa a cobrar — a barra é
// opaca e não tenta se fundir com foto.
const MARGEM = 1.6;
function classificar(rgb) {
  const comCarvao = contraste(CARVAO, rgb);
  const comPapel = contraste(PAPEL, rgb);
  const claro = comCarvao > comPapel;
  const razao = claro ? comCarvao / comPapel : comPapel / comCarvao;
  return { claro, firme: razao >= MARGEM, comCarvao, comPapel };
}

const SONDA = `(() => {
  const nav = document.querySelector('nav[data-framer-name^="Navigation"]');
  const cont = document.querySelector('.framer-1gfj5qd-container');
  const barra = cont || nav;
  const cs = (e) => e ? getComputedStyle(e) : null;
  const marca = document.querySelector('nav [data-framer-name="MELCAM"]');
  const link = document.querySelector('.mel-nav-link');
  const perfil = document.querySelector('.mel-perfil-bt');
  const risco = document.querySelector('[data-framer-name="Meniu"] [data-framer-name="1"]');
  const r = barra ? barra.getBoundingClientRect() : null;
  return {
    tema: document.documentElement.getAttribute('data-mel-nav'),
    fundo: cs(nav) && cs(nav).backgroundColor,
    fundoCont: cs(cont) && cs(cont).backgroundColor,
    marca: cs(marca) && cs(marca).color,
    link: cs(link) && cs(link).color,
    perfil: cs(perfil) && cs(perfil).color,
    risco: cs(risco) && cs(risco).backgroundColor,
    barraAltura: r ? Math.round(r.height) : 0,
    barraTopo: r ? Math.round(r.top) : 0,
    regioesClaras: document.querySelectorAll('[data-mel-tema="claro"]').length,
    scrollY: Math.round(scrollY),
    docH: document.documentElement.scrollHeight,
  };
})()`;

(async () => {
  const proc = spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
    '--no-default-browser-check', '--hide-scrollbars', '--mute-audio',
    '--remote-debugging-port=' + PORTA,
    '--user-data-dir=' + path.join(__dirname, 'edge-cdp-' + PORTA), 'about:blank',
  ], { stdio: 'ignore' });
  await esperarDevTools(PORTA);
  const alvos = await pegarJSON(PORTA, '/json/list');
  const c = await CDP.conectar(alvos.find((t) => t.type === 'page').webSocketDebuggerUrl);

  const erros = [];
  let rotaAtual = '/';
  c.ao('Runtime.exceptionThrown', (p) =>
    erros.push('exceção: ' + (p.exceptionDetails?.exception?.description || p.exceptionDetails?.text || '').slice(0, 140)));
  c.ao('Log.entryAdded', (p) => {
    if (p.entry.level !== 'error') return;
    /* A /404 responde HTTP 404 de propósito — é a página de erro, e servir 200
       nela seria o defeito. O navegador registra o status do próprio documento
       como erro de console, então esse é esperado e não conta. Qualquer outro
       conta, inclusive na /404. */
    if (rotaAtual === '/404' && /status of 404/.test(p.entry.text)) return;
    erros.push('[' + p.entry.source + '] ' + p.entry.text.slice(0, 140));
  });

  await c.enviar('Page.enable');
  await c.enviar('Runtime.enable');
  await c.enviar('Log.enable');
  await c.enviar('Emulation.setDeviceMetricsOverride', { width: LARG, height: ALT, deviceScaleFactor: 1, mobile: LARG < 810 });

  const ler = async (expr) => (await c.enviar('Runtime.evaluate', { expression: expr, returnByValue: true })).result.value;
  const sondar = () => ler(SONDA);

  // O fundo REAL debaixo da barra: esconde a barra fixa, captura, lê o pixel na
  // meia-altura dela em três colunas (esquerda, centro, direita) e devolve a
  // luminância mediana. Três colunas porque a barra atravessa a página inteira
  // e um hero pode ser claro de um lado e escuro do outro — a mediana é o que
  // descreve a faixa, e não um acidente de composição.
  async function fundoAtras(alturaBarra) {
    await ler(`(() => { const b = document.querySelector('.framer-1gfj5qd-container')
      || document.querySelector('nav[data-framer-name^="Navigation"]');
      if (b) { b.setAttribute('data-mel-qa-oculto',''); b.style.visibility='hidden'; } return 1; })()`);
    await dormir(140);
    const tiro = await c.enviar('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await ler(`(() => { const b = document.querySelector('[data-mel-qa-oculto]');
      if (b) { b.style.visibility=''; b.removeAttribute('data-mel-qa-oculto'); } return 1; })()`);
    const img = lerPNG(Buffer.from(tiro.data, 'base64'));
    const y = Math.min(img.alt - 2, Math.max(2, Math.round(alturaBarra / 2)));
    const xs = [6, Math.round(img.larg / 2), img.larg - 7];
    const ls = xs.map((x) => ({ x, c: pixel(img, x, y), L: lum(pixel(img, x, y)) }));
    const ord = ls.slice().sort((a, b) => a.L - b.L);
    return { y, amostras: ls, mediana: ord[1].L, cor: ord[1].c };
  }

  const p = [];
  const relato = [];

  for (const rota of ROTAS) {
    rotaAtual = rota;
    const carregou = new Promise((ok) => c.ao('Page.loadEventFired', ok));
    await c.enviar('Page.navigate', { url: BASE + rota });
    await Promise.race([carregou, dormir(30000)]);
    await dormir(1800);

    let v = await sondar();
    const linha = { rota, regioes: v.regioesClaras, paradas: [], trocas: null, jitter: null, semJS: null };

    // ---- pontos de parada: topo, e depois de 400 em 400px até o fim
    const paradas = [0];
    for (let y = 400; y < v.docH - ALT; y += 400) paradas.push(y);
    paradas.push(Math.max(0, v.docH - ALT - 2));

    for (const y of paradas.slice(0, 14)) {
      await ler(`scrollTo({top:${y},behavior:'instant'})`);
      await dormir(360);   // deixa a transição de 240ms fechar
      v = await sondar();
      const f = await fundoAtras(v.barraAltura || 81);
      const atras = classificar(f.cor);
      const barra = classificar(cor(v.fundo));
      const ct = contraste(cor(v.fundo), cor(v.marca || v.link || v.perfil || 'rgb(0,0,0)'));
      // A verdade do MECANISMO, lida do DOM e sem histerese: a barra está por
      // cima de uma região marcada como clara?
      const emRegiaoClara = await ler(`(() => {
        const claras = [].slice.call(document.querySelectorAll('[data-mel-tema="claro"]'));
        const b = document.querySelector('.framer-1gfj5qd-container');
        const meia = (b ? b.getBoundingClientRect().height || 81 : 81) / 2;
        return claras.some((e) => { const r = e.getBoundingClientRect();
          return r.top - 14 <= meia && r.bottom + 14 > meia; });
      })()`);

      linha.paradas.push({
        y, tema: v.tema, fundoAtras: 'rgb(' + f.cor.join(',') + ')',
        atrasClaro: atras.claro, atrasFirme: atras.firme, emRegiaoClara,
        barra: v.fundo, barraClara: barra.claro, contraste: +ct.toFixed(2),
      });

      // 1a — A REGRA MUDOU EM 15/08/2026: UMA COR SÓ, CARVÃO.
      // Até 14/08 esta checagem cobrava o inverso — região clara sob a barra
      // ⟺ barra clara. O cliente escolheu barra carvão em todo o site, então o
      // que se cobra agora é o oposto: a barra é ESCURA em qualquer posição de
      // qualquer rota, inclusive sobre as regiões que continuam marcadas como
      // claras (as marcas ficaram no HTML de propósito, inertes, como caminho
      // de volta — ver o cabeçalho do tema em tools/perfil.js).
      if (barra.claro) {
        p.push(rota + ' y' + y + ': a barra está CLARA — a regra desde 15/08 é carvão sempre');
      }
      // 1b — e o controlador tem de estar mudo: nenhum data-mel-nav no <html>.
      // Sem isto, uma volta acidental do controlador passaria despercebida
      // enquanto o CSS ainda não tivesse os tokens claros — a barra ficaria
      // certa por acidente, e voltaria a inverter no dia em que alguém
      // restaurasse o bloco de tokens.
      if (v.tema !== null) {
        p.push(rota + ' y' + y + ': o controlador escreveu data-mel-nav="' + v.tema +
          '" — ele deve estar desligado');
      }
      // 2 — contraste dentro da barra
      if (ct < 4.5) p.push(rota + ' y' + y + ': tinta da barra em ' + ct.toFixed(2) + ':1 sobre o fundo dela');
      // e as quatro tintas têm que andar juntas — uma sozinha é o defeito de
      // 13/08 (hambúrguer carvão sobre faixa carvão, invisível e clicável)
      for (const [nome, val] of [['marca', v.marca], ['link', v.link], ['perfil', v.perfil], ['hambúrguer', v.risco]]) {
        if (!val) continue;
        const cc = contraste(cor(v.fundo), cor(val));
        if (cc < 3) p.push(rota + ' y' + y + ': ' + nome + ' em ' + cc.toFixed(2) + ':1 — some contra a barra');
      }
    }

    // ---- 3 e 4: só onde existe o que trocar
    if (v.regioesClaras > 0) {
      // rolagem LENTA de 40 em 40, contando trocas de tema contra trocas de região
      const lento = await (async () => (await c.enviar('Runtime.evaluate', {
        awaitPromise: true, returnByValue: true,
        expression: `(async () => {
          const claras = [].slice.call(document.querySelectorAll('[data-mel-tema="claro"]'));
          const barra = document.querySelector('.framer-1gfj5qd-container');
          const meia = (barra.getBoundingClientRect().height || 81) / 2;
          let trocasTema = 0, trocasRegiao = 0;
          let tema = document.documentElement.getAttribute('data-mel-nav');
          let dentro = null;
          const fim = document.documentElement.scrollHeight - innerHeight;
          for (let y = 0; y <= fim; y += 40) {
            scrollTo({ top: y, behavior: 'instant' });
            await new Promise(r => requestAnimationFrame(r));
            await new Promise(r => requestAnimationFrame(r));
            const t = document.documentElement.getAttribute('data-mel-nav');
            if (t !== tema) { trocasTema++; tema = t; }
            // "região sob a barra", medida sem histerese nenhuma: é a verdade
            // geométrica contra a qual as trocas de tema são conferidas
            let d = null;
            for (const e of claras) { const r = e.getBoundingClientRect();
              if (r.top - 14 <= meia && r.bottom + 14 > meia) { d = e.id || e.className; break; } }
            const chave = d === null ? '(escuro)' : d;
            if (chave !== dentro) { trocasRegiao++; dentro = chave; }
          }
          return { trocasTema, trocasRegiao };
        })()`,
      })).result.value)();
      linha.trocas = lento;
      // O ESPERADO AGORA É ZERO, e não "uma por região". Com a barra em carvão
      // fixo, QUALQUER troca de tema numa rolagem lenta é regressão: significa
      // que o controlador voltou a escrever no <html>. A contagem de trocas de
      // região continua sendo lida e reportada porque é ela que dá o contexto —
      // atravessar 4 regiões e não trocar nenhuma vez é a prova de que o
      // desligamento vale onde ele importa, e não só onde não há o que trocar.
      if (lento.trocasTema > 0) {
        p.push(rota + ': ' + lento.trocasTema + ' troca(s) de tema na rolagem lenta, atravessando ' +
          lento.trocasRegiao + ' região(ões) — desde 15/08 o esperado é 0');
      }

      // rolagem RÁPIDA e REVERSA: o tema no fim tem que ser o mesmo que o da
      // parada equivalente, ou seja, a decisão não depende do caminho
      //
      // ⚠️ O ESPERADO NÃO É "claro", E ERA ASSIM ATÉ 14/08.
      // A régua antiga cobrava `noTopo === 'claro'`, o que só valia enquanto a
      // /bee era a única rota com região marcada — e a região dela começa em
      // scrollY 0. Assim que a grade da home virou região clara, a mesma régua
      // reprovou seis rotas por acertarem: na home a faixa amarela começa em
      // y1559, e no topo a barra está sobre o hero, que é escuro; nas internas
      // a grade herdada é display:none e não é região nenhuma.
      // O que este teste existe para provar é o que o comentário acima já diz:
      // A DECISÃO NÃO DEPENDE DO CAMINHO. Então o esperado é o tema medido no
      // topo SEM ter rolado, e a comparação é contra ele.
      const ida = await (async () => (await c.enviar('Runtime.evaluate', {
        awaitPromise: true, returnByValue: true,
        expression: `(async () => {
          scrollTo({top:0,behavior:'instant'});
          await new Promise(r=>setTimeout(r,400));
          const referencia = document.documentElement.getAttribute('data-mel-nav');
          const fim = document.documentElement.scrollHeight - innerHeight;
          for (let y = 0; y <= fim; y += 900) { scrollTo({top:y,behavior:'instant'});
            await new Promise(r=>setTimeout(r,60)); }
          await new Promise(r=>setTimeout(r,400));
          const noFim = document.documentElement.getAttribute('data-mel-nav');
          for (let y = fim; y >= 0; y -= 900) { scrollTo({top:y,behavior:'instant'});
            await new Promise(r=>setTimeout(r,60)); }
          await new Promise(r=>setTimeout(r,400));
          const noTopo = document.documentElement.getAttribute('data-mel-nav');
          return { referencia, noFim, noTopo };
        })()`,
      })).result.value)();
      linha.reverso = ida;
      if (ida.noTopo !== ida.referencia) {
        p.push(rota + ': depois de descer e voltar rápido, o topo ficou "' + ida.noTopo +
          '" — sem rolar ele é "' + ida.referencia + '", ou seja a decisão depende do caminho');
      }

      // 4 — histerese: parar em cima da fronteira e tremer
      const jitter = await (async () => (await c.enviar('Runtime.evaluate', {
        awaitPromise: true, returnByValue: true,
        expression: `(async () => {
          const claras = [].slice.call(document.querySelectorAll('[data-mel-tema="claro"]'));
          const ultima = claras[claras.length - 1];
          const barra = document.querySelector('.framer-1gfj5qd-container');
          const meia = (barra.getBoundingClientRect().height || 81) / 2;
          // rolagem em que a base da última região clara cruza a meia-altura
          const base = ultima.getBoundingClientRect().bottom + scrollY - meia;
          scrollTo({ top: Math.round(base), behavior: 'instant' });
          await new Promise(r => setTimeout(r, 300));
          let tema = document.documentElement.getAttribute('data-mel-nav');
          let trocas = 0;
          // depois da PRIMEIRA troca nada mais pode mudar: é essa contagem que
          // separa "assentou" de "está alternando".
          let depois = 0;
          for (let k = 0; k < 24; k++) {
            scrollTo({ top: Math.round(base) + (k % 2 ? 6 : -6), behavior: 'instant' });
            await new Promise(r => requestAnimationFrame(r));
            await new Promise(r => requestAnimationFrame(r));
            const t = document.documentElement.getAttribute('data-mel-nav');
            if (t !== tema) { trocas++; if (trocas > 1) depois++; tema = t; }
          }
          return { base: Math.round(base), trocas, depois };
        })()`,
      })).result.value)();
      linha.jitter = jitter;
      if (jitter.depois > 0) {
        p.push(rota + ': o tema ALTERNA tremendo ±6px em cima da fronteira (y' + jitter.base +
          ') — ' + jitter.trocas + ' trocas, ' + jitter.depois + ' delas depois de já ter assentado');
      }
    }

    // ---- 5: primeiro paint, sem JavaScript nenhum
    //
    // O QUE SE COBRA AQUI, e o que não faria sentido cobrar. Sem script não há
    // controlador, então quem responde é o padrão da página, que é CSS por
    // classe. A pergunta certa é: "a barra nasce com o tema da região que está
    // debaixo dela em scrollY 0?" — e essa região é fato de MARCAÇÃO, lido do
    // HTML estático, não do pixel embaixo da barra.
    //
    // Comparar com o pixel de baixo reprovava a home nas duas telas estreitas:
    // sem script o vídeo do hero não toca, fica o poster, e em 768 o pixel em
    // y120 cai numa parte clara da fotografia. A barra escura ali é o desenho
    // do site, não um erro de contraste.
    const abreClaro = await ler(`(() => {
      const claras = [].slice.call(document.querySelectorAll('[data-mel-tema="claro"]'));
      const b = document.querySelector('.framer-1gfj5qd-container');
      const meia = (b ? b.getBoundingClientRect().height || 81 : 81) / 2;
      scrollTo({ top: 0, behavior: 'instant' });
      return claras.some((e) => { const r = e.getBoundingClientRect();
        return r.top - 14 <= meia && r.bottom + 14 > meia; });
    })()`);
    await c.enviar('Emulation.setScriptExecutionDisabled', { value: true });
    const semJS = new Promise((ok) => c.ao('Page.loadEventFired', ok));
    await c.enviar('Page.navigate', { url: BASE + rota });
    await Promise.race([semJS, dormir(20000)]);
    await dormir(1200);
    {
      const tiro = await c.enviar('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      const img = lerPNG(Buffer.from(tiro.data, 'base64'));
      // a barra está lá, pintada: lê o pixel dentro dela e o de logo abaixo
      const naBarra = pixel(img, 6, 40);
      const barraClara = classificar(naBarra).claro;
      linha.semJS = { barra: 'rgb(' + naBarra.join(',') + ')', abreClaro, combina: barraClara === abreClaro };
      if (barraClara !== abreClaro) {
        p.push(rota + ': SEM JavaScript a barra nasce ' + (barraClara ? 'clara' : 'escura') +
          ' e a região em scrollY 0 ' + (abreClaro ? 'é marcada como clara' : 'não é clara'));
      }
      fs.writeFileSync(path.join(SAIDA, 'semjs-' + rota.replace(/\//g, '') + '-' + LARG + '.png'),
        Buffer.from(tiro.data, 'base64'));
    }
    await c.enviar('Emulation.setScriptExecutionDisabled', { value: false });

    relato.push(linha);
  }
  if (erros.length) p.push(erros.length + ' erro(s) de console');

  // ------------------------------------------------------------- relatório
  console.log('== navbar · tema por região · ' + LARG + 'x' + ALT + ' ==');
  for (const l of relato) {
    console.log('  ' + l.rota.padEnd(12) + l.regioes + ' região(ões) clara(s)' +
      (l.trocas ? '  · rolagem lenta: ' + l.trocas.trocasTema + ' trocas de tema / ' +
        l.trocas.trocasRegiao + ' de região' : '') +
      (l.jitter ? '  · jitter na fronteira y' + l.jitter.base + ': ' + l.jitter.trocas +
        ' troca(s), ' + l.jitter.depois + ' depois de assentar' : '') +
      (l.reverso ? '  · rápido+reverso: fim ' + l.reverso.noFim + ', topo ' + l.reverso.noTopo +
        ' (sem rolar: ' + l.reverso.referencia + ')' : ''));
    for (const s of l.paradas) {
      console.log('     y' + String(s.y).padEnd(6) + 'tema ' + String(s.tema).padEnd(7) +
        ' barra ' + s.barra.padEnd(20) + (s.barraClara ? 'clara ' : 'escura') +
        ' · atrás ' + s.fundoAtras.padEnd(18) + (s.atrasClaro ? 'claro ' : 'escuro') +
        (s.atrasFirme ? '     ' : '(meio)') +
        ' · região clara: ' + (s.emRegiaoClara ? 'sim' : 'não') +
        ' · tinta ' + s.contraste + ':1');
    }
    if (l.semJS) console.log('     sem JS: barra ' + l.semJS.barra +
      ' · região em y0 ' + (l.semJS.abreClaro ? 'clara' : 'escura') +
      ' · ' + (l.semJS.combina ? 'combina' : 'TROCADO'));
  }
  console.log(p.length ? '\nX  ' + p.join('\n   ') : '\n[OK]  navbar · tema · ' + LARG);

  fs.writeFileSync(path.join(SAIDA, 'qa-navbar-tema-' + LARG + '.json'),
    JSON.stringify({ largura: LARG, relato, problemas: p, erros: [...new Set(erros)] }, null, 2));
  c.fechar(); proc.kill();
  process.exit(p.length ? 1 : 0);
})().catch((e) => { console.error('FALHOU:', e.message); process.exit(1); });
