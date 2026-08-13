// O CONTROLE DE CONTA, DE PONTA A PONTA — menu, cadastro, sessão, sacola.
//
//   node tools/qa-perfil.js
//   LARGURAS=390 node tools/qa-perfil.js
//
// Roteiro, na ordem em que uma pessoa faria:
//   1. o botão existe na navbar, com 44px de alvo, e recebe o clique;
//   2. o painel abre com "Entrar / Criar conta / Carrinho" (desconectado);
//   3. o menu hambúrguer e o de perfil não ficam abertos ao mesmo tempo;
//   4. criar conta: campo vazio, e-mail torto, senha curta, senhas diferentes
//      — cada erro com a sua frase — e depois o caminho feliz;
//   5. a senha NÃO está no localStorage em lugar nenhum;
//   6. recarregar a página mantém a sessão;
//   7. o painel logado traz nome, e-mail, Carrinho e Sair;
//   8. adicionar à sacola acende o selo, e o número bate;
//   9. Sair encerra e a interface volta na hora, sem recarregar;
//  10. entrar de novo com a senha certa funciona, com a errada não, e as duas
//      falhas (e-mail inexistente e senha errada) dizem a MESMA frase;
//  11. Escape, clique fora e Tab preso no cartão.
//
// ⚠️ A ARMADILHA QUE ESTE ARQUIVO JÁ PISOU DUAS VEZES: existem DOIS botões de
// perfil no DOM, um por variante de navbar do template, e o primeiro é o da
// variante oculta (0x0). `document.querySelector('[data-mel-perfil]')` devolve
// justamente ele, e clicar nele clica em (0,0): o painel não abre e parece
// defeito do site. Sempre filtrar por offsetHeight > 0.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { CDP, pegarJSON, esperarDevTools } = require('./cdp');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = process.env.BASE_URL || 'http://localhost:3030';
const PORTA = 9333 + (Number(process.env.PORTA_OFF) || 97);
const LARGURAS = (process.env.LARGURAS || '1440,390').split(',').map(Number);
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

const VISIVEL = "[].slice.call(document.querySelectorAll('[data-mel-perfil]')).filter(function(e){return e.offsetHeight>0})[0]";

