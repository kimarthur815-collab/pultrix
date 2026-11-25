const puppeteer = require('puppeteer-core');
(async () => {
  const b = await puppeteer.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox', '--font-render-hinting=none'] });
  const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const times = process.argv.slice(2).map(Number);
  await p.goto('file://' + __dirname + '/mug.html');
  for (const t of times) { await p.evaluate(t => setT(t), t); await new Promise(r => setTimeout(r, t > 4.3 && t < 4.5 ? 450 : 120)); await p.screenshot({ path: `${__dirname}/s_${t}.png` }); }
  console.log('errors:', JSON.stringify(errs)); await b.close();
})();
