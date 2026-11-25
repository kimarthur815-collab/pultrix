function checkWin() {
  const room = S.room;
  if (!room || room.result || room.status !== 'playing' || S.winSent) return;
  const players = { ...room.players };
  if (players[S.pid]) players[S.pid] = { ...players[S.pid], selfDmg: S.selfDmg, augs: S.augs };
  const w = asnOn(room) ? Logic.asnWinner(room.asn, players, room.hits, now(), room.startAt, room.timeShift) : terrOn(room) ? Logic.terrWinner(room.terr, room.terrLog, terrGoldOf(room, now()), now(), room.startAt, room.timeShift) : Logic.winner(players, room.hits, now(), room.startAt, room.timeShift, modeOf(room));
  if (!w) return;
  S.winSent = true;
  runTransaction(roomRef('result'), cur => (cur ? undefined : { ...w, at: now() }))
    .then(r => { if (r.committed && room.replayId) rpFinish(room, w); return update(roomRef(), { status: 'ended' }); })
    .catch(e => { S.winSent = false; console.error(e); });
}

function renderGame() {
  const room = S.room; if (!room || S.screen !== 's-game') return;
  const me = room.players && room.players[S.pid]; if (!me || !me.role) return;
  const t = now(), hits = room.hits || {}, ph = Logic.phaseAt(t, room.startAt, room.timeShift), isC = me.role === 'chaser';
  const hp = Logic.hpOf({ ...me, selfDmg: S.selfDmg, augs: S.augs }, hits[S.pid]), alive = hp > 0, stMax = stMaxOf(me.role);
  const frozen = (me.frozenUntil || 0) > t, inv = ((hits[S.pid] && hits[S.pid].invUntil) || 0) - t;
  $('#btnMemo').style.display = memoOf(room) ? '' : 'none';
  const mafia = modeOf(room) === 'mafia';
  $('#g-role').textContent = roleName(me.role, room, me.job, S.pid);
  $('#g-role').className = 'badge ' + (mafia ? 'mf' : asnOn(room) ? (asnMeBoss() ? 'chaser' : 'runner') : terrOn(room) ? (me.role === 'tR' ? 'chaser' : 'runner') : me.role); // 마피아 모드: 옆 사람이 색으로 못 알아보게
  $('#g-phase').textContent = ph.phase === 'pre' ? '곧 시작' : ph.phase === 'hide' ? (isC ? `${roleName('runner', room)} 숨는 중` : '숨는 시간') : ph.phase === 'chase' ? (mafia ? '진행 중' : '추격 중') : '종료';
  $('#g-time').textContent = fmt(ph.remainMs);
  $('#g-hp').style.width = (hp / (me.hpMax || RULES.HP_MAX) * 100) + '%'; $('#g-hpv').textContent = Math.ceil(hp);
  $('#g-hp').parentElement.style.display = terrOn(room) ? 'none' : ''; // 땅따먹기는 체력이 없음 (그 자리에 점수판)
  $('#g-st').style.width = (S.st / stMax * 100) + '%'; $('#g-stv').textContent = `${Math.floor(S.st)}/${stMax}`;
  // 위험 표시: 체력 50 이하 주황, 25 이하 빨강 깜빡임 / 스태미나 20% 이하 깜빡임 / 마지막 1분 타이머 깜빡임
  $('#g-hp').className = hp <= 25 ? 'low' : hp <= 50 ? 'mid' : '';
  $('#g-st').className = S.st <= stMax * 0.2 ? 'low' : '';
  const lastMin = ph.phase === 'chase' && ph.remainMs <= 60000;
  $('#g-time').classList.toggle('low', lastMin);
  if (lastMin && alive && !S.minuteWarned) { S.minuteWarned = true; toast('1분 남았어요!', true); vibrate([100, 80, 100]); sfx('minute'); }

  const st = [];
  if (!alive) st.push(me.forfeit ? '기권 · 관전 중' : '탈락 · 관전 중');
  else if (isC && ph.phase === 'hide') st.push(`제자리 대기 · ${RULES.WAIT_MOVE_M}m 넘게 움직이면 체력 감소`);
  else if (isC && frozen) st.push(`잡은 뒤 정지 ${fmt(me.frozenUntil - t)} · 제자리 대기`);
  else if (!isC && inv > 0) st.push(`무적 ${fmt(inv)} · 지금 도망가세요!`);
  if (!S.fix) st.push('GPS 신호를 기다리는 중…');
  else if (S.fix.rawAcc > RULES.GPS_BAD_ACC) {
    st.push(`GPS 약함 (±${Math.round(S.fix.rawAcc)}m) · 위치 판정 잠시 멈춤 · 와이파이·정확한 위치 켜기`);
    if (!S.gpsTipShown && alive) { S.gpsTipShown = true; toast('📶 GPS가 약해요. 와이파이와 \'정확한 위치\'를 켜고, 가능하면 건물 밖으로 나가 보세요', true); }
  }
  $('#g-status').textContent = st.join(' · ');
  $('#g-warn').textContent = alive ? S.warn.join('\n') : '';

  const mode = modeOf(room);
  const iceOn = p => mode === 'ice' && p.iceSelf && (p.iceSelf.until || 0) > t;
  const canRescue = (mode === 'police' || mode === 'ice') && !isC && alive && !me.jailed && !iceOn(me) && Object.entries(room.players).some(([id, p]) => id !== S.pid && p.role === 'runner' && (p.jailed || iceOn(p)));
  $('#btnScan').style.display = (isC && alive) || canRescue ? 'block' : 'none'; // 마피아 모드: 마피아만 잡기
  $('#btnScan').disabled = isC ? !(ph.phase === 'chase' && !frozen) : false;
  $('#btnScan').textContent = !isC ? (mode === 'ice' ? '🔥 QR 찍어서 땡' : '🔓 QR 찍어서 탈옥시키기') : mode === 'ice' ? '📷 QR 찍어서 얼음' : mode === 'zombie' ? '📷 QR 찍어서 감염' : mode === 'police' ? '📷 QR 찍어서 체포' : '📷 QR 찍어서 잡기';
  // 탈락한 도망자: 피의 서약을 가진 팀원이 있으면 부활용 QR
  const reviver = !isC && !alive && Object.entries(room.players).some(([id, p]) => id !== S.pid && p.role === 'runner' && p.augs && p.augs.bloodOath && Logic.alive(p, hits[id]));
  $('#btnShowQR').style.display = (!isC && (alive || reviver)) || (mafia && alive) ? 'block' : 'none'; // 마피아 모드: 모두 QR
  $('#btnShowQR').textContent = !alive ? '🩸 부활용 QR 보여주기' : mode === 'ice' && (me.jailed || iceOn(me)) ? '🧊 땡용 QR 보여주기' : me.jailed ? '🔓 탈옥용 QR 보여주기' : '내 QR 보여주기';
  if (asnOn(room) || terrOn(room)) { $('#btnScan').style.display = 'none'; $('#btnShowQR').style.display = 'none'; } // 암살전·땅따먹기: QR 안 씀
  // 얼음땡: 스스로 얼음 버튼 (추격 중, 안 얼었을 때)
  const iceUses = RULES.ICE_SELF_USES, iceUsed = (me.iceSelf && me.iceSelf.used) || 0;
  $('#btnIce').style.display = mode === 'ice' && !isC && alive && !me.jailed && iceUses > 0 && ph.phase === 'chase' ? 'block' : 'none';
  $('#btnIce').disabled = iceOn(me) || iceUsed >= iceUses;
  $('#btnIce').textContent = iceOn(me) ? `🧊 얼음 중 ${Math.ceil((me.iceSelf.until - t) / 1000)}초` : `🧊 얼음! (${Math.max(0, iceUses - iceUsed)}번 남음)`;

  let info = '';
  const vr = mafia && room.startAt ? Logic.voteRound(t, room.startAt, room.timeShift) : null;
  $('#btnVote').style.display = vr && vr.open && alive ? '' : 'none';
  if (mafia) {
    $('#arrowBox').className = 'arrowbox';
    const I = Logic.MODE_RULES.MF_SNAP_SEC * 1000, next = room.startAt + (Math.floor((t - room.startAt) / I) + 1) * I;
    info = [vr.open ? `🗳 투표 중 ${fmt(vr.endsAt - t)}` : vr.next ? `다음 투표까지 ${fmt(vr.next - t)}` : '', `위치 갱신까지 ${Math.ceil((next - t) / 1000)}초`].filter(Boolean).join(' · ');
  }
  else if (isC || asnOn(room) || terrOn(room)) info = drawArrow();
  else {
    $('#arrowBox').className = 'arrowbox';
    const I = intelSec() * 1000, next = room.startAt + (Math.floor((t - room.startAt) / I) + 1) * I;
    info = `추격자 위치 갱신까지 ${Math.ceil((next - t) / 1000)}초`;
  }
  // 다음 정기 보상(증강 3개 중 1개)까지
  if (RULES.AUG_ON && alive && !me.offer && room.startAt) {
    const hideEnd = room.startAt + RULES.HIDE_SEC * 1000, next = hideEnd + ((me.augPicks || 0) + 1) * RULES.AUG_EVERY_SEC * 1000;
    if (next < hideEnd + RULES.GAME_SEC * 1000 + (room.timeShift || 0)) info = [info, `다음 증강까지 ${fmt(next - t)}`].filter(Boolean).join(' · ');
  }
  const ls = S.augs && S.augs.listen;
  if (alive && ls && (ls.until || 0) > t && S.fix && !radioJammed(t)) {
    const n = Object.entries(room.players).filter(([id, p]) => p.role === 'runner' && p.lat != null && Logic.alive(p, hits[id]) && !((p.silentUntil || 0) > t) && Logic.dist(S.fix, p) <= Logic.AUGS.listen.r).length;
    info = [`👂 ${Logic.AUGS.listen.r}m 안 도망자 ${n}명`, info].filter(Boolean).join(' · ');
  }
  $('#g-info').textContent = alive ? info : '관전 중 · 모든 사람의 실제 위치와 체력이 보여요';
  asnRender(room, me, t, alive, ph);
  terrRender(room, me, t, alive, ph);
  renderAugBar(alive);
  // 아래 패널 높이(증강이 많으면 여러 줄)만큼 📍·🧭·조이스틱을 위로
  const bh = $('#s-game .bottom').offsetHeight;
  if (bh && bh !== S.bottomH) { S.bottomH = bh; document.documentElement.style.setProperty('--bh', bh + 'px'); }
  const hh = $('#s-game .hud').offsetHeight;
  if (hh && hh !== S.hudH) { S.hudH = hh; document.documentElement.style.setProperty('--hh', hh + 'px'); }
  $('#btnForfeit').style.display = alive && ph.phase !== 'pre' ? '' : 'none';
  // 관전 모드: 전원 목록
  $('#specList').style.display = alive ? 'none' : 'block';
  if (!alive) {
    if (!S.specOn) { S.specOn = true; S.snap = []; drawSnap(); $('#arrowBox').className = 'arrowbox'; }
    $('#specList').innerHTML = Object.entries(room.players).filter(([, p]) => p.role).map(([id, p]) => {
      const php = id === S.pid ? hp : Logic.hpOf(p, hits[id]);
      return `<li><span><span class="badge ${p.role}">${roleName(p.role, room, p.job, id)}</span> ${p.zombieAt ? '🧟 ' : ''}${p.jailed ? (modeOf(room) === 'ice' ? '🧊 ' : '🔒 ') : ''}${esc(p.name)}${id === S.pid ? ' (나)' : ''}</span><span class="${php > 0 ? 'ok' : 'dim'}">${php > 0 ? '체력 ' + Math.ceil(php) : (p.forfeit ? '기권' : `탈락${deathLabel(p.stats, room.players) ? ' · ' + deathLabel(p.stats, room.players) : ''}`)}</span></li>`;
    }).join('');
  }

  for (const [id, p] of Object.entries(room.players)) {
    if (!p.role || S.dead[id]) continue;
    const php = id === S.pid ? hp : Logic.hpOf(p, hits[id]);
    if (php <= 0) { S.dead[id] = true; if (id !== S.pid) (S.deathQ = S.deathQ || []).push({ id, at: Date.now() }); }
  }
  S.deathQ = (S.deathQ || []).filter(q => {
    const p = room.players[q.id] || {}, lb = deathLabel(p.stats, room.players);
    if (!lb && Date.now() - q.at < 3000) return true;
    // 다른 알림에 덮이지 않게 위쪽 배너로 (마피아 모드는 정체가 드러나지 않게 이름만)
    deathBan(modeOf(room) === 'mafia' ? `💀 ${p.name} 탈락` : p.forfeit ? `🏳️ ${p.name} 기권` : `💀 ${p.name} 탈락${lb ? ' · ' + lb : ''}`); return false;
  });
  drawMaps();
}

