/* 走通一局：验证「操作 → 结算票券 → 存档」整条链路 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = 'C:/Users/tongj/Desktop/游戏/arcade';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const probe = `<script>
window.__e = [];
window.addEventListener('error', function(e){ window.__e.push(e.message); });
window.addEventListener('load', function(){
  setTimeout(async function(){
    var wait = function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
    await wait(800);
    var b3 = document.querySelector('[data-n="3"]');
    if(b3) b3.click();
    await wait(400);
    var t = [].slice.call(document.querySelectorAll('.tower'));
    var seq = [[0,2],[0,1],[2,1],[0,2],[1,0],[1,2],[0,2]];
    for(var i = 0; i < seq.length; i++){
      t[seq[i][0]].click();
      await wait(70);
      t[seq[i][1]].click();
      await wait(180);
    }
    await wait(900);
    var ov = document.querySelector('.overlay');
    document.title = 'HN:: towers=' + t.length
      + ' moves=' + (document.getElementById('uiMoves') || {}).textContent
      + ' overlay=' + (ov ? ov.className : 'none')
      + ' save=' + (localStorage.getItem('arcade.v1.save.hanoi') || '-')
      + ' err=' + window.__e.length;
  }, 400);
});
</script>`;

const src = fs.readFileSync(path.join(ROOT, 'games/hanoi.html'), 'utf8');
const tmp = path.join(ROOT, 'games/_w_hanoi.html');
fs.writeFileSync(tmp, src.replace('</body>', probe + '</body>'));
const out = execFileSync(CHROME, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
  '--virtual-time-budget=25000', '--dump-dom', 'file:///' + tmp.replace(/\\/g, '/')
], { encoding: 'utf8', maxBuffer: 1 << 26, timeout: 60000 });
const m = out.match(/<title>([\s\S]*?)<\/title>/);
console.log(m ? m[1].trim() : '(no title)');
fs.unlinkSync(tmp);
