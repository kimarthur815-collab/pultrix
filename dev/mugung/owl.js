// 무궁화 스킬 미리보기: 부엉이 술래 (2D), 1080x1920 30fps
const { createCanvas } = require('canvas');
const { spawn } = require('child_process');
const fs = require('fs');
const W = 1080, H = 1920, FPS = 30, DUR = 8.6;
const c = createCanvas(W, H), ctx = c.getContext('2d');
const F = '"Noto Sans CJK KR"';
const K = (s, w = 900) => `${w} ${s}px ${F}`;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const prog = (t, a, b) => clamp((t - a) / (b - a));
const oCubic = p => 1 - Math.pow(1 - p, 3);
const oBack = (p, s = 2.2) => 1 + (s + 1) * Math.pow(p - 1, 3) + s * Math.pow(p - 1, 2);
const PI = Math.PI;

// 노래 박자 (초): 무-궁-화 길게, 꽃-이 보통, 피었습니다 빠르게
const T0 = 0.6;
const SYL = [[0.05, .85], [1.00, .72], [1.88, .60], [2.53, .33], [2.90, .35], [3.30, .10], [3.41, .10], [3.52, .10], [3.63, .10], [3.74, .20]];
const TURN = T0 + 3.98, TURN_D = 0.32, HIT = TURN + TURN_D; // 고개 돌리기
const CHARS = ['무', '궁', '화', '꽃', '이', '피', '었', '습', '니', '다'];
fs.writeFileSync(__dirname + '/timing.json', JSON.stringify({ T0, SYL, TURN, HIT }));

// ---------- 지도 배경 (한 번만 그림) ----------
const bg = createCanvas(W, H), b = bg.getContext('2d');
(function drawMap() {
  b.fillStyle = '#0f1317'; b.fillRect(0, 0, W, H);
  b.save(); b.translate(W / 2, H / 2); b.rotate(-0.21); b.translate(-W / 2, -H / 2);
  b.fillStyle = '#132019'; b.beginPath(); b.roundRect(620, 300, 420, 330, 40); b.fill(); // 공원
  b.fillStyle = '#0e1a25'; b.beginPath(); b.moveTo(-300, 1500); b.bezierCurveTo(200, 1350, 500, 1750, 1400, 1600); b.lineTo(1400, 1760); b.bezierCurveTo(500, 1900, 200, 1500, -300, 1660); b.fill(); // 개천
  for (let x = -400; x < 1500; x += 150) { b.strokeStyle = '#161b21'; b.lineWidth = 14; b.beginPath(); b.moveTo(x, -300); b.lineTo(x, 2300); b.stroke(); }
  for (let y = -300; y < 2300; y += 170) { b.strokeStyle = '#161b21'; b.lineWidth = 14; b.beginPath(); b.moveTo(-400, y); b.lineTo(1500, y); b.stroke(); }
  for (const x of [50, 650]) { b.strokeStyle = '#1d232b'; b.lineWidth = 34; b.beginPath(); b.moveTo(x, -300); b.lineTo(x, 2300); b.stroke(); }
  for (const y of [550, 1210]) { b.strokeStyle = '#1d232b'; b.lineWidth = 34; b.beginPath(); b.moveTo(-400, y); b.lineTo(1500, y); b.stroke(); }
  b.restore();
  b.setLineDash([26, 18]); b.strokeStyle = 'rgba(255,210,60,.5)'; b.lineWidth = 6;
  b.beginPath(); b.arc(560, 980, 780, 0, PI * 2); b.stroke(); b.setLineDash([]);
  const dot = (x, y, col) => { const g = b.createRadialGradient(x, y, 0, x, y, 70); g.addColorStop(0, col.replace('1)', '.35)')); g.addColorStop(1, col.replace('1)', '0)')); b.fillStyle = g; b.beginPath(); b.arc(x, y, 70, 0, PI * 2); b.fill(); b.fillStyle = '#fff'; b.beginPath(); b.arc(x, y, 26, 0, PI * 2); b.fill(); b.fillStyle = col; b.beginPath(); b.arc(x, y, 19, 0, PI * 2); b.fill(); };
  dot(330, 1700, 'rgba(61,155,255,1)'); dot(800, 1640, 'rgba(61,155,255,1)');
  // 상단 바
  b.fillStyle = 'rgba(17,20,24,.9)'; b.beginPath(); b.roundRect(40, 70, 1000, 110, 30); b.fill();
  b.fillStyle = '#1d3b66'; b.beginPath(); b.roundRect(70, 92, 170, 66, 33); b.fill();
  b.fillStyle = '#9cc8ff'; b.font = K(36, 700); b.textAlign = 'center'; b.textBaseline = 'middle'; b.fillText('도망자', 155, 126);
  b.fillStyle = '#e8ecf2'; b.font = K(48, 700); b.textAlign = 'right'; b.fillText('08:12', 1000, 127);
})();

