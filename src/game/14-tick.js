function tick() {
  const room = S.room;
  if (!room || room.status !== 'playing' || room.result || S.screen !== 's-game') return;
  const me = room.players && room.players[S.pid]; if (!me || !me.role) return;
  const t = now(), hits = room.hits || {}, ph = Logic.phaseAt(t, room.startAt, room.timeShift);
  const real = Date.now(), dt = S.lastTick ? Math.min(Math.max((real - S.lastTick) / 1000, 0), 2) : 0;
  S.lastTick = real;
  const stMax = stMaxOf(me.role), recMul = av('recoverBoost') || 1;
  S.st = Math.min(S.st, stMax); // 빼앗긴 스태미나 증강 등으로 최대치가 줄었을 때
  comebackCheck(me, hits, t); lastStandCheck(me, hits, t);
  if (asnOn(room)) asnPre(room, me, t);
  const meAlive = Logic.alive({ ...me, selfDmg: S.selfDmg, augs: S.augs }, hits[S.pid]);
  // 잡히거나 남의 공격으로 탈락한 경우도 탈락 시각·알림 기록
  if (me.out && !S.hurtOut) { S.hurtOut = true; hurtBy({ mafia: '마피아에게 잡힘', vote: '투표로 추방', shot: '경찰 저격', misfire: '시민을 쏨' }[me.out.why] || '탈락', me.out.by); }
  if (!meAlive && S.aliveWas) markDead(me, t);
  S.aliveWas = meAlive;
  rpTick(room, t, meAlive); // 리플레이용 내 동선
  recordHist(room, t, me.role); // 발자국 추적용 상대 위치 기록 (거울로 되돌려진 추적 포함)
  if (meAlive) { // 상황 팁 (처음 한 번)
    tipOnce('ping', '지도를 꾹 누르면 같은 팀에게 핑(👀 · 📍 모여 · ⚠️ 위험)을 보낼 수 있어요');
    tipOnce('rot', '지도는 두 손가락으로 돌릴 수 있어요. 🧭 버튼을 누르면 내 방향 ↔ 북쪽 고정');
    if (Object.keys(S.augs || {}).length) tipOnce('aug', '능력을 꾹 누르면 설명을 볼 수 있어요');
    if (Object.keys(room.spots || {}).length && !blackedOut()) tipOnce('spot', '지도의 ✦ 증강 지점에 가면 능력을 얻어요');
  }
  noticeSupplies(room, t);
  bombTick(room, me, t, meAlive);

  // 도망자: 미니맵 추격자 위치 갱신(고속 스캔 증강이면 더 자주)
  const mafia = modeOf(room) === 'mafia';
  if (mafia) { // 마피아: 모두의 위치를 30초마다
    const si = Math.floor((t - room.startAt - 3000) / (Logic.MODE_RULES.MF_SNAP_SEC * 1000)); // 시작 3초 뒤 첫 위치 (모두 위치를 보낸 뒤)
    if (S.mfSnapIdx !== si && meAlive) { S.mfSnapIdx = si; takeSnapshot(); }
    mafiaTick(room, me, t, meAlive);
  }
  if (me.role === 'runner' || mafia) {
    const snapIdx = Math.floor((t - room.startAt) / (intelSec() * 1000));
    if (S.lastSnapIdx == null) S.lastSnapIdx = snapIdx;
    else if (snapIdx > S.lastSnapIdx) { S.lastSnapIdx = snapIdx; if (!fogged(t) && !fxOn('stop', t) && !mafia) takeSnapshot(); } // 안개 속이면 멈춤
  }
  checkWin();
  // 탈락해도 위치는 계속 보냄 (피의 서약 부활 거리 판정용)
  if (!meAlive && S.fix && real - S.lastWrite >= 2000) { S.lastWrite = real; update(meRef(), { lat: S.fix.lat, lng: S.fix.lng, acc: Math.round(S.fix.acc), racc: Math.round(S.fix.rawAcc), posAt: Math.round(t) }); }
  if (!meAlive || ph.phase === 'over' || ph.phase === 'pre' || !S.fix) return renderGame();
  // 통계: 뛴 거리(1초에 60m 넘게 튄 건 제외, GPS가 부정확할 때는 안 셈), 최고 속도 / 러너스 하이
  const distOk = S.fix.rawAcc <= RULES.GPS_BAD_ACC;
  if (S.statPos && distOk) {
    const d = Logic.dist(S.statPos, S.fix);
    if (d < 60 * Math.max(dt, 1)) { S.stats.dist = (S.stats.dist || 0) + d; if (av('runnersHigh')) runnersHigh(me, hits, d); }
  }
  S.statPos = distOk ? { lat: S.fix.lat, lng: S.fix.lng } : null;
  if (S.fix.rawAcc <= RULES.GPS_BAD_ACC) S.stats.vmax = Math.max(S.stats.vmax || 0, Math.min(S.speed * 3.6, 45));
  if (real - S.fixAt > 5000) S.speed *= 0.5;

  let dmg = 0;
  const warn = [], buzz = []; // buzz: 체력이 깎이는(또는 곧 깎일) 경고 → 진동
  const alarm = m => { warn.push(m); buzz.push(m); };
  let hurt = null; // 이번에 체력을 깎은 규칙 (탈락 사유용)
  // 1) 추격자 대기 규칙: 숨는 시간 + 잡은 뒤 정지 시간
  // GPS가 약할 때는 억울한 벌칙이 없도록 위치 판정을 잠시 멈춤 (멀리 가 있었다면 신호가 돌아오는 즉시 다시 적용)
  const gpsOk = S.fix.rawAcc <= RULES.GPS_BAD_ACC;
  const waiting = me.role === 'chaser' && (ph.phase === 'hide' || (me.frozenUntil || 0) > t);
  let hideWaitDmg = 0;
  if (waiting) {
    if (gpsOk) {
      if (!S.anchor) { S.anchor = { lat: S.fix.lat, lng: S.fix.lng }; update(meRef(), { anchor: S.anchor }); }
      const d = Logic.dist(S.fix, S.anchor);
      if (d > RULES.WAIT_MOVE_M) {
        S.waitOut += dt;
        if (S.waitOut >= RULES.WAIT_MOVE_GRACE_SEC) {
          dmg += RULES.WAIT_MOVE_DMG * dt; alarm(`대기 중 이동! 체력 감소 중 (${Math.round(d)}m)`); hurt = { why: '대기 중 이동' };
          if (ph.phase === 'hide') hideWaitDmg = RULES.WAIT_MOVE_DMG * dt;
        }
        else alarm(`대기 중이에요! 제자리로 (${Math.round(d)}m)`);
      } else S.waitOut = 0;
    }
  } else {
    S.waitOut = 0;
    if (S.anchor) { S.anchor = null; update(meRef(), { anchor: null }); }
  }
  // 2) 구역 밖 / 탈것
  const area = room.settings && room.settings.area;
  // 자기장: 도망자에게는 줄어든 반경이 구역
  const areaK = area && asnOn(room) ? Logic.asnDuelK(room.asn, t) : area && me.role === 'runner' ? Logic.stormR(area.r, room.storm, t) / area.r : 1; // 암살전 최후의 결투: 구역이 줄어듦
  const inFull = !area || !S.fix || Logic.inArea(S.fix, area), inNow = !area || !S.fix || Logic.inArea(S.fix, area, areaK);
  const exitOn = S.augs.exit && (S.augs.exit.until || 0) > t; // 비상구: 구역 밖이어도 괜찮음
  const outside = gpsOk && !!area && !inNow && !exitOn;
  const vehicle = S.speed * 3.6 > RULES.VEHICLE_KMH;
  if (outside || vehicle) {
    S.ruleSec += dt;
    const what = outside ? (!inFull ? '구역 밖' : '🌀 자기장 밖') : '탈것 감지', left = RULES.RULE_WARN_SEC - S.ruleSec;
    if (left > 0) alarm(`${what}! ${Math.ceil(left)}초 안에 돌아오세요`);
    else {
      dmg += RULES.RULE_DMG * dt; alarm(`${what}! 체력 감소 중`);
      hurt = !outside ? { why: '탈것' } : !inFull ? { why: '구역 밖' } : { why: '자기장 밖', by: room.storm && room.storm.by };
    }
  } else if (gpsOk) S.ruleSec = 0;
  // 경찰과 도둑: 갇힌 도둑은 감옥(반경 15m 원 또는 꼭짓점 모양) 안에 — 처음 2분은 가는 시간, 들어간 뒤 나가면 10초 경고 후 체력 감소
  const jl = me.role === 'runner' && modeOf(room) === 'police' ? me.jailed : null;
  if (jl && gpsOk) {
    const MR = Logic.MODE_RULES, jail = jailOf(room), jd = jail ? Logic.dist(S.fix, jail) : 0;
    if (S.jailAt !== jl.at) { S.jailAt = jl.at; S.jailIn = false; S.jailOut = 0; }
    if (!jail || inJail(S.fix, jail)) { S.jailIn = true; S.jailOut = 0; warn.push('🔒 감옥 · 팀원이 QR을 찍으면 탈옥'); }
    else if (!S.jailIn && t - jl.at < MR.JAIL_GO_SEC * 1000) warn.push(`🔒 감옥으로 가세요! ${fmt(MR.JAIL_GO_SEC * 1000 - (t - jl.at))} 남음 (${Math.round(jd)}m)`);
    else {
      S.jailOut += dt; const left = RULES.RULE_WARN_SEC - S.jailOut;
      if (S.jailIn && left > 0) alarm(`🔒 감옥 밖! ${Math.ceil(left)}초 안에 돌아가세요`);
      else { dmg += RULES.RULE_DMG * dt; alarm('🔒 감옥 밖! 체력 감소 중'); hurt = { why: '감옥 밖' }; }
    }
  }
  // 얼음땡: 얼음(잡힘·스스로)이면 그 자리에서 10m 안 — 3초 넘게 벗어나면 초당 체력 감소
  // 잡혀서 얼음인 동안 술래가 모두 30m 밖이면 체력이 닳음 (술래가 얼음 옆을 지키지 못하게)
  if (modeOf(room) === 'ice' && me.role === 'runner') {
    const MRi = Logic.MODE_RULES, iceJ = me.jailed || null, iceS = !iceJ && me.iceSelf && (me.iceSelf.until || 0) > t ? me.iceSelf : null, ice = iceJ || iceS;
    if (!ice) { S.iceKey = null; S.iceOut = 0; }
    else {
      if (S.iceKey !== ice.at) { S.iceKey = ice.at; S.iceOut = 0; S.iceSpot = ice.lat != null ? { lat: ice.lat, lng: ice.lng } : { lat: S.fix.lat, lng: S.fix.lng }; }
      if (gpsOk) {
        const d = Logic.dist(S.fix, S.iceSpot);
        if (d > MRi.ICE_MOVE_M) {
          S.iceOut += dt; const left = RULES.WAIT_MOVE_GRACE_SEC - S.iceOut;
          if (left > 0) alarm(`🧊 얼음! 움직이면 안 돼요 (${Math.ceil(left)}초 · ${Math.round(d)}m)`);
          else { dmg += RULES.WAIT_MOVE_DMG * dt; alarm('🧊 얼음인데 움직였어요! 체력 감소 중'); hurt = { why: '얼음에서 움직임' }; }
        } else { S.iceOut = 0; warn.push(iceJ ? '🧊 얼음 · 팀원이 QR을 찍으면 땡' : `🧊 스스로 얼음 ${Math.ceil((iceS.until - t) / 1000)}초 · 못 잡혀요`); }
      }
      if (iceJ) {
        const guard = Object.entries(room.players).some(([id, p]) => p.role === 'chaser' && p.lat != null && Logic.alive(p, hits[id]) && Logic.dist(S.iceSpot, p) <= MRi.ICE_DRAIN_M);
        if (!guard) { dmg += MRi.ICE_DRAIN * dt; warn.push(`🧊 술래가 ${MRi.ICE_DRAIN_M}m 밖이라 체력이 닳고 있어요`); if (!hurt) hurt = { why: '얼음' }; }
      }
    }
  }
  // 빙결 지뢰: 얼지 않은 도망자가 밟으면 그 자리에서 얼음
  if (modeOf(room) === 'ice' && me.role === 'runner' && gpsOk && S.fix && !me.jailed && !S.mineBusy && !(me.iceSelf && (me.iceSelf.until || 0) > t)
    && !(((hits[S.pid] || {}).invUntil || 0) > t) && Logic.alive({ ...me, selfDmg: S.selfDmg, augs: S.augs }, hits[S.pid])) {
    const hit = Object.entries(room.iceMines || {}).find(([, m]) => (m.until || 0) > t && Logic.dist(S.fix, m) <= Logic.AUGS.iceMine.r);
    if (hit) {
      const [mid, m] = hit, spot = { lat: S.fix.lat, lng: S.fix.lng }; S.mineBusy = true;
      runTransaction(roomRef('iceMines/' + mid), cur => (cur ? null : undefined)).then(async r => {
        if (!r.committed) return;
        const j = await runTransaction(roomRef(`players/${S.pid}/jailed`), cur => (cur ? undefined : { at: now(), by: m.by, ice: 1, mine: 1, ...spot }));
        if (j.committed) push(roomRef('events'), { type: 'jail', ice: 1, mine: 1, by: m.by, target: S.pid, at: serverTimestamp() });
      }).catch(e => console.error(e)).finally(() => { S.mineBusy = false; });
    }
  }
  // 3) 스태미나 (뛸 때만 소모, 0이면 체력으로)
  // 상대 영역전개 안: 움직이기만 해도(초속 0.5m 넘음) 초당 3, 뛰면 평소의 5배
  let cost = Logic.staminaCostPerSec(S.speed, av('lightShoes') || RULES.WALK_KMH); // 가벼운 신발
  // 가만히 있으면 회복: 몇 m 안에 STILL_SEC초 머물고 속도도 느릴 때 (숨 고르기: 기다림 없이 바로, 활력 충전: ×2)
  { const still = stillFor(), wait = av('breather') ? 0.5 : RULES.STILL_SEC;
    if (gpsOk && still >= wait && S.speed < 0.8 && S.st < stMax) {
      S.st = Math.min(stMax, S.st + RULES.STILL_RECOVER * recMul * dt);
      tipOnce('still', () => `가만히 있으면 스태미나가 차요 (초당 ${RULES.STILL_RECOVER * recMul})`);
    } }
  if (S.augs.instinct && (S.augs.instinct.until || 0) > t && me.role === 'chaser' && gpsOk) { // 추격 본능
    const nr = Logic.nearestRunner(S.fix, room.players, hits, t, room.smokes);
    if (nr && S.instD != null && nr.d < S.instD - .3) S.st = Math.min(stMax, S.st + Logic.AUGS.instinct.st * dt);
    S.instD = nr ? nr.d : null;
  }
  if (gpsOk && Object.values(room.shelters || {}).some(z => z.role === me.role && (z.until || 0) > t && Logic.dist(S.fix, z) <= Logic.AUGS.shelter.r)) { // 피난처
    const hp = Logic.hpOf({ ...me, selfDmg: S.selfDmg, augs: S.augs }, hits[S.pid]);
    if (hp > 0 && hp < RULES.HP_MAX) { S.selfDmg -= Math.min(Logic.AUGS.shelter.heal * dt, RULES.HP_MAX - hp); warn.push('⛺ 피난처 · 체력 회복 중'); }
  }
  { const ai = S.augs.allIn; if (ai && ai.until && !ai.paid && t >= ai.until) { // 도박수: 끝까지 버팀
    S.augs = { ...S.augs, allIn: { ...ai, paid: 1 } }; update(meRef(), { 'augs/allIn/paid': 1 });
    if (Logic.alive({ ...me, selfDmg: S.selfDmg, augs: S.augs }, hits[S.pid])) { toast('🎲 도박수 성공!', true); setTimeout(() => gainRandom('🎲 도박수'), 800); }
  } }
  if (inEnemyDomain(me, t)) {
    const a = Logic.AUGS.domain;
    if (S.speed > 0.5) cost = Math.max(a.walk, cost * a.mult);
    warn.push('🌀 상대 영역전개 안! 움직이면 스태미나 폭주');
  }
  if (companionNear(me, hits, t)) cost *= 0.5;                                  // 동행
  if (fxOn('rain', t)) cost *= 2;                                               // 상대 소나기
  if (fxOn('rain', t, true)) cost *= 1.5;                                        // 우리 소나기
  if (S.augs.booster && (S.augs.booster.until || 0) > t) cost = 0;              // 부스터
  if (fxOn('gold', t, true)) cost = 0;                                           // 골든 타임
  // 그물: 상대 그물 안에선 뛰면 스태미나 대신 체력 (스태미나 0일 때와 같은 양, 5초 경고 뒤)
  const net = me.role === 'runner' && gpsOk ? Object.values(room.nets || {}).find(n => n.role !== me.role && (n.until || 0) > t && Logic.dist(S.fix, n) <= Logic.AUGS.net.v) : null;
  if (net && !S.netWas) { toast('🕸 그물! 안에서 뛰면 체력이 닳아요', true); vibrate([100, 50, 100]); }
  S.netWas = !!net;
  if (net) warn.push('🕸 그물 안 · 뛰면 체력이 닳아요');
  const sp = net ? { st: S.st, hpLoss: cost * dt } : Logic.spendStamina(S.st, cost * dt), why = net ? '🕸 그물 안' : '스태미나 0';
  S.st = sp.st; S.exh = Logic.exhaust(S.exh, sp.hpLoss, cost > 0, dt);
  if (S.st <= stMax * .3) tipOnce('stamina', () => `걸을 때(시속 ${RULES.WALK_KMH}km 이하)는 스태미나가 안 닳고, ${RULES.STILL_SEC}초 가만히 있으면 차요`);
  if (sp.hpLoss > 0 && !S.exh.hurt) { alarm(`${why}! ${Math.ceil(S.exh.left)}초 뒤부터 체력이 닳아요 · 걷거나 멈추세요`); tipOnce('exhaust', () => `${RULES.EXHAUST_RESET_SEC}초 이상 걷거나 멈추면 경고가 처음부터 다시 시작돼요`); }
  else if (sp.hpLoss > 0) {
    dmg += sp.hpLoss * (av('ironman') || 1); // 아드레날린: 체력 감소 줄임
    alarm(`${why}! 뛰면 체력이 닳아요`); hurt = net ? { why: '그물 안에서 뛰기', by: net.by } : { why: '스태미나 0에서 뛰기' };
  }
  // 5) 도망자 육감: 잡을 수 있는 상태의 추격자가 가까이 오면 진동
  const alarmM = av('alarm') && Logic.augAlarmM(av('alarm'));
  if (me.role === 'runner' && alarmM && ph.phase === 'chase') {
    let nd = Infinity;
    for (const [id, p] of Object.entries(room.players)) {
      if (p.role !== 'chaser' || p.lat == null || !Logic.alive(p, hits[id]) || (p.frozenUntil || 0) > t) continue;
      nd = Math.min(nd, Logic.dist(S.fix, p));
    }
    if (nd <= alarmM) {
      warn.push(`🚨 추격자가 ${alarmM}m 안에 있어요!`);
      if (real - S.alarmAt > 3000) { S.alarmAt = real; vibrate([150, 80, 150]); }
    }
  }
  if (asnOn(room)) asnTick(room, me, t, gpsOk, warn);
  if (terrOn(room)) terrTick(room, me, t, gpsOk, warn);
  // 6) 증강 지점 줍기, 상대 덫·가짜 보물, 정기 보상
  // 잔상용 내 위치 기록 (20초)
  if (me.role === 'runner') { (S.myTrail = S.myTrail || []).push({ t, lat: S.fix.lat, lng: S.fix.lng }); while (S.myTrail.length && t - S.myTrail[0].t > 20000) S.myTrail.shift(); }
  // 봉쇄선: 지난 위치 → 지금 위치가 선을 넘으면 (선마다 한 번) 스태미나 0 + 추격자에게 위치
  if (me.role === 'runner' && gpsOk) {
    const cur = { lat: S.fix.lat, lng: S.fix.lng };
    if (S.blockPrev) for (const [bid, bl] of Object.entries(room.blocks || {})) {
      if ((bl.until || 0) <= t || S.blockHit[bid] || !bl.a || !bl.b || !Logic.segCross(S.blockPrev, cur, bl.a, bl.b)) continue;
      S.blockHit[bid] = true; S.st = 0;
      toast('🚧 봉쇄선을 넘었어요! 스태미나 0 · 위치 공개', true); flash('rgba(255,77,79,.9)'); vibrate([200, 80, 200]); sfx('trap');
      push(roomRef('events'), { type: 'block', by: bl.by, target: S.pid, ...cur, at: serverTimestamp() });
    }
    S.blockPrev = cur;
  }
  // 사냥개: 내 폰에서 움직임 계산 (대상의 보이는 위치로 시속 8km, 대상을 못 쫓게 되면 가장 가까운 도망자), 1초마다 저장
  if (S.hound) {
    const hd = S.hound, a = Logic.AUGS.hound;
    if ((hd.until || 0) <= t) { S.hound = null; update(meRef(), { hound: null }); }
    else {
      const ok = id => { const p = room.players[id], h = hits[id]; return !!(p && p.role === 'runner' && p.lat != null && Logic.alive(p, h) && !((h && h.invUntil || 0) > t) && !((p.stealthUntil || 0) > t) && !((p.silentUntil || 0) > t) && !Logic.inSmoke(p, room.smokes, t)); };
      if (!hd.target || !ok(hd.target)) { const nt = Logic.nearestRunner(hd, room.players, hits, t, room.smokes, true); hd.target = nt ? nt.id : null; }
      const tp = hd.target && room.players[hd.target];
      if (tp) {
        const q = Logic.shownPos(tp, t, room.players), d = Logic.dist(hd, q), step = a.ms * dt;
        if (d <= Math.max(5, step)) {
          S.hound = null; update(meRef(), { hound: null });
          if (Logic.dist(q, tp) > 15) toast('🐕 사냥개가 가짜 위치에 속았어요', true);
          else { update(roomRef('players/' + hd.target), { houndUntil: t + a.show * 1000 }); push(roomRef('events'), { type: 'hound', by: S.pid, target: hd.target, at: serverTimestamp() }); }
        } else { const m = Logic.movePoint(hd, Logic.bearing(hd, q), step); hd.lat = m.lat; hd.lng = m.lng; }
      }
      if (S.hound && real - (hd.sent || 0) >= 1000) { hd.sent = real; update(meRef(), { 'hound/lat': hd.lat, 'hound/lng': hd.lng, 'hound/target': hd.target || null }); }
    }
  }
  // 고도 탐지기: 거리와 상관없이 가장 가까운 도망자의 높이 차이
  const as = S.augs.altScan;
  if (me.role === 'chaser' && as && (as.until || 0) > t) {
    const left = fmt(as.until - t);
    if (radioJammed(t)) warn.push(`📡 고도 탐지기: 전파 방해 중 · ${left}`);
    else {
      const tg = Logic.nearestRunner(S.fix, room.players, hits, t, room.smokes), p0 = tg && room.players[tg.id];
      const real0 = p0 && tg.p.lat === p0.lat && tg.p.lng === p0.lng;
      const lb = !tg ? '대상 없음' : !real0 || typeof p0.alt !== 'number' || typeof S.alt !== 'number' ? '높이를 알 수 없어요' : Logic.altLabel(S.alt, Logic.shownAlt(p0, S.alt, t)) || '비슷한 높이';
      warn.push(`📡 고도 탐지기${tg && real0 ? ` · ${p0.name}` : ''}: ${lb} · ${left}`);
    }
  }
  moveStaleSpots(t);
  if (gpsOk) { checkSpots(t); checkTraps(me, t); checkFakes(me, t); checkCams(me, t); checkSupplies(me, t); }
  // 은신처: 반경 안에서 가만히 있으면 체력·스태미나 회복
  const ho = S.augs.hideout;
  if (ho && (ho.until || 0) > t && ho.lat != null && gpsOk && S.speed < 1 && Logic.dist(S.fix, ho) <= Logic.AUGS.hideout.v) {
    const a = Logic.AUGS.hideout, hp = Logic.hpOf({ ...me, selfDmg: S.selfDmg, augs: S.augs }, hits[S.pid]);
    S.selfDmg -= Math.min(a.hp * dt, RULES.HP_MAX - hp); S.st = Math.min(stMax, S.st + a.st * dt);
    warn.push('🏠 은신처에서 회복 중');
  }
  checkOffer(me, t, ph);
  // 7) 무궁화 꽃이 피었습니다: 판정 시간에 초속 1m 넘게 움직인 도망자는 스태미나 0 + 추격자 전원에게 위치 공개
  const mg = room.mugung, ma = Logic.AUGS.mugung;
  if (me.role === 'runner' && mg && t >= mg.from && t < mg.to && gpsOk && S.mugHit !== mg.from && S.speed > ma.ms) {
    S.mugHit = mg.from; S.st = 0;
    update(meRef(), { mugungUntil: t + ma.reveal * 1000 });
    push(roomRef('events'), { type: 'mugHit', by: S.pid, at: serverTimestamp() });
    toast(`🌸 움직였어요! ${ma.reveal}초 위치 공개`, true); flash('rgba(255,122,217,.95)'); vibrate([300, 100, 300]); sfx('trap');
  }

  // 그림자 밟기 (추격자): 보이는 그림자 5m 안에 들어가면 그 도망자는 2초 예고 뒤 5초 동안 멈춰야 함
  const sa = Logic.AUGS.shadowStep;
  if (me.role === 'chaser' && gpsOk) for (const sh of shadowPts(room, t)) {
    if (Logic.dist(S.fix, sh) > sa.hitR) continue;
    S.shadowHit[sh.id] = true;
    const from = t + 2000; // 알아채고 멈출 시간 + GPS 속도가 늦게 바뀌는 시간
    update(roomRef('players/' + sh.id), { shadowStop: { by: S.pid, from, to: from + sa.stop * 1000 } });
    push(roomRef('events'), { type: 'shadow', by: S.pid, target: sh.id, at: serverTimestamp() });
    toast(`👣 ${room.players[sh.id].name}의 그림자를 밟았어요!`, true); vibrate([80, 40, 80]); sfx('arrow');
  }
  // 그림자 밟기 (도망자): 멈춰야 하는 동안 초속 1m 넘게 움직이면 체력 -20 (한 번)
  const ss = me.shadowStop;
  if (me.role === 'runner' && ss && t >= ss.from && t < ss.to && gpsOk && S.shadowDmgAt !== ss.from && S.speed > sa.ms) {
    S.shadowDmgAt = ss.from; dmg += sa.dmg; hurt = { why: '그림자 밟기', by: ss.by };
    toast(`👣 움직였어요! 체력 -${sa.dmg}`, true); flash('rgba(167,139,250,.95)'); vibrate([300, 100, 300]); sfx('trap');
  }

  if (asnOn(room) && asnStunned(me, t)) dmg = 0; // 기절 중엔 더 안 깎임
  if (terrOn(room)) dmg = 0; // 땅따먹기: 체력 안 씀
  S.selfDmg += dmg; S.warn = warn;
  if (hurt && dmg > 0) hurtBy(hurt.why, hurt.by);
  // 위험 경고: 처음엔 크게 알림 + 진동, 계속되면 3초마다 진동
  if (buzz.length) {
    if (!S.buzzAt) toast(`⚠️ ${buzz[0]}`, true);
    if (!S.buzzAt || real - S.buzzAt >= 3000) { S.buzzAt = real; vibrate([250, 100, 250]); }
  } else S.buzzAt = 0;
  // 처음 숨는 시간의 대기 벌칙으로는 체력 1 밑으로 안 내려감 (GPS가 가끔 튀어서)
  if (hideWaitDmg > 0) {
    const hp = Logic.hpRaw({ ...me, selfDmg: S.selfDmg }, hits[S.pid]);
    if (hp < 1) { S.selfDmg -= Math.min(hideWaitDmg, 1 - hp); warn.push('숨는 시간 벌칙으론 체력 1 밑으로 안 내려가요'); }
  }
  comebackCheck(me, hits, t); lastStandCheck(me, hits, t);
  const dead = !Logic.alive({ ...me, selfDmg: S.selfDmg, augs: S.augs }, hits[S.pid]);
  if (dead) { markDead(me, t, true); S.aliveWas = false; }
  if (warn.length && !S.warnWas) sfx('warn'); // 경고가 새로 뜰 때만 소리
  S.warnWas = warn.length > 0;
  if (dead || real - S.lastWrite >= 2000) {
    S.lastWrite = real;
    update(meRef(), { lat: S.fix.lat, lng: S.fix.lng, posAt: Math.round(t), hd: asnHd(), acc: Math.round(S.fix.acc), racc: Math.round(S.fix.rawAcc), alt: S.alt == null ? null : Math.round(S.alt * 10) / 10, lag: (me.lagUntil || 0) > t ? lagPos(t) : null, selfDmg: Math.round(S.selfDmg * 10) / 10, st: Math.round(S.st * 10) / 10,
      stats: { ...S.stats, dist: Math.round(S.stats.dist || 0), vmax: Math.round((S.stats.vmax || 0) * 10) / 10 } });
  }
  renderGame();
}
setInterval(tick, 1000);

