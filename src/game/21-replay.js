// ---------- 리플레이: 판마다 모든 사람의 동선을 replays/{id}에 따로 저장 → 결과 화면에서 지도로 다시 보기 · 링크 공유 · 그림 저장 ----------
// 방 데이터에 넣으면 폰마다 매번 받는 양이 계속 커져서 따로 둠. 7일 뒤엔 보안 규칙으로 못 열고, 그 판에 있던 폰이 다음에 앱을 열 때 지움
const RP_EVERY_MS = 5000, RP_UPLOAD_MS = 30000, RP_KEEP_MS = 7 * 86400000, RP_GAP_SEC = 30;
const RP_COL = { chaser: ['#ff4d4f', '#ff8a3d', '#f472b6', '#fb7185', '#e879f9'], runner: ['#3ba3ff', '#3ccf7a', '#22d3ee', '#a3e635', '#facc15', '#a78bfa', '#2dd4bf', '#60a5fa', '#fde047', '#c084fc'] };
const rpRef = (id, p) => ref(db, `replays/${id}` + (p ? '/' + p : ''));
// 스킬 쓴 순간: 방 events에 남겨 두면 끝날 때 리플레이 meta로 옮겨짐 (리플레이 보안 규칙을 안 바꿔도 됨)
// r: 범위 원, tlat/tlng: 지도에서 고른 곳(포위망 등), line: 봉쇄선, dur: 효과 시간(초)
const RP_R = { net: a => a.v, smoke: a => a.v, hideout: a => a.v, cctv: a => a.v, tracker: () => 0, distance: () => 0 };
function rpSkill(id, x) {
  const room = S.room, a = Logic.AUGS[id], ex = S.rpExtra; S.rpExtra = null;
  if (!room || !room.replayId || !a || !S.fix || room.status !== 'playing') return;
  const e = { type: 'skill', id, by: S.pid, lat: +S.fix.lat.toFixed(5), lng: +S.fix.lng.toFixed(5), at: serverTimestamp() };
  if (x && x.lat != null && x.lng != null && id !== 'hideout') { e.tlat = +(+x.lat).toFixed(5); e.tlng = +(+x.lng).toFixed(5); }
  const r = id in RP_R ? RP_R[id](a) : typeof a.r === 'number' ? a.r : 0; if (r) e.r = r;
  const dur = x && x.until ? Math.round((x.until - now()) / 1000) : a.life || 0; if (dur > 0) e.dur = Math.min(dur, 600);
  if (ex) Object.assign(e, ex);
  push(roomRef('events'), e).catch(err => console.error(err));
}
// 분신·드론: 움직인 길을 2초마다 모아 두었다가 끝나면 한 번에
function rpPaths(room, me, t) {
  S.rpPath = S.rpPath || {};
  for (const k of ['decoy', 'drone']) {
    const o = me && me[k], b = S.rpPath[k];
    if (o && (o.until || 0) > t && o.lat != null) {
      if (b && b.until !== o.until) rpPathFlush(k);
      const c = S.rpPath[k] || (S.rpPath[k] = { until: o.until, at: t, pts: [] });
      if (!c.last || t - c.last >= 2000) { c.last = t; const q = Logic.movingPos(o, t); c.pts.push([Math.round((t - room.startAt) / 1000), q.lat.toFixed(5), q.lng.toFixed(5)].join(',')); }
    } else if (b) rpPathFlush(k);
  }
}
function rpPathFlush(k) {
  const b = S.rpPath && S.rpPath[k]; if (!b) return; delete S.rpPath[k];
  if (b.pts.length && S.room && S.room.replayId) push(roomRef('events'), { type: 'skillPath', id: k, by: S.pid, at: Math.round(b.at), pts: b.pts.join(';').slice(0, 3000) }).catch(err => console.error(err));
}
// 게임 중: 5초마다 내 위치 한 점, 30초마다 모아서 올림 (탈락하면 기록 끝)
function rpTick(room, t, alive) {
  const id = room.replayId; if (!id || !db || t < room.startAt) return;
  rpPaths(room, room.players && room.players[S.pid], t);
  const real = Date.now();
  if (alive && S.fix && real - (S.rpAt || 0) >= RP_EVERY_MS) {
    S.rpAt = real;
    S.rpBuf.push([Math.round((t - room.startAt) / 1000), S.fix.lat.toFixed(5), S.fix.lng.toFixed(5)].join(','));
  }
  if (S.rpBuf.length && (real - (S.rpSent || 0) >= RP_UPLOAD_MS || !alive)) rpFlush(id);
}
function rpFlush(id) {
  if (!id || !db || !S.rpBuf || !S.rpBuf.length) return;
  const str = S.rpBuf.join(';'); S.rpBuf = []; S.rpSent = Date.now();
  push(rpRef(id, `trails/${S.pid}`), str).catch(e => console.error(e));
}
// 게임이 끝나면 결과를 기록한 폰이 한 번: 끝난 시각·승패·탈락 정보·잡기 같은 순간들
function rpFinish(room, w) {
  const P = {};
  for (const [id, p] of Object.entries(room.players || {})) {
    if (!p.role) continue;
    const st = (id === S.pid ? S.stats : p.stats) || {};
    P[id] = { name: p.name || '?', role: p.role, job: p.job || null, zombieAt: p.zombieAt || null, diedAt: st.diedAt || null, why: st.deathWhy || null, by: st.deathBy || null, forfeit: p.forfeit ? 1 : null };
  }
  const KEEP = ['terrTag', 'asnCatch', 'catch', 'infect', 'jail', 'rescue', 'escape', 'rpsWin', 'revive', 'mfOut', 'bombBoom'];
  const all = Object.values(room.events || {}).filter(e => e && e.at);
  const SK = ['id', 'lat', 'lng', 'tlat', 'tlng', 'r', 'dur', 'line', 'pts'];
  const ev = all.filter(e => KEEP.includes(e.type)).map(e => ({ type: e.type, by: e.by || null, target: e.target || null, chaser: e.chaser || null, at: e.at })).slice(-300)
    .concat(all.filter(e => e.type === 'skill' || e.type === 'skillPath').slice(-400).map(e => { const o = { type: e.type, by: e.by || null, at: e.at }; for (const k of SK) if (e[k] != null) o[k] = e[k]; return o; }));
  update(rpRef(room.replayId, 'meta'), { endAt: now(), winner: w.winner || null, reason: w.reason || null, players: P, events: ev }).catch(e => console.error(e));
}
function rpRemember(id, exp) {
  try {
    const L = JSON.parse(localStorage.getItem('gtag_rp') || '[]').filter(x => x.id !== id);
    L.push({ id, exp: exp || Date.now() + RP_KEEP_MS }); localStorage.setItem('gtag_rp', JSON.stringify(L.slice(-50)));
  } catch (e) {}
}
function rpCleanup() { // 보관 기간이 지난 리플레이 지우기 (1시간 여유: 폰 시계가 서버보다 빠를 수 있어서)
  if (!db) return;
  try {
    const L = JSON.parse(localStorage.getItem('gtag_rp') || '[]'), keep = [];
    for (const x of L) { if (x.exp + 3600000 < Date.now()) remove(rpRef(x.id)).catch(() => {}); else keep.push(x); }
    localStorage.setItem('gtag_rp', JSON.stringify(keep));
  } catch (e) {}
}
// ----- 보기 -----
const RP = { id: null, d: null, mo: null, g: null, T: 0, playing: false, spd: 10, last: 0, unsub: null, fitted: false, L: {} };
function rpParse(v) {
  const meta = v.meta || {}, MP = meta.players || {}, FP = {}, tr = {};
  for (const [pid, chunks] of Object.entries(v.trails || {})) {
    const pts = [];
    for (const k of Object.keys(chunks || {}).sort()) for (const s of String(chunks[k]).split(';')) {
      const [t, lat, lng] = s.split(',').map(Number);
      if (isFinite(t) && isFinite(lat) && isFinite(lng)) pts.push({ t, lat, lng });
    }
    pts.sort((a, b) => a.t - b.t); tr[pid] = pts;
  }
  const ids = [...new Set([...Object.keys(MP), ...Object.keys(tr)])];
  const n = { chaser: 0, runner: 0 }, P = {};
  for (const id of ids.sort((a, b) => ((MP[a] || {}).role === 'chaser' ? 0 : 1) - ((MP[b] || {}).role === 'chaser' ? 0 : 1) || String((MP[a] || {}).name).localeCompare(String((MP[b] || {}).name)))) {
    const p = MP[id] || { name: '?', role: 'runner' }, role = p.role === 'chaser' ? 'chaser' : 'runner';
    P[id] = { ...p, col: RP_COL[role][n[role]++ % RP_COL[role].length], pts: tr[id] || [] };
  }
  const area = meta.area || null;
  if (area && area.poly && !Array.isArray(area.poly)) area.poly = Object.keys(area.poly).sort((x, y) => x - y).map(k => area.poly[k]);
  if (area && area.poly) area.poly = area.poly.map(q => (Array.isArray(q) ? q : [q[0], q[1]]));
  const lastT = Math.max(0, ...Object.values(P).map(p => (p.pts.length ? p.pts[p.pts.length - 1].t : 0)));
  const dur = Math.max(lastT, meta.endAt && meta.startAt ? Math.round((meta.endAt - meta.startAt) / 1000) : 0, 1);
  const sec = at => Math.round((at - (meta.startAt || 0)) / 1000);
  const ev = Object.values(meta.events || {}).map(e => ({ ...e, t: sec(e.at) }));
  for (const [id, p] of Object.entries(P)) {
    if (p.diedAt) ev.push({ type: p.forfeit ? 'forfeit' : 'dead', target: id, by: p.by, t: sec(p.diedAt) });
  }
  ev.sort((a, b) => a.t - b.t);
  return { meta, P, dur, area, ev, hide: meta.hideSec || 0 };
}
// T초의 위치 (점 사이는 보간, 30초 넘게 비면 마지막 위치에 멈춤). 처음 기록 전이면 null
function rpPos(pts, T) {
  if (!pts.length || T < pts[0].t) return null;
  let lo = 0, hi = pts.length - 1;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (pts[m].t <= T) lo = m; else hi = m - 1; }
  const a = pts[lo], b = pts[lo + 1];
  if (!b || b.t - a.t > RP_GAP_SEC) return { lat: a.lat, lng: a.lng, stale: T - a.t > RP_GAP_SEC };
  const k = (T - a.t) / (b.t - a.t);
  return { lat: a.lat + (b.lat - a.lat) * k, lng: a.lng + (b.lng - a.lng) * k };
}
// 30초 넘게 기록이 비면 선을 끊음 (폰이 꺼져 있던 동안)
function rpSegs(pts, T = Infinity) {
  const out = []; let cur = [];
  for (let i = 0; i < pts.length && pts[i].t <= T; i++) {
    if (i && pts[i].t - pts[i - 1].t > RP_GAP_SEC) { if (cur.length) out.push(cur); cur = []; }
    cur.push([pts[i].lat, pts[i].lng]);
  }
  const p = rpPos(pts, T); if (p && !p.stale && cur.length && T < Infinity) cur.push([p.lat, p.lng]);
  if (cur.length) out.push(cur);
  return out;
}
const RP_EV = { terrTag: ['🫵', '잡음'], asnCatch: ['🗡️', '암살'], catch: ['✖', '잡힘'], infect: ['🧟', '감염'], jail: ['🔒', '체포'], rescue: ['🔓', '탈옥'], escape: ['📳', '탈출'], rpsWin: ['✌️', '가위바위보 승리'], revive: ['🩸', '부활'], mfOut: ['💀', '탈락'], bombBoom: ['💥', '시한폭탄'], dead: ['💀', '탈락'], forfeit: ['🏳️', '기권'] };
const rpWho = e => (e.type === 'escape' || e.type === 'rpsWin' ? e.by : e.target || e.by);
function openReplay(id) {
  if (!db || !id) return toast('리플레이를 열 수 없어요');
  closeReplay(true);
  Object.assign(RP, { id, d: null, T: 0, playing: false, spd: 10, fitted: false, L: {} });
  $('#ov-replay').classList.add('on');
  $('#rpTitle').textContent = '🎬 리플레이 불러오는 중…'; $('#rpLegend').innerHTML = ''; rpSpdBtns();
  if (!RP.mo) { RP.mo = getMap('rpmap'); RP.g = L.layerGroup().addTo(RP.mo.map); }
  setTimeout(() => RP.mo.map.invalidateSize(), 60);
  let got = false;
  const fail = () => { if (!got) $('#rpTitle').textContent = '🎬 보관 기간(7일)이 지났거나 없는 리플레이예요'; };
  RP.unsub = onValue(rpRef(id), s => { const v = s.val(); if (!v || !v.meta) return fail(); got = true; rpLoad(v); }, fail);
}
function closeReplay(keep) {
  if (RP.unsub) { RP.unsub(); RP.unsub = null; }
  RP.playing = false; if (RP.g) RP.g.clearLayers();
  if (!keep) {
    $('#ov-replay').classList.remove('on');
    if (new URLSearchParams(location.search).has('replay')) history.replaceState(null, '', location.pathname); // 공유 링크로 들어왔으면 주소 정리
  }
}
function rpLoad(v) {
  const d = RP.d = rpParse(v), m = d.meta, map = RP.mo.map;
  const date = m.startAt ? new Date(m.startAt) : null, ds = date ? `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}` : '';
  const win = m.winner ? `${roleName(m.winner, { settings: { mode: m.mode } })} 승리` : '끝나지 않은 판';
  $('#rpTitle').textContent = `🎬 ${Logic.MODES[m.mode] || '기본'} · ${ds} · ${win}`;
  RP.title = $('#rpTitle').textContent;
  $('#rpSlider').max = d.dur;
  RP.g.clearLayers(); RP.L = {};
  if (d.area && d.area.poly) L.polygon(d.area.poly, { color: '#8b95a3', weight: 2, fill: false, dashArray: '6 6' }).addTo(RP.g);
  else if (d.area && d.area.lat != null) L.circle([d.area.lat, d.area.lng], { radius: d.area.r || 300, color: '#8b95a3', weight: 2, fill: false, dashArray: '6 6' }).addTo(RP.g);
  const all = [];
  for (const [id, p] of Object.entries(d.P)) {
    const faint = L.polyline(rpSegs(p.pts), { color: p.col, weight: 3, opacity: .22 }).addTo(RP.g);
    const live = L.polyline([], { color: p.col, weight: 5, opacity: .95 }).addTo(RP.g);
    const dot = badge([0, 0], { name: p.name, col: p.col });
    RP.L[id] = { faint, live, dot, on: false };
    p.pts.forEach(q => all.push([q.lat, q.lng]));
  }
  const isSk = e => e.type === 'skill' || e.type === 'skillPath';
  const busy = {}; // 같은 사람이 비슷한 때 쓴 스킬은 아이콘을 위로 쌓기
  RP.skL = d.ev.filter(isSk).map(e => { const L0 = (busy[e.by] = (busy[e.by] || []).filter(x => x > e.t)); const k = rpSkillLayer(e, d, L0.length % 4); if (k && k.kind === 'pt') L0.push(k.t2); return k; }).filter(Boolean);
  RP.evL = d.ev.filter(e => !isSk(e)).map(e => {
    const p = d.P[rpWho(e)], pos = p && rpPos(p.pts, e.t), [ic, nm] = (m.mode === 'ice' && { jail: ['🧊', '얼음'], rescue: ['🔥', '땡'] }[e.type]) || RP_EV[e.type] || ['•', e.type];
    if (!pos) return null;
    const mk = L.marker([pos.lat, pos.lng], { icon: L.divIcon({ className: 'rpev', html: `<span>${ic}</span>`, iconSize: [26, 26] }) }).bindTooltip(`${nm} · ${esc(p.name)}`);
    return { t: e.t, mk, on: false };
  }).filter(Boolean);
  if (!RP.fitted) {
    if (d.area && d.area.poly) all.push(...d.area.poly);
    else if (d.area && d.area.lat != null) { const r = d.area.r || 300, dl = r / 111195, dg = r / (111195 * Math.cos(d.area.lat * Math.PI / 180)); all.push([d.area.lat - dl, d.area.lng - dg], [d.area.lat + dl, d.area.lng + dg]); }
    if (all.length) { map.fitBounds(L.latLngBounds(all).pad(.12)); RP.fitted = true; }
    else if (d.area && d.area.lat != null) map.setView([d.area.lat, d.area.lng], 16);
  }
  $('#rpLegend').innerHTML = Object.values(d.P).map(p => `<span><i style="background:${p.col}"></i>${esc(p.name)} <small class="${p.role}-t">${roleName(p.role, { settings: { mode: m.mode } }, p.job)}</small>${p.diedAt ? (p.forfeit ? ' 🏳️' : ' 💀') : ''}${p.pts.length ? '' : ' <small class="dim">기록 없음</small>'}</span>`).join('');
  rpDraw();
}
// 리플레이 스킬: 쓴 자리에 아이콘·이름 + 범위 원/봉쇄선, 분신·드론은 움직인 길
function rpSkillLayer(e, d, stack = 0) {
  const p = d.P[e.by]; if (!p) return null;
  const a = Logic.AUGS[e.id] || { name: e.id }, col = p.col, lbl = `${a.name} · ${esc(p.name)}`;
  const mark = (ll, withName) => L.marker(ll, { zIndexOffset: 1000, icon: L.divIcon({ className: 'rpsk', html: `<span style="--c:${col}">${icon(e.id)}</span>${withName ? `<b>${esc(a.name)}</b>` : ''}`, iconSize: [24, 24], iconAnchor: [12, 40 + stack * 28] }) }).bindTooltip(lbl); // 사람 표시 위쪽에
  if (e.type === 'skillPath') {
    const pts = String(e.pts || '').split(';').map(q => q.split(',').map(Number)).filter(q => q.length === 3 && q.every(isFinite)).map(([t, lat, lng]) => ({ t, lat, lng }));
    if (!pts.length) return null;
    return { kind: 'path', t: pts[0].t, t2: pts[pts.length - 1].t + 5, pts, line: L.polyline([], { color: col, weight: 3, dashArray: '2 7', opacity: .9, interactive: false }), mk: mark([pts[0].lat, pts[0].lng], false), on: false };
  }
  const c = e.tlat != null ? [e.tlat, e.tlng] : [e.lat, e.lng]; if (c[0] == null) return null;
  const layers = [];
  if (e.r) layers.push(L.circle(c, { radius: e.r, color: col, weight: 2, dashArray: '6 5', fillColor: col, fillOpacity: .12, interactive: false }));
  const ln = e.line ? Object.values(e.line).map(Number) : null;
  if (ln && ln.length === 4 && ln.every(isFinite)) layers.push(L.polyline([[ln[0], ln[1]], [ln[2], ln[3]]], { color: col, weight: 4, dashArray: '8 6', interactive: false }));
  layers.push(mark(c, true));
  return { kind: 'pt', t: e.t, t2: e.t + Math.max(e.dur || 0, 20), layers, on: false };
}
function rpDraw() {
  const d = RP.d; if (!d) return;
  const T = RP.T;
  for (const k of RP.skL || []) {
    const show = T >= k.t && T <= k.t2;
    if (k.kind === 'path') {
      if (show) { const cur = rpPos(k.pts, T) || k.pts[0]; k.line.setLatLngs(k.pts.filter(q => q.t <= T).map(q => [q.lat, q.lng]).concat([[cur.lat, cur.lng]])); k.mk.setLatLng([cur.lat, cur.lng]); }
      if (show && !k.on) { k.line.addTo(RP.g); k.mk.addTo(RP.g); k.on = true; } else if (!show && k.on) { RP.g.removeLayer(k.line); RP.g.removeLayer(k.mk); k.on = false; }
    } else if (show && !k.on) { k.layers.forEach(l => l.addTo(RP.g)); k.on = true; } else if (!show && k.on) { k.layers.forEach(l => RP.g.removeLayer(l)); k.on = false; }
  }
  for (const [id, p] of Object.entries(d.P)) {
    const o = RP.L[id]; if (!o) continue;
    o.live.setLatLngs(rpSegs(p.pts, T));
    const pos = rpPos(p.pts, T), dead = p.diedAt && d.meta.startAt && T >= (p.diedAt - d.meta.startAt) / 1000;
    const zomb = p.zombieAt && d.meta.startAt && T >= (p.zombieAt - d.meta.startAt) / 1000;
    if (pos) {
      badgeSet(o.dot, [pos.lat, pos.lng], { name: p.name, col: zomb ? '#84cc16' : p.col, op: dead || pos.stale ? .4 : 1, pre: dead ? (p.forfeit ? '🏳️' : '💀') : zomb ? '🧟' : undefined });
      if (!o.on) { o.dot.addTo(RP.g); o.on = true; }
    } else if (o.on) { RP.g.removeLayer(o.dot); o.on = false; }
  }
  for (const e of RP.evL || []) {
    const show = e.t <= T;
    if (show && !e.on) { e.mk.addTo(RP.g); e.on = true; } else if (!show && e.on) { RP.g.removeLayer(e.mk); e.on = false; }
  }
  $('#rpSlider').value = T;
  const f = s => fmt(s * 1000);
  $('#rpTime').textContent = d.hide && T < d.hide ? `숨는 시간 ${f(T)}` : `${d.hide ? '추격 ' : ''}${f(T - d.hide)} / ${f(d.dur - d.hide)}`;
  $('#btnRpPlay').textContent = RP.playing ? '⏸' : '▶';
}
function rpLoop(ts) {
  if (!RP.playing) return;
  const dt = RP.last ? Math.min((ts - RP.last) / 1000, .25) : 0; RP.last = ts;
  RP.T = Math.min(RP.d.dur, RP.T + dt * RP.spd);
  if (RP.T >= RP.d.dur) RP.playing = false;
  rpDraw();
  if (RP.playing) requestAnimationFrame(rpLoop);
}
function rpSpdBtns() { document.querySelectorAll('#rpSpd [data-spd]').forEach(b => b.classList.toggle('on', +b.dataset.spd === RP.spd)); }
$('#btnRpPlay').onclick = () => {
  if (!RP.d) return;
  if (!RP.playing && RP.T >= RP.d.dur) RP.T = 0;
  RP.playing = !RP.playing; RP.last = 0; rpDraw();
  if (RP.playing) requestAnimationFrame(rpLoop);
};
$('#rpSlider').oninput = e => { RP.T = +e.target.value; rpDraw(); };
$('#rpSpd').onclick = e => { const b = e.target.closest('[data-spd]'); if (!b) return; RP.spd = +b.dataset.spd; rpSpdBtns(); };
$('#btnRpClose').onclick = () => closeReplay();
$('#btnReplay').onclick = () => { const room = S.room; if (!room || !room.replayId) return; rpFlush(room.replayId); openReplay(room.replayId); };
$('#btnRpShare').onclick = async () => {
  if (!RP.id) return;
  const url = location.origin + location.pathname + '?replay=' + RP.id;
  try { if (navigator.share) { await navigator.share({ title: 'PULTRIX 리플레이', text: RP.title || '', url }); return; } } catch (e) { if (e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(url); toast('🔗 링크를 복사했어요 (7일 보관)', true); } catch (e) { toast(url, true); }
};
// 동선 그림: 지도 그림(OpenStreetMap) 위에 모든 선 · 이름표. 지도 그림을 못 쓰면 어두운 배경에 선만
const merc = (lat, lng, z) => { const s = 256 * 2 ** z, r = lat * Math.PI / 180; return { x: (lng + 180) / 360 * s, y: (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * s }; };
async function rpRender(tiles) {
  const d = RP.d, W = 1080, MH = 1080, TOP = 130, rows = Math.ceil(Object.keys(d.P).length / 2), H = TOP + MH + 40 + rows * 46 + 40;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  c.fillStyle = '#111418'; c.fillRect(0, 0, W, H);
  const pts = []; Object.values(d.P).forEach(p => p.pts.forEach(q => pts.push(q)));
  if (d.area && d.area.lat != null) { pts.push({ lat: d.area.lat, lng: d.area.lng }); (d.area.poly || []).forEach(q => pts.push({ lat: q[0], lng: q[1] })); }
  if (!pts.length) throw new Error('no points');
  let z = 18, b;
  const box = zz => { const ps = pts.map(q => merc(q.lat, q.lng, zz)); let x0 = Math.min(...ps.map(q => q.x)), x1 = Math.max(...ps.map(q => q.x)), y0 = Math.min(...ps.map(q => q.y)), y1 = Math.max(...ps.map(q => q.y));
    if (d.area && d.area.lat != null && !d.area.poly) { const cc = merc(d.area.lat, d.area.lng, zz), rp = (d.area.r || 300) / (156543.03392 * Math.cos(d.area.lat * Math.PI / 180) / 2 ** zz); x0 = Math.min(x0, cc.x - rp); x1 = Math.max(x1, cc.x + rp); y0 = Math.min(y0, cc.y - rp); y1 = Math.max(y1, cc.y + rp); }
    return { x0, x1, y0, y1 }; };
  for (; z > 2; z--) { b = box(z); if ((b.x1 - b.x0) * 1.15 <= W && (b.y1 - b.y0) * 1.15 <= MH) break; }
  const ox = (b.x0 + b.x1) / 2 - W / 2, oy = (b.y0 + b.y1) / 2 - MH / 2;
  const P2 = (lat, lng) => { const q = merc(lat, lng, z); return [q.x - ox, q.y - oy + TOP]; };
  c.save(); c.beginPath(); c.rect(0, TOP, W, MH); c.clip();
  if (tiles) {
    const jobs = [];
    for (let tx = Math.floor(ox / 256); tx <= Math.floor((ox + W) / 256); tx++) for (let ty = Math.floor(oy / 256); ty <= Math.floor((oy + MH) / 256); ty++) {
      jobs.push(new Promise((res, rej) => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => res({ im, tx, ty }); im.onerror = rej; im.src = `https://tile.openstreetmap.org/${z}/${tx}/${ty}.png`; }));
    }
    const ims = await Promise.race([Promise.all(jobs), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 6000))]);
    for (const { im, tx, ty } of ims) c.drawImage(im, tx * 256 - ox, ty * 256 - oy + TOP);
    c.fillStyle = 'rgba(10,12,16,.45)'; c.fillRect(0, TOP, W, MH);
  } else {
    c.strokeStyle = '#1b2027'; c.lineWidth = 1;
    for (let x = 0; x < W; x += 60) { c.beginPath(); c.moveTo(x, TOP); c.lineTo(x, TOP + MH); c.stroke(); }
    for (let y = TOP; y < TOP + MH; y += 60) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
  }
  c.setLineDash([12, 10]); c.strokeStyle = '#8b95a3'; c.lineWidth = 3;
  if (d.area && d.area.poly) { c.beginPath(); d.area.poly.forEach((q, i) => { const [x, y] = P2(q[0], q[1]); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.closePath(); c.stroke(); }
  else if (d.area && d.area.lat != null) { const [x, y] = P2(d.area.lat, d.area.lng), rp = (d.area.r || 300) / (156543.03392 * Math.cos(d.area.lat * Math.PI / 180) / 2 ** z); c.beginPath(); c.arc(x, y, rp, 0, Math.PI * 2); c.stroke(); }
  c.setLineDash([]); c.lineJoin = c.lineCap = 'round';
  for (const p of Object.values(d.P)) {
    c.strokeStyle = p.col; c.lineWidth = 6; c.globalAlpha = .9;
    for (const sg of rpSegs(p.pts)) { c.beginPath(); sg.forEach((q, i) => { const [x, y] = P2(q[0], q[1]); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke(); }
    c.globalAlpha = 1;
    if (!p.pts.length) continue;
    const [sx, sy] = P2(p.pts[0].lat, p.pts[0].lng), e = p.pts[p.pts.length - 1], [ex, ey] = P2(e.lat, e.lng);
    c.fillStyle = '#fff'; c.beginPath(); c.arc(sx, sy, 7, 0, Math.PI * 2); c.fill();
    c.fillStyle = p.col; c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.arc(ex, ey, 11, 0, Math.PI * 2); c.fill(); c.stroke();
    c.font = 'bold 26px sans-serif'; c.textAlign = 'center'; c.lineWidth = 6; c.strokeStyle = '#000c';
    const lb = (p.diedAt ? (p.forfeit ? '🏳️' : '💀') : '') + p.name; c.strokeText(lb, ex, ey - 20); c.fillStyle = '#fff'; c.fillText(lb, ex, ey - 20);
  }
  c.restore();
  c.textAlign = 'left'; c.fillStyle = '#e9edf2'; c.font = 'bold 40px sans-serif'; c.fillText('PULTRIX', 40, 62);
  c.font = '28px sans-serif'; c.fillStyle = '#8b95a3'; c.fillText((RP.title || '').replace('🎬 ', ''), 40, 106);
  c.font = '18px sans-serif'; c.textAlign = 'right'; c.fillText(tiles ? '지도 © OpenStreetMap' : '', W - 20, TOP + MH - 14);
  c.textAlign = 'left'; c.font = '26px sans-serif';
  Object.values(d.P).forEach((p, i) => {
    const x = 40 + (i % 2) * 520, y = TOP + MH + 60 + Math.floor(i / 2) * 46;
    c.fillStyle = p.col; c.beginPath(); c.arc(x + 10, y - 9, 10, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#e9edf2'; c.fillText(`${p.name} · ${roleName(p.role, { settings: { mode: d.meta.mode } }, p.job)}${p.diedAt ? (p.forfeit ? ' · 기권' : ' · 탈락') : ''}`, x + 30, y);
  });
  return new Promise((res, rej) => { try { cv.toBlob(bl => (bl ? res(bl) : rej(new Error('blob'))), 'image/png'); } catch (e) { rej(e); } }); // 지도 그림을 못 쓰게 막혀 있으면 여기서 실패
}
$('#btnRpImg').onclick = safe(async () => {
  if (!RP.d) return;
  toast('🖼 동선 그림을 만드는 중…');
  let blob = await rpRender(true).catch(() => null);
  if (!blob) blob = await rpRender(false);
  const name = `pultrix-replay-${RP.id}.png`;
  try {
    const file = new File([blob], name, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'PULTRIX 동선' }); return; }
  } catch (e) { if (e.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  toast('🖼 동선 그림을 저장했어요');
});

/* ---------- 시작 ---------- */
(function boot() {
  if (!cfgOk) return show('s-setup');
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem('gtag') || 'null'); } catch (e) {}
  if (saved && saved.name) $('#in-name').value = saved.name;
  show('s-home');
  let seenTut = false; try { seenTut = !!localStorage.getItem('gtag_tut'); } catch (e) {}
  if (!seenTut) openTut();
  // 초대 링크(?room=코드)로 들어오면 방 코드를 미리 채움
  const invited = (new URLSearchParams(location.search).get('room') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
  rpCleanup();
  const rpq = new URLSearchParams(location.search).get('replay') || ''; // 리플레이 공유 링크(?replay=…)
  if (/^[A-Za-z0-9]{12}$/.test(rpq)) setTimeout(() => openReplay(rpq), 300);
  if (invited) { // 초대받은 사람은 '참가'를 눈에 띄게, '방 만들기'는 수수하게 (헷갈려서 방을 새로 만드는 일 방지)
    $('#in-code').value = invited; toast(`방 ${invited}에 초대됐어요 · 닉네임 넣고 참가`, true);
    $('#btnJoin').classList.add('primary'); $('#btnJoin').textContent = `👉 ${invited} 방 참가`;
    $('#btnCreate').classList.remove('primary'); $('#btnCreate').textContent = '새 방 만들기';
  }
  const cleaned = authReady.then(() => roomCleanup()).catch(() => []);
  if (saved && saved.code && saved.pid && (!invited || invited === saved.code)) {
    cleaned.then(gone => {
      if (gone.includes(saved.code)) return saveLocal({ name: saved.name }); // 6시간 넘어 정리된 방엔 다시 안 들어감
      return get(ref(db, `rooms/${saved.code}/players/${saved.pid}`))
        .then(s => { if (s.exists()) enterRoom(saved.code, saved.pid, saved.name); else saveLocal({ name: saved.name }); });
    }).catch(e => { console.error(e); saveLocal({ name: saved.name }); });
  }
})();
