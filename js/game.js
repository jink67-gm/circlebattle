/* ============================================================
   서클 배틀 - 게임 시작과 게임 루프 (game.js)
   ------------------------------------------------------------
   STEP 1: 게임 화면과 기본 맵을 보여줍니다.
   STEP 2: 내 캐릭터를 키보드·조이스틱으로 움직입니다.
   ※ 주소 끝에 ?view=spectate 를 붙이면 교사 관전 화면 표시를 미리 볼 수 있습니다.
   ※ 주소 끝에 ?touch=1 을 붙이면 PC에서도 조이스틱을 마우스로 시험할 수 있습니다.
   STEP 3: 벽·상자·기둥·터미널에 막히고, 비스듬히 부딪히면 벽을 따라 미끄러집니다.
   ※ 주소 끝에 ?debug=1 을 붙이면 충돌 상자(빨강)와 캐릭터 몸(초록)이 보입니다.
   STEP 4: 조준과 기본 공격, 탄약 3발 자동 충전.
   STEP 5: 탄이 벽에 막히고 상대를 맞힘. 맞힌 자리에 효과와 피해 숫자 표시.
           시험해 볼 수 있도록 LUNAR 팀 "연습 상대"를 세워 둡니다. (멀티플레이 연결 전까지)
   STEP 6: 체력바, 체력 0 → "에너지 충전 중" → 5초 뒤 시작 지역에서 재등장.
           H 키 또는 [나에게 -30] 버튼으로 내 캐릭터 재충전을 시험할 수 있습니다.
   STEP 7: 에너지 존 안에 누가 있는지 판정. 존 색과 팀별 인원 표시,
           내 캐릭터가 존에 들어가면 넓이 구하는 식을 잠깐 보여줌.
   STEP 8: 점령 게이지(존의 넓이만큼), 탈환, 15초마다 팀 점수, 남은 시간,
           목표 점수·시간 종료 승리, 동점이면 연장전(가운데 존 먼저 점령).
   ※ 주소 끝에 ?quick=1 을 붙이면 1분 경기·목표 10점·5초마다 점수로 빠르게 시험.
   STEP 9: 에너지(⚡)와 6개 캐릭터 특수기. 반지름 2·3·4 선택, 비용 = 원의 넓이.
           에너지: 기본 공격 적중 +3, 존 안 초당 +1, 재등장 +10 (최대 60)
           테스트: G 키 또는 [⚡ 가득] 버튼으로 에너지 채우기
   STEP 10: 원형 범위 시스템 — 반지름을 바꾸면 넓이 비교 카드(넓이 비),
           미리보기에 반지름 2·3·4m 원을 겹쳐 보여줌, 에너지 바에 이번 비용 표시,
           놓은 원에 반지름·넓이 라벨을 잠깐 표시.
   STEP 11: 수학 터미널 — 우리 팀 터미널 2m 안에서 [수학 미션] 버튼(PC는 F 키).
           문제를 푸는 동안 제자리·받는 피해 절반, 끝내면 75초 쿨다운, 한 경기 최대 5문제.
   STEP 12: 문제은행 55문제(TYPE 1~6, 난이도 3단계) + 게임 상황 문제, 힌트, 풀이.
   ※ 주소 끝에 ?diff=easy / normal / hard 로 문제 난이도를 바꿔 시험할 수 있습니다.
   STEP 13: 미션 보상 — 정답 ⚡+20(힌트 후 +12) + 보너스 하나(탄약 충전/5초 보호막/3초 가속),
           풀이를 봤으면 ⚡+5. 보너스는 체력 0이 되면 사라짐.
   STEP 14: 시작 화면 → 대기방 → 3·2·1 → 경기 → 결과 → 대기방. 새로고침 없이 다시 시작.
           테스트 도구(캐릭터 바꾸기, 나에게 -30, ⚡ 가득)와 연습 상대는 "혼자 연습"에서만.
   ※ 주소 끝에 ?play=1 을 붙이면 시작 화면 없이 바로 혼자 연습 경기 (개발 시험용)
   STEP 16: 멀티플레이. 교사 기기(host)가 경기를 계산하고, 학생 기기(client)는 내 캐릭터만
           직접 움직이며 나머지는 교사 기기가 보낸 경기 상황을 그립니다. (주고받기는 sync.js)
   STEP 17: 효과음·배경음 (audio.js). 점령·점수·체력 변화는 watchSounds 가 보고 소리를 냄.
   STEP 18: ⚙ 환경설정 (settings.js). 혼자 연습은 설정 창을 여는 동안 멈춤(paused).
   STEP 19: 경기가 끝나면 내 기록 / 교사 기기는 학습 결과 저장 (results.js)
   STEP 20: 태블릿 최적화 — 맵은 뒤쪽 캔버스에 한 번만, 느리면 화질 자동 조절,
            경기 중 화면 꺼짐 방지 (tablet.js)
   궁극기: 터미널 LEVEL 1 고유 스킬 → LEVEL 2 궁극기 해금(게이지) → LEVEL 3 MAX 스킬·궁극기 강화 → TEAM BOOST
           Q 키 / [궁극기] 버튼. 판정은 ultimate.js (교사 기기·혼자 연습)
   사운드: 화면마다 배경음(title·lobby·battle·danger·결과), 캐릭터별 공격·스킬·궁극기 소리 (audio.js)
   수정 STEP 2: 점령 = 존에서 3초 버티기 → [점령 문제 풀기](F 키) → 정답이면 팀 전체 점령 활성화
            → 팀원이 존에 머물면 게이지 → 점령. 점령 문제를 푸는 동안만 무적(이동·공격·스킬 불가).
   ============================================================ */

// 연습 상대 (테스트용). sway가 있으면 위아래로 천천히 움직입니다.
// 새 STEP 2: 넓어진 경기장에 맞춘 자리 (가운데 x = 38)
const PRACTICE_DUMMIES = [
  { nick: '연습 상대 1', charId: 'guardian', x: 38,   y: 22,   sway: 0, walkX: 4 }, // 수정 STEP 5: 가운데 B존을 좌우로 가로지름 (프로스트 확인용)
  { nick: '연습 상대 2', charId: 'frost',    x: 48.2, y: 24,   sway: 0 },   // B 앞 상자 뒤
  { nick: '연습 상대 3', charId: 'medic',    x: 43.5, y: 9,    sway: 0 },   // A존 옆
  { nick: '연습 상대 4', charId: 'engineer', x: 43,   y: 39,   sway: 0.8 }, // C존 옆
  { nick: '연습 상대 5', charId: 'speeder',  x: 49.5, y: 19.8, sway: 0 },   // 새 STEP 2: 부쉬 안 (가까이 가거나 맞히면 보임)
];

