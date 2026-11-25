// LOGIC START — 게임 규칙 (숫자를 바꾸면 밸런스가 바뀌어요)
const RULES = {
  HP_MAX: 100,
  HIDE_SEC: 300,             // 도망자 숨는 시간 (추격자 대기)
  GAME_SEC: 1800,            // 숨는 시간이 끝난 뒤 제한시간 — 버티면 도망자 승리
  CATCH_DMG: 50,             // 잡힐 때 도망자 체력 감소
  CATCH_COOLDOWN_SEC: 120,   // 잡은 추격자 정지 + 잡힌 도망자 무적 시간
  CATCH_MAX_DIST_M: 20,      // QR 찍을 때 GPS 거리가 이보다 멀면 무효 (꼼수 방지) — 두 폰의 GPS 오차만큼 더 인정
  CATCH_MAX_DIST_CAP_M: 80,  // 실내처럼 GPS가 부정확할 때도 최대 이 거리까지만 인정
  WAIT_MOVE_M: 15,           // 대기 중 처음 자리에서 이만큼 벗어나면
  WAIT_MOVE_GRACE_SEC: 3,    // 이 시간 이상 이어질 때부터
  WAIT_MOVE_DMG: 10,         // 초당 체력 감소
  RULE_WARN_SEC: 10,         // 구역 밖·탈것: 경고 시간
  RULE_DMG: 5,               // 경고 후 초당 체력 감소
  VEHICLE_KMH: 25,           // 이 속도를 넘으면 탈것으로 판단
  WALK_KMH: 5,               // 이 속도 이하(천천히 걷기)는 스태미나 소모 없음
  ST_MAX: { runner: 100, chaser: 150 },
  EXHAUST_WARN_SEC: 5,       // 스태미나 0에서 뛰면 이 시간 동안은 경고만 (GPS 속도가 늦게 반영될 수 있어서)
  EXHAUST_RESET_SEC: 3,      // 이 시간 이상 걷거나 멈추면 경고 시간이 다시 처음부터
  MF_POLICE: 1,              // 마피아 모드: 경찰 수 (추천: 4명 이상이면 1)
  MF_DOCTOR: 1,              // 마피아 모드: 의사 수 (추천: 5명 이상이면 1)
  ST_MUL: 1,                 // 스태미나 소모 배율 (방장이 ×0.5~×2로 바꿀 수 있음). 기본 소모는 ST_BASE_PER_MS
  ARROW_UNLOCK_SEC: 120,     // 추격 시작(또는 정지 해제) 후 화살표가 열리는 시간
  ARROW_EVERY_SEC: 40,       // 화살표 주기 (도망자 미니맵 갱신의 약 2배)
  ARROW_SHOW_SEC: 10,        // 화살표가 보이는 시간 (주기 40초 기준, 주기에 비례해서 바뀜)
  ARROW_NEAR_M: 15,
  ALT_NEAR_M: 30,            // 화살표: 도망자가 이 거리 안이면 높이 차이도 표시 (GPS 고도)
  ALT_DIFF_M: 6,             // 높이 차이가 이보다 클 때만 (약 2층, GPS 고도 오차 때문)          // 이 거리 안이면 화살표 대신 '근처에 있어요!'
  STILL_SEC: 3,              // 이 시간 동안 가만히 있으면 스태미나 회복 시작
  STILL_RECOVER: 5,          // 가만히 있을 때 스태미나 초당 회복
  MAP_EVERY_SEC: 20,         // 도망자 미니맵의 추격자 위치 갱신 간격
  TRACK_USES: 2,             // 추격자 기본 스킬 '즉시 추적' 판마다 횟수 (0이면 없음)
  ICE_SELF_USES: 3,          // 얼음땡: 도망자가 스스로 '얼음' 할 수 있는 횟수 (판마다, 0이면 없음)
  MAX_PLAYERS: 10,
  START_DELAY_SEC: 6,        // 시작 버튼 → 역할 공개 → 3·2·1 → 숨는 시간 시작
  AREA_DEFAULT_M: 300,
  GPS_MAX_SPEED_MS: 8,       // 이보다 빠르게 '순간이동'한 GPS 값은 튄 값으로 보고 무시 (같은 쪽으로 3번 연속이면 인정)
  GPS_BAD_ACC: 30,           // GPS 오차가 이 값(m)보다 크면 대기·구역 벌칙 판정을 잠시 멈춤
  AUG_EVERY_SEC: 600,        // 추격 시작 후 이 간격마다 증강 3개 중 1개 선택 (기본: 게임 시간 ÷ 3)
  SPOT_COUNT: 2,             // 구역 안 증강 지점 수
  SPOT_PICK_M: 15,           // 지점에서 이 거리 안에 들어가면 획득
  SPOT_RESPAWN_SEC: 180,     // 먹힌 지점이 다른 곳에 다시 생기는 시간
  SPOT_STALE_SEC: 600,       // 이 시간 동안 아무도 못 먹은 지점은 못 들어가는 곳으로 보고 옮김 (30분 게임 기준, 게임 시간에 비례)
  SPOT_MOVE_M: 50,           // 옮길 때 원래 자리에서 이 거리보다 멀리
  GRADE_ODDS: { D: 0.25, C: 0.22, B: 0.25, A: 0.17, S: 0.08, SS: 0.03 }, // 증강 등급 확률
  AUG_ON: 1,                 // 증강 켜기(1) / 끄기(0)
  AREA_R: 300                // 현재 구역 반경 (방 설정에서 자동으로 들어옴, 육감 거리 계산용)
};
// 위 값들은 기본값이에요. 실제 게임에서는 방장이 로비에서 정한 설정(추천값 또는 직접 수정)이 덮어써요.
const RULE_DEFAULTS = JSON.parse(JSON.stringify(RULES));

