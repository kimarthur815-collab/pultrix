// ---------- 설정 창 (홈·로비·게임 중 ⚙): 배경음악·효과음 켜고 끄기, 이 폰에 저장 ----------
// 위치정보 동의 여부 (이 폰에 저장)
const CONSENT_KEY = 'gtag_consent_v2'; // v2: 리플레이(동선 7일 보관·공유) 추가 → 한 번 더 동의
const hasConsent = () => { try { return !!localStorage.getItem(CONSENT_KEY); } catch (e) { return !!S.consentMem; } };
function renderSet() {
  const sw = (sel, on) => { const b = $(sel); b.textContent = on ? '켜짐' : '꺼짐'; b.classList.toggle('on', on); };
  sw('#setBgm', bgmOn); sw('#setSfx', !muted);
  const c = $('#setConsent'); if (c) { const on = hasConsent(); c.textContent = on ? '동의함' : '안 함'; c.classList.toggle('on', on); }
}
function setMute(m) {
  muted = m; try { localStorage.setItem('gtag_mute', m ? '1' : '0'); } catch (e) {}
  renderSet();
}
function setBgm(on) {
  bgmOn = on; try { localStorage.setItem('gtag_bgm', on ? '1' : '0'); } catch (e) {}
  renderSet(); bgmLoop();
}
document.querySelectorAll('.btnSet').forEach(b => { b.onclick = () => { renderSet(); renderFs(); $('#btnFb').style.display = S.screen === 's-game' ? 'none' : ''; $('#ov-set').classList.add('on'); }; });
$('#setBgm').onclick = () => setBgm(!bgmOn);
// 피드백·버그 제보: feedback/ 에 쓰기만 (읽기는 Firebase 콘솔에서)
const APP_VER = (() => { const d = new Date(document.lastModified); return isNaN(d) ? '?' : d.toISOString().slice(0, 16).replace('T', ' '); })();
function openFb() {
  $('#ov-set').classList.remove('on'); $('#ov-fb').classList.add('on');
  $('#fbCount').textContent = `${$('#fbText').value.length}/500`;
}
$('#btnFb').onclick = openFb;
// 소리·진동 체크: 웹에선 무음·진동 모드를 알 수 없어서 직접 울려 보고 물어봄 (처음 방에 들어왔을 때 한 번 + 로비 🔊 버튼)
function openSndCheck() {
  $('#sndQ').innerHTML = '사이렌·호루라기 같은 소리랑 진동으로 알려 주는 게 많아요.<br>한 번 울려 볼게요.';
  $('#sndTips').style.display = 'none'; $('#sndAns').style.display = 'none'; $('#btnSndPlay').textContent = '🔊 울려 보기';
  $('#ov-snd').classList.add('on');
}
function sndCheckOnce() { let done = false; try { done = localStorage.getItem('sndChecked') === '1'; } catch (e) {} if (!done) openSndCheck(); }
const sndDone = () => { try { localStorage.setItem('sndChecked', '1'); } catch (e) {} $('#ov-snd').classList.remove('on'); };
$('#btnSndTest').onclick = openSndCheck;
$('#btnSndPlay').onclick = () => {
  const wasMuted = muted; if (wasMuted) setMute(false); // 효과음을 꺼 뒀으면 켜고 울림
  audio(); setTimeout(() => { sfx('whistle'); vibrate([200, 100, 200]); }, 120);
  $('#sndQ').innerHTML = (wasMuted ? '⚙ 설정에서 꺼져 있던 효과음을 켰어요.<br>' : '') + '삐익— 소리랑 진동 왔어요?';
  $('#sndAns').style.display = 'flex'; $('#btnSndPlay').textContent = '🔊 다시 울리기';
};
$('#btnSndYes').onclick = () => { sndDone(); toast('좋아요! 소리 준비 끝'); };
$('#btnSndNo').onclick = () => { $('#sndTips').style.display = ''; $('#sndQ').innerHTML = '웹사이트는 폰이 무음인지 알 수가 없어서, 직접 바꿔 줘야 해요.'; };
$('#btnSndClose').onclick = sndDone;
document.querySelectorAll('.btnFb2').forEach(b => { b.onclick = openFb; });
$('#btnFbClose').onclick = () => $('#ov-fb').classList.remove('on');
$('#fbType').onclick = e => { const b = e.target.closest('[data-k]'); if (!b) return; $('#fbType').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); };
$('#fbText').oninput = () => { $('#fbCount').textContent = `${$('#fbText').value.length}/500`; };
$('#btnFbSend').onclick = safe(async () => {
  const text = $('#fbText').value.trim(), type = ($('#fbType .on') || {}).dataset?.k || 'etc', contact = $('#fbContact').value.trim().slice(0, 60);
  if (!text) return toast('내용을 적어 줘요');
  let last = 0; try { last = +localStorage.getItem('fbAt') || 0; } catch (e) {}
  if (Date.now() - last < 60000) return toast('1분 뒤에 다시 보낼 수 있어요');
  let uid = null; try { uid = await ensureAuth(); } catch (e) { return toast(e.message, true); }
  if (!uid) return toast('연결이 안 돼서 못 보냈어요. 잠시 뒤에 다시 해 줘요', true);
  const btn = $('#btnFbSend'); btn.disabled = true;
  try {
    await push(ref(db, 'feedback'), { type, text: text.slice(0, 500), ...(contact ? { contact } : {}), room: (S.code || '').slice(0, 10), ua: navigator.userAgent.slice(0, 300), ver: APP_VER, uid, at: serverTimestamp() });
    try { localStorage.setItem('fbAt', String(Date.now())); } catch (e) {}
    $('#fbText').value = ''; $('#ov-fb').classList.remove('on'); toast('보냈어요. 고마워요!', true);
  } catch (e) { console.error(e); toast('못 보냈어요. 잠시 뒤에 다시 해 줘요', true); }
  finally { btn.disabled = false; }
});
$('#setSfx').onclick = () => { setMute(!muted); if (!muted) sfx('ping'); };
$('#btnSetClose').onclick = () => $('#ov-set').classList.remove('on');
// 동의 철회: 다음에 방을 만들거나 참가할 때 다시 물어봄 (지금 방에 있으면 나가기를 눌러 위치를 지우세요)
$('#setConsent').onclick = () => {
  if (!hasConsent()) { $('#ov-set').classList.remove('on'); askConsent(); return; }
  try { localStorage.removeItem(CONSENT_KEY); } catch (e) { S.consentMem = false; }
  renderSet(); toast(S.room ? '동의를 철회했어요. 방에서 나가기를 누르면 내 위치가 지워져요' : '동의를 철회했어요', true);
};
// 전체화면: 안드로이드·PC는 브라우저 전체화면, 아이폰은 지원이 없어서 '홈 화면에 추가' 안내 (홈 화면 앱은 주소창 없이 열림)
const fsOn = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
const fsCan = () => !/iPhone|iPod/.test(navigator.userAgent) && !!(document.fullscreenEnabled || document.webkitFullscreenEnabled); // 아이폰은 영상만 전체화면 가능
// 홈 화면 앱으로 연 경우 (브라우저 전체화면 중에도 display-mode가 fullscreen이 되므로 그건 빼고)
const appMode = () => navigator.standalone === true || (!fsOn() && (matchMedia('(display-mode: fullscreen)').matches || matchMedia('(display-mode: standalone)').matches));
function enterFs() {
  const d = document.documentElement, f = d.requestFullscreen || d.webkitRequestFullscreen;
  try { const r = f.call(d, { navigationUI: 'hide' }); if (r && r.catch) r.catch(() => {}); } catch (e) {}
}
function toggleFs() {
  if (fsOn()) { try { const r = (document.exitFullscreen || document.webkitExitFullscreen).call(document); if (r && r.catch) r.catch(() => {}); } catch (e) {} return; }
  if (fsCan()) return enterFs();
  if (appMode()) return toast('이미 앱처럼 전체화면이에요');
  if (IS_IOS) return $('#ov-a2hs').classList.add('on');
  toast('전체화면이 안 되는 브라우저예요 (크롬 추천)', true);
}
function renderFs() {
  const on = fsOn() || appMode(), b = $('#setFs');
  b.textContent = on ? '켜짐' : '꺼짐'; b.classList.toggle('on', on);
  $('#btnFs').textContent = fsOn() ? '✕' : '⛶'; $('#btnFs').title = fsOn() ? '전체화면 끄기' : '전체화면';
  $('#btnFs').style.display = appMode() ? 'none' : '';
}
$('#setFs').onclick = () => { if (!fsOn() && !fsCan() && IS_IOS && !appMode()) $('#ov-set').classList.remove('on'); toggleFs(); };
$('#btnFs').onclick = toggleFs;
$('#btnA2hsClose').onclick = () => $('#ov-a2hs').classList.remove('on');
['fullscreenchange', 'webkitfullscreenchange'].forEach(n => document.addEventListener(n, renderFs));
renderFs();
renderSet();
const ROLE_NAME = { chaser: '추격자', runner: '도망자' };
// 모드별 역할 이름 (마피아 모드는 경찰·의사 직업 이름)
const MODE_ROLE = { terr: { chaser: '빨강팀', runner: '파랑팀' }, assassin: { chaser: '우두머리', runner: '부하' }, ice: { chaser: '술래', runner: '도망자' }, zombie: { chaser: '좀비', runner: '생존자' }, police: { chaser: '경찰', runner: '도둑' }, mafia: { chaser: '마피아', runner: '시민' } };
const JOB_NAME = { police: '경찰', doctor: '의사', exPolice: '경찰' };
const roleName = (role, room, job, pid) => Logic.isTerrRole(role) ? terrTeamName(role) : Logic.isAsnRole(role) ? (pid ? (Logic.asnIsBoss(room && room.asn, pid) ? '우두머리' : '부하') : '암살자') : (modeOf(room) === 'mafia' && job && JOB_NAME[job]) || (MODE_ROLE[modeOf(room)] || ROLE_NAME)[role] || '';
const ROLE_RGBA = { chaser: 'rgba(255,77,79,.85)', runner: 'rgba(59,163,255,.85)' };
// 슬롯머신처럼 역할이 돌다가 내 역할에서 멈춤 (배정은 방장이 시작할 때 랜덤으로 이미 정해짐)
function showRoleReveal(role) {
  if (Logic.isAsnRole(role)) return asnReveal();
  if (Logic.isTerrRole(role)) return terrReveal(role);
  const reel = $('#reel'), items = [], room = S.room, me = (room && room.players[S.pid]) || {}, mine = roleName(role, room, me.job);
  for (let i = 0; i < 23; i++) items.push(i % 2 ? 'runner' : 'chaser');
  items.push(role);
  reel.innerHTML = items.map((r, i) => `<div class="${r}-t">${i === items.length - 1 ? mine : roleName(r, room)}</div>`).join('');
  reel.style.transition = 'none'; reel.style.transform = 'translateY(0)';
  $('#roleMsg').textContent = ''; $('#roleSub').textContent = '';
  $('#btnRoleOk').style.visibility = 'hidden';
  $('#ov-role').classList.add('on');
  void reel.offsetWidth;
  reel.style.transition = ''; reel.style.transform = `translateY(-${(items.length - 1) * 96}px)`;
  clearTimeout(S.revealT);
  S.revealT = setTimeout(() => {
    $('#roleMsg').textContent = `당신은 ${mine}!`;
    $('#roleMsg').className = 'big ' + role + '-t';
    const mates = Object.entries(room.players).filter(([id, p]) => id !== S.pid && p.role === 'chaser').map(([, p]) => p.name);
    $('#roleSub').textContent = modeOf(room) === 'mafia'
      ? (role === 'chaser' ? `동료 마피아: ${mates.length ? mates.join(', ') : '없음 (혼자)'} · QR로 몰래 잡으세요` : me.job === 'police' ? `${Logic.fmtSec(Logic.augCdMs('mfCheck') / 1000)}마다 조사, 저격총으로 마피아를 쏘세요 (시민을 쏘면 같이 탈락)` : me.job === 'doctor' ? 'QR을 찍어 5분 동안 지켜 주세요 (나도 가능)' : '마피아를 찾아 투표로 추방하세요 (5분마다)')
      : role === 'chaser' ? `${fmtDur(RULES.HIDE_SEC)} 동안 제자리에서 기다리세요` : `${fmtDur(RULES.HIDE_SEC)} 안에 숨으세요!`;
    $('#btnRoleOk').style.visibility = 'visible';
    flash(ROLE_RGBA[role]); vibrate(role === 'chaser' ? [200, 80, 200] : 200);
  }, 2700);
}
$('#btnRoleOk').onclick = () => { $('#ov-role').classList.remove('on'); if (!fsOn() && fsCan() && !appMode()) enterFs(); maybeModeTut(); };
function saveLocal(v) { try { localStorage.setItem('gtag', JSON.stringify(v)); } catch (e) {} }
const ROOM_STALE_MS = 6 * 3600000;
function roomSeen(code, pid) { // 이 폰이 들어간 방 기록 (마지막으로 본 시각)
  try {
    const L = JSON.parse(localStorage.getItem('gtag_rooms') || '[]').filter(x => !(x.code === code && x.pid === pid));
    L.push({ code, pid, at: Date.now() }); localStorage.setItem('gtag_rooms', JSON.stringify(L.slice(-30)));
  } catch (e) {}
}
async function roomCleanup() { // 6시간 넘은 방: 내 자리 지움 → 남은 사람이 없으면 방도 지움 (보안 규칙이 그때만 허락)
  let L = []; try { L = JSON.parse(localStorage.getItem('gtag_rooms') || '[]'); } catch (e) { return []; }
  const stale = L.filter(x => Date.now() - x.at > ROOM_STALE_MS), keep = L.filter(x => Date.now() - x.at <= ROOM_STALE_MS);
  try { localStorage.setItem('gtag_rooms', JSON.stringify(keep)); } catch (e) {}
  for (const x of stale) {
    try { await remove(ref(db, `rooms/${x.code}/players/${x.pid}`)); } catch (e) {}
    let left = null; try { left = (await get(ref(db, `rooms/${x.code}/players`))).val(); } catch (e) {} // 나간 뒤엔 보통 못 읽음(보안 규칙) → 규칙이 판단
    if (!left || !Object.keys(left).length) try { await remove(ref(db, `rooms/${x.code}`)); } catch (e) {} // 남은 사람이 있으면 규칙이 거절 (정상)
  }
  return stale.map(x => x.code);
}

