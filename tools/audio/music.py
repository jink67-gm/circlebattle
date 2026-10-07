"""
서클배틀 배경음 (BGM) — 모두 직접 작곡·합성한 원본 곡
-------------------------------------------------
  title        시작 화면   C장조 120 BPM 16마디 = 32초  밝은 미래형 아케이드 (반복해도 피곤하지 않게 앞 8마디는 가볍게)
  lobby        대기방      F장조 96 BPM 16마디 = 40초   차분하지만 기대감 (뒤 8마디에 부드러운 킥 + 작은 상승음)
  battle       경기        A단조 128 BPM 16마디 = 30초  빠르고 경쾌, 멜로디는 뒤쪽 8마디에만 작게 (문제 풀이 방해 X)
  danger       종료 임박   battle 과 같은 빠르기·조·코드 → 자연스럽게 겹쳐 넘어감 (16분 하이햇, 긴장 오스티나토)
  result-win   승리        밝고 짧은 팡파르 (약 11초, 반복 없음)
  result-lose  패배        너무 우울하지 않게 — 마지막은 장조로 끝나는 따뜻한 곡 (약 13초)

반복 곡은 끝의 울림을 앞쪽에 겹쳐 넣어(꼬리 접기) 이음매 없이 반복됩니다.
"""
import numpy as np
from synth import (SR, secs, osc, glide, noise, env, perc, lowpass, highpass, bandpass, sweep_bp,
                   reverb, delay, to_stereo, add_at, master, fade, midi)


# =========================================================
#  악기
# =========================================================
def t_axis(d):
    return np.arange(secs(d)) / SR


def pluck(f, dur, vel=1.0, bright=1.0):
    """반짝이는 아케이드 플럭 (톱니+네모, 처음엔 밝고 금방 부드럽게)"""
    d = dur + 0.3
    t = t_axis(d)
    x = 0.6 * osc(f, d, 'saw') + 0.4 * osc(f * 1.004, d, 'square', pw=0.3)
    hi = lowpass(x, min(9000, f * 9 * bright))
    lo = lowpass(x, min(4000, f * 2.2))
    k = np.exp(-t * 14)
    y = lo * (1 - k) + hi * k
    a = np.exp(-t * (3.0 / max(dur, 0.08)))
    a[:secs(0.003)] *= np.linspace(0, 1, secs(0.003))
    a *= np.clip((dur + 0.25 - t) / 0.25, 0, 1)
    return y * a * vel * 0.5


def bass(f, dur, vel=1.0, cutoff=700, decay=0.0):
    d = dur + 0.08
    t = t_axis(d)
    x = 0.55 * osc(f, d, 'saw') + 0.7 * osc(f, d, 'sine') + 0.25 * osc(f * 0.5, d, 'sine')
    x = lowpass(x, min(cutoff, f * 6), order=2)
    e = env(d, 0.004, 0.08, 0.75, 0.06)
    if decay:
        e *= np.exp(-t * decay)
    return x * e * vel * 0.55


def pad(fs, dur, vel=1.0, cutoff=2200, attack=0.35, release=0.7):
    """넓게 퍼지는 화음 (톱니 5개를 조금씩 어긋나게) — 스테레오"""
    d = dur + release
    out = np.zeros((secs(d), 2))
    det = [-0.012, -0.006, 0.0, 0.006, 0.012]
    for f in fs:
        for i, c in enumerate(det):
            v = osc(f * (1 + c), d, 'saw', phase=(i * 0.21) % 1)
            pan = (i - 2) / 2.5
            out += to_stereo(v * 0.18, pan)
    out = lowpass(out, cutoff)
    e = env(d, attack, 0.3, 0.85, release)
    return out * e[:, None] * vel * 0.32 / max(1, len(fs) ** 0.5)


