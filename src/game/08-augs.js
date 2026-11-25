const av = id => Logic.augVal(S.augs, id);
const stMaxOf = role => (Logic.isTerrRole(role) ? RULES.ST_MAX.runner : Logic.isAsnRole(role) ? Math.round(RULES.ST_MAX.runner * (asnMeBoss() ? 1 : Logic.ASN.MINION_ST)) : RULES.ST_MAX[role]) + (av('chaserSt') || 0) + (av('runnerSt') || 0); // 암살전 부하 70%
const arrowEverySec = () => { const v = av('arrowBoost'); return v ? Logic.augArrowSec(v) : RULES.ARROW_EVERY_SEC; };
const intelSec = () => { const v = av('fastIntel'); return v ? Logic.augIntelSec(v) : RULES.MAP_EVERY_SEC; };
// 단색 선 아이콘 (등급 색으로 칠해짐)
const ICONS = {
  arrowBoost: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4"/>',
  distance: '<path d="M3 14h18M6 11l-3 3 3 3M18 11l3 3-3 3M8 5v4M12 5v5M16 5v4"/>',
  radar: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 12l6-6"/><circle cx="16" cy="15" r="1.2"/>',
  chaserSt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  stealth: '<path d="M5 21V10a7 7 0 0 1 14 0v11l-2.3-2-2.3 2-2.4-2-2.4 2-2.3-2z"/><circle cx="9.5" cy="10" r="1"/><circle cx="14.5" cy="10" r="1"/>',
  alarm: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  fastIntel: '<path d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4M4 12h16"/>',
  runnerSt: '<path d="M3 8h10a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h7"/>',
  heal: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/>',
  stRefill: '<path d="M8 3h8M7 6h10v15H7z"/><path d="M12.5 9l-2 4h3l-2 4"/>',
  recoverBoost: '<rect x="2" y="7" width="18" height="10" rx="2"/><path d="M22 11v2M11 9v6M8 12h6"/>',
  ironman: '<path d="M2 12h4l2-5 3 10 3-8 2 3h6"/>',
  insight: '<circle cx="12" cy="10" r="7"/><path d="M7 21h10M9.5 17l-1 4M14.5 17l1 4M9.5 8.5a3 3 0 0 1 3-2.5"/>',
  lastStand: '<path d="M12 22c4 0 7-3 7-7 0-4-3-6-4-10-2 2-3 4-3 6-1-1-2-2-2-4-2 2-5 5-5 8 0 4 3 7 7 7z"/>',
  trap: '<path d="M3 16h18M5 16l2-7 2 7 2-7 2 7 2-7 2 7 2-7"/><circle cx="12" cy="20" r="1.5"/>',
  decoy: '<circle cx="9" cy="7" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2"/><circle cx="16" cy="7" r="3" stroke-dasharray="2 2"/><path d="M15 13a6 6 0 0 1 6 6v2" stroke-dasharray="2 2"/>',
  domain: '<circle cx="12" cy="12" r="9" stroke-dasharray="3 2"/><circle cx="12" cy="12" r="4"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>',
  lightShoes: '<path d="M3 16l2-8h5l2 4 6 2a3 3 0 0 1 3 3v1H3z"/><path d="M3 19h18"/>',
  whistle: '<circle cx="9" cy="14" r="5"/><path d="M13 11l8-3v4l-6 2M5 7l2 2M9 4v3"/>',
  megaphone: '<path d="M3 10v4h4l8 5V5L7 10z"/><path d="M18 9a4 4 0 0 1 0 6"/>',
  breather: '<circle cx="12" cy="12" r="9"/><path d="M9.5 8v8M14.5 8v8"/>',
  luck: '<circle cx="9" cy="9" r="3"/><circle cx="15" cy="9" r="3"/><circle cx="9" cy="15" r="3"/><circle cx="15" cy="15" r="3"/><path d="M14 14l5 8"/>',
  foresight: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><path d="M12 9v6M9 12h6"/>',
  footsteps: '<ellipse cx="8" cy="8" rx="2.5" ry="4"/><ellipse cx="16" cy="15" rx="2.5" ry="4"/><path d="M7 14h2M15 21h2"/>',
  selfDestruct: '<circle cx="10" cy="14" r="7"/><path d="M15 9l3-3M18 2v2M22 6h-2M21 3l-1.5 1.5"/>',
  mugung: '<circle cx="12" cy="6.5" r="3"/><circle cx="17.2" cy="10.3" r="3"/><circle cx="15.2" cy="16.4" r="3"/><circle cx="8.8" cy="16.4" r="3"/><circle cx="6.8" cy="10.3" r="3"/><circle cx="12" cy="12" r="1.2"/>',
  shake: '<rect x="8" y="3" width="8" height="18" rx="2"/><path d="M4.5 8v8M19.5 8v8M2 10v4M22 10v4M11 18h2"/>',
  jam: '<circle cx="12" cy="12" r="9"/><path d="M9.5 14.5l1.5-5 4-1.5-1.5 5z"/><path d="M4 4l16 16"/>',
  counterIntel: '<path d="M4 20a14 14 0 0 1 0-14M8 16a7 7 0 0 1 0-6"/><circle cx="12" cy="13" r="2"/><path d="M14 11l7-7M21 4h-5M21 4v5"/>',
  wanted: '<rect x="4" y="2" width="16" height="20" rx="1.5"/><circle cx="12" cy="10" r="3"/><path d="M7 18.5a5 5 0 0 1 10 0M8 5h8"/>',
  eavesdrop: '<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4" height="7" rx="1.5"/><rect x="17" y="14" width="4" height="7" rx="1.5"/>',
  swap: '<path d="M4 8h15l-4-4M20 16H5l4 4"/>',
  fakeTreasure: '<rect x="3" y="10" width="18" height="10" rx="1"/><path d="M3 10l2-5h14l2 5"/><path d="M10.5 13.5a1.6 1.6 0 1 1 2 1.5c-.4.2-.5.5-.5 1"/><path d="M12 18v.01"/>',
  magnet: '<path d="M6 3h4v9a2 2 0 0 0 4 0V3h4v9a6 6 0 0 1-12 0z"/><path d="M6 7h4M14 7h4"/>',
  timeThief: '<path d="M6 2h12M6 22h12M7 2v4l5 6-5 6v4M17 2v4l-5 6 5 6v4"/><path d="M10 19h4"/>',
  ink: '<path d="M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11z"/><circle cx="19.5" cy="5" r="1.3"/><circle cx="4.5" cy="7" r="1"/>',
  companion: '<circle cx="8" cy="7" r="3"/><circle cx="16" cy="7" r="3"/><path d="M2 21v-2a5 5 0 0 1 5-5h2M22 21v-2a5 5 0 0 0-5-5h-2M10 17l2 2 2-2"/>',
  shield: '<path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z"/><path d="M9 12l2 2 4-4"/>',
  counter: '<path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z"/><path d="M8 12h8M13 9l3 3-3 3"/>',
  taunt: '<circle cx="12" cy="12" r="9"/><path d="M8 10h.01M15 9.5l2 1M8.5 15c2 1.5 5 1.5 7 0"/><path d="M14 15.5v2.5a1.5 1.5 0 0 0 3 0v-3"/>',
  storm: '<circle cx="12" cy="12" r="10" stroke-dasharray="3 2"/><circle cx="12" cy="12" r="5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><path d="M17 7l-2.5 2.5M7 17l2.5-2.5"/>',
  siren: '<path d="M6 18v-6a6 6 0 0 1 12 0v6"/><path d="M4 18h16v3H4zM12 2v2M4.2 5.2l1.4 1.4M19.8 5.2l-1.4 1.4"/>',
  cctv: '<path d="M3 7l13-3 2 6-13 3z"/><path d="M16 9l4 1-1 3-3-1M6 13l1 4H3"/>',
  trail: '<ellipse cx="7" cy="16" rx="2" ry="3"/><ellipse cx="13" cy="10" rx="2" ry="3"/><ellipse cx="18" cy="4.5" rx="1.6" ry="2.4" stroke-dasharray="2 1.5"/><path d="M2 21h5"/>',
  steal: '<path d="M7 11V5a2 2 0 0 1 4 0v5M11 9V4a2 2 0 0 1 4 0v6M15 10V6a2 2 0 0 1 4 0v8a7 7 0 0 1-7 7h-1a7 7 0 0 1-5.3-2.4L3 15a2 2 0 0 1 3-2.6l1 1.1"/>',
  copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
  silence: '<path d="M3 10v4h4l6 5V5L7 10z"/><path d="M16 9l5 6M21 9l-5 6"/>',
  runnersHigh: '<circle cx="14" cy="4" r="2"/><path d="M8 21l3-6 3 2v5M6 11l3-3 4 1 3 3 3 1M10 8l-1 5"/>',
  booster: '<path d="M12 2c3 3 5 7 5 11l-2 3H9l-2-3c0-4 2-8 5-11z"/><circle cx="12" cy="10" r="2"/><path d="M9 16l-3 4M15 16l3 4M12 17v5"/>',
  fakePing: '<path d="M12 22s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z"/><path d="M10 9a2 2 0 1 1 2.5 1.9c-.4.2-.5.5-.5 1.1M12 14.5v.01"/>',
  detector: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5M11 7v4l3 2"/>',
  comeback: '<path d="M12 20.5s-7.5-4.6-9.2-9.6C1.6 7.3 4 4 7.4 4c2 0 3.6 1.1 4.6 2.6C13 5.1 14.6 4 16.6 4c3.4 0 5.8 3.3 4.6 6.9-1.7 5-9.2 9.6-9.2 9.6z"/><path d="M12 15.5V9.5M9.3 12l2.7-2.7 2.7 2.7"/>',
  bloodOath: '<path d="M12 2.5c3.6 4.6 6.5 8.1 6.5 12a6.5 6.5 0 0 1-13 0c0-3.9 2.9-7.4 6.5-12z"/><path d="M12 11.5v6M9 14.5h6"/>',
  supply: '<path d="M12 2l9 5v10l-9 5-9-5V7z"/><path d="M3 7l9 5 9-5M12 12v10M7.5 4.5l9 5"/>',
  gamble: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.2"/><circle cx="16" cy="8" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="8" cy="16" r="1.2"/><circle cx="16" cy="16" r="1.2"/>',
  reroll: '<path d="M20 11a8 8 0 0 0-14-5l-2 2M4 13a8 8 0 0 0 14 5l2-2"/><path d="M4 4v4h4M20 20v-4h-4"/>',
  alchemy: '<path d="M9 2h6M10 2v6l-5 10a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-10V2"/><path d="M7.5 15h9"/>',
  mirror: '<ellipse cx="12" cy="10" rx="7" ry="8"/><path d="M12 18v4M8 22h8M9 7l3-2M9 11l6-4"/>',
  smoke: '<path d="M6 18a4 4 0 0 1 0-8 5 5 0 0 1 9.5-1.5A4 4 0 1 1 18 18z"/><path d="M8 22h8"/>',
  exit: '<path d="M14 3h6v18h-6M10 17l5-5-5-5M15 12H3"/>',
  disguise: '<path d="M2 10c2-4 6-5 10-5s8 1 10 5c-1 6-4 9-10 9S3 16 2 10z"/><circle cx="8" cy="11" r="2"/><circle cx="16" cy="11" r="2"/>',
  doppel: '<circle cx="8" cy="6" r="3"/><path d="M3 21v-3a5 5 0 0 1 10 0v3"/><circle cx="17" cy="6" r="3" stroke-dasharray="2 2"/><path d="M14 13a5 5 0 0 1 8 5v3" stroke-dasharray="2 2"/>',
  hideout: '<path d="M3 11l9-8 9 8v10H3z"/><path d="M10 21v-6h4v6"/>',
  tracker: '<path d="M12 22s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z"/><circle cx="12" cy="10" r="2.5"/><path d="M19 2l2 2M22 7h-2"/>',
  blackout: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor"/>',
  vampire: '<path d="M4 4c3 2 5 3 8 3s5-1 8-3c0 9-3 16-8 16S4 13 4 4z"/><path d="M9 11l1 3 1-3M13 11l1 3 1-3"/>',
  chain: '<rect x="2" y="9" width="10" height="6" rx="3"/><rect x="12" y="9" width="10" height="6" rx="3"/>',
  drone: '<rect x="8" y="10" width="8" height="5" rx="2"/><path d="M3 6h6M15 6h6M6 6v4M18 6v4M8 12H6M16 12h2"/>',
  hound: '<path d="M4 20v-6l-1-4 3-2 2 2h6l3-4 2 1v4l-2 3v6"/><path d="M8 20v-4M15 20v-4"/>',
  heartbeat: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.1 4.1 0 0 1 12 7.4a4.1 4.1 0 0 1 7.5 2.4C19.5 15.4 12 20 12 20z"/><path d="M6.5 12.5h3l1.3-2.2 2.2 4.4 1.3-2.2h3.2"/>',
  shadowStep: '<ellipse cx="12" cy="19.5" rx="8.5" ry="2.3"/><path d="M8.6 15.2c-1.6 0-2.3-2-2.1-4.2.2-2.1 1.3-3.6 2.6-3.4 1.4.2 1.8 2 1.5 4-.3 2-.6 3.6-2 3.6zM15.6 12.2c-1.3 0-1.8-1.7-1.6-3.4.2-1.8 1-3 2.1-2.9 1.1.1 1.5 1.6 1.3 3.3-.2 1.7-.6 3-1.8 3z"/>',
  teamChat: '<path d="M4 5h16v10H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',
  quadrant: '<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4z"/><path d="M13 13h7v7h-7z" fill="currentColor"/>',
  mapHide: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/><path d="M4 4l16 16"/>',
  trackNow: '<circle cx="12" cy="12" r="7"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/><circle cx="12" cy="12" r="1.5"/>',
  timeBomb: '<circle cx="11" cy="14" r="7"/><path d="M11 10.5V14l2.5 1.8M15.5 8.5l2-2M18.5 2.5v2M22 6h-2M21 3.5l-1.4 1.4"/>',
  blockade: '<path d="M2 9h20v6H2z"/><path d="M6 9l-3 6M12 9l-3 6M18 9l-3 6M5 15v5M19 15v5"/>',
  net: '<path d="M3 3l18 18M21 3L3 21M3 12h18M12 3v18"/><circle cx="12" cy="12" r="9"/>',
  altScan: '<path d="M12 3v18M7 8l5-5 5 5M7 16l5 5 5-5"/>',
  afterimage: '<circle cx="15" cy="7" r="3"/><path d="M11 21v-5l4-4 3 3v6"/><circle cx="8" cy="7" r="3" stroke-dasharray="2 2"/><path d="M4 21v-5l4-4" stroke-dasharray="2 2"/>',
  spyCam: '<rect x="3" y="7" width="14" height="10" rx="2"/><path d="M17 11l4-2v6l-4-2"/><circle cx="10" cy="12" r="2"/>',
  radioJam: '<path d="M12 12v9M8 21h8"/><path d="M8 8a5.5 5.5 0 0 1 8 0M5 5a10 10 0 0 1 14 0"/><path d="M3 3l18 18"/>',
  cheer: '<path d="M3 10v4h4l6 4V6L7 10z"/><path d="M17 8a5 5 0 0 1 0 8M19.5 5.5a9 9 0 0 1 0 13"/>',
  altFake: '<path d="M7 3v14M3 7l4-4 4 4M17 21V7M13 17l4 4 4-4"/>',
  fog: '<path d="M4 9h12M2 13h16M6 17h14M8 5h10"/>',
  clue: '<circle cx="10" cy="10" r="6"/><path d="M14.5 14.5L20 20M8 10h4M10 8v4"/>',
  listen: '<path d="M7 10a5 5 0 0 1 10 0c0 3-3 4-3 7a3 3 0 0 1-6 0"/><path d="M10 10a2 2 0 0 1 4 0"/>',
  cordon: '<circle cx="12" cy="12" r="8" stroke-dasharray="3 3"/><circle cx="12" cy="12" r="2" fill="currentColor"/>',
  iceMine: '<circle cx="12" cy="14" r="6"/><path d="M12 2v6M9 5l3 3 3-3M12 11v6M9 14h6"/>',
  scanPulse: '<circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="10" stroke-dasharray="2 3"/>',
  lifeBet: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/><path d="M9 14h6"/>',
  freezeFrame: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M9 6l1.5-2h3L15 6"/><path d="M10 10v5M14 10v5"/>',
  escapeRoute: '<path d="M4 20L20 4M20 4h-7M20 4v7"/><circle cx="5" cy="19" r="1.5" fill="currentColor"/>',
  insurance: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 13l2 2 3-4"/>',
  silent: '<path d="M4 10v4h4l5 4V6L8 10z"/><path d="M16 9l5 6M21 9l-5 6"/>',
  remoteThaw: '<path d="M12 3c2 3 5 5 5 9a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-8z"/><path d="M3 20h4M17 20h4"/>',
  telepathy: '<circle cx="12" cy="12" r="3"/><path d="M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14M8 8a5 5 0 0 0 0 8M16 8a5 5 0 0 1 0 8"/>',
  sacrifice: '<path d="M12 3c1.5 2 3 3.5 3 6a3 3 0 0 1-6 0c0-2.5 1.5-4 3-6z"/><path d="M8 13h8v8H8z"/>',
  mapFlip: '<path d="M4 8h13l-3-3M20 16H7l3 3"/>',
  rumor: '<path d="M4 5h16v10H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',
  timeStop: '<circle cx="12" cy="13" r="8"/><path d="M10 3h4M10 10v6M14 10v6"/>',
  rain: '<path d="M6 13a4 4 0 0 1 1-7.9A5 5 0 0 1 17 6a3.5 3.5 0 0 1 1 7z"/><path d="M8 16l-1 3M12 16l-1 3M16 16l-1 3"/>',
  goldenTime: '<path d="M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9"/>',
  bloodPrice: '<path d="M12 3s5 5.5 5 9.5a5 5 0 0 1-10 0C7 8.5 12 3 12 3z"/><path d="M12 10v5M10 13l2 2 2-2"/>',
  frenzy: '<path d="M13 2L5 13h6l-1 9 8-11h-6z"/>',
  instinct: '<path d="M4 18l4-10 4 6 3-4 5 8z"/><circle cx="16" cy="6" r="1.5" fill="currentColor"/>',
  predict: '<circle cx="5" cy="17" r="2" fill="currentColor"/><path d="M7 15l4-4" /><path d="M13 9l2-2M17 5l3-3M15 2h5v5" stroke-dasharray="2 2"/>',
  backtrace: '<path d="M4 12a8 8 0 1 0 3-6.2"/><path d="M4 3v4h4M12 8v4l3 2"/>',
  shelter: '<path d="M3 20L12 4l9 16z"/><path d="M12 20v-6M9 14h6"/>',
  allIn: '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1.3" fill="currentColor"/><circle cx="15" cy="15" r="1.3" fill="currentColor"/><circle cx="15" cy="9" r="1.3" fill="currentColor"/><circle cx="9" cy="15" r="1.3" fill="currentColor"/>',
  bounty: '<circle cx="12" cy="12" r="9"/><path d="M15 9a3 2.5 0 0 0-3-1.5c-2 0-3 1-3 2s1 1.7 3 2 3 1 3 2-1 2-3 2a3 2.5 0 0 1-3-1.5M12 6v1.5M12 16.5V18"/>',
  rps: '<path d="M7 11V6a1.5 1.5 0 0 1 3 0v4M10 10V4.5a1.5 1.5 0 0 1 3 0V10M13 10V5.5a1.5 1.5 0 0 1 3 0V12"/><path d="M16 12v-1a1.5 1.5 0 0 1 3 0v3a7 7 0 0 1-7 7h-1a6 6 0 0 1-5-3l-2-4a1.5 1.5 0 0 1 2.5-1.5L7 14"/>',
  snipe: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="1.5"/><path d="M12 1v6M12 17v6M1 12h6M17 12h6"/>'
};
const icon = id => `<svg viewBox="0 0 24 24">${ICONS[id] || ''}</svg>`;
const gradeOf = id => Logic.AUGS[id].grade;
const augLabel = id => `[${gradeOf(id)}] ${Logic.AUGS[id].name}`;
// 등급별 획득 연출: D~B 등급색 번쩍 / A 보라 / S 금빛 + 긴 진동 / SS 화면 전체 무지개 + 아주 긴 진동
const GRADE_FX = {
  D: ['rgba(123,132,148,.8)', [60]], C: ['rgba(34,197,94,.8)', [60, 40, 60]], B: ['rgba(59,130,246,.85)', [60, 40, 60]],
  A: ['rgba(168,85,247,.9)', [80, 50, 80]], S: ['rgba(245,184,0,1)', [100, 50, 100, 50, 250]], SS: ['rainbow', [200, 80, 200, 80, 500]]
};
function gainAug(id, source) {
  const me = S.room && S.room.players[S.pid]; if (!me || !id) return;
  if (asnOn(S.room) && !asnMeBoss() && asnMyAugIds().length >= 1 && !S.augs[id]) return asnTribute([id], 'tribute'); // 암살전 부하는 능력 1칸: 넘치면 우두머리에게
  const r = Logic.addAug(S.augs, id, now());
  if (r.dup) return toast(`${source}: 이미 가진 증강이에요`);
  S.augs = r.augs;
  update(meRef(), { ['augs/' + id]: S.augs[id] });
  if (id === 'chaserSt' || id === 'runnerSt') S.st = stMaxOf(me.role); // 최대치 증가 + 가득
  const g = gradeOf(id), [col, vib] = GRADE_FX[g];
  sfx(g === 'SS' ? 'augSS' : g === 'S' ? 'augS' : g === 'A' ? 'augA' : 'augLow');
  toast(`${source}: ${g}등급 증강 획득!\n${Logic.AUGS[id].name} — ${Logic.augDesc(id)}`, true);
  flash(col); vibrate(vib);
  renderGame();
}
// 지금 상황에서 의미 없는 증강은 뽑기에서 뺌: 살아 있는 팀원이 없으면 자리 바꾸기
function augBan(role) {
  const room = S.room, hits = room.hits || {};
  const all = Object.entries(room.players || {}).filter(([, p]) => p.role);
  const mates = all.filter(([id, p]) => id !== S.pid && p.role === role);
  const foes = all.filter(([id, p]) => p.role !== role && Logic.alive(p, hits[id]));
  const ban = [];
  if (role === 'runner' && !mates.some(([id, p]) => Logic.alive(p, hits[id]))) ban.push('swap', 'cheer'); // 응원: 살아 있는 팀원이 없음
  if (role === 'runner' && !mates.length) ban.push('bloodOath');
  if (foes.length < 2) ban.push('fakePing');
  // 1대1처럼 팀원이 없거나 상대 팀이 혼자일 때 쓸모없는 증강
  const foeTeam = all.filter(([, p]) => p.role !== role).length;
  if (role === 'runner' && !mates.length) ban.push('companion');        // 동행: 붙어 있을 팀원이 없음
  if (foeTeam < 2) ban.push('eavesdrop');                                // 도청: 상대가 혼자라 팀 핑을 안 찍음
  if (role === 'runner' && foeTeam < 2) ban.push('disguise');            // 위장: 추격자가 혼자면 '다른 추격자' = 나라는 게 들통
  if (modeOf(room) !== 'classic') ban.push('shield', 'shake', 'chain', 'rps', 'insurance');
  if (modeOf(room) !== 'ice') ban.push('iceMine', 'remoteThaw');                // 얼음땡 전용
  if (role === 'runner' && !mates.length) ban.push('telepathy', 'sacrifice');    // 팀원이 있어야 의미 있음  // 좀비·경찰과 도둑: 잡기가 체력·정지 방식이 아니라 의미 없음
  if (modeOf(room) === 'mafia') ban.push(...Object.keys(Logic.AUGS).filter(id => !Logic.MF_AUGS.includes(id))); // 마피아: 정체가 드러나지 않는 공통 증강만
  if (modeOf(room) === 'assassin') ban.push('timeThief', 'bounty', 'teamChat', 'allIn'); // 암살전: 추격자·도망자 전제이거나 단톡방이 이미 있음
  if (modeOf(room) !== 'terr') ban.push(...TERR_AUGS); // 땅따먹기 전용
  else ban.push('timeThief', 'bounty', 'allIn', 'heal', 'lastStand', 'comeback', 'bloodPrice', 'ironman', 'selfDestruct', 'timeBomb', 'frenzy'); // 땅따먹기: 체력·탈락 전제 능력 빼기
  return ban;
}
function gainRandom(source) {
  const me = S.room && S.room.players[S.pid]; if (!me || !me.role || !RULES.AUG_ON) return;
  const id = Logic.rollAug(me.role, S.augs, Math.random, augBan(me.role));
  if (!id) return toast(`${source}: 더 얻을 수 있는 증강이 없어요`);
  gainAug(id, source);
}
function setCooldown(id, extra) {
  S.stats.skills = (S.stats.skills || 0) + 1;
  const nx = { ...S.augs[id], readyAt: now() + Logic.augCdMs(id), ...(extra || {}) };
  S.augs = { ...S.augs, [id]: nx };
  update(meRef(), { ['augs/' + id]: nx });
  rpSkill(id, extra);
}