function rotateArrow(deg) {
  const d = ((deg - S.arrowRot) % 360 + 540) % 360 - 180;
  S.arrowRot += d;
  $('#arrow').style.transform = `rotate(${S.arrowRot}deg)`;
}
function drawArrow() {
  const box = $('#arrowBox'), room = S.room;
  const off = (txt = '') => { box.classList.remove('on', 'pop'); return txt; };
  if (!room || room.status !== 'playing') return off();
  if (asnOn(room)) return asnArrow(box, off);
  if (terrOn(room)) { const ph = Logic.phaseAt(now(), room.startAt, room.timeShift), s0 = room.startAt + RULES.HIDE_SEC * 1000, P = Logic.TERR.GOLD_EVERY * 1000, nx = s0 + (Math.floor((now() - s0) / P) + 1) * P; return off(ph.phase === 'chase' ? `✨ 다음 황금 칸까지 ${fmt(nx - now())}` : ''); } // 땅따먹기: 화살표 없음
  const me = room.players && room.players[S.pid], t = now(), hits = room.hits || {};
  if (!me || me.role !== 'chaser' || !Logic.alive({ ...me, selfDmg: S.selfDmg, augs: S.augs }, hits[S.pid])) return off();
  const ph = Logic.phaseAt(t, room.startAt, room.timeShift);
  if (ph.phase === 'hide') return off(`추격 시작까지 ${fmt(ph.remainMs)}`);
  if (ph.phase !== 'chase') return off();
  if ((me.frozenUntil || 0) > t) return off('정지가 풀리면 다시 쫓을 수 있어요');
  const base = Logic.arrowBase(me, room.startAt), a = Logic.arrowState(t, base, arrowEverySec(), av('foresight') || 0);
  const trkUntil = (S.augs.trackNow && S.augs.trackNow.until) || 0, trk = trkUntil > t; // 즉시 추적(기본 스킬) 중이면 주기와 상관없이 표시
  if (!trk && !a.unlocked) return off(`화살표 열리기까지 ${fmt(a.nextInMs)}`);
  if (!trk && !a.visible) return off(`다음 화살표까지 ${fmt(a.nextInMs)}`);
  if (fogged(t)) return off('🌫 안개 속이라 화살표가 안 떠요');
  if (fxOn('stop', t)) return off('⏸ 시간 정지! 화살표가 멈췄어요');
  box.classList.add('on');
  const tg = S.fix ? Logic.nearestRunner(S.fix, room.players, hits, t, room.smokes) : null;
  // 나침반 교란: 살아 있는 도망자 중 누가 쓰고 있으면 모든 추격자 화살표가 엉뚱한 방향 (글자는 비움)
  const jammed = Object.entries(room.players).some(([id, p]) => p.role === 'runner' && (p.jamUntil || 0) > t && Logic.alive(p, hits[id]));
  tipOnce('arrow', () => `화살표는 가장 가까운 ${roleName('runner', room)} 쪽이에요. ${RULES.ARROW_NEAR_M}m 안이면 '근처에 있어요!'로 바뀌어요`);
  const popKey = trk ? 'trk:' + trkUntil : base + ':' + a.idx;
  if (S.arrowPopKey !== popKey) { // 화살표가 새로 뜰 때 펄스 + 짧은 진동
    S.arrowPopKey = popKey;
    box.classList.remove('pop'); void box.offsetWidth; box.classList.add('pop'); sfx('arrow');
    vibrate(80);
    if (tg && !jammed) detectedBy(tg.id, 'arrow'); // 역탐지
  }
  const arrow = $('#arrow'), txt = $('#arrowTxt');
  // 30m 안이면 높이 차이도 (분신·자리 바꾸기로 보이는 자리가 진짜가 아니면 안 보여 줌)
  const p0 = tg && room.players[tg.id], real = p0 && tg.p.lat === p0.lat && tg.p.lng === p0.lng;
  const altTxt = real && tg.d <= RULES.ALT_NEAR_M ? Logic.altLabel(S.alt, Logic.shownAlt(p0, S.alt, t)) : ''; // 높이 위장이면 반대로
  if (!S.fix) { arrow.style.display = 'none'; txt.textContent = 'GPS 신호를 기다리는 중…'; }
  else if (jammed) {
    arrow.style.display = 'block';
    const b = tg ? Logic.bearing(S.fix, tg.p) : 0, wrong = 90 + ((a.idx * 137 + 61) % 180) + Math.sin(t / 400) * 25;
    rotateArrow((S.compass && S.heading != null ? b - S.heading : b) + wrong);
    txt.textContent = '';
  }
  else if (!tg) { arrow.style.display = 'none'; txt.textContent = '잡을 수 있는 도망자가 없어요'; }
  else if (tg.d <= RULES.ARROW_NEAR_M) { arrow.style.display = 'none'; txt.textContent = ['근처에 있어요!', altTxt].filter(Boolean).join(' · '); }
  else {
    arrow.style.display = 'block';
    const b = Logic.bearing(S.fix, tg.p);
    rotateArrow(S.compass && S.heading != null ? b - S.heading : b);
    const unit = av('distance') || (trk ? 10 : 0); // 공간 지각 증강 · 즉시 추적은 10m 단위
    const dTxt = unit ? (unit === 1 ? `${Math.round(tg.d)}m` : `약 ${Math.max(unit, Math.round(tg.d / unit) * unit)}m`) : '';
    txt.textContent = [altTxt, dTxt, S.compass ? '' : '나침반 없음 · 화면 위쪽이 북쪽'].filter(Boolean).join(' · ');
  }
  return trk ? `🎯 즉시 추적 ${Math.ceil((trkUntil - t) / 1000)}초` : `화살표 표시 중 ${Math.ceil(a.showLeftMs / 1000)}초`;
}

