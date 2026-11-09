/* 逐页自动化冒烟测试：捕获运行时错误 + 关键交互是否生效
   结果通过 document.title 回传，用 chrome --dump-dom 读取 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = 'C:/Users/tongj/Desktop/游戏/arcade';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const NODE = process.execPath;

const sleep = ms => new Promise(r => setTimeout(r, ms));

const CASES = {
  'balls': { budget: 12000, script: `
    await wait(1200);
    const tubes = [...document.querySelectorAll('.tube')];
    const emptyIdx = tubes.findIndex(t => t.children.length === 0);
    const fullIdx = tubes.findIndex(t => t.children.length > 0);
    tubes[fullIdx].click();
    await wait(150);
    tubes[emptyIdx].click();
    await wait(1600);
    return 'tubes=' + tubes.length + ' ball=' + document.querySelectorAll('.ball').length +
      ' moves=' + document.getElementById('uiMoves').textContent +
      ' level=' + document.getElementById('uiMoves') + '|' + document.querySelector('.bar__meta').textContent.trim();
  ` },
  'slide': { budget: 9000, script: `
    await wait(1000);
    const tiles = [...document.querySelectorAll('.tile')];
    const before = tiles.map(t => t.style.transform).join(';');
    // 每个块点一次，总有能动的
    tiles.forEach(t => t.click());
    await wait(600);
    const after = [...document.querySelectorAll('.tile')].map(t => t.style.transform).join(';');
    return 'tiles=' + tiles.length + ' moved=' + (before.slice(0, 80) !== after.slice(0, 80)) +
      ' moves=' + document.getElementById('uiMoves').textContent;
  ` },
  'memory': { budget: 9000, script: `
    await wait(1000);
    const cards = [...document.querySelectorAll('.card')];
    cards[0].click(); await wait(120);
    cards[1].click(); await wait(1400);
    return 'cards=' + cards.length + ' flipped=' + document.querySelectorAll('.card.flip,.card.done').length +
      ' moves=' + document.getElementById('uiMoves').textContent;
  ` },
  '2048': { budget: 12000, script: `
    await wait(900);
    for(let i = 0; i < 24; i++){
      const keys = ['ArrowLeft','ArrowUp','ArrowRight','ArrowDown'];
      document.dispatchEvent(new KeyboardEvent('keydown', { key: keys[i % 4], bubbles: true }));
      await wait(160);
    }
    await wait(400);
    return 'tiles=' + document.querySelectorAll('.tile').length +
      ' score=' + document.getElementById('uiScore').textContent;
  ` },
  'sokoban': { budget: 9000, script: `
    await wait(1000);
    const boxes = document.querySelectorAll('.box').length;
    const player = !!document.querySelector('.player');
    const before = [...document.querySelectorAll('.box')].map(b => b.style.transform).join(';');
    for(const k of ['ArrowUp','ArrowLeft','ArrowDown','ArrowRight','ArrowUp','ArrowUp']){
      document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
      await wait(90);
    }
    const after = [...document.querySelectorAll('.box')].map(b => b.style.transform).join(';');
    return 'boxes=' + boxes + ' player=' + player + ' cells=' + document.querySelectorAll('.cell').length +
      ' moved=' + (before !== after) + ' steps=' + document.getElementById('uiMoves').textContent;
  ` },
  'snake': { budget: 9000, script: `
    await wait(800);
    document.getElementById('btnPlay').click();
    await wait(1500);
    const len = document.getElementById('uiLen').textContent;
    const state = document.getElementById('uiState').textContent;
    return 'len=' + len + ' state=' + state + ' canvas=' + document.getElementById('cv').width;
  ` },
  'breakout': { budget: 9000, script: `
    await wait(800);
    document.getElementById('btnPlay').click();
    await wait(1800);
    return 'score=' + document.getElementById('uiScore').textContent +
      ' lives=' + document.getElementById('uiLives').textContent +
      ' stage=' + document.getElementById('uiStage').textContent +
      ' canvas=' + document.getElementById('cv').width;
  ` },
  'gomoku': { budget: 10000, script: `
    await wait(1000);
    const b = document.getElementById('board').getBoundingClientRect();
    const ev = (x, y) => document.getElementById('board').dispatchEvent(new MouseEvent('click', { clientX: x, clientY: y, bubbles: true }));
    ev(b.left + b.width * .5, b.top + b.height * .5);
    await wait(900);
    ev(b.left + b.width * .42, b.top + b.height * .5);
    await wait(1200);
    return 'stones=' + document.querySelectorAll('.stone').length + ' turn=' + document.getElementById('uiTurn').textContent;
  ` },
  'tetris': { budget: 10000, script: `
    await wait(800);
    document.getElementById('btnPlay').click();
    await wait(600);
    document.getElementById('bLeft').click();
    document.getElementById('bRotate').click();
    document.getElementById('bDrop').click();
    await wait(800);
    document.getElementById('bDrop').click();
    await wait(600);
    return 'score=' + document.getElementById('uiScore').textContent +
      ' lines=' + document.getElementById('uiLines').textContent +
      ' level=' + document.getElementById('uiLevel').textContent +
      ' state=' + document.getElementById('uiState').textContent;
  ` },
  'lights': { budget: 9000, script: `
    await wait(1000);
    const left0 = +document.getElementById('uiLeft').textContent;
    document.querySelectorAll('.lamp')[0].click();
    await wait(400);
    const left1 = +document.getElementById('uiLeft').textContent;
    const total = document.querySelectorAll('.lamp').length;
    return 'lamps=' + total + ' before=' + left0 + ' after=' + left1 + ' changed=' + (left0 !== left1) +
      ' moves=' + document.getElementById('uiMoves').textContent;
  ` },

  /* ---------------- 第二批：棋与盘 ---------------- */
  'mines': { budget: 9000, script: `
    await wait(900);
    const cells = [...document.querySelectorAll('.cell')];
    const n = cells.length;
    cells[Math.floor(n / 2)].click();
    await wait(700);
    return 'cells=' + n + ' opened=' + document.querySelectorAll('.cell.open').length +
      ' left=' + document.getElementById('uiLeft').textContent;
  ` },
  'sudoku': { budget: 14000, script: `
    await wait(1400);
    const cells = [...document.querySelectorAll('.sc')];
    const empty = cells.findIndex(c => !c.textContent && !c.classList.contains('given'));
    cells[empty >= 0 ? empty : 40].click();
    await wait(150);
    document.querySelectorAll('.pad button')[4].click();
    await wait(300);
    return 'cells=' + cells.length + ' filled=' + cells.filter(c => c.textContent).length +
      ' sel=' + document.querySelectorAll('.sc.sel').length +
      ' left=' + document.getElementById('uiLeft').textContent;
  ` },
  'hanoi': { budget: 9000, script: `
    await wait(900);
    const towers = [...document.querySelectorAll('.tower')];
    towers[0].click();
    await wait(200);
    const up = document.querySelectorAll('.disk.up').length;
    towers[2].click();
    await wait(300);
    return 'towers=' + towers.length + ' lifted=' + up +
      ' moves=' + document.getElementById('uiMoves').textContent +
      ' c3=' + towers[2].children.length;
  ` },
  'ttt': { budget: 9000, script: `
    await wait(700);
    const sq = [...document.querySelectorAll('.sq')];
    sq[4].click();
    await wait(900);
    return 'sq=' + sq.length + ' marks=' + document.querySelectorAll('.mark').length +
      ' turn=' + document.getElementById('uiTurn').textContent;
  ` },
  'reversi': { budget: 9000, script: `
    await wait(800);
    const can = [...document.querySelectorAll('.cell.can')];
    const before = document.querySelectorAll('.disc').length;
    if(can.length) can[0].click();
    await wait(1000);
    return 'can=' + can.length + ' discs=' + document.querySelectorAll('.disc').length +
      ' b=' + document.getElementById('uiB').textContent +
      ' w=' + document.getElementById('uiW').textContent;
  ` },

  /* ---------------- 第二批：盘面 ---------------- */
  'pipes': { budget: 9000, script: `
    await wait(900);
    const pipes = [...document.querySelectorAll('.pipe')];
    const p0 = document.getElementById('uiPct').textContent;
    pipes[Math.floor(pipes.length / 2)].click();
    await wait(300);
    return 'pipes=' + pipes.length + ' pct0=' + p0 +
      ' turns=' + document.getElementById('uiMoves').textContent +
      ' flow=' + document.getElementById('uiFlow').textContent;
  ` },
  'nonogram': { budget: 11000, script: `
    await wait(1000);
    const cells = [...document.querySelectorAll('.cell')];
    const top = document.querySelectorAll('.clues-top .clue').length;
    const left = document.querySelectorAll('.clues-left .clue').length;
    cells[0].click();
    await wait(200);
    return 'cells=' + cells.length + ' top=' + top + ' left=' + left +
      ' filled=' + document.querySelectorAll('.cell.fill').length +
      ' need=' + document.getElementById('uiNeed').textContent;
  ` },
  'tf': { budget: 9000, script: `
    await wait(700);
    const cards = [...document.querySelectorAll('.pcard')];
    const n0 = cards.length;
    cards[0].click(); await wait(120);
    cards[1].click(); await wait(120);
    const enabled = !document.querySelector('.op[data-op="+"]').disabled;
    document.querySelector('.op[data-op="+"]').click();
    await wait(400);
    return 'cards0=' + n0 + ' enabled=' + enabled +
      ' cards=' + document.querySelectorAll('.pcard').length +
      ' steps=' + document.getElementById('uiStep').textContent;
  ` },
  'simon': { budget: 12000, script: `
    await wait(600);
    document.getElementById('btnPlay').click();
    await wait(1200);
    return 'pads=' + document.querySelectorAll('.pad').length +
      ' len=' + document.getElementById('uiLen').textContent +
      ' status=' + document.getElementById('uiStatus').textContent;
  ` },
  'wordle': { budget: 12000, script: `
    await wait(700);
    for(const ch of ['a','b','o','u','t']){
      document.dispatchEvent(new KeyboardEvent('keydown', { key: ch }));
      await wait(40);
    }
    await wait(100);
    const typed = [...document.querySelectorAll('.row')][0].textContent;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await wait(1600);
    return 'tiles=' + document.querySelectorAll('.tile').length +
      ' typed=' + typed + ' marked=' + document.querySelectorAll('.tile.hit,.tile.near,.tile.miss').length +
      ' row=' + document.getElementById('uiRow').textContent;
  ` },

  /* ---------------- 第三批：场与图 ---------------- */
  'maze': { budget: 10000, script: `
    await wait(900);
    const cv = document.getElementById('cv');
    for(let i = 0; i < 10; i++){
      document.querySelector('.dpad [data-d="1"]').click();
      document.querySelector('.dpad [data-d="2"]').click();
      await wait(20);
    }
    await wait(200);
    return 'cv=' + cv.width + 'x' + cv.height +
      ' steps=' + document.getElementById('uiSteps').textContent;
  ` },
  'oneline': { budget: 10000, script: `
    await wait(900);
    const dots = [...document.querySelectorAll('.dot')];
    const lines = document.querySelectorAll('.ln').length;
    dots.forEach(d => d.click());
    await wait(300);
    return 'dots=' + dots.length + ' lines=' + lines +
      ' done=' + document.getElementById('uiDone').textContent +
      ' total=' + document.getElementById('uiTotal').textContent;
  ` },
  'puzzle': { budget: 11000, script: `
    await wait(900);
    const pieces = [...document.querySelectorAll('.piece')];
    const bg = pieces[0].style.backgroundImage.slice(0, 30);
    pieces[0].click(); await wait(150);
    pieces[1].click(); await wait(400);
    return 'pieces=' + pieces.length + ' bg=' + (bg.indexOf('svg') > 0) +
      ' moves=' + document.getElementById('uiMoves').textContent +
      ' placed=' + document.getElementById('uiPlaced').textContent;
  ` },
  'match3': { budget: 13000, script: `
    await wait(1000);
    const all = () => [...document.querySelectorAll('.tile')];
    const t0 = all();
    const a = t0.find(x => x.dataset.r === '0' && x.dataset.c === '0');
    const b = t0.find(x => x.dataset.r === '0' && x.dataset.c === '1');
    a.click(); await wait(180); b.click();
    await wait(1800);
    return 'tiles=' + all().length +
      ' moves=' + document.getElementById('uiMoves').textContent +
      ' score=' + document.getElementById('uiScore').textContent;
  ` },
  'link': { budget: 11000, script: `
    await wait(900);
    const cells = [...document.querySelectorAll('.cell')];
    const before = document.getElementById('uiLeft').textContent;
    document.getElementById('btnHint').click();
    await wait(300);
    const hinted = document.querySelectorAll('.cell.hint').length;
    if(hinted >= 2){
      const hs = [...document.querySelectorAll('.cell.hint')];
      hs[0].click(); await wait(120); hs[1].click(); await wait(500);
    }
    return 'cells=' + cells.length + ' before=' + before +
      ' hinted=' + hinted + ' left=' + document.getElementById('uiLeft').textContent;
  ` },

  /* ---------------- 第四批：街机 ---------------- */
  'stack': { budget: 12000, script: `
    await wait(900);
    const cv = document.getElementById('cv');
    const frame = document.getElementById('frame');
    const ev = () => frame.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    ev(); await wait(700);
    ev(); await wait(500);
    ev(); await wait(400);
    return 'cv=' + cv.width + 'x' + cv.height +
      ' lv=' + document.getElementById('uiLv').textContent;
  ` },
  'whack': { budget: 12000, script: `
    await wait(600);
    document.getElementById('btnStart').click();
    await wait(1400);
    const up = [...document.querySelectorAll('.hole.up')];
    const n0 = up.length;
    if(n0) up[0].click();
    await wait(400);
    return 'holes=' + document.querySelectorAll('.hole').length +
      ' up=' + n0 + ' score=' + document.getElementById('uiScore').textContent +
      ' time=' + document.getElementById('uiTime').textContent;
  ` },
  'pong': { budget: 12000, script: `
    await wait(600);
    document.getElementById('btnStart').click();
    await wait(2200);
    return 'score=' + document.getElementById('uiScore').textContent +
      ' cv=' + document.getElementById('cv').width +
      ' state=' + document.getElementById('uiState').textContent;
  ` },
  'invaders': { budget: 13000, script: `
    await wait(600);
    document.getElementById('btnStart').click();
    await wait(900);
    const frame = document.getElementById('frame');
    for(let i = 0; i < 8; i++){
      frame.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 190, clientY: 400 }));
      await wait(260);
    }
    await wait(400);
    return 'score=' + document.getElementById('uiScore').textContent +
      ' lives=' + document.getElementById('uiLives').textContent +
      ' wave=' + document.getElementById('uiWave').textContent;
  ` },
  'runner': { budget: 13000, script: `
    await wait(600);
    document.getElementById('btnStart').click();
    await wait(2200);
    const frame = document.getElementById('frame');
    frame.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await wait(900);
    return 'dist=' + document.getElementById('uiScore').textContent +
      ' cv=' + document.getElementById('cv').width;
  ` },

  /* ---------------- 第五批：手眼 ---------------- */
  'catch': { budget: 12000, script: `
    await wait(600);
    document.getElementById('btnStart').click();
    await wait(1600);
    return 'lives=' + document.getElementById('uiLives').textContent +
      ' score=' + document.getElementById('uiScore').textContent +
      ' cv=' + document.getElementById('cv').width +
      ' tip=' + document.getElementById('tip').className;
  ` },
  'reaction': { budget: 10000, script: `
    await wait(600);
    const pad = document.getElementById('pad');
    const ev = () => pad.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    ev();
    await wait(300);
    const waitTxt = document.getElementById('big').textContent;
    const cls = pad.className;
    ev();
    await wait(300);
    return 'waitTxt=' + waitTxt + ' cls=' + cls +
      ' after=' + document.getElementById('big').textContent +
      ' round=' + document.getElementById('uiRound').textContent;
  ` },
  'hoops': { budget: 11000, script: `
    await wait(600);
    document.getElementById('btnStart').click();
    await wait(300);
    const f = document.getElementById('frame');
    const r = f.getBoundingClientRect();
    const pt = (x, y, type) => f.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: r.left + x, clientY: r.top + y }));
    pt(60, 340, 'pointerdown');
    pt(150, 180, 'pointermove');
    pt(150, 180, 'pointerup');
    await wait(600);
    const shot = document.getElementById('uiShot').textContent;
    document.getElementById('btnStart');
    return 'shots=' + shot + ' time=' + document.getElementById('uiTime').textContent +
      ' cv=' + document.getElementById('cv').width;
  ` },
  'flappy': { budget: 11000, script: `
    await wait(600);
    document.getElementById('btnStart').click();
    await wait(500);
    const f = document.getElementById('frame');
    for(let i = 0; i < 6; i++){
      f.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      await wait(230);
    }
    return 'score=' + document.getElementById('uiScore').textContent +
      ' cv=' + document.getElementById('cv').width;
  ` },
  'math': { budget: 12000, script: `
    await wait(600);
    document.getElementById('btnStart').click();
    await wait(400);
    const opts = [...document.querySelectorAll('.opt')];
    const q = document.getElementById('q').textContent;
    if(opts.length) opts[0].click();
    await wait(800);
    return 'opts=' + opts.length + ' q=' + q.replace(/\\s+/g, ' ') +
      ' score=' + document.getElementById('uiScore').textContent +
      ' time=' + document.getElementById('uiTime').textContent;
  ` },

  /* ---------------- 第六批：记忆与局 ---------------- */
  'nummem': { budget: 15000, script: `
    await wait(600);
    document.getElementById('btnStart').click();
    await wait(150);
    const target = document.getElementById('num').textContent.trim();
    await wait(2600);
    const phaseDots = document.getElementById('num').textContent.trim();
    for(const ch of target){
      document.dispatchEvent(new KeyboardEvent('keydown', { key: ch }));
      await wait(70);
    }
    await wait(700);
    return 'target=' + target + ' dots=' + phaseDots +
      ' len=' + document.getElementById('uiLen2').textContent +
      ' best=' + document.getElementById('uiBest').textContent;
  ` },
  'spot': { budget: 11000, script: `
    await wait(900);
    const rights = [...document.querySelectorAll('#right .cell')];
    const shapes = rights.map(c => c.innerHTML.length).join(',');
    rights.forEach(c => c.click());
    await wait(400);
    return 'cells=' + rights.length + ' found=' + document.getElementById('uiFound').textContent +
      ' miss=' + document.getElementById('uiMiss').textContent +
      ' level=' + document.getElementById('uiLevel').textContent;
  ` },
  'klotski': { budget: 10000, script: `
    await wait(900);
    const blks = [...document.querySelectorAll('.blk')];
    const before = blks[6].style.top;
    blks[6].click();
    await wait(150);
    document.querySelector('.dpad [data-d="2"]').click();
    await wait(400);
    return 'blks=' + blks.length + ' moved=' + (before !== blks[6].style.top) +
      ' moves=' + document.getElementById('uiMoves').textContent +
      ' cao=' + blks[1].textContent;
  ` },
  'mastermind': { budget: 11000, script: `
    await wait(800);
    const sw = [...document.querySelectorAll('.sw')];
    for(let i = 0; i < 4; i++){
      sw[i % sw.length].click();
      await wait(90);
    }
    const filled = document.querySelectorAll('.row.cur .peg.filled').length;
    document.getElementById('btnSubmit').click();
    await wait(500);
    return 'sw=' + sw.length + ' filled=' + filled +
      ' rows=' + document.querySelectorAll('.row').length +
      ' marks=' + document.querySelectorAll('.fb i.b,.fb i.w').length +
      ' left=' + document.getElementById('uiLeft').textContent;
  ` },
  'slice': { budget: 13000, script: `
    await wait(600);
    document.getElementById('btnStart').click();
    await wait(1400);
    const f = document.getElementById('frame');
    const r = f.getBoundingClientRect();
    const pt = (x, y, type) => f.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: r.left + x, clientY: r.top + y }));
    pt(40, 300, 'pointerdown');
    for(let i = 0; i < 12; i++){
      pt(40 + i * 22, 300 - i * 8, 'pointermove');
      await wait(30);
    }
    pt(300, 200, 'pointerup');
    await wait(500);
    return 'time=' + document.getElementById('uiTime').textContent +
      ' hit=' + document.getElementById('uiHit').textContent +
      ' cv=' + document.getElementById('cv').width;
  ` }
};

