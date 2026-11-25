import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js";
import { getDatabase, ref, get, set, update, push, remove, onValue, onChildAdded, query, limitToLast, runTransaction, serverTimestamp, goOffline, goOnline } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const $ = s => document.querySelector(s);
const ALNUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const CODECH = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const rid = (n, abc = CODECH) => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => abc[b % abc.length]).join('');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
// 아이폰은 웹 진동 기능이 없어서, 숨은 스위치를 눌러 짧은 '틱'을 냄 (iOS 18 이상 사파리, 화면을 누른 순간이 아니면 안 울릴 수도 있음)
const IS_IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
let iosSw = null;
const iosTick = () => { try { if (!iosSw) { iosSw = document.createElement('label'); iosSw.ariaHidden = 'true'; iosSw.style.display = 'none'; iosSw.innerHTML = '<input type="checkbox" switch>'; document.head.appendChild(iosSw); } iosSw.click(); } catch (e) {} };
const vibrate = p => {
  try {
    if (navigator.vibrate) return navigator.vibrate(p);
    if (!IS_IOS) return;
    let at = 0; [].concat(p).forEach((d, i) => { if (i % 2 === 0) setTimeout(iosTick, at); at += d; }); // 진동하는 칸마다 틱 한 번
  } catch (e) {}
};

const S = {
  offset: 0, screen: null,
  fix: null, prevFix: null, fixAt: 0, speed: 0, heading: null, compass: false, mapMode: 'heading', sensorsOn: false, watchId: null, wake: null,
  code: null, pid: null, name: '', room: null, unsub: null, evUnsub: null, readySent: null,
  gameKey: null, st: 0, selfDmg: 0, anchor: null, waitOut: 0, ruleSec: 0, lastMapIdx: null, lastArrowKey: null,
  snap: [], dead: {}, warn: [], lastTick: 0, lastWrite: 0, winSent: false, follow: true, arrowRot: 0,
  stream: null, scanning: false
};

const cfgOk = !!(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.databaseURL);
let db = null, authReady = Promise.resolve(null), AUTH = null;
if (cfgOk) {
  const app = initializeApp(FIREBASE_CONFIG);
  if (APP_CHECK_SITE_KEY) try { initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(APP_CHECK_SITE_KEY), isTokenAutoRefreshEnabled: true }); } catch (e) { console.error(e); }
  db = getDatabase(app);
  // 익명 로그인: 플레이어 아이디 = 로그인 아이디 → 보안 규칙이 '방에 들어온 사람만 읽기·쓰기'를 확인할 수 있게
  // (콘솔에서 익명 로그인을 아직 안 켰으면 실패하고, 예전처럼 임의 아이디로 진행)
  try {
    const auth = AUTH = getAuth(app);
    authReady = new Promise(res => {
      onAuthStateChanged(auth, u => { if (u) { S.uid = u.uid; res(u.uid); } });
      signInAnonymously(auth).catch(e => { S.authErr = e.code || e.message; console.warn('익명 로그인 실패 (콘솔에서 켜야 해요):', S.authErr); res(null); });
      setTimeout(() => res(null), 8000);
    });
  } catch (e) { console.error(e); }
  onValue(ref(db, '.info/serverTimeOffset'), s => { S.offset = s.val() || 0; });
}
const now = () => Date.now() + S.offset;
// 방 만들기·참가 전: 로그인이 아직이면 한 번 더 시도 (느린 데이터망), 그래도 안 되면 이유를 보여 줌
async function ensureAuth() {
  const u = await authReady; if (u) return u;
  if (!AUTH) return null;
  if (AUTH.currentUser) return (S.uid = AUTH.currentUser.uid);
  toast('로그인 중… 잠깐만요');
  try {
    const c = await Promise.race([signInAnonymously(AUTH), new Promise((_, rej) => setTimeout(() => rej(new Error('시간 초과')), 15000))]);
    S.uid = c.user.uid; authReady = Promise.resolve(c.user.uid); return c.user.uid;
  } catch (e) { S.authErr = e.code || e.message; throw new Error(`로그인이 안 돼요 (${S.authErr}) · 인터넷 확인 후 새로고침`); }
}
const roomRef = p => ref(db, `rooms/${S.code}` + (p ? '/' + p : ''));
const meRef = () => roomRef(`players/${S.pid}`);
const safe = fn => async (...a) => { try { await fn(...a); } catch (e) { console.error(e); const m = String(e.message || e); toast(/permission.denied/i.test(m) ? `서버가 거절했어요 (권한)${S.authErr ? ' · 로그인 실패: ' + S.authErr : ''} · 새로고침해 보세요` : '연결 오류: ' + m, true); } };