/* ---------- QR ---------- */
$('#btnShowQR').onclick = () => {
  const me = S.room.players[S.pid];
  const qr = qrcode(0, 'M'); qr.addData(`GTAG1|${S.code}|${S.pid}|${me.qr}`); qr.make();
  $('#qrBox').innerHTML = qrImg(qr);
  $('#qrName').textContent = me.name;
  const qt = $('#btnShowQR').textContent;
  $('#ov-qr .dim').textContent = qt.includes('부활') ? '피의 서약을 가진 팀원이 찍으면 부활해요' : qt.includes('탈옥') ? '팀원이 이 QR을 찍으면 탈옥해요' : modeOf(S.room) === 'mafia' ? '마피아가 찍으면 탈락, 의사가 찍으면 보호돼요' : `${roleName('chaser', S.room)}가 이 QR을 찍으면 잡혀요`;
  $('#ov-qr').classList.add('on');
};
$('#btnQrClose').onclick = () => $('#ov-qr').classList.remove('on');

const openScanner = safe(async mode => {
  const ov = $('#ov-scan'), v = $('#scanVideo');
  S.scanMode = mode;
  $('#ov-scan p').textContent = mode === 'revive' ? '팀원의 부활용 QR을 비춰주세요' : mode === 'rescue' ? '갇힌 팀원의 탈옥용 QR을 비춰주세요' : mode === 'guard' ? '지킬 사람의 QR을 비춰주세요' : `${roleName('runner', S.room)} 폰의 QR을 비춰주세요`;
  ov.classList.add('on');
  try { S.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }); }
  catch (e) { closeScanner(); return toast('카메라를 열 수 없어요. 카메라 권한을 확인하세요', true); }
  v.srcObject = S.stream;
  await v.play().catch(() => {});
  const c = document.createElement('canvas'), ctx = c.getContext('2d', { willReadFrequently: true });
  S.scanning = true;
  const loop = () => {
    if (!S.scanning) return;
    if (v.readyState >= 2 && v.videoWidth) {
      const w = 640, h = Math.round(v.videoHeight * w / v.videoWidth);
      c.width = w; c.height = h; ctx.drawImage(v, 0, 0, w, h);
      const found = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: (S.scanN = (S.scanN || 0) + 1) % 2 ? 'dontInvert' : 'attemptBoth' }); // 다크 모드로 색이 뒤집힌 QR도 (한 프레임씩 번갈아. jsQR 1.4.0은 onlyInvert가 오류 나서 attemptBoth)
      if (found && found.data) { closeScanner(); ({ revive: handleRevive, rescue: handleRescue, guard: handleGuard }[S.scanMode] || handleScan)(found.data); return; }
    }
    requestAnimationFrame(loop);
  };
  loop();
});
$('#btnScan').onclick = () => { const me = S.room && S.room.players[S.pid]; openScanner(me && me.role === 'runner' ? 'rescue' : 'catch'); };
function closeScanner() {
  S.scanning = false;
  if (S.stream) { S.stream.getTracks().forEach(t => t.stop()); S.stream = null; }
  $('#ov-scan').classList.remove('on');
}
$('#btnScanClose').onclick = closeScanner;