// 머리 위 반점 (경도, 높이) — 돌 때 같이 움직여서 입체감
const SPECK = Array.from({ length: 46 }, (_, i) => [((i * 2.399) % (2 * PI)) - PI, ((i * 0.618) % 1) * 1.6 - 0.8]);

// ---------- 부엉이 ----------
function owl(t, a, bob, glow) {
  // 나뭇가지 뒤 꼬리
  ctx.fillStyle = '#45352a'; ctx.beginPath();
  ctx.moveTo(-62, 190); ctx.lineTo(62, 190); ctx.lineTo(48, 318); ctx.quadraticCurveTo(0, 340, -48, 318); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(120,96,74,.7)'; ctx.lineWidth = 8;
  for (const y of [240, 280]) { ctx.beginPath(); ctx.moveTo(-55, y); ctx.lineTo(55, y); ctx.stroke(); }
  // 몸통 (등)
  const bodyY = 20 + bob * 0.3;
  let g = ctx.createLinearGradient(0, -210, 0, 250); g.addColorStop(0, '#6c5442'); g.addColorStop(1, '#4b3a2d');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, bodyY, 190, 228, 0, 0, PI * 2); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.ellipse(0, bodyY, 190, 228, 0, 0, PI * 2); ctx.clip();
  ctx.strokeStyle = 'rgba(140,112,88,.5)'; ctx.lineWidth = 4;
  for (let r = 0, y = -160; y < 250; y += 36, r++) for (let x = -230 + (r % 2) * 23; x < 230; x += 46) { ctx.beginPath(); ctx.arc(x, y + bodyY - 20, 15, 0.15, PI - 0.15); ctx.stroke(); }
  ctx.restore();
  // 접은 날개
  for (const s of [-1, 1]) {
    ctx.save(); ctx.scale(s, 1);
    ctx.beginPath(); ctx.moveTo(-150, -120 + bodyY - 20); ctx.bezierCurveTo(-225, -20, -200, 160, -70, 262); ctx.bezierCurveTo(-55, 150, -60, 20, -105, -110 + bodyY - 20); ctx.closePath();
    ctx.fillStyle = '#4a3829'; ctx.fill(); ctx.save(); ctx.clip();
    ctx.strokeStyle = 'rgba(122,98,72,.75)'; ctx.lineWidth = 9; ctx.strokeStyle = 'rgba(122,98,72,.55)';
    for (let y = -60; y < 280; y += 44) { ctx.beginPath(); ctx.moveTo(-240, y + 20); ctx.lineTo(-40, y - 14); ctx.stroke(); }
    ctx.restore(); ctx.restore();
  }
  // 나뭇가지
  ctx.strokeStyle = '#33251b'; ctx.lineWidth = 36; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-560, 262); ctx.quadraticCurveTo(0, 222, 560, 250); ctx.stroke();
  ctx.strokeStyle = '#4b3829'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(-540, 250); ctx.quadraticCurveTo(0, 212, 540, 238); ctx.stroke();
  ctx.strokeStyle = '#33251b'; ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(330, 238); ctx.quadraticCurveTo(400, 180, 470, 150); ctx.stroke();
  // 발
  ctx.fillStyle = '#b48a46';
  for (const fx of [-48, 48]) for (const d of [-22, 0, 22]) { ctx.beginPath(); ctx.roundRect(fx + d - 8, 222, 16, 34, 8); ctx.fill(); }
  ctx.lineCap = 'butt';

  // 머리
  const hx = 0, hy = -255 + bob, rx = 186, ry = 166;
  for (const ph of [-0.72, 0.72]) { // 귀깃 (머리 뒤에 그림)
    const x = rx * 0.78 * Math.sin(ph + a);
    ctx.fillStyle = '#4a3829'; ctx.beginPath();
    ctx.moveTo(hx + x - 40, hy - ry * 0.62); ctx.lineTo(hx + x * 1.18, hy - ry - 62); ctx.lineTo(hx + x + 34, hy - ry * 0.55); ctx.closePath(); ctx.fill();
  }
  g = ctx.createRadialGradient(hx - 50, hy - 70, 10, hx, hy, 210); g.addColorStop(0, '#7f6550'); g.addColorStop(1, '#513e2f');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(hx, hy, rx, ry, 0, 0, PI * 2); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.ellipse(hx, hy, rx, ry, 0, 0, PI * 2); ctx.clip();
  // 반점
  for (const [lon, lat] of SPECK) {
    const al = lon + a, cz = Math.cos(al); if (cz <= 0) continue;
    const w = Math.sqrt(1 - Math.min(.95, (lat / 1.0) ** 2));
    ctx.fillStyle = `rgba(165,138,110,${0.55 * cz})`; ctx.beginPath();
    ctx.ellipse(hx + rx * 0.97 * w * Math.sin(al), hy + lat * ry * 0.95, 7 * cz + 1, 6, 0, 0, PI * 2); ctx.fill();
  }
  // 뒤통수 줄무늬
  const cb = Math.cos(PI + a);
  if (cb > 0) {
    const bx = hx + rx * 0.55 * Math.sin(PI + a);
    ctx.strokeStyle = `rgba(58,44,33,${0.7 * cb})`; ctx.lineWidth = 9;
    for (const k of [-2, -1, 0, 1, 2]) { ctx.beginPath(); ctx.moveTo(bx + k * 34 * cb, hy - ry + 20); ctx.quadraticCurveTo(bx + k * 40 * cb, hy, bx + k * 30 * cb, hy + ry); ctx.stroke(); }
  }
  // 얼굴 (경도 0에 붙은 판: 돌면 옆으로 밀리고 좁아짐)
  const s = Math.cos(a), fx = hx + rx * 0.6 * Math.sin(a), fy = hy + 12;
  const eyes = [];
  if (s > 0.02) {
    ctx.save(); ctx.translate(fx, fy); ctx.scale(s, 1);
    ctx.fillStyle = '#cdb593'; ctx.strokeStyle = '#2e231a'; ctx.lineWidth = 8;
    for (const ex of [-66, 66]) { ctx.beginPath(); ctx.arc(ex, 0, 96, 0, PI * 2); ctx.stroke(); }
    for (const ex of [-66, 66]) { ctx.beginPath(); ctx.arc(ex, 0, 92, 0, PI * 2); ctx.fill(); }
    // 눈
    const pr = 20 + 9 * glow;
    for (const ex of [-66, 66]) {
      ctx.fillStyle = '#1a1410'; ctx.beginPath(); ctx.arc(ex, 0, 56, 0, PI * 2); ctx.fill();
      const ig = ctx.createRadialGradient(ex, 0, 4, ex, 0, 47);
      ig.addColorStop(0, glow > 0 ? '#fff1a8' : '#ffe27a'); ig.addColorStop(1, glow > 0 ? '#ff5a1f' : '#f09a24');
      ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(ex, 0, 47, 0, PI * 2); ctx.fill();
      ctx.fillStyle = '#0b0806'; ctx.beginPath(); ctx.arc(ex, 0, pr, 0, PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(ex - 15, -15, 8, 0, PI * 2); ctx.fill();
      eyes.push([fx + ex * s, fy, s]);
    }
    // 화난 V 눈썹
    ctx.strokeStyle = '#efe3c9'; ctx.lineWidth = 15; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-140, -70); ctx.lineTo(-12, -30); ctx.moveTo(140, -70); ctx.lineTo(12, -30); ctx.stroke(); ctx.lineCap = 'butt';
    // 부리
    ctx.fillStyle = '#3a2e25'; ctx.beginPath(); ctx.moveTo(-18, -8); ctx.lineTo(18, -8); ctx.lineTo(0, 46); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
  return eyes;
}

