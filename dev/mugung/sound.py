# 무궁화 미리보기 소리: 게임에 있던 10음(멜로디 그대로) + 새 박자, 고개 도는 소리, 판정 긴장감
import os; HERE = os.path.dirname(os.path.abspath(__file__))
import json, wave, sys, numpy as np
GAME = 'game' in sys.argv
SR = 48000; DUR = 8.6
tm = json.load(open(os.path.join(HERE, 'timing.json')))
T0, SYL, TURN, HIT = tm['T0'], tm['SYL'], tm['TURN'], tm['HIT']
if GAME: TURN, HIT, T0, DUR = TURN - T0, HIT - T0, 0.0, HIT - T0 + 2.3  # 게임용: 노래 시작 = 0초, 판정 째깍 소리는 뺌
N = int(SR * DUR); out = np.zeros(N); rng = np.random.default_rng(7)
def at(t): return int(t * SR)
def add(sig, t, g=1.0):
    i = at(t); j = min(N, i + len(sig)); out[i:j] += g * sig[:j - i]

# 1) 노래: 새 가락 (내려가는 자장가풍, 단조) + 목소리처럼 들리게 모음 소리 합성
from scipy.signal import lfilter
NOTES = [659.26, 587.33, 493.88, 523.25, 493.88, 440.0, 493.88, 440.0, 392.0, 329.63]  # E5 D5 B4 C5 B4 A4 B4 A4 G4 E4
VOW = ['u', 'u', 'a', 'o', 'i', 'i', 'eo', 'eu', 'i', 'a']           # 무 궁 화 꽃 이 피 었 습 니 다
CONS = ['m', 'g', 'h', 'k', '', 'p', '', 's', 'n', 'd']
FORM = {'a': [(1000, 90, 1), (1500, 110, .5), (3000, 180, .16)], 'i': [(350, 70, 1), (2700, 140, .35), (3300, 200, .2)],
        'u': [(400, 70, 1), (1000, 100, .3), (2800, 200, .1)], 'o': [(550, 80, 1), (1000, 100, .45), (2900, 200, .12)],
        'eo': [(750, 90, 1), (1300, 110, .45), (2900, 200, .14)], 'eu': [(400, 70, 1), (1600, 120, .35), (2900, 200, .12)],
        'nas': [(260, 60, 1), (2100, 200, .05), (2900, 250, .03)]}
def bank(x, fs):
    y = np.zeros_like(x)
    for f, bw, g in fs:
        r = np.exp(-np.pi * bw * 1.9 / SR); w = 2 * np.pi * f / SR
        y += g * lfilter([1 - r], [1, -2 * r * np.cos(w), r * r], x)
    return y
