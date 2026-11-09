const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = 'C:/Users/tongj/Desktop/游戏/arcade';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const targets = process.argv.slice(2);

targets.forEach(rel => {
  const url = 'file:///' + path.join(ROOT, rel).replace(/\\/g, '/');
  const shot = path.join(ROOT, '_d_' + rel.replace(/[\/.]/g, '_') + '.png');
  execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    '--force-prefers-reduced-motion',
    '--window-size=1000,900', '--virtual-time-budget=6000',
    '--screenshot=' + shot, url
  ], { stdio: 'ignore', timeout: 60000 });
  console.log('shot', path.basename(shot));
});
