function enterRoom(code, pid, name) {
  S.code = code; S.pid = pid; S.name = name; S.areaSent = false;
  setTimeout(sndCheckOnce, 800);
  saveLocal({ code, pid, name }); roomSeen(code, pid);
  if (S.unsub) S.unsub();
  if (S.evUnsub) S.evUnsub();
  S.unsub = onValue(roomRef(), snap => {
    S.room = snap.val();
    // 꼭짓점 구역: 저장소에 따라 배열이 {0: …, 1: …} 객체로 올 수 있어서 배열로 맞춤
    const ar = S.room && S.room.settings && S.room.settings.area;
    if (ar && ar.poly && !Array.isArray(ar.poly)) ar.poly = Object.keys(ar.poly).sort((x, y) => x - y).map(k => ar.poly[k]);
    if (ar && ar.poly) ar.poly = ar.poly.map(v => (Array.isArray(v) ? v : [v[0], v[1]]));
    onRoom();
  });
  // 들어오기 5초 전부터의 알림만. 서버 시각(offset)을 받기 전에 폰 시계로 계산하면 시계가 늦은 폰에서 오래된 알림이 다시 떠서, 알림이 올 때마다 계산
  const enterReal = Date.now();
  S.evUnsub = onChildAdded(query(roomRef('events'), limitToLast(20)), s => { const e = s.val(); if (e && (e.at || 0) >= now() - (Date.now() - enterReal) - 5000) onEvent(e); });
}
function onRoom() {
  const room = S.room, me = room && room.players && room.players[S.pid];
  if (!me) return leaveLocal('방에서 나왔어요');
  if (Date.now() - (S.seenAt || 0) > 60000) { S.seenAt = Date.now(); roomSeen(S.code, S.pid); }
  Logic.applySettings(gameRules(room)); // 방장이 정한 설정을 이 폰의 규칙에 적용
  RULES.AREA_R = (room.settings && room.settings.area && room.settings.area.r) || RULE_DEFAULTS.AREA_R;
  if (room.result || room.status === 'ended') return renderResult();
  if (room.status === 'lobby') {
    if (S.gameKey) { // 한 판 더: 지난 게임 상태 정리
      S.gameKey = null; S.resultKey = null;
      ['#ov-qr', '#ov-role', '#ov-aug', '#ov-insight', '#ov-mega', '#ov-ping', '#ov-forfeit', '#ov-pick', '#ov-shake', '#ov-snipe', '#ov-vote', '#ov-rps', '#ov-chat', '#ov-augInfo'].forEach(x => $(x).classList.remove('on'));
      closeSnipe();
      S.shake = null;
      closeScanner();
    }
    if (S.screen !== 's-lobby') show('s-lobby');
    return renderLobby();
  }
  if (room.status === 'playing') notifyPings(room, me);
  if (room.status === 'playing') {
    if (!me.role) return leaveLocal('이미 시작한 게임이에요');
    enterGame(); renderGame(); checkWin(); // 1초 루프를 기다리지 않고 바로 판정
  }
}
function onEvent(e) {
  if (e.type === 'skill' || e.type === 'skillPath') return; // 리플레이용 기록
  const P0 = (S.room && S.room.players) || {}, who = id => (P0[id] || {}).name || '?';
  if (e.type === 'mega') return showMega(who(e.by), (P0[e.by] || {}).role, e.text || '');
  if (e.type === 'whistle') {
    if (e.target === S.pid && now() - (e.at || 0) <= 3000) { toast('삐익—!! 어디선가 호루라기 소리가 들려요', true); vibrate([400, 100, 400, 100, 600, 100, 400]); whistleSound(); flash('rgba(255,255,255,.6)'); }
    return;
  }
  if (e.type === 'blast') {
    const hitMe = Object.values(e.targets || {}).includes(S.pid); // 배열이 객체로 올 때도 처리
    // 폭발 범위: 쓴 사람·맞은 사람·근처(반경의 2.5배 안) 사람 지도에 4초 동안
    if (e.lat != null && (e.by === S.pid || hitMe || (S.fix && Logic.dist(S.fix, e) <= (e.r || Logic.AUGS.selfDestruct.r) * 2.5))) {
      S.blasts = (S.blasts || []).filter(b => b.until > now()).concat({ key: 'bl' + (e.at || now()) + e.by, lat: e.lat, lng: e.lng, r: e.r || Logic.AUGS.selfDestruct.r, until: now() + 4000 });
    }
    if (hitMe) { hurtBy('자폭', e.by); toast(`💥 ${who(e.by)}의 자폭에 휘말렸어요! 체력 -${Logic.AUGS.selfDestruct.v}`, true); flash('rgba(255,122,69,1)'); vibrate([300, 60, 300]); sfx('boom'); }
    else if (e.by !== S.pid) toast(`💥 ${who(e.by)}가 자폭했어요`);
    return;
  }
  if (e.type === 'trap') { // 덫·가짜 보물 발동 → 설치한 사람에게 30초 위치 표시
    if (e.by === S.pid) {
      const name = ((S.room && S.room.players[e.target]) || {}).name || '?';
      S.trapReveals = [...(S.trapReveals || []), { name, lat: e.lat, lng: e.lng, until: now() + 30000 }];
      toast(`${e.fake ? '가짜 보물' : '덫'} 발동! ${name} 위치를 30초 동안 표시해요`, true); flash('rgba(255,122,69,.9)'); vibrate([150, 60, 150]);
      drawMaps();
    }
    return;
  }
  const me0 = P0[S.pid] || {};
  if (e.type === 'mugung') { // 무궁화: 모두에게 노래, 도망자는 같은 박자 진동 (늦게 받으면 지난 부분은 건너뜀)
    const mg = (S.room || {}).mugung, W = Logic.AUGS.mugung.warn;
    const off = (now() - (mg && mg.by === e.by ? mg.from - W * 1000 : (e.at || now()))) / 1000;
    if (off < W + 1) { mugSound(off); if (me0.role === 'runner') { const p = mugVib(off); if (p.length) vibrate(p); } }
    return;
  }
  if (e.type && e.type.startsWith('asn')) return asnEvent(e, me0, who);
  if (e.type === 'terrTag') return terrEvent(e, me0, who);
  if (e.type === 'chatOpen') {
    if (e.by !== S.pid && me0.role === e.role) { toast(`💬 ${who(e.by)}가 팀 대화방을 열었어요! 위의 💬 버튼`, true); vibrate([60, 40, 60]); }
    return;
  }
  if (e.type === 'shadow') {
    if (e.target === S.pid) { toast(`👣 그림자를 밟혔어요! 곧 ${Logic.AUGS.shadowStep.stop}초 정지`, true); flash('rgba(167,139,250,.95)'); vibrate([200, 80, 200, 80, 200]); sfx('wanted'); }
    return;
  }
  if (e.type === 'bombPass') {
    if (e.target === S.pid) { toast(`💣 ${who(e.by)}의 시한폭탄! ${Logic.AUGS.timeBomb.v}초 안에 다른 사람에게 넘기세요`, true); flash('rgba(255,122,69,.9)'); vibrate([200, 80, 200]); sfx('trap'); }
    else if (e.by === S.pid) toast(`💣 ${who(e.target)}에게 폭탄을 넘겼어요!`, true);
    return;
  }
  if (e.type === 'bombBoom') {
    if (e.target === S.pid && e.remote) { hurtBy('시한폭탄', e.by); toast(`💥 앱이 꺼져 있는 동안 폭탄이 터졌어요! 체력 -${Logic.AUGS.timeBomb.dmg}`, true); }
    else if (e.target !== S.pid) toast(`💥 ${who(e.target)}가 들고 있던 시한폭탄이 터졌어요`);
    return;
  }
  if (e.type === 'mugHit') {
    if (me0.role === 'chaser') { toast(`🌸 ${who(e.by)} 움직임 포착! ${Logic.AUGS.mugung.reveal}초 동안 위치 공개`, true); sfx('arrow'); vibrate(120); }
    return;
  }
  if (e.type === 'escape') {
    if (e.chaser === S.pid) {
      if (S.stats) S.stats.catches = Math.max(0, (S.stats.catches || 0) - 1);
      toast(`😱 ${who(e.by)}가 폰을 흔들어 탈출했어요! 정지 풀림`, true); sfx('escape'); vibrate([200, 80, 200]); flash('rgba(255,176,32,.9)');
    } else if (e.by !== S.pid) toast(`📳 ${who(e.by)} 흔들어 탈출 성공!`);
    return;
  }
  if (e.type === 'detected') {
    const bt = S.augs && S.augs.backtrace;
    if (e.target === S.pid && !(S.augs && S.augs.counterIntel) && bt && (bt.until || 0) > now()) { // 역추적: 한 번 보여 주고 끝
      const sec = Logic.AUGS.backtrace.show;
      S.detects = [...(S.detects || []).filter(d => d.id !== e.by), { id: e.by, until: now() + sec * 1000 }];
      S.augs = { ...S.augs, backtrace: { ...bt, until: 0 } }; update(meRef(), { 'augs/backtrace/until': 0 });
      toast(`🔁 역추적! ${who(e.by)} 위치 ${sec}초`, true); sfx('detect'); vibrate([60, 40, 60]); drawMaps();
    } else if (e.target === S.pid) {
      const sec = Logic.AUGS.counterIntel.v;
      S.detects = [...(S.detects || []).filter(d => d.id !== e.by), { id: e.by, until: now() + sec * 1000 }];
      toast(`🛰 역탐지! ${who(e.by)}가 나를 봤어요 (${sec}초 표시)`, true);
      sfx('detect'); vibrate([60, 40, 60, 40, 60]); drawMaps();
    }
    return;
  }
  if (e.type === 'wanted') {
    const sec = Logic.AUGS.wanted.v;
    if (e.target === S.pid) { toast(`🎯 현상수배! ${sec}초 동안 내 위치 공개`, true); sfx('wanted'); vibrate([300, 100, 300]); flash('rgba(255,77,79,.9)'); }
    else if (e.by !== S.pid) toast(`🎯 ${who(e.target)} 현상수배! ${sec}초 동안 위치 공개`);
    return;
  }
  if (e.type === 'swap') {
    if (e.target === S.pid) { toast(`🔄 ${who(e.by)}가 나와 자리를 바꿨어요 (${Logic.AUGS.swap.v}초)`, true); sfx('swap'); vibrate([80, 40, 80]); }
    return;
  }
  if (e.type === 'ink') {
    if (e.target === S.pid) { toast(`🦑 ${who(e.by)}의 먹물! ${Logic.AUGS.ink.v}초 동안 지도가 가려져요`, true); sfx('ink'); vibrate([200, 50, 100]); }
    return;
  }
  if (e.type === 'infect') {
    if (e.target === S.pid) {
      $('#ov-qr').classList.remove('on'); S.snap = []; drawSnap();
      toast('🧟 감염됐어요! 이제 좀비예요', true); flash('rgba(132,204,22,.95)'); vibrate([300, 100, 300]); sfx('caught');
    } else if (e.by !== S.pid) toast(`🧟 ${who(e.target)} 감염!`, true);
    return;
  }
  if (e.type === 'jail' && e.ice && e.mine && e.by === S.pid) { toast(`🧊 빙결 지뢰에 ${who(e.target)} 걸림!`, true); vibrate(120); return; }
  if (e.type === 'fx') {
    const mine = me0.role === e.role, k = e.k;
    const T = { flip: ['🙃 지도 뒤집기', '상대 지도가 뒤집혔어요', '지도가 뒤집혔어요!'], rain: ['🌧 소나기', '상대 스태미나 2배·우리 1.5배로 닳아요', '스태미나가 2배로 닳아요!'], stop: ['⏸ 시간 정지', '상대 팀 시간이 멈췄어요', '화살표·미니맵·능력이 멈췄어요!'], gold: ['✨ 골든 타임', '우리 팀 스태미나 무한!', '상대 팀 스태미나 무한'] }[k];
    if (T && me0.role) { toast(`${T[0]} ${e.v}초! ${mine ? T[1] : T[2]}`, true); if (!mine) vibrate([100, 50, 100]); }
    if (k === 'stop' && me0.role && !mine) { // 내 쿨타임이 그만큼 밀림
      const t = now(), u = {};
      for (const [id, x] of Object.entries(S.augs || {})) if (x && (x.readyAt || 0) > t) { S.augs = { ...S.augs, [id]: { ...x, readyAt: x.readyAt + e.v * 1000 } }; u[`augs/${id}/readyAt`] = x.readyAt + e.v * 1000; }
      if (Object.keys(u).length) update(meRef(), u);
    }
    renderGame(); drawMaps(); return;
  }
  if (e.type === 'rumor') { toast(`🗣 소문: ${who(e.target)}는 ${QUAD[e.q] || '어딘가'}에 있대요`, true); return; }
  if (e.type === 'sacrifice') { if (me0.role === e.role && e.by !== S.pid) { toast(`🕯 ${who(e.by)}의 희생! ${Logic.AUGS.sacrifice.v}초 무적`, true); flash('rgba(255,207,64,.8)'); vibrate([100, 50, 100]); } return; }
  if (e.type === 'tele') { if (e.target === S.pid) toast(`🔮 ${who(e.by)}와 텔레파시! 서로 위치가 보여요`, true); return; }
  if (e.type === 'jail' && e.ice) {
    if (e.target === S.pid) { $('#ov-qr').classList.remove('on'); toast('🧊 얼음! 그 자리에서 멈추세요 · 팀원이 QR을 찍어 주면 땡', true); flash('rgba(103,232,249,.95)'); vibrate([300, 100, 300]); sfx('caught'); }
    else if (e.by !== S.pid) toast(`🧊 ${who(e.target)} 얼음!${me0.role === 'runner' ? ' 가서 땡 해 주세요' : ''}`, true);
    return;
  }
  if (e.type === 'rescue' && e.ice) {
    if (e.target === S.pid) { $('#ov-qr').classList.remove('on'); toast(`🔥 ${who(e.by)} 덕분에 땡! ${Logic.MODE_RULES.ICE_INV_SEC}초 무적`, true); flash('rgba(60,207,122,.95)'); vibrate([100, 50, 300]); sfx('escape'); }
    else if (e.by !== S.pid) toast(`🔥 ${who(e.target)} 땡!`, true);
    return;
  }
  if (e.type === 'iceSelf') {
    if (e.by !== S.pid) toast(`🧊 ${who(e.by)} 스스로 얼음! (${Logic.MODE_RULES.ICE_SELF_SEC}초 동안 못 잡아요)`);
    return;
  }
  if (e.type === 'jail') {
    if (e.target === S.pid) {
      $('#ov-qr').classList.remove('on');
      toast(`🚓 체포됐어요! ${Logic.MODE_RULES.JAIL_GO_SEC / 60}분 안에 감옥으로 가세요`, true); flash('rgba(59,163,255,.95)'); vibrate([300, 100, 300]); sfx('caught');
    } else if (e.by !== S.pid) toast(`🚓 ${who(e.target)} 체포!${me0.role === 'runner' ? ' 감옥에서 구해 주세요' : ''}`, true);
    return;
  }
  if (e.type === 'rescue') {
    if (e.target === S.pid) { $('#ov-qr').classList.remove('on'); toast(`🔓 ${who(e.by)} 덕분에 탈옥! 1분 동안 무적`, true); flash('rgba(60,207,122,.95)'); vibrate([100, 50, 300]); sfx('escape'); }
    else if (e.by !== S.pid) toast(`🔓 ${who(e.target)} 탈옥!`, true);
    return;
  }
  if (e.type === 'mirror') {
    if (e.by === S.pid) { toast(`🪞 거울! ${who(e.caster)}의 ${SKILL_NAME[e.skill] || '스킬'}을(를) 되돌렸어요`, true); flash('rgba(200,220,255,.9)'); sfx('shield'); vibrate([80, 40, 80]); }
    return;
  }
  if (e.type === 'blackout') {
    if (me0.role === 'runner') { toast(`🌑 ${who(e.by)}의 블랙아웃! ${Logic.AUGS.blackout.v}초 동안 미니맵이 꺼져요`, true); vibrate([200, 100, 200]); flash('rgba(0,0,0,.95)'); drawSnap(); drawMaps(); }
    return;
  }
  if (e.type === 'supplyGot') {
    if (e.by !== S.pid) toast(`📦 ${who(e.by)}가 보급 상자를 주웠어요!`, true);
    return;
  }
  if (e.type === 'taunt') {
    if (me0.role === 'chaser') { toast(`🤪 ${who(e.by)}의 도발! ${Logic.AUGS.taunt.v}초 동안 위치 공개`, true); vibrate(100); }
    return;
  }
  if (e.type === 'storm') {
    toast(`🌀 ${who(e.by)}의 자기장! ${Logic.AUGS.storm.v / 60}분 동안 구역이 줄어들어요`, true); vibrate([100, 60, 100]); flash('rgba(168,85,247,.7)');
    return;
  }
  if (e.type === 'siren') {
    if (now() - (e.at || 0) > 3000) return; // 다시 들어왔을 때 지난 사이렌이 늦게 울리지 않게
    if (me0.role === 'runner' && Logic.alive({ ...me0, selfDmg: S.selfDmg, augs: S.augs }, ((S.room && S.room.hits) || {})[S.pid])) {
      sirenSound(Logic.AUGS.siren.v); vibrate([500, 100, 500, 100, 800]); flash('rgba(255,77,79,.95)'); toast(`🚨 ${who(e.by)}의 사이렌! 폰에서 소리가 나요`, true);
    }
    return;
  }
  if (e.type === 'steal') {
    if (e.target === S.pid) {
      const nx = { ...(S.augs || {}) }; delete nx[e.aug]; S.augs = nx;
      toast(`🫳 ${who(e.by)}가 [${(Logic.AUGS[e.aug] || {}).name || '?'}] 증강을 훔쳐 갔어요`, true); sfx('steal'); vibrate([200, 80, 200]); flash('rgba(255,176,32,.9)'); renderGame();
    }
    return;
  }
  if (e.type === 'silence') {
    if (e.target === S.pid) { toast(`🔇 ${who(e.by)}의 침묵! ${Logic.AUGS.silence.v / 60}분 동안 스킬을 못 써요`, true); vibrate([150, 60, 150]); flash('rgba(123,132,148,.9)'); }
    return;
  }
  if (e.type === 'snipe') {
    if (e.target === S.pid) { hurtBy('저격', e.by); toast(`🎯 ${who(e.by)}에게 저격당했어요! 체력 -${Logic.AUGS.snipe.dmg}`, true); sfx('shot'); vibrate([300, 60, 300]); flash('rgba(255,77,79,1)'); }
    else if (e.by !== S.pid && me0.role === 'runner') sfx('shot');
    return;
  }
  if (e.type === 'revive') {
    delete S.dead[e.target];
    if (e.target !== S.pid && e.by !== S.pid) toast(`🩸 ${who(e.by)}가 피의 서약으로 ${who(e.target)}를 살렸어요!`, true);
    return;
  }
  if (e.type === 'cam') {
    if (me0.role === (e.camRole || 'chaser')) {
      S.trapReveals = [...(S.trapReveals || []), { name: who(e.target), lat: e.lat, lng: e.lng, until: now() + 10000, icon: e.spy ? '📷' : '📹' }];
      toast(e.spy ? `📷 감시 카메라에 추격자 ${who(e.target)} 포착!` : `📹 CCTV에 ${who(e.target)} 포착!`, true); sfx('cam'); vibrate([80, 40, 80]); drawMaps();
    }
    return;
  }
  if (e.type === 'mfOut') { // 마피아 모드 탈락 (누가 잡았는지는 잡힌 사람만)
    const msg = { mafia: '☠️', shot: '🔫 총소리!', misfire: '🔫' }[e.why] || '☠️';
    if (e.target === S.pid) {
      if (e.why === 'mafia') toast('🔪 잡혀서 탈락 · 이제 말하면 안 돼요', true);
      else if (e.why === 'shot') toast('🔫 저격당해 탈락 · 이제 말하면 안 돼요', true);
      flash('rgba(255,77,79,.9)'); vibrate([300, 100, 300]); sfx('caught');
    } else if (!(e.why === 'misfire' && e.by === S.pid)) toast(`${msg} ${who(e.target)} 탈락!`, true);
    return;
  }
  if (e.type === 'gunshot') { if (e.by !== S.pid) toast('🔫 어디선가 총소리가…'); return; }
  if (e.type === 'guarded') {
    if (e.target === S.pid) { toast(`🩺 의사 덕분에 살았어요 (${who(e.by)})`, true); flash('rgba(59,163,255,.9)'); vibrate([100, 50, 100]); sfx('shield'); }
    else if (e.doc === S.pid) toast('🩺 내가 지킨 사람이 마피아의 공격을 막았어요!', true);
    return;
  }
  if (e.type === 'vote') {
    if (e.target === S.pid) { toast('🗳 투표로 추방됐어요 · 탈락하면 말하면 안 돼요', true); vibrate([300, 100, 300]); }
    else toast(e.target ? `🗳 투표 결과: ${who(e.target)} 추방 (${e.top}표)` : e.tie ? '🗳 동점이라 아무도 추방되지 않았어요' : '🗳 표가 없어서 아무도 추방되지 않았어요', true);
    $('#ov-vote').classList.remove('on');
    return;
  }
  if (e.type === 'rifleDrop') { toast('🔫 경찰 탈락! 저격총을 주우면 새 경찰이에요', true); vibrate([100, 50, 100]); drawMaps(); return; }
  if (e.type === 'riflePick') { if (e.by !== S.pid) toast('🔫 누군가 저격총을 주웠어요', true); drawMaps(); return; }
  if (e.type === 'rpsWin') {
    if (e.chaser === S.pid) { S.anchor = null; toast(`✌️ 가위바위보 패배! ${Logic.AUGS.rps.freeze}초 정지`, true); vibrate(300); }
    return;
  }
  if (e.type === 'blockade') {
    if (me0.role === 'runner') { toast(`🚧 ${who(e.by)}의 봉쇄선! 빨간 선을 넘으면 들켜요`, true); vibrate([100, 50, 100]); drawMaps(); }
    return;
  }
  if (e.type === 'block') { // 봉쇄선을 넘은 도망자 → 추격자 모두에게 30초 위치
    if (me0.role === 'chaser') {
      S.trapReveals = [...(S.trapReveals || []), { name: who(e.target), lat: e.lat, lng: e.lng, until: now() + 30000, icon: '🚧' }];
      toast(`🚧 ${who(e.target)}가 봉쇄선을 넘었어요! 30초 위치 표시`, true); vibrate([150, 60, 150]); sfx('trap'); drawMaps();
    }
    return;
  }
  if (e.type === 'hound') {
    if (e.target === S.pid) { toast(`🐕 사냥개에게 들켰어요! ${Logic.AUGS.hound.show}초 위치 공개`, true); flash('rgba(255,122,69,.9)'); vibrate([200, 80, 200]); }
    else if (me0.role === 'chaser') { toast(`🐕 사냥개가 ${who(e.target)}를 찾았어요! ${Logic.AUGS.hound.show}초 위치 표시`, true); vibrate([80, 40, 80]); }
    return;
  }
  if (e.type === 'cheer') { // 응원: 30m 안 살아 있는 팀원(쓴 사람 빼고) 체력 +15
    if (e.by === S.pid || me0.role !== 'runner' || !S.fix || Logic.dist(S.fix, e) > Logic.AUGS.cheer.r) return;
    const hp = Logic.hpOf({ ...me0, selfDmg: S.selfDmg, augs: S.augs }, ((S.room && S.room.hits) || {})[S.pid]);
    if (hp <= 0) return;
    const h = Math.min(Logic.AUGS.cheer.v, RULES.HP_MAX - hp); S.selfDmg -= h; S.lastWrite = 0;
    toast(`📣 ${who(e.by)}의 응원! 체력 +${Math.round(h)}`, true); sfx('shield'); renderGame();
    return;
  }
  if (e.type === 'fog') {
    if (me0.role && me0.role !== e.role) { toast(`🌫 안개 ${Logic.AUGS.fog.v}초! ${me0.role === 'chaser' ? '화살표가' : '미니맵이'} 멈춰요`, true); vibrate([100, 50, 100]); }
    return;
  }
  if (e.type === 'radioJam') {
    if (me0.role === 'chaser') toast(`📡 전파 방해 ${Logic.AUGS.radioJam.v}초! 탐지 능력이 꺼져요`, true);
    return;
  }
  if (e.type === 'time') {
    const d = e.delta || 0;
    toast(`⏳ ${who(e.by)}의 시간 도둑! 남은 시간 ${d > 0 ? '+' : '−'}${fmtDur(Math.abs(d) / 1000)}`, true); sfx('time'); vibrate(100);
    return;
  }
  if (e.type !== 'catch') return;
  const P = (S.room && S.room.players) || {}, by = (P[e.by] || {}).name || '?', tg = (P[e.target] || {}).name || '?';
  const min = fmtDur(RULES.CATCH_COOLDOWN_SEC);
  if (e.target === S.pid) {
    $('#ov-qr').classList.remove('on');
    if (e.shield) { toast(`🛡 쉴드가 막았어요! 체력 그대로 · ${min} 무적`, true); flash('rgba(59,163,255,.9)'); sfx('shield'); vibrate([100, 50, 100]); }
    else { hurtBy('잡힘', e.by); toast(`잡혔어요! 체력 -${RULES.CATCH_DMG} · ${min} 무적, 도망가세요!`, true); vibrate([200, 100, 200, 100, 200]); flash('rgba(255,77,79,.9)'); sfx('caught'); }
    if (e.counter) setTimeout(() => toast(`🛡 카운터 성공! 잡은 추격자 체력 -${Logic.AUGS.counter.dmg}`, true), 1800);
    // 흔들어 탈출: 판정 시간이 남아 있으면 흔들기 창을 띄움. 보상은 판정이 끝난 뒤, 탈출했으면 안 줌
    const sh = S.augs && S.augs.shake, tt = now();
    if (e.rps) $('#ov-rps').classList.add('on'); // 가위바위보 (화면은 rpsLoop가 그림)
    else if (e.pend && tt < e.pend && Logic.augReady(sh, tt)) startShake(e);
    afterSettled(S.pid, h => {
      const room = S.room;
      if (room && room.status === 'playing' && h.esc !== e.catchAt && Logic.alive({ ...room.players[S.pid], selfDmg: S.selfDmg, augs: S.augs }, h)) { gainRandom('잡힘 보상'); bountyPay(); }
    });
  }
  else if (e.by === S.pid) {
    toast(`${tg} 잡았다! ${av('chain') ? fmtDur(Math.min(av('chain'), RULES.CATCH_COOLDOWN_SEC)) : min} 동안 제자리 대기${e.shield ? ' (쉴드에 막혀 체력은 그대로)' : ''}`, true); vibrate(200); flash('rgba(60,207,122,.85)'); sfx('catch');
    if (e.counter) setTimeout(() => { toast(`💥 카운터에 맞았어요! 체력 -${Logic.AUGS.counter.dmg}`, true); flash('rgba(255,77,79,1)'); vibrate([300, 80, 300]); sfx('boom'); }, 1800);
  }
  else toast(`${by} → ${tg} 잡았어요!`);
}
async function leaveRoom() {
  const room = S.room, code = S.code, pid = S.pid;
  try {
    if (room && room.status === 'lobby' && room.hostId === pid) {
      const others = Object.keys(room.players || {}).filter(id => id !== pid);
      if (others.length) await update(ref(db, `rooms/${code}`), { hostId: others[0], [`players/${pid}`]: null });
      else { // 마지막 사람: 내 자리를 먼저 지우고 방을 지움 (보안 규칙: 플레이어가 없는 방만 지울 수 있음)
        if (S.unsub) { S.unsub(); S.unsub = null; } // 내 자리가 지워지는 순간 '방에서 나왔어요'가 먼저 뜨지 않게
        await remove(ref(db, `rooms/${code}/players/${pid}`));
        await remove(ref(db, `rooms/${code}`));
      }
    } else await remove(ref(db, `rooms/${code}/players/${pid}`));
  } catch (e) { console.error(e); }
  leaveLocal();
}
function leaveLocal(msg) {
  if (S.unsub) S.unsub();
  if (S.evUnsub) S.evUnsub();
  S.unsub = S.evUnsub = null; S.code = S.pid = S.room = S.gameKey = null;
  Logic.applySettings(null); RULES.AREA_R = RULE_DEFAULTS.AREA_R;
  // 게임 중에 떠 있던 창은 모두 닫음 (투표·가위바위보·대화방은 게임 화면에서만 스스로 닫혀서, 끝나는 순간 떠 있으면 결과를 가림)
  closeScanner(); ['#ov-qr', '#ov-resume', '#ov-role', '#ov-invite', '#ov-aug', '#ov-insight', '#ov-pick', '#ov-shake', '#ov-snipe', '#ov-vote', '#ov-rps', '#ov-chat', '#ov-mega', '#ov-ping', '#ov-forfeit', '#ov-augInfo', '#ov-memo'].forEach(s => $(s).classList.remove('on'));
  closeSnipe();
  S.shake = null;
  saveLocal({ name: S.name });
  show('s-home');
  if (msg) toast(msg);
}
$('#btnLeave1').onclick = leaveRoom;
$('#btnLeave2').onclick = leaveRoom;

