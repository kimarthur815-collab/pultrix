// 시뮬레이터 서버: 게임 파일(가짜 Firebase로 바꾼 사본)을 내주고, 여러 탭이 같은 데이터베이스를 쓰게 함
// 사용: node server.js  → http://localhost:8790/  (POST /offset?ms=… 로 모두의 시계를 앞당김, GET /db 로 전체 데이터)
const http = require('http'), fs = require('fs'), path = require('path'), { WebSocketServer } = require('ws');
const ROOT = __dirname, GAME = require('path').join(__dirname, '../..');
let tree = {}, offset = 0;
const clients = new Set();
const parts = p => String(p || '').split('/').filter(Boolean);
const getAt = (t, p) => parts(p).reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), t);
const resolveTs = v => (v && typeof v === 'object' ? (v['.sv'] === 'timestamp' ? Date.now() + offset : Object.fromEntries(Object.entries(v).map(([k, x]) => [k, resolveTs(x)]))) : v);
function prune(v) { // null 지우기, 빈 객체 없애기 (Firebase처럼)
  if (v === null || v === undefined) return undefined;
  if (Array.isArray(v)) { const a = v.map(prune); return a.some(x => x !== undefined) ? Object.fromEntries(a.map((x, i) => [i, x]).filter(([, x]) => x !== undefined)) : undefined; }
  if (typeof v === 'object') { const o = {}; for (const [k, x] of Object.entries(v)) { const y = prune(x); if (y !== undefined) o[k] = y; } return Object.keys(o).length ? o : undefined; }
  return v;
}
function setAt(p, v) {
  const ks = parts(p); v = prune(resolveTs(v));
  if (!ks.length) { tree = v || {}; return; }
  let o = tree; for (const k of ks.slice(0, -1)) { if (!o[k] || typeof o[k] !== 'object') o[k] = {}; o = o[k]; }
  if (v === undefined) delete o[ks[ks.length - 1]]; else o[ks[ks.length - 1]] = v;
  tree = prune(tree) || {};
}
const bcast = () => { const m = JSON.stringify({ op: 'tree', tree, offset }); for (const c of clients) c.send(m); };
const srv = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/offset') { offset = +u.searchParams.get('ms') || 0; bcast(); return res.end('ok ' + offset); }
  if (u.pathname === '/db') { res.setHeader('content-type', 'application/json'); return res.end(JSON.stringify(tree)); }
  if (u.pathname === '/dbset') { let b = ''; req.on('data', d => { b += d; }); req.on('end', () => { const j = JSON.parse(b); setAt(j.path, j.value); bcast(); res.end('ok'); }); return; }
  let f = u.pathname === '/' ? '/game.html' : u.pathname;
  const file = f.startsWith('/nm/') ? path.join(ROOT, 'node_modules', f.slice(4)) : f.endsWith('.mp3') || f.endsWith('.png') || f.endsWith('.json') ? path.join(GAME, f) : path.join(ROOT, f);
  fs.readFile(file, (e, d) => {
    if (e) { res.statusCode = 404; return res.end('nf'); }
    res.setHeader('content-type', { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.mp3': 'audio/mpeg', '.png': 'image/png', '.json': 'application/json' }[path.extname(file)] || 'application/octet-stream');
    res.end(d);
  });
});
const wss = new WebSocketServer({ server: srv });
wss.on('connection', ws => {
  clients.add(ws); ws.send(JSON.stringify({ op: 'tree', tree, offset }));
  ws.on('close', () => clients.delete(ws));
  ws.on('message', raw => {
    const m = JSON.parse(raw);
    if (m.op === 'set') { setAt(m.path, m.value); bcast(); }
    else if (m.op === 'update') { for (const [k, v] of Object.entries(m.value)) setAt(m.path + '/' + k, v); bcast(); }
    else if (m.op === 'cas') { // 트랜잭션: 바탕값이 그대로면 적용
      const cur = getAt(tree, m.path), same = JSON.stringify(cur === undefined ? null : cur) === m.base;
      if (same) { setAt(m.path, m.value); bcast(); }
      ws.send(JSON.stringify({ op: 'casr', id: m.id, ok: same, cur: getAt(tree, m.path) ?? null }));
    }
  });
});
srv.listen(8790, () => console.log('sim on 8790'));