const PRELUDE = `<script>
window.__err = [];
window.addEventListener('error', function(e){ window.__err.push((e.message || String(e.error)) + ' @L' + e.lineno); });
window.addEventListener('unhandledrejection', function(e){ window.__err.push('promise:' + (e.reason && e.reason.message || e.reason)); });
</script>`;

function build(name, cfg){
  const src = path.join(ROOT, 'games', name + '.html');
  let html = fs.readFileSync(src, 'utf8');
  html = html.replace('</head>', PRELUDE + '</head>');
  const tail = `<script>
(async function(){
  var wait = function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
  function report(msg){
    document.title = (window.__err.length ? 'ERR[' + window.__err.join(' / ') + '] ' : 'OK ') + msg;
    window.__done = true;
  }
  var out = await (async function(){
    ${cfg.script}
  })().catch(function(e){ return 'THROW:' + e.message; });
  report(out);
})();
</script>`;
  html = html.replace('</body>', tail + '</body>');
  const out = path.join(ROOT, 'games', '_t_' + name + '.html');
  fs.writeFileSync(out, html);
  return out;
}

function run(file, budget){
  const out = execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-sandbox',
    '--virtual-time-budget=' + budget, '--dump-dom',
    'file:///' + file.replace(/\\/g, '/')
  ], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: budget + 20000, stdio: ['ignore', 'pipe', 'ignore'] });
  const m = out.match(/<title>([\s\S]*?)<\/title>/);
  return m ? m[1].trim() : '(no title)';
}

function cleanup(){
  for(const f of fs.readdirSync(path.join(ROOT, 'games'))){
    if(f.startsWith('_t_')) { try{ fs.unlinkSync(path.join(ROOT, 'games', f)); }catch(e){} }
  }
}

(async function(){
  const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(CASES);
  let fail = 0;
  for(const name of names){
    const cfg = CASES[name];
    if(!cfg){ console.log(name, '-> 未定义用例'); continue; }
    const file = build(name, cfg);
    let res = '';
    try{ res = run(file, cfg.budget); }catch(e){ res = 'CHROME_FAIL:' + e.message.slice(0, 120); }
    const ok = res.startsWith('OK ');
    if(!ok) fail++;
    console.log((ok ? '✔ ' : '✘ ') + name.padEnd(10), res);
  }
  console.log(fail ? ('失败 ' + fail + ' 项') : '全部通过');
  cleanup();
  process.exit(fail ? 1 : 0);
})();
