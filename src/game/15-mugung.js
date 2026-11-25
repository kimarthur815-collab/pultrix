// ---------- 무궁화: 부엉이 술래 (노래 동안 등 돌리고 있다가 끝나면 고개만 홱) ----------
const MUG_SPECK = Array.from({ length: 46 }, (_, i) => [((i * 2.399) % (2 * Math.PI)) - Math.PI, ((i * 0.618) % 1) * 1.6 - 0.8]);
const mClamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)), mProg = (t, a, b) => mClamp((t - a) / (b - a));
const mOutCubic = p => 1 - Math.pow(1 - p, 3), mOutBack = (p, s = 2.2) => 1 + (s + 1) * Math.pow(p - 1, 3) + s * Math.pow(p - 1, 2);
function mugOwlBody(ctx, a, bob, glow) { // 부엉이 좌표: 몸통 가운데 = (0, 0)
  const PI = Math.PI;
  ctx.fillStyle = '#45352a'; ctx.beginPath(); // 꼬리
  ctx.moveTo(-62, 190); ctx.lineTo(62, 190); ctx.lineTo(48, 318); ctx.quadraticCurveTo(0, 340, -48, 318); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(120,96,74,.7)'; ctx.lineWidth = 8;
  for (const y of [240, 280]) { ctx.beginPath(); ctx.moveTo(-55, y); ctx.lineTo(55, y); ctx.stroke(); }
  const bodyY = 20 + bob * 0.3; // 몸통 (등)
  let g = ctx.createLinearGradient(0, -210, 0, 250); g.addColorStop(0, '#6c5442'); g.addColorStop(1, '#4b3a2d');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, bodyY, 190, 228, 0, 0, PI * 2); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.ellipse(0, bodyY, 190, 228, 0, 0, PI * 2); ctx.clip();
  ctx.strokeStyle = 'rgba(140,112,88,.5)'; ctx.lineWidth = 4;
  for (let r = 0, y = -160; y < 250; y += 36, r++) for (let x = -230 + (r % 2) * 23; x < 230; x += 46) { ctx.beginPath(); ctx.arc(x, y + bodyY - 20, 15, 0.15, PI - 0.15); ctx.stroke(); }
  ctx.restore();
  for (const sd of [-1, 1]) { // 접은 날개
    ctx.save(); ctx.scale(sd, 1);
    ctx.beginPath(); ctx.moveTo(-150, -120 + bodyY - 20); ctx.bezierCurveTo(-225, -20, -200, 160, -70, 262); ctx.bezierCurveTo(-55, 150, -60, 20, -105, -110 + bodyY - 20); ctx.closePath();
    ctx.fillStyle = '#4a3829'; ctx.fill(); ctx.save(); ctx.clip();
    ctx.lineWidth = 9; ctx.strokeStyle = 'rgba(122,98,72,.55)';
    for (let y = -60; y < 280; y += 44) { ctx.beginPath(); ctx.moveTo(-240, y + 20); ctx.lineTo(-40, y - 14); ctx.stroke(); }
    ctx.restore(); ctx.restore();
  }
  ctx.strokeStyle = '#33251b'; ctx.lineWidth = 36; ctx.lineCap = 'round'; // 나뭇가지
  ctx.beginPath(); ctx.moveTo(-560, 262); ctx.quadraticCurveTo(0, 222, 560, 250); ctx.stroke();
  ctx.strokeStyle = '#4b3829'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(-540, 250); ctx.quadraticCurveTo(0, 212, 540, 238); ctx.stroke();
  ctx.strokeStyle = '#33251b'; ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(330, 238); ctx.quadraticCurveTo(400, 180, 470, 150); ctx.stroke();
  ctx.fillStyle = '#b48a46'; // 발
  for (const fx of [-48, 48]) for (const d of [-22, 0, 22]) { ctx.beginPath(); ctx.ellipse(fx + d, 239, 8, 17, 0, 0, PI * 2); ctx.fill(); }
  ctx.lineCap = 'butt';
  const hx = 0, hy = -255 + bob, rx = 186, ry = 166; // 머리
  for (const ph of [-0.72, 0.72]) { // 귀깃
    const x = rx * 0.78 * Math.sin(ph + a);
    ctx.fillStyle = '#4a3829'; ctx.beginPath();
    ctx.moveTo(hx + x - 40, hy - ry * 0.62); ctx.lineTo(hx + x * 1.18, hy - ry - 62); ctx.lineTo(hx + x + 34, hy - ry * 0.55); ctx.closePath(); ctx.fill();
  }
  g = ctx.createRadialGradient(hx - 50, hy - 70, 10, hx, hy, 210); g.addColorStop(0, '#7f6550'); g.addColorStop(1, '#513e2f');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(hx, hy, rx, ry, 0, 0, PI * 2); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.ellipse(hx, hy, rx, ry, 0, 0, PI * 2); ctx.clip();
  for (const [lon, lat] of MUG_SPECK) { // 반점: 고개와 같이 돌아서 입체감
    const al = lon + a, cz = Math.cos(al); if (cz <= 0) continue;
    const w = Math.sqrt(1 - Math.min(.95, lat * lat));
    ctx.fillStyle = `rgba(165,138,110,${0.55 * cz})`; ctx.beginPath();
    ctx.ellipse(hx + rx * 0.97 * w * Math.sin(al), hy + lat * ry * 0.95, 7 * cz + 1, 6, 0, 0, PI * 2); ctx.fill();
  }
  const cb = Math.cos(PI + a); // 뒤통수 줄무늬
  if (cb > 0) {
    const bx = hx + rx * 0.55 * Math.sin(PI + a);
    ctx.strokeStyle = `rgba(58,44,33,${0.7 * cb})`; ctx.lineWidth = 9;
    for (const k of [-2, -1, 0, 1, 2]) { ctx.beginPath(); ctx.moveTo(bx + k * 34 * cb, hy - ry + 20); ctx.quadraticCurveTo(bx + k * 40 * cb, hy, bx + k * 30 * cb, hy + ry); ctx.stroke(); }
  }
  const sc = Math.cos(a), fx = hx + rx * 0.6 * Math.sin(a), fy = hy + 12, eyes = []; // 얼굴: 돌면 옆으로 밀리고 좁아짐
  if (sc > 0.02) {
    ctx.save(); ctx.translate(fx, fy); ctx.scale(sc, 1);
    ctx.fillStyle = '#cdb593'; ctx.strokeStyle = '#2e231a'; ctx.lineWidth = 8;
    for (const ex of [-66, 66]) { ctx.beginPath(); ctx.arc(ex, 0, 96, 0, PI * 2); ctx.stroke(); }
    for (const ex of [-66, 66]) { ctx.beginPath(); ctx.arc(ex, 0, 92, 0, PI * 2); ctx.fill(); }
    const pr = 20 + 9 * glow;
    for (const ex of [-66, 66]) {
      ctx.fillStyle = '#1a1410'; ctx.beginPath(); ctx.arc(ex, 0, 56, 0, PI * 2); ctx.fill();
      const ig = ctx.createRadialGradient(ex, 0, 4, ex, 0, 47);
      ig.addColorStop(0, glow > 0 ? '#fff1a8' : '#ffe27a'); ig.addColorStop(1, glow > 0 ? '#ff5a1f' : '#f09a24');
      ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(ex, 0, 47, 0, PI * 2); ctx.fill();
      ctx.fillStyle = '#0b0806'; ctx.beginPath(); ctx.arc(ex, 0, pr, 0, PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(ex - 15, -15, 8, 0, PI * 2); ctx.fill();
      eyes.push([fx + ex * sc, fy, sc]);
    }
    ctx.strokeStyle = '#efe3c9'; ctx.lineWidth = 15; ctx.lineCap = 'round'; // V 눈썹
    ctx.beginPath(); ctx.moveTo(-140, -70); ctx.lineTo(-12, -30); ctx.moveTo(140, -70); ctx.lineTo(12, -30); ctx.stroke(); ctx.lineCap = 'butt';
    ctx.fillStyle = '#3a2e25'; ctx.beginPath(); ctx.moveTo(-18, -8); ctx.lineTo(18, -8); ctx.lineTo(0, 46); ctx.closePath(); ctx.fill(); // 부리
    ctx.restore();
  }
  ctx.restore();
  return eyes;
}
// rel: 노래 시작부터 지난 초, warn: 판정 시작(= 고개 다 돌린 순간)
function drawMugOwl(cv, rel, warn) {
  const dpr = Math.min(2, window.devicePixelRatio || 1), W = cv.clientWidth, H = cv.clientHeight; if (!W || !H) return;
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
  const PI = Math.PI, peek = 0.2 * mOutCubic(mProg(rel, 3.30, 3.90)) * (1 - mProg(rel, MUG_TURN - 0.12, MUG_TURN));
  const a = rel >= MUG_TURN ? PI * (1 - mOutBack(mProg(rel, MUG_TURN, warn))) : PI - peek;
  let bob = 0;
  for (const [st] of MUG_SYL) { const p = mProg(rel, st, st + 0.16); if (p > 0 && p < 1) bob = -10 * Math.sin(PI * p); }
  const glow = rel >= warn - 0.05 ? mClamp(mProg(rel, warn - 0.05, warn + 0.15) * (0.85 + 0.15 * Math.sin(rel * 31))) : 0;
  const k = Math.min(H / 880, W / 1160) * (0.72 + 0.28 * mOutBack(mProg(rel, 0, 0.5), 1.6)), ox = W / 2, oy = H - 345 * Math.min(H / 880, W / 1160) - 2;
  ctx.save(); ctx.globalAlpha = mProg(rel, -0.05, 0.2); ctx.translate(ox, oy); ctx.scale(k, k);
  const eyes = mugOwlBody(ctx, a, bob, glow);
  ctx.restore();
  if (glow > 0) { // 눈빛
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const [ex, ey, sc] of eyes) {
      const X = ox + ex * k, Y = oy + ey * k, R = 100 * sc * k;
      const gg = ctx.createRadialGradient(X, Y, 0, X, Y, R); gg.addColorStop(0, `rgba(255,110,40,${0.32 * glow})`); gg.addColorStop(1, 'rgba(255,60,20,0)');
      ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(X, Y, R, 0, PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}
function mugAnim() {
  const room = S.room, mEl = $('#mugung'), fx = $('#mugFx');
  if (!mEl.classList.contains('on') || !room || !room.mugung) { fx.style.opacity = 0; return; }
  try {
    const mg = room.mugung, W = Logic.AUGS.mugung.warn, t = now(), me = (room.players || {})[S.pid] || {};
    const rel = (t - (mg.from - W * 1000)) / 1000, judge = t >= mg.from, sec = Math.ceil((mg.to - t) / 1000);
    drawMugOwl($('#mugOwl'), rel, W);
    const key = judge ? (me.role === 'runner' ? 'r' : 'c') + sec : 'ly', tx = $('#mugTxt');
    if (S.mugKey !== key) {
      if (!judge) tx.innerHTML = '<span class="ly">' + ['무궁화 꽃이', '피었습니다'].map(l => [...l].map(ch => ch === ' ' ? ' ' : `<i>${ch}</i>`).join('')).join('<br>') + '</span>';
      else {
        tx.innerHTML = me.role === 'runner' ? `<b>멈춰! ${sec}</b><small>지금 움직이면 걸려요</small>` : `<b>🌸 판정 중 ${sec}</b><small>움직이는 도망자를 찾는 중</small>`;
        if (!S.mugKey || S.mugKey === 'ly') { mEl.classList.remove('hit'); void mEl.offsetWidth; mEl.classList.add('hit'); }
      }
      mEl.classList.toggle('judge', judge); S.mugKey = key;
    }
    if (!judge) tx.querySelectorAll('.ly i').forEach((el, i) => { // 노래방처럼 글자마다 불이 들어옴
      const [st, d] = MUG_SYL[i] || [99, 1], p = mProg(rel, st, st + Math.max(.1, d));
      el.style.setProperty('--p', (p * 100).toFixed(1) + '%');
      el.style.transform = p > 0 ? `scale(${(1 + .3 * (1 - mOutCubic(mProg(rel, st, st + .2)))).toFixed(3)})` : '';
    });
    let v = 0; // 판정 중 빨간 테두리: 시작할 때 번쩍, 그다음 1초마다
    if (judge) { const j = (t - mg.from) / 1000; v = .25 + .5 * Math.exp(-j * 3) + (j >= 1 ? .3 * Math.exp(-(j % 1) * 4) : 0); }
    fx.style.opacity = Math.min(1, v).toFixed(3);
  } catch (e) { console.error(e); }
  requestAnimationFrame(mugAnim);
}
setInterval(overlayLoop, 200);