// 3·2·1 카운트다운: 게임 시작(숨는 시간 시작) 직전, 추격 시작 직전
function countdownLoop() {
  const room = S.room, el = $('#cd');
  const hideCd = () => { el.classList.remove('on'); S.cdLast = null; };
  if (!room || room.status !== 'playing' || room.result || S.screen !== 's-game' || !room.startAt) return hideCd();
  const me = room.players[S.pid] || {}, t = now(), hideEnd = room.startAt + RULES.HIDE_SEC * 1000;
  let label = null, go = false;
  for (const [at, goText] of [[room.startAt, me.role === 'chaser' ? '대기!' : Logic.isTerrRole(me.role) ? '칠해라!' : '숨어라!'], [hideEnd, '추격 시작!']]) {
    const rem = at - t;
    if (rem > 0 && rem <= 3000) label = String(Math.ceil(rem / 1000));
    else if (rem <= 0 && rem > -1200) { label = goText; go = true; }
  }
  if (label == null) return hideCd();
  if (label !== S.cdLast) { S.cdLast = label; el.innerHTML = `<b class="${go ? 'go' : ''}">${esc(label)}</b>`; sfx(go ? 'go' : 'tick'); vibrate(go ? [150, 60, 150] : 50); }
  el.classList.add('on');
}
setInterval(countdownLoop, 200);
function overlayLoop() {
  const room = S.room, inGame = !!room && room.status === 'playing' && !room.result && S.screen === 's-game';
  joyLoop(inGame);
  asnOverlay(inGame, room, (inGame && room.players[S.pid]) || {}, now());
  terrOverlay(inGame, room, (inGame && room.players[S.pid]) || {}, now());
  if (inGame) rpsLoop(room);
  $('#gwrap').classList.toggle('fogged', inGame && fogged(now()));
  { const t0 = now(); const g = $('#gwrap').classList; const fl = inGame && fxOn('flip', t0); if (g.contains('flipped') !== fl) { g.toggle('flipped', fl); if (maps.gmap && maps.gmap.map._rotApply) maps.gmap.map._rotApply(); } g.toggle('rainy', inGame && (fxOn('rain', t0) || fxOn('rain', t0, true))); g.toggle('stopped', inGame && fxOn('stop', t0)); g.toggle('golden', inGame && fxOn('gold', t0, true)); }
  const me = (inGame && room.players[S.pid]) || {}, t = now();
  if (inGame && modeOf(room) === 'mafia' && room.startAt) {
    const vr = Logic.voteRound(now(), room.startAt, room.timeShift), alive = Logic.alive({ ...me, selfDmg: S.selfDmg, augs: S.augs }, (room.hits || {})[S.pid]);
    if (vr.open && alive && S.voteShownK !== vr.k) { S.voteShownK = vr.k; renderVote(); $('#ov-vote').classList.add('on'); sfx('wanted'); vibrate([150, 80, 150]); }
    if ($('#ov-vote').classList.contains('on')) { if (vr.open && alive) renderVote(); else $('#ov-vote').classList.remove('on'); }
  }
  // 무궁화 배너
  // 무궁화: 부엉이 술래 + 가사 (매 프레임 그리는 건 mugAnim)
  const mg = inGame && room.mugung, mEl = $('#mugung');
  if (mg && me.role && t < mg.to) { if (!mEl.classList.contains('on')) { mEl.classList.add('on'); S.mugKey = null; requestAnimationFrame(mugAnim); } }
  else if (mEl.classList.contains('on')) { mEl.classList.remove('on', 'judge', 'hit'); $('#mugFx').style.opacity = 0; }
  // 심장박동 (추격자): 가장 가까운 도망자가 80m 안이면 가까울수록 빨리 진동 + 화면 테두리
  const hb = inGame && me.role === 'chaser' && S.augs && S.augs.heartbeat;
  if (hb && (hb.until || 0) > t && S.fix && !radioJammed(t)) {
    const nr = Logic.nearestRunner(S.fix, room.players, room.hits, t, room.smokes, true), gap = nr ? Logic.beatGap(nr.d) : 0;
    if (gap && t >= (S.hbNext || 0)) {
      S.hbNext = t + gap; vibrate([70, 90, 50]);
      const fx = $('#hbFx'); fx.classList.remove('beat'); void fx.offsetWidth; fx.classList.add('beat');
    }
  }
  // 그림자 밟기에 걸린 도망자: 2초 예고 → 5초 멈춰
  const ssp = inGame && me.role === 'runner' && me.shadowStop, sEl = $('#shStop');
  if (ssp && t < ssp.to) {
    const warnP = t < ssp.from, html = warnP ? '<b>👣 그림자가 밟혔어요!<br>멈춰!</b>'
      : `<b>멈춰! ${Math.ceil((ssp.to - t) / 1000)}</b><small>움직이면 체력 -${Logic.AUGS.shadowStep.dmg}</small>`;
    if (sEl.innerHTML !== html) sEl.innerHTML = html;
    sEl.classList.add('on'); sEl.classList.toggle('judge', !warnP);
  } else sEl.classList.remove('on');
  // 시한폭탄을 들고 있으면 남은 시간
  const bEl = $('#bombBar'), myBomb = inGame && Object.values(room.bombs || {}).find(b => b && b.holder === S.pid && (b.until || 0) > t);
  if (myBomb) {
    const left = Math.ceil((myBomb.until - t) / 1000), prev = myBomb.prev && room.players[myBomb.prev];
    const html = `💣 시한폭탄 ${fmt(myBomb.until - t)}<small>${Logic.AUGS.timeBomb.r}m 안 사람에게 자동으로 넘어가요${prev ? ` · ${esc(prev.name)}에겐 못 줘요` : ''}</small>`;
    if (bEl.innerHTML !== html) bEl.innerHTML = html;
    bEl.classList.add('on'); bEl.classList.toggle('hot', left <= 10);
  } else bEl.classList.remove('on');
  chatLoop(inGame, room, me, t);
  // 팁
  tipLoop();
  const waitPh = inGame && room.startAt ? Logic.phaseAt(t, room.startAt, room.timeShift).phase : '';
  setTipLine($('#g-tip'), inGame && me.role === 'chaser' && (waitPh === 'hide' || (me.frozenUntil || 0) > t) ? waitTip('chaser') : '');
  // 흔들어 탈출
  if (S.shake && !S.shake.done) renderShake();
  // 저격 조준경: 지금 폰이 가리키는 방향
  if (S.sniping && S.heading != null) { const h = Math.round(S.heading) % 360; $('#snipeHead').textContent = `${['북', '북동', '동', '남동', '남', '남서', '서', '북서'][Math.round(h / 45) % 8]} ${h}°`; }
  // 먹물
  const ink = inGame && (me.inkUntil || 0) > t;
  $('#ink').classList.toggle('on', !!ink);
  if (ink) $('#inkTxt').textContent = `🦑 먹물! ${Math.ceil((me.inkUntil - t) / 1000)}초`;
}
