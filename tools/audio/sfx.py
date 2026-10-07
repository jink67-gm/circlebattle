"""
서클배틀 효과음 (SFX) — 모두 직접 합성한 원본 소리
-------------------------------------------------
"밝은 미래형 아케이드 · 전자음 · 가벼운 에너지" 느낌으로 통일.
  공격음은 아주 짧게 (0.05~0.22초) — 메딕·스피더가 빠르게 쏴도 귀가 아프지 않게 작은 음량
  궁극기 소리는 캐릭터마다 다르게, 1초 안팎
  오답 소리는 실패감이 크지 않게 낮고 부드럽게
LEVEL 표: (함수, 최고 음량 dBFS) — 자주 나는 소리일수록 작게
"""
import numpy as np
from synth import (SR, secs, osc, glide, noise, env, perc, lowpass, highpass, bandpass, sweep_lp, sweep_bp,
                   reverb, delay, to_stereo, add_at, fade, hz, midi)


def t_of(d):
    return np.arange(secs(d)) / SR


def mixl(*parts):
    n = max(len(p) for p in parts)
    out = np.zeros(n)
    for p in parts:
        out[:len(p)] += p
    return out


def at(x, sec, total=None):
    """x 를 sec 초 뒤에 시작하게 앞에 빈 소리를 붙임"""
    pad = np.zeros(secs(sec))
    y = np.concatenate([pad, x])
    if total:
        y = np.concatenate([y, np.zeros(max(0, secs(total) - len(y)))])
    return y


def tone(f, d, kind='sine', k=8.0, a=0.003, f1=None, pw=0.5):
    fr = glide(f, f1, d) if f1 else f
    return osc(fr, d, kind, pw=pw) * perc(d, a, k)


def chime(f, d=0.4, k=7.0, ratio=2.0, idx=1.0):
    t = t_of(d)
    mod = np.sin(2 * np.pi * f * ratio * t) * idx * np.exp(-t * 6)
    return np.sin(2 * np.pi * f * t + mod) * perc(d, 0.002, k)


def notes(seq, kind='tri', k=6.0, gap_end=0.2):
    """[(Hz, 시작초, 길이초)] → 하나의 소리"""
    total = max(s + d for _, s, d in seq) + gap_end
    out = np.zeros(secs(total))
    for f, s0, d in seq:
        x = tone(f, d, kind, k)
        i = secs(s0)
        out[i:i + len(x)] += x[:len(out) - i]
    return out


def sparkle(d=0.5, n=6, f0=2000, f1=5000, seed=1):
    r = np.random.default_rng(seed)
    out = np.zeros(secs(d))
    for i in range(n):
        s0 = r.uniform(0, d * 0.6)
        f = r.uniform(f0, f1)
        x = chime(f, 0.25, k=12, ratio=1.5, idx=0.5) * r.uniform(0.3, 0.7)
        j = secs(s0)
        out[j:j + len(x)] += x[:len(out) - j]
    return out


def whoosh(d, f0, f1, q=1.5):
    fr = glide(f0, f1, d)
    return sweep_bp(noise(d), fr, q) * env(d, d * 0.35, 0, 1, d * 0.6)


def thump(f0=150, f1=50, d=0.25, k=10):
    t = t_of(d)
    fr = f1 + (f0 - f1) * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(fr) / SR) * perc(d, 0.001, k)


# =========================================================
#  UI
# =========================================================
def ui_click():
    return mixl(tone(1300, 0.045, 'sine', 30, f1=1700), highpass(noise(0.01), 3000) * perc(0.01, 0.0005, 30) * 0.3)


def key():
    return tone(1500, 0.03, 'sine', 40) * 0.8


def character_select():
    return mixl(notes([(hz('G5'), 0, 0.12), (hz('D6'), 0.07, 0.3)], 'tri', 5),
                chime(hz('D7'), 0.4, 8) * 0.25 + 0, sparkle(0.45, 4, 3000, 6000, 3) * 0.3)


def join():
    return mixl(notes([(hz('C5'), 0, 0.12), (hz('E5'), 0.08, 0.12), (hz('G5'), 0.16, 0.12), (hz('C6'), 0.24, 0.35)], 'tri', 5),
                at(sparkle(0.4, 5, 2500, 5500, 4) * 0.3, 0.2))


