// 같은 자리(GPS 흔들림 정도) 안에 머문 시간(초). 벗어나면 그 자리부터 다시 셈
function stillFor() {
  if (!S.fix) { S.still = null; return 0; }
  const thr = Math.max(4, Math.min(8, S.fix.acc || 8)), t = Date.now();
  if (!S.still || Logic.dist(S.still, S.fix) > thr) S.still = { lat: S.fix.lat, lng: S.fix.lng, t };
  return (t - S.still.t) / 1000;
}
function onFix(p) {
  const c = p.coords, t = Date.now(), acc = c.accuracy || 999;
  // 기기가 주는 속도(도플러 측정)는 위치 튐에 영향을 안 받아서 우선 사용
  const devSpeed = typeof c.speed === 'number' && c.speed >= 0 && acc <= RULES.GPS_BAD_ACC ? c.speed : null;
  S.kf = Logic.filterFix(S.kf, { lat: c.latitude, lng: c.longitude, acc }, t, devSpeed ?? S.speed);
  if (!S.kf.used) return; // 순간적으로 튄 값은 무시
  const fix = { lat: S.kf.lat, lng: S.kf.lng, acc: Math.sqrt(S.kf.v), rawAcc: acc };
  // 기기 속도가 없으면 보정된 위치로 4초 이상 간격의 이동거리를 계산 (4m 미만 움직임은 제자리로 봄)
  let v = devSpeed;
  if (v == null && S.prevFix && t - S.prevFix.t >= 4000) {
    const d = Logic.dist(S.prevFix, fix);
    // GPS가 부정확할 때(실내 등)는 위치가 튀는 걸 뛴 걸로 착각하지 않게 제자리로 봄
    const bad = acc > RULES.GPS_BAD_ACC || S.prevFix.rawAcc > RULES.GPS_BAD_ACC;
    v = d < 4 || bad ? 0 : d / ((t - S.prevFix.t) / 1000);
  }
  if (v != null) S.speed = S.speed * 0.5 + v * 0.5;
  // GPS 고도: 주는 폰만, 고도 오차 40m 넘는 값은 버리고 부드럽게
  if (typeof c.altitude === 'number' && !(c.altitudeAccuracy > 40)) S.alt = S.alt == null ? c.altitude : S.alt * 0.7 + c.altitude * 0.3;
  if (!S.prevFix || t - S.prevFix.t >= 4000) S.prevFix = { ...fix, t };
  S.fix = fix; S.fixAt = t;
  const room = S.room, me = room && room.players && room.players[S.pid];
  if (room && me && room.status === 'lobby') {
    if (!me.ready && (S.readySent !== S.code || Date.now() - (S.readyAt || 0) > 3000)) { S.readySent = S.code; S.readyAt = Date.now(); update(meRef(), { ready: true }); } // 저장이 안 됐으면 3초 뒤 다시
    if (room.hostId === S.pid && !(room.settings && room.settings.area) && !S.areaSent) {
      S.areaSent = true;
      update(roomRef('settings'), { area: { lat: fix.lat, lng: fix.lng, r: RULES.AREA_DEFAULT_M } });
    }
    renderLobby();
  }
  drawMaps();
}
function onFixErr(e) {
  if (e.code === 1) toast('위치 권한이 꺼져 있어요. 설정에서 허용해 주세요', true);
}

/* ---------- 지도 ---------- */
const maps = {};
/* 지도 회전 (직접 구현): #gmap을 화면 대각선 크기 정사각형으로 만들어 CSS로 돌림 → 어느 각도에서도 빈 곳이 안 보임
   돌린 만큼 ① 손가락 위치 → 지도 좌표 ② 끌기 방향을 되돌려 계산, ③ 사람 배지·글자는 반대로 돌려 똑바로 세움 */
