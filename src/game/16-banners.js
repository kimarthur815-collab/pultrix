// ---------- 연결 상태 · 소리 잠김 · 탈락 배너 ----------
// 폰의 서버 연결이 조용히 끊기면 내 화면에서만 기권·위치가 바뀌고 다른 폰엔 안 감 → 끊기면 표시하고 다시 연결
S.conn = false; S.connLostAt = Date.now(); S.reconnAt = 0;
if (db) onValue(ref(db, '.info/connected'), s => {
  if (s.val()) { S.conn = true; S.connLostAt = 0; }
  else { S.conn = false; if (!S.connLostAt) S.connLostAt = Date.now(); }
});
function reconnect() {
  if (!db || Date.now() - S.reconnAt < 3000) return;
  S.reconnAt = Date.now();
  try { goOffline(db); setTimeout(() => goOnline(db), 300); } catch (e) { console.error(e); }
}
let hiddenAt = 0;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { hiddenAt = Date.now(); return; }
  if (S.code && hiddenAt && Date.now() - hiddenAt > 5000) reconnect(); // 아이폰은 화면을 껐다 켜면 연결이 죽은 채로 남을 때가 있어서
  hiddenAt = 0;
});
const deathBanQ = []; let deathBanUntil = 0;
function deathBan(text) { deathBanQ.push(text); deathBanLoop(); }
function deathBanLoop() {
  const b = $('#deathBan');
  if (S.screen !== 's-game') { deathBanQ.length = 0; deathBanUntil = 0; return b.classList.remove('on'); }
  if (Date.now() < deathBanUntil) return;
  if (!deathBanQ.length) return b.classList.remove('on');
  b.textContent = deathBanQ.shift(); b.classList.remove('on'); void b.offsetWidth; b.classList.add('on');
  deathBanUntil = Date.now() + 3000; vibrate(60);
}
function bannerLoop() {
  const lost = !S.conn && S.code && S.connLostAt ? Date.now() - S.connLostAt : 0;
  $('#netBan').classList.toggle('on', lost > 2000 && (S.screen === 's-game' || S.screen === 's-lobby'));
  if (lost > 5000 && Date.now() - S.reconnAt > 10000) reconnect();
  $('#sndBan').classList.toggle('on', S.screen === 's-game' && !muted && !(actx && actx.state === 'running'));
  deathBanLoop();
}
setInterval(bannerLoop, 500);
setInterval(() => { // 미니맵 배지: 찍힌 지 몇 초 됐는지 + 오래될수록 흐려짐 (다음 갱신 즈음엔 반쯤)
  const mo = maps.gmap; if (!mo || !mo.others) return;
  const I = (modeOf(S.room) === 'mafia' ? Logic.MODE_RULES.MF_SNAP_SEC : intelSec()) * 1000;
  for (const mk of mo.others) {
    if (!mk._snapAt) continue; const el = mk.getElement(); if (!el) continue;
    const age = Math.max(0, now() - mk._snapAt), sec = Math.round(age / 1000);
    const em = el.querySelector('em'); if (em) em.textContent = sec < 2 ? '방금' : `${sec}초 전`;
    const pb = el.querySelector('.pb'); if (pb) pb.style.opacity = Math.max(.4, 1 - .6 * age / I).toFixed(2);
  }
}, 1000);

