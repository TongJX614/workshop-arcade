/* 版面体检：390×844 移动端视口下加载每页，报告
   ① 横向溢出 ② 关键控件是否超出首屏 ③ 可点区域过小 ④ 文字过小 / 被裁 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = 'C:/Users/tongj/Desktop/游戏/arcade';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const PROBE = `<script>
window.addEventListener('load', function(){ setTimeout(function(){
  var vw = innerWidth, vh = innerHeight;
  var out = [];
  var de = document.documentElement;
  if(de.scrollWidth > vw + 1) out.push('XOVERFLOW ' + de.scrollWidth + '>' + vw);
  // 超出右边界的可见元素
  var over = [];
  Array.prototype.forEach.call(document.querySelectorAll('.stage *,.controls *,.bar *'), function(e){
    var r = e.getBoundingClientRect();
    if(r.width < 4 || r.height < 4) return;
    if(r.right > vw + 1.5 || r.left < -1.5){
      over.push((e.className || e.tagName).toString().split(' ')[0] + ':' + Math.round(r.left) + '~' + Math.round(r.right));
    }
  });
  if(over.length) out.push('OVER ' + over.slice(0,4).join(','));
  // 控件区是否被挤出视口（需要滚动才能看到底部操作）
  var ctl = document.querySelector('.controls');
  if(ctl){ var cr = ctl.getBoundingClientRect(); out.push('ctl.bottom=' + Math.round(cr.bottom) + '/' + vh); }
  // 小于 30px 的可点目标（只报真正可点的）
  var small = [];
  Array.prototype.forEach.call(document.querySelectorAll('button,a,[role="button"],.cell,.tile,.key,.hole,.dot,.chip'), function(e){
    var r = e.getBoundingClientRect();
    if(r.width < 1 || r.height < 1) return;
    if(r.width >= 30 && r.height >= 30) return;
    small.push((e.className || e.tagName).toString().split(' ')[0] + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
  });
  if(small.length) out.push('SMALL(' + small.length + ') ' + small.slice(0,4).join(' | '));
  // 内容是否被 stage 裁掉（超过 8px 才算，舞台本身可滚动）
  var st = document.querySelector('.stage');
  if(st){
    var sr = st.getBoundingClientRect(), clip = 0;
    Array.prototype.forEach.call(st.children, function(e){
      var r = e.getBoundingClientRect();
      if(r.height < 4) return;
      if(r.top < sr.top - 8 || r.bottom > sr.bottom + 8) clip++;
    });
    if(clip) out.push('CLIP(' + clip + ') stage=' + Math.round(sr.top) + '~' + Math.round(sr.bottom));
    var need = st.scrollHeight - st.clientHeight;
    if(need > 12) out.push('SCROLL+' + need);
  }
  // 文字过小
  var tiny = 0;
  Array.prototype.forEach.call(document.querySelectorAll('.stage *,.bar__title,.hintline'), function(e){
    if(!e.textContent || e.children.length) return;
    var fs2 = parseFloat(getComputedStyle(e).fontSize);
    if(fs2 && fs2 < 9) tiny++;
  });
  if(tiny) out.push('TINYTEXT ' + tiny);
  document.title = 'LAY::' + (out.join(' | ') || 'clean');
}, 700); });
</script>`;

function build(name) {
  const src = path.join(ROOT, 'games', name + '.html');
  let html = fs.readFileSync(src, 'utf8');
  html = html.replace('</body>', PROBE + '</body>');
  const out = path.join(ROOT, 'games', '_l_' + name + '.html');
  fs.writeFileSync(out, html);
  return out;
}

function run(file) {
  const out = execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-sandbox',
    '--window-size=' + (+(process.env.MW || 390)) + ',' + (+(process.env.MH || 844)), '--force-prefers-reduced-motion',
    '--virtual-time-budget=9000', '--dump-dom',
    'file:///' + file.replace(/\\/g, '/')
  ], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 40000, stdio: ['ignore', 'pipe', 'ignore'] });
  const m = out.match(/<title>([\s\S]*?)<\/title>/);
  return m ? m[1].trim().replace(/^LAY::/, '') : '(no title)';
}

const names = process.argv.slice(2).length
  ? process.argv.slice(2)
  : fs.readdirSync(path.join(ROOT, 'games')).filter(f => f.endsWith('.html') && !f.startsWith('_')).map(f => f.slice(0, -5)).sort();

for (const name of names) {
  let res;
  try { res = run(build(name)); } catch (e) { res = 'FAIL ' + e.message.slice(0, 60); }
  const flag = res === 'clean' ? '  ' : ' !';
  console.log(flag + name.padEnd(11) + res);
}

/* 收尾：删掉本次生成的临时页，别留在交付目录里 */
(function(){
  const dir = path.join(ROOT, 'games');
  for (const f of fs.readdirSync(dir)) {
    if (f.startsWith('_l_')) { try { fs.unlinkSync(path.join(dir, f)); } catch (e) {} }
  }
})();