def game_start():
    d = 0.9
    chord = sum(osc(hz(n), d, 'saw') for n in ('C5', 'E5', 'G5', 'C6')) / 4
    chord = lowpass(chord, 4500) * env(d, 0.005, 0.25, 0.4, 0.4)
    return mixl(chord * 0.8, thump(160, 50, 0.4, 8) * 0.8, whoosh(0.5, 800, 6000, 2) * 0.5, at(sparkle(0.6, 8, 3000, 7000, 5) * 0.35, 0.05))


def ready():
    return notes([(hz('E5'), 0, 0.16), (hz('A5'), 0.16, 0.3)], 'square', 6) * 0.5


def countdown():
    t = t_of(0.16)
    return np.sin(2 * np.pi * 880 * t) * env(0.16, 0.004, 0.05, 0.6, 0.06)


# =========================================================
#  캐릭터별 기본 공격 (짧게)
# =========================================================
def attack_blaster():  # 강하고 묵직한 에너지 발사
    d = 0.22
    zap = sweep_lp(osc(glide(900, 180, d), d, 'saw'), glide(6000, 600, d)) * perc(d, 0.002, 9)
    return mixl(thump(170, 55, 0.2, 12) * 0.9, zap * 0.6, lowpass(noise(0.08), 3000) * perc(0.08, 0.001, 30) * 0.35)


def attack_guardian():  # 중간 무게 에너지 충격파
    d = 0.2
    wave = sweep_bp(noise(d), glide(2600, 500, d), 1.2) * perc(d, 0.004, 8)
    return mixl(wave * 0.9, tone(230, 0.16, 'sine', 12, f1=120) * 0.6)


def attack_medic():  # 가볍고 작은 펄스
    return mixl(tone(1500, 0.07, 'sine', 25, f1=1000), tone(3000, 0.03, 'sine', 50) * 0.2)


def attack_speeder():  # 빠르고 짧은 발사음
    return mixl(tone(2000, 0.05, 'square', 35, f1=900, pw=0.3) * 0.5, highpass(noise(0.03), 5000) * perc(0.03, 0.0005, 40) * 0.4)


def attack_engineer():  # 기계식·전자식 구체
    return mixl(tone(380, 0.16, 'sine', 12, f1=190), at(tone(1200, 0.025, 'square', 40) * 0.35, 0.0),
                at(tone(1600, 0.02, 'square', 40) * 0.25, 0.035))


def attack_frost():  # 얼음·냉기
    return mixl(tone(2600, 0.12, 'tri', 15, f1=1600) * 0.6, chime(3500, 0.15, 18, 1.4, 0.8) * 0.3,
                highpass(noise(0.1), 6000) * perc(0.1, 0.002, 20) * 0.35)


# =========================================================
#  맞음 · 탄약 · 재등장
# =========================================================
def hit():
    return mixl(tone(1700, 0.06, 'tri', 30, f1=1200), at(tone(2600, 0.04, 'sine', 40) * 0.4, 0.012))


def hit_ult():
    return mixl(thump(200, 45, 0.35, 8), tone(1900, 0.12, 'tri', 15, f1=900) * 0.5,
                lowpass(noise(0.25), 3500) * perc(0.25, 0.001, 12) * 0.5)


def hurt():
    return mixl(thump(210, 70, 0.18, 14) * 0.9, lowpass(noise(0.1), 900) * perc(0.1, 0.002, 20) * 0.5)


def block():
    return mixl(chime(1900, 0.18, 14, 2.7, 1.5), tone(2600, 0.06, 'tri', 30) * 0.3)


def ammo_reload():
    return mixl(tone(1100, 0.04, 'sine', 35, f1=1500), highpass(noise(0.008), 4000) * 0.2 * perc(0.008, 0.0005, 30))


def ammo_full():
    return notes([(1400, 0, 0.06), (1900, 0.06, 0.12)], 'sine', 18) * 0.8


def knockout():
    d = 0.6
    return mixl(tone(700, d, 'tri', 4, f1=140) * 0.7, sparkle(0.5, 5, 1500, 3000, 9) * 0.25)


def respawn():
    d = 0.5
    up = osc(glide(300, 1000, d), d, 'sine') * env(d, 0.08, 0.1, 0.7, 0.2)
    return mixl(up * 0.7, at(sparkle(0.35, 5, 2500, 5000, 11) * 0.35, 0.15))