def lead(f, dur, vel=1.0, cutoff=3200):
    d = dur + 0.15
    t = t_axis(d)
    vib = 1 + 0.004 * np.sin(2 * np.pi * 5.5 * t) * np.clip((t - 0.15) / 0.2, 0, 1)
    fa = f * vib
    x = 0.55 * osc(fa, d, 'square', pw=0.35) + 0.45 * osc(fa * 1.003, d, 'saw')
    x = lowpass(x, cutoff)
    e = env(d, 0.012, 0.15, 0.7, 0.12)
    return x * e * vel * 0.32


def bell(f, dur, vel=1.0, ratio=3.5, index=2.0):
    """맑은 종소리 (FM)"""
    d = dur + 0.9
    t = t_axis(d)
    idx = index * np.exp(-t * 4)
    mod = np.sin(2 * np.pi * f * ratio * t) * idx
    x = np.sin(2 * np.pi * f * t + mod)
    e = np.exp(-t * 3.2)
    e[:secs(0.002)] *= np.linspace(0, 1, secs(0.002))
    return x * e * vel * 0.3


def brass(f, dur, vel=1.0):
    d = dur + 0.2
    t = t_axis(d)
    x = sum(osc(f * (1 + c), d, 'saw') for c in (-0.004, 0, 0.005)) / 3
    k = np.clip(t / 0.08, 0, 1)
    lo = lowpass(x, min(1200, f * 3))
    hi = lowpass(x, min(6000, f * 10))
    y = lo * (1 - k * 0.7) + hi * (k * 0.7) * np.exp(-t * 2.5) + lo * 0.2
    e = env(d, 0.03, 0.2, 0.8, 0.15)
    return y * e * vel * 0.45


def keys(f, dur, vel=1.0):
    """부드러운 건반 (배음이 천천히 사라짐)"""
    d = dur + 1.2
    t = t_axis(d)
    y = np.zeros_like(t)
    for h, (a, k) in enumerate([(1.0, 1.6), (0.45, 2.6), (0.22, 3.8), (0.1, 5.0), (0.05, 6.5)], start=1):
        y += a * np.sin(2 * np.pi * f * h * t * (1 + 0.0004 * h)) * np.exp(-t * k)
    a0 = np.clip(t / 0.004, 0, 1) * np.clip((dur + 1.2 - t) / 0.3, 0, 1)
    return y * a0 * vel * 0.22


def saw_stab(f, dur, vel=1.0):
    d = dur + 0.05
    x = osc(f, d, 'saw') + osc(f * 1.007, d, 'saw')
    x = lowpass(x, min(2500, f * 5))
    return x * perc(d, 0.003, 9) * vel * 0.18


# ---------------- 타악기 ----------------
def kick(vel=1.0):
    d = 0.42
    t = t_axis(d)
    f = 48 + 120 * np.exp(-t * 28)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR)
    e = np.exp(-t * 7.5)
    e[:12] *= np.linspace(0.2, 1, 12)
    click = highpass(noise(0.006), 2500) * np.linspace(1, 0, secs(0.006)) * 0.25
    x = x * e
    x[:len(click)] += click
    return x * vel * 0.9


def snare(vel=1.0):
    d = 0.26
    t = t_axis(d)
    nz = bandpass(noise(d), 1500, 8000) * np.exp(-t * 16)
    tone = np.sin(2 * np.pi * 185 * t) * np.exp(-t * 28)
    return (nz * 0.7 + tone * 0.45) * vel * 0.55


def clap(vel=1.0):
    d = 0.3
    t = t_axis(d)
    burst = np.zeros_like(t)
    for k, off in enumerate((0.0, 0.011, 0.022)):
        i = secs(off)
        n = secs(0.009)
        burst[i:i + n] += np.linspace(1, 0.3, n)
    tail = np.exp(-np.clip(t - 0.03, 0, None) * 18) * (t >= 0.03)
    x = bandpass(noise(d), 900, 4500) * (burst + tail * 0.8)
    return x * vel * 0.5


