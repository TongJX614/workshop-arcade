/* 关卡生成器：为 30 关生成固定布局，并用求解器验证有解
   输出 levels.json，供 balls.html 内嵌 */
const fs = require('fs');

const COLORS = 12;
const CAP = 4;

const top = a => a[a.length - 1];
const clone = t => t.map(a => a.slice());
const isMono = t => t.length > 0 && t.every(c => c === t[0]);
const isDoneT = (t, cap) => t.length === cap && isMono(t);
const isWin = (tubes, cap) => tubes.every(t => t.length === 0 || isDoneT(t, cap));

function runLen(t){
  if(!t.length) return 0;
  const c = top(t);
  let n = 1;
  for(let i = t.length - 2; i >= 0; i--){ if(t[i] === c) n++; else break; }
  return n;
}
const keyOf = tubes => tubes.map(t => t.join('.')).sort().join('|');

function genMoves(tubes, cap){
  const res = [];
  let empty = -1;
  for(let i = 0; i < tubes.length; i++){
    const a = tubes[i];
    if(!a.length) continue;
    if(isDoneT(a, cap)) continue;
    const c = top(a), mono = isMono(a), rn = runLen(a);
    for(let j = 0; j < tubes.length; j++){
      if(i === j) continue;
      const b = tubes[j];
      if(b.length >= cap) continue;
      if(!b.length){
        if(mono) continue;
        if(empty === -1) empty = j;
        if(j !== empty) continue;
      } else if(top(b) !== c) continue;
      res.push({ from: i, to: j, n: Math.min(rn, cap - b.length) });
    }
  }
  return res;
}

function moveScore(tubes, m, cap){
  const a = tubes[m.from], b = tubes[m.to], c = top(a), n = m.n;
  let s = 0;
  if(b.length){
    s += 34 + b.length * 3;
    if(b.length + n === cap) s += 60;
    if(b.every(x => x === c)) s += 12;
  } else s -= 8;
  s += n * 4;
  if(a.length - n === 0) s += 18;
  if(a.length > n && a[a.length - n - 1] === c) s -= 22;
  return s;
}

function applyMove(t, m){ for(let i = 0; i < m.n; i++) t[m.to].push(t[m.from].pop()); }
function undoMove(t, m){ for(let i = 0; i < m.n; i++) t[m.from].push(t[m.to].pop()); }

function solve(start, cap, maxNodes){
  const visited = new Set();
  const path = [];
  const work = clone(start);
  let nodes = 0;
  function dfs(){
    if(++nodes > maxNodes) return false;
    if(isWin(work, cap)) return true;
    const k = keyOf(work);
    if(visited.has(k)) return false;
    visited.add(k);
    const ms = genMoves(work, cap);
    ms.sort((x, y) => moveScore(work, y, cap) - moveScore(work, x, cap));
    for(const m of ms){
      applyMove(work, m); path.push(m);
      if(dfs()) return true;
      path.pop(); undoMove(work, m);
    }
    return false;
  }
  return dfs() ? path.map(m => ({ from: m.from, to: m.to, n: m.n })) : null;
}

function mulberry32(a){
  return function(){
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function shuffleSeeded(a, rnd){
  for(let i = a.length - 1; i > 0; i--){
    const j = (rnd() * (i + 1)) | 0, t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}
function messScore(tubes, cap){
  let s = 0;
  for(const t of tubes){
    if(!t.length) continue;
    s += new Set(t).size - 1;
    for(let i = 1; i < t.length; i++) if(t[i] !== t[i - 1]) s++;
    if(isDoneT(t, cap)) s -= 3;
  }
  return s;
}

/* 30 关配置：3→12 色，后 6 关改为每瓶 5 格 */
const CONFIGS = [
  [3,4,2],[4,4,2],[4,4,2],[5,4,2],[5,4,2],[6,4,2],[6,4,2],[7,4,2],
  [7,4,2],[8,4,2],[8,4,2],[9,4,2],[9,4,2],[10,4,2],[10,4,2],[11,4,2],
  [11,4,2],[12,4,2],[12,4,2],[12,4,2],[12,4,2],[12,4,2],[12,4,2],[12,4,2],
  [10,5,2],[10,5,2],[11,5,2],[11,5,2],[12,5,2],[12,5,2]
];

const out = [];
let t0 = Date.now();

for(let lv = 1; lv <= CONFIGS.length; lv++){
  const [colors, cap, empties] = CONFIGS[lv - 1];
  const seedBase = lv * 7919 + colors * 131 + cap * 17;
  let picked = null;

  for(let attempt = 0; attempt < 60 && !picked; attempt++){
    const rnd = mulberry32(seedBase + attempt * 104729);
    const pool = [];
    for(let c = 0; c < colors; c++) for(let k = 0; k < cap; k++) pool.push(c);
    shuffleSeeded(pool, rnd);
    const tubes = [];
    for(let c = 0; c < colors; c++) tubes.push(pool.slice(c * cap, c * cap + cap));
    for(let e = 0; e < empties; e++) tubes.push([]);
    if(tubes.some(t => isDoneT(t, cap))) continue;
    if(messScore(tubes, cap) < colors * 1.7) continue;

    const sol = solve(tubes, cap, 400000);
    if(!sol) continue;
    picked = { tubes, par: Math.max(sol.length, Math.round(colors * 1.8) + 5), sol: sol.length };
  }

  if(!picked){
    console.error('FAILED level', lv, colors, cap);
    process.exit(1);
  }
  out.push({ lv, colors, cap, empties, par: picked.par, tubes: picked.tubes });
  console.log('L' + lv, colors + '色', 'cap' + cap, 'par ' + picked.par, 'tubes ' + picked.tubes.length);
}

fs.writeFileSync(__dirname + '/levels.json', JSON.stringify(out));
console.log('---');
console.log('30 关全部有解，耗时', Date.now() - t0, 'ms，总球数', out.reduce((a, b) => a + b.tubes.reduce((x, t) => x + t.length, 0), 0));
console.log('par 范围', Math.min(...out.map(o => o.par)), '-', Math.max(...out.map(o => o.par)));
