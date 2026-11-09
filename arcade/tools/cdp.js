/*
 * 真实浏览器驱动（CDP，零依赖，Node 22 内置 WebSocket）
 * 不注入任何垫片、不冻结虚拟时间 —— 就是用户在浏览器里点的那种环境。
 *
 * 用法：
 *   node tools/cdp.js probe games/mines.html            # 打开页面，读状态
 *   node tools/cdp.js click games/mines.html ".cell"    # 点第一个匹配元素
 *   node tools/cdp.js shot  games/mines.html out.png    # 截图
 */
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9333;

let seq = 0;
const pending = new Map();
const runners = new Map();   // sessionId -> 报错收集器
let ws = null;

/* 必须一连接就装上，否则第一条命令的回复会被丢掉 */
function installDispatcher() {
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
      return;
    }
    const sink = msg.sessionId && runners.get(msg.sessionId);
    if (!sink) return;
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      sink.push('EXC ' + ((d.exception && d.exception.description) || d.text) + ' @L' + d.lineNumber);
    } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      sink.push('ERR ' + msg.params.args.map(a => a.value || a.description || '').join(' '));
    } else if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
      sink.push('LOG ' + msg.params.entry.text + ' ' + (msg.params.entry.url || ''));
    }
  };
}

function send(method, params = {}, sessionId) {
  return new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify(sessionId ? { id, method, params, sessionId } : { id, method, params }));
    setTimeout(() => {
      if (pending.has(id)) { pending.delete(id); reject(new Error('timeout ' + method)); }
    }, 30000);
  });
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function getWsUrl() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      const j = await r.json();
      return j.webSocketDebuggerUrl;
    } catch (e) { await wait(250); }
  }
  throw new Error('chrome 没起来');
}

function launch() {
  const userDir = path.join(require('os').tmpdir(), 'cdp-arcade-' + Date.now());
  const args = [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
    '--disable-extensions', '--mute-audio',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--window-size=390,844',
    `--user-data-dir=${userDir}`,
    `--remote-debugging-port=${PORT}`,
    'about:blank'
  ];
  const p = execFile(CHROME, args, { maxBuffer: 1e8 });
  p.on('error', (e) => { console.error('chrome 启动失败', e.message); process.exit(1); });
  return p;
}

async function openPage(url) {
  const t = await send('Target.createTarget', { url: 'about:blank' });
  const targetId = t.targetId;
  const a = await send('Target.attachToTarget', { targetId, flatten: true });
  const sessionId = a.sessionId;
  const logs = [];
  runners.set(sessionId, logs);
  await send('Runtime.enable', {}, sessionId);
  await send('Log.enable', {}, sessionId);
  await send('Page.enable', {}, sessionId);
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390, height: 844, deviceScaleFactor: 1, mobile: true
  }, sessionId);
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, sessionId);
  await send('Page.navigate', { url }, sessionId);
  await wait(1200);
  return { sessionId, logs };
}

async function evaluate(sessionId, expr) {
  const r = await send('Runtime.evaluate', {
    expression: expr, returnByValue: true, awaitPromise: true
  }, sessionId);
  if (r.exceptionDetails) return { __err: r.exceptionDetails.exception && r.exceptionDetails.exception.description };
  return r.result.value;
}

async function shot(sessionId, out) {
  const r = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  fs.writeFileSync(out, Buffer.from(r.data, 'base64'));
  return out;
}

async function connect(){
  const wsUrl = await getWsUrl();
  ws = new WebSocket(wsUrl);
  await new Promise(function(res, rej){ ws.onopen = res; ws.onerror = rej; });
  installDispatcher();
  return ws;
}

module.exports = { launch, connect, openPage, evaluate, shot, send, wait, ROOT, PORT };

/* ---------- CLI ---------- */
if (require.main === module) {
  (async () => {
    const [cmd, rel, arg1, arg2] = process.argv.slice(2);
    const file = path.join(ROOT, rel);
    const proc = launch();
    try {
      const wsUrl = await getWsUrl();
      ws = new WebSocket(wsUrl);
      await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
      installDispatcher();
      const { sessionId, logs } = await openPage('file:///' + file.replace(/\\/g, '/'));

      if (cmd === 'shot') {
        await shot(sessionId, path.join(ROOT, arg1 || '_shot.png'));
      } else if (cmd === 'click') {
        const box = await evaluate(sessionId, `(function(){
          var e = document.querySelector(${JSON.stringify(arg1)});
          if(!e) return null;
          var r = e.getBoundingClientRect();
          return {x: r.left + r.width/2, y: r.top + r.height/2, w: r.width, h: r.height};
        })()`);
        if (!box) console.log('找不到', arg1);
        else {
          for (const type of ['mousePressed', 'mouseReleased']) {
            await send('Input.dispatchMouseEvent', {
              type, x: box.x, y: box.y, button: 'left', clickCount: 1, pointerType: 'mouse'
            }, sessionId);
          }
        }
        await wait(600);
        await shot(sessionId, path.join(ROOT, arg2 || '_shot.png'));
      } else {
        const info = await evaluate(sessionId, `(function(){
          var out = {
            title: document.title,
            nodes: document.querySelectorAll('*').length,
            text: (document.body.innerText || '').replace(/\\s+/g, ' ').slice(0, 300),
            btns: [...document.querySelectorAll('button')].map(b => b.innerText.trim() + ':' + Math.round(b.getBoundingClientRect().height)),
            canvas: [...document.querySelectorAll('canvas')].map(c => c.width + 'x' + c.height + '@' + Math.round(c.getBoundingClientRect().width) + 'x' + Math.round(c.getBoundingClientRect().height)),
            stageScroll: (function(){ var s = document.querySelector('.stage'); return s ? s.scrollHeight + '/' + s.clientHeight : '-'; })()
          };
          return out;
        })()`);
        console.log(JSON.stringify(info, null, 1));
      }
      console.log('--- 报错 ---');
      console.log(logs.length ? logs.join('\n') : '(无)');
    } finally {
      try { proc.kill(); } catch (e) {}
    }
    process.exit(0);
  })();
}