/* ---------- 센서 ---------- */
async function startSensors() {
  // 아이폰: 나침반(방향)·흔들기(가속도) 권한을 한 번에 요청 (버튼을 누른 순간에 둘 다 불러야 함)
  try {
    const DO = typeof DeviceOrientationEvent !== 'undefined' && DeviceOrientationEvent.requestPermission;
    const DM = typeof DeviceMotionEvent !== 'undefined' && DeviceMotionEvent.requestPermission;
    const pO = typeof DO === 'function' ? DeviceOrientationEvent.requestPermission().catch(() => 'denied') : null;
    const pM = typeof DM === 'function' ? DeviceMotionEvent.requestPermission().catch(() => 'denied') : null;
    if (pO && (await pO) !== 'granted') toast('나침반이 없어서 북쪽 기준으로 보여요');
    if (pM) await pM;
  } catch (e) {}
  if (!S.orientBound) {
    S.orientBound = true;
    window.addEventListener('deviceorientationabsolute', onOrient, true);
    window.addEventListener('deviceorientation', onOrient, true);
    window.addEventListener('devicemotion', onMotion);
  }
  if (!navigator.geolocation) { toast('이 브라우저는 GPS를 지원하지 않아요', true); return false; }
  if (S.watchId == null) S.watchId = navigator.geolocation.watchPosition(onFix, onFixErr, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
  await requestWake();
  S.sensorsOn = true;
  return true;
}
async function requestWake() {
  try { if ('wakeLock' in navigator) S.wake = await navigator.wakeLock.request('screen'); } catch (e) {}
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.sensorsOn) requestWake(); });