def sing(detune=1.0, seed=1):
    rg = np.random.default_rng(seed)
    st0 = SYL[0][0]; L = SYL[-1][0] + SYL[-1][1] + 0.5 - st0
    n = int(L * SR); t = np.arange(n) / SR + st0
    # 음높이: 음 사이를 미끄러지듯 이음, 첫 음은 아래서 끌어올림, 마지막 '다'는 아래로 처짐
    f0 = np.full(n, NOTES[0])
    for i, (s, d) in enumerate(SYL):
        prev = NOTES[i - 1] if i else NOTES[0] * 2 ** (-3 / 12)
        g = 0.07 if d > 0.2 else 0.035
        if i == 0: g = 0.16
        m = t >= s; k = np.clip((t[m] - s) / g, 0, 1); k = k * k * (3 - 2 * k)
        f0[m] = prev * (NOTES[i] / prev) ** k
    s9, d9 = SYL[-1]; m = t >= s9 + 0.05; f0[m] *= 2 ** (-2.0 / 12 * np.clip((t[m] - s9 - 0.05) / (d9 + 0.25), 0, 1))
    age = np.zeros(n)
    for s, d in SYL: m = t >= s; age[m] = t[m] - s
    f0 *= 1 + 0.007 * np.sin(2 * np.pi * 5.2 * t) * np.clip((age - 0.2) / 0.25, 0, 1)
    f0 *= 1 + 0.002 * np.cumsum(rg.standard_normal(n)) / np.sqrt(np.arange(1, n + 1))
    f0 *= detune
    ph = np.cumsum(f0) / SR % 1.0
    src = 2 * ph - 1; src = lfilter([0.25], [1, -0.75], src)      # 톱니 → 부드럽게
    src += 0.04 * rg.standard_normal(n)                            # 숨소리
    voice = np.zeros(n)
    for i, (s, d) in enumerate(SYL):
        cs = {'h': 0.045, 'p': 0.03, 's': 0.045}.get(CONS[i], 0.0)
        a0, a1 = s + cs, s + d
        nxt = SYL[i + 1][0] if i + 1 < len(SYL) else 99
        rel = 0.03 if nxt - a1 < 0.05 else (0.05 if i < 9 else 0.35)
        e = np.clip((t - a0) / 0.025, 0, 1) * np.clip(1 - (t - a1) / rel, 0, 1)
        if not e.any(): continue
        vo = bank(src, FORM[VOW[i]])
        if CONS[i] in ('m', 'n'):
            nas = bank(src, FORM['nas']); k = np.clip((t - s) / 0.05, 0, 1)
            vo = vo * k + nas * (1 - k) * 2.2
        r = np.sqrt(np.mean((vo * e)[e > .5] ** 2)) + 1e-9
        voice += vo * e / r
    voice /= np.abs(voice).max()
    # 자음 (짧은 잡음)
    for i, (s, d) in enumerate(SYL):
        c = CONS[i]
        if c in ('g', 'k', 'd', 'p'):
            L2 = {'g': .012, 'k': .015, 'd': .008, 'p': .035}[c]; z = rg.standard_normal(int(L2 * SR)) * np.linspace(1, 0, int(L2 * SR)) ** 2
            z = bank(z, FORM[VOW[i]] if c == 'p' else [(1800, 600, 1), (3200, 800, .5)])
            j = int((s - st0) * SR); voice[j:j + len(z)] += 0.35 * z / (np.abs(z).max() + 1e-9)
        elif c in ('s', 'h'):
            L2 = 0.05; z = rg.standard_normal(int(L2 * SR)) * np.sin(np.pi * np.arange(int(L2 * SR)) / (L2 * SR))
            z = bank(z, [(5500, 1500, 1), (7500, 1500, .6)]) if c == 's' else bank(z, FORM[VOW[i]])
            j = int((s - st0) * SR); voice[j:j + len(z)] += (0.22 if c == 's' else 0.3) * z / (np.abs(z).max() + 1e-9)
    return voice, st0
v1, st0 = sing(1.0, 1); v2, _ = sing(2 ** (9 / 1200), 2)          # 살짝 어긋난 두 목소리 → 으스스하게
vo = v1 + 0.55 * np.concatenate([np.zeros(int(0.012 * SR)), v2])[:len(v1)]
irt = np.arange(int(1.8 * SR)) / SR; ir = rng.standard_normal(len(irt)) * np.exp(-irt / 0.45); ir[:int(.02 * SR)] = 0; ir /= np.sqrt((ir ** 2).sum())
vw = np.fft.irfft(np.fft.rfft(vo, 2 * len(vo) + len(ir)) * np.fft.rfft(ir, 2 * len(vo) + len(ir)))[:len(vo) + len(ir)]
vo = np.concatenate([vo, np.zeros(len(ir))]) + 0.45 * vw
add(vo / np.abs(vo).max(), T0 + st0, 0.85)
# 아주 작게 오르골이 같은 음을 따라감
for (s, d), f in zip(SYL, NOTES):
    tt = np.arange(int(0.9 * SR)) / SR
    add((np.sin(2 * np.pi * f * 2 * tt) + 0.3 * np.sin(2 * np.pi * f * 6 * tt)) * np.exp(-tt / 0.35) * np.minimum(tt / 0.003, 1), T0 + s, 0.035)