def hat(vel=1.0, open_=False):
    d = 0.32 if open_ else 0.06
    t = t_axis(d)
    x = highpass(noise(d), 7500, order=2)
    e = np.exp(-t * (9 if open_ else 70))
    return x * e * vel * 0.28


def shaker(vel=1.0):
    d = 0.09
    t = t_axis(d)
    x = bandpass(noise(d), 5000, 11000)
    e = np.clip(t / 0.012, 0, 1) * np.exp(-t * 40)
    return x * e * vel * 0.22


def tom(f, vel=1.0):
    d = 0.35
    t = t_axis(d)
    fr = f * (1 + 0.6 * np.exp(-t * 20))
    x = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 9)
    return x * vel * 0.55


def crash(vel=1.0):
    d = 1.8
    t = t_axis(d)
    x = highpass(noise(d), 4500) * np.exp(-t * 2.6)
    return x * vel * 0.16


def riser(dur, vel=1.0, f0=300, f1=6000):
    n = secs(dur)
    fr = f0 * (f1 / f0) ** np.linspace(0, 1, n)
    x = sweep_bp(noise(dur), fr, q=3.0)
    e = np.linspace(0, 1, n) ** 2
    return x * e * vel * 0.35


# =========================================================
#  악보 도우미
# =========================================================
class Song:
    """bars 마디 · bpm 빠르기 · 4/4. 소리를 박자 위치에 놓고 마지막에 섞음"""
    def __init__(self, bpm, bars, tail=3.5):
        self.bpm = bpm
        self.bars = bars
        self.beat = 60.0 / bpm
        self.length = secs(bars * 4 * self.beat)
        self.tail = secs(tail)
        self.buses = {}

    def bus(self, name):
        if name not in self.buses:
            self.buses[name] = np.zeros((self.length + self.tail, 2))
        return self.buses[name]

    def at(self, beat):
        return int(round(beat * self.beat * SR))

    def put(self, bus, sound, beat, gain=1.0, pan=0.0):
        s = sound if sound.ndim == 2 else to_stereo(sound, pan)
        add_at(self.bus(bus), s, self.at(beat), gain)

    def mix(self, levels, sends=None, rev=(0.22, 1.8, 6500), loop=True, sidechain=None, kick_beats=()):
        total = np.zeros((self.length + self.tail, 2))
        send = np.zeros_like(total)
        # 사이드체인: 킥이 칠 때 패드·베이스를 살짝 눌러 "펌핑" (리듬감)
        duck = np.ones(len(total))
        if sidechain:
            for b in kick_beats:
                i = self.at(b)
                n = secs(0.22)
                seg = 1 - sidechain * np.exp(-np.linspace(0, 5, n))
                duck[i:i + n] = np.minimum(duck[i:i + n], seg[:max(0, min(n, len(duck) - i))])
        for name, buf in self.buses.items():
            g = levels.get(name, 1.0)
            x = buf * g
            if sidechain and name in ('pad', 'bass', 'stab'):
                x = x * duck[:, None]
            total += x
            if sends and name in sends:
                send += x * sends[name]
        wet = reverb(send, mix=1.0, length=rev[1], damp=rev[2])[:, :] if sends else None
        if wet is not None:
            w = np.zeros((max(len(total), len(wet)), 2))
            w[:len(total)] += total
            w[:len(wet)] += wet * rev[0]
            total = w
        if loop:
            # 꼬리 접기: 끝을 넘친 소리를 앞쪽에 더해 이음매 없이 반복
            out = total[:self.length].copy()
            over = total[self.length:]
            k = min(len(over), self.length)
            out[:k] += over[:k]
            return out
        return total


def bars_of(song, chords, start_bar=0):
    """[코드, 코드 …] 를 마디마다 → [(마디 번호, 코드)]"""
    return [(start_bar + i, c) for i, c in enumerate(chords)]


