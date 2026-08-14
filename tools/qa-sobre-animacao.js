// A ANIMAÇÃO DO OBTURADOR AINDA ANIMA?
//
// A altura do palco deixou de vir de "height" e passou a vir da fileira do
// meio da grade (0fr -> 1fr). Isso muda o que o navegador interpola, então
// não basta ver o estado final: é preciso provar que existem quadros
// INTERMEDIÁRIOS. A sonda amostra a altura do palco a cada quadro durante a
// abertura e conta quantos valores distintos aparecem entre o fechado e o
// aberto. Snap dá 2 valores; animação dá dezenas.
//
//   node tools/qa-sobre-animacao.js
const path = require('path');
const { spawn } = require('child_process');
const { CDP, pegarJSON, esperarDevTools } = require('./cdp');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = process.env.BASE || 'http://localhost:3030';
const PORTA = Number(process.env.PORTA) || 9459;
const TELAS = [['desktop', 1440, 900], ['tablet', 768, 1024], ['mobile', 390, 844]];
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function av(c, e) {
  const r = await c.enviar('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + ((r.exceptionDetails.exception || {}).description || ''));
  return r.result.value;
}

(async () => {
  const proc = spawn(EDGE, ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
    '--no-default-browser-check', '--mute-audio', '--hide-scrollbars',
    '--remote-debugging-port=' + PORTA, '--user-data-dir=' + path.join(__dirname, 'edge-cdp-' + PORTA), 'about:blank'], { stdio: 'ignore' });
  await esperarDevTools(PORTA);
  const c = await CDP.conectar((await pegarJSON(PORTA, '/json/list')).find((t) => t.type === 'page').webSocketDebuggerUrl);
  await c.enviar('Page.enable'); await c.enviar('Runtime.enable');

  let falhas = 0;
  for (const [nome, larg, alt] of TELAS) {
    await c.enviar('Emulation.setDeviceMetricsOverride', { width: larg, height: alt, deviceScaleFactor: 1, mobile: larg < 810 });
    const ok = new Promise((r) => c.ao('Page.loadEventFired', r));
    await c.enviar('Page.navigate', { url: BASE + '/' });
    await Promise.race([ok, dormir(45000)]);
    await av(c, 'document.fonts.ready.then(()=>1)');
    await dormir(1200);

    // Fica LONGE do gatilho automático e abre pelo botão, para cronometrar
    // uma abertura limpa.
    const r = await av(c, `(async () => {
      const palco = document.querySelector('[data-mel-sobre-palco]');
      const bt = palco.querySelector('[data-mel-sobre-bt]');
      const alturas = [];
      let rodando = true;
      const amostrar = () => {
        alturas.push(Math.round(palco.getBoundingClientRect().height));
        if (rodando) requestAnimationFrame(amostrar);
      };
      requestAnimationFrame(amostrar);
      const fechado = Math.round(palco.getBoundingClientRect().height);
      bt.click();
      await new Promise(r2 => setTimeout(r2, 1100));
      rodando = false;
      const aberto = Math.round(palco.getBoundingClientRect().height);
      const distintos = Array.from(new Set(alturas));
      const intermediarios = distintos.filter(h => h > fechado && h < aberto);
      // monotônica? a altura só pode crescer durante a abertura
      let subiuSempre = true;
      for (let i = 1; i < alturas.length; i++) if (alturas[i] < alturas[i - 1] - 1) subiuSempre = false;
      return { fechado, aberto, quadros: alturas.length, distintos: distintos.length,
               intermediarios: intermediarios.length, subiuSempre,
               amostra: alturas.filter((_, i) => i % 6 === 0).slice(0, 12) };
    })()`);

    // O CRITÉRIO NÃO PODE SER UM NÚMERO ABSOLUTO DE QUADROS.
    // A primeira versão exigia 10 alturas intermediárias e reprovou o desktop
    // com 9 — mas ali o headless só conseguiu 15 quadros em 1,1 s (a página é
    // pesada em 1440px), e 9 das 10 alturas distintas eram intermediárias.
    // Isso é animação amostrada de raro, não salto. O que separa um do outro é
    // a PROPORÇÃO: num salto, praticamente toda amostra cai no fechado ou no
    // aberto e sobram 0 ou 1 valores no meio.
    const proporcao = r.distintos ? r.intermediarios / r.distintos : 0;
    const erros = [];
    if (r.aberto <= r.fechado) erros.push('a faixa não cresceu');
    if (r.intermediarios < 5 || proporcao < 0.5) {
      erros.push(`${r.intermediarios} de ${r.distintos} alturas distintas são intermediárias — parece salto, não animação`);
    }
    if (!r.subiuSempre) erros.push('a altura oscilou durante a abertura');

    console.log(`\n== ${nome} ${larg}x${alt} ==`);
    console.log(`   fechado ${r.fechado}px -> aberto ${r.aberto}px  (+${r.aberto - r.fechado})`);
    console.log(`   ${r.quadros} quadros amostrados, ${r.distintos} alturas distintas, ${r.intermediarios} intermediárias`);
    console.log(`   monotônica: ${r.subiuSempre}`);
    console.log(`   amostra: ${r.amostra.join(' → ')} …`);
    if (erros.length) { console.log('   [FALHOU] ' + erros.join(' · ')); falhas++; } else console.log('   [OK] o obturador anima');
  }

  // reduced-motion: a transição tem de estar desligada e o resultado, correto
  {
    await c.enviar('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await c.enviar('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    const ok = new Promise((r) => c.ao('Page.loadEventFired', r));
    await c.enviar('Page.navigate', { url: BASE + '/' });
    await Promise.race([ok, dormir(45000)]);
    await av(c, 'document.fonts.ready.then(()=>1)');
    await dormir(1000);
    const r = await av(c, `(async () => {
      const palco = document.querySelector('[data-mel-sobre-palco]');
      const bt = palco.querySelector('[data-mel-sobre-bt]');
      const fechado = Math.round(palco.getBoundingClientRect().height);
      bt.click();
      await new Promise(r2 => setTimeout(r2, 60));
      const logo = Math.round(palco.getBoundingClientRect().height);
      await new Promise(r2 => setTimeout(r2, 900));
      const vao = palco.querySelector('.mel-sobre-vao');
      return { fechado, logo, fim: Math.round(palco.getBoundingClientRect().height),
               corte: vao.scrollHeight - vao.clientHeight,
               dur: getComputedStyle(palco).transitionDuration };
    })()`);
    await c.enviar('Emulation.setEmulatedMedia', { features: [] });
    const erros = [];
    if (parseFloat(r.dur) >= 0.001) erros.push('transição não desligada: ' + r.dur);
    if (r.logo !== r.fim) erros.push('não abriu de imediato: 60ms depois estava em ' + r.logo + ', terminou em ' + r.fim);
    if (r.corte > 0) erros.push(r.corte + 'px cortados na área central');
    console.log('\n== prefers-reduced-motion: reduce (1440x900) ==');
    console.log(`   ${r.fechado}px -> ${r.logo}px em 60ms -> ${r.fim}px  ·  transition-duration=${r.dur}  ·  corte=${r.corte}px`);
    if (erros.length) { console.log('   [FALHOU] ' + erros.join(' · ')); falhas++; } else console.log('   [OK] salta direto e o conteúdo cabe');
  }

  console.log(falhas ? `\n${falhas} cenário(s) reprovaram.` : '\ntodos os cenários passaram.');
  c.fechar(); proc.kill(); process.exit(falhas ? 1 : 0);
})().catch((e) => { console.error('FALHOU:', e.message); process.exit(2); });
