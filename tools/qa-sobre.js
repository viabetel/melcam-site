// QA da faixa "Sobre Nós" — prova, por contagem, se o obturador oscila.
//
// O defeito nao aparece em captura: e uma alternancia de atributo. Entao a
// sonda instala um MutationObserver no proprio palco e conta CADA mudanca de
// [data-aberto], com o instante e o scrollY em que aconteceu. Contagem, nao
// impressao.
//
// Roteiro por breakpoint, na ordem do pedido:
//   1. chegar a secao devagar, em passos pequenos;
//   2. parar exatamente no scrollY do antigo gatilho (0,55 do palco visivel);
//   3. ficar parado 10 s;
//   4. sair da viewport e voltar;
//   5. abrir e fechar pelo botao;
//   6. Escape.
//
// So le a pagina. Nao altera arquivo nenhum do projeto.
//
//   node tools/qa-sobre.js
//   SEGUNDOS=10 node tools/qa-sobre.js
const path = require('path');
const { spawn } = require('child_process');
const { CDP, pegarJSON, esperarDevTools } = require('./cdp');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = process.env.BASE || 'http://localhost:3030';
const PORTA = Number(process.env.PORTA) || 9450;
const PARADO_MS = (Number(process.env.SEGUNDOS) || 10) * 1000;
const TELAS = [['desktop', 1440, 900], ['tablet', 768, 1024], ['mobile', 390, 844]];
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

// Instrumentacao instalada ANTES de qualquer script da pagina, para nao perder
// a primeira abertura.
const SONDA = `
(() => {
  const reg = { trocas: [], manual: false, instalado: false };
  window.__melSobre = reg;
  const instalar = () => {
    const palco = document.querySelector('[data-mel-sobre-palco]');
    if (!palco) return false;
    reg.instalado = true;
    new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.attributeName !== 'data-aberto') continue;
        reg.trocas.push({
          aberto: palco.hasAttribute('data-aberto'),
          t: Math.round(performance.now()),
          scrollY: Math.round(window.scrollY),
          origem: reg.manual ? 'manual' : 'automatico',
        });
      }
    }).observe(palco, { attributes: true, attributeFilter: ['data-aberto'] });
    return true;
  };
  if (!instalar()) {
    const iv = setInterval(() => { if (instalar()) clearInterval(iv); }, 30);
    setTimeout(() => clearInterval(iv), 8000);
  }
})();
`;

