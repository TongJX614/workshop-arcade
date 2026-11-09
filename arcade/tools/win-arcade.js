/* 街机类死亡链路：用定时器垫片驱动 rAF（无头模式下 rAF 几乎不推进），
   开始后不操作，撞地即结束，看是否出结算并写存档。 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = 'C:/Users/tongj/Desktop/游戏/arcade';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const name = process.argv[2] || 'flappy';

const SHIM = `<script>
/* rAF 垫片：无头浏览器不产生渲染帧，改成 16ms 定时器，让虚拟时间能推进游戏循环 */
(function(){
  var id = 0;
  window.requestAnimationFrame = function(cb){
    return setTimeout(function(){ cb(performance.now()); }, 16);
  };
  window.cancelAnimationFrame = function(t){ clearTimeout(t); };
  window.__e = [];
  window.addEventListener('error', function(e){ window.__e.push(e.message); });
})();
</script>`;

const probe = `<script>
window.addEventListener('load', function(){
  setTimeout(async function(){
    var wait = function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
    await wait(500);
    var btn = document.getElementById('btnStart');
    if(btn) btn.click();
    await wait(12000);
    var ov = document.querySelector('.overlay');
    document.title = 'AR:: after=' + (btn ? btn.textContent : '-')
      + ' overlay=' + (ov ? ov.className : 'none')
      + ' plate=' + (ov ? ov.querySelector('h2').textContent : '-')
      + ' save=' + (localStorage.getItem('arcade.v1.save.${name}') || '-')
      + ' err=' + window.__e.length;
  }, 200);
});
</script>`;

const src = fs.readFileSync(path.join(ROOT, `games/${name}.html`), 'utf8');
const tmp = path.join(ROOT, `games/_w_${name}.html`);
let html = src.replace('</head>', SHIM + '</head>');
html = html.replace('</body>', probe + '</body>');
fs.writeFileSync(tmp, html);

const out = execFileSync(CHROME, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
  '--virtual-time-budget=40000', '--dump-dom', 'file:///' + tmp.replace(/\\/g, '/')
], { encoding: 'utf8', maxBuffer: 1 << 26, timeout: 90000 });
const m = out.match(/<title>([\s\S]*?)<\/title>/);
console.log(m ? m[1].trim() : '(no title)');
fs.unlinkSync(tmp);
