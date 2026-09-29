/* ============================================================
   서클 배틀 - 소리 관리 (audio.js · AudioManager)
   ------------------------------------------------------------
   STEP 17: 효과음과 배경음(BGM)을 이 파일 한 곳에서 관리합니다.

   ■ 소리 파일이 없어도 됩니다.
     모든 소리는 브라우저의 Web Audio 로 그 자리에서 만들어 냅니다. (직접 만든 원본 소리)
     원하는 소리 파일이 있으면 config.js 의 SOUND.FILES 에 적으면 그 파일을 대신 씁니다.
     파일을 못 불러오면 만들어 내는 소리로 돌아가므로 게임은 그대로 됩니다.
   ■ 브라우저는 화면을 한 번 누르기 전에는 소리를 막습니다.
     그래서 첫 터치·클릭·키 입력 때 소리를 켭니다.
   ■ 음량: 전체 / BGM / 효과음 (0~1). 이 기기에 기억합니다. (환경설정 화면은 STEP 18)
     PC에서 M 키 = 소리 끄기/켜기

   소리 이름
     button 버튼 · fire 공격 · hit 명중 · hurt 피격 · reload 탄약 충전 · special 특수기
     blast 폭발 · missionOpen 수학 미션 열기 · correct 정답 · wrong 오답 · reward 보너스
     captureStart 점령 시작 · capture 점령 완료 · neutral 점령 풀림 · score 점수 획득
     knockout 재충전 · respawn 재등장 · count 카운트다운 · go 시작 · win 승리 · lose 패배 · draw 무승부
   ============================================================ */