// ---------- 한 프레임 ----------
function frame(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // 흔들림 (고개 돌린 순간)
  const sp = prog(t, HIT, HIT + 0.38), sh = t >= HIT ? 16 * (1 - sp) : 0;
  ctx.translate(Math.sin(t * 93) * sh, Math.cos(t * 71) * sh);
  ctx.drawImage(bg, -20, -20, W + 40, H + 40);
  ctx.fillStyle = `rgba(4,6,9,${0.6 * prog(t, 0, 0.35)})`; ctx.fillRect(-40, -40, W + 80, H + 80);

  // 고개 각도: 뒤(π) → 끝부분에 살짝 엿보기 → 홱 돌기(넘쳤다가 멈춤)
  const peek = 0.2 * oCubic(prog(t, T0 + 3.30, T0 + 3.90)) * (1 - prog(t, TURN - 0.12, TURN));
  let a = PI - peek;
  if (t >= TURN) a = PI * (1 - oBack(prog(t, TURN, HIT)));
  let bob = 0;
  for (const [st] of SYL) { const p = prog(t, T0 + st, T0 + st + 0.16); if (p > 0 && p < 1) bob = -10 * Math.sin(PI * p); }
  const glow = t >= HIT - 0.05 ? clamp(prog(t, HIT - 0.05, HIT + 0.15) * (0.85 + 0.15 * Math.sin(t * 31))) : 0;

  // 부엉이 등장
  const ip = prog(t, 0.05, 0.55), sc = 0.72 + 0.28 * oBack(ip, 1.6);
  ctx.save(); ctx.globalAlpha = prog(t, 0.05, 0.3);
  ctx.translate(540, 880); ctx.scale(sc * 0.95, sc * 0.95);
  const eyes = owl(t, a, bob, glow);
  ctx.restore();

  // 눈빛 (머리 밖으로 번지는 빛)
  if (glow > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const [ex, ey, s] of eyes) {
      const X = 540 + ex * sc * 0.95, Y = 880 + ey * sc * 0.95, R = 100 * s;
      const gg = ctx.createRadialGradient(X, Y, 0, X, Y, R); gg.addColorStop(0, `rgba(255,110,40,${0.32 * glow})`); gg.addColorStop(1, 'rgba(255,60,20,0)');
      ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(X, Y, R, 0, PI * 2); ctx.fill();
    }
    // 바닥을 훑는 눈빛
    const sw = Math.sin((t - HIT) * 1.6) * 0.55;
    const ox = 540, oy = 640, L = 1500;
    const cg = ctx.createRadialGradient(ox, oy, 100, ox, oy, L); cg.addColorStop(0, `rgba(255,170,60,${0.09 * glow})`); cg.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.fillStyle = cg; ctx.beginPath(); ctx.moveTo(ox, oy);
    ctx.lineTo(ox + Math.sin(sw - 0.28) * L, oy + Math.cos(sw - 0.28) * L); ctx.lineTo(ox + Math.sin(sw + 0.28) * L, oy + Math.cos(sw + 0.28) * L); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // 빨간 테두리
  if (t >= HIT) {
    let v = 0.22 + 0.5 * Math.exp(-(t - HIT) * 3);
    for (let k = 1; k < 4; k++) { const tk = HIT + k; if (t >= tk) v += 0.3 * Math.exp(-(t - tk) * 4); }
    const vg = ctx.createRadialGradient(540, 960, 520, 540, 960, 1250); vg.addColorStop(0, 'rgba(255,40,40,0)'); vg.addColorStop(1, `rgba(255,40,40,${clamp(v)})`);
    ctx.fillStyle = vg; ctx.fillRect(-40, -40, W + 80, H + 80);
  }

  // 배너
  const bp = oCubic(prog(t, 0.2, 0.55)), judge = t >= HIT;
  const pop = judge ? 1 + 0.08 * (1 - oCubic(prog(t, HIT, HIT + 0.25))) : 1;
  ctx.save(); ctx.globalAlpha = bp; ctx.translate(540, 1430 + 90 * (1 - bp)); ctx.scale(pop, pop);
  ctx.fillStyle = 'rgba(17,20,24,.95)'; ctx.beginPath(); ctx.roundRect(-440, -140, 880, 280, 32); ctx.fill();
  if (judge) { ctx.shadowColor = 'rgba(255,77,79,.8)'; ctx.shadowBlur = 50; }
  ctx.strokeStyle = judge ? '#ff4d4f' : '#2b3240'; ctx.lineWidth = 5; ctx.stroke(); ctx.shadowBlur = 0;
  ctx.textBaseline = 'middle';
  if (!judge) {
    ctx.font = K(104);
    const lines = [[0, 5, -58], [5, 10, 62]]; // 무궁화 꽃이 / 피었습니다
    for (const [i0, i1, y] of lines) {
      const parts = []; for (let i = i0; i < i1; i++) { parts.push(i); if (i === 2) parts.push(' '); }
      const ws = parts.map(p => ctx.measureText(p === ' ' ? ' ' : CHARS[p]).width), tw = ws.reduce((x, y) => x + y, 0);
      let x = -tw / 2;
      parts.forEach((p, k) => {
        if (p !== ' ') {
          const [st, du] = SYL[p], lp = prog(t, T0 + st, T0 + st + Math.max(0.1, du));
          const pp = prog(t, T0 + st, T0 + st + 0.2), sz = lp > 0 ? 1 + 0.3 * (1 - oCubic(pp)) : 1;
          ctx.save(); ctx.translate(x + ws[k] / 2, y); ctx.scale(sz, sz); ctx.textAlign = 'center';
          ctx.fillStyle = '#39404c'; ctx.fillText(CHARS[p], 0, 0);
          if (lp > 0) { ctx.beginPath(); ctx.rect(-ws[k] / 2, -80, ws[k] * lp, 160); ctx.clip(); ctx.fillStyle = '#ffb3ec'; ctx.fillText(CHARS[p], 0, 0); }
          ctx.restore();
        }
        x += ws[k];
      });
    }
  } else {
    const sec = Math.ceil(10 - (t - HIT) - 1e-6);
    ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = K(124); ctx.fillText(`멈춰! ${sec}`, 0, -30);
    ctx.fillStyle = '#8b93a3'; ctx.font = K(42, 500); ctx.fillText('지금 움직이면 걸려요', 0, 82);
  }
  ctx.restore();
}

// ---------- 실행 ----------
const arg = process.argv[2] || '';
if (arg.startsWith('test')) {
  for (const tt of process.argv.slice(3).map(Number)) { frame(tt); fs.writeFileSync(`${__dirname}/f_${tt}.png`, c.toBuffer('image/png')); }
} else {
  const out = __dirname + '/v_tmp.mp4';
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'bgra', '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  (async () => {
    const N = Math.round(DUR * FPS);
    for (let i = 0; i < N; i++) { frame(i / FPS); const buf = c.toBuffer('raw'); if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r)); }
    ff.stdin.end();
  })();
  ff.on('close', code => { if (code === 0) { fs.renameSync(out, __dirname + '/video.mp4'); console.log('done'); } else console.log('ffmpeg failed', code); });
}
