// 영역(모두에게 보임), 우리 팀 덫·분신·핑, 덫에 걸린 상대 위치
function drawSkills(mo) {
  const room = S.room, me = room && room.players[S.pid], t = now(); if (!me) return;
  const items = [], A = S.augs || {};
  // 자폭: 쓸 수 있을 때 내 주변에 범위 미리보기 (나만 보임)
  if (A.selfDestruct && (A.selfDestruct.readyAt || 0) <= t && S.fix && Logic.phaseAt(t, room.startAt, room.timeShift).phase === 'chase') {
    const ll = [S.fix.lat, S.fix.lng];
    items.push({ key: 'sdPrev', make: () => L.circle(ll, { radius: Logic.AUGS.selfDestruct.r, color: '#ff7a45', weight: 2, dashArray: '4 6', fillColor: '#ff7a45', fillOpacity: .06, interactive: false }), update: m => m.setLatLng([S.fix.lat, S.fix.lng]) });
  }
  // 자폭 폭발 범위 (4초)
  for (const b of (S.blasts || [])) if (b.until > t) items.push({ key: b.key, make: () => L.circle([b.lat, b.lng], { radius: b.r, color: '#ff4d1a', weight: 3, fillColor: '#ff7a45', fillOpacity: .35, interactive: false })
    .bindTooltip('💥 자폭', { permanent: true, direction: 'center', className: 'zoneTip' }) });
  if (A.cordon && (A.cordon.until || 0) > t && A.cordon.lat != null) {
    const c = A.cordon, lbl = `포위망 ${Math.ceil((c.until - t) / 1000)}초`;
    items.push({ key: 'cdn' + c.until, make: () => L.circle([c.lat, c.lng], { radius: Logic.AUGS.cordon.r, color: '#f5b800', weight: 3, dashArray: '8 6', fillColor: '#f5b800', fillOpacity: .1, interactive: false })
      .bindTooltip(lbl, { permanent: true, direction: 'center', className: 'zoneTip' }), update: m => m.setTooltipContent(lbl) });
  }
  if (me.role === 'chaser') for (const [id, m] of Object.entries(room.iceMines || {})) {
    if ((m.until || 0) <= t) continue;
    items.push({ key: 'im' + id, make: () => L.circleMarker([m.lat, m.lng], { radius: 7, color: '#fff', weight: 2, fillColor: '#67e8f9', fillOpacity: .95, interactive: false })
      .bindTooltip('빙결 지뢰', { permanent: true, direction: 'top', className: 'trapTip' }) });
  }
  for (const [id, p] of Object.entries(room.players)) { // 텔레파시: 내가 고른 팀원 + 나를 고른 팀원
    if (id === S.pid || p.role !== me.role || p.lat == null) continue;
    const mineT = me.tele && me.tele.with === id && (me.tele.until || 0) > t, theirT = p.tele && p.tele.with === S.pid && (p.tele.until || 0) > t;
    if (!mineT && !theirT) continue;
    items.push({ key: 'tl' + id, make: () => badge([p.lat, p.lng], { pre: '🔮', name: p.name, col: ROLE_COL[me.role] || '#3ba3ff' }), update: mk => mk.setLatLng([p.lat, p.lng]) });
  }
  if (A.predict && (A.predict.until || 0) > t && A.predict.p0) {
    const pr = A.predict, ll = [[pr.p0.lat, pr.p0.lng], [pr.p1.lat, pr.p1.lng]];
    items.push({ key: 'pred' + pr.until, make: () => L.polyline(ll, { color: '#ff4d4f', weight: 5, dashArray: '10 10', interactive: false }).bindTooltip('예측선 →', { permanent: true, direction: 'top', className: 'trapTip' }) });
  }
  for (const [id, z] of Object.entries(room.shelters || {})) {
    if ((z.until || 0) <= t) continue;
    const mine = z.role === me.role, lbl = `⛺ 피난처 ${Math.ceil((z.until - t) / 1000)}초`;
    items.push({ key: 'sh' + id, make: () => L.circle([z.lat, z.lng], { radius: Logic.AUGS.shelter.r, color: '#3ccf7a', weight: 3, dashArray: mine ? null : '6 6', fillColor: '#3ccf7a', fillOpacity: mine ? .18 : .1, interactive: false })
      .bindTooltip(lbl, { permanent: true, direction: 'center', className: 'zoneTip' }), update: m => m.setTooltipContent(lbl) });
  }
  for (const [id, p] of Object.entries(room.players)) { // 도박수: 상대 실제 위치 공개
    if (!p.role || p.role === me.role || p.lat == null || !((p.revealUntil || 0) > t) || !Logic.alive(p, (room.hits || {})[id])) continue;
    items.push({ key: 'rv' + id, make: () => badge([p.lat, p.lng], { pre: '🎲', name: p.name, col: ROLE_COL[p.role] || '#ff4d4f' }), update: mk => mk.setLatLng([p.lat, p.lng]) });
  }
  if (A.escapeRoute && (A.escapeRoute.until || 0) > t && S.fix && (S.snap || []).length) {
    const c = S.snap.reduce((b, x) => (!b || Logic.dist(S.fix, x) < Logic.dist(S.fix, b) ? x : b), null), k = Math.cos(S.fix.lat * Math.PI / 180);
    let dx = (S.fix.lng - c.lng) * k, dy = S.fix.lat - c.lat; const n = Math.hypot(dx, dy) || 1; dx /= n; dy /= n;
    const M = 1 / 111320, P = (f, sx, sy) => [S.fix.lat + (dy * f + sy) * M, S.fix.lng + (dx * f + sx) * M / k];
    const tip = P(60, 0, 0), wing = s => P(45, -dy * 12 * s, dx * 12 * s), pts = [[S.fix.lat, S.fix.lng], tip, wing(1), tip, wing(-1)];
    items.push({ key: 'esc', make: () => L.polyline(pts, { color: '#3ccf7a', weight: 6, opacity: .9, lineCap: 'round', interactive: false }), update: m => m.setLatLngs(pts) });
  }
  for (const [id, z] of Object.entries(room.zones || {})) {
    if ((z.until || 0) <= t) continue;
    const mine = z.role === me.role, label = `영역전개 ${Math.ceil((z.until - t) / 1000)}초`;
    items.push({ key: 'z' + id, make: () => L.circle([z.lat, z.lng], { radius: z.r, color: '#c084fc', weight: 3, dashArray: mine ? null : '6 6', fillColor: '#a855f7', fillOpacity: mine ? .12 : .22, interactive: false })
      .bindTooltip(label, { permanent: true, direction: 'center', className: 'zoneTip' }), update: m => m.setTooltipContent(label) });
  }
  for (const [id, tr] of Object.entries(room.traps || {})) {
    if (tr.role !== me.role || (tr.until || 0) <= t) continue;
    items.push({ key: 't' + id, make: () => L.circleMarker([tr.lat, tr.lng], { radius: 7, color: '#fff', weight: 2, fillColor: '#64748b', fillOpacity: .95, interactive: false })
      .bindTooltip('덫', { permanent: true, direction: 'top', className: 'trapTip' }) });
  }
  for (const [id, p] of Object.entries(room.players)) {
    if (p.role !== me.role || !p.decoy || (p.decoy.until || 0) <= t) continue;
    const q = Logic.shownPos({ ...p, swap: null }, t); // 도플갱어는 걸어가는 자리
    items.push({ key: 'd' + id + ':' + p.decoy.until, make: () => L.circleMarker([q.lat, q.lng], { radius: 9, color: '#fff', weight: 2, dashArray: '3 3', fillColor: me.role === 'chaser' ? '#ff4d4f' : '#3ba3ff', fillOpacity: .35, interactive: false })
      .bindTooltip(`${esc(p.name)}의 분신`, { permanent: true, direction: 'top', className: 'trapTip' }), update: mk => mk.setLatLng([q.lat, q.lng]) });
  }
  const meDead = !Logic.alive({ ...me, selfDmg: S.selfDmg, augs: S.augs }, (room.hits || {})[S.pid]);
  const spy = !!av('eavesdrop'); // 도청: 상대 팀 핑도 보임
  for (const [id, pg] of Object.entries(blackedOut() ? {} : room.pings || {})) {
    const enemy = pg.role !== me.role && modeOf(room) !== 'mafia'; // 마피아 모드: 팀을 숨기려고 핑은 모두에게
    if ((pg.until || 0) <= t || (enemy && !meDead && !spy) || !PING[pg.kind] || (pg.fake && pg.by === S.pid)) continue; // 내 이름으로 된 위조 핑은 나한테 안 보임
    const name = (room.players[pg.by] || {}).name || '';
    items.push({ key: 'p' + id, make: () => L.marker([pg.lat, pg.lng], { interactive: false, icon: L.divIcon({ className: '', iconSize: [30, 30], iconAnchor: [15, 15], html: `<div style="font-size:26px;line-height:30px;text-align:center">${PING[pg.kind][0]}</div>` }) })
      .bindTooltip(`${enemy && !meDead ? '🎧 ' : ''}${esc(name)}: ${PING[pg.kind][1]}`, { permanent: true, direction: 'top', offset: [0, -12], className: 'pingTip' + (enemy ? ' enemyPing' : '') }) });
  }
  // 추격자: 현상수배·무궁화에 걸린 도망자의 진짜 위치 (실시간)
  if (me.role === 'chaser') for (const [id, p] of Object.entries(room.players)) {
    if (p.role !== 'runner' || p.lat == null || !Logic.alive(p, (room.hits || {})[id])) continue;
    const w = (p.wantedUntil || 0) > t, m = (p.mugungUntil || 0) > t, tn = (p.tauntUntil || 0) > t, hd = (p.houndUntil || 0) > t;
    if (!w && !m && !tn && !hd) continue;
    const dg = disguised(p, t), bo = { pre: w ? '🎯' : m ? '🌸' : tn ? '🤪' : '🐕', name: dg ? '추격자' : p.name, col: dg ? '#ff4d4f' : '#3ba3ff' }; // 위장 중이면 추격자처럼
    items.push({ key: 'x' + id + (dg ? 'd' : ''), make: () => badge([p.lat, p.lng], bo), update: mk => badgeSet(mk, [p.lat, p.lng], bo) });
  }
  // 도망자: 거울로 되돌려진 현상수배에 걸린 추격자 위치
  if (me.role === 'runner') for (const [id, p] of Object.entries(room.players)) {
    if (p.role !== 'chaser' || p.lat == null || (p.wantedUntil || 0) <= t) continue;
    items.push({ key: 'xw' + id, make: () => badge([p.lat, p.lng], { pre: '🎯', name: p.name, col: '#ff4d4f' }), update: mk => mk.setLatLng([p.lat, p.lng]) });
  }
  // 위치 추적기: 붙은 상대의 위치를 20초마다 찍음
  for (const [id, p] of Object.entries(room.players)) {
    const tk = p.tracked;
    if (!p.role || p.role === me.role || !tk || (tk.until || 0) <= t || p.lat == null) continue;
    if (me.role === 'chaser' && radioJammed(t)) continue; // 전파 방해
    const idx = Math.floor((t - tk.at) / (Logic.AUGS.tracker.every * 1000)), sn = S.trackSnap[id];
    if (!sn || sn.idx !== idx || sn.at !== tk.at) S.trackSnap[id] = { idx, at: tk.at, lat: p.lat, lng: p.lng, t };
    const q = S.trackSnap[id], label = `📍 ${esc(p.name)} (${Math.round((t - q.t) / 1000)}초 전)`;
    items.push({ key: 'tk' + id + q.idx, make: () => L.circleMarker([q.lat, q.lng], { radius: 10, color: '#fff', weight: 3, fillColor: '#eab308', fillOpacity: .95, interactive: false })
      .bindTooltip(label, { permanent: true, direction: 'top', className: 'trapTip' }), update: mk => mk.setTooltipContent(label) });
  }
  // 우리 팀 연막
  for (const [id, sm] of Object.entries(room.smokes || {})) {
    if (sm.role !== me.role || (sm.until || 0) <= t) continue;
    items.push({ key: 'sm' + id, make: () => L.circle([sm.lat, sm.lng], { radius: Logic.AUGS.smoke.v, color: '#9ca3af', weight: 2, fillColor: '#9ca3af', fillOpacity: .3, interactive: false })
      .bindTooltip('💨 연막', { permanent: true, direction: 'center', className: 'trapTip' }) });
  }
  // 보급 상자: 쓴 사람은 처음부터, 나머지는 공지 뒤부터 (블랙아웃이면 안 보임)
  if (!blackedOut()) for (const [id, bx] of Object.entries(room.supplies || {})) {
    if (bx.by !== S.pid && t < bx.pubAt) continue;
    const label = t < bx.dropAt ? `📦 보급 낙하 ${Math.ceil((bx.dropAt - t) / 1000)}초` : '📦 보급 상자';
    items.push({ key: 'sup' + id, make: () => L.circleMarker([bx.lat, bx.lng], { radius: 13, color: '#fff', weight: 3, fillColor: '#ff7ad9', fillOpacity: .95, interactive: false })
      .bindTooltip(label, { permanent: true, direction: 'top', className: 'spotTip' }), update: mk => mk.setTooltipContent(label) });
  }
  // 내 은신처
  const ho = S.augs && S.augs.hideout;
  if (ho && (ho.until || 0) > t && ho.lat != null) items.push({ key: 'ho' + ho.until, make: () => L.circle([ho.lat, ho.lng], { radius: Logic.AUGS.hideout.v, color: '#3ccf7a', weight: 3, fillColor: '#3ccf7a', fillOpacity: .15, interactive: false })
    .bindTooltip('🏠 은신처', { permanent: true, direction: 'center', className: 'trapTip' }) });
  // 역탐지: 나를 본 추격자 위치 5초 (실시간)
  if (S.quadShow && S.quadShow.until > t) { // 사분면 탐지 결과
    const { q, n, b, until } = S.quadShow, la = q[0] === 'n' ? [b.lat, b.n] : [b.s, b.lat], lo = q[1] === 'e' ? [b.lng, b.e] : [b.w, b.lng];
    items.push({ key: 'quad' + q + until, make: () => L.rectangle([[la[0], lo[0]], [la[1], lo[1]]], { color: '#ffd400', weight: 3, dashArray: '8 6', fillColor: '#ffd400', fillOpacity: .12, interactive: false })
      .bindTooltip(`도망자 ${n}명`, { permanent: true, direction: 'center', className: 'quadTip' }) });
  }
  if (modeOf(room) === 'ice' && me.role === 'runner') for (const [id, p] of Object.entries(room.players)) {
    if (id === S.pid || p.role !== 'runner' || !Logic.alive(p, (room.hits || {})[id])) continue;
    const fz = p.jailed || (p.iceSelf && (p.iceSelf.until || 0) > t ? p.iceSelf : null); if (!fz || fz.lat == null) continue;
    const bo = { pre: '🧊', name: p.name, col: '#67e8f9' };
    items.push({ key: 'ice' + id + fz.at, make: () => badge([fz.lat, fz.lng], bo), update: mk => mk.setLatLng([fz.lat, fz.lng]) });
  }
  S.detects = (S.detects || []).filter(d => d.until > t);
  for (const d of S.detects) {
    const p = room.players[d.id]; if (!p || p.lat == null) continue;
    items.push({ key: 'q' + d.id, make: () => badge([p.lat, p.lng], { pre: '🛰', name: p.name, col: '#ff4d4f' }), update: mk => mk.setLatLng([p.lat, p.lng]) });
  }
  S.trapReveals = (S.trapReveals || []).filter(r => r.until > t);
  for (const r of S.trapReveals) {
    items.push({ key: 'r' + r.until + r.name, make: () => L.circleMarker([r.lat, r.lng], { radius: 10, color: '#fff', weight: 2, fillColor: '#ff7a45', fillOpacity: .95, interactive: false })
      .bindTooltip(`${r.icon || '🪤'} ${esc(r.name)}`, { permanent: true, direction: 'top', className: 'chaserTip' }) });
  }
  // 자기장: 줄어드는 구역 (모두에게 보임)
  const area = room.settings && room.settings.area, sm = room.storm;
  if (area && sm && t >= sm.at && t < sm.until) {
    const r = Logic.stormR(area.r, sm, t), label = `🌀 자기장 ${Math.ceil((sm.until - t) / 1000)}초`, st = { color: '#ff4d4f', weight: 4, dashArray: '10 8', fillColor: '#ff4d4f', fillOpacity: .05, interactive: false };
    const ring = area.poly ? Logic.areaRing(area, r / area.r) : null; // 꼭짓점 구역은 같은 모양으로 중심 쪽으로 줄어듦
    items.push({ key: 'storm' + sm.at, make: () => (ring ? L.polygon(ring, st) : L.circle([area.lat, area.lng], { radius: r, ...st }))
      .bindTooltip(label, { permanent: true, direction: 'top', className: 'chaserTip' }), update: mk => { if (ring) mk.setLatLngs(ring); else mk.setRadius(r); mk.setTooltipContent(label); } });
  }
  // 우리 팀 CCTV·감시 카메라
  for (const [id, c] of Object.entries(room.cams || {})) {
    if (c.role !== me.role || (c.until || 0) <= t) continue;
    items.push({ key: 'cam' + id, make: () => L.circle([c.lat, c.lng], { radius: c.r || Logic.AUGS.cctv.v, color: '#64748b', weight: 2, dashArray: '4 6', fillColor: '#64748b', fillOpacity: .08, interactive: false })
      .bindTooltip(c.spy ? '📷 감시 카메라' : '📹 CCTV', { permanent: true, direction: 'center', className: 'trapTip' }) });
  }
  // 마피아 모드: 떨어진 저격총 (모두에게 보임)
  if (room.rifle) { const rf = room.rifle; items.push({ key: 'rifle' + rf.at, make: () => L.marker([rf.lat, rf.lng], { interactive: false, icon: L.divIcon({ className: '', iconSize: [30, 30], iconAnchor: [15, 15], html: '<div style="font-size:26px;line-height:30px;text-align:center">🔫</div>' }) })
    .bindTooltip('저격총 (시민이 10m 안에 가면 주움)', { permanent: true, direction: 'top', offset: [0, -12], className: 'spotTip' }) }); }
  // 우리 팀 그물
  for (const [id, n] of Object.entries(room.nets || {})) {
    if (n.role !== me.role || (n.until || 0) <= t) continue;
    items.push({ key: 'net' + id, make: () => L.circle([n.lat, n.lng], { radius: Logic.AUGS.net.v, color: '#94a3b8', weight: 2, dashArray: '2 5', fillColor: '#94a3b8', fillOpacity: .1, interactive: false })
      .bindTooltip('🕸 그물', { permanent: true, direction: 'center', className: 'trapTip' }) });
  }
  // 봉쇄선: 모두에게 보임
  for (const [id, bl] of Object.entries(room.blocks || {})) {
    if ((bl.until || 0) <= t || !bl.a || !bl.b) continue;
    const label = `🚧 봉쇄선 ${Math.ceil((bl.until - t) / 1000)}초`;
    items.push({ key: 'bl' + id, make: () => L.polyline([[bl.a.lat, bl.a.lng], [bl.b.lat, bl.b.lng]], { color: '#ff4d4f', weight: 7, dashArray: '12 8', opacity: .9, interactive: false })
      .bindTooltip(label, { permanent: true, direction: 'center', className: 'chaserTip' }), update: mk => mk.setTooltipContent(label) });
  }
  if (S.blockPick && S.blockPick.pts[0]) { // 봉쇄선 고르는 중: 첫 점
    const a0 = S.blockPick.pts[0];
    items.push({ key: 'blP' + a0.lat + ',' + a0.lng, make: () => L.circleMarker([a0.lat, a0.lng], { radius: 8, color: '#fff', weight: 2, fillColor: '#ff4d4f', fillOpacity: .95, interactive: false })
      .bindTooltip('🚧 첫 점', { permanent: true, direction: 'top', className: 'chaserTip' }) });
  }
  // 드론: 모두에게 보임. 주인에겐 탐지 범위 + 범위 안 도망자 (전파 방해 중엔 안 보임)
  for (const [id, p] of Object.entries(room.players)) {
    const dr = p.drone; if (!dr || (dr.until || 0) <= t) continue;
    const q = Logic.movingPos(dr, t), lbl = p.role === me.role ? `🛸 ${esc(p.name)}의 드론` : '🛸 드론';
    items.push({ key: 'dr' + id + dr.until, make: () => L.circleMarker([q.lat, q.lng], { radius: 8, color: '#fff', weight: 2, fillColor: '#a3a3a3', fillOpacity: .95, interactive: false })
      .bindTooltip(lbl, { permanent: true, direction: 'top', className: 'trapTip' }), update: mk => mk.setLatLng([q.lat, q.lng]) });
    if (id !== S.pid) continue;
    items.push({ key: 'drR' + dr.until, make: () => L.circle([q.lat, q.lng], { radius: Logic.AUGS.drone.r, color: '#a3a3a3', weight: 2, dashArray: '4 6', fill: false, interactive: false }), update: mk => mk.setLatLng([q.lat, q.lng]) });
    if (radioJammed(t)) continue;
    for (const [rid, r] of Object.entries(room.players)) {
      if (r.role !== 'runner' || r.lat == null || !Logic.alive(r, (room.hits || {})[rid]) || (r.stealthUntil || 0) > t || Logic.inSmoke(r, room.smokes, t)) continue;
      const rp = Logic.shownPos(r, t, room.players); if (Logic.dist(rp, q) > Logic.AUGS.drone.r) continue;
      const dg = disguised(r, t);
      items.push({ key: 'drS' + rid + (dg ? 'd' : ''), make: () => badge([rp.lat, rp.lng], { pre: '🛸', name: dg ? '추격자' : r.name, col: dg ? '#ff4d4f' : '#3ba3ff' }), update: mk => mk.setLatLng([rp.lat, rp.lng]) });
    }
  }
  // 그림자 밟기: 내 30m 안 도망자의 20초 전 자리 (나만 보임)
  for (const sh of shadowPts(room, t)) {
    const nm = `👣 ${esc(room.players[sh.id].name)}의 그림자`;
    items.push({ key: 'sh' + sh.id, make: () => L.circle([sh.lat, sh.lng], { radius: Logic.AUGS.shadowStep.hitR, color: '#a78bfa', weight: 3, dashArray: '4 4', fillColor: '#1e1b4b', fillOpacity: .55, interactive: false })
      .bindTooltip(nm, { permanent: true, direction: 'top', className: 'trapTip' }), update: mk => mk.setLatLng([sh.lat, sh.lng]) });
  }
  // 사냥개: 모두에게 보임 (주인은 내 폰에서 계산한 자리)
  for (const [id, p] of Object.entries(room.players)) {
    const hd = id === S.pid && S.hound ? S.hound : p.hound; if (!hd || (hd.until || 0) <= t) continue;
    items.push({ key: 'hd' + id + hd.until, make: () => L.marker([hd.lat, hd.lng], { interactive: false, icon: L.divIcon({ className: '', iconSize: [28, 28], iconAnchor: [14, 14], html: '<div style="font-size:24px;line-height:28px;text-align:center">🐕</div>' }) })
      .bindTooltip(p.role === me.role ? `${esc(p.name)}의 사냥개` : '사냥개', { permanent: true, direction: 'top', offset: [0, -12], className: 'trapTip' }), update: mk => mk.setLatLng([hd.lat, hd.lng]) });
  }
  // 탐지기: 주변 상대 덫·가짜 보물·CCTV
  const dt = S.augs && S.augs.detector;
  if (dt && (dt.until || 0) > t && S.fix) {
    const R = Logic.AUGS.detector.v;
    for (const [kind, col, label] of [['traps', '#ff7a45', '🪤 상대 덫'], ['fakes', '#ffcf40', '🎁 가짜 보물'], ['cams', '#ff4d4f', '📹 상대 카메라'], ['nets', '#94a3b8', '🕸 상대 그물']]) {
      for (const [id, x] of Object.entries(room[kind] || {})) {
        if (x.role === me.role || (x.until || 0) <= t || Logic.dist(S.fix, x) > R) continue;
        items.push({ key: 'det' + kind + id, make: () => L.circleMarker([x.lat, x.lng], { radius: 9, color: col, weight: 3, dashArray: '3 3', fillColor: '#111418', fillOpacity: .8, interactive: false })
          .bindTooltip(label, { permanent: true, direction: 'top', className: 'trapTip' }) });
      }
    }
  }
  // 발자국 추적: 대상의 진짜 경로를 15초 늦게 (투명화 중엔 끊김)
  const tr0 = S.augs && S.augs.trail;
  // 내 발자국 추적, 또는 거울로 되돌려져서 내가 그 추격자를 추적
  const tr = me.role === 'chaser' && tr0 && (tr0.until || 0) > t ? (radioJammed(t) ? null : tr0) : me.revTrail && (me.revTrail.until || 0) > t ? me.revTrail : null; // 전파 방해 중엔 안 보임
  if (tr && tr.target && room.players[tr.target]) {
    const delay = Logic.AUGS.trail.delay * 1000, h = (S.hist[tr.target] || []).filter(x => x.t <= t - delay && x.t >= t - delay - 15000);
    const segs = [[]]; for (const x of h) { if (x.st) { if (segs[segs.length - 1].length) segs.push([]); } else segs[segs.length - 1].push([x.lat, x.lng]); }
    const lines = segs.filter(sg => sg.length), last = h[h.length - 1], name = esc(room.players[tr.target].name);
    if (lines.length) items.push({ key: 'trailL', make: () => L.polyline(lines, { color: '#fb923c', weight: 5, dashArray: '2 10', lineCap: 'round', interactive: false }), update: mk => mk.setLatLngs(lines) });
    if (last && !last.st) items.push({ key: 'trailM', make: () => L.circleMarker([last.lat, last.lng], { radius: 10, color: '#fff', weight: 3, fillColor: '#fb923c', fillOpacity: .95, interactive: false })
      .bindTooltip(`👣 ${name} (15초 전)`, { permanent: true, direction: 'top', className: 'trailTip' }), update: mk => mk.setLatLng([last.lat, last.lng]) });
  }
  // 추격자 대기 범위: 숨는 시간·잡은 뒤 정지 중엔 제자리 기준 15m 안에 있어야 함 (안이면 초록, 벗어나면 빨강)
  const ph0 = room.startAt ? Logic.phaseAt(t, room.startAt, room.timeShift).phase : '';
  if (me.role === 'chaser' && S.anchor && (ph0 === 'hide' || (me.frozenUntil || 0) > t)) {
    const out = S.fix && Logic.dist(S.fix, S.anchor) > RULES.WAIT_MOVE_M, col = out ? '#ff4d4f' : '#3ccf7a', a0 = S.anchor;
    items.push({ key: 'wait' + a0.lat + ',' + a0.lng, make: () => L.circle([a0.lat, a0.lng], { radius: RULES.WAIT_MOVE_M, color: col, weight: 4, dashArray: '8 6', fillColor: col, fillOpacity: .12, interactive: false })
      .bindTooltip(`대기 범위 ${RULES.WAIT_MOVE_M}m`, { permanent: true, direction: 'top', className: 'trapTip' }), update: mk => mk.setStyle({ color: col, fillColor: col }) });
  }
  syncLayer(mo, 'skillL', items);
}

