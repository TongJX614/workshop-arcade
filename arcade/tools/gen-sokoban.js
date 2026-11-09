/* 推箱子关卡生成：从「箱子全在目标点」的终局反向拉箱打乱，
   天然保证有解；再用 BFS 求最优步数作为参考。 */
const fs = require('fs');

const ROOMS = [
  { // 7x7 两根柱子
    map: [
      '#######',
      '#     #',
      '# ##  #',
      '#     #',
      '#  ## #',
      '#     #',
      '#######'
    ]
  },
  { // 9x7 上下两道墙
    map: [
      '#########',
      '#       #',
      '#  ###  #',
      '#       #',
      '#  ###  #',
      '#       #',
      '#########'
    ]
  },
  { // 8x8 中间块
    map: [
      '########',
      '#      #',
      '# #### #',
      '# #    #',
      '# # ## #',
      '#      #',
      '#      #',
      '########'
    ]
  },
  { // 9x8 双竖墙
    map: [
      '#########',
      '#       #',
      '# # # # #',
      '#   #   #',
      '# #   # #',
      '#   #   #',
      '# # # # #',
      '#########'
    ]
  }
];

function parse(map){
  const h = map.length, w = map[0].length;
  const walls = [];
  const floor = [];
  for(let r = 0; r < h; r++){
    walls.push([]);
    for(let c = 0; c < w; c++){
      const ch = map[r][c];
      walls[r].push(ch === '#');
      if(ch !== '#') floor.push([r, c]);
    }
  }
  return { w, h, walls, floor };
}

