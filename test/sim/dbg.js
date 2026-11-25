const puppeteer = require('puppeteer-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const br = await puppeteer.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await br.createBrowserContext(); await ctx.overridePermissions('http://localhost:8790', ['geolocation']);
  const pg = await ctx.newPage();
  await pg.setGeolocation({ latitude: 37.5, longitude: 127, accuracy: 4 });
  await pg.goto('http://localhost:8790/');
  await pg.evaluate(() => { window._f = []; navigator.geolocation.watchPosition(p => window._f.push([p.coords.latitude, p.coords.accuracy]), e => window._f.push('err ' + e.message), { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }); });
  await sleep(1500);
  await pg.setGeolocation({ latitude: 37.6, longitude: 127, accuracy: 4 }); await sleep(1500);
  await pg.setGeolocation({ latitude: 37.7, longitude: 127, accuracy: 4 }); await sleep(1500);
  console.log(JSON.stringify(await pg.evaluate(() => window._f)));
  await br.close();
})();