# =========================================================
#  1. title — 밝은 미래형 아케이드 (C장조 120 BPM, 32초)
# =========================================================
def make_title():
    s = Song(120, 16)
    C, G, Am, F = [60, 64, 67], [59, 62, 67], [57, 60, 64], [57, 60, 65]
    prog = [C, G, Am, F, C, G, F, G] * 2
    roots = {tuple(C): 36, tuple(G): 31, tuple(Am): 33, tuple(F): 29}
    kicks = []
    for bar, ch in enumerate(prog):
        b0 = bar * 4
        full = bar >= 8
        r = roots[tuple(ch)]
        # 패드 (두 옥타브 위 화음)
        s.put('pad', pad([midi(n + 12) for n in ch], 4 * s.beat, 0.8 if full else 0.65, cutoff=2600), b0)
        # 베이스: 8분음표 옥타브 (아케이드 느낌)
        for i in range(8):
            n = r + 12 + (12 if i % 2 else 0)
            s.put('bass', bass(midi(n), s.beat * 0.45, 0.9 if i % 2 == 0 else 0.6, cutoff=900), b0 + i * 0.5)
        # 아르페지오 16분음표 (화음 음을 오르내림)
        tones = [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[0] + 24]
        pat = [0, 1, 2, 3, 2, 1, 2, 3, 0, 1, 2, 3, 2, 3, 1, 2]
        for i, k in enumerate(pat):
            v = (0.55 if i % 4 == 0 else 0.38) * (1.0 if full else 0.85)
            s.put('arp', pluck(midi(tones[k]), s.beat * 0.22, v, bright=1.1), b0 + i * 0.25, pan=0.35 if i % 2 else -0.35)
        # 드럼: 앞 8마디는 가볍게, 뒤 8마디는 꽉 차게
        for q in range(4):
            if full or q in (0, 2):
                s.put('drums', kick(0.85 if full else 0.7), b0 + q)
                kicks.append(b0 + q)
            s.put('drums', hat(0.6), b0 + q + 0.5, pan=0.2)
            if full:
                s.put('drums', hat(0.3), b0 + q + 0.25, pan=-0.2)
                s.put('drums', hat(0.3), b0 + q + 0.75, pan=-0.2)
        if full:
            s.put('drums', clap(0.8), b0 + 1)
            s.put('drums', clap(0.8), b0 + 3)
        elif bar % 2 == 1:
            s.put('drums', snare(0.35), b0 + 3)
        # 반짝이는 종 (마디 첫 박)
        if bar % 2 == 0:
            s.put('bell', bell(midi(ch[2] + 24), 0.5, 0.35), b0, pan=0.4)
    # 멜로디 (뒤 8마디)
    mel = [
        [(0, 1, 'E5'), (1, 1, 'G5'), (2, 1, 'C6'), (3, .5, 'B5'), (3.5, .5, 'G5')],
        [(0, 1.5, 'D5'), (1.5, .5, 'B4'), (2, 1, 'D5'), (3, 1, 'G5')],
        [(0, 1, 'A5'), (1, .5, 'G5'), (1.5, .5, 'E5'), (2, 1, 'C5'), (3, 1, 'E5')],
        [(0, 2, 'F5'), (2, 1, 'A5'), (3, 1, 'G5')],
        [(0, 1, 'E5'), (1, 1, 'G5'), (2, 1, 'C6'), (3, .5, 'D6'), (3.5, .5, 'E6')],
        [(0, 1, 'D6'), (1, 1, 'B5'), (2, 2, 'G5')],
        [(0, 1, 'A5'), (1, 1, 'C6'), (2, 1, 'F5'), (3, 1, 'A5')],
        [(0, 3, 'G5')],
    ]
    from synth import hz
    for bi, notes in enumerate(mel):
        for (b, d, n) in notes:
            s.put('lead', lead(hz(n), d * s.beat * 0.92, 0.75), (8 + bi) * 4 + b)
    # 앞 8마디: 종소리로 같은 멜로디를 가볍게 (처음 들어도 귀에 익게)
    for bi, notes in enumerate(mel[:4]):
        for (b, d, n) in notes:
            s.put('bell', bell(hz(n), d * s.beat, 0.22), (4 + bi) * 4 + b, pan=-0.2)
    y = s.mix({'pad': 0.55, 'bass': 0.7, 'arp': 0.55, 'drums': 0.8, 'bell': 0.5, 'lead': 0.55},
              sends={'pad': 0.5, 'arp': 0.6, 'bell': 0.8, 'lead': 0.5}, rev=(0.28, 1.8, 7000),
              sidechain=0.35, kick_beats=kicks)
    return master(y, -18.0, -1.5)


