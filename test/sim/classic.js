// 회귀: 기본 모드 2명 시작 → 추격 단계에서 추격자 화살표·도망자 QR 버튼, 오류 없음
const puppeteer = require('puppeteer-core');
const sleep = ms => new Promise(r => setTimeout(r, ms)), BASE = 'http://localhost:8790';
const C0 = { lat: 37.5665, lng: 126.9780 }, off = (dN, dE = 0) => ({ latitude: C0.lat + dN / 111195, longitude: C0.lng + dE / 88000, accuracy: 4 });
(async () => {
  const br = await puppeteer.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const P = [], errs = [];
  for (const [i, n] of ['Hoz', 'Gus'].entries()) { const ctx = await br.createBrowserContext(); await ctx.overridePermissions(BASE, ['geolocation']); const pg = await ctx.newPage(); await pg.setViewport({ width: 390, height: 844 }); pg.on('pageerror', e => errs.push(n + ': ' + e.message)); await pg.setGeolocation(off(0, i * 30)); P.push({ pg, name: n }); }
  const enter = async (p, create, code) => { await p.pg.goto(BASE + '/'); await sleep(600); await p.pg.evaluate(() => { const s = document.querySelector('#tutSkip'); if (s && s.offsetParent) s.click(); }); await p.pg.type('#in-name', p.name); if (!create) await p.pg.type('#in-code', code); await p.pg.click(create ? '#btnCreate' : '#btnJoin'); await sleep(400); await p.pg.evaluate(() => { const c = document.querySelector('#consentAge'); if (c && c.offsetParent) { c.click(); document.querySelector('#btnConsentOk').click(); } }); await sleep(800); await p.pg.evaluate(() => document.querySelector('#btnReady').click()); await sleep(600); };
  await enter(P[0], true); const code = await P[0].pg.$eval('#l-code', e => e.textContent.trim()); await enter(P[1], false, code); await sleep(1500);
  await P[0].pg.evaluate(() => document.querySelector('#l-mode [data-mode=classic]').click()); await sleep(600);
  await P[0].pg.evaluate(() => document.querySelector('#btnStart').click()); await sleep(2500);
  const room = (await (await fetch(BASE + '/db')).json()).rooms[code];
  await fetch(BASE + '/offset?ms=' + Math.round(room.startAt + 300e3 + 130e3 - Date.now())); await sleep(3500);
  for (const p of P) await p.pg.evaluate(() => { for (const s of ['#btnRoleOk', '#tutSkip']) { const b = document.querySelector(s); if (b && b.offsetParent) b.click(); } });
  await sleep(1500);
  for (const p of P) {
    const r = await p.pg.evaluate(() => ({ role: document.querySelector('#g-role').textContent, scan: document.querySelector('#btnScan').style.display, qr: document.querySelector('#btnShowQR').style.display, stab: document.querySelector('#btnStab').style.display, info: document.querySelector('#g-info').textContent, chat: document.querySelector('#btnChat').style.display }));
    console.log(p.name, JSON.stringify(r));
  }
  await P[0].pg.screenshot({ path: __dirname + '/s_classic.png' });
  console.log('errors:', JSON.stringify(errs)); await br.close();
})();