let toastT;
/* ---------- 팁: 대기 화면(로비·숨는 시간·잡은 뒤 정지)에선 돌아가며, 게임 중엔 상황마다 처음 한 번 ---------- */
// [역할('' = 모두), 글] — 글이 함수면 방장 설정 숫자를 그때그때 넣음
const TIPS = [
  ['', '능력을 꾹 누르면 설명을 볼 수 있어요'],
  ['', '지도를 꾹 누르면 같은 팀에게 핑(👀 여기 있었음 · 📍 모여 · ⚠️ 위험)을 보낼 수 있어요'],
  ['', '지도는 두 손가락으로 돌릴 수 있어요. 🧭 버튼을 누르면 내 방향 ↔ 북쪽 고정'],
  ['', () => `걸을 때(시속 ${RULES.WALK_KMH}km 이하)는 스태미나가 안 닳아요`],
  ['', () => `${RULES.STILL_SEC}초 가만히 있으면 스태미나가 초당 ${RULES.STILL_RECOVER}씩 차요`],
  ['', () => `스태미나 0에서 뛰면 ${RULES.EXHAUST_WARN_SEC}초 경고 뒤 체력이 닳아요. ${RULES.EXHAUST_RESET_SEC}초 이상 걷거나 멈추면 경고가 처음부터`],
  ['', () => `시속 ${RULES.VEHICLE_KMH}km가 넘으면 탈것을 탄 걸로 보고 체력이 닳아요`],
  ['', '구역 밖으로 나가면 경고 뒤 체력이 닳아요'],
  ['', '지도의 ✦ 증강 지점에 가면 능력을 얻어요. 아무도 안 먹으면 시간이 지나 다른 자리로 옮겨가요'],
  ['', '와이파이를 켜 두면 건물 근처에서 위치가 더 정확해요'],
  ['', '⚙ 설정에서 배경음악을 끄고 켤 수 있어요'],
  ['', '방장 규칙 메모는 게임 중에도 📝 버튼으로 다시 볼 수 있어요'],
  ['runner', '잡혀도 체력이 남아 있으면 계속 도망칠 수 있어요'],
  ['chaser', () => `화살표는 가장 가까운 상대 쪽이에요. ${RULES.ARROW_NEAR_M}m 안이면 '근처에 있어요!'로 바뀌어요`],
  ['chaser', () => `${RULES.ALT_NEAR_M}m 안에서 높이가 다르면 화살표에 ▲▼와 몇 m 위·아래인지 떠요`],
];
const tipText = x => (typeof x === 'function' ? x() : x);
const tipOff = Math.floor(Math.random() * TIPS.length);
// 대기 화면 팁: 7초마다 바뀜 (role이 없으면 모두에게 맞는 팁만)
function waitTip(role) {
  const list = TIPS.filter(([r]) => !r || r === role);
  return '💡 ' + tipText(list[(Math.floor(Date.now() / 7000) + tipOff) % list.length][1]);
}
function setTipLine(el, text) {
  if (el.textContent === text) return;
  el.textContent = text; el.classList.remove('tipnew'); if (text) { void el.offsetWidth; el.classList.add('tipnew'); }
}
setInterval(() => { if (S.screen === 's-lobby') setTipLine($('#l-tip'), waitTip('')); }, 500);
// 상황 팁: 이 폰에서 처음 그 상황이 생길 때 한 번 (창이 떠 있으면 닫힐 때까지 기다림, 8초 뒤 또는 누르면 닫힘)
const TIP_KEY = 'gtag_tips_v1', tipQ = [];
const tipSeen = (() => { try { return JSON.parse(localStorage.getItem(TIP_KEY)) || {}; } catch (e) { return {}; } })();
let tipHideAt = 0, tipNextAt = 0;
function tipOnce(id, text) { if (!tipSeen[id] && !tipQ.some(q => q[0] === id)) tipQ.push([id, text]); }
function tipLoop() {
  const el = $('#tipBubble'), real = Date.now();
  if (el.classList.contains('on')) { if (real > tipHideAt) { el.classList.remove('on'); tipNextAt = real + 3000; } return; }
  if (!tipQ.length || S.screen !== 's-game' || real < tipNextAt || document.querySelector('.ov.on')) return;
  const [id, text] = tipQ.shift(); tipSeen[id] = 1;
  try { localStorage.setItem(TIP_KEY, JSON.stringify(tipSeen)); } catch (e) {}
  el.innerHTML = `💡 ${esc(tipText(text))}<small>눌러서 닫기</small>`; el.classList.add('on'); tipHideAt = real + 8000;
}
$('#tipBubble').onclick = () => { $('#tipBubble').classList.remove('on'); tipNextAt = Date.now() + 3000; };
function toast(msg, big) {
  const t = $('#toast'); t.textContent = msg; t.className = 'toast on' + (big ? ' big' : '');
  clearTimeout(toastT); toastT = setTimeout(() => { t.className = 'toast'; }, big ? 4000 : 2600);
}
function show(id) {
  document.querySelectorAll('.screen').forEach(e => e.classList.toggle('on', e.id === id));
  S.screen = id;
  if (id !== 's-game') { const tb = document.getElementById('terrBar'); if (tb) tb.classList.remove('on'); } // 땅따먹기 점수판은 게임 화면에서만
}
// 화면 테두리가 한 번 번쩍임
function flash(color) {
  const f = $('#flash'), rainbow = color === 'rainbow';
  f.style.boxShadow = rainbow ? 'inset 0 0 200px 80px rgba(255,122,217,.9)' : `inset 0 0 160px 60px ${color}`;
  f.classList.toggle('rainbow', rainbow);
  f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
}
/* ---------- 효과음 (파일 없이 Web Audio로 만든 전자음) ---------- */
let actx = null, muted = false;
try { muted = localStorage.getItem('gtag_mute') === '1'; } catch (e) {}
function audio() {
  if (!actx) {
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {} // 아이폰 무음 스위치를 켜도 게임 소리가 나게
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; actx = new C();
  }
  if (actx.state !== 'running' && actx.state !== 'closed') actx.resume().catch(() => {}); // 아이폰은 앱을 내렸다 올리면 'interrupted'
  return actx;
}
// 소리를 낼 수 있을 때만 (화면을 눌러 소리가 켜지기 전엔 null). 잠긴 채로 예약하면 처음 누르는 순간에 늦게 울려서
const audioOn = () => { const a = audio(); return a && a.state === 'running' ? a : null; };
document.addEventListener('pointerdown', () => { audio(); loadMug(); }, { passive: true }); // 폰은 화면을 한 번 눌러야 소리가 켜짐
// [주파수, 길이(초), 파형, 볼륨, 시작 지연(초)]