function mulberry32(a){
  return function(){
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

function scramble(room, goals, startPlayer, steps, rnd){
  const boxes = new Set(goals.map(g => g[0] + ',' + g[1]));
  let p = startPlayer;
  const hist = [];
  for(let s = 0; s < steps; s++){
    const d = DIRS[(rnd() * 4) | 0];
    const q = [p[0] + d[0], p[1] + d[1]];
    if(q[0] < 0 || q[1] < 0 || q[0] >= room.h || q[1] >= room.w) continue;
    if(room.walls[q[0]][q[1]]) continue;
    const qk = q[0] + ',' + q[1];
    if(boxes.has(qk)){
      // 反拉：玩家退到 p-d，箱子回到 p
      const back = [p[0] - d[0], p[1] - d[1]];
      if(back[0] < 0 || back[1] < 0 || back[0] >= room.h || back[1] >= room.w) continue;
      if(room.walls[back[0]][back[1]]) continue;
      if(boxes.has(back[0] + ',' + back[1])) continue;
      boxes.delete(qk);
      boxes.add(pk(p));
      hist.push({ type: 'pull', from: p, to: back, boxFrom: q, boxTo: p });
      p = back;
    }else{
      hist.push({ type: 'walk', from: p, to: q });
      p = q;
    }
  }
  return { boxes: Array.from(boxes).map(s => s.split(',').map(Number)), player: p };
}
function pk(p){ return p[0] + ',' + p[1]; }

/* BFS 最短步数（玩家移动数），带简单的死角剪枝 */
function solve(room, goals, boxes, player, maxNodes){
  const goalSet = new Set(goals.map(g => g[0] + ',' + g[1]));
  const boxSet = new Set(boxes.map(b => b[0] + ',' + b[1]));
  const dead = new Set();
  // 死角：非目标点的墙角
  for(let r = 0; r < room.h; r++) for(let c = 0; c < room.w; c++){
    if(room.walls[r][c]) continue;
    const k = r + ',' + c;
    if(goalSet.has(k)) continue;
    const up = room.walls[r - 1] ? room.walls[r - 1][c] : true;
    const dn = room.walls[r + 1] ? room.walls[r + 1][c] : true;
    const lf = room.walls[r][c - 1];
    const rt = room.walls[r][c + 1];
    if((up || dn) && (lf || rt)) dead.add(k);
  }

  const key = (p, set) => p[0] + ',' + p[1] + '|' + Array.from(set).sort().join(';');
  const start = { p: player, b: boxSet };
  const q = [{ state: start, path: [] }];
  const seen = new Set([key(player, boxSet)]);
  let nodes = 0;

  while(q.length && nodes < maxNodes){
    const cur = q.shift();
    nodes++;
    const { p, b } = cur.state;
    if(b.size === goals.length && Array.from(b).every(k => goalSet.has(k))){
      return cur.path;
    }
    for(const d of DIRS){
      const np = [p[0] + d[0], p[1] + d[1]];
      if(room.walls[np[0]] === undefined || room.walls[np[0]][np[1]] === undefined) continue;
      if(room.walls[np[0]][np[1]]) continue;
      const nk = pk(np);
      let nb = b;
      let pushed = false;
      if(b.has(nk)){
        const beyond = [np[0] + d[0], np[1] + d[1]];
        if(room.walls[beyond[0]] === undefined || room.walls[beyond[0]][beyond[1]] === undefined) continue;
        if(room.walls[beyond[0]][beyond[1]]) continue;
        if(b.has(pk(beyond))) continue;
        if(dead.has(pk(beyond))) continue;
        nb = new Set(b);
        nb.delete(nk);
        nb.add(pk(beyond));
        pushed = true;
      }
      const kk = key(np, nb);
      if(seen.has(kk)) continue;
      seen.add(kk);
      q.push({ state: { p: np, b: nb }, path: cur.path.concat([{ p: np, push: pushed }]) });
    }
  }
  return null;
}

const CONFIGS = [
  { room: 0, boxes: 1, seed: 101 },
  { room: 0, boxes: 2, seed: 202 },
  { room: 1, boxes: 2, seed: 303 },
  { room: 1, boxes: 3, seed: 404 },
  { room: 2, boxes: 2, seed: 505 },
  { room: 2, boxes: 3, seed: 606 },
  { room: 3, boxes: 2, seed: 707 },
  { room: 3, boxes: 3, seed: 808 },
  { room: 1, boxes: 4, seed: 909 },
  { room: 2, boxes: 4, seed: 1010 },
  { room: 3, boxes: 4, seed: 1111 },
  { room: 0, boxes: 3, seed: 1212 }
];

const out = [];
for(const cfg of CONFIGS){
  const room = parse(ROOMS[cfg.room].map);
  let best = null;
  for(let attempt = 0; attempt < 40 && !best; attempt++){
    const rnd = mulberry32(cfg.seed + attempt * 7919);
    const floor = room.floor.slice();
    // 选目标点：彼此不重复，尽量分散
    const goals = [];
    const pool = floor.slice();
    while(goals.length < cfg.boxes && pool.length){
      const i = (rnd() * pool.length) | 0;
      const cand = pool.splice(i, 1)[0];
      if(goals.some(g => Math.abs(g[0] - cand[0]) + Math.abs(g[1] - cand[1]) < 2)) continue;
      goals.push(cand);
    }
    if(goals.length < cfg.boxes) continue;

    const freeForPlayer = floor.filter(f => !goals.some(g => g[0] === f[0] && g[1] === f[1]));
    if(!freeForPlayer.length) continue;
    const startP = freeForPlayer[(rnd() * freeForPlayer.length) | 0];

    const sc = scramble(room, goals, startP, 160 + cfg.boxes * 90, rnd);
    // 至少要有一个箱子离开目标点
    const gs = new Set(goals.map(pk));
    if(sc.boxes.every(b => gs.has(pk(b)))) continue;

    const sol = solve(room, goals, sc.boxes, sc.player, 260000);
    var minPar = 6 + cfg.boxes * 3;
    if(!sol || sol.length < minPar) continue;
    if(sol.filter(x => x.push).length < Math.max(2, cfg.boxes)) continue;
    best = {
      w: room.w, h: room.h,
      walls: ROOMS[cfg.room].map,
      goals: goals,
      boxes: sc.boxes,
      player: sc.player,
      par: sol.length,
      pushes: sol.filter(s => s.push).length
    };
  }
  if(!best){
    console.error('FAILED config', JSON.stringify(cfg));
    process.exit(1);
  }
  out.push(best);
  console.log('L' + out.length, ROOMS[cfg.room].map.length + '行', cfg.boxes + '箱',
    'par ' + best.par + ' 步 / ' + best.pushes + ' 推');
}

fs.writeFileSync(__dirname + '/sokoban.json', JSON.stringify(out));
console.log('---');
console.log(out.length + ' 关全部可解，最长 ' + Math.max(...out.map(o => o.par)) + ' 步');
