/* ============================================================
   서클 배틀 - 소리 관리 (audio.js · AudioManager)
   ------------------------------------------------------------
   STEP 17: 효과음과 배경음(BGM)을 이 파일 한 곳에서 관리합니다.
   사운드 개선: 같은 AudioManager 를 넓혀서 상황별 BGM · 캐릭터별 효과음 · 음량 설정을 더했습니다.
     (소리 시스템은 이 파일 하나뿐 — 다른 파일은 AudioManager.playSFX('이름') 처럼 부탁만 합니다)

   ■ 소리 파일 (모두 직접 만든 원본 소리 — tools/audio 의 make_audio.py 로 만들었어요)
       assets/audio/bgm/title.mp3 lobby.mp3 battle.mp3 danger.mp3 result-win.mp3 result-lose.mp3
       assets/audio/sfx/이름.mp3  (아래 SFX_NAMES)
     같은 이름의 다른 파일로 바꾸면 그 소리가 바로 쓰입니다.
   ■ 파일이 없거나 못 불러오면 (404, 인터넷 끊김, file:// 로 열기)
       효과음 → 브라우저가 그 자리에서 만든 짧은 소리로 대신 (Web Audio)
       배경음 → 조용히 (비프음으로 대신하지 않음) · 콘솔에 경고만 한 줄
       → 어떤 경우에도 게임은 멈추지 않습니다.
   ■ 브라우저는 화면을 한 번 누르기 전에는 소리를 막습니다 → 첫 터치·클릭·키 입력 때 AudioContext.resume()
   ■ 음량: 전체 / BGM / 효과음 (0~1) + BGM 켜기·끄기 + 효과음 켜기·끄기
       localStorage: circleBattle_masterVolume · circleBattle_bgmVolume · circleBattle_sfxVolume
                     circleBattle_bgmMuted · circleBattle_sfxMuted
     PC에서 M 키 = 전체 소리 끄기/켜기 (이번 접속에서만)
   ■ 같은 BGM 이 겹쳐 나오지 않게 currentBGM 으로 관리 (같은 곡을 다시 부르면 무시)
   ■ 빠른 연사도 귀가 아프지 않게: 같은 소리는 동시에 최대 3개, 아주 빨리 겹치면 조금 작게

   쓰는 법
     AudioManager.playBGM('battle')          배경음 바꾸기 (부드럽게)
     AudioManager.crossFadeBGM('danger', 2)  2초 동안 자연스럽게 넘어가기
     AudioManager.fadeOutBGM(1) / stopBGM() / pauseBGM() / resumeBGM() / fadeInBGM(1)
     AudioManager.playSFX('attack-blaster')  효과음
     AudioManager.duckBGM(true)              문제 창이 열리면 배경음을 살짝 작게
     AudioManager.setMasterVolume(0.8) setBGMVolume(0.3) setSFXVolume(0.7) setBGMMuted(true) setSFXMuted(false)
   ============================================================ */

