/* 运行时压测：每页随机做 150 次点击 / 拖拽 / 按键，捕获异常与卡死。
   只读页面，不修改源码。 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = 'C:/Users/tongj/Desktop/游戏/arcade';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const N = 150;

const PRELUDE = `<script>
/* rAF 垫片：无头浏览器不产生渲染帧，用 16ms 定时器代替，让游戏主循环真正跑起来 */
(function(){
  window.requestAnimationFrame = function(cb){ return setTimeout(function(){ cb(performance.now()); }, 16); };
  window.cancelAnimationFrame = function(t){ clearTimeout(t); };
  window.__err = [];
  window.addEventListener('error', function(e){ window.__err.push((e.message || String(e.error)) + ' @L' + e.lineno); });
  window.addEventListener('unhandledrejection', function(e){ window.__err.push('promise:' + ((e.reason && e.reason.message) || e.reason)); });
})();
</script>`;

const FUZZ = `<script>
function cleanup(){for(const f of fs.readdirSync(path.join(ROOT,'games'))){if(f.startsWith('_f_')){try{fs.unlinkSync(path.join(ROOT,'games',f));}catch(e){}}}}

(async function(){
  var wait = function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
  await wait(900);
  if(window.Shell) Shell.back = function(){};          // 别让压测把页面带走
  var SEL = 'button,.btn,.chip,.key,.cell,.tile,.sq,.card,.hole,.dot,.blk,.pad,.opt,.num,.seg button,.tray button';
  function vis(e){
    var r = e.getBoundingClientRect();
    if(r.width < 3 || r.height < 3) return false;
    var cs = getComputedStyle(e);
    return cs.visibility !== 'hidden' && cs.display !== 'none' && parseFloat(cs.opacity) > 0.05;
  }
  function pool(){
    return Array.prototype.filter.call(document.querySelectorAll(SEL), function(e){
      if(!vis(e)) return false;
      if(/返回|首页|全部游戏|菜单/.test(e.textContent || '')) return false;
      return true;
    });
  }
  function rnd(n){ return Math.floor(Math.random() * n); }
  var KEYS = ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','Enter','a','s','d','w','z','x','1','2','3','4','5','6','Backspace'];
  var clicks = 0, drags = 0, keys = 0;

  for(var i = 0; i < ${N}; i++){
    var roll = Math.random();
    if(roll < 0.62){
      var p = pool();
      if(p.length){ p[rnd(p.length)].click(); clicks++; }
    } else if(roll < 0.82){
      var cv = document.querySelector('canvas');
      if(cv && vis(cv)){
        var r = cv.getBoundingClientRect();
        var x0 = r.left + r.width * (0.15 + Math.random() * 0.7);
        var y0 = r.top + r.height * (0.15 + Math.random() * 0.7);
        var x1 = r.left + r.width * Math.random(), y1 = r.top + r.height * Math.random();
        var opt = { clientX: x0, clientY: y0, bubbles: true, pointerId: 1, isPrimary: true, button: 0, buttons: 1 };
        cv.dispatchEvent(new PointerEvent('pointerdown', opt));
        document.dispatchEvent(new PointerEvent('pointermove', { clientX: (x0+x1)/2, clientY: (y0+y1)/2, bubbles: true, pointerId: 1 }));
        cv.dispatchEvent(new PointerEvent('pointermove', { clientX: x1, clientY: y1, bubbles: true, pointerId: 1 }));
        cv.dispatchEvent(new PointerEvent('pointerup', { clientX: x1, clientY: y1, bubbles: true, pointerId: 1, button: 0, buttons: 0 }));
        if(typeof cv.onpointerdown === 'function'){ /* noop */ }
        drags++;
      }
    } else {
      var k = KEYS[rnd(KEYS.length)];
      document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
      window.dispatchEvent(new KeyboardEvent('keyup', { key: k, bubbles: true }));
      keys++;
    }
    await wait(26);
  }
  await wait(500);
  var alive = !!document.querySelector('.app') && document.body.children.length > 0;
  document.title = (window.__err.length ? 'ERR[' + window.__err.slice(0,3).join(' / ') + ']' : 'OK')
    + ' c=' + clicks + ' d=' + drags + ' k=' + keys
    + ' alive=' + alive
    + ' nodes=' + document.querySelectorAll('*').length
    + ' url=' + location.pathname.split('/').pop();
})().catch(function(e){ document.title = 'THROW:' + e.message; });
</script>`;

function build(name){
  const src = path.join(ROOT, 'games', name + '.html');
  let html = fs.readFileSync(src, 'utf8');
  html = html.replace('</head>', PRELUDE + '</head>');
  html = html.replace('</body>', FUZZ + '</body>');
  const out = path.join(ROOT, 'games', '_f_' + name + '.html');
  fs.writeFileSync(out, html);
  return out;
}

function run(file, budget){
  const out = execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-sandbox',
    '--virtual-time-budget=' + budget, '--dump-dom',
    'file:///' + file.replace(/\\/g, '/')
  ], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: budget + 25000, stdio: ['ignore', 'pipe', 'ignore'] });
  const m = out.match(/<title>([\s\S]*?)<\/title>/);
  return m ? m[1].trim() : '(no title)';
}

function cleanup(){
  const dir = path.join(ROOT, 'games');
  for (const f of fs.readdirSync(dir)) {
    if (f.startsWith('_f_')) { try { fs.unlinkSync(path.join(dir, f)); } catch (e) {} }
  }
}

const names = process.argv.slice(2).length
  ? process.argv.slice(2)
  : fs.readdirSync(path.join(ROOT, 'games')).filter(f => f.endsWith('.html') && !f.startsWith('_')).map(f => f.slice(0, -5)).sort();

let fail = 0;
for (const name of names) {
  const file = build(name);
  let res;
  try {
    res = run(file, 26000);
  } catch (e) {
    res = 'HANG/TIMEOUT ' + e.message.slice(0, 80);
  }
  const ok = res.startsWith('OK');
  if (!ok) fail++;
  console.log((ok ? '✔ ' : '✘ ') + name.padEnd(11) + res);
}
cleanup();
console.log(fail ? `\n${fail} 页有问题` : '\n压测全部通过');
process.exit(fail ? 1 : 0);

