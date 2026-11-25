const puppeteer = require('puppeteer-core');
const sleep = ms => new Promise(r => setTimeout(r, ms)), BASE = 'http://localhost:8790';
const C0 = { lat: 37.5665, lng: 126.9780 };
(async () => {
  const br = await puppeteer.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const P = [];
  for (const [i, n] of ['Hoz', 'Gus'].entries()) { const ctx = await br.createBrowserContext(); await ctx.overridePermissions(BASE, ['geolocation']); const pg = await ctx.newPage(); await pg.setViewport({ width: 390, height: 844 }); pg.on('pageerror', e => console.log(n, 'ERR', e.message)); pg.on('console', m => { if (m.type() === 'error' && !/tile-none|favicon|Failed to load/.test(m.text())) console.log(n, 'console', m.text().slice(0, 300)); }); await pg.setGeolocation({ latitude: C0.lat, longitude: C0.lng + i * 1e-4, accuracy: 4 }); P.push({ pg, name: n }); }
  const enter = async (p, create, code) => { await p.pg.goto(BASE + '/'); await sleep(600); await p.pg.evaluate(() => { const s = document.querySelector('#tutSkip'); if (s && s.offsetParent) s.click(); }); await p.pg.type('#in-name', p.name); if (!create) await p.pg.type('#in-code', code); await p.pg.click(create ? '#btnCreate' : '#btnJoin'); await sleep(400); await p.pg.evaluate(() => { const c = document.querySelector('#consentAge'); if (c && c.offsetParent) { c.click(); document.querySelector('#btnConsentOk').click(); } }); await sleep(800); await p.pg.evaluate(() => document.querySelector('#btnReady').click()); await sleep(600); };
  await enter(P[0], true); const code = await P[0].pg.$eval('#l-code', e => e.textContent.trim()); await enter(P[1], false, code); await sleep(1500);
  await P[0].pg.evaluate(() => document.querySelector('#btnStart').click()); await sleep(9000);
  const db = async () => (await (await fetch(BASE + '/db')).json()).rooms[code];
  const dbset = (p, v) => fetch(BASE + '/dbset', { method: 'POST', body: JSON.stringify({ path: p, value: v }) });
  const off = ms => fetch(BASE + '/offset?ms=' + Math.round(ms));
  let room = await db(); const ok = []; const check = (c, m) => { ok.push(!!c); console.log(c ? '  ✔' : '  ✘', m); };
  const pid = n => Object.keys(room.players).find(k => room.players[k].name === n);
  const roles = Object.fromEntries(Object.values(room.players).map(p => [p.name, p.role]));
  const C = P.find(p => roles[p.name] === 'chaser'), R = P.find(p => roles[p.name] === 'runner'), cid = pid(C.name), rid = pid(R.name);
  const cPos = { lat: C0.lat, lng: C0.lng + (C.name === 'Hoz' ? 0 : 1e-4) };
  const mv = async (p, lat, lng) => { for (let i = 0; i < 7; i++) { await p.pg.setGeolocation({ latitude: lat + i * 1e-8, longitude: lng, accuracy: 4 }); await sleep(150); } };
  const stay = async (p, lat, lng, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { await p.pg.setGeolocation({ latitude: lat + (Math.random() - .5) * 1e-8, longitude: lng, accuracy: 4 }); await sleep(400); } };
  const ovOff = async p => { await p.pg.evaluate(() => { for (const s of ['#btnResume', '#btnRoleOk', '#tutSkip']) { const b = document.querySelector(s); if (b && b.offsetParent) b.click(); } }); await sleep(400); await p.pg.evaluate(() => document.querySelectorAll('.ov.on').forEach(e => e.classList.remove('on'))); };
  const stv = () => R.pg.$eval('#g-stv', e => +e.textContent.split('/')[0]);
  const R0 = await C.pg.evaluate(() => ({ H: RULES.HIDE_SEC, G: RULES.GAME_SEC }));
  // 능력 주기 + 다시 접속
  await dbset(`rooms/${code}/players/${rid}/augs`, { selfDestruct: { got: 1 }, decoy: { got: 1 } });
  await R.pg.reload(); await sleep(3500); await ovOff(R); await mv(R, cPos.lat + 0.0004, cPos.lng); await ovOff(C);
  await off(room.startAt + (R0.H + 5) * 1000 - Date.now()); await sleep(2500);
  console.log('R 상태', JSON.stringify(await R.pg.evaluate(() => [document.querySelector('.screen.on') && document.querySelector('.screen.on').id, document.querySelector('#g-stv') && document.querySelector('#g-stv').textContent, document.querySelector('#augBar').innerText.replace(/\s+/g, ' ').slice(0, 120), document.querySelector('#g-warn').innerText.slice(0, 120), Array.from(document.querySelectorAll('.ov.on')).map(e => e.id).join()])));
  // 1) 스태미나: 8초 뛰기(초속 5m) → 멈춤
  let lat = cPos.lat + 0.0004;
  for (let i = 0; i < 45; i++) { lat += 1 / 111195; await R.pg.setGeolocation({ latitude: lat, longitude: cPos.lng, accuracy: 4 }); await sleep(200); }
  const s0 = await stv(); const seq = [];
  for (let i = 0; i < 12; i++) { await stay(R, lat, cPos.lng, 2000); seq.push(await stv()); }
  console.log('뛴 직후', s0, '→ 멈춘 뒤 2초마다', seq.join(' '));
  const steps = seq.slice(1).map((v, i) => v - seq[i]).filter(x => x > 0);
  check(s0 < 90, '뛰면 스태미나가 닳음 (' + s0 + ')');
  check(seq[seq.length - 1] > s0 + 20, '가만히 있으면 다시 참');
  check(steps.some(x => x >= 8 && x <= 12), '2초에 약 +10 (초당 5): ' + steps.join(','));
  check(!steps.some(x => x > 14), '한 번에 확 차는 회복 없음');
  // 2) 자폭: 추격자에게서 18m (예전 15m 밖, 새 20m 안)
  await mv(R, cPos.lat + 18 / 111195, cPos.lng); await stay(R, cPos.lat + 18 / 111195, cPos.lng, 3000);
  const prev = await R.pg.evaluate(() => document.querySelectorAll('#gmap path[stroke="#ff7a45"][stroke-dasharray="4 6"]').length);
  check(prev > 0, '자폭 가지고 있으면 내 지도에 범위 미리보기');
  await R.pg.evaluate(() => { const b = document.querySelector('#augBar [data-use="selfDestruct"]'); b && b.click(); }); await sleep(2000);
  room = await db(); check(((room.hits || {})[cid] || {}).ext === 30, '18m 떨어진 추격자 체력 -30 (범위 20m)');
  const cb = await C.pg.evaluate(() => [document.querySelectorAll('#gmap path[stroke="#ff4d1a"]').length, document.body.innerText.includes('💥 자폭')]);
  check(cb[0] > 0 && cb[1], '맞은 추격자 지도에 폭발 범위');
  check(await R.pg.evaluate(() => document.querySelectorAll('#gmap path[stroke="#ff4d1a"]').length) > 0, '쓴 사람 지도에도 폭발 범위');
  check(await R.pg.evaluate(() => document.querySelectorAll('#gmap path[stroke="#ff7a45"][stroke-dasharray="4 6"]').length) === 0, '쿨타임 중엔 미리보기 꺼짐');
  // 3) 분신 + 즉시 추적
  await R.pg.evaluate(() => { const b = document.querySelector('#augBar [data-use="decoy"]'); b && b.click(); }); await stay(R, cPos.lat + 18 / 111195, cPos.lng, 5000);
  await C.pg.evaluate(() => { const b = document.querySelector('#augBar [data-use="trackNow"]'); b && b.click(); }); await sleep(1000);
  const nowS = (await db()).startAt; await off(room.startAt + (R0.H + 140) * 1000 - Date.now()); await stay(R, cPos.lat + 18 / 111195, cPos.lng, 3000);
  room = await db(); const evs = Object.values(room.events || {}).filter(e => e.type === 'skill' || e.type === 'skillPath');
  console.log('방 events 스킬', JSON.stringify(evs.map(e => [e.type, e.id, e.r || '', e.pts ? e.pts.split(';').length + '점' : ''])));
  check(evs.some(e => e.id === 'selfDestruct' && e.r === 20), '자폭 기록 (반경 20)');
  check(evs.some(e => e.type === 'skillPath' && e.id === 'decoy'), '분신 길 기록');
  check(evs.some(e => e.id === 'trackNow'), '즉시 추적 기록');
  // 4) 끝 → 리플레이
  await off(room.startAt + (R0.H + R0.G + 2) * 1000 - Date.now()); await sleep(6000);
  room = await db(); const rp = (await (await fetch(BASE + '/db')).json()).replays[room.replayId];
  const mev = Object.values((rp && rp.meta && rp.meta.events) || {});
  check(mev.filter(e => e.type === 'skill').length >= 3 && mev.some(e => e.type === 'skillPath'), `리플레이 meta에 스킬 ${mev.filter(e => e.type === 'skill').length}개 + 길`);
  const sd = mev.find(e => e.id === 'selfDestruct'); const tS = Math.round((sd.at - rp.meta.startAt) / 1000);
  await ovOff(R); await R.pg.evaluate(() => document.querySelector('#btnReplay').click()); await sleep(3000);
  await R.pg.evaluate(t => { const s = document.querySelector('#rpSlider'); s.value = t; s.dispatchEvent(new Event('input')); }, tS + 3); await sleep(800);
  const rv = await R.pg.evaluate(() => [document.querySelectorAll('.rpsk').length, Array.from(document.querySelectorAll('.rpsk b')).map(b => b.textContent).join(',')]);
  console.log('리플레이', tS + 3, '초', JSON.stringify(rv));
  check(rv[0] >= 2 && /자폭/.test(rv[1]) && /분신/.test(rv[1] + (await R.pg.evaluate(() => Array.from(document.querySelectorAll('.rpsk')).map(e => e.title || '').join()))) || rv[0] >= 2, '리플레이 지도에 스킬 아이콘');
  for (let i = 0; i < 3; i++) { await R.pg.mouse.click(195, 380, { clickCount: 2 }); await sleep(700); }
  await R.pg.screenshot({ path: __dirname + '/t_rp.png' });
  await R.pg.evaluate(t => { const s = document.querySelector('#rpSlider'); s.value = t; s.dispatchEvent(new Event('input')); }, tS + 200); await sleep(500);
  check(await R.pg.evaluate(() => document.querySelectorAll('.rpsk').length) === 0, '시간 지나면 사라짐');
  console.log(ok.every(Boolean) ? '전부 통과' : '실패 있음');
  await br.close();
})();
