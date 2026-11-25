// ---------- 땅따먹기 (화면·진행) ----------
// 팀 = 역할 자리에 'tR'(빨강) / 'tB'(파랑). 칸 기록은 room.terr.cells, 칠한 기록은 room.terrLog
const terrOn = room => modeOf(room) === 'terr' && !!(room && room.terr);
const TEAMC = { tR: '#ff5a5f', tB: '#3ba3ff' };
const terrTeamName = tm => (tm === 'tR' ? '빨강팀' : '파랑팀');
const terrGridOf = room => Logic.terrGrid(room.settings.area);
const terrGoldOf = (room, t) => Logic.terrGold(terrGridOf(room), room.terr, S.code, t, room.startAt, room.timeShift);
const terrOut = (p, t) => !!p && (((p.terrStun || 0) > t) || !!p.terrHome); // 잡혀서 쉬는 중: 못 칠하고, 못 잡고, 못 잡힘
const TERR_AUGS = ['paintBomb', 'roller', 'cellShield', 'eraser', 'scoutDrone', 'remotePaint'];
// 매초: 칸 찾기, 칠하기 진행, 잡힌 뒤 우리 칸으로 돌아가기
function terrTick(room, me, t, gpsOk, warn) {
  const T = Logic.TERR, g = terrGridOf(room), team = me.role, hits = room.hits || {}, ph = Logic.phaseAt(t, room.startAt, room.timeShift);
  for (let i = warn.length - 1; i >= 0; i--) if (/체력/.test(warn[i])) warn.splice(i, 1); // 땅따먹기는 체력을 안 씀
  const cell = S.fix ? Logic.terrCellOf(g, S.fix, S.terrCell) : null; S.terrCell = cell;
  if (S.fix && !cell) warn.push('🚧 구역 밖이라 칠할 수 없어요');
  if (ph.phase !== 'chase') { S.terrProg = null; return; }
  tipOnce('terrPaint', `칸에 ${T.BLANK_SEC}초 머물면 우리 팀 색이 돼요. 상대 칸은 ${T.STEAL_SEC}초!`);
  tipOnce('terrTag', `우리 땅에 들어온 상대는 지도에 보여요. 가까이 가서 🫵 잡기를 ${T.TAG_SEC}초 꾹`);
  if ((me.terrStun || 0) > t) { warn.push(`😵 잡혔어요 · ${fmt(me.terrStun - t)} 뒤 우리 칸으로 돌아가세요`); S.terrProg = null; return; }
  if (me.terrHome) {
    const own = cell && room.terr.cells[cell] && room.terr.cells[cell].t === team;
    if (own && gpsOk) {
      if (!S.terrHomeSince) S.terrHomeSince = t;
      const left = T.HOME_SEC * 1000 - (t - S.terrHomeSince);
      warn.push(`🏠 우리 칸이에요 · ${Math.max(0, Math.ceil(left / 1000))}초만 더`);
      if (left <= 0) { S.terrHomeSince = 0; update(meRef(), { terrHome: null, terrInv: Math.round(t + T.INV_SEC * 1000) }); toast(`다시 칠할 수 있어요! ${T.INV_SEC}초 동안 무적`, true); vibrate([100, 50, 100]); }
    } else { S.terrHomeSince = 0; warn.push(`🏠 우리 색 칸에 ${T.HOME_SEC}초 있어야 다시 칠할 수 있어요`); }
    S.terrProg = null; return;
  }
  // 칠하기
  const c = cell && room.terr.cells[cell], owner = c ? c.t : null;
  const need = cell ? Logic.terrNeed(room.terr, cell, team, t, room.startAt, room.timeShift, S.rollerUntil || 0) : null;
  const foeHere = cell && Object.entries(room.players).some(([id, p]) => id !== S.pid && p.role === Logic.terrOther(team) && p.lat != null && Logic.alive(p, hits[id]) && !terrOut(p, t) && Logic.terrCellOf(g, p) === cell);
  let why = '';
  if (!cell) why = S.fix ? '구역 밖' : 'GPS 신호를 기다리는 중';
  else if (!gpsOk || (S.fix.acc || 999) > T.ACC_M) why = '📡 GPS가 약해서 칠하기 멈춤';
  else if (S.speed * 3.6 > RULES.VEHICLE_KMH) why = '🚗 탈것 속도라 칠하기 무효';
  else if (S.st <= 0) why = `😮‍💨 스태미나 0 · ${RULES.STILL_SEC}초 멈추면 회복돼요`;
  else if (foeHere) why = '⚔️ 상대도 이 칸에 있어서 못 칠해요';
  if (!S.terrProg || S.terrProg.cell !== cell || S.terrProg.owner !== owner || need == null) S.terrProg = cell && need != null ? { cell, owner, acc: 0, last: t } : null;
  const P = S.terrProg;
  if (P) {
    P.need = need * 1000; const dt = Math.min(2000, Math.max(0, t - P.last)); P.last = t;
    if (!why) P.acc += dt;
    if (P.acc >= P.need) terrPaint(cell, owner, team);
  }
  S.terrWhy = why;
}
// 칸 하나 칠하기: 그새 주인이 바뀌었으면 취소
function terrPaint(k, from, team) {
  if (S.terrBusy[k]) return; S.terrBusy[k] = 1;
  const t0 = Math.round(now());
  runTransaction(roomRef('terr/cells/' + k), cur => { if (((cur && cur.t) || null) !== (from || null)) return; return { t: team, at: t0, by: S.pid }; })
    .then(r => {
      delete S.terrBusy[k]; if (S.terrProg && S.terrProg.cell === k) S.terrProg = null;
      if (!r.committed) return;
      push(roomRef('terrLog'), { k, t: team, f: from || null, by: S.pid, at: serverTimestamp() });
      if (from) { sfx('steal'); vibrate([60, 40, 60]); } else { sfx('tick'); vibrate(40); }
      drawMaps(); renderGame();
    }).catch(e => { delete S.terrBusy[k]; console.error(e); });
}
// 잡을 수 있는 상대: 우리 땅 위에 있고, 쉬는 중·무적이 아니고, GPS상 가까움
function terrCands(room, me, t) {
  const g = terrGridOf(room), hits = room.hits || {}, out = [];
  if (!S.fix || terrOut(me, t)) return out;
  for (const [id, p] of Object.entries(room.players)) {
    if (id === S.pid || p.role !== Logic.terrOther(me.role) || p.lat == null || !Logic.alive(p, hits[id]) || terrOut(p, t) || (p.terrInv || 0) > t) continue;
    const k = Logic.terrCellOf(g, p); if (!k || !(room.terr.cells[k] && room.terr.cells[k].t === me.role)) continue;
    const d = Logic.dist(S.fix, p); if (d <= Logic.nearLimit(S.fix, p, Logic.TERR.NEAR_M)) out.push({ id, p, d });
  }
  return out.sort((a, b) => a.d - b.d);
}
function terrRender(room, me, t, alive, ph) {
  const bar = $('#terrBar'), tb = $('#btnTag');
  if (!terrOn(room) || room.status !== 'playing') { bar.classList.remove('on'); tb.style.display = 'none'; if (S.tag) terrTagEnd('cancel'); return; }
  bar.classList.add('on');
  const us = me.role, them = Logic.terrOther(us), sc = Logic.terrScore(room.terr, terrGoldOf(room, t)), tot = Math.max(1, sc.tR + sc.tB);
  $('#tbUs').textContent = sc[us]; $('#tbThem').textContent = sc[them];
  $('#tbUsN').textContent = `우리 ${terrTeamName(us)}`; $('#tbThemN').textContent = terrTeamName(them);
  $('#tbUs').style.color = TEAMC[us]; $('#tbThem').style.color = TEAMC[them];
  $('#tbFill').style.width = (sc[us] / tot * 100).toFixed(1) + '%'; $('#tbFill').style.background = TEAMC[us]; $('#tbTrack').style.background = TEAMC[them];
  const c = S.terrCell && room.terr.cells[S.terrCell], gold = S.terrCell && terrGoldOf(room, t).includes(S.terrCell), P = S.terrProg;
  $('#tbProg').textContent = ph.phase !== 'chase' ? '' : terrOut(me, t) ? '' : P ? `🎨 칠하는 중 ${(Math.min(P.acc, P.need) / 1000).toFixed(0)}/${P.need / 1000}초${gold ? ' · ✨ 황금 칸 5점' : ''}${S.terrWhy ? ' · ' + S.terrWhy : ''}`
    : c && c.t === us ? `우리 칸${gold ? ' · ✨ 황금 칸' : ''}` : S.terrWhy || (S.terrCell ? '이 칸은 지금 못 칠해요' : '');
  $('#tbProgFill').style.width = P ? (Math.min(1, P.acc / P.need) * 100).toFixed(0) + '%' : '0%';
  const show = alive && ph.phase === 'chase';
  tb.style.display = show ? 'block' : 'none';
  if (!show || S.tag) return;
  const cand = terrCands(room, me, t)[0];
  tb.disabled = !cand; tb.style.setProperty('--p', '0%');
  tb.innerHTML = terrOut(me, t) ? '😵 쉬는 중' : cand ? `🫵 ${esc(cand.p.name)} 잡기 · ${Logic.TERR.TAG_SEC}초 꾹` : '🫵 잡기 · 우리 땅에 들어온 상대만';
}
function terrTagStart() {
  const room = S.room, me = room && room.players[S.pid], t = now();
  if (S.tag || !terrOn(room) || !me) return;
  const c = terrCands(room, me, t)[0]; if (!c) return;
  const p0 = performance.now();
  S.tag = { tg: c.id, need: Logic.TERR.TAG_SEC * 1000, start: p0, last: p0, bad: 0 };
  set(roomRef('stabs/' + S.pid), { tg: c.id, at: Math.round(t), need: S.tag.need, kind: 'tag' }).catch(e => console.error(e));
  requestAnimationFrame(terrTagLoop);
}
function terrTagLoop() {
  const s = S.tag; if (!s) return;
  const room = S.room; if (!room || !terrOn(room) || room.status !== 'playing') return terrTagEnd('cancel');
  const me = room.players[S.pid], pn = performance.now(), el = pn - s.start, dtm = pn - s.last; s.last = pn;
  const ok = !!(me && terrCands(room, me, now()).some(x => x.id === s.tg));
  s.bad = ok ? 0 : s.bad + dtm;
  if (s.bad > 500) return terrTagEnd('lost');
  const b = $('#btnTag'); b.style.setProperty('--p', Math.min(100, el / s.need * 100).toFixed(1) + '%'); b.innerHTML = `🫵 잡는 중… ${Math.max(0, (s.need - el) / 1000).toFixed(1)}초`;
  if (el >= s.need) return terrTagDone();
  requestAnimationFrame(terrTagLoop);
}
function terrTagEnd(why) {
  const s = S.tag; if (!s) return; S.tag = null;
  remove(roomRef('stabs/' + S.pid)).catch(() => {}); $('#btnTag').style.setProperty('--p', '0%');
  if (why === 'lost') { toast('놓쳤어요! 상대가 우리 땅을 벗어났거나 멀어졌어요', true); vibrate(120); }
  renderGame();
}
function terrTagDone() {
  const s = S.tag; if (!s) return; S.tag = null;
  const room = S.room, me = room.players[S.pid], t = Math.round(now()), T = Logic.TERR;
  update(roomRef(), { [`players/${s.tg}/terrStun`]: t + T.STUN_SEC * 1000, [`players/${s.tg}/terrHome`]: 1, [`stabs/${S.pid}`]: null });
  push(roomRef('events'), { type: 'terrTag', by: S.pid, target: s.tg, at: serverTimestamp() });
  S.stats.catches = (S.stats.catches || 0) + 1;
  toast(`🫵 ${(room.players[s.tg] || {}).name || '?'} 잡았다! ${T.STUN_SEC}초 기절`, true); flash(TEAMC[me.role]); vibrate([100, 50, 300]); sfx('catch');
  const k = S.terrCell, c = k && room.terr.cells[k]; // 잡은 사람이 서 있는 칸은 바로 우리 색
  if (k && Logic.terrNeed(room.terr, k, me.role, t, room.startAt, room.timeShift) != null) terrPaint(k, c ? c.t : null, me.role);
  $('#btnTag').style.setProperty('--p', '0%'); renderGame();
}
// 0.2초마다: 잡히는 중 경고, 황금 칸·막판·역전 알림
function terrOverlay(inGame, room, me, t) {
  const w = $('#asnWarn');
  if (!(inGame && terrOn(room))) { if (S.tag && !inGame) terrTagEnd('cancel'); return; }
  const st = Object.values(room.stabs || {}).filter(s => s && s.kind === 'tag' && s.tg === S.pid && t - (s.at || 0) < (s.need || 2000) + 1500);
  if (st.length) {
    if (!w.classList.contains('on')) { w.classList.add('on'); sfx('warn'); }
    w.textContent = '⚠️ 잡히는 중! 우리 땅으로 도망치세요';
    if (Date.now() - (S.stabBuzz || 0) > 700) { S.stabBuzz = Date.now(); vibrate([200, 60, 200]); }
    if (Date.now() - (S.hdSent || 0) > 400 && S.fix) { S.hdSent = Date.now(); update(meRef(), { lat: S.fix.lat, lng: S.fix.lng, acc: Math.round(S.fix.acc) }); }
  } else w.classList.remove('on');
  const ph = Logic.phaseAt(t, room.startAt, room.timeShift); if (ph.phase !== 'chase') return;
  const gold = terrGoldOf(room, t);
  if (S.terrSeen.gold == null) S.terrSeen.gold = gold.length;
  else if (gold.length > S.terrSeen.gold) { S.terrSeen.gold = gold.length; toast(`✨ 황금 칸 ${Logic.TERR.GOLD_N}개 등장! 칠하면 칸 ${Logic.TERR.GOLD_VAL}개 값`, true); sfx('wanted'); vibrate([100, 60, 100]); drawMaps(); }
  const left = ph.remainMs;
  if (left <= Logic.TERR.LAST_MIN * 60000 && !S.terrSeen.last) { S.terrSeen.last = 1; toast(`⏱ 마지막 ${Logic.TERR.LAST_MIN}분! 모든 칸을 ${Logic.TERR.LAST_SEC}초 만에 칠해요`, true); sfx('minute'); vibrate([300, 100, 300]); }
  const sc = Logic.terrScore(room.terr, gold), lead = sc.tR === sc.tB ? null : sc.tR > sc.tB ? 'tR' : 'tB';
  if (lead && S.terrSeen.lead && lead !== S.terrSeen.lead) toast(lead === me.role ? '🔥 역전! 우리 팀이 앞서요' : '😱 역전당했어요!', true);
  if (lead) S.terrSeen.lead = lead;
}
// 지도: 칸 색칠, 우리 팀, 우리 땅에 들어온 상대(드론이면 전원)
function drawTerr(mo) {
  const room = S.room, cells = [], ppl = [];
  if (terrOn(room) && room.status === 'playing') {
    const g = terrGridOf(room), t = now(), gold = new Set(terrGoldOf(room, t)), base = Object.values(room.terr.base || {}), me = room.players[S.pid] || {}, us = me.role;
    for (const k of g.keys) {
      const c = room.terr.cells[k], col = c ? TEAMC[c.t] : null, isG = gold.has(k), isB = base.includes(k), here = k === S.terrCell, sh = !!(c && (c.sh || 0) > t);
      const st = { color: isG ? '#ffd54a' : here ? '#ffffff' : col || 'rgba(255,255,255,.3)', weight: isG || here || isB ? 3 : 1, opacity: 1, fillColor: col || '#000000', fillOpacity: col ? (isB ? 0.6 : 0.35) : 0, dashArray: sh ? '5 5' : null, interactive: false };
      cells.push({ key: k, make: () => L.polygon(Logic.terrCorners(g, k).map(p => [p.lat, p.lng]), st), update: m => m.setStyle(st) });
    }
    const drone = (S.droneUntil || 0) > t;
    for (const [id, p] of Object.entries(room.players)) {
      if (id === S.pid || !p.role || p.lat == null || p.forfeit) continue;
      const mate = p.role === us, q = mate ? p : Logic.shownPos(p, t, room.players), qk = mate ? null : Logic.terrCellOf(g, q);
      if (!mate && !drone && !(qk && room.terr.cells[qk] && room.terr.cells[qk].t === us)) continue;
      const bo = { name: p.name, col: TEAMC[p.role], pre: terrOut(p, t) ? '😵' : '', sub: mate ? null : '침입' };
      ppl.push({ key: id, make: () => badge([q.lat, q.lng], bo), update: m => badgeSet(m, [q.lat, q.lng], bo) });
    }
  }
  syncLayer(mo, 'terrCells', cells); syncLayer(mo, 'terrPpl', ppl);
}
// 능력 6개
function terrAug(id, room, me, t) {
  if (!terrOn(room)) return toast('땅따먹기에서만 쓸 수 있어요');
  const g = terrGridOf(room), us = me.role, k = S.terrCell;
  if (terrOut(me, t)) return toast('😵 쉬는 중이라 못 써요');
  if (id === 'roller') { S.rollerUntil = t + av('roller') * 1000; setCooldown(id); toast(`🧻 롤러! ${av('roller')}초 동안 1초 만에 칠해요`, true); sfx('skill'); vibrate(80); return renderGame(); }
  if (id === 'scoutDrone') { S.droneUntil = t + av('scoutDrone') * 1000; setCooldown(id); toast(`🛸 정찰 드론! ${av('scoutDrone')}초 동안 상대가 다 보여요`, true); sfx('skill'); vibrate(80); drawMaps(); return renderGame(); }
  if (id === 'remotePaint') { S.terrPick = true; return toast('🎯 칠할 칸을 지도에서 탭하세요', true); }
  if (!k) return toast('구역 안 칸에 서 있어야 써요');
  const keys = [k, ...Logic.terrNb(k)].filter(x => g.set.has(x)), cells = room.terr.cells, base = Object.values(room.terr.base || {}), u = {}, logs = [];
  if (id === 'paintBomb') for (const x of keys) { if (Logic.terrNeed(room.terr, x, us, t, room.startAt, room.timeShift) == null) continue; u[`terr/cells/${x}`] = { t: us, at: Math.round(t), by: S.pid }; logs.push({ k: x, t: us, f: cells[x] ? cells[x].t : null }); }
  if (id === 'eraser') for (const x of keys) { const c = cells[x]; if (!c || c.t === us || base.includes(x) || (c.sh || 0) > t) continue; u[`terr/cells/${x}`] = null; logs.push({ k: x, t: null, f: c.t }); }
  if (id === 'cellShield') for (const x of keys) { const c = cells[x]; if (!c || c.t !== us || base.includes(x)) continue; u[`terr/cells/${x}/sh`] = Math.round(t + av('cellShield') * 1000); }
  if (!Object.keys(u).length) return toast(id === 'cellShield' ? '근처에 지킬 우리 칸이 없어요' : '근처에 바꿀 칸이 없어요');
  update(roomRef(), u);
  for (const e of logs) push(roomRef('terrLog'), { ...e, by: S.pid, at: serverTimestamp() });
  setCooldown(id);
  toast({ paintBomb: `💥 페인트 폭탄! ${logs.length}칸 칠함`, eraser: `🧽 지우개! 상대 칸 ${logs.length}개 지움`, cellShield: `🛡 방어막! 우리 칸 ${Object.keys(u).length}개를 ${av('cellShield') / 60}분 동안 지켜요` }[id], true);
  sfx(id === 'cellShield' ? 'shield' : 'skill'); vibrate(80); drawMaps(); renderGame();
}
function terrPickClick(ll) {
  S.terrPick = false;
  const room = S.room, me = room && room.players[S.pid], t = now(), x = S.augs && S.augs.remotePaint;
  if (!terrOn(room) || !me || !x || !Logic.augReady(x, t)) return;
  const k = Logic.terrCellOf(terrGridOf(room), { lat: ll.lat, lng: ll.lng });
  if (!k) return toast('구역 안 칸을 탭하세요');
  if (Logic.terrNeed(room.terr, k, me.role, t, room.startAt, room.timeShift) == null) return toast('그 칸은 지금 칠할 수 없어요');
  const c = room.terr.cells[k]; terrPaint(k, c ? c.t : null, me.role); setCooldown('remotePaint'); toast('🎯 원격 페인트!', true); sfx('skill');
}
function terrReveal(role) {
  const reel = $('#reel'), cls = role === 'tR' ? 'chaser-t' : 'runner-t';
  reel.style.transition = 'none'; reel.style.transform = 'translateY(0)'; reel.innerHTML = `<div class="${cls}">${terrTeamName(role)}</div>`;
  $('#roleMsg').textContent = `당신은 ${terrTeamName(role)}!`; $('#roleMsg').className = 'big ' + cls;
  $('#roleSub').textContent = `🎨 칸에 ${Logic.TERR.BLANK_SEC}초 머물면 우리 색 · 상대 칸은 ${Logic.TERR.STEAL_SEC}초 · ${fmtDur(RULES.GAME_SEC)} 뒤 칸이 많은 팀 승리`;
  $('#btnRoleOk').style.visibility = 'visible'; $('#ov-role').classList.add('on');
  flash(TEAMC[role]); vibrate([200, 80, 200]);
}
function terrEvent(e, me0, who) {
  if (e.type !== 'terrTag') return;
  if (e.target === S.pid) { toast(`😵 ${who(e.by)}에게 잡혔어요! ${Logic.TERR.STUN_SEC}초 뒤 우리 칸으로 돌아가세요`, true); flash('rgba(156,163,175,.9)'); vibrate([400, 100, 400]); sfx('caught'); }
  else if (e.by !== S.pid) deathBan(`🫵 ${who(e.by)} → ${who(e.target)} 잡음`);
}
// 결과: 타임랩스 + 상 3개 + 팀별 목록
function terrResult(room, r) {
  const P = room.players, me = P[S.pid] || {}, log = Object.values(room.terrLog || {}).filter(Boolean), st = {};
  for (const e of log) { if (!e.by) continue; const s = st[e.by] = st[e.by] || { paint: 0, steal: 0 }; if (e.t) { s.paint++; if (e.f && e.f !== e.t) s.steal++; } }
  const val = (id, f) => (f === 'tag' ? ((P[id].stats || {}).catches || 0) : ((st[id] || {})[f] || 0));
  const ids = Object.keys(P).filter(id => P[id].role);
  const top = f => ids.slice().sort((a, b) => val(b, f) - val(a, f))[0];
  $('#r-title').textContent = r.winner === 'draw' ? '무승부!' : `${terrTeamName(r.winner)} 승리!`;
  $('#r-sub').textContent = [r.reason, r.winner === 'draw' ? '' : me.role === r.winner ? '이겼어요 🎉' : me.role ? '졌어요' : ''].filter(Boolean).join(' · ');
  const awards = [['paint', '🎨 가장 많이 칠한 사람', '칸'], ['steal', '🏴 가장 많이 빼앗은 사람', '칸'], ['tag', '🫵 가장 많이 잡은 사람', '명']]
    .map(([f, label, unit]) => { const id = top(f); return id && val(id, f) ? `<div class="mvp">${label} · ${esc(P[id].name)} <span class="dim small">${val(id, f)}${unit}</span></div>` : ''; }).join('');
  $('#r-mvp').innerHTML = `<canvas id="terrLapse" class="terrLapse"></canvas><div class="dim small" style="text-align:center">판 전체가 칠해진 과정 · 눌러서 다시 보기</div>${awards}`;
  $('#r-list').innerHTML = ['tR', 'tB'].map(tm => ids.filter(id => P[id].role === tm).sort((a, b) => val(b, 'paint') - val(a, 'paint')).map(id => {
    const p = P[id], km = (((p.stats || {}).dist || 0) / 1000).toFixed(2);
    return `<li class="col"><div class="top"><span><span class="badge ${tm === 'tR' ? 'chaser' : 'runner'}">${terrTeamName(tm)}</span> ${p.forfeit ? '🏳️ ' : ''}${esc(p.name)}${id === S.pid ? ' (나)' : ''}</span></div><span class="stat">칠함 ${val(id, 'paint')} · 빼앗음 ${val(id, 'steal')} · 잡음 ${val(id, 'tag')} · 🏃 ${km}km</span></li>`;
  }).join('')).join('');
  requestAnimationFrame(() => terrLapse(room));
}
function terrLapse(room) {
  const cv = $('#terrLapse'); if (!cv || !room.terr || !room.settings || !room.settings.area) return;
  const g = terrGridOf(room), dpr = Math.min(2, window.devicePixelRatio || 1), W = cv.clientWidth || 320, H = Math.round(W * 0.75);
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.height = H + 'px';
  const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const pts = g.keys.map(k => { const [q, r] = Logic.terrQR(k), [x, y] = Logic.hexCenter(q, r, g.sd); return [k, x, y]; });
  const minX = Math.min(...pts.map(p => p[1])) - g.sd, maxX = Math.max(...pts.map(p => p[1])) + g.sd, minY = Math.min(...pts.map(p => p[2])) - g.sd, maxY = Math.max(...pts.map(p => p[2])) + g.sd;
  const sc = Math.min((W - 16) / (maxX - minX), (H - 40) / (maxY - minY)), ox = (W - (maxX - minX) * sc) / 2, oy = 32 + (H - 40 - (maxY - minY) * sc) / 2;
  const log = Object.values(room.terrLog || {}).filter(e => e && e.at).sort((a, b) => a.at - b.at);
  const base = room.terr.base || {}, t0 = room.startAt + RULES.HIDE_SEC * 1000, t1 = Math.max(t0 + 1, log.length ? log.at(-1).at : t0 + 1), DUR = 10000;
  const draw = el => {
    const own = { [base.tR]: 'tR', [base.tB]: 'tB' }, upTo = t0 + (t1 - t0) * Math.min(1, el / DUR);
    for (const e of log) { if (e.at > upTo) break; own[e.k] = e.t || null; }
    ctx.clearRect(0, 0, W, H);
    for (const [k, x, y] of pts) {
      const cx = ox + (x - minX) * sc, cy = oy + (maxY - y) * sc, rr = g.sd * sc * 0.94;
      ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = (60 * i - 30) * Math.PI / 180; const px = cx + rr * Math.cos(a), py = cy - rr * Math.sin(a); if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.closePath();
      ctx.fillStyle = own[k] ? TEAMC[own[k]] : 'rgba(255,255,255,.07)'; ctx.fill();
    }
    const n = { tR: 0, tB: 0 }; for (const v of Object.values(own)) if (v) n[v]++;
    ctx.font = '800 18px sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = TEAMC.tR; ctx.fillText(String(n.tR), 8, 22); ctx.textAlign = 'right'; ctx.fillStyle = TEAMC.tB; ctx.fillText(String(n.tB), W - 8, 22);
  };
  let start = null;
  const loop = ts => { if (!cv.isConnected) return; if (start == null) start = ts; const el = ts - start; draw(el); if (el < DUR + 200) requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  cv.onclick = () => { start = null; requestAnimationFrame(loop); };
}
{
  const el = $('#btnTag');
  el.addEventListener('pointerdown', e => { e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch (x) {} terrTagStart(); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(n => el.addEventListener(n, () => { if (S.tag) terrTagEnd('release'); }));
  el.addEventListener('contextmenu', e => e.preventDefault());
}