# =========================================================
#  고유 스킬
# =========================================================
def skill_blaster():  # 에너지 폭발 (터지는 소리, 무섭지 않게)
    d = 0.7
    boom = thump(150, 38, d, 5)
    nz = sweep_lp(noise(d), glide(5000, 150, d)) * perc(d, 0.002, 5)
    return mixl(boom, nz * 0.7, at(sparkle(0.4, 5, 2000, 4000, 12) * 0.2, 0.05))


def skill_guardian():  # 보호막 전개
    d = 0.6
    hum = osc(glide(180, 360, d), d, 'saw')
    hum = lowpass(hum, 1500) * env(d, 0.04, 0.2, 0.5, 0.3)
    return mixl(hum * 0.6, at(chime(hz('E6'), 0.45, 6, 2.0, 1.0) * 0.4, 0.1), at(chime(hz('B6'), 0.4, 7) * 0.25, 0.18))


def skill_medic():  # 회복 (부드러운 종소리 화음)
    return mixl(*[at(chime(hz(n), 0.6, 5, 2.0, 0.6) * 0.45, i * 0.07) for i, n in enumerate(('C6', 'E6', 'G6', 'C7'))],
                at(sparkle(0.5, 6, 3000, 6000, 13) * 0.2, 0.2))


def skill_speeder():  # 순간이동 (빠른 휙)
    return mixl(whoosh(0.3, 600, 7000, 2.0) * 0.9, tone(400, 0.2, 'sine', 8, f1=1800) * 0.5)


def skill_engineer():  # 장치 설치 (철컥 + 전원)
    clank = lambda f: mixl(tone(f, 0.05, 'square', 30) * 0.3, bandpass(noise(0.04), 1500, 5000) * perc(0.04, 0.0005, 35) * 0.5)
    power = osc(glide(220, 880, 0.35), 0.35, 'saw')
    power = lowpass(power, 2500) * env(0.35, 0.02, 0.1, 0.6, 0.15)
    return mixl(clank(300), at(clank(450), 0.09), at(power * 0.4, 0.16), at(chime(hz('A6'), 0.25, 10) * 0.3, 0.45))


def skill_frost():  # 냉기 (얼음 결정 + 바스락)
    d = 0.7
    crackle = np.zeros(secs(d))
    r = np.random.default_rng(14)
    for i in range(18):
        j = secs(r.uniform(0, d * 0.7))
        c = highpass(noise(0.01), 4000) * perc(0.01, 0.0003, 25) * r.uniform(0.2, 0.6)
        crackle[j:j + len(c)] += c[:len(crackle) - j]
    hiss = highpass(noise(d), 5000) * env(d, 0.05, 0.2, 0.3, 0.3)
    return mixl(crackle, hiss * 0.3, notes([(hz('E7'), 0, 0.2), (hz('B6'), 0.08, 0.2), (hz('E7'), 0.16, 0.35)], 'sine', 9) * 0.3)


def level_up():
    return mixl(notes([(hz('C5'), 0, 0.1), (hz('E5'), 0.08, 0.1), (hz('G5'), 0.16, 0.1), (hz('C6'), 0.24, 0.35)], 'tri', 5),
                at(sparkle(0.4, 6, 3000, 6000, 15) * 0.3, 0.25))


def skill_max():
    fan = notes([(hz('G4'), 0, 0.12), (hz('C5'), 0.1, 0.12), (hz('E5'), 0.2, 0.12), (hz('G5'), 0.3, 0.12), (hz('C6'), 0.4, 0.6)], 'square', 4)
    chord = sum(osc(hz(n), 0.7, 'saw') for n in ('C5', 'E5', 'G5')) / 3
    chord = lowpass(chord, 4000) * env(0.7, 0.01, 0.2, 0.5, 0.3)
    return mixl(fan * 0.45, at(chord * 0.5, 0.4), at(sparkle(0.6, 9, 3000, 7000, 16) * 0.35, 0.4))


# =========================================================
#  궁극기
# =========================================================
def ultimate_ready():  # 짧고 또렷하게 "준비 완료"
    return mixl(notes([(hz('A5'), 0, 0.09), (hz('E6'), 0.08, 0.09), (hz('A6'), 0.16, 0.35)], 'square', 6) * 0.35,
                at(chime(hz('A6'), 0.5, 5, 2.0, 1.0) * 0.4, 0.16), at(sparkle(0.4, 6, 3500, 7000, 17) * 0.3, 0.18))


