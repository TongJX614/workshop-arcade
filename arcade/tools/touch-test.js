/*
 * 触摸事件测试：模拟真手指在画布上划过
 * 若浏览器把手势判为滚动，游戏只会收到 pointercancel，画面不动
 */
const path = require('path');
const { launch, connect, openPage, evaluate, wait, ROOT, send } = require('./cdp');

async function touchDrag(sid, x1, y1, x2, y2, steps = 8) {
  await send('Input.dispatchTouchEvent', {
    type: 'touchStart', touchPoints: [{ x: x1, y: y1, id: 1 }]
  }, sid);
  for (let i = 1; i <= steps; i++) {
    const x = x1 + (x2 - x1) * i / steps;
    const y = y1 + (y2 - y1) * i / steps;
    await send('Input.dispatchTouchEvent', {
      type: 'touchMove', touchPoints: [{ x, y, id: 1 }]
    }, sid);
    await wait(30);
  }
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }, sid);
}

(async () => {
  const p = launch();
  await connect();
  const files = process.argv.slice(2);
  for (const f of files) {
    const { sessionId: sid, logs } = await openPage('file:///' + path.join(ROOT, 'games', f).replace(/\\/g, '/'));
    await wait(800);
    // 点开始
    await evaluate(sid, `(function(){
      var b = document.getElementById('btnStart'); if(b) b.click();
    })()`);
    await wait(700);
    const box = await evaluate(sid, `(function(){
      var c = document.querySelector('canvas') || document.querySelector('.frame');
      var r = c.getBoundingClientRect();
      return { x: r.left, y: r.top, w: r.width, h: r.height };
    })()`);
    const before = await evaluate(sid, `(function(){
      var c = document.querySelector('canvas'); return c ? c.toDataURL().length : 0;
    })()`);
    // 斜着划一刀
    await touchDrag(sid, box.x + box.w * 0.2, box.y + box.h * 0.3, box.x + box.w * 0.8, box.y + box.h * 0.7);
    await wait(500);
    const after = await evaluate(sid, `(function(){
      var c = document.querySelector('canvas');
      var s = document.querySelector('.stage');
      return { pix: c ? c.toDataURL().length : 0, scrollTop: s ? s.scrollTop : -1 };
    })()`);
    console.log(f.padEnd(16), '画面变化=' + (before !== after.pix), 'stage滚动=' + Math.round(after.scrollTop), '报错=' + (logs.filter(l => l.startsWith('EXC')).length || '无'));
  }
  try { p.kill(); } catch (e) {}
  process.exit(0);
})();