async function avaliar(c, expr) {
  const r = await c.enviar('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception || {}).description);
  return r.result.value;
}

(async () => {
  const proc = spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
    '--no-default-browser-check', '--mute-audio', '--hide-scrollbars',
    '--remote-debugging-port=' + PORTA,
    '--user-data-dir=' + path.join(__dirname, 'edge-cdp-' + PORTA), 'about:blank',
  ], { stdio: 'ignore' });

  await esperarDevTools(PORTA);
  const alvos = await pegarJSON(PORTA, '/json/list');
  const c = await CDP.conectar(alvos.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await c.enviar('Page.enable'); await c.enviar('Runtime.enable');
  try { await c.enviar('Log.enable'); } catch {}

  let falhas = 0;
  for (const [nome, larg, alt] of TELAS) {
    const consola = [];
    const ouvirLog = (p) => { if (p.entry.level === 'error') consola.push(p.entry.text); };
    const ouvirExc = (p) => consola.push('exceção: ' + (p.exceptionDetails.text || ''));
    c.ao('Log.entryAdded', ouvirLog);
    c.ao('Runtime.exceptionThrown', ouvirExc);

    await c.enviar('Emulation.setDeviceMetricsOverride', {
      width: larg, height: alt, deviceScaleFactor: 1, mobile: larg < 810,
    });
    await c.enviar('Page.addScriptToEvaluateOnNewDocument', { source: SONDA });
    const carregou = new Promise((ok) => c.ao('Page.loadEventFired', ok));
    await c.enviar('Page.navigate', { url: BASE + '/' });
    await Promise.race([carregou, dormir(45000)]);
    await dormir(1500);

    // Geometria: onde fica a faixa e qual scrollY reproduz o antigo gatilho de
    // 0,55 do palco visivel. E o ponto exato onde a oscilacao vivia.
    const geo = await avaliar(c, `(() => {
      const palco = document.querySelector('[data-mel-sobre-palco]');
      const secao = document.querySelector('[data-mel-sobre]');
      if (!palco) return null;
      let topo = 0, e = palco;
      while (e) { topo += e.offsetTop; e = e.offsetParent; }
      const h = palco.getBoundingClientRect().height;
      return {
        topoDoc: Math.round(topo), alturaPalco: Math.round(h),
        alturaSecao: secao ? Math.round(secao.getBoundingClientRect().height) : null,
        vh: window.innerHeight, docH: document.documentElement.scrollHeight,
        // para 55% do palco visivel, o topo dele precisa estar em vh - 0.55*h
        alvoScroll: Math.round(topo - (window.innerHeight - 0.55 * h)),
      };
    })()`);
    if (!geo) { console.log(`[FALHOU] ${nome}: faixa não encontrada`); falhas++; continue; }

    // 1 e 2. Chegar devagar e parar logo DEPOIS do gatilho.
    //
    // Parar exatamente em cima dele nao serve: ali a razao e 0,55 cravado, o
    // observer pode nao considerar cruzado, e o defeito passa despercebido —
    // foi o que aconteceu na primeira medicao, em que desktop e tablet deram
    // zero enquanto o mobile dava 172 alternancias. O passo de 24px cruza o
    // limiar e o repouso fica 80px adiante, que e "proximo ao gatilho" e e onde
    // a realimentacao vive.
    const REPOUSO = geo.alvoScroll + 80;
    await avaliar(c, `(async () => {
      const passo = 24;
      for (let y = Math.max(0, ${geo.alvoScroll} - 900); y <= ${REPOUSO}; y += passo) {
        window.scrollTo(0, y);
        await new Promise(r => requestAnimationFrame(r));
      }
      window.scrollTo(0, ${REPOUSO});
    })()`);
    const trocasAteAqui = (await avaliar(c, 'window.__melSobre.trocas.length')) || 0;

    // 3. Parado. Se houver feedback loop, ele se manifesta AQUI, sem scroll.
    await dormir(PARADO_MS);
    const paradoInfo = await avaliar(c, `(() => {
      const r = window.__melSobre;
      return { total: r.trocas.length, scrollY: Math.round(window.scrollY),
               noPeriodo: r.trocas.slice(${trocasAteAqui}),
               aberto: !!document.querySelector('[data-mel-sobre-palco]').hasAttribute('data-aberto') };
    })()`);
    // A abertura automática legítima pode cair DENTRO desta janela: o
    // IntersectionObserver entrega a callback de forma assíncrona, então o
    // disparo provocado pela aproximação às vezes só chega depois que o scroll
    // já parou. Isso não é oscilação — oscilação é troca ALÉM dela. Contar as
    // duas juntas reprovaria o comportamento correto (aconteceu no tablet).
    let viuAberturaAuto = false;
    const trocasParado = paradoInfo.noPeriodo.filter((t) => {
      if (!viuAberturaAuto && t.origem === 'automatico' && t.aberto) { viuAberturaAuto = true; return false; }
      return true;
    }).length;

    // 4. Sair da viewport e voltar.
    await avaliar(c, `(async () => {
      window.scrollTo(0, 0);
      await new Promise(r => setTimeout(r, 900));
      window.scrollTo(0, ${REPOUSO});
      await new Promise(r => setTimeout(r, 900));
      window.scrollTo(0, document.documentElement.scrollHeight);
      await new Promise(r => setTimeout(r, 900));
      window.scrollTo(0, ${REPOUSO});
      await new Promise(r => setTimeout(r, 1200));
    })()`);
    const depoisDoVaiVem = await avaliar(c, 'window.__melSobre.trocas.length');
    const trocasVaiVem = depoisDoVaiVem - paradoInfo.total;

    // 4b. Seguir até a faixa estar bem dentro da janela, para provar que a
    // abertura automática ACONTECE — e acontece uma vez só. O repouso do passo
    // 2 é derivado do gatilho ANTIGO, que caía em ponto diferente em cada tela;
    // sem esta etapa o teste passaria por não ter chegado ao gatilho novo.
    await avaliar(c, `(async () => {
      const alvo = ${geo.topoDoc} - Math.round(window.innerHeight * 0.15);
      for (let y = window.scrollY; y <= alvo; y += 24) {
        window.scrollTo(0, y);
        await new Promise(r => requestAnimationFrame(r));
      }
      window.scrollTo(0, alvo);
      await new Promise(r => setTimeout(r, 2500));
    })()`);
    const depoisDeChegar = await avaliar(c, `(() => ({
      total: window.__melSobre.trocas.length,
      aberto: document.querySelector('[data-mel-sobre-palco]').hasAttribute('data-aberto'),
      scrollY: Math.round(window.scrollY),
    }))()`);
    const trocasChegada = depoisDeChegar.total - depoisDoVaiVem;

    // 4c. Segunda parada de 10s, agora com a faixa JÁ ABERTA e o scroll imóvel.
    // É o estado exato em que o laço antigo vivia: altura grande, razão baixa.
    // Zero aqui é a prova direta de que a realimentação acabou.
    await dormir(PARADO_MS);
    const depoisDeEsperarAberta = await avaliar(c, `(() => ({
      total: window.__melSobre.trocas.length,
      aberto: document.querySelector('[data-mel-sobre-palco]').hasAttribute('data-aberto'),
    }))()`);
    const trocasParadoAberta = depoisDeEsperarAberta.total - depoisDeChegar.total;

    // 5. Botão: abrir e fechar.
    const botao = await avaliar(c, `(async () => {
      const palco = document.querySelector('[data-mel-sobre-palco]');
      const bt = palco.querySelector('[data-mel-sobre-bt]');
      const rot = palco.querySelector('[data-mel-sobre-rot]');
      window.__melSobre.manual = true;
      const antes = { aberto: palco.hasAttribute('data-aberto'), aria: bt.getAttribute('aria-expanded'), rot: rot && rot.textContent.trim() };
      bt.click();
      await new Promise(r => setTimeout(r, 400));
      const um = { aberto: palco.hasAttribute('data-aberto'), aria: bt.getAttribute('aria-expanded'), rot: rot && rot.textContent.trim() };
      bt.click();
      await new Promise(r => setTimeout(r, 400));
      const dois = { aberto: palco.hasAttribute('data-aberto'), aria: bt.getAttribute('aria-expanded'), rot: rot && rot.textContent.trim() };
      return { antes, um, dois };
    })()`);

    // 6. Escape fecha (garantindo que esteja aberta antes).
    const esc = await avaliar(c, `(async () => {
      const palco = document.querySelector('[data-mel-sobre-palco]');
      const bt = palco.querySelector('[data-mel-sobre-bt]');
      if (!palco.hasAttribute('data-aberto')) { bt.click(); await new Promise(r => setTimeout(r, 350)); }
      const antes = palco.hasAttribute('data-aberto');
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await new Promise(r => setTimeout(r, 350));
      return { antes, depois: palco.hasAttribute('data-aberto'),
               aria: bt.getAttribute('aria-expanded'),
               foco: document.activeElement === bt };
    })()`);

    const trocas = await avaliar(c, 'JSON.stringify(window.__melSobre.trocas)');
    const lista = JSON.parse(trocas);
    const autos = lista.filter((t) => t.origem === 'automatico');
    const aberturasAuto = autos.filter((t) => t.aberto).length;
    const fechamentosAuto = autos.filter((t) => !t.aberto).length;

    const erros = [];
    if (aberturasAuto > 1) erros.push(`${aberturasAuto} aberturas automáticas (esperado no máximo 1)`);
    if (aberturasAuto < 1) erros.push('a faixa NÃO abriu sozinha ao chegar à seção');
    if (!depoisDeChegar.aberto && aberturasAuto === 1) erros.push('abriu sozinha mas não ficou aberta');
    if (fechamentosAuto > 0) erros.push(`${fechamentosAuto} fechamentos automáticos (esperado 0)`);
    if (trocasParado > 0) erros.push(`${trocasParado} alternâncias com o scroll PARADO no limiar antigo`);
    if (trocasParadoAberta > 0) erros.push(`${trocasParadoAberta} alternâncias com o scroll PARADO e a faixa aberta`);
    if (!depoisDeEsperarAberta.aberto) erros.push('a faixa fechou sozinha durante a espera');
    if (trocasVaiVem > 0) erros.push(`${trocasVaiVem} alternâncias ao sair e voltar à viewport`);
    if (!(botao.um.aberto !== botao.antes.aberto && botao.dois.aberto === botao.antes.aberto)) erros.push('o botão não alterna');
    if (botao.um.aria !== String(botao.um.aberto) || botao.dois.aria !== String(botao.dois.aberto)) erros.push('aria-expanded fora de sincronia');
    const rotEsperado = (a) => (a ? 'Fechar' : 'Abrir');
    if (botao.um.rot !== rotEsperado(botao.um.aberto) || botao.dois.rot !== rotEsperado(botao.dois.aberto)) erros.push('rótulo do botão fora de sincronia');
    if (!esc.antes || esc.depois) erros.push('Escape não fechou');
    if (esc.aria !== 'false') erros.push('aria-expanded não voltou a false depois do Escape');
    if (!esc.foco) erros.push('o foco não voltou ao botão depois do Escape');
    if (consola.length) erros.push(`${consola.length} erro(s) de console`);

    console.log(`\n== ${nome}  ${larg}x${alt} ==`);
    console.log(`   faixa em y=${geo.topoDoc}  palco=${geo.alturaPalco}px  seção=${geo.alturaSecao}px  scrollY do antigo gatilho=${geo.alvoScroll}`);
    console.log(`   aberturas automáticas: ${aberturasAuto}   fechamentos automáticos: ${fechamentosAuto}`);
    console.log(`   alternâncias com scroll PARADO no limiar antigo (${PARADO_MS / 1000}s): ${trocasParado}`);
    console.log(`   alternâncias ao sair e voltar: ${trocasVaiVem}`);
    console.log(`   ao chegar de fato à seção (y=${depoisDeChegar.scrollY}): +${trocasChegada} troca(s), faixa ${depoisDeChegar.aberto ? 'ABERTA' : 'fechada'}`);
    console.log(`   alternâncias com scroll PARADO e faixa ABERTA (${PARADO_MS / 1000}s): ${trocasParadoAberta}`);
    console.log(`   botão: ${botao.antes.aberto ? 'aberto' : 'fechado'} -> ${botao.um.aberto ? 'aberto' : 'fechado'} (${botao.um.rot}) -> ${botao.dois.aberto ? 'aberto' : 'fechado'} (${botao.dois.rot})`);
    console.log(`   Escape: ${esc.antes ? 'aberto' : 'fechado'} -> ${esc.depois ? 'aberto' : 'fechado'}  aria=${esc.aria}  foco no botão=${esc.foco}`);
    console.log(`   console: ${consola.length ? consola.join(' | ') : '0 erros'}`);
    if (lista.length && lista.length <= 14) {
      console.log('   histórico: ' + lista.map((t) => `${t.origem[0]}${t.aberto ? '+' : '-'}@${t.t}ms/y${t.scrollY}`).join(' '));
    } else if (lista.length) {
      console.log(`   histórico: ${lista.length} trocas — primeiras 10: ` + lista.slice(0, 10).map((t) => `${t.origem[0]}${t.aberto ? '+' : '-'}@${t.t}ms`).join(' '));
    }
    if (erros.length) { console.log('   [FALHOU] ' + erros.join(' · ')); falhas++; } else { console.log('   [OK]'); }

    c.eventos.set('Log.entryAdded', (c.eventos.get('Log.entryAdded') || []).filter((f) => f !== ouvirLog));
    c.eventos.set('Runtime.exceptionThrown', (c.eventos.get('Runtime.exceptionThrown') || []).filter((f) => f !== ouvirExc));
  }

  // ---- cenário extra 1: o clique ANTES do disparo automático manda ----
  // Requisito: se a pessoa clicar antes de a faixa chegar, o controle manual
  // vence e o observador sai de cena na hora — a faixa não pode abrir sozinha
  // depois. O clique acontece com a seção ainda muito abaixo da dobra.
  {
    await c.enviar('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await c.enviar('Page.addScriptToEvaluateOnNewDocument', { source: SONDA });
    const carregou = new Promise((ok) => c.ao('Page.loadEventFired', ok));
    await c.enviar('Page.navigate', { url: BASE + '/' });
    await Promise.race([carregou, dormir(45000)]);
    await dormir(1500);

    const r = await avaliar(c, `(async () => {
      const palco = document.querySelector('[data-mel-sobre-palco]');
      const bt = palco.querySelector('[data-mel-sobre-bt]');
      let topo = 0, e = palco; while (e) { topo += e.offsetTop; e = e.offsetParent; }
      const longe = window.scrollY < topo - window.innerHeight * 2;
      window.__melSobre.manual = true;
      bt.click();                       // clique com a faixa ainda longe
      await new Promise(r2 => setTimeout(r2, 300));
      const depoisDoClique = palco.hasAttribute('data-aberto');
      window.__melSobre.manual = false; // daqui em diante, troca = automática
      for (let y = window.scrollY; y <= topo - 120; y += 24) {
        window.scrollTo(0, y);
        await new Promise(r2 => requestAnimationFrame(r2));
      }
      await new Promise(r2 => setTimeout(r2, 2500));
      return {
        clicouLonge: longe, depoisDoClique,
        aberto: palco.hasAttribute('data-aberto'),
        automaticas: window.__melSobre.trocas.filter(t => t.origem === 'automatico').length,
      };
    })()`);

    const erros = [];
    if (!r.clicouLonge) erros.push('o clique não aconteceu com a seção longe da dobra');
    if (!r.depoisDoClique) erros.push('o clique não abriu a faixa');
    if (r.automaticas > 0) erros.push(`${r.automaticas} troca(s) automática(s) depois do clique manual`);
    console.log('\n== clique ANTES do disparo automático  (desktop 1440x900) ==');
    console.log(`   clique com a faixa longe: ${r.clicouLonge} · abriu no clique: ${r.depoisDoClique}`);
    console.log(`   trocas automáticas depois disso: ${r.automaticas}  ·  estado final: ${r.aberto ? 'aberta' : 'fechada'}`);
    if (erros.length) { console.log('   [FALHOU] ' + erros.join(' · ')); falhas++; } else { console.log('   [OK] o manual venceu e o observador não voltou a opinar'); }
  }

  // ---- cenário extra 2: prefers-reduced-motion ----
  // O desenho reduzido é resolvido só no CSS (transition:none). Aqui o que se
  // confirma é que o COMPORTAMENTO continua o mesmo: abre uma vez, não oscila.
  {
    await c.enviar('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await c.enviar('Page.addScriptToEvaluateOnNewDocument', { source: SONDA });
    const carregou = new Promise((ok) => c.ao('Page.loadEventFired', ok));
    await c.enviar('Page.navigate', { url: BASE + '/' });
    await Promise.race([carregou, dormir(45000)]);
    await dormir(1200);

    const r = await avaliar(c, `(async () => {
      const palco = document.querySelector('[data-mel-sobre-palco]');
      let topo = 0, e = palco; while (e) { topo += e.offsetTop; e = e.offsetParent; }
      for (let y = 0; y <= topo - 120; y += 40) {
        window.scrollTo(0, y);
        await new Promise(r2 => requestAnimationFrame(r2));
      }
      await new Promise(r2 => setTimeout(r2, 6000));
      const cs = getComputedStyle(palco);
      return {
        aberto: palco.hasAttribute('data-aberto'),
        transicao: cs.transitionDuration,
        automaticas: window.__melSobre.trocas.filter(t => t.origem === 'automatico').length,
        aberturas: window.__melSobre.trocas.filter(t => t.origem === 'automatico' && t.aberto).length,
        fechamentos: window.__melSobre.trocas.filter(t => t.origem === 'automatico' && !t.aberto).length,
      };
    })()`);
    await c.enviar('Emulation.setEmulatedMedia', { features: [] });

    const erros = [];
    if (r.aberturas !== 1) erros.push(`${r.aberturas} aberturas automáticas (esperado 1)`);
    if (r.fechamentos !== 0) erros.push(`${r.fechamentos} fechamentos automáticos (esperado 0)`);
    // Comparar como NÚMERO, não como texto. A regra global do projeto usa
    // "transition-duration:.01ms!important", que o navegador devolve como
    // "1e-05s" — notação científica que qualquer casamento por string reprova
    // por engano. Efetivamente desligada é o que importa: abaixo de 1 ms.
    const segundos = parseFloat(r.transicao);
    if (!(segundos < 0.001)) erros.push(`transição não foi desligada: ${r.transicao}`);
    console.log('\n== prefers-reduced-motion: reduce  (desktop 1440x900) ==');
    console.log(`   aberturas automáticas: ${r.aberturas} · fechamentos: ${r.fechamentos} · faixa ${r.aberto ? 'aberta' : 'fechada'}`);
    console.log(`   transition-duration do palco: ${r.transicao}`);
    if (erros.length) { console.log('   [FALHOU] ' + erros.join(' · ')); falhas++; } else { console.log('   [OK]'); }
  }

  console.log(falhas ? `\n${falhas} cenário(s) reprovaram.` : '\ntodos os cenários passaram.');
  c.fechar(); proc.kill();
  process.exit(falhas ? 1 : 0);
})().catch((e) => { console.error('FALHOU:', e.message); process.exit(2); });
