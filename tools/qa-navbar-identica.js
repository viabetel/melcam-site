// A BARRA ASSENTADA TEM DE FICAR IDÊNTICA — 14/08/2026.
//
//   node tools/qa-navbar-identica.js
//   ROTAS=/,/bee LARGURAS=1440 node tools/qa-navbar-identica.js
//   REF=http://localhost:3030 NOVO=http://localhost:3030 node tools/qa-navbar-identica.js
//
// O pedido do conserto do flash veio com uma regra absoluta: não mudar desenho,
// conteúdo, posição, medida, link, cor, tipografia, responsividade nem
// comportamento da barra atual. Este arquivo transforma essa regra em número.
//
// A referência é PRODUÇÃO, que é o HEAD sem o conserto, e o candidato é o
// servidor local, que é o HEAD com ele. Os dois servem os mesmos assets e as
// mesmas fontes. Comparar contra a produção evita mexer na árvore de trabalho
// só para tirar a foto do "antes".
//
// ⚠️ O PIXEL DO TEXTO NÃO É ESTÁVEL ENTRE DUAS CARGAS, e ignorar isso faz este
// teste mentir. Medido em 14/08: duas capturas da MESMA página, do MESMO build,
// no mesmo navegador, diferem em 1.315 dos 116.640 pixels da faixa em 1440 —
// sempre na linha dos rótulos (y35..45), com diferença de canal de até 132. É
// o rasterizador: os mesmos glifos, na mesma posição fracionária, saem com
// antialiasing diferente conforme a fonte já esteja no cache ou não. Sem
// tratar isso, o teste acusaria "a barra mudou" em toda execução.
//
// Então cada lado é capturado DUAS VEZES e o que difere entre as duas capturas
// do mesmo build vira MÁSCARA DE RUÍDO. O que conta como mudança de verdade é
// o pixel que difere entre os lados E é estável dentro de cada lado.
//
// E como pixel de texto é ruidoso justamente onde mais interessa, o teste não
// para no pixel: mede também a GEOMETRIA, que é exata e não tem ruído nenhum —
// x, y, largura e altura com fração, mais fonte, peso, espaçamento, cor,
// padding e a marcação de página atual de cada link. Uma barra que "parece
// igual" mas nasceu meio pixel ao lado reprova aqui.
//
// Só lê. Grava em tools/shots-navbar-identica/ quando houver diferença real.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { CDP, pegarJSON, esperarDevTools } = require('./cdp');
const { lerPNG, pixel } = require('./png');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const REF = process.env.REF || 'https://melcam-site.vercel.app';
const NOVO = process.env.NOVO || 'http://localhost:3030';
const ROTAS = (process.env.ROTAS || '/,/polen,/bee,/sobre,/acessorios,/sacola').split(',');
const LARGURAS = (process.env.LARGURAS || '1920,1440,1280,1024,810,390').split(',').map(Number);
const ALTURA = 900;
// 81 é a altura da barra, e a faixa é exatamente ela POR MEDIÇÃO, não por
// arredondamento: com 90px a home acusava 12.908 pixels diferentes em 1440.
// Não era a barra — eram os 9px de vídeo logo abaixo dela, que se move, e cada
// captura pega um quadro. Faixa que passa da barra mede o hero, não a barra.
const FAIXA = Number(process.env.FAIXA || 81);
const PORTA = Number(process.env.PORTA) || 9422;
const SAIDA = path.join(__dirname, 'shots-navbar-identica');
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