# =========================================================
#  2. lobby — 차분하지만 기대감 (F장조 96 BPM, 40초)
# =========================================================
def make_lobby():
    s = Song(96, 16)
    chords = [
        ([53, 57, 60, 64], 41), ([52, 55, 59, 62], 40), ([50, 53, 57, 60], 38), ([48, 52, 55, 59], 36),
        ([46, 50, 53, 57], 34), ([45, 48, 52, 55], 33), ([43, 46, 50, 53], 31), ([48, 53, 55, 58], 36),
    ] * 2
    kicks = []
    from synth import hz
    for bar, (ch, r) in enumerate(chords):
        b0 = bar * 4
        late = bar >= 8
        s.put('pad', pad([midi(n + 12) for n in ch], 4 * s.beat, 0.7, cutoff=1800, attack=0.6, release=1.0), b0)
        s.put('bass', bass(midi(r + 12), 2 * s.beat * 0.95, 0.75, cutoff=500), b0)
        s.put('bass', bass(midi(r + 12), 1.5 * s.beat * 0.9, 0.55, cutoff=500), b0 + 2.5)
        # 부드러운 종 아르페지오 (8분음표, 위로 올라갔다 내려옴)
        tones = [ch[0] + 24, ch[1] + 24, ch[2] + 24, ch[3] + 24, ch[2] + 24, ch[1] + 24, ch[2] + 12, ch[3] + 12]
        for i, n in enumerate(tones):
            if not late and i in (5, 7):
                continue
            s.put('arp', bell(midi(n), s.beat * 0.5, 0.26 if i % 2 else 0.33, ratio=2.0, index=1.2), b0 + i * 0.5,
                  pan=0.3 if i % 2 else -0.3)
        # 셰이커 (가볍게) · 뒤 8마디는 부드러운 킥으로 기대감
        for i in range(8):
            s.put('perc', shaker(0.5 if i % 2 else 0.3), b0 + i * 0.5 + 0.02)
        if late:
            s.put('perc', kick(0.55), b0)
            s.put('perc', kick(0.45), b0 + 2)
            kicks += [b0, b0 + 2]
            s.put('perc', clap(0.35), b0 + 3)
    # 멜로디 (뒤 8마디, 부드러운 건반)
    mel = [(0, 1.5, 'A5'), (1.5, .5, 'G5'), (2, 2, 'E5'),
           (4, 1.5, 'G5'), (5.5, .5, 'F5'), (6, 2, 'D5'),
           (8, 1, 'F5'), (9, 1, 'E5'), (10, 1, 'D5'), (11, 1, 'C5'),
           (12, 3, 'E5'),
           (16, 1.5, 'D5'), (17.5, .5, 'F5'), (18, 2, 'A5'),
           (20, 1.5, 'C6'), (21.5, .5, 'A5'), (22, 2, 'E5'),
           (24, 1, 'D5'), (25, 1, 'F5'), (26, 1, 'Bb5'), (27, 1, 'A5'),
           (28, 4, 'G5')]
    for (b, d, n) in mel:
        s.put('lead', keys(hz(n), d * s.beat, 0.9), 32 + b, pan=0.1)
    # 마지막 2마디: 작은 상승음 (다음 반복으로 자연스럽게)
    s.put('fx', riser(2 * 4 * s.beat, 0.35, 400, 4000), 56)
    y = s.mix({'pad': 0.6, 'bass': 0.55, 'arp': 0.5, 'perc': 0.6, 'lead': 0.7, 'fx': 0.3},
              sends={'pad': 0.6, 'arp': 0.9, 'lead': 0.6, 'fx': 0.5}, rev=(0.35, 2.4, 6000),
              sidechain=0.25, kick_beats=kicks)
    return master(y, -19.0, -1.5)