(async () => {
  const perfil = path.join(process.env.TEMP || '.', 'edge-qa-perfil');
  const edge = spawn(EDGE, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-port=' + PORTA, '--user-data-dir=' + perfil, 'about:blank'], { stdio: 'ignore' });
  await esperarDevTools(PORTA);
  const alvos = await pegarJSON(PORTA, '/json/list');
  const c = await CDP.conectar(alvos.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await c.enviar('Page.enable'); await c.enviar('Runtime.enable'); await c.enviar('Log.enable');

  let consoleErros = [];
  c.ao('Log.entryAdded', (e) => { if (e.entry && e.entry.level === 'error') consoleErros.push(e.entry.text.slice(0, 160)); });
  c.ao('Runtime.exceptionThrown', (e) => consoleErros.push('exceção JS: '
    + ((e.exceptionDetails && e.exceptionDetails.text) || '').slice(0, 120)));

  const av = async (e) => {
    const r = await c.enviar('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true });
    return r.exceptionDetails ? { erro: JSON.stringify(r.exceptionDetails).slice(0, 300) } : r.result.value;
  };
  const ir = async (rota) => {
    const ok = new Promise((r) => c.ao('Page.loadEventFired', r));
    await c.enviar('Page.navigate', { url: BASE + rota });
    await Promise.race([ok, dormir(30000)]);
    await dormir(2200);
  };
  const clicarEm = async (expr) => {
    const pt = await av('(function(){var e=' + expr + ';if(!e)return null;var b=e.getBoundingClientRect();'
      + 'return {x:Math.round(b.x+b.width/2),y:Math.round(b.y+b.height/2)};})()');
    if (!pt) return false;
    for (const type of ['mousePressed', 'mouseReleased']) {
      await c.enviar('Input.dispatchMouseEvent', { type, x: pt.x, y: pt.y, button: 'left', clickCount: 1 });
    }
    await dormir(650);
    return true;
  };
  const tecla = async (key, code, vk) => {
    await c.enviar('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: vk });
    await c.enviar('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk });
    await dormir(320);
  };
  const preencher = async (id, valor) => av(`(function(){
    var e=document.getElementById(${JSON.stringify(id)}); if(!e) return false;
    var s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
    s.call(e, ${JSON.stringify(valor)});
    e.dispatchEvent(new Event('input',{bubbles:true}));
    e.dispatchEvent(new Event('change',{bubbles:true}));
    e.dispatchEvent(new FocusEvent('blur'));
    return true; })()`);
  const enviar = async () => {
    await av("(function(){document.querySelector('.mel-acesso-enviar').click();})()");
    await dormir(1400);   // PBKDF2 de 210k iterações não é instantâneo, e é de propósito
  };

  const destinoFotos = path.join(__dirname, 'shots-perfil');
  fs.mkdirSync(destinoFotos, { recursive: true });
  const foto = async (nome) => {
    const s = await c.enviar('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(destinoFotos, nome + '.png'), Buffer.from(s.data, 'base64'));
  };

  const resultados = [];
  const falhas = [];
  const conferir = (nome, ok, detalhe) => {
    resultados.push({ nome, ok: !!ok, detalhe });
    if (!ok) falhas.push(nome + (detalhe ? ' — ' + detalhe : ''));
  };

  for (const w of LARGURAS) {
    consoleErros = [];
    await c.enviar('Emulation.setDeviceMetricsOverride', { width: w, height: 900, deviceScaleFactor: 1, mobile: w < 810 });
    await ir('/bee');
    await av("(function(){try{localStorage.removeItem('melcam:contas');localStorage.removeItem('melcam:sessao');localStorage.removeItem('melcam:sacola');}catch(e){}})()");
    await ir('/bee');
    const t = (n) => '[' + w + '] ' + n;

    // 1. botão
    const bt = await av(`(function(){var b=${VISIVEL}; if(!b) return null;
      var r=b.getBoundingClientRect();
      var topo=document.elementFromPoint(Math.round(r.x+r.width/2),Math.round(r.y+r.height/2));
      return { w:Math.round(r.width), h:Math.round(r.height), x:Math.round(r.x),
               dentro: r.right<=innerWidth+1 && r.left>=-1,
               recebe: !!(topo&&(topo===b||b.contains(topo))),
               rotulo:b.getAttribute('aria-label'), haspopup:b.getAttribute('aria-haspopup'),
               expandido:b.getAttribute('aria-expanded'),
               noDom: document.querySelectorAll('[data-mel-perfil]').length }; })()`);
    conferir(t('botão de perfil na navbar'), bt && bt.recebe && bt.dentro, bt && JSON.stringify(bt));
    conferir(t('alvo de toque de 44px'), bt && bt.w >= 44 && bt.h >= 44, bt && bt.w + 'x' + bt.h);
    conferir(t('aria-haspopup e aria-expanded'), bt && bt.haspopup === 'menu' && bt.expandido === 'false');

    // 2. painel desconectado
    await clicarEm(VISIVEL);
    const p1 = await av(`(function(){var p=document.querySelector('.mel-perfil-menu'); if(!p) return {abriu:false};
      var b=p.getBoundingClientRect();
      return { abriu:true, itens:[].slice.call(p.querySelectorAll('[role="menuitem"]')).map(function(i){return i.textContent.trim()}),
               dentroDaTela: b.left>=-1 && b.right<=innerWidth+1,
               transbordo: document.documentElement.scrollWidth-innerWidth,
               foco: document.activeElement && document.activeElement.textContent.trim(),
               papel: p.getAttribute('role') }; })()`);
    conferir(t('painel abre desconectado com 3 opções'),
      p1.abriu && p1.itens.length === 3 && /Entrar/.test(p1.itens[0]) && /Criar conta/.test(p1.itens[1]) && /Carrinho/.test(p1.itens[2]),
      JSON.stringify(p1.itens));
    conferir(t('painel dentro da tela, sem transbordo'), p1.dentroDaTela && p1.transbordo <= 0, JSON.stringify(p1));
    conferir(t('foco vai para o primeiro item'), /Entrar/.test(p1.foco || ''), p1.foco);
    await foto('painel-deslogado-' + w);

    // 3. Escape fecha e devolve o foco
    await tecla('Escape', 'Escape', 27);
    const dep = await av(`(function(){ return { aberto: !!document.querySelector('.mel-perfil-menu'),
      focoNoBotao: document.activeElement === ${VISIVEL} }; })()`);
    conferir(t('Escape fecha e devolve o foco ao botão'), !dep.aberto && dep.focoNoBotao, JSON.stringify(dep));

    // 4. os dois menus não convivem
    await clicarEm(VISIVEL);
    await clicarEm("[].slice.call(document.querySelectorAll('[data-framer-name=\"Meniu\"]')).filter(function(e){return e.offsetHeight>0})[0]");
    const dois = await av(`(function(){ return { perfil: !!document.querySelector('.mel-perfil-menu'),
      nav: !!document.querySelector('.mel-menu') }; })()`);
    conferir(t('hambúrguer fecha o painel de perfil'), dois.nav && !dois.perfil, JSON.stringify(dois));
    await clicarEm(VISIVEL);
    const dois2 = await av(`(function(){ return { perfil: !!document.querySelector('.mel-perfil-menu'),
      nav: !!document.querySelector('.mel-menu') }; })()`);
    conferir(t('perfil fecha o hambúrguer'), dois2.perfil && !dois2.nav, JSON.stringify(dois2));

    // 5. modal de criar conta + validação
    await av("(function(){[].slice.call(document.querySelectorAll('.mel-perfil-item')).filter(function(e){return /Criar conta/.test(e.textContent)})[0].click();})()");
    await dormir(900);
    const m = await av(`(function(){var m=document.querySelector('.mel-acesso'); if(!m) return {abriu:false};
      var b=m.getBoundingClientRect();
      return { abriu:true, titulo:m.querySelector('.mel-acesso-tit').textContent,
               campos:[].slice.call(m.querySelectorAll('.mel-campo')).filter(function(x){return !x.hidden}).map(function(x){return x.getAttribute('data-campo')}),
               modal:m.getAttribute('aria-modal'), papel:m.getAttribute('role'),
               foco:document.activeElement&&document.activeElement.id,
               autoSenha:document.getElementById('mel-senha').getAttribute('autocomplete'),
               autoEmail:document.getElementById('mel-email').getAttribute('autocomplete'),
               cabe: b.left>=-1 && b.right<=innerWidth+1 && b.width<=innerWidth,
               transbordo: document.documentElement.scrollWidth-innerWidth }; })()`);
    conferir(t('modal de criar conta abre com os 4 campos'),
      m.abriu && m.campos.join(',') === 'nome,email,senha,confirma', JSON.stringify(m.campos));
    conferir(t('modal é dialog modal e cabe na tela'), m.modal === 'true' && m.papel === 'dialog' && m.cabe && m.transbordo <= 0, JSON.stringify(m));
    conferir(t('autocomplete correto no cadastro'), m.autoSenha === 'new-password' && m.autoEmail === 'email', m.autoSenha + '/' + m.autoEmail);
    conferir(t('foco inicial no primeiro campo'), m.foco === 'mel-nome', m.foco);

    // 5a. tudo vazio
    await enviar();
    const vazio = await av(`(function(){var m=document.querySelector('.mel-acesso');
      return { erros:['nome','email','senha','confirma'].map(function(n){return (m.querySelector('#mel-'+n+'-erro').textContent||'').slice(0,40)}),
               aviso:(m.querySelector('.mel-acesso-aviso').textContent||''),
               invalidos:m.querySelectorAll('[aria-invalid="true"]').length,
               contas:(localStorage.getItem('melcam:contas')||'') }; })()`);
    conferir(t('envio vazio: 4 erros, nada gravado'),
      vazio.erros.every(Boolean) && vazio.invalidos === 4 && !vazio.contas, JSON.stringify(vazio.erros));

    // 5b. e-mail torto, senha curta, confirmação diferente
    await preencher('mel-nome', 'Ana');
    await preencher('mel-email', 'ana@@exemplo');
    await preencher('mel-senha', 'abc');
    await preencher('mel-confirma', 'outra');
    await enviar();
    const torto = await av(`(function(){var m=document.querySelector('.mel-acesso');
      return { email:m.querySelector('#mel-email-erro').textContent,
               senha:m.querySelector('#mel-senha-erro').textContent,
               confirma:m.querySelector('#mel-confirma-erro').textContent,
               contas:(localStorage.getItem('melcam:contas')||'') }; })()`);
    conferir(t('e-mail inválido acusado'), /inv/i.test(torto.email), torto.email);
    conferir(t('senha curta acusada'), /8/.test(torto.senha), torto.senha);
    conferir(t('senhas diferentes acusadas'), /iguais/i.test(torto.confirma), torto.confirma);
    conferir(t('nada gravado enquanto há erro'), !torto.contas);
    await foto('modal-erros-' + w);

    // 5c. caminho feliz
    await preencher('mel-email', 'ana@exemplo.com');
    await preencher('mel-senha', 'colmeia2026');
    await preencher('mel-confirma', 'colmeia2026');
    await enviar();
    await dormir(1400);
    const criou = await av(`(function(){
      var cs=JSON.parse(localStorage.getItem('melcam:contas')||'[]');
      var s=JSON.parse(localStorage.getItem('melcam:sessao')||'null');
      var cru=JSON.stringify(localStorage);
      return { n:cs.length, conta:cs[0]&&{nome:cs[0].nome,email:cs[0].email,temHash:!!cs[0].hash,
               tamHash:cs[0].hash?cs[0].hash.length:0, temSal:!!cs[0].sal, it:cs[0].iteracoes,
               campos:Object.keys(cs[0])},
               sessao:s, senhaVazou: cru.indexOf('colmeia2026')>=0,
               modalAberto: !!document.querySelector('.mel-acesso') }; })()`);
    conferir(t('conta criada e sessão aberta'), criou.n === 1 && criou.sessao && criou.sessao.email === 'ana@exemplo.com', JSON.stringify(criou.sessao));
    conferir(t('senha NÃO está no armazenamento'), criou.senhaVazou === false, 'busca literal pela senha no localStorage');
    conferir(t('hash PBKDF2 de 256 bits com sal e iterações'),
      criou.conta && criou.conta.temHash && criou.conta.tamHash === 64 && criou.conta.temSal && criou.conta.it === 210000,
      criou.conta && JSON.stringify(criou.conta));
    conferir(t('modal fecha sozinho depois do sucesso'), criou.modalAberto === false);

    // 6. persistência
    await ir('/bee');
    const depoisDeRecarregar = await av(`(function(){var s=JSON.parse(localStorage.getItem('melcam:sessao')||'null');
      var b=${VISIVEL}; return { sessao:!!s, rotulo:b&&b.getAttribute('aria-label') }; })()`);
    conferir(t('sessão sobrevive ao recarregar'), depoisDeRecarregar.sessao && /Ana/.test(depoisDeRecarregar.rotulo || ''), JSON.stringify(depoisDeRecarregar));

    // 7. painel logado
    await clicarEm(VISIVEL);
    const p2 = await av(`(function(){var p=document.querySelector('.mel-perfil-menu'); if(!p) return {abriu:false};
      return { abriu:true, nome:p.querySelector('.mel-perfil-quem b')&&p.querySelector('.mel-perfil-quem b').textContent,
               email:p.querySelector('.mel-perfil-quem span')&&p.querySelector('.mel-perfil-quem span').textContent,
               itens:[].slice.call(p.querySelectorAll('[role="menuitem"]')).map(function(i){return i.textContent.trim()}) }; })()`);
    conferir(t('painel logado: nome, e-mail, Carrinho e Sair'),
      p2.abriu && p2.nome === 'Ana' && p2.email === 'ana@exemplo.com'
      && p2.itens.length === 2 && /Carrinho/.test(p2.itens[0]) && /Sair/.test(p2.itens[1]),
      JSON.stringify(p2));
    await foto('painel-logado-' + w);

    // 8. carrinho: o item leva à sacola e o selo conta
    const href = await av(`(function(){var a=[].slice.call(document.querySelectorAll('.mel-perfil-item'))
      .filter(function(e){return /Carrinho/.test(e.textContent)})[0]; return a&&a.getAttribute('href'); })()`);
    conferir(t('Carrinho aponta para /sacola'), href === '/sacola', String(href));
    await tecla('Escape', 'Escape', 27);
    await av(`(function(){ localStorage.setItem('melcam:sacola', JSON.stringify([{nome:'Bee Amarela',qtd:2}])); })()`);
    await ir('/bee');
    const selo = await av(`(function(){var s=document.querySelector('[data-mel-contador-selo]');
      var b=${VISIVEL};
      return { texto:s&&s.textContent, aceso:!!(s&&s.hasAttribute('data-tem')),
               rotulo:b&&b.getAttribute('aria-label') }; })()`);
    conferir(t('selo da sacola acende com o número'), selo.aceso && selo.texto === '2' && /2 na sacola/.test(selo.rotulo || ''), JSON.stringify(selo));

    // 9. sair
    await clicarEm(VISIVEL);
    await av("(function(){[].slice.call(document.querySelectorAll('.mel-perfil-item')).filter(function(e){return /Sair/.test(e.textContent)})[0].click();})()");
    await dormir(700);
    const saiu = await av(`(function(){var b=${VISIVEL};
      return { sessao: localStorage.getItem('melcam:sessao'), rotulo:b&&b.getAttribute('aria-label'),
               sacolaIntacta: !!localStorage.getItem('melcam:sacola') }; })()`);
    conferir(t('Sair encerra a sessão e a interface reage na hora'),
      !saiu.sessao && /Entrar ou criar conta/.test(saiu.rotulo || ''), JSON.stringify(saiu));
    conferir(t('Sair não apaga a sacola'), saiu.sacolaIntacta);

    // 10. entrar de novo
    await clicarEm(VISIVEL);
    await av("(function(){[].slice.call(document.querySelectorAll('.mel-perfil-item')).filter(function(e){return /^Entrar/.test(e.textContent.trim())})[0].click();})()");
    await dormir(800);
    await preencher('mel-email', 'ana@exemplo.com');
    await preencher('mel-senha', 'senhaerrada9');
    await enviar();
    const errada = await av("(function(){var m=document.querySelector('.mel-acesso'); return { aviso:m?m.querySelector('.mel-acesso-aviso').textContent:'(fechou)', sessao:localStorage.getItem('melcam:sessao') }; })()");
    conferir(t('senha errada não entra'), !errada.sessao && /incorretos/i.test(errada.aviso), JSON.stringify(errada));

    await preencher('mel-email', 'ninguem@exemplo.com');
    await preencher('mel-senha', 'colmeia2026');
    await enviar();
    const inexistente = await av("(function(){var m=document.querySelector('.mel-acesso'); return { aviso:m?m.querySelector('.mel-acesso-aviso').textContent:'(fechou)' }; })()");
    conferir(t('e-mail inexistente e senha errada dizem a mesma frase'),
      inexistente.aviso === errada.aviso, JSON.stringify([errada.aviso, inexistente.aviso]));

    await preencher('mel-email', 'ana@exemplo.com');
    await preencher('mel-senha', 'colmeia2026');
    await enviar();
    await dormir(1400);
    const entrou = await av(`(function(){var s=JSON.parse(localStorage.getItem('melcam:sessao')||'null');
      return { sessao:s, modal: !!document.querySelector('.mel-acesso') }; })()`);
    conferir(t('entrar com a senha certa funciona'), entrou.sessao && entrou.sessao.nome === 'Ana', JSON.stringify(entrou));

    // 11. clique fora fecha o cartão
    await clicarEm(VISIVEL);
    await tecla('Escape', 'Escape', 27);
    await av("(function(){try{localStorage.removeItem('melcam:sessao');}catch(e){}})()");
    await ir('/bee');
    await clicarEm(VISIVEL);
    await av("(function(){[].slice.call(document.querySelectorAll('.mel-perfil-item')).filter(function(e){return /^Entrar/.test(e.textContent.trim())})[0].click();})()");
    await dormir(800);
    await c.enviar('Input.dispatchMouseEvent', { type: 'mousePressed', x: 6, y: Math.round(880 * 0.5), button: 'left', clickCount: 1 });
    await c.enviar('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 6, y: Math.round(880 * 0.5), button: 'left', clickCount: 1 });
    await dormir(600);
    const fora = await av("(function(){ return { aberto: !!document.querySelector('.mel-acesso'), travaHtml: document.documentElement.style.overflow }; })()");
    conferir(t('clique fora fecha e destrava a rolagem'), !fora.aberto && fora.travaHtml !== 'hidden', JSON.stringify(fora));

    conferir(t('nenhum erro de console em todo o roteiro'), consoleErros.length === 0, consoleErros.slice(0, 3).join(' | '));
  }

  const destino = path.join(__dirname, 'shots-perfil');
  fs.mkdirSync(destino, { recursive: true });
  fs.writeFileSync(path.join(destino, 'qa-perfil.json'), JSON.stringify({ quando: new Date().toISOString(), resultados }, null, 2), 'utf8');

  resultados.forEach((r) => console.log((r.ok ? 'ok   ' : 'FALHA') + '  ' + r.nome + (r.ok ? '' : '  << ' + (r.detalhe || ''))));
  console.log('');
  console.log(resultados.filter((r) => r.ok).length + '/' + resultados.length + ' verificações passaram.');
  try { edge.kill(); } catch (e) {}
  process.exit(falhas.length ? 1 : 0);
})();
