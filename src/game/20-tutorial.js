const ART = {
  roles: '<svg viewBox="0 0 220 120"><circle cx="110" cy="60" r="50" fill="none" stroke="#2a313b" stroke-width="2"/><circle cx="110" cy="60" r="28" fill="none" stroke="#2a313b" stroke-width="2"/><path d="M80 75 Q110 40 145 45" stroke="#ffb020" stroke-width="2" stroke-dasharray="5 5" fill="none"/><circle cx="78" cy="78" r="10" fill="#ff4d4f"/><circle cx="148" cy="44" r="10" fill="#3ba3ff"/><text x="78" y="104" fill="#ff4d4f" font-size="12" text-anchor="middle" font-weight="700">추격자</text><text x="150" y="24" fill="#3ba3ff" font-size="12" text-anchor="middle" font-weight="700">도망자</text></svg>',
  hide: '<svg viewBox="0 0 220 120"><circle cx="70" cy="62" r="34" fill="rgba(255,77,79,.08)" stroke="#ff4d4f" stroke-width="2" stroke-dasharray="5 5"/><circle cx="70" cy="62" r="9" fill="#ff4d4f"/><text x="70" y="112" fill="#8b95a3" font-size="11" text-anchor="middle">제자리 대기</text><path d="M120 62h55" stroke="#3ba3ff" stroke-width="3" marker-end="url(#ah)"/><defs><marker id="ah" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto"><path d="M0 0L8 4L0 8z" fill="#3ba3ff"/></marker></defs><circle cx="190" cy="62" r="9" fill="#3ba3ff"/><text x="160" y="112" fill="#8b95a3" font-size="11" text-anchor="middle">숨으러 가기</text></svg>',
  catch: '<svg viewBox="0 0 220 120"><rect x="30" y="12" width="62" height="100" rx="10" fill="#1b2027" stroke="#3ba3ff" stroke-width="2"/><rect x="42" y="34" width="38" height="38" fill="#fff"/><path d="M46 38h10v10H46zM66 38h10v10H66zM46 58h10v10H46zM62 56h4v4h-4zM70 64h6v4h-6z" fill="#111"/><rect x="128" y="12" width="62" height="100" rx="10" fill="#1b2027" stroke="#ff4d4f" stroke-width="2"/><path d="M140 40v-8h8M178 40v-8h-8M140 72v8h8M178 72v8h-8" stroke="#fff" stroke-width="2" fill="none"/><path d="M98 62h24" stroke="#ffb020" stroke-width="2" stroke-dasharray="4 4"/></svg>',
  bars: '<svg viewBox="0 0 220 120"><rect x="20" y="30" width="180" height="20" rx="10" fill="#2a313b"/><rect x="20" y="30" width="120" height="20" rx="10" fill="#3ccf7a"/><text x="30" y="44" fill="#fff" font-size="11" font-weight="700">체력</text><rect x="20" y="66" width="180" height="20" rx="10" fill="#2a313b"/><rect x="20" y="66" width="60" height="20" rx="10" fill="#ffb020"/><text x="30" y="80" fill="#111" font-size="11" font-weight="700">스태미나</text></svg>',
  info: '<svg viewBox="0 0 220 120"><circle cx="65" cy="60" r="42" fill="#151a20" stroke="#2a313b" stroke-width="2"/><path d="M65 28l20 42-20-10-20 10z" fill="#ff4d4f"/><rect x="125" y="20" width="75" height="80" rx="8" fill="#1b2027" stroke="#2a313b" stroke-width="2"/><circle cx="160" cy="70" r="6" fill="#3ba3ff"/><circle cx="148" cy="44" r="7" fill="#ff4d4f" stroke="#fff" stroke-width="2"/></svg>',
  augs: '<svg viewBox="0 0 220 120"><g font-size="14" font-weight="900" text-anchor="middle"><rect x="10" y="44" width="30" height="30" rx="8" fill="none" stroke="#7b8494" stroke-width="3"/><text x="25" y="64" fill="#7b8494">D</text><rect x="45" y="44" width="30" height="30" rx="8" fill="none" stroke="#22c55e" stroke-width="3"/><text x="60" y="64" fill="#22c55e">C</text><rect x="80" y="44" width="30" height="30" rx="8" fill="none" stroke="#3b82f6" stroke-width="3"/><text x="95" y="64" fill="#3b82f6">B</text><rect x="115" y="44" width="30" height="30" rx="8" fill="none" stroke="#a855f7" stroke-width="3"/><text x="130" y="64" fill="#a855f7">A</text><rect x="150" y="44" width="30" height="30" rx="8" fill="none" stroke="#f5b800" stroke-width="3"/><text x="165" y="64" fill="#f5b800">S</text><rect x="185" y="44" width="30" height="30" rx="8" fill="none" stroke="#ff7ad9" stroke-width="3"/><text x="200" y="64" fill="#ff7ad9" font-size="12">SS</text></g><circle cx="110" cy="22" r="8" fill="#ffcf40"/><text x="110" y="104" fill="#8b95a3" font-size="11" text-anchor="middle">사기일수록 높은 등급</text></svg>',
  rules: '<svg viewBox="0 0 220 120"><circle cx="95" cy="60" r="44" fill="none" stroke="#ffb020" stroke-width="3" stroke-dasharray="8 8"/><circle cx="95" cy="60" r="8" fill="#3ba3ff"/><path d="M170 40l24 24M194 40l-24 24" stroke="#ff4d4f" stroke-width="5" stroke-linecap="round"/><text x="182" y="92" fill="#8b95a3" font-size="11" text-anchor="middle">구역 밖</text></svg>',
  win: '<svg viewBox="0 0 220 120"><path d="M85 20h50v22a25 25 0 0 1-50 0z" fill="none" stroke="#f5b800" stroke-width="4"/><path d="M85 28H70a12 12 0 0 0 15 16M135 28h15a12 12 0 0 1-15 16M110 67v18M92 95h36" stroke="#f5b800" stroke-width="4" fill="none" stroke-linecap="round"/></svg>'
};
const TUT = () => [
  { a: 'roles', t: 'PULTRIX에 오신 걸 환영해요', b: '실제로 밖에서 뛰면서 하는 <b>GPS 술래잡기</b>예요.<br>시작하면 <b style="color:#ff4d4f">추격자</b>와 <b style="color:#3ba3ff">도망자</b>가 랜덤으로 정해져요. 방장은 로비에서 구역과 게임 설정을 정할 수 있어요.' },
  { a: 'hide', t: '숨는 시간', b: `처음 <b>${fmtDur(RULES.HIDE_SEC)}</b>은 도망자가 숨는 시간이에요.<br>추격자는 제자리에서 기다려야 하고, <b>${RULES.WAIT_MOVE_M}m 넘게 3초 이상 움직이면 초당 체력 -${RULES.WAIT_MOVE_DMG}</b>이에요.` },
  { a: 'catch', t: '잡기는 QR로', b: `만나면 도망자가 <b>내 QR 보여주기</b>, 추격자가 <b>QR 찍어서 잡기</b>를 눌러요.<br>잡히면 체력 <b>-${RULES.CATCH_DMG}</b>, 도망자는 <b>${fmtDur(RULES.CATCH_COOLDOWN_SEC)} 무적</b>, 잡은 추격자는 같은 시간 동안 제자리 정지예요.` },
  { a: 'bars', t: '체력과 스태미나', b: `체력은 100이고 0이 되면 탈락이에요.<br><b>뛰면 스태미나</b>가 줄고, 스태미나가 0인데 계속 뛰면 <b>${RULES.EXHAUST_WARN_SEC}초 경고 뒤 체력이 닳아요</b>. 걷기는 괜찮아요.` },
  { a: 'info', t: '서로의 위치', b: `<b style="color:#ff4d4f">추격자</b>: 추격 시작 ${fmtDur(RULES.ARROW_UNLOCK_SEC)} 뒤부터 <b>${fmtDur(RULES.ARROW_EVERY_SEC)}마다</b> 가장 가까운 도망자 방향 화살표가 잠깐 떠요.<br><b style="color:#3ba3ff">도망자</b>: 미니맵에 추격자 위치가 <b>${fmtDur(RULES.MAP_EVERY_SEC)}마다</b> 갱신돼요.<br>${RULES.STILL_SEC}초 가만히 있으면 스태미나가 차요.` },
  { a: 'augs', t: '증강', b: `지도의 <b style="color:#ffcf40">노란 지점</b>(${RULES.SPOT_PICK_M}m 안), <b>정기 보상</b>(3개 중 1개), <b>잡거나 잡힐 때</b> 증강을 얻어요.<br>등급은 D·C·B·A·S·SS, 사기일수록 높아요. <b>사용</b> 버튼이 있는 건 쿨타임 스킬이고, 칩을 <b>꾹 누르면</b> 설명이 나와요.` },
  { a: 'rules', t: '이러면 체력이 깎여요', b: `<b>구역 밖</b>으로 나가거나 <b>탈것</b>(시속 ${RULES.VEHICLE_KMH}km 이상)을 타면 ${RULES.RULE_WARN_SEC}초 경고 뒤 초당 체력 -${RULES.RULE_DMG}이에요.<br>게임 중에는 <b>화면을 켜 두세요</b>. 화면이 꺼지면 GPS가 멈춰요.` },
  { a: 'win', t: '승리 조건', b: `<b style="color:#ff4d4f">추격자</b>: 도망자를 전부 탈락시키면 승리<br><b style="color:#3ba3ff">도망자</b>: 추격자를 전부 탈락시키거나, 추격 시간 <b>${fmtDur(RULES.GAME_SEC)}</b> 동안 한 명이라도 살아남으면 승리` }
];
// ---------- 모드별 튜토리얼: 움직이는 그림 슬라이드 ----------
const TC = { r: '#ff4d4f', b: '#3ba3ff', g: '#84cc16', y: '#ffb020', gr: '#9ca3af', d: '#8b95a3', l: '#2a313b' };
const sv = x => `<svg viewBox="0 0 220 120">${x}</svg>`;
const mv = (path, dur, ex = '') => `<animateMotion dur="${dur}s" repeatCount="indefinite" path="${path}" ${ex}/>`;
const dot = (col, anim, r = 8, ex = '') => `<circle cx="0" cy="0" r="${r}" fill="${col}" stroke="#fff" stroke-width="2" ${ex}>${anim}</circle>`;
const at = (x, y, col, ex = '', r = 8) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${col}" stroke="#fff" stroke-width="2">${ex}</circle>`;
const lbl = (x, y, t, col = TC.d, ex = '', fs = 11) => `<text x="${x}" y="${y}" fill="${col}" font-size="${fs}" font-weight="700" text-anchor="middle" ${ex}>${t}</text>`;
const blink = (vals, dur, kt) => `<animate attributeName="opacity" values="${vals}" ${kt ? `keyTimes="${kt}"` : ''} dur="${dur}s" repeatCount="indefinite"/>`;
const col = (vals, dur, kt) => `<animate attributeName="fill" values="${vals}" ${kt ? `keyTimes="${kt}"` : ''} dur="${dur}s" repeatCount="indefinite"/>`;
const area = '<circle cx="110" cy="58" r="50" fill="none" stroke="#ffb020" stroke-width="2" stroke-dasharray="6 6"/>';
const MART = {
  // 땅따먹기
  t_paint: sv((() => { const hx = (cx, cy, fill, extra = '') => `<polygon points="${[0, 1, 2, 3, 4, 5].map(i => { const a = (60 * i - 30) * Math.PI / 180; return `${(cx + 22 * Math.cos(a)).toFixed(1)},${(cy + 22 * Math.sin(a)).toFixed(1)}`; }).join(' ')}" fill="${fill}" stroke="#2a313b" stroke-width="2"${extra}>`; return hx(72, 58, 'none') + '</polygon>' + hx(110, 58, 'rgba(59,163,255,0)') + `<animate attributeName="fill" values="rgba(59,163,255,0);rgba(59,163,255,0);rgba(59,163,255,.75);rgba(59,163,255,.75)" keyTimes="0;0.55;0.6;1" dur="4s" repeatCount="indefinite"/></polygon>` + hx(148, 58, 'rgba(255,90,95,.7)') + '</polygon>' + dot(TC.b, mv('M40 58 L110 58 L110 58', 4, 'keyPoints="0;1;1" keyTimes="0;0.3;1" calcMode="linear"')) + lbl(110, 104, '3초 머물면 우리 색', TC.b, blink('0;0;1;1', 4, '0;0.55;0.6;1')); })()),
  t_tag: sv((() => { const hx = (cx, cy, fill) => `<polygon points="${[0, 1, 2, 3, 4, 5].map(i => { const a = (60 * i - 30) * Math.PI / 180; return `${(cx + 26 * Math.cos(a)).toFixed(1)},${(cy + 26 * Math.sin(a)).toFixed(1)}`; }).join(' ')}" fill="${fill}" stroke="#2a313b" stroke-width="2"/>`; return hx(90, 58, 'rgba(59,163,255,.6)') + hx(135, 58, 'rgba(59,163,255,.6)') + dot(TC.r, mv('M180 58 L100 58 L100 58', 4, 'keyPoints="0;1;1" keyTimes="0;0.4;1" calcMode="linear"')) + dot(TC.b, mv('M40 30 L85 52 L85 52', 4, 'keyPoints="0;1;1" keyTimes="0;0.5;1" calcMode="linear"')) + lbl(110, 22, '우리 땅에 들어온 적은 보이고, 잡힐 수 있어요', TC.d, '', 9) + lbl(110, 104, '🫵 2초 꾹', TC.r, blink('0;0;1;1', 4, '0;0.55;0.6;1')); })()),
  // 암살전
  a_chain: sv('<circle cx="110" cy="58" r="40" fill="none" stroke="#2a313b" stroke-width="2" stroke-dasharray="5 5"/>' + dot(TC.d, mv('M110 18 A40 40 0 1 1 109.9 18', 5), 3)
    + at(110, 18, TC.r) + at(150, 58, TC.b) + at(110, 98, TC.g) + at(70, 58, TC.y) + lbl(110, 62, '각자 다음 사람을', TC.d, '', 9) + lbl(110, 74, '몰래 노려요', TC.d, '', 9) + lbl(185, 30, '🎯', TC.d, '', 14)),
  a_stab: sv('<line x1="10" y1="62" x2="210" y2="62" stroke="#2a313b" stroke-width="2"/>'
    + dot(TC.b, mv('M60 62 L150 62 L150 62', 5, 'keyPoints="0;1;1" keyTimes="0;0.6;1" calcMode="linear"')) + dot(TC.r, mv('M20 62 L130 62 L130 62', 5, 'keyPoints="0;1;1" keyTimes="0;0.6;1" calcMode="linear"'))
    + lbl(110, 30, '같은 방향 · 뒤에서 3초 꾹', TC.r, blink('0;0;1;1', 5, '0;0.55;0.6;1')) + lbl(110, 98, '앞사람이 돌아보면 실패', TC.d)),
  a_crew: sv(at(150, 58, TC.r, '', 11) + lbl(150, 38, '👑', TC.d, '', 14) + at(170, 80, TC.r, '', 6) + `<circle cx="0" cy="0" r="8" stroke="#fff" stroke-width="2">${col(`${TC.b};${TC.b};${TC.r};${TC.r}`, 5, '0;0.5;0.55;1')}${mv('M40 58 L130 58 L130 58', 5, 'keyPoints="0;1;1" keyTimes="0;0.5;1" calcMode="linear"')}</circle>`
    + lbl(60, 30, '잡히면', TC.d) + lbl(60, 98, '우두머리의 부하', TC.r, blink('0;0;1;1', 5, '0;0.5;0.55;1'))),
  a_rebel: sv(at(120, 58, TC.r, '', 11) + lbl(120, 38, '👑', TC.d, '', 14) + at(160, 70, TC.r, '', 6) + `<circle cx="0" cy="0" r="7" fill="#a78bfa" stroke="#fff" stroke-width="2">${mv('M60 80 L100 64 L100 64', 4, 'keyPoints="0;1;1" keyTimes="0;0.5;1" calcMode="linear"')}</circle>`
    + lbl(110, 104, '⚔️ 하극상', '#a78bfa', blink('0;0;1;1', 4, '0;0.55;0.6;1'))),
  a_blood: sv('<circle cx="110" cy="58" r="50" fill="rgba(200,20,40,.25)" stroke="#c81e3a" stroke-width="2">' + blink('.3;1;.3', 1.2) + '</circle>'
    + dot(TC.r, mv('M70 40 L150 80 L70 40', 4)) + dot(TC.b, mv('M150 40 L70 80 L150 40', 4.5)) + dot(TC.g, mv('M110 20 L110 96 L110 20', 5)) + lbl(110, 62, '🩸 아무나!', '#fff', '', 12)),
  // 기본
  c_roles: sv(area + at(110, 58, TC.r, '<animate attributeName="r" values="8;11;8" dur="1.2s" repeatCount="indefinite"/>') + dot(TC.b, mv('M110 58 L70 35 L110 58', 4)) + dot(TC.b, mv('M110 58 L150 40 L110 58', 4.5)) + dot(TC.b, mv('M110 58 L120 95 L110 58', 5)) + lbl(110, 116, '추격자 1명 · 나머지는 도망자')),
  c_hide: sv(area + '<circle cx="110" cy="58" r="16" fill="rgba(255,77,79,.1)" stroke="#ff4d4f" stroke-dasharray="4 4"/>' + dot(TC.r, mv('M110 58 L110 58 L160 40', 6, 'keyPoints="0;0;1" keyTimes="0;0.5;1" calcMode="linear"')) + dot(TC.b, mv('M110 58 L165 38 L165 38', 6, 'keyPoints="0;1;1" keyTimes="0;0.4;1" calcMode="linear"')) + dot(TC.b, mv('M110 58 L62 80 L62 80', 6, 'keyPoints="0;1;1" keyTimes="0;0.4;1" calcMode="linear"'))
    + lbl(110, 116, '숨는 시간: 추격자는 제자리', TC.d, blink('1;1;0;0', 6, '0;0.49;0.5;1')) + lbl(110, 116, '추격 시작!', TC.r, blink('0;0;1;1', 6, '0;0.49;0.5;1'))),
  c_catch: sv('<rect x="22" y="14" width="56" height="88" rx="9" fill="#1b2027" stroke="#3ba3ff" stroke-width="2"/><rect x="34" y="34" width="32" height="32" fill="#fff"/><path d="M38 38h8v8h-8zM54 38h8v8h-8zM38 54h8v8h-8zM56 56h6v6h-6z" fill="#111"/>'
    + '<rect x="142" y="14" width="56" height="88" rx="9" fill="#1b2027" stroke="#ff4d4f" stroke-width="2"/><path d="M152 40h36M152 40v-6M188 40v-6M152 68h36M152 68v6M188 68v6" stroke="#fff" stroke-width="2"/><line x1="150" y1="54" x2="190" y2="54" stroke="#ff4d4f" stroke-width="2"><animate attributeName="y1" values="38;70;38" dur="2s" repeatCount="indefinite"/><animate attributeName="y2" values="38;70;38" dur="2s" repeatCount="indefinite"/></line>'
    + '<path d="M84 58h52" stroke="#ffb020" stroke-width="3" stroke-dasharray="6 5"><animate attributeName="stroke-dashoffset" values="22;0" dur="1s" repeatCount="indefinite"/></path><rect x="30" y="108" width="40" height="6" rx="3" fill="#2a313b"/><rect x="30" y="108" width="40" height="6" rx="3" fill="#3ccf7a"><animate attributeName="width" values="40;40;20;20" keyTimes="0;0.5;0.55;1" dur="4s" repeatCount="indefinite"/></rect>'),
  c_info: sv('<circle cx="62" cy="58" r="42" fill="#151a20" stroke="#2a313b" stroke-width="2"/><g><path d="M62 26l18 40-18-9-18 9z" fill="#ff4d4f"/><animateTransform attributeName="transform" type="rotate" values="-40 62 58;30 62 58;-40 62 58" dur="3s" repeatCount="indefinite"/></g>'
    + '<rect x="128" y="18" width="76" height="80" rx="8" fill="#1b2027" stroke="#2a313b" stroke-width="2"/>' + at(150, 44, TC.r, blink('1;0.2;1', 1.6)) + at(176, 74, TC.b) + lbl(62, 114, '추격자: 화살표') + lbl(166, 114, '도망자: 미니맵')),
  c_win: sv('<path d="M85 18h50v22a25 25 0 0 1-50 0z" fill="none" stroke="#f5b800" stroke-width="4"/><path d="M85 26H70a12 12 0 0 0 15 16M135 26h15a12 12 0 0 1-15 16M110 65v14M94 88h32" stroke="#f5b800" stroke-width="4" fill="none" stroke-linecap="round"/><rect x="40" y="100" width="140" height="8" rx="4" fill="#2a313b"/><rect x="40" y="100" width="140" height="8" rx="4" fill="#3ba3ff"><animate attributeName="width" values="140;0" dur="5s" repeatCount="indefinite"/></rect>'),
  // 좀비
  z_roles: sv(area + at(110, 58, TC.g, '<animate attributeName="r" values="8;11;8" dur="1s" repeatCount="indefinite"/>') + dot(TC.b, mv('M110 58 L66 36 L110 58', 4)) + dot(TC.b, mv('M110 58 L156 44 L110 58', 4.4)) + dot(TC.b, mv('M110 58 L112 98 L110 58', 5)) + lbl(110, 116, '🧟 좀비 · 🙂 생존자')),
  z_infect: sv(dot(TC.g, mv('M30 60 L110 60 L110 60', 4, 'keyPoints="0;1;1" keyTimes="0;0.5;1" calcMode="linear"')) + at(122, 60, TC.b, col('#3ba3ff;#3ba3ff;#84cc16;#84cc16', 4, '0;0.5;0.52;1')) + lbl(122, 40, '감염!', TC.g, blink('0;0;1;1', 4, '0;0.5;0.52;1'), 13) + lbl(110, 110, '잡히면 바로 좀비가 돼요')),
  z_chase: sv(dot(TC.b, mv('M120 60 L200 30', 3)) + dot(TC.g, mv('M60 40 L170 35', 3)) + dot(TC.g, mv('M60 85 L175 45', 3)) + lbl(110, 110, '좀비가 된 사람도 같이 쫓아요')),
  z_win: sv('<circle cx="110" cy="52" r="34" fill="none" stroke="#2a313b" stroke-width="4"/><path d="M110 52V30" stroke="#fff" stroke-width="4" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" values="0 110 52;360 110 52" dur="4s" repeatCount="indefinite"/></path>' + at(60, 52, TC.b) + at(160, 52, TC.b) + lbl(110, 108, '끝까지 버틴 생존자 모두 승리 · 전원 감염이면 좀비 승리')),
  // 얼음땡
  i_freeze: sv(dot(TC.r, mv('M20 60 L100 60 L100 60 L20 30', 6, 'keyPoints="0;0.45;0.55;1" keyTimes="0;0.4;0.5;1" calcMode="linear"')) + at(112, 60, TC.b, col('#3ba3ff;#3ba3ff;#67e8f9;#67e8f9', 6, '0;0.4;0.42;1'))
    + '<circle cx="112" cy="60" r="22" fill="none" stroke="#67e8f9" stroke-width="2" stroke-dasharray="4 4"/>' + lbl(112, 26, '🧊 얼음!', '#67e8f9', blink('0;0;1;1', 6, '0;0.41;0.42;1'), 13)
    + lbl(110, 112, '술래가 30m 밖이면 체력이 닳아요', TC.d, blink('0;0;1;1', 6, '0;0.6;0.62;1'))),
  i_self: sv(at(110, 58, TC.b, col('#3ba3ff;#67e8f9;#67e8f9;#3ba3ff', 5, '0;0.1;0.8;0.9')) + dot(TC.r, mv('M30 58 L88 58 L30 58', 5)) + lbl(110, 28, '🧊 얼음!', '#67e8f9', blink('0;1;1;0', 5, '0;0.1;0.8;0.9'), 13)
    + lbl(110, 98, '얼음 중엔 못 잡아요 · 움직이면 안 돼요') + lbl(110, 114, `판마다 ${RULES.ICE_SELF_USES}번 · 한 번 최대 ${Logic.MODE_RULES.ICE_SELF_SEC}초`)),
  i_thaw: sv(at(150, 60, '#67e8f9', col('#67e8f9;#67e8f9;#3ba3ff;#3ba3ff', 5, '0;0.55;0.57;1')) + dot(TC.b, mv('M30 60 L132 60 L132 60', 5, 'keyPoints="0;1;1" keyTimes="0;0.55;1" calcMode="linear"'))
    + lbl(150, 30, '🔥 땡!', TC.y, blink('0;0;1;1', 5, '0;0.55;0.57;1'), 13) + lbl(110, 108, '팀원이 얼음인 사람 QR을 찍으면 땡')),
  // 경찰과 도둑
  p_roles: sv(area + at(110, 58, TC.r, '<animate attributeName="r" values="8;11;8" dur="1.2s" repeatCount="indefinite"/>') + dot(TC.b, mv('M110 58 L68 34 L110 58', 4)) + dot(TC.b, mv('M110 58 L156 46 L110 58', 4.4)) + lbl(110, 116, '🚓 경찰 · 🦹 도둑')),
  p_jail: sv('<rect x="150" y="30" width="50" height="50" rx="6" fill="#334155" stroke="#94a3b8" stroke-width="3"/>' + lbl(175, 98, '🔒 감옥') + dot(TC.b, mv('M40 55 L175 55 L175 55', 4, 'keyPoints="0;1;1" keyTimes="0;0.6;1" calcMode="linear"')) + at(40, 55, TC.r, blink('1;1;0.4;0.4', 4, '0;0.1;0.12;1')) + lbl(70, 110, '잡히면 감옥으로 (2분 안에)')),
  p_rescue: sv('<rect x="150" y="30" width="50" height="50" rx="6" fill="#334155" stroke="#94a3b8" stroke-width="3"/>' + dot(TC.b, mv('M175 55 L175 55 L110 70', 5, 'keyPoints="0;0;1" keyTimes="0;0.5;1" calcMode="linear"')) + dot(TC.b, mv('M30 70 L140 55 L80 70', 5, 'keyPoints="0;1;0.6" keyTimes="0;0.5;1" calcMode="linear"')) + lbl(90, 110, '팀원이 QR을 찍으면 탈옥 + 1분 무적')),
  p_win: sv('<rect x="70" y="20" width="80" height="62" rx="8" fill="#334155" stroke="#94a3b8" stroke-width="3"/>' + at(92, 50, TC.b) + at(128, 50, TC.b) + lbl(110, 104, '도둑이 모두 동시에 갇히면 경찰 승리 · 시간 끝나면 도둑 승리')),
  // 마피아
  m_hidden: sv(area + dot(TC.gr, mv('M70 40 L95 70 L70 40', 5)) + dot(TC.gr, mv('M150 40 L125 75 L150 40', 5.5)) + dot(TC.gr, mv('M110 90 L135 50 L110 90', 6)) + dot(TC.gr, mv('M85 85 L70 55 L85 85', 4.5), 8, 'stroke-dasharray="3 2"') + lbl(110, 116, '모두 같은 색 · 마피아끼리만 서로 알아요')),
  m_catch: sv(dot(TC.gr, mv('M30 60 L100 60 L100 60', 4, 'keyPoints="0;1;1" keyTimes="0;0.5;1" calcMode="linear"')) + at(114, 60, TC.gr, blink('1;1;0.15;0.15', 4, '0;0.5;0.55;1')) + lbl(114, 40, '탈락', TC.r, blink('0;0;1;1', 4, '0;0.5;0.55;1'), 13) + lbl(110, 108, 'QR로 잡히면 바로 탈락 · 누가 잡았는지는 잡힌 사람만')),
  m_vote: sv('<rect x="88" y="14" width="44" height="34" rx="6" fill="#1b2027" stroke="#3ba3ff" stroke-width="2"/>' + lbl(110, 37, '🗳', '#fff', '', 16) + at(60, 78, TC.gr) + at(110, 78, TC.gr, blink('1;1;0.15;0.15', 4, '0;0.6;0.65;1')) + at(160, 78, TC.gr)
    + lbl(60, 100, '1표') + lbl(110, 100, '3표', TC.y) + lbl(160, 100, '0표') + lbl(110, 116, '5분마다 투표 · 최다 득표 1명 추방', TC.d, '', 10)),
  m_jobs: sv('<g>' + at(55, 60, TC.b) + '<path d="M55 60 L140 40" stroke="#ff4d4f" stroke-width="2" stroke-dasharray="4 4"><animateTransform attributeName="transform" type="rotate" values="-15 55 60;15 55 60;-15 55 60" dur="3s" repeatCount="indefinite"/></path></g>' + lbl(55, 90, '🔫 경찰') + at(165, 60, TC.gr) + '<circle cx="165" cy="60" r="18" fill="none" stroke="#3ccf7a" stroke-width="3"><animate attributeName="r" values="14;22;14" dur="1.6s" repeatCount="indefinite"/></circle>' + lbl(165, 90, '🩺 의사 보호') + lbl(110, 114, '경찰: 조사·저격총 / 의사: 5분 보호', TC.d, '', 10)),
  m_win: sv('<path d="M85 18h50v22a25 25 0 0 1-50 0z" fill="none" stroke="#f5b800" stroke-width="4"/><path d="M110 65v14M94 88h32" stroke="#f5b800" stroke-width="4" stroke-linecap="round"/>' + lbl(110, 110, '마피아 전원 탈락 → 시민 승리 · 시민 ≤ 마피아 → 마피아 승리', TC.d, '', 9))
};
const MODE_TUT = {
  terr: () => { const T = Logic.TERR; return [
    { a: 't_paint', t: '🎨 땅따먹기', b: `빨강팀과 파랑팀으로 나뉘어 동네를 육각형 칸으로 칠해요. 빈칸은 <b>${T.BLANK_SEC}초</b>, 상대 칸은 <b>${T.STEAL_SEC}초</b> 머물면 우리 색. 시간이 끝났을 때 칸이 많은 팀이 이겨요.` },
    { a: 't_tag', t: '적진은 위험해요', b: `<b>상대 땅 위에 있을 때만</b> 잡혀요. 잡히면 ${T.STUN_SEC}초 기절한 뒤, <b>우리 색 칸에 ${T.HOME_SEC}초</b> 있어야 다시 칠할 수 있어요. 우리 땅에 들어온 상대는 지도에 보여요.` },
    { a: 'c_info', t: '기지 · 황금 칸 · 막판', b: `기지는 못 덮어요. ${T.GOLD_EVERY / 60}분마다 <b>황금 칸</b> ${T.GOLD_N}개가 생기고, 칠하면 칸 ${T.GOLD_VAL}개 값. 마지막 ${T.LAST_MIN}분엔 모든 칸이 ${T.LAST_SEC}초 만에 칠해져요. 같은 칸에 두 팀이 있으면 아무도 못 칠해요.` },
    { a: 'z_win', t: '승리', b: '시간이 끝났을 때 점수가 높은 팀 승리! 같으면 마지막 1분 동안 더 많이 칠한 팀이 이겨요. 결과 화면에서 판 전체가 칠해지는 과정을 다시 볼 수 있어요.' }
  ]; },
  assassin: () => { const A = Logic.ASN; return [
    { a: 'a_chain', t: '🗡️ 암살전', b: '모두 <b>우두머리</b>로 시작해요. 각자 몰래 <b>타깃 1명</b>이 정해지고, 누가 나를 노리는지는 몰라요. 타깃 무리 뒤로 가까이 가면 <b>🗡️ 암살</b> 버튼이 켜져요.' },
    { a: 'a_stab', t: '뒤에서 암살', b: `상대와 <b>같은 방향</b>을 보고 뒤에서 <b>${A.STAB_SEC}초 꾹</b>! 당하는 쪽엔 "등 뒤에 누가 있다!"가 떠서, 그때 <b>뒤돌아보면</b> 막을 수 있어요. 나침반이 꺼져 있으면 암살을 못 하고, 어느 방향에서든 당해요.` },
    { a: 'a_crew', t: '부하', b: `잡히면 탈락 대신 잡은 쪽 우두머리의 <b>부하</b>가 돼요(${A.INV_SEC}초 무적). 우두머리를 잡으면 그 무리가 <b>통째로</b> 넘어와요. 부하는 체력 ${A.MINION_HP}, 스태미나 ${Math.round(A.MINION_ST * 100)}%, 능력 1개. 화살표는 우두머리만 보고, 무리는 💬 단톡방과 핑으로 움직여요. 우두머리는 능력을 꾹 눌러 부하에게 양도할 수 있어요.` },
    { a: 'a_rebel', t: '하극상', b: `부하가 된 지 ${A.REBEL_WAIT_SEC / 60}분 지나면 한 판에 한 번, 우두머리 뒤에서 꾹 눌러 <b>자리를 뺏을</b> 수 있어요. 우두머리 근처 다른 부하 1명당 ${A.REBEL_GUARD_SEC}초씩 더 걸려요. 실패하면 능력을 몰수당하고, 우두머리가 <b>용서</b>할지 적에게 <b>팔아넘길</b>지 정해요.` },
    { a: 'a_blood', t: '피의 시간 · 최후의 결투', b: `${A.BLOOD_EVERY / 60}분마다 ${A.BLOOD_SEC}초 동안 <b>아무나</b> 암살할 수 있어요. 우두머리가 둘만 남으면 <b>최후의 결투</b>: 화살표가 계속 보이고 구역이 줄어들어요.` },
    { a: 'z_win', t: '승리', b: `모두 한 무리가 되면 그 <b>우두머리</b> 승리! 시간이 끝나면 무리가 가장 큰 우두머리가 이겨요. 체력이 0이 되면 탈락 대신 ${A.STUN_SEC / 60}분 <b>기절</b>(암살·능력 못 씀, 위치 공개)해요.` }
  ]; },
  ice: () => [
    { a: 'c_roles', t: '🧊 얼음땡', b: '<b style="color:#ff4d4f">술래</b>가 <b style="color:#3ba3ff">도망자</b>를 쫓아요. 잡기는 기본 모드처럼 QR로 해요.' },
    { a: 'i_freeze', t: '잡히면 얼음', b: `잡히면 <b>그 자리에서 얼음</b>! ${Logic.MODE_RULES.ICE_MOVE_M}m 넘게 움직이면 체력이 깎여요. 술래가 <b>${Logic.MODE_RULES.ICE_DRAIN_M}m 밖</b>에 있으면 얼음인 사람 체력이 초당 ${Logic.MODE_RULES.ICE_DRAIN}씩 닳아요.` },
    { a: 'i_thaw', t: '땡', b: `얼지 않은 도망자가 얼음인 팀원의 QR을 찍으면 <b>땡</b>! 풀린 사람은 <b>${Logic.MODE_RULES.ICE_INV_SEC}초 무적</b>이에요. 얼음인 팀원은 지도에 🧊로 보여요.` },
    { a: 'i_self', t: '스스로 얼음', b: `잡힐 것 같으면 <b>🧊 얼음!</b> 버튼. ${Logic.MODE_RULES.ICE_SELF_SEC}초 동안 못 잡히지만 움직이면 안 돼요. 판마다 ${RULES.ICE_SELF_USES}번.` },
    { a: 'z_win', t: '승리 조건', b: `살아 있는 도망자가 <b>모두 잡혀서 얼면</b> 술래 승리(스스로 얼음은 안 셈), <b>${fmtDur(RULES.GAME_SEC)}</b>이 끝나면 도망자 승리예요.` }
  ],
  classic: () => [
    { a: 'c_roles', t: '기본 모드', b: `<b style="color:#ff4d4f">추격자</b>는 도망자를 잡고, <b style="color:#3ba3ff">도망자</b>는 끝까지 버텨요. 역할은 시작할 때 랜덤이에요.` },
    { a: 'c_hide', t: '숨는 시간 → 추격', b: `처음 <b>${fmtDur(RULES.HIDE_SEC)}</b> 동안 추격자는 제자리에서 기다리고, 도망자는 숨어요. 그다음 추격 시작!` },
    { a: 'c_catch', t: '잡기는 QR로', b: `만나면 추격자가 도망자의 QR을 찍어요. 잡히면 체력 <b>-${RULES.CATCH_DMG}</b>, 체력이 0이 되면 탈락이에요.` },
    { a: 'c_info', t: '서로의 위치', b: `추격자는 <b>${fmtDur(RULES.ARROW_EVERY_SEC)}마다</b> 가까운 도망자 쪽 화살표, 도망자는 <b>${fmtDur(RULES.MAP_EVERY_SEC)}마다</b> 미니맵으로 추격자 위치를 봐요.` },
    { a: 'c_win', t: '승리 조건', b: `도망자를 모두 탈락시키면 추격자 승리, <b>${fmtDur(RULES.GAME_SEC)}</b> 동안 한 명이라도 버티면 도망자 승리예요.` }
  ],
  zombie: () => [
    { a: 'z_roles', t: '🧟 좀비 모드', b: '<b style="color:#84cc16">좀비</b>(처음 좀비 수는 로비에서)는 <b style="color:#3ba3ff">생존자</b>를 쫓아요.' },
    { a: 'z_infect', t: '감염', b: '좀비가 QR을 찍으면 그 생존자는 <b>바로 좀비</b>가 돼요. 체력은 상관없어요.' },
    { a: 'z_chase', t: '좀비가 늘어나요', b: '감염된 사람도 바로 같이 쫓아요. 시간이 갈수록 좀비가 많아져요.' },
    { a: 'z_win', t: '승리 조건', b: `<b>${fmtDur(RULES.GAME_SEC)}</b>이 끝날 때까지 버틴 생존자는 모두 승리, 전원 감염되면 좀비 승리예요.` }
  ],
  police: () => [
    { a: 'p_roles', t: '🚓 경찰과 도둑', b: '<b style="color:#ff4d4f">경찰</b>은 <b style="color:#3ba3ff">도둑</b>을 잡아 감옥에 보내요. 감옥 위치는 방장이 지도에서 정해요.' },
    { a: 'p_jail', t: '체포 → 감옥', b: `잡히면 <b>${fmtDur(Logic.MODE_RULES.JAIL_GO_SEC)} 안에 감옥</b>(기본 반경 ${Logic.MODE_RULES.JAIL_R}m, 방장이 꼭짓점으로 모양을 정할 수도 있어요)으로 가야 해요. 감옥 밖으로 나가면 체력이 깎여요.` },
    { a: 'p_rescue', t: '탈옥', b: `갇히지 않은 도둑이 갇힌 팀원의 QR을 찍으면 탈옥! 풀려난 도둑은 <b>${fmtDur(Logic.MODE_RULES.RESCUE_INV_SEC)} 무적</b>이에요.` },
    { a: 'p_win', t: '승리 조건', b: `살아 있는 도둑이 <b>모두 동시에</b> 갇히면 경찰 승리, <b>${fmtDur(RULES.GAME_SEC)}</b>이 끝나면 도둑 승리예요.` }
  ],
  mafia: () => [
    { a: 'm_hidden', t: '🕵️ 마피아 모드', b: '누가 마피아인지 몰라요. 지도엔 <b>30초마다 모두 같은 색</b>으로 위치가 보이고, 마피아끼리만 서로 알아요. 숨는 시간 없이 바로 시작해요.' },
    { a: 'm_catch', t: '마피아의 잡기', b: '마피아가 QR을 찍으면 그 사람은 <b>바로 탈락</b>. 누가 잡았는지는 잡힌 사람만 알아요. <b>탈락하면 말하면 안 돼요!</b>' },
    { a: 'm_vote', t: '투표', b: `<b>${Logic.MODE_RULES.MF_VOTE_EVERY / 60}분마다 ${Logic.MODE_RULES.MF_VOTE_SEC}초</b> 동안 투표해요. 최다 득표 1명이 추방되고, 동점이면 아무도 안 나가요.` },
    { a: 'm_jobs', t: '경찰과 의사', b: '<b>경찰</b>: 1명을 골라 마피아인지 조사, 저격총으로 쏘기 (시민을 쏘면 같이 탈락, 죽으면 총이 떨어져 시민이 주우면 새 경찰)<br><b>의사</b>: QR을 찍어 5분 동안 보호 (나도 가능)' },
    { a: 'm_win', t: '승리 조건', b: `마피아가 모두 탈락하면 시민 승리, 살아 있는 시민이 마피아 수 이하가 되면 마피아 승리, <b>${fmtDur(RULES.GAME_SEC)}</b> 버티면 시민 승리예요.` }
  ]
};
let tutI = 0, tutSet = null; // tutSet: 모드 튜토리얼이면 그 모드, 아니면 전체 게임 방법
const tutList = () => (tutSet ? MODE_TUT[tutSet]() : TUT());
function renderTut() {
  const all = tutList(), x = all[tutI];
  $('#tutArt').innerHTML = (tutSet ? MART : ART)[x.a]; $('#tutTitle').textContent = x.t; $('#tutText').innerHTML = x.b;
  for (const sel of ['#tutArt', '#tutTitle', '#tutText']) { const el = $(sel); el.classList.remove('tutin'); void el.offsetWidth; el.classList.add('tutin'); } // 슬라이드처럼
  $('#tutDots').innerHTML = all.map((_, i) => `<i class="${i === tutI ? 'on' : ''}"></i>`).join('');
  $('#tutPrev').style.visibility = tutI ? 'visible' : 'hidden';
  $('#tutNext').textContent = tutI === all.length - 1 ? (tutSet ? '알겠어요' : '시작하기') : '다음';
}
function openTut(mode) { tutSet = typeof mode === 'string' ? mode : null; tutI = 0; renderTut(); $('#ov-tut').classList.add('on'); }
function closeTut() {
  $('#ov-tut').classList.remove('on');
  try { localStorage.setItem(tutSet ? 'gtag_mtut_' + tutSet : 'gtag_tut', '1'); } catch (e) {}
}
// 처음 하는 모드면 역할 공개 뒤 자동으로
function maybeModeTut() {
  const m = modeOf(S.room); let seen = true;
  try { seen = !!localStorage.getItem('gtag_mtut_' + m); } catch (e) {}
  if (!seen && S.room && S.room.status === 'playing') openTut(m);
}
$('#btnModeTut').onclick = () => openTut(modeOf(S.room));
$('#tutNext').onclick = () => { if (tutI < tutList().length - 1) { tutI++; renderTut(); } else closeTut(); };
$('#tutPrev').onclick = () => { if (tutI > 0) { tutI--; renderTut(); } };
$('#tutSkip').onclick = closeTut;
$('#btnTut').onclick = () => openTut(); $('#btnTut2').onclick = () => openTut();
let tutX = null; // 좌우로 밀어서 넘기기
$('#ov-tut').addEventListener('touchstart', e => { tutX = e.touches[0].clientX; }, { passive: true });
$('#ov-tut').addEventListener('touchend', e => {
  if (tutX == null) return; const dx = e.changedTouches[0].clientX - tutX; tutX = null;
  if (dx < -50) $('#tutNext').click(); else if (dx > 50) $('#tutPrev').click();
});

