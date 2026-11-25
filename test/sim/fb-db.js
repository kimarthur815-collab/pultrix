// 가짜 firebase-database (시뮬레이터용): 서버의 전체 데이터를 받아 두고, 바뀔 때마다 구독자에게 알림
const ws = new WebSocket('ws://' + location.host);
let tree = {}, offset = 0, ready = false, seq = 0;
const readyQ = [], casWait = new Map(), vals = new Set(), kids = new Set();
const parts = p => String(p || '').split('/').filter(Boolean);
const getAt = p => parts(p).reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), tree);
const clone = v => (v === undefined ? null : JSON.parse(JSON.stringify(v)));
const snap = (v, key) => ({ val: () => clone(v), exists: () => v !== undefined && v !== null, key });
function notify() {
  for (const l of vals) {
    const v = l.path === '.info/serverTimeOffset' ? offset : getAt(l.path), j = JSON.stringify(v === undefined ? null : v);
    if (j !== l.last) { l.last = j; try { l.cb(snap(v, parts(l.path).pop())); } catch (e) { console.error(e); } }
  }
  for (const l of kids) {
    const o = getAt(l.path) || {}, keys = Object.keys(o).sort();
    const fresh = keys.filter(k => !l.seen.has(k)), first = !l.started; l.started = true;
    const fire = first && l.n ? fresh.slice(-l.n) : fresh;
    fresh.forEach(k => l.seen.add(k));
    for (const k of fire) try { l.cb(snap(o[k], k)); } catch (e) { console.error(e); }
  }
}
ws.onmessage = ev => {
  const m = JSON.parse(ev.data);
  if (m.op === 'tree') { tree = m.tree || {}; offset = m.offset || 0; if (!ready) { ready = true; readyQ.splice(0).forEach(f => f()); } notify(); }
  else if (m.op === 'casr') { const w = casWait.get(m.id); if (w) { casWait.delete(m.id); w(m); } }
};
const whenReady = () => new Promise(r => (ready ? r() : readyQ.push(r)));
const send = m => whenReady().then(() => ws.send(JSON.stringify(m)));
// 내 폰에서 먼저 반영 (Firebase처럼)
function localSet(p, v) {
  const ks = parts(p), ts = x => (x && typeof x === 'object' ? (x['.sv'] === 'timestamp' ? Date.now() + offset : Object.fromEntries(Object.entries(x).map(([k, y]) => [k, ts(y)]))) : x);
  v = ts(clone(v));
  if (!ks.length) { tree = v || {}; return; }
  let o = tree; for (const k of ks.slice(0, -1)) { if (!o[k] || typeof o[k] !== 'object') o[k] = {}; o = o[k]; }
  if (v === null || v === undefined) delete o[ks[ks.length - 1]]; else o[ks[ks.length - 1]] = v;
}
export const getDatabase = () => ({});
export const ref = (db, p = '') => ({ path: parts(p).join('/'), key: parts(p).pop() || null });
export const query = (r, ...c) => ({ ...r, n: (c.find(x => x && x.n) || {}).n || 0 });
export const limitToLast = n => ({ n });
export const serverTimestamp = () => ({ '.sv': 'timestamp' });
export const goOffline = () => {}, goOnline = () => {};
export async function get(r) { await whenReady(); return snap(getAt(r.path), r.key); }
export function set(r, v) { localSet(r.path, v); notify(); return send({ op: 'set', path: r.path, value: v }); }
export function update(r, obj) { for (const [k, v] of Object.entries(obj)) localSet(r.path + '/' + k, v); notify(); return send({ op: 'update', path: r.path, value: obj }); }
export function remove(r) { return set(r, null); }
const PCH = '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz';
let lastPush = 0, pushN = 0;
export function push(r, v) {
  const t = Date.now(); pushN = t === lastPush ? pushN + 1 : 0; lastPush = t;
  let k = ''; for (let i = 0, x = t; i < 8; i++) { k = PCH[x % 64] + k; x = Math.floor(x / 64); }
  for (let i = 0; i < 12; i++) k += PCH[Math.floor(Math.random() * 64)];
  k = k.slice(0, 8) + String(pushN).padStart(3, '0') + k.slice(11);
  const child = { path: r.path + '/' + k, key: k };
  const p = v === undefined ? Promise.resolve() : set(child, v);
  return Object.assign(p, child);
}
export function onValue(r, cb) { const l = { path: r.path, cb, last: undefined }; vals.add(l); whenReady().then(notify); return () => vals.delete(l); }
export function onChildAdded(q, cb) { const l = { path: q.path, cb, n: q.n, seen: new Set(), started: false }; kids.add(l); whenReady().then(notify); return () => kids.delete(l); }
export async function runTransaction(r, fn) {
  await whenReady();
  for (let i = 0; i < 25; i++) {
    const base = getAt(r.path), baseJ = JSON.stringify(base === undefined ? null : base);
    const out = fn(clone(base));
    if (out === undefined) return { committed: false, snapshot: snap(base, r.key) };
    const id = ++seq;
    const res = await new Promise(res => { casWait.set(id, res); ws.send(JSON.stringify({ op: 'cas', id, path: r.path, base: baseJ, value: out })); });
    if (res.ok) { localSet(r.path, out); notify(); return { committed: true, snapshot: snap(getAt(r.path), r.key) }; }
    localSet(r.path, res.cur);
  }
  return { committed: false, snapshot: snap(getAt(r.path), r.key) };
}
