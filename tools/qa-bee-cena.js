// QA da cena da /bee — 14/08/2026. Só lê.
//
//   node tools/qa-bee-cena.js [url] [largura]
//
// Cobre as quatro coisas pedidas na passada de 14/08 à noite, e cobre a que é
// difícil: a CONTINUIDADE DO GRADIENTE. Continuidade não se confere no olho —
// uma emenda de 2 ou 3 unidades por canal é invisível numa captura reduzida e
// salta numa tela boa. Então este arquivo LÊ O PIXEL: captura a página inteira,
// decodifica o PNG na mão (zlib do Node, sem dependência) e desce uma coluna de
// amostras pela margem esquerda, onde só existe fundo.
//
// O que ele prova:
//   1. A FRASE SAIU. "Duas cores. Uma companheira." e o eyebrow "escolha sua
//      Bee" não estão em lugar nenhum do documento, e nada de vazio ficou no
//      lugar deles: a primeira Bee Cam encosta no hero com o respiro medido.
//   2. O GRADIENTE É UM SÓ. Sobe do hero, atravessa a primeira Bee Cam, chega
//      ao pico na costura entre as duas e volta ao papel depois da segunda.
//      Sem degrau nas fronteiras, sem faixa, sem mancha.
//   3. OS TÍTULOS SÃO PLACAS, E NÃO SÃO BOTÕES. Amarelo sobre carvão, contraste
//      medido, <h2> na hierarquia certa, e nada de href, tabindex, cursor de
//      mão, hover ou foco.
//   4. A REVELAÇÃO É DE IDA SÓ. Testada com rolagem lenta, rápida e reversa:
//      todo alvo termina revelado e nenhum volta atrás.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { CDP, pegarJSON, esperarDevTools } = require('./cdp');
// O leitor de PNG saiu daqui em 14/08 e virou tools/png.js: o QA do tema da
// navbar precisa da mesma leitura de pixel, e duas cópias de um decodificador
// é o começo de duas verdades.
const { lerPNG, pixel, contraste, cor, perto } = require('./png');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const SAIDA = path.join(__dirname, 'shots-bee-cena');
const URL = process.argv[2] || 'http://localhost:3030/bee';
const LARG = Number(process.argv[3]) || 1440;
const PORTA = 9421;
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
if (!fs.existsSync(SAIDA)) fs.mkdirSync(SAIDA, { recursive: true });

const PAPEL = [251, 247, 238];
const CARVAO = [34, 30, 23];
const MEL = [242, 169, 0];