const Logic = (() => {
  const R = 6371000, rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;

  function dist(a, b) {
    const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
  }
  function bearing(a, b) {
    const y = Math.sin(rad(b.lng - a.lng)) * Math.cos(rad(b.lat));
    const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lng - a.lng));
    return (deg(Math.atan2(y, x)) + 360) % 360;
  }
  // 속도(m/s) → 초당 스태미나 소모. 걷기는 0, 탈것 속도에서 상한.
  // 걷기 속도를 넘는 1m/s당 초당 소모 (설정 ×1 기준). 예전 기본 ×1.5 → ×2를 새 ×1로
  const ST_BASE_PER_MS = 2;
  function staminaCostPerSec(speed, walkKmh = RULES.WALK_KMH) {
    const walk = walkKmh / 3.6, cap = RULES.VEHICLE_KMH / 3.6;
    const v = Math.min(Math.max(speed || 0, 0), cap);
    return v > walk ? (v - walk) * ST_BASE_PER_MS * (RULES.ST_MUL || 1) : 0;
  }
  // 스태미나가 모자라면 모자란 만큼 체력에서 1:1로 깎임
  function spendStamina(st, cost) {
    return st >= cost ? { st: st - cost, hpLoss: 0 } : { st: 0, hpLoss: cost - st };
  }
  // 스태미나 0에서 뛰기: 이어서 EXHAUST_WARN_SEC 동안은 경고만(left: 남은 초), 그 뒤부터 체력 감소(hurt)
  // EXHAUST_RESET_SEC 이상 걷거나 멈춰야(running=false) 다시 처음부터 (잠깐 속도가 떨어진 걸로는 안 됨)
  function exhaust(x, hpLoss, running, dt) {
    x = { run: 0, rest: 0, ...x };
    const prev = x.run;
    if (hpLoss > 0) { x.run += dt; x.rest = 0; }
    else if (!running) { x.rest += dt; if (x.rest >= RULES.EXHAUST_RESET_SEC) x.run = 0; }
    return { ...x, hurt: hpLoss > 0 && prev >= RULES.EXHAUST_WARN_SEC, left: RULES.EXHAUST_WARN_SEC - prev };
  }
  // shift: 시간 도둑으로 늘거나 줄어든 게임 시간(ms)
  function phaseAt(now, startAt, shift = 0) {
    const hideEnd = startAt + RULES.HIDE_SEC * 1000, end = hideEnd + RULES.GAME_SEC * 1000 + (shift || 0);
    if (now < startAt) return { phase: 'pre', remainMs: startAt - now };
    if (now < hideEnd) return { phase: 'hide', remainMs: hideEnd - now };
    if (now < end) return { phase: 'chase', remainMs: end - now };
    return { phase: 'over', remainMs: 0 };
  }
  // 화살표가 보이는 시간: 주기의 25% (기본 40초 → 10초), 최소 5초
  function arrowShowSec(everySec) {
    return Math.max(5, Math.round(everySec * RULE_DEFAULTS.ARROW_SHOW_SEC / RULE_DEFAULTS.ARROW_EVERY_SEC));
  }
  // 화살표 기준 시각: 숨는 시간 끝 또는 잡은 뒤 정지가 풀리는 시각 중 늦은 쪽
  function arrowBase(me, startAt) {
    return Math.max(startAt + RULES.HIDE_SEC * 1000, me.frozenUntil || 0);
  }
  function arrowState(now, base, everySec = RULES.ARROW_EVERY_SEC, showBonusSec = 0) {
    const unlockAt = base + RULES.ARROW_UNLOCK_SEC * 1000;
    if (now < unlockAt) return { unlocked: false, visible: false, idx: -1, nextInMs: unlockAt - now, showLeftMs: 0 };
    const every = everySec * 1000, show = Math.min(everySec - 1, arrowShowSec(everySec) + showBonusSec) * 1000;
    const t = now - unlockAt, idx = Math.floor(t / every), into = t - idx * every, visible = into < show;
    return { unlocked: true, visible, idx, nextInMs: visible ? 0 : every - into, showLeftMs: visible ? show - into : 0 };
  }
  function mapRevealIdx(now, startAt) {
    return Math.floor((now - startAt) / (RULES.MAP_EVERY_SEC * 1000));
  }
  function hpRaw(p, hit) {
    const caught = p.role === 'runner' ? ((hit && hit.catches) || 0) : 0;
    return (p.hpMax || RULES.HP_MAX) - (p.selfDmg || 0) - caught * RULES.CATCH_DMG - ((hit && hit.ext) || 0); // ext: 자폭 등 남이 준 피해 / hpMax: 암살전 부하는 60
  }
  // 시계: 메인에서 서버 기준 시각으로 바꿔 끼움 (테스트에서도 바꿀 수 있게)
  let clock = () => Date.now();
  const setClock = fn => { clock = fn; };
  // 최후의 발악이 준비돼 있으면(쿨타임 끝) 체력이 0 이하가 돼도 1로 봄 (본인 폰이 곧 발동 처리)
  // 단, 이미 탈락 처리된 사람(탈락 시각 기록됨)은 나중에 쿨타임이 끝나도 다시 살아나지 않음 (피의 서약만 살릴 수 있음)
  function hpOf(p, hit) {
    if (p.forfeit || p.out) return 0; // 기권, 마피아 모드 탈락(잡힘·추방·저격)
    const raw = hpRaw(p, hit), died = !!(p.stats && p.stats.diedAt), ls = p.augs && p.augs.lastStand;
    if (raw <= 0 && !died && ls && (ls.readyAt || 0) <= clock()) return 1;
    const cb = p.augs && p.augs.comeback;
    if (raw <= 0 && !died && cb && (cb.readyAt || 0) <= clock()) return 1;
    if (raw <= 0 && hit && (hit.pendUntil || 0) > clock()) return 1; // 흔들어 탈출 판정 중엔 탈락 보류
    if (isAsnRole(p.role)) return Math.min(p.hpMax || RULES.HP_MAX, Math.max(1, raw)); // 암살전: 체력 0 = 기절 (탈락 없음)
    if (isTerrRole(p.role)) return RULES.HP_MAX; // 땅따먹기: 체력을 쓰지 않음 (기권만 탈락)
    return Math.min(p.hpMax || RULES.HP_MAX, Math.max(0, raw));
  }
  const alive = (p, hit) => hpOf(p, hit) > 0;
  // ---------- 암살전 ----------
  // 역할(role) 자리에 '무리 id'(k로 시작)를 넣음 → 기존 '같은 팀 / 상대 팀' 비교가 무리 단위로 그대로 동작
  // room.asn = { chain: 'kA,kB,kC'(사슬 순서: 앞 무리가 다음 무리를 노림), crews: { kA: { boss } }, mem: { pid: 무리 }, since: { pid: 무리에 들어온 시각 },
  //              n: { pid: 잡은 수 }, rebel: { pid: 1 (하극상 씀) }, duelAt: 최후의 결투 시작 시각 }
  const isAsnRole = r => typeof r === 'string' && r[0] === 'k';
  // ---------- 땅따먹기 ----------
  // 팀 = 역할 자리에 'tR'(빨강) / 'tB'(파랑). 구역을 육각형 칸으로 나눠, 칸에 머물면 우리 팀 색
  // room.terr = { base: { tR: 칸, tB: 칸 }, cells: { 'q_r': { t: 팀, at, by, sh: 방어막 끝 } } }, room.terrLog: 칠한 기록 (타임랩스·통계)
  const isTerrRole = r => r === 'tR' || r === 'tB';
  const TERR = { TARGET_CELLS: 170, MIN_SIDE: 15, MAX_SIDE: 40, BLANK_SEC: 3, STEAL_SEC: 5, LAST_SEC: 2, LAST_MIN: 3, ROLLER_SEC: 1, ACC_M: 20, SWITCH_IN_M: 5,
    TAG_SEC: 2, NEAR_M: 10, STUN_SEC: 30, HOME_SEC: 3, INV_SEC: 60, PROT_SEC: 180, BASE_K: 0.6, GOLD_EVERY: 300, GOLD_N: 3, GOLD_VAL: 5, GAME_SEC: 1200 };
  const terrOther = tm => (tm === 'tR' ? 'tB' : 'tR');
  const terrKey = (q, r) => `${q}_${r}`;
  const terrQR = k => String(k).split('_').map(Number);
  const terrSide = area => Math.max(TERR.MIN_SIDE, Math.min(TERR.MAX_SIDE, Math.sqrt(Math.PI * area.r * area.r / (2.598 * TERR.TARGET_CELLS))));
  // 뾰족한 육각형 (pointy-top), 축 좌표 q·r
  const hexCenter = (q, r, sd) => [sd * Math.sqrt(3) * (q + r / 2), sd * 1.5 * r];
  function hexAt(x, y, sd) {
    const qf = (Math.sqrt(3) / 3 * x - y / 3) / sd, rf = (2 / 3 * y) / sd, sf = -qf - rf;
    let q = Math.round(qf), r = Math.round(rf); const s2 = Math.round(sf);
    const dq = Math.abs(q - qf), dr = Math.abs(r - rf), ds = Math.abs(s2 - sf);
    if (dq > dr && dq > ds) q = -r - s2; else if (dr > ds) r = -q - s2;
    return [q, r];
  }
  const HEX_NB = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]];
  const terrNb = k => { const [q, r] = terrQR(k); return HEX_NB.map(([a, b]) => terrKey(q + a, r + b)); };
  const terrGridCache = new Map();
  // 구역 안(칸 가운데가 구역 안)인 칸 목록. 모든 폰이 같은 계산 → 같은 칸 번호
  function terrGrid(area) {
    const ck = JSON.stringify([area.lat, area.lng, area.r, area.poly || null]);
    if (terrGridCache.has(ck)) return terrGridCache.get(ck);
    const sd = terrSide(area), R = area.poly ? Math.max(area.r, ...polyXY(area, 1).map(([x, y]) => Math.hypot(x, y))) : area.r;
    const n = Math.ceil(R / (sd * 1.5)) + 2, keys = [], set = new Set();
    for (let r = -n; r <= n; r++) for (let q = -n - Math.ceil(n / 2); q <= n + Math.ceil(n / 2); q++) {
      const [x, y] = hexCenter(q, r, sd);
      if (Math.hypot(x, y) > R + sd) continue;
      if (inArea(fromXY(x, y, area), area)) { const k = terrKey(q, r); keys.push(k); set.add(k); }
    }
    const g = { sd, keys, set, o: { lat: area.lat, lng: area.lng } };
    terrGridCache.set(ck, g); return g;
  }
  const terrCellCenter = (g, k) => { const [q, r] = terrQR(k), [x, y] = hexCenter(q, r, g.sd); return fromXY(x, y, g.o); };
  const terrCorners = (g, k) => { const [q, r] = terrQR(k), [x, y] = hexCenter(q, r, g.sd); return Array.from({ length: 6 }, (_, i) => { const a = rad(60 * i - 30); return fromXY(x + g.sd * Math.cos(a), y + g.sd * Math.sin(a), g.o); }); };
  // 위치 → 칸. prev가 있으면 새 칸 안쪽으로 5m 이상 들어와야 바뀐 걸로 침 (경계에서 깜빡이지 않게)
  function terrCellOf(g, p, prev) {
    const [x, y] = toXY(p, g.o), [q, r] = hexAt(x, y, g.sd), k = terrKey(q, r);
    if (!g.set.has(k)) return prev && g.set.has(prev) && dist(p, terrCellCenter(g, prev)) <= g.sd ? prev : null;
    if (prev && prev !== k && g.set.has(prev)) { const [cx, cy] = hexCenter(q, r, g.sd); if (Math.hypot(x - cx, y - cy) > g.sd * Math.sqrt(3) / 2 - TERR.SWITCH_IN_M) return prev; }
    return k;
  }
  // 시작: 무작위로 반반 팀, 기지는 구역 서쪽·동쪽 (반지름 60% 지점)에서 가장 가까운 칸
  function terrStart(area, ids, rnd = Math.random) {
    const a = ids.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    const teams = {}; a.forEach((id, i) => { teams[id] = i % 2 ? 'tB' : 'tR'; });
    const g = terrGrid(area), near = x0 => g.keys.reduce((b, k) => { const [q, r] = terrQR(k), [x, y] = hexCenter(q, r, g.sd), d = Math.hypot(x - x0, y); return !b || d < b[1] ? [k, d] : b; }, null)[0];
    const bR = near(-area.r * TERR.BASE_K); let bB = near(area.r * TERR.BASE_K); if (bB === bR) bB = g.keys.find(k => k !== bR);
    return { teams, terr: { base: { tR: bR, tB: bB }, cells: { [bR]: { t: 'tR', at: 0 }, [bB]: { t: 'tB', at: 0 } } } };
  }
  // 황금 칸: 추격 시작 5분마다 3칸씩 (기지 빼고). 방 코드로 정해져서 모든 폰이 같은 칸을 앎
  function terrGold(g, terr, seed, now, startAt, shift = 0) {
    const s0 = startAt + RULES.HIDE_SEC * 1000, waves = Math.floor(Math.max(0, now - s0) / (TERR.GOLD_EVERY * 1000));
    const base = Object.values((terr && terr.base) || {}), pool = g.keys.filter(k => !base.includes(k)).sort();
    let h = 2166136261; for (const ch of String(seed)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
    const rnd = () => { h = (h + 0x6D2B79F5) >>> 0; let x = h; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
    const out = [];
    for (let w = 0; w < waves && pool.length; w++) for (let i = 0; i < TERR.GOLD_N && pool.length; i++) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
    return out;
  }
  function terrScore(terr, gold) {
    const sc = { tR: 0, tB: 0 }, gs = new Set(gold || []);
    for (const [k, c] of Object.entries((terr && terr.cells) || {})) if (c && sc[c.t] != null) sc[c.t] += gs.has(k) ? TERR.GOLD_VAL : 1;
    return sc;
  }
  // 칠하는 데 필요한 시간 (초). null = 못 칠함
  function terrNeed(terr, k, team, now, startAt, shift = 0, rollerUntil = 0) {
    const c = (terr && terr.cells && terr.cells[k]) || null, base = Object.values((terr && terr.base) || {});
    if (!k || base.includes(k) || (c && c.t === team)) return null;
    if (c && (c.sh || 0) > now) return null; // 상대 방어막
    const s0 = startAt + RULES.HIDE_SEC * 1000;
    if (now < s0 + TERR.PROT_SEC * 1000) { const eb = terr.base[terrOther(team)]; if (eb && terrNb(eb).includes(k)) return null; } // 상대 기지 둘레 처음 3분 보호
    if (rollerUntil > now) return TERR.ROLLER_SEC;
    const end = s0 + RULES.GAME_SEC * 1000 + shift;
    if (end - now <= TERR.LAST_MIN * 60000) return TERR.LAST_SEC;
    return c ? TERR.STEAL_SEC : TERR.BLANK_SEC;
  }
  // 승리: 시간이 끝났을 때 점수 높은 팀, 같으면 마지막 1분 동안 더 많이 칠한 팀, 그래도 같으면 무승부
  function terrWinner(terr, log, gold, now, startAt, shift = 0) {
    if (phaseAt(now, startAt, shift).phase !== 'over') return null;
    const sc = terrScore(terr, gold), d = `${sc.tR} : ${sc.tB}`;
    if (sc.tR !== sc.tB) return { winner: sc.tR > sc.tB ? 'tR' : 'tB', reason: `칸 점수 ${d}`, sc };
    const end = startAt + RULES.HIDE_SEC * 1000 + RULES.GAME_SEC * 1000 + shift, last = { tR: 0, tB: 0 };
    for (const e of Object.values(log || {})) if (e && e.t && (e.at || 0) >= end - 60000 && last[e.t] != null) last[e.t]++;
    if (last.tR !== last.tB) return { winner: last.tR > last.tB ? 'tR' : 'tB', reason: `칸 점수 ${d} 동점 · 마지막 1분 ${last.tR} : ${last.tB}`, sc };
    return { winner: 'draw', reason: `칸 점수 ${d} 무승부`, sc };
  }
  const ASN = { STAB_SEC: 3, REBEL_SEC: 3, REBEL_GUARD_SEC: 2, REBEL_GUARD_M: 15, REBEL_WAIT_SEC: 300, INV_SEC: 60, STUN_SEC: 120, STUN_HP: 30,
    MINION_HP: 60, MINION_ST: 0.7, WARN_M: 30, BEHIND_DEG: 60, FRONT_DEG: 90, NEAR_M: 10, BLOOD_EVERY: 300, BLOOD_SEC: 60,
    DUEL_SHRINK_SEC: 300, DUEL_MIN_K: 0.35, GIVE_M: 20, PING_SEC: 30, SELL_SEC: 60, KEEP_SEC: 20 };
  const asnChain = a => (a && a.chain ? String(a.chain).split(',').filter(Boolean) : []);
  const asnTarget = (a, crew) => { const c = asnChain(a), i = c.indexOf(crew); return i < 0 || c.length < 2 ? null : c[(i + 1) % c.length]; };
  const asnHunter = (a, crew) => { const c = asnChain(a), i = c.indexOf(crew); return i < 0 || c.length < 2 ? null : c[(i - 1 + c.length) % c.length]; };
  const asnBoss = (a, crew) => (a && a.crews && a.crews[crew] && a.crews[crew].boss) || null;
  const asnIsBoss = (a, pid) => !!(a && a.mem && asnBoss(a, a.mem[pid]) === pid);
  const asnMembers = (a, crew) => Object.entries((a && a.mem) || {}).filter(([, c]) => c === crew).map(([id]) => id);
  // 시작: 각자 1인 무리(우두머리), 사슬은 무작위
  function asnStart(ids, now, rnd = Math.random) {
    const a = ids.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    const crews = {}, mem = {}, since = {}, chain = [];
    a.forEach((id, i) => { const k = 'k' + i + id.slice(0, 4); crews[k] = { boss: id }; mem[id] = k; since[id] = now; chain.push(k); });
    return { chain: chain.join(','), crews, mem, since, n: {}, rebel: {}, duelAt: null };
  }
  const asnClone = a => ({ ...a, crews: { ...(a.crews || {}) }, mem: { ...(a.mem || {}) }, since: { ...(a.since || {}) }, n: { ...(a.n || {}) }, rebel: { ...(a.rebel || {}) } });
  function asnDropCrew(b, crew, now) { // 무리를 사슬에서 빼기 (앞 무리는 자동으로 다음 무리를 노림)
    b.chain = asnChain(b).filter(k => k !== crew).join(','); delete b.crews[crew];
    if (asnChain(b).length === 2 && !b.duelAt) b.duelAt = now;
  }
  // 암살 성공: 부하면 그 사람만, 우두머리면 무리 통째로 잡은 사람 무리로. blood: 피의 시간(사슬 무시). 안 되면 null
  function asnCatch(a, victim, catcher, now, blood) {
    if (!a || !a.mem) return null;
    const cv = a.mem[victim], cc = a.mem[catcher];
    if (!cv || !cc || cv === cc || !a.crews[cv] || !a.crews[cc]) return null;
    if (!blood && asnTarget(a, cc) !== cv) return null;
    const b = asnClone(a), whole = asnBoss(a, cv) === victim, moved = whole ? asnMembers(a, cv) : [victim];
    for (const id of moved) { b.mem[id] = cc; b.since[id] = now; }
    if (whole) asnDropCrew(b, cv, now);
    b.n[catcher] = (b.n[catcher] || 0) + 1;
    return { asn: b, moved, whole, from: cv, to: cc };
  }
  // 하극상 성공: 내가 우두머리, 원래 우두머리는 부하
  function asnRebel(a, rebel) {
    const c = a && a.mem && a.mem[rebel], old = c && asnBoss(a, c);
    if (!c || !old || old === rebel || (a.rebel && a.rebel[rebel])) return null;
    const b = asnClone(a); b.crews[c] = { ...b.crews[c], boss: rebel }; b.rebel[rebel] = 1;
    return { asn: b, old };
  }
  // 팔아넘기기: 그 부하를 우리 무리를 노리는 무리로
  function asnSell(a, pid, now) {
    const c = a && a.mem && a.mem[pid], h = c && asnHunter(a, c);
    if (!c || !h || h === c || asnBoss(a, c) === pid) return null;
    const b = asnClone(a); b.mem[pid] = h; b.since[pid] = now;
    return { asn: b, to: h };
  }
  // 우두머리가 기권하면: 살아 있는 부하 중 잡은 수가 가장 많은 사람(같으면 아이디 순)이 새 우두머리. 살아 있는 사람이 없으면 무리를 사슬에서 뺌
  function asnFix(a, aliveIds, now) {
    if (!a || !a.chain) return null;
    const b = asnClone(a); let changed = false;
    for (const k of asnChain(a)) {
      const live = asnMembers(a, k).filter(id => aliveIds.includes(id));
      if (!live.length) { asnDropCrew(b, k, now); changed = true; continue; }
      if (!live.includes(asnBoss(a, k))) { live.sort((x, y) => ((a.n || {})[y] || 0) - ((a.n || {})[x] || 0) || (x < y ? -1 : 1)); b.crews[k] = { ...b.crews[k], boss: live[0] }; changed = true; }
    }
    return changed ? b : null;
  }
  // 피의 시간: 추격 시작 5분 뒤부터 5분마다 1분
  function asnBlood(now, startAt, shift = 0) {
    const s = startAt + RULES.HIDE_SEC * 1000, e = now - s, P = ASN.BLOOD_EVERY * 1000, D = ASN.BLOOD_SEC * 1000;
    if (!startAt || e < P) return { on: false, next: s + P };
    const k = Math.floor(e / P), into = e - k * P;
    if (phaseAt(now, startAt, shift).phase !== 'chase') return { on: false, next: null };
    return into < D ? { on: true, until: s + k * P + D, k } : { on: false, next: s + (k + 1) * P };
  }
  // 최후의 결투: 구역이 5분 동안 35%까지 줄어듦
  const asnDuelK = (a, now) => (a && a.duelAt ? Math.max(ASN.DUEL_MIN_K, 1 - (1 - ASN.DUEL_MIN_K) * (now - a.duelAt) / (ASN.DUEL_SHRINK_SEC * 1000)) : 1);
  const angGap = (x, y) => Math.abs(((x - y) % 360 + 540) % 360 - 180);
  // 뒤에서 암살: 두 폰이 같은 쪽(±60°)을 보고, 상대가 내 앞쪽(±90°)에 있어야 함. 상대 나침반이 없으면 어느 방향이든 됨
  // 가까워서 GPS 방향을 믿을 수 없으면(거리 < 두 폰 오차) 앞쪽 검사는 건너뜀
  function behindOk(myHd, theirHd, brg, d, accSum) {
    if (myHd == null) return false;
    if (theirHd == null) return true;
    if (angGap(myHd, theirHd) > ASN.BEHIND_DEG) return false;
    return d < Math.max(4, accSum) || angGap(brg, myHd) <= ASN.FRONT_DEG;
  }
  // 승리: 무리가 하나 남으면 그 우두머리. 시간이 끝나면 살아 있는 사람이 가장 많은 무리의 우두머리 (같으면 우두머리가 잡은 수)
  function asnWinner(a, players, hits, now, startAt, shift = 0) {
    const ch = asnChain(a); if (!ch.length) return null;
    const live = k => asnMembers(a, k).filter(id => players[id] && alive(players[id], (hits || {})[id])).length;
    if (ch.length === 1) return { winner: 'asn', boss: asnBoss(a, ch[0]), crew: ch[0], reason: '모두 한 무리가 됨' };
    if (phaseAt(now, startAt, shift).phase !== 'over') return null;
    const best = ch.map(k => [k, live(k), ((a.n || {})[asnBoss(a, k)] || 0)]).sort((x, y) => y[1] - x[1] || y[2] - x[2])[0];
    return { winner: 'asn', boss: asnBoss(a, best[0]), crew: best[0], reason: `시간 끝 · 무리 ${best[1]}명` };
  }
  // 상대 화면(화살표·미니맵·순간 포착)에 보이는 위치: 분신이 켜져 있으면 분신 자리, 자리 바꾸기 중이면 바꾼 팀원 자리
  // 도플갱어: 분신이 brg 방향으로 초속 ms m씩 걸어감
  function movePoint(pos, brg, m) {
    const b = rad(brg);
    return { lat: pos.lat + m * Math.cos(b) / 111195, lng: pos.lng + m * Math.sin(b) / (111195 * Math.cos(rad(pos.lat))) };
  }
  // 움직이는 물체(분신·드론): at 때 lat/lng에서 brg 방향으로 초속 ms m, maxD(구역 경계)에서 멈춤
  function movingPos(o, now) {
    if (o.brg == null) return { lat: o.lat, lng: o.lng };
    const m = (o.ms || 0) * Math.max(0, now - (o.at || now)) / 1000;
    return movePoint(o, o.brg, o.maxD != null ? Math.min(m, o.maxD) : m);
  }
  function shownPos(p, now, players) {
    const dc = p.decoy;
    if (dc && (dc.until || 0) > now) { const q = movingPos(dc, now); return { ...p, lat: q.lat, lng: q.lng }; }
    if (p.frame && (p.frame.until || 0) > now) return { ...p, lat: p.frame.lat, lng: p.frame.lng }; // 정지 화면
    const sw = p.swap, q = sw && (sw.until || 0) > now && players && players[sw.with];
    if (q && q.lat != null) return { ...p, lat: q.lat, lng: q.lng };
    if ((p.lagUntil || 0) > now && p.lag) return { ...p, lat: p.lag.lat, lng: p.lag.lng }; // 잔상: 10초 전 위치
    return p;
  }
  // 봉쇄선: 내 이동(p1→p2)이 선(q1→q2)을 넘었는지 (평면 근사)
  function segCross(p1, p2, q1, q2) {
    const k = 111195 * Math.cos(rad(q1.lat)), P = o => [(o.lng - q1.lng) * k, (o.lat - q1.lat) * 111195];
    const [a, b, c, d] = [P(p1), P(p2), P(q1), P(q2)];
    const cr = (o, u, v) => (u[0] - o[0]) * (v[1] - o[1]) - (u[1] - o[1]) * (v[0] - o[0]);
    const d1 = cr(c, d, a), d2 = cr(c, d, b), d3 = cr(a, b, c), d4 = cr(a, b, d);
    return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0)) && d1 !== 0 && d2 !== 0;
  }
  // 봉쇄선 두 번째 점: 첫 점에서 최대 len m
  function clampLen(a, b, len) {
    const d = dist(a, b); return d <= len ? b : movePoint(a, bearing(a, b), len);
  }
  // 높이 위장: 상대가 쓰고 있으면 높이 차이를 반대로
  const shownAlt = (p, myAlt, now) => (typeof p.alt === 'number' && typeof myAlt === 'number' && (p.altFakeUntil || 0) > now ? 2 * myAlt - p.alt : p.alt);
  // ===== 꼭짓점 구역 (다각형): area = { lat, lng(무게중심), r(넓이가 같은 원의 반경), poly: [[lat, lng], …] } =====
  const POLY_MIN = 3, POLY_MAX = 12, AREA_MIN_M = 100, AREA_MAX_M = 1000;
  const toXY = (p, o) => [(p.lng - o.lng) * 111195 * Math.cos(rad(o.lat)), (p.lat - o.lat) * 111195];
  const fromXY = (x, y, o) => ({ lat: o.lat + y / 111195, lng: o.lng + x / (111195 * Math.cos(rad(o.lat))) });
  const polyXY = (area, k = 1) => area.poly.map(([lat, lng]) => toXY({ lat, lng }, area).map(c => c * k));
  // 두 선분(평면 좌표)이 서로 가로지르는지 (끝점이 닿는 건 아님)
  function xyCross(a, b, c, d) {
    const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
    return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
  }
  // 찍은 꼭짓점 검사 → { ok, why } 또는 { ok, lat, lng, r }
  function polyCheck(pts, minR = AREA_MIN_M, maxR = AREA_MAX_M, what = '구역') {
    if (pts.length < POLY_MIN) return { ok: false, why: `꼭짓점을 ${POLY_MIN}개 이상 찍어 주세요` };
    if (pts.length > POLY_MAX) return { ok: false, why: `꼭짓점은 ${POLY_MAX}개까지예요` };
    const o = pts[0], v = pts.map(p => toXY(p, o)), n = v.length;
    for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue; // 이웃한 선
      if (xyCross(v[i], v[i + 1], v[j], v[(j + 1) % n])) return { ok: false, why: '선이 서로 꼬였어요. 둘레를 따라 순서대로 찍어 주세요' };
    }
    let A = 0, cx = 0, cy = 0;
    for (let i = 0; i < n; i++) { const [x0, y0] = v[i], [x1, y1] = v[(i + 1) % n], c = x0 * y1 - x1 * y0; A += c; cx += (x0 + x1) * c; cy += (y0 + y1) * c; }
    A /= 2;
    const r = Math.round(Math.sqrt(Math.abs(A) / Math.PI));
    if (r < minR || r > maxR) return { ok: false, r, why: `${what}이 너무 ${r < minR ? '작아요' : '커요'} (넓이로 치면 반경 ${r}m, ${minR}~${maxR}m만 돼요)` };
    const c = fromXY(cx / (6 * A), cy / (6 * A), o);
    return { ok: true, lat: c.lat, lng: c.lng, r };
  }
  // 구역 안인지 (k: 자기장처럼 중심 쪽으로 줄인 비율)
  function inArea(p, area, k = 1) {
    if (!area.poly) return dist(p, area) <= area.r * k;
    const [px, py] = toXY(p, area), v = polyXY(area, k);
    let inside = false;
    for (let i = 0, j = v.length - 1; i < v.length; j = i++) {
      const [xi, yi] = v[i], [xj, yj] = v[j];
      if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  // 경계선까지 가장 가까운 거리 (꼭짓점 구역)
  function polyGap(p, area) {
    const [px, py] = toXY(p, area), v = polyXY(area);
    let best = Infinity;
    for (let i = 0; i < v.length; i++) {
      const [ax, ay] = v[i], [bx, by] = v[(i + 1) % v.length], ex = bx - ax, ey = by - ay, L2 = ex * ex + ey * ey;
      const q = L2 ? Math.max(0, Math.min(1, ((px - ax) * ex + (py - ay) * ey) / L2)) : 0;
      best = Math.min(best, Math.hypot(px - ax - q * ex, py - ay - q * ey));
    }
    return best;
  }
  // 지도에 그릴 경계 (k배로 줄인 것)
  const areaRing = (area, k = 1) => polyXY(area, k).map(([x, y]) => { const p = fromXY(x, y, area); return [p.lat, p.lng]; });
  // pos에서 brg 방향으로 구역(area) 경계까지 거리 (이미 밖이고 바깥쪽이면 0)
  function edgeDist(pos, brg, area) {
    if (area.poly) {
      if (!inArea(pos, area)) return 0;
      const [px, py] = toXY(pos, area), v = polyXY(area), ux = Math.sin(rad(brg)), uy = Math.cos(rad(brg));
      let best = Infinity;
      for (let i = 0; i < v.length; i++) {
        const [ax, ay] = v[i], [bx, by] = v[(i + 1) % v.length], ex = bx - ax, ey = by - ay, den = ux * ey - uy * ex;
        if (Math.abs(den) < 1e-9) continue;
        const tt = ((ax - px) * ey - (ay - py) * ex) / den, ss = ((ax - px) * uy - (ay - py) * ux) / den;
        if (tt >= 0 && ss >= 0 && ss <= 1) best = Math.min(best, tt);
      }
      return best === Infinity ? 0 : best;
    }
    const x = (pos.lng - area.lng) * 111195 * Math.cos(rad(area.lat)), y = (pos.lat - area.lat) * 111195;
    const ux = Math.sin(rad(brg)), uy = Math.cos(rad(brg)), pu = x * ux + y * uy, c = x * x + y * y - area.r * area.r;
    const disc = pu * pu - c;
    return disc < 0 ? 0 : Math.max(0, -pu + Math.sqrt(disc));
  }
  // 연막탄: 도망자 팀 연막 반경 안에 있는 도망자 (진짜 위치 기준)
  const inSmoke = (p, smokes, now) => p.role === 'runner' && p.lat != null &&
    Object.values(smokes || {}).some(s => s.role === 'runner' && (s.until || 0) > now && dist(s, p) <= AUGS.smoke.v);
  // 살아 있고 무적·투명화·연막 속이 아닌 도망자 중 (보이는 위치 기준) 가장 가까운 사람
  function nearestRunner(pos, players, hits, now, smokes, skipSilent) {
    let best = null;
    for (const [id, p0] of Object.entries(players || {})) {
      if (p0.role !== 'runner' || p0.lat == null || (skipSilent && (p0.silentUntil || 0) > now)) continue;
      const h = (hits || {})[id];
      if (!alive(p0, h) || ((h && h.invUntil) || 0) > now || (p0.stealthUntil || 0) > now || inSmoke(p0, smokes, now)) continue;
      const p = shownPos(p0, now, players), d = dist(pos, p);
      if (!best || d < best.d) best = { id, p, d };
    }
    return best;
  }
  // 심장박동: 거리 → 다음 박동까지 ms (80m 1.5초 … 10m 안 0.35초, 80m 밖은 0 = 안 뜀)
  function beatGap(d) {
    const a = AUGS.heartbeat; if (!(d <= a.r)) return 0;
    const k = (Math.max(a.near, d) - a.near) / (a.r - a.near);
    return Math.round(350 + k * (1500 - 350));
  }
  // 화살표 높이 표시: 상대가 나보다 ALT_DIFF_M 넘게 높거나 낮으면 '▲ 약 9m 위' / '▼ 약 9m 아래' (고도 없으면 '')
  function altLabel(myAlt, theirAlt) {
    if (typeof myAlt !== 'number' || typeof theirAlt !== 'number') return '';
    const d = theirAlt - myAlt, m = Math.round(Math.abs(d));
    return Math.abs(d) <= RULES.ALT_DIFF_M ? '' : d > 0 ? `▲ 약 ${m}m 위` : `▼ 약 ${m}m 아래`;
  }
  // 게임 모드: classic(기본) · zombie(잡히면 좀비가 됨) · police(경찰과 도둑: 잡히면 감옥)
  // mafia(마피아: 정체 숨김, 마피아는 QR로 잡으면 바로 탈락, 5분마다 투표로 1명 추방)
  const MODES = { classic: '기본', zombie: '🧟 좀비', police: '🚓 경찰과 도둑', mafia: '🕵️ 마피아', ice: '🧊 얼음땡', assassin: '🗡️ 암살전', terr: '🎨 땅따먹기' };
  const MODE_RULES = { JAIL_MAX_R: 40, JAIL_MIN_R: 3, ICE_MOVE_M: 10, ICE_DRAIN_M: 30, ICE_DRAIN: 1, ICE_FREEZE_SEC: 10, ICE_INV_SEC: 10, ICE_SELF_SEC: 30, JAIL_R: 15, JAIL_GO_SEC: 120, POLICE_FREEZE_SEC: 30, RESCUE_INV_SEC: 60, MF_VOTE_EVERY: 300, MF_VOTE_SEC: 60, MF_SNAP_SEC: 30, MF_PICK_M: 10, MF_GUARD_SEC: 300 };
  function winner(players, hits, now, startAt, shift = 0, mode = 'classic') {
    const list = Object.entries(players || {}).filter(([, p]) => p.role);
    const runners = list.filter(([, p]) => p.role === 'runner'), chasers = list.filter(([, p]) => p.role === 'chaser');
    if (mode === 'mafia') { // 마피아 전원 탈락 → 시민 / 살아 있는 시민이 마피아 수 이하 → 마피아 / 시간 끝 → 시민
      const h = hits || {}, am = chasers.filter(([id, p]) => alive(p, h[id])).length, ac = runners.filter(([id, p]) => alive(p, h[id])).length;
      if (!chasers.length || !runners.length) return null;
      if (!am) return { winner: 'runner', reason: '마피아 전원 탈락' };
      if (ac <= am) return { winner: 'chaser', reason: '시민이 마피아 수 이하' };
      if (phaseAt(now, startAt, shift).phase === 'over') return { winner: 'runner', reason: `${Math.round((RULES.GAME_SEC * 1000 + (shift || 0)) / 60000)}분 버팀` };
      return null;
    }
    if (mode === 'zombie' && !runners.length && chasers.length) return { winner: 'chaser', reason: '전원 감염' };
    if (!runners.length || !chasers.length) return null;
    const h = hits || {}, alive_ = runners.filter(([id, p]) => alive(p, h[id]));
    if (!alive_.length) return { winner: 'chaser', reason: '도망자 전원 탈락' };
    if (!chasers.some(([id, p]) => alive(p, h[id]))) return { winner: 'runner', reason: '추격자 전원 탈락' };
    if (mode === 'police' && alive_.every(([, p]) => p.jailed)) return { winner: 'chaser', reason: '도둑 전원 체포' };
    if (mode === 'ice' && alive_.every(([, p]) => p.jailed)) return { winner: 'chaser', reason: '도망자 전원 얼음' }; // 스스로 얼음은 안 셈
    if (phaseAt(now, startAt, shift).phase === 'over') {
      const mins = `${Math.round((RULES.GAME_SEC * 1000 + (shift || 0)) / 60000)}분`;
      return { winner: 'runner', reason: mode === 'zombie' ? `${alive_.length}명이 ${mins} 버팀` : `${mins} 생존` };
    }
    return null;
  }
  function parseQR(text) {
    const m = /^GTAG1\|([A-Z0-9]+)\|([A-Za-z0-9]+)\|([A-Za-z0-9]+)$/.exec(text || '');
    return m ? { code: m[1], pid: m[2], token: m[3] } : null;
  }
  // 잡기 가능 여부. 문제가 있으면 이유(문자열), 괜찮으면 null
  function checkCatch(room, code, chaserId, qr, now, myPos, mySelfDmg) {
    if (!qr) return '술래잡기 QR이 아니에요';
    if (qr.code !== code) return '다른 방의 QR이에요';
    const players = room.players || {}, hits = room.hits || {};
    const me = players[chaserId], t = players[qr.pid];
    if (!me || me.role !== 'chaser') return '추격자만 잡을 수 있어요';
    if (!alive({ ...me, selfDmg: mySelfDmg ?? me.selfDmg }, hits[chaserId])) return '탈락해서 잡을 수 없어요';
    const ph = phaseAt(now, room.startAt, room.timeShift).phase;
    if (ph === 'pre') return '아직 시작 전이에요';
    if (ph === 'hide') return '아직 도망자가 숨는 시간이에요';
    if (ph === 'over') return '게임이 끝났어요';
    if ((me.frozenUntil || 0) > now) return '정지 시간에는 잡을 수 없어요';
    if (t && t.role === 'chaser' && room.settings && room.settings.mode === 'mafia') return '같은 마피아예요';
    if (!t || t.role !== 'runner') return '도망자 QR이 아니에요';
    if (t.qr !== qr.token) return '지난 게임의 QR이에요';
    if (!alive(t, hits[qr.pid])) return '이미 탈락한 도망자예요';
    if (t.jailed) return room.settings && room.settings.mode === 'ice' ? '이미 얼음인 도망자예요' : '이미 감옥에 있는 도둑이에요';
    if (room.settings && room.settings.mode === 'ice' && t.iceSelf && (t.iceSelf.until || 0) > now) return '🧊 얼음 중이라 못 잡아요';
    if (((hits[qr.pid] && hits[qr.pid].invUntil) || 0) > now) return '방금 잡혔거나 탈옥한 도망자라 아직 무적이에요';
    const pos = myPos || me;
    if (pos.lat == null || t.lat == null) return 'GPS 위치를 아직 못 받았어요';
    const d = dist(pos, t), lim = nearLimit(pos, t);
    if (d > lim) return `GPS상 ${Math.round(d)}m 떨어져 있어서 잡을 수 없어요 (지금 GPS로는 ${Math.round(lim)}m까지 인정)`;
    return null;
  }
  // QR로 만날 때(잡기·피의 서약) 인정하는 GPS 거리: 기본 거리 + 두 폰의 GPS 오차, 최대 CATCH_MAX_DIST_CAP_M
  // QR을 찍었다는 것 자체가 바로 옆이라는 증거라서, 실내처럼 GPS가 틀릴 땐 그만큼 넉넉하게 봄 (멀리서 QR 사진으로 잡는 꼼수만 막음)
  const accOf = p => Math.min(60, Math.max(0, (p && (p.rawAcc ?? p.racc ?? p.acc)) || 0));
  function nearLimit(a, b, base = RULES.CATCH_MAX_DIST_M) {
    return Math.min(base + accOf(a) + accOf(b), base + RULES.CATCH_MAX_DIST_CAP_M - RULES.CATCH_MAX_DIST_M);
  }
  // GPS 튐 보정: 오차(acc)가 큰 값일수록 덜 반영하는 칼만 필터 + 순간이동 같은 값은 무시
  // k: 이전 상태(없으면 null), fix: {lat,lng,acc}, speedHint: 현재 속도(m/s) — 빠를수록 새 값을 더 빨리 따라감
  function filterFix(k, fix, t, speedHint) {
    const acc = Math.max(fix.acc || 999, 3);
    const fresh = { lat: fix.lat, lng: fix.lng, v: acc * acc, t, rejects: 0, used: true };
    if (!k) return fresh;
    const dt = Math.max((t - k.t) / 1000, 0.1);
    if (dist(k, fix) > RULES.GPS_MAX_SPEED_MS * dt + acc + Math.sqrt(k.v)) {
      return k.rejects < 2 ? { ...k, rejects: k.rejects + 1, used: false } : fresh; // 3번 연속이면 진짜 이동으로 인정
    }
    const q = Math.min(Math.max((speedHint || 0) * 1.5 + 1, 1), 10);
    const v = k.v + dt * q * q, g = v / (v + acc * acc);
    return { lat: k.lat + g * (fix.lat - k.lat), lng: k.lng + g * (fix.lng - k.lng), v: v * (1 - g), t, rejects: 0, used: true };
  }
  // ===== 증강 =====  등급은 증강마다 하나로 고정(사기일수록 높음), cd: 쿨타임(분, 30분 게임 기준·게임 시간에 비례)
  const GRADES = ['D', 'C', 'B', 'A', 'S', 'SS'];
  const AUGS = {
    arrowBoost:   { name: '정밀 추적', grade: 'A', role: 'chaser', v: 27, d: v => `화살표 주기 ${augArrowSec(v)}초 (기본 ${RULES.ARROW_EVERY_SEC}초)` },
    distance:     { name: '공간 지각', grade: 'B', role: 'chaser', v: 10, d: v => `화살표에 도망자까지 거리 표시 (${v}m 단위)` },
    clue:         { name: '현장 단서', grade: 'B', role: 'chaser', cd: 3, d: () => '가장 가까운 도망자가 지금 건물 안(GPS 약함)·뛰는 중·걷는 중·멈춤 중 어느 상태인지 알려 줌 (위치는 안 알려 줌)' },
    listen:       { name: '귀 기울이기', grade: 'A', role: 'chaser', cd: 4, v: 30, r: 50, d: v => `${v}초 동안 내 ${AUGS.listen.r}m 안 도망자 수를 계속 표시 (방향 없음)` },
    cordon:       { name: '포위망', grade: 'S', role: 'chaser', cd: 5, v: 60, r: 40, d: v => `지도를 탭한 곳에 반경 ${AUGS.cordon.r}m 포위망. ${v}초 동안 그 안에 들어온 도망자 위치가 보임` },
    iceMine:      { name: '빙결 지뢰', grade: 'B', role: 'chaser', cd: 4, v: 300, r: 8, mode: 'ice', d: v => `내 자리에 안 보이는 지뢰(${v / 60}분). 도망자가 ${AUGS.iceMine.r}m 안에 들어오면 그 자리에서 얼음 (얼음땡 전용)` },
    scanPulse:    { name: '스캔 펄스', grade: 'S', role: 'chaser', cd: 5, r: 100, sp: 33, show: 3, d: () => `내 자리에서 ${AUGS.scanPulse.r}m까지 퍼지는 원. 원에 닿은 도망자 위치가 ${AUGS.scanPulse.show}초 깜빡임` },
    lifeBet:      { name: '목숨 걸기', grade: 'S', role: 'chaser', cd: 5, v: 10, hp: 30, d: v => `체력 ${AUGS.lifeBet.hp}을 바치고 ${v}초 동안 모든 도망자 위치 표시` },
    instinct:     { name: '추격 본능', grade: 'B', role: 'chaser', cd: 4, v: 30, st: 3, d: v => `${v}초 동안 가장 가까운 도망자에게 가까워지는 중이면 스태미나 초당 +${AUGS.instinct.st}` },
    predict:      { name: '예측선', grade: 'A', role: 'chaser', cd: 4, v: 15, d: v => `가장 가까운 도망자가 최근 10초 동안 간 방향을 앞쪽 50m 점선으로 ${v}초 표시 (지금 위치는 안 보임)` },
    quadrant:     { name: '사분면 탐지', grade: 'B', role: 'chaser', cd: 3, v: 15, d: v => `구역을 4조각(북동·북서·남동·남서)으로 나눠 한 조각을 고르면 그 안의 도망자 수를 알려 줌 · 지도에 ${v}초 표시` },
    radar:        { name: '순간 포착', grade: 'S', role: 'chaser', cd: 5, v: 10, d: v => `${v}초 동안 모든 도망자 위치 표시` },
    chaserSt:     { name: '질주 본능', grade: 'B', role: 'chaser', v: 50, d: v => `스태미나 최대치 +${v}, 즉시 가득` },
    freezeFrame:  { name: '정지 화면', grade: 'A', role: 'runner', cd: 4, v: 30, d: v => `${v}초 동안 상대 화면의 내 위치가 지금 자리에 멈춰 보임` },
    escapeRoute:  { name: '도주로', grade: 'C', role: 'runner', cd: 2, v: 20, d: v => `${v}초 동안 미니맵의 가장 가까운 추격자 반대쪽을 가리키는 화살표` },
    insurance:    { name: '보험', grade: 'A', role: 'runner', cd: 5, auto: true, d: () => '다음에 잡힐 때 체력 감소가 절반 (자동, 쓰면 쿨타임)' },
    silent:       { name: '무음 이동', grade: 'B', role: 'runner', cd: 4, v: 60, d: v => `${v}초 동안 심장박동·그림자 밟기·사냥개·귀 기울이기에 안 잡힘` },
    remoteThaw:   { name: '원거리 땡', grade: 'B', role: 'runner', cd: 5, r: 20, mode: 'ice', d: () => `얼음인 팀원을 QR 없이 ${AUGS.remoteThaw.r}m 안에서 땡 (얼음땡 전용)` },
    paintBomb:    { name: '페인트 폭탄', grade: 'A', role: 'all', cd: 5, mode: 'terr', d: () => '내 칸과 둘레 여섯 칸을 바로 우리 색으로 (기지·보호·방어막 칸 빼고)' },
    roller:       { name: '롤러', grade: 'B', role: 'all', cd: 4, v: 30, mode: 'terr', d: v => `${v}초 동안 모든 칸을 1초 만에 칠함` },
    cellShield:   { name: '방어막', grade: 'B', role: 'all', cd: 5, v: 120, mode: 'terr', d: v => `내 칸과 둘레의 우리 칸을 ${v / 60}분 동안 못 덮게 함` },
    eraser:       { name: '지우개', grade: 'A', role: 'all', cd: 5, mode: 'terr', d: () => '내 칸과 둘레의 상대 칸을 빈칸으로 되돌림' },
    scoutDrone:   { name: '정찰 드론', grade: 'B', role: 'all', cd: 4, v: 20, mode: 'terr', d: v => `${v}초 동안 상대 팀 전원 위치 표시` },
    remotePaint:  { name: '원격 페인트', grade: 'S', role: 'all', cd: 6, mode: 'terr', d: () => '지도에서 탭한 칸 하나를 멀리서 칠함 (기지·보호·방어막 칸 빼고)' },
    telepathy:    { name: '텔레파시', grade: 'B', role: 'runner', cd: 4, v: 60, d: v => `팀원 1명을 골라 ${v}초 동안 서로의 실시간 위치를 봄` },
    sacrifice:    { name: '희생', grade: 'S', role: 'runner', cd: 6, v: 60, d: v => `내 체력 절반을 바치고 ${v}초 동안 팀원 전원 무적 (나는 제외)` },
    backtrace:    { name: '역추적', grade: 'B', role: 'runner', cd: 4, v: 120, show: 5, d: v => `켜 두면 ${v / 60}분 안에 나를 탐지한 추격자 위치가 ${AUGS.backtrace.show}초 보임` },
    shelter:      { name: '피난처', grade: 'A', role: 'runner', cd: 6, v: 30, r: 10, heal: 1, d: v => `내 자리에 반경 ${AUGS.shelter.r}m 피난처 ${v}초. 안에 있는 우리 팀 체력 초당 +${AUGS.shelter.heal} (상대에게도 보임)` },
    stealth:      { name: '투명화', grade: 'S', role: 'runner', cd: 4, v: 60, d: v => `${v}초 동안 추격자 화살표에 안 잡힘` },
    alarm:        { name: '육감', grade: 'A', role: 'runner', v: 50, d: v => `추격자가 ${augAlarmM(v)}m 안에 오면 진동` },
    fastIntel:    { name: '고속 스캔', grade: 'A', role: 'runner', v: 10, d: v => `미니맵 추격자 위치 ${augIntelSec(v)}초마다 갱신 (기본 ${RULES.MAP_EVERY_SEC}초)` },
    runnerSt:     { name: '폐활량 증가', grade: 'B', role: 'runner', v: 30, d: v => `스태미나 최대치 +${v}, 즉시 가득` },
    heal:         { name: '응급처치', grade: 'A', role: 'all', cd: 4, v: 30, d: v => `체력 +${v}` },
    stRefill:     { name: '에너지 드링크', grade: 'B', role: 'all', cd: 3, v: 0, d: () => '스태미나 가득 채움' },
    recoverBoost: { name: '활력 충전', grade: 'A', role: 'all', v: 2, d: v => `가만히 있을 때 스태미나 회복 ×${v} (초당 ${RULES.STILL_RECOVER} → ${RULES.STILL_RECOVER * v})` },
    ironman:      { name: '아드레날린', grade: 'B', role: 'all', v: 0.5, d: v => `스태미나 0일 때 뛰어서 깎이는 체력 ${Math.round(v * 100)}%로` },
    insight:      { name: '통찰', grade: 'B', role: 'all', cd: 2, v: 2, d: v => `상대 ${v}명을 골라 증강 보기` },
    lastStand:    { name: '최후의 발악', grade: 'S', role: 'all', cd: 12, auto: true, v: 10, d: v => `체력이 0이 되면 자동 발동: 체력 1로 버티고 ${v}초 동안 1 밑으로 안 내려감` },
    trap:         { name: '덫', grade: 'B', role: 'all', cd: 3, v: 10, life: 300, d: v => `쓴 자리에 안 보이는 덫 설치 (5분). 상대가 ${v}m 안에 오면 위치가 들키고 스태미나 0` },
    decoy:        { name: '분신', grade: 'S', role: 'all', cd: 4, v: 60, ms: 10 / 3.6, d: v => `쓴 자리에 분신을 남기고 ${v}초 동안 조이스틱으로 조종 (민 만큼 빠르게, 최대 시속 10km · 구역 밖으론 못 나감). 상대 화살표·미니맵·순간 포착에 분신 위치가 보임` },
    lightShoes:   { name: '가벼운 신발', grade: 'D', role: 'all', v: 7, d: v => `스태미나가 닳기 시작하는 속도 시속 ${RULES.WALK_KMH}km → ${v}km` },
    whistle:      { name: '호루라기', grade: 'D', role: 'chaser', cd: 2, v: 2, d: v => `가장 가까운 도망자 폰을 ${v}초 진동시켜 겁주기 (정보는 안 줌)` },
    megaphone:    { name: '확성기', grade: 'D', role: 'all', cd: 1, v: 5, d: v => `모든 사람 화면에 20자 메시지를 ${v}초 동안 크게 띄우기` },
    breather:     { name: '숨 고르기', grade: 'C', role: 'all', v: 1, d: () => `멈추자마자 바로 스태미나 회복 (원래는 ${RULES.STILL_SEC}초 기다림)` },
    luck:         { name: '행운', grade: 'C', role: 'all', v: 25, d: v => `증강 지점 획득 거리 ${RULES.SPOT_PICK_M}m → ${v}m` },
    foresight:    { name: '예측', grade: 'C', role: 'chaser', v: 3, d: v => `화살표 보이는 시간 +${v}초` },
    footsteps:    { name: '발자국', grade: 'C', role: 'runner', v: 5, d: () => '미니맵에 추격자 이동 방향도 같이 표시' },
    selfDestruct: { name: '자폭', grade: 'C', role: 'all', cd: 5, v: 30, r: 20, d: v => `내 체력이 절반이 되고, 반경 ${AUGS.selfDestruct.r}m 안 상대 전원 체력 -${v} (무적인 도망자는 제외)` },
    domain:       { name: '영역전개', grade: 'SS', role: 'all', cd: 6, v: 40, sec: 30, walk: 3, mult: 5, d: v => `쓴 자리에 반경 ${augDomainM(v)}m 영역 30초 (구역 300m 기준 40m, 구역 크기에 비례). 안에 들어온 상대는 걷기만 해도 초당 3, 뛰면 5배로 스태미나 소모` },
    mugung:       { name: '무궁화 꽃이 피었습니다', grade: 'S', role: 'chaser', cd: 6, v: 10, warn: 4.3, ms: 1, reveal: 20, d: v => `도망자에게 노래로 약 4초 예고 후 ${v}초 판정. 그동안 초속 1m 넘게 움직인 도망자는 스태미나 0 + 20초 동안 추격자 전원에게 위치 공개` },
    shake:        { name: '흔들어 탈출', grade: 'B', role: 'runner', cd: 3, auto: true, v: 50, win: 3, n: 3, inv: 10, d: v => `잡힌 뒤 3초 안에 폰을 세게 3번 흔들면 ${v}% 확률로 잡기 취소 + 10초 무적 (흔들면 쿨타임 시작)` },
    jam:          { name: '나침반 교란', grade: 'A', role: 'runner', cd: 4, v: 30, d: v => `${v}초 동안 모든 추격자 화살표가 엉뚱한 방향을 가리킴` },
    counterIntel: { name: '역탐지', grade: 'B', role: 'runner', v: 5, d: v => `추격자가 화살표·순간 포착으로 나를 보면 알림 + 그 추격자 위치 ${v}초 표시` },
    wanted:       { name: '현상수배', grade: 'A', role: 'chaser', cd: 4, v: 30, d: v => `도망자 1명을 골라 ${v}초 동안 추격자 전원 지도에 진짜 위치 공개 (투명화·분신·자리 바꾸기 무시)` },
    eavesdrop:    { name: '도청', grade: 'C', role: 'all', v: 1, d: () => '상대 팀 핑도 내 지도에 보이고, 상대 팀 대화방 글도 보임' },
    swap:         { name: '자리 바꾸기', grade: 'A', role: 'runner', cd: 4, v: 30, d: v => `팀원 1명을 골라 ${v}초 동안 상대 화면에서 서로 위치가 바뀌어 보임` },
    fakeTreasure: { name: '가짜 보물', grade: 'B', role: 'all', cd: 3, v: 300, d: () => '쓴 자리에 상대에게만 보이는 가짜 증강 지점 (5분). 밟은 상대는 스태미나 0 + 30초 동안 나에게 위치가 들킴' },
    magnet:       { name: '자석', grade: 'C', role: 'all', cd: 2, v: 50, d: v => `가장 가까운 증강 지점을 내 쪽으로 ${v}m 끌어옴` },
    timeThief:    { name: '시간 도둑', grade: 'S', role: 'all', cd: 8, v: 2, d: v => `도망자가 쓰면 남은 시간 -${v}분, 추격자가 쓰면 +${v}분 (1분 밑으로는 안 줄어듦)` },
    ink:          { name: '먹물', grade: 'B', role: 'all', cd: 2, v: 10, d: v => `가장 가까운 상대의 지도를 ${v}초 동안 먹물로 가림` },
    companion:    { name: '동행', grade: 'A', role: 'runner', v: 15, d: v => `팀원과 ${v}m 안에 붙어 있으면 나와 그 팀원 모두 스태미나 소모 절반` },
    shield:       { name: '쉴드', grade: 'S', role: 'runner', cd: 8, auto: true, v: 0, d: () => '잡힐 때 자동 발동: 체력이 안 깎임 (정지·무적은 그대로)' },
    counter:      { name: '카운터', grade: 'S', role: 'runner', cd: 6, v: 30, dmg: 40, d: v => `${v}초 안에 잡히면 잡은 추격자 체력 -40` },
    taunt:        { name: '도발', grade: 'C', role: 'runner', cd: 3, v: 5, d: v => `추격자 전원에게 내 위치 ${v}초 공개, 대신 스태미나 가득 + 체력 +20` },
    storm:        { name: '자기장', grade: 'SS', role: 'chaser', cd: 8, v: 120, d: v => `${v / 60}분 동안 구역이 점점 줄어 절반이 됨. 밖에 있는 도망자는 경고 뒤 체력 감소` },
    siren:        { name: '사이렌', grade: 'B', role: 'chaser', cd: 3, v: 3, d: v => `모든 도망자 폰에서 ${v}초 동안 큰 사이렌 + 진동 (숨어 있으면 소리로 들킴)` },
    cctv:         { name: 'CCTV', grade: 'B', role: 'chaser', cd: 3, v: 30, life: 300, d: v => `쓴 자리에 안 보이는 CCTV (5분). 도망자가 ${v}m 안에 들어올 때마다 추격자 전원에게 알림 + 위치 10초` },
    trail:        { name: '발자국 추적', grade: 'A', role: 'chaser', cd: 4, v: 30, delay: 15, d: v => `${v}초 동안 가장 가까운 도망자의 진짜 이동 경로가 15초 늦게 보임 (투명화 중엔 끊김)` },
    steal:        { name: '소매치기', grade: 'S', role: 'all', cd: 8, v: 20, d: v => `${v}m 안 상대의 증강 하나를 무작위로 빼앗음` },
    copy:         { name: '복제', grade: 'A', role: 'all', cd: 6, v: 0, d: () => '상대 한 명을 골라 그 사람의 증강 하나를 골라 복사' },
    silence:      { name: '침묵', grade: 'A', role: 'all', cd: 4, v: 60, d: v => `가장 가까운 상대의 '사용' 스킬을 ${v / 60}분 동안 봉인` },
    runnersHigh:  { name: '러너스 하이', grade: 'C', role: 'all', v: 500, heal: 10, d: v => `${v}m 움직일 때마다 체력 +10` },
    booster:      { name: '부스터', grade: 'B', role: 'all', cd: 3, v: 15, d: v => `${v}초 동안 스태미나가 안 닳음` },
    fakePing:     { name: '위조 핑', grade: 'C', role: 'all', cd: 2, v: 0, d: () => '상대 팀 지도에 그 팀원이 찍은 것처럼 보이는 가짜 핑을 띄움' },
    detector:     { name: '탐지기', grade: 'D', role: 'all', cd: 1, v: 50, sec: 15, d: v => `15초 동안 주변 ${v}m 안 상대 덫·가짜 보물·CCTV 표시` },
    comeback:     { name: '기사회생', grade: 'SS', role: 'all', cd: 12, auto: true, v: 50, d: v => `체력이 0이 되면 자동 발동: 체력 ${v}으로 살아남 (최후의 발악보다 먼저)` },
    bloodOath:    { name: '피의 서약', grade: 'S', role: 'runner', cd: 8, v: 20, d: v => `탈락한 팀원의 부활용 QR을 찍으면(${v}m 안) 내 체력 절반을 나눠 주고 부활시킴` },
    supply:       { name: '보급 상자', grade: 'S', role: 'all', cd: 8, v: 60, pub: 30, d: v => `${v / 60}분 뒤 구역 안 어딘가에 SS 확정 상자가 떨어짐. 떨어질 자리는 나만 먼저 보고, 떨어지고 30초 뒤 모두에게 공지` },
    gamble:       { name: '도박', grade: 'D', role: 'all', cd: 3, v: 50, d: v => `${v}% 확률로 무작위 증강 하나 얻기, 아니면 내 증강 하나 잃기` },
    reroll:       { name: '리롤', grade: 'C', role: 'all', cd: 3, v: 0, d: () => '내 증강 하나를 골라 같은 등급의 다른 증강으로 바꿈' },
    alchemy:      { name: '연금술', grade: 'A', role: 'all', cd: 5, v: 0, d: () => '내 증강 2개를 버리고, 둘 중 높은 등급보다 한 등급 위 증강 1개 얻기 (SS는 SS)' },
    mirror:       { name: '거울', grade: 'A', role: 'runner', cd: 5, auto: true, v: 0, d: () => '나를 노린 상대 스킬 1번을 자동으로 되돌림 (먹물·침묵·저격·소매치기·현상수배·발자국 추적·위치 추적기)' },
    smoke:        { name: '연막탄', grade: 'B', role: 'runner', cd: 3, v: 25, sec: 45, d: v => `쓴 자리 반경 ${v}m 연막 ${AUGS.smoke.sec}초. 안에 있는 도망자는 화살표·순간 포착에 안 잡힘` },
    exit:         { name: '비상구', grade: 'C', role: 'runner', cd: 3, v: 30, d: v => `${v}초 동안 구역 밖에 나가도 체력이 안 깎임` },
    disguise:     { name: '위장', grade: 'A', role: 'runner', cd: 4, v: 30, d: v => `${v}초 동안 상대 지도에서 내가 추격자처럼 보임 (화살표는 그대로)` },
    doppel:       { name: '도플갱어', grade: 'S', role: 'runner', cd: 5, v: 30, ms: 1.5, d: v => `분신이 고른 방향으로 ${v}초 동안 걸어감. 화살표·미니맵·순간 포착이 분신을 따라감` },
    hideout:      { name: '은신처', grade: 'A', role: 'runner', cd: 4, v: 10, sec: 60, hp: 1, st: 3, d: v => `지금 자리를 1분 동안 은신처로. 반경 ${v}m 안에서 가만히 있으면 체력 +1/초 · 스태미나 +3/초` },
    tracker:      { name: '위치 추적기', grade: 'B', role: 'chaser', cd: 3, v: 15, sec: 120, every: 20, d: v => `${v}m 안 도망자에게 붙이면 2분 동안 20초마다 추격자 전원 지도에 위치가 찍힘` },
    blackout:     { name: '블랙아웃', grade: 'S', role: 'chaser', cd: 6, v: 30, d: v => `${v}초 동안 모든 도망자의 미니맵(추격자 위치)·증강 지점·핑이 꺼짐` },
    vampire:      { name: '흡혈', grade: 'A', role: 'chaser', v: 20, d: v => `잡을 때마다 체력 +${v}` },
    chain:        { name: '연쇄', grade: 'S', role: 'chaser', v: 60, d: v => `잡은 뒤 제자리 정지 시간 ${fmtSec(RULES.CATCH_COOLDOWN_SEC)} → ${fmtSec(Math.min(v, RULES.CATCH_COOLDOWN_SEC))}` },
    snipe:        { name: '저격', grade: 'S', role: 'chaser', cd: 5, v: 40, dmg: 20, aim: 10, d: v => `폰을 도망자 쪽으로 겨눠(±10°, 가까우면 GPS 오차만큼 최대 ±35°) 쏘면 ${v}m 안 도망자 체력 -20 (빗나가도 쿨타임)` },
    // ---- 추가 능력 12개 ----
    drone:        { name: '드론', grade: 'A', role: 'chaser', cd: 4, v: 30, ms: 20 / 3.6, r: 20, d: v => `${v}초 동안 조이스틱으로 드론 조종 (민 만큼 빠르게, 최대 시속 20km · 구역 밖으론 못 나감). 드론 ${AUGS.drone.r}m 안의 도망자가 내 지도에 보임 (도망자에게도 드론이 보임)` },
    hound:        { name: '사냥개', grade: 'A', role: 'chaser', cd: 4, v: 60, ms: 8 / 3.6, show: 10, d: v => `가장 가까운 도망자를 사냥개가 시속 8km로 최대 ${v}초 쫓아감. 닿으면 그 도망자 위치가 추격자 모두에게 ${AUGS.hound.show}초 보임 (도망자에게도 개가 보임)` },
    blockade:     { name: '봉쇄선', grade: 'S', role: 'chaser', cd: 6, v: 60, len: 100, d: v => `지도에서 두 점을 찍어 최대 ${AUGS.blockade.len}m 선을 그음 (모두에게 보임). ${v}초 동안 선을 넘은 도망자는 스태미나 0 + 추격자 모두에게 위치 30초 공개` },
    net:          { name: '그물', grade: 'B', role: 'chaser', cd: 3, v: 15, life: 180, d: v => `쓴 자리 반경 ${v}m에 그물 (3분, 상대에겐 안 보임). 그물 안의 도망자는 뛰면 스태미나 대신 체력이 닳음 (5초 경고 뒤)` },
    altScan:      { name: '고도 탐지기', grade: 'B', role: 'chaser', cd: 3, v: 10, d: v => `${v}초 동안 거리와 상관없이 가장 가까운 도망자가 나보다 몇 m 위·아래인지 표시 (GPS 고도)` },
    afterimage:   { name: '잔상', grade: 'A', role: 'runner', cd: 4, v: 30, lag: 10, d: v => `${v}초 동안 상대 화살표·미니맵·탐지에 내 위치가 ${AUGS.afterimage.lag}초 늦게 보임` },
    spyCam:       { name: '감시 카메라', grade: 'B', role: 'runner', cd: 3, v: 20, life: 300, d: v => `쓴 자리에 카메라 (5분, 상대에겐 안 보임). 반경 ${v}m 안에 추격자가 들어오면 우리 팀에 알림 + 위치 10초 표시` },
    radioJam:     { name: '전파 방해', grade: 'A', role: 'runner', cd: 4, v: 20, d: v => `${v}초 동안 추격자 탐지 증강이 안 먹힘 (순간 포착·CCTV·위치 추적기·드론·고도 탐지기·발자국 추적·심장박동·그림자 밟기, 화살표는 그대로)` },
    cheer:        { name: '응원', grade: 'B', role: 'runner', cd: 3, v: 15, r: 30, d: v => `${AUGS.cheer.r}m 안의 팀원 체력 +${v} (나는 회복 안 됨)` },
    altFake:      { name: '높이 위장', grade: 'C', role: 'runner', cd: 2, v: 60, d: v => `${v}초 동안 추격자 화살표·고도 탐지기에 내 높이가 반대(▲↔▼)로 보임` },
    fog:          { name: '안개', grade: 'A', role: 'all', cd: 4, v: 45, d: v => `${v}초 동안 상대 팀 지도가 뿌옇게 흐려지고, 그동안 상대 화살표·미니맵 갱신이 멈춤` },
    bounty:       { name: '현상금', grade: 'C', role: 'all', v: 1, d: () => '다음에 잡거나(추격자), 잡혀도 살아남거나 흔들어 탈출하면(도망자) 증강 1개 더 · 한 번 쓰면 사라짐' },
    rps:          { name: '가위바위보', grade: 'S', role: 'runner', cd: 5, auto: true, v: 5, freeze: 30, rounds: 3, inv: 10, d: v => `잡히면 자동으로 추격자와 가위바위보 (각자 ${v}초 안에 고름, 비기면 최대 3번). 이기면 잡기 취소 + 추격자 ${AUGS.rps.freeze}초 정지, 지면 그대로 잡힘` },
    heartbeat:    { name: '심장박동', grade: 'B', role: 'chaser', cd: 3, v: 30, r: 80, near: 10, d: v => `${v}초 동안 가장 가까운 도망자가 ${AUGS.heartbeat.r}m 안이면 폰이 심장처럼 뛰고, 가까울수록 빨라짐 (${AUGS.heartbeat.near}m 안에서 가장 빠름 · 화면 테두리도 같이 뜀)` },
    shadowStep:   { name: '그림자 밟기', grade: 'A', role: 'chaser', cd: 4, v: 60, back: 20, r: 30, hitR: 5, stop: 5, ms: 1, dmg: 20, d: v => `${v}초 동안 ${AUGS.shadowStep.r}m 안 도망자의 ${AUGS.shadowStep.back}초 전 자리(그림자)가 보임. 그림자를 밟으면 그 도망자는 ${AUGS.shadowStep.stop}초 동안 멈춰야 하고, 움직이면 체력 -${AUGS.shadowStep.dmg} (도망자마다 한 번)` },
    timeBomb:     { name: '시한폭탄', grade: 'B', role: 'all', cd: 5, v: 60, r: 10, dmg: 30, max: 3, d: v => `내가 폭탄을 들고 시작. ${AUGS.timeBomb.r}m 안에 사람이 오면 가장 가까운 사람에게 자동으로 넘어감 (팀원도 · 방금 준 사람에겐 못 줌). 넘길 때마다 ${v}초 다시, ${AUGS.timeBomb.max}번째로 받은 사람은 바로 폭발. 시간이 다 되면 들고 있는 사람 체력 -${AUGS.timeBomb.dmg}` },
    mapFlip:      { name: '지도 뒤집기', grade: 'A', role: 'all', cd: 4, v: 20, d: v => `${v}초 동안 상대 팀 지도가 위아래로 뒤집힘` },
    rumor:        { name: '소문', grade: 'B', role: 'all', cd: 3, d: () => '상대 팀 중 무작위 1명이 구역 4조각 중 어디 있는지 모두에게 공지' },
    timeStop:     { name: '시간 정지', grade: 'SS', role: 'all', cd: 8, v: 15, d: v => `${v}초 동안 상대 팀의 화살표·미니맵이 멈추고 능력을 못 씀 (쿨타임도 그만큼 밀림)` },
    rain:         { name: '소나기', grade: 'S', role: 'all', cd: 6, v: 60, d: v => `${v}초 동안 상대 팀 스태미나 소모 2배, 우리 팀은 1.5배` },
    goldenTime:   { name: '골든 타임', grade: 'SS', role: 'all', cd: 30, v: 30, d: v => `남은 시간 5분 이하일 때만. ${v}초 동안 우리 팀 전원 스태미나 무한` },
    bloodPrice:   { name: '피의 대가', grade: 'A', role: 'all', cd: 5, hp: 20, d: () => `체력 ${AUGS.bloodPrice.hp}을 바치고 다른 능력 쿨타임을 전부 끝냄` },
    frenzy:       { name: '폭주', grade: 'B', role: 'all', cd: 3, v: 30, d: v => `스태미나를 전부 바치고 바친 만큼 체력 회복 (최대 ${v})` },
    allIn:        { name: '도박수', grade: 'S', role: 'all', cd: 8, v: 30, d: v => `${v}초 동안 내 실제 위치가 상대에게 공개. 끝까지 살아 있으면 랜덤 증강 1개` },
    teamChat:     { name: '팀 대화방', grade: 'B', role: 'all', cd: 5, v: 180, len: 30, d: v => `${v / 60}분 동안 우리 팀 대화방이 열림 (팀원 모두 글 최대 ${AUGS.teamChat.len}자 + 빠른 문장). 상대가 도청을 가지고 있으면 엿볼 수 있음` },
    // ---- 추격자 기본 스킬 (게임 시작 때 모든 추격자에게, 방장이 정한 횟수) ----
    trackNow:     { name: '즉시 추적', grade: 'B', role: 'base', cd: 3, v: 10, d: v => `누르는 순간 화살표 ${v}초 + 거리 표시 (판마다 ${RULES.TRACK_USES}회)` },
    mapHide:      { name: '미니맵 숨기기', grade: 'B', role: 'chaser', cd: 3, v: 30, d: v => `${v}초 동안 도망자 미니맵에 내 위치가 안 보임` }, // 예전 기본 스킬 → 일반 증강
    // ---- 마피아 모드 직업 능력 (게임 시작·저격총 줍기로만 얻음) ----
    mfCheck:      { name: '조사', grade: 'A', role: 'job', cd: 3, v: 0, d: () => '1명을 골라 마피아인지 시민인지 확인 (나만 봄)' },
    mfRifle:      { name: '저격총', grade: 'S', role: 'job', cd: 5, v: 40, aim: 10, d: v => `폰을 겨눠(±10°, 가까우면 GPS 오차만큼 최대 ±35°) ${v}m 안 사람을 쏨. 마피아면 그 마피아만 탈락, 아니면 맞은 사람과 나 둘 다 탈락 (빗나가도 쿨타임). 내가 죽으면 그 자리에 떨어져 시민이 주우면 새 경찰` },
    mfGuard:      { name: '보호', grade: 'A', role: 'job', cd: 5, v: 300, d: v => `QR을 찍은 사람(또는 나)을 ${v / 60}분 동안 보호: 그동안 마피아에게 잡혀도 1번 막음` }
  };
  // 마피아 모드에서 나오는 증강: 누가 써도 팀(정체)이 드러나지 않는 공통 증강만
  // (빠짐: 통찰·덫·자폭·영역전개·도청·위조 핑·가짜 보물·시간 도둑·먹물·소매치기·복제·침묵·안개·탐지기·분신·현상금)
  const MF_AUGS = ['heal', 'stRefill', 'recoverBoost', 'ironman', 'lastStand', 'lightShoes', 'megaphone', 'breather', 'luck', 'magnet', 'runnersHigh', 'booster', 'comeback', 'supply', 'gamble', 'reroll', 'alchemy'];
  // 정밀 추적·고속 스캔은 방장이 정한 기본 주기에 비례 (기본값 40초·20초 기준 수치)
  const augArrowSec = v => Math.max(15, Math.round(v * RULES.ARROW_EVERY_SEC / RULE_DEFAULTS.ARROW_EVERY_SEC));
  // 육감 거리는 구역 반경에 비례 (300m 기준 수치), 15~200m
  const augAlarmM = v => Math.min(200, Math.max(15, Math.round(v * RULES.AREA_R / RULE_DEFAULTS.AREA_R)));
  // 영역전개 반경도 구역 반경에 비례 (300m 기준 수치), 15~150m
  const augDomainM = v => Math.min(150, Math.max(15, Math.round(v * RULES.AREA_R / RULE_DEFAULTS.AREA_R)));
  const augIntelSec = v => Math.max(3, Math.round(v * RULES.MAP_EVERY_SEC / RULE_DEFAULTS.MAP_EVERY_SEC));
  const fmtSec = sec => { sec = Math.round(sec); const m = Math.floor(sec / 60), r = sec % 60; return m ? `${m}분${r ? ` ${r}초` : ''}` : `${r}초`; };
  const augCdMs = id => (AUGS[id].cd ? AUGS[id].cd * 60000 * RULES.GAME_SEC / RULE_DEFAULTS.GAME_SEC : 0);
  const augDesc = id => AUGS[id].d(AUGS[id].v) + (AUGS[id].cd ? ` · 쿨타임 ${fmtSec(augCdMs(id) / 1000)}` : '');
  const augPool = role => Object.keys(AUGS).filter(id => AUGS[id].role === role || AUGS[id].role === 'all');
  // 이미 가진 증강은 다시 안 나옴. 등급 확률로 등급을 고르고(남은 증강이 있는 등급만), 그 등급 안에서 무작위
  // ban: 지금 상황에서 쓸 수 없는 증강 (예: 살아 있는 팀원이 없으면 자리 바꾸기)
  function rollAug(role, owned, rnd = Math.random, ban) {
    const free = augPool(role).filter(id => !(owned || {})[id] && !(ban || []).includes(id));
    const grades = GRADES.filter(g => (RULES.GRADE_ODDS[g] || 0) > 0 && free.some(id => AUGS[id].grade === g));
    if (!grades.length) return null;
    let r = rnd() * grades.reduce((sum, g) => sum + RULES.GRADE_ODDS[g], 0), pick = grades[grades.length - 1];
    for (const g of grades) { if (r < RULES.GRADE_ODDS[g]) { pick = g; break; } r -= RULES.GRADE_ODDS[g]; }
    const list = free.filter(id => AUGS[id].grade === pick);
    return list[Math.floor(rnd() * list.length)];
  }
  function rollOffer(role, owned, rnd = Math.random, ban) {
    const taken = { ...(owned || {}) }, out = [];
    while (out.length < 3) { const id = rollAug(role, taken, rnd, ban); if (!id) break; out.push(id); taken[id] = 1; }
    return out;
  }
  function addAug(augs, id, t) {
    if ((augs || {})[id]) return { augs, dup: true };
    return { augs: { ...(augs || {}), [id]: { got: t || 1 } }, dup: false };
  }
  const augVal = (augs, id) => ((augs || {})[id] ? AUGS[id].v : null);
  const augReady = (x, now) => !!x && (x.readyAt || 0) <= now;
  // 시간 도둑: 바뀐 뒤의 timeShift(ms). 도망자 -mins분 / 추격자 +mins분, 남은 시간은 1분 밑으로 안 줄임. 못 줄이면 null
  function stealTime(role, shift, now, startAt, mins) {
    const end = startAt + (RULES.HIDE_SEC + RULES.GAME_SEC) * 1000 + (shift || 0);
    if (role === 'chaser') return (shift || 0) + mins * 60000;
    const newEnd = Math.max(end - mins * 60000, now + 60000);
    return newEnd < end ? (shift || 0) - (end - newEnd) : null;
  }
  // 자기장: 쓰고 나서 v초 동안 구역 반경이 원래 → 절반으로 점점 줄어듦, 끝나면 원래대로
  function stormR(r, storm, now) {
    if (!storm || now < storm.at || now >= storm.until) return r;
    return r * (1 - 0.5 * (now - storm.at) / (storm.until - storm.at));
  }
  // 저격: heading(폰이 가리키는 방향)에서 ±aim° 안, range m 안에 있는 살아 있고 무적이 아닌 도망자 중 가장 가까운 사람 (진짜 위치)
  // 저격 허용 각도: 기본 ±aim°, 가까울수록 GPS 오차(두 폰 오차 합, 최대 30m)를 덮을 만큼 넓게, 최대 ±35°
  const aimAt = (d, a, b, aim) => Math.min(35, Math.max(aim, Math.atan2(Math.min(30, accOf(a) + accOf(b)), Math.max(d, 1)) * 180 / Math.PI));
  // 마피아 모드 경찰 저격총: 나 말고 살아 있는 누구든 (가장 가까운 사람)
  function aimTarget(pos, heading, players, hits, now, selfId, range, aim) {
    let best = null;
    for (const [id, p] of Object.entries(players || {})) {
      if (id === selfId || !p.role || p.lat == null || !alive(p, (hits || {})[id])) continue;
      const d = dist(pos, p), off = Math.abs(((bearing(pos, p) - heading) % 360 + 540) % 360 - 180);
      if (d <= range && off <= aimAt(d, pos, p, aim) && (!best || d < best.d)) best = { id, d, off };
    }
    return best;
  }
  // 마피아 모드: 시민 중에서 경찰·의사
  function assignJobs(roles, nPolice, nDoctor, rnd = Math.random) {
    const c = Object.keys(roles).filter(id => roles[id] === 'runner'), jobs = {};
    for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; }
    c.slice(0, nPolice).forEach(id => { jobs[id] = 'police'; });
    c.slice(nPolice, nPolice + nDoctor).forEach(id => { jobs[id] = 'doctor'; });
    return jobs;
  }
  // 투표: 시작 5분마다 1분 동안 (k번째), 마지막으로 끝난 투표 번호
  function voteRound(now, startAt, shift = 0) {
    const E = MODE_RULES.MF_VOTE_EVERY * 1000, W = MODE_RULES.MF_VOTE_SEC * 1000, el = now - startAt;
    const end = startAt + (RULES.HIDE_SEC + RULES.GAME_SEC) * 1000 + (shift || 0), k = Math.max(0, Math.floor(el / E));
    const open = k >= 1 && el - k * E < W && startAt + k * E < end, next = startAt + (k + 1) * E;
    const lastEnded = el - W >= E ? Math.floor((el - W) / E) : 0;
    return { k, open, endsAt: startAt + k * E + W, next: next < end ? next : null, lastEnded: lastEnded && startAt + lastEnded * E < end ? lastEnded : 0 };
  }
  // 투표 결과: 살아 있는 사람의 표만, 최다 득표가 1명이면 추방 (동점·기권만이면 없음)
  // 가위바위보: r 바위·s 가위·p 보. 못 고른 사람이 짐 (둘 다 못 고르면 비김)
  function rpsWinner(runner, chaser) {
    if (!runner && !chaser) return 'draw';
    if (!runner) return 'chaser';
    if (!chaser) return 'runner';
    if (runner === chaser) return 'draw';
    return { r: 's', s: 'p', p: 'r' }[runner] === chaser ? 'runner' : 'chaser';
  }
  function voteResult(v, aliveIds) {
    const ok = new Set(aliveIds), cnt = {}; let n = 0;
    for (const [voter, tg] of Object.entries(v || {})) { if (!ok.has(voter) || !ok.has(tg)) continue; cnt[tg] = (cnt[tg] || 0) + 1; n++; }
    const top = Math.max(0, ...Object.values(cnt)), tops = Object.keys(cnt).filter(id => cnt[id] === top);
    return { out: top > 0 && tops.length === 1 ? tops[0] : null, top, n, tie: top > 0 && tops.length > 1 };
  }
  function snipeTarget(pos, heading, players, hits, now, range = AUGS.snipe.v, aim = AUGS.snipe.aim) {
    let best = null;
    for (const [id, p] of Object.entries(players || {})) {
      if (p.role !== 'runner' || p.lat == null) continue;
      const h = (hits || {})[id];
      if (!alive(p, h) || ((h && h.invUntil) || 0) > now) continue;
      const d = dist(pos, p), off = Math.abs(((bearing(pos, p) - heading) % 360 + 540) % 360 - 180);
      if (d <= range && off <= aimAt(d, pos, p, aim) && (!best || d < best.d)) best = { id, d, off };
    }
    return best;
  }
  // 리롤·연금술·보급 상자: 정해진 등급 안에서 무작위 (내 역할이 쓸 수 있고 없는 것, exclude 제외)
  function rollGrade(role, owned, grade, rnd = Math.random, exclude = []) {
    const list = augPool(role).filter(id => AUGS[id].grade === grade && !(owned || {})[id] && !exclude.includes(id));
    return list.length ? list[Math.floor(rnd() * list.length)] : null;
  }
  // 연금술: 둘 중 높은 등급 +1 (SS는 SS)
  const upGrade = (a, b) => GRADES[Math.min(GRADES.length - 1, Math.max(GRADES.indexOf(AUGS[a].grade), GRADES.indexOf(AUGS[b].grade)) + 1)];
  // 소매치기·복제로 가져올 수 있는 증강: 상대가 가진 것 중 내 역할이 쓸 수 있고 내가 아직 없는 것
  const takeable = (theirs, myRole, mine) => Object.keys(theirs || {}).filter(id => AUGS[id] && (AUGS[id].role === myRole || AUGS[id].role === 'all') && !(mine || {})[id]);
  // 자석: from을 to 쪽으로 m미터 (넘으면 to에 딱 붙음)
  function pullToward(from, to, m) {
    const d = dist(from, to), k = d > 0 ? Math.min(1, m / d) : 1;
    return { lat: from.lat + (to.lat - from.lat) * k, lng: from.lng + (to.lng - from.lng) * k };
  }
  // 구역 안(가장자리 15% 제외) 아무 곳
  function randomSpot(area, rnd = Math.random) {
    if (area.poly) { // 꼭짓점 구역: 안쪽이면서 경계에서 조금 떨어진 곳
      const v = polyXY(area), xs = v.map(a => a[0]), ys = v.map(a => a[1]);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), gap = Math.min(15, area.r * 0.1);
      let any = null;
      for (let i = 0; i < 300; i++) {
        const p = fromXY(x0 + (x1 - x0) * rnd(), y0 + (y1 - y0) * rnd(), area);
        if (!inArea(p, area)) continue;
        if (polyGap(p, area) >= gap) return p;
        any = any || p;
      }
      return any || { lat: area.lat, lng: area.lng };
    }
    const r = area.r * 0.85 * Math.sqrt(rnd()), th = rnd() * 2 * Math.PI;
    return { lat: area.lat + r * Math.cos(th) / 111195, lng: area.lng + r * Math.sin(th) / (111195 * Math.cos(rad(area.lat))) };
  }
  // 증강 지점이 너무 오래 안 먹혔는지: 나타난 때(at, 처음 지점은 게임 시작)부터 SPOT_STALE_SEC(게임 시간 비례)
  const spotStaleMs = () => RULES.SPOT_STALE_SEC * 1000 * RULES.GAME_SEC / RULE_DEFAULTS.GAME_SEC;
  const spotStale = (sp, startAt, now) => now - Math.max(sp.at || 0, startAt || 0) >= spotStaleMs();
  // 구역 안 새 자리, 원래 자리에서 SPOT_MOVE_M보다 멀리 (구역이 작아 못 찾으면 가장 먼 곳)
  function moveSpot(area, old, rnd = Math.random) {
    let best = null;
    for (let i = 0; i < 40; i++) {
      const p = randomSpot(area, rnd), d = dist(p, old);
      if (d > RULES.SPOT_MOVE_M) return p;
      if (!best || d > best.d) best = { p, d };
    }
    return best.p;
  }
  // ===== 게임 설정 추천값: 반경(r)·인원(n)·추격자 수 기준 =====
  function interp(table, x) {
    if (x <= table[0][0]) return table[0][1];
    for (let i = 1; i < table.length; i++) {
      const [x1, y1] = table[i], [x0, y0] = table[i - 1];
      if (x <= x1) return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
    }
    return table[table.length - 1][1];
  }
  const roundTo = (v, step) => Math.round(v / step) * step;
  function recommend(r, n, chasers) {
    const c = Math.max(1, chasers), runners = Math.max(1, n - c);
    const gameMin = Math.min(60, Math.max(15, roundTo(interp([[100, 20], [300, 30], [600, 40], [1000, 50]], r) * Math.sqrt(runners / c), 5)));
    // 도망자 미니맵 갱신은 반경에 따라, 추격자 화살표는 그 2배 (300m: 20초·40초)
    const map = Math.max(10, roundTo(interp([[100, 35], [300, 20], [600, 15], [1000, 10]], r), 5)), arrow = map * 2;
    return {
      HIDE_SEC: roundTo(interp([[100, 120], [300, 300], [600, 480], [1000, 600]], r), 30),
      GAME_SEC: gameMin * 60,
      ARROW_UNLOCK_SEC: RULE_DEFAULTS.ARROW_UNLOCK_SEC,
      ARROW_EVERY_SEC: arrow,
      MAP_EVERY_SEC: map,
      CATCH_DMG: RULE_DEFAULTS.CATCH_DMG,
      CATCH_COOLDOWN_SEC: RULE_DEFAULTS.CATCH_COOLDOWN_SEC,
      WAIT_MOVE_DMG: RULE_DEFAULTS.WAIT_MOVE_DMG,
      ST_RUNNER: RULE_DEFAULTS.ST_MAX.runner,
      ST_CHASER: RULE_DEFAULTS.ST_MAX.chaser,
      ST_MUL: RULE_DEFAULTS.ST_MUL,
      AUG_ON: 1,
      SPOT_COUNT: Math.min(6, Math.max(2, Math.ceil(n / 2)) + (r > 600 ? 1 : 0)),
      AUG_EVERY_SEC: gameMin * 60 / 3,
      MF_POLICE: n >= 4 ? 1 : 0,
      MF_DOCTOR: n >= 5 ? 1 : 0,
      TRACK_USES: RULE_DEFAULTS.TRACK_USES, ICE_SELF_USES: RULE_DEFAULTS.ICE_SELF_USES
    };
  }
  // 추천값에 방장이 직접 바꾼 칸을 덮어쓴 최종 설정.
  // 화살표 주기 ≈ 미니맵 갱신 × 2: 한쪽만 직접 바꾸면 다른 쪽이 따라감. 보상 간격(게임 시간 ÷ 3)도 직접 안 바꿨다면 최종 게임 시간을 따라감
  function mergeSettings(rec, cur, custom) {
    cur = cur || {}; custom = custom || {};
    const out = {};
    for (const k of Object.keys(rec)) out[k] = custom[k] && cur[k] != null ? cur[k] : rec[k];
    if (custom.ARROW_EVERY_SEC && !custom.MAP_EVERY_SEC) out.MAP_EVERY_SEC = Math.max(10, roundTo(out.ARROW_EVERY_SEC / 2, 5));
    if (custom.MAP_EVERY_SEC && !custom.ARROW_EVERY_SEC) out.ARROW_EVERY_SEC = Math.min(180, Math.max(15, out.MAP_EVERY_SEC * 2));
    if (!custom.AUG_EVERY_SEC) out.AUG_EVERY_SEC = out.GAME_SEC / 3;
    return out;
  }
  // 방에 저장된 설정을 RULES에 적용 (없는 값은 기본값)
  const SETTING_KEYS = ['HIDE_SEC', 'GAME_SEC', 'ARROW_UNLOCK_SEC', 'ARROW_EVERY_SEC', 'MAP_EVERY_SEC', 'CATCH_DMG', 'CATCH_COOLDOWN_SEC', 'WAIT_MOVE_DMG', 'SPOT_COUNT', 'AUG_EVERY_SEC', 'AUG_ON', 'ST_MUL', 'MF_POLICE', 'MF_DOCTOR', 'TRACK_USES', 'ICE_SELF_USES'];
  function applySettings(g) {
    g = g || {};
    for (const k of SETTING_KEYS) RULES[k] = g[k] ?? RULE_DEFAULTS[k];
    RULES.ST_MAX = { runner: g.ST_RUNNER ?? RULE_DEFAULTS.ST_MAX.runner, chaser: g.ST_CHASER ?? RULE_DEFAULTS.ST_MAX.chaser };
  }
  // ===== 결과 통계 =====
  // 생존 시간: 게임 시작부터 탈락(또는 게임 끝)까지
  const survivalMs = (p, startAt, endAt) => Math.max(0, Math.min((p.stats && p.stats.diedAt) || endAt, endAt) - startAt);
  // MVP: 추격자는 가장 많이 잡은 사람, 도망자는 가장 오래 버틴 사람 (동점이면 더 많이 뛴 사람)
  function mvp(players, startAt, endAt) {
    const list = Object.entries(players || {}).filter(([, p]) => p.role), best = {};
    const dist = p => (p.stats && p.stats.dist) || 0;
    for (const [id, p] of list) {
      const score = p.role === 'chaser' ? ((p.stats && p.stats.catches) || 0) : survivalMs(p, startAt, endAt);
      const b = best[p.role];
      if (!b || score > b.score || (score === b.score && dist(p) > dist(players[b.id]))) best[p.role] = { id, score };
    }
    return { chaser: best.chaser ? best.chaser.id : null, runner: best.runner ? best.runner.id : null };
  }
  function assignRoles(ids, nChasers, rnd = Math.random) {
    const a = ids.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    const n = Math.min(Math.max(1, nChasers), Math.max(1, a.length - 1));
    const roles = {};
    a.forEach((id, i) => { roles[id] = i < n ? 'chaser' : 'runner'; });
    return roles;
  }
  return { isTerrRole, TERR, terrOther, terrKey, terrQR, terrSide, hexAt, hexCenter, terrNb, terrGrid, terrCellCenter, terrCorners, terrCellOf, terrStart, terrGold, terrScore, terrNeed, terrWinner,
    isAsnRole, ASN, asnChain, asnTarget, asnHunter, asnBoss, asnIsBoss, asnMembers, asnStart, asnCatch, asnRebel, asnSell, asnFix, asnBlood, asnDuelK, angGap, behindOk, asnWinner,
    beatGap, aimAt, rpsWinner, MF_AUGS, aimTarget, assignJobs, voteRound, voteResult, movingPos, segCross, clampLen, shownAlt, altLabel, edgeDist, dist, bearing, staminaCostPerSec, spendStamina, exhaust, phaseAt, arrowBase, arrowState, mapRevealIdx, hpRaw, hpOf, alive, nearestRunner, winner, parseQR, checkCatch, filterFix, assignRoles,
    GRADES, AUGS, augDesc, augPool, rollAug, rollOffer, addAug, augVal, augReady, augCdMs, fmtSec, randomSpot, augArrowSec, augIntelSec, spotStale, spotStaleMs, moveSpot,
    MODES, MODE_RULES, setClock, shownPos, survivalMs, mvp, stealTime, pullToward, stormR, snipeTarget, takeable, nearLimit, movePoint, inSmoke, rollGrade, upGrade,
    interp, recommend, applySettings, mergeSettings, arrowShowSec, augAlarmM, augDomainM, polyCheck, inArea, polyGap, areaRing, POLY_MAX };
})();
// LOGIC END
