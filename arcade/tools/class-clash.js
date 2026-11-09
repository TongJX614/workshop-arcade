/*
 * 排查「页面自有类名」与 shell.css 全局类名的冲突
 * 冲突 → 页面样式没覆盖到的属性会从全局样式漏进来（井字棋的红底就是这么来的）
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const shell = fs.readFileSync(path.join(ROOT, 'assets/shell.css'), 'utf8');

/* 只取 shell.css 里带视觉属性的规则 */
const shellRules = new Map();
const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
let m;
while ((m = ruleRe.exec(shell))) {
  const sels = m[1].split(',').map(s => s.trim()).filter(s => !s.startsWith('@'));
  const body = m[2];
  for (const sel of sels) {
    const cls = sel.match(/^\.([a-zA-Z][\w-]*)/);
    if (!cls) continue;
    const props = [];
    if (/background|border-radius|\bcolor:|\bwidth:|\bheight:|\bfill:/.test(body)) props.push(body.trim().slice(0, 80));
    if (props.length) {
      if (!shellRules.has(cls[1])) shellRules.set(cls[1], []);
      shellRules.get(cls[1]).push(sel + ' { ' + props.join(' ') + ' }');
    }
  }
}

const files = fs.readdirSync(path.join(ROOT, 'games')).filter(f => f.endsWith('.html'));
let hits = 0;

for (const f of files) {
  const src = fs.readFileSync(path.join(ROOT, 'games', f), 'utf8');
  const style = src.match(/<style>([\s\S]*?)<\/style>/);
  if (!style) continue;
  const css = style[1];
  const own = new Set();
  const ownRe = /\.([a-zA-Z][\w-]*)/g;
  let k;
  while ((k = ownRe.exec(css))) own.add(k[1]);

  const clash = [...own].filter(c => shellRules.has(c));
  if (!clash.length) continue;

  // 页面是否给这个类设了 background / border-radius
  const bad = [];
  for (const c of clash) {
    const blockRe = new RegExp('\\.' + c + '[^{]*\\{([^}]*)\\}', 'g');
    let b, setsBg = false, setsRadius = false;
    while ((b = blockRe.exec(css))) {
      if (/background/.test(b[1])) setsBg = true;
      if (/border-radius/.test(b[1])) setsRadius = true;
    }
    const shellHasBg = shellRules.get(c).some(r => /background/.test(r));
    const shellHasRadius = shellRules.get(c).some(r => /border-radius/.test(r));
    if ((shellHasBg && !setsBg) || (shellHasRadius && !setsRadius)) {
      bad.push(c + (shellHasBg && !setsBg ? '[背景未覆盖]' : '') + (shellHasRadius && !setsRadius ? '[圆角未覆盖]' : ''));
    }
  }
  if (bad.length) {
    hits++;
    console.log(f.padEnd(18), bad.join(' '));
  }
}
if (!hits) console.log('无冲突');
