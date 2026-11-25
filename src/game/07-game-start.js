function enterGame() {
  const room = S.room, me = room.players[S.pid], key = S.code + ':' + room.startAt;
  if (S.gameKey !== key) {
    S.gameKey = key;
    Object.assign(S, {
      terrCell: null, terrProg: null, terrHomeSince: 0, terrWhy: '', rollerUntil: 0, droneUntil: 0, terrPick: false, tag: null, terrBusy: {}, terrSeen: {},
      asnKey: null, stab: null, sellFor: null, asnInDone: new Set(), bloodK: null, duelSeen: null, asnNearAt: 0, asnFixAt: 0,
      augs: me.augs || {}, augBarHtml: null, offerSent: false, lastSnapIdx: null, spotBusy: false, trapBusy: false, fakeBusy: false, trapReveals: [], alarmAt: 0,
      detects: [], shake: null, mugHit: null, pickCb: null, hist: {}, rhDist: 0, camIn: {}, mfChecked: {}, rifleDropped: false, rifleBusy: false, voteShownK: 0, voteResolving: 0, hurtOut: false, mfSnapIdx: null, blockHit: {}, blockPrev: null, myTrail: [], netWas: false, hound: null, chatLastAt: now(), chatUnread: 0, chatHtml: '', hbNext: 0, shadowHit: {}, shadowDmgAt: null, bombGone: {}, blockPick: null, pingFake: false, trackSnap: {}, supBusy: false,
      supSeen: Object.fromEntries(Object.entries(room.supplies || {}).filter(([, b]) => now() >= b.pubAt).map(([id]) => [id, 1])), reviveAt: (me.revive && me.revive.at) || null,
      stats: { dist: 0, vmax: 0, skills: 0, catches: 0, ...(me.stats || {}) }, statPos: null, seenPings: new Set(Object.keys(room.pings || {})),
      pingAt: 0, warnWas: false, specOn: false, resultKey: null,
      selfDmg: me.selfDmg || 0, anchor: me.anchor || null,
      waitOut: 0, ruleSec: 0, lastMapIdx: null, lastArrowKey: null, snap: [], dead: {}, warn: [],
      lastTick: 0, lastWrite: 0, winSent: false, minuteWarned: false, arrowPopKey: null,
      rpBuf: [], rpAt: 0, rpSent: Date.now(), quadShow: null
    });
    if (room.replayId) rpRemember(room.replayId, room.replayExp);
    S.st = me.st ?? stMaxOf(me.role);
    $('#ov-aug').classList.remove('on');
    const hits = room.hits || {};
    for (const [id, p] of Object.entries(room.players)) {
      if (p.role && Logic.hpOf(id === S.pid ? { ...p, selfDmg: S.selfDmg, augs: S.augs } : p, hits[id]) <= 0) S.dead[id] = true;
    }
    // 방금 시작한 게임이면 역할 공개 연출 (새로고침해서 다시 들어온 경우엔 생략)
    if (now() - room.startAt < 15000 && Date.now() - (S.revealAt || 0) > 20000) { S.revealAt = Date.now(); showRoleReveal(me.role); }
    S.aliveWas = !S.dead[S.pid];
    const md = modeOf(room);
    if (md !== 'classic' && now() - room.startAt < 15000) setTimeout(() => toast(`${Logic.MODES[md]} 모드 · ${MODE_HINT[md]}`, true), 4000);
  } else syncFromDb(room, me);
  if (S.screen !== 's-game') {
    show('s-game'); $('#ov-invite').classList.remove('on');
    const mo = getMap('gmap');
    if (!mo.bound) { mo.bound = true; mo.map.on('dragstart', () => { S.follow = false; }); mo.map.on('click', e => blockClick(e.latlng)); bindLongPress(mo); if (mo.map.setBearing) bindRotate(mo); }
    setTimeout(() => { mo.map.invalidateSize(); applyBearing(true); }, 50);
    if (me.role === 'runner') takeSnapshot();
  }
  $('#ov-resume').classList.toggle('on', !S.sensorsOn);
}
// 다른 사람이 바꾼 내 상태 반영: 쿨타임(쉴드는 추격자 폰이 기록), 빼앗긴 증강(소매치기), 피의 서약 부활
function syncFromDb(room, me) {
  const db = me.augs || {};
  for (const id of Object.keys(db)) if (!S.augs[id] && Logic.AUGS[id]) { S.augs = { ...S.augs, [id]: db[id] }; toast(`✨ [${Logic.AUGS[id].name}] 증강을 얻었어요`); }
  for (const id of Object.keys(S.augs || {})) {
    if (!db[id]) { const nx = { ...S.augs }; delete nx[id]; S.augs = nx; continue; }
    if ((db[id].readyAt || 0) > (S.augs[id].readyAt || 0)) S.augs = { ...S.augs, [id]: { ...S.augs[id], readyAt: db[id].readyAt } };
  }
  if (me.revive && me.revive.at !== S.reviveAt) {
    S.reviveAt = me.revive.at; S.selfDmg = me.selfDmg || 0; S.aliveWas = true; S.specOn = false;
    delete S.dead[S.pid]; if (S.stats) { delete S.stats.diedAt; delete S.stats.deathWhy; delete S.stats.deathBy; }
    $('#ov-qr').classList.remove('on'); // 띄워 둔 부활용 QR 창 닫기
    const by = (room.players[me.revive.by] || {}).name || '?';
    toast(`🩸 피의 서약! ${by} 덕분에 부활했어요 (체력 ${Math.ceil(me.revive.hp)})`, true); flash('rgba(220,38,38,.95)'); vibrate([300, 100, 300]); sfx('augS');
  }
}
$('#btnResume').onclick = safe(async () => { await startSensors(); $('#ov-resume').classList.remove('on'); });
$('#btnFollow').onclick = () => { S.follow = true; drawMaps(); };
$('#btnNorth').onclick = () => {
  // 내 방향 ↔ 북쪽 고정, 손으로 돌린 상태면 다시 내 방향 (나침반이 없으면 북쪽)
  const next = S.mapMode === 'heading' ? 'north' : S.compass ? 'heading' : 'north';
  if (next === S.mapMode) return toast('나침반을 쓸 수 없어서 북쪽 고정이에요');
  S.mapMode = next; toast(next === 'north' ? '지도: 북쪽 고정' : '지도: 내가 보는 방향이 위'); applyBearing(true);
};

/* ---------- 증강 ---------- */
Logic.setClock(now);