// Geometria e tipografia de tudo que mora na linha da barra. Tudo com fração:
// meio pixel de deslocamento é mudança, e arredondar esconderia.
const SONDA = `(() => {
  const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const nav = Array.prototype.slice.call(document.querySelectorAll('nav')).filter(vis)[0];
  if (!nav) return JSON.stringify({ sem: 'barra visível' });
  const linha = nav.querySelector('[data-framer-name="Section "]') || nav;
  const cs = getComputedStyle(linha), rl = linha.getBoundingClientRect();
  const rn = nav.getBoundingClientRect(), cn = getComputedStyle(nav);
  const caixa = (e) => { const r = e.getBoundingClientRect(), c = getComputedStyle(e);
    return [r.x, r.y, r.width, r.height, c.display].join(' '); };
  const out = {
    nav: [rn.x, rn.y, rn.width, rn.height, cn.position, cn.backgroundColor, cn.zIndex].join(' '),
    linha: [rl.x, rl.y, rl.width, rl.height, cs.display, cs.gridTemplateColumns, cs.justifyContent, cs.padding].join(' '),
    partes: {},
    links: [],
    hamburguer: null,
  };
  for (const s of ['[data-framer-name="Meniu"]', '.mel-nav-links', 'a[data-framer-name="MELCAM"]',
                   '.mel-nav-acoes', '[data-mel-sacola-bt]', '[data-mel-perfil]',
                   '[data-framer-name="Section Icon"]']) {
    const e = linha.querySelector(s);
    out.partes[s] = e ? caixa(e) : 'ausente';
  }
  const ic = linha.querySelector('[data-framer-name="Meniu"] [data-framer-name="Icon"]');
  out.hamburguer = ic ? caixa(ic) : 'ausente';
  out.links = Array.prototype.slice.call(linha.querySelectorAll('.mel-nav-link')).map((a) => {
    const r = a.getBoundingClientRect(), c = getComputedStyle(a);
    return [a.textContent, a.getAttribute('href'), a.getAttribute('aria-current') || '-',
      r.x, r.y, r.width, r.height, c.fontFamily, c.fontSize, c.fontWeight,
      c.letterSpacing, c.color, c.padding, c.borderRadius].join(' ');
  });
  // Ordem dos filhos da linha: mudar a ordem muda a leitura por teclado.
  out.ordem = Array.prototype.slice.call(linha.children)
    .map((e) => e.getAttribute('data-framer-name') || e.className || e.tagName).join(' > ');
  return JSON.stringify(out);
})()`;

