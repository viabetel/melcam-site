// Cliente CDP mínimo: WebSocket na mão, sem dependência externa.
// Existe porque a extensão do Chrome não está disponível e o headless do Edge
// precisa ser dirigido por protocolo para scroll e medição.
const http = require('http');
const net = require('net');
const crypto = require('crypto');

function pegarJSON(porta, caminho) {
  return new Promise((ok, erro) => {
    http
      .get({ host: '127.0.0.1', port: porta, path: caminho }, (res) => {
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () => {
          try { ok(JSON.parse(d)); } catch (e) { erro(e); }
        });
      })
      .on('error', erro);
  });
}

async function esperarDevTools(porta, tentativas = 60) {
  for (let i = 0; i < tentativas; i++) {
    try { return await pegarJSON(porta, '/json/version'); }
    catch { await new Promise((r) => setTimeout(r, 250)); }
  }
  throw new Error('DevTools nao respondeu na porta ' + porta);
}

class CDP {
  constructor(sock) {
    this.sock = sock;
    this.id = 0;
    this.pendentes = new Map();
    this.eventos = new Map();
    this.buf = Buffer.alloc(0);
    this.frag = [];
    sock.on('data', (c) => this._dados(c));
  }

  static async conectar(wsUrl) {
    const u = new URL(wsUrl);
    const chave = crypto.randomBytes(16).toString('base64');
    const sock = net.connect(Number(u.port), u.hostname);
    await new Promise((ok, erro) => { sock.once('connect', ok); sock.once('error', erro); });
    sock.write(
      `GET ${u.pathname}${u.search} HTTP/1.1\r\n` +
      `Host: ${u.host}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n` +
      `Sec-WebSocket-Key: ${chave}\r\nSec-WebSocket-Version: 13\r\n\r\n`
    );
    // consome os cabeçalhos do handshake, guardando o que sobrar
    let cab = Buffer.alloc(0);
    await new Promise((ok, erro) => {
      const aoDado = (c) => {
        cab = Buffer.concat([cab, c]);
        const fim = cab.indexOf('\r\n\r\n');
        if (fim < 0) return;
        const cabeca = cab.slice(0, fim).toString();
        if (!/HTTP\/1\.1 101/.test(cabeca)) { sock.off('data', aoDado); return erro(new Error('handshake: ' + cabeca.split('\r\n')[0])); }
        sock.off('data', aoDado);
        const resto = cab.slice(fim + 4);
        const c2 = new CDP(sock);
        if (resto.length) c2._dados(resto);
        ok(c2);
      };
      sock.on('data', aoDado);
      sock.once('error', erro);
    }).then((c) => { this._inst = c; return c; });
    return this._inst;
  }

  _dados(chunk) {
    this.buf = Buffer.concat([this.buf, chunk]);
    for (;;) {
      if (this.buf.length < 2) return;
      const b0 = this.buf[0], b1 = this.buf[1];
      const fin = (b0 & 0x80) !== 0;
      const op = b0 & 0x0f;
      let tam = b1 & 0x7f, off = 2;
      if (tam === 126) { if (this.buf.length < 4) return; tam = this.buf.readUInt16BE(2); off = 4; }
      else if (tam === 127) { if (this.buf.length < 10) return; tam = Number(this.buf.readBigUInt64BE(2)); off = 10; }
      if (this.buf.length < off + tam) return;
      const carga = this.buf.slice(off, off + tam);
      this.buf = this.buf.slice(off + tam);
      if (op === 0x8) { this.sock.end(); return; }
      if (op === 0x9) { this._enviarFrame(0xa, carga); continue; }
      if (op === 0xa) continue;
      this.frag.push(carga);
      if (!fin) continue;
      const texto = Buffer.concat(this.frag).toString('utf8');
      this.frag = [];
      let msg; try { msg = JSON.parse(texto); } catch { continue; }
      if (msg.id != null && this.pendentes.has(msg.id)) {
        const { ok, erro } = this.pendentes.get(msg.id);
        this.pendentes.delete(msg.id);
        msg.error ? erro(new Error(msg.method + ' ' + JSON.stringify(msg.error))) : ok(msg.result);
      } else if (msg.method) {
        (this.eventos.get(msg.method) || []).forEach((f) => f(msg.params));
      }
    }
  }

  _enviarFrame(op, carga) {
    const n = carga.length;
    let cab;
    if (n < 126) { cab = Buffer.alloc(6); cab[1] = 0x80 | n; }
    else if (n < 65536) { cab = Buffer.alloc(8); cab[1] = 0x80 | 126; cab.writeUInt16BE(n, 2); }
    else { cab = Buffer.alloc(14); cab[1] = 0x80 | 127; cab.writeBigUInt64BE(BigInt(n), 2); }
    cab[0] = 0x80 | op;
    const mascara = crypto.randomBytes(4);
    mascara.copy(cab, cab.length - 4);
    const corpo = Buffer.from(carga);
    for (let i = 0; i < corpo.length; i++) corpo[i] ^= mascara[i & 3];
    this.sock.write(Buffer.concat([cab, corpo]));
  }

  enviar(method, params = {}, sessionId) {
    const id = ++this.id;
    const msg = { id, method, params };
    if (sessionId) msg.sessionId = sessionId;
    return new Promise((ok, erro) => {
      this.pendentes.set(id, { ok, erro });
      this._enviarFrame(0x1, Buffer.from(JSON.stringify(msg), 'utf8'));
    });
  }

  ao(evento, fn) {
    if (!this.eventos.has(evento)) this.eventos.set(evento, []);
    this.eventos.get(evento).push(fn);
  }

  fechar() { try { this.sock.end(); } catch {} }
}

module.exports = { CDP, pegarJSON, esperarDevTools };