// ------------------------------------------------------------------- sondas
const SONDA_GEO = `(() => {
  const r = (e) => { if (!e) return null; const b = e.getBoundingClientRect();
    return { y: Math.round(b.top + scrollY), h: Math.round(b.height),
             x: Math.round(b.left), w: Math.round(b.width) }; };
  const hero = document.querySelector('.mel-bh');
  const s1 = document.getElementById('modelos');
  const s2 = document.getElementById('bee-branca');
  const palcos = [].slice.call(document.querySelectorAll('.mel-bee-mod-palco'));
  const dest = document.getElementById('destaques');
  const nomes = [].slice.call(document.querySelectorAll('.mel-bee-mod-nome'));
  const cs = (e) => getComputedStyle(e);

  return {
    texto: document.body.innerText.replace(/\\s+/g, ' '),
    hero: r(hero), s1: r(s1), s2: r(s2), dest: r(dest),
    palcos: palcos.map(r),
    // 1 — a frase e o vão que ela deixaria
    topoRestante: document.querySelectorAll('.mel-bee-mod .mel-sec-topo').length,
    vaoHeroPalco: (hero && palcos[0])
      ? Math.round(palcos[0].getBoundingClientRect().top + scrollY
                   - (hero.getBoundingClientRect().top + scrollY + hero.getBoundingClientRect().height)) : null,
    // 3 — as placas
    placas: nomes.map((n) => ({
      tag: n.tagName,
      id: n.id,
      txt: n.textContent.trim(),
      cor: cs(n).color,
      fundo: cs(n).backgroundColor,
      cursor: cs(n).cursor,
      raio: cs(n).borderTopLeftRadius,
      padding: cs(n).paddingTop + ' ' + cs(n).paddingLeft,
      largura: Math.round(n.getBoundingClientRect().width),
      colunaLargura: Math.round(n.parentElement.getBoundingClientRect().width),
      // Nada disso pode existir num título.
      interativo: !!(n.getAttribute('href') || n.hasAttribute('tabindex') ||
                     n.hasAttribute('role') || n.querySelector('a,button')),
      focavel: n.matches(':is(a,button,[tabindex])'),
    })),
    // hierarquia: só um h1, e nenhum salto de nível
    cabecalhos: [].slice.call(document.querySelectorAll('h1,h2,h3,h4,h5,h6'))
      .filter((h) => h.offsetParent !== null || cs(h).position === 'fixed')
      .map((h) => Number(h.tagName.slice(1))),
    // a âncora do CTA do hero continua de pé
    ctaHero: (() => { const a = document.querySelector('[data-mel="bee-hero-cta"]');
      return a ? { txt: a.textContent.trim(), href: a.getAttribute('href'),
                   alvo: !!document.getElementById((a.getAttribute('href') || '').replace('#', '')) } : null; })(),
    rotulos: [
      document.getElementById('modelos').getAttribute('aria-labelledby'),
      document.getElementById('bee-branca').getAttribute('aria-labelledby'),
    ],
    rotulosExistem: [
      !!document.getElementById(document.getElementById('modelos').getAttribute('aria-labelledby')),
      !!document.getElementById(document.getElementById('bee-branca').getAttribute('aria-labelledby')),
    ],
    marca: document.documentElement.classList.contains('mel-bee-rev'),
    alvos: document.querySelectorAll('[data-mel-rev]').length,
    overflowH: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    docH: document.documentElement.scrollHeight,
  };
})()`;

