// 좀비: 잡히면 바로 좀비(추격자)로, 잡은 좀비는 정지 없음 / 경찰과 도둑: 잡히면 감옥행, 경찰은 30초 정지
async function modeCatch(mode, tid, t) {
  const room = S.room, tp = room.players[tid], me = room.players[S.pid], MR = Logic.MODE_RULES;
  if (mode === 'mafia') { // 바로 탈락 (의사 보호 중이면 1번 막힘), 정지·보상 없음
    if (tp.guard && (tp.guard.until || 0) > t) {
      await update(roomRef(`players/${tid}`), { guard: null });
      push(roomRef('events'), { type: 'guarded', by: S.pid, target: tid, doc: tp.guard.by, at: serverTimestamp() });
      toast(`🩺 ${tp.name}은(는) 의사 보호 중! 잡기 실패`, true); vibrate(300); return renderGame();
    }
    if (!(await mfOut(tid, 'mafia', S.pid))) return toast('이미 탈락한 사람이에요');
    toast(`🔪 ${tp.name} 탈락!`, true); flash('rgba(255,77,79,.9)'); vibrate(200); sfx('catch');
    S.stats.catches = (S.stats.catches || 0) + 1; setTimeout(() => gainRandom('잡기 보상'), 2500); return renderGame();
  }
  const counter = tp.augs && tp.augs.counter && (tp.augs.counter.until || 0) > t;
  if (mode === 'zombie') {
    const r = await runTransaction(roomRef(`players/${tid}/role`), cur => (cur === 'runner' ? 'chaser' : undefined));
    if (!r.committed) return toast('방금 다른 좀비가 감염시켰어요');
    const u = { [`players/${tid}/zombieAt`]: t, [`players/${tid}/frozenUntil`]: 0, [`players/${tid}/anchor`]: null };
    for (const k of Object.keys(tp.augs || {})) if (Logic.AUGS[k] && Logic.AUGS[k].role === 'runner') u[`players/${tid}/augs/${k}`] = null; // 도망자 전용 증강은 사라짐
    if (RULES.TRACK_USES > 0 && !(tp.augs && tp.augs.trackNow)) u[`players/${tid}/augs/trackNow`] = { got: 1, left: RULES.TRACK_USES }; // 좀비도 추격자 기본 스킬
    await update(roomRef(), u);
    push(roomRef('events'), { type: 'infect', by: S.pid, target: tid, at: serverTimestamp() });
    toast(`🧟 ${tp.name} 감염! 같이 쫓아요`, true); flash('rgba(132,204,22,.9)'); vibrate(200); sfx('catch');
  } else if (mode === 'ice') { // 얼음땡: 잡힌 자리에서 얼음 (체력은 그대로), 술래는 잠깐 제자리
    const spot = tp.lat != null ? { lat: tp.lat, lng: tp.lng } : { lat: S.fix.lat, lng: S.fix.lng };
    const r = await runTransaction(roomRef(`players/${tid}/jailed`), cur => (cur ? undefined : { at: t, by: S.pid, ice: 1, ...spot }));
    if (!r.committed) return toast('이미 얼음인 도망자예요');
    S.anchor = { lat: S.fix.lat, lng: S.fix.lng }; S.waitOut = 0;
    await update(roomRef(), { [`players/${tid}/iceSelf/until`]: 0, [`players/${S.pid}/frozenUntil`]: t + MR.ICE_FREEZE_SEC * 1000, [`players/${S.pid}/prevFrozenUntil`]: me.frozenUntil || 0, [`players/${S.pid}/anchor`]: S.anchor });
    push(roomRef('events'), { type: 'jail', ice: 1, by: S.pid, target: tid, at: serverTimestamp() });
    toast(`🧊 ${tp.name} 얼음! ${MR.ICE_FREEZE_SEC}초 동안 제자리 대기`, true); flash('rgba(103,232,249,.9)'); vibrate(200); sfx('catch');
  } else {
    const r = await runTransaction(roomRef(`players/${tid}/jailed`), cur => (cur ? undefined : { at: t, by: S.pid }));
    if (!r.committed) return toast('이미 감옥에 있는 도둑이에요');
    S.anchor = { lat: S.fix.lat, lng: S.fix.lng }; S.waitOut = 0;
    await update(meRef(), { frozenUntil: t + MR.POLICE_FREEZE_SEC * 1000, prevFrozenUntil: me.frozenUntil || 0, anchor: S.anchor });
    push(roomRef('events'), { type: 'jail', by: S.pid, target: tid, at: serverTimestamp() });
    toast(`🚓 ${tp.name} 체포! ${MR.POLICE_FREEZE_SEC}초 동안 제자리 대기`, true); flash('rgba(59,163,255,.9)'); vibrate(200); sfx('catch');
  }
  if (counter) { S.selfDmg += Logic.AUGS.counter.dmg; S.lastWrite = 0; hurtBy('카운터', tid); setTimeout(() => toast(`💥 카운터에 맞았어요! 체력 -${Logic.AUGS.counter.dmg}`, true), 1500); }
  if (av('vampire')) {
    const hp = Logic.hpOf({ ...me, selfDmg: S.selfDmg, augs: S.augs }, (room.hits || {})[S.pid]);
    S.selfDmg -= Math.min(av('vampire'), RULES.HP_MAX - hp); S.lastWrite = 0;
  }
  S.stats.catches = (S.stats.catches || 0) + 1;
  setTimeout(() => { gainRandom('잡기 보상'); bountyPay(); }, 2500);
  renderGame();
}
// 경찰과 도둑: 갇힌 팀원의 탈옥용 QR을 찍으면 1명 탈옥 + 1분 무적
const handleRescue = safe(async text => {
  const qr = Logic.parseQR(text), room = S.room, t = now();
  const me = room.players[S.pid], tp = qr && qr.code === S.code ? room.players[qr.pid] : null;
  if (!tp) return toast('탈옥용 QR이 아니에요', true);
  if (qr.pid === S.pid || tp.role !== 'runner') return toast('같은 팀 팀원의 QR이 아니에요', true);
  if (tp.qr !== qr.token) return toast('지난 게임의 QR이에요', true);
  const ice = modeOf(room) === 'ice', selfIced = ice && !tp.jailed && tp.iceSelf && (tp.iceSelf.until || 0) > t;
  if (!tp.jailed && !selfIced) return toast(ice ? '얼음인 팀원이 아니에요' : '감옥에 갇힌 팀원이 아니에요', true);
  if (me.jailed || (ice && me.iceSelf && (me.iceSelf.until || 0) > t)) return toast(ice ? '나도 얼음이라 땡 못 해요' : '나도 갇혀 있어서 못 구해요', true);
  if (tp.lat == null || !S.fix) return toast('GPS 위치를 아직 못 받았어요', true);
  const d = Logic.dist(S.fix, tp), lim = Logic.nearLimit(S.fix, tp);
  if (d > lim) return toast(`${Math.round(d)}m 떨어져서 못 구해요 (${Math.round(lim)}m 안으로)`, true);
  if (selfIced) await update(roomRef(`players/${qr.pid}/iceSelf`), { until: 0 });
  else { const r = await runTransaction(roomRef(`players/${qr.pid}/jailed`), cur => (cur ? null : undefined)); if (!r.committed) return toast('이미 풀려났어요'); }
  const invSec = ice ? Logic.MODE_RULES.ICE_INV_SEC : Logic.MODE_RULES.RESCUE_INV_SEC;
  await update(roomRef('hits/' + qr.pid), { invUntil: t + invSec * 1000 });
  push(roomRef('events'), { type: 'rescue', ice: ice ? 1 : 0, by: S.pid, target: qr.pid, at: serverTimestamp() });
  toast(ice ? `🔥 ${tp.name} 땡! ${invSec}초 무적` : `🔓 ${tp.name} 탈옥 성공! 1분 무적`, true); flash('rgba(60,207,122,.9)'); vibrate([100, 50, 100]); sfx('escape');
  renderGame();
});
// 피의 서약: 탈락한 팀원의 부활용 QR을 찍으면 내 체력 절반을 나눠 주고 부활
const handleRevive = safe(async text => {
  const qr = Logic.parseQR(text), room = S.room, t = now(), hits = room.hits || {};
  const me = room.players[S.pid], tp = qr && qr.code === S.code ? room.players[qr.pid] : null;
  if (!tp) return toast('부활용 QR이 아니에요', true);
  if (qr.pid === S.pid || tp.role !== me.role) return toast('같은 팀 팀원의 QR이 아니에요', true);
  if (tp.qr !== qr.token) return toast('지난 게임의 QR이에요', true);
  if (Logic.alive(tp, hits[qr.pid])) return toast('아직 살아 있는 팀원이에요', true);
  if (!S.augs.bloodOath || !Logic.augReady(S.augs.bloodOath, t)) return;
  if (tp.lat == null || !S.fix) return toast('GPS 위치를 아직 못 받았어요', true);
  const d = Logic.dist(S.fix, tp), lim = Logic.nearLimit(S.fix, tp, Logic.AUGS.bloodOath.v); // GPS가 부정확하면 오차만큼 넉넉하게
  if (d > lim) return toast(`${Math.round(d)}m 떨어져서 못 살려요 (${Math.round(lim)}m 안으로)`, true);
  const give = Logic.hpOf({ ...me, selfDmg: S.selfDmg, augs: S.augs }, hits[S.pid]) / 2;
  S.selfDmg += give; S.lastWrite = 0;
  const h = hits[qr.pid] || {}, theirSelf = RULES.HP_MAX - give - (h.catches || 0) * RULES.CATCH_DMG - (h.ext || 0);
  await update(roomRef(), { [`players/${qr.pid}/selfDmg`]: Math.round(theirSelf * 10) / 10, [`players/${qr.pid}/forfeit`]: null,
    [`players/${qr.pid}/stats/diedAt`]: null, [`players/${qr.pid}/stats/deathWhy`]: null, [`players/${qr.pid}/stats/deathBy`]: null, [`players/${qr.pid}/revive`]: { at: t, by: S.pid, hp: give } });
  setCooldown('bloodOath');
  push(roomRef('events'), { type: 'revive', by: S.pid, target: qr.pid, at: serverTimestamp() });
  toast(`🩸 ${tp.name} 부활! (체력 ${Math.ceil(give)} 나눔)`, true); flash('rgba(220,38,38,.95)'); vibrate([200, 80, 200]); sfx('augS');
  renderGame();
});
// 역탐지: 내가 화살표·순간 포착으로 본 도망자가 역탐지를 갖고 있으면 알려줌
function detectedBy(rid, how) {
  const p = S.room.players[rid];
  const bt = p && p.augs && p.augs.backtrace;
  if (p && p.augs && (p.augs.counterIntel || (bt && (bt.until || 0) > now()))) push(roomRef('events'), { type: 'detected', by: S.pid, target: rid, how, at: serverTimestamp() });
}
// 흔들어 탈출: 잡힌 뒤 3초 안에 세게 3번 흔들면 50% 확률로 잡기 취소 + 10초 무적
// 잡기 판정(흔들기·가위바위보)이 끝난 뒤 실행: 판정 중(pendUntil)이면 기다림
function afterSettled(pid, cb) {
  let n = 0;
  const go = () => {
    const h = ((S.room && S.room.hits) || {})[pid] || {};
    if ((h.pendUntil || 0) > now() && ++n < 120) return setTimeout(go, 500);
    cb(h);
  };
  setTimeout(go, 2500);
}
// ---------- 가위바위보: 두 폰이 rps/{도망자}에 각자 고른 걸 쓰고, 먼저 본 폰이 판정 ----------
const RPS_EMO = { r: '✊', s: '✌️', p: '✋' }, RPS_NAME = { r: '바위', s: '가위', p: '보' };
function rpsLoop(room) {
  const all = (room && room.rps) || {}, t = now();
  const cands = Object.entries(all).filter(([tid, g]) => g && (tid === S.pid || g.chaser === S.pid) && t - g.catchAt < 60000);
  // 추격자가 1분 안에 두 번 하면 끝난 첫 판이 진행 중인 판을 가려서, 진행 중인 판 → 가장 최근 판 순서
  const entry = cands.find(([, g]) => !g.final) || cands.sort((a, b) => b[1].catchAt - a[1].catchAt)[0];
  const ov = $('#ov-rps');
  if (!entry) { if (ov.classList.contains('on')) ov.classList.remove('on'); return; }
  const [tid, g] = entry, R = Logic.AUGS.rps, iAmRunner = tid === S.pid, rd = g.round, picks = (g.picks || {})[rd] || {};
  const other = (room.players[iAmRunner ? g.chaser : tid] || {}).name || '?';
  // 판정: 둘 다 골랐거나 시간이 지나면 (먼저 본 폰 한 대만)
  if (!g.final && !((g.res || {})[rd]) && (picks[tid] && picks[g.chaser] || t > g.until + 300) && S.rpsJudging !== tid + rd) {
    S.rpsJudging = tid + rd;
    runTransaction(roomRef(`rps/${tid}`), cur => {
      if (!cur || cur.round !== rd || (cur.res || {})[rd] || cur.final) return;
      const p = (cur.picks || {})[rd] || {}, w = Logic.rpsWinner(p[tid], p[cur.chaser]);
      const nx = { ...cur, res: { ...(cur.res || {}), [rd]: w } };
      if (w === 'draw' && rd < R.rounds) { nx.round = rd + 1; nx.until = now() + 1500 + R.v * 1000; }
      else nx.final = w === 'draw' ? 'chaser' : w; // 3번 비기면 도망자 패
      return nx;
    }).catch(e => console.error(e)).finally(() => { S.rpsJudging = null; });
  }
  // 결과 적용은 도망자 폰이 한 번
  if (g.final && iAmRunner && S.rpsApplied !== g.catchAt) { S.rpsApplied = g.catchAt; rpsApply(tid, g); }
  if (g.final && !S.rpsDoneAt) S.rpsDoneAt = Date.now(); // 결과는 3초 보여 주고 닫음
  if (g.final && S.rpsDoneAt && Date.now() - S.rpsDoneAt > 3000) { ov.classList.remove('on'); return; }
  if (!g.final) S.rpsDoneAt = 0;
  if (!ov.classList.contains('on')) { if (g.final) return; ov.classList.add('on'); vibrate([100, 50, 100]); }
  // 화면
  const lastRd = g.final ? Math.max(...Object.keys(g.res || { 1: 1 }).map(Number)) : rd - 1;
  const lastP = ((g.picks || {})[lastRd]) || {}, lastRes = (g.res || {})[lastRd];
  const mineL = lastP[S.pid], theirsL = lastP[iAmRunner ? g.chaser : tid];
  const won = r => (r === 'draw' ? '비겼어요' : (r === 'runner') === iAmRunner ? '이겼어요!' : '졌어요');
  $('#rpsTitle').textContent = g.final ? (((g.final === 'runner') === iAmRunner) ? '✌️ 가위바위보 승리!' : '😵 가위바위보 패배') : `✊ 가위바위보 ${rd}판 · ${other}와(과)`;
  $('#rpsLast').textContent = lastRes ? `나 ${RPS_EMO[mineL] || '❌'} vs ${RPS_EMO[theirsL] || '❌'} ${other} · ${won(lastRes)}` : '';
  const mine = picks[S.pid], left = g.until - t;
  $('#rpsSub').textContent = g.final ? (g.final === 'runner' ? (iAmRunner ? `잡기 취소! ${other}는 ${R.freeze}초 정지` : `잡기가 취소되고 ${R.freeze}초 정지해요`) : (iAmRunner ? '그대로 잡혔어요' : '잡기 성공!'))
    : left > R.v * 1000 ? '준비…' : mine ? `${RPS_NAME[mine]}를 냈어요 · 상대를 기다리는 중` : `${Math.max(0, left / 1000).toFixed(1)}초 안에 고르세요 (못 고르면 져요)`;
  document.querySelectorAll('#rpsBtns [data-rps]').forEach(b => { b.disabled = !!g.final || !!mine || left <= 0 || left > R.v * 1000; b.classList.toggle('sel', b.dataset.rps === mine); });
}
$('#rpsBtns').onclick = e => {
  const b = e.target.closest('[data-rps]'), room = S.room; if (!b || !room) return;
  const entry = Object.entries(room.rps || {}).find(([tid, g]) => g && (tid === S.pid || g.chaser === S.pid) && !g.final);
  if (!entry) return;
  const [tid, g] = entry, t = now();
  if (t > g.until || ((g.picks || {})[g.round] || {})[S.pid]) return;
  update(roomRef(`rps/${tid}/picks/${g.round}`), { [S.pid]: b.dataset.rps }); vibrate(30);
};
// 도망자 폰: 이기면 잡기 취소 + 추격자 30초 정지, 지면 그대로 (흔들어 탈출이 준비돼 있으면 흔들기 기회)
const rpsApply = safe(async (tid, g) => {
  const R = Logic.AUGS.rps, t = now();
  if (g.final === 'runner') {
    const r = await runTransaction(roomRef('hits/' + tid), cur => {
      if (!cur || cur.at !== g.catchAt || cur.esc === g.catchAt) return;
      return { ...cur, catches: Math.max(0, (cur.catches || 0) - 1), invUntil: t + R.inv * 1000, esc: g.catchAt, pendUntil: 0 };
    });
    if (!r.committed) return;
    await update(roomRef('players/' + g.chaser), { frozenUntil: t + R.freeze * 1000 });
    push(roomRef('events'), { type: 'rpsWin', by: tid, chaser: g.chaser, at: serverTimestamp() });
    toast('✌️ 가위바위보 승리! 잡기 취소', true); flash('rgba(60,207,122,.9)'); sfx('escape'); vibrate([100, 50, 100, 50, 300]);
    bountyPay();
  } else {
    const sh = S.augs && S.augs.shake, shake = Logic.augReady(sh, t);
    const pend = shake ? t + (Logic.AUGS.shake.win + 1) * 1000 : 0;
    await runTransaction(roomRef('hits/' + tid), cur => (cur && cur.at === g.catchAt && cur.esc !== g.catchAt ? { ...cur, pendUntil: pend } : undefined));
    toast(shake ? '😵 가위바위보 패배… 지금 폰을 흔들어 탈출!' : '😵 가위바위보 패배… 잡혔어요', true); vibrate(400);
    if (shake) startShake({ catchAt: g.catchAt, by: g.chaser, pend });
  }
  renderGame();
});
function startShake(e) {
  const a = Logic.AUGS.shake;
  S.shake = { catchAt: e.catchAt, chaser: e.by, until: Math.min(now() + a.win * 1000, e.pend), n: 0, last: 0, done: false };
  $('#ov-shake').classList.add('on'); renderShake();
}
function renderShake() {
  const sk = S.shake, ov = $('#ov-shake');
  if (!sk || sk.done) return ov.classList.remove('on');
  const left = sk.until - now();
  if (left <= 0) { sk.done = true; ov.classList.remove('on'); return toast('흔들기 시간이 지났어요'); }
  const n = Logic.AUGS.shake.n;
  $('#shakeDots').textContent = '●'.repeat(Math.min(sk.n, n)) + '○'.repeat(Math.max(0, n - sk.n));
  $('#shakeLeft').textContent = (left / 1000).toFixed(1) + '초';
}
function onMotion(ev) {
  const sk = S.shake; if (!sk || sk.done || now() > sk.until) return;
  const a = ev.acceleration, g = ev.accelerationIncludingGravity;
  let strong = false;
  if (a && a.x != null) strong = Math.hypot(a.x, a.y || 0, a.z || 0) > 15;       // 중력 뺀 가속도 15m/s² 넘음
  else if (g && g.x != null) strong = Math.hypot(g.x, g.y || 0, g.z || 0) > 25;   // 중력 포함값만 있는 폰
  if (!strong || Date.now() - sk.last < 250) return;                              // 한 번 흔들 때 여러 번 세지 않게
  sk.last = Date.now(); sk.n++; vibrate(30); renderShake();
  if (sk.n >= Logic.AUGS.shake.n) tryEscape();
}
const tryEscape = safe(async () => {
  const sk = S.shake, a = Logic.AUGS.shake; if (!sk) return;
  sk.done = true; $('#ov-shake').classList.remove('on');
  setCooldown('shake');
  if (Math.random() >= a.v / 100) { toast('탈출 실패… 운이 없었어요', true); vibrate(400); renderGame(); return; }
  const t = now();
  const r = await runTransaction(roomRef('hits/' + S.pid), cur => {
    if (!cur || cur.at !== sk.catchAt || cur.esc === sk.catchAt || t > (cur.pendUntil || 0) + 2000) return;
    return { ...cur, catches: Math.max(0, (cur.catches || 0) - 1), invUntil: t + a.inv * 1000, esc: sk.catchAt, pendUntil: 0 };
  });
  if (!r.committed) return toast('탈출 판정 시간이 지났어요');
  const ch = S.room.players[sk.chaser]; // 잡은 추격자 정지 해제 (잡기 전 상태로)
  if (ch) await update(roomRef('players/' + sk.chaser), { frozenUntil: ch.prevFrozenUntil || 0 });
  push(roomRef('events'), { type: 'escape', by: S.pid, chaser: sk.chaser, at: serverTimestamp() });
  toast(`📳 탈출 성공! 잡기 취소 + ${a.inv}초 무적`, true); flash('rgba(60,207,122,.9)'); sfx('escape'); vibrate([100, 50, 100, 50, 300]);
  bountyPay();
  renderGame();
});
// 확성기: 20자 메시지를 모든 사람 화면에 크게
$('#btnMegaSend').onclick = () => {
  const text = $('#megaInput').value.trim().slice(0, 20);
  if (!text) return toast('메시지를 입력하세요');
  $('#ov-mega').classList.remove('on');
  push(roomRef('events'), { type: 'mega', by: S.pid, text, at: serverTimestamp() });
  setCooldown('megaphone');
  renderGame();
};
$('#btnMegaClose').onclick = () => $('#ov-mega').classList.remove('on');
$('#megaInput').addEventListener('keydown', e => { if (e.key === 'Enter') $('#btnMegaSend').click(); });
let megaT;
function showMega(name, role, text) {
  $('#megaFrom').innerHTML = `📢 <span class="${role}-t">${esc(name)}</span>`;
  $('#megaText').textContent = text;
  const m = $('#mega'); m.classList.remove('on'); void m.offsetWidth; m.classList.add('on');
  clearTimeout(megaT); megaT = setTimeout(() => m.classList.remove('on'), Logic.AUGS.megaphone.v * 1000);
  sfx('mega'); vibrate([100, 50, 100]);
}
// 통찰: 상대 팀에서 몇 명을 골라 그 사람의 증강을 봄. 실제로 볼 때 쿨타임 시작
function insightTargets() {
  const room = S.room, me = room.players[S.pid], hits = room.hits || {};
  return Object.entries(room.players).filter(([id, p]) => p.role && p.role !== me.role && Logic.alive(p, hits[id]));
}
function openInsight() {
  const n = av('insight'), list = insightTargets();
  if (!list.length) return toast('볼 수 있는 상대가 없어요');
  if (n >= list.length) return showInsight(list.map(([id]) => id));
  S.insSel = new Set();
  $('#insSub').textContent = `볼 상대를 ${n}명까지 고르세요`;
  $('#insList').innerHTML = list.map(([id, p]) => `<button class="augcard" data-t="${id}"><span><b>${esc(p.name)}</b><small>${roleName(p.role, S.room)}</small></span></button>`).join('');
  $('#btnInsGo').style.display = 'block'; $('#btnInsGo').disabled = true;
  $('#ov-insight').classList.add('on');
}
$('#insList').onclick = e => {
  const b = e.target.closest('[data-t]'); if (!b || !S.insSel) return;
  const id = b.dataset.t, n = av('insight');
  if (S.insSel.has(id)) S.insSel.delete(id); else if (S.insSel.size < n) S.insSel.add(id);
  $('#insList').querySelectorAll('[data-t]').forEach(x => x.classList.toggle('sel', S.insSel.has(x.dataset.t)));
  $('#btnInsGo').disabled = !S.insSel.size;
};
$('#btnInsGo').onclick = () => { if (S.insSel && S.insSel.size) showInsight([...S.insSel]); };
$('#btnInsClose').onclick = () => { $('#ov-insight').classList.remove('on'); S.insSel = null; };
