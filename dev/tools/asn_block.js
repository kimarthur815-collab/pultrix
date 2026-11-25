// ---------- 암살전 (화면·진행) ----------
// 무리 = 역할 자리에 들어간 'k…' 아이디. 진짜 기록은 room.asn (사슬·무리·우두머리), players/{id}/role은 그걸 따라 씀
const asnOn = room => modeOf(room) === 'assassin' && !!(room && room.asn);
const asnMeBoss = () => !!(S.room && Logic.asnIsBoss(S.room.asn, S.pid));
const asnHd = () => (asnOn(S.room) && S.compass && S.heading != null ? Math.round(S.heading) : null);
const asnStunned = (p, t) => ((p && p.stunUntil) || 0) > t;
const asnMyAugIds = () => Object.keys(S.augs || {}).filter(k => Logic.AUGS[k]);
const asnName = id => ((S.room && S.room.players[id]) || {}).name || '?';
// 매초 (tick 앞부분): 내 기록 맞추기, 무리 바뀜 알림, 받은 능력, 체력 0 → 기절
function asnPre(room, me, t) {
  const a = room.asn, mine = a.mem && a.mem[S.pid]; if (!mine) return;
  const boss = Logic.asnIsBoss(a, S.pid), want = boss ? null : Logic.ASN.MINION_HP;
  if (me.role !== mine || (me.hpMax || null) !== want) {
    const u = { role: mine, hpMax: want }; if (me.role !== mine) u.crewAt = (a.since && a.since[S.pid]) || t;
    update(meRef(), u);
  }
  const key = mine + ':' + (boss ? 'b' : 'm');
  if (S.asnKey && S.asnKey !== key) asnChanged(room, S.asnKey, key);
  S.asnKey = key;
  // 받은 능력 (양도·상납·몰수·교환)
  for (const [k, g] of Object.entries(me.augIn || {})) {
    if (S.asnInDone.has(k)) continue;
    S.asnInDone.add(k); update(meRef(), { ['augIn/' + k]: null });
    if (!g || !Logic.AUGS[g.aug]) continue;
    if (!Logic.asnIsBoss(a, S.pid)) {
      if (g.why === 'give') { const cur = asnMyAugIds(); if (cur.length) asnTribute(cur, 'swap'); }
      else if (asnMyAugIds().length >= 1) { asnTribute([g.aug], 'tribute'); continue; } // 부하는 1칸: 꽉 차 있으면 우두머리에게
    }
    const r = Logic.addAug(S.augs, g.aug, now());
    if (r.dup) { toast(`${asnName(g.from)}에게서 받은 [${Logic.AUGS[g.aug].name}]은 이미 있어요`); continue; }
    S.augs = r.augs; if (g.readyAt) S.augs[g.aug] = { ...S.augs[g.aug], readyAt: g.readyAt };
    update(meRef(), { ['augs/' + g.aug]: S.augs[g.aug] });
    toast(`🎁 ${asnName(g.from)}${{ give: '의 양도', tribute: '의 상납', confiscate: '에게서 몰수', swap: '와 교환' }[g.why] || ''}: [${Logic.AUGS[g.aug].name}]`, true); vibrate([60, 40, 60]);
  }
  // 체력 0 → 2분 기절 (탈락 없음), 체력 30으로
  const raw = Logic.hpRaw({ ...me, selfDmg: S.selfDmg }, (room.hits || {})[S.pid]);
  if (raw <= 0 && !me.forfeit && !asnStunned(me, t)) {
    S.selfDmg += raw - Logic.ASN.STUN_HP;
    update(meRef(), { stunUntil: t + Logic.ASN.STUN_SEC * 1000, selfDmg: S.selfDmg });
    push(roomRef('events'), { type: 'asnStun', by: S.pid, at: serverTimestamp() });
    toast(`😵 기절! ${Logic.ASN.STUN_SEC / 60}분 동안 암살·능력을 못 쓰고 위치가 적에게 보여요`, true); flash('rgba(156,163,175,.9)'); vibrate([400, 100, 400]); sfx('lose');
  }
}
function asnChanged(room, oldKey, newKey) {
  const a = room.asn, [oc, ob] = oldKey.split(':'), [nc, nb] = newKey.split(':'), bossName = asnName(Logic.asnBoss(a, nc));
  if (oc !== nc) {
    toast(`🗡️ ${bossName}의 부하가 됐어요! 이제 ${bossName} 무리와 함께 움직여요 · 1분 무적`, true); flash('rgba(59,163,255,.9)'); vibrate([300, 100, 300]);
    S.chatLastAt = now(); S.chatHtml = ''; // 새 무리 대화는 지금부터
    if (nb === 'm') asnKeepOne('부하가 됐어요');
  } else if (ob === 'm' && nb === 'b') { toast('👑 우두머리가 됐어요! 이제 타깃 화살표가 보여요', true); flash('rgba(255,77,79,.9)'); vibrate([200, 80, 200]); }
  else if (ob === 'b' && nb === 'm') { toast(`⚔️ 하극상을 당했어요! 이제 ${bossName}의 부하예요`, true); flash('rgba(167,139,250,.9)'); vibrate([400, 100, 400]); asnKeepOne('우두머리 자리를 뺏겼어요'); }
  S.st = Math.min(S.st, stMaxOf(nc));
}
// 부하가 되면 능력 1개만 남기고 나머지는 우두머리에게 (20초 안에 안 고르면 등급 높은 것)
function asnKeepOne(why) {
  const ids = asnMyAugIds(); if (ids.length <= 1) return;
  const best = ids.slice().sort((x, y) => Logic.GRADES.indexOf(gradeOf(y)) - Logic.GRADES.indexOf(gradeOf(x)))[0];
  let fired = false;
  const done = keep => { if (fired) return; fired = true; clearTimeout(S.keepT); const rest = asnMyAugIds().filter(k => k !== keep); if (rest.length) asnTribute(rest, 'tribute'); };
  openPick('능력 1개만 남겨요', `${why} · 나머지는 우두머리에게 바쳐요 (${Logic.ASN.KEEP_SEC}초 뒤 자동)`, ids.map(k => [k, { name: `[${gradeOf(k)}] ${Logic.AUGS[k].name}` }, Logic.augDesc(k)]), done);
  clearTimeout(S.keepT);
  S.keepT = setTimeout(() => { if (S.pickCb === done) { S.pickCb = null; $('#ov-pick').classList.remove('on'); } done(best); }, Logic.ASN.KEEP_SEC * 1000);
}
// 내 능력을 우리 우두머리에게 보냄 (상납·몰수·교환)
function asnTribute(ids, why) {
  const room = S.room, a = room && room.asn, boss = a && Logic.asnBoss(a, a.mem[S.pid]);
  if (!boss || boss === S.pid || !ids.length) return;
  const u = {};
  for (const id of ids) { const x = (S.augs || {})[id]; u[`players/${boss}/augIn/${rid(8, ALNUM)}`] = { aug: id, from: S.pid, why, readyAt: (x && x.readyAt) || 0 }; }
  update(roomRef(), u);
  for (const id of ids) if (S.augs[id]) loseAug(id);
  toast(`${why === 'confiscate' ? '🫳 몰수' : why === 'swap' ? '🔁 교환' : '🎁 상납'}: ${ids.map(k => Logic.AUGS[k].name).join(', ')} → ${asnName(boss)}`);
}
// 우두머리 → 부하 양도 (20m 안)
function asnGive(aug, to) {
  const room = S.room, a = room && room.asn, p = room && room.players[to];
  if (!asnOn(room) || !asnMeBoss() || !S.augs[aug] || !p || a.mem[to] !== a.mem[S.pid] || to === S.pid) return;
  if (!S.fix || p.lat == null || Logic.dist(S.fix, p) > Logic.ASN.GIVE_M + Math.min(20, (S.fix.acc || 0) + (p.acc || 0))) return toast(`${p.name}이(가) ${Logic.ASN.GIVE_M}m 안에 있어야 건넬 수 있어요`);
  const x = S.augs[aug];
  update(roomRef(`players/${to}/augIn/${rid(8, ALNUM)}`), { aug, from: S.pid, why: 'give', readyAt: x.readyAt || 0 });
  loseAug(aug); toast(`🎁 ${p.name}에게 [${Logic.AUGS[aug].name}] 양도`);
}
function asnGiveHtml(id) {
  const room = S.room; if (!asnOn(room) || !asnMeBoss() || !S.augs[id] || room.status !== 'playing') return;
  const a = room.asn, mins = Logic.asnMembers(a, a.mem[S.pid]).filter(x => x !== S.pid && room.players[x]);
  if (!mins.length) return;
  $('#augInfoCard').insertAdjacentHTML('beforeend', `<div class="asnGive"><small class="dim">부하에게 양도 (${Logic.ASN.GIVE_M}m 안, 부하 칸이 차 있으면 서로 바꿈)</small>${mins.map(x => `<button data-give="${x}" data-aug="${id}">🎁 ${esc(room.players[x].name)}</button>`).join('')}</div>`);
}
$('#augInfoCard').addEventListener('click', e => { const b = e.target.closest('[data-give]'); if (b) asnGive(b.dataset.aug, b.dataset.give); });
// 지금 암살할 수 있는 사람 (가까운 순): 타깃 무리(피의 시간엔 다른 무리 누구나), 무적 아님, GPS상 가까움
function asnCands(room, t) {
  const a = room.asn, hits = room.hits || {}, my = a.mem[S.pid], blood = Logic.asnBlood(t, room.startAt, room.timeShift).on, tgt = Logic.asnTarget(a, my), out = [];
  if (!S.fix) return out;
  for (const [id, p] of Object.entries(room.players)) {
    if (id === S.pid || !p.role || p.lat == null || !Logic.alive(p, hits[id])) continue;
    const c = a.mem[id]; if (!c || c === my || (!blood && c !== tgt)) continue;
    if (((hits[id] && hits[id].invUntil) || 0) > t) continue;
    const d = Logic.dist(S.fix, p), lim = Logic.nearLimit(S.fix, p, Logic.ASN.NEAR_M);
    if (d <= lim) out.push({ id, p, d });
  }
  return out.sort((x, y) => x.d - y.d);
}
// 하극상: 부하 된 지 5분, 판마다 한 번, 우두머리 뒤에서 3초 + 우두머리 15m 안 다른 부하 1명당 2초
function asnRebelInfo(room, me, t) {
  const a = room.asn, my = a.mem[S.pid], boss = Logic.asnBoss(a, my), A = Logic.ASN;
  if (!boss || boss === S.pid || (a.rebel || {})[S.pid]) return null;
  const wait = ((a.since || {})[S.pid] || 0) + A.REBEL_WAIT_SEC * 1000 - t;
  if (wait > 0) return { ok: false, why: `${fmt(wait)} 뒤 가능` };
  const bp = room.players[boss];
  if (!bp || bp.lat == null || !S.fix || Logic.dist(S.fix, bp) > Logic.nearLimit(S.fix, bp, A.NEAR_M)) return { ok: false, why: '우두머리 뒤로 가까이' };
  const guards = Logic.asnMembers(a, my).filter(id => id !== S.pid && id !== boss && room.players[id] && room.players[id].lat != null && Logic.dist(room.players[id], bp) <= A.REBEL_GUARD_M).length;
  return { ok: true, boss, sec: A.REBEL_SEC + A.REBEL_GUARD_SEC * guards, guards };
}
function asnRender(room, me, t, alive, ph) {
  const sb = $('#btnStab'), rb = $('#btnRebel');
  if (!asnOn(room) || !alive || ph.phase !== 'chase') { sb.style.display = rb.style.display = 'none'; if (S.stab) asnHoldEnd('cancel'); return; }
  sb.style.display = 'block';
  if (S.stab) return; // 누르는 중엔 asnHoldLoop가 글자를 바꿈
  const stun = asnStunned(me, t), c = !stun ? asnCands(room, t)[0] : null;
  sb.disabled = !c || stun || !S.compass;
  sb.style.setProperty('--p', '0%');
  sb.innerHTML = stun ? `😵 기절 중 ${fmt(me.stunUntil - t)}` : !S.compass ? '🧭 나침반이 켜져야 암살할 수 있어요' : c ? `🗡️ ${esc(c.p.name)} 암살 · ${Logic.ASN.STAB_SEC}초 꾹` : '🗡️ 암살 · 타깃 뒤로 가까이 가세요';
  const rv = asnRebelInfo(room, me, t);
  rb.style.display = rv ? 'block' : 'none';
  if (rv) { rb.disabled = !rv.ok || stun || !S.compass; rb.style.setProperty('--p', '0%'); rb.innerHTML = rv.ok ? `⚔️ 하극상 · ${rv.sec}초 꾹${rv.guards ? ` (호위 ${rv.guards}명)` : ''}` : `⚔️ 하극상 · ${rv.why}`; }
}
function asnHoldStart(rebel) {
  const room = S.room, me = room && room.players[S.pid], t = now();
  if (S.stab || !asnOn(room) || !me || asnStunned(me, t) || !S.compass) return;
  let tg, need;
  if (rebel) { const rv = asnRebelInfo(room, me, t); if (!rv || !rv.ok) return; tg = rv.boss; need = rv.sec * 1000; }
  else { const c = asnCands(room, t)[0]; if (!c) return; tg = c.id; need = Logic.ASN.STAB_SEC * 1000; }
  const p0 = performance.now();
  S.stab = { tg, rebel, need, start: p0, last: p0, bad: 0 };
  set(roomRef('stabs/' + S.pid), { tg, at: Math.round(t), need, rb: rebel ? 1 : 0 }).catch(e => console.error(e));
  sfx('trap'); requestAnimationFrame(asnHoldLoop);
}
// 누르는 동안: 거리·뒤 판정이 0.5초 넘게 깨지면 실패, 시간을 다 채우면 성공
function asnHoldLoop() {
  const s = S.stab; if (!s) return;
  const room = S.room, t = now(), el = $(s.rebel ? '#btnRebel' : '#btnStab');
  if (!room || !asnOn(room) || room.result || room.status !== 'playing') return asnHoldEnd('cancel');
  const pn = performance.now(), dtm = pn - s.last, elapsed = pn - s.start; s.last = pn;
  const a = room.asn, my = a.mem[S.pid], p = room.players[s.tg], hits = room.hits || {};
  let why = '';
  const valid = s.rebel ? Logic.asnBoss(a, my) === s.tg && !(a.rebel || {})[S.pid]
    : !!(p && a.mem[s.tg] && a.mem[s.tg] !== my && (Logic.asnBlood(t, room.startAt, room.timeShift).on || a.mem[s.tg] === Logic.asnTarget(a, my)) && Logic.alive(p, hits[s.tg]) && !(((hits[s.tg] && hits[s.tg].invUntil) || 0) > t));
  if (!valid) why = 'gone';
  else if (!S.fix || !p || p.lat == null) why = 'far';
  else {
    const d = Logic.dist(S.fix, p);
    if (d > Logic.nearLimit(S.fix, p, Logic.ASN.NEAR_M) * 1.2) why = 'far';
    else if (!Logic.behindOk(S.heading, p.hd, Logic.bearing(S.fix, p), d, Math.min(30, (S.fix.acc || 0) + (p.acc || 0)))) why = 'turn';
  }
  s.bad = why ? s.bad + dtm : 0;
  if (why === 'gone' || s.bad > 500) return asnHoldEnd(why);
  el.style.setProperty('--p', Math.min(100, elapsed / s.need * 100).toFixed(1) + '%');
  el.innerHTML = `${s.rebel ? '⚔️ 하극상' : '🗡️ 암살'} 중… ${Math.max(0, (s.need - elapsed) / 1000).toFixed(1)}초`;
  if (elapsed >= s.need) return asnHoldDone();
  requestAnimationFrame(asnHoldLoop);
}
function asnHoldEnd(why) {
  const s = S.stab; if (!s) return;
  S.stab = null;
  remove(roomRef('stabs/' + S.pid)).catch(() => {});
  for (const b of ['#btnStab', '#btnRebel']) $(b).style.setProperty('--p', '0%');
  const elapsed = performance.now() - s.start;
  if (s.rebel && elapsed >= 1000 && why !== 'cancel' && why !== 'gone') return asnRebelFail();
  const msg = { turn: '👀 상대가 돌아봤어요! 암살 실패', far: '거리가 멀어져서 실패', gone: '이제 노릴 수 없는 상대예요' }[why];
  if (msg) { toast(msg, true); vibrate(120); }
  renderGame();
}
function asnHoldDone() {
  const s = S.stab; if (!s) return;
  S.stab = null;
  remove(roomRef('stabs/' + S.pid)).catch(() => {});
  for (const b of ['#btnStab', '#btnRebel']) $(b).style.setProperty('--p', '0%');
  if (s.rebel) asnRebelCommit(); else asnCatchCommit(s.tg);
}
// 암살 성공: room.asn을 한 번에 바꾸고, 옮겨진 사람들의 역할·체력 최대치·무적을 씀
function asnCatchCommit(tg) {
  const room = S.room, blood = Logic.asnBlood(now(), room.startAt, room.timeShift).on; let res = null;
  runTransaction(roomRef('asn'), cur => { if (!cur || !cur.chain) return; res = Logic.asnCatch(cur, tg, S.pid, Math.round(now()), blood); return res ? res.asn : undefined; })
    .then(r => {
      if (!r.committed || !res) { toast('암살 실패: 그새 상황이 바뀌었어요', true); return renderGame(); }
      const t = Math.round(now()), u = {};
      for (const id of res.moved) { u[`players/${id}/role`] = res.to; u[`players/${id}/hpMax`] = Logic.ASN.MINION_HP; u[`players/${id}/crewAt`] = t; u[`hits/${id}/invUntil`] = t + Logic.ASN.INV_SEC * 1000; }
      update(roomRef(), u);
      push(roomRef('events'), { type: 'asnCatch', by: S.pid, target: tg, whole: res.whole ? 1 : 0, n: res.moved.length, at: serverTimestamp() });
      S.stats.catches = (S.stats.catches || 0) + 1;
      toast(res.whole && res.moved.length > 1 ? `🗡️ ${asnName(tg)} 암살! 무리 ${res.moved.length}명이 통째로 우리 편` : `🗡️ ${asnName(tg)} 암살! 이제 우리 무리의 부하예요`, true);
      flash('rgba(255,77,79,.95)'); vibrate([100, 50, 300]); sfx('win'); renderGame();
    }).catch(e => { console.error(e); toast('암살 저장 실패 · 다시 해 주세요', true); });
}
function asnRebelCommit() {
  let res = null;
  runTransaction(roomRef('asn'), cur => { if (!cur || !cur.chain) return; res = Logic.asnRebel(cur, S.pid); return res ? res.asn : undefined; })
    .then(r => {
      if (!r.committed || !res) return toast('하극상 실패: 그새 상황이 바뀌었어요', true);
      update(roomRef(), { [`players/${S.pid}/hpMax`]: null, [`players/${res.old}/hpMax`]: Logic.ASN.MINION_HP });
      push(roomRef('events'), { type: 'asnRebel', by: S.pid, target: res.old, at: serverTimestamp() });
      toast(`⚔️ 하극상 성공! ${asnName(res.old)}의 자리를 뺏었어요`, true); flash('rgba(167,139,250,.95)'); vibrate([300, 100, 300]); sfx('augS');
    }).catch(e => console.error(e));
}
// 하극상 실패: 기회를 쓰고, 내 능력은 모두 우두머리에게(몰수), 우두머리가 용서/팔아넘기기
function asnRebelFail() {
  const a = S.room && S.room.asn, boss = a && Logic.asnBoss(a, a.mem[S.pid]);
  runTransaction(roomRef('asn/rebel/' + S.pid), cur => (cur ? undefined : 1)).then(r => {
    if (!r.committed) return;
    const ids = asnMyAugIds(); if (ids.length) asnTribute(ids, 'confiscate');
    push(roomRef('events'), { type: 'asnRebelFail', by: S.pid, target: boss, at: serverTimestamp() });
    toast('⚔️ 하극상 실패! 능력을 몰수당했어요. 우두머리가 처분을 정해요', true); flash('rgba(167,139,250,.9)'); vibrate([300, 100, 300]); sfx('trap');
  }).catch(e => console.error(e));
}
function asnOpenSell(rebel) {
  const room = S.room, a = room.asn, my = a.mem[S.pid], h = Logic.asnHunter(a, my), hb = h && Logic.asnBoss(a, h);
  S.sellFor = { rebel, until: Date.now() + Logic.ASN.SELL_SEC * 1000 };
  $('#asnSellT').textContent = `⚔️ ${asnName(rebel)}가 반란을 시도했다!`;
  $('#asnSellP').textContent = `능력은 몰수했어요. ${Logic.ASN.SELL_SEC}초 안에 안 고르면 용서해요.`;
  const can = !!(h && h !== my);
  $('#btnAsnSell').disabled = !can;
  $('#btnAsnSell').textContent = can ? `💸 ${asnName(hb)} 무리에 팔아넘기기` : '팔아넘길 무리가 없어요';
  $('#ov-asnSell').classList.add('on'); vibrate([200, 80, 200]);
}
$('#btnAsnForgive').onclick = () => {
  const f = S.sellFor; S.sellFor = null; $('#ov-asnSell').classList.remove('on');
  if (f) { push(roomRef('events'), { type: 'asnForgive', by: S.pid, target: f.rebel, at: serverTimestamp() }); toast(`🤝 ${asnName(f.rebel)}를 용서했어요`); }
};
$('#btnAsnSell').onclick = () => {
  const f = S.sellFor; S.sellFor = null; $('#ov-asnSell').classList.remove('on'); if (!f) return;
  let res = null;
  runTransaction(roomRef('asn'), cur => { if (!cur || !cur.chain) return; res = Logic.asnSell(cur, f.rebel, Math.round(now())); return res ? res.asn : undefined; })
    .then(r => {
      if (!r.committed || !res) return toast('팔아넘기기 실패: 그새 상황이 바뀌었어요');
      const t = Math.round(now());
      update(roomRef(), { [`players/${f.rebel}/role`]: res.to, [`players/${f.rebel}/crewAt`]: t, [`players/${f.rebel}/hpMax`]: Logic.ASN.MINION_HP });
      push(roomRef('events'), { type: 'asnSold', by: S.pid, target: f.rebel, at: serverTimestamp() });
      toast(`💸 ${asnName(f.rebel)}를 팔아넘겼어요`, true);
    }).catch(e => console.error(e));
};
// 매초 (tick 중간): 경고·스태미나 회복·무리 정리
function asnTick(room, me, t, gpsOk, warn) {
  const a = room.asn, my = a.mem[S.pid], hits = room.hits || {}, A = Logic.ASN, ph = Logic.phaseAt(t, room.startAt, room.timeShift);
  if (asnStunned(me, t)) warn.push(`😵 기절 ${fmt(me.stunUntil - t)} · 암살·능력 못 씀 · 위치가 적에게 보여요`);
  if (!S.compass) warn.push('🧭 나침반이 꺼져 있어요 · 암살을 못 하고, 어느 방향에서든 암살당해요');
  const blood = Logic.asnBlood(t, room.startAt, room.timeShift);
  if (blood.on) warn.push(`🩸 피의 시간 ${fmt(blood.until - t)} · 아무나 암살할 수 있어요`);
  // 위치가 표시되던 주기마다 스태미나 회복 (도망자와 같음)
  const idx = Logic.mapRevealIdx(t, room.startAt);
  if (S.lastMapIdx == null) S.lastMapIdx = idx;
  else if (idx > S.lastMapIdx) { S.lastMapIdx = idx; S.st = Math.min(stMaxOf(me.role), S.st + RULES.MAP_RECOVER * (av('recoverBoost') || 1)); }
  if (ph.phase === 'chase') {
    tipOnce('asnStab', `타깃 무리 뒤로 가까이 가면 🗡️ 암살 버튼이 켜져요. 같은 방향을 보고 ${A.STAB_SEC}초 꾹!`);
    tipOnce('asnChat', '💬 무리 단톡방은 항상 열려 있어요. 지도를 꾹 누르면 무리에게 핑을 찍어요');
    // 나를 노리는 무리(피의 시간엔 다른 무리 누구나)가 30m 안
    if (gpsOk && S.fix) {
      const hc = blood.on ? null : Logic.asnHunter(a, my); let nd = Infinity;
      for (const [id, p] of Object.entries(room.players)) {
        if (id === S.pid || p.lat == null || !Logic.alive(p, hits[id])) continue;
        const c = a.mem[id]; if (!c || c === my || (hc && c !== hc)) continue;
        nd = Math.min(nd, Logic.dist(S.fix, p));
      }
      if (nd <= A.WARN_M) { warn.push(`🗡️ ${blood.on ? '다른 무리' : '나를 노리는 무리'}가 ${A.WARN_M}m 안에 있어요!`); if (Date.now() - (S.asnNearAt || 0) > 8000) { S.asnNearAt = Date.now(); vibrate([120, 60, 120]); } }
    }
  }
  // 우두머리가 기권했거나 무리 전원이 기권: 살아 있는 사람 중 아이디가 가장 앞선 폰 한 대가 정리
  if (Date.now() - (S.asnFixAt || 0) > 3000) {
    S.asnFixAt = Date.now();
    const aliveIds = Object.entries(room.players).filter(([id, p]) => p.role && Logic.alive(id === S.pid ? { ...p, selfDmg: S.selfDmg, augs: S.augs } : p, hits[id])).map(([id]) => id).sort();
    if (aliveIds[0] === S.pid && Logic.asnFix(a, aliveIds, t)) runTransaction(roomRef('asn'), cur => (cur && cur.chain ? Logic.asnFix(cur, aliveIds, Math.round(now())) || undefined : undefined)).catch(e => console.error(e));
  }
}
// 0.2초마다: 등 뒤 경고, 피의 시간 화면, 결투 알림, 처분 시간
function asnOverlay(inGame, room, me, t) {
  const on = inGame && asnOn(room), w = $('#asnWarn'), fx = $('#asnFx');
  if (!on) { w.classList.remove('on'); fx.classList.remove('on'); if (S.stab) asnHoldEnd('cancel'); return; }
  const st = Object.values(room.stabs || {}).filter(s => s && s.tg === S.pid && t - (s.at || 0) < (s.need || 3000) + 1500);
  if (st.length) {
    if (!w.classList.contains('on')) { w.classList.add('on'); sfx('warn'); }
    w.textContent = '⚠️ 등 뒤에 누가 있다! 돌아보세요';
    if (Date.now() - (S.stabBuzz || 0) > 700) { S.stabBuzz = Date.now(); vibrate([200, 60, 200]); }
    if (Date.now() - (S.hdSent || 0) > 300) { S.hdSent = Date.now(); const u = { hd: asnHd() }; if (S.fix) Object.assign(u, { lat: S.fix.lat, lng: S.fix.lng, acc: Math.round(S.fix.acc) }); update(meRef(), u); }
  } else w.classList.remove('on');
  const bl = Logic.asnBlood(t, room.startAt, room.timeShift);
  fx.classList.toggle('on', bl.on);
  if (bl.on && S.bloodK !== bl.k) { S.bloodK = bl.k; toast(`🩸 피의 시간! ${Logic.ASN.BLOOD_SEC}초 동안 아무나 암살할 수 있어요`, true); sfx('wanted'); vibrate([300, 100, 300, 100, 300]); }
  if (room.asn.duelAt && S.duelSeen !== room.asn.duelAt) { S.duelSeen = room.asn.duelAt; toast('⚔️ 최후의 결투! 우두머리 둘만 남았어요 · 화살표가 계속 보이고 구역이 줄어요', true); sfx('minute'); vibrate([200, 100, 200]); }
  if (S.sellFor && Date.now() > S.sellFor.until) $('#btnAsnForgive').click();
}
// 화살표: 우두머리만. 타깃 무리에서 가장 가까운 사람. 최후의 결투면 계속
function asnArrow(box, off) {
  const room = S.room, a = room.asn, t = now(), hits = room.hits || {}, my = a.mem[S.pid];
  if (!my || !room.players[S.pid]) return off();
  const ph = Logic.phaseAt(t, room.startAt, room.timeShift);
  if (ph.phase === 'hide') return off(`추격 시작까지 ${fmt(ph.remainMs)}`);
  if (ph.phase !== 'chase') return off();
  if (!Logic.asnIsBoss(a, S.pid)) return off(`화살표는 우두머리(${asnName(Logic.asnBoss(a, my))})만 봐요 · 💬 단톡방과 핑으로 지시를 받으세요`);
  const tc = Logic.asnTarget(a, my); if (!tc) return off();
  const tb = asnName(Logic.asnBoss(a, tc)), duel = !!a.duelAt;
  let st = null;
  if (!duel) {
    st = Logic.arrowState(t, Logic.arrowBase({}, room.startAt), arrowEverySec(), av('foresight') || 0);
    if (!st.unlocked) return off(`🎯 타깃: ${tb} 무리 · 화살표 열리기까지 ${fmt(st.nextInMs)}`);
    if (!st.visible) return off(`🎯 타깃: ${tb} 무리 · 다음 화살표까지 ${fmt(st.nextInMs)}`);
  }
  if (fogged(t)) return off('🌫 안개 속이라 화살표가 안 떠요');
  if (fxOn('stop', t)) return off('⏸ 시간 정지! 화살표가 멈췄어요');
  box.classList.add('on');
  const key = duel ? 'duel' : 'a' + st.idx;
  if (S.arrowPopKey !== key) { S.arrowPopKey = key; box.classList.remove('pop'); void box.offsetWidth; box.classList.add('pop'); sfx('arrow'); vibrate(80); }
  let best = null;
  if (S.fix) for (const id of Logic.asnMembers(a, tc)) {
    const p = room.players[id]; if (!p || p.lat == null || !Logic.alive(p, hits[id])) continue;
    const q = Logic.shownPos(p, t, room.players), d = Logic.dist(S.fix, q); if (!best || d < best.d) best = { id, q, d };
  }
  const arrow = $('#arrow'), txt = $('#arrowTxt');
  if (!S.fix) { arrow.style.display = 'none'; txt.textContent = 'GPS 신호를 기다리는 중…'; }
  else if (!best) { arrow.style.display = 'none'; txt.textContent = '타깃 무리 위치를 아직 몰라요'; }
  else if (best.d <= RULES.ARROW_NEAR_M) { arrow.style.display = 'none'; txt.textContent = `${asnName(best.id)} 근처에 있어요!`; }
  else {
    arrow.style.display = 'block';
    const b = Logic.bearing(S.fix, best.q);
    rotateArrow(S.compass && S.heading != null ? b - S.heading : b);
    txt.textContent = [`🎯 ${asnName(best.id)}`, S.compass ? '' : '나침반 없음 · 화면 위쪽이 북쪽'].filter(Boolean).join(' · ');
  }
  return duel ? '⚔️ 최후의 결투 · 화살표가 계속 보여요' : `화살표 표시 중 ${Math.ceil(st.showLeftMs / 1000)}초`;
}
// 지도: 우리 무리(👑 우두머리), 기절한 적
function drawAsn(mo) {
  const room = S.room, items = [];
  if (asnOn(room) && room.status === 'playing') {
    const a = room.asn, my = a.mem[S.pid], t = now(), hits = room.hits || {};
    for (const [id, p] of Object.entries(room.players)) {
      if (id === S.pid || !p.role || p.lat == null || !Logic.alive(p, hits[id])) continue;
      const c = a.mem[id], stun = asnStunned(p, t);
      let bo = null;
      if (c === my) bo = { name: p.name, col: '#3ba3ff', pre: Logic.asnBoss(a, c) === id ? '👑' : '', sub: stun ? '😵' : null };
      else if (stun) bo = { name: p.name, col: '#9ca3af', pre: '😵', sub: '기절' };
      if (bo) items.push({ key: (c === my ? 'm' : 's') + id, make: () => badge([p.lat, p.lng], bo), update: m => badgeSet(m, [p.lat, p.lng], bo) });
    }
  }
  syncLayer(mo, 'asnL', items);
}
function asnReveal() {
  const room = S.room, a = room.asn, my = a.mem[S.pid], tg = Logic.asnBoss(a, Logic.asnTarget(a, my)), reel = $('#reel');
  reel.style.transition = 'none'; reel.style.transform = 'translateY(0)'; reel.innerHTML = '<div class="chaser-t">우두머리</div>';
  $('#roleMsg').textContent = '당신은 우두머리!'; $('#roleMsg').className = 'big chaser-t';
  $('#roleSub').textContent = `🎯 몰래 정해진 타깃: ${asnName(tg)} · ${fmtDur(RULES.HIDE_SEC)} 동안 흩어진 뒤, 타깃 뒤로 가서 ${Logic.ASN.STAB_SEC}초 꾹`;
  $('#btnRoleOk').style.visibility = 'visible'; $('#ov-role').classList.add('on');
  flash(ROLE_RGBA.chaser); vibrate([200, 80, 200]);
}
function asnEvent(e, me0, who) {
  if (e.type === 'asnCatch') {
    if (e.by !== S.pid && e.target !== S.pid) deathBan(`🗡️ ${who(e.by)} → ${who(e.target)} 암살${e.whole && e.n > 1 ? ` · 무리 ${e.n}명 통째로` : ''}`);
  } else if (e.type === 'asnRebel') {
    if (e.by !== S.pid && e.target !== S.pid) deathBan(`⚔️ 하극상! ${who(e.by)}가 ${who(e.target)}의 자리를 뺏었어요`);
  } else if (e.type === 'asnRebelFail') {
    if (e.target === S.pid) asnOpenSell(e.by);
    else if (e.by !== S.pid && me0.role === ((S.room.players[e.target] || {}).role)) toast(`⚔️ ${who(e.by)}의 하극상 실패!`, true);
  } else if (e.type === 'asnSold') {
    if (e.target === S.pid) { toast(`💸 ${who(e.by)}가 나를 적 무리에 팔아넘겼어요`, true); vibrate([300, 100, 300]); }
    else if (e.by !== S.pid) deathBan(`💸 ${who(e.by)}가 ${who(e.target)}를 팔아넘겼어요`);
  } else if (e.type === 'asnForgive') {
    if (e.target === S.pid) toast(`🤝 ${who(e.by)}가 용서해 줬어요`, true);
  } else if (e.type === 'asnStun') {
    if (e.by !== S.pid) deathBan(`😵 ${who(e.by)} 기절`);
  }
}
function asnResult(room, r) {
  const P = room.players, a = room.asn || {}, n = a.n || {}, won = r.boss === S.pid, endAt = r.at || now();
  $('#r-title').textContent = `👑 ${(P[r.boss] || {}).name || '?'} 승리!`;
  $('#r-sub').textContent = [r.reason, won ? '이겼어요 🎉' : '졌어요'].filter(Boolean).join(' · ');
  const ranked = Object.entries(P).filter(([, p]) => p.role).sort(([x], [y]) => (y === r.boss) - (x === r.boss) || (n[y] || 0) - (n[x] || 0));
  const top = ranked.filter(([id]) => id !== r.boss).sort(([x], [y]) => (n[y] || 0) - (n[x] || 0))[0];
  $('#r-mvp').innerHTML = top && n[top[0]] ? `<div class="mvp">🏆 암살왕 · ${esc(top[1].name)} <span class="dim small">${n[top[0]]}번 암살</span></div>` : '';
  $('#r-list').innerHTML = ranked.map(([id, p], i) => {
    const c = a.mem && a.mem[id], boss = c && Logic.asnBoss(a, c), isB = boss === id, sz = c ? Logic.asnMembers(a, c).length - 1 : 0;
    const s = p.stats || {}, km = ((s.dist || 0) / 1000).toFixed(2), augs = Object.keys(p.augs || {}).filter(k => Logic.AUGS[k]);
    return `<li class="col"><div class="top"><span><span class="badge ${isB ? 'chaser' : 'runner'}">${isB ? '우두머리' : '부하'}</span> ${p.forfeit ? '🏳️ ' : ''}${esc(p.name)}${id === S.pid ? ' (나)' : ''}${id === r.boss ? ' 👑' : ''}</span><span class="dim small">${i + 1}위</span></div>`
      + `<span class="stat">${isB ? `부하 ${sz}명` : `${esc((P[boss] || {}).name || '?')}의 부하`} · 암살 ${n[id] || 0}번 · 🏃 ${km}km · 생존 ${fmt(Logic.survivalMs(p, room.startAt, endAt))}</span>`
      + (augs.length ? `<div class="insaugs">${augs.map(augChip).join('')}</div>` : '') + '</li>';
  }).join('');
}
for (const [sel, rebel] of [['#btnStab', false], ['#btnRebel', true]]) {
  const el = $(sel);
  el.addEventListener('pointerdown', e => { e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch (x) {} asnHoldStart(rebel); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(n => el.addEventListener(n, () => { if (S.stab && S.stab.rebel === rebel) asnHoldEnd('release'); }));
  el.addEventListener('contextmenu', e => e.preventDefault());
}