(async () => {
  fs.mkdirSync(SAIDA, { recursive: true });
  const proc = spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
    '--no-default-browser-check', '--hide-scrollbars', '--mute-audio',
    // O RUÍDO DO TEXTO SE APAGA NA ORIGEM, e é aqui que ele nasce. Sem estas
    // duas, o Skia escolhe entre antialiasing de subpixel (com franja
    // colorida) e cinza conforme o estado do cache de fonte, e a mesma página
    // sai diferente de uma carga para a outra. Com elas, o texto rasteriza
    // igual sempre. É ajuste do MEDIDOR, não do site: nada aqui chega ao
    // visitante, e o que se quer comparar continua sendo o mesmo desenho.
    '--disable-lcd-text', '--disable-font-subpixel-positioning',
    '--remote-debugging-port=' + PORTA,
    '--user-data-dir=' + path.join(__dirname, 'edge-cdp-' + PORTA), 'about:blank',
  ], { stdio: 'ignore' });

  await esperarDevTools(PORTA);
  const alvos = await pegarJSON(PORTA, '/json/list');
  const c = await CDP.conectar(alvos.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await c.enviar('Page.enable');
  await c.enviar('Runtime.enable');

  async function visitar(base, rota, larg) {
    await c.enviar('Emulation.setDeviceMetricsOverride', {
      width: larg, height: ALTURA, deviceScaleFactor: 1, mobile: larg < 810,
    });
    const ok = new Promise((r) => c.ao('Page.loadEventFired', r));
    await c.enviar('Page.navigate', { url: base + rota });
    await Promise.race([ok, dormir(45000)]);
    // Assentar: o JS da barra roda no DOMContentLoaded e o tema pinta logo
    // depois. 2,5s é o mesmo tempo que os outros QA já usam.
    await dormir(2500);
    const t = await c.enviar('Page.captureScreenshot', {
      format: 'png', clip: { x: 0, y: 0, width: larg, height: FAIXA, scale: 1 },
    });
    const g = await c.enviar('Runtime.evaluate', { expression: SONDA, returnByValue: true });
    return { png: Buffer.from(t.data, 'base64'), geo: g.result.value };
  }

  // Pixels que diferem entre dois PNGs, como Set de índices.
  function diferentes(a, b) {
    const s = new Set();
    if (a.larg !== b.larg || a.alt !== b.alt) return null;
    for (let y = 0; y < a.alt; y++) {
      for (let x = 0; x < a.larg; x++) {
        const pa = pixel(a, x, y), pb = pixel(b, x, y);
        if (pa[0] !== pb[0] || pa[1] !== pb[1] || pa[2] !== pb[2]) s.add(y * a.larg + x);
      }
    }
    return s;
  }

  const linhas = [];
  let reprovados = 0;
  for (const rota of ROTAS) {
    for (const larg of LARGURAS) {
      const a1 = await visitar(REF, rota, larg);
      const a2 = await visitar(REF, rota, larg);
      const b1 = await visitar(NOVO, rota, larg);
      const b2 = await visitar(NOVO, rota, larg);

      const pa1 = lerPNG(a1.png), pa2 = lerPNG(a2.png), pb1 = lerPNG(b1.png), pb2 = lerPNG(b2.png);
      const ruidoA = diferentes(pa1, pa2), ruidoB = diferentes(pb1, pb2), entre = diferentes(pa1, pb1);
      if (!ruidoA || !ruidoB || !entre) {
        linhas.push({ rota, larg, erro: 'capturas de tamanhos diferentes' });
        reprovados++;
        continue;
      }
      let reais = 0, maior = 0;
      for (const i of entre) {
        if (ruidoA.has(i) || ruidoB.has(i)) continue;
        reais++;
        const x = i % pa1.larg, y = Math.floor(i / pa1.larg);
        const p = pixel(pa1, x, y), q = pixel(pb1, x, y);
        const d = Math.max(Math.abs(p[0] - q[0]), Math.abs(p[1] - q[1]), Math.abs(p[2] - q[2]));
        if (d > maior) maior = d;
      }

      // Geometria: comparação de texto, exata. O ruído do rasterizador não
      // alcança aqui — número é número.
      const geoIgual = a1.geo === b1.geo;
      const total = pa1.larg * pa1.alt;
      linhas.push({ rota, larg, total, reais, maior, ruido: ruidoA.size + ruidoB.size, geoIgual });
      if (reais || !geoIgual) {
        reprovados++;
        const nome = (rota === '/' ? 'home' : rota.slice(1).replace(/\//g, '-')) + '-' + larg;
        fs.writeFileSync(path.join(SAIDA, nome + '-referencia.png'), a1.png);
        fs.writeFileSync(path.join(SAIDA, nome + '-novo.png'), b1.png);
        if (!geoIgual) {
          fs.writeFileSync(path.join(SAIDA, nome + '-geometria.txt'),
            'REFERENCIA ' + REF + '\n' + a1.geo + '\n\nNOVO ' + NOVO + '\n' + b1.geo + '\n');
        }
      }
    }
  }

  console.log('faixa de ' + FAIXA + 'px  |  referência ' + REF + '  |  candidato ' + NOVO);
  console.log('  rota          larg   pixels diferentes fora do ruído   geometria');
  for (const l of linhas) {
    if (l.erro) { console.log('  ' + l.rota.padEnd(13) + String(l.larg).padStart(5) + '  ' + l.erro); continue; }
    console.log('  ' + l.rota.padEnd(13) + String(l.larg).padStart(5)
      + '  ' + String(l.reais).padStart(7) + ' de ' + String(l.total).padStart(7)
      + (l.reais ? '  (maior canal ' + l.maior + ')' : '                ')
      + '   ' + (l.geoIgual ? 'idêntica' : 'MUDOU')
      + '   [ruído do texto: ' + l.ruido + ' px]');
  }
  console.log(reprovados
    ? '\n[FALHA] a barra mudou em ' + reprovados + ' caso(s)'
    : '\n[OK] barra idêntica em todos os casos — pixel e geometria');

  c.fechar();
  proc.kill();
  process.exit(reprovados ? 1 : 0);
})().catch((e) => { console.error('FALHOU:', e.message); process.exit(2); });
