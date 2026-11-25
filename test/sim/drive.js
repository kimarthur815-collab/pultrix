// 4명이 암살전 한 판: 사슬 → 뒤에서 암살 → 돌아보기로 막기 → 무리 통째 흡수 → 능력 상납 → 하극상 → 승리
const puppeteer = require('puppeteer-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const BASE = 'http://localhost:8790';
const C0 = { lat: 37.5665, lng: 126.9780 };
const off = (dN, dE = 0) => ({ latitude: C0.lat + dN / 111195, longitude: C0.lng + dE / (111195 * Math.cos(C0.lat * Math.PI / 180)), accuracy: 4 });
const db = async () => (await fetch(BASE + '/db')).json();
const dbset = (path, value) => fetch(BASE + '/dbset', { method: 'POST', body: JSON.stringify({ path, value }) });
const setOffset = ms => fetch(BASE + '/offset?ms=' + Math.round(ms));
const mvTo = async (pg, pos) => { for (let i = 0; i < 7; i++) { await pg.setGeolocation({ ...pos, latitude: pos.latitude + i * 1e-8 }); await sleep(150); } };
const log = (...a) => console.log('•', ...a);
let fails = 0; const check = (ok, what) => { console.log(ok ? '  ✔' : '  ✘', what); if (!ok) fails++; };
(async () => {
  const br = await puppeteer.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required', '--window-size=400,860'] });
  const names = ['Ann', 'Bob', 'Cid', 'Dan'], P = [];
  for (let i = 0; i < 4; i++) {
    const ctx = await br.createBrowserContext(); await ctx.overridePermissions(BASE, ['geolocation']);
    const pg = await ctx.newPage(); await pg.setViewport({ width: 390, height: 844 });
    pg.on('pageerror', e => console.log(`  [${names[i]} 오류]`, e.message));
    pg.on('console', m => { if (m.type() === 'error' && !/tile-none|favicon|Failed to load resource/.test(m.text())) console.log(`  [${names[i]} console]`, m.text().slice(0, 200)); });
    await pg.setGeolocation(off(0, i * 60, 0));
    P.push({ pg, name: names[i] });
  }
  const H = P[0].pg;
  const head = (p, h) => p.pg.evaluate(h => { window.dispatchEvent(new DeviceOrientationEvent('deviceorientationabsolute', { alpha: (360 - h) % 360, beta: 0, gamma: 0, absolute: true })); }, h);
  const enter = async (p, create, code) => {
    await p.pg.goto(BASE + '/'); await sleep(600);
    await p.pg.evaluate(() => { const s = document.querySelector('#tutSkip'); if (s && s.offsetParent) s.click(); });
    await p.pg.type('#in-name', p.name);
    if (!create) await p.pg.type('#in-code', code);
    await p.pg.click(create ? '#btnCreate' : '#btnJoin'); await sleep(400);
    await p.pg.evaluate(() => { const c = document.querySelector('#consentAge'); if (c && c.offsetParent) { c.click(); document.querySelector('#btnConsentOk').click(); } });
    await sleep(800);
    await p.pg.evaluate(() => document.querySelector('#btnReady').click()); await sleep(600);
  };
  await enter(P[0], true);
  const code = await H.$eval('#l-code', e => e.textContent.trim()); log('방 코드', code);
  for (const p of P.slice(1)) await enter(p, false, code);
  await sleep(1500);
  await H.evaluate(() => document.querySelector('#l-mode [data-mode=assassin]').click()); await sleep(800);
  const hint = await H.$eval('#l-modeHint', e => e.textContent); check(hint.includes('우두머리'), '로비 설명: ' + hint.slice(0, 40));
  check(await H.$eval('#l-chLabel', e => e.parentElement.style.display === 'none'), '로비: 추격자 수 칸 숨김');
  await H.evaluate(() => document.querySelector('#btnStart').click()); await sleep(2500);
  let d = await db(); const room = d.rooms[code], asn = room.asn;
  check(!!asn && asn.chain.split(',').length === 4, '시작: 사슬 4무리');
  const pidOf = n => Object.entries(room.players).find(([, p]) => p.name === n)[0];
  const nameOf = id => room.players[id].name;
  const ch = asn.chain.split(','), bossOf = k => asn.crews[k].boss, byPid = id => P.find(p => p.name === nameOf(id));
  log('사슬', ch.map(k => nameOf(bossOf(k))).join(' → '));
  for (const p of P) { const t = await p.pg.$eval('#roleSub', e => e.textContent).catch(() => ''); if (p === P[0]) check(t.includes('타깃'), '역할 공개: ' + t.slice(0, 30)); }
  for (const p of P) await p.pg.evaluate(() => { for (const s of ['#btnRoleOk', '#tutSkip']) { const b = document.querySelector(s); if (b && b.offsetParent) b.click(); } });
  await sleep(500);
  for (const p of P) await p.pg.evaluate(() => { const b = document.querySelector('#tutSkip'); if (b && b.offsetParent) b.click(); });
  // 시계를 추격 시작 + 2분 10초로 (화살표 열림)
  const startAt = room.startAt, HIDE = 300e3;
  await setOffset(startAt + HIDE + 130e3 - Date.now()); await sleep(2500);
  const A = byPid(bossOf(ch[0])), B = byPid(bossOf(ch[1])), Cc = byPid(bossOf(ch[2])), D = byPid(bossOf(ch[3]));
  const aId = pidOf(A.name), bId = pidOf(B.name), cId = pidOf(Cc.name), dId = pidOf(D.name);
  for (const p of P) await head(p, 0);
  // A의 화면: 화살표·버튼 / 부하 체력·스태미나 아직 우두머리
  await mvTo(A.pg, off(0, 0)); await mvTo(B.pg, off(40, 0)); await mvTo(Cc.pg, off(80, 0)); await mvTo(D.pg, off(-60, 0));
  await sleep(3500);
  for (let k = 0; k < 6; k++) { for (const p of P) await head(p, 0); await sleep(300); }
  const info = await A.pg.$eval('#g-info', e => e.textContent); log('A 정보줄:', info);
  check(/화살표|타깃/.test(info), 'A(우두머리)에게 화살표/타깃 안내');
  const stA = await A.pg.$eval('#g-stv', e => e.textContent); check(/\/100$/.test(stA), 'A 스태미나 최대 100: ' + stA);
  // 1) 뒤에서 암살: A가 B 5m 뒤, 둘 다 북쪽
  await mvTo(B.pg, off(40, 0)); await mvTo(A.pg, off(35, 0)); await sleep(3500);
  for (let k = 0; k < 4; k++) { for (const p of [A, B]) await head(p, 0); await sleep(250); }
  const btn = await A.pg.$eval('#btnStab', e => [e.style.display, e.disabled, e.textContent]); log('A 암살 버튼', JSON.stringify(btn));
  check(btn[0] === 'block' && !btn[1] && btn[2].includes(B.name), '타깃 뒤 5m: 암살 버튼 켜짐');
  const hold = async (p, sel, ms, during) => {
    await p.pg.evaluate(sel => { const b = document.querySelector(sel); const r = b.getBoundingClientRect(); b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 7, clientX: r.x + 5, clientY: r.y + 5, isPrimary: true })); }, sel);
    const t0 = Date.now(); while (Date.now() - t0 < ms) { if (during) await during(Date.now() - t0); await sleep(250); }
    await p.pg.evaluate(sel => document.querySelector(sel).dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 7 })), sel);
  };
  let warned = false;
  let shot = false;
  await hold(A, '#btnStab', 3600, async el => { for (const p of [A, B]) await head(p, 0); if (await B.pg.$eval('#asnWarn', e => e.classList.contains('on'))) warned = true; if (!shot && el > 1500) { shot = true; await A.pg.screenshot({ path: __dirname + '/s_attacker.png' }); await B.pg.screenshot({ path: __dirname + '/s_victim.png' }); } });
  check(warned, 'B 화면에 "등 뒤에 누가 있다!" 경고');
  await sleep(1500); d = await db(); let s2 = d.rooms[code].asn;
  check(s2.mem[bId] === ch[0], 'A가 B 암살 → B는 A 무리');
  check(s2.chain.split(',').length === 3, 'B 무리가 사슬에서 빠짐 (3무리)');
  check((d.rooms[code].hits[bId] || {}).invUntil > 0, 'B 1분 무적');
  await sleep(2000);
  const bRole = await B.pg.$eval('#g-role', e => e.textContent); check(bRole === '부하', 'B 화면 역할: ' + bRole);
  const bSt = await B.pg.$eval('#g-stv', e => e.textContent); check(/\/70$/.test(bSt), 'B 스태미나 최대 70: ' + bSt);
  const bHp = await B.pg.$eval('#g-hpv', e => e.textContent); check(+bHp <= 60, 'B 체력 최대 60: ' + bHp);
  const bInfo = await B.pg.$eval('#g-info', e => e.textContent); check(bInfo.includes('우두머리'), 'B(부하) 화살표 대신 안내: ' + bInfo.slice(0, 30));
  // 2) 돌아보기로 막기: A가 C 뒤로, 1초 뒤 C가 남쪽으로 돌아봄
  await mvTo(Cc.pg, off(80, 0)); await mvTo(A.pg, off(75, 0)); await sleep(3500);
  for (let k = 0; k < 4; k++) { for (const p of [A, Cc]) await head(p, 0); await sleep(250); }
  const btn2 = await A.pg.$eval('#btnStab', e => [e.disabled, e.textContent]); check(!btn2[0] && btn2[1].includes(Cc.name), '새 타깃 C 버튼: ' + btn2[1]);
  await hold(A, '#btnStab', 3600, async el => { await head(A, 0); await head(Cc, el > 1000 ? 180 : 0); });
  await sleep(1500); d = await db();
  check(d.rooms[code].asn.mem[cId] === ch[2], 'C가 돌아봐서 암살 실패 (C는 그대로)');
  // 3) 능력 상납 준비: A에게 능력 2개 (받은편지함)
  await dbset(`rooms/${code}/players/${aId}/augIn/x1`, { aug: 'heal', from: bId, why: 'tribute', readyAt: 0 });
  await dbset(`rooms/${code}/players/${aId}/augIn/x2`, { aug: 'booster', from: bId, why: 'tribute', readyAt: 0 });
  await sleep(2500); d = await db();
  check(!!(d.rooms[code].players[aId].augs || {}).heal && !!(d.rooms[code].players[aId].augs || {}).booster, 'A가 받은 능력 2개 저장');
  // 4) D(A 무리를 노림)가 우두머리 A를 암살 → A·B 통째로 D 무리
  for (const p of P) await head(p, 0);
  await mvTo(A.pg, off(-40, 0)); await mvTo(D.pg, off(-45, 0)); await sleep(3500);
  await hold(D, '#btnStab', 3600, async () => { for (const p of [A, D]) await head(p, 0); });
  await sleep(2000); d = await db(); s2 = d.rooms[code].asn;
  check(s2.mem[aId] === ch[3] && s2.mem[bId] === ch[3], '우두머리 A 암살 → A·B 통째로 D 무리');
  check(s2.chain.split(',').length === 2 && !!s2.duelAt, '무리 2개 → 최후의 결투');
  // A는 능력 2개 → 1개만 남기는 창 (20초 뒤 자동)
  const pick = await A.pg.$eval('#ov-pick', e => e.classList.contains('on') ? document.querySelector('#pickTitle').textContent : '');
  check(pick.includes('1개만'), 'A: 능력 1개만 남기기 창');
  await A.pg.evaluate(() => document.querySelector('#pickList [data-t]').click()); await sleep(2500);
  d = await db();
  const aAugs = Object.keys(d.rooms[code].players[aId].augs || {}), dAugs = Object.keys(d.rooms[code].players[dId].augs || {});
  check(aAugs.length === 1 && dAugs.length === 1, `상납: A 남은 능력 ${aAugs} / D 받은 능력 ${dAugs}`);
  const duelInfo = await D.pg.$eval('#g-info', e => e.textContent); check(duelInfo.includes('결투'), 'D 화살표: ' + duelInfo.slice(0, 30));
  // 단톡방: D 무리 메시지가 A에게 보이고 C에게는 안 보임
  await D.pg.evaluate(() => { document.querySelector('#btnChat').click(); document.querySelector('#chatIn').value = '모여'; document.querySelector('#btnChatSend').click(); });
  await sleep(1500);
  await A.pg.evaluate(() => document.querySelector('#btnChat').click()); await sleep(600);
  const aChat = await A.pg.$eval('#chatList', e => e.textContent); check(aChat.includes('모여'), 'A가 D 무리 단톡방 글을 봄');
  await Cc.pg.evaluate(() => document.querySelector('#btnChat').click()); await sleep(600);
  const cChat = await Cc.pg.$eval('#chatList', e => e.textContent); check(!cChat.includes('모여'), 'C는 다른 무리 글을 못 봄');
  for (const p of P) await p.pg.evaluate(() => document.querySelector('#btnChatClose').click());
  // 5) 하극상 (부하가 된 지 5분 뒤): B가 D 뒤에서. A가 D 15m 안이면 +2초
  await setOffset(startAt + HIDE + 130e3 + 420e3 - Date.now()); await sleep(2000);
  await mvTo(D.pg, off(0, 40)); await mvTo(B.pg, off(-5, 40)); await mvTo(A.pg, off(8, 40)); await sleep(3500);
  for (let k = 0; k < 3; k++) { for (const p of P) await head(p, 0); await sleep(250); }
  const rb = await B.pg.$eval('#btnRebel', e => [e.style.display, e.disabled, e.textContent]); log('B 하극상 버튼', JSON.stringify(rb));
  check(rb[0] === 'block' && !rb[1] && rb[2].includes('5초'), '하극상 버튼 (호위 1명 → 5초)');
  await hold(B, '#btnRebel', 5700, async () => { for (const p of [B, D]) await head(p, 0); });
  await sleep(2000); d = await db(); s2 = d.rooms[code].asn;
  check(s2.crews[ch[3]].boss === bId, '하극상 성공: B가 우두머리');
  const dRole = await D.pg.$eval('#g-role', e => e.textContent); check(dRole === '부하', 'D 화면: ' + dRole);
  // 6) 하극상 실패 → 몰수 + 팔아넘기기: A가 B 뒤에서 하다가 B가 돌아봄
  await dbset(`rooms/${code}/asn/since/${aId}`, 1); await sleep(1500);
  await mvTo(B.pg, off(0, -40)); await mvTo(A.pg, off(-5, -40)); await mvTo(D.pg, off(60, 60)); await sleep(3500);
  for (let k = 0; k < 3; k++) { for (const p of P) await head(p, 0); await sleep(250); }
  await hold(A, '#btnRebel', 3000, async el => { await head(A, 0); await head(B, el > 1500 ? 180 : 0); });
  await sleep(2500);
  const sellOn = await B.pg.$eval('#ov-asnSell', e => e.classList.contains('on')); check(sellOn, 'B에게 용서/팔아넘기기 창');
  d = await db(); check(Object.keys(d.rooms[code].players[aId].augs || {}).length === 0, 'A 능력 몰수됨');
  await B.pg.evaluate(() => document.querySelector('#btnAsnSell').click()); await sleep(2500);
  d = await db(); s2 = d.rooms[code].asn; check(s2.mem[aId] === ch[2], 'A가 C 무리로 팔려 감');
  // 7) 피의 시간: 시계를 피의 시간 안으로 → B가 C 무리 아무나도 (사슬상 이미 타깃이지만 확인용 표시만)
  const blood = startAt + HIDE + 900e3 + 5e3; await setOffset(blood - Date.now()); await sleep(2000);
  check(await B.pg.$eval('#asnFx', e => e.classList.contains('on')), '피의 시간 화면 효과');
  // 8) 승리: B가 C 무리 우두머리 C를 암살 → 무리 하나
  await mvTo(Cc.pg, off(-60, 0)); await mvTo(B.pg, off(-65, 0)); await mvTo(A.pg, off(40, -60)); await sleep(3500);
  for (let k = 0; k < 3; k++) { for (const p of [B, Cc]) await head(p, 0); await sleep(250); }
  log('B 버튼', JSON.stringify(await B.pg.$eval('#btnStab', e => [e.style.display, e.disabled, e.textContent])), 'B status', await B.pg.$eval('#g-status', e => e.textContent), '| warn', await B.pg.$eval('#g-warn', e => e.textContent.replace(/\n/g,' / ')));
  { const dd = await db(), r0 = dd.rooms[code]; log('asn', JSON.stringify(r0.asn.mem), 'chain', r0.asn.chain, 'C pos', r0.players[cId].lat, 'B pos', r0.players[bId].lat, 'C inv', JSON.stringify(r0.hits && r0.hits[cId])); }
  await hold(B, '#btnStab', 3600, async () => { for (const p of [B, Cc]) await head(p, 0); });
  await sleep(3000); d = await db();
  const res = d.rooms[code].result; check(res && res.winner === 'asn' && res.boss === bId, '승리: ' + JSON.stringify(res));
  const title = await B.pg.$eval('#r-title', e => e.textContent); check(title.includes(B.name), '결과 화면: ' + title);
  const list = await B.pg.$eval('#r-list', e => e.innerText); log(list.replace(/\n+/g, ' | ').slice(0, 300));
  await B.pg.screenshot({ path: __dirname + '/result.png' });
  console.log(fails ? `실패 ${fails}개` : '전부 통과');
  await br.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
