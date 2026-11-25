// 봉쇄선: 지도에서 두 점 (두 번째 점은 최대 100m)
function blockClick(ll) {
  if (S.terrPick) return terrPickClick(ll);
  if (S.cordonPick) return cordonClick(ll);
  const bp = S.blockPick, x = S.augs && S.augs.blockade; if (!bp) return;
  if (!x || !Logic.augReady(x, now())) { S.blockPick = null; return; }
  const p = { lat: ll.lat, lng: ll.lng };
  if (!bp.pts.length) { bp.pts.push(p); drawMaps(); return toast('🚧 한 점 더 찍으세요'); }
  const a = bp.pts[0], b = Logic.clampLen(a, p, Logic.AUGS.blockade.len), t = now(), v = av('blockade');
  if (Logic.dist(a, b) < 5) return toast('두 점이 너무 가까워요');
  S.blockPick = null;
  push(roomRef('blocks'), { by: S.pid, a, b, until: t + v * 1000 }); S.rpExtra = { line: [a.lat, a.lng, b.lat, b.lng].map(x => +(+x).toFixed(5)) };
  push(roomRef('events'), { type: 'blockade', by: S.pid, at: serverTimestamp() });
  setCooldown('blockade', { until: t + v * 1000 }); toast(`🚧 봉쇄선 ${Math.round(Logic.dist(a, b))}m! ${v}초 동안 넘는 도망자는 들켜요`, true); sfx('skill');
  drawMaps(); renderGame();
}
// 현상금: 다음 잡기·살아남기·탈출 한 번에 증강 1개 더, 그리고 사라짐
function bountyPay() {
  if (!S.augs || !S.augs.bounty) return;
  loseAug('bounty'); setTimeout(() => gainRandom('💰 현상금'), 1200);
}
// 잔상: 10초 전 내 위치
function lagPos(t) {
  const tr = S.myTrail || [], cut = t - Logic.AUGS.afterimage.lag * 1000; let q = tr[0];
  for (const x of tr) { if (x.t <= cut) q = x; else break; }
  return q ? { lat: q.lat, lng: q.lng } : null;
}
// 쿨타임 스킬 사용
function useAug(id) {
  const room = S.room, me = room && room.players[S.pid], x = S.augs[id], t = now();
  if (!me || !x || !Logic.augReady(x, t) || Logic.AUGS[id].auto) return;
  if ((me.silenceUntil || 0) > t) return toast(`🔇 침묵 중이라 스킬을 못 써요 (${fmt(me.silenceUntil - t)})`);
  if (fxOn('stop', t)) return toast('⏸ 시간 정지 중이라 능력을 못 써요');
  if (asnOn(room) && asnStunned(me, t)) return toast('😵 기절 중이라 능력을 못 써요');
  const v = av(id), here = S.fix ? { lat: S.fix.lat, lng: S.fix.lng } : null, hits = room.hits || {};
  if (id === 'insight') return openInsight();
  if (id === 'cordon') { S.cordonPick = true; return toast('🕸 포위망 칠 곳을 지도에서 탭하세요', true); }
  if (id === 'telepathy') return openTele(v);
  if (id === 'wanted') return openWanted();
  if (id === 'quadrant') return openQuadrant();
  if (id === 'swap') return openSwap();
  if (id === 'copy') return openCopy();
  if (id === 'snipe') { S.snipeKind = 'snipe'; return openSnipe(); }
  if (id === 'mfRifle') { S.snipeKind = 'mfRifle'; return openSnipe(); }
  if (id === 'mfCheck') {
    const list = Object.entries(room.players).filter(([pid, p]) => pid !== S.pid && p.role && Logic.alive(p, hits[pid]));
    if (!list.length) return toast('조사할 사람이 없어요');
    return openPick('🔍 조사', '마피아인지 확인할 사람을 고르세요 (나만 봐요)', list.map(([pid, p]) => [pid, { name: p.name }, S.mfChecked[pid] ? `지난 조사: ${S.mfChecked[pid]}` : '']), pid => {
      if (!Logic.augReady(S.augs.mfCheck, now())) return;
      const res = room.players[pid].role === 'chaser' ? '마피아' : '시민';
      S.mfChecked[pid] = res; setCooldown('mfCheck');
      toast(`🔍 ${room.players[pid].name}: ${res === '마피아' ? '🔴 마피아!' : '🟢 시민'}`, true); vibrate(res === '마피아' ? [200, 80, 200] : 80); renderGame();
    });
  }
  if (id === 'mfGuard') return openPick('🩺 보호', '누구를 5분 동안 지킬까요?', [['self', { name: '나' }, '내가 보호받아요'], ['qr', { name: 'QR 찍어서 다른 사람' }, '지킬 사람의 QR을 찍어요']], k => (k === 'self' ? doGuard(S.pid) : openScanner('guard')));
  if (id === 'bloodOath') {
    const dead = Object.entries(room.players).filter(([pid, p]) => pid !== S.pid && p.role === me.role && !Logic.alive(p, hits[pid]));
    if (!dead.length) return toast('살릴 팀원이 없어요');
    return openScanner('revive');
  }
  if (id === 'reroll') return openReroll();
  if (id === 'alchemy') return openAlchemy();
  if (id === 'doppel') return openDoppel();
  if (id === 'fakePing') { S.pingFake = true; toast('🎭 가짜 핑 찍을 곳을 꾹 누르세요', true); return; }
  if (['trap', 'decoy', 'domain', 'selfDestruct', 'whistle', 'fakeTreasure', 'magnet', 'ink', 'cctv', 'trail', 'steal', 'silence', 'smoke', 'hideout', 'tracker', 'drone', 'hound', 'net', 'spyCam', 'cheer', 'clue', 'predict', 'shelter', 'iceMine', 'scanPulse', 'freezeFrame', 'remoteThaw'].includes(id) && !here) return toast('GPS 신호를 기다리는 중…');
  // 진짜 위치 기준 가장 가까운 살아 있는 상대 (max 이내)
  const nearestFoe = (max = Infinity) => {
    let best = null;
    for (const [pid, p] of Object.entries(room.players)) {
      if (!p.role || p.role === me.role || p.lat == null || !Logic.alive(p, hits[pid])) continue;
      const d = Logic.dist(here, p); if (d <= max && (!best || d < best.d)) best = { pid, d, p };
    }
    return best;
  };
  if (id === 'timeThief') return useTimeThief(me, t, v);
  if (id === 'megaphone') { $('#megaInput').value = ''; $('#ov-mega').classList.add('on'); setTimeout(() => $('#megaInput').focus(), 50); return; }
  if (id === 'heal') {
    const hp = Logic.hpOf({ ...me, selfDmg: S.selfDmg, augs: S.augs }, (room.hits || {})[S.pid]), h = Math.min(v, RULES.HP_MAX - hp);
    if (h <= 0) return toast('체력이 이미 가득해요');
    S.selfDmg -= h; S.lastWrite = 0; toast(`응급처치! 체력 +${Math.round(h)}`, true);
    setCooldown(id);
  } else if (TERR_AUGS.includes(id)) {
    return terrAug(id, room, me, t);
  } else if (id === 'stRefill') {
    S.st = stMaxOf(me.role); toast('에너지 드링크! 스태미나 가득', true);
    setCooldown(id);
  } else if (id === 'radar') {
    setCooldown(id, { until: t + v * 1000 }); toast(`순간 포착 ${v}초! 모든 도망자 위치 표시`, true);
    for (const [pid, p] of Object.entries(room.players)) if (p.role === 'runner' && Logic.alive(p, hits[pid])) detectedBy(pid, 'radar');
  } else if (id === 'stealth') {
    setCooldown(id, { until: t + v * 1000 }); update(meRef(), { stealthUntil: t + v * 1000 }); toast(`투명화 ${v}초! 화살표에 안 잡혀요`, true);
  } else if (id === 'trap') {
    push(roomRef('traps'), { by: S.pid, role: me.role, ...here, until: t + Logic.AUGS.trap.life * 1000 });
    setCooldown(id); toast('덫을 설치했어요 (5분)', true);
  } else if (id === 'decoy') {
    update(meRef(), { decoy: { ...here, at: t, brg: 0, ms: 0, maxD: 0, until: t + v * 1000, joy: 1 } }); S.joyKey = 'decoy';
    setCooldown(id, { until: t + v * 1000 }); toast(`분신 ${v}초! 왼쪽 아래 조이스틱으로 조종하세요`, true);
  } else if (id === 'whistle') {
    // 가장 가까운(진짜 위치) 살아 있는 도망자 폰을 진동시킴
    let best = null;
    for (const [pid, p] of Object.entries(room.players)) {
      if (p.role !== 'runner' || p.lat == null || !Logic.alive(p, (room.hits || {})[pid])) continue;
      const d = Logic.dist(here, p); if (!best || d < best.d) best = { pid, d };
    }
    if (!best) return toast('진동시킬 도망자가 없어요');
    push(roomRef('events'), { type: 'whistle', by: S.pid, target: best.pid, at: serverTimestamp() });
    setCooldown(id); toast('삐익—! 호루라기를 불었어요', true); sfx('whistle');
  } else if (id === 'selfDestruct') {
    const a = Logic.AUGS.selfDestruct, hits = room.hits || {};
    const myHp = Logic.hpOf({ ...me, selfDmg: S.selfDmg, augs: S.augs }, hits[S.pid]);
    S.selfDmg += myHp / 2; S.lastWrite = 0; // 내 체력 절반
    const targets = Object.entries(room.players).filter(([pid, p]) => p.role && p.role !== me.role && p.lat != null && Logic.alive(p, hits[pid])
      && !(p.role === 'runner' && ((hits[pid] && hits[pid].invUntil) || 0) > t) && Logic.dist(here, p) <= a.r).map(([pid]) => pid);
    targets.forEach(pid => runTransaction(roomRef('hits/' + pid), cur => ({ ...(cur || {}), ext: ((cur && cur.ext) || 0) + a.v })).catch(e => console.error(e)));
    push(roomRef('events'), { type: 'blast', by: S.pid, targets, lat: here.lat, lng: here.lng, r: a.r, at: serverTimestamp() });
    setCooldown(id); toast(`자폭! 내 체력 절반, 상대 ${targets.length}명에게 -${a.v}`, true); sfx('boom'); flash('rgba(255,122,69,1)');
  } else if (id === 'domain') {
    const a = Logic.AUGS.domain, r = Logic.augDomainM(v);
    push(roomRef('zones'), { by: S.pid, role: me.role, ...here, r, until: t + a.sec * 1000 }); S.rpExtra = { r };
    setCooldown(id, { until: t + a.sec * 1000 }); toast(`영역전개! 반경 ${r}m, ${a.sec}초`, true);
    flash('rainbow');
  } else if (id === 'mugung') {
    // 노래 4.3초(부엉이가 고개 다 돌릴 때까지) → 10초 판정. 판정은 각 도망자 폰이 자기 속도로 함
    const a = Logic.AUGS.mugung, from = t + a.warn * 1000;
    update(roomRef(), { mugung: { by: S.pid, from, to: from + v * 1000 } });
    push(roomRef('events'), { type: 'mugung', by: S.pid, at: serverTimestamp() });
    setCooldown(id, { until: from + v * 1000 }); toast('🌸 무궁화 꽃이 피었습니다!', true);
  } else if (id === 'mapHide') {
    update(meRef(), { mapHideUntil: t + v * 1000 });
    setCooldown(id, { until: t + v * 1000 });
    toast(`🫥 ${v}초 동안 미니맵에서 숨어요`, true);
  } else if (id === 'trackNow') { // 추격자 기본 스킬: 화살표를 지금 바로 (끝나는 시각은 augs/trackNow.until에 남아서 새로고침해도 유지)
    const x = S.augs.trackNow || {}, left = x.left ?? RULES.TRACK_USES;
    if (left <= 0) return toast('이번 판에는 다 썼어요');
    if (Logic.phaseAt(t, room.startAt, room.timeShift).phase !== 'chase') return toast('추격이 시작되면 쓸 수 있어요');
    setCooldown(id, { until: t + v * 1000, left: left - 1 });
    toast(`🎯 ${v}초 동안 화살표가 떠요 (남은 ${left - 1}회)`, true);
  } else if (id === 'teamChat') {
    const co = room.chatOpen && room.chatOpen[me.role], until = Math.max((co && co.until) || 0, t + v * 1000);
    update(roomRef('chatOpen/' + me.role), { by: S.pid, until });
    push(roomRef('events'), { type: 'chatOpen', by: S.pid, role: me.role, at: serverTimestamp() });
    setCooldown(id, { until }); openChat(); // 대화방이 바로 열림 (닫아도 위의 💬 버튼으로 다시)
  } else if (id === 'heartbeat') {
    S.hbNext = 0; setCooldown(id, { until: t + v * 1000 });
    toast(`💓 심장박동 ${v}초! 가까울수록 빨리 뛰어요`, true);
  } else if (id === 'shadowStep') {
    const a = Logic.AUGS.shadowStep;
    S.shadowHit = {}; setCooldown(id, { until: t + v * 1000 });
    toast(`👣 그림자 밟기 ${v}초! 도망자의 ${a.back}초 전 자리를 밟으세요`, true);
  } else if (id === 'timeBomb') {
    const a = Logic.AUGS.timeBomb;
    push(roomRef('bombs'), { by: S.pid, holder: S.pid, prev: null, passes: 0, until: t + v * 1000 });
    setCooldown(id); toast(`💣 시한폭탄! ${v}초 안에 ${a.r}m 안으로 가서 넘기세요`, true); vibrate([100, 60, 100]);
  } else if (id === 'jam') {
    update(meRef(), { jamUntil: t + v * 1000 });
    setCooldown(id, { until: t + v * 1000 }); toast(`📡 나침반 교란 ${v}초!`, true);
  } else if (id === 'fakeTreasure') {
    push(roomRef('fakes'), { by: S.pid, role: me.role, ...here, until: t + v * 1000 });
    setCooldown(id); toast('가짜 보물을 놓았어요 (5분)', true);
  } else if (id === 'magnet') {
    // 가장 가까운 증강 지점(내 눈에 보이는 것: 진짜 지점 + 상대가 놓은 가짜 보물)을 v미터 끌어옴
    let best = null;
    for (const [sid, sp] of Object.entries(room.spots || {})) if ((sp.at || 0) <= t) { const d = Logic.dist(here, sp); if (!best || d < best.d) best = { path: 'spots/' + sid, d }; }
    for (const [fid, f] of Object.entries(room.fakes || {})) if (f.role !== me.role && (f.until || 0) > t) { const d = Logic.dist(here, f); if (!best || d < best.d) best = { path: 'fakes/' + fid, d }; }
    if (!best) return toast('끌어올 증강 지점이 없어요');
    runTransaction(roomRef(best.path), cur => {
      if (!cur || (cur.at || 0) > t || (cur.until != null && cur.until <= t)) return;
      return { ...cur, ...Logic.pullToward(cur, here, v), ...(best.path.startsWith('spots/') ? { at: t } : {}) }; // 끌어온 지점은 리셋 시간도 새로
    }).catch(e => console.error(e));
    setCooldown(id); toast(`🧲 자석! 증강 지점을 ${Math.round(Math.min(v, best.d))}m 끌어왔어요`, true); sfx('magnet');
  } else if (id === 'ink') {
    let best = null;
    for (const [pid, p] of Object.entries(room.players)) {
      if (!p.role || p.role === me.role || p.lat == null || !Logic.alive(p, hits[pid])) continue;
      const d = Logic.dist(here, p); if (!best || d < best.d) best = { pid, d };
    }
    if (!best) return toast('먹물을 뿌릴 상대가 없어요');
    if (mirrored(best.pid, 'ink')) { update(meRef(), { inkUntil: t + v * 1000 }); setCooldown(id); return renderGame(); }
    update(roomRef('players/' + best.pid), { inkUntil: t + v * 1000 });
    push(roomRef('events'), { type: 'ink', by: S.pid, target: best.pid, at: serverTimestamp() });
    setCooldown(id); toast(`🦑 먹물 발사! ${room.players[best.pid].name}의 지도를 ${v}초 가렸어요`, true); sfx('ink');
  } else if (id === 'counter') {
    setCooldown(id, { until: t + v * 1000 }); toast(`🛡 카운터 ${v}초! 지금 잡히면 추격자 체력 -${Logic.AUGS.counter.dmg}`, true);
  } else if (id === 'taunt') {
    const hp = Logic.hpOf({ ...me, selfDmg: S.selfDmg, augs: S.augs }, hits[S.pid]);
    S.selfDmg -= Math.min(20, RULES.HP_MAX - hp); S.st = stMaxOf(me.role); S.lastWrite = 0;
    update(meRef(), { tauntUntil: t + v * 1000 });
    push(roomRef('events'), { type: 'taunt', by: S.pid, at: serverTimestamp() });
    setCooldown(id, { until: t + v * 1000 }); toast(`🤪 도발! ${v}초 위치 공개 · 체력 +20`, true);
  } else if (id === 'storm') {
    update(roomRef(), { storm: { by: S.pid, at: t, until: t + v * 1000 } });
    push(roomRef('events'), { type: 'storm', by: S.pid, at: serverTimestamp() });
    setCooldown(id, { until: t + v * 1000 }); toast('🌀 자기장! 구역이 줄어들기 시작해요', true); flash('rainbow');
  } else if (id === 'siren') {
    push(roomRef('events'), { type: 'siren', by: S.pid, at: serverTimestamp() });
    setCooldown(id); toast('🚨 사이렌! 도망자 폰이 울려요', true);
  } else if (id === 'cctv') {
    push(roomRef('cams'), { by: S.pid, role: me.role, ...here, until: t + Logic.AUGS.cctv.life * 1000 });
    setCooldown(id); toast(`📹 CCTV 설치 (5분 · 반경 ${v}m)`, true); sfx('cam');
  } else if (id === 'trail') {
    let best = null;
    for (const [pid, p] of Object.entries(room.players)) {
      if (p.role !== 'runner' || p.lat == null || !Logic.alive(p, hits[pid])) continue;
      const d = Logic.dist(here, p); if (!best || d < best.d) best = { pid, d };
    }
    if (!best) return toast('추적할 도망자가 없어요');
    if (mirrored(best.pid, 'trail')) { update(roomRef('players/' + best.pid), { revTrail: { target: S.pid, until: t + v * 1000 } }); setCooldown(id); return renderGame(); }
    setCooldown(id, { until: t + v * 1000, target: best.pid }); toast(`👣 발자국 추적: ${room.players[best.pid].name} (${Logic.AUGS.trail.delay}초 늦게 보여요)`, true);
  } else if (id === 'steal') {
    const f = nearestFoe(v);
    if (!f) return toast(`${v}m 안에 상대가 없어요`);
    if (mirrored(f.pid, 'steal')) { // 거울: 거꾸로 내 증강을 빼앗김
      const back = Logic.takeable(S.augs, f.p.role, f.p.augs);
      setCooldown(id);
      if (back.length) { const k = back[Math.floor(Math.random() * back.length)]; loseAug(k); update(roomRef(`players/${f.pid}/augs/${k}`), { got: 1 }); }
      return renderGame();
    }
    const ids = Logic.takeable(f.p.augs, me.role, S.augs);
    if (!ids.length) return toast(`${f.p.name}에게 빼앗을 수 있는 증강이 없어요`);
    const pick = ids[Math.floor(Math.random() * ids.length)];
    update(roomRef('players/' + f.pid + '/augs'), { [pick]: null });
    push(roomRef('events'), { type: 'steal', by: S.pid, target: f.pid, aug: pick, at: serverTimestamp() });
    setCooldown(id); sfx('steal'); gainAug(pick, `🫳 ${f.p.name}에게서 소매치기`);
  } else if (id === 'silence') {
    const f = nearestFoe();
    if (!f) return toast('침묵시킬 상대가 없어요');
    if (mirrored(f.pid, 'silence')) { update(meRef(), { silenceUntil: t + v * 1000 }); setCooldown(id); return renderGame(); }
    update(roomRef('players/' + f.pid), { silenceUntil: t + v * 1000 });
    push(roomRef('events'), { type: 'silence', by: S.pid, target: f.pid, at: serverTimestamp() });
    setCooldown(id); toast(`🔇 ${f.p.name} 침묵! ${v / 60}분 동안 스킬 봉인`, true);
  } else if (id === 'supply') {
    const area = room.settings && room.settings.area, a = Logic.AUGS.supply;
    if (!area) return toast('구역 정보가 없어요');
    push(roomRef('supplies'), { by: S.pid, ...Logic.randomSpot(area), dropAt: t + a.v * 1000, pubAt: t + (a.v + a.pub) * 1000 });
    setCooldown(id); toast(`📦 보급 상자 ${a.v / 60}분 뒤 도착 (자리는 나만 알아요)`, true);
  } else if (id === 'gamble') {
    setCooldown(id);
    if (Math.random() < v / 100) { toast('🎲 도박 성공!', true); gainRandom('🎲 도박'); }
    else {
      const mine = Object.keys(S.augs).filter(k => k !== 'gamble' && Logic.AUGS[k] && !['job', 'base'].includes(Logic.AUGS[k].role)); // 마피아 직업 능력은 안 잃음
      if (!mine.length) toast('🎲 도박 실패… 잃을 증강이 없어서 무사해요', true);
      else { const k = mine[Math.floor(Math.random() * mine.length)]; loseAug(k); toast(`🎲 도박 실패… [${Logic.AUGS[k].name}]을(를) 잃었어요`, true); vibrate(300); }
    }
  } else if (id === 'smoke') {
    const a = Logic.AUGS.smoke;
    push(roomRef('smokes'), { by: S.pid, role: me.role, ...here, until: t + a.sec * 1000 });
    setCooldown(id, { until: t + a.sec * 1000 }); toast(`💨 연막탄 ${a.sec}초! 연기 안에선 안 잡혀요`, true);
  } else if (id === 'exit') {
    setCooldown(id, { until: t + v * 1000 }); toast(`🚪 비상구 ${v}초! 구역 밖에 나가도 괜찮아요`, true);
  } else if (id === 'disguise') {
    update(meRef(), { disguiseUntil: t + v * 1000 });
    setCooldown(id, { until: t + v * 1000 }); toast(`🎭 위장 ${v}초! 상대 지도에서 추격자처럼 보여요`, true);
  } else if (id === 'hideout') {
    const a = Logic.AUGS.hideout;
    setCooldown(id, { until: t + a.sec * 1000, lat: here.lat, lng: here.lng }); toast('🏠 은신처! 1분 동안 가만히 있으면 회복', true);
  } else if (id === 'drone') {
    update(meRef(), { drone: { ...here, at: t, brg: 0, ms: 0, maxD: 0, until: t + v * 1000 } }); S.joyKey = 'drone';
    setCooldown(id, { until: t + v * 1000 }); toast(`🛸 드론 ${v}초! 왼쪽 아래 조이스틱으로 조종하세요`, true);
  } else if (id === 'hound') {
    const tg = Logic.nearestRunner(here, room.players, hits, t, room.smokes);
    if (!tg) return toast('쫓을 도망자가 없어요');
    S.hound = { lat: here.lat, lng: here.lng, target: tg.id, until: t + v * 1000, sent: 0 };
    update(meRef(), { hound: { lat: here.lat, lng: here.lng, target: tg.id, until: t + v * 1000 } });
    setCooldown(id, { until: t + v * 1000 }); toast(`🐕 사냥개 출동! ${room.players[tg.id].name}을(를) 쫓아요`, true);
  } else if (id === 'blockade') {
    if (S.blockPick) { S.blockPick = null; drawMaps(); return toast('봉쇄선 취소'); }
    S.blockPick = { pts: [] }; drawMaps();
    return toast(`🚧 지도에 두 점을 찍으세요 (최대 ${Logic.AUGS.blockade.len}m)`, true);
  } else if (id === 'net') {
    push(roomRef('nets'), { by: S.pid, role: me.role, ...here, until: t + Logic.AUGS.net.life * 1000 });
    setCooldown(id); toast('🕸 그물 설치 (3분)', true);
  } else if (id === 'altScan') {
    setCooldown(id, { until: t + v * 1000 }); toast(`📡 고도 탐지기 ${v}초!`, true);
  } else if (id === 'afterimage') {
    update(meRef(), { lagUntil: t + v * 1000 }); S.lastWrite = 0;
    setCooldown(id, { until: t + v * 1000 }); toast(`👻 잔상 ${v}초! 내 위치가 ${Logic.AUGS.afterimage.lag}초 늦게 보여요`, true);
  } else if (id === 'spyCam') {
    push(roomRef('cams'), { by: S.pid, role: me.role, ...here, r: v, spy: 1, until: t + Logic.AUGS.spyCam.life * 1000 });
    setCooldown(id); toast(`📷 감시 카메라 설치 (5분 · 반경 ${v}m)`, true); sfx('cam');
  } else if (id === 'radioJam') {
    update(roomRef(), { radioJam: { by: S.pid, until: t + v * 1000 } });
    push(roomRef('events'), { type: 'radioJam', by: S.pid, at: serverTimestamp() });
    setCooldown(id, { until: t + v * 1000 }); toast(`📡 전파 방해 ${v}초!`, true);
  } else if (id === 'cheer') {
    push(roomRef('events'), { type: 'cheer', by: S.pid, ...here, at: serverTimestamp() });
    setCooldown(id); toast(`📣 응원! ${Logic.AUGS.cheer.r}m 안 팀원 체력 +${v}`, true);
  } else if (id === 'altFake') {
    update(meRef(), { altFakeUntil: t + v * 1000 });
    setCooldown(id, { until: t + v * 1000 }); toast(`🔃 높이 위장 ${v}초!`, true);
  } else if (id === 'fog') {
    update(roomRef(), { fog: { by: S.pid, role: me.role, until: t + v * 1000 } });
    push(roomRef('events'), { type: 'fog', by: S.pid, role: me.role, at: serverTimestamp() });
    setCooldown(id, { until: t + v * 1000 }); toast(`🌫 안개 ${v}초! 상대 팀 지도가 흐려져요`, true);
  } else if (id === 'tracker') {
    let best = null;
    for (const [pid, p] of Object.entries(room.players)) {
      if (p.role !== 'runner' || p.lat == null || !Logic.alive(p, hits[pid])) continue;
      const d = Logic.dist(here, p); if (d <= v && (!best || d < best.d)) best = { pid, d };
    }
    if (!best) return toast(`${v}m 안에 도망자가 없어요`);
    const a = Logic.AUGS.tracker;
    if (mirrored(best.pid, 'tracker')) { update(meRef(), { tracked: { by: best.pid, at: t, until: t + a.sec * 1000 } }); setCooldown(id); return renderGame(); }
    update(roomRef('players/' + best.pid), { tracked: { by: S.pid, at: t, until: t + a.sec * 1000 } });
    setCooldown(id); toast(`📍 ${room.players[best.pid].name}에게 추적기 부착! (2분)`, true);
  } else if (id === 'blackout') {
    update(roomRef(), { blackout: { by: S.pid, until: t + v * 1000 } });
    push(roomRef('events'), { type: 'blackout', by: S.pid, at: serverTimestamp() });
    setCooldown(id, { until: t + v * 1000 }); toast(`🌑 블랙아웃 ${v}초!`, true);
  } else if (id === 'instinct') {
    S.instD = null; setCooldown(id, { until: t + v * 1000 }); toast(`🐺 추격 본능 ${v}초! 가까워지는 동안 스태미나가 차요`, true);
  } else if (id === 'predict') {
    const nr = Logic.nearestRunner(here, room.players, hits, t, room.smokes); if (!nr) return toast('예측할 도망자가 없어요');
    const h = (S.hist[nr.id] || []).filter(x => !x.st), b = h[h.length - 1], a = h.find(x => x.t >= t - 10000);
    if (!a || !b || Logic.dist(a, b) < 5) return toast('그 도망자는 거의 안 움직이고 있어요');
    const k = Math.cos(b.lat * Math.PI / 180), dx = (b.lng - a.lng) * k, dy = b.lat - a.lat, n = Math.hypot(dx, dy), P = m => ({ lat: b.lat + dy / n * m / 111320, lng: b.lng + dx / n * m / 111320 / k });
    setCooldown(id, { until: t + v * 1000, p0: P(25), p1: P(75) }); toast(`📈 예측선 ${v}초! 점선 쪽으로 가고 있어요`, true);
  } else if (id === 'backtrace') {
    setCooldown(id, { until: t + v * 1000 }); toast(`🔁 역추적 ${v / 60}분! 나를 탐지하면 그 추격자가 보여요`, true);
  } else if (id === 'shelter') {
    push(roomRef('shelters'), { by: S.pid, role: me.role, ...here, until: t + v * 1000 });
    setCooldown(id, { until: t + v * 1000 }); toast(`⛺ 피난처 ${v}초! 안에 있으면 체력이 차요`, true);
  } else if (id === 'allIn') {
    update(meRef(), { revealUntil: t + v * 1000 });
    setCooldown(id, { until: t + v * 1000, paid: 0 }); toast(`🎲 도박수! ${v}초 동안 내 위치가 상대에게 보여요 · 버티면 증강`, true);
  } else if (id === 'clue') {
    const nf = nearestFoe(); if (!nf) return toast('단서를 줄 도망자가 없어요');
    const h = S.hist[nf.pid] || [], b = h[h.length - 1], a = h[Math.max(0, h.length - 6)];
    const sp = a && b && b.t > a.t ? Logic.dist(a, b) / ((b.t - a.t) / 1000) : 0, acc = nf.p.racc ?? nf.p.acc ?? 0;
    const st = acc > 30 ? '🏢 건물 안인 것 같아요 (GPS 약함)' : sp > RULES.WALK_KMH / 3.6 ? '🏃 뛰는 중' : sp > 0.6 ? '🚶 걷는 중' : '🧍 멈춰 있음';
    setCooldown(id); toast(`🔎 가장 가까운 도망자: ${st}`, true);
  } else if (id === 'listen') {
    setCooldown(id, { until: t + v * 1000 }); toast(`👂 귀 기울이기 ${v}초! ${Logic.AUGS.listen.r}m 안 도망자 수가 위에 떠요`, true);
  } else if (id === 'iceMine') {
    push(roomRef('iceMines'), { by: S.pid, ...here, until: t + v * 1000 });
    setCooldown(id); toast(`🧊 빙결 지뢰 설치 (${v / 60}분)`, true);
  } else if (id === 'scanPulse') {
    const a = Logic.AUGS.scanPulse;
    setCooldown(id, { until: t + (a.r / a.sp + a.show) * 1000, at: t, ...here }); toast('📡 스캔 펄스!', true); animPulse(here, t);
  } else if (id === 'lifeBet') {
    if (!payHp(Logic.AUGS.lifeBet.hp)) return;
    setCooldown(id, { until: t + v * 1000 }); toast(`🩸 목숨 걸기! 체력 -${Logic.AUGS.lifeBet.hp} · ${v}초 동안 모든 도망자 표시`, true);
    for (const [pid, p] of Object.entries(room.players)) if (p.role === 'runner' && Logic.alive(p, hits[pid])) detectedBy(pid, 'radar');
  } else if (id === 'freezeFrame') {
    update(meRef(), { frame: { ...here, until: t + v * 1000 } });
    setCooldown(id, { until: t + v * 1000 }); toast(`📸 정지 화면 ${v}초! 상대에겐 지금 자리로 보여요`, true);
  } else if (id === 'escapeRoute') {
    setCooldown(id, { until: t + v * 1000 }); toast(`🟢 도주로 ${v}초! 초록 화살표 쪽으로 피하세요`, true);
  } else if (id === 'silent') {
    update(meRef(), { silentUntil: t + v * 1000 });
    setCooldown(id, { until: t + v * 1000 }); toast(`🤫 무음 이동 ${v}초!`, true);
  } else if (id === 'remoteThaw') {
    if (me.jailed || (me.iceSelf && (me.iceSelf.until || 0) > t)) return toast('나도 얼음이라 땡 못 해요');
    const R = Logic.AUGS.remoteThaw.r; let best = null;
    for (const [pid, p] of Object.entries(room.players)) {
      if (pid === S.pid || p.role !== 'runner' || !Logic.alive(p, hits[pid])) continue;
      const self = !p.jailed && p.iceSelf && (p.iceSelf.until || 0) > t, spot = p.jailed && p.jailed.lat != null ? p.jailed : p;
      if ((!p.jailed && !self) || spot.lat == null) continue;
      const d = Logic.dist(here, spot); if (d <= R && (!best || d < best.d)) best = { pid, d, p, self };
    }
    if (!best) return toast(`${R}m 안에 얼음인 팀원이 없어요`);
    return doRemoteThaw(best);
  } else if (id === 'sacrifice') {
    const mates = Object.entries(room.players).filter(([pid, p]) => pid !== S.pid && p.role === me.role && Logic.alive(p, hits[pid]));
    if (!mates.length) return toast('지킬 팀원이 없어요');
    const hp = Logic.hpOf({ ...me, selfDmg: S.selfDmg, augs: S.augs }, hits[S.pid]); if (hp < 2) return toast('체력이 너무 적어요');
    S.selfDmg += hp / 2; S.lastWrite = 0; hurtBy('희생');
    for (const [pid] of mates) runTransaction(roomRef('hits/' + pid), cur => ({ ...(cur || {}), invUntil: Math.max((cur && cur.invUntil) || 0, t + v * 1000) }));
    push(roomRef('events'), { type: 'sacrifice', by: S.pid, role: me.role, at: serverTimestamp() });
    setCooldown(id, { until: t + v * 1000 }); toast(`🕯 희생! 체력 -${Math.round(hp / 2)} · 팀원 ${mates.length}명 ${v}초 무적`, true);
  } else if (['mapFlip', 'rain', 'timeStop', 'goldenTime'].includes(id)) {
    if (id === 'goldenTime') { const ph = Logic.phaseAt(t, room.startAt, room.timeShift); if (ph.phase !== 'chase' || ph.remainMs > 5 * 60000) return toast('남은 시간이 5분 이하일 때만 써요'); }
    const k = FX_KEY[id];
    update(roomRef(`fx/${k}/${me.role}`), { by: S.pid, until: t + v * 1000 });
    push(roomRef('events'), { type: 'fx', k, v, by: S.pid, role: me.role, at: serverTimestamp() });
    setCooldown(id, { until: t + v * 1000 });
  } else if (id === 'rumor') {
    const area = room.settings && room.settings.area; if (!area) return toast('구역이 없어요');
    const foes = Object.entries(room.players).filter(([pid, p]) => p.role && p.role !== me.role && p.lat != null && Logic.alive(p, hits[pid]));
    if (!foes.length) return toast('소문낼 상대가 없어요');
    const [pid, p] = foes[Math.floor(Math.random() * foes.length)], sp = Logic.shownPos(p, t, room.players), b = quadOf(area);
    push(roomRef('events'), { type: 'rumor', by: S.pid, target: pid, q: (sp.lat >= b.lat ? 'n' : 's') + (sp.lng >= b.lng ? 'e' : 'w'), at: serverTimestamp() });
    setCooldown(id);
  } else if (id === 'bloodPrice') {
    const cds = Object.entries(S.augs).filter(([k, x]) => k !== id && Logic.AUGS[k] && x && (x.readyAt || 0) > t);
    if (!cds.length) return toast('쿨타임 중인 능력이 없어요');
    if (!payHp(Logic.AUGS.bloodPrice.hp)) return;
    const u = {}; for (const [k, x] of cds) { S.augs = { ...S.augs, [k]: { ...x, readyAt: t } }; u[`augs/${k}/readyAt`] = t; }
    update(meRef(), u); setCooldown(id); toast(`🩸 피의 대가! 체력 -${Logic.AUGS.bloodPrice.hp} · 능력 ${cds.length}개 쿨타임 끝`, true);
  } else if (id === 'frenzy') {
    const hp = Logic.hpOf({ ...me, selfDmg: S.selfDmg, augs: S.augs }, hits[S.pid]), h = Math.min(S.st, v, RULES.HP_MAX - hp);
    if (S.st < 1) return toast('바칠 스태미나가 없어요');
    if (h <= 0) return toast('체력이 이미 가득해요');
    S.st = 0; S.selfDmg -= h; S.lastWrite = 0; setCooldown(id); toast(`🔥 폭주! 스태미나를 전부 바치고 체력 +${Math.round(h)}`, true);
  } else if (id === 'booster') {
    setCooldown(id, { until: t + v * 1000 }); toast(`🚀 부스터 ${v}초! 스태미나가 안 닳아요`, true);
  } else if (id === 'detector') {
    setCooldown(id, { until: t + Logic.AUGS.detector.sec * 1000 }); toast(`🔍 탐지기 ${Logic.AUGS.detector.sec}초: 주변 ${v}m 상대 설치물 표시`, true);
  }
  if (!['domain', 'selfDestruct'].includes(id)) flash(GRADE_FX[gradeOf(id)][0] === 'rainbow' ? 'rainbow' : 'rgba(255,207,64,.7)');
  if (!['whistle', 'selfDestruct', 'mugung', 'magnet', 'ink'].includes(id)) sfx('skill');
  vibrate(80);
  renderGame();
}
// 시간 도둑: 방 전체의 남은 시간을 바꿈 (도망자 -2분, 추격자 +2분, 1분 밑으로는 안 줄임)
function useTimeThief(me, t, v) {
  const startAt = S.room.startAt; let delta = 0;
  runTransaction(roomRef('timeShift'), cur => {
    const nx = Logic.stealTime(me.role, cur || 0, t, startAt, v);
    if (nx == null) return;
    delta = nx - (cur || 0); return nx;
  }).then(r => {
    if (!r.committed) return toast('남은 시간이 1분 이하라 더 못 줄여요');
    setCooldown('timeThief');
    push(roomRef('events'), { type: 'time', by: S.pid, delta, at: serverTimestamp() });
    flash('rgba(245,184,0,1)'); vibrate(80); renderGame();
  }).catch(e => console.error(e));
}
// 목록에서 한 명 고르기 (현상수배·자리 바꾸기)
function openPick(title, sub, list, onPick) {
  S.pickCb = onPick;
  $('#pickTitle').textContent = title; $('#pickSub').textContent = sub;
  $('#pickList').innerHTML = list.map(([id, p, small]) => `<button class="augcard" data-t="${id}"><span><b>${esc(p.name)}</b><small>${esc(small)}</small></span></button>`).join('');
  $('#ov-pick').classList.add('on');
}
$('#pickList').onclick = e => {
  const b = e.target.closest('[data-t]'); if (!b || !S.pickCb) return;
  const cb = S.pickCb; S.pickCb = null; $('#ov-pick').classList.remove('on'); cb(b.dataset.t);
};
$('#btnPickClose').onclick = () => { $('#ov-pick').classList.remove('on'); S.pickCb = null; };
const livingOf = role => Object.entries(S.room.players).filter(([id, p]) => p.role === role && Logic.alive(p, (S.room.hits || {})[id]));
// 사분면 탐지: 구역(원은 반경, 꼭짓점은 감싸는 네모)을 가운데에서 4조각으로 나눔
function quadOf(area) {
  if (area.poly && area.poly.length) { const la = area.poly.map(q => q[0]), lo = area.poly.map(q => q[1]), s = Math.min(...la), n = Math.max(...la), w = Math.min(...lo), e = Math.max(...lo); return { lat: (s + n) / 2, lng: (w + e) / 2, s, n, w, e }; }
  const dl = (area.r || RULES.AREA_R) / 111195, dg = (area.r || RULES.AREA_R) / (111195 * Math.cos(area.lat * Math.PI / 180));
  return { lat: area.lat, lng: area.lng, s: area.lat - dl, n: area.lat + dl, w: area.lng - dg, e: area.lng + dg };
}
const QUAD = { nw: '↖ 북서쪽', ne: '↗ 북동쪽', sw: '↙ 남서쪽', se: '↘ 남동쪽' };
const FX_KEY = { mapFlip: 'flip', rain: 'rain', timeStop: 'stop', goldenTime: 'gold' };
// 체력을 바치는 능력: 바친 뒤에도 살아 있어야 씀
function payHp(n) {
  const me = S.room.players[S.pid], hp = Logic.hpOf({ ...me, selfDmg: S.selfDmg, augs: S.augs }, (S.room.hits || {})[S.pid]);
  if (hp <= n) { toast(`체력이 ${n}보다 많아야 쓸 수 있어요`); return false; }
  S.selfDmg += n; S.lastWrite = 0; return true;
}
// 포위망: 지도를 탭한 곳
function cordonClick(ll) {
  S.cordonPick = false;
  const t = now(), v = av('cordon'); if (!S.augs.cordon || !Logic.augReady(S.augs.cordon, t)) return;
  setCooldown('cordon', { until: t + v * 1000, lat: ll.lat, lng: ll.lng });
  toast(`🕸 포위망 ${v}초! 안에 들어온 도망자가 보여요`, true); sfx('skill'); vibrate(80); drawMaps(); renderGame();
}
// 스캔 펄스: 퍼지는 원 (부드럽게)
function animPulse(c, at) {
  const mo = maps.gmap; if (!mo) return;
  const a = Logic.AUGS.scanPulse, ring = L.circle([c.lat, c.lng], { radius: 1, color: '#ffcf40', weight: 4, fill: false, interactive: false }).addTo(mo.map);
  const step = () => { const r = a.sp * (now() - at) / 1000; if (r >= a.r) return ring.remove(); ring.setRadius(r); ring.setStyle({ opacity: 1 - .6 * r / a.r }); requestAnimationFrame(step); };
  step();
}
const pulseHit = (x, p, t) => { const a = Logic.AUGS.scanPulse, d = Logic.dist(x, p); if (d > a.r) return false; const at = x.at + d / a.sp * 1000; return t >= at && t <= at + a.show * 1000; };
async function doRemoteThaw(b) {
  const t = now(), inv = Logic.MODE_RULES.ICE_INV_SEC;
  if (b.self) await update(roomRef(`players/${b.pid}/iceSelf`), { until: 0 });
  else { const r = await runTransaction(roomRef(`players/${b.pid}/jailed`), cur => (cur ? null : undefined)); if (!r.committed) return toast('이미 풀려났어요'); }
  await update(roomRef('hits/' + b.pid), { invUntil: t + inv * 1000 });
  push(roomRef('events'), { type: 'rescue', ice: 1, by: S.pid, target: b.pid, at: serverTimestamp() });
  setCooldown('remoteThaw'); toast(`🔥 ${b.p.name} 원거리 땡! ${inv}초 무적`, true); flash('rgba(60,207,122,.9)'); vibrate([100, 50, 100]); sfx('escape'); renderGame();
}
function openTele(v) {
  const room = S.room, me = room.players[S.pid], hits = room.hits || {};
  const list = Object.entries(room.players).filter(([pid, p]) => pid !== S.pid && p.role === me.role && Logic.alive(p, hits[pid]));
  if (!list.length) return toast('고를 팀원이 없어요');
  openPick('🔮 텔레파시', `${v}초 동안 서로의 실시간 위치가 보여요`, list.map(([pid, p]) => [pid, { name: p.name }, '팀원']), pid => {
    const t = now(); if (!Logic.augReady(S.augs.telepathy, t)) return;
    update(meRef(), { tele: { with: pid, until: t + v * 1000 } });
    push(roomRef('events'), { type: 'tele', by: S.pid, target: pid, at: serverTimestamp() });
    setCooldown('telepathy', { until: t + v * 1000 }); toast(`🔮 ${room.players[pid].name}와 텔레파시 ${v}초`, true); sfx('skill'); vibrate(80); renderGame();
  });
}
function openQuadrant() {
  const room = S.room, area = room.settings && room.settings.area;
  if (!area) return toast('구역이 없어요');
  if (radioJammed(now())) return toast('📡 전파 방해 중이라 탐지가 안 돼요');
  openPick('🧭 사분면 탐지', '어느 조각을 볼까요? 그 안의 도망자 수를 알려 줘요', Object.entries(QUAD).map(([k, n]) => [k, { name: n }, '']), q => {
    const t = now(); if (!Logic.augReady(S.augs.quadrant, t)) return;
    const b = quadOf(area), hits = room.hits || {};
    // 상대 화면에 보이는 위치 기준(분신·자리 바꾸기 등 반영), 투명화 중인 도망자는 안 잡힘
    const n = Object.entries(room.players).filter(([id, p]) => p.role === 'runner' && p.lat != null && Logic.alive(p, hits[id]) && !((p.stealthUntil || 0) > t))
      .filter(([, p]) => { const sp = Logic.shownPos(p, t, room.players); return (sp.lat >= b.lat ? 'n' : 's') + (sp.lng >= b.lng ? 'e' : 'w') === q; }).length;
    S.quadShow = { q, n, b, until: t + av('quadrant') * 1000 };
    setCooldown('quadrant'); toast(`🧭 ${QUAD[q]}: 도망자 ${n}명`, true); vibrate(80); sfx('ping'); renderGame();
  });
}
function openWanted() {
  const list = livingOf('runner');
  if (!list.length) return toast('현상수배할 도망자가 없어요');
  openPick('🎯 현상수배', `${Logic.AUGS.wanted.v}초 동안 추격자 전원에게 진짜 위치가 보여요`, list.map(([id, p]) => [id, p, '도망자']), tid => {
    const t = now(), v = av('wanted'), name = (S.room.players[tid] || {}).name;
    if (!Logic.augReady(S.augs.wanted, t)) return;
    if (mirrored(tid, 'wanted')) { update(meRef(), { wantedUntil: t + v * 1000 }); setCooldown('wanted', { until: t + v * 1000 }); return renderGame(); }
    update(roomRef('players/' + tid), { wantedUntil: t + v * 1000 });
    push(roomRef('events'), { type: 'wanted', by: S.pid, target: tid, at: serverTimestamp() });
    setCooldown('wanted', { until: t + v * 1000 }); toast(`🎯 ${name} 현상수배! ${v}초 동안 위치 공개`, true); sfx('wanted'); flash('rgba(168,85,247,.9)'); vibrate(80);
    renderGame();
  });
}
function openSwap() {
  const list = livingOf('runner').filter(([id, p]) => id !== S.pid && p.lat != null);
  if (!list.length) return toast('자리를 바꿀 살아 있는 팀원이 없어요');
  openPick('🔄 자리 바꾸기', `${Logic.AUGS.swap.v}초 동안 상대 화면에서 서로 위치가 바뀌어 보여요`, list.map(([id, p]) => [id, p, '팀원']), tid => {
    const t = now(), v = av('swap'), until = t + v * 1000, name = (S.room.players[tid] || {}).name;
    if (!Logic.augReady(S.augs.swap, t)) return;
    update(roomRef(), { [`players/${S.pid}/swap`]: { with: tid, until }, [`players/${tid}/swap`]: { with: S.pid, until } });
    push(roomRef('events'), { type: 'swap', by: S.pid, target: tid, at: serverTimestamp() });
    setCooldown('swap', { until }); toast(`🔄 ${name}와 자리 바꾸기 ${v}초!`, true); sfx('swap'); flash('rgba(168,85,247,.9)'); vibrate(80);
    renderGame();
  });
}
// 거울: 나를 노린 상대 스킬을 대상(도망자)의 거울이 준비돼 있으면 되돌림 → true면 효과를 쓴 사람에게
const SKILL_NAME = { ink: '먹물', silence: '침묵', snipe: '저격', steal: '소매치기', wanted: '현상수배', trail: '발자국 추적', tracker: '위치 추적기' };
function mirrored(tid, skill) {
  const p = S.room.players[tid], m = p && p.augs && p.augs.mirror, t = now();
  if (!p || p.role !== 'runner' || !Logic.augReady(m, t)) return false;
  update(roomRef(`players/${tid}/augs/mirror`), { readyAt: t + Logic.augCdMs('mirror') });
  push(roomRef('events'), { type: 'mirror', by: tid, caster: S.pid, skill, at: serverTimestamp() });
  toast(`🪞 ${p.name}의 거울에 ${SKILL_NAME[skill]}이(가) 튕겨 나왔어요!`, true); flash('rgba(200,220,255,.9)'); vibrate([100, 50, 100]);
  return true;
}
function loseAug(k) {
  const nx = { ...S.augs }; delete nx[k]; S.augs = nx;
  update(meRef(), { ['augs/' + k]: null }); renderGame();
}
const augLabelOf = id => ({ name: `[${Logic.AUGS[id].grade}] ${Logic.AUGS[id].name}` });
function openReroll() {
  const me = S.room.players[S.pid];
  const ban = augBan(me.role), ids = Object.keys(S.augs).filter(k => k !== 'reroll' && Logic.AUGS[k] && !['job', 'base'].includes(Logic.AUGS[k].role) && Logic.rollGrade(me.role, S.augs, Logic.AUGS[k].grade, Math.random, ban));
  if (!ids.length) return toast('바꿀 수 있는 증강이 없어요');
  openPick('🔄 리롤', '바꿀 증강을 고르세요 (같은 등급의 다른 증강으로)', ids.map(k => [k, augLabelOf(k), Logic.augDesc(k)]), k => {
    const nx = Logic.rollGrade(me.role, S.augs, Logic.AUGS[k].grade, Math.random, ban);
    if (!nx || !Logic.augReady(S.augs.reroll, now())) return;
    setCooldown('reroll'); loseAug(k); gainAug(nx, '🔄 리롤');
  });
}
function openAlchemy() {
  const me = S.room.players[S.pid], ids = Object.keys(S.augs).filter(k => k !== 'alchemy' && Logic.AUGS[k] && !['job', 'base'].includes(Logic.AUGS[k].role));
  if (ids.length < 2) return toast('연금술에 쓸 증강이 2개 있어야 해요');
  openPick('⚗️ 연금술 (1/2)', '버릴 증강 첫 번째', ids.map(k => [k, augLabelOf(k), Logic.augDesc(k)]), a => {
    openPick('⚗️ 연금술 (2/2)', '버릴 증강 두 번째', ids.filter(k => k !== a).map(k => [k, augLabelOf(k), Logic.augDesc(k)]), b => {
      const g = Logic.upGrade(a, b), nx = Logic.rollGrade(me.role, S.augs, g, Math.random, [a, b, ...augBan(me.role)]);
      if (!nx) return toast(`${g}등급에 남은 증강이 없어요`);
      if (!Logic.augReady(S.augs.alchemy, now())) return;
      setCooldown('alchemy'); loseAug(a); loseAug(b); gainAug(nx, `⚗️ 연금술 → ${g}`);
    });
  });
}
const DIRS = [['북', 0], ['북동', 45], ['동', 90], ['남동', 135], ['남', 180], ['남서', 225], ['서', 270], ['북서', 315]];
function openDoppel() {
  if (!S.fix) return toast('GPS 신호를 기다리는 중…');
  openPick('👥 도플갱어', `분신이 ${Logic.AUGS.doppel.v}초 동안 걸어갈 방향을 고르세요`, DIRS.map(([n, b]) => [String(b), { name: n }, `${n}쪽으로 초속 ${Logic.AUGS.doppel.ms}m`]), b => {
    const t = now(), a = Logic.AUGS.doppel;
    if (!S.fix || !Logic.augReady(S.augs.doppel, t)) return;
    update(meRef(), { decoy: { lat: S.fix.lat, lng: S.fix.lng, at: t, brg: +b, ms: a.ms, until: t + a.v * 1000 } });
    setCooldown('doppel', { until: t + a.v * 1000 }); toast(`👥 도플갱어! 분신이 ${DIRS.find(d => String(d[1]) === b)[0]}쪽으로 걸어가요`, true); renderGame();
  });
}
// 복제: 상대를 고르고 → 그 사람 증강 중 내가 쓸 수 있는 것 하나를 골라 복사
function openCopy() {
  const room = S.room, me = room.players[S.pid], hits = room.hits || {};
  const list = Object.entries(room.players).filter(([id, p]) => p.role && p.role !== me.role && Logic.alive(p, hits[id]) && Logic.takeable(p.augs, me.role, S.augs).length);
  if (!list.length) return toast('복사할 수 있는 증강을 가진 상대가 없어요');
  openPick('📋 복제', '증강을 복사할 상대를 고르세요', list.map(([id, p]) => [id, p, `${Logic.takeable(p.augs, me.role, S.augs).length}개 복사 가능`]), tid => {
    const tp = S.room.players[tid] || {}, ids = Logic.takeable(tp.augs, me.role, S.augs);
    if (!ids.length) return toast('복사할 수 있는 증강이 없어요');
    openPick(`📋 ${tp.name}의 증강`, '하나를 골라 복사해요', ids.map(id => [id, { name: augLabel(id) }, Logic.augDesc(id)]), aid => {
      if (!Logic.augReady(S.augs.copy, now())) return;
      setCooldown('copy'); gainAug(aid, '📋 복제');
    });
  });
}
// 저격: 카메라 조준경을 띄우고, 폰이 가리키는 방향(나침반) ±10°(가까우면 GPS 오차만큼 최대 ±35°) 안 40m 안의 도망자를 맞힘
function openSnipe() {
  if (!S.compass || S.heading == null) return toast('나침반이 켜져 있어야 저격할 수 있어요');
  if (!S.fix) return toast('GPS 신호를 기다리는 중…');
  S.sniping = true; $('#ov-snipe').classList.add('on');
  try {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }).then(st => {
      if (!S.sniping) return st.getTracks().forEach(x => x.stop());
      S.snipeStream = st; $('#snipeVideo').srcObject = st; $('#snipeVideo').play().catch(() => {});
    }).catch(() => {});
  } catch (e) {}
}
function closeSnipe() {
  S.sniping = false;
  if (S.snipeStream) { S.snipeStream.getTracks().forEach(x => x.stop()); S.snipeStream = null; }
  $('#ov-snipe').classList.remove('on');
}
$('#btnSnipeClose').onclick = closeSnipe;
$('#btnSnipeFire').onclick = safe(async () => {
  const room = S.room, t = now(), a = Logic.AUGS.snipe, heading = S.heading;
  closeSnipe();
  if (S.snipeKind === 'mfRifle') return fireRifle(room, t, heading);
  if (!room || !S.augs.snipe || !Logic.augReady(S.augs.snipe, t)) return;
  setCooldown('snipe'); sfx('shot'); vibrate([60, 30, 200]); flash('rgba(255,255,255,.85)');
  const tg = Logic.snipeTarget(S.fix, heading, room.players, room.hits, t);
  push(roomRef('events'), { type: 'snipe', by: S.pid, target: tg ? tg.id : null, at: serverTimestamp() });
  if (!tg) { toast('빗나갔어요…', true); return renderGame(); }
  if (mirrored(tg.id, 'snipe')) { S.selfDmg += a.dmg; S.lastWrite = 0; hurtBy('저격 반사', tg.id); return renderGame(); }
  await runTransaction(roomRef('hits/' + tg.id), cur => ({ ...(cur || {}), ext: ((cur && cur.ext) || 0) + a.dmg }));
  toast(`🎯 명중! ${room.players[tg.id].name} 체력 -${a.dmg} (${Math.round(tg.d)}m)`, true); renderGame();
});