const AudioManager = (function () {
  const S = CONFIG.SOUND;
  const KEYS = {
    master: 'circleBattle_masterVolume', bgm: 'circleBattle_bgmVolume', sfx: 'circleBattle_sfxVolume',
    bgmMuted: 'circleBattle_bgmMuted', sfxMuted: 'circleBattle_sfxMuted',
  };
  const OLD_KEY = 'circleBattle.audio'; // STEP 17~18 에 쓰던 저장 이름 (있으면 한 번 옮겨 옴)

  // ---------------- 소리 목록 ----------------
  // 배경음: loop = 반복, loopSec = 반복 길이(초) — 직접 만든 곡은 길이를 알고 있어서 이음매 없이 반복
  const TRACKS = {
    title:         { loop: true, loopSec: 32 },
    lobby:         { loop: true, loopSec: 40 },
    battle:        { loop: true, loopSec: 30, group: 'match' }, // battle 과 danger 는 같은 빠르기·코드
    danger:        { loop: true, loopSec: 30, group: 'match' }, //   → 같은 박자 위치에서 겹쳐 넘어감
    'result-win':  { loop: false },
    'result-lose': { loop: false },
  };
  const SFX_NAMES = [
    // UI
    'ui-click', 'key', 'character-select', 'join', 'game-start', 'ready', 'countdown',
    // 전투
    'attack-blaster', 'attack-guardian', 'attack-medic', 'attack-speeder', 'attack-engineer', 'attack-frost',
    'hit', 'hit-ult', 'hurt', 'block', 'ammo-reload', 'ammo-full', 'knockout', 'respawn',
    // 고유 스킬 · 성장
    'skill-blaster', 'skill-guardian', 'skill-medic', 'skill-speeder', 'skill-engineer', 'skill-frost',
    'level-up', 'skill-max',
    // 궁극기
    'ultimate-ready', 'ultimate-blaster', 'ultimate-guardian', 'ultimate-medic', 'ultimate-speeder',
    'ultimate-engineer', 'ultimate-frost',
    // 수학 문제
    'mission-open', 'math-correct', 'math-wrong', 'tick', 'reward',
    // 점령
    'zone-enter', 'challenge-ready', 'zone-active', 'capture-progress', 'capture', 'capture-lost', 'score',
    // TEAM BOOST · 부쉬 · 시간 · 결과
    'team-boost', 'boost-heal', 'boost-ammo', 'boost-speed', 'boost-charge',
    'bush-in', 'bush-out', 'warning', 'victory', 'defeat', 'draw',
  ];
  // 예전 이름 → 새 이름 (STEP 17 코드가 부르던 이름도 그대로 동작)
  const ALIAS = {
    button: 'ui-click', reload: 'ammo-reload', missionOpen: 'mission-open', correct: 'math-correct', wrong: 'math-wrong',
    captureStart: 'capture-progress', capReady: 'challenge-ready', levelUp: 'level-up', skillMax: 'skill-max',
    teamBoost: 'team-boost', activate: 'zone-active', neutral: 'capture-lost', count: 'countdown', go: 'game-start',
    win: 'victory', lose: 'defeat', blast: 'skill-blaster', blink: 'skill-speeder',
  };
  // 같은 소리를 이 간격(초)보다 자주 내지 않음 / 동시에 최대 몇 개까지
  const GAP = { hurt: 0.08, hit: 0.045, 'hit-ult': 0.06, score: 0.15, 'capture-progress': 0.9, 'ammo-reload': 0.06,
    'ui-click': 0.03, key: 0.02, 'skill-blaster': 0.1, tick: 0.3, countdown: 0.3, 'zone-enter': 0.6, block: 0.05,
    'bush-in': 0.4, 'bush-out': 0.4, 'ultimate-ready': 1.0 };
  const MAX_VOICES = { default: 3, 'ui-click': 2, key: 2, 'ammo-reload': 2, 'capture-progress': 1 };

  let ctx = null;
  let master = null, sfxBus = null, bgmBus = null, duckGain = null;
  let noiseBuf = null;
  const bytes = {};       // 파일에서 받은 원본 (아직 소리로 바꾸기 전)
  const buffers = {};     // 소리로 바꾼 것 (효과음 이름 → AudioBuffer)
  const missing = {};     // 못 불러온 파일 (경고는 한 번만)
  const loading = {};     // 불러오는 중인 Promise
  const bgmBuffers = {};  // 배경음 (메모리를 아끼려고 최근 3곡만 기억)
  let bgmOrder = [];
  const lastPlayed = {};
  const voices = {};      // 이름 → 지금 나고 있는 소리들
  const history = [];     // 최근에 낸 소리 (시험용)
  const bgmLog = [];      // 배경음 기록 (시험용)
  let liveBgm = 0;        // 지금 실제로 울리고 있는 배경음 수 (겹침 확인용 — 바뀌는 순간 말고는 1 이하)
  let vol = loadSettings();
  let muted = false;      // M 키 (이번 접속에서만)
  let filesOk = location.protocol !== 'file:';
  let warnedFile = false;

  // ---------------- 음량 · 설정 저장 ----------------
  function readNum(key, def) {
    try {
      const v = localStorage.getItem(key);
      if (v === null || v === '') return def;
      const n = Number(v);
      return isFinite(n) && n >= 0 && n <= 1 ? n : def;
    } catch (e) { return def; }
  }
  function readBool(key, def) {
    try {
      const v = localStorage.getItem(key);
      return v === null ? def : v === 'true';
    } catch (e) { return def; }
  }
  function loadSettings() {
    const d = S.DEFAULT_VOLUME;
    const v = { master: d.master, bgm: d.bgm, sfx: d.sfx, bgmMuted: false, sfxMuted: false };
    // 예전 저장값 옮겨 오기 (새 이름으로 저장된 것이 없을 때만)
    try {
      const old = JSON.parse(localStorage.getItem(OLD_KEY) || 'null');
      if (old && localStorage.getItem(KEYS.master) === null) {
        ['master', 'bgm', 'sfx'].forEach((k) => { if (typeof old[k] === 'number') localStorage.setItem(KEYS[k], String(old[k])); });
      }
    } catch (e) { /* 저장 안 되는 브라우저 */ }
    v.master = readNum(KEYS.master, v.master);
    v.bgm = readNum(KEYS.bgm, v.bgm);
    v.sfx = readNum(KEYS.sfx, v.sfx);
    v.bgmMuted = readBool(KEYS.bgmMuted, false);
    v.sfxMuted = readBool(KEYS.sfxMuted, false);
    return v;
  }
  function save(key, value) {
    try { localStorage.setItem(KEYS[key], String(value)); } catch (e) { /* 저장 안 되면 이번 접속만 */ }
  }

  // 전체 음량은 귀에 자연스럽게 제곱, BGM·효과음은 그대로 곱함
  function applyVolumes() {
    if (!ctx) return;
    const t = ctx.currentTime;
    master.gain.setTargetAtTime(muted ? 0 : vol.master * vol.master * S.OUTPUT_GAIN, t, 0.03);
    sfxBus.gain.setTargetAtTime(vol.sfxMuted ? 0 : vol.sfx, t, 0.03);
    bgmBus.gain.setTargetAtTime(vol.bgmMuted ? 0 : vol.bgm, t, 0.05);
  }

  function clamp01(v) { return Math.max(0, Math.min(1, Number(v) || 0)); }
  function setMasterVolume(v) { vol.master = clamp01(v); save('master', vol.master); applyVolumes(); }
  function setBGMVolume(v) { vol.bgm = clamp01(v); save('bgm', vol.bgm); applyVolumes(); }
  function setSFXVolume(v) { vol.sfx = clamp01(v); save('sfx', vol.sfx); applyVolumes(); }
  function setBGMMuted(on) { vol.bgmMuted = !!on; save('bgmMuted', vol.bgmMuted); applyVolumes(); }
  function setSFXMuted(on) { vol.sfxMuted = !!on; save('sfxMuted', vol.sfxMuted); applyVolumes(); }
  // 예전 이름 (settings.js STEP 18)
  function setVolume(kind, value) {
    if (kind === 'master') setMasterVolume(value);
    else if (kind === 'bgm') setBGMVolume(value);
    else if (kind === 'sfx') setSFXVolume(value);
  }
  function setMuted(on) { muted = !!on; applyVolumes(); }

  // ---------------- 켜기 (첫 입력 때) ----------------
  function unlock() {
    try {
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
        // 효과음이 한꺼번에 커지지 않게 살짝 눌러 줌 (연사·폭발이 겹쳐도)
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -14;
        comp.ratio.value = 6;
        comp.connect(master);
        sfxBus = ctx.createGain();
        sfxBus.connect(comp);
        bgmBus = ctx.createGain();
        duckGain = ctx.createGain();
        duckGain.connect(bgmBus);
        bgmBus.connect(master);
        noiseBuf = makeNoise();
        applyVolumes();
        decodeAllSfx();
      }
      if (ctx.state === 'suspended') ctx.resume().then(startWantedBgm).catch(() => {});
      startWantedBgm();
    } catch (e) { /* 소리 문제로 게임이 멈추지 않게 */ }
  }

  function makeNoise() {
    const len = Math.floor(ctx.sampleRate * 0.6);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  // ---------------- 파일 불러오기 ----------------
  function warnMissing(url, why) {
    if (missing[url]) return;
    missing[url] = true;
    if (!filesOk) {
      if (!warnedFile) { warnedFile = true; console.warn('[AudioManager] 파일로 열어서 소리 파일을 못 불러와요 → 만든 효과음만 사용 (배경음 없음)'); }
      return;
    }
    console.warn('[AudioManager] 소리 파일 없음 (게임은 계속): ' + url + (why ? ' (' + why + ')' : ''));
  }
  // 원본(바이트)만 받아 둠 — 첫 터치 전에도 미리 받아 둘 수 있음
  function fetchBytes(url) {
    if (bytes[url]) return Promise.resolve(bytes[url]);
    if (missing[url] || !filesOk) return Promise.resolve(null);
    if (loading[url]) return loading[url];
    loading[url] = fetch(url).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(r.status)))
      .then((ab) => { bytes[url] = ab; return ab; })
      .catch((e) => { warnMissing(url, e); return null; })
      .finally(() => { delete loading[url]; });
    return loading[url];
  }
  function decode(ab) {
    return new Promise((res, rej) => {
      try { ctx.decodeAudioData(ab.slice(0), res, rej); } catch (e) { rej(e); }
    });
  }
  function sfxUrl(name) { return (S.FILES && S.FILES[name]) || S.SFX_DIR + name + S.EXT; }
  function bgmUrl(name) { return (S.FILES && S.FILES['bgm:' + name]) || S.BGM_DIR + name + S.EXT; }

  // 효과음 미리 받기 (한 번에 6개씩 — 학교 와이파이에 부담 주지 않게)
  let preloadStarted = false;
  function preloadSfx() {
    if (preloadStarted) return;
    preloadStarted = true;
    const list = SFX_NAMES.slice();
    const next = () => {
      const name = list.shift();
      if (!name) return Promise.resolve();
      return fetchBytes(sfxUrl(name)).then(() => { if (ctx) decodeSfx(name); }).then(next);
    };
    for (let i = 0; i < 6; i++) next();
  }
  function decodeSfx(name) {
    const url = sfxUrl(name);
    if (buffers[name] || !bytes[url] || !ctx) return;
    decode(bytes[url]).then((b) => { buffers[name] = b; })
      .catch(() => { warnMissing(url, 'decode'); });
  }
  function decodeAllSfx() { SFX_NAMES.forEach(decodeSfx); preloadSfx(); }

  // 배경음 불러오기 → AudioBuffer (최근 3곡만 메모리에)
  function loadBgm(name) {
    if (bgmBuffers[name]) return Promise.resolve(bgmBuffers[name]);
    const url = bgmUrl(name);
    return fetchBytes(url).then((ab) => {
      if (!ab || !ctx) return null;
      return decode(ab).then((b) => {
        bgmBuffers[name] = b;
        bgmOrder = bgmOrder.filter((n) => n !== name);
        bgmOrder.push(name);
        while (bgmOrder.length > 3) {
          const old = bgmOrder.shift();
          if (old !== bgm.current && old !== bgm.fading) delete bgmBuffers[old];
          else bgmOrder.push(old);
          if (bgmOrder.length > 4) break;
        }
        return b;
      }).catch(() => { warnMissing(url, 'decode'); return null; });
    });
  }
  /** 다음에 쓸 배경음을 미리 받아 둠 (소리로 바꾸지는 않음) */
  function prefetchBGM(names) { (names || []).forEach((n) => fetchBytes(bgmUrl(n))); }

  // mp3 는 앞뒤에 아주 짧은 빈 소리가 붙을 수 있음 → 직접 만든 곡은 길이를 알고 있으므로 정확한 구간만 반복
  function loopPoints(buf, meta) {
    if (!meta.loopSec) return null;
    const d = buf.getChannelData(0);
    const sr = buf.sampleRate;
    const maxLead = Math.min(d.length, Math.floor(sr * 0.12));
    let lead = 0;
    for (let i = 0; i < maxLead; i++) { if (Math.abs(d[i]) > 0.002) { lead = i; break; } }
    const start = lead / sr;
    const end = start + meta.loopSec;
    if (end > buf.duration + 0.01 || buf.duration - meta.loopSec > 0.6) return null; // 다른 파일로 바뀜 → 전체 반복
    return { start, end: Math.min(end, buf.duration) };
  }

  // ---------------- 배경음 (BGM) ----------------
  const bgm = {
    current: null,      // currentBGM: 지금 틀고 있는(또는 틀려는) 곡 이름
    node: null,         // { src, gain, name, startAt, offset, loop }
    fading: null,
    paused: false,
    pausedAt: 0,
    duck: false,
  };

  function logBgm(what, name) {
    bgmLog.push({ what, name, t: Math.round(performance.now()) });
    if (bgmLog.length > 60) bgmLog.shift();
  }

  /**
   * 곡 하나 틀기
   * @param o { bufPos: 파일 안 위치(초) — 이어서 틀 때 / loopPos: 반복 구간 안 위치(초) — battle→danger }
   */
  function startNode(name, buf, fadeSec, o) {
    o = o || {};
    const meta = TRACKS[name] || { loop: false };
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const lp = meta.loop ? loopPoints(buf, meta) : null;
    src.loop = !!meta.loop;
    if (lp) { src.loopStart = lp.start; src.loopEnd = lp.end; }
    const g = ctx.createGain();
    const t = ctx.currentTime;
    g.gain.setValueAtTime(fadeSec > 0 ? 0.0001 : 1, t);
    if (fadeSec > 0) g.gain.linearRampToValueAtTime(1, t + fadeSec);
    src.connect(g);
    g.connect(duckGain);
    let pos = o.bufPos !== undefined ? o.bufPos : (lp ? lp.start : 0) + (o.loopPos || 0);
    pos = Math.min(Math.max(0, pos), Math.max(0, buf.duration - 0.05));
    src.start(t, pos);
    // startAt: 파일의 0초가 울렸을 시각 (지금 위치 = currentTime - startAt)
    const node = { src, gain: g, name, startAt: t - pos, loop: !!meta.loop, lp, duration: buf.duration };
    liveBgm++;
    src.onended = () => {
      liveBgm--;
      if (bgm.node === node) { bgm.node = null; if (!meta.loop) { logBgm('ended', name); } }
    };
    logBgm('start', name);
    return node;
  }

  function stopNode(node, fadeSec) {
    if (!node) return;
    try {
      const t = ctx.currentTime;
      node.gain.gain.cancelScheduledValues(t);
      node.gain.gain.setValueAtTime(Math.max(0.0001, node.gain.gain.value), t);
      if (fadeSec > 0) {
        node.gain.gain.linearRampToValueAtTime(0.0001, t + fadeSec);
        node.src.stop(t + fadeSec + 0.05);
      } else {
        node.src.stop();
      }
      bgm.fading = node.name;
      setTimeout(() => { if (bgm.fading === node.name) bgm.fading = null; }, (fadeSec + 0.1) * 1000);
    } catch (e) { /* 이미 멈춤 */ }
    logBgm('stop', node.name);
  }

  // 원하는 곡이 아직 안 나오고 있으면 틂 (첫 터치 뒤, 파일을 다 받은 뒤)
  function startWantedBgm(fadeSec) {
    if (!ctx || ctx.state !== 'running' || !bgm.current || bgm.paused) return;
    if (bgm.node && bgm.node.name === bgm.current) return;
    const name = bgm.current;
    loadBgm(name).then((buf) => {
      if (!buf || bgm.current !== name || bgm.paused || !ctx || ctx.state !== 'running') return;
      if (bgm.node && bgm.node.name === name) return; // 그사이에 이미 틀었음 (겹치지 않게)
      // battle → danger: 지금 박자 위치에서 이어 시작 (박자가 어긋나지 않게)
      let loopPos = 0;
      const prev = bgm.node, a = prev && TRACKS[prev.name], b = TRACKS[name];
      if (prev && a && b && a.group && a.group === b.group && prev.lp) {
        const len = prev.lp.end - prev.lp.start;
        loopPos = ((ctx.currentTime - prev.startAt - prev.lp.start) % len + len) % len;
      }
      if (prev) stopNode(prev, fadeSec || S.BGM_FADE_SEC);
      bgm.node = startNode(name, buf, fadeSec === undefined ? S.BGM_FADE_SEC : fadeSec, { loopPos });
    });
  }

  /**
   * 배경음 바꾸기. 같은 곡이 이미 나오고 있으면 아무것도 하지 않음 (겹쳐 나오지 않게)
   * @param name  'title' | 'lobby' | 'battle' | 'danger' | 'result-win' | 'result-lose'
   * @param opts  { fade: 바뀌는 시간(초) }
   */
  function playBGM(name, opts) {
    if (!TRACKS[name]) return;
    const fade = opts && opts.fade !== undefined ? opts.fade : S.BGM_FADE_SEC;
    if (bgm.current === name && (bgm.node || bgm.paused)) return;
    bgm.current = name;
    bgm.paused = false;
    logBgm('want', name);
    if (!ctx) return; // 첫 터치 뒤에 시작
    if (bgm.node && bgm.node.name !== name) { stopNode(bgm.node, fade); bgm.node = null; }
    startWantedBgm(fade);
  }
  function crossFadeBGM(name, sec) { playBGM(name, { fade: sec === undefined ? 1.5 : sec }); }
  function stopBGM() {
    bgm.current = null;
    bgm.paused = false;
    if (bgm.node) { stopNode(bgm.node, 0); bgm.node = null; }
  }
  function fadeOutBGM(sec) {
    bgm.current = null;
    bgm.paused = false;
    if (bgm.node) { stopNode(bgm.node, sec === undefined ? 1 : sec); bgm.node = null; }
  }
  function fadeInBGM(sec) {
    if (!bgm.node || !ctx) return;
    const g = bgm.node.gain.gain, t = ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setValueAtTime(0.0001, t);
    g.linearRampToValueAtTime(1, t + (sec === undefined ? 1 : sec));
  }
  // 일시정지: 지금 위치를 기억했다가 그 자리부터 다시
  function pauseBGM() {
    if (bgm.paused || !bgm.current) return;
    bgm.paused = true;
    if (bgm.node && ctx) {
      const n = bgm.node;
      let pos = ctx.currentTime - n.startAt;
      if (n.loop && n.lp) {
        const len = n.lp.end - n.lp.start;
        pos = n.lp.start + ((pos - n.lp.start) % len + len) % len;
      } else if (n.loop) pos = pos % n.duration;
      bgm.pausedAt = pos;
      stopNode(n, 0.15);
      bgm.node = null;
    }
    logBgm('pause', bgm.current);
  }
  function resumeBGM() {
    if (!bgm.paused) return;
    bgm.paused = false;
    logBgm('resume', bgm.current);
    if (!ctx || !bgm.current) return;
    const name = bgm.current, at = bgm.pausedAt || 0;
    loadBgm(name).then((buf) => {
      if (!buf || bgm.current !== name || bgm.paused || bgm.node) return;
      bgm.node = startNode(name, buf, 0.3, { bufPos: at });
    });
  }
  /** 수학 문제 창이 열리면 배경음을 조금 작게 (30% → 약 20%) */
  function duckBGM(on) {
    bgm.duck = !!on;
    if (!ctx) return;
    duckGain.gain.setTargetAtTime(on ? S.BGM_DUCK : 1, ctx.currentTime, 0.15);
  }

  // ---------------- 소리 만드는 도구 (파일이 없을 때 쓰는 효과음) ----------------
  function tone(o) {
    const t = (o.at || ctx.currentTime) + (o.delay || 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f0, t);
    if (o.f1) osc.frequency.exponentialRampToValueAtTime(o.f1, t + o.dur);
    const a = o.attack || 0.005;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime((o.vol || 0.3) * (o.gain || 1), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    osc.connect(g);
    g.connect(o.bus || sfxBus);
    osc.start(t);
    osc.stop(t + o.dur + 0.05);
  }
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
    g.gain.exponentialRampToValueAtTime((o.vol || 0.2) * (o.gain || 1), t + (o.attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    src.connect(f); f.connect(g); g.connect(o.bus || sfxBus);
    src.start(t, Math.random() * 0.3);
    src.stop(t + o.dur + 0.05);
  }
  function melody(notes, type, v, gain) {
    notes.forEach(([f, d, len]) => tone({ type: type || 'triangle', f0: f, dur: len, delay: d, vol: v || 0.22, attack: 0.01, gain }));
  }
  const N = { C4: 261.6, D4: 293.7, E4: 329.6, F4: 349.2, G4: 392, A4: 440, B4: 493.9,
    C5: 523.3, D5: 587.3, E5: 659.3, F5: 698.5, G5: 784, A5: 880, B5: 987.8, C6: 1046.5, E6: 1318.5 };

  // 파일이 없을 때 대신 쓰는 짧은 효과음 (직접 만든 소리). o.gain = 음량 배수
  const SYNTH = {
    'ui-click': (o) => tone({ type: 'sine', f0: 700, f1: 900, dur: 0.06, vol: 0.12, gain: o.gain }),
    key: (o) => tone({ type: 'sine', f0: 820, dur: 0.045, vol: 0.08, gain: o.gain }),
    'character-select': (o) => melody([[N.G5, 0, 0.08], [N.C6, 0.06, 0.14]], 'triangle', 0.16, o.gain),
    join: (o) => melody([[N.C5, 0, 0.1], [N.E5, 0.08, 0.1], [N.G5, 0.16, 0.2]], 'sine', 0.18, o.gain),
    ready: (o) => melody([[N.E5, 0, 0.12], [N.A5, 0.1, 0.22]], 'triangle', 0.18, o.gain),
    countdown: (o) => tone({ type: 'sine', f0: 660, dur: 0.15, vol: 0.22, gain: o.gain }),
    'game-start': (o) => { tone({ type: 'sine', f0: 990, dur: 0.35, vol: 0.26, gain: o.gain }); tone({ type: 'triangle', f0: 1320, dur: 0.3, vol: 0.08, delay: 0.03, gain: o.gain }); },
    // 캐릭터별 공격음: 짧게, 서로 조금씩 다르게
    'attack-blaster': (o) => { tone({ type: 'square', f0: 620, f1: 160, dur: 0.14, vol: 0.08, gain: o.gain }); tone({ type: 'sine', f0: 180, f1: 70, dur: 0.14, vol: 0.22, gain: o.gain }); noise({ filter: 'lowpass', f0: 2500, f1: 400, dur: 0.1, vol: 0.08, gain: o.gain }); },
    'attack-guardian': (o) => { noise({ filter: 'lowpass', f0: 2200, f1: 300, dur: 0.2, vol: 0.24, gain: o.gain }); tone({ type: 'sine', f0: 200, f1: 100, dur: 0.16, vol: 0.16, gain: o.gain }); },
    'attack-medic': (o) => tone({ type: 'sine', f0: 1400, f1: 900, dur: 0.06, vol: 0.09, gain: o.gain }),
    'attack-speeder': (o) => { tone({ type: 'square', f0: 1500, f1: 700, dur: 0.05, vol: 0.05, gain: o.gain }); noise({ filter: 'highpass', f0: 4000, dur: 0.03, vol: 0.04, gain: o.gain }); },
    'attack-engineer': (o) => { tone({ type: 'sine', f0: 340, f1: 170, dur: 0.18, vol: 0.22, gain: o.gain }); tone({ type: 'square', f0: 880, dur: 0.03, vol: 0.04, delay: 0.01, gain: o.gain }); },
    'attack-frost': (o) => { tone({ type: 'triangle', f0: 2200, f1: 1300, dur: 0.1, vol: 0.08, gain: o.gain }); noise({ filter: 'highpass', f0: 5000, dur: 0.08, vol: 0.05, gain: o.gain }); },
    hit: (o) => { tone({ type: 'triangle', f0: 1500, f1: 1100, dur: 0.07, vol: 0.16, gain: o.gain }); tone({ type: 'sine', f0: 2200, dur: 0.05, vol: 0.06, delay: 0.02, gain: o.gain }); },
    'hit-ult': (o) => { tone({ type: 'sine', f0: 220, f1: 60, dur: 0.3, vol: 0.4, gain: o.gain }); tone({ type: 'triangle', f0: 1700, f1: 900, dur: 0.12, vol: 0.18, gain: o.gain }); noise({ filter: 'lowpass', f0: 3000, f1: 300, dur: 0.25, vol: 0.2, gain: o.gain }); },
    hurt: (o) => { tone({ type: 'sine', f0: 200, f1: 70, dur: 0.16, vol: 0.4, gain: o.gain }); noise({ filter: 'lowpass', f0: 900, dur: 0.1, vol: 0.2, gain: o.gain }); },
    block: (o) => tone({ type: 'triangle', f0: 1800, f1: 2400, dur: 0.08, vol: 0.1, gain: o.gain }),
    'ammo-reload': (o) => tone({ type: 'sine', f0: 900, f1: 1300, dur: 0.05, vol: 0.05, gain: o.gain }),
    'ammo-full': (o) => melody([[1300, 0, 0.06], [1750, 0.05, 0.1]], 'sine', 0.08, o.gain),
    knockout: (o) => tone({ type: 'triangle', f0: 600, f1: 150, dur: 0.5, vol: 0.2, gain: o.gain }),
    respawn: (o) => { tone({ type: 'sine', f0: 300, f1: 900, dur: 0.35, vol: 0.2, attack: 0.05, gain: o.gain }); tone({ type: 'triangle', f0: 600, f1: 1200, dur: 0.3, vol: 0.06, delay: 0.1, gain: o.gain }); },
    // 고유 스킬 (반지름이 클수록 낮고 긴 소리 — STEP 17 그대로)
    'skill-blaster': (o) => { tone({ type: 'sine', f0: 140, f1: 40, dur: 0.45, vol: 0.45, gain: o.gain }); noise({ filter: 'lowpass', f0: 1800, f1: 120, dur: 0.45, vol: 0.3, gain: o.gain }); },
    'skill-guardian': (o) => { tone({ type: 'sine', f0: 300, f1: 600, dur: 0.4, vol: 0.2, attack: 0.04, gain: o.gain }); tone({ type: 'triangle', f0: 900, f1: 1200, dur: 0.3, vol: 0.07, delay: 0.05, gain: o.gain }); },
    'skill-medic': (o) => melody([[N.E5, 0, 0.2], [N.A5, 0.08, 0.25], [N.C6, 0.16, 0.3]], 'sine', 0.13, o.gain),
    'skill-speeder': (o) => { tone({ type: 'sine', f0: 400, f1: 1800, dur: 0.14, vol: 0.18, gain: o.gain }); noise({ filter: 'highpass', f0: 2500, dur: 0.12, vol: 0.06, gain: o.gain }); },
    'skill-engineer': (o) => { tone({ type: 'square', f0: 220, dur: 0.05, vol: 0.06, gain: o.gain }); tone({ type: 'square', f0: 330, dur: 0.05, vol: 0.06, delay: 0.07, gain: o.gain }); tone({ type: 'sine', f0: 440, f1: 880, dur: 0.2, vol: 0.14, delay: 0.14, gain: o.gain }); },
    'skill-frost': (o) => { noise({ filter: 'bandpass', f0: 6000, f1: 2500, dur: 0.5, vol: 0.12, q: 4, gain: o.gain }); tone({ type: 'triangle', f0: 1800, f1: 2600, dur: 0.3, vol: 0.06, gain: o.gain }); },
    'level-up': (o) => melody([[N.C5, 0, 0.1], [N.E5, 0.08, 0.1], [N.G5, 0.16, 0.1], [N.C6, 0.24, 0.3]], 'triangle', 0.22, o.gain),
    'skill-max': (o) => { melody([[N.G4, 0, 0.12], [N.C5, 0.1, 0.12], [N.E5, 0.2, 0.12], [N.G5, 0.3, 0.12], [N.C6, 0.4, 0.5]], 'triangle', 0.24, o.gain); melody([[N.E5, 0.4, 0.5], [N.G5, 0.4, 0.5]], 'sine', 0.12, o.gain); },
    // 궁극기
    'ultimate-ready': (o) => { melody([[N.A5, 0, 0.1], [N.E6, 0.08, 0.3]], 'triangle', 0.18, o.gain); tone({ type: 'sine', f0: 440, f1: 880, dur: 0.25, vol: 0.1, gain: o.gain }); },
    'ultimate-blaster': (o) => { tone({ type: 'sawtooth', f0: 120, f1: 600, dur: 0.5, vol: 0.06, attack: 0.3, gain: o.gain }); tone({ type: 'sine', f0: 160, f1: 40, dur: 0.6, vol: 0.5, delay: 0.5, gain: o.gain }); noise({ filter: 'lowpass', f0: 4000, f1: 200, dur: 0.6, vol: 0.3, delay: 0.5, gain: o.gain }); },
    'ultimate-guardian': (o) => { tone({ type: 'sine', f0: 110, f1: 220, dur: 0.7, vol: 0.35, attack: 0.05, gain: o.gain }); melody([[N.C5, 0.05, 0.5], [N.G5, 0.05, 0.5], [N.C6, 0.15, 0.6]], 'triangle', 0.09, o.gain); },
    'ultimate-medic': (o) => { melody([[N.C5, 0, 0.3], [N.E5, 0.07, 0.3], [N.G5, 0.14, 0.3], [N.C6, 0.21, 0.6]], 'sine', 0.16, o.gain); noise({ filter: 'bandpass', f0: 3000, f1: 8000, dur: 0.7, vol: 0.05, q: 2, gain: o.gain }); },
    'ultimate-speeder': (o) => { tone({ type: 'sawtooth', f0: 200, f1: 1600, dur: 0.35, vol: 0.07, gain: o.gain }); noise({ filter: 'bandpass', f0: 800, f1: 6000, dur: 0.45, vol: 0.18, q: 1.5, gain: o.gain }); },
    'ultimate-engineer': (o) => { [0, 0.08, 0.16].forEach((d, i) => tone({ type: 'square', f0: 330 + i * 110, dur: 0.05, vol: 0.06, delay: d, gain: o.gain })); tone({ type: 'sawtooth', f0: 90, f1: 180, dur: 0.5, vol: 0.06, delay: 0.24, gain: o.gain }); },
    'ultimate-frost': (o) => { tone({ type: 'sine', f0: 200, f1: 70, dur: 0.5, vol: 0.35, gain: o.gain }); noise({ filter: 'highpass', f0: 3000, dur: 0.7, vol: 0.14, gain: o.gain }); melody([[N.E6, 0.1, 0.15], [N.B5, 0.18, 0.15], [N.E6, 0.26, 0.3]], 'triangle', 0.07, o.gain); },
    // 수학 문제
    'mission-open': (o) => melody([[N.E5, 0, 0.12], [N.A5, 0.08, 0.2]], 'sine', 0.2, o.gain),
    'math-correct': (o) => melody([[N.C5, 0, 0.14], [N.E5, 0.09, 0.14], [N.G5, 0.18, 0.28]], 'triangle', 0.24, o.gain),
    'math-wrong': (o) => melody([[N.E4, 0, 0.16], [N.C4, 0.13, 0.24]], 'sine', 0.18, o.gain),
    tick: (o) => tone({ type: 'sine', f0: 1200, dur: 0.04, vol: 0.1, gain: o.gain }),
    reward: (o) => melody([[N.G5, 0, 0.1], [N.C6, 0.07, 0.25]], 'triangle', 0.2, o.gain),
    // 점령
    'zone-enter': (o) => tone({ type: 'sine', f0: 660, f1: 880, dur: 0.12, vol: 0.1, gain: o.gain }),
    'challenge-ready': (o) => melody([[N.A5, 0, 0.1], [N.A5, 0.12, 0.16]], 'triangle', 0.18, o.gain),
    'zone-active': (o) => melody([[N.G4, 0, 0.12], [N.C5, 0.08, 0.12], [N.E5, 0.16, 0.12], [N.G5, 0.24, 0.3]], 'square', 0.1, o.gain),
    'capture-progress': (o) => tone({ type: 'sine', f0: 440, f1: 660, dur: 0.22, vol: 0.1, attack: 0.04, gain: o.gain }),
    capture: (o) => melody([[N.C5, 0, 0.14], [N.G5, 0.1, 0.14], [N.C6, 0.2, 0.34]], 'triangle', 0.22, o.gain),
    'capture-lost': (o) => tone({ type: 'sine', f0: 520, f1: 330, dur: 0.3, vol: 0.14, gain: o.gain }),
    score: (o) => { tone({ type: 'square', f0: 988, dur: 0.07, vol: 0.06, gain: o.gain }); tone({ type: 'square', f0: 1319, dur: 0.16, vol: 0.06, delay: 0.07, gain: o.gain }); },
    // TEAM BOOST
    'team-boost': (o) => melody([[N.E5, 0, 0.1], [N.A5, 0.07, 0.1], [N.C6, 0.14, 0.28]], 'sine', 0.2, o.gain),
    'boost-heal': (o) => melody([[N.G5, 0, 0.15], [N.C6, 0.08, 0.2]], 'sine', 0.1, o.gain),
    'boost-ammo': (o) => melody([[1300, 0, 0.05], [1300, 0.07, 0.05], [1750, 0.14, 0.08]], 'sine', 0.08, o.gain),
    'boost-speed': (o) => tone({ type: 'sine', f0: 500, f1: 1500, dur: 0.2, vol: 0.12, gain: o.gain }),
    'boost-charge': (o) => tone({ type: 'triangle', f0: 700, f1: 1400, dur: 0.25, vol: 0.12, gain: o.gain }),
    // 부쉬 (나·우리 팀만, 아주 작게)
    'bush-in': (o) => noise({ filter: 'bandpass', f0: 2500, f1: 1500, dur: 0.22, vol: 0.08, q: 0.8, gain: o.gain }),
    'bush-out': (o) => noise({ filter: 'bandpass', f0: 1800, f1: 3000, dur: 0.16, vol: 0.06, q: 0.8, gain: o.gain }),
    warning: (o) => melody([[N.A5, 0, 0.12], [N.E5, 0.16, 0.18]], 'triangle', 0.14, o.gain),
    victory: (o) => melody([[N.C5, 0, 0.16], [N.E5, 0.14, 0.16], [N.G5, 0.28, 0.16], [N.C6, 0.42, 0.55]], 'triangle', 0.24, o.gain),
    defeat: (o) => melody([[N.G4, 0, 0.22], [N.E4, 0.2, 0.22], [N.C4, 0.4, 0.5]], 'sine', 0.2, o.gain),
    draw: (o) => melody([[N.E5, 0, 0.2], [N.E5, 0.22, 0.4]], 'triangle', 0.2, o.gain),
  };

  /**
   * 효과음 내기
   * @param name 소리 이름 (SFX_NAMES, 예전 이름도 됨)
   * @param opts { vol: 음량 배수(0~1), rate: 높낮이 배수 }
   * @returns 낸 소리의 이름 (안 났으면 null)
   */
  function playSFX(name, opts) {
    name = ALIAS[name] || name;
    opts = opts || {};
    history.push(name);
    if (history.length > 120) history.shift();
    try {
      if (!ctx || ctx.state !== 'running' || muted || vol.sfxMuted) return null;
      const now = ctx.currentTime;
      const last = lastPlayed[name];
      if (last !== undefined && now - last < (GAP[name] || 0.02)) return null;
      // 빠른 연사: 바로 앞 소리와 아주 가까우면 조금 작게 (귀가 아프지 않게)
      let gain = opts.vol === undefined ? 1 : Math.max(0, Math.min(1, opts.vol));
      if (last !== undefined && now - last < 0.12) gain *= 0.7;
      lastPlayed[name] = now;
      if (gain <= 0.001) return null;
      const buf = buffers[name];
      if (buf) {
        // 동시에 같은 소리는 최대 MAX_VOICES 개 (넘으면 가장 오래된 것을 멈춤)
        const list = (voices[name] = (voices[name] || []).filter((v) => v.end > now));
        const max = MAX_VOICES[name] || MAX_VOICES.default;
        while (list.length >= max) {
          const v = list.shift();
          try { v.g.gain.setTargetAtTime(0.0001, now, 0.01); v.src.stop(now + 0.05); } catch (e) { /* 이미 끝남 */ }
        }
        const src = ctx.createBufferSource();
        src.buffer = buf;
        if (opts.rate) src.playbackRate.value = opts.rate;
        const g = ctx.createGain();
        g.gain.value = gain;
        src.connect(g);
        g.connect(sfxBus);
        src.start();
        list.push({ src, g, end: now + buf.duration / (opts.rate || 1) });
      } else if (SYNTH[name]) {
        SYNTH[name]({ gain, ...opts });
      }
      return name;
    } catch (e) {
      return null; // 소리 문제로 게임이 멈추지 않게
    }
  }

  // ---------------- 예전 방식 (STEP 17) — 그대로 부를 수 있게 ----------------
  function play(name, opts) {
    // fire(shape) / special(r) 처럼 예전 이름으로 부르면 가장 가까운 새 소리로
    if (name === 'fire') {
      const shape = opts && opts.shape;
      return playSFX(shape === 'wave' ? 'attack-guardian' : shape === 'orb' ? 'attack-engineer' : 'attack-blaster', opts);
    }
    if (name === 'special') return playSFX('skill-guardian', opts);
    return playSFX(name, opts);
  }
  /** 예전 경기 배경음 켜기/끄기 (STEP 17) → 지금은 파일 곡: battle (연장전은 danger)
   *  ※ STEP 17 의 "브라우저가 만든 반복 곡"은 비프음처럼 들려 사운드 개선에서 직접 만든 mp3 곡으로 바꿨습니다 */
  function setBgm(on, fast) {
    if (on) playBGM(fast ? 'danger' : 'battle');
    else if (bgm.current === 'battle' || bgm.current === 'danger') fadeOutBGM(0.6);
  }

  // ---------------- 준비 ----------------
  function init() {
    const first = () => unlock();
    ['pointerdown', 'keydown', 'touchend'].forEach((ev) => window.addEventListener(ev, first, true));
    // 첫 터치 전에도 효과음 파일은 미리 받아 둠 (소리로 바꾸는 것은 첫 터치 뒤)
    setTimeout(preloadSfx, 300);
    // 모든 버튼에 짧은 누름 소리 (미션 숫자판은 더 작은 소리)
    document.addEventListener('click', (e) => {
      const b = e.target.closest && e.target.closest('button');
      if (!b || b.disabled || b.dataset.sfx === 'none') return;
      playSFX(b.dataset.sfx || (b.closest('#mission-panel') ? 'key' : 'ui-click'));
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
      else ctx.resume().then(startWantedBgm).catch(() => {});
    });
  }

  return {
    init, unlock,
    // 배경음
    playBGM, stopBGM, pauseBGM, resumeBGM, fadeInBGM, fadeOutBGM, crossFadeBGM, duckBGM, prefetchBGM,
    get currentBGM() { return bgm.current; },
    // 효과음
    playSFX, play,
    // 음량
    setMasterVolume, setBGMVolume, setSFXVolume, setBGMMuted, setSFXMuted, setVolume, setMuted,
    volumes: () => ({ master: vol.master, bgm: vol.bgm, sfx: vol.sfx }),
    settings: () => ({ ...vol }),
    isMuted: () => muted,
    isReady: () => !!ctx && ctx.state === 'running',
    // 예전 이름
    setBgm,
    bgmOn: () => !!bgm.node,
    // 시험·문제 찾기용
    history: () => history.slice(),
    bgmLog: () => bgmLog.slice(),
    debug: () => ({
      ctx: ctx ? ctx.state : 'none', currentBGM: bgm.current, playing: bgm.node ? bgm.node.name : null,
      paused: bgm.paused, duck: bgm.duck, loadedSfx: Object.keys(buffers).length, sfxNames: SFX_NAMES.length,
      missing: Object.keys(missing), cachedBgm: Object.keys(bgmBuffers),
      gains: ctx ? { master: master.gain.value, sfx: sfxBus.gain.value, bgm: bgmBus.gain.value, duck: duckGain.gain.value } : null,
      loop: bgm.node && bgm.node.lp ? { start: bgm.node.src.loopStart, end: bgm.node.src.loopEnd } : null,
      liveBgm,
    }),
    // 시험용: 불러온 효과음의 길이와 간단한 지문 (캐릭터마다 다른 소리인지 확인)
    bufferInfo(name) {
      const b = buffers[ALIAS[name] || name];
      if (!b) return null;
      const d = b.getChannelData(0);
      let e = 0, z = 0;
      for (let i = 0; i < d.length; i++) { e += d[i] * d[i]; if (i && (d[i] >= 0) !== (d[i - 1] >= 0)) z++; }
      return { dur: Math.round(b.duration * 1000) / 1000, rms: Math.round(Math.sqrt(e / d.length) * 1e4) / 1e4, zc: z };
    },
    SFX_NAMES, TRACKS,
  };
})();
