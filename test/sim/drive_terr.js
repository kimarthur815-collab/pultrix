// 4명이 땅따먹기 한 판: 칠하기 → 빼앗기 → 같은 칸 잠금 → 적진에서 잡기 → 우리 칸 복귀 → 능력 → 황금 칸·막판 → 승리
const puppeteer = require('puppeteer-core');
const { Logic: L } = require('../logic/load.js');
L.applySettings({ HIDE_SEC: 0, GAME_SEC: 1200 }); // 땅따먹기 규칙 (숨는 시간 0, 20분)
const sleep = ms => new Promise(r => setTimeout(r, ms));
const BASE = 'http://localhost:8790';
const C0 = { lat: 37.5665, lng: 126.9780 };
const geo = p => ({ latitude: p.lat, longitude: p.lng, accuracy: 4 });
const db = async () => (await fetch(BASE + '/db')).json();
const dbset = (path, value) => fetch(BASE + '/dbset', { method: 'POST', body: JSON.stringify({ path, value }) });
const clk = async (tag, P) => { const o = []; for (const p of P) o.push(p.name + ' ' + await p.pg.evaluate(() => [document.querySelector('#g-phase').textContent, document.querySelector('#g-time').textContent, RULES.GAME_SEC, RULES.HIDE_SEC, document.querySelector('.screen.on') && document.querySelector('.screen.on').id].join('/'))); console.log('⏱', tag, o.join(' · ')); };
const setOffset = ms => fetch(BASE + '/offset?ms=' + Math.round(ms));
const log = (...a) => console.log('•', ...a);
let fails = 0; const check = (ok, what) => { console.log(ok ? '  ✔' : '  ✘', what); if (!ok) fails++; };
const mvTo = async (pg, pos) => { for (let i = 0; i < 7; i++) { await pg.setGeolocation({ ...geo(pos), latitude: pos.lat + i * 1e-8 }); await sleep(150); } };
const stay = async (pgs, pos, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { for (const [pg, p] of pgs) await pg.setGeolocation({ ...geo(p), latitude: p.lat + (Math.random() - .5) * 1e-8 }); await sleep(400); } };
(async () => {
  const br = await puppeteer.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const names = ['Ann', 'Bob', 'Cid', 'Dan'], P = [];
  for (let i = 0; i < 4; i++) {
    const ctx = await br.createBrowserContext(); await ctx.overridePermissions(BASE, ['geolocation']);
    const pg = await ctx.newPage(); await pg.setViewport({ width: 390, height: 844 }); const nm = names[i]; pg.on('pageerror', e => console.log('!! 오류', nm, String(e.message).slice(0, 200), (e.stack || '').split('\n').slice(1, 3).join(' ').slice(0, 200)));
    pg.on('pageerror', e => console.log(`  [${names[i]} 오류]`, e.message));
    pg.on('console', m => { if (m.type() === 'error' && !/tile-none|favicon|Failed to load resource/.test(m.text())) console.log(`  [${names[i]} console]`, m.text().slice(0, 200)); });
    await pg.setGeolocation(geo({ lat: C0.lat, lng: C0.lng + i * 0.0001 }));
    P.push({ pg, name: names[i] });
  }
  const H = P[0].pg;
  const enter = async (p, create, code) => {
    await p.pg.goto(BASE + '/'); await sleep(600);
    await p.pg.evaluate(() => { const s = document.querySelector('#tutSkip'); if (s && s.offsetParent) s.click(); });
    await p.pg.type('#in-name', p.name); if (!create) await p.pg.type('#in-code', code);
    await p.pg.click(create ? '#btnCreate' : '#btnJoin'); await sleep(400);
    await p.pg.evaluate(() => { const c = document.querySelector('#consentAge'); if (c && c.offsetParent) { c.click(); document.querySelector('#btnConsentOk').click(); } });
    await sleep(800); await p.pg.evaluate(() => document.querySelector('#btnReady').click()); await sleep(600);
  };
  await enter(P[0], true);
  const code = await H.$eval('#l-code', e => e.textContent.trim()); log('방 코드', code);
  for (const p of P.slice(1)) await enter(p, false, code);
  await sleep(1500);
  await H.evaluate(() => document.querySelector('#l-mode [data-mode=terr]').click()); await sleep(800);
  check((await H.$eval('#l-modeHint', e => e.textContent)).includes('칠'), '로비 설명');
  check(await H.$eval('#l-chLabel', e => e.parentElement.style.display === 'none'), '로비: 추격자 수 칸 숨김');
  await H.evaluate(() => document.querySelector('#btnStart').click()); await sleep(2500);
  let d = await db(), room = d.rooms[code];
  const area = room.settings.area, g = L.terrGrid(area), terr = room.terr;
  const team = id => room.players[id].role, pidOf = n => Object.entries(room.players).find(([, p]) => p.name === n)[0];
  const reds = P.filter(p => team(pidOf(p.name)) === 'tR'), blues = P.filter(p => team(pidOf(p.name)) === 'tB');
  check(reds.length === 2 && blues.length === 2, `팀 반반: 빨강 ${reds.map(p => p.name)} / 파랑 ${blues.map(p => p.name)}`);
  check(!!terr && terr.cells[terr.base.tR].t === 'tR' && terr.cells[terr.base.tB].t === 'tB', `기지 ${terr.base.tR} / ${terr.base.tB}, 칸 ${g.keys.length}개`);
  const reveal = await reds[0].pg.$eval('#roleMsg', e => e.textContent); check(reveal.includes('빨강팀'), '역할 공개: ' + reveal);
  for (const p of P) await p.pg.evaluate(() => { for (const s of ['#btnRoleOk', '#tutSkip']) { const b = document.querySelector(s); if (b && b.offsetParent) b.click(); } });
  await sleep(600); for (const p of P) await p.pg.evaluate(() => { const b = document.querySelector('#tutSkip'); if (b && b.offsetParent) b.click(); });
  // 기지 보호 3분을 넘긴 시점으로
  const startAt = room.startAt; await setOffset(startAt + 200e3 - Date.now()); await sleep(2500);
  const R1 = reds[0], R2 = reds[1], B1 = blues[0], B2 = blues[1], r1 = pidOf(R1.name), b1 = pidOf(B1.name);
  const roleTxt = await R1.pg.$eval('#g-role', e => e.textContent); check(roleTxt === '빨강팀', 'R1 역할 표시: ' + roleTxt);
  check(await R1.pg.$eval('#terrBar', e => e.classList.contains('on')), '점수판 표시');
  const ctr = k => L.terrCellCenter(g, k);
  const blankNear = (q0, r0) => g.keys.filter(k => !terr.cells[k]).sort((a, b) => { const [qa, ra] = L.terrQR(a), [qb, rb] = L.terrQR(b); return Math.hypot(qa - q0, ra - r0) - Math.hypot(qb - q0, rb - r0); });
  const X = blankNear(0, 0)[0], Y = blankNear(0, 3).find(k => k !== X && !L.terrNb(X).includes(k)), Z = blankNear(0, -3).find(k => ![X, Y].includes(k) && !L.terrNb(X).includes(k));
  log('칸 X', X, 'Y', Y, 'Z', Z);
  // 모두 흩어 두기
  await mvTo(R2.pg, ctr(terr.base.tR)); await mvTo(B2.pg, ctr(terr.base.tB)); await mvTo(B1.pg, ctr(Z));
  // 1) 빈칸 칠하기
  await mvTo(R1.pg, ctr(X)); await stay([[R1.pg, ctr(X)]], 0, 9000);
  d = await db(); room = d.rooms[code];
  const pr = await R1.pg.$eval('#tbProg', e => e.textContent); log('R1 진행줄:', pr);
  check(room.terr.cells[X] && room.terr.cells[X].t === 'tR', 'R1이 빈칸 X를 빨강으로');
  check(Object.values(room.terrLog || {}).some(e => e.k === X && e.t === 'tR'), '칠한 기록 남음');
  const sc1 = await R1.pg.$eval('#tbUs', e => e.textContent); check(+sc1 >= 2, '점수판 우리 점수 ' + sc1);
  // 2) 같은 칸에 두 팀 → 못 칠함: B1이 X로 (R1도 X에 있음)
  await mvTo(B1.pg, ctr(X)); await stay([[B1.pg, ctr(X)], [R1.pg, ctr(X)]], 0, 8000);
  d = await db(); room = d.rooms[code];
  const bWhy = await B1.pg.$eval('#tbProg', e => e.textContent); log('B1 진행줄:', bWhy);
  check(room.terr.cells[X].t === 'tR', '같은 칸에 두 팀 → B1이 못 빼앗음');
  // 3) 적진에서 잡기: B1이 빨강 칸 X 위에 있음 → R1이 잡기 버튼
  await stay([[B1.pg, ctr(X)], [R1.pg, ctr(X)]], 0, 1500);
  const tb = await R1.pg.$eval('#btnTag', e => [e.style.display, e.disabled, e.textContent]); log('R1 잡기 버튼', JSON.stringify(tb));
  check(tb[0] === 'block' && !tb[1] && tb[2].includes(B1.name), '우리 땅 위의 B1 → 잡기 버튼 켜짐');
  const bTag = await B1.pg.$eval('#btnTag', e => e.disabled); check(bTag, 'B1(적진)은 R1을 못 잡음');
  const seen = await R2.pg.$eval('#gmap', e => e.innerText).catch(() => ''); check(seen.includes(B1.name), 'R2 지도에 침입자 B1 보임');
  let warned = false;
  await R1.pg.evaluate(() => { const b = document.querySelector('#btnTag'); b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 9, isPrimary: true })); });
  for (let i = 0; i < 10; i++) { await sleep(250); if (await B1.pg.$eval('#asnWarn', e => e.classList.contains('on'))) warned = true; }
  await R1.pg.evaluate(() => document.querySelector('#btnTag').dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 9 })));
  await sleep(1500); d = await db(); room = d.rooms[code];
  check(warned, 'B1 화면에 "잡히는 중!" 경고');
  check((room.players[b1].terrStun || 0) > 0 && room.players[b1].terrHome === 1, 'B1 기절 + 우리 칸 복귀 필요');
  // 4) 기절 끝 → B1이 파랑 기지에서 3초 → 다시 칠하기 가능 + 무적
  await mvTo(B1.pg, ctr(terr.base.tB)); await setOffset(room.players[b1].terrStun + 1500 - Date.now()); await stay([[B1.pg, ctr(terr.base.tB)]], 0, 7000);
  d = await db(); room = d.rooms[code];
  check(!room.players[b1].terrHome && (room.players[b1].terrInv || 0) > 0, 'B1 우리 칸 3초 → 복귀, 1분 무적');
  await clk('기절 뒤', P);
  // 5) 빼앗기: R1이 X를 떠난 뒤 B1이 X에서 5초
  await mvTo(R1.pg, ctr(Y)); await mvTo(B1.pg, ctr(X)); await stay([[B1.pg, ctr(X)], [R1.pg, ctr(Y)]], 0, 3000);
  log('빼앗기 중 B1', await B1.pg.$eval('#tbProg', e => e.textContent), '| R1', await R1.pg.$eval('#tbProg', e => e.textContent), '| DB R1 위치', JSON.stringify((await db()).rooms[code].players[pidOf(R1.name)].pos || null).slice(0, 90));
  for (let i = 0; i < 9; i++) { await stay([[B1.pg, ctr(X)], [R1.pg, ctr(Y)]], 0, 4000); log('  B1 ' + (i * 4 + 7) + 's', await B1.pg.$eval('#tbProg', e => e.textContent), '| 칸', await B1.pg.evaluate(() => document.querySelector('#tbUs') && document.querySelector('#tbUs').textContent)); }
  d = await db(); room = d.rooms[code];
  check(room.terr.cells[X].t === 'tB', 'B1이 빨강 칸 X를 빼앗음');
  check(Object.values(room.terrLog || {}).some(e => e.k === X && e.t === 'tB' && e.f === 'tR'), '빼앗은 기록 (빨강 → 파랑)');
  // 6) 능력: R2에게 페인트 폭탄·방어막 주고 다시 접속
  const r2 = pidOf(R2.name);
  await dbset(`rooms/${code}/players/${r2}/augs`, { paintBomb: { got: 1 }, cellShield: { got: 1 } });
  await mvTo(R2.pg, ctr(Z)); await R2.pg.reload(); await sleep(3500); await R2.pg.evaluate(() => { const b = document.querySelector('#btnResume'); if (b && b.offsetParent) b.click(); }); await sleep(500);
  await R2.pg.evaluate(() => { for (const s of ['#btnRoleOk', '#tutSkip']) { const b = document.querySelector(s); if (b && b.offsetParent) b.click(); } });
  await stay([[R2.pg, ctr(Z)]], 0, 3000);
  log('R2 화면', await R2.pg.evaluate(() => [document.querySelector('.screen.on, [id^=s-].on') ? document.querySelector('.screen.on, [id^=s-].on').id : '?', document.querySelector('#augBar').innerHTML.length, !!document.querySelector('#augBar [data-use="paintBomb"]'), document.querySelector('#g-role') && document.querySelector('#g-role').textContent]));
  const before = Object.values((await db()).rooms[code].terr.cells).filter(c => c.t === 'tR').length;
  await R2.pg.evaluate(() => { const b = document.querySelector('#augBar [data-use="paintBomb"]'); b && b.click(); }); await sleep(400);
  log('R2 토스트', await R2.pg.evaluate(() => Array.from(document.querySelectorAll('.toast, #toast, #toasts *')).map(e => e.textContent).join(' | ').slice(0, 300)), '| R2 경고', await R2.pg.$eval('#g-warn', e => e.textContent.slice(0, 200)), '| 칸', await R2.pg.$eval('#tbProg', e => e.textContent));
  await sleep(1600);
  d = await db(); room = d.rooms[code];
  const after = Object.values(room.terr.cells).filter(c => c.t === 'tR').length;
  check(after - before >= 5, `페인트 폭탄: 빨강 칸 ${before} → ${after}`);
  await R2.pg.evaluate(() => { const b = document.querySelector('#augBar [data-use="cellShield"]'); b && b.click(); }); await sleep(2000);
  d = await db(); room = d.rooms[code];
  check(L.terrNb(Z).concat(Z).some(k => room.terr.cells[k] && room.terr.cells[k].sh > 0), '방어막: 우리 칸에 방어막');
  await clk('능력 뒤', P);
  // 7) 황금 칸 (5분 지남) + 마지막 3분
  const s0 = startAt + 0; // 숨는 시간 0
  await setOffset(s0 + 1200e3 - 120e3 - Date.now()); await sleep(3000);
  const gold = L.terrGold(g, room.terr, code, s0 + 1200e3 - 120e3, startAt);
  check(gold.length === 9, '황금 칸 ' + gold.length + '개 (5분마다 3개)');
  const W = blankNear(-3, 2).find(k => !room.terr.cells[k]);
  await mvTo(B2.pg, ctr(W)); const t0 = Date.now(); await stay([[B2.pg, ctr(W)]], 0, 6500);
  d = await db(); room = d.rooms[code];
  const lw = Object.values(room.terrLog).find(e => e.k === W);
  check(!!lw, `마지막 3분: B2가 빈칸 W를 칠함`);
  await clk('막판', P);
  // 8) 끝 → 결과
  await setOffset(s0 + 1200e3 + 2e3 - Date.now()); await sleep(6000);
  await clk('끝', P);
  { const rr = (await db()).rooms[code]; log('끝 DB', 'status', rr.status, 'startAt 같음', rr.startAt === startAt, 'timeShift', rr.timeShift, 'result', JSON.stringify(rr.result || null).slice(0, 120)); }
  log('끝난 뒤 R1', await R1.pg.evaluate(() => [document.querySelector('#g-time') && document.querySelector('#g-time').textContent, document.querySelector('#r-title') && document.querySelector('#r-title').textContent]));
  d = await db(); room = d.rooms[code];
  const sc = L.terrScore(room.terr, L.terrGold(g, room.terr, code, s0 + 1200e3, startAt));
  check(room.result && ['tR', 'tB', 'draw'].includes(room.result.winner), `결과: ${JSON.stringify(room.result && { w: room.result.winner, r: room.result.reason })} / 계산 ${sc.tR}:${sc.tB}`);
  const title = await R1.pg.$eval('#r-title', e => e.textContent); check(/승리|무승부/.test(title), '결과 화면: ' + title);
  check(await R1.pg.$eval('#terrLapse', e => e.width > 0), '타임랩스 캔버스');
  check(!(await R1.pg.$eval('#terrBar', e => e.classList.contains('on'))), '결과 화면엔 점수판 숨김');
  await R1.pg.evaluate(() => document.querySelectorAll('.ov.on').forEach(e => e.classList.remove('on')));
  await sleep(11000); await R1.pg.screenshot({ path: __dirname + '/t_result.png' });
  console.log(fails ? `실패 ${fails}개` : '전부 통과');
  await br.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