# 2) 노래 밑 낮은 울림 (고개 돌기 직전에 뚝 끊김)
t = np.arange(at(TURN - 0.03) - at(0.35)) / SR
dr = (np.sin(2 * np.pi * 65.4 * t) + 0.6 * np.sin(2 * np.pi * 98 * t) + 0.3 * np.sin(2 * np.pi * 130.8 * t * 1.004)) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.7 * t))
dr *= np.minimum(t / 0.6, 1); dr[-200:] *= np.linspace(1, 0, 200)
add(dr, 0.35, 0.035)

# 3) 고개 도는 '끼이익' (나무 삐걱임: 불규칙한 딸깍 + 공명)
def reson(x, f, q=0.995):
    w = 2 * np.pi * f / SR; a1, a2 = -2 * q * np.cos(w), q * q; y = np.zeros_like(x)
    for n in range(2, len(x)): y[n] = x[n] - a1 * y[n - 1] - a2 * y[n - 2]
    return y
L = HIT - TURN + 0.06; clicks = np.zeros(int(L * SR)); pos = 0.0
while pos < L - 0.01:
    p = pos / L; clicks[int(pos * SR)] = 1 + 0.4 * rng.random()
    pos += 1 / (70 - 40 * p + 15 * rng.random())
cr = 0.6 * reson(clicks, 820) + 0.4 * reson(clicks, 1650) + 0.3 * reson(clicks, 380)
cr *= np.linspace(0.6, 1.0, len(cr)); cr /= np.abs(cr).max()
add(cr, TURN, 0.45)
t = np.arange(int(L * SR)) / SR; wh = np.convolve(rng.standard_normal(len(t)), np.ones(40) / 40, 'same') * np.sin(np.pi * t / L) ** 2
add(wh, TURN, 0.5)

# 4) 쿵 + 쨍 (눈 번쩍)
t = np.arange(int(1.4 * SR)) / SR
boom = np.sin(2 * np.pi * np.cumsum(38 + 45 * np.exp(-t / 0.08)) / SR) * np.exp(-t / 0.35)
add(boom, HIT, 0.9)
add(rng.standard_normal(int(0.04 * SR)) * np.linspace(1, 0, int(0.04 * SR)), HIT, 0.25)
t = np.arange(int(2.2 * SR)) / SR
ting = (np.sin(2 * np.pi * 1568 * t) + np.sin(2 * np.pi * 1661 * t) + 0.5 * np.sin(2 * np.pi * 2349 * t)) * np.exp(-t / 0.55)
add(ting, HIT + 0.01, 0.10)

# 5) 판정: 1초마다 째깍 + 낮은 심장 소리
for k in (range(1, 4) if not GAME else []):
    tk = HIT + k
    if tk >= DUR - 0.05: break
    t = np.arange(int(0.05 * SR)) / SR
    add(np.sin(2 * np.pi * 2200 * t) * np.exp(-t / 0.008) + 0.6 * np.sin(2 * np.pi * 1100 * t) * np.exp(-t / 0.012), tk, 0.25)
for tb in (np.arange(HIT + 0.55, DUR - 0.3, 0.85) if not GAME else []):
    for d, g in [(0, 1), (0.17, 0.7)]:
        t = np.arange(int(0.3 * SR)) / SR
        add(np.sin(2 * np.pi * np.cumsum(55 + 30 * np.exp(-t / 0.03)) / SR) * np.exp(-t / 0.09), tb + d, 0.35 * g)

# 잔향 (간단한 컨볼루션)
ir_t = np.arange(int(1.3 * SR)) / SR
ir = rng.standard_normal(len(ir_t)) * np.exp(-ir_t / 0.32); ir[0] = 0; ir /= np.sqrt((ir ** 2).sum())
wet = np.fft.irfft(np.fft.rfft(out, 2 * N) * np.fft.rfft(ir, 2 * N))[:N]
mix = out + 0.22 * wet
mix[-int(0.25 * SR):] *= np.linspace(1, 0, int(0.25 * SR))
mix = np.tanh(1.2 * mix / np.abs(mix).max()) ; mix *= 0.89 / np.abs(mix).max()
st = np.stack([mix, mix], 1)
with wave.open(os.path.join(HERE, '') + ('game.wav' if GAME else 'sound.wav'), 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st * 32767).astype(np.int16).tobytes())
print('ok')
