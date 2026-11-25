function sizeRotMap() {
  const w = $('#gwrap'), el = $('#gmap'), W = w.clientWidth || innerWidth, H = w.clientHeight || innerHeight, D = Math.ceil(Math.hypot(W, H));
  Object.assign(el.style, { width: D + 'px', height: D + 'px', left: (W - D) / 2 + 'px', top: (H - D) / 2 + 'px' });
}
function makeRotatable(map) {
  const el = map.getContainer(); let b = 0;
  map._rotDeg = 0;
  map.getBearing = () => b;
  map._rotApply = () => {
    const d = b + ($('#gwrap').classList.contains('flipped') ? 180 : 0); map._rotDeg = d;
    el.style.transform = d ? `rotate(${d}deg)` : ''; el.style.setProperty('--nb', -d + 'deg');
  };
  map.setBearing = d => { b = ((d % 360) + 360) % 360; map._rotApply(); map.fire('rotate'); };
  addEventListener('resize', () => { sizeRotMap(); map.invalidateSize(); });
}
// 화면 좌표 → 돌기 전 지도 안 좌표
function unrotate(map, x, y) {
  const el = map._container, r = el.getBoundingClientRect(), a = (map._rotDeg || 0) * Math.PI / 180, c = Math.cos(a), sn = Math.sin(a);
  const vx = x - (r.left + r.width / 2), vy = y - (r.top + r.height / 2);
  return L.point(c * vx + sn * vy + el.offsetWidth / 2, -sn * vx + c * vy + el.offsetHeight / 2);
}
(() => {
  const m2c = L.Map.prototype.mouseEventToContainerPoint;
  L.Map.prototype.mouseEventToContainerPoint = function (e) { return this._rotDeg ? unrotate(this, e.clientX, e.clientY) : m2c.call(this, e); };
  const mv = L.Draggable.prototype._onMove;
  L.Draggable.prototype._onMove = function (e) {
    const m = maps.gmap && maps.gmap.map;
    if (!m || !m._rotDeg || this._element !== m._mapPane || (e.touches && e.touches.length > 1)) return mv.call(this, e);
    const t = e.touches && e.touches.length === 1 ? e.touches[0] : e, a = m._rotDeg * Math.PI / 180, c = Math.cos(a), sn = Math.sin(a);
    const dx = t.clientX - this._startPoint.x, dy = t.clientY - this._startPoint.y;
    this._parentScale = { x: 1, y: 1 }; // 돌아간 상자 크기로 배율을 잘못 재지 않게
    return mv.call(this, { clientX: this._startPoint.x + c * dx + sn * dy, clientY: this._startPoint.y - sn * dx + c * dy, target: e.target, srcElement: e.srcElement, type: e.type,
      preventDefault: () => { if (e.cancelable !== false && e.preventDefault) e.preventDefault(); }, stopPropagation: () => e.stopPropagation && e.stopPropagation() });
  };
  // 배지·글자는 지도와 반대로 돌려서 항상 똑바로 (회전 중심 = 가리키는 점)
  const up = el => { if (el) el.style.transform += ' rotate(var(--nb, 0deg))'; };
  const sp = L.Marker.prototype._setPos;
  L.Marker.prototype._setPos = function (pos) {
    sp.call(this, pos);
    if (this._icon && this._map && this._map._rotDeg != null) { const an = this.options.icon && this.options.icon.options.iconAnchor; if (an) this._icon.style.transformOrigin = `${an[0]}px ${an[1]}px`; up(this._icon); }
  };
  const tp = L.Tooltip.prototype._setPosition;
  L.Tooltip.prototype._setPosition = function (pos) {
    tp.call(this, pos);
    if (this._map && this._map._rotDeg != null && this._container) { const q = L.DomUtil.getPosition(this._container); this._container.style.transformOrigin = `${pos.x - q.x}px ${pos.y - q.y}px`; up(this._container); }
  };
})();
function getMap(id) {
  if (maps[id]) return maps[id];
  // 게임 지도만 회전 가능 (나침반 방향 + 두 손가락)
  const rot = id === 'gmap';
  if (rot) sizeRotMap();
  const map = L.map(id, { zoomControl: false, attributionControl: !rot }).setView([37.5665, 126.978], 16);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors' }).addTo(map);
  if (rot) makeRotatable(map);
  return (maps[id] = { map, self: null, acc: null, area: null, others: [], centered: false });
}
// 사람 표시: 선수 배지 (이름 첫 글자 + 팀 색 테두리 + 아래 기울어진 이름표). 나는 노란 테두리 '나'
// 미니맵처럼 한때 찍힌 위치는 '몇 초 전' 표시 + 오래될수록 흐려짐
const ROLE_COL = { chaser: '#ff4d4f', runner: '#3ba3ff' };
function badgeHtml(o) {
  const nm = String(o.name ?? '?'), ini = o.ini || Array.from(nm.trim())[0] || '?';
  return `<div class="pb${o.me ? ' me' : ''}" style="--c:${o.col}${o.op != null ? `;opacity:${o.op}` : ''}"><b>${esc(ini)}</b>${o.me ? '' : `<i>${o.pre ? o.pre + ' ' : ''}${esc(nm)}${o.sub != null ? ' ' + esc(o.sub) : ''}</i>`}${o.age != null ? `<em>${esc(o.age)}</em>` : ''}</div>`;
}
const badgeIcon = o => L.divIcon({ className: 'pbw', html: badgeHtml(o), iconSize: o.me ? [40, 40] : [34, 34], iconAnchor: o.me ? [20, 20] : [17, 17] });
function badge(ll, o) { const m = L.marker(ll, { icon: badgeIcon(o), interactive: false, keyboard: false }); m._bh = badgeHtml(o); return m; }
function badgeSet(m, ll, o) { if (ll) m.setLatLng(ll); const h = badgeHtml(o); if (h !== m._bh) { m._bh = h; m.setIcon(badgeIcon(o)); } }
function drawSelf(mo, color) {
  if (!S.fix) return;
  const ll = [S.fix.lat, S.fix.lng], r = Math.min(S.fix.acc, 200);
  if (!mo.self) {
    mo.acc = L.circle(ll, { radius: r, stroke: false, fillColor: color, fillOpacity: .15, interactive: false }).addTo(mo.map);
    mo.self = badge(ll, { me: true, ini: '나', col: '#ffd400' }).setZIndexOffset(1000).addTo(mo.map);
  } else {
    mo.self.setLatLng(ll);
    mo.acc.setLatLng(ll).setRadius(r).setStyle({ fillColor: color });
  }
  if (!mo.centered) { mo.map.setView(ll, 17); mo.centered = true; }
}
// 꼭짓점 찍는 중: 찍은 순서대로 선 + 번호 점 (처음 점과 마지막 점도 점선으로 이어서 닫힌 모양 미리 보기)
function drawJailDraft(mo) {
  const pts = S.jailEdit, key = pts ? pts.map(p => p.lat + ',' + p.lng).join(';') : '';
  if (mo.jdKey === key) return;
  mo.jdKey = key;
  if (mo.jd) { mo.jd.remove(); mo.jd = null; }
  if (!pts || !pts.length) return;
  const g = L.layerGroup().addTo(mo.map), ll = pts.map(p => [p.lat, p.lng]);
  if (ll.length >= 3) L.polygon(ll, { color: '#cbd5e1', weight: 3, fillColor: '#334155', fillOpacity: .35, dashArray: '4 6', interactive: false }).addTo(g);
  else if (ll.length === 2) L.polyline(ll, { color: '#cbd5e1', weight: 3, interactive: false }).addTo(g);
  ll.forEach((x, i) => L.marker(x, { interactive: false, icon: L.divIcon({ className: '', iconSize: [22, 22], iconAnchor: [11, 11],
    html: `<div style="width:22px;height:22px;border-radius:50%;background:#cbd5e1;color:#111;font:800 12px/22px sans-serif;text-align:center;border:2px solid #111">${i + 1}</div>` }) }).addTo(g));
  mo.jd = g;
}
function drawPolyDraft(mo) {
  const pts = S.polyEdit, key = pts ? pts.map(p => p.lat + ',' + p.lng).join(';') : '';
  if (mo.draftKey === key) return;
  mo.draftKey = key;
  if (mo.draft) { mo.draft.remove(); mo.draft = null; }
  if (!pts || !pts.length) return;
  const g = L.layerGroup().addTo(mo.map), ll = pts.map(p => [p.lat, p.lng]);
  if (ll.length >= 2) L.polyline(ll, { color: '#ffb020', weight: 3, interactive: false }).addTo(g);
  if (ll.length >= 3) L.polyline([ll[ll.length - 1], ll[0]], { color: '#ffb020', weight: 2, dashArray: '4 6', interactive: false }).addTo(g);
  ll.forEach((x, i) => L.marker(x, { interactive: false, icon: L.divIcon({ className: '', iconSize: [22, 22], iconAnchor: [11, 11],
    html: `<div style="width:22px;height:22px;border-radius:50%;background:#ffb020;color:#111;font:800 12px/22px sans-serif;text-align:center;border:2px solid #111">${i + 1}</div>` }) }).addTo(g));
  mo.draft = g;
}
function drawArea(mo, area, fit) {
  if (!area) { if (mo.area) { mo.area.remove(); mo.area = null; } return; }
  const ll = [area.lat, area.lng], shape = area.poly ? 'poly' : 'circle', st = { color: '#ffb020', weight: 3, fill: false, dashArray: '8 8', interactive: false };
  if (mo.area && mo.areaShape !== shape) { mo.area.remove(); mo.area = null; }
  mo.areaShape = shape;
  if (!mo.area) mo.area = (area.poly ? L.polygon(Logic.areaRing(area), st) : L.circle(ll, { radius: area.r, ...st })).addTo(mo.map);
  else if (area.poly) mo.area.setLatLngs(Logic.areaRing(area));
  else mo.area.setLatLng(ll).setRadius(area.r);
  const key = `${area.lat},${area.lng},${area.r},${area.poly ? area.poly.length : 0}`;
  if (fit && mo.areaKey !== key) { mo.areaKey = key; mo.map.fitBounds(mo.area.getBounds(), { padding: [10, 10] }); mo.centered = true; }
  if (!mo.centered) { mo.map.setView(ll, 16); mo.centered = true; }
}
// 경찰과 도둑: 감옥 (모두에게 보임)
function drawJail(mo) {
  const room = S.room, j = room && modeOf(room) === 'police' && !(S.jailEdit && mo === maps.lmap) ? jailOf(room) : null, key = j ? j.lat + ',' + j.lng + (j.poly ? JSON.stringify(j.poly) : '') : '';
  if (mo.jailKey === key) return;
  if (mo.jailM) { mo.jailM.remove(); mo.jailM = null; }
  mo.jailKey = key;
  const st = { color: '#94a3b8', weight: 4, fillColor: '#334155', fillOpacity: .45, interactive: false };
  if (j) mo.jailM = (j.poly ? L.polygon(j.poly, st) : L.circle([j.lat, j.lng], { radius: Logic.MODE_RULES.JAIL_R, ...st }))
    .bindTooltip('🔒 감옥', { permanent: true, direction: 'center', className: 'jailTip' }).addTo(mo.map);
}
// 블랙아웃: 도망자의 미니맵(추격자 위치)·증강 지점·핑이 꺼짐
// 전파 방해 중(추격자 탐지 증강 안 먹힘) / 내가 상대 안개 속인지
const radioJammed = t => { const j = S.room && S.room.radioJam; return !!(j && (j.until || 0) > t); };
// 방 효과 fx/{종류}/{쓴 팀}: mine=true면 우리 팀이 쓴 것, false면 상대 팀이 쓴 것
const fxOn = (k, t, mine = false) => { const r = S.room, me = r && r.players && r.players[S.pid]; if (!me || !me.role) return false; return Object.entries(((r.fx || {})[k]) || {}).some(([role, x]) => (x.until || 0) > t && (role === me.role) === mine); };
const fogged = t => { const r = S.room, f = r && r.fog, me = r && r.players && r.players[S.pid]; return !!(f && (f.until || 0) > t && me && me.role && f.role !== me.role); };
const blackedOut = () => { const r = S.room, me = r && r.players[S.pid]; return !!(me && me.role === 'runner' && r.blackout && (r.blackout.until || 0) > now()); };
function drawMaps() {
  const room = S.room; if (!room) return;
  const area = room.settings && room.settings.area;
  if (S.screen === 's-lobby' && maps.lmap) { drawSelf(maps.lmap, '#3ba3ff'); drawArea(maps.lmap, S.polyEdit ? null : area, true); drawPolyDraft(maps.lmap); drawJailDraft(maps.lmap); drawJail(maps.lmap); }
  if (S.screen === 's-game' && maps.gmap) {
    const me = room.players && room.players[S.pid], mo = maps.gmap;
    drawSelf(mo, me && me.role === 'chaser' ? '#ff4d4f' : '#3ba3ff'); drawArea(mo, area);
    drawSpots(mo); drawRadar(mo); drawSkills(mo); drawJail(mo); drawAsn(mo); drawTerr(mo);
    drawSpectator(mo, me && me.role && !Logic.alive({ ...me, selfDmg: S.selfDmg, augs: S.augs }, (room.hits || {})[S.pid]));
    if (S.follow && S.fix) mo.map.panTo([S.fix.lat, S.fix.lng], { animate: false });
  }
}
function takeSnapshot() {
  const room = S.room; if (!room) return;
  const hits = room.hits || {}, mf = modeOf(room) === 'mafia', meR = room.players[S.pid] || {};
  const prev = {}; (S.snap || []).forEach(c => { prev[c.id] = c; });
  S.snap = Object.entries(room.players || {})
    .filter(([id, p]) => (mf ? id !== S.pid && p.role : p.role === 'chaser' && !((p.mapHideUntil || 0) > now())) && p.lat != null && Logic.alive(p, hits[id])) // 미니맵 숨기기 중인 추격자는 빠짐
    .map(([id, p]) => {
      const q = Logic.shownPos(p, now(), room.players), red = !mf || (meR.role === 'chaser' && p.role === 'chaser');
      return { id, name: p.name, lat: q.lat, lng: q.lng, prev: prev[id], col: red ? '#ff4d4f' : '#9ca3af', tip: red ? 'chaserTip' : 'trapTip', at: now() };
    });
  drawSnap();
}
function drawSnap() {
  const mo = maps.gmap; if (!mo) return;
  mo.others.forEach(m => m.remove());
  mo.others = [];
  if (blackedOut()) return;
  for (const c of S.snap) {
    // 발자국 증강: 지난 위치 → 지금 위치를 점선 + 화살촉으로 (5m 넘게 움직였을 때)
    if (av('footsteps') && c.prev && Logic.dist(c.prev, c) > Logic.AUGS.footsteps.v) {
      mo.others.push(L.polyline([[c.prev.lat, c.prev.lng], [c.lat, c.lng]], { color: '#ff4d4f', weight: 3, dashArray: '4 6', interactive: false }).addTo(mo.map));
      const b = Logic.bearing(c.prev, c);
      mo.others.push(L.marker([c.lat, c.lng], { interactive: false, icon: L.divIcon({ className: '', iconSize: [26, 26], iconAnchor: [13, 13],
        html: `<svg viewBox="0 0 24 24" width="26" height="26" style="transform:rotate(${b}deg) translateY(-16px)"><path d="M12 3l6 9h-12z" fill="#ff4d4f" stroke="#fff" stroke-width="1.5"/></svg>` }) }).addTo(mo.map));
    }
    const mk = badge([c.lat, c.lng], { name: c.name, col: c.col || '#ff4d4f', age: '방금' }).addTo(mo.map);
    mk._snapAt = c.at || now(); mo.others.push(mk);
  }
}

