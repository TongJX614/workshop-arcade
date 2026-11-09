/* 静态体检：逐页扫描 40 个游戏文件，检查 Shell API 调用、资源路径、
   重复 id、未闭合标签、可疑的裸 setInterval 等。仅读不写。 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const GAMES = path.join(ROOT, 'games');

const API = ['Store', 'Sound', 'haptic', 'toast', 'plate', 'hidePlate', 'fmtTime',
  'fmtNum', 'back', '$', '$$', 'el', 'rand', 'shuffle', 'swipe', 'bump',
  'floatNum', 'flash', 'soundBtn', 'dpr'];

const files = fs.readdirSync(GAMES).filter(f => f.endsWith('.html')).sort();
let bad = 0;

for (const f of files) {
  const src = fs.readFileSync(path.join(GAMES, f), 'utf8');
  const probs = [];

  // 1. Shell API
  const used = new Set();
  for (const m of src.matchAll(/Shell\.([A-Za-z_$][\w$]*)/g)) used.add(m[1]);
  const missing = [...used].filter(k => !API.includes(k));
  if (missing.length) probs.push('调用了不存在的 Shell API: ' + missing.join(', '));

  // 2. 是否引入 shell.js / shell.css，路径对不对
  const links = [...src.matchAll(/(?:href|src)="([^"]+)"/g)].map(m => m[1]);
  for (const l of links) {
    if (/^(#|data:|https?:|mailto:|javascript:)/.test(l)) continue;
    const t = path.resolve(GAMES, l.split('?')[0].split('#')[0]);
    if (!fs.existsSync(t)) probs.push('资源不存在: ' + l);
  }
  if (!links.some(l => l.includes('shell.js'))) probs.push('未引入 shell.js');
  if (!links.some(l => l.includes('shell.css'))) probs.push('未引入 shell.css');

  // 3. 重复 id
  const ids = [...src.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  const dupId = ids.filter((v, i) => ids.indexOf(v) !== i);
  if (dupId.length) probs.push('重复 id: ' + [...new Set(dupId)].join(', '));

  // 4. 标签平衡（粗略：div/span/section 开闭数）
  for (const tag of ['div', 'span', 'section', 'button']) {
    const open = (src.match(new RegExp('<' + tag + '[\\s>]', 'g')) || []).length;
    const close = (src.match(new RegExp('</' + tag + '>', 'g')) || []).length;
    if (open !== close) probs.push(`<${tag}> 开闭不匹配 ${open}/${close}`);
  }

  // 5. 定时器：有 setInterval/setTimeout 递归但没有清理入口
  const hasTimer = /setInterval\(/.test(src);
  const hasClear = /clearInterval\(/.test(src);
  if (hasTimer && !hasClear) probs.push('用了 setInterval 但没有 clearInterval');

  // 6. 存档 key 与文件名一致性
  const saves = [...src.matchAll(/Store\.(?:get|set|record|save)\(\s*['"]([^'"]+)['"]/g)].map(m => m[1]);
  const key = saves.filter(s => s.startsWith('save.'))[0];
  if (key) {
    const id = key.slice(5).split('.')[0];
    const base = f.replace('.html', '');
    if (id !== base && !(base === '2048' && id === 'g2048')) {
      probs.push(`存档 key "${key}" 与文件名 ${base} 不一致`);
    }
  }

  // 7. canvas 页面是否做了 DPR（本地 var dpr 或 Shell.dpr() 均可）
  if (/<canvas/.test(src)) {
    if (!/\bdpr\b/.test(src)) probs.push('有 canvas 但没取 dpr');
    if (!/setTransform|\.scale\(/.test(src)) probs.push('有 canvas 但没做缩放补偿');
  }

  // 8. 返回按钮
  if (!/Shell\.back|onclick="[^"]*back|history\.back/.test(src)) probs.push('缺少返回入口');

  if (probs.length) {
    bad++;
    console.log('\n✘ ' + f);
    probs.forEach(p => console.log('   · ' + p));
  }
}

console.log(`\n共检查 ${files.length} 页，${bad} 页有问题`);
process.exit(bad ? 1 : 0);
