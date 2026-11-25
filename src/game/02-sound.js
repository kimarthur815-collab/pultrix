// 무궁화 노래 박자 (노래 시작부터 초): 무 / 궁 / 화 길게, 꽃이 보통, 피었습니다 빠르게. mugung.mp3와 같은 박자
// 가락은 새로 지은 단조 (미 레 시 도 시 라 시 라 솔 미). 3.98초에 부엉이가 돌기 시작해 4.3초(= warn)에 판정 시작
const MUG_SYL = [[0.05, .85], [1.00, .72], [1.88, .60], [2.53, .33], [2.90, .35], [3.30, .10], [3.41, .10], [3.52, .10], [3.63, .10], [3.74, .20]];
const MUG_NOTES = [659, 587, 494, 523, 494, 440, 494, 440, 392, 330];
const MUG_TURN = 3.98;
const SFX = {
  tick: [[880, .12, 'square', .12]],
  go: [[660, .1, 'square', .14], [990, .3, 'square', .14, .1]],
  arrow: [[1320, .06, 'triangle', .14], [1760, .09, 'triangle', .12, .07]],
  caught: [[440, .15, 'sawtooth', .15], [330, .15, 'sawtooth', .15, .14], [220, .3, 'sawtooth', .15, .28]],
  catch: [[523, .1, 'square', .13], [659, .1, 'square', .13, .1], [784, .22, 'square', .13, .2]],
  augLow: [[880, .08, 'triangle', .14], [1175, .12, 'triangle', .12, .08]],
  augA: [[784, .08, 'square', .11], [988, .08, 'square', .11, .08], [1319, .18, 'square', .11, .16]],
  augS: [[659, .07, 'square', .11], [880, .07, 'square', .11, .07], [1109, .07, 'square', .11, .14], [1319, .32, 'square', .11, .21]],
  augSS: [[523, .07, 'square', .1], [659, .07, 'square', .1, .07], [784, .07, 'square', .1, .14], [1047, .07, 'square', .1, .21], [1319, .07, 'square', .1, .28], [1568, .5, 'triangle', .13, .35]],
  skill: [[300, .05, 'sawtooth', .1], [900, .2, 'triangle', .12, .04]],
  warn: [[220, .12, 'square', .12], [220, .12, 'square', .12, .2]],
  minute: [[988, .1, 'square', .12], [988, .1, 'square', .12, .18], [988, .1, 'square', .12, .36]],
  ping: [[1568, .06, 'sine', .16], [2093, .12, 'sine', .14, .06]],
  mega: [[330, .3, 'sawtooth', .11], [392, .35, 'sawtooth', .11, .05]],
  whistle: [[2637, .55, 'sine', .14], [2794, .45, 'sine', .1, .12]],
  trap: [[180, .08, 'square', .15], [120, .35, 'sawtooth', .15, .07]],
  boom: [[90, .5, 'sawtooth', .2], [60, .55, 'square', .14, .05]],
  win: [[523, .12, 'square', .12], [659, .12, 'square', .12, .12], [784, .12, 'square', .12, .24], [1047, .45, 'square', .12, .36]],
  lose: [[392, .2, 'triangle', .13], [330, .2, 'triangle', .13, .2], [262, .5, 'triangle', .13, .4]],
  // 무궁화 대체음: mugung.mp3를 아직 못 불러왔을 때만 (같은 가락·박자, 한 글자에 한 음)
  mugung: MUG_SYL.map(([st, d], i) => [MUG_NOTES[i], Math.max(.12, d), 'triangle', .13, st]),
  escape: [[440, .08, 'square', .12], [660, .08, 'square', .12, .08], [880, .08, 'square', .12, .16], [1320, .3, 'triangle', .13, .24]],
  detect: [[1800, .05, 'sine', .15], [1800, .05, 'sine', .15, .12], [2400, .08, 'sine', .13, .24]],
  wanted: [[700, .18, 'square', .1], [950, .18, 'square', .1, .2], [700, .18, 'square', .1, .4], [950, .18, 'square', .1, .6]],
  ink: [[160, .25, 'sawtooth', .14], [90, .45, 'sine', .18, .05]],
  swap: [[523, .07, 'triangle', .13], [784, .07, 'triangle', .13, .08], [523, .07, 'triangle', .13, .16], [784, .12, 'triangle', .13, .24]],
  time: [[1200, .04, 'square', .12], [900, .04, 'square', .12, .25], [1200, .04, 'square', .12, .5], [600, .35, 'triangle', .14, .75]],
  magnet: [[200, .3, 'sine', .14], [400, .3, 'sine', .12, .1], [800, .2, 'sine', .1, .2]],
  shot: [[150, .05, 'square', .2], [90, .25, 'sawtooth', .2, .02], [2400, .08, 'triangle', .08, .01]],
  shield: [[880, .1, 'triangle', .14], [1320, .1, 'triangle', .14, .06], [1760, .3, 'sine', .14, .12]],
  steal: [[1200, .05, 'square', .1], [800, .05, 'square', .1, .06], [500, .15, 'triangle', .12, .12]],
  cam: [[1000, .06, 'square', .1], [1000, .06, 'square', .1, .12], [1500, .12, 'square', .1, .24]]
};
// 도망자 진동: 노래와 같은 박자 (긴 글자는 길게, 최대 0.38초) + 판정 시작 순간 0.35초. off = 노래 시작부터 지난 초 (늦게 받으면 지난 부분은 건너뜀)
function mugVib(off = 0) {
  const segs = MUG_SYL.map(([st, d]) => [st, Math.min(.38, Math.max(.05, d * .55))]).concat([[Logic.AUGS.mugung.warn, .35]]);
  const p = []; let at = Math.max(0, off);
  for (const [st, d] of segs) { if (st < off) continue; p.push(Math.round((st - at) * 1000), Math.round(d * 1000)); at = st + d; }
  if (p.length && p[0] < 60) p.shift(); else if (p.length) p.unshift(0); // 진동 패턴은 '울림'부터 시작
  return p;
}
function sfx(name) {
  if (muted) return;
  const a = audioOn(), seq = SFX[name]; if (!a || !seq) return;
  const t0 = a.currentTime + .01;
  for (const [f, d, type, vol, delay = 0] of seq) {
    const o = a.createOscillator(), g = a.createGain(), st = t0 + delay;
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(vol, st); g.gain.exponentialRampToValueAtTime(.0001, st + d);
    o.connect(g); g.connect(a.destination); o.start(st); o.stop(st + d + .02);
  }
}
// 무궁화 노래 (mugung.mp3: 직접 만든 노래 + 고개 도는 소리. 0초 = 노래 시작, 4.3초 = 판정 시작)
let mugBuf = null, mugLoad = null;
function loadMug() {
  if (mugLoad || mugBuf) return; const a = audio(); if (!a) return;
  mugLoad = fetch('mugung.mp3').then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
    .then(b => new Promise((res, rej) => a.decodeAudioData(b, res, rej))).then(buf => { mugBuf = buf; })
    .catch(e => { console.warn('무궁화 소리 불러오기 실패', e); setTimeout(() => { mugLoad = null; }, 30000); });
}
function mugSound(off) { // off: 노래 시작부터 지난 초 (늦게 받으면 그만큼 건너뛰고 이어서)
  if (muted) return;
  const a = audioOn(); if (!a) return;
  if (!mugBuf) { if (off < .3) sfx('mugung'); loadMug(); return; }
  if (off >= mugBuf.duration) return;
  const src = a.createBufferSource(), g = a.createGain(); g.gain.value = .6;
  src.buffer = mugBuf; src.connect(g); g.connect(a.destination);
  if (off < 0) src.start(a.currentTime - off); else src.start(a.currentTime + .01, off);
}
// 호루라기: 심판 호루라기처럼 '삐— 삐이이—' 두 번, 떨리는 소리로 크게
function whistleSound() {
  if (muted) return;
  const a = audioOn(); if (!a) return;
  const t0 = a.currentTime + .01;
  for (const [s0, d] of [[0, .3], [.4, 1]]) {
    const st = t0 + s0, g = a.createGain(), trem = a.createGain(), lfo = a.createOscillator(), lfoG = a.createGain();
    g.gain.setValueAtTime(0, st); g.gain.linearRampToValueAtTime(.5, st + .015);
    g.gain.setValueAtTime(.5, st + d - .06); g.gain.linearRampToValueAtTime(0, st + d);
    trem.gain.value = .75; lfo.frequency.value = 28; lfoG.gain.value = .25; lfo.connect(lfoG); lfoG.connect(trem.gain); // 굴러가는(떨리는) 소리
    for (const [f, type] of [[2900, 'sine'], [3150, 'triangle']]) {
      const o = a.createOscillator(); o.type = type; o.frequency.value = f; o.connect(trem); o.start(st); o.stop(st + d + .02);
    }
    trem.connect(g); g.connect(a.destination); lfo.start(st); lfo.stop(st + d + .02);
  }
}
// 사이렌 증강: 상대가 울리는 소리라 음소거여도 울림 (아이폰 무음 스위치는 막을 수 없음)
function sirenSound(sec) {
  const a = audioOn(); if (!a) return;
  const t0 = a.currentTime + .01, o = a.createOscillator(), o2 = a.createOscillator(), g = a.createGain();
  o.type = 'sawtooth'; o2.type = 'square';
  for (let k = 0; k < sec * 2; k++) { o.frequency.setValueAtTime(700, t0 + k / 2); o.frequency.linearRampToValueAtTime(1400, t0 + k / 2 + .45); }
  o2.frequency.value = 3; const g2 = a.createGain(); g2.gain.value = 80; o2.connect(g2); g2.connect(o.frequency);
  g.gain.setValueAtTime(.35, t0); g.gain.setValueAtTime(.35, t0 + sec - .1); g.gain.linearRampToValueAtTime(.0001, t0 + sec);
  o.connect(g); g.connect(a.destination); o.start(t0); o2.start(t0); o.stop(t0 + sec + .05); o2.stop(t0 + sec + .05);
}
// ---------- 배경음악: 직접 만든 신스 비트 (WebAudio로 실시간 생성, 음원 파일 없음) ----------
// 홈·로비·결과 화면은 보통 크기, 게임 중엔 효과음·경고음이 묻히지 않게 작게
let bgmOn = true;
try { bgmOn = localStorage.getItem('gtag_bgm') !== '0'; } catch (e) {}
const BGM = { bpm: 104, step: 0, next: 0, gain: null, noise: null, level: -1 };
// A단조 4마디 반복: Am - F - Dm - E (마지막 E로 긴장감) / [베이스, 아르페지오 3음] MIDI 번호
const BGM_BARS = [[45, [69, 72, 76]], [41, [65, 69, 72]], [38, [62, 65, 69]], [40, [64, 68, 71]]];
const midiHz = n => 440 * Math.pow(2, (n - 69) / 12);
function bgmNote(a, out, t, f, d, type, vol, cut) {
  const o = a.createOscillator(), g = a.createGain(), fl = a.createBiquadFilter();
  o.type = type; o.frequency.value = f; fl.type = 'lowpass'; fl.frequency.value = cut;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
  o.connect(fl); fl.connect(g); g.connect(out); o.start(t); o.stop(t + d + .02);
}
// 16분음표 한 칸: 킥(1·3·5·7번째 8분음표 자리), 하이햇(엇박), 베이스(8분음표), 아르페지오(16분음표)
function bgmStep(a, out, noise, i, t) {
  const [root, arp] = BGM_BARS[(i >> 4) % 4], s = i & 15, spb = 60 / BGM.bpm / 4;
  if (s % 4 === 0) {
    const o = a.createOscillator(), g = a.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + .12);
    g.gain.setValueAtTime(.35, t); g.gain.exponentialRampToValueAtTime(.0001, t + .18);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + .2);
  }
  if (s % 4 === 2) {
    const src = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain();
    src.buffer = noise; fl.type = 'highpass'; fl.frequency.value = 7000;
    g.gain.setValueAtTime(.06, t); g.gain.exponentialRampToValueAtTime(.0001, t + .05);
    src.connect(fl); fl.connect(g); g.connect(out); src.start(t); src.stop(t + .06);
  }
  if (s % 2 === 0) bgmNote(a, out, t, midiHz(root + (s % 8 === 6 ? 12 : 0)), spb * 1.8, 'sawtooth', .12, 500);
  bgmNote(a, out, t, midiHz(arp[s % 3] + (s >= 8 ? 12 : 0)), spb * .9, 'square', .03, 2400);
}
function bgmNoise(a) {
  const len = Math.floor(a.sampleRate * .1), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
  let x = 12345; for (let i = 0; i < len; i++) { x = (x * 1103515245 + 12345) & 0x7fffffff; d[i] = x / 0x3fffffff - 1; } // 게임 난수와 무관하게
  return buf;
}
function bgmLoop() {
  const a = actx;
  if (!a || a.state !== 'running' || document.hidden) return;
  if (!BGM.gain) { BGM.gain = a.createGain(); BGM.gain.gain.value = 0; BGM.gain.connect(a.destination); BGM.noise = bgmNoise(a); }
  const level = !bgmOn ? 0 : S.screen === 's-game' ? .3 : .6;
  if (level !== BGM.level) { BGM.level = level; BGM.gain.gain.setTargetAtTime(level, a.currentTime, .25); }
  if (!bgmOn) return;
  const spb = 60 / BGM.bpm / 4;
  if (BGM.next < a.currentTime) BGM.next = a.currentTime + .05;
  while (BGM.next < a.currentTime + .3) { bgmStep(a, BGM.gain, BGM.noise, BGM.step, BGM.next); BGM.step = (BGM.step + 1) % 64; BGM.next += spb; }
}
setInterval(bgmLoop, 100);