# =========================================================
#  3. battle / 4. danger — A단조 128 BPM, 30초 (같은 코드·같은 박자)
# =========================================================
BATTLE_CH = [([57, 60, 64], 33), ([57, 60, 65], 29), ([55, 60, 64], 36), ([55, 59, 62], 31)] * 4


def drums_battle(s, bar, kicks, hard=False):
    b0 = bar * 4
    for q in range(4):
        s.put('drums', kick(0.9), b0 + q)
        kicks.append(b0 + q)
        s.put('drums', hat(0.55 if not hard else 0.5), b0 + q + 0.5, pan=0.25)
        if hard:
            for sub in (0.25, 0.75):
                s.put('drums', hat(0.32), b0 + q + sub, pan=-0.25)
    s.put('drums', clap(0.75), b0 + 1)
    s.put('drums', snare(0.55), b0 + 1)
    s.put('drums', clap(0.75), b0 + 3)
    s.put('drums', snare(0.55), b0 + 3)
    if bar % 2 == 1:
        s.put('drums', hat(0.45, open_=True), b0 + 3.5, pan=0.3)


def make_battle():
    s = Song(128, 16)
    kicks = []
    from synth import hz
    for bar, (ch, r) in enumerate(BATTLE_CH):
        b0 = bar * 4
        s.put('pad', pad([midi(n) for n in ch], 4 * s.beat, 0.6, cutoff=1800), b0)
        pat = [0, 0, 12, 0, 0, 12, 0, 12]
        for i, o in enumerate(pat):
            s.put('bass', bass(midi(r + 12 + o), s.beat * 0.42, 0.85 if i % 2 == 0 else 0.65, cutoff=850), b0 + i * 0.5)
        drums_battle(s, bar, kicks)
        if bar >= 4:
            tones = [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[1] + 24]
            pat2 = [0, 2, 1, 3, 0, 2, 1, 2, 0, 2, 1, 3, 2, 1, 0, 1]
            for i, k in enumerate(pat2):
                s.put('arp', pluck(midi(tones[k]), s.beat * 0.2, 0.42 if i % 4 == 0 else 0.3), b0 + i * 0.25,
                      pan=0.4 if i % 2 else -0.4)
        if bar % 4 == 3:
            s.put('fx', crash(0.5), b0 + 4 if bar < 15 else 0)
    # 짧은 멜로디 훅 (뒤 8마디, 작게 — 문제 풀이를 방해하지 않게)
    hook = [
        [(0, .5, 'A4'), (.5, .5, 'C5'), (1, 1, 'E5'), (2, .5, 'D5'), (2.5, .5, 'C5'), (3, 1, 'B4')],
        [(0, 1.5, 'C5'), (1.5, .5, 'A4'), (2, 1, 'C5'), (3, 1, 'F5')],
        [(0, 1, 'E5'), (1, 1, 'G5'), (2, .5, 'E5'), (2.5, .5, 'D5'), (3, 1, 'C5')],
        [(0, 2, 'D5'), (2, 1, 'B4'), (3, 1, 'G4')],
    ]
    for rep in (8, 12):
        for bi, notes in enumerate(hook):
            for (b, d, n) in notes:
                if rep == 12 and bi == 3:
                    continue
                s.put('lead', lead(hz(n), d * s.beat * 0.9, 0.7, cutoff=2800), (rep + bi) * 4 + b)
    s.put('lead', lead(hz('E5'), 3.5 * s.beat, 0.7, cutoff=2800), 15 * 4)
    # 4마디마다 작은 탐 채우기
    for bar in (7, 15):
        for i, f in enumerate((220, 180, 150, 120)):
            s.put('drums', tom(f, 0.5), bar * 4 + 3 + i * 0.25)
    y = s.mix({'pad': 0.45, 'bass': 0.75, 'arp': 0.5, 'drums': 0.75, 'lead': 0.4, 'fx': 0.5},
              sends={'pad': 0.4, 'arp': 0.5, 'lead': 0.5, 'fx': 0.3}, rev=(0.22, 1.5, 6500),
              sidechain=0.4, kick_beats=kicks)
    return master(y, -17.5, -1.5)