/* ---------- 게임 설정 ---------- */
const fmtDur = sec => { sec = Math.round(sec); const m = Math.floor(sec / 60), r = sec % 60; return m ? `${m}분${r ? ` ${r}초` : ''}` : `${r}초`; };
const SET_FIELDS = [
  { g: '시간', k: 'HIDE_SEC', name: '숨는 시간', step: 30, min: 60, max: 900, f: fmtDur },
  { g: '시간', k: 'GAME_SEC', name: '게임 시간', step: 300, min: 600, max: 5400, f: fmtDur },
  { g: '추적', k: 'ARROW_UNLOCK_SEC', name: '화살표 열리는 시간', step: 30, min: 0, max: 600, f: fmtDur },
  { g: '추적', k: 'ARROW_EVERY_SEC', name: '화살표 주기', step: 5, min: 15, max: 180, f: fmtDur },
  { g: '추적', k: 'MAP_EVERY_SEC', name: '도망자 미니맵 갱신', step: 5, min: 5, max: 120, f: fmtDur },
  { g: '추적', k: 'TRACK_USES', name: '추격자 즉시 추적', step: 1, min: 0, max: 5, f: v => (v ? `판마다 ${v}회` : '없음') },
  { g: '체력·잡기', k: 'CATCH_DMG', name: '잡힐 때 데미지', step: 5, min: 10, max: 100, f: v => `-${v}` },
  { g: '체력·잡기', k: 'CATCH_COOLDOWN_SEC', name: '무적·정지 시간', step: 30, min: 30, max: 600, f: fmtDur },
  { g: '체력·잡기', k: 'WAIT_MOVE_DMG', name: '대기 중 이동 벌칙', step: 1, min: 0, max: 50, f: v => `초당 -${v}` },
  { g: '체력·잡기', k: 'ST_RUNNER', name: '도망자 스태미나', step: 10, min: 50, max: 300, f: v => `${v}` },
  { g: '체력·잡기', k: 'ST_CHASER', name: '추격자 스태미나', step: 10, min: 50, max: 300, f: v => `${v}` },
  { g: '체력·잡기', k: 'ST_MUL', name: '스태미나 소모 배율', step: 0.25, min: 0.5, max: 2, f: v => `×${v}` },
  { g: '증강', k: 'AUG_ON', name: '증강', toggle: true, f: v => (v ? '켜짐' : '꺼짐') },
  { g: '증강', k: 'SPOT_COUNT', name: '증강 지점 수', step: 1, min: 0, max: 10, f: v => `${v}개`, aug: true },
  { g: '증강', k: 'AUG_EVERY_SEC', name: '보상 선택 간격', step: 60, min: 120, max: 1800, f: fmtDur, aug: true },
  { g: '마피아', k: 'MF_POLICE', name: '경찰 수', step: 1, min: 0, max: 2, f: v => `${v}명`, mf: true },
  { g: '마피아', k: 'MF_DOCTOR', name: '의사 수', step: 1, min: 0, max: 2, f: v => `${v}명`, mf: true },
  { g: '얼음땡', k: 'ICE_SELF_USES', name: '스스로 얼음 횟수', step: 1, min: 0, max: 5, f: v => (v ? `판마다 ${v}회` : '없음'), ice: true }
];
// 마피아 모드에선 안 쓰는 설정 (숨는 시간·화살표·잡기 데미지 없음)
const MF_SKIP = new Set(['HIDE_SEC', 'ARROW_UNLOCK_SEC', 'ARROW_EVERY_SEC', 'MAP_EVERY_SEC', 'TRACK_USES', 'CATCH_DMG', 'CATCH_COOLDOWN_SEC', 'WAIT_MOVE_DMG']);
const lobbyCounts = room => {
  const n = Object.keys(room.players || {}).length;
  return { n, ch: Math.min(Math.max(1, (room.settings && room.settings.chasers) || 1), Math.max(1, n - 1)) };
};
// 추천값 + 방장이 직접 바꾼 칸(custom)만 덮어쓴 최종 설정
function mergedSettings(room) {
  const st = room.settings || {}, area = st.area, { n, ch } = lobbyCounts(room);
  let rec = Logic.recommend(area ? area.r : RULES.AREA_DEFAULT_M, Math.max(2, n), ch); const custom = st.custom || {};
  if (modeOf(room) === 'terr') rec = { ...rec, GAME_SEC: Logic.TERR.GAME_SEC, HIDE_SEC: 0 }; // 땅따먹기: 추천은 20분·숨는 시간 없음 (방장이 직접 바꾼 값은 그대로)
  return { rec, out: Logic.mergeSettings(rec, st.game, custom), custom };
}
// 방장: 인원·범위·추격자 수가 바뀌면 직접 안 바꾼 칸을 추천값으로 자동 갱신
function syncRecommend(room) {
  if (room.hostId !== S.pid || S.recSending) return;
  const { out } = mergedSettings(room), cur = (room.settings && room.settings.game) || {}, u = {};
  for (const k of Object.keys(out)) if (cur[k] !== out[k]) u['game/' + k] = out[k];
  if (!Object.keys(u).length) return;
  S.recSending = true;
  update(roomRef('settings'), u).catch(e => console.error(e)).finally(() => { S.recSending = false; });
}
function renderSettings(room, isHost) {
  const { out, custom } = mergedSettings(room), nCustom = Object.keys(custom).filter(k => custom[k]).length;
  const mafia = modeOf(room) === 'mafia';
  $('#l-setSum').textContent = mafia ? `게임 ${fmtDur(out.GAME_SEC)} · 경찰 ${out.MF_POLICE}명 · 의사 ${out.MF_DOCTOR}명 · ${nCustom ? `${nCustom}개 직접 설정` : '추천값'}`
    : `숨기 ${fmtDur(out.HIDE_SEC)} · 게임 ${fmtDur(out.GAME_SEC)} · 화살표 ${fmtDur(out.ARROW_EVERY_SEC)} · ${nCustom ? `${nCustom}개 직접 설정` : '추천값'}`;
  $('#l-setHint').textContent = isHost ? '인원·구역 반경·추격자 수에 맞춰 추천값이 자동으로 들어가요. 직접 바꾼 칸은 그대로 유지돼요.' : '설정은 방장이 정해요.';
  let html = '', grp = '';
  for (const fd of SET_FIELDS) {
    if (mafia ? MF_SKIP.has(fd.k) : fd.mf) continue;
    if (fd.ice && modeOf(room) !== 'ice') continue;
    if (fd.g !== grp) { grp = fd.g; html += `<div class="sgrp">${grp}</div>`; }
    const v = out[fd.k], off = fd.aug && !out.AUG_ON, tag = custom[fd.k] ? '<i>수정</i>' : '';
    const ctl = !isHost ? `<b>${fd.f(v)}</b>`
      : fd.toggle ? `<div class="stepper"><button data-k="${fd.k}" data-t="1" style="width:auto;padding:6px 14px">${fd.f(v)}</button></div>`
      : `<div class="row stepper"><button data-k="${fd.k}" data-d="-1">−</button><b>${fd.f(v)}</b><button data-k="${fd.k}" data-d="1">+</button></div>`;
    html += `<div class="srow${off ? ' off' : ''}"><span>${fd.name}${tag}</span>${ctl}</div>`;
  }
  if ($('#l-setRows').innerHTML !== html) $('#l-setRows').innerHTML = html;
  $('#btnRec').style.display = isHost && nCustom ? 'block' : 'none';
}
$('#l-setRows').onclick = safe(async e => {
  const b = e.target.closest('[data-k]'), room = S.room;
  if (!b || !room || room.hostId !== S.pid) return;
  const fd = SET_FIELDS.find(x => x.k === b.dataset.k), { out } = mergedSettings(room);
  const v = fd.toggle ? (out[fd.k] ? 0 : 1) : Math.min(fd.max, Math.max(fd.min, out[fd.k] + fd.step * +b.dataset.d));
  await update(roomRef('settings'), { ['game/' + fd.k]: v, ['custom/' + fd.k]: true });
});
$('#btnRec').onclick = safe(async () => {
  const room = S.room; if (!room || room.hostId !== S.pid) return;
  await update(roomRef('settings'), { custom: null });
});

