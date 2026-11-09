/*
 * 真实环境逐页实操：加载 → 点开始 → 操作一次 → 看画面有没有变化
 * 不注入 rAF 垫片、不冻结虚拟时间
 */
const path = require('path');
const { launch, connect, openPage, evaluate, shot, send, wait, ROOT } = require('./cdp');

/* 每页的“开始”与“主要操作”选择器 */
const PLAN = {
  'mines.html':      { hit: '.cell' },
  'sudoku.html':     { hit: '.cell' },
  'hanoi.html':      { hit: '.tower' },
  'ttt.html':        { hit: '.sq' },
  'reversi.html':    { hit: '.cell' },
  'pipes.html':      { hit: '.tile' },
  'nonogram.html':   { hit: '.cell' },
  'tf.html':         { hit: '.card' },
  'simon.html':      { start: true, hit: '.pad' },
  'wordle.html':     { hit: '.key' },
  'maze.html':       { hit: '.frame', canvas: true },
  'oneline.html':    { hit: '.dot' },
  'puzzle.html':     { hit: '.piece' },
  'match3.html':     { hit: '.tile' },
  'link.html':       { hit: '.cell' },
  'stack.html':      { start: true, hit: '.frame', canvas: true },
  'whack.html':      { start: true, hit: '.hole' },
  'pong.html':       { start: true, hit: '.frame', canvas: true },
  'invaders.html':   { start: true, hit: '.frame', canvas: true },
  'runner.html':     { start: true, hit: '.frame', canvas: true },
  'catch.html':      { start: true, hit: '.frame', canvas: true },
  'reaction.html':   { hit: '.pad' },
  'hoops.html':      { hit: '.frame', canvas: true },
  'flappy.html':     { start: true, hit: '.frame', canvas: true },
  'math.html':       { hit: '.opt' },
  'nummem.html':     { hit: '.key' },
  'spot.html':       { hit: '.panel' },
  'klotski.html':    { hit: '.blk' },
  'mastermind.html': { hit: '.sw' },
  'slice.html':      { start: true, hit: '.frame', canvas: true },
};

const CENTER = `(function(sel){
  var e = document.querySelector(sel);
  if(!e) return null;
  var r = e.getBoundingClientRect();
  if(r.width < 1 || r.height < 1) return null;
  return { x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) };
})`;

async function clickAt(sid, pt) {
  if (!pt) return false;
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: pt.x, y: pt.y, button: 'left', clickCount: 1, pointerType: 'mouse' }, sid);
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: pt.x, y: pt.y, button: 'left', clickCount: 1, pointerType: 'mouse' }, sid);
  return true;
}

async function swipeAt(sid, pt) {
  if (!pt) return false;
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: pt.x - 60, y: pt.y, button: 'left', clickCount: 1, pointerType: 'mouse' }, sid);
  for (let i = 1; i <= 6; i++) {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: pt.x - 60 + i * 20, y: pt.y + i * 4, button: 'left', buttons: 1, pointerType: 'mouse' }, sid);
    await wait(30);
  }
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: pt.x + 60, y: pt.y + 24, button: 'left', clickCount: 1, pointerType: 'mouse' }, sid);
  return true;
}

async function run(names) {
  const proc = launch();
  await connect();
  for (const name of names) {
    const rel = 'games/' + name;
    const plan = PLAN[name] || { hit: 'body' };
    let rec = { name };
    try {
      const { sessionId, logs } = await openPage('file:///' + path.join(ROOT, rel).replace(/\\/g, '/'));
      await wait(700);
      const before = await evaluate(sessionId, `(function(){
        var c = document.querySelector('canvas');
        return {
          txt: (document.body.innerText||'').replace(/\\s+/g,' ').slice(0,60),
          nodes: document.querySelectorAll('*').length,
          cw: c ? c.getBoundingClientRect().width : 0,
          ch: c ? c.getBoundingClientRect().height : 0,
          pix: c ? c.toDataURL().length : 0
        };
      })()`);

      // 有开始按钮就点
      const startPt = await evaluate(sessionId, `(function(){
        var b = document.getElementById('btnStart');
        if(!b){ var all = [...document.querySelectorAll('button')];
          b = all.find(function(x){ return /开始|开局|新局|重开/.test(x.innerText); }); }
        if(!b) return null;
        var r = b.getBoundingClientRect();
        if(r.width < 1) return null;
        return { x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2), t: b.innerText.trim() };
      })()`);
      if (startPt) { await clickAt(sessionId, startPt); rec.started = startPt.t; }
      await wait(500);

      const hitPt = await evaluate(sessionId, `${CENTER}(${JSON.stringify(plan.hit)})`);
      if (plan.canvas) await swipeAt(sessionId, hitPt); else await clickAt(sessionId, hitPt);
      await wait(900);

      const after = await evaluate(sessionId, `(function(){
        var c = document.querySelector('canvas');
        return {
          nodes: document.querySelectorAll('*').length,
          pix: c ? c.toDataURL().length : 0,
          txt: (document.body.innerText||'').replace(/\\s+/g,' ').slice(0,60)
        };
      })()`);

      rec.cw = Math.round(before.cw); rec.ch = Math.round(before.ch);
      rec.changed = before.pix !== after.pix;
      rec.nodes = before.nodes + '->' + after.nodes;
      rec.err = logs.slice(0, 2);
      await shot(sessionId, path.join(ROOT, '_r_' + name.replace('.html', '') + '.png'));
    } catch (e) {
      rec.err = ['EXCEPTION ' + e.message];
    }
    console.log(`${name.padEnd(16)} canvas=${rec.cw}x${rec.ch} 画面变化=${rec.changed} 节点=${rec.nodes} 报错=${rec.err && rec.err.length ? rec.err.join(' | ') : '无'}`);
  }
  try { proc.kill(); } catch (e) {}
}

module.exports = { run };

if (require.main === module) {
  const names = process.argv.slice(2);
  run(names.length ? names : Object.keys(PLAN)).then(() => process.exit(0)).catch(e => { console.log('FATAL', e.message); process.exit(1); });
}