def make_danger():
    s = Song(128, 16)
    kicks = []
    for bar, (ch, r) in enumerate(BATTLE_CH):
        b0 = bar * 4
        s.put('pad', pad([midi(n) for n in ch], 4 * s.beat, 0.55, cutoff=1400 + 300 * (bar % 4)), b0)
        # 16분음표로 몰아치는 베이스
        for i in range(16):
            o = 12 if i % 4 == 2 else 0
            s.put('bass', bass(midi(r + 12 + o), s.beat * 0.2, 0.8 if i % 4 == 0 else 0.55, cutoff=1000), b0 + i * 0.25)
        drums_battle(s, bar, kicks, hard=True)
        # 긴장 오스티나토: 반음 위아래 (E-F) 16분음표
        top = ch[2] + 12
        for i in range(16):
            n = top if i % 2 == 0 else top + 1
            s.put('arp', pluck(midi(n), s.beat * 0.18, 0.36 if i % 4 == 0 else 0.26, bright=0.9), b0 + i * 0.25,
                  pan=0.45 if i % 2 else -0.45)
        # 8분음표 스탭 (뒷박)
        for i in range(4):
            s.put('stab', saw_stab(midi(ch[0]), s.beat * 0.3, 0.7), b0 + i + 0.5)
        if bar % 4 == 3:
            for i, f in enumerate((240, 200, 170, 140, 120, 100, 90, 80)):
                s.put('drums', tom(f, 0.45), b0 + 2 + i * 0.25)
        if bar % 4 == 0:
            s.put('fx', crash(0.6), b0)
    # 4마디마다 올라가는 긴장음
    for b in (0, 4, 8, 12):
        s.put('fx', riser(4 * 4 * s.beat * 0.95, 0.4, 300, 3000), b * 4)
    y = s.mix({'pad': 0.4, 'bass': 0.7, 'arp': 0.42, 'drums': 0.8, 'stab': 0.5, 'fx': 0.45},
              sends={'pad': 0.4, 'arp': 0.5, 'fx': 0.4, 'stab': 0.3}, rev=(0.2, 1.4, 6500),
              sidechain=0.4, kick_beats=kicks)
    return master(y, -16.5, -1.2)