def ultimate_blaster():  # 대형 에너지 충전 → 강한 발사 (0.5초 뒤 발사)
    ch = 0.5
    charge = osc(glide(120, 900, ch), ch, 'saw') + osc(glide(121, 905, ch), ch, 'saw')
    charge = sweep_lp(charge * 0.5, glide(400, 5000, ch)) * np.linspace(0.1, 1, secs(ch)) ** 1.5
    d = 0.8
    shot = mixl(thump(130, 32, d, 4) * 1.0,
                sweep_lp(osc(glide(1200, 120, d), d, 'saw'), glide(8000, 400, d)) * perc(d, 0.002, 5) * 0.55,
                sweep_lp(noise(d), glide(7000, 200, d)) * perc(d, 0.002, 4) * 0.6)
    return mixl(charge * 0.45, at(shot, ch - 0.02))


def ultimate_guardian():  # 강력한 보호막 전개
    d = 1.1
    t = t_of(d)
    low = osc(glide(70, 140, 0.4), d, 'saw')
    low = lowpass(low, 700) * env(d, 0.05, 0.3, 0.6, 0.5)
    shimmer = sum(chime(hz(n), d, 3.5, 2.0, 0.8) for n in ('C5', 'G5', 'C6', 'E6')) / 3
    trem = 0.75 + 0.25 * np.sin(2 * np.pi * 9 * t)
    return mixl(low * 0.8, thump(110, 50, 0.4, 6) * 0.7, at(shimmer * trem[:len(shimmer)] * 0.5, 0.06))


def ultimate_medic():  # 큰 회복 파동
    d = 1.2
    chord = sum(osc(hz(n), d, 'tri') for n in ('C5', 'E5', 'G5', 'C6')) / 4
    chord = chord * env(d, 0.15, 0.3, 0.6, 0.6)
    swell = whoosh(1.0, 400, 3000, 1.0) * 0.4
    bells = mixl(*[at(chime(hz(n), 0.6, 5, 2.0, 0.6) * 0.35, 0.1 + i * 0.08) for i, n in enumerate(('E6', 'G6', 'C7', 'E7'))])
    return mixl(chord * 0.6, swell, bells, at(sparkle(0.8, 10, 3000, 7000, 18) * 0.3, 0.2))


def ultimate_speeder():  # 고속 부스터 · 돌진
    d = 0.9
    jet = sweep_bp(noise(d), glide(400, 6000, d), 1.4) * env(d, 0.15, 0.1, 0.8, 0.35)
    tone_up = osc(glide(180, 1400, 0.45), 0.45, 'saw')
    tone_up = lowpass(tone_up, 3000) * env(0.45, 0.02, 0.1, 0.7, 0.15)
    return mixl(jet * 0.9, tone_up * 0.35, at(whoosh(0.3, 2000, 9000, 2.5) * 0.6, 0.45), at(tone(1800, 0.15, 'square', 12, f1=2600, pw=0.3) * 0.2, 0.45))


def ultimate_engineer():  # 드론 전개 · 기계 작동
    d = 1.0
    t = t_of(d)
    servo = mixl(*[at(tone(f, 0.06, 'square', 25, pw=0.3) * 0.3, s0) for f, s0 in ((500, 0), (700, 0.09), (600, 0.18), (900, 0.27))])
    buzz_f = 95 + 25 * np.clip(t / 0.4, 0, 1)
    buzz = osc(buzz_f, d, 'saw') * (0.6 + 0.4 * np.sin(2 * np.pi * 31 * t))
    buzz = lowpass(buzz, 1400) * env(d, 0.35, 0.1, 0.8, 0.3)
    return mixl(servo, at(buzz * 0.5, 0.25)[:secs(1.25)], at(chime(hz('E6'), 0.3, 10) * 0.3, 0.33))


def ultimate_frost():  # 큰 냉기 폭발 · 얼음 결정
    d = 1.2
    boom = thump(180, 40, 0.6, 6)
    hiss = highpass(noise(d), 4000) * env(d, 0.01, 0.3, 0.3, 0.6)
    crystals = mixl(*[at(chime(f, 0.5, 6, 2.76, 1.2) * 0.3, s0) for f, s0 in ((2637, 0.05), (3136, 0.12), (3951, 0.2), (5274, 0.3), (4186, 0.42))])
    return mixl(boom * 0.8, hiss * 0.4, crystals)