let arrowRaf = 0;
function onOrient(e) {
  let h = null;
  if (typeof e.webkitCompassHeading === 'number') h = e.webkitCompassHeading;
  else if ((e.absolute || e.type === 'deviceorientationabsolute') && e.alpha != null) h = 360 - e.alpha;
  if (h == null) return;
  const ang = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
  h = (h + ang + 360) % 360;
  if (S.heading == null) S.heading = h;
  else { const d = ((h - S.heading + 540) % 360) - 180; S.heading = (S.heading + d * 0.3 + 360) % 360; }
  S.compass = true;
  if (!arrowRaf) arrowRaf = requestAnimationFrame(() => { arrowRaf = 0; if (S.screen === 's-game') { drawArrow(); applyBearing(); } });
}
// ---------- 분신 조이스틱: 분신이 살아 있는 동안 왼쪽 아래에 표시 ----------
// 민 만큼 빠르게(최대 시속 10km), 화면 기준 방향(지도가 돌아가 있어도 위로 밀면 화면 위쪽), 손 떼면 멈춤, 구역 경계에서 멈춤
const JOY_R = 46, joy = { id: null, x: 0, y: 0, sent: 0, last: null, timer: 0, key: null };
// 조이스틱으로 조종하는 것: 분신(조종형) 또는 드론, 둘 다 있으면 마지막에 쓴 것
function joyObj() {
  const me = S.room && S.room.players && S.room.players[S.pid]; if (!me) return null;
  const t = now(), dc = me.decoy && me.decoy.joy && (me.decoy.until || 0) > t ? me.decoy : null, dr = me.drone && (me.drone.until || 0) > t ? me.drone : null;
  if (dr && (!dc || S.joyKey === 'drone')) return { key: 'drone', o: dr, ms: Logic.AUGS.drone.ms, name: '🛸 드론' };
  return dc ? { key: 'decoy', o: dc, ms: Logic.AUGS.decoy.ms, name: '분신' } : null;
}
function joySend(force) {
  const j = joyObj(); if (!j) return;
  if (joy.key !== j.key) { joy.key = j.key; joy.last = null; }
  const t = now(), m = Math.min(1, Math.hypot(joy.x, joy.y) / JOY_R), ms = m < .15 ? 0 : m * j.ms;
  const brg = ms ? (Math.atan2(joy.x, -joy.y) * 180 / Math.PI - mapBearing() + 720) % 360 : (joy.last ? joy.last.brg : 0);
  const L0 = joy.last;
  if (!force && L0 && Math.abs(ms - L0.ms) < .25 && (ms === 0 || angDiff(brg, L0.brg) < 8)) return; // 거의 그대로면 안 보냄
  if (!force && t - joy.sent < 250) { if (!joy.timer) joy.timer = setTimeout(() => { joy.timer = 0; joySend(); }, 260); return; }
  const cur = Logic.movingPos(j.o, t), area = S.room.settings && S.room.settings.area;
  const nx = { lat: cur.lat, lng: cur.lng, at: t, brg, ms, maxD: area ? Logic.edgeDist(cur, brg, area) : 1e9, until: j.o.until, ...(j.key === 'decoy' ? { joy: 1 } : {}) };
  joy.sent = t; joy.last = nx;
  update(meRef(), { [j.key]: nx }).catch(e => console.error(e));
}
function joyMove(e) {
  const r = $('#joy').getBoundingClientRect();
  let x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2);
  const d = Math.hypot(x, y); if (d > JOY_R) { x *= JOY_R / d; y *= JOY_R / d; }
  joy.x = x; joy.y = y; $('#joy i').style.transform = `translate(${x}px,${y}px)`;
  joySend();
}
$('#joy').addEventListener('pointerdown', e => { joy.id = e.pointerId; try { $('#joy').setPointerCapture(e.pointerId); } catch (er) {} joyMove(e); });
$('#joy').addEventListener('pointermove', e => { if (e.pointerId === joy.id) joyMove(e); });
const joyUp = e => {
  if (e.pointerId !== joy.id) return;
  joy.id = null; joy.x = joy.y = 0; $('#joy i').style.transform = ''; clearTimeout(joy.timer); joy.timer = 0;
  joySend(true); // 손 떼면 그 자리에 멈춤
};
$('#joy').addEventListener('pointerup', joyUp); $('#joy').addEventListener('pointercancel', joyUp);
// 분신이 살아 있는 동안 조이스틱 표시 + 내 지도의 분신을 부드럽게 (0.2초마다)
function joyLoop(inGame) {
  const j = inGame && joyObj(), el = $('#joy');
  el.classList.toggle('on', !!j);
  if (!j) { if (joy.id != null) { joy.id = null; joy.x = joy.y = 0; $('#joy i').style.transform = ''; } joy.last = null; return; }
  el.querySelector('span').textContent = `${j.name} ${fmt(j.o.until - now())}`;
  if (maps.gmap) drawSkills(maps.gmap);
}
// 지도 회전 (S.mapMode): heading 내가 보는 방향이 위(기본, 나침반 없으면 북쪽) / north 북쪽 고정 / manual 두 손가락으로 돌린 방향 유지
let bearAt = 0, bearTimer = 0;
const angDiff = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
const mapBearing = () => (maps.gmap && maps.gmap.map.getBearing ? maps.gmap.map.getBearing() : 0);
function applyBearing(force) {
  const mo = maps.gmap; if (!mo || !mo.map.setBearing || S.screen !== 's-game') return;
  const hu = S.mapMode === 'heading' && S.compass && S.heading != null, want = hu ? (360 - S.heading) % 360 : 0;
  $('#btnNorth').classList.toggle('on', hu);
  if (S.mapMode === 'manual' || S.twoFinger) return; // 손으로 돌리는 중·돌린 뒤엔 그대로
  const d = angDiff(want, mo.map.getBearing()), t = Date.now();
  if (!force && d < 1.5) return;
  if (!force && t - bearAt < 100) { if (!bearTimer) bearTimer = setTimeout(() => { bearTimer = 0; applyBearing(); }, 100); return; }
  bearAt = t; mo.map.setBearing(want);
}
// 두 손가락으로 10° 넘게 돌리면 손으로 돌린 방향 유지 (살짝 비틀린 확대·축소는 원래대로 되돌림)
function bindRotate(mo) {
  const el = mo.map.getContainer();
  mo.map.on('rotate', () => {
    $('#btnNorth svg').style.transform = `rotate(${mo.map.getBearing()}deg)`; // 바늘(빨강)이 화면 속 북쪽을 가리킴
    if (joy.id != null) joySend(); // 조이스틱은 화면 기준 방향이라 지도가 돌면 분신 방향도 다시
  });
  const ang = e => Math.atan2(e.touches[1].clientY - e.touches[0].clientY, e.touches[1].clientX - e.touches[0].clientX) * 180 / Math.PI;
  el.addEventListener('touchstart', e => { if (e.touches.length >= 2 && !S.twoFinger) { S.twoFinger = true; S.gestBear = mo.map.getBearing(); S.gestAng = ang(e); } }, { passive: true });
  el.addEventListener('touchmove', e => {
    if (!S.twoFinger || e.touches.length < 2) return;
    let d = ang(e) - S.gestAng; d = ((d + 540) % 360) - 180;
    if (Math.abs(d) > 4 || S.mapMode === 'manual') mo.map.setBearing(S.gestBear + d); // 살짝 비틀린 건 무시 (확대·축소만)
  }, { passive: true });
  const end = e => {
    if (!S.twoFinger || e.touches.length >= 2) return;
    S.twoFinger = false;
    if (angDiff(mo.map.getBearing(), S.gestBear) > 10) {
      if (S.mapMode !== 'manual') toast('지도 방향 고정 · 🧭로 되돌리기');
      S.mapMode = 'manual'; applyBearing();
    } else if (S.mapMode !== 'manual') applyBearing(true);
  };
  el.addEventListener('touchend', end, { passive: true }); el.addEventListener('touchcancel', end, { passive: true });
}

