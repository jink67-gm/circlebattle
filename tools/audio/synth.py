"""
서클배틀 소리 만들기 — 작은 신시사이저 (numpy)
-------------------------------------------------
게임의 배경음(BGM)과 효과음(SFX)을 처음부터 직접 만듭니다. (다른 게임 소리를 쓰지 않음)
make_audio.py 가 이 파일의 도구로 music.py(배경음)와 sfx.py(효과음)를 만들어 mp3 로 저장합니다.

  osc()     기본 파형 (sine · triangle · saw · square) — 높은 음이 거칠지 않게 polyBLEP
  env()     소리 모양 (attack · decay · sustain · release)
  lowpass() highpass() bandpass()   필터
  sweep_lp() 시간에 따라 바뀌는 필터 (짧은 효과음용)
  reverb()  울림 (방 안에서 나는 것처럼)
"""
import numpy as np
from scipy import signal

SR = 44100
rng = np.random.default_rng(20261007)  # 매번 같은 소리가 나오게 (다시 만들어도 똑같음)


def secs(n):
    return int(round(n * SR))


def silence(sec, ch=1):
    return np.zeros(secs(sec)) if ch == 1 else np.zeros((secs(sec), 2))


# ---------------- 파형 ----------------
def _blep(t, dt):
    """polyBLEP: 톱니·네모 파형의 꺾이는 곳을 부드럽게 (높은 음에서 지지직 줄이기)"""
    out = np.zeros_like(t)
    m = t < dt
    x = t[m] / dt[m]
    out[m] = x + x - x * x - 1.0
    m2 = t > 1.0 - dt
    x = (t[m2] - 1.0) / dt[m2]
    out[m2] = x * x + x + x + 1.0
    return out


def osc(freq, dur, kind='sine', phase=0.0, pw=0.5):
    """freq: 숫자 또는 시간마다 바뀌는 배열 (Hz)"""
    n = secs(dur)
    f = np.full(n, float(freq)) if np.isscalar(freq) else np.asarray(freq, dtype=float)[:n]
    if len(f) < n:
        f = np.concatenate([f, np.full(n - len(f), f[-1] if len(f) else 0.0)])
    dt = np.clip(f / SR, 1e-9, 0.5)
    ph = (phase + np.cumsum(dt)) % 1.0
    if kind == 'sine':
        return np.sin(2 * np.pi * ph)
    if kind == 'tri':
        return 2.0 * np.abs(2.0 * ph - 1.0) - 1.0
    if kind == 'saw':
        return (2.0 * ph - 1.0) - _blep(ph, dt)
    if kind == 'square':
        s = np.where(ph < pw, 1.0, -1.0)
        s = s + _blep(ph, dt) - _blep((ph + (1 - pw)) % 1.0, dt)
        return s
    raise ValueError(kind)


def glide(f0, f1, dur, curve='exp'):
    n = secs(dur)
    if curve == 'exp':
        return f0 * (f1 / f0) ** np.linspace(0, 1, n)
    return np.linspace(f0, f1, n)


def noise(dur):
    return rng.uniform(-1, 1, secs(dur))


def env(dur, a=0.005, d=0.1, s=0.0, r=0.05, curve=3.0):
    """ADSR. 전체 길이 dur 안에 release 까지 들어감"""
    n = secs(dur)
    na, nd, nr = max(1, secs(a)), secs(d), max(1, secs(r))
    ns = max(0, n - na - nd - nr)
    att = np.linspace(0, 1, na)
    dec = s + (1 - s) * np.exp(-curve * np.linspace(0, 1, nd)) if nd else np.array([])
    if nd:
        dec = s + (dec - s) * np.linspace(1, 0, nd) ** 0.3  # 끝에서 정확히 s 에 닿게
    sus = np.full(ns, s)
    level = s if (nd or ns) else 1.0
    rel = level * np.linspace(1, 0, nr) ** 1.5
    e = np.concatenate([att, dec, sus, rel])[:n]
    if len(e) < n:
        e = np.concatenate([e, np.zeros(n - len(e))])
    return e


def perc(dur, a=0.002, k=6.0):
    """빠르게 올라갔다 지수로 사라지는 모양 (타악기·짧은 효과음)"""
    n = secs(dur)
    t = np.linspace(0, 1, n)
    e = np.exp(-k * t)
    na = max(1, secs(a))
    e[:na] *= np.linspace(0, 1, na)
    e[-min(64, n):] *= np.linspace(1, 0, min(64, n))
    return e


# ---------------- 필터 ----------------
def _sos(kind, f, order=2):
    f = np.clip(f, 20, SR * 0.45)
    return signal.butter(order, f, btype=kind, fs=SR, output='sos')


def lowpass(x, f, order=2):
    return signal.sosfilt(_sos('low', f, order), x, axis=0)


def highpass(x, f, order=2):
    return signal.sosfilt(_sos('high', f, order), x, axis=0)


def bandpass(x, lo, hi, order=2):
    lo = max(20, lo)
    hi = min(SR * 0.45, max(hi, lo * 1.05))
    return signal.sosfilt(signal.butter(order, [lo, hi], btype='band', fs=SR, output='sos'), x, axis=0)


