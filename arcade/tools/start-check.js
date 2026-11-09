/*
 * 检查「点开始后按钮有没有反馈」以及「画面是否真的动起来」
 * 这是用户最容易感知的"点了没反应"
 */
const path = require('path');
const { launch, connect, openPage, evaluate, wait, ROOT, send } = require('./cdp');

const FILES = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['stack.html', 'whack.html', 'pong.html', 'invaders.html', 'runner.html',
     'catch.html', 'hoops.html', 'flappy.html', 'slice.html', 'simon.html',
     'reaction.html', 'nummem.html', 'mines.html', 'sudoku.html', 'match3.html',
     'link.html', 'puzzle.html', 'nonogram.html', 'tf.html', 'wordle.html',
     'maze.html', 'oneline.html', 'ttt.html', 'reversi.html', 'pipes.html',
     'hanoi.html', 'klotski.html', 'mastermind.html', 'spot.html', 'math.html'];

const CLICK = (sel) => `(function(){
  var b = document.getElementById('btnStart');
  if(!b){ var all = [...document.querySelectorAll('button')];
    b = all.find(function(x){ return /开始|开局|新局/.test(x.innerText); }); }
  if(!b) return null;
  var r = b.getBoundingClientRect();
  if(r.width < 1) return null;
  return { x: Math.round(r.left+r.width/2), y: Math.round(r.top+r.height/2), t: b.innerText.trim() };
})()`;

async function mouse(sid, pt, type) {
  await send('Input.dispatchMouseEvent', {
    type, x: pt.x, y: pt.y, button: 'left', clickCount: 1, pointerType: 'mouse'
  }, sid);
}

(async () => {
  const proc = launch();
  await connect();
  const issues = [];

  for (const f of FILES) {
    const url = 'file:///' + path.join(ROOT, 'games', f).replace(/\\/g, '/');
    const { sessionId: sid, logs } = await openPage(url);
    await wait(600);

    const before = await evaluate(sid, `(function(){
      var c = document.querySelector('canvas');
      var b = document.getElementById('btnStart');
      return { txt: b ? b.innerText.trim() : null, pix: c ? c.toDataURL().length : 0 };
    })()`);

    const pt = await evaluate(sid, CLICK());
    if (pt) {
      await mouse(sid, pt, 'mousePressed');
      await mouse(sid, pt, 'mouseReleased');
    }
    await wait(350);

    const mid = await evaluate(sid, `(function(){
      var c = document.querySelector('canvas');
      var b = document.getElementById('btnStart');
      return { txt: b ? b.innerText.trim() : null, pix: c ? c.toDataURL().length : 0,
               tip: (document.querySelector('.tip')||{}).className || '' };
    })()`);

    await wait(900);

    const after = await evaluate(sid, `(function(){
      var c = document.querySelector('canvas');
      var b = document.getElementById('btnStart');
      return { txt: b ? b.innerText.trim() : null, pix: c ? c.toDataURL().length : 0 };
    })()`);

    const notes = [];
    if (pt && before.txt && mid.txt === before.txt && before.txt === '开始') notes.push('按钮文案未更新');
    if (before.pix && before.pix === after.pix) notes.push('画面静止');
    if (logs.filter(l => l.startsWith('EXC')).length) notes.push('异常:' + logs[0].slice(0, 60));

    console.log(
      f.padEnd(16),
      '按钮=' + (before.txt || '-') + '->' + (mid.txt || '-'),
      '画面变化=' + (before.pix !== after.pix),
      notes.length ? '⚠ ' + notes.join(' ') : 'ok'
    );
    if (notes.length) issues.push(f + ': ' + notes.join(' '));
  }

  console.log('\n有反馈问题的页面：' + issues.length);
  issues.forEach(x => console.log('  ' + x));
  try { proc.kill(); } catch (e) {}
  process.exit(0);
})();
