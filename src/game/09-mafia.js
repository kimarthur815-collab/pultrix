// ===== 마피아 모드 =====
// 탈락 기록 (먼저 기록한 한 번만) + 알림
async function mfOut(id, why, by) {
  const r = await runTransaction(roomRef(`players/${id}/out`), cur => (cur ? undefined : { why, by: by || null, at: now() }));
  if (r.committed && why !== 'vote') push(roomRef('events'), { type: 'mfOut', target: id, why, by: by || null, at: serverTimestamp() });
  return r.committed;
}
// 매초: 탈락한 경찰은 저격총을 떨어뜨림, 시민은 10m 안이면 주움, 끝난 투표 집계
function mafiaTick(room, me, t, meAlive) {
  if (!meAlive && me.job === 'police' && !S.rifleDropped) {
    S.rifleDropped = true;
    const pos = me.lat != null ? { lat: me.lat, lng: me.lng } : S.fix ? { lat: S.fix.lat, lng: S.fix.lng } : null;
    if (pos) { update(roomRef(), { rifle: { ...pos, at: t }, [`players/${S.pid}/job`]: 'exPolice' }); push(roomRef('events'), { type: 'rifleDrop', at: serverTimestamp() }); }
  }
  const rf = room.rifle;
  if (rf && meAlive && me.role === 'runner' && !me.job && S.fix && !S.rifleBusy && Logic.dist(S.fix, rf) <= Logic.MODE_RULES.MF_PICK_M) {
    S.rifleBusy = true;
    runTransaction(roomRef('rifle'), cur => (cur ? null : undefined)).then(r => {
      if (!r.committed) return;
      S.augs = { ...S.augs, mfCheck: { got: 1 }, mfRifle: { got: 1 } };
      update(meRef(), { job: 'police', 'augs/mfCheck': { got: 1 }, 'augs/mfRifle': { got: 1 } });
      push(roomRef('events'), { type: 'riflePick', by: S.pid, at: serverTimestamp() });
      toast('🔫 저격총을 주웠어요! 이제 경찰이에요', true); flash('rgba(59,163,255,.9)'); vibrate([100, 50, 100]); sfx('augS'); renderGame();
    }).catch(e => console.error(e)).finally(() => { S.rifleBusy = false; });
  }
  const vr = Logic.voteRound(t, room.startAt, room.timeShift), k = vr.lastEnded;
  if (k && !(((room.votes || {})[k] || {}).result) && S.voteResolving !== k) resolveVote(k);
}
// 투표 집계: 처음 집계한 폰 한 대만 결과를 남김
async function resolveVote(k) {
  S.voteResolving = k;
  const room = S.room, hits = room.hits || {}, vs = (((room.votes || {})[k] || {}).v) || {};
  const aliveIds = Object.entries(room.players).filter(([id, p]) => p.role && Logic.alive(p, hits[id])).map(([id]) => id);
  const res = Logic.voteResult(vs, aliveIds);
  const r = await runTransaction(roomRef(`votes/${k}/result`), cur => (cur ? undefined : { out: res.out || 'none', top: res.top, n: res.n, tie: res.tie, at: now() }));
  if (!r.committed) return;
  if (res.out) await mfOut(res.out, 'vote', null);
  push(roomRef('events'), { type: 'vote', k, target: res.out || null, top: res.top, n: res.n, tie: res.tie, at: serverTimestamp() });
}
function renderVote() {
  const room = S.room; if (!room || !room.startAt) return;
  const t = now(), vr = Logic.voteRound(t, room.startAt, room.timeShift), hits = room.hits || {};
  const mine = ((((room.votes || {})[vr.k] || {}).v) || {})[S.pid];
  $('#voteSub').textContent = vr.open ? `${fmt(vr.endsAt - t)} 남음 · 최다 득표 1명 추방 (동점이면 없음) · 끝나기 전엔 바꿀 수 있어요` : '투표가 끝났어요';
  const list = Object.entries(room.players).filter(([id, p]) => id !== S.pid && p.role && Logic.alive(p, hits[id]));
  const html = list.map(([id, p]) => `<button data-vote="${id}" class="${mine === id ? 'sel' : ''}">${esc(p.name)}</button>`).join('') + `<button data-vote="skip" class="${mine === 'skip' ? 'sel' : ''}">기권</button>`;
  if ($('#voteList').innerHTML !== html) $('#voteList').innerHTML = html;
}
$('#voteList').onclick = e => {
  const b = e.target.closest('[data-vote]'), room = S.room; if (!b || !room) return;
  const t = now(), vr = Logic.voteRound(t, room.startAt, room.timeShift), me = room.players[S.pid];
  if (!vr.open || !Logic.alive({ ...me, selfDmg: S.selfDmg, augs: S.augs }, (room.hits || {})[S.pid])) return;
  update(roomRef(`votes/${vr.k}/v`), { [S.pid]: b.dataset.vote }).catch(er => console.error(er));
  toast(b.dataset.vote === 'skip' ? '기권했어요' : `${room.players[b.dataset.vote].name}에게 투표했어요`); vibrate(30);
};
$('#btnVote').onclick = () => { renderVote(); $('#ov-vote').classList.add('on'); };
$('#btnVoteClose').onclick = () => $('#ov-vote').classList.remove('on');
// 경찰 저격총: 마피아면 그 마피아만, 아니면 맞은 사람과 나 둘 다 탈락
async function fireRifle(room, t, heading) {
  if (!S.augs.mfRifle || !Logic.augReady(S.augs.mfRifle, t)) return;
  const a = Logic.AUGS.mfRifle;
  setCooldown('mfRifle'); sfx('shot'); vibrate([60, 30, 200]); flash('rgba(255,255,255,.85)');
  const tg = Logic.aimTarget(S.fix, heading, room.players, room.hits, t, S.pid, a.v, a.aim);
  if (!tg) { push(roomRef('events'), { type: 'gunshot', by: S.pid, at: serverTimestamp() }); toast('빗나갔어요…', true); return renderGame(); }
  const tp = room.players[tg.id];
  await mfOut(tg.id, 'shot', S.pid);
  if (tp.role === 'chaser') toast(`🎯 명중! ${tp.name}은(는) 마피아였어요`, true);
  else { await mfOut(S.pid, 'misfire', S.pid); toast(`😱 ${tp.name}은(는) 시민이었어요… 둘 다 탈락`, true); }
  renderGame();
}
// 의사 보호: 5분 동안 마피아에게 잡혀도 1번 막음
async function doGuard(tid) {
  const t = now(), room = S.room; if (!S.augs.mfGuard || !Logic.augReady(S.augs.mfGuard, t)) return;
  await update(roomRef(`players/${tid}`), { guard: { by: S.pid, until: t + Logic.MODE_RULES.MF_GUARD_SEC * 1000 } });
  setCooldown('mfGuard'); toast(`🩺 ${tid === S.pid ? '나를' : `${room.players[tid].name}을(를)`} ${Logic.MODE_RULES.MF_GUARD_SEC / 60}분 동안 보호해요`, true); sfx('shield'); renderGame();
}
const handleGuard = safe(async text => {
  const qr = Logic.parseQR(text), room = S.room, tp = qr && qr.code === S.code ? room.players[qr.pid] : null;
  if (!tp || tp.qr !== qr.token) return toast('이 방의 QR이 아니에요', true);
  if (!Logic.alive(tp, (room.hits || {})[qr.pid])) return toast('이미 탈락한 사람이에요', true);
  if (tp.lat == null || !S.fix) return toast('GPS 위치를 아직 못 받았어요', true);
  const d = Logic.dist(S.fix, tp), lim = Logic.nearLimit(S.fix, tp);
  if (d > lim) return toast(`GPS상 ${Math.round(d)}m 떨어져 있어서 보호할 수 없어요`, true);
  doGuard(qr.pid);
});