def sweep_lp(x, f_arr, q=0.8):
    """시간에 따라 바뀌는 low-pass (state variable filter). 짧은 효과음용 (파이썬 반복문)"""
    f_arr = np.asarray(f_arr, dtype=float)
    if len(f_arr) < len(x):
        f_arr = np.concatenate([f_arr, np.full(len(x) - len(f_arr), f_arr[-1])])
    y = np.zeros_like(x)
    low = band = 0.0
    damp = 1.0 / max(q, 0.5)
    for i in range(len(x)):
        fc = 2.0 * np.sin(np.pi * min(f_arr[i], SR * 0.2) / SR)
        high = x[i] - low - damp * band
        band += fc * high
        low += fc * band
        y[i] = low
    return y


def sweep_bp(x, f_arr, q=2.0):
    f_arr = np.asarray(f_arr, dtype=float)
    if len(f_arr) < len(x):
        f_arr = np.concatenate([f_arr, np.full(len(x) - len(f_arr), f_arr[-1])])
    y = np.zeros_like(x)
    low = band = 0.0
    damp = 1.0 / max(q, 0.5)
    for i in range(len(x)):
        fc = 2.0 * np.sin(np.pi * min(f_arr[i], SR * 0.2) / SR)
        high = x[i] - low - damp * band
        band += fc * high
        low += fc * band
        y[i] = band
    return y


# ---------------- 공간 ----------------
_ir_cache = {}


def _ir(length, damp_hz, seed):
    key = (length, damp_hz, seed)
    if key in _ir_cache:
        return _ir_cache[key]
    r = np.random.default_rng(seed)
    n = secs(length)
    t = np.linspace(0, 1, n)
    irs = []
    for c in range(2):
        nz = r.uniform(-1, 1, n) * np.exp(-6.5 * t)
        nz = lowpass(nz, damp_hz)
        nz[:secs(0.012)] = 0  # 첫 울림까지 살짝 틈
        irs.append(nz / np.sqrt(np.sum(nz ** 2)))
    ir = np.stack(irs, axis=1)
    _ir_cache[key] = ir
    return ir


def reverb(x, mix=0.2, length=1.6, damp=6000, seed=7):
    """x: (n,) 또는 (n,2). 길이가 length 만큼 늘어난 스테레오를 돌려줌"""
    st = to_stereo(x)
    ir = _ir(length, damp, seed)
    wet = np.stack([signal.fftconvolve(st[:, c], ir[:, c]) for c in range(2)], axis=1)
    out = np.zeros_like(wet)
    out[:len(st)] += st * (1 - mix * 0.5)
    out += wet * mix
    return out


def delay(x, time, fb=0.3, mix=0.25, taps=4):
    st = to_stereo(x)
    d = secs(time)
    out = np.zeros((len(st) + d * taps, 2))
    out[:len(st)] += st
    g = mix
    for k in range(1, taps + 1):
        side = 0 if k % 2 else 1  # 왼쪽·오른쪽 번갈아 (ping-pong)
        out[d * k:d * k + len(st), side] += st[:, side] * g
        g *= fb
    return out


# ---------------- 섞기 ----------------
def to_stereo(x, pan=0.0):
    if x.ndim == 2:
        return x
    l = np.cos((pan + 1) * np.pi / 4)
    r = np.sin((pan + 1) * np.pi / 4)
    return np.stack([x * l * 1.414, x * r * 1.414], axis=1) if pan else np.stack([x, x], axis=1)


def add_at(buf, x, start, gain=1.0):
    """buf 의 start(샘플)부터 x 를 더함 (넘치면 자름)"""
    if start >= len(buf):
        return buf
    end = min(len(buf), start + len(x))
    if buf.ndim == 2 and x.ndim == 1:
        x = to_stereo(x)
    buf[start:end] += x[:end - start] * gain
    return buf


def rms_db(x):
    return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)


def normalize(x, peak_db=-1.0):
    p = np.max(np.abs(x)) + 1e-12
    return x * (10 ** (peak_db / 20) / p)


def soft_limit(x, ceiling_db=-1.0, drive=1.0):
    """부드러운 리미터 (tanh) — 갑자기 찢어지는 소리가 나지 않게"""
    c = 10 ** (ceiling_db / 20)
    return np.tanh(x * drive / c) * c


def master(x, target_rms_db, ceiling_db=-1.0):
    """원하는 평균 음량(RMS)으로 맞추고 봉우리는 눌러 줌"""
    x = x - np.mean(x, axis=0)
    g = 10 ** ((target_rms_db - rms_db(x)) / 20)
    y = soft_limit(x * g, ceiling_db)
    # 리미터로 줄어든 만큼 한 번 더 맞춤
    g2 = 10 ** ((target_rms_db - rms_db(y)) / 20)
    return soft_limit(y * min(g2, 1.5), ceiling_db)


def fade(x, fin=0.0, fout=0.0):
    x = x.copy()
    if fin:
        n = secs(fin)
        x[:n] *= np.linspace(0, 1, n)[:, None] if x.ndim == 2 else np.linspace(0, 1, n)
    if fout:
        n = secs(fout)
        x[-n:] *= np.linspace(1, 0, n)[:, None] if x.ndim == 2 else np.linspace(1, 0, n)
    return x


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


NOTE = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6,
        'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}


def n2m(name):
    """'A4' → 69"""
    if name[1:2] in ('#', 'b'):
        p, o = name[:2], int(name[2:])
    else:
        p, o = name[:1], int(name[1:])
    return 12 * (o + 1) + NOTE[p]


def hz(name):
    return midi(n2m(name))
