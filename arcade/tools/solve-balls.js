/* 彩球归位：用「提示」驱动自动通关，验证每个关卡确实可解
   用法: node tools/solve-balls.js 1 15 30 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = 'C:/Users/tongj/Desktop/游戏/arcade';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const levels = process.argv.slice(2).map(Number);
if(!levels.length) levels.push(1, 8, 16, 24, 30);

function runLevel(lv){
  const src = fs.readFileSync(path.join(ROOT, 'games/balls.html'), 'utf8');
  let html = src.replace('<body>', `<body><script>
    localStorage.setItem('arcade.v1.save.balls', JSON.stringify({ level: ${lv}, maxLevel: 30 }));
    Element.prototype.animate = function(){ return {}; };
  </script>`);
  const tail = `<script>
  (function(){
    var wait = function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
    (async function(){
      await wait(700);
      for(var i = 0; i < 200; i++){
        var ov = document.querySelector('.overlay.show');
        if(ov){
          var h2 = ov.querySelector('h2');
          document.title = 'WIN level=${lv} moves=' + document.getElementById('uiMoves').textContent +
            ' stars=' + ov.querySelectorAll('.seals i.on').length +
            ' ' + (h2 ? h2.textContent : '') +
            ' | ' + (ov.querySelector('.sub') ? ov.querySelector('.sub').textContent : '');
          return;
        }
        document.getElementById('btnHint').click();
        await wait(40);
        var f = document.querySelector('.tube.hint-from');
        var t = document.querySelector('.tube.hint-to');
        if(!f || !t){ await wait(300); continue; }
        f.click();
        await wait(90);
        t.click();
        await wait(820);
      }
      document.title = 'FAIL level=${lv} moves=' + document.getElementById('uiMoves').textContent;
    })();
  })();
  </script>`;
  html = html.replace('</body>', tail + '</body>');
  const file = path.join(ROOT, 'games', '_solve_' + lv + '.html');
  fs.writeFileSync(file, html);

  const out = execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-sandbox',
    '--virtual-time-budget=240000', '--dump-dom',
    'file:///' + file.replace(/\\/g, '/')
  ], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 260000, stdio: ['ignore', 'pipe', 'ignore'] });
  const m = out.match(/<title>([\s\S]*?)<\/title>/);
  return m ? m[1].trim() : '(no title)';
}

let fail = 0;
levels.forEach(lv => {
  const res = runLevel(lv);
  const ok = res.startsWith('WIN');
  if(!ok) fail++;
  console.log((ok ? '✔ ' : '✘ ') + ('第 ' + lv + ' 关').padEnd(8), res);
});
console.log(fail ? '有 ' + fail + ' 关未通过' : '全部通关');
process.exit(fail ? 1 : 0);
