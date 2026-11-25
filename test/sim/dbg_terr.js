const puppeteer = require('puppeteer-core');
const sleep = ms => new Promise(r => setTimeout(r, ms)), BASE = 'http://localhost:8790';
const C0 = { lat: 37.5665, lng: 126.9780 };
(async () => {
  const br = await puppeteer.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const P = [];
  for (const [i, n] of ['Hoz', 'Gus'].entries()) { const ctx = await br.createBrowserContext(); await ctx.overridePermissions(BASE, ['geolocation']); const pg = await ctx.newPage(); await pg.setViewport({ width: 390, height: 844 }); pg.on('pageerror', e => console.log(n, 'ERR', e.message)); pg.on('console', m => { if (m.type() === 'error' && !/tile-none|favicon|Failed to load/.test(m.text())) console.log(n, 'console', m.text().slice(0, 300)); }); await pg.setGeolocation({ latitude: C0.lat, longitude: C0.lng + i * 1e-4, accuracy: 4 }); P.push({ pg, name: n }); }
  const enter = async (p, create, code) => { await p.pg.goto(BASE + '/'); await sleep(600); await p.pg.evaluate(() => { const s = document.querySelector('#tutSkip'); if (s && s.offsetParent) s.click(); }); await p.pg.type('#in-name', p.name); if (!create) await p.pg.type('#in-code', code); await p.pg.click(create ? '#btnCreate' : '#btnJoin'); await sleep(400); await p.pg.evaluate(() => { const c = document.querySelector('#consentAge'); if (c && c.offsetParent) { c.click(); document.querySelector('#btnConsentOk').click(); } }); await sleep(800); await p.pg.evaluate(() => document.querySelector('#btnReady').click()); await sleep(600); };
  await enter(P[0], true); const code = await P[0].pg.$eval('#l-code', e => e.textContent.trim()); await enter(P[1], false, code); await sleep(1500);
  await P[0].pg.evaluate(() => document.querySelector('#l-mode [data-mode=terr]').click()); await sleep(600);
  await P[0].pg.evaluate(() => document.querySelector('#btnStart').click()); await sleep(9000);
  const room = (await (await fetch(BASE + '/db')).json()).rooms[code];
  const st = async () => P[0].pg.evaluate(() => [document.querySelector('#g-phase').textContent, (document.querySelector('#g-time') || {}).textContent, document.querySelector('#g-info').textContent]);
  console.log('start +9s', JSON.stringify(await st()));
  await fetch(BASE + '/offset?ms=' + Math.round(room.startAt + 200e3 - Date.now())); await sleep(3000);
  console.log('+200s', JSON.stringify(await st()));
  await P[0].pg.evaluate(() => document.querySelectorAll('.ov.on').forEach(e => e.classList.remove('on'))); await sleep(800); await P[0].pg.screenshot({ path: __dirname + '/t_game.png' });
  await P[1].pg.reload(); await sleep(4000);
  await P[1].pg.evaluate(() => { for (const s of ['#btnRoleOk', '#tutSkip']) { const b = document.querySelector(s); if (b && b.offsetParent) b.click(); } });
  await sleep(2000);
  console.log('after reload host', JSON.stringify(await st()), 'guest', JSON.stringify(await P[1].pg.evaluate(() => [document.querySelector('#g-phase').textContent, (document.querySelector('#g-time') || {}).textContent])));
  const rr = (await (await fetch(BASE + '/db')).json()).rooms[code]; console.log('startAt same?', rr.startAt === room.startAt, 'timeShift', rr.timeShift, 'status', rr.status, 'mode', rr.settings.mode);
  await fetch(BASE + '/offset?ms=' + Math.round(room.startAt + 1202e3 - Date.now())); await sleep(4000);
  console.log('end +2s', JSON.stringify(await st()));
  const r2 = (await (await fetch(BASE + '/db')).json()).rooms[code];
  console.log('result', JSON.stringify(r2.result), 'status', r2.status, 'settings.game', JSON.stringify(r2.settings.game || null));
  await br.close();
})();