# =========================================================
#  수학 문제
# =========================================================
def mission_open():
    return notes([(hz('E5'), 0, 0.12), (hz('A5'), 0.09, 0.22)], 'sine', 7)


def math_correct():  # 밝고 긍정적
    return mixl(notes([(hz('C5'), 0, 0.12), (hz('E5'), 0.08, 0.12), (hz('G5'), 0.16, 0.12), (hz('C6'), 0.24, 0.3)], 'tri', 6),
                at(sparkle(0.35, 6, 3000, 6500, 19) * 0.3, 0.22))


def math_wrong():  # 부드러운 오류음 (실패감이 크지 않게)
    return notes([(hz('E4'), 0, 0.17), (hz('C4'), 0.15, 0.28)], 'sine', 6) * 0.9


def tick():
    return mixl(tone(1300, 0.035, 'sine', 45), highpass(noise(0.006), 5000) * 0.15)


def reward():
    return mixl(notes([(hz('G5'), 0, 0.1), (hz('C6'), 0.07, 0.25)], 'tri', 6), at(sparkle(0.3, 4, 3000, 6000, 20) * 0.25, 0.08))


# =========================================================
#  점령
# =========================================================
def zone_enter():
    return tone(700, 0.14, 'sine', 9, f1=950) * 0.8


def challenge_ready():
    return notes([(hz('A5'), 0, 0.1), (hz('A5'), 0.13, 0.18)], 'tri', 7)


def zone_active():  # ZONE ACTIVATED!
    d = 0.75
    up = notes([(hz('G4'), 0, 0.12), (hz('C5'), 0.09, 0.12), (hz('E5'), 0.18, 0.12), (hz('G5'), 0.27, 0.35)], 'square', 5) * 0.4
    return mixl(up, whoosh(0.5, 300, 3000, 1.2) * 0.35, at(sparkle(0.4, 6, 3000, 6000, 21) * 0.3, 0.3))


def capture_progress():
    d = 0.25
    return osc(glide(440, 660, d), d, 'sine') * env(d, 0.04, 0.05, 0.6, 0.12) * 0.7


def capture():  # 점령 성공
    return mixl(notes([(hz('C5'), 0, 0.14), (hz('G5'), 0.1, 0.14), (hz('C6'), 0.2, 0.45)], 'tri', 4),
                at(chime(hz('E6'), 0.6, 5) * 0.3, 0.2), at(sparkle(0.6, 8, 3000, 7000, 22) * 0.3, 0.25))


def capture_lost():  # 거점을 빼앗김 (무섭지 않게 내려가는 두 음)
    return mixl(notes([(hz('A4'), 0, 0.18), (hz('E4'), 0.16, 0.32)], 'tri', 5) * 0.8, tone(300, 0.4, 'sine', 5, f1=200) * 0.3)


def score():
    return notes([(988, 0, 0.07), (1319, 0.07, 0.18)], 'square', 10) * 0.45


# =========================================================
#  TEAM BOOST
# =========================================================
def team_boost():
    return mixl(notes([(hz('E5'), 0, 0.1), (hz('A5'), 0.07, 0.1), (hz('C#6'), 0.14, 0.1), (hz('E6'), 0.21, 0.35)], 'tri', 5),
                whoosh(0.4, 500, 4000, 1.2) * 0.3, at(sparkle(0.5, 8, 3000, 7000, 23) * 0.3, 0.2))


def boost_heal():
    return mixl(chime(hz('G6'), 0.35, 7) * 0.5, at(chime(hz('C7'), 0.35, 7) * 0.4, 0.07))


def boost_ammo():
    return mixl(tone(1300, 0.04, 'sine', 35), at(tone(1300, 0.04, 'sine', 35), 0.07), at(tone(1800, 0.08, 'sine', 25), 0.14))


def boost_speed():
    return mixl(whoosh(0.25, 800, 6000, 2.0) * 0.7, tone(500, 0.2, 'sine', 8, f1=1500) * 0.4)


def boost_charge():
    d = 0.3
    return osc(glide(600, 1600, d), d, 'square', pw=0.3) * env(d, 0.01, 0.1, 0.5, 0.12) * 0.3


# =========================================================
#  부쉬 · 시간 · 결과
# =========================================================
def rustle(d, seed, f0, f1):
    t = t_of(d)
    r = np.random.default_rng(seed)
    am = np.clip(np.convolve(r.uniform(0, 1, secs(d)) > 0.995, np.ones(secs(0.012)), 'same'), 0, 1)
    x = bandpass(noise(d), f0, f1) * (0.3 + am) * env(d, 0.03, 0.05, 0.6, d * 0.5)
    return x