/* ---------- 로비 ---------- */
function renderLobby() {
  const room = S.room, isHost = room.hostId === S.pid, players = Object.entries(room.players || {}), n = players.length;
  $('#l-code').textContent = S.code;
  $('#l-count').textContent = `${n}/${RULES.MAX_PLAYERS}명`;
  $('#l-list').innerHTML = players.map(([id, p]) =>
    `<li><span>${id === room.hostId ? '👑 ' : ''}${esc(p.name)}${id === S.pid ? ' (나)' : ''}</span><span class="${p.ready ? 'ok' : 'dim'}">${p.ready ? '준비 ✓' : '센서 대기'}</span></li>`).join('');
  $('#btnReady').style.display = S.sensorsOn ? 'none' : 'block';
  const ch = Math.min(Math.max(1, (room.settings && room.settings.chasers) || 1), Math.max(1, n - 1));
  $('#l-chasers').textContent = ch;
  $('#l-runners').textContent = Math.max(0, n - ch);
  const area = room.settings && room.settings.area, r = area ? area.r : RULES.AREA_DEFAULT_M;
  if (document.activeElement !== $('#l-r')) $('#l-r').value = r;
  if (!isHost && S.polyEdit) S.polyEdit = null;
  const poly = !!(area && area.poly);
  document.querySelectorAll('#l-shape [data-shape]').forEach(b => { b.classList.toggle('on', S.polyEdit ? b.dataset.shape === 'poly' : (b.dataset.shape === 'poly') === poly); b.disabled = !isHost; });
  $('#l-rLabel').textContent = poly && !S.polyEdit ? `꼭짓점 구역 (${area.poly.length}개)` : '구역 반경';
  $('#l-rv').textContent = poly && !S.polyEdit ? `넓이로 치면 반경 ${area.r}m` : $('#l-r').value + 'm';
  $('#l-r').style.display = poly || S.polyEdit ? 'none' : '';
  ['#btnChMinus', '#btnChPlus', '#l-r'].forEach(s => { $(s).disabled = !isHost; });
  renderPolyBox();
  // 게임 모드
  const mode = modeOf(room);
  document.querySelectorAll('#l-mode [data-mode]').forEach(b => { b.classList.toggle('on', b.dataset.mode === mode); b.disabled = !isHost; });
  $('#l-chLabel').textContent = { zombie: '처음 좀비 수', police: '경찰 수', mafia: '마피아 수', ice: '술래 수' }[mode] || '추격자 수';
  $('#l-rnLabel').textContent = roleName('runner', room);
  $('#l-chLabel').parentElement.style.display = $('#l-rnLabel').parentElement.style.display = mode === 'assassin' || mode === 'terr' ? 'none' : ''; // 암살전·땅따먹기: 역할 수 없음
  $('#l-modeHint').textContent = (mode === 'classic' ? `잡히면 체력 -${mergedSettings(room).out.CATCH_DMG}, 체력 0이면 탈락` : MODE_HINT[mode]) + (mode === 'police' ? (room.settings.jail ? ' · 감옥 위치 정해짐' : ' · 감옥: 안 정하면 구역 중심') : '');
  $('#l-jailRow').style.display = isHost && mode === 'police' && !S.jailEdit ? '' : 'none';
  renderJailBox(isHost && mode === 'police');
  // 방장 규칙 메모: 방장만 쓰고, 모두에게 글자로만 보임
  const memo = memoOf(room);
  $('#l-memo').style.display = isHost ? 'block' : 'none';
  if (isHost && document.activeElement !== $('#l-memo') && !S.memoTimer) $('#l-memo').value = memo;
  $('#l-memoTxt').textContent = isHost ? '' : memo;
  $('#l-memoTxt').style.display = isHost || !memo ? 'none' : 'block';
  $('#l-memoCard').style.display = isHost || memo ? 'block' : 'none';
  $('#l-memoHint').textContent = isHost ? `${$('#l-memo').value.length}/300 · 모두에게 글자로 보이고, 게임 중엔 📝로 다시 볼 수 있어요` : '';
  $('#btnJail').textContent = S.jailPick ? '지도를 탭하세요 (다시 누르면 취소)' : '⭕ 감옥 한 점 찍기';
  renderSettings(room, isHost);
  syncRecommend(room);
  const allReady = players.every(([, p]) => p.ready);
  $('#btnStart').style.display = isHost ? 'block' : 'none';
  $('#btnStart').disabled = !(n >= 2 && allReady && area);
  $('#l-hint').textContent = n < 2 ? '2명 이상이어야 시작할 수 있어요'
    : !allReady ? '모두 센서를 켜야 시작할 수 있어요'
    : !area ? (S.sensorsOn ? 'GPS 신호를 기다리는 중…' : '방장이 센서를 켜면 구역이 정해져요') : '';
  const mo = getMap('lmap');
  if (!mo.bound) {
    mo.bound = true;
    mo.map.on('click', safe(async e => {
      if (!S.room || S.room.hostId !== S.pid) return;
      const a = S.room.settings && S.room.settings.area;
      if (S.jailEdit) { // 감옥 꼭짓점 (구역 안)
        if (a && !Logic.inArea(e.latlng, a)) return toast('감옥은 구역 안에 있어야 해요');
        if (S.jailEdit.length >= Logic.POLY_MAX) return toast(`꼭짓점은 ${Logic.POLY_MAX}개까지예요`);
        S.jailEdit.push({ lat: e.latlng.lat, lng: e.latlng.lng }); renderJailBox(true); return drawMaps();
      }
      if (S.jailPick) { // 경찰과 도둑: 감옥 위치 (구역 안)
        if (a && !Logic.inArea(e.latlng, a)) return toast('감옥은 구역 안에 있어야 해요');
        S.jailPick = false;
        await update(roomRef('settings'), { jail: { lat: e.latlng.lat, lng: e.latlng.lng } });
        return toast('🔒 감옥 위치를 정했어요');
      }
      if (S.polyEdit) { // 꼭짓점 찍기
        if (S.polyEdit.length >= Logic.POLY_MAX) return toast(`꼭짓점은 ${Logic.POLY_MAX}개까지예요`);
        S.polyEdit.push({ lat: e.latlng.lat, lng: e.latlng.lng }); renderPolyBox(); return drawMaps();
      }
      if (a && a.poly) return toast('꼭짓점 구역이에요 (🔷로 바꾸기)');
      await update(roomRef('settings'), { area: { lat: e.latlng.lat, lng: e.latlng.lng, r: a ? a.r : RULES.AREA_DEFAULT_M } });
    }));
    setTimeout(() => mo.map.invalidateSize(), 50);
  }
  drawMaps();
}
const MODE_HINT = {
  terr: `빨강팀과 파랑팀이 동네를 걸으며 칸을 칠해요. 칸에 ${Logic.TERR.BLANK_SEC}초 머물면 우리 색, 시간이 끝났을 때 칸이 많은 팀 승리 · 상대 땅에 들어가면 잡힐 수 있어요`,
  assassin: `모두 우두머리로 시작해서 몰래 정해진 타깃을 뒤에서 ${Logic.ASN.STAB_SEC}초 꾹 눌러 암살. 잡히면 부하가 되고, 마지막에 남은 우두머리가 승리 · 3명 이상 · 나침반 필요`,
  ice: `잡히면 그 자리에서 얼음(${Logic.MODE_RULES.ICE_MOVE_M}m 넘게 움직이면 체력 감소), 팀원이 QR을 찍어 주면 땡. 술래가 ${Logic.MODE_RULES.ICE_DRAIN_M}m 밖이면 얼음인 사람 체력이 닳아요. 스스로 얼음도 가능. 도망자 전원이 얼면 술래 승리`,
  zombie: '잡히면 바로 좀비가 돼서 같이 쫓아요. 시간 끝까지 버틴 생존자 모두 승리',
  mafia: '마피아가 누군지 몰라요. 마피아는 QR로 몰래 잡고(바로 탈락), 5분마다 투표로 1명 추방. 경찰은 조사·저격총, 의사는 보호. 탈락하면 말하면 안 돼요',
  police: `잡히면 감옥행, 팀원이 QR을 찍어 주면 탈옥. 도둑 전원이 동시에 갇히면 경찰 승리`
};
// 이번 게임에 쓰는 규칙: 마피아 모드는 숨는 시간 없이 바로 (방장 설정 값은 그대로 둠)
const gameRules = room => { const g = (room && room.settings && room.settings.game) || null; if (modeOf(room) === 'terr') return { ...(g || {}), HIDE_SEC: 0, GAME_SEC: (g && g.GAME_SEC) || Logic.TERR.GAME_SEC }; /* 땅따먹기: 숨는 시간 없음, 기본 20분 */ return g && modeOf(room) === 'mafia' ? { ...g, HIDE_SEC: 0 } : g; };
const memoOf = room => ((room && room.settings && room.settings.memo) || '').slice(0, 300);
// 방장이 메모를 쓰면 0.6초 뒤 저장 (글자 칠 때마다 저장하지 않게)
$('#l-memo').addEventListener('input', () => {
  $('#l-memoHint').textContent = `${$('#l-memo').value.length}/300 · 저장 중…`;
  clearTimeout(S.memoTimer);
  S.memoTimer = setTimeout(() => {
    S.memoTimer = 0;
    update(roomRef('settings'), { memo: $('#l-memo').value.slice(0, 300) }).catch(e => console.error(e));
  }, 600);
});
$('#btnMemo').onclick = () => { $('#memoTxt').textContent = memoOf(S.room); $('#ov-memo').classList.add('on'); };
$('#btnMemoClose').onclick = () => $('#ov-memo').classList.remove('on');
const modeOf = room => (room && room.settings && room.settings.mode) || 'classic';
const asArr = v => (Array.isArray(v) ? v : v && typeof v === 'object' ? Object.keys(v).sort((a, b) => a - b).map(k => asArr(v[k])) : v);
const jailOf = room => { const st = room.settings || {}, j = st.jail; return j ? (j.poly ? { ...j, poly: asArr(j.poly) } : j) : st.area ? { lat: st.area.lat, lng: st.area.lng } : null; };
// 감옥 안인지: 꼭짓점 감옥이면 모양 안, 아니면 반경 15m
const inJail = (p, j) => !!(j && (j.poly ? Logic.inArea(p, j) : Logic.dist(p, j) <= Logic.MODE_RULES.JAIL_R));
$('#l-mode').onclick = safe(async e => {
  const b = e.target.closest('[data-mode]'), room = S.room;
  if (!b || !room || room.hostId !== S.pid) return;
  S.jailPick = false; S.jailEdit = null;
  await update(roomRef('settings'), { mode: b.dataset.mode });
});
$('#btnJail').onclick = () => { S.jailPick = !S.jailPick; S.jailEdit = null; if (S.room) renderLobby(); };
// 감옥 꼭짓점: 구역 꼭짓점과 같은 방식, 크기는 넓이로 치면 반경 3~40m
function renderJailBox(show) {
  const ed = S.jailEdit, hint = $('#l-jailHint');
  $('#l-jailEdit').style.display = show && ed ? '' : 'none';
  if (!show) { hint.style.display = 'none'; return; }
  const j = S.room && S.room.settings && S.room.settings.jail && jailOf(S.room);
  hint.style.display = '';
  if (ed) {
    const chk = Logic.polyCheck(ed, Logic.MODE_RULES.JAIL_MIN_R, Logic.MODE_RULES.JAIL_MAX_R, '감옥');
    $('#btnJDone').disabled = !chk.ok; $('#btnJUndo').disabled = $('#btnJClear').disabled = !ed.length;
    hint.textContent = chk.ok ? `✔ 완료를 누르면 이 모양이 감옥이 돼요 (반경 약 ${chk.r}m 크기)` : `감옥 둘레를 따라 순서대로 탭하세요 (${ed.length}/${Logic.POLY_MAX}) · ${chk.why}`;
  } else hint.textContent = j && j.poly ? `지금 감옥: 꼭짓점 ${j.poly.length}개 (반경 약 ${j.r}m 크기)` : j ? `지금 감옥: 찍은 곳 반경 ${Logic.MODE_RULES.JAIL_R}m` : `지금 감옥: 구역 가운데 반경 ${Logic.MODE_RULES.JAIL_R}m`;
}
$('#btnJailPoly').onclick = () => {
  const j = S.room && S.room.settings && S.room.settings.jail && jailOf(S.room);
  S.jailPick = false; S.jailEdit = j && j.poly ? j.poly.map(([lat, lng]) => ({ lat, lng })) : [];
  if (S.room) renderLobby(); drawMaps();
};
$('#btnJUndo').onclick = () => { if (S.jailEdit) { S.jailEdit.pop(); renderJailBox(true); drawMaps(); } };
$('#btnJClear').onclick = () => { if (S.jailEdit) { S.jailEdit = []; renderJailBox(true); drawMaps(); } };
$('#btnJCancel').onclick = () => { S.jailEdit = null; if (S.room) renderLobby(); drawMaps(); };
$('#btnJDone').onclick = safe(async () => {
  const pts = S.jailEdit; if (!pts) return;
  const chk = Logic.polyCheck(pts, Logic.MODE_RULES.JAIL_MIN_R, Logic.MODE_RULES.JAIL_MAX_R, '감옥');
  if (!chk.ok) return toast(chk.why, true);
  await set(roomRef('settings/jail'), { lat: chk.lat, lng: chk.lng, r: chk.r, poly: pts.map(p => [p.lat, p.lng]) });
  S.jailEdit = null; toast(`🔒 꼭짓점 ${pts.length}개 감옥 완성`); renderLobby(S.room); drawMaps();
});
// 친구 초대: 방 코드가 들어간 사이트 링크를 QR로 보여줌
const inviteUrl = () => location.origin + location.pathname + '?room=' + S.code;
$('#btnInvite').onclick = () => {
  const url = inviteUrl(), qr = qrcode(0, 'M');
  qr.addData(url); qr.make();
  $('#inviteQR').innerHTML = qrImg(qr);
  $('#inviteCode').textContent = S.code;
  $('#inviteUrl').textContent = url;
  $('#ov-invite').classList.add('on');
};
$('#btnCopyLink').onclick = async () => {
  try { await navigator.clipboard.writeText(inviteUrl()); toast('링크를 복사했어요'); }
  catch (e) { toast('복사가 안 돼요. 위 링크를 길게 눌러 복사하세요'); }
};
$('#btnInviteClose').onclick = () => $('#ov-invite').classList.remove('on');
$('#btnReady').onclick = safe(async () => { if (await startSensors()) { toast('GPS 신호를 기다리는 중…'); if (S.room) renderLobby(); } });
const setChasers = safe(async d => {
  const room = S.room, n = Object.keys(room.players).length;
  const c = Math.min(Math.max(1, ((room.settings && room.settings.chasers) || 1) + d), Math.max(1, n - 1));
  await update(roomRef('settings'), { chasers: c });
});
$('#btnChMinus').onclick = () => setChasers(-1);
$('#btnChPlus').onclick = () => setChasers(1);
$('#l-r').oninput = () => { $('#l-rv').textContent = $('#l-r').value + 'm'; };
// 구역 모양: 원 ↔ 꼭짓점 (꼭짓점은 지도를 탭한 순서대로, 3~12개, 선이 꼬이면 완료 못 함)
function renderPolyBox() {
  const isHost = S.room && S.room.hostId === S.pid, ed = S.polyEdit;
  $('#l-polyBox').style.display = ed ? '' : 'none';
  if (ed) {
    const chk = Logic.polyCheck(ed);
    $('#btnPolyDone').disabled = !chk.ok; $('#btnPolyUndo').disabled = $('#btnPolyClear').disabled = !ed.length;
    $('#l-rv').textContent = `${ed.length}개` + (chk.r ? ` · 반경 약 ${chk.r}m` : '');
    $('#l-areaHint').textContent = chk.ok ? '✔ 완료를 누르면 이 모양으로 정해져요' : `둘레를 따라 순서대로 지도를 탭하세요 (${ed.length}/${Logic.POLY_MAX}) · ${chk.why}`;
  } else $('#l-areaHint').textContent = !isHost ? '추격자 수와 구역은 방장이 정해요'
    : S.room && S.room.settings && S.room.settings.area && S.room.settings.area.poly ? '🔷 꼭짓점 찍기를 누르면 다시 찍을 수 있어요' : '지도를 탭하면 구역 중심이 옮겨져요 (처음엔 내 위치)';
}
$('#l-shape').onclick = safe(async e => {
  const b = e.target.closest('[data-shape]'); if (!b || !S.room || S.room.hostId !== S.pid) return;
  const a = S.room.settings && S.room.settings.area;
  if (b.dataset.shape === 'poly') { S.polyEdit = a && a.poly ? a.poly.map(([lat, lng]) => ({ lat, lng })) : []; S.jailPick = false; S.jailEdit = null; }
  else {
    S.polyEdit = null;
    if (a && a.poly) { // 꼭짓점 구역 → 넓이가 같은 원
      const r = Math.min(1000, Math.max(100, Math.round(a.r / 50) * 50));
      await set(roomRef('settings/area'), { lat: a.lat, lng: a.lng, r });
      toast(`⭕ 반경 ${r}m 원으로 바꿨어요`);
    }
  }
  renderLobby(S.room); drawMaps();
});
$('#btnPolyUndo').onclick = () => { if (S.polyEdit) { S.polyEdit.pop(); renderPolyBox(); drawMaps(); } };
$('#btnPolyClear').onclick = () => { if (S.polyEdit) { S.polyEdit = []; renderPolyBox(); drawMaps(); } };
$('#btnPolyCancel').onclick = () => { S.polyEdit = null; renderLobby(S.room); drawMaps(); };
$('#btnPolyDone').onclick = safe(async () => {
  const pts = S.polyEdit; if (!pts) return;
  const chk = Logic.polyCheck(pts);
  if (!chk.ok) return toast(chk.why, true);
  await set(roomRef('settings/area'), { lat: chk.lat, lng: chk.lng, r: chk.r, poly: pts.map(p => [p.lat, p.lng]) });
  S.polyEdit = null; toast(`🔷 꼭짓점 ${pts.length}개 구역 완성 (반경 ${chk.r}m 크기)`);
  renderLobby(S.room); drawMaps();
});
$('#l-r').onchange = safe(async () => {
  const a = S.room && S.room.settings && S.room.settings.area;
  if (!a) return toast('먼저 구역 중심을 정하세요');
  if (a.poly) return;
  await update(roomRef('settings/area'), { r: +$('#l-r').value });
  $('#l-r').blur();
});
$('#btnStart').onclick = safe(async () => {
  const room = S.room, ids = Object.keys(room.players), n = ids.length;
  if (n < 2) return toast('2명 이상이어야 해요');
  if (modeOf(room) === 'assassin' && n < 3) return toast('암살전은 3명 이상이어야 해요');
  if (modeOf(room) === 'terr' && !(room.settings && room.settings.area)) return toast('구역을 먼저 정해 주세요');
  if (S.polyEdit || S.jailEdit) return toast('✔ 완료나 취소를 먼저 눌러 주세요', true);
  const asn0 = modeOf(room) === 'assassin' ? Logic.asnStart(ids, Math.round(now())) : null; // 암살전: 모두 1인 무리의 우두머리 + 무작위 사슬
  const terr0 = modeOf(room) === 'terr' ? Logic.terrStart(room.settings.area, ids) : null; // 땅따먹기: 반반 팀 + 서쪽·동쪽 기지
  const roles = asn0 ? { ...asn0.mem } : terr0 ? { ...terr0.teams } : Logic.assignRoles(ids, (room.settings && room.settings.chasers) || 1);
  const game = mergedSettings(room).out, mafia = modeOf(room) === 'mafia'; // 모든 폰이 같은 설정으로 시작
  const jobs = mafia ? Logic.assignJobs(roles, game.MF_POLICE || 0, game.MF_DOCTOR || 0) : {};
  Logic.applySettings(gameRules({ settings: { ...room.settings, game } }));
  const u = { status: 'playing', startAt: Math.round(now()) + RULES.START_DELAY_SEC * 1000, result: null, hits: null, events: null, traps: null, zones: null, pings: null, fakes: null, mugung: null, timeShift: null, storm: null, cams: null, supplies: null, smokes: null, blackout: null, nets: null, blocks: null, radioJam: null, fog: null, votes: null, rifle: null, rps: null, bombs: null, chats: null, chatOpen: null, fx: null, iceMines: null, shelters: null, spots: {}, 'settings/game': game };
  if (RULES.AUG_ON) for (let i = 0; i < game.SPOT_COUNT; i++) u.spots['s' + i] = { ...Logic.randomSpot(room.settings.area), at: 0 };
  for (const id of ids) {
    u[`players/${id}/role`] = roles[id];
    u[`players/${id}/selfDmg`] = 0;
    u[`players/${id}/st`] = asn0 || terr0 ? RULES.ST_MAX.runner : RULES.ST_MAX[roles[id]];
    u[`players/${id}/frozenUntil`] = 0;
    u[`players/${id}/anchor`] = null;
    u[`players/${id}/qr`] = roles[id] === 'runner' || mafia ? rid(12, ALNUM) : null; // 마피아 모드: 모두 QR (마피아도 숨어야 하니까)
    u[`players/${id}/augs`] = jobs[id] === 'police' ? { mfCheck: { got: 1 }, mfRifle: { got: 1 } } : jobs[id] === 'doctor' ? { mfGuard: { got: 1 } }
      : !mafia && roles[id] === 'chaser' && RULES.TRACK_USES > 0 ? { trackNow: { got: 1, left: RULES.TRACK_USES } } : null; // 추격자 기본 스킬
    u[`players/${id}/augPicks`] = 0;
    u[`players/${id}/offer`] = null;
    u[`players/${id}/stealthUntil`] = 0;
    u[`players/${id}/decoy`] = null;
    u[`players/${id}/forfeit`] = null;
    u[`players/${id}/stats`] = null;
    for (const k of ['hpMax', 'crewAt', 'stunUntil', 'hd', 'augIn', 'terrStun', 'terrHome', 'terrInv']) u[`players/${id}/${k}`] = null; // 암살전·땅따먹기
    for (const k of ['jamUntil', 'wantedUntil', 'mugungUntil', 'inkUntil', 'swap', 'prevFrozenUntil', 'tauntUntil', 'silenceUntil', 'revive', 'disguiseUntil', 'tracked', 'revTrail', 'jailed', 'iceSelf', 'frame', 'silentUntil', 'tele', 'revealUntil', 'zombieAt', 'drone', 'hound', 'houndUntil', 'altFakeUntil', 'lagUntil', 'lag', 'out', 'job', 'guard', 'shadowStop', 'mapHideUntil']) u[`players/${id}/${k}`] = null;
    if (jobs[id]) u[`players/${id}/job`] = jobs[id]; // 마피아 모드: 경찰·의사
  }
  u.asn = asn0; u.stabs = null; u.terr = terr0 ? terr0.terr : null; u.terrLog = null; if (!('chats' in u)) u.chats = null;
  // 리플레이: 이번 판 동선은 방 데이터와 따로 저장. 보안 규칙이 아직 옛날 거라 거절되면 리플레이 없이 진행
  u.replayId = null; u.replayExp = null;
  try {
    const rpId = rid(12, ALNUM), rpExp = u.startAt + (RULES.HIDE_SEC + RULES.GAME_SEC) * 1000 + RP_KEEP_MS;
    const P = Object.fromEntries(ids.map(id => [id, { name: room.players[id].name || '?', role: roles[id], job: jobs[id] || null }]));
    await Promise.race([set(rpRef(rpId), { exp: rpExp, meta: { startAt: u.startAt, hideSec: RULES.HIDE_SEC, gameSec: RULES.GAME_SEC, mode: modeOf(room), area: (room.settings && room.settings.area) || null, players: P } }),
      new Promise((_, rej) => setTimeout(() => rej(new Error('replay timeout')), 4000))]);
    u.replayId = rpId; u.replayExp = rpExp;
  } catch (e) { console.error(e); }
  await update(roomRef(), u);
});

/* ---------- 게임 ---------- */