const Game = (function () {
  // 수정 STEP 5: { SOLAR: { heal: 0, ammo: 0, speed: 0, charge: 0 }, LUNAR: {...} }
  function newBoostCd() {
    const cd = {};
    ['SOLAR', 'LUNAR'].forEach((t) => { cd[t] = {}; CONFIG.TEAM_BOOST.TYPES.forEach((b) => { cd[t][b.id] = 0; }); });
    return cd;
  }

  // 게임 진행 정보 (STEP 8에서 점수, STEP 16에서 네트워크 동기화에 사용)
  const state = {
    settings: { ...CONFIG.ROOM_DEFAULTS },
    score: { SOLAR: 0, LUNAR: 0 },
    timeLeft: CONFIG.ROOM_DEFAULTS.gameMinutes * 60,
    targetScore: CONFIG.ROOM_DEFAULTS.targetScore,
    viewMode: 'play', // 'play' 또는 'spectate'
    players: [],      // 경기에 나온 모든 플레이어
    localPlayer: null, // 이 기기에서 조작하는 플레이어 (관전 중이면 null)
    projectiles: [],  // 날아가는 탄
    aim: null,        // 조준선 표시용 { angle } (조준 중이 아니면 null)
    effects: [],      // 부딪힘 불꽃, 피해 숫자 같은 짧은 효과
    time: 0,          // 게임이 시작된 뒤 흐른 시간(초)
    zones: Zones.create(), // 에너지 존 A·B·C의 상태
    phase: 'playing', // 'playing' 경기 중 / 'overtime' 연장전 / 'ended' 경기 끝
    scoreInterval: CONFIG.CAPTURE.SCORE_INTERVAL_SEC,
    result: null,     // 경기 결과 { winner, reason }
    areas: [],        // 특수기로 만든 원 (폭발 예고, 보호막, 회복존, 터렛, 둔화지역)
    ults: [],         // 궁극기 물체 (캐논, 보호 영역, 회복 파동, 드론, 냉기 영역)
    specialPreview: null, // 특수기 범위 미리보기 { x, y, r, cost, area, ok, ... }
    ultPreview: null,     // 궁극기 미리보기 { charId, x, y, angle, r, range, width, endDist, ready, cancel }
    nearTerminal: null,   // 내 캐릭터가 쓸 수 있는 가까운 터미널 (없으면 null)
    missionCooldownSec: CONFIG.MISSION.COOLDOWN_SEC,
    netRole: null,    // STEP 16: null 혼자 / 'host' 교사 기기 / 'client' 학생 기기
    teamBoostCd: newBoostCd(), // 수정 STEP 5: 팀별 TEAM BOOST 종류마다 다시 고를 수 있기까지 남은 시간
  };
  let myLastZoneId = null; // 내 캐릭터가 방금 전까지 있던 존 (들어갈 때 안내용)

  let lastTime = 0;
  const params = new URLSearchParams(location.search);

  // 입력 칸에 글자를 쓰는 중이면 게임 단축키를 쓰지 않음 (닉네임에 W·H·F 등을 칠 수 있게)
  function isTyping(e) {
    const t = e.target;
    return !!(t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA'));
  }

  // ---------------- 처음 한 번만: 화면·입력·버튼 준비 ----------------
  function init() {
    AudioManager.init(); // STEP 17: 소리 (첫 터치·클릭 때 켜짐)
    Tablet.init();       // STEP 20: 화면 꺼짐 방지, 확대 막기
    Renderer.init(document.getElementById('game-canvas'));
    UI.init();
    Input.init();
    Input.setEnabled(false);
    Renderer.setDebug(params.get('debug') === '1'); // 충돌 상자 보기

    setupCharacterTest();
    // 경기 결과 → 대기방으로
    document.getElementById('btn-restart').addEventListener('click', backToLobby);
    setupSpecialControls();
    Mission.init();
    setupMissionControls();
    Settings.init(); // STEP 18
    Results.init();  // STEP 19
    document.getElementById('btn-results-view').addEventListener('click', () => Results.open('match'));

    window.addEventListener('resize', Renderer.resize);
    window.addEventListener('orientationchange', () => setTimeout(Renderer.resize, 200));
    // 글꼴이 늦게 불러와지면 맵 글자를 다시 그립니다.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => Renderer.redrawStatic());
    }
    requestAnimationFrame(loop);

    // 시험용 주소(?play=1, ?view=spectate, ?quick=1)면 시작 화면 없이 바로 연습 경기
    if (params.get('play') === '1' || params.has('view') || params.get('quick') === '1') {
      startMatch({
        mode: 'practice',
        viewMode: params.get('view') === CONFIG.TEACHER_ROLES.SPECTATE ? 'spectate' : 'play',
        me: { id: 'me', nick: '나', team: 'SOLAR', charId: 'blaster', slot: 2 },
        countdown: 0,
      });
    } else {
      Lobby.init();
      Lobby.showTitle();
    }
  }

  // ---------------- 경기마다: 상태를 처음으로 되돌림 ----------------
  function resetState() {
    state.settings = { ...CONFIG.ROOM_DEFAULTS };
    state.score = { SOLAR: 0, LUNAR: 0 };
    state.players = [];
    state.localPlayer = null;
    state.projectiles = [];
    state.aim = null;
    state.effects = [];
    state.time = 0;
    state.zones = Zones.create();
    state.phase = 'playing';
    state.scoreInterval = CONFIG.CAPTURE.SCORE_INTERVAL_SEC;
    state.result = null;
    state.areas = [];
    state.ults = [];
    state.specialPreview = null;
    state.ultPreview = null;
    state.nearTerminal = null;
    state.missionCooldownSec = CONFIG.MISSION.COOLDOWN_SEC;
    state.countdown = 0;
    state.netRole = null;
    state.paused = false;
    state.teamBoostCd = newBoostCd();
    myLastZoneId = null;
    heard = null;
  }

  /**
   * 경기 시작 (대기방에서 부름)
   * @param cfg {
   *   mode: 'practice' 혼자 연습 / 'room' 방 경기,
   *   viewMode: 'play' | 'spectate',
   *   me: { id, nick, team, charId, slot },     내 캐릭터 (관전이면 없음)
   *   others: [{ id, nick, team, charId, slot, kind }],   다른 플레이어 (STEP 16)
   *   settings: 교사 설정 (STEP 15),
   *   countdown: 시작 전 카운트다운 초 (기본 3)
   *   net: 'host' | 'client' (STEP 16 멀티플레이), roomCode, matchId, lineup, myId
   * }
   */
  function startMatch(cfg) {
    Settings.close(true);
    resetState();
    Mission.close(false);
    UI.resetMatchUI();
    state.mode = cfg.mode || 'practice';
    state.matchId = cfg.matchId || 'm' + Date.now().toString(36); // STEP 19: 결과 저장용
    clearTimeout(recordTimer);
    receivedRecord = null;
    Results.showMine(null, false);
    document.getElementById('btn-results-view').hidden = true;
    state.viewMode = cfg.viewMode || 'play';
    Object.assign(state.settings, cfg.settings || {});

    // 빠른 시험 (?quick=1): 1분 경기, 목표 10점, 5초마다 점수
    if (params.get('quick') === '1') {
      state.settings.gameMinutes = CONFIG.QUICK_TEST.gameMinutes;
      state.settings.targetScore = CONFIG.QUICK_TEST.targetScore;
      state.scoreInterval = CONFIG.QUICK_TEST.scoreInterval;
      state.missionCooldownSec = CONFIG.QUICK_TEST.missionCooldown;
    }
    // 문제 난이도 시험: ?diff=easy / normal / hard
    if (['easy', 'normal', 'hard'].indexOf(params.get('diff')) !== -1) state.settings.difficulty = params.get('diff');
    // 원주율 시험: ?pi=3 / ?pi=3.14
    if (params.has('pi')) state.settings.pi = Number(params.get('pi'));
    applyPi(state.settings.pi); // 수정 STEP 3
    // 수정 STEP 6: 점령 문제 제한 시간 (교사 설정 30/45/60초). 교사 기기의 시간 확인도 같은 값으로
    const cs = Number(state.settings.capSeconds);
    CONFIG.CAPTURE.QUESTION_SEC = CONFIG.ROOM_OPTIONS.capSeconds.indexOf(cs) !== -1 ? cs : CONFIG.ROOM_DEFAULTS.capSeconds;
    state.settings.capSeconds = CONFIG.CAPTURE.QUESTION_SEC;
    state.timeLeft = state.settings.gameMinutes * 60;
    state.targetScore = state.settings.targetScore;

    // 내 캐릭터
    if (state.viewMode === 'play' && cfg.me) {
      state.localPlayer = Player.create({ ...cfg.me, isLocal: true });
      state.players.push(state.localPlayer);
    }
    // 다른 플레이어 (STEP 16: 다른 기기에서 조작하는 사람은 remote)
    state.netRole = cfg.net || null;
    (cfg.others || []).forEach((o) => {
      const p = Player.create(o);
      if ((state.netRole === 'host' && o.net) || state.netRole === 'client') p.remote = true;
      state.players.push(p);
    });
    // 혼자 연습: 연습 상대와 테스트 도구
    if (state.mode === 'practice') addPracticeDummies();
    document.body.classList.toggle('practice-mode', state.mode === 'practice' && !!state.localPlayer);
    document.body.classList.toggle('no-specials', !state.settings.specialsEnabled);
    Ultimate.setEnabled(state.settings.specialsEnabled); // 특수기 "사용 안 함"이면 궁극기도 없음
    refreshCharacterTestLabel();

    UI.setSpectating(state.viewMode === 'spectate');
    // 카운트다운 (3·2·1) 동안은 움직일 수 없음
    state.countdown = cfg.countdown === undefined ? 3 : cfg.countdown;
    if (state.countdown > 0) {
      state.phase = 'countdown';
      Input.setEnabled(false);
      GameState.change(STATES.COUNTDOWN);
      AudioManager.playSFX('ready'); // READY! → 3 · 2 · 1 → START!
    } else {
      beginPlay();
    }
    Renderer.resize();

    // STEP 16: 경기 상황 주고받기 시작
    if (state.netRole === 'host') {
      Sync.startHost({ roomCode: cfg.roomCode, matchId: cfg.matchId, lineup: cfg.lineup });
    } else if (state.netRole === 'client') {
      Sync.startClient({ roomCode: cfg.roomCode, matchId: cfg.matchId, lineup: cfg.lineup, myId: cfg.myId },
        state, clientHooks);
    }
  }

  // ---------------- 수정 STEP 3: 이번 경기의 원주율 ----------------
  // 선생님이 고른 원주율(3.14 또는 3)로 문제은행·정답·존 넓이·특수기 비용을 모두 같게 맞춤.
  // 멀티플레이에서는 교사 설정이 경기 시작 정보(settings.pi)로 모든 기기에 전해짐.
  function applyPi(pi) {
    if (pi !== 3 && pi !== 3.14) pi = CONFIG.ROOM_DEFAULTS.pi;
    state.settings.pi = pi;
    CONFIG.PI = pi;
    GameMap.zones.forEach((z) => { z.area = circleArea(z.r); });
    Questions.setPi(pi);
    state.zones = Zones.create(); // 존 넓이(점령 게이지)를 새 원주율로
    UI.refreshCosts();
  }

  function beginPlay() {
    state.phase = 'playing';
    Input.setEnabled(state.viewMode === 'play');
    GameState.change(STATES.PLAYING);
  }

  // 결과 화면 → 대기방
  function backToLobby() {
    // STEP 19: 선생님이 경기를 중간에 끝내도 그때까지 푼 문제는 저장
    const solved = state.players.some((p) => p.missionLog && p.missionLog.length);
    if (isTeacherDevice() && state.phase !== 'ended' && state.phase !== 'idle' && (state.time > 5 || solved)) {
      saveRecords(null, 'stopped');
    }
    stopMatch();
    if (typeof Lobby !== 'undefined' && Lobby.backToLobby()) return;
    // 시험용 주소로 바로 시작한 경우: 같은 설정으로 다시
    location.reload();
  }

  // 경기 멈추기 (대기방으로 가거나, 방이 닫혔을 때)
  function stopMatch() {
    Mission.close(false);
    state.phase = 'idle';
    Input.setEnabled(false);
    UI.resetMatchUI();
    UI.setNetWarning(null);
    AudioManager.duckBGM(false);
    lastDuck = false;
    Settings.close(true);
    state.paused = false;
    Sync.stop();
    state.netRole = null;
  }

  // requestAnimationFrame 기반 게임 루프
  function loop(now) {
    const t = now / 1000;
    // 탭을 다녀왔을 때 한 번에 크게 움직이지 않도록 최대 0.1초로 제한
    const dt = lastTime ? Math.min(t - lastTime, 0.1) : 0;
    lastTime = t;
    syncBgm(); // 화면마다 배경음 (같은 곡이면 아무 일도 없음)

    // 시작 화면·대기방에서는 게임을 그리지 않음 (태블릿 배터리 절약)
    if (!GameState.is(STATES.TITLE) && !GameState.is(STATES.LOBBY) && !GameState.is(STATES.TEACHER_LOGIN)) {
      if (state.paused) { /* STEP 18: 혼자 연습 일시정지 (배경음은 syncBgm 이 멈춤) */ }
      else if (state.netRole === 'client') updateClient(dt);
      else update(dt);
      if (state.netRole === 'host') Sync.hostSend(state, dt); // 경기가 끝난 뒤에도 결과를 보냄
      if (state.netRole) UI.setNetWarning(Sync.warning());
      if (!state.paused) watchSounds(); // STEP 17
      Renderer.render(t, state);
      // STEP 20: 경기 중 프레임 시간을 재서 느린 기기는 화질을 저절로 낮춤
      if (!state.paused && (state.phase === 'playing' || state.phase === 'overtime')) Renderer.noteFrame(dt * 1000);
      UI.updateHud(state);
    }

    requestAnimationFrame(loop);
  }

  function update(dt) {
    // 경기가 끝나면 효과만 마저 움직이고 멈춤
    if (state.phase === 'ended' || state.phase === 'idle') {
      updateEffects(dt);
      return;
    }
    // 시작 카운트다운: 3 → 2 → 1 → 시작!
    if (state.phase === 'countdown') {
      state.countdown -= dt;
      UI.showCountdown(state.countdown);
      updateEffects(dt);
      if (state.countdown <= 0) beginPlay();
      return;
    }

    const me = state.localPlayer;
    updateLocalControl(me, dt);

    state.time += dt;
    updatePracticeDummies(dt);
    updateBots(dt); // STEP 21: 빈자리를 채운 봇 (교사 기기에서만 계산)

    // STEP 16 교사 기기: 학생 기기의 위치 반영 + 쏘기·특수기·미션 명령 처리
    if (state.netRole === 'host') {
      const cmds = Sync.hostTakeInputs(state, dt);
      updateRemoteCaptures(); // 수정 STEP 2: 학생이 점령 문제를 열고 닫은 것 반영
      cmds.forEach(runRemoteCommand);
    }

    // 탄 움직이기 + 충돌 → 일어난 사건 처리 (보호막이 탄을 막음)
    const events = Projectiles.update(state.projectiles, dt, state.players, state.areas);
    events.forEach(handleProjectileEvent);

    // 특수기 원: 폭발, 회복, 둔화, 터렛
    const sk = Skills.update(state, dt);
    state.areas = sk.areas;
    sk.events.forEach(handleSkillEvent);
    // 새 STEP 4: 메딕 회복 오라 (둘레 3m 우리 팀이 조금씩 회복)
    Skills.updateAuras(state.players, dt, (m, p, h) => { m.stats.healed += h; Ultimate.onHeal(m, p, h); });
    // 궁극기: 게이지(역할별 행동) + 궁극기 물체 (캐논·보호 영역·드론·냉기 영역)
    Ultimate.update(state, dt, ultHooks);

    // 체력바 애니메이션, 재충전 카운트다운, 재등장
    state.players.forEach((p) => {
      if (Player.updateLife(p, dt)) onRespawn(p);
    });
    Bushes.update(state.players); // 새 STEP 2: 누가 어느 부쉬 안에 있는지

    // 에너지 존: 누가 어느 원 안에 있는지
    Zones.updateOccupancy(state.zones, state.players);
    state.players.forEach((p) => {
      if (!p.zoneId) return;
      p.stats.zoneTime += dt;
      Player.addEnergy(p, CONFIG.ENERGY.PER_SEC_IN_ZONE * dt); // 존 안에 있으면 초당 +1⚡
    });
    if (me) {
      if (me.zoneId && me.zoneId !== myLastZoneId) {
        UI.showZoneToast(state.zones.find((z) => z.id === me.zoneId), me.team);
      }
      myLastZoneId = me.zoneId;
    }

    // 수정 STEP 2: 점령 준비(3초 버티기)와 점령 문제 시간
    Zones.updatePrep(state.zones, state.players, dt, CONFIG.CAPTURE.PREP_SEC);
    updateCaptureTimers(dt);

    // 점령 게이지와 팀 점수
    Zones.updateCapture(state.zones, state.players, dt, state.scoreInterval)
      .forEach(handleZoneEvent);

    // 수학 터미널: 쿨다운과 가까운 터미널 찾기
    state.players.forEach((p) => {
      if (p.missionCooldown > 0) p.missionCooldown = Math.max(0, p.missionCooldown - dt);
    });
    tickBoostCd(dt); // 수정 STEP 5
    state.nearTerminal = me && me.alive && !me.inMission && !me.inCapQ ? findUsableTerminal(me) : null;
    UI.updateMissionButton(me, state.nearTerminal, state.settings.missionLimit, me && boostMode(me));
    UI.updateCaptureButton(me, state.zones);

    // 남은 시간
    if (state.phase !== 'ended') {
      state.timeLeft = Math.max(0, state.timeLeft - dt);
      if (state.timeLeft === 0) onTimeUp();
    }

    updateEffects(dt);
  }

  // 내 캐릭터 조작 (혼자·교사·학생 기기 모두 같은 코드)
  function updateLocalControl(me, dt) {
    if (me && (me.inMission || me.inCapQ || me.capWait)) {
      // 수학 미션·점령 문제 중: 캐릭터는 제자리, 쏘기·특수기 없음 (탄약은 계속 충전)
      state.aim = null;
      state.specialPreview = null;
      state.ultPreview = null;
      Player.update(me, { x: 0, y: 0 }, dt);
      Input.takeFires();
      Input.takeSpecialCasts();
      Input.takeUltCasts();
    } else if (me && me.alive) {
      // 조준 방향 계산
      const aimAngle = getAimAngle(me);
      state.aim = aimAngle === null ? null : { angle: aimAngle };
      // 궁극기 미리보기 (Q 누르고 있기 / 궁극기 버튼 누른 채 끌기)
      state.ultPreview = state.settings.specialsEnabled ? computeUltPreview(me) : null;
      const faceAngle = state.ultPreview && !state.ultPreview.cancel ? state.ultPreview.angle : aimAngle;

      // 내 캐릭터 이동 (조준 중이면 조준 방향을 바라봄)
      Player.update(me, Input.getMove(), dt, faceAngle);

      // 발사
      Input.takeFires().forEach((cmd) => tryFire(me, cmd));

      // 특수기: 범위 미리보기 + 사용
      state.specialPreview = state.settings.specialsEnabled ? computeSpecialPreview(me) : null;
      Input.takeSpecialCasts().forEach((cmd) => {
        if (state.settings.specialsEnabled) tryCastSpecial(me, cmd);
      });
      // 궁극기 (Q 키 / [궁극기] 버튼)
      Input.takeUltCasts().forEach((cmd) => {
        if (state.settings.specialsEnabled) tryUseUlt(me, cmd);
      });
    } else if (me) {
      // 재충전 중: 조작은 받지 않음
      state.aim = null;
      state.specialPreview = null;
      state.ultPreview = null;
      Input.takeFires();
      Input.takeSpecialCasts();
      Input.takeUltCasts();
    }
  }

  // ---------------- STEP 16: 학생 기기의 한 프레임 ----------------
  // 판정은 교사 기기가 하므로 여기서는 내 캐릭터 조작과 그리기만 합니다.
  function updateClient(dt) {
    if (state.phase === 'ended' || state.phase === 'idle') {
      Sync.clientFrame(state, dt);
      updateEffects(dt);
      return;
    }
    if (state.phase === 'countdown') {
      state.countdown -= dt;
      UI.showCountdown(state.countdown);
      if (state.countdown <= 0) beginPlay();
      Sync.clientFrame(state, dt);
      updateEffects(dt);
      return;
    }
    const me = state.localPlayer;
    updateLocalControl(me, dt);
    state.time += dt;

    // 탄은 모양만 날아감 (벽 불꽃도 여기서). 맞힘·피해는 교사 기기가 알려 줌
    Projectiles.update(state.projectiles, dt, state.players, state.areas).forEach((ev) => {
      if (ev.type === 'wall') {
        addEffect({ kind: 'spark', x: ev.x, y: ev.y, color: CHARACTERS[ev.charId].accent, life: 0.25 });
      } else if (me && ev.ownerId === me.id) {
        if (ev.type === 'turretHit') addEffect({ kind: 'spark', x: ev.x, y: ev.y, color: CHARACTERS[ev.charId].accent, life: 0.25 });
        // STEP 17: 내 탄이 맞았을 때 바로 소리 (피해는 교사 기기가 정함)
        AudioManager.playSFX(ev.type === 'hit' ? 'hit' : 'block');
      }
    });
    state.areas.forEach((a) => { a.age += dt; });
    Ultimate.clientTick(state, dt); // 궁극기 물체를 부드럽게 (판정은 교사 기기)
    state.players.forEach((p) => {
      Player.updateTimers(p, dt);
      if (!p.alive) p.respawnTimer = Math.max(0, p.respawnTimer - dt); // "재충전 중… 3" 표시용
    });

    if (me) {
      const z = me.alive ? Zones.zoneOf(state.zones, me) : null;
      me.zoneId = z ? z.id : null;
      if (me.zoneId && me.zoneId !== myLastZoneId) UI.showZoneToast(z, me.team);
      myLastZoneId = me.zoneId;
      if (me.missionCooldown > 0) me.missionCooldown = Math.max(0, me.missionCooldown - dt);
      // 수정 STEP 2: 점령 준비 막대 — 교사 기기가 보낸 값 사이를 부드럽게 채우고, 존을 나가면 바로 0
      if (me.zoneId !== me.capPrepZone) me.capPrep = 0;
      else if (!me.capReady && !me.inCapQ) me.capPrep = Math.min(CONFIG.CAPTURE.PREP_SEC, me.capPrep + dt * (me.slowFactor || 1));
      // 교사 기기가 점령 문제를 받아 주지 않으면(준비가 안 됐다고 판단) 창을 닫음
      if (me.inCapQ && !me.hostCapQ && performance.now() - (me.capOpenedAt || 0) > 2500 && Mission.isOpen()) {
        Mission.close(false);
      }
    }
    state.nearTerminal = me && me.alive && !me.inMission && !me.inCapQ ? findUsableTerminal(me) : null;
    UI.updateMissionButton(me, state.nearTerminal, state.settings.missionLimit, me && boostMode(me));
    UI.updateCaptureButton(me, state.zones);

    // 남은 시간은 받은 값에서 부드럽게 줄어듦
    state.timeLeft = Math.max(0, state.timeLeft - dt);
    tickBoostCd(dt);

    Sync.clientFrame(state, dt);
    Bushes.update(state.players); // 새 STEP 2: 받은 위치로 부쉬 안인지 계산 (드러난 시간은 교사 기기가 보냄)
    updateEffects(dt);
  }

  // 교사 기기가 보낸 사건과 경기 상황 → 학생 화면
  const clientHooks = {
    onEvent(e) {
      if (e.k === 'fx') {
        const fx = Sync.decodeEffect(e);
        addEffect(fx);
        if (e.kd === 'blast') AudioManager.playSFX('skill-blaster'); // STEP 17
        if (e.kd === 'ultCast') ultCastHeard(fx); // 궁극기 소리 (내가 쓴 것은 누를 때 이미 냄)
        if (e.kd === 'ultHit' && fx.pid && state.localPlayer && fx.pid === state.localPlayer.id) AudioManager.playSFX('hit-ult');
      }
      else if (e.k === 'ui') Sync.uiCall(e);
      else if (e.k === 'tb') onTeamBoost(e.t, e.id, e.n); // 수정 STEP 5: TEAM BOOST
      else if (e.k === 'kb') { // 새 STEP 3: 블래스터 폭발에 내 캐릭터가 밀려남
        const k = Sync.decodeKnock(e);
        const me = state.localPlayer;
        if (k && me && k.id === me.id) Player.knock(me, k.dx, k.dy);
      }
      else if (e.k === 'b') {
        const b = Sync.decodeShot(state, e);
        if (b) state.projectiles.push(b);
      }
    },
    onSnapshot(v) {
      if (v.ph === 'overtime' && state.phase === 'playing') state.phase = 'overtime';
      // 교사 기기는 이미 시작했는데 이 기기는 아직 카운트다운이면 바로 시작
      if ((v.ph === 'playing' || v.ph === 'overtime') && state.phase === 'countdown') {
        UI.showCountdown(0);
        beginPlay();
        if (v.ph === 'overtime') state.phase = 'overtime';
      }
      if (v.ph === 'ended' && v.res && state.phase !== 'ended' && state.phase !== 'idle') {
        const res = Net.toArray(v.res);
        endGame([null, 'SOLAR', 'LUNAR'][res[0]] || null, res[1]);
      }
    },
    onMyKnockout(p) {
      state.aim = null;
      state.specialPreview = null;
      state.ultPreview = null;
      if (p.inMission) { Mission.close(false); missionCancelledToast(); } // 풀던 문제는 다음에 다시 (보상 없음)
    },
    // STEP 19: 교사 기기가 계산한 내 기록
    onResult(rec) {
      // 기록이 "경기 끝" 소식보다 먼저 올 수도 있으므로 기억해 둠
      receivedRecord = rec || null;
      if (state.phase !== 'ended' || !rec) return;
      clearTimeout(recordTimer);
      Results.showMine(rec);
    },
    onMyRespawn(p) {
      // 재등장하면 탄약 가득, 시작 방향
      p.ammo = ammoMaxOf(p.charId);
      p.fireCooldown = 0;
      p.facing = p.team === 'LUNAR' ? Math.PI : 0;
    },
  };

  // ---------------- STEP 16: 교사 기기가 학생 명령 처리 ----------------
  function runRemoteCommand({ p, c }) {
    if (state.phase === 'ended' || state.phase === 'idle' || state.phase === 'countdown') return;
    if (c.k === 'f') {
      if (!p.alive || p.inMission || p.inCapQ || p.capWait || !isFinite(c.a)) return;
      // STEP 21: 탄약 확인 (학생 기기 탄약을 교사 기기에서도 충전 속도대로 셈)
      //          명령이 한꺼번에 도착할 수 있어 반 발 정도는 봐줌. 재등장·탄약 보너스는 가득으로 돌아감
      const reload = CHARACTERS[p.charId].attack.reloadSec;
      p.ammo = Math.min(ammoMaxOf(p.charId), p.ammo + (state.time - (p.ammoAt === undefined ? state.time : p.ammoAt)) / reload);
      p.ammoAt = state.time;
      if (p.ammo < 0.5) return;
      p.ammo -= 1;
      // 학생 기기에서 쏜 자리에서 출발 (너무 멀면 교사 기기가 아는 자리)
      const near = isFinite(c.x) && isFinite(c.y) && Math.hypot(c.x - p.x, c.y - p.y) < 3;
      const body = { id: p.id, team: p.team, charId: p.charId, radius: p.radius,
        x: near ? c.x : p.x, y: near ? c.y : p.y };
      p.facing = c.a;
      p.stats.shots++;
      state.projectiles.push(Projectiles.create(body, c.a, Skills.shotOverride(p, state.time))); // 새 STEP 4: 스피더 기습
      Bushes.revealAttack(p, state.time); // 새 STEP 2: 부쉬 안에서 쏘면 잠시 드러남
    } else if (c.k === 's') {
      if (!state.settings.specialsEnabled || p.inCapQ || p.capWait || !isFinite(c.x) || !isFinite(c.y)) return;
      castSpecialAt(p, c.x, c.y); // 수정 STEP 4: 반지름·효과는 교사 기기가 아는 스킬 레벨로
    } else if (c.k === 'u') {
      // 궁극기: 게이지·레벨·상태는 교사 기기가 다시 확인 (100%가 아니면 무시)
      if (!state.settings.specialsEnabled || p.inCapQ || p.capWait) return;
      useUlt(p, isFinite(c.a) ? c.a : p.facing);
    } else if (c.k === 'm') {
      if (p.missionsUsed >= state.settings.missionLimit) return; // STEP 21: 한 경기 문제 수를 넘으면 무시
      applyMissionResult(p, {
        correct: !!c.ok, hintShown: !!c.h, reward: c.rw || null, wrongCount: c.wc | 0, timeSec: c.ts || 0,
        question: { id: c.qi, type: c.qt, category: c.qc, difficulty: c.qd,
          text: String(c.qx || '').slice(0, 200), answerText: String(c.qa || '').slice(0, 40) },
      });
    } else if (c.k === 'z') {
      // 수정 STEP 2: 점령 문제 결과. 교사 기기가 열어 준(3초 버티기를 확인한) 문제만 받음
      if (!c.z || c.z !== p.capZone) return;
      if (c.c) { p.capZone = null; p.capRetry = CONFIG.CAPTURE.RETRY_SEC; return; } // 포기
      resolveCapture(p, c.z, {
        correct: !!c.ok, hintShown: !!c.h, wrongCount: c.wc | 0, timeSec: c.ts || 0, failed: c.ok ? null : (c.fr || 'wrong'),
        question: { id: c.qi, type: c.qt, category: c.qc, difficulty: c.qd,
          text: String(c.qx || '').slice(0, 200), answerText: String(c.qa || '').slice(0, 40) },
      });
    }
  }

  // ---------------- 수정 STEP 2: 점령 문제 ----------------
  // 교사 기기: 학생 기기가 점령 문제 창을 열었는지(m=2) 보고 무적 상태를 켜고 끔
  function updateRemoteCaptures() {
    state.players.forEach((p) => {
      if (!p.remote) return;
      p.capWait = !!p.netCapWait; // 오답 뒤 5초 기다리는 중 (무적 아님 — 문제 창은 열려 있음)
      if (p.netCapQ) {
        // 3초 버티기를 교사 기기도 확인했을 때만 (준비가 안 됐는데 연 창은 무적이 되지 않음)
        if (!p.inCapQ && !p.capQBlocked && p.alive && p.capReady && p.capReady === p.zoneId) startCapture(p);
      } else {
        p.capQBlocked = false;
        if (p.inCapQ) p.inCapQ = false; // 학생이 창을 닫음 (결과는 'z' 명령으로 옴)
      }
    });
  }

  function startCapture(p) {
    p.inCapQ = true;
    p.capZone = p.capReady;
    p.capQTime = 0;
    p.vx = p.vy = 0;
  }

  // 점령 문제 시간: 30초(+인터넷 여유)가 지나도 안 끝나면 교사 기기가 무적을 풂
  function updateCaptureTimers(dt) {
    const limit = CONFIG.CAPTURE.QUESTION_SEC + CONFIG.CAPTURE.QUESTION_GRACE_SEC;
    state.players.forEach((p) => {
      if (!p.inCapQ) return;
      p.capQTime += dt;
      if (p.capQTime <= limit) return;
      if (p.isLocal) { if (Mission.isOpen()) Mission.close(false); else p.inCapQ = false; return; }
      p.inCapQ = false;
      p.capQBlocked = true; // 학생 기기가 창을 닫을 때까지 다시 켜지 않음
      p.capRetry = CONFIG.CAPTURE.RETRY_SEC;
    });
  }

  // 지금 점령 문제를 열 수 있는지 (3초 버티기 완료, 지금 서 있는 존)
  function canOpenCapture(me) {
    if (!me || !me.alive || me.inCapQ || me.capWait || me.inMission) return false;
    if (state.phase !== 'playing' && state.phase !== 'overtime') return false;
    if (!me.capReady || me.capReady !== me.zoneId || me.capRetry > 0) return false;
    return Zones.needsActivation(zoneById(me.capReady), me.team);
  }

  function openCapture() {
    const me = state.localPlayer;
    if (!canOpenCapture(me)) return false;
    const z = zoneById(me.capReady);
    // 포기하고 닫았던 문제는 같은 존에서 다시 열면 그대로 (문제 바꾸기 방지)
    const q = me.capPending && me.capPending.zoneId === z.id ? me.capPending : { ...Questions.zoneQuestion(me, z, state) };
    me.capPending = q;
    me.inCapQ = true;
    me.capZone = z.id;
    me.capQTime = 0;
    me.capOpenedAt = performance.now();
    me.vx = me.vy = 0;
    state.aim = null;
    state.specialPreview = null;
    state.ultPreview = null;
    Input.setEnabled(false);
    GameState.change(STATES.MATH_MISSION);
    Mission.open(q, { mode: 'capture', zoneId: z.id, timeLimit: CONFIG.CAPTURE.QUESTION_SEC, isPaused: () => state.paused }, {
      onFinish: (result) => onCaptureFinish(me, z, result),
      onClose: () => onCaptureCancel(me, z),
      // 오답 뒤 5초: 무적을 바로 풀고(상대가 공격할 수 있음), 다시 도전할 때 다시 무적
      onWait: (on) => {
        if (!me.inCapQ && !me.capWait) return; // 이미 끝남
        me.capWait = on;
        me.inCapQ = !on;
        if (!on) me.capOpenedAt = performance.now(); // 학생 기기: 교사 기기가 다시 무적을 켤 때까지 기다림
        if (on) {
          addEffect({ kind: 'dmg', x: me.x, y: me.y - 2.7, text: '무적 해제!', color: '#ff9db0', life: 1.1, pid: me.id });
        }
      },
    });
    return true;
  }

  function endCapture(me) {
    me.inCapQ = false;
    me.capWait = false;
    if (state.phase !== 'ended' && state.phase !== 'idle') {
      Input.setEnabled(true);
      GameState.change(STATES.PLAYING);
    }
  }

  // 점령 문제를 끝냄 (정답 또는 실패)
  function onCaptureFinish(me, z, result) {
    endCapture(me);
    me.capPending = null;
    me.usedQuestionIds.push(result.question.id);
    const q = result.question;
    if (state.netRole === 'client') {
      Sync.sendCommand({ k: 'z', z: z.id, ok: result.correct ? 1 : 0, h: result.hintShown ? 1 : 0, fr: result.failed || '',
        wc: result.wrongCount | 0, ts: Math.round(result.timeSec * 10) / 10,
        qi: String(q.id), qt: q.type || 0, qc: q.category || '', qd: q.difficulty || 0,
        qx: Questions.plainText(q).slice(0, 200), qa: Questions.answerText(q) });
      logQuestion(me, result, 'capture'); // 내 기기 기록 (교사 기기 기록이 늦을 때 보여줄 것)
      if (!result.correct) me.capRetry = CONFIG.CAPTURE.RETRY_SEC; // 교사 기기가 정하기 전에 미리
    } else {
      resolveCapture(me, z.id, result);
    }
    if (!result.correct) {
      UI.showToast('점령 도전 실패 · ' + (result.failed === 'time' ? '시간이 끝났어요' : '세 번 틀렸어요') + ' · ' +
        CONFIG.CAPTURE.RETRY_SEC + '초 뒤 다시 도전',
        '정답 ' + Questions.answerText(q) + '  (' + q.explanation + ')', '#ff9db0', 4500);
    }
  }

  // [포기] 또는 경기가 끝나서 닫힘 → 5초 뒤 다시 도전 (같은 존이면 같은 문제)
  function onCaptureCancel(me, z) {
    endCapture(me);
    me.capRetry = CONFIG.CAPTURE.RETRY_SEC;
    if (state.netRole === 'client') Sync.sendCommand({ k: 'z', z: z.id, c: 1 });
    else me.capZone = null;
    if (state.phase === 'playing' || state.phase === 'overtime') {
      UI.showToast('점령 문제를 닫았어요', CONFIG.CAPTURE.RETRY_SEC + '초 뒤 다시 도전할 수 있어요', '#ffd84d');
    }
  }

  // 점령 문제 결과 처리 (혼자·교사 기기) — 기록 + 정답이면 팀 전체 활성화, 실패면 5초 뒤 재도전
  function resolveCapture(p, zoneId, result) {
    logQuestion(p, result, 'capture');
    p.capZone = null;
    if (result.correct) activateZone(p, zoneId);
    else p.capRetry = CONFIG.CAPTURE.RETRY_SEC;
  }

  function activateZone(p, zoneId) {
    if (state.phase !== 'playing' && state.phase !== 'overtime') return false;
    if (!Zones.activate(state.zones, zoneId, p.team)) return false; // 이미 활성화했거나 우리 존
    const z = zoneById(zoneId);
    const team = CONFIG.TEAMS[p.team];
    p.stats.activations = (p.stats.activations || 0) + 1;
    // 새 STEP 3: 존에서 큰 빛 고리가 퍼지고 "ZONE ACTIVATED!"
    addEffect({ kind: 'zoneActivated', x: z.x, y: z.y, color: team.color, life: 1.8, radius: z.r, text: 'ZONE ACTIVATED!' });
    uiAll('showToast', 'ZONE ACTIVATED! · ' + zoneId + '존 점령 활성화!',
      team.name + '팀 ' + p.nick + ' 정답 → 이제 ' + zoneId + '존에 머물면 게이지가 올라가요', team.color, 3200);
    return true;
  }

  // 푼 문제 기록 (학습 결과) — kind: 'terminal' 에너지 터미널 / 'capture' 점령 문제
  function logQuestion(p, result, kind) {
    const entry = {
      id: result.question.id,
      type: result.question.type,             // TYPE 1~6
      category: result.question.category,     // area / radiusDiameter / compare
      difficulty: result.question.difficulty,
      correct: result.correct,
      wrongCount: result.wrongCount,
      hintShown: result.hintShown,
      timeSec: Math.round(result.timeSec * 10) / 10,
      text: result.question.text || Questions.plainText(result.question),       // STEP 19
      answer: result.question.answerText || Questions.answerText(result.question),
      kind,
      failed: result.failed || null,
    };
    p.missionLog.push(entry);
    return entry;
  }

  // 모든 기기에 보여 줄 알림 (교사 기기면 학생 기기에도 보냄)
  function uiAll(fn, ...args) {
    UI[fn](...args);
    if (state.netRole === 'host') Sync.hostUi(state, fn, args);
  }

  // ---------------- STEP 19: 기록 ----------------
  let recordTimer = null;
  let receivedRecord = null; // 학생 기기: 교사 기기에서 받은 내 기록
  // 교사 기기 (방장, 또는 인터넷 없이 연 교사 방)
  function isTeacherDevice() {
    return state.mode === 'room' && state.netRole !== 'client';
  }

  function saveRecords(winner, reason) {
    const records = state.players.map(Results.recordOf);
    const room = typeof Lobby !== 'undefined' && Lobby.room();
    Results.saveMatch({
      id: state.matchId, room: room && room.code ? room.code : '', winner, reason,
      score: { SOLAR: state.score.SOLAR, LUNAR: state.score.LUNAR }, minutes: state.settings.gameMinutes, records,
      pi: state.settings.pi, // 수정 STEP 3
    });
    return records;
  }

  function showRecords() {
    const r = state.result;
    let records = null;
    if (isTeacherDevice()) {
      records = saveRecords(r.winner, r.reason);
      if (state.netRole === 'host') Sync.hostPublishResult(records);
    } else if (state.mode === 'practice') {
      records = state.players.map(Results.recordOf);
    }
    document.getElementById('btn-results-view').hidden = !isTeacherDevice();
    const me = state.localPlayer;
    if (state.netRole === 'client') {
      if (!me) { Results.showMine(null, false); return; }
      if (receivedRecord) { Results.showMine(receivedRecord); return; }
      Results.showMine(null, true);
      // 교사 기기 기록이 늦으면 내 기기에 있는 수학 기록만이라도 보여줌
      recordTimer = setTimeout(() => {
        const rec = Results.recordOf(me);
        rec.partial = true;
        Results.showMine(rec);
      }, 4000);
    } else if (me) {
      Results.showMine(records.find((x) => x.id === me.id));
    } else {
      Results.showClass(records);
    }
  }

  // ---------------- STEP 17: 소리 ----------------
  // 고유 스킬 소리 (블래스터 폭발음은 0.5초 뒤 터질 때)
  function specialSound(p) {
    if (p.charId !== 'blaster') AudioManager.playSFX('skill-' + p.charId);
  }

  // ---------------- 배경음: 화면마다 (모든 기기) ----------------
  //   시작 화면 title → 대기방 lobby → 3·2·1 부터 battle → 남은 30초·연장전 danger (자연스럽게 넘어감)
  //   → 결과: battle 이 작아지며 사라지고 결과 곡 (endGame)
  let resultMusicTimer = null;
  function syncBgm() {
    const st = GameState.current;
    if (st === STATES.RESULT) return; // 결과 곡은 endGame 이 정함
    let want = null;
    if (st === STATES.TITLE || st === STATES.TEACHER_LOGIN) want = 'title';
    else if (st === STATES.LOBBY || st === STATES.CHARACTER_SELECT) want = 'lobby';
    else if (st === STATES.COUNTDOWN || st === STATES.PLAYING || st === STATES.MATH_MISSION) {
      const danger = state.phase === 'overtime' || (state.phase === 'playing' && state.timeLeft <= CONFIG.SOUND.DANGER_SEC);
      want = danger ? 'danger' : 'battle';
    }
    if (want && AudioManager.currentBGM !== want) {
      clearTimeout(resultMusicTimer);
      if (want === 'danger') AudioManager.crossFadeBGM('danger', 2.5); // battle → danger 천천히 겹쳐 넘어감
      else AudioManager.playBGM(want);
      if (want === 'lobby') AudioManager.prefetchBGM(['battle', 'danger']); // 경기 곡을 미리 받아 둠
      if (want === 'title') AudioManager.prefetchBGM(['lobby']);
    }
    // 혼자 연습: 설정 창을 연 동안 멈춤 → 닫으면 그 자리부터
    if (state.paused) AudioManager.pauseBGM(); else AudioManager.resumeBGM();
    // 수학 문제 창이 열려 있으면 배경음을 살짝 작게 (문제 풀이에 집중)
    const ducking = typeof Mission !== 'undefined' && Mission.isOpen();
    if (ducking !== lastDuck) { lastDuck = ducking; AudioManager.duckBGM(ducking); }
  }
  let lastDuck = false;

  // 경기 시간 소리: 60초 작은 경고 · 30초 danger (syncBgm) · 마지막 10초 째깍
  let timeCue = { warned: false, lastCount: null };
  function timeSounds() {
    if (state.phase !== 'playing' && state.phase !== 'overtime') { timeCue = { warned: false, lastCount: null }; return; }
    const t = state.timeLeft;
    if (state.phase === 'playing' && !timeCue.warned && t <= CONFIG.SOUND.WARN_SEC && t > CONFIG.SOUND.WARN_SEC - 2 && state.time > 2) {
      timeCue.warned = true;
      AudioManager.playSFX('warning');
    }
    const n = Math.ceil(t);
    if (n <= CONFIG.SOUND.COUNT_SEC && n >= 1 && timeCue.lastCount !== n && state.time > 1) {
      timeCue.lastCount = n;
      AudioManager.playSFX('countdown', { vol: n <= 3 ? 0.9 : 0.55 });
    }
    const box = document.getElementById('timer');
    const final = n <= CONFIG.SOUND.COUNT_SEC && t > 0;
    if (box && box.parentElement.classList.contains('final') !== final) box.parentElement.classList.toggle('final', final);
  }

  // 경기 상태가 바뀐 것을 보고 소리를 냄.
  // 혼자 연습·교사 기기·학생 기기 모두 같은 방법이라 네트워크로 따로 알릴 필요가 없음
  let heard = null; // 지난 프레임에 본 상태
  function watchSounds() {
    const inMatch = state.phase === 'playing' || state.phase === 'overtime';
    timeSounds();
    const me = state.localPlayer;
    const myTeam = me ? me.team : null;
    const now = {
      phase: state.phase,
      me: me && { hp: me.hp, alive: me.alive, ammo: Math.floor(me.ammo + 1e-6), full: me.ammo >= ammoMaxOf(me.charId) - 1e-6,
        ready: me.capReady && me.capReady === me.zoneId, zone: me.zoneId, bush: !!me.inBush,
        ult: Ultimate.isReady(me) },
      zones: state.zones.map((z) => ({ owner: z.owner, team: z.progressTeam, act: (z.active.SOLAR ? 1 : 0) + (z.active.LUNAR ? 2 : 0),
        q: z.area > 0 ? Math.floor(z.progress / z.area * 4) : 0 })),
      score: myTeam ? state.score[myTeam] : state.score.SOLAR + state.score.LUNAR,
    };
    const prev = heard;
    heard = now;
    if (!prev || !inMatch || prev.phase !== now.phase) return; // 연장전으로 바뀐 순간 등은 건너뜀

    if (now.me && prev.me) {
      if (now.me.alive && prev.me.alive && now.me.hp < prev.me.hp) {
        AudioManager.playSFX('hurt');
        if (me.inMission) Mission.hurt(); // 수정 STEP 4: 터미널 문제 중 공격받음 → 창이 빨갛게 흔들림
      }
      if (prev.me.alive && !now.me.alive) AudioManager.playSFX('knockout');
      if (!prev.me.alive && now.me.alive) AudioManager.playSFX('respawn');
      else if (now.me.alive && now.me.ammo > prev.me.ammo) {
        // 한 발 충전: 작은 딸깍 / 다 찼을 때: 조금 더 또렷하게
        AudioManager.playSFX(now.me.full ? 'ammo-full' : 'ammo-reload', { vol: now.me.full ? 0.8 : 0.5 });
      }
      if (now.me.ready && !prev.me.ready) AudioManager.playSFX('challenge-ready'); // 수정 STEP 2: 점령 도전 가능!
      if (now.me.zone && now.me.zone !== prev.me.zone) AudioManager.playSFX('zone-enter', { vol: 0.6 });
      // 부쉬: 내 캐릭터만 아주 작게 (상대가 소리로 위치를 알 수 없게)
      if (now.me.alive && prev.me.alive && now.me.bush !== prev.me.bush) AudioManager.playSFX(now.me.bush ? 'bush-in' : 'bush-out', { vol: 0.5 });
      // 궁극기 100% → 그 순간 한 번만
      if (now.me.ult && !prev.me.ult) {
        AudioManager.playSFX('ultimate-ready');
        UI.ultReady(me);
        addEffect({ kind: 'ultReady', x: me.x, y: me.y, color: '#ffd84d', life: 0.9, pid: me.id, local: true });
      }
    }
    now.zones.forEach((z, i) => {
      const p = prev.zones[i];
      if (!p) return;
      const mine = (t) => !myTeam || t === myTeam;
      const actBit = myTeam === 'LUNAR' ? 2 : 1;
      if (myTeam ? (z.act & actBit) && !(p.act & actBit) : (z.act & ~p.act)) AudioManager.playSFX('zone-active'); // ZONE ACTIVATED
      if (z.owner && z.owner !== p.owner) {
        if (mine(z.owner)) AudioManager.playSFX('capture');                       // 점령 성공
        else if (p.owner === myTeam) AudioManager.playSFX('capture-lost');         // 우리 거점을 빼앗김
      } else if (!z.owner && p.owner && p.owner === myTeam) {
        AudioManager.playSFX('capture-lost');                                      // 우리 존이 중립으로
      } else if (z.team && mine(z.team) && z.owner !== z.team && z.q > p.q && z.team === p.team) {
        AudioManager.playSFX('capture-progress', { vol: 0.6 });                    // 점령 게이지 1/4 마다 (반복이 적게)
      }
    });
    if (now.score > prev.score) AudioManager.playSFX('score', { vol: 0.7 });
  }

  // ---------------- 점령·점수 사건 처리 ----------------
  function zoneById(id) {
    return state.zones.find((z) => z.id === id);
  }

  function handleZoneEvent(ev) {
    const z = zoneById(ev.zoneId);
    const team = CONFIG.TEAMS[ev.team];
    if (ev.type === 'captured') {
      // 새 STEP 3: 겹겹이 퍼지는 에너지 물결
      addEffect({ kind: 'zoneWave', x: z.x, y: z.y, color: team.color, life: 1.4, radius: z.r });
      addEffect({ kind: 'dmg', x: z.x, y: z.y - z.r - 0.9, text: 'CAPTURED!', color: team.color, life: 1.6 });
      uiAll('showToast', ev.zoneId + '존 점령!', team.name + '팀이 점령 게이지를 모두 채웠어요', team.color);
      // 연장전: 가운데 존(B)을 먼저 점령한 팀이 승리
      if (state.phase === 'overtime') endGame(ev.team, 'overtime');
    } else if (ev.type === 'neutralized') {
      uiAll('showToast', ev.zoneId + '존 중립', team.name + '팀의 점령이 풀렸어요', '#ffffff');
    } else if (ev.type === 'score') {
      if (state.phase === 'overtime') return; // 연장전에는 점령으로만 승부
      state.score[ev.team] += ev.points;
      uiAll('bumpScore', ev.team);
      addEffect({ kind: 'dmg', x: z.x, y: z.y - z.r * 0.25, text: '+' + ev.points + '점',
        color: team.color, life: 1.2 });
      if (state.score[ev.team] >= state.targetScore) endGame(ev.team, 'target');
    }
  }

  // ---------------- 시간 종료 · 연장전 · 경기 끝 ----------------
  function onTimeUp() {
    const s = state.score.SOLAR, l = state.score.LUNAR;
    if (state.phase === 'playing' && s === l) {
      startOvertime();
    } else if (state.phase === 'playing') {
      endGame(s > l ? 'SOLAR' : 'LUNAR', 'time');
    } else {
      // 수정 STEP 6: 연장전 시간이 끝나면 연장전 존(새 STEP 2: 가운데 B존) 게이지를 채우고 있던 팀이 승리
      //   (게이지는 점령 문제를 맞혀 활성화한 팀만 채울 수 있음). 아무도 못 채웠으면 무승부
      const c = zoneById(CONFIG.CAPTURE.OVERTIME_ZONE);
      const lead = c && c.progress > 0 ? c.progressTeam : null;
      if (lead) endGame(lead, 'overtimeGauge');
      else endGame(null, 'draw');
    }
  }

  // 연장전: 가운데 존(새 STEP 2: B존)만 켜고 중립으로 되돌림. 그 존을 먼저 점령한 팀이 승리.
  function startOvertime() {
    const oz = CONFIG.CAPTURE.OVERTIME_ZONE;
    state.phase = 'overtime';
    state.timeLeft = CONFIG.CAPTURE.OVERTIME_SEC;
    // 연장전 존이 아닌 존의 점령 문제를 풀던 중이면 닫음 (그 존은 쉬므로)
    const me = state.localPlayer;
    if (me && (me.inCapQ || me.capWait) && me.capZone !== oz) Mission.close(false);
    state.zones.forEach((z) => {
      z.owner = null;
      z.progress = 0;
      z.progressTeam = null;
      z.scoreTimer = 0;
      z.disabled = z.id !== oz;
      z.active.SOLAR = z.active.LUNAR = false; // 연장전 존도 점령 문제부터 다시
    });
    uiAll('showToast', '동점! 연장전 ' + CONFIG.CAPTURE.OVERTIME_SEC + '초',
      oz + '존을 먼저 점령하는 팀이 승리 · 시간이 끝나면 ' + oz + '존 게이지를 채우던 팀 승리', '#ffd84d');
  }

  function endGame(winner, reason) {
    if (state.phase === 'ended') return;
    state.phase = 'ended';
    state.result = { winner, reason };
    state.aim = null;
    Mission.close(false);
    Input.setEnabled(false);
    UI.updateCaptureButton(null, state.zones);
    UI.updateMissionButton(null, null, 0);
    GameState.change(STATES.RESULT);
    UI.showResult(state);
    // STEP 17: 승리/패배 (관전하는 선생님 화면은 축하 소리)
    // 경기 곡이 작아지며 사라짐 → 결과 효과음 → 결과 곡 (무승부는 중립 효과음만)
    const me = state.localPlayer;
    const outcome = !winner ? 'draw' : !me || me.team === winner ? 'win' : 'lose';
    AudioManager.duckBGM(false);
    lastDuck = false;
    AudioManager.fadeOutBGM(0.8);
    AudioManager.playSFX(outcome === 'win' ? 'victory' : outcome === 'lose' ? 'defeat' : 'draw');
    clearTimeout(resultMusicTimer);
    if (outcome !== 'draw') {
      resultMusicTimer = setTimeout(() => {
        if (GameState.is(STATES.RESULT)) AudioManager.playBGM(outcome === 'win' ? 'result-win' : 'result-lose', { fade: 0.3 });
      }, 1600);
    }
    showRecords(); // STEP 19: 개인 기록·학습 결과
  }

  // ---------------- 체력 0 / 재등장 ----------------
  // 폭력적인 표현 없이, 에너지가 흩어졌다가 시작 지역에서 다시 모이는 효과를 보여줍니다.
  function onKnockout(p) {
    addEffect({ kind: 'recharge', x: p.x, y: p.y, color: CONFIG.TEAMS[p.team].color, life: 0.7 });
    if (p.isLocal && p.inMission) { Mission.close(false); missionCancelledToast(); } // 풀던 문제는 다음에 다시 (보상 없음)
    // (재충전·재등장 소리는 watchSounds 가 체력 변화를 보고 냄)
  }

  // 수정 STEP 4: 터미널 문제 중 체력 0 → 도전 취소 (보상 없음), 재등장 뒤 다시 터미널로
  function missionCancelledToast() {
    UI.showToast('문제 도전 취소 · 에너지 충전 중', '다시 나타나면 터미널에서 같은 문제에 다시 도전해요', '#ff9db0', 3500);
  }

  function onRespawn(p) {
    // 연습 상대는 원래 서 있던 자리로 돌아감
    if (p.homeX !== undefined) {
      p.x = p.homeX;
      p.y = p.homeY;
      p.facing = Math.PI;
    }
    addEffect({ kind: 'spawn', x: p.x, y: p.y, color: CONFIG.TEAMS[p.team].color, life: 0.6 });
    Player.addEnergy(p, CONFIG.ENERGY.ON_RESPAWN); // 재등장 +10⚡
    Sync.warp(p); // STEP 16: 학생 기기도 시작 지역으로 옮겨 가게
  }

  // ---------------- 탄 사건 처리 ----------------
  function findPlayer(id) {
    return state.players.find((p) => p.id === id);
  }

  function handleProjectileEvent(ev) {
    const color = CHARACTERS[ev.charId].accent;
    if (ev.type === 'wall') {
      // local: 벽 불꽃은 학생 기기도 스스로 그리므로 보내지 않음
      addEffect({ kind: 'spark', x: ev.x, y: ev.y, color, life: 0.25, local: true });
      return;
    }
    if (ev.type === 'blocked') {
      onShieldBlock(ev.areaId, ev.x, ev.y, ev.damage);
      return;
    }
    if (ev.type === 'turretHit') { // 새 STEP 3: 상대 터렛을 맞힘
      damageTurret(ev.areaId, ev.damage, ev.x, ev.y, color, findPlayer(ev.ownerId));
      return;
    }
    if (ev.type === 'hit') {
      const target = findPlayer(ev.targetId);
      if (!target) return;
      const owner = findPlayer(ev.ownerId);
      // 궁극기 게이지용: 무엇으로 맞혔는지 (기본 공격 / 터렛 / 엔지니어 드론)
      const src = ev.fromDrone ? 'drone' : ev.fromTurret ? 'turret' : 'basic';
      const applied = applyDamage(target, ev.damage, owner, ev.x, ev.y, color, src);
      // 기본 공격을 맞히면 +3⚡ (터렛 탄은 제외)
      if (applied && owner && !ev.fromTurret) Player.addEnergy(owner, CONFIG.ENERGY.ON_HIT);
      if (applied && owner && owner.isLocal) AudioManager.playSFX('hit'); // STEP 17: 명중
      if (applied && ev.ambush) addEffect({ kind: 'dmg', x: target.x, y: target.y - target.radius - 2.2, text: '기습!', color: CHARACTERS[ev.charId].accent, life: 0.9, pid: target.id });
      // 새 STEP 3: 프로스트 얼음탄 — 맞은 상대가 잠깐 느려짐 (가디언 MAX 보호막 안이면 안 느려짐)
      const chill = !ev.fromTurret && CHARACTERS[ev.charId].attack.chill;
      if (applied && chill && target.alive && !Skills.fortified(target, state.areas)) {
        Player.chill(target, chill.factor, chill.sec);
        if (target.chillFactor === chill.factor) target.chillBy = ev.ownerId; // 궁극기 게이지: 프로스트가 느리게 함
      }
    }
  }

  // 보호막이 공격을 막았을 때: 보호막 물결 + 가디언의 지원 기록
  // 새 STEP 3: 막은 피해만큼 보호막의 "막는 양"이 줄고, 다 쓰면 깨짐
  function onShieldBlock(areaId, x, y, damage) {
    const a = state.areas.find((s) => s.id === areaId);
    const color = a ? CONFIG.TEAMS[a.team].color : '#ffffff';
    addEffect({ kind: 'shieldHit', x, y, color, life: 0.35, big: true, ax: a ? a.x : x, ay: a ? a.y : y });
    const owner = a && findPlayer(a.ownerId);
    if (owner) owner.stats.support++;
    if (!a || !(damage > 0) || !(a.maxHp > 0)) return;
    Ultimate.onShieldBlock(owner, Math.min(damage, a.hp)); // 궁극기 게이지: 가디언이 막아 준 피해
    a.hp = Math.max(0, a.hp - damage);
    if (a.hp <= 0) {
      a.dead = true;
      state.areas = state.areas.filter((o) => !o.dead);
      addEffect({ kind: 'shatter', x: a.x, y: a.y, r: a.r, color, life: 0.7 });
      addEffect({ kind: 'dmg', x: a.x, y: a.y - a.r * 0.4, text: '보호막 깨짐!', color: '#ffffff', life: 1 });
      AudioManager.playSFX('block');
    }
  }

  // 새 STEP 3: 엔지니어 터렛이 맞음 → 체력이 0이면 부서짐
  function damageTurret(areaId, damage, x, y, color, attacker) {
    const a = state.areas.find((s) => s.id === areaId);
    if (!a || a.dead) return;
    a.hp = Math.max(0, a.hp - damage);
    a.hitFlash = 0.15;
    addEffect({ kind: 'spark', x, y, color, life: 0.3, big: true });
    if (a.hp > 0) addEffect({ kind: 'dmg', x: a.x + (Math.random() - 0.5) * 0.4, y: a.y - 1.2, text: '-' + damage, color: '#e3d4ff', life: 0.7 });
    if (attacker && attacker.isLocal) AudioManager.playSFX('hit');
    if (a.hp > 0) return;
    a.dead = true;
    state.areas = state.areas.filter((o) => !o.dead);
    addEffect({ kind: 'debris', x: a.x, y: a.y, color: CONFIG.TEAMS[a.team].color, life: 0.8 });
    addEffect({ kind: 'dmg', x: a.x, y: a.y - 1.4, text: '터렛 부서짐!', color: '#ffffff', life: 1 });
    AudioManager.playSFX('skill-blaster', { vol: 0.6 });
    if (attacker) attacker.stats.support++;
  }

  // 새 STEP 3: 블래스터 폭발에 밀려남
  //   이 기기에서 움직이는 캐릭터(선생님·봇·연습 상대)는 바로, 학생 기기 캐릭터는 그 기기에 알려서 밀어냄
  function knockPlayer(p, dx, dy) {
    if (!p || !p.alive || p.inCapQ) return;
    // 궁극기: 가디언 「절대 수호」 안이면 거의 밀려나지 않음
    const km = Ultimate.knockMult(p, state);
    if (km < 1) { dx *= km; dy *= km; }
    if (p.remote) Sync.hostKnock(state, p, dx, dy);
    else Player.knock(p, dx, dy);
    if (p.homeX !== undefined && !p.kbFrom) p.kbFrom = { x: p.x, y: p.y }; // 연습 상대: 나중에 돌아갈 자리
    addEffect({ kind: 'push', x: p.x, y: p.y, angle: Math.atan2(dy, dx), r: Math.hypot(dx, dy), color: '#ffb3c4', life: 0.45, pid: p.id });
  }

  // ---------------- 특수기 사건 처리 ----------------
  function handleSkillEvent(ev) {
    if (ev.type === 'blast') {
      // 새 STEP 3: 충격파 — LEVEL 이 높을수록 크고 화려하게 (lv)
      addEffect({ kind: 'blast', x: ev.x, y: ev.y, r: ev.r, color: CONFIG.TEAMS[ev.team].color, life: 0.5 + (ev.level || 1) * 0.1, lv: ev.level || 1 });
      AudioManager.playSFX('skill-blaster'); // STEP 17
    } else if (ev.type === 'damage') {
      const target = findPlayer(ev.targetId);
      if (target) applyDamage(target, ev.damage, findPlayer(ev.ownerId), ev.x, ev.y, CHARACTERS[ev.charId].accent, 'skill');
    } else if (ev.type === 'blocked') {
      onShieldBlock(ev.areaId, ev.x, ev.y, ev.damage);
    } else if (ev.type === 'knockback') {
      knockPlayer(findPlayer(ev.targetId), ev.dx, ev.dy);
    } else if (ev.type === 'turretHit') {
      damageTurret(ev.areaId, ev.damage, ev.x, ev.y, CHARACTERS[ev.charId].accent, findPlayer(ev.ownerId));
    } else if (ev.type === 'heal') {
      const target = findPlayer(ev.targetId);
      const owner = findPlayer(ev.ownerId);
      if (!target) return;
      const healed = Player.heal(target, ev.amount);
      if (healed > 0) {
        addEffect({ kind: 'dmg', x: target.x + (Math.random() - 0.5) * 0.6, y: target.y - target.radius - 1.5,
          text: '+' + Math.round(healed), color: '#6dffa8', life: 0.8, pid: target.id });
        // 새 STEP 3: 회복된 친구 몸에서 초록 빛 알갱이가 올라감 (LEVEL 3 첫 회복은 크게)
        addEffect({ kind: 'healPulse', x: target.x, y: target.y, color: '#6dffa8', life: ev.burst ? 0.9 : 0.6, big: !!ev.burst, pid: target.id });
        if (owner) {
          owner.stats.healed += healed;
          Ultimate.onHeal(owner, target, healed); // 궁극기 게이지: 메딕이 친구를 실제로 회복
          // 같은 회복존에서 처음 도움 받은 친구만 "지원 1회"로 셈
          const area = state.areas.find((a) => a.id === ev.areaId);
          if (area && area.helped.indexOf(target.id) === -1 && target.id !== owner.id) {
            area.helped.push(target.id);
            owner.stats.support++;
          }
        }
      }
    }
  }

  // ---------------- 특수기 사용 ----------------
  // 미리보기: 원을 놓을 곳, 반지름, 넓이, 비용, 에너지가 충분한지
  function computeSpecialPreview(p) {
    const aim = Input.getSpecialAim();
    if (!aim || Skills.levelOf(p) < 1) return null; // 수정 STEP 4: 잠긴 스킬은 미리보기 없음
    const t = specialTargetFrom(p, aim);
    return makePreview(p, t);
  }

  function makePreview(p, t) {
    const sp = Skills.spec(p.charId);
    const r = Skills.radiusOf(p);    // 수정 STEP 4: 반지름은 스킬 레벨로 정해짐
    const cost = Skills.costOf(p);
    return {
      type: sp.type,
      x: t.x, y: t.y, r,
      area: circleArea(r),
      cost,
      level: Skills.levelOf(p),
      ok: p.energy >= cost,
      castRange: Skills.castRangeOf(p),
      fromX: p.x, fromY: p.y,
      team: p.team,
    };
  }

  // 입력 → 원의 중심 위치 (최대 거리 안으로 제한)
  function specialTargetFrom(p, aim) {
    const sp = Skills.spec(p.charId);
    if (aim.kind === 'mouse') {
      const w = Renderer.screenToWorld(aim.x, aim.y);
      return Skills.clampTarget(p, w.x, w.y);
    }
    if (aim.kind === 'vector') {
      const range = Skills.castRangeOf(p);
      return Skills.clampTarget(p, p.x + aim.dx * range, p.y + aim.dy * range);
    }
    // 'self' / 'tap'
    if (sp.type === 'blast') {
      // 블래스터: 던질 수 있는 거리 안의 가장 가까운 상대, 없으면 바라보는 방향 6m
      const target = findAutoTarget(p, sp.castRange);
      if (target) return Skills.clampTarget(p, target.x, target.y);
      return Skills.clampTarget(p, p.x + Math.cos(p.facing) * 6, p.y + Math.sin(p.facing) * 6);
    }
    if (sp.type === 'blink') {
      const range = Skills.castRangeOf(p);
      return Skills.clampTarget(p, p.x + Math.cos(p.facing) * range, p.y + Math.sin(p.facing) * range);
    }
    return { x: p.x, y: p.y };
  }

  function tryCastSpecial(p, cmd) {
    // 수정 STEP 4: 스킬은 에너지 터미널 문제를 맞혀 LEVEL 1이 되어야 쓸 수 있음
    if (Skills.levelOf(p) < 1) { showLocked(); return; }
    let aim = cmd;
    if (cmd.kind === 'mouse') aim = Input.getAim() || { kind: 'self' };
    const t = specialTargetFrom(p, aim);
    // STEP 16 학생 기기: 에너지를 확인하고 교사 기기에 부탁 (원은 교사 기기가 만들어 보내 줌)
    if (state.netRole === 'client') {
      const cost = Skills.costOf(p);
      if (!p.alive) return;
      if (p.energy < cost) { showNoEnergy(p, cost); return; }
      p.energy -= cost; // 교사 기기가 처리할 때까지 미리 줄여 보여줌
      if (Skills.spec(p.charId).type !== 'blink') p.lastSpecial = { name: Skills.spec(p.charId).name, r: Skills.radiusOf(p) };
      specialSound(p, Skills.radiusOf(p)); // STEP 17: 교사 기기 답을 기다리지 않고 바로
      Sync.sendCommand({ k: 's', x: Math.round(t.x * 100) / 100, y: Math.round(t.y * 100) / 100 }, -cost);
      return;
    }
    const res = castSpecialAt(p, t.x, t.y);
    if (!res.ok && res.reason === 'energy') showNoEnergy(p, res.cost);
  }

  function showNoEnergy(p, cost) {
    UI.flashNoEnergy();
    UI.showToast('⚡ 에너지가 부족해요', Skills.spec(p.charId).name + ' 한 번에 ' + cost + '⚡ 필요', '#ff9db0');
  }

  function showLocked() {
    UI.showToast('🔒 스킬 잠금', '에너지 터미널에서 수학 문제를 맞히면 LEVEL 1 해금!', '#ffd84d');
  }

  // 특수기를 실제로 씀 (혼자·교사 기기. 학생 명령도 여기로)
  function castSpecialAt(p, tx, ty) {
    const res = Skills.cast(p, tx, ty, state);
    if (!res.ok) return res;
    // 새 STEP 2: 부쉬 안에서 스킬을 쓰면 잠시 드러남
    // 새 STEP 3: 스피더 순간이동은 공격이 아니므로 드러나지 않음 (부쉬로 숨어 들어가는 기습)
    if (!res.to) Bushes.revealAttack(p, state.time);
    const color = CONFIG.TEAMS[p.team].color;
    const accent = CHARACTERS[p.charId].accent;
    // 게임 상황 문제용: 방금 쓴 특수기와 반지름 기억 (순간이동은 제외)
    if (res.area) p.lastSpecial = { name: Skills.spec(p.charId).name, r: res.area.r };
    if (res.to) {
      // 새 STEP 3: 잔상 — 출발점에서 도착점까지 빛 줄기와 흐린 모습 (숨은 스피더면 안 보임: pid)
      addEffect({ kind: 'blinkTrail', x: res.from.x, y: res.from.y, x2: res.to.x, y2: res.to.y, color: accent,
        life: 0.55, lv: res.level || 1, pid: p.id });
      addEffect({ kind: 'spawn', x: res.to.x, y: res.to.y, color, life: 0.4, pid: p.id });
      Sync.warp(p); // STEP 16: 순간이동한 학생 기기도 따라 옮김
    } else {
      addEffect({ kind: 'spawn', x: res.area.x, y: res.area.y, color, life: 0.4, radius: res.area.r - 1.2 });
      // 새 STEP 3: 한 명당 1개 — 예전 보호막·터렛이 사라지는 자리
      if (res.replaced) addEffect({ kind: 'spark', x: res.replaced.x, y: res.replaced.y, color: accent, life: 0.4, big: true });
    }
    if (p.isLocal) specialSound(p, res.area ? res.area.r : 0); // STEP 17
    return res;
  }

  // ---------------- 궁극기 ----------------
  // ultimate.js 가 게임에 부탁하는 일 (피해·회복·밀어내기·효과는 게임의 규칙 그대로)
  const ultHooks = {
    damage: (t, dmg, owner, x, y, color, src) => applyDamage(t, dmg, owner, x, y, color, src),
    blocked: (area, x, y, dmg) => onShieldBlock(area.id, x, y, dmg),
    turretHit: (area, dmg, x, y, color, owner) => damageTurret(area.id, dmg, x, y, color, owner),
    knock: (t, dx, dy) => knockPlayer(t, dx, dy),
    heal: (t, amount, owner, quiet) => healByUlt(t, amount, owner, quiet),
    effect: (e) => addEffect(e),
    projectile: (b) => state.projectiles.push(b),
    reveal: (p) => Bushes.revealAttack(p, state.time),
  };

  // 메딕 궁극기 회복 (바로 + 지속) — 회복 숫자와 초록 빛
  function healByUlt(t, amount, owner, quiet) {
    const healed = Player.heal(t, amount);
    if (!(healed > 0)) return 0;
    addEffect({ kind: 'dmg', x: t.x + (Math.random() - 0.5) * 0.6, y: t.y - t.radius - 1.5,
      text: '+' + Math.round(healed), color: '#6dffa8', life: quiet ? 0.6 : 1, pid: t.id });
    if (!quiet) addEffect({ kind: 'healPulse', x: t.x, y: t.y, color: '#6dffa8', life: 0.9, big: true, pid: t.id });
    if (owner) owner.stats.healed += healed;
    return healed;
  }

  // 궁극기 방향: PC 마우스 → 그 방향 / 태블릿 → 가까운 상대(14m 안), 없으면 바라보는 방향
  function ultAngle(p, cmd) {
    if (cmd && cmd.kind === 'vector' && Math.hypot(cmd.dx, cmd.dy) > 0.01) return Math.atan2(cmd.dy, cmd.dx);
    if (cmd && cmd.kind === 'mouse') {
      if (cmd.x !== undefined) {
        const w = Renderer.screenToWorld(cmd.x, cmd.y);
        if (Math.hypot(w.x - p.x, w.y - p.y) > 0.3) return Math.atan2(w.y - p.y, w.x - p.x);
      }
      if (state.aim) return state.aim.angle;
    }
    const a = getAimAngle(p);
    if (a !== null && a !== undefined) return a;
    const t = findAutoTarget(p, 14);
    return t ? Math.atan2(t.y - p.y, t.x - p.x) : p.facing;
  }

  // 궁극기 미리보기: 블래스터는 캐논이 날아갈 띠(벽에서 멈춤), 나머지는 효과 범위 원
  function computeUltPreview(p) {
    const aim = Input.getUltAim();
    if (!aim || !Ultimate.unlocked(p)) return null;
    const st = Ultimate.statsOf(p);
    const angle = aim.kind === 'cancel' ? p.facing : ultAngle(p, aim.kind === 'self' ? { kind: 'tap' } : aim);
    const pv = { charId: p.charId, team: p.team, x: p.x, y: p.y, angle, ready: Ultimate.canUse(p) === 'ok',
      cancel: aim.kind === 'cancel', name: st.name, r: 0, range: 0, width: 0, endDist: 0 };
    if (p.charId === 'blaster') {
      pv.range = st.range;
      pv.width = st.width;
      const x1 = p.x + Math.cos(angle) * st.range, y1 = p.y + Math.sin(angle) * st.range;
      const t = Collision.segmentHitsSolid(p.x, p.y, x1, y1, Math.min(0.3, st.width * 0.4));
      pv.endDist = t === null ? st.range : Math.max(0.5, t * st.range);
    } else if (p.charId === 'engineer') pv.r = st.range;
    else if (p.charId === 'speeder') pv.r = p.radius + 0.9;
    else pv.r = st.r || 3;
    return pv;
  }

  const ULT_WHY = {
    locked: ['🔒 궁극기 잠금', '에너지 터미널 문제를 2번 맞히면 LEVEL 2 · 궁극기 해금!'],
    charging: ['궁극기 충전 중', '게이지가 100%가 되면 쓸 수 있어요'],
    active: ['궁극기 사용 중', '효과가 끝나면 다시 충전돼요'],
  };
  function showUltWhy(p, why) {
    const w = ULT_WHY[why];
    if (!w) return;
    const line = why === 'charging' ? w[1] + ' (지금 ' + Math.floor(Ultimate.gauge(p)) + '%)' : w[1];
    UI.showToast(w[0], line, why === 'locked' ? '#ffd84d' : '#c49bff');
    UI.flashUlt();
  }

  // 내 기기에서 궁극기 버튼을 누름
  function tryUseUlt(p, cmd) {
    const why = Ultimate.canUse(p);
    if (why !== 'ok') { showUltWhy(p, why); return; }
    const angle = ultAngle(p, cmd);
    p.facing = angle;
    if (state.netRole === 'client') {
      // 학생 기기: 교사 기기에 부탁 (게이지는 미리 0%로 보여주고, 스피더는 바로 빨라짐)
      p.ult = 0;
      p.ultT = p.charId === 'speeder' ? Ultimate.statsOf(p).duration : 0.6;
      Sync.sendCommand({ k: 'u', a: Math.round(angle * 1000) / 1000 });
      ultFeedback(p);
      return;
    }
    useUlt(p, angle);
  }

  // 궁극기를 실제로 씀 (혼자·교사 기기. 학생 명령도 여기로)
  function useUlt(p, angle) {
    const res = Ultimate.use(p, angle, state, ultHooks);
    if (!res.ok) return res;
    if (p.isLocal) ultFeedback(p);
    else ultCastHeard({ x: p.x, y: p.y, text: p.charId, pid: p.id });
    return res;
  }

  // 내가 쓴 궁극기: 전용 소리 + 짧은 화면 가장자리 빛 (화면을 가리지 않음, 0.45초)
  function ultFeedback(p) {
    AudioManager.playSFX('ultimate-' + p.charId);
    UI.ultFlash(CHARACTERS[p.charId].accent);
  }
  // 다른 사람의 궁극기: 내 화면 근처면 소리 (멀면 작게, 아주 멀면 안 들림 — 숨은 상대 위치는 알려 주지 않음)
  function ultCastHeard(fx) {
    const me = state.localPlayer;
    const cid = fx.text;
    if (!CHARACTERS[cid]) return;
    if (me && fx.pid === me.id) return;
    const caster = fx.pid && findPlayer(fx.pid);
    if (caster && Bushes.hiddenOnScreen(caster, state)) return; // 부쉬에 숨은 상대 위치를 소리로 알려 주지 않음
    const d = me ? Math.hypot(fx.x - me.x, fx.y - me.y) : 0;
    if (d > 26) return;
    AudioManager.playSFX('ultimate-' + cid, { vol: d < 8 ? 0.8 : 0.45 });
  }

  // ---------------- 수학 터미널 (STEP 11) ----------------
  // 내 캐릭터가 쓸 수 있는 가장 가까운 터미널 (사용 거리 2m 안, 우리 팀 쪽)
  function findUsableTerminal(p) {
    let best = null, bestD = GameMap.TERMINAL_USE_RANGE + p.radius;
    GameMap.terminals.forEach((t) => {
      // 새 STEP 2: side 가 없는 가운데 공용 터미널은 두 팀 모두 사용
      if (CONFIG.MISSION.OWN_SIDE_ONLY && t.side && t.side !== p.team) return;
      const d = Math.hypot(t.x - p.x, t.y - p.y);
      if (d <= bestD) { best = t; bestD = d; }
    });
    return best;
  }

  // 지금 미션을 열 수 있는지 (이유도 함께)
  function missionStatus(p) {
    if (!p || !p.alive || p.inMission || p.inCapQ || state.phase === 'ended') return 'no';
    if (!state.nearTerminal) return 'far';
    if (p.missionsUsed >= state.settings.missionLimit) return 'done';
    if (p.missionCooldown > 0) return 'cooldown';
    return 'ready';
  }

  function openMission() {
    const me = state.localPlayer;
    if (missionStatus(me) !== 'ready') return;
    // 문제은행의 문제를 복사해서 사용 (틀린 횟수 등을 적어도 원본은 그대로)
    // 수정 STEP 4: 아직 스킬을 키울 수 있으면 60%는 내 캐릭터 스킬 범위와 연결된 문제
    let q = me.pendingQuestion;
    if (!q) {
      const canGrow = state.settings.specialsEnabled && Skills.levelOf(me) < SKILL_LEVEL_MAX;
      const sq = canGrow && Math.random() < 0.6 ? Questions.skillQuestion(me, state) : null;
      q = { ...(sq || Questions.pick(me, state)) };
    }
    me.pendingQuestion = q;
    me.inMission = true;
    Input.setEnabled(false); // 움직이기·쏘기 멈춤
    GameState.change(STATES.MATH_MISSION);
    const lv = Skills.levelOf(me);
    Mission.open(q, {
      used: me.missionsUsed, limit: state.settings.missionLimit,
      goal: missionGoalText(me),
      correctText: missionCorrectText(me),
      // 수정 STEP 4: 터미널 문제 창은 내 캐릭터 반대쪽 옆에 → 주변 상황이 보이게
      dock: missionDock(me),
      level: lv,
      getBoost: () => (boostMode(me) ? boostChoices(me.team) : null), // 수정 STEP 5
    }, {
      onFinish: (result) => onMissionFinish(me, result),
      onClose: () => endMission(me),
    });
  }

  // 새 STEP 2: 추적 카메라에서는 내 캐릭터가 화면 어디에 있는지로 정함
  //   (맵 끝이라 캐릭터가 화면 한쪽에 있으면 반대쪽, 가운데면 상대가 오는 쪽을 가리지 않게 우리 진영 쪽)
  function missionDock(me) {
    const s = Renderer.worldToScreen(me.x, me.y);
    const w = Renderer.view.w;
    if (Math.abs(s.x - w / 2) > w * 0.08) return s.x < w / 2 ? 'right' : 'left';
    return me.team === 'LUNAR' ? 'right' : 'left';
  }

  // 수정 STEP 4: 문제 창 위쪽 안내 / 정답일 때 보여줄 글
  function missionGoalText(me) {
    const lv = Skills.levelOf(me);
    if (boostMode(me)) return '정답이면 TEAM BOOST! 우리 팀 전체에 도움 · 무적 아님! 공격을 조심하세요';
    // 궁극기: LEVEL 1 고유 스킬 → LEVEL 2 궁극기 해금 → LEVEL 3 MAX 스킬·궁극기 강화
    const what = lv === 0 ? 'LEVEL 1 · 고유 스킬 해금' : lv + 1 === ULT_UNLOCK_LEVEL ? 'LEVEL 2 · 궁극기 해금'
      : lv + 1 === SKILL_LEVEL_MAX ? 'LEVEL 3 MAX · 스킬+궁극기 강화' : 'LEVEL ' + (lv + 1);
    return '정답이면 ' + what + ' · 무적 아님! 공격을 조심하세요';
  }
  function missionCorrectText(me) {
    const lv = Skills.levelOf(me);
    if (boostMode(me)) return '정답! TEAM BOOST!';
    return lv + 1 === SKILL_LEVEL_MAX ? '정답! LEVEL 3 MAX!' : lv + 1 === ULT_UNLOCK_LEVEL ? '정답! 궁극기 해금!' : '정답! LEVEL ' + (lv + 1) + (lv === 0 ? ' 해금' : '');
  }

  function endMission(me) {
    me.inMission = false;
    if (state.phase !== 'ended') {
      Input.setEnabled(true);
      GameState.change(STATES.PLAYING);
    }
  }

  function onMissionFinish(me, result) {
    endMission(me);
    me.pendingQuestion = null;
    const wasBoost = result.correct && boostMode(me);
    // 수정 STEP 5: TEAM BOOST 뒤에는 개인 쿨타임 30초 (계속 문제만 풀어 팀 버프를 쌓지 못하게)
    me.missionCooldown = wasBoost ? Math.max(state.missionCooldownSec, CONFIG.TEAM_BOOST.COOLDOWN_SEC) : state.missionCooldownSec;
    me.usedQuestionIds.push(result.question.id); // 같은 문제는 다시 내지 않음
    const E = CONFIG.ENERGY;
    const before = me.energy;
    const out = applyMissionResult(me, result);
    // STEP 16 학생 기기: 에너지·레벨은 교사 기기가 정하도록 결과를 보냄 (내 기기에는 미리 보여줌)
    if (state.netRole === 'client') {
      const q = result.question;
      Sync.sendCommand({ k: 'm', ok: result.correct ? 1 : 0, h: result.hintShown ? 1 : 0, rw: result.reward || '',
        wc: result.wrongCount | 0, ts: Math.round(result.timeSec * 10) / 10,
        qi: String(q.id), qt: q.type || 0, qc: q.category || '', qd: q.difficulty || 0,
        qx: Questions.plainText(q).slice(0, 200), qa: Questions.answerText(q) }, out.energy);
    }
    const gained = me.energy - before;
    const energyText = '⚡ +' + out.energy + (gained < out.energy ? ' (최대 ' + E.MAX + ')' : '') +
      (result.correct ? ' · ♥ 가득 · 빨리 달리기' : ''); // 새 STEP 4
    if (result.correct && out.levelUp) {
      const sp = Skills.spec(me.charId);
      const ul = Ultimate.def(me.charId);
      // 궁극기: LEVEL 2 = 궁극기 해금, LEVEL 3 MAX = 스킬과 궁극기 모두 강화
      const title = out.levelUp === SKILL_LEVEL_MAX ? 'LEVEL 3 MAX! ' + sp.name + ' · ' + ul.name + ' 강화'
        : out.levelUp === ULT_UNLOCK_LEVEL ? 'LEVEL 2 · 궁극기 「' + ul.name + '」 해금!'
        : out.levelUp === 1 ? 'LEVEL 1 · ' + sp.name + ' 해금!' : 'LEVEL ' + out.levelUp + ' · ' + sp.name + ' 강화!';
      const line = out.levelUp >= ULT_UNLOCK_LEVEL
        ? (out.levelUp === ULT_UNLOCK_LEVEL ? '역할에 맞게 활약하면 게이지가 차요 → 100%면 Q 키(누르고 조준 → 떼면 사용)/궁극기 버튼' : '궁극기: ' + Ultimate.describe(me.charId, out.levelUp))
        : Skills.describe(me.charId, out.levelUp);
      UI.showToast(title + ' ' + energyText, line, out.levelUp === SKILL_LEVEL_MAX ? '#ffd84d' : '#4ff0c0', 4000);
    } else if (wasBoost && (out.boostId || state.netRole === 'client')) {
      // TEAM BOOST 알림은 onTeamBoost 가 (모든 팀원 기기에서) 보여줌
    } else if (result.correct) {
      UI.showToast((result.hintShown ? '힌트로 해결! ' : '미션 성공! ') + energyText, result.question.explanation, '#4ff0c0', 3000);
      addEffect({ kind: 'spawn', x: me.x, y: me.y, color: '#ffd84d', life: 0.6, pid: me.id });
    } else {
      UI.showToast('다음엔 맞힐 수 있어요! ' + energyText, result.question.explanation, '#9ee8ff', 3500);
    }
  }

  /**
   * 미션 결과 기록 + 보상 (혼자·교사 기기, 그리고 교사 기기가 학생 결과를 받을 때)
   *   정답 ⚡+20 (힌트 후 +12) + 수정 STEP 4: 스킬 LEVEL +1 (최대 3) / 풀이를 봄 ⚡+5
   *   수정 STEP 5: LEVEL 3 MAX 뒤(또는 특수기 사용 안 함)의 정답은 TEAM BOOST
   * @returns { energy, levelUp, boostId } levelUp: 이번에 오른 레벨 (없으면 0), boostId: 준 TEAM BOOST
   */
  function applyMissionResult(me, result) {
    me.missionsUsed++;
    const entry = logQuestion(me, result, 'terminal');
    const E = CONFIG.ENERGY;
    const energy = !result.correct ? E.MISSION_REVEALED
      : result.hintShown ? E.MISSION_CORRECT_AFTER_HINT : E.MISSION_CORRECT;
    Player.addEnergy(me, energy); // 학생 기기에서는 미리 보여주기 (곧 교사 기기 값으로 바뀜)
    // 새 STEP 4: 정답이면 체력 가득 + 잠깐 빨리 달리기 (터미널에 다녀온 시간이 손해가 되지 않게)
    if (result.correct && me.alive) {
      if (CONFIG.MISSION.CORRECT_FULL_HEAL) Player.heal(me, me.maxHp);
      me.dashTimer = Math.max(me.dashTimer || 0, CONFIG.MISSION.CORRECT_SPRINT_SEC);
    }
    let levelUp = 0, boostId = null;
    if (result.correct && !boostMode(me)) {
      me.skillLevel = Skills.levelOf(me) + 1;
      levelUp = me.skillLevel;
      onLevelUp(me, levelUp);
    } else if (result.correct && state.netRole !== 'client') {
      // 수정 STEP 5: MAX 뒤 정답 → TEAM BOOST (혼자·교사 기기에서만 실제로 줌. 학생 기기는 교사 기기 소식을 기다림)
      boostId = applyTeamBoost(me, result.reward);
    } else if (result.correct) {
      boostId = result.reward || null;
    }
    entry.reward = boostId;
    entry.energy = energy;
    entry.levelUp = levelUp;
    // 교사 기기에서 학생의 미션 성공을 보여줌 (학생 기기에는 효과로 전해짐)
    if (!me.isLocal && result.correct && !levelUp && !boostId) {
      addEffect({ kind: 'spawn', x: me.x, y: me.y, color: '#ffd84d', life: 0.6, pid: me.id });
    }
    return { energy, levelUp, boostId };
  }

  // ---------------- 수정 STEP 5: TEAM BOOST ----------------
  // 스킬 MAX(또는 특수기 사용 안 함)이면 터미널 정답이 TEAM BOOST가 됨
  function boostMode(p) {
    return !state.settings.specialsEnabled || Skills.levelOf(p) >= SKILL_LEVEL_MAX;
  }
  function tickBoostCd(dt) {
    ['SOLAR', 'LUNAR'].forEach((t) => {
      const cd = state.teamBoostCd[t];
      Object.keys(cd).forEach((k) => { if (cd[k] > 0) cd[k] = Math.max(0, cd[k] - dt); });
    });
  }
  function boostTypes() {
    return CONFIG.TEAM_BOOST.TYPES.filter((b) => b.id !== 'charge' || state.settings.specialsEnabled);
  }
  // 지금 우리 팀에 가장 필요한 것: 체력이 줄었으면(팀 평균 80% 미만이거나 누군가 60% 미만) HEAL,
  // 스킬 에너지가 모자라면 CHARGE, 아니면 SPEED
  function recommendBoost(team) {
    const cd = state.teamBoostCd[team];
    const mates = state.players.filter((m) => m.team === team && m.alive);
    const hps = mates.map((m) => m.hp / m.maxHp);
    const hp = hps.length ? hps.reduce((s, v) => s + v, 0) / hps.length : 1;
    const low = hps.length ? Math.min.apply(null, hps) : 1;
    const en = mates.length ? mates.reduce((s, m) => s + m.energy, 0) / mates.length : 60;
    const order = [];
    if (hp < 0.8 || low < 0.6) order.push('heal');
    if (state.settings.specialsEnabled && en < 25) order.push('charge');
    order.push('speed', 'heal', 'ammo', 'charge');
    const ok = boostTypes().map((b) => b.id);
    return order.find((id) => ok.indexOf(id) !== -1 && !(cd[id] > 0)) || null;
  }
  // 문제 창에 보여줄 고르기 목록 { options: [{ id, label, desc, disabled, wait }], auto }
  function boostChoices(team) {
    const cd = state.teamBoostCd[team];
    const auto = recommendBoost(team);
    if (!auto) return null;
    return {
      auto,
      options: boostTypes().map((b) => ({ id: b.id, label: b.label, desc: b.desc, disabled: cd[b.id] > 0, wait: Math.ceil(cd[b.id]) })),
    };
  }

  /**
   * TEAM BOOST 주기 (혼자·교사 기기) — 살아 있는 우리 팀 모두에게
   * @returns 실제로 준 종류 (못 주면 null)
   */
  function applyTeamBoost(p, id) {
    const TB = CONFIG.TEAM_BOOST;
    // 교사 기기 확인: 학생 기기에서 온 결과가 개인 쿨타임(30초)을 지키지 않았으면 TEAM BOOST 없이 에너지만
    // (이 기기에서 조작하는 사람은 [수학 미션] 버튼의 쿨타임이 이미 막아 줌)
    if (p.remote && p.lastBoostAt !== undefined && state.time - p.lastBoostAt < TB.COOLDOWN_SEC - 3) return null;
    const cd = state.teamBoostCd[p.team];
    if (!boostTypes().some((b) => b.id === id) || cd[id] > 0) id = recommendBoost(p.team); // 고를 수 없는 것이면 추천으로
    if (!id) return null;
    cd[id] = TB.SAME_TYPE_SEC; // 같은 종류는 팀 전체에서 잠시 쉼 (중첩 방지)
    p.lastBoostAt = state.time;
    const color = CONFIG.TEAMS[p.team].color;
    const mates = state.players.filter((m) => m.team === p.team && m.alive);
    mates.forEach((m) => {
      let text = '';
      if (id === 'heal') { const h = Player.heal(m, Math.round(m.maxHp * TB.HEAL_PCT)); text = '+' + Math.round(h); }
      else if (id === 'ammo') { m.ammo = Math.min(ammoMaxOf(m.charId), m.ammo + TB.AMMO); text = '탄약 +1'; }
      else if (id === 'speed') { m.boostTimer = TB.SPEED_SEC; text = '빠르게!'; } // 이미 켜져 있어도 겹치지 않고 시간만 새로
      else if (id === 'charge') { Player.addEnergy(m, TB.CHARGE); text = '⚡+' + TB.CHARGE; }
      addEffect({ kind: 'spawn', x: m.x, y: m.y, color: '#ffd84d', life: 0.7, pid: m.id });
      addEffect({ kind: 'dmg', x: m.x, y: m.y - m.radius - 1.4, text, color: '#ffd84d', life: 1.1, pid: m.id });
    });
    p.stats.boosts = (p.stats.boosts || 0) + 1;
    p.stats.support += Math.max(0, mates.length - 1);
    addEffect({ kind: 'spawn', x: p.x, y: p.y, color, life: 1, radius: 3, pid: p.id });
    // 모든 기기에 알림 (학생 기기는 자기 탄약을 스스로 채움)
    if (state.netRole === 'host') Sync.hostEvent(state, { k: 'tb', t: p.team, id, n: p.nick });
    onTeamBoost(p.team, id, p.nick);
    return id;
  }

  // TEAM BOOST 소식 (모든 기기): 우리 팀이면 작은 알림 + 학생 기기는 내 탄약 채우기
  function onTeamBoost(team, id, nick) {
    const b = CONFIG.TEAM_BOOST.TYPES.find((x) => x.id === id);
    if (!b) return;
    const me = state.localPlayer;
    if (me && me.team !== team) return; // 상대 팀 화면은 가리지 않음
    UI.showTeamBoost(b.label, b.desc, nick, CONFIG.TEAMS[team].color);
    // TEAM BOOST! 팀 전체 소리 + 종류별 작은 소리 (HEAL · AMMO · SPEED · CHARGE)
    AudioManager.playSFX('team-boost');
    setTimeout(() => AudioManager.playSFX('boost-' + id, { vol: 0.8 }), 280);
    if (state.netRole === 'client' && me && me.alive && id === 'ammo') {
      me.ammo = Math.min(ammoMaxOf(me.charId), me.ammo + CONFIG.TEAM_BOOST.AMMO);
    }
  }

  // 수정 STEP 4: 레벨업 연출 — 새 효과 범위만큼 큰 고리 + "LEVEL UP!" / "SKILL MAX!"
  function onLevelUp(p, level) {
    const max = level === SKILL_LEVEL_MAX;
    if (p.isLocal) AudioManager.playSFX(max ? 'skill-max' : 'level-up');
    if (state.netRole === 'client') return; // 학생 기기: 연출은 교사 기기가 보내 줌 (두 번 그려지지 않게)
    const color = max ? '#ffd84d' : CHARACTERS[p.charId].accent;
    const r = Skills.stats(p.charId, level).r;
    addEffect({ kind: 'spawn', x: p.x, y: p.y, color, life: max ? 1.2 : 0.8, radius: r, pid: p.id });
    addEffect({ kind: 'levelUp', x: p.x, y: p.y, color, life: 1, gold: max, pid: p.id }); // 새 STEP 3: 빛 기둥
    if (max) addEffect({ kind: 'blast', x: p.x, y: p.y, r: Math.min(r, 4), color, life: 0.6, gold: true, pid: p.id });
    addEffect({ kind: 'dmg', x: p.x, y: p.y - p.radius - 1.6, pid: p.id,
      text: max ? 'LEVEL 3 MAX!' : level === 1 ? '스킬 해금!' : level === ULT_UNLOCK_LEVEL ? '궁극기 해금!' : 'LEVEL UP!',
      color, life: max ? 1.8 : 1.3 });
  }

  function setupMissionControls() {
    document.getElementById('btn-mission').addEventListener('click', openMission);
    document.getElementById('btn-capture').addEventListener('click', openCapture); // 수정 STEP 2
    window.addEventListener('keydown', (e) => {
      if (isTyping(e)) return;
      // F 키: 점령지역에서 준비가 끝났으면 점령 문제, 터미널 옆이면 수학 미션
      if (e.code === 'KeyF' && !e.repeat && !openCapture()) openMission();
    });
  }

  // 테스트용 (혼자 연습에서만): G 에너지 가득, L 스킬 레벨 올리기
  // (수정 STEP 4: 반지름 고르기 버튼·R 키는 없어짐 — 반지름은 스킬 레벨로 정해짐)
  function setupSpecialControls() {
    window.addEventListener('keydown', (e) => {
      if (isTyping(e) || !state.localPlayer) return;
      if (e.code === 'KeyG') fillEnergy();
      if (e.code === 'KeyL') levelTest();
    });
    document.getElementById('btn-energy-test').addEventListener('click', fillEnergy);
    document.getElementById('btn-level-test').addEventListener('click', levelTest);
    function fillEnergy() {
      if (!testToolsOn()) return;
      state.localPlayer.energy = CONFIG.ENERGY.MAX;
      if (Ultimate.unlocked(state.localPlayer)) state.localPlayer.ult = CONFIG.ULTIMATE.MAX; // 궁극기 게이지도 가득 (시험용)
    }
    function levelTest() {
      if (!testToolsOn()) return;
      const me = state.localPlayer;
      me.skillLevel = (Skills.levelOf(me) + 1) % (SKILL_LEVEL_MAX + 1); // 0 → 1 → 2 → 3 → 0
      if (me.skillLevel) onLevelUp(me, me.skillLevel);
    }
  }

  /**
   * 피해 처리 (나중에 특수기 폭발 등에서도 이 함수를 사용)
   * STEP 16 멀티플레이: 이 함수 결과를 네트워크로 알립니다.
   */
  function applyDamage(target, damage, owner, hx, hy, color, src) {
    if (!target.alive) return false;
    // 수정 STEP 2: 점령 문제를 푸는 동안은 무적 (탄은 이미 지나가므로 여기에 오는 일은 거의 없음)
    if (target.inCapQ) return false;
    Bushes.revealHit(target, state.time); // 새 STEP 2: 부쉬 안에서 맞으면 잠시 드러남
    // 수정 STEP 4: 에너지 터미널 문제를 푸는 중에도 피해는 그대로 (무적 없음 — 팀원이 지켜 줘야 함)
    // 재등장 보호 중이면 막아냄
    if (target.protect > 0) {
      addEffect({ kind: 'spark', x: hx, y: hy, color: '#ffffff', life: 0.25 });
      addEffect({ kind: 'dmg', x: target.x + (Math.random() - 0.5) * 0.6, y: target.y - target.radius - 1.5,
        text: '보호', color: '#9ee8ff', life: 0.6 });
      return false;
    }
    // 궁극기: 가디언 「절대 수호」 안의 우리 팀은 받는 피해가 크게 줄어듦 (무적은 아님)
    const um = Ultimate.damageMult(target, state);
    if (um < 1) {
      damage = Math.max(1, Math.round(damage * um));
      addEffect({ kind: 'shieldHit', x: hx, y: hy, color: '#ffd84d', life: 0.3, ax: target.x, ay: target.y });
    }
    // STEP 13: 미션 보너스 개인 보호막이 먼저 피해를 막음
    if (target.shieldTimer > 0 && target.shieldHp > 0) {
      const absorbed = Math.min(damage, target.shieldHp);
      target.shieldHp -= absorbed;
      damage -= absorbed;
      if (target.shieldHp <= 0) target.shieldTimer = 0;
      if (damage <= 0) {
        addEffect({ kind: 'spark', x: hx, y: hy, color: '#9ee8ff', life: 0.3, big: true });
        addEffect({ kind: 'dmg', x: target.x + (Math.random() - 0.5) * 0.6, y: target.y - target.radius - 1.5,
          text: '막음 ' + absorbed, color: '#9ee8ff', life: 0.7 });
        if (owner) owner.stats.hits++;
        return true;
      }
    }
    addEffect({ kind: 'spark', x: hx, y: hy, color, life: 0.3, big: true });
    target.hitFlash = 0.15; // 맞은 캐릭터가 잠깐 하얗게 반짝임
    addEffect({ kind: 'dmg', x: target.x + (Math.random() - 0.5) * 0.6, y: target.y - target.radius - 1.5,
      text: '-' + damage, color: src === 'ult' ? '#ffd84d' : '#ffffff', life: src === 'ult' ? 1.1 : 0.8 });

    if (owner) {
      owner.stats.hits++;
      owner.stats.damage += Math.min(damage, target.hp);
    }
    const hpBefore = target.hp;
    const knockedOut = Player.takeDamage(target, damage, state.settings.respawnSeconds);
    // 궁극기 게이지: 실제로 들어간 피해만 (블래스터 준 피해 · 가디언 받은 피해 · 스피더 명중 · 엔지니어 터렛)
    Ultimate.onDamage(owner, target, hpBefore - target.hp, src || null, state.time);
    if (knockedOut) {
      if (owner) owner.stats.knockouts++;
      Ultimate.onKnockout(target, state.players, state.time); // 스피더: 함께 쓰러뜨림
      onKnockout(target);
    }
    return true;
  }

  // ---------------- 짧은 효과 ----------------
  function addEffect(e) {
    e.age = 0;
    state.effects.push(e);
    if (state.effects.length > 80) state.effects.shift(); // 너무 많이 쌓이지 않게 (새 STEP 3: 스킬 효과가 늘어 60 → 80)
  }

  function updateEffects(dt) {
    state.effects.forEach((e) => { e.age += dt; });
    state.effects = state.effects.filter((e) => e.age < e.life);
    state.players.forEach((p) => {
      if (p.hitFlash > 0) p.hitFlash = Math.max(0, p.hitFlash - dt);
    });
    state.areas.forEach((a) => { if (a.hitFlash > 0) a.hitFlash = Math.max(0, a.hitFlash - dt); }); // 새 STEP 3: 터렛·보호막
  }

  // ---------------- STEP 21: 빈자리 봇 ----------------
  // 팀 인원을 맞추려고 넣은 봇이 가만히 서 있으면 실제로는 인원이 적은 것과 같고 상대의 과녁이 됩니다.
  // 그래서 에너지 존으로 가서 자리를 지키고, 사거리 안의 상대를 조금 느리고 부정확하게 쏩니다.
  // (학생보다 약하게: 반응이 늦고 조준이 흔들림, 특수기·수학 미션은 쓰지 않음)
  function isFillBot(p) {
    return p.kind === 'bot' && !p.remote && p.homeX === undefined;
  }

  function updateBots(dt) {
    if (state.netRole === 'client') return;
    state.players.forEach((p) => {
      if (!isFillBot(p) || !p.alive) return;
      const ai = p.ai || (p.ai = { target: null, retarget: 0, fireWait: 1 + Math.random(), side: 0, sideT: 0 });
      ai.retarget -= dt;
      ai.fireWait -= dt;
      // 새 STEP 4: 봇도 학생처럼 가끔 터미널에 다녀옴 (20초쯤 머묾, 보상은 없음)
      //   존에만 붙어 있으면 문제를 풀러 다녀오는 학생보다 강해짐 — 시험 경기 8판 모두 봇이 있는 팀이 이겼음
      if (ai.breakIn === undefined) ai.breakIn = 20 + Math.random() * 20;
      if (ai.mode !== 'break') {
        ai.breakIn -= dt;
        if (ai.breakIn <= 0) {
          const ts = GameMap.terminals.filter((tm) => !tm.side || tm.side === p.team)
            .sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
          const tm = ts[0];
          ai.mode = 'break';
          ai.breakLeft = 16 + Math.random() * 8;
          ai.target = { x: tm.x + (p.team === 'SOLAR' ? -1.5 : 1.5), y: tm.y + (tm.y < GameMap.height / 2 ? 1.3 : -1.3) };
          ai.retarget = 1e9; ai.path = null; ai.lastD = undefined; ai.stuckN = 0;
        }
      } else {
        if (Math.hypot(ai.target.x - p.x, ai.target.y - p.y) < 1.5) ai.breakLeft -= dt;
        if (ai.breakLeft <= 0) { ai.mode = null; ai.breakIn = 30 + Math.random() * 25; ai.retarget = 0; }
      }
      // 목표 존 고르기 (몇 초마다 다시). 수정 STEP 6: 봇은 점령 문제를 못 풀므로 도움이 되는 곳부터
      //   1) 팀원이 문제를 맞혀 활성화한 존 → 게이지 채우기 돕기  2) 상대가 들어온 우리 존 → 막기
      //   3) 우리 것이 아닌 존 → 상대 점령 막기
      if (!ai.target || ai.retarget <= 0) {
        const zs = state.zones.filter((z) => !z.disabled);
        const foe = p.team === 'SOLAR' ? 'LUNAR' : 'SOLAR';
        const help = zs.filter((z) => z.active[p.team] && z.owner !== p.team);
        const defend = zs.filter((z) => z.owner === p.team && z.counts[foe] > 0);
        const open = zs.filter((z) => z.owner !== p.team);
        const list = help.length ? help : defend.length ? defend : open.length ? open : zs;
        list.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
        const z = list[Math.random() < 0.75 ? 0 : Math.floor(Math.random() * list.length)];
        const ang = Math.random() * Math.PI * 2, rr = Math.random() * z.r * 0.55;
        ai.target = { x: z.x + Math.cos(ang) * rr, y: z.y + Math.sin(ang) * rr };
        ai.retarget = 4 + Math.random() * 4;
        ai.lastD = undefined; ai.stuckN = 0;
        ai.path = null;
      }
      // 새 STEP 2: 넓은 경기장의 긴 벽을 돌아가도록 길목 점을 따라감 (nav.js). 2초마다 길을 다시 찾음
      ai.repath = (ai.repath || 0) - dt;
      if (!ai.path || ai.repath <= 0) {
        ai.path = Nav.path(p.x, p.y, ai.target.x, ai.target.y);
        ai.repath = 2;
      }
      while (ai.path.length > 1 && Math.hypot(ai.path[0].x - p.x, ai.path[0].y - p.y) < 0.7) { ai.path.shift(); ai.lastD = undefined; }
      const wp = ai.path[0];
      let mx = wp.x - p.x, my = wp.y - p.y;
      const d = Math.hypot(mx, my);
      if (d < 0.6) { mx = my = 0; } else { mx /= d; my /= d; }
      // 벽·기둥에 막히면: 0.5초 동안 목표에 거의 다가가지 못했으면 한쪽으로 0.7초 확실히 비켜 감
      // (예전: 기둥에 비스듬히 닿으면 조금씩 미끄러져 '막힘'으로 안 잡히고 제자리걸음)
      if (ai.sideT > 0) { ai.chk = 0; ai.lastD = undefined; } // 비켜 가는 동안에는 막힘을 세지 않음 (중간에 방향을 뒤집지 않게)
      else ai.chk = (ai.chk || 0) + dt;
      if (ai.chk >= 0.5) {
        const moved = ai.lastD === undefined ? 1 : ai.lastD - d;
        if (d >= 0.6 && moved < 0.4 && !(p.slowFactor < 1)) {
          ai.stuckN = (ai.stuckN || 0) + 1;
          if (!ai.side || ai.stuckN === 3) ai.side = ai.side ? -ai.side : (Math.random() < 0.5 ? 1 : -1); // 두 번 비켜도 안 되면 반대쪽
          ai.sideT = 0.7;
          if (ai.stuckN >= 2) ai.path = null;                  // 새 STEP 2: 길을 다시 찾음
          if (ai.stuckN >= 5) { ai.retarget = 0; ai.side = 0; } // 그래도 안 되면 목표를 새로
        } else if (moved >= 0.4) {
          ai.stuckN = 0;
        }
        ai.lastD = d; ai.chk = 0;
      }
      if (ai.sideT > 0 && d >= 0.6) {
        ai.sideT -= dt;
        [mx, my] = [-my * ai.side + mx * 0.15, mx * ai.side + my * 0.15];
      }
      // 사거리 안에서 가장 가까운, 벽에 가리지 않은 상대
      const range = CHARACTERS[p.charId].attack.range;
      let enemy = null, best = range;
      state.players.forEach((o) => {
        if (o.team === p.team || !o.alive || o.inCapQ) return; // 점령 문제 중(무적)인 상대는 쏘지 않음
        if (Bushes.hiddenFrom(o, p.team, state.players, state.time)) return; // 새 STEP 2: 부쉬에 숨은 상대는 못 봄
        const od = Math.hypot(o.x - p.x, o.y - p.y);
        if (od < best && !Collision.lineBlocked(p.x, p.y, o.x, o.y)) { enemy = o; best = od; }
      });
      // 새 STEP 4: 봇은 교사 기기 안에 있어서 상대의 "지금" 자리를 바로 알고 쏨 → 학생보다 훨씬 잘 맞힘
      //   (시험 경기에서 봇 혼자 16번 쓰러뜨리고 2번만 쓰러짐). 학생 화면처럼 0.25초 전 자리를 보고 쏘게 함
      const LAG = 0.25;
      const aim = enemy ? Math.atan2(enemy.y - (enemy.vy || 0) * LAG - p.y, enemy.x - (enemy.vx || 0) * LAG - p.x) : null;
      Player.update(p, { x: mx, y: my }, dt, aim);
      if (enemy && ai.fireWait <= 0 && Player.canFire(p)) {
        const angle = aim + (Math.random() - 0.5) * 0.6; // 조준이 조금 흔들림
        p.facing = angle;
        Player.useAmmo(p);
        state.projectiles.push(Projectiles.create(p, angle, Skills.shotOverride(p, state.time)));
        Bushes.revealAttack(p, state.time);
        ai.fireWait = 0.7 + Math.random() * 0.8;           // 사람보다 느린 반응
      }
    });
  }

  // ---------------- 연습 상대 (테스트용) ----------------
  function addPracticeDummies() {
    if (state.viewMode !== 'play') return;
    PRACTICE_DUMMIES.forEach((d, i) => {
      const p = Player.create({ id: 'dummy-' + i, nick: d.nick, team: 'LUNAR',
        charId: d.charId, slot: i, kind: 'bot' });
      p.x = p.homeX = d.x;
      p.y = p.homeY = d.y;
      p.baseY = d.y;
      p.sway = d.sway;
      p.walkX = d.walkX || 0;
      p.walkDir = 1;
      p.facing = Math.PI;
      state.players.push(p);
    });
  }

  function updatePracticeDummies(dt) {
    state.players.forEach((p) => {
      if (p.homeX === undefined || p.remote) return;
      // 새 STEP 3: 밀려난 연습 상대 — 밀려나는 동안 미끄러지고, 1.5초 멈췄다가 밀리기 전 자리로 천천히 돌아감
      if (!p.walkX && !p.sway && p.alive && (p.kbT > 0 || p.kbFrom)) {
        if (p.kbT > 0) p.homeWait = 1.5; // 밀려난 자리에서 잠깐 멈춤 (얼마나 밀렸는지 보이게)
        else if (p.homeWait > 0) p.homeWait -= dt;
        const to = p.kbFrom || p;
        const hx = to.x - p.x, hy = to.y - p.y, hd = Math.hypot(hx, hy);
        const back = p.kbT > 0 || p.homeWait > 0 || hd < 0.3 ? { x: 0, y: 0 } : { x: hx / hd * 0.6, y: hy / hd * 0.6 };
        Player.update(p, back, dt, Math.PI);
        if (p.kbT <= 0 && p.homeWait <= 0 && hd < 0.3) p.kbFrom = null;
        return;
      }
      // 수정 STEP 5: 좌우로 끝까지 걷는 연습 상대 (전속력 → 둔화되면 느려지는 게 바로 보임)
      if (p.walkX && p.alive) {
        if (p.x > p.homeX + p.walkX) p.walkDir = -1;
        if (p.x < p.homeX - p.walkX) p.walkDir = 1;
        Player.update(p, { x: p.walkDir, y: 0 }, dt, Math.PI);
        return;
      }
      if (!p.sway || !p.alive) return;
      // 위아래로 천천히 오가며 움직임 (벽에는 막힘)
      const targetY = p.baseY + Math.sin(state.time * 0.9 + p.x) * p.sway;
      const move = { x: 0, y: Math.max(-1, Math.min(1, (targetY - p.y) * 2)) * 0.5 };
      Player.update(p, move, dt, Math.PI);
    });
  }

  // ---------------- 조준 ----------------
  // 조이스틱을 끌고 있으면 그 방향, PC면 마우스 방향, 아니면 null
  function getAimAngle(p) {
    const aim = Input.getAim();
    if (!aim) return null;
    if (aim.kind === 'stick') return aim.angle;
    return angleToScreenPoint(p, aim.x, aim.y);
  }

  function angleToScreenPoint(p, sx, sy) {
    const w = Renderer.screenToWorld(sx, sy);
    if (Math.hypot(w.x - p.x, w.y - p.y) < 0.2) return p.facing; // 캐릭터 바로 위면 그대로
    return Math.atan2(w.y - p.y, w.x - p.x);
  }

  // 톡 눌렀을 때: 사거리 안의 가장 가까운 상대를 자동으로 조준
  // (maxRange를 주면 그 거리 안에서 찾음 — 블래스터 폭발)
  function findAutoTarget(p, maxRange) {
    const range = maxRange || CHARACTERS[p.charId].attack.range + 1;
    let best = null, bestD = range;
    state.players.forEach((o) => {
      if (o.team === p.team || !o.alive || o.inCapQ) return;
      if (Bushes.hiddenFrom(o, p.team, state.players, state.time)) return; // 새 STEP 2: 부쉬에 숨은 상대는 자동 조준 안 됨
      const d = Math.hypot(o.x - p.x, o.y - p.y);
      if (d < bestD) { best = o; bestD = d; }
    });
    return best;
  }

  // ---------------- 발사 ----------------
  function tryFire(p, cmd) {
    if (!Player.canFire(p)) {
      if (p.ammo < 1) UI.flashNoAmmo(); // 탄약이 없으면 탄약 표시를 흔들어 알려줌
      return;
    }
    let angle;
    if (cmd.kind === 'angle') {
      angle = cmd.angle;
    } else if (cmd.kind === 'mouse') {
      angle = state.aim ? state.aim.angle : p.facing;
    } else { // 'auto'
      const target = findAutoTarget(p);
      angle = target ? Math.atan2(target.y - p.y, target.x - p.x) : p.facing;
    }
    p.facing = angle;
    Player.useAmmo(p);
    // 새 STEP 4: 스피더 기습탄 (학생 기기는 모양만 — 피해는 교사 기기가 정함)
    state.projectiles.push(Projectiles.create(p, angle, state.netRole === 'client' ? null : Skills.shotOverride(p, state.time)));
    Bushes.revealAttack(p, state.time); // 새 STEP 2
    // STEP 16 학생 기기: 판정은 교사 기기가 하도록 쏜 방향과 자리를 보냄
    if (state.netRole === 'client') {
      Sync.sendCommand({ k: 'f', a: Math.round(angle * 1000) / 1000,
        x: Math.round(p.x * 100) / 100, y: Math.round(p.y * 100) / 100 });
    }
    AudioManager.playSFX('attack-' + p.charId); // 캐릭터마다 다른 공격음 (짧게, 연사해도 작게)
  }

  // ---------------- 테스트 도구 (혼자 연습 모드에서만) ----------------
  // 캐릭터 바꾸기: 숫자키 1~6 또는 왼쪽 위 버튼 / 내 캐릭터에게 피해 30: H 키 또는 버튼
  function testToolsOn() {
    return state.mode === 'practice' && !!state.localPlayer && state.phase !== 'ended' && state.phase !== 'idle';
  }

  function refreshCharacterTestLabel() {
    const btn = document.getElementById('btn-char-test');
    if (!state.localPlayer) return;
    const ch = CHARACTERS[state.localPlayer.charId];
    btn.innerHTML = '테스트: ' + ch.name + ' ▸<br>' + ch.speed.toFixed(1) + 'm/s · 사거리 ' +
      ch.attack.range + 'm · 충전 ' + ch.attack.reloadSec + '초';
  }

  function setupCharacterTest() {
    const btn = document.getElementById('btn-char-test');
    function apply(charId) {
      if (!testToolsOn()) return;
      Player.setCharacter(state.localPlayer, charId);
      refreshCharacterTestLabel();
    }
    function next() {
      if (!testToolsOn()) return;
      const i = CHARACTER_ORDER.indexOf(state.localPlayer.charId);
      apply(CHARACTER_ORDER[(i + 1) % CHARACTER_ORDER.length]);
    }
    btn.addEventListener('click', next);
    window.addEventListener('keydown', (e) => {
      if (isTyping(e)) return;
      const n = parseInt(e.code.replace('Digit', ''), 10); // 한글 입력 상태에서도 동작
      if (n >= 1 && n <= CHARACTER_ORDER.length) apply(CHARACTER_ORDER[n - 1]);
      if (e.code === 'KeyH') hurtMe();
    });

    // 체력·재충전 시험: 내 캐릭터에게 피해 30 (H 키 또는 버튼)
    document.getElementById('btn-hurt-test').addEventListener('click', hurtMe);
    function hurtMe() {
      if (!testToolsOn()) return;
      const me = state.localPlayer;
      if (!me.alive) return;
      me.protect = 0;
      applyDamage(me, 30, null, me.x, me.y - me.radius, '#ff6b8a');
    }
  }

  return { init, startMatch, backToLobby, stopMatch, state };
})();

window.addEventListener('DOMContentLoaded', Game.init);