const handleScan = safe(async text => {
  const qr = Logic.parseQR(text), t = now();
  const err = Logic.checkCatch(S.room, S.code, S.pid, qr, t, S.fix, S.selfDmg);
  if (err) return toast(err, true);
  if (modeOf(S.room) !== 'classic') return modeCatch(modeOf(S.room), qr.pid, t);
  // 흔들어 탈출이 준비된 도망자면 판정 시간(3초 + 전달 여유 1초) 동안 탈락 보류, 보상도 판정 뒤에
  const taugs = (S.room.players[qr.pid] || {}).augs || {};
  // 쉴드: 준비돼 있으면 체력만 안 깎임 (정지·무적은 그대로), 쿨타임은 여기서 기록
  const shield = Logic.augReady(taugs.shield, t);
  // 카운터: 발동 중이면 잡은 추격자 체력 -40
  const counter = taugs.counter && (taugs.counter.until || 0) > t;
  const sh = taugs.shake, rps = !shield && Logic.augReady(taugs.rps, t), R = Logic.AUGS.rps;
  // 가위바위보: 최대 3판(판마다 고르기 5초 + 결과 1.5초) 동안 탈락 보류 / 흔들어 탈출: 3초 + 전달 여유 1초
  const pend = rps ? t + (R.rounds * (R.v + 1.5) + 3) * 1000 : !shield && Logic.augReady(sh, t) ? t + (Logic.AUGS.shake.win + 1) * 1000 : 0;
  const prevFrozen = (S.room.players[S.pid] || {}).frozenUntil || 0;
  const insA = ((S.room.players[qr.pid] || {}).augs || {}).insurance, insur = !shield && !!insA && Logic.augReady(insA, t); // 보험: 체력 감소 절반
  const res = await runTransaction(ref(db, `rooms/${S.code}/hits/${qr.pid}`), cur => {
    cur = cur || { catches: 0, invUntil: 0 };
    if ((cur.invUntil || 0) > t) return; // 다른 추격자가 먼저 잡음
    return { ...cur, catches: (cur.catches || 0) + (shield ? 0 : 1), ext: (cur.ext || 0) - (insur ? RULES.CATCH_DMG / 2 : 0), invUntil: t + RULES.CATCH_COOLDOWN_SEC * 1000, by: S.pid, at: t, pendUntil: pend };
  });
  if (!res.committed) return toast('방금 다른 추격자가 잡았어요');
  if (shield) update(roomRef(`players/${qr.pid}/augs/shield`), { readyAt: t + Logic.augCdMs('shield') });
  if (insur) { update(roomRef(`players/${qr.pid}/augs/insurance`), { readyAt: t + Logic.augCdMs('insurance') }); toast('📄 상대가 보험 발동! 체력 감소 절반', true); }
  if (rps) {
    update(roomRef(`players/${qr.pid}/augs/rps`), { readyAt: t + Logic.augCdMs('rps') });
    await set(roomRef(`rps/${qr.pid}`), { chaser: S.pid, catchAt: t, round: 1, until: t + 1500 + R.v * 1000 });
  }
  if (counter) { S.selfDmg += Logic.AUGS.counter.dmg; S.lastWrite = 0; hurtBy('카운터', qr.pid); }
  if (av('vampire')) { // 흡혈: 잡을 때마다 체력 +20
    const hp = Logic.hpOf({ ...S.room.players[S.pid], selfDmg: S.selfDmg, augs: S.augs }, (S.room.hits || {})[S.pid]);
    S.selfDmg -= Math.min(av('vampire'), RULES.HP_MAX - hp); S.lastWrite = 0;
  }
  // 연쇄: 잡은 뒤 정지 시간 1분 (설정이 더 짧으면 설정대로)
  const freezeMs = (av('chain') ? Math.min(av('chain'), RULES.CATCH_COOLDOWN_SEC) : RULES.CATCH_COOLDOWN_SEC) * 1000;
  S.anchor = { lat: S.fix.lat, lng: S.fix.lng }; S.waitOut = 0;
  await update(meRef(), { frozenUntil: t + freezeMs, prevFrozenUntil: prevFrozen, anchor: S.anchor });
  await push(roomRef('events'), { type: 'catch', by: S.pid, target: qr.pid, catchAt: t, pend, shield, rps, counter: !!counter, at: serverTimestamp() });
  S.stats.catches = (S.stats.catches || 0) + 1;
  afterSettled(qr.pid, h => { if (h.esc !== t) { gainRandom('잡기 보상'); bountyPay(); } }); // 흔들어 탈출·가위바위보로 빠져나가면 보상 없음
});

