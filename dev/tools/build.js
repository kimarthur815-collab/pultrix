const fs = require('fs');
const h = fs.readFileSync(require('path').join(__dirname, '../../index.html'), 'utf8');
const cut = (a, b) => { const i = h.indexOf(a), j = h.indexOf(b, i); if (i < 0 || j < 0) throw new Error('marker ' + a); return h.slice(i, j); };
const css = cut('<style>', '</style>') + '</style>';
const js = cut('// 무궁화 노래 박자', 'const SFX = {') + cut('// ---------- 무궁화: 부엉이 술래', 'setInterval(overlayLoop, 200);');
const page = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">${css}</head>
<body style="background:#1a2028;margin:0;height:100vh">
<div id="mugung" class="on"><canvas id="mugOwl"></canvas><div id="mugTxt"></div></div><div id="mugFx"></div>
<script>
const $ = s => document.querySelector(s); let FAKE = 0; const now = () => FAKE;
const Logic = { AUGS: { mugung: { warn: 4.3 } } };
const S = { room: { mugung: { by: 'c', from: 4300, to: 14300 }, players: { me: { role: location.hash === '#c' ? 'chaser' : 'runner' } } }, pid: 'me', mugKey: null };
${js}
window.setT = rel => { FAKE = rel * 1000; };
requestAnimationFrame(mugAnim);
</script></body></html>`;
fs.writeFileSync(__dirname + '/mug.html', page);
console.log('built', page.length);
