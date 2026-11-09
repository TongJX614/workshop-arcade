/*
 * 检查「点一下有没有反应」：比较点击前后的 DOM 状态指纹
 * 指纹 = 所有元素的 class 拼起来 + 文本长度，能捕捉选中/落子/翻开这类状态变化
 */
const path = require('path');
const { launch, connect, openPage, evaluate, wait, ROOT, send } = require('./cdp');

/* 每页的主操作元素与要点几下 */
const PLAN = [
  ['mines.html', '.cell', 1],
  ['sudoku.html', '.sc', 1],
  ['hanoi.html', '.tower', 2],
  ['ttt.html', '.sq', 1],
  ['reversi.html', '.cell', 1],
  ['pipes.html', '.tile', 1],
  ['nonogram.html', '.cell', 1],
  ['tf.html', '.pcard', 1],
  ['wordle.html', '.key', 1],
  ['oneline.html', '.dot', 1],
  ['puzzle.html', '.piece', 1],
  ['match3.html', '.tile', 1],
  ['link.html', '.cell', 1],
  ['klotski.html', '.blk', 1],
  ['mastermind.html', '.sw', 1],
  ['spot.html', '.panel .cell', 1],
  ['maze.html', '.frame', 1],
  ['stack.html', '.frame', 1],
  ['simon.html', '.pad', 1],
  ['whack.html', '.hole', 1],
  ['reaction.html', '.pad', 1],
  ['nummem.html', '.key', 1],
  ['math.html', '.opt', 1],
  ['2033.html', '.cell', 1],
];

const FP = `(function(){
  var cls = [];
  var all = document.querySelectorAll('*');
  for (var i = 0; i < all.length; i++) cls.push(all[i].className && all[i].className.baseVal === undefined ? all[i].className : '');
  var c = document.querySelector('canvas');
  return cls.join('|').length + '::' + cls.join('|').slice(0, 4000) + '::' + (c ? c.toDataURL().length : 0);
})()`;

async function clickEl(sid, sel) {
  const pt = await evaluate(sid, `(function(){
    var e = document.querySelector(${JSON.stringify(sel)});
    if(!e) return null;
    var r = e.getBoundingClientRect();
    if(r.width < 1 || r.height < 1) return null;
    return { x: Math.round(r.left+r.width/2), y: Math.round(r.top+r.height/2) };
  })()`);
  if (!pt) return false;
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: pt.x, y: pt.y, button: 'left', clickCount: 1, pointerType: 'mouse' }, sid);
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: pt.x, y: pt.y, button: 'left', clickCount: 1, pointerType: 'mouse' }, sid);
  return true;
}

(async () => {
  const proc = launch();
  await connect();
  const bad = [];

  for (const [f, sel, times] of PLAN) {
    const { sessionId: sid, logs } = await openPage('file:///' + path.join(ROOT, 'games', f).replace(/\\/g, '/'));
    await wait(700);

    const before = await evaluate(sid, FP);
    let clicked = 0;
    for (let i = 0; i < times; i++) { if (await clickEl(sid, sel)) clicked++; await wait(220); }
    await wait(500);
    const after = await evaluate(sid, FP);

    const changed = before !== after;
    const exc = logs.filter(l => l.startsWith('EXC'));
    const flag = !changed || exc.length;
    console.log(
      f.padEnd(17),
      '点中=' + clicked,
      '状态变化=' + changed,
      exc.length ? '异常=' + exc[0].slice(0, 50) : '',
      flag ? '  ← 需要看' : ''
    );
    if (flag) bad.push(f);
  }

  console.log('\n可疑页面：' + (bad.length ? bad.join(' ') : '无'));
  try { proc.kill(); } catch (e) {}
  process.exit(0);
})();