/* ---------- 결과 ---------- */
function renderResult() {
  // 게임 중에 떠 있던 창은 모두 닫음 (투표·가위바위보·대화방은 게임 화면에서만 스스로 닫혀서, 끝나는 순간 떠 있으면 결과를 가림)
  closeScanner(); ['#ov-qr', '#ov-resume', '#ov-role', '#ov-invite', '#ov-aug', '#ov-insight', '#ov-pick', '#ov-shake', '#ov-snipe', '#ov-vote', '#ov-rps', '#ov-chat', '#ov-mega', '#ov-ping', '#ov-forfeit', '#ov-augInfo', '#ov-memo'].forEach(s => $(s).classList.remove('on'));
  closeSnipe();
  S.shake = null;
  $('#arrowBox').className = 'arrowbox';
  show('s-result');
  const room = S.room, r = room.result || {}, me = room.players[S.pid], hits = room.hits || {};
  if (room.replayId) rpFlush(room.replayId); // 아직 안 올린 마지막 동선
  if (S.posClearedFor !== room.startAt && me && me.role) { // 끝나면 방에 남은 내 위치를 바로 지움 (위치정보는 필요한 동안만)
    S.posClearedFor = room.startAt;
    const u = {}; for (const k of ['lat', 'lng', 'acc', 'racc', 'alt', 'lag', 'posAt', 'anchor', 'decoy', 'drone', 'revTrail', 'tracked']) u[k] = null;
    if (me.jailed) u.jailed = null; if (me.iceSelf) u['iceSelf/lat'] = u['iceSelf/lng'] = null;
    update(meRef(), u).catch(e => console.error(e));
  }
  $('#btnReplay').style.display = room.replayId ? '' : 'none';
  if (r.winner === 'asn') asnResult(room, r); else if (room.terr && modeOf(room) === 'terr') terrResult(room, r); else {
  $('#r-title').textContent = r.winner ? `${roleName(r.winner, room)} 승리!` : '게임 종료';
  $('#r-sub').textContent = [r.reason, me.role ? (me.role === r.winner ? '이겼어요 🎉' : '졌어요') : ''].filter(Boolean).join(' · ');
  const endAt = r.at || now(), P = room.players, M = Logic.mvp(P, room.startAt, endAt);
  $('#r-mvp').innerHTML = [['chaser', '잡은 횟수', p => `${(p.stats && p.stats.catches) || 0}명 잡음`], ['runner', '생존', p => `생존 ${fmt(Logic.survivalMs(p, room.startAt, endAt))}`]]
    .filter(([role]) => M[role]).map(([role, , f]) => `<div class="mvp">🏆 MVP ${roleName(role, room)} · ${esc(P[M[role]].name)} <span class="dim small">${f(P[M[role]])}</span></div>`).join('');
  $('#r-list').innerHTML = Object.entries(P).filter(([, p]) => p.role).map(([id, p]) => {
    const hp = Logic.hpOf(id === S.pid && S.gameKey ? { ...p, selfDmg: S.selfDmg, augs: S.augs } : p, hits[id]);
    const s = p.stats || {}, km = ((s.dist || 0) / 1000).toFixed(2);
    const caught = p.role === 'chaser' ? `잡음 ${s.catches || 0}` : `잡힘 ${(hits[id] && hits[id].catches) || 0} · 생존 ${fmt(Logic.survivalMs(p, room.startAt, endAt))}`;
    const augs = Object.keys(p.augs || {}).filter(k => Logic.AUGS[k]);
    return `<li class="col"><div class="top"><span><span class="badge ${p.role}">${roleName(p.role, room, p.job, id)}</span> ${p.zombieAt ? '🧟 ' : ''}${p.jailed ? (modeOf(room) === 'ice' ? '🧊 ' : '🔒 ') : ''}${esc(p.name)}${M[p.role] === id ? ' 🏆' : ''}</span><span class="${hp > 0 ? 'ok' : 'dim'}">${hp > 0 ? '체력 ' + Math.ceil(hp) : (p.forfeit ? '기권' : `탈락${deathLabel(p.stats, P) ? ' · ' + deathLabel(p.stats, P) : ''}`)}</span></div>`
      + `<span class="stat">🏃 ${km}km · 최고 ${Math.round(s.vmax || 0)}km/h · ${caught} · 스킬 ${s.skills || 0}회</span>`
      + (augs.length ? `<div class="insaugs">${augs.map(augChip).join('')}</div>` : '') + '</li>';
  }).join('');
  }
  const isHost = room.hostId === S.pid;
  $('#btnAgain').style.display = isHost ? 'block' : 'none';
  $('#r-wait').textContent = isHost ? '같은 멤버로 로비에 돌아가요 (구역·설정 그대로, 역할은 다시 랜덤)' : "방장이 '한 판 더'를 누르면 같은 방에서 다시 시작해요";
  const key = room.startAt + ':' + r.at;
  if (S.resultKey !== key) { S.resultKey = key; sfx((r.winner === 'asn' ? r.boss === S.pid : me.role && me.role === r.winner) ? 'win' : 'lose'); }
}
// 한 판 더 (방장): 같은 방 로비로, 지난 게임 기록 정리
$('#btnAgain').onclick = safe(async () => {
  const room = S.room; if (!room || room.hostId !== S.pid) return;
  const u = { status: 'lobby', result: null, startAt: null, hits: null, events: null, traps: null, zones: null, spots: null, pings: null, fakes: null, mugung: null, timeShift: null, storm: null, cams: null, supplies: null, smokes: null, blackout: null, nets: null, blocks: null, radioJam: null, fog: null, votes: null, rifle: null, rps: null, bombs: null, chats: null, chatOpen: null, fx: null, iceMines: null, shelters: null };
  u.asn = null; u.stabs = null; u.terr = null; u.terrLog = null;
  for (const id of Object.keys(room.players)) {
    for (const k of ['terrStun', 'terrHome', 'terrInv', 'hpMax', 'crewAt', 'stunUntil', 'hd', 'augIn', 'role', 'selfDmg', 'st', 'frozenUntil', 'anchor', 'qr', 'augs', 'augPicks', 'offer', 'stealthUntil', 'decoy', 'forfeit', 'stats',
      'jamUntil', 'wantedUntil', 'mugungUntil', 'inkUntil', 'swap', 'prevFrozenUntil', 'tauntUntil', 'silenceUntil', 'revive', 'disguiseUntil', 'tracked', 'revTrail', 'jailed', 'iceSelf', 'frame', 'silentUntil', 'tele', 'revealUntil', 'zombieAt', 'drone', 'hound', 'houndUntil', 'altFakeUntil', 'lagUntil', 'lag', 'out', 'job', 'guard', 'shadowStop', 'mapHideUntil']) u[`players/${id}/${k}`] = null;
  }
  await update(roomRef(), u);
});

/* ---------- 튜토리얼 (처음 접속 때 자동, 이후 '게임 방법' 버튼) ---------- */