def bush_in():
    return rustle(0.26, 24, 1200, 5000)


def bush_out():
    return rustle(0.17, 25, 1600, 6000) * 0.8


def warning():  # 남은 1분: 작은 경고
    return notes([(hz('A5'), 0, 0.13), (hz('E5'), 0.16, 0.2)], 'tri', 6) * 0.9


def victory():
    fan = notes([(hz('C5'), 0, 0.15), (hz('E5'), 0.13, 0.15), (hz('G5'), 0.26, 0.15), (hz('C6'), 0.39, 0.7)], 'square', 4) * 0.45
    chord = sum(osc(hz(n), 0.9, 'saw') for n in ('C5', 'E5', 'G5', 'C6')) / 4
    chord = lowpass(chord, 4000) * env(0.9, 0.01, 0.3, 0.5, 0.4)
    return mixl(fan, at(chord * 0.5, 0.39), at(sparkle(0.8, 10, 3000, 7000, 26) * 0.35, 0.4))


def defeat():  # 너무 우울하지 않게 (마지막은 따뜻한 장3화음)
    return mixl(notes([(hz('G4'), 0, 0.25), (hz('E4'), 0.22, 0.25), (hz('C4'), 0.44, 0.25)], 'sine', 4) * 0.8,
                at(sum(chime(hz(n), 0.8, 4, 2.0, 0.4) for n in ('C5', 'E5', 'G5')) * 0.25, 0.66))


def draw():  # 중립 결과음
    return notes([(hz('E5'), 0, 0.22), (hz('G5'), 0.24, 0.22), (hz('E5'), 0.48, 0.45)], 'tri', 4) * 0.8


# (이름, 함수, 최고 음량 dBFS)
SFX = [
    ('ui-click', ui_click, -9), ('key', key, -12), ('character-select', character_select, -5), ('join', join, -5),
    ('game-start', game_start, -3), ('ready', ready, -5), ('countdown', countdown, -6),
    ('attack-blaster', attack_blaster, -5), ('attack-guardian', attack_guardian, -6), ('attack-medic', attack_medic, -11),
    ('attack-speeder', attack_speeder, -11), ('attack-engineer', attack_engineer, -8), ('attack-frost', attack_frost, -9),
    ('hit', hit, -8), ('hit-ult', hit_ult, -3), ('hurt', hurt, -5), ('block', block, -8),
    ('ammo-reload', ammo_reload, -16), ('ammo-full', ammo_full, -11), ('knockout', knockout, -6), ('respawn', respawn, -6),
    ('skill-blaster', skill_blaster, -3), ('skill-guardian', skill_guardian, -5), ('skill-medic', skill_medic, -5),
    ('skill-speeder', skill_speeder, -5), ('skill-engineer', skill_engineer, -5), ('skill-frost', skill_frost, -5),
    ('level-up', level_up, -4), ('skill-max', skill_max, -3),
    ('ultimate-ready', ultimate_ready, -4), ('ultimate-blaster', ultimate_blaster, -2), ('ultimate-guardian', ultimate_guardian, -2.5),
    ('ultimate-medic', ultimate_medic, -3), ('ultimate-speeder', ultimate_speeder, -3), ('ultimate-engineer', ultimate_engineer, -3),
    ('ultimate-frost', ultimate_frost, -2.5),
    ('mission-open', mission_open, -7), ('math-correct', math_correct, -4), ('math-wrong', math_wrong, -9),
    ('tick', tick, -12), ('reward', reward, -6),
    ('zone-enter', zone_enter, -11), ('challenge-ready', challenge_ready, -6), ('zone-active', zone_active, -4),
    ('capture-progress', capture_progress, -13), ('capture', capture, -4), ('capture-lost', capture_lost, -6), ('score', score, -9),
    ('team-boost', team_boost, -4), ('boost-heal', boost_heal, -9), ('boost-ammo', boost_ammo, -10),
    ('boost-speed', boost_speed, -9), ('boost-charge', boost_charge, -10),
    ('bush-in', bush_in, -15), ('bush-out', bush_out, -17), ('warning', warning, -6),
    ('victory', victory, -3), ('defeat', defeat, -5), ('draw', draw, -5),
]