# =========================================================
#  5. result-win — 밝고 짧은 승리 팡파르 (C장조 120 BPM)
# =========================================================
def make_win():
    from synth import hz
    s = Song(120, 5, tail=4.0)
    # 1마디: 올라가는 팡파르 → 2~3마디: 노래 → 4마디: 큰 C장조
    mel = [(0, .5, 'G4'), (.5, .5, 'C5'), (1, .5, 'E5'), (1.5, .5, 'G5'), (2, 2, 'C6'),
           (4, 1, 'A5'), (5, 1, 'G5'), (6, 1, 'F5'), (7, 1, 'E5'),
           (8, 1, 'D5'), (9, 1, 'E5'), (10, 1, 'F5'), (11, 1, 'D5'),
           (12, 4, 'C6')]
    for (b, d, n) in mel:
        s.put('lead', brass(hz(n), d * s.beat * 0.92, 0.9), b)
        s.put('bell', bell(hz(n) * 2, d * s.beat * 0.5, 0.15), b, pan=0.3)
    chords = [(0, [60, 64, 67], 36), (4, [57, 60, 65], 29), (8, [55, 59, 62], 31), (12, [60, 64, 67, 72], 36)]
    for b, ch, r in chords:
        s.put('pad', pad([midi(n) for n in ch], 4 * s.beat if b < 12 else 6 * s.beat, 0.8, cutoff=3000), b)
        s.put('bass', bass(midi(r + 12), 4 * s.beat * 0.9 if b < 12 else 5 * s.beat, 0.8), b)
    for q in range(12):
        s.put('drums', kick(0.7) if q % 2 == 0 else snare(0.5), q)
    for i in range(8):
        s.put('drums', snare(0.25 + i * 0.05), 11 + i * 0.125)
    s.put('drums', kick(0.9), 12)
    s.put('drums', crash(0.9), 12)
    # 반짝이는 마무리 (C장조 음을 빠르게 위로)
    for i, n in enumerate([72, 76, 79, 84, 88, 91, 96]):
        s.put('bell', bell(midi(n), 0.3, 0.25), 12.5 + i * 0.125, pan=-0.4 + i * 0.12)
    y = s.mix({'lead': 0.7, 'bell': 0.6, 'pad': 0.5, 'bass': 0.6, 'drums': 0.7},
              sends={'lead': 0.4, 'bell': 0.8, 'pad': 0.5}, rev=(0.3, 2.2, 7000), loop=False)
    y = fade(y, 0, 1.5)
    return master(y, -17.0, -1.5)


# =========================================================
#  6. result-lose — 너무 우울하지 않은 결과 곡 (끝은 장조로)
# =========================================================
def make_lose():
    from synth import hz
    s = Song(90, 5, tail=4.0)
    prog = [([57, 60, 64], 33), ([53, 57, 60], 29), ([48, 52, 55], 36), ([55, 59, 62], 31), ([48, 52, 55, 60], 36)]
    for bar, (ch, r) in enumerate(prog):
        b0 = bar * 4
        s.put('pad', pad([midi(n + 12) for n in ch], 4 * s.beat, 0.55, cutoff=1500, attack=0.5, release=1.2), b0)
        s.put('bass', bass(midi(r + 12), 3.8 * s.beat, 0.55, cutoff=400), b0)
        # 부드러운 건반 아르페지오
        for i, n in enumerate([ch[0], ch[1], ch[2], ch[1] + 12 if len(ch) < 4 else ch[3], ch[2], ch[1]]):
            if bar == 4 and i > 3:
                break
            s.put('keys', keys(midi(n + 12), s.beat * 0.9, 0.55), b0 + i * 0.66, pan=0.2 if i % 2 else -0.2)
    mel = [(0, 1.5, 'E5'), (1.5, .5, 'D5'), (2, 2, 'C5'),
           (4, 1.5, 'C5'), (5.5, .5, 'D5'), (6, 2, 'A4'),
           (8, 1, 'G4'), (9, 1, 'C5'), (10, 2, 'E5'),
           (12, 1, 'D5'), (13, 1, 'B4'), (14, 2, 'D5'),
           (16, 4, 'E5')]
    for (b, d, n) in mel:
        s.put('lead', keys(hz(n), d * s.beat, 0.9), b)
    y = s.mix({'pad': 0.6, 'bass': 0.5, 'keys': 0.6, 'lead': 0.8},
              sends={'pad': 0.6, 'keys': 0.7, 'lead': 0.6}, rev=(0.35, 2.6, 5500), loop=False)
    y = fade(y, 0, 2.0)
    return master(y, -19.0, -1.5)


TRACKS = {
    'title': make_title,
    'lobby': make_lobby,
    'battle': make_battle,
    'danger': make_danger,
    'result-win': make_win,
    'result-lose': make_lose,
}
