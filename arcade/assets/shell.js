/* =========================================================
   共享运行时：存档 / 音效 / 提示 / 结算票券
   ========================================================= */
(function(global){
  'use strict';

  var PREFIX = 'arcade.v1.';

  /* ------------------ 存档 ------------------ */
  var Store = {
    get: function(key, fallback){
      try{
        var raw = localStorage.getItem(PREFIX + key);
        if(raw == null) return fallback;
        var val = JSON.parse(raw);
        return val == null ? fallback : val;
      }catch(e){ return fallback; }
    },
    set: function(key, val){
      try{ localStorage.setItem(PREFIX + key, JSON.stringify(val)); }catch(e){}
    },
    /* 通用成绩合并：只升不降 */
    record: function(game, patch){
      var s = Store.get('save.' + game, {}) || {};
      for(var k in patch){
        if(!Object.prototype.hasOwnProperty.call(patch, k)) continue;
        var v = patch[k];
        if(typeof v === 'number' && typeof s[k] === 'number'){
          s[k] = Math.max(s[k], v);
        }else{
          s[k] = v;
        }
      }
      s.last = Date.now();
      Store.set('save.' + game, s);
      return s;
    },
    save: function(game){ return Store.get('save.' + game, {}) || {}; }
  };

  /* ------------------ 音效（纯合成，无音频文件） ------------------ */
  var Sound = {
    on: Store.get('sound', true) !== false,
    ctx: null,
    _ctx: function(){
      if(this.ctx) return this.ctx;
      var AC = global.AudioContext || global.webkitAudioContext;
      if(!AC) return null;
      try{ this.ctx = new AC(); }catch(e){ this.ctx = null; }
      return this.ctx;
    },
    toggle: function(){
      this.on = !this.on;
      Store.set('sound', this.on);
      if(this.on) this.tone(660, .08, 'sine', .16);
      return this.on;
    },
    tone: function(freq, dur, type, gain, when){
      if(!this.on) return;
      var ctx = this._ctx();
      if(!ctx) return;
      if(ctx.state === 'suspended'){ try{ ctx.resume(); }catch(e){} }
      var t0 = ctx.currentTime + (when || 0);
      var osc = ctx.createOscillator();
      var amp = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      amp.gain.setValueAtTime(0.0001, t0);
      amp.gain.exponentialRampToValueAtTime(gain == null ? .14 : gain, t0 + .012);
      amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(amp); amp.connect(ctx.destination);
      osc.start(t0); osc.stop(t0 + dur + .02);
    },
    /* 五声音阶，避免刺耳 */
    pick: function(seed){
      var scale = [392, 440, 494, 587, 659, 784, 880];
      this.tone(scale[Math.abs(seed|0) % scale.length], .1, 'triangle', .10);
    },
    drop: function(seed){
      var scale = [262, 294, 330, 392, 440];
      this.tone(scale[Math.abs(seed|0) % scale.length], .13, 'sine', .13);
    },
    bad: function(){ this.tone(150, .11, 'square', .05); },
    done: function(){ this.tone(784, .1, 'sine', .1); this.tone(1046, .14, 'sine', .08, .07); },
    win: function(){
      var self = this;
      [523, 659, 784, 1046].forEach(function(f, i){ self.tone(f, .22, 'sine', .11, i * .085); });
    },
    lose: function(){
      var self = this;
      [440, 370, 294].forEach(function(f, i){ self.tone(f, .2, 'triangle', .1, i * .1); });
    }
  };

  /* ------------------ 触感 ------------------ */
  function haptic(ms){
    if(navigator.vibrate) { try{ navigator.vibrate(ms || 12); }catch(e){} }
  }

  /* ------------------ 提示条 ------------------ */
  var toastEl = null, toastTimer = 0;
  function toast(msg){
    if(!toastEl){
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    void toastEl.offsetWidth;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ toastEl.classList.remove('show'); }, 1700);
  }

  /* ------------------ 结算票券 ------------------ */
  var overlay = null;
  function buildOverlay(){
    overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.innerHTML =
      '<div class="plate">' +
        '<div class="kicker">RESULT</div>' +
        '<h2></h2>' +
        '<p class="sub"></p>' +
        '<div class="seals"></div>' +
        '<div class="row"></div>' +
      '</div>';
    document.body.appendChild(overlay);
    return overlay;
  }
  /**
   * opts: {kicker, title, sub, stars(0-3), buttons:[{label, kind, onClick, close}]}
   */
  function plate(opts){
    if(!overlay) buildOverlay();
    overlay.querySelector('.kicker').textContent = opts.kicker || 'RESULT';
    overlay.querySelector('h2').textContent = opts.title || '完成';
    overlay.querySelector('.sub').textContent = opts.sub || '';
    var seals = overlay.querySelector('.seals');
    seals.innerHTML = '';
    if(opts.stars != null){
      seals.style.display = 'flex';
      for(var i = 0; i < 3; i++){
        var s = document.createElement('i');
        if(i < opts.stars){
          s.className = 'on';
          s.style.animationDelay = (0.1 + i * 0.12) + 's';
        }
        seals.appendChild(s);
      }
    }else{ seals.style.display = 'none'; }

    var row = overlay.querySelector('.row');
    row.innerHTML = '';
    (opts.buttons || []).forEach(function(b){
      var el = document.createElement('button');
      el.className = 'btn' + (b.kind ? ' btn--' + b.kind : '');
      el.textContent = b.label;
      el.addEventListener('click', function(){
        if(b.close !== false) hide();
        if(b.onClick) b.onClick();
      });
      row.appendChild(el);
    });
    overlay.classList.add('show');
    return overlay;
  }
  function hide(){ if(overlay) overlay.classList.remove('show'); }

  /* ------------------ 手感：涟漪 / 数字跳动 / 飘字 ------------------ */
  function ripple(e){
    var t = e.target;
    var b = t && t.closest ? t.closest('.btn') : null;
    if(!b || b.disabled || b.getAttribute('disabled') != null) return;
    var r = b.getBoundingClientRect();
    var d = Math.max(r.width, r.height) || 40;
    var sp = document.createElement('span');
    sp.className = 'rp';
    sp.style.width = sp.style.height = d + 'px';
    sp.style.left = (e.clientX - r.left - d / 2) + 'px';
    sp.style.top = (e.clientY - r.top - d / 2) + 'px';
    b.appendChild(sp);
    setTimeout(function(){ if(sp.parentNode) sp.parentNode.removeChild(sp); }, 560);
  }
  document.addEventListener('pointerdown', ripple, { passive: true });

  /* 数字跳动：数值变化时抖一下，让「+1」有落点 */
  function bump(node){
    if(!node) return;
    node.classList.remove('bump');
    void node.offsetWidth;
    node.classList.add('bump');
    setTimeout(function(){ node.classList.remove('bump'); }, 300);
  }
  /* 飘字：从触发点浮上去的一行小字 */
  function floatNum(host, text, cls){
    if(!host) return;
    if(getComputedStyle(host).position === 'static') host.style.position = 'relative';
    var n = document.createElement('div');
    n.className = 'fnum' + (cls ? ' ' + cls : '');
    n.textContent = text;
    host.appendChild(n);
    setTimeout(function(){ if(n.parentNode) n.parentNode.removeChild(n); }, 900);
  }
  /* 整块泛光：过关的一瞬 */
  function flash(node, ms){
    if(!node) return;
    node.classList.remove('flash');
    void node.offsetWidth;
    node.classList.add('flash');
    setTimeout(function(){ node.classList.remove('flash'); }, ms || 560);
  }

  /* ------------------ 声音按钮（各屏共用一套图标） ------------------ */
  var ICON_SND_ON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h3l5 4V5L7 9H4Z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/></svg>';
  var ICON_SND_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h3l5 4V5L7 9H4Z"/><path d="M16 10l4 4M20 10l-4 4"/></svg>';
  function soundBtn(btn){
    if(!btn) return;
    function paint(){ btn.innerHTML = Sound.on ? ICON_SND_ON : ICON_SND_OFF; }
    paint();
    btn.addEventListener('click', function(){ Sound.toggle(); paint(); });
  }

  /* ------------------ 玩法提示 ------------------ */
  /* 每款一句，首次打开时浮出一次；不占布局、不挡点击 */
  var HELP = {
    balls:     '点一支试管取走顶端的球，再点另一支放进去。同色球排满一支即归位。',
    slide:     '点空格旁边的方块滑过去，把 1 到 N−1 按顺序排好。',
    memory:    '翻两张找一样的，配对成功就留在桌上。',
    '2048':    '划动整个棋盘，同数相撞合并，凑出 2048。',
    sokoban:   '走到箱子旁边再推，把所有箱子推到标记点上。',
    snake:     '划动转向吃果子，别撞墙，也别咬到自己。',
    breakout:  '拖动挡板接球，把砖块全部打掉。',
    gomoku:    '轮流落子，先连成五个的赢。',
    tetris:    '左右移动、上键旋转、下键加速，填满整行就消掉。',
    lights:    '点一盏灯会连同上下左右一起翻转，把所有灯熄灭。',
    mines:     '点开格子，数字是周围的地雷数。长按或右键插旗。',
    sudoku:    '先点格子再点数字。每行、每列、每宫都是 1–9 不重复。',
    hanoi:     '点柱子取起顶端的盘，再点另一根放下。大盘不能压小盘。',
    ttt:       '轮流落子，先连成三个的赢。',
    reversi:   '落子夹住对方的棋就翻成自己的，终局子多者胜。',
    pipes:     '点管段旋转，让水从左上角流遍全盘。',
    nonogram:  '按行首、列首的数字涂格子，数字是连续一段的长度。',
    tf:        '点两张牌再点一个运算，合成新牌，把四张牌算出 24。',
    simon:     '记住四块闪烁的顺序，再依次点回去。每过一轮多一步。',
    wordle:    '六次机会猜一个五字母单词。绿=对位，黄=错位。',
    maze:      '用方向键、滑动或方向按钮走，从左上走到右下出口。',
    oneline:   '依次点相邻的点连线，每条边走一次，走遍全部。',
    puzzle:    '点两块互换位置，把这幅画拼回去。',
    match3:    '交换相邻两块，连成三个以上就消掉。',
    link:      '两个同样的字，能用不超过两次转弯的线连起来就能消掉。',
    stack:     '点屏幕放下方块，对准上一块。越叠越高。',
    whack:     '地鼠冒头就点它，别点炸弹。',
    pong:      '拖动挡板接球，先到 7 分。',
    invaders:  '左右移动，点屏幕开火。别让敌人落到最下面。',
    runner:    '点一下或按空格起跳，躲开石头跑得更远。',
    catch:     '左右拖动篮子接住果子，别接炸弹。',
    reaction:  '方块变绿的一刻立刻点。抢跑算负一轮。',
    hoops:     '按住拖动瞄准，松手出手。六十秒内投进更多。',
    flappy:    '点屏幕拍一下翅膀，从管道的缝隙穿过去。',
    math:      '六十秒内选出正确答案，连对越多分越高。',
    nummem:    '看一眼记住这串数字，然后凭记忆输入。每答对加一位。',
    spot:      '上下两幅画有 3 处不同，在下面那幅上点出来。',
    klotski:   '推动木块腾出空位，把曹操移到底部出口。',
    mastermind:'四位六色的密码，十次机会。黑钉=对位，白钉=对色错位。',
    slice:     '手指划过果子就能切开，别碰炸弹。'
  };

  function pageKey(){
    var p = (location.pathname || '').split('/').pop() || '';
    return p.replace(/\.html?$/i, '');
  }

  function howto(){
    var key = pageKey();
    var text = HELP[key];
    if(!text) return;
    if(Store.get('seen.' + key, false)) return;
    Store.set('seen.' + key, true);

    var n = el('div', 'howto');
    n.textContent = text;
    /* 贴着操作条上方浮出：操作条有几行就抬多高，别压住按钮 */
    var ctl = document.querySelector('.controls');
    if(ctl){
      var cr = ctl.getBoundingClientRect();
      if(cr.height > 0){
        var lift = Math.round(Math.max(20, (global.innerHeight || 0) - cr.top + 24));
        n.style.bottom = 'calc(env(safe-area-inset-bottom) + ' + lift + 'px)';
      }
    }
    document.body.appendChild(n);
    setTimeout(function(){ n.classList.add('out'); }, 3800);
    setTimeout(function(){ if(n.parentNode) n.parentNode.removeChild(n); }, 4600);
  }

  function seeHowto(){
    var key = pageKey();
    if(HELP[key]) Store.set('seen.' + key, false);
    howto();
  }

  if(document.readyState === 'complete') setTimeout(howto, 600);
  else window.addEventListener('load', function(){ setTimeout(howto, 600); });

  /* ------------------ 杂项 ------------------ */
  function dpr(){ return Math.min(2, global.devicePixelRatio || 1); }
  function fmtTime(sec){
    sec = Math.max(0, Math.round(sec));
    var m = Math.floor(sec / 60), s = sec % 60;
    return m + ':' + (s < 10 ? '0' + s : s);
  }
  function fmtNum(n){
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  function back(href){
    location.href = href || '../index.html';
  }
  function $(sel, root){ return (root || document).querySelector(sel); }
  function $$(sel, root){ return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function el(tag, cls, html){
    var n = document.createElement(tag);
    if(cls) n.className = cls;
    if(html != null) n.innerHTML = html;
    return n;
  }
  function rand(n){ return Math.floor(Math.random() * n); }
  function shuffle(a){
    for(var i = a.length - 1; i > 0; i--){
      var j = rand(i + 1), t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  /* 指针滑动方向，用于移动端手势 */
  function swipe(node, cb){
    var sx = 0, sy = 0, active = false;
    node.addEventListener('pointerdown', function(e){
      if(e.button != null && e.button !== 0) return;
      sx = e.clientX; sy = e.clientY; active = true;
    });
    node.addEventListener('pointerup', function(e){
      if(!active) return; active = false;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if(Math.max(Math.abs(dx), Math.abs(dy)) < 22) return;
      if(Math.abs(dx) > Math.abs(dy)) cb(dx > 0 ? 'right' : 'left');
      else cb(dy > 0 ? 'down' : 'up');
    });
    node.addEventListener('pointercancel', function(){ active = false; });
  }

  global.Shell = {
    Store: Store, Sound: Sound, haptic: haptic, toast: toast,
    plate: plate, hidePlate: hide, fmtTime: fmtTime, fmtNum: fmtNum,
    back: back, $: $, $$: $$, el: el, rand: rand, shuffle: shuffle, swipe: swipe,
    bump: bump, floatNum: floatNum, flash: flash, soundBtn: soundBtn, dpr: dpr,
    seeHowto: seeHowto
  };
})(window);
