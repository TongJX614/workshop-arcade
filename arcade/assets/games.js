/* =========================================================
   游戏清单：名称 / 图标 / 分类 / 进度读取
   新增游戏只需在这里加一项
   ========================================================= */
(function(global){
  'use strict';

  var S = global.Shell.Store;
  function n(v){ return typeof v === 'number' ? v : 0; }
  function rec(key){ return S.get('save.' + key, {}) || {}; }

  /* 分类：门厅按这四组排 */
  var CATS = [
    { id: 'puzzle', name: '益智', en: 'PUZZLE' },
    { id: 'table',  name: '棋牌', en: 'TABLE' },
    { id: 'arcade', name: '街机', en: 'ARCADE' },
    { id: 'mind',   name: '记忆', en: 'MIND' }
  ];

  var ICON = {
    /* ---- 前十款 ---- */
    balls: '<path d="M9 3h6v13a3 3 0 0 1-6 0V3Z"/><circle cx="12" cy="17" r="1.6"/><circle cx="12" cy="13.4" r="1.6"/><path d="M7 6h10"/>',
    slide: '<rect x="3.5" y="3.5" width="17" height="17" rx="1.2"/><path d="M9 3.5v17M14.5 3.5v17M3.5 9h17M3.5 14.5h17"/>',
    memory: '<rect x="3.5" y="6" width="10" height="14" rx="1.2"/><rect x="10.5" y="3" width="10" height="14" rx="1.2"/>',
    g2048: '<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1" stroke-dasharray="2 2.6"/>',
    sokoban: '<rect x="6.5" y="6.5" width="11" height="11" rx="1"/><path d="M6.5 12h11M12 6.5v11"/><path d="M2.5 12h2M19.5 12h2"/>',
    snake: '<path d="M4 17h7a3 3 0 0 0 0-6H8a3 3 0 0 1 0-6h6"/><circle cx="19" cy="17" r="1.6"/><path d="M14 17h3.2"/>',
    breakout: '<rect x="4" y="19" width="6" height="2" rx="1"/><circle cx="14.5" cy="15" r="2"/><path d="M4 6h5M11 6h5M18 6h2"/>',
    gomoku: '<path d="M4 4v16M10 4v16M16 4v16M4 4h16M4 10h16M4 16h16" stroke-width=".9"/>',
    tetris: '<rect x="4" y="4" width="6" height="6" rx=".8"/><rect x="10" y="4" width="6" height="6" rx=".8"/><rect x="10" y="10" width="6" height="6" rx=".8"/><rect x="10" y="16" width="6" height="6" rx=".8"/>',
    lights: '<circle cx="6" cy="6" r="2.2" fill="currentColor" stroke="none"/><circle cx="18" cy="6" r="2.2"/><circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none"/><circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="18" r="2.2"/>',

    /* ---- 新增三十款 ---- */
    mines: '<circle cx="12" cy="13" r="4.6"/><path d="M12 3v2.4M12 20.6V23M2 13h2.4M19.6 13H22M5.4 6.4 4 5M18.6 6.4 20 5M18.6 19.6 20 21M5.4 19.6 4 21"/>',
    sudoku: '<rect x="3.5" y="3.5" width="17" height="17" rx="1"/><path d="M9.2 3.5v17M14.8 3.5v17M3.5 9.2h17M3.5 14.8h17"/><circle cx="6.4" cy="6.4" r=".9" fill="currentColor" stroke="none"/><circle cx="17.6" cy="17.6" r=".9" fill="currentColor" stroke="none"/>',
    hanoi: '<path d="M3 20h18"/><path d="M6.5 20V7M12 20V7M17.5 20V7"/><rect x="4.4" y="15" width="4.2" height="2.4" rx=".7"/><rect x="10" y="12.4" width="4" height="2.4" rx=".7"/><rect x="15.4" y="9.8" width="4.2" height="2.4" rx=".7"/>',
    ttt: '<path d="M9 3.2v17.6M15 3.2v17.6M3.2 9h17.6M3.2 15h17.6"/><path d="M10.4 4.6l2.6 2.6M13 4.6l-2.6 2.6"/>',
    reversi: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 1 0 17Z" fill="currentColor" stroke="none"/>',
    pipes: '<path d="M3 7h6.5a2.5 2.5 0 0 1 2.5 2.5v5a2.5 2.5 0 0 0 2.5 2.5H21"/><circle cx="3" cy="7" r="1.5"/><circle cx="21" cy="17" r="1.5"/>',
    nonogram: '<rect x="3.5" y="3.5" width="17" height="17" rx="1"/><path d="M9.2 3.5v17M14.8 3.5v17M3.5 9.2h17M3.5 14.8h17"/><rect x="9.4" y="9.4" width="5.2" height="5.2" fill="currentColor" stroke="none"/>',
    tf: '<path d="M5 6.5h4.2L5 12.4h4.2"/><path d="M16.4 6v6.4h4.2"/><path d="M18.5 6v12"/>',
    simon: '<rect x="3" y="3" width="8" height="8" rx="1.4"/><rect x="13" y="3" width="8" height="8" rx="1.4"/><rect x="3" y="13" width="8" height="8" rx="1.4"/><rect x="13" y="13" width="8" height="8" rx="1.4" fill="currentColor" stroke="none"/>',
    wordle: '<rect x="2.6" y="8.4" width="4.4" height="7.2" rx=".6"/><rect x="8" y="8.4" width="4.4" height="7.2" rx=".6" fill="currentColor" stroke="none"/><rect x="13.4" y="8.4" width="4.4" height="7.2" rx=".6"/><rect x="18.8" y="8.4" width="2.6" height="7.2" rx=".6"/>',
    maze: '<rect x="3" y="3" width="18" height="18" rx="1"/><path d="M3 8.5h6.5v6H15V8.5h6M9.5 3v5.5M15 14.5V21M9 21v-6.5"/><circle cx="5.6" cy="18.4" r="1.2" fill="currentColor" stroke="none"/>',
    oneline: '<circle cx="5" cy="19" r="1.7"/><circle cx="12" cy="4.6" r="1.7"/><circle cx="19" cy="19" r="1.7"/><path d="M5 19 12 4.6 19 19M5 19h14"/>',
    puzzle: '<path d="M4 4h6.2v2.7a2 2 0 1 0 3.6 0V4H20v6.2h-2.7a2 2 0 1 0 0 3.6H20V20H4V4Z"/>',
    match3: '<circle cx="6.2" cy="8" r="2.4"/><circle cx="12" cy="8" r="2.4"/><circle cx="17.8" cy="8" r="2.4"/><circle cx="6.2" cy="16" r="2.4" fill="currentColor" stroke="none"/><circle cx="12" cy="16" r="2.4"/><circle cx="17.8" cy="16" r="2.4" fill="currentColor" stroke="none"/>',
    link: '<circle cx="5" cy="19" r="2"/><circle cx="19" cy="5" r="2"/><path d="M5 19v-5.5h14V5"/>',
    stack: '<rect x="4.6" y="17" width="14.8" height="4" rx=".6"/><rect x="6.8" y="12" width="12.4" height="4" rx=".6"/><rect x="9" y="7" width="10" height="4" rx=".6"/>',
    whack: '<circle cx="10.5" cy="16.5" r="5"/><path d="M10.5 11.5V9"/><path d="M17.4 3.6l3 3-4.2 4.2-3-3Z"/>',
    pong: '<rect x="4" y="3.4" width="6.4" height="2.2" rx="1"/><rect x="4" y="18.4" width="6.4" height="2.2" rx="1"/><circle cx="16" cy="9.6" r="2.1"/><path d="M12 12h1" stroke-dasharray="1 2.4"/>',
    invaders: '<path d="M7.6 8.6h3.2v3.2H7.6ZM13.2 8.6h3.2v3.2h-3.2Z" fill="currentColor" stroke="none"/><path d="M4.4 12.4h15.2v4.4h-3.2v3.4H7.6v-3.4H4.4Z"/>',
    runner: '<circle cx="14.6" cy="5" r="2"/><path d="M11 21.2l2-5.4-3-3 2.8-4h3l2.4 3.4"/><path d="M13 15.8l3 5.4"/><path d="M8.4 11.6 6.2 15"/>',
    catch: '<path d="M4 10h16l-2.2 10H6.2Z"/><path d="M6.4 10 9 5h6l2.6 5"/><circle cx="12" cy="3" r="1.4"/>',
    reaction: '<circle cx="12" cy="12" r="8.4"/><circle cx="12" cy="12" r="2.6" fill="currentColor" stroke="none"/><path d="M12 3.6v2M20.4 12h-2M12 20.4v-2M3.6 12h2"/>',
    hoops: '<path d="M3 19h5"/><path d="M5.5 19V9"/><path d="M5.5 9h4"/><path d="M15 5.5v13"/><path d="M15 5.5h5"/><path d="M15 9h5"/><path d="M15 9l5 3.5M20 9l-5 3.5"/><circle cx="8.6" cy="14.4" r="2.4"/>',
    flappy: '<circle cx="9" cy="11" r="4"/><path d="M13.2 10.2 17.6 11.6 13.2 13Z" fill="currentColor" stroke="none"/><path d="M16.6 3.4v6.2h4.2V3.4M16.6 14.4v6.2h4.2v-6.2"/>',
    math: '<path d="M4.5 7.4h6M7.5 4.4v6M4.5 16.6h6"/><path d="M14.5 5.2l5 5M19.5 5.2l-5 5"/><path d="M14.5 14.4h6v6h-6Z"/>',
    nummem: '<path d="M4.4 8 6.8 6v12"/><path d="M12 6.6h5.2l-3.2 5.4a3.2 3.2 0 1 1-2.2 5.4"/>',
    spot: '<rect x="2.6" y="5" width="8.2" height="14" rx="1"/><rect x="13.2" y="5" width="8.2" height="14" rx="1"/><circle cx="6.6" cy="10" r="1.3" fill="currentColor" stroke="none"/><circle cx="17.4" cy="14.6" r="1.3" fill="currentColor" stroke="none"/><path d="M13.2 9.4h3"/>',
    klotski: '<rect x="3" y="3" width="18" height="18" rx="1"/><rect x="6" y="6" width="7" height="6" rx=".6"/><rect x="14.4" y="6" width="3.6" height="3.6" rx=".6"/><rect x="6" y="14" width="3.6" height="3.6" rx=".6"/><rect x="11" y="14" width="7" height="3.6" rx=".6"/>',
    mastermind: '<circle cx="6" cy="7" r="2"/><circle cx="12" cy="7" r="2" fill="currentColor" stroke="none"/><circle cx="18" cy="7" r="2"/><circle cx="6" cy="13.4" r="2" fill="currentColor" stroke="none"/><circle cx="12" cy="13.4" r="2"/><circle cx="18" cy="13.4" r="2"/><path d="M4.5 19.6h15"/>',
    slice: '<path d="M3 20.4 17.4 6"/><path d="M17.4 6l3.4-2.4-1.8 4.2Z"/><path d="M5.4 20.4h-2.4"/><circle cx="9.4" cy="14.6" r="2.8"/><path d="M9.4 11.8V9.6"/>'
  };

  var GAMES = [
    /* ================= 益智 ================= */
    {
      id: 'balls', no: 'I', name: '彩球归位', en: 'COLOUR SORTING', cat: 'puzzle', featured: true,
      desc: '同色球汇到同一个瓶里。只能搬瓶口连续同色的那一串，先升出瓶口，再横移，不会穿管。',
      href: 'games/balls.html',
      stat: function(){
        var s = rec('balls');
        var lv = n(s.level) || 1;
        return { label: '进度', value: '第 ' + lv + ' / 30 关', note: s.won ? '已通关 ' + s.won + ' 次' : '从第 1 关开始' };
      }
    },
    {
      id: 'slide', no: 'II', name: '数字推盘', en: 'SLIDING PUZZLE', cat: 'puzzle',
      desc: '把 1 到 N²−1 按顺序推回去。每一步都走得通，不会推成死局。',
      href: 'games/slide.html',
      stat: function(){
        var s = rec('slide');
        var size = n(s.size) || 4;
        var b = s.best && typeof s.best === 'object' ? s.best[size] : s.best;
        return b ? { label: '最佳', value: size + '×' + size + ' · ' + b + ' 步' } : { label: '最佳', value: '尚无记录' };
      }
    },
    {
      id: 'g2048', no: 'IV', name: '二〇四八', en: '2048', cat: 'puzzle',
      desc: '同数相撞就合并。目标是在格子填满之前，撞出一块 2048。',
      href: 'games/2048.html',
      stat: function(){
        var s = rec('g2048');
        return s.best ? { label: '最高分', value: global.Shell.fmtNum(s.best), note: s.max ? '最大方块 ' + s.max : '' } : { label: '最高分', value: '尚无记录' };
      }
    },
    {
      id: 'sokoban', no: 'V', name: '推箱子', en: 'SOKOBAN', cat: 'puzzle',
      desc: '把所有木箱推上标记点。只能推不能拉，推错一步就可能锁死——可以随时撤销。',
      href: 'games/sokoban.html',
      stat: function(){
        var s = rec('sokoban');
        return { label: '进度', value: '第 ' + (n(s.level) ? n(s.level) : 1) + ' / 12 关' };
      }
    },
    {
      id: 'lights', no: 'X', name: '熄灯', en: 'LIGHTS OUT', cat: 'puzzle',
      desc: '按一盏灯会同时翻转它和上下左右。把所有灯熄掉。',
      href: 'games/lights.html',
      stat: function(){
        var s = rec('lights');
        var size = n(s.size) || 5;
        var b = s.best && typeof s.best === 'object' ? s.best[size] : (s.flatBest || s.best);
        return b ? { label: '最少', value: b + ' 步 · ' + size + '×' + size } : { label: '最少', value: '尚无记录' };
      }
    },
    {
      id: 'mines', no: 'XI', name: '扫雷', en: 'MINESWEEPER', cat: 'puzzle',
      desc: '数字是周围八格的地雷数。第一下永远安全，长按插旗标出可疑处。',
      href: 'games/mines.html',
      stat: function(){
        var s = rec('mines');
        return s.wins ? { label: '扫清', value: s.wins + ' 盘', note: s.best8 ? '8×8 最快 ' + s.best8 + ' 秒' : '' } : { label: '扫清', value: '尚无记录' };
      }
    },
    {
      id: 'sudoku', no: 'XII', name: '数独', en: 'SUDOKU', cat: 'puzzle',
      desc: '每行每列每个九宫格里，一到九各出现一次。每道题只有一个答案。',
      href: 'games/sudoku.html',
      stat: function(){
        var s = rec('sudoku');
        var b = n(s.best1) || n(s.best0) || n(s.best2);
        return s.wins ? { label: '完成', value: s.wins + ' 局', note: b ? '最快 ' + b + ' 秒' : '' } : { label: '完成', value: '尚无记录' };
      }
    },
    {
      id: 'hanoi', no: 'XIII', name: '汉诺塔', en: 'TOWER OF HANOI', cat: 'puzzle',
      desc: '一次只能搬一片，大不能压小。最少 2ⁿ−1 步，能一步不多就是完美。',
      href: 'games/hanoi.html',
      stat: function(){
        var s = rec('hanoi');
        var b = n(s.best6) || n(s.best5) || n(s.best4) || n(s.best3);
        return b ? { label: '最佳', value: b + ' 步' } : { label: '最佳', value: '尚无记录' };
      }
    },
    {
      id: 'pipes', no: 'XVI', name: '接水管', en: 'PIPE ROTATION', cat: 'puzzle',
      desc: '转动每一节管子，让水从左上角的进水口流遍整盘。',
      href: 'games/pipes.html',
      stat: function(){
        var s = rec('pipes');
        var b = n(s.best6) || n(s.best5) || n(s.best7);
        return b ? { label: '最少', value: b + ' 转' } : { label: '最少', value: '尚无记录' };
      }
    },
    {
      id: 'nonogram', no: 'XVII', name: '数织', en: 'NONOGRAM', cat: 'puzzle',
      desc: '看每行每列的连续块数，涂出底下的图案。填满不用猜，数字就是线索。',
      href: 'games/nonogram.html',
      stat: function(){
        var s = rec('nonogram');
        return s.wins ? { label: '完成', value: s.wins + ' 幅' } : { label: '完成', value: '尚无记录' };
      }
    },
    {
      id: 'maze', no: 'XXI', name: '迷宫', en: 'MAZE', cat: 'puzzle',
      desc: '从左上的入口走到右下的出口。路只有一条是通的，撞墙就得回头。',
      href: 'games/maze.html',
      stat: function(){
        var s = rec('maze');
        var b = n(s.best16) || n(s.best12) || n(s.best22);
        return b ? { label: '最短', value: b + ' 步' } : { label: '最短', value: '尚无记录' };
      }
    },
    {
      id: 'oneline', no: 'XXII', name: '一笔画', en: 'ONE LINE', cat: 'puzzle',
      desc: '从朱红点出发，每条线只走一次，走遍全部。',
      href: 'games/oneline.html',
      stat: function(){
        var s = rec('oneline');
        var done = n(s.done4) + n(s.done3) + n(s.done5);
        return done ? { label: '走通', value: done + ' 局' } : { label: '走通', value: '尚无记录' };
      }
    },
    {
      id: 'puzzle', no: 'XXIII', name: '拼图', en: 'JIGSAW', cat: 'puzzle',
      desc: '点两块互换，把切碎的画面拼回去。每局现画一张，不会重样。',
      href: 'games/puzzle.html',
      stat: function(){
        var s = rec('puzzle');
        var b = n(s.best4) || n(s.best3) || n(s.best5);
        return b ? { label: '最少', value: b + ' 次交换' } : { label: '最少', value: '尚无记录' };
      }
    },
    {
      id: 'match3', no: 'XXIV', name: '三消', en: 'MATCH THREE', cat: 'puzzle',
      desc: '交换相邻两块，凑成三个以上同色就消。连锁越长，分越高。三十步内够到一千分。',
      href: 'games/match3.html',
      stat: function(){
        var s = rec('match3');
        return s.best ? { label: '最高分', value: global.Shell.fmtNum(s.best), note: s.wins ? '达标 ' + s.wins + ' 次' : '' } : { label: '最高分', value: '尚无记录' };
      }
    },
    {
      id: 'link', no: 'XXV', name: '连连看', en: 'LINK LINK', cat: 'puzzle',
      desc: '两个同样的字，能用不超过两次转弯的线连起来就消掉。清空整盘才算过关。',
      href: 'games/link.html',
      stat: function(){
        var s = rec('link');
        return s.wins ? { label: '清盘', value: s.wins + ' 盘' } : { label: '清盘', value: '尚无记录' };
      }
    },
    {
      id: 'klotski', no: 'XXXVIII', name: '华容道', en: 'KLOTSKI', cat: 'puzzle',
      desc: '挪开挡路的将卒，把曹操从底部出口送出去。横刀立马，最少也要上百步。',
      href: 'games/klotski.html',
      stat: function(){
        var s = rec('klotski');
        return s.best ? { label: '最少', value: s.best + ' 步' } : { label: '最少', value: '尚无记录' };
      }
    },

    /* ================= 棋牌 ================= */
    {
      id: 'gomoku', no: 'VIII', name: '五子棋', en: 'GOMOKU', cat: 'table',
      desc: '先连成五子者胜。对手会算杀也会堵，不是随便乱下。也可以两个人下一盘。',
      href: 'games/gomoku.html',
      stat: function(){
        var s = rec('gomoku');
        var duo = s.duo || {};
        if(n(duo.b) || n(duo.w)) return { label: '双人', value: (n(duo.b) || 0) + ' : ' + (n(duo.w) || 0) };
        return (n(s.win) || n(s.lose)) ? { label: '战绩', value: (n(s.win) || 0) + ' 胜 ' + (n(s.lose) || 0) + ' 负' } : { label: '战绩', value: '尚无记录' };
      }
    },
    {
      id: 'ttt', no: 'XIV', name: '井字棋', en: 'TIC-TAC-TOE', cat: 'table',
      desc: '三格连成一线。认真模式下机器一步不差，最好的结果是平局。',
      href: 'games/ttt.html',
      stat: function(){
        var s = rec('ttt');
        return (n(s.win) || n(s.lose) || n(s.draw)) ? { label: '战绩', value: (n(s.win) || 0) + ' 胜 ' + (n(s.draw) || 0) + ' 平 ' + (n(s.lose) || 0) + ' 负' } : { label: '战绩', value: '尚无记录' };
      }
    },
    {
      id: 'reversi', no: 'XV', name: '翻转棋', en: 'REVERSI', cat: 'table',
      desc: '夹住对方的子就能翻成自己的。四个角最值钱，末盘子多者胜。',
      href: 'games/reversi.html',
      stat: function(){
        var s = rec('reversi');
        return (n(s.win) || n(s.lose)) ? { label: '战绩', value: (n(s.win) || 0) + ' 胜 ' + (n(s.lose) || 0) + ' 负', note: s.best ? '最多 ' + s.best + ' 子' : '' } : { label: '战绩', value: '尚无记录' };
      }
    },
    {
      id: 'tf', no: 'XVIII', name: '二十四点', en: 'TWENTY-FOUR', cat: 'table',
      desc: '四张牌，加减乘除凑出二十四。每张牌用一次，题目都验过有解。',
      href: 'games/tf.html',
      stat: function(){
        var s = rec('tf');
        return s.best ? { label: '最少', value: s.best + ' 步' } : { label: '最少', value: '尚无记录' };
      }
    },
    {
      id: 'mastermind', no: 'XXXIX', name: '破译', en: 'MASTERMIND', cat: 'table',
      desc: '六个颜色里藏着一组四位密码，十次机会。黑钉是颜色和位置都对，白钉是颜色对、位置错。',
      href: 'games/mastermind.html',
      stat: function(){
        var s = rec('mastermind');
        return s.best ? { label: '最少', value: s.best + ' 次猜中' } : { label: '最少', value: '尚无记录' };
      }
    },

    /* ================= 街机 ================= */
    {
      id: 'snake', no: 'VI', name: '贪吃蛇', en: 'SNAKE', cat: 'arcade',
      desc: '吃到墨点就变长，撞墙或咬到自己就结束。越吃越快。',
      href: 'games/snake.html',
      stat: function(){
        var s = rec('snake');
        return s.best ? { label: '最长', value: s.best + ' 节' } : { label: '最长', value: '尚无记录' };
      }
    },
    {
      id: 'breakout', no: 'VII', name: '打砖块', en: 'BREAKOUT', cat: 'arcade',
      desc: '板子接住球，把砖一块块敲掉。三颗球，关卡逐层加厚。',
      href: 'games/breakout.html',
      stat: function(){
        var s = rec('breakout');
        return s.best ? { label: '最高分', value: global.Shell.fmtNum(s.best), note: '最高到第 ' + (n(s.stage) || 1) + ' 层' } : { label: '最高分', value: '尚无记录' };
      }
    },
    {
      id: 'tetris', no: 'IX', name: '落块', en: 'TETRIS', cat: 'arcade',
      desc: '七种块旋转落下，填满一行就消掉。消四行得分最高。',
      href: 'games/tetris.html',
      stat: function(){
        var s = rec('tetris');
        return s.best ? { label: '最高分', value: global.Shell.fmtNum(s.best), note: '最高 ' + (n(s.lines) || 0) + ' 行' } : { label: '最高分', value: '尚无记录' };
      }
    },
    {
      id: 'pong', no: 'XXVIII', name: '乒乓', en: 'PONG', cat: 'arcade',
      desc: '板子接球打回去，先到七分。撞在板边的位置会改变球的角度。',
      href: 'games/pong.html',
      stat: function(){
        var s = rec('pong');
        return (n(s.wins) || n(s.loses)) ? { label: '战绩', value: (n(s.wins) || 0) + ' 胜 ' + (n(s.loses) || 0) + ' 负' } : { label: '战绩', value: '尚无记录' };
      }
    },
    {
      id: 'invaders', no: 'XXIX', name: '太空侵略者', en: 'INVADERS', cat: 'arcade',
      desc: '敌阵越打越快，一波比一波密。守住底线，别让它们压下来。',
      href: 'games/invaders.html',
      stat: function(){
        var s = rec('invaders');
        return s.best ? { label: '最高分', value: global.Shell.fmtNum(s.best) } : { label: '最高分', value: '尚无记录' };
      }
    },
    {
      id: 'runner', no: 'XXX', name: '跑酷', en: 'ENDLESS RUN', cat: 'arcade',
      desc: '一直往右跑，跳过石头。速度会越来越快，看你能跑多远。',
      href: 'games/runner.html',
      stat: function(){
        var s = rec('runner');
        return s.best ? { label: '最远', value: s.best + ' 米' } : { label: '最远', value: '尚无记录' };
      }
    },
    {
      id: 'catch', no: 'XXXI', name: '接落物', en: 'CATCH', cat: 'arcade',
      desc: '移动篮子接住果子，别碰黑色的炸弹。漏一个少一条命。',
      href: 'games/catch.html',
      stat: function(){
        var s = rec('catch');
        return s.best ? { label: '最多', value: '接住 ' + s.best + ' 个' } : { label: '最多', value: '尚无记录' };
      }
    },
    {
      id: 'whack', no: 'XXVII', name: '打地鼠', en: 'WHACK-A-MOLE', cat: 'arcade',
      desc: '三十秒，地鼠从九个洞里冒头。越到后面冒得越快，有时两只一起。',
      href: 'games/whack.html',
      stat: function(){
        var s = rec('whack');
        return s.best ? { label: '最高分', value: s.best } : { label: '最高分', value: '尚无记录' };
      }
    },
    {
      id: 'flappy', no: 'XXXIV', name: '跳跃', en: 'FLAP', cat: 'arcade',
      desc: '点一下扇一次翅膀，从管子的缝隙里穿过去。手一抖就撞上。',
      href: 'games/flappy.html',
      stat: function(){
        var s = rec('flappy');
        return s.best ? { label: '最远', value: s.best + ' 组' } : { label: '最远', value: '尚无记录' };
      }
    },
    {
      id: 'hoops', no: 'XXXIII', name: '投篮', en: 'HOOPS', cat: 'arcade',
      desc: '按住球往斜上方拉，松手出手。拉的远近决定力度，六十秒能进几个。',
      href: 'games/hoops.html',
      stat: function(){
        var s = rec('hoops');
        return s.best ? { label: '最高分', value: s.best } : { label: '最高分', value: '尚无记录' };
      }
    },
    {
      id: 'stack', no: 'XXVI', name: '叠塔', en: 'STACK', cat: 'arcade',
      desc: '方块左右来回移动，点一下落下。错开的部分会被切掉，越叠越窄。',
      href: 'games/stack.html',
      stat: function(){
        var s = rec('stack');
        return s.best ? { label: '最高', value: s.best + ' 层' } : { label: '最高', value: '尚无记录' };
      }
    },
    {
      id: 'slice', no: 'XL', name: '切水果', en: 'SLICE', cat: 'arcade',
      desc: '划过去切开飞起的水果，一刀多切还有加分。黑色的是炸弹，碰不得。',
      href: 'games/slice.html',
      stat: function(){
        var s = rec('slice');
        return s.best ? { label: '最高分', value: s.best } : { label: '最高分', value: '尚无记录' };
      }
    },

    /* ================= 记忆 ================= */
    {
      id: 'memory', no: 'III', name: '记忆翻牌', en: 'MEMORY', cat: 'mind',
      desc: '成对翻开同样的纹样。翻错就翻回去，用最少的次数记住全部位置。',
      href: 'games/memory.html',
      stat: function(){
        var s = rec('memory');
        return s.best ? { label: '最少', value: s.best + ' 手 · ' + (n(s.pairs) || 6) + ' 对' } : { label: '最少', value: '尚无记录' };
      }
    },
    {
      id: 'simon', no: 'XIX', name: '西蒙', en: 'SIMON SAYS', cat: 'mind',
      desc: '四块颜色依次亮起，照着顺序按回去。每过一轮多一拍。',
      href: 'games/simon.html',
      stat: function(){
        var s = rec('simon');
        return s.best ? { label: '最长', value: s.best + ' 拍' } : { label: '最长', value: '尚无记录' };
      }
    },
    {
      id: 'reaction', no: 'XXXII', name: '反应力', en: 'REACTION', cat: 'mind',
      desc: '纸面变朱红的那一瞬立刻点。五轮取平均，抢跑不算。',
      href: 'games/reaction.html',
      stat: function(){
        var s = rec('reaction');
        return s.best ? { label: '平均', value: s.best + ' ms', note: s.fast ? '最快 ' + s.fast + ' ms' : '' } : { label: '平均', value: '尚无记录' };
      }
    },
    {
      id: 'math', no: 'XXXV', name: '心算冲刺', en: 'QUICK MATH', cat: 'mind',
      desc: '六十秒，加减乘除。答得越顺手，后面的数越大。',
      href: 'games/math.html',
      stat: function(){
        var s = rec('math');
        return s.best ? { label: '最多', value: '答对 ' + s.best + ' 题' } : { label: '最多', value: '尚无记录' };
      }
    },
    {
      id: 'nummem', no: 'XXXVI', name: '数字记忆', en: 'NUMBER MEMORY', cat: 'mind',
      desc: '一长串数字闪一下就消失，照着打回去。每记住一次就多一位。',
      href: 'games/nummem.html',
      stat: function(){
        var s = rec('nummem');
        return s.best ? { label: '最长', value: s.best + ' 位' } : { label: '最长', value: '尚无记录' };
      }
    },
    {
      id: 'wordle', no: 'XX', name: '猜词', en: 'WORDLE', cat: 'mind',
      desc: '六次机会猜一个五个字母的英文词。墨黑是位置对，赭金是有这个字母但放错了。',
      href: 'games/wordle.html',
      stat: function(){
        var s = rec('wordle');
        return s.wins ? { label: '猜中', value: s.wins + ' 词', note: s.best ? '最少 ' + s.best + ' 次' : '' } : { label: '猜中', value: '尚无记录' };
      }
    },
    {
      id: 'spot', no: 'XXXVII', name: '找不同', en: 'SPOT THE DIFFERENCE', cat: 'mind',
      desc: '上下两张图看着一样，其实改了三处。点出下面那张里的不同。',
      href: 'games/spot.html',
      stat: function(){
        var s = rec('spot');
        return s.wins ? { label: '通过', value: s.wins + ' 张' } : { label: '通过', value: '尚无记录' };
      }
    }
  ];

  GAMES.forEach(function(g){ g.icon = ICON[g.id] || ''; });

  global.GAMES = GAMES;
  global.CATS = CATS;
})(window);
