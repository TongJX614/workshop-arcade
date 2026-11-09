const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = 'C:/Users/tongj/Desktop/游戏/arcade';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const targets = process.argv.slice(2);
if(!targets.length){
  console.log('用法: node tools/mobile.js index.html games/balls.html ...');
  process.exit(1);
}

const W = +(process.env.MW || 390), H = +(process.env.MH || 844);
targets.forEach((rel, i) => {
  const url = 'file:///' + path.join(ROOT, rel).replace(/\\/g, '/');
  const frame = path.join(ROOT, '_mframe.html');
  fs.writeFileSync(frame, `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;padding:0;background:#cfc7b6}
  iframe{width:${W}px;height:${H}px;border:0;display:block}
  </style></head><body><iframe src="${url}"></iframe></body></html>`);
  const shot = path.join(ROOT, '_m_' + rel.replace(/[\/.]/g, '_') + '.png');
  execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-sandbox',
    '--run-all-compositor-stages-before-draw', '--force-prefers-reduced-motion',
    '--window-size=' + (W + 10) + ',' + (H + 10),
    '--virtual-time-budget=6000', '--screenshot=' + shot, 'file:///' + frame.replace(/\\/g, '/')
  ], { stdio: 'ignore', timeout: 60000 });
  console.log('shot', path.basename(shot));
});
