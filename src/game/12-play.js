const augChip = id => `<span class="aug g${gradeOf(id)}">${icon(id)}<b class="g">${gradeOf(id)}</b>${Logic.AUGS[id].name}</span>`;
function showInsight(ids) {
  const P = S.room.players;
  setCooldown('insight');
  S.insSel = null;
  $('#insSub').textContent = '지금 이 순간의 상대 증강이에요';
  $('#insList').innerHTML = ids.map(id => {
    const p = P[id] || {}, augs = Object.keys(p.augs || {}).filter(k => Logic.AUGS[k]);
    const chips = augs.length ? augs.map(augChip).join('') : '<small>증강 없음</small>';
    return `<div class="augcard" style="display:block"><b>${esc(p.name)}</b> <small class="${p.role}-t" style="display:inline">${roleName(p.role, S.room)}</small><div class="insaugs">${chips}</div></div>`;
  }).join('');
  $('#btnInsGo').style.display = 'none';
  $('#ov-insight').classList.add('on');
  vibrate(80);
  renderGame();
}
// 최후의 발악: 준비돼 있을 때 체력이 0 이하가 되면 자동으로 1로 버티고, 정해진 시간 동안 1 밑으로 안 내려감
function lastStandCheck(me, hits, t) {
  const x = S.augs && S.augs.lastStand; if (!x || S.stats.diedAt) return; // 이미 탈락했으면 쿨타임이 끝나도 발동 안 함
  const raw = Logic.hpRaw({ ...me, selfDmg: S.selfDmg }, hits[S.pid]);
  if (raw > 0 || ((hits[S.pid] && hits[S.pid].pendUntil) || 0) > t) return; // 흔들어 탈출 판정이 끝난 뒤에 발동
  if (Logic.augReady(x, t)) {
    const sec = av('lastStand');
    S.selfDmg -= 1 - raw;
    const nx = { ...x, readyAt: t + Logic.augCdMs('lastStand'), until: t + sec * 1000 };
    S.augs = { ...S.augs, lastStand: nx };
    update(meRef(), { 'augs/lastStand': nx, selfDmg: Math.round(S.selfDmg * 10) / 10 });
    toast(`최후의 발악! ${sec}초 동안 체력 1로 버텨요`, true); flash('rgba(245,184,0,1)'); vibrate([300, 80, 300, 80, 300]); sfx('augS');
    S.stats.skills = (S.stats.skills || 0) + 1;
  } else if ((x.until || 0) > t) {
    S.selfDmg -= 1 - raw;
  }
}
// 기사회생: 준비돼 있을 때 체력이 0 이하가 되면 체력 50으로 (최후의 발악보다 먼저)
function comebackCheck(me, hits, t) {
  const x = S.augs && S.augs.comeback; if (!x || !Logic.augReady(x, t) || me.forfeit || S.stats.diedAt) return;
  const raw = Logic.hpRaw({ ...me, selfDmg: S.selfDmg }, hits[S.pid]);
  if (raw > 0 || ((hits[S.pid] && hits[S.pid].pendUntil) || 0) > t) return; // 흔들어 탈출 판정이 끝난 뒤에
  const v = av('comeback'); S.selfDmg -= v - raw;
  const nx = { ...x, readyAt: t + Logic.augCdMs('comeback') };
  S.augs = { ...S.augs, comeback: nx };
  update(meRef(), { 'augs/comeback': nx, selfDmg: Math.round(S.selfDmg * 10) / 10 });
  S.stats.skills = (S.stats.skills || 0) + 1;
  toast(`✨ 기사회생! 체력 ${v}으로 살아났어요`, true); flash('rainbow'); vibrate([200, 80, 200, 80, 500]); sfx('augSS');
}
// 탈락 처리 (어떤 이유든 한 번): 탈락 시각 기록 + 알림. inTick이면 바로 뒤에서 위치와 함께 저장됨
// 탈락 사유: 마지막으로 체력을 깎은 것 (1분 안), 없으면 '체력 0'
function hurtBy(why, by) { S.hurt = { why, by: by || null, at: Date.now() }; }
const deathLabel = (st, players) => st && st.deathWhy ? st.deathWhy + (st.deathBy && players[st.deathBy] ? ` · ${players[st.deathBy].name}` : '') : '';
function markDead(me, t, inTick) {
  if (!S.stats.diedAt) S.stats.diedAt = t;
  if (!S.stats.deathWhy) {
    let h = S.hurt && Date.now() - S.hurt.at < 60000 ? S.hurt : null;
    // 잡혀서 체력이 0이 된 순간엔 '잡혔다' 알림보다 체력 변화가 먼저 올 수 있어서, 잡기 기록(누가·언제)으로도 확인
    const hh = ((S.room && S.room.hits) || {})[S.pid], catchAgo = hh && hh.at && hh.by ? now() - hh.at : Infinity;
    if (catchAgo < 10000 && catchAgo <= (h ? Date.now() - h.at : Infinity) + 500) h = { why: '잡힘', by: hh.by };
    S.stats.deathWhy = me.forfeit ? '기권' : h ? h.why : '체력 0';
    S.stats.deathBy = me.forfeit || !h ? null : h.by;
  }
  if (!me.forfeit) { toast(`탈락! (${deathLabel(S.stats, S.room.players)}) 관전 모드로 바뀌어요`, true); vibrate([300, 100, 300]); flash('rgba(255,77,79,1)'); sfx('lose'); }
  if (!inTick) update(meRef(), { selfDmg: Math.round(S.selfDmg * 10) / 10, stats: { ...S.stats, dist: Math.round(S.stats.dist || 0), vmax: Math.round((S.stats.vmax || 0) * 10) / 10 } });
}
// 러너스 하이: 움직인 거리 500m마다 체력 +10
function runnersHigh(me, hits, d) {
  const a = Logic.AUGS.runnersHigh; S.rhDist = (S.rhDist || 0) + d;
  while (S.rhDist >= a.v) {
    S.rhDist -= a.v;
    const hp = Logic.hpOf({ ...me, selfDmg: S.selfDmg, augs: S.augs }, hits[S.pid]), h = Math.min(a.heal, RULES.HP_MAX - hp);
    if (h > 0) { S.selfDmg -= h; toast(`🏃 러너스 하이! ${a.v}m 달성 · 체력 +${Math.round(h)}`); vibrate(80); }
  }
}
// 동행: 나나 15m 안 팀원 중 누가 동행을 갖고 있으면 스태미나 소모 절반
function companionNear(me, hits, t) {
  if (me.role !== 'runner') return false;
  const m = Logic.AUGS.companion.v, mine = !!av('companion');
  return Object.entries(S.room.players).some(([id, p]) => id !== S.pid && p.role === 'runner' && p.lat != null && Logic.alive(p, hits[id])
    && (mine || (p.augs && p.augs.companion)) && Logic.dist(S.fix, p) <= m);
}
// CCTV: 상대 CCTV 반경 안에 새로 들어갈 때마다 추격자들에게 알림 (도망자 본인은 모름)
// 경계에서 GPS가 흔들려 알림이 반복되지 않게: 30m 안에 들어오면 알림, 40m 밖으로 나가야 다시 알림 가능
// 감시 카메라(도망자)는 반대로 추격자가 들어오면 도망자들에게 알림. 전파 방해 중엔 추격자 CCTV가 안 먹힘
function checkCams(me, t) {
  for (const [cid, c] of Object.entries(S.room.cams || {})) {
    if (c.role === me.role || (c.until || 0) <= t) continue;
    if (c.role === 'chaser' && radioJammed(t)) continue;
    const d = Logic.dist(S.fix, c), r = c.r || Logic.AUGS.cctv.v;
    if (!S.camIn[cid] && d <= r) {
      S.camIn[cid] = true;
      push(roomRef('events'), { type: 'cam', target: S.pid, cam: cid, camRole: c.role, spy: c.spy ? 1 : 0, lat: S.fix.lat, lng: S.fix.lng, at: serverTimestamp() });
    } else if (S.camIn[cid] && d > r + 10) S.camIn[cid] = false;
  }
}
// 보급 상자: 떨어지고 30초 뒤 모두에게 공지
function noticeSupplies(room, t) {
  for (const [id, b] of Object.entries(room.supplies || {})) {
    if (t < b.pubAt || S.supSeen[id]) continue;
    S.supSeen[id] = 1;
    if (b.by !== S.pid) { toast('📦 보급 상자 도착! 먼저 줍는 사람이 SS', true); vibrate([100, 50, 100]); sfx('augS'); }
  }
}
// 보급 상자 줍기: 떨어진 뒤 줍는 거리 안이면 SS (없으면 S → 아무거나)
function checkSupplies(me, t) {
  if (S.supBusy) return;
  const pickM = av('luck') || RULES.SPOT_PICK_M;
  for (const [id, b] of Object.entries(S.room.supplies || {})) {
    if (t < b.dropAt || Logic.dist(S.fix, b) > pickM) continue;
    S.supBusy = true;
    runTransaction(roomRef('supplies/' + id), cur => (cur ? null : undefined)).then(r => {
      if (!r.committed) return;
      const ban = augBan(me.role);
      const g = Logic.rollGrade(me.role, S.augs, 'SS', Math.random, ban) || Logic.rollGrade(me.role, S.augs, 'S', Math.random, ban) || Logic.rollAug(me.role, S.augs, Math.random, ban);
      push(roomRef('events'), { type: 'supplyGot', by: S.pid, at: serverTimestamp() });
      if (g) gainAug(g, '📦 보급 상자');
    }).catch(e => console.error(e)).finally(() => { S.supBusy = false; });
    return;
  }
}
// 팀 대화방: 우리 팀 대화방이 열려 있는 동안(살아 있을 때만) 💬 버튼. 도청이 있으면 상대 팀 글도 보임
const chatOpenOf = (room, me, t) => { if (asnOn(room) && me && Logic.isAsnRole(me.role)) return { until: Infinity, asn: 1 }; /* 암살전: 무리 단톡방은 항상 */ const co = room && me && me.role && room.chatOpen && room.chatOpen[me.role]; return co && (co.until || 0) > t ? co : null; };
function chatMsgs(room, me) {
  const ear = !!av('eavesdrop');
  return Object.entries(room.chats || {}).map(([id, m]) => ({ id, ...m })).filter(m => (asnOn(room) ? (m.role === me.role ? (m.at || 0) >= (me.crewAt || 0) : ear && m.role === Logic.asnTarget(room.asn, me.role)) : m.role === me.role || (ear && m.role))).sort((a, b) => (a.at || 0) - (b.at || 0)).slice(-40);
}
function chatLoop(inGame, room, me, t) {
  const ov = $('#ov-chat'), btn = $('#btnChat');
  const alive = inGame && me.role && Logic.alive({ ...me, selfDmg: S.selfDmg, augs: S.augs }, (room.hits || {})[S.pid]);
  const co = alive && chatOpenOf(room, me, t);
  btn.style.display = co ? '' : 'none';
  if (!co && ov.classList.contains('on')) { ov.classList.remove('on'); toast('💬 팀 대화방이 닫혔어요'); }
  if (!alive) return;
  const msgs = chatMsgs(room, me), P = room.players, name = id => esc((P[id] || {}).name || '?');
  for (const m of msgs) {
    if ((m.at || 0) <= S.chatLastAt) continue;
    S.chatLastAt = m.at; if (m.by === S.pid) continue;
    if (m.role !== me.role) { toast(`🎧 [상대 팀] ${(P[m.by] || {}).name || '?'}: ${m.text}`); vibrate(40); }
    else if (!ov.classList.contains('on')) { S.chatUnread++; toast(`💬 ${(P[m.by] || {}).name || '?'}: ${m.text}`); vibrate([60, 40, 60]); }
  }
  $('#chatBadge').textContent = S.chatUnread ? String(Math.min(S.chatUnread, 9)) : '';
  if (!ov.classList.contains('on')) return;
  S.chatUnread = 0;
  $('#chatLeft').textContent = co && !co.asn ? `${fmt(co.until - t)} 남음` : '';
  const html = msgs.map(m => `<div class="cmsg ${m.by === S.pid ? 'mine' : m.role !== me.role ? 'enemy' : ''}"><b>${m.role !== me.role ? '🎧 상대 팀 · ' : ''}${name(m.by)}</b>${esc(m.text)}</div>`).join('');
  if (html !== S.chatHtml) { S.chatHtml = html; const L = $('#chatList'); L.innerHTML = html; L.scrollTop = L.scrollHeight; }
}
function openChat() {
  const room = S.room, enemy = asnOn(room) ? '적' : roleName(((room.players[S.pid] || {}).role === 'chaser' ? 'runner' : 'chaser'), room);
  const q = ['📍 모여!', '💨 흩어져!', '🆘 도와줘!', `⚠️ ${enemy} 근처!`, `👀 ${enemy} 봤어!`, '✦ 증강 지점 있어', '✋ 기다려', '👍 알겠어'];
  $('#chatQuick').innerHTML = q.map(x => `<button data-chatq="${esc(x)}">${esc(x)}</button>`).join('');
  S.chatHtml = ''; S.chatUnread = 0; $('#ov-chat').classList.add('on');
}
function sendChat(text) {
  const room = S.room, me = room && room.players[S.pid], t = now();
  text = String(text || '').trim().slice(0, Logic.AUGS.teamChat.len);
  if (!text || !me) return;
  if (!chatOpenOf(room, me, t)) return toast('💬 팀 대화방이 닫혔어요');
  if (Date.now() - (S.chatSentAt || 0) < 800) return; // 연타 방지
  S.chatSentAt = Date.now();
  push(roomRef('chats'), { role: me.role, by: S.pid, text, at: t });
}
$('#btnChat').onclick = openChat;
$('#btnChatClose').onclick = () => $('#ov-chat').classList.remove('on');
$('#chatQuick').onclick = e => { const b = e.target.closest('[data-chatq]'); if (b) sendChat(b.dataset.chatq); };
$('#btnChatSend').onclick = () => { sendChat($('#chatIn').value); $('#chatIn').value = ''; };
$('#chatIn').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('#btnChatSend').click(); } });
// 그림자 밟기: 내(추격자) 30m 안에 있는 도망자들의 20초 전 자리 (투명화 중이던 자리·이미 밟은 도망자·전파 방해 중엔 없음)
function shadowPts(room, t) {
  const a = Logic.AUGS.shadowStep, x = S.augs && S.augs.shadowStep, me = room.players[S.pid], hits = room.hits || {};
  if (!x || (x.until || 0) <= t || !S.fix || !me || me.role !== 'chaser' || radioJammed(t)) return [];
  const at = t - a.back * 1000, out = [];
  for (const [id, p] of Object.entries(room.players)) {
    if (p.role !== 'runner' || S.shadowHit[id] || (p.silentUntil || 0) > t || !Logic.alive(p, hits[id]) || ((hits[id] && hits[id].invUntil) || 0) > t) continue;
    let best = null; for (const h of S.hist[id] || []) if (!best || Math.abs(h.t - at) < Math.abs(best.t - at)) best = h;
    if (!best || best.st || Math.abs(best.t - at) > 3000 || Logic.dist(S.fix, best) > a.r) continue;
    out.push({ id, lat: best.lat, lng: best.lng });
  }
  return out;
}
// 시한폭탄: 내가 들고 있으면 10m 안 가장 가까운 사람에게 넘김 (방금 준 사람 빼고, 팀 상관없음)
// 시간이 다 되거나 3번째로 받았으면 내 폰에서 터짐 (체력 -30)
function bombTick(room, me, t, meAlive) {
  const a = Logic.AUGS.timeBomb, hits = room.hits || {}, ON = 30000; // 위치가 30초 넘게 안 바뀌었으면 앱이 꺼진 걸로 봄
  for (const [bid, b] of Object.entries(room.bombs || {})) {
    if (!b || S.bombGone[bid]) continue;
    const boomAt = (b.passes || 0) >= a.max ? (b.until || 0) - a.v * 1000 : (b.until || 0); // 3번째로 받으면 바로
    if (b.holder !== S.pid) {
      // 들고 있는 사람 앱이 꺼져 있어도 터지게: 터질 때를 5초 넘기면 아무 폰이나 대신 터뜨림 (한 대만, 체력은 hits에)
      if (t < boomAt + 5000 || S.bombBusy) continue;
      S.bombBusy = true;
      runTransaction(roomRef('bombs/' + bid), cur => (cur && cur.holder === b.holder && cur.until === b.until ? null : undefined)).then(r => {
        if (!r.committed) return;
        const hp = room.players[b.holder], alive = hp && Logic.alive(hp, hits[b.holder]);
        if (!alive) return; // 이미 탈락했으면 폭탄만 사라짐
        runTransaction(roomRef('hits/' + b.holder), cur => ({ ...(cur || {}), ext: ((cur && cur.ext) || 0) + a.dmg }));
        push(roomRef('events'), { type: 'bombBoom', by: b.by, target: b.holder, remote: 1, at: serverTimestamp() });
      }).catch(e => console.error(e)).finally(() => { S.bombBusy = false; });
      continue;
    }
    if (!meAlive) { S.bombGone[bid] = true; remove(roomRef('bombs/' + bid)); continue; } // 탈락하면 폭탄도 사라짐
    if (t >= boomAt) {
      S.bombGone[bid] = true;
      runTransaction(roomRef('bombs/' + bid), cur => (cur && cur.holder === S.pid ? null : undefined)).then(r => {
        if (!r.committed) return; // 다른 폰이 이미 대신 터뜨림
        S.selfDmg += a.dmg; S.lastWrite = 0; hurtBy('시한폭탄', b.by);
        push(roomRef('events'), { type: 'bombBoom', by: b.by, target: S.pid, at: serverTimestamp() });
        toast(`💥 ${(b.passes || 0) >= a.max ? `${a.max}번째로 받아서 바로 ` : ''}폭탄이 터졌어요! 체력 -${a.dmg}`, true); sfx('boom'); flash('rgba(255,122,69,1)'); vibrate([400, 80, 400]);
      }).catch(e => console.error(e));
      continue;
    }
    if (!S.fix || S.fix.rawAcc > RULES.GPS_BAD_ACC || S.bombBusy) continue;
    let best = null;
    for (const [id, p] of Object.entries(room.players)) {
      if (id === S.pid || id === b.prev || !p.role || p.lat == null || !Logic.alive(p, hits[id]) || t - (p.posAt || 0) > ON) continue; // 앱 꺼진 사람에겐 안 넘김
      const d = Logic.dist(S.fix, p); if (d <= a.r && (!best || d < best.d)) best = { id, d };
    }
    if (!best) continue;
    S.bombBusy = true;
    runTransaction(roomRef('bombs/' + bid), cur => cur && cur.holder === S.pid ? { ...cur, holder: best.id, prev: S.pid, passes: (cur.passes || 0) + 1, until: t + a.v * 1000 } : undefined)
      .then(r => { if (r.committed) push(roomRef('events'), { type: 'bombPass', by: S.pid, target: best.id, passes: r.snapshot.val().passes, at: serverTimestamp() }); })
      .catch(e => console.error(e)).finally(() => { S.bombBusy = false; });
  }
}
// 발자국 추적용: 도망자들의 진짜 위치를 1분 동안 기록
function recordHist(room, t, myRole) {
  for (const [id, p] of Object.entries(room.players)) {
    if (!p.role || p.role === myRole || p.lat == null) continue;
    const h = S.hist[id] || (S.hist[id] = []);
    h.push({ t, lat: p.lat, lng: p.lng, st: (p.stealthUntil || 0) > t });
    while (h.length && t - h[0].t > 60000) h.shift();
  }
}
// 증강 바: 지속형은 칩, 쿨타임 스킬은 준비되면 '사용' 버튼 / 쿨타임 중이면 남은 시간 / 발동 중이면 남은 효과 시간
function renderAugBar(alive) {
  const t = now(), parts = [], me = (S.room && S.room.players[S.pid]) || {}, silenced = (me.silenceUntil || 0) > t;
  if (alive) for (const [id, x] of Object.entries(S.augs || {})) {
    const a = Logic.AUGS[id]; if (!a) continue;
    const g = a.grade, base = `class="aug g${g}`, inner = `${icon(id)}<b class="g">${g}</b>${a.name}`;
    if ((x.until || 0) > t) parts.push(`<span ${base} on" data-info="${id}">${inner} ${fmt(x.until - t)}</span>`);
    else if (x.left === 0) parts.push(`<span ${base} cd" data-info="${id}">${inner} 다 씀</span>`); // 횟수 정해진 스킬
    else if (a.cd && !Logic.augReady(x, t)) parts.push(`<span ${base} cd" data-info="${id}">${inner} ${fmt(x.readyAt - t)}</span>`);
    else if (a.auto) parts.push(`<span ${base}" data-info="${id}">${inner} 대기</span>`);
    else if (a.cd && silenced) parts.push(`<span ${base} silenced" data-info="${id}">${inner} 침묵 ${fmt(me.silenceUntil - t)}</span>`);
    else if (a.cd) parts.push(`<button ${base} use" data-use="${id}">${inner}<span class="u">${x.left != null ? `${x.left}회` : '사용'}</span></button>`);
    else parts.push(`<span ${base}" data-info="${id}">${inner}</span>`);
  }
  const html = parts.join('');
  if (html !== S.augBarHtml) { S.augBarHtml = html; $('#augBar').innerHTML = html; }
}
// 쿨타임 글자가 1초마다 바뀌면서 증강 바가 다시 그려지면, 누르는 도중에 버튼이 바뀌어 탭이 사라질 수 있음
// → 손가락을 댄 순간의 버튼을 기억해 두고, 뗐을 때 버튼을 못 찾으면 그걸로 처리
let augDown = null, augHold = 0, augLongAt = 0;
// 꾹 누르면(0.5초) 쓰지 않고 설명 카드 (화면을 새로 누르면 닫힘)
function showAugInfo(id) {
  const a = Logic.AUGS[id]; if (!a) return;
  $('#augInfoCard').innerHTML = `<div class="augcard g${a.grade}"><span class="ic">${icon(id)}<i>${a.grade}</i></span><span><b>${a.name}</b><small>${Logic.augDesc(id)}</small></span></div>`;
  asnGiveHtml(id);
  S.infoDown = false; $('#ov-augInfo').classList.add('on'); vibrate(30);
}
$('#ov-augInfo').addEventListener('pointerdown', () => { S.infoDown = true; });
$('#ov-augInfo').onclick = () => { if (S.infoDown) $('#ov-augInfo').classList.remove('on'); }; // 꾹 누른 손가락을 뗄 때는 안 닫힘
$('#augBar').addEventListener('pointerdown', e => {
  const el = e.target.closest('[data-use],[data-info]');
  augDown = el ? { use: el.dataset.use, info: el.dataset.info, at: Date.now(), x: e.clientX, y: e.clientY } : null;
  clearTimeout(augHold); augLongAt = 0;
  if (augDown) { const id = augDown.use || augDown.info; augHold = setTimeout(() => { augLongAt = Date.now(); showAugInfo(id); }, 500); }
});
$('#augBar').addEventListener('pointermove', e => { if (augDown && Math.hypot(e.clientX - augDown.x, e.clientY - augDown.y) > 12) clearTimeout(augHold); });
['pointerup', 'pointercancel', 'pointerleave'].forEach(n => $('#augBar').addEventListener(n, () => clearTimeout(augHold)));
$('#augBar').addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('contextmenu', e => { if (!e.target.closest('input,textarea')) e.preventDefault(); }); // 게임 화면 어디서든 길게 누르기 메뉴 막기
$('#augBar').onclick = e => {
  if (augLongAt) { augLongAt = 0; augDown = null; return; } // 꾹 누른 뒤엔 쓰지 않음
  const el = e.target.closest('[data-use],[data-info]');
  const d = el ? { use: el.dataset.use, info: el.dataset.info } : augDown && Date.now() - augDown.at < 800 ? augDown : null;
  augDown = null;
  if (!d) return;
  if (d.use) return useAug(d.use);
  if (d.info && S.augs[d.info]) toast(`${augLabel(d.info)}: ${Logic.augDesc(d.info)}`);
};
// Firebase가 배열을 객체로 돌려줄 때도 있어서 둘 다 처리
const offerList = o => (Array.isArray(o) ? o : Object.values(o || {}));
// 정기 보상: 추격 시작 후 보상 간격(기본 게임 시간 ÷ 3)마다 3개 중 1개 선택 (가진 증강은 안 나옴)
function checkOffer(me, t, ph) {
  if (ph.phase !== 'chase' || !RULES.AUG_ON) return;
  const due = Math.floor((t - (S.room.startAt + RULES.HIDE_SEC * 1000)) / (RULES.AUG_EVERY_SEC * 1000));
  if (!me.offer && due > (me.augPicks || 0) && !S.offerSent) {
    S.offerSent = true;
    const offer = Logic.rollOffer(me.role, S.augs, Math.random, augBan(me.role));
    const u = offer.length ? { offer } : { augPicks: (me.augPicks || 0) + 1 };
    if (!offer.length) toast('정기 보상: 더 얻을 수 있는 증강이 없어요');
    update(meRef(), u).finally(() => { S.offerSent = false; });
  }
  if (me.offer && !$('#ov-aug').classList.contains('on')) {
    $('#augCards').innerHTML = offerList(me.offer).filter(id => Logic.AUGS[id]).map(id =>
      `<button class="augcard g${gradeOf(id)}" data-pick="${id}"><span class="ic">${icon(id)}<i>${gradeOf(id)}</i></span><span><b>${Logic.AUGS[id].name}</b><small>${Logic.augDesc(id)}</small></span></button>`).join('');
    $('#augTitle').textContent = `정기 보상 (${fmtDur(RULES.AUG_EVERY_SEC)}마다)`;
    $('#ov-aug').classList.add('on'); vibrate([80, 60, 80]);
  }
}
$('#augCards').onclick = e => {
  const b = e.target.closest('[data-pick]'), me = S.room && S.room.players[S.pid];
  if (!b || !me || !me.offer) return;
  $('#ov-aug').classList.remove('on');
  update(meRef(), { offer: null, augPicks: (me.augPicks || 0) + 1 });
  gainAug(b.dataset.pick, '정기 보상');
};
// 증강 지점: 15m 안에 들어가면 획득, 그 지점은 3분 뒤 다른 곳에 다시 생김 (먼저 도착한 한 명만)
function checkSpots(t) {
  const room = S.room, area = room.settings && room.settings.area;
  if (S.spotBusy || !area || !RULES.AUG_ON) return;
  for (const [sid, sp] of Object.entries(room.spots || {})) {
    const pickM = av('luck') || RULES.SPOT_PICK_M; // 행운 증강
    if ((sp.at || 0) > t || Logic.dist(S.fix, sp) > pickM) continue;
    S.spotBusy = true;
    const pos = { lat: S.fix.lat, lng: S.fix.lng };
    runTransaction(roomRef('spots/' + sid), cur => {
      if (!cur || (cur.at || 0) > t || Logic.dist(pos, cur) > pickM) return;
      return { ...Logic.randomSpot(area), at: t + RULES.SPOT_RESPAWN_SEC * 1000 };
    }).then(r => { if (r.committed) gainRandom('증강 지점'); })
      .catch(e => console.error(e))
      .finally(() => { S.spotBusy = false; });
    return;
  }
}
// 증강 지점: 오래(30분 게임 기준 10분) 아무도 못 먹으면 못 들어가는 곳으로 보고, 구역 안 50m 넘게 떨어진 새 자리로 옮김 (먼저 본 한 명이 옮김)
function moveStaleSpots(t) {
  const room = S.room, area = room.settings && room.settings.area;
  if (S.spotMoveBusy || !area || !RULES.AUG_ON || !room.startAt) return;
  for (const [sid, sp] of Object.entries(room.spots || {})) {
    if (!Logic.spotStale(sp, room.startAt, t)) continue;
    S.spotMoveBusy = true;
    runTransaction(roomRef('spots/' + sid), cur => {
      if (!cur || !Logic.spotStale(cur, room.startAt, t)) return;
      return { ...Logic.moveSpot(area, cur), at: t };
    }).catch(e => console.error(e))
      .finally(() => { S.spotMoveBusy = false; });
    return;
  }
}
// 덫: 상대 팀 덫 10m 안에 들어가면 발동 (먼저 밟은 한 명), 스태미나 0 + 설치한 사람에게 위치 알림
function checkTraps(me, t) {
  if (S.trapBusy) return;
  for (const [tid, tr] of Object.entries(S.room.traps || {})) {
    if (tr.role === me.role || (tr.until || 0) <= t || Logic.dist(S.fix, tr) > Logic.AUGS.trap.v) continue;
    S.trapBusy = true;
    const pos = { lat: S.fix.lat, lng: S.fix.lng };
    runTransaction(roomRef('traps/' + tid), cur => (cur && (cur.until || 0) > t ? null : undefined))
      .then(r => {
        if (!r.committed) return;
        S.st = 0;
        toast('덫을 밟았어요! 스태미나 0, 위치가 들켰어요', true); flash('rgba(255,77,79,.9)'); vibrate([200, 80, 200]); sfx('trap');
        push(roomRef('events'), { type: 'trap', by: tr.by, target: S.pid, ...pos, at: serverTimestamp() });
      })
      .catch(e => console.error(e))
      .finally(() => { S.trapBusy = false; });
    return;
  }
}
// 가짜 보물: 상대가 놓은 가짜 지점을 밟으면(지점 줍는 거리 안) 스태미나 0 + 놓은 사람에게 30초 위치 표시
function checkFakes(me, t) {
  if (S.fakeBusy || !RULES.AUG_ON) return;
  const pickM = av('luck') || RULES.SPOT_PICK_M;
  for (const [fid, f] of Object.entries(S.room.fakes || {})) {
    if (f.role === me.role || (f.until || 0) <= t || Logic.dist(S.fix, f) > pickM) continue;
    S.fakeBusy = true;
    const pos = { lat: S.fix.lat, lng: S.fix.lng };
    runTransaction(roomRef('fakes/' + fid), cur => (cur && (cur.until || 0) > t ? null : undefined))
      .then(r => {
        if (!r.committed) return;
        S.st = 0;
        toast('가짜 보물이었어요! 스태미나 0, 위치가 들켰어요', true); flash('rgba(255,77,79,.9)'); vibrate([200, 80, 200]); sfx('trap');
        push(roomRef('events'), { type: 'trap', fake: true, by: f.by, target: S.pid, ...pos, at: serverTimestamp() });
      })
      .catch(e => console.error(e))
      .finally(() => { S.fakeBusy = false; });
    return;
  }
}
// 영역전개: 상대 팀 영역 안이면 true
function inEnemyDomain(me, t) {
  return Object.values(S.room.zones || {}).some(z => z.role !== me.role && (z.until || 0) > t && Logic.dist(S.fix, z) <= z.r);
}
function drawSpots(mo) {
  const t = now(), room = S.room || {}, me = (room.players || {})[S.pid] || {}, spots = {}, bo = blackedOut();
  // 남은 시간: 진짜 지점은 다른 곳으로 옮겨질 때까지(10분 리셋), 가짜 보물은 사라질 때까지
  for (const [id, sp] of Object.entries(bo ? {} : room.spots || {})) if ((sp.at || 0) <= t) spots['s' + id] = { ...sp, left: Math.min(Logic.spotStaleMs(), Logic.spotStaleMs() - (t - Math.max(sp.at || 0, room.startAt || 0))) };
  // 상대가 놓은 가짜 보물은 진짜 지점과 똑같이 보임 (놓은 팀에게는 안 보임)
  for (const [id, f] of Object.entries(bo ? {} : room.fakes || {})) if (me.role && f.role !== me.role && (f.until || 0) > t) spots['f' + id] = { ...f, left: f.until - t };
  mo.spotM = mo.spotM || {};
  for (const id of Object.keys(mo.spotM)) {
    const sp = spots[id];
    if (!sp || mo.spotM[id].key !== sp.lat + ',' + sp.lng) { mo.spotM[id].remove(); delete mo.spotM[id]; }
  }
  for (const [id, sp] of Object.entries(spots)) {
    const lbl = `✦ 증강 ${fmt(sp.left)}`;
    if (mo.spotM[id]) { if (mo.spotM[id].lbl !== lbl) { mo.spotM[id].setTooltipContent(lbl); mo.spotM[id].lbl = lbl; } continue; }
    const m = L.circleMarker([sp.lat, sp.lng], { radius: 11, color: '#fff', weight: 2, fillColor: '#ffcf40', fillOpacity: .95 })
      .bindTooltip(lbl, { permanent: true, direction: 'top', className: 'spotTip' }).addTo(mo.map);
    m.key = sp.lat + ',' + sp.lng; m.lbl = lbl; mo.spotM[id] = m;
  }
}
// 위장 중인 도망자는 상대 지도에서 추격자처럼 (빨간 점 + '추격자')
const disguised = (p, t) => !!(p && (p.disguiseUntil || 0) > t);
// 순간 포착: 도망자 위치 표시 (분신을 쓴 도망자는 분신 위치)
function drawRadar(mo) {
  if (!mo.radarG) mo.radarG = L.layerGroup().addTo(mo.map);
  const t = now(), A = S.augs || {}, room = S.room, on = x => x && (x.until || 0) > t;
  const all = on(A.radar) || on(A.lifeBet), cd = on(A.cordon) && A.cordon.lat != null && A.cordon, pl = on(A.scanPulse) && A.scanPulse.at && A.scanPulse;
  const list = !(all || cd || pl) || !room || radioJammed(t) ? [] : Object.entries(room.players) // 전파 방해 중엔 안 보임
    .filter(([id, p]) => p.role === 'runner' && p.lat != null && Logic.alive(p, (room.hits || {})[id]) && !Logic.inSmoke(p, room.smokes, t))
    .map(([id, p]) => [id, Logic.shownPos(p, t, room.players)])
    .filter(([, p]) => all || (cd && Logic.dist(cd, p) <= Logic.AUGS.cordon.r) || (pl && pulseHit(pl, p, t)));
  mo.radarM = mo.radarM || {};
  const keep = new Set(list.map(([id]) => id + (disguised(room.players[id], t) ? ':d' : '')));
  for (const id of Object.keys(mo.radarM)) if (!keep.has(id)) { mo.radarG.removeLayer(mo.radarM[id]); delete mo.radarM[id]; }
  for (const [id, p] of list) {
    const dg = disguised(room.players[id], t), key = id + (dg ? ':d' : '');
    if (mo.radarM[key]) mo.radarM[key].setLatLng([p.lat, p.lng]);
    else mo.radarM[key] = badge([p.lat, p.lng], { name: dg ? '추격자' : p.name, col: dg ? '#ff4d4f' : '#3ba3ff' }).addTo(mo.radarG);
  }
}
// 영역(모두에게 보임), 우리 팀 덫·분신, 덫에 걸린 상대 위치 — 매번 다시 그림 (개수가 적음)
/* 팀 핑: 지도를 길게 누르면 종류를 골라 같은 팀에게 20초 동안 표시 */
const PING = { seen: ['👀', '여기 있었음'], gather: ['📍', '여기로 모여'], danger: ['⚠️', '위험'] };
function bindLongPress(mo) {
  const el = mo.map.getContainer(); let timer = null, start = null;
  const cancel = () => { clearTimeout(timer); timer = null; };
  el.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    start = { x: e.clientX, y: e.clientY }; cancel();
    timer = setTimeout(() => {
      timer = null; const r = el.getBoundingClientRect();
      openPing(mo.map.containerPointToLatLng(mo.map._rotDeg ? unrotate(mo.map, start.x, start.y) : [start.x - r.left, start.y - r.top]));
    }, 600);
  });
  el.addEventListener('pointermove', e => { if (timer && start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 12) cancel(); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(n => el.addEventListener(n, cancel));
  el.addEventListener('contextmenu', e => e.preventDefault());
}
function openPing(ll) {
  const room = S.room, me = room && room.players[S.pid];
  if (!me || !me.role || room.status !== 'playing' || !Logic.alive({ ...me, selfDmg: S.selfDmg, augs: S.augs }, (room.hits || {})[S.pid])) return;
  const left = (asnOn(room) ? Logic.ASN.PING_SEC * 1000 : 10000) - (Date.now() - S.pingAt); // 암살전: 지시 핑 30초에 1번
  if (left > 0 && !S.pingFake) return toast(`핑은 ${Math.ceil(left / 1000)}초 뒤에 다시 찍을 수 있어요`);
  $('#ov-ping h2').textContent = S.pingFake ? '🎭 위조 핑' : '팀 핑';
  $('#ov-ping p').textContent = S.pingFake ? '상대 팀 지도에 그 팀원이 찍은 것처럼 20초 동안 보여요' : '같은 팀 지도에 20초 동안 보여요';
  S.pingLL = ll; vibrate(40); $('#ov-ping').classList.add('on');
}
$('#ov-ping').onclick = e => {
  const b = e.target.closest('[data-ping]');
  if (!b) { if (e.target.id === 'btnPingClose' || e.target.id === 'ov-ping') { $('#ov-ping').classList.remove('on'); S.pingFake = false; } return; }
  const me = S.room.players[S.pid];
  $('#ov-ping').classList.remove('on');
  if (S.pingFake) { // 살아 있는 상대 중 한 명이 찍은 것처럼
    S.pingFake = false;
    const hits = S.room.hits || {}, foes = Object.entries(S.room.players).filter(([id, p]) => p.role && p.role !== me.role && Logic.alive(p, hits[id]));
    if (!foes.length || !S.augs.fakePing || !Logic.augReady(S.augs.fakePing, now())) return;
    const [fid, fp] = foes[Math.floor(Math.random() * foes.length)];
    push(roomRef('pings'), { by: fid, role: fp.role, kind: b.dataset.ping, lat: S.pingLL.lat, lng: S.pingLL.lng, until: now() + 20000, fake: true });
    setCooldown('fakePing'); sfx('ping'); toast(`🎭 ${fp.name} 이름으로 '${PING[b.dataset.ping][1]}' 위조 핑을 보냈어요`, true); renderGame();
    return;
  }
  S.pingAt = Date.now();
  push(roomRef('pings'), { by: S.pid, role: me.role, kind: b.dataset.ping, lat: S.pingLL.lat, lng: S.pingLL.lng, until: now() + 20000 });
  sfx('ping'); toast(`${PING[b.dataset.ping].join(' ')} 핑을 보냈어요`);
};
// 같은 팀의 새 핑이 오면 진동 + 소리 + 알림
function notifyPings(room, me) {
  if (!S.seenPings || !me.role) return;
  for (const [id, pg] of Object.entries(room.pings || {})) {
    if (S.seenPings.has(id)) continue;
    S.seenPings.add(id);
    if (pg.by === S.pid || (pg.until || 0) <= now() || !PING[pg.kind]) continue;
    const name = (room.players[pg.by] || {}).name || '?';
    if (pg.role === me.role) { toast(`${PING[pg.kind][0]} ${name}: ${PING[pg.kind][1]}`); vibrate([60, 40, 60]); sfx('ping'); }
    else if (av('eavesdrop')) { toast(`🎧 도청 · ${name}: ${PING[pg.kind][1]}`); sfx('ping'); }
  }
}
// 기권: 확인 후 탈락 → 관전 모드
// 얼음땡: 스스로 얼음 (판마다 정해진 횟수, 최대 30초, 그동안 못 잡힘·못 움직임, 팀원이 땡 하면 일찍 풀림)
$('#btnIce').onclick = safe(async () => {
  const room = S.room, me = room && room.players[S.pid], t = now(), MRi = Logic.MODE_RULES;
  if (!me || modeOf(room) !== 'ice' || me.jailed || !S.fix) return;
  const r = await runTransaction(roomRef(`players/${S.pid}/iceSelf`), cur => {
    const used = (cur && cur.used) || 0;
    if (used >= RULES.ICE_SELF_USES || (cur && (cur.until || 0) > t)) return;
    return { used: used + 1, at: t, until: t + MRi.ICE_SELF_SEC * 1000, lat: S.fix.lat, lng: S.fix.lng };
  });
  if (!r.committed) return toast('지금은 얼음을 쓸 수 없어요');
  push(roomRef('events'), { type: 'iceSelf', by: S.pid, at: serverTimestamp() });
  toast(`🧊 얼음! ${MRi.ICE_SELF_SEC}초 동안 못 잡혀요 · 움직이면 안 돼요`, true); flash('rgba(103,232,249,.8)'); vibrate([60, 40, 160]);
  renderGame();
});
$('#btnForfeit').onclick = () => $('#ov-forfeit').classList.add('on');
$('#btnForfeitNo').onclick = () => $('#ov-forfeit').classList.remove('on');
$('#btnForfeitYes').onclick = safe(async () => {
  $('#ov-forfeit').classList.remove('on');
  S.stats.diedAt = now(); S.stats.deathWhy = '기권'; S.stats.deathBy = null;
  const w = update(meRef(), { forfeit: true, stats: S.stats });
  toast('기권했어요. 관전 모드로 바뀌어요', true); sfx('lose');
  renderGame(); checkWin();
  // 연결이 끊긴 채면 내 화면에서만 기권이 되고 다른 폰엔 안 감 → 알려 주고, 연결되면 자동으로 전달됨
  let acked = false, slow = false;
  const tm = setTimeout(() => { if (!acked) { slow = true; toast('📡 연결 끊김 · 연결되면 기권이 전달돼요', true); reconnect(); } }, 3000);
  await w; acked = true; clearTimeout(tm);
  if (slow) toast('✅ 기권이 전달됐어요', true);
});
// 지도 표시물을 키별로 하나씩 유지하며 갱신 (지웠다 다시 그리면 라벨이 겹쳐 남는 경우가 있어서)
function syncLayer(mo, name, items) {
  const G = mo[name] || (mo[name] = { g: L.layerGroup().addTo(mo.map), m: {} }), keep = new Set();
  for (const it of items) {
    keep.add(it.key);
    if (!G.m[it.key]) G.m[it.key] = it.make().addTo(G.g);
    else if (it.update) it.update(G.m[it.key]);
  }
  for (const k of Object.keys(G.m)) if (!keep.has(k)) { G.g.removeLayer(G.m[k]); delete G.m[k]; }
}
// 관전 모드(탈락한 사람): 모든 사람의 진짜 위치·체력
function drawSpectator(mo, on) {
  const room = S.room, hits = (room && room.hits) || {}, items = [];
  if (on) for (const [id, p] of Object.entries(room.players)) {
    if (!p.role || p.lat == null || id === S.pid) continue;
    const hp = Logic.hpOf(p, hits[id]), bo = { name: p.name, sub: hp > 0 ? Math.ceil(hp) : '탈락', col: ROLE_COL[p.role] || '#9ca3af', op: hp > 0 ? 1 : .35 };
    items.push({ key: id, make: () => badge([p.lat, p.lng], bo), update: m => badgeSet(m, [p.lat, p.lng], bo) });
  }
  syncLayer(mo, 'specL', items);
}