const AudioManager = (function () {
  const STORE_KEY = 'circleBattle.audio';
  const S = CONFIG.SOUND;

  let ctx = null;
  let master = null, sfxBus = null, bgmBus = null;
  let noiseBuf = null;
  const buffers = {};             // 파일에서 불러온 소리
  const lastPlayed = {};          // 같은 소리가 너무 겹치지 않게
  const history = [];             // 최근에 낸 소리 (시험용)
  let vol = loadVolumes();
  let muted = false;

  // ---------------- 음량 ----------------
  function loadVolumes() {
    const v = { ...S.DEFAULT_VOLUME };
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      if (saved) ['master', 'bgm', 'sfx'].forEach((k) => {
        if (typeof saved[k] === 'number' && saved[k] >= 0 && saved[k] <= 1) v[k] = saved[k];
      });
    } catch (e) { /* 저장 안 되는 브라우저 */ }
    return v;
  }

  // 귀에 자연스럽게 들리도록 제곱해서 적용
  function applyVolumes() {
    if (!ctx) return;
    const t = ctx.currentTime;
    master.gain.setTargetAtTime(muted ? 0 : vol.master * vol.master * S.OUTPUT_GAIN, t, 0.03);
    sfxBus.gain.setTargetAtTime(vol.sfx * vol.sfx, t, 0.03);
    bgmBus.gain.setTargetAtTime(vol.bgm * vol.bgm * 0.8, t, 0.03);
  }

  function setVolume(kind, value) {
    if (!(kind in vol)) return;
    vol[kind] = Math.max(0, Math.min(1, Number(value) || 0));
    try { localStorage.setItem(STORE_KEY, JSON.stringify(vol)); } catch (e) { /* 무시 */ }
    applyVolumes();
  }

  function setMuted(on) {
    muted = !!on;
    applyVolumes();
  }

  // ---------------- 켜기 (첫 입력 때) ----------------
  function unlock() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return; // 소리를 지원하지 않는 브라우저 → 조용히 게임만
      try { ctx = new AC(); } catch (e) { ctx = null; return; }
      master = ctx.createGain();
      // 태블릿 스피커에서도 잘 들리게 키우되, 소리가 찢어지지 않게 마지막에 눌러 줌
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -3;
      limiter.knee.value = 0;
      limiter.ratio.value = 20;
      limiter.attack.value = 0.002;
      limiter.release.value = 0.1;
      master.connect(limiter);
      limiter.connect(ctx.destination);
      // 효과음이 한꺼번에 커지지 않게 살짝 눌러 줌
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 6;
      comp.connect(master);
      sfxBus = ctx.createGain();
      sfxBus.connect(comp);
      bgmBus = ctx.createGain();
      bgmBus.connect(master);
      noiseBuf = makeNoise();
      applyVolumes();
      loadFiles();
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    if (bgm.want && !bgm.running) startBgmLoop();
  }

  function makeNoise() {
    const len = Math.floor(ctx.sampleRate * 0.6);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  // config.js 에 적은 소리 파일 불러오기 (실패하면 만들어 내는 소리 사용)
  function loadFiles() {
    Object.keys(S.FILES || {}).forEach((name) => {
      const url = S.FILES[name];
      if (!url) return;
      fetch(url).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(r.status)))
        .then((ab) => new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej)))
        .then((b) => { buffers[name] = b; if (name === 'bgm' && bgm.running) { stopBgmLoop(); startBgmLoop(); } })
        .catch(() => { /* 파일이 없으면 만들어 내는 소리 */ });
    });
  }

  // ---------------- 소리 만드는 도구 ----------------
  // 음 하나: 주파수 f0 → f1 로 미끄러지며, 짧게 올라갔다 사라짐
  function tone(o) {
    const t = (o.at || ctx.currentTime) + (o.delay || 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f0, t);
    if (o.f1) osc.frequency.exponentialRampToValueAtTime(o.f1, t + o.dur);
    const a = o.attack || 0.005;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.vol || 0.3, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    osc.connect(g);
    g.connect(o.bus || sfxBus);
    osc.start(t);
    osc.stop(t + o.dur + 0.05);
  }

  // 잡음(쉭·퍽 소리): 필터로 높낮이를 바꿈
  function noise(o) {
    const t = (o.at || ctx.currentTime) + (o.delay || 0);
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = o.filter || 'bandpass';
    f.frequency.setValueAtTime(o.f0 || 1200, t);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + o.dur);
    f.Q.value = o.q || 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.vol || 0.2, t + (o.attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    src.connect(f); f.connect(g); g.connect(o.bus || sfxBus);
    src.start(t, Math.random() * 0.3);
    src.stop(t + o.dur + 0.05);
  }

  // 음 여러 개를 차례로 (notes: [주파수, 시작(초), 길이(초)])
  function melody(notes, type, vol) {
    notes.forEach(([f, d, len]) => tone({ type: type || 'triangle', f0: f, dur: len, delay: d, vol: vol || 0.22, attack: 0.01 }));
  }

  const N = { C4: 261.6, D4: 293.7, E4: 329.6, F4: 349.2, G4: 392, A4: 440, B4: 493.9,
    C5: 523.3, D5: 587.3, E5: 659.3, F5: 698.5, G5: 784, A5: 880, C6: 1046.5 };

  // ---------------- 효과음 목록 ----------------
  // opts: { shape, r(반지름), pitch }
  const SFX = {
    button: () => tone({ type: 'sine', f0: 700, f1: 900, dur: 0.06, vol: 0.12 }),
    key: () => tone({ type: 'sine', f0: 820, dur: 0.045, vol: 0.08 }),
    fire(o) {
      if (o.shape === 'wave') {        // 가디언 충격파: 쉬익
        noise({ filter: 'lowpass', f0: 2200, f1: 300, dur: 0.22, vol: 0.28 });
        tone({ type: 'sine', f0: 180, f1: 90, dur: 0.18, vol: 0.18 });
      } else if (o.shape === 'orb') {  // 엔지니어 구체: 뿅
        tone({ type: 'sine', f0: 320, f1: 160, dur: 0.2, vol: 0.25 });
        tone({ type: 'triangle', f0: 640, f1: 320, dur: 0.12, vol: 0.08 });
      } else {                         // 직선탄: 슝
        tone({ type: 'square', f0: 1100 * (o.pitch || 1), f1: 380, dur: 0.09, vol: 0.07 });
        noise({ filter: 'highpass', f0: 3000, dur: 0.05, vol: 0.05 });
      }
    },
    hit: () => {                       // 내가 맞혔을 때: 딱
      tone({ type: 'triangle', f0: 1500, f1: 1100, dur: 0.07, vol: 0.16 });
      tone({ type: 'sine', f0: 2200, dur: 0.05, vol: 0.06, delay: 0.02 });
    },
    hurt: () => {                      // 내가 맞았을 때: 퍽
      tone({ type: 'sine', f0: 200, f1: 70, dur: 0.16, vol: 0.4 });
      noise({ filter: 'lowpass', f0: 900, dur: 0.1, vol: 0.2 });
    },
    block: () => tone({ type: 'triangle', f0: 1800, f1: 2400, dur: 0.08, vol: 0.1 }),
    reload: () => tone({ type: 'sine', f0: 900, f1: 1300, dur: 0.06, vol: 0.07 }),
    special(o) {
      // 반지름이 클수록 낮고 긴 소리 (넓이가 크면 소리도 커다랗게)
      const r = o.r || 3;
      const base = 520 / (r / 2);        // r2 520Hz, r3 347Hz, r4 260Hz
      const len = 0.25 + r * 0.07;
      tone({ type: 'sine', f0: base * 0.6, f1: base * 1.6, dur: len, vol: 0.25, attack: 0.03 });
      tone({ type: 'triangle', f0: base * 1.2, f1: base * 3.2, dur: len * 0.8, vol: 0.1, delay: 0.04 });
      noise({ filter: 'bandpass', f0: 1500, f1: 5000, dur: len, vol: 0.06, q: 3 });
    },
    blink: () => {
      tone({ type: 'sine', f0: 400, f1: 1800, dur: 0.14, vol: 0.18 });
      noise({ filter: 'highpass', f0: 2500, dur: 0.12, vol: 0.06 });
    },
    blast: () => {                     // 원형 폭발: 쾅 (부드럽게)
      tone({ type: 'sine', f0: 140, f1: 40, dur: 0.45, vol: 0.45 });
      noise({ filter: 'lowpass', f0: 1800, f1: 120, dur: 0.45, vol: 0.3 });
    },
    missionOpen: () => melody([[N.E5, 0, 0.12], [N.A5, 0.08, 0.2]], 'sine', 0.2),
    correct: () => melody([[N.C5, 0, 0.14], [N.E5, 0.09, 0.14], [N.G5, 0.18, 0.28]], 'triangle', 0.24),
    wrong: () => melody([[N.E4, 0, 0.16], [N.C4, 0.13, 0.24]], 'sine', 0.22),
    reward: () => melody([[N.G5, 0, 0.1], [N.C6, 0.07, 0.25]], 'triangle', 0.2),
    captureStart: () => tone({ type: 'sine', f0: 440, f1: 660, dur: 0.22, vol: 0.12, attack: 0.04 }),
    capture: () => melody([[N.C5, 0, 0.14], [N.G5, 0.1, 0.14], [N.C6, 0.2, 0.34]], 'triangle', 0.22),
    neutral: () => tone({ type: 'sine', f0: 520, f1: 330, dur: 0.3, vol: 0.14 }),
    score: () => {
      tone({ type: 'square', f0: 988, dur: 0.07, vol: 0.06 });
      tone({ type: 'square', f0: 1319, dur: 0.16, vol: 0.06, delay: 0.07 });
    },
    knockout: () => tone({ type: 'triangle', f0: 600, f1: 150, dur: 0.5, vol: 0.2 }),
    respawn: () => {
      tone({ type: 'sine', f0: 300, f1: 900, dur: 0.35, vol: 0.2, attack: 0.05 });
      tone({ type: 'triangle', f0: 600, f1: 1200, dur: 0.3, vol: 0.06, delay: 0.1 });
    },
    count: () => tone({ type: 'sine', f0: 660, dur: 0.15, vol: 0.22 }),
    go: () => tone({ type: 'sine', f0: 990, dur: 0.35, vol: 0.26 }),
    win: () => melody([[N.C5, 0, 0.16], [N.E5, 0.14, 0.16], [N.G5, 0.28, 0.16], [N.C6, 0.42, 0.55]], 'triangle', 0.24),
    lose: () => melody([[N.G4, 0, 0.22], [N.E4, 0.2, 0.22], [N.C4, 0.4, 0.5]], 'sine', 0.22),
    draw: () => melody([[N.E5, 0, 0.2], [N.E5, 0.22, 0.4]], 'triangle', 0.2),
  };

  // 같은 소리를 이 간격(초)보다 자주 내지 않음
  const GAP = { hurt: 0.08, hit: 0.05, score: 0.15, captureStart: 0.4, reload: 0.05, button: 0.03, key: 0.02, blast: 0.1 };

  /**
   * 효과음 내기
   * @param name 소리 이름 (위 목록)
   * @param opts { shape, r, pitch } 소리에 따라
   */
  function play(name, opts) {
    history.push(name);
    if (history.length > 80) history.shift();
    if (!ctx || ctx.state !== 'running' || muted) return;
    const now = ctx.currentTime;
    if (lastPlayed[name] !== undefined && now - lastPlayed[name] < (GAP[name] || 0.02)) return;
    lastPlayed[name] = now;
    try {
      if (buffers[name]) {
        const src = ctx.createBufferSource();
        src.buffer = buffers[name];
        src.connect(sfxBus);
        src.start();
      } else if (SFX[name]) {
        SFX[name](opts || {});
      }
    } catch (e) { /* 소리 문제로 게임이 멈추지 않게 */ }
  }

  // ---------------- 배경음 (직접 만든 짧은 반복 곡) ----------------
  // 4마디 반복: Am - F - C - G. 연장전이면 조금 빠르게.
  const bgm = { want: false, running: false, timer: null, nextTime: 0, step: 0, fast: false, src: null };
  const CHORDS = [
    [220, [N.A4, N.C5, N.E5]],   // Am
    [174.6, [N.F4, N.A4, N.C5]], // F
    [130.8, [N.C5, N.E5, N.G5]], // C
    [196, [N.G4, N.B4, N.D5]],   // G
  ];
  const ARP = [0, 1, 2, 1, 0, 2, 1, 2]; // 한 마디 안 8분음표 순서

  function scheduleStep(t, step) {
    const bar = Math.floor(step / 8) % CHORDS.length;
    const i = step % 8;
    const [bass, notes] = CHORDS[bar];
    const beat = 60 / (bgm.fast ? 132 : 108);
    const eighth = beat / 2;
    // 베이스: 마디 첫 박과 셋째 박
    if (i === 0 || i === 4) tone({ type: 'sine', f0: bass / 2, dur: beat * 1.6, vol: 0.5, attack: 0.02, at: t, bus: bgmBus });
    // 반짝이는 분산화음
    tone({ type: 'triangle', f0: notes[ARP[i]], dur: eighth * 1.6, vol: i % 2 ? 0.12 : 0.16, attack: 0.015, at: t, bus: bgmBus });
    // 마디 첫 박에 부드러운 화음 (배경이 비지 않게)
    if (i === 0) notes.forEach((f) => tone({ type: 'sine', f0: f / 2, dur: beat * 3.8, vol: 0.05, attack: 0.3, at: t, bus: bgmBus }));
    // 박자: 뒷박에 가벼운 치익
    if (i % 2 === 1) noise({ filter: 'highpass', f0: 7000, dur: 0.04, vol: bgm.fast ? 0.08 : 0.05, at: t, bus: bgmBus });
    return eighth;
  }

  function startBgmLoop() {
    if (!ctx || bgm.running) return;
    bgm.running = true;
    if (buffers.bgm) {
      bgm.src = ctx.createBufferSource();
      bgm.src.buffer = buffers.bgm;
      bgm.src.loop = true;
      bgm.src.connect(bgmBus);
      bgm.src.start();
      return;
    }
    bgm.nextTime = ctx.currentTime + 0.1;
    bgm.step = 0;
    // 조금 앞의 음까지 미리 예약 (setInterval 이 늦어도 박자가 흔들리지 않게)
    bgm.timer = setInterval(() => {
      if (!ctx || ctx.state !== 'running') return;
      while (bgm.nextTime < ctx.currentTime + 0.35) {
        const len = scheduleStep(bgm.nextTime, bgm.step);
        bgm.nextTime += len;
        bgm.step++;
      }
      // 탭을 오래 떠났다가 오면 밀린 음을 한꺼번에 내지 않음
      if (bgm.nextTime < ctx.currentTime) bgm.nextTime = ctx.currentTime + 0.05;
    }, 100);
  }

  function stopBgmLoop() {
    bgm.running = false;
    clearInterval(bgm.timer);
    bgm.timer = null;
    if (bgm.src) { try { bgm.src.stop(); } catch (e) { /* 무시 */ } bgm.src = null; }
  }

  /** 경기 배경음 켜기/끄기. fast = 연장전 */
  function setBgm(on, fast) {
    bgm.fast = !!fast;
    if (on === bgm.want) return;
    bgm.want = on;
    if (on) startBgmLoop(); else stopBgmLoop();
  }

  // ---------------- 준비 ----------------
  function init() {
    const first = () => unlock();
    ['pointerdown', 'keydown', 'touchend'].forEach((ev) => window.addEventListener(ev, first, true));
    // 모든 버튼에 짧은 누름 소리 (미션 숫자판은 더 작은 소리)
    document.addEventListener('click', (e) => {
      const b = e.target.closest && e.target.closest('button');
      if (!b || b.disabled) return;
      play(b.closest('#mission-panel') ? 'key' : 'button');
    }, true);
    // M 키: 소리 끄기/켜기 (입력 칸에 글을 쓸 때는 제외)
    window.addEventListener('keydown', (e) => {
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      if (e.code === 'KeyM' && !e.repeat) setMuted(!muted);
    });
    // 화면을 떠나면 소리를 멈춰 배터리 절약
    document.addEventListener('visibilitychange', () => {
      if (!ctx) return;
      if (document.hidden) ctx.suspend().catch(() => {});
      else ctx.resume().catch(() => {});
    });
  }

  return {
    init, unlock, play, setBgm, setVolume, setMuted,
    volumes: () => ({ ...vol }),
    isMuted: () => muted,
    isReady: () => !!ctx && ctx.state === 'running',
    history: () => history.slice(),
    bgmOn: () => bgm.running,
  };
})();
