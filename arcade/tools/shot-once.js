/* 单帧截图：可指定「多少毫秒后点开始」，用于观察某一时刻的画面 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = 'C:/Users/tongj/Desktop/游戏/arcade';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const W = +(process.env.MW || 390), H = +(process.env.MH || 844);
const Z = +(process.env.ZOOM || 1);

const SHIM = `<script>
(function(){
  window.requestAnimationFrame = function(cb){ return setTimeout(function(){ cb(performance.now()); }, 16); };
  window.cancelAnimationFrame = function(t){ clearTimeout(t); };
})();
</script>`;

const rel = process.argv[2];
const startAt = +(process.argv[3] || 0);
const budget = +(process.argv[4] || 1500);
const out = process.argv[5] || '_shot.png';

const drive = startAt > 0
  ? `<script>window.addEventListener('load',function(){setTimeout(function(){var b=document.querySelector('#btnStart');if(b)b.click();},${startAt});});</script>`
  : '';

const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
const html = src.replace('</head>', SHIM + '</head>').replace('</body>', drive + '</body>');
const tmp = path.join(ROOT, 'games', '_shottmp.html');
fs.writeFileSync(tmp, html);

const frame = path.join(ROOT, '_shotframe.html');
fs.writeFileSync(frame, `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
html,body{margin:0;padding:0;background:#cfc7b6}
iframe{width:${W}px;height:${H}px;border:0;display:block;transform:scale(${Z});transform-origin:0 0}
</style></head><body><iframe src="file:///${tmp.replace(/\\/g, '/')}"></iframe></body></html>`);

const shot = path.join(ROOT, out);
execFileSync(CHROME, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-sandbox',
  '--allow-file-access-from-files',
  '--run-all-compositor-stages-before-draw',
  '--window-size=' + Math.round(W * Z + 10) + ',' + Math.round(H * Z + 10),
  '--virtual-time-budget=' + budget, '--screenshot=' + shot,
  'file:///' + frame.replace(/\\/g, '/')
], { stdio: 'ignore', timeout: 120000 });

fs.unlinkSync(tmp);
if (fs.existsSync(frame)) fs.unlinkSync(frame);
console.log('shot', out);
