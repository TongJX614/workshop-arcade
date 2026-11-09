/* 深测：2048 / 打砖块 / 五子棋（双人）—— 只看逻辑是否真的对，不只看有没有报错
   结果通过 document.title 回传，用 chrome --dump-dom 读取 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = 'C:/Users/tongj/Desktop/游戏/arcade';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const TILE_CHECK = `
  function tileState(){
    const tiles = [...document.querySelectorAll('.tile')];
    const pos = new Set();
    const vals = [];
    let dup = '';
    tiles.forEach(t => {
      const k = t.style.transform;
      if(pos.has(k)) dup = k;
      pos.add(k);
      vals.push(+t.firstChild.textContent);
    });
    return { n: tiles.length, dup: dup, vals: vals };
  }
`;

const CASES = {
  '2048': { budget: 26000, script: `
    await wait(700);
    ${TILE_CHECK}
    const keys = ['ArrowLeft','ArrowUp','ArrowRight','ArrowDown','ArrowLeft','ArrowDown','ArrowRight','ArrowUp'];
    let bad = '';
    for(let i = 0; i < 90; i++){
      document.dispatchEvent(new KeyboardEvent('keydown', { key: keys[i % keys.length], bubbles: true }));
      await wait(125);
      const st = tileState();
      if(st.n > 16) bad = 'tiles>16@' + i;
      if(st.dup) bad = 'overlap@' + i + ' ' + st.dup;
      if(st.n === 0) bad = 'empty@' + i;
      if(st.vals.some(v => !v || (v & (v - 1)) !== 0)) bad = 'notPow2@' + i + ' ' + st.vals.join(',');
      if(bad) break;
    }
    // 连打：不等动画，考验输入队列
    for(let i = 0; i < 40; i++){
      document.dispatchEvent(new KeyboardEvent('keydown', { key: keys[i % 4], bubbles: true }));
    }
    await wait(1600);
    const st2 = tileState();
    if(st2.n > 16) bad += ' burst>16';
    if(st2.dup) bad += ' burstOverlap:' + st2.dup;
    const score = +document.getElementById('uiScore').textContent.replace(/[^0-9]/g, '');
    return 'score=' + score + ' tiles=' + st2.n + ' max=' + Math.max.apply(null, st2.vals) +
      ' best=' + document.getElementById('uiBest').textContent +
      (bad ? ' BAD:' + bad : '');
  ` },
  'breakout': { budget: 60000, pre: `
    // headless 虚拟时间下 rAF 不推进，换成 setTimeout 驱动，才能真正跑物理
    (function(){
      var t = 0;
      window.requestAnimationFrame = function(cb){
        return setTimeout(function(){ t += 16; cb(t); }, 16);
      };
      window.__ball = null;
      var arc = CanvasRenderingContext2D.prototype.arc;
      CanvasRenderingContext2D.prototype.arc = function(x, y, r){
        if(r > 3 && r < 20) window.__ball = { x: x, y: y, r: r };
        return arc.apply(this, arguments);
      };
    })();
  `, script: `
    await wait(700);
    const btn = document.getElementById('btnPlay');
    const frame = document.getElementById('frame');
    const score = () => +document.getElementById('uiScore').textContent.replace(/[^0-9]/g, '');
    const lives = () => +document.getElementById('uiLives').textContent;
    btn.click();                                  // 开始
    await wait(200);
    const labelRun = btn.textContent;

    // 跟着球跑：把板子始终停在球下方，让这一局能一直打下去
    let out = 0, maxScore = 0;
    const rc = frame.getBoundingClientRect();
    for(let i = 0; i < 560; i++){
      const b = window.__ball;
      if(b){
        const r2 = frame.getBoundingClientRect();
        const off = 40 * Math.sin(i / 6);
        frame.dispatchEvent(new PointerEvent('pointermove', {
          clientX: r2.left + b.x + off, clientY: r2.top + r2.height * .8,
          pointerType: 'touch', bubbles: true
        }));
        // 越界检查（球心不该跑出框）
        if(b.x < -2 || b.x > r2.width + 2 || b.y < -20 || b.y > r2.height + 20) out++;
      }
      await wait(40);
      maxScore = Math.max(maxScore, score());
    }

    const st1 = score() + '/' + lives() + '/第' + document.getElementById('uiStage').textContent + '层';
    let pauseLabel = 'n/a';
    if(btn.textContent === '暂停'){ btn.click(); await wait(120); pauseLabel = btn.textContent; }
    await wait(300);
    if(btn.textContent === '继续') btn.click();
    await wait(400);
    const tip = document.getElementById('tip').textContent;
    return 'start=' + labelRun + ' pause=' + pauseLabel + ' resume=' + btn.textContent +
      ' st=' + st1 + ' max=' + maxScore + ' outOfBounds=' + out + ' tip=' + tip;
  ` },
  'brdiag': { src: 'breakout', budget: 30000, pre: `
    (function(){
      var t = 0;
      window.requestAnimationFrame = function(cb){ return setTimeout(function(){ t += 16; cb(t); }, 16); };
      window.__ball = null;
      var arc = CanvasRenderingContext2D.prototype.arc;
      CanvasRenderingContext2D.prototype.arc = function(x, y, r){
        if(r > 3 && r < 20) window.__ball = { x: x, y: y, r: r };
        return arc.apply(this, arguments);
      };
    })();
  `, script: `
    await wait(600);
    document.getElementById('btnPlay').click();
    await wait(200);
    const frame = document.getElementById('frame');
    const trace = [];
    for(let i = 0; i < 40; i++){
      const b = window.__ball;
      const r2 = frame.getBoundingClientRect();
      if(b){
        frame.dispatchEvent(new PointerEvent('pointermove', {
          clientX: r2.left + b.x + 26, clientY: r2.top + r2.height * .8, pointerType: 'touch', bubbles: true }));
        trace.push(Math.round(b.x) + ',' + Math.round(b.y));
      }
      await wait(150);
    }
    return 'w=' + Math.round(frame.getBoundingClientRect().width) + ' score=' + document.getElementById('uiScore').textContent +
      ' trace=' + trace.join(' ');
  ` },
  'brframe': { src: 'breakout', budget: 24000, pre: `
    (function(){
      var t = 0;
      window.requestAnimationFrame = function(cb){ return setTimeout(function(){ t += 16; cb(t); }, 16); };
      window.__ball = null;
      var arc = CanvasRenderingContext2D.prototype.arc;
      CanvasRenderingContext2D.prototype.arc = function(x, y, r){
        if(r > 3 && r < 20) window.__ball = { x: x, y: y, r: r };
        return arc.apply(this, arguments);
      };
    })();
  `, script: `
    await wait(600);
    document.getElementById('btnPlay').click();
    await wait(200);
    const frame = document.getElementById('frame');
    const pts = [];
    for(let i = 0; i < 120; i++){
      const b = window.__ball;
      if(b){
        const r2 = frame.getBoundingClientRect();
        frame.dispatchEvent(new PointerEvent('pointermove', {
          clientX: r2.left + b.x + 26, clientY: r2.top + r2.height * .8, pointerType: 'touch', bubbles: true }));
        pts.push(b.x.toFixed(1) + ',' + b.y.toFixed(1));
      }
      await wait(20);
    }
    // 打印后 40 帧的逐帧位移
    const tail = pts.slice(-40).map(function(p0, i, arr){
      if(i === 0) return '';
      const a = arr[i-1].split(',').map(Number), b2 = p0.split(',').map(Number);
      return (b2[0]-a[0]).toFixed(1) + ':' + (b2[1]-a[1]).toFixed(1);
    }).join(' ');
    return 'score=' + document.getElementById('uiScore').textContent + ' last40=' + tail;
  ` },
  'brstage': { src: 'breakout', budget: 160000, pre: `
    (function(){
      var t = 0;
      window.requestAnimationFrame = function(cb){ return setTimeout(function(){ t += 16; cb(t); }, 16); };
      window.__ball = null;
      var arc = CanvasRenderingContext2D.prototype.arc;
      CanvasRenderingContext2D.prototype.arc = function(x, y, r){
        if(r > 3 && r < 20) window.__ball = { x: x, y: y, r: r };
        return arc.apply(this, arguments);
      };
    })();
  `, script: `
    await wait(600);
    document.getElementById('btnPlay').click();
    await wait(200);
    const frame = document.getElementById('frame');
    let stages = new Set(), log = [];
    for(let i = 0; i < 1400; i++){
      const b = window.__ball;
      if(b){
        const r2 = frame.getBoundingClientRect();
        const off = 44 * Math.sin(i / 5.5);
        frame.dispatchEvent(new PointerEvent('pointermove', {
          clientX: r2.left + b.x + off, clientY: r2.top + r2.height * .8,
          pointerType: 'touch', bubbles: true }));
      }
      const play = document.getElementById('btnPlay');
      if(play.textContent === '继续') play.click();       // 掉球后自动续命
      const st = document.getElementById('uiStage').textContent;
      if(!stages.has(st)){ stages.add(st); log.push('t' + i + '→第' + st + '层(分' + document.getElementById('uiScore').textContent + ')'); }
      await wait(40);
    }
    return 'stages=' + [...stages].join('/') + ' log=' + log.join(' ') +
      ' score=' + document.getElementById('uiScore').textContent +
      ' lives=' + document.getElementById('uiLives').textContent;
  ` },
  'brclear': { src: 'breakout', budget: 60000,
    patch: [['const COLS = 8, ROWS = 5;', 'const COLS = 3, ROWS = 1;']],
    pre: `
    (function(){
      var t = 0;
      window.requestAnimationFrame = function(cb){ return setTimeout(function(){ t += 16; cb(t); }, 16); };
      window.__ball = null;
      var arc = CanvasRenderingContext2D.prototype.arc;
      CanvasRenderingContext2D.prototype.arc = function(x, y, r){
        if(r > 3 && r < 20) window.__ball = { x: x, y: y, r: r };
        return arc.apply(this, arguments);
      };
    })();
  `, script: `
    await wait(600);
    document.getElementById('btnPlay').click();
    await wait(200);
    const frame = document.getElementById('frame');
    let firstStage2 = -1, text = '';
    for(let i = 0; i < 700; i++){
      const b = window.__ball;
      if(b){
        const r2 = frame.getBoundingClientRect();
        const off = 46 * Math.sin(i / 4);
        frame.dispatchEvent(new PointerEvent('pointermove', {
          clientX: r2.left + b.x + off, clientY: r2.top + r2.height * .8,
          pointerType: 'touch', bubbles: true }));
      }
      const play = document.getElementById('btnPlay');
      if(play.textContent === '继续') play.click();
      if(firstStage2 < 0 && document.getElementById('uiStage').textContent === '2'){
        firstStage2 = i;
        text = document.getElementById('tip').textContent + '|分' + document.getElementById('uiScore').textContent;
      }
      await wait(40);
    }
    return 'stage=' + document.getElementById('uiStage').textContent +
      ' at=' + firstStage2 + ' tip=' + text +
      ' score=' + document.getElementById('uiScore').textContent;
  ` },
  'g2048win': { src: '2048', budget: 30000,
    patch: [['if(mx >= 2048 && !S.won){', 'if(mx >= 64 && !S.won){']],
    script: `
    await wait(600);
    const keys = ['ArrowLeft','ArrowDown','ArrowRight','ArrowDown','ArrowUp','ArrowLeft'];
    let seen = '';
    for(let i = 0; i < 220 && !seen; i++){
      document.dispatchEvent(new KeyboardEvent('keydown', { key: keys[i % keys.length], bubbles: true }));
      await wait(130);
      const ov = document.querySelector('.overlay.show');
      if(ov) seen = ov.querySelector('h2').textContent + ' / ' + (ov.querySelector('.sub') || {}).textContent;
    }
    return 'plate=' + (seen || 'none') + ' max=' + document.getElementById('uiMax').textContent +
      ' score=' + document.getElementById('uiScore').textContent;
  ` },
  'gomoku': { budget: 24000, script: `
    await wait(800);
    const seg = document.getElementById('segMode');
    const board = document.getElementById('board');
    const rec = () => 'n=' + document.querySelectorAll('.stone').length +
      ' turn=' + document.getElementById('uiTurn').textContent.trim() +
      ' cls=' + [...document.querySelectorAll('.stone')].map(s => s.classList.contains('b') ? 'b' : 'w').join('');
    [...seg.children][1].click();                 // 切到双人
    await wait(300);
    const mode0 = rec();
    const b = board.getBoundingClientRect();
    const tapAt = (dx, dy) => board.dispatchEvent(new MouseEvent('click', {
      clientX: b.left + b.width * dx, clientY: b.top + b.height * dy, bubbles: true }));
    tapAt(.50, .50); await wait(250);
    const m1 = rec();
    tapAt(.42, .50); await wait(250);
    const m2 = rec();
    tapAt(.58, .50); await wait(250);
    const m3 = rec();
    document.getElementById('btnUndo').click(); await wait(250);
    const u1 = rec();
    [...seg.children][0].click();                 // 切回人机
    await wait(300);
    const ai0 = rec();
    tapAt(.50, .45); await wait(700);
    const ai1 = rec();
    return 'init=' + mode0 + ' | 黑:' + m1 + ' | 白:' + m2 + ' | 黑2:' + m3 +
      ' | 悔:= ' + u1 + ' | 人机:' + ai0 + ' → ' + ai1;
  ` }
};

const PRELUDE = `<script>
window.__err = [];
window.addEventListener('error', function(e){ window.__err.push((e.message || String(e.error)) + ' @L' + e.lineno); });
window.addEventListener('unhandledrejection', function(e){ window.__err.push('promise:' + (e.reason && e.reason.message || e.reason)); });
</script>`;

function build(name, cfg){
  const src = path.join(ROOT, 'games', (cfg.src || name) + '.html');
  let html = fs.readFileSync(src, 'utf8');
  (cfg.patch || []).forEach(function(pair){
    if(html.indexOf(pair[0]) < 0) throw new Error('patch miss: ' + pair[0].slice(0, 40));
    html = html.split(pair[0]).join(pair[1]);
  });
  html = html.replace('</head>', PRELUDE + (cfg.pre ? '<script>' + cfg.pre + '</script>' : '') + '</head>');
  const tail = `<script>
(async function(){
  var wait = function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
  function report(msg){
    document.title = (window.__err.length ? 'ERR[' + window.__err.slice(0,2).join(' / ') + '] ' : 'OK ') + msg;
  }
  var out = await (async function(){
    ${cfg.script}
  })().catch(function(e){ return 'THROW:' + e.message; });
  report(out);
})();
</script>`;
  html = html.replace('</body>', tail + '</body>');
  const out = path.join(ROOT, 'games', '_d_' + name + '.html');
  fs.writeFileSync(out, html);
  return out;
}

function run(file, budget){
  const out = execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-sandbox',
    '--window-size=420,900',
    '--virtual-time-budget=' + budget, '--dump-dom',
    'file:///' + file.replace(/\\/g, '/')
  ], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: budget + 30000, stdio: ['ignore', 'pipe', 'ignore'] });
  const m = out.match(/<title>([\s\S]*?)<\/title>/);
  return m ? m[1].trim() : '(no title)';
}

(function(){
  const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(CASES);
  let fail = 0;
  for(const name of names){
    const cfg = CASES[name];
    if(!cfg){ console.log(name, '-> 未定义用例'); continue; }
    const file = build(name, cfg);
    let res = '';
    try{ res = run(file, cfg.budget); }catch(e){ res = 'CHROME_FAIL:' + e.message.slice(0, 120); }
    const ok = res.startsWith('OK ') && !res.includes('BAD:') && !res.includes('THROW');
    if(!ok) fail++;
    console.log((ok ? '✔ ' : '✘ ') + name.padEnd(9), res);
  }
  console.log(fail ? ('失败 ' + fail + ' 项') : '全部通过');
  process.exit(fail ? 1 : 0);
})();