/* ---------- 홈 / 방 ---------- */
// QR: 그림 파일로(강제 다크 모드가 그림 색은 잘 안 뒤집음), 테두리 여백은 표준 4칸
const qrImg = qr => `<img alt="QR" src="${qr.createDataURL(8, 4)}">`;
function getName() {
  const n = $('#in-name').value.trim();
  if (!n) { toast('닉네임을 입력하세요'); return null; }
  S.name = n; return n;
}
// 위치정보 수집·이용 동의: 처음 한 번 (⚙ 설정에서 철회하면 다시 물어봄)
function askConsent() {
  if (hasConsent()) return Promise.resolve(true);
  $('#consentAge').checked = false; $('#btnConsentOk').disabled = true; $('#ov-consent').classList.add('on');
  return new Promise(res => { S.consentRes = res; });
}
$('#consentAge').onchange = () => { $('#btnConsentOk').disabled = !$('#consentAge').checked; };
$('#btnConsentOk').onclick = () => {
  try { localStorage.setItem(CONSENT_KEY, new Date().toISOString()); } catch (e) { S.consentMem = true; }
  $('#ov-consent').classList.remove('on'); renderSet(); if (S.consentRes) { S.consentRes(true); S.consentRes = null; }
};
$('#btnConsentNo').onclick = () => {
  $('#ov-consent').classList.remove('on'); toast('동의해야 게임을 할 수 있어요');
  if (S.consentRes) { S.consentRes(false); S.consentRes = null; }
};
$('#btnCreate').onclick = safe(async () => {
  const name = getName(); if (!name) return;
  if (!(await askConsent())) return;
  const pid = (await ensureAuth()) || rid(10, ALNUM);
  let code = rid(5);
  for (let i = 0; i < 5 && (await get(ref(db, `rooms/${code}/status`))).exists(); i++) code = rid(5); // 방 안 내용은 들어온 사람만 읽을 수 있어서 상태만 봄
  await set(ref(db, `rooms/${code}`), {
    hostId: pid, status: 'lobby', createdAt: serverTimestamp(),
    settings: { chasers: 1 },
    players: { [pid]: { name, joinedAt: serverTimestamp() } }
  });
  enterRoom(code, pid, name);
});
$('#btnJoin').onclick = safe(async () => {
  const name = getName(); if (!name) return;
  if (!(await askConsent())) return;
  const code = $('#in-code').value.trim().toUpperCase();
  if (!code) return toast('방 코드를 입력하세요');
  await ensureAuth();
  const st = await get(ref(db, `rooms/${code}/status`)); // 들어가기 전엔 방 상태만 볼 수 있음
  if (!st.exists()) return toast('없는 방이에요');
  if (st.val() !== 'lobby') return toast('이미 시작한 게임이에요');
  const pid = (await ensureAuth()) || rid(10, ALNUM);
  await set(ref(db, `rooms/${code}/players/${pid}`), { name, joinedAt: serverTimestamp() });
  // 인원 확인은 들어간 뒤에 (넘치면 바로 나옴)
  const ps = (await get(ref(db, `rooms/${code}/players`))).val() || {};
  const order = Object.entries(ps).sort((a, b) => (a[1].joinedAt || 0) - (b[1].joinedAt || 0)).map(([id]) => id);
  if (order.indexOf(pid) >= RULES.MAX_PLAYERS) { await remove(ref(db, `rooms/${code}/players/${pid}`)); return toast(`최대 ${RULES.MAX_PLAYERS}명까지예요`); }
  enterRoom(code, pid, name);
});