// Estado da revelação: quantos alvos já foram vistos, e nenhum destravado.
const SONDA_REV = `(() => {
  const t = [].slice.call(document.querySelectorAll('[data-mel-rev]'));
  return {
    total: t.length,
    vistos: t.filter((e) => e.hasAttribute('data-mel-visto')).length,
    // Opacidade abaixo de 1 num alvo já visto seria transição em curso; acima
    // de 0 num não visto seria estado inicial que não pegou.
    invisiveis: t.filter((e) => !e.hasAttribute('data-mel-visto'))
                 .map((e) => e.getAttribute('data-mel-rev')),
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
  c.ao('Runtime.exceptionThrown', (p) =>
    erros.push('exceção: ' + (p.exceptionDetails?.exception?.description || p.exceptionDetails?.text || '').slice(0, 160)));
  c.ao('Log.entryAdded', (p) => { if (p.entry.level === 'error') erros.push('[' + p.entry.source + '] ' + p.entry.text.slice(0, 160)); });

  await c.enviar('Page.enable');
  await c.enviar('Runtime.enable');
  await c.enviar('Log.enable');

  const p = [];
  const janela = LARG < 810 ? 844 : 900;
  await c.enviar('Emulation.setDeviceMetricsOverride', {
    width: LARG, height: janela, deviceScaleFactor: 1, mobile: LARG < 810,
  });
  const carregou = new Promise((ok) => c.ao('Page.loadEventFired', ok));
  await c.enviar('Page.navigate', { url: URL });
  await Promise.race([carregou, dormir(30000)]);
  await dormir(2200);

  // ---------------------------------------------------- 4. a revelação
  // Rolagem LENTA na descida, RÁPIDA na volta ao fim, e REVERSA até o topo.
  // O que se procura é qualquer alvo que perca o "visto" no caminho.
  const rolar = async (expr) => (await c.enviar('Runtime.evaluate', {
    expression: expr, awaitPromise: true, returnByValue: true,
  })).result.value;

  const noMeio = await rolar(`(async()=>{
    const alvo = document.getElementById('bee-branca');
    const fim = alvo.getBoundingClientRect().top + scrollY;
    let perdidos = 0;
    const marcados = new Set();
    for (let y = 0; y <= fim; y += 120) {
      scrollTo({ top: y, behavior: 'instant' });
      await new Promise(r => setTimeout(r, 90));
      document.querySelectorAll('[data-mel-rev]').forEach((e, i) => {
        if (e.hasAttribute('data-mel-visto')) marcados.add(i);
        else if (marcados.has(i)) perdidos++;
      });
    }
    return { perdidos, marcados: marcados.size };
  })()`);
  if (noMeio.perdidos) p.push('rolagem lenta: ' + noMeio.perdidos + ' revelação(ões) voltaram ao estado escondido');

  const rapido = await rolar(`(async()=>{
    let perdidos = 0; const marcados = new Set();
    const passo = (y) => { scrollTo({ top: y, behavior: 'instant' }); };
    const olhar = () => document.querySelectorAll('[data-mel-rev]').forEach((e, i) => {
      if (e.hasAttribute('data-mel-visto')) marcados.add(i);
      else if (marcados.has(i)) perdidos++;
    });
    // rápida até o fim
    for (let y = 0; y <= document.body.scrollHeight; y += 900) { passo(y); await new Promise(r=>setTimeout(r,40)); olhar(); }
    await new Promise(r=>setTimeout(r,700)); olhar();
    // reversa até o topo
    for (let y = document.body.scrollHeight; y >= 0; y -= 260) { passo(y); await new Promise(r=>setTimeout(r,60)); olhar(); }
    await new Promise(r=>setTimeout(r,700)); olhar();
    // e mais uma ida e volta curta em cima do limite da viewport, que é onde o
    // liga-desliga aparece quando falta o unobserve
    const alvo = document.querySelector('.mel-bee-mod-palco');
    const base = alvo.getBoundingClientRect().top + scrollY - innerHeight + 40;
    for (let k = 0; k < 12; k++) { passo(base + (k % 2 ? 14 : -14)); await new Promise(r=>setTimeout(r,60)); olhar(); }
    return { perdidos, marcados: marcados.size };
  })()`);
  if (rapido.perdidos) p.push('rolagem rápida/reversa: ' + rapido.perdidos + ' revelação(ões) voltaram ao estado escondido');

  await rolar(`(async()=>{ scrollTo({top:document.body.scrollHeight,behavior:'instant'});
    await new Promise(r=>setTimeout(r,900)); scrollTo({top:0,behavior:'instant'});
    await new Promise(r=>setTimeout(r,900)); })()`);

  const rev = (await c.enviar('Runtime.evaluate', { expression: SONDA_REV, returnByValue: true })).result.value;
  if (rev.total < 10) p.push('só ' + rev.total + ' alvos de revelação (esperado 10 ou mais)');
  if (rev.vistos !== rev.total) {
    p.push('depois de percorrer a página inteira, ' + (rev.total - rev.vistos) +
      ' alvo(s) continuam escondidos: ' + rev.invisiveis.join(', '));
  }

  const g = (await c.enviar('Runtime.evaluate', { expression: SONDA_GEO, returnByValue: true })).result.value;

  // ------------------------------------------- 4b. o fallback SEM JavaScript
  // Não se testa desligando o motor de script: a página inteira depende de JS
  // para outras coisas, e o que precisa de prova aqui é só uma. A única coisa
  // que o JavaScript faz pela revelação antes do primeiro paint é escrever
  // html.mel-bee-rev; sem script, essa classe simplesmente não existe. Então
  // tirar a classe E os "visto" reproduz exatamente o estado de quem abriu a
  // página com o script bloqueado. Se sobrar um só elemento transparente ou
  // deslocado aqui, é conteúdo perdido em silêncio.
  const semJS = (await c.enviar('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const raiz = document.documentElement;
      raiz.classList.remove('mel-bee-rev');
      const t = [].slice.call(document.querySelectorAll('[data-mel-rev],[data-mel-rev-passo],[data-mel-rev-fade]'));
      t.forEach((e) => e.removeAttribute('data-mel-visto'));
      const ruins = t.filter((e) => {
        const s = getComputedStyle(e);
        return Number(s.opacity) < 0.99 || (s.transform !== 'none' && s.transform !== 'matrix(1, 0, 0, 1, 0, 0)');
      }).map((e) => e.className || e.tagName);
      const r = { total: t.length, ruins };
      raiz.classList.add('mel-bee-rev');
      t.forEach((e) => e.setAttribute('data-mel-visto', ''));
      return r;
    })()`,
  })).result.value;
  if (semJS.ruins.length) {
    p.push('sem JavaScript, ' + semJS.ruins.length + ' elemento(s) ficam invisíveis ou deslocados: ' +
      semJS.ruins.slice(0, 4).join(', '));
  }

  // ------------------------------- 4c. prefers-reduced-motion, do zero
  // Recarrega com a preferência ligada: tudo tem que aparecer imediatamente,
  // no lugar final, sem esperar rolagem e sem um quadro sequer deslocado.
  await c.enviar('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  });
  const recarregou = new Promise((ok) => c.ao('Page.loadEventFired', ok));
  await c.enviar('Page.navigate', { url: URL });
  await Promise.race([recarregou, dormir(30000)]);
  await dormir(1800);
  const reduzido = (await c.enviar('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const t = [].slice.call(document.querySelectorAll('[data-mel-rev],[data-mel-rev-passo],[data-mel-rev-fade]'));
      const ruins = t.filter((e) => {
        const s = getComputedStyle(e);
        return Number(s.opacity) < 0.99 ||
               (s.transform !== 'none' && s.transform !== 'matrix(1, 0, 0, 1, 0, 0)') ||
               // "instantâneo" e não "0s": sob reduced-motion o próprio Chrome
               // reescreve transition-duration para 1e-05s em TUDO na página.
               // Medir contra 0 reprovaria por causa do navegador, não do CSS.
               // O que prova que a regra pegou é transition-property: none.
               s.transitionDuration.split(',').some((d) => parseFloat(d) > 0.05);
      }).map((e) => (e.className || e.tagName) + ' [' + getComputedStyle(e).opacity + ' / ' +
                    getComputedStyle(e).transform + ' / ' + getComputedStyle(e).transitionDuration + ']');
      return {
        total: t.length, ruins,
        // Só os OBSERVADOS entram nesta conta: os filhos em passo e o CTA nunca
        // recebem data-mel-visto — quem o recebe é o grupo em volta deles.
        semRolar: [].slice.call(document.querySelectorAll('[data-mel-rev]'))
                    .filter((e) => !e.hasAttribute('data-mel-visto')).length,
        observados: document.querySelectorAll('[data-mel-rev]').length,
      };
    })()`,
  })).result.value;
  if (reduzido.ruins.length) {
    p.push('com prefers-reduced-motion, ' + reduzido.ruins.length +
      ' elemento(s) ainda escondidos, deslocados ou com transição: ' + reduzido.ruins.slice(0, 3).join(' · '));
  }
  if (reduzido.semRolar) {
    p.push('com prefers-reduced-motion, ' + reduzido.semRolar + ' alvo(s) esperam rolagem para serem marcados');
  }
  await c.enviar('Emulation.setEmulatedMedia', { features: [] });

  // -------------------------------------- 4d. nada pisca no carregamento
  // O risco que o pedido nomeia: um elemento que já está na dobra ser pintado
  // NA VERSÃO FINAL e só depois recuar para o estado inicial e animar. Isso é
  // o que acontece quando o portão da revelação chega tarde — e é a razão de
  // html.mel-bee-rev vir de um <script> síncrono e não do bundle com defer.
  //
  // A prova é por amostragem, do primeiro quadro em diante, injetada ANTES de
  // qualquer script da página: se em algum quadro o primeiro alvo aparecer
  // opaco sem ter sido revelado, o estado inicial não pegou a tempo.
  await c.enviar('Page.addScriptToEvaluateOnNewDocument', {
    source: `window.__mel_flash = [];
      (function medir() {
        var e = document.querySelector('[data-mel-rev]');
        if (e) window.__mel_flash.push([Math.round(performance.now()),
          getComputedStyle(e).opacity, e.hasAttribute('data-mel-visto') ? 1 : 0]);
        if (performance.now() < 5000) requestAnimationFrame(medir);
      })();`,
  });
  const voltou = new Promise((ok) => c.ao('Page.loadEventFired', ok));
  await c.enviar('Page.navigate', { url: URL });
  await Promise.race([voltou, dormir(30000)]);
  await dormir(2600);
  const flash = (await c.enviar('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const q = window.__mel_flash || [];
      const primeiroVisto = q.findIndex((a) => a[2] === 1);
      const corte = primeiroVisto < 0 ? q.length : primeiroVisto;
      // Opaco antes de ter sido revelado = pintou a versão final e vai recuar.
      const piscadas = q.slice(0, corte).filter((a) => Number(a[1]) > 0.99);
      return { quadros: q.length, primeiroQuadro: q[0] || null,
               revelouEm: primeiroVisto < 0 ? null : q[primeiroVisto][0],
               piscadas: piscadas.slice(0, 3) };
    })()`,
  })).result.value;
  if (!flash.quadros) p.push('não foi possível amostrar os quadros do carregamento');
  else if (flash.piscadas.length) {
    p.push('piscada no carregamento: o primeiro alvo apareceu opaco antes de ser revelado, em t=' +
      flash.piscadas.map((a) => a[0] + 'ms').join(', '));
  }

  await dormir(400);
  await rolar(`(async()=>{ scrollTo({top:document.body.scrollHeight,behavior:'instant'});
    await new Promise(r=>setTimeout(r,1200)); scrollTo({top:0,behavior:'instant'});
    await new Promise(r=>setTimeout(r,700)); })()`);

  // ------------------------------------------------- 1. a frase removida
  if (/Duas cores\. Uma companheira/i.test(g.texto)) p.push('a frase "Duas cores. Uma companheira." continua na página');
  if (/escolha sua Bee\s+Duas cores/i.test(g.texto)) p.push('o bloco de topo continua no lugar');
  if (g.topoRestante) p.push(g.topoRestante + ' .mel-sec-topo ainda dentro de .mel-bee-mod');
  if (!g.ctaHero) p.push('o CTA do hero sumiu');
  else {
    if (g.ctaHero.txt !== 'Escolha sua Bee') p.push('o CTA do hero mudou de texto: "' + g.ctaHero.txt + '"');
    if (g.ctaHero.href !== '#modelos' || !g.ctaHero.alvo) p.push('a âncora do CTA do hero quebrou (' + g.ctaHero.href + ')');
  }
  // Vão entre o fim do hero e o topo da primeira Bee Cam: existe respiro, e ele
  // não pode ser a tira vazia que o bloco removido deixaria.
  const vaoMax = LARG < 810 ? 90 : 120;
  if (g.vaoHeroPalco == null) p.push('não foi possível medir o vão hero/primeira Bee Cam');
  else if (g.vaoHeroPalco < 20) p.push('a primeira Bee Cam ficou colada no hero (vão ' + g.vaoHeroPalco + 'px)');
  else if (g.vaoHeroPalco > vaoMax) p.push('sobrou espaço vazio entre o hero e a primeira Bee Cam (' + g.vaoHeroPalco + 'px)');

  // ---------------------------------------------------- 3. as placas
  g.placas.forEach((b, i) => {
    const n = 'placa ' + (i + 1) + ' ("' + b.txt + '"): ';
    if (b.tag !== 'H2') p.push(n + 'é <' + b.tag + '>, esperado <h2>');
    if (!perto(cor(b.cor), MEL, 6)) p.push(n + 'o título não está em mel (' + b.cor + ')');
    if (!perto(cor(b.fundo), CARVAO, 6)) p.push(n + 'a placa não está em carvão (' + b.fundo + ')');
    const ct = contraste(cor(b.cor), cor(b.fundo));
    if (ct < 4.5) p.push(n + 'contraste ' + ct.toFixed(2) + ':1, abaixo de 4,5');
    if (b.cursor === 'pointer') p.push(n + 'tem cursor de mão — parece clicável');
    if (b.interativo || b.focavel) p.push(n + 'tem href, tabindex, role ou controle dentro');
    if (parseFloat(b.padding) < 4) p.push(n + 'sem espaçamento interno (' + b.padding + ')');
    if (parseFloat(b.raio) < 6) p.push(n + 'sem borda arredondada (' + b.raio + ')');
    if (b.largura > b.colunaLargura + 1) p.push(n + 'vaza da coluna (' + b.largura + ' > ' + b.colunaLargura + ')');
  });
  if (g.placas.length !== 2) p.push(g.placas.length + ' placas de título (esperado 2)');
  // Hierarquia: um h1 só, e nenhum salto (h1 -> h3 reprova).
  const h1 = g.cabecalhos.filter((n) => n === 1).length;
  if (h1 !== 1) p.push(h1 + ' <h1> visíveis na página (esperado 1)');
  for (let i = 1; i < g.cabecalhos.length; i++) {
    if (g.cabecalhos[i] - g.cabecalhos[i - 1] > 1) {
      p.push('salto de heading h' + g.cabecalhos[i - 1] + ' -> h' + g.cabecalhos[i]);
      break;
    }
  }
  if (!g.marca) p.push('html.mel-bee-rev ausente — o sinalizador antiflash não rodou');
  if (g.overflowH) p.push('TRANSBORDA na horizontal');
  if (erros.length) p.push(erros.length + ' erro(s) de console');

  // ------------------------------------------- 2. o gradiente, em pixel
  // A coluna de amostras precisa ser contínua, ou seja, a página inteira num
  // PNG só.
  //
  // COMO NÃO FAZER — 14/08/2026. Até aqui isto era feito esticando a janela
  // para a altura do documento (setDeviceMetricsOverride com height=docH) e
  // tirando um print comum. Funcionava por acidente: o hero da /bee tinha teto
  // em px (clamp(...,80svh,820px)) e não sentia a janela de 7.000px. No dia em
  // que o hero passou a valer 100svh, para ocupar a dobra inteira, a janela
  // sintética virou a "tela" que o svh mede — o hero foi para 7.000px de
  // altura e a QA reprovou uma página que na tela estava certa, apontando o
  // pico do gradiente em y4442 e uma emenda em y4533 que não existem em
  // janela nenhuma de gente.
  //
  // captureBeyondViewport tira a página inteira SEM mexer na janela de
  // layout: o svh continua valendo 900, a geometria medida é a mesma que a
  // pessoa vê, e a coluna sai contínua do mesmo jeito. Vale a regra geral:
  // medida que muda o tamanho da janela não serve para página com unidade de
  // viewport, e hoje as duas heroes (esta e a da /polen, em 92svh) usam.
  const geo2 = (await c.enviar('Runtime.evaluate', { expression: SONDA_GEO, returnByValue: true })).result.value;
  const tiro = await c.enviar('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  const png = Buffer.from(tiro.data, 'base64');
  fs.writeFileSync(path.join(SAIDA, 'bee-cena-' + LARG + '.png'), png);
  const img = lerPNG(png);

  // A coluna: margem esquerda, onde só existe fundo em todos os blocos. O
  // padding de .mel-sec é 24px e o palco começa em x=24, então 6 está livre.
  const X = 6;
  const inicio = 92;                        // abaixo da navbar fixa
  // Para no fim da SEGUNDA Bee Cam, não no topo de #destaques: entre as duas
  // existe o vão de 10px do stack, que é carvão de propósito (é ali que a
  // página volta ao editorial escuro). Amostrar dentro dele leria a mudança
  // declarada como se fosse degrau do gradiente.
  const fim = Math.min(geo2.s2.y + geo2.s2.h - 4, img.alt - 2);
  const amostras = [];
  for (let y = inicio; y <= fim; y += 6) amostras.push({ y, c: pixel(img, X, y) });

  // Aquecimento = quanto o pixel se afastou do papel na direção do mel. O canal
  // azul é o que mais anda (o mel tem b=0), então ele é a régua.
  const calor = (c) => PAPEL[2] - c[2];
  const serie = amostras.map((a) => ({ y: a.y, v: calor(a.c), c: a.c }));

  // (a) nenhum degrau: a diferença entre amostras vizinhas (6px) tem que ser
  //     pequena em toda a coluna. É isto que pega faixa, corte e emenda.
  let maiorSalto = { d: 0, y: 0 };
  for (let i = 1; i < serie.length; i++) {
    const d = Math.abs(serie[i].v - serie[i - 1].v);
    if (d > maiorSalto.d) maiorSalto = { d, y: serie[i].y };
  }
  if (maiorSalto.d > 2) {
    p.push('degrau de ' + maiorSalto.d + ' no gradiente em y=' + maiorSalto.y + ' (limite 2 por 6px)');
  }

  // (b) as fronteiras, medidas de perto: hero/1ª e 1ª/2ª. É onde a costura de
  //     10px do stack mora e onde uma emenda apareceria.
  const emY = (y) => { let m = serie[0]; for (const s of serie) if (Math.abs(s.y - y) < Math.abs(m.y - y)) m = s; return m; };
  const fronteiras = [
    ['hero / 1a Bee Cam', geo2.s1.y],
    ['1a Bee Cam / 2a Bee Cam', geo2.s2.y],
  ];
  const medFront = fronteiras.map(([nome, y]) => {
    const antes = emY(y - 26), depois = emY(y + 26);
    const d = Math.abs(depois.v - antes.v);
    if (d > 4) p.push('emenda visível em "' + nome + '": ' + antes.v + ' -> ' + depois.v + ' (y' + y + ')');
    return { nome, y, antes: antes.v, depois: depois.v, delta: d };
  });

  // (c) a forma: sobe do hero, tem o pico entre as duas Bee Cam e volta ao
  //     papel depois da segunda.
  const pico = serie.reduce((a, b) => (b.v > a.v ? b : a), serie[0]);
  const topoDoPalco1 = geo2.palcos[0].y;
  const baseDoPalco2 = geo2.palcos[1].y + geo2.palcos[1].h;
  if (!(pico.y >= topoDoPalco1 && pico.y <= baseDoPalco2)) {
    p.push('o pico do gradiente caiu em y=' + pico.y + ', fora das duas Bee Cam (' + topoDoPalco1 + '..' + baseDoPalco2 + ')');
  }
  if (pico.v < 8) p.push('o gradiente quase não existe (pico ' + pico.v + ' unidades de azul)');
  if (pico.v > 46) p.push('o gradiente ficou pesado demais (pico ' + pico.v + ') — risco de mancha amarela');

  const noAlto = emY(inicio + 40).v;
  if (noAlto > 3) p.push('o topo do hero já nasce tingido (' + noAlto + ') — a cena deveria começar no papel');
  const noFim = serie[serie.length - 1].v;
  if (noFim > 3) p.push('o gradiente não voltou ao papel antes de #destaques (' + noFim + ')');

  // (d) contraste do texto corrido sobre o pico da cena, que é o pior caso.
  const ctPior = contraste([90, 82, 69], pico.c);   // #5A5245, a descrição
  if (ctPior < 4.5) p.push('a descrição cai para ' + ctPior.toFixed(2) + ':1 sobre o pico do gradiente');

  // ------------------------------------------------------------- relatório
  console.log('== /bee cena · ' + LARG + ' ==');
  console.log('  frase     "Duas cores. Uma companheira." ' +
    (/Duas cores/i.test(g.texto) ? 'AINDA NA PÁGINA' : 'removida') +
    ' · topo restante: ' + g.topoRestante +
    ' · CTA do hero: "' + (g.ctaHero ? g.ctaHero.txt + '" -> ' + g.ctaHero.href : 'AUSENTE') + '"');
  console.log('  respiro   hero termina em y' + (g.hero.y + g.hero.h) + ', 1a Bee Cam abre em y' +
    g.palcos[0].y + '  (vão ' + g.vaoHeroPalco + 'px)');
  g.placas.forEach((b, i) => console.log('  placa ' + (i + 1) + '     <' + b.tag + ' id=' + b.id + '> "' + b.txt +
    '"  ' + b.cor + ' sobre ' + b.fundo + '  ' + contraste(cor(b.cor), cor(b.fundo)).toFixed(2) +
    ':1  raio ' + b.raio + '  padding ' + b.padding + '  cursor ' + b.cursor +
    '  focável: ' + (b.focavel ? 'SIM' : 'não')));
  console.log('  headings  ' + g.cabecalhos.map((n) => 'h' + n).join(' ') +
    '  · rótulos ' + g.rotulos.join(', ') + ' (existem: ' + g.rotulosExistem.join(', ') + ')');
  console.log('  gradiente pico ' + pico.v + ' em y' + pico.y + ' rgb(' + pico.c.join(',') + ')' +
    ' · topo ' + noAlto + ' · fim ' + noFim + ' · maior degrau ' + maiorSalto.d + ' (y' + maiorSalto.y + ')');
  medFront.forEach((f) => console.log('     emenda  ' + f.nome + ' em y' + f.y + ': ' + f.antes + ' -> ' + f.depois + '  (Δ' + f.delta + ')'));
  console.log('     texto sobre o pico: ' + ctPior.toFixed(2) + ':1');
  console.log('  revelação ' + rev.vistos + '/' + rev.total + ' revelados · perdidos na rolagem: lenta ' +
    noMeio.perdidos + ', rápida/reversa ' + rapido.perdidos);
  console.log('  fallback  sem JS: ' + (semJS.total - semJS.ruins.length) + '/' + semJS.total +
    ' visíveis · reduced-motion: ' + (reduzido.total - reduzido.ruins.length) + '/' + reduzido.total +
    ' no lugar final, ' + (reduzido.observados - reduzido.semRolar) + '/' + reduzido.observados +
    ' marcados sem rolar');
  console.log('  carga     ' + flash.quadros + ' quadros amostrados · 1o quadro ' +
    (flash.primeiroQuadro ? flash.primeiroQuadro[0] + 'ms opacidade ' + flash.primeiroQuadro[1] : '—') +
    ' · revelado em ' + (flash.revelouEm == null ? 'não (abaixo da dobra)' : flash.revelouEm + 'ms') +
    ' · piscadas ' + flash.piscadas.length);
  console.log(p.length ? '\nX  ' + p.join('\n   ') : '\n[OK]  /bee cena · ' + LARG);

  fs.writeFileSync(path.join(SAIDA, 'qa-bee-cena-' + LARG + '.json'), JSON.stringify({
    url: URL, largura: LARG, geo: g, revelacao: rev, semJS, reduzido, flash,
    gradiente: { pico, noAlto, noFim, maiorSalto, fronteiras: medFront, contrastePior: ctPior },
    serie: serie.map((s) => [s.y, s.v]),
    problemas: p, erros: [...new Set(erros)],
  }, null, 2));

  c.fechar(); proc.kill();
  process.exit(p.length ? 1 : 0);
})().catch((e) => { console.error('FALHOU:', e.message); process.exit(1); });
