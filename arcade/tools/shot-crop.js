/* 画面特写：把游戏画布区域按倍率放大截取，用于检查美术细节 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = 'C:/Users/tongj/Desktop/游戏/arcade';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const W = +(process.env.MW || 390), H = +(process.env.MH || 844);
const Z = +(process.env.ZOOM || 3);
const CLIPY = +(process.env.CLIPY || 262);
const CLIPH = +(process.env.CLIPH || 212);

const SHIM = `<script>
(function(){
  window.requestAnimationFrame = function(cb){ return setTimeout(function(){ cb(performance.now()); }, 16); };
  window.cancelAnimationFrame = function(t){ clearTimeout(t); };
})();
</script>`;

const rel = process.argv[2];
const startAt = +(process.argv[3] || 0);
const budget = +(process.argv[4] || 9000);
const out = process.argv[5] || '_crop.png';

const drive = `<script>window.addEventListener('load',function(){
  function align(){var f=document.getElementById('frame');if(!f)return;
    f.style.position='fixed';f.style.left='0';f.style.top='0';f.style.margin='0';
    f.style.zIndex='99999';}
  setTimeout(align,60);
  ${startAt > 0 ? `setTimeout(function(){var b=document.querySelector('#btnStart');if(b)b.click();},${startAt});` : ''}
  ${process.env.JUMPAT ? `setTimeout(function(){var f=document.getElementById('frame');f.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:1,isPrimary:true,button:0,buttons:1}));},${process.env.JUMPAT});` : ''}
});</script>`;

const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
const html = src.replace('</head>', SHIM + '</head>').replace('</body>', drive + '</body>');
const tmp = path.join(ROOT, 'games', '_croptmp.html');
fs.writeFileSync(tmp, html);

const frame = path.join(ROOT, '_cropframe.html');
fs.writeFileSync(frame, `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
html,body{margin:0;padding:0;background:#cfc7b6;overflow:hidden}
.wrap{width:${W}px;height:${H}px;transform:scale(${Z});transform-origin:0 0}
iframe{width:${W}px;height:${H}px;border:0;display:block}
</style></head><body><div class="wrap"><iframe src="file:///${tmp.replace(/\\/g, '/')}"></iframe></div></body></html>`);

execFileSync(CHROME, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-sandbox',
  '--allow-file-access-from-files',
  '--run-all-compositor-stages-before-draw',
  '--window-size=' + Math.round(W * Z + 10) + ',' + Math.round(CLIPH * Z + 10),
  '--virtual-time-budget=' + budget, '--screenshot=' + path.join(ROOT, out),
  'file:///' + frame.replace(/\\/g, '/')
], { stdio: 'ignore', timeout: 120000 });

fs.unlinkSync(tmp);
if (fs.existsSync(frame)) fs.unlinkSync(frame);
console.log('shot', out);
