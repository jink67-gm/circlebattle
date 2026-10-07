"""
서클배틀 소리 파일 만들기
-------------------------------------------------
사용법 (컴퓨터에 python3 · numpy · scipy · ffmpeg 가 있을 때):
    cd tools/audio
    python3 make_audio.py            # 모두 만들기
    python3 make_audio.py battle hit # 이름을 주면 그것만

결과: ../../assets/audio/bgm/*.mp3 , ../../assets/audio/sfx/*.mp3
모든 소리는 이 폴더의 코드로 직접 만든 원본입니다. (상용 게임의 소리를 쓰지 않음)
마음에 들지 않는 소리는 같은 이름의 다른 mp3 (직접 만든 것·사용 허가 음원·로열티 프리)로 바꿔도 됩니다.
"""
import os
import subprocess
import sys
import tempfile

import numpy as np
from scipy.io import wavfile

from synth import SR, reverb, normalize, rms_db, secs
import music
import sfx

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
BGM_DIR = os.path.join(ROOT, 'assets', 'audio', 'bgm')
SFX_DIR = os.path.join(ROOT, 'assets', 'audio', 'sfx')


def to_mp3(x, path, bitrate):
    x = np.clip(x, -1, 1).astype(np.float32)
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
        tmp = f.name
    wavfile.write(tmp, SR, x)
    ch = 1 if x.ndim == 1 else 2
    cmd = ['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-ac', str(ch), '-codec:a', 'libmp3lame',
           '-b:a', bitrate, path]
    subprocess.run(cmd, check=True)
    os.remove(tmp)


def trim_tail(x, thresh_db=-62):
    a = np.abs(x if x.ndim == 1 else x.max(axis=1))
    th = 10 ** (thresh_db / 20)
    idx = np.where(a > th)[0]
    end = (idx[-1] + secs(0.02)) if len(idx) else len(x)
    y = x[:min(len(x), end)].copy()
    n = min(len(y), secs(0.015))
    y[-n:] *= np.linspace(1, 0, n) if y.ndim == 1 else np.linspace(1, 0, n)[:, None]
    return y


# 공격음·틱처럼 아주 짧고 잦은 소리는 울림 없이 (또렷하게)
DRY = {'ui-click', 'key', 'attack-medic', 'attack-speeder', 'ammo-reload', 'tick', 'hit', 'countdown',
       'bush-in', 'bush-out', 'capture-progress', 'score', 'attack-blaster', 'attack-guardian',
       'attack-engineer', 'attack-frost', 'hurt', 'ammo-full'}


def make_sfx(names=None):
    os.makedirs(SFX_DIR, exist_ok=True)
    for name, fn, peak in sfx.SFX:
        if names and name not in names:
            continue
        x = fn()
        if name not in DRY:
            st = reverb(x, mix=0.16, length=0.9, damp=7000, seed=3)
            x = st.mean(axis=1)
        x = normalize(x, peak)
        x = trim_tail(x)
        path = os.path.join(SFX_DIR, name + '.mp3')
        to_mp3(x, path, '64k')
        print('sfx  %-18s %.2fs  peak %5.1f dB' % (name, len(x) / SR, peak))


def make_bgm(names=None):
    os.makedirs(BGM_DIR, exist_ok=True)
    for name, fn in music.TRACKS.items():
        if names and name not in names:
            continue
        y = fn()
        if name.startswith('result'):
            y = trim_tail(y, -58)  # 반복하지 않는 결과 곡: 끝의 빈 부분은 잘라서 파일을 작게
        path = os.path.join(BGM_DIR, name + '.mp3')
        to_mp3(y, path, '96k')
        print('bgm  %-12s %.2fs  rms %5.1f dB  peak %5.1f dB' % (name, len(y) / SR, rms_db(y), 20 * np.log10(np.max(np.abs(y)))))


if __name__ == '__main__':
    want = set(sys.argv[1:]) or None
    make_sfx(want)
    make_bgm(want)
