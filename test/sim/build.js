// 게임 파일 사본 만들기: CDN 주소 → 로컬, Firebase → 가짜 모듈
const fs = require('fs');
let h = fs.readFileSync(require('path').join(__dirname, '../../index.html'), 'utf8');
const R = (a, b) => { if (!h.includes(a)) throw new Error('missing ' + a); h = h.split(a).join(b); };
R('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', '/nm/leaflet/dist/leaflet.css');
R('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', '/nm/leaflet/dist/leaflet.js');
R('https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js', '/nm/jsqr/dist/jsQR.js');
R('https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js', '/nm/qrcode-generator/qrcode.js');
R('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js', '/fb-db.js');
R('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js', '/fb-misc.js');
R('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js', '/fb-misc.js');
R('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js', '/fb-misc.js');
h = h.replace(/<link[^>]+fonts\.(googleapis|gstatic)\.com[^>]*>/g, '');
h = h.replace("L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png'", "L.tileLayer('/tile-none/{z}/{x}/{y}.png'");
fs.writeFileSync(__dirname + '/game.html', h);
fs.writeFileSync(__dirname + '/fb-misc.js', `
export const initializeApp = () => ({});
export const initializeAppCheck = () => ({}); export class ReCaptchaEnterpriseProvider { constructor() {} }
const uid = 'u' + Math.random().toString(36).slice(2, 12) + 'xx'; let user = null; const cbs = [];
export const getAuth = () => ({});
export const onAuthStateChanged = (a, cb) => { cbs.push(cb); if (user) cb(user); return () => {}; };
export const signInAnonymously = async () => { user = { uid }; cbs.forEach(cb => cb(user)); return { user }; };
`);
console.log('built', h.length);
