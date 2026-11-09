/* 截「玩起来」的样子：垫片驱动 rAF，自动点开始并随机操作几秒后截图，
   用于复核 Canvas 游戏在对局中的画面（普通截图只能拿到第一帧）。 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = 'C:/Users/tongj/Desktop/游戏/arcade';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const W = +(process.env.MW || 390), H = +(process.env.MH || 844);

const SHIM = `<script>
(function(){
  window.requestAnimationFrame = function(cb){ return setTimeout(function(){ cb(performance.now()); }, 16); };
  window.cancelAnimationFrame = function(t){ clearTimeout(t); };
})();
</script>`;

const DRIVE = `<script>
window.addEventListener('load', function(){
  setTimeout(function(){
    var btns = [].slice.call(document.querySelectorAll('.controls button'));
    for(var i = 0; i < btns.length; i++){
      if(/开始|起跑|出发|挑战/.test(btns[i].textContent)){ btns[i].click(); break; }
    }
    var cv = document.querySelector('canvas');
    var n = 0;
    var iv = setInterval(function(){
      n++;
      if(n > 26){ clearInterval(iv); return; }
      if(cv){
        var r = cv.getBoundingClientRect();
        var x = r.left + r.width * (0.2 + Math.random() * 0.6);
        var y = r.top + r.height * (0.25 + Math.random() * 0.5);
        cv.dispatchEvent(new PointerEvent('pointerdown', { clientX: x, clientY: y, bubbles: true, pointerId: 1, isPrimary: true, button: 0, buttons: 1 }));
        cv.dispatchEvent(new PointerEvent('pointerup', { clientX: x + 30, clientY: y + 30, bubbles: true, pointerId: 1, button: 0, buttons: 0 }));
      }
      document.dispatchEvent(new KeyboardEvent('keydown', { key: ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '][n % 5], bubbles: true }));
    }, 90);
  }, 300);
});
</script>`;

const targets = process.argv.slice(2);
targets.forEach(rel => {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  let html = src.replace('</head>', SHIM + '</head>').replace('</body>', DRIVE + '</body>');
  const tmp = path.join(ROOT, 'games', '_play.html');
  fs.writeFileSync(tmp, html);
  const frame = path.join(ROOT, '_pframe.html');
  fs.writeFileSync(frame, `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;padding:0;background:#cfc7b6}
  iframe{width:${W}px;height:${H}px;border:0;display:block}
  </style></head><body><iframe src="file:///${tmp.replace(/\\/g, '/')}"></iframe></body></html>`);
  const shot = path.join(ROOT, '_p_' + rel.replace(/[\/.]/g, '_') + '.png');
  execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-sandbox',
    '--run-all-compositor-stages-before-draw',
    '--window-size=' + (W + 10) + ',' + (H + 10),
    '--virtual-time-budget=9000', '--screenshot=' + shot,
    'file:///' + frame.replace(/\\/g, '/')
  ], { stdio: 'ignore', timeout: 90000 });
  console.log('shot', path.basename(shot));
  fs.unlinkSync(tmp);
});
fs.existsSync(path.join(ROOT, '_pframe.html')) && fs.unlinkSync(path.join(ROOT, '_pframe.html'));
