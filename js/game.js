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
           목표 점수·시간 종료 승리, 동점이면 연장전(C존 먼저 점령).
   ※ 주소 끝에 ?quick=1 을 붙이면 1분 경기·목표 10점·5초마다 점수로 빠르게 시험.
   STEP 9: 에너지(⚡)와 6개 캐릭터 특수기. 반지름 2·3·4 선택, 비용 = 원의 넓이.
           에너지: 기본 공격 적중 +3, 존 안 초당 +1, 재등장 +10 (최대 60)
           테스트: G 키 또는 [⚡ 가득] 버튼으로 에너지 채우기
   STEP 10: 원형 범위 시스템 — 반지름을 바꾸면 넓이 비교 카드(넓이 비),
           미리보기에 r2·r3·r4 원을 겹쳐 보여줌, 에너지 바에 이번 비용 표시,
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
   ============================================================ */

// 연습 상대 (테스트용). sway가 있으면 위아래로 천천히 움직입니다.
const PRACTICE_DUMMIES = [
  { nick: '연습 상대 1', charId: 'guardian', x: 27.5, y: 12,  sway: 1.2 },
  { nick: '연습 상대 2', charId: 'frost',    x: 34.5, y: 15,  sway: 0 },   // 상자 뒤
  { nick: '연습 상대 3', charId: 'medic',    x: 28.5, y: 7,   sway: 0 },
  { nick: '연습 상대 4', charId: 'engineer', x: 27,   y: 27,  sway: 0.8 },
];

const Game = (function () {
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
    specialRadius: 3, // 내가 고른 특수기 반지름 (2·3·4)
    specialPreview: null, // 특수기 범위 미리보기 { x, y, r, cost, area, ok, ... }
    nearTerminal: null,   // 내 캐릭터가 쓸 수 있는 가까운 터미널 (없으면 null)
    missionCooldownSec: CONFIG.MISSION.COOLDOWN_SEC,
    netRole: null,    // STEP 16: null 혼자 / 'host' 교사 기기 / 'client' 학생 기기
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
    state.specialRadius = 3;
    state.specialPreview = null;
    state.nearTerminal = null;
    state.missionCooldownSec = CONFIG.MISSION.COOLDOWN_SEC;
    state.countdown = 0;
    state.netRole = null;
    state.paused = false;
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
    refreshCharacterTestLabel();

    UI.setSpectating(state.viewMode === 'spectate');
    // 카운트다운 (3·2·1) 동안은 움직일 수 없음
    state.countdown = cfg.countdown === undefined ? 3 : cfg.countdown;
    if (state.countdown > 0) {
      state.phase = 'countdown';
      Input.setEnabled(false);
      GameState.change(STATES.COUNTDOWN);
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
    AudioManager.setBgm(false);
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

    // 시작 화면·대기방에서는 게임을 그리지 않음 (태블릿 배터리 절약)
    if (!GameState.is(STATES.TITLE) && !GameState.is(STATES.LOBBY) && !GameState.is(STATES.TEACHER_LOGIN)) {
      if (state.paused) AudioManager.setBgm(false); // STEP 18: 혼자 연습 일시정지
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
    if (state.netRole === 'host') Sync.hostTakeInputs(state, dt).forEach(runRemoteCommand);

    // 탄 움직이기 + 충돌 → 일어난 사건 처리 (보호막이 탄을 막음)
    const events = Projectiles.update(state.projectiles, dt, state.players, state.areas);
    events.forEach(handleProjectileEvent);

    // 특수기 원: 폭발, 회복, 둔화, 터렛
    const sk = Skills.update(state, dt);
    state.areas = sk.areas;
    sk.events.forEach(handleSkillEvent);

    // 체력바 애니메이션, 재충전 카운트다운, 재등장
    state.players.forEach((p) => {
      if (Player.updateLife(p, dt)) onRespawn(p);
    });

    // 에너지 존: 누가 어느 원 안에 있는지
    Zones.updateOccupancy(state.zones, state.players);
    state.players.forEach((p) => {
      if (!p.zoneId) return;
      p.stats.zoneTime += dt;
      Player.addEnergy(p, CONFIG.ENERGY.PER_SEC_IN_ZONE * dt); // 존 안에 있으면 초당 +1⚡
    });
    if (me) {
      if (me.zoneId && me.zoneId !== myLastZoneId) {
        UI.showZoneToast(state.zones.find((z) => z.id === me.zoneId));
      }
      myLastZoneId = me.zoneId;
    }

    // 점령 게이지와 팀 점수
    Zones.updateCapture(state.zones, state.players, dt, state.scoreInterval)
      .forEach(handleZoneEvent);

    // 수학 터미널: 쿨다운과 가까운 터미널 찾기
    state.players.forEach((p) => {
      if (p.missionCooldown > 0) p.missionCooldown = Math.max(0, p.missionCooldown - dt);
    });
    state.nearTerminal = me && me.alive && !me.inMission ? findUsableTerminal(me) : null;
    UI.updateMissionButton(me, state.nearTerminal, state.settings.missionLimit);

    // 남은 시간
    if (state.phase !== 'ended') {
      state.timeLeft = Math.max(0, state.timeLeft - dt);
      if (state.timeLeft === 0) onTimeUp();
    }

    updateEffects(dt);
  }

  // 내 캐릭터 조작 (혼자·교사·학생 기기 모두 같은 코드)
  function updateLocalControl(me, dt) {
    if (me && me.inMission) {
      // 수학 미션 중: 캐릭터는 제자리 (탄약은 계속 충전)
      state.aim = null;
      state.specialPreview = null;
      Player.update(me, { x: 0, y: 0 }, dt);
      Input.takeFires();
      Input.takeSpecialCasts();
    } else if (me && me.alive) {
      // 조준 방향 계산
      const aimAngle = getAimAngle(me);
      state.aim = aimAngle === null ? null : { angle: aimAngle };

      // 내 캐릭터 이동 (조준 중이면 조준 방향을 바라봄)
      Player.update(me, Input.getMove(), dt, aimAngle);

      // 발사
      Input.takeFires().forEach((cmd) => tryFire(me, cmd));

      // 특수기: 범위 미리보기 + 사용
      state.specialPreview = state.settings.specialsEnabled ? computeSpecialPreview(me) : null;
      Input.takeSpecialCasts().forEach((cmd) => {
        if (state.settings.specialsEnabled) tryCastSpecial(me, cmd);
      });
    } else if (me) {
      // 재충전 중: 조작은 받지 않음
      state.aim = null;
      state.specialPreview = null;
      Input.takeFires();
      Input.takeSpecialCasts();
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
        // STEP 17: 내 탄이 맞았을 때 바로 소리 (피해는 교사 기기가 정함)
        AudioManager.play(ev.type === 'hit' ? 'hit' : 'block');
      }
    });
    state.areas.forEach((a) => { a.age += dt; });
    state.players.forEach((p) => {
      Player.updateTimers(p, dt);
      if (!p.alive) p.respawnTimer = Math.max(0, p.respawnTimer - dt); // "재충전 중… 3" 표시용
    });

    if (me) {
      const z = me.alive ? Zones.zoneOf(state.zones, me) : null;
      me.zoneId = z ? z.id : null;
      if (me.zoneId && me.zoneId !== myLastZoneId) UI.showZoneToast(z);
      myLastZoneId = me.zoneId;
      if (me.missionCooldown > 0) me.missionCooldown = Math.max(0, me.missionCooldown - dt);
    }
    state.nearTerminal = me && me.alive && !me.inMission ? findUsableTerminal(me) : null;
    UI.updateMissionButton(me, state.nearTerminal, state.settings.missionLimit);

    // 남은 시간은 받은 값에서 부드럽게 줄어듦
    state.timeLeft = Math.max(0, state.timeLeft - dt);

    Sync.clientFrame(state, dt);
    updateEffects(dt);
  }

  // 교사 기기가 보낸 사건과 경기 상황 → 학생 화면
  const clientHooks = {
    onEvent(e) {
      if (e.k === 'fx') {
        addEffect(Sync.decodeEffect(e));
        if (e.kd === 'blast') AudioManager.play('blast'); // STEP 17
      }
      else if (e.k === 'ui') Sync.uiCall(e);
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
      if (p.inMission) Mission.close(false); // 풀던 문제는 다음에 다시
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
      p.ammo = AMMO_MAX;
      p.fireCooldown = 0;
      p.facing = p.team === 'LUNAR' ? Math.PI : 0;
    },
  };

  // ---------------- STEP 16: 교사 기기가 학생 명령 처리 ----------------
  function runRemoteCommand({ p, c }) {
    if (state.phase === 'ended' || state.phase === 'idle' || state.phase === 'countdown') return;
    if (c.k === 'f') {
      if (!p.alive || p.inMission || !isFinite(c.a)) return;
      // STEP 21: 탄약 확인 (학생 기기 탄약을 교사 기기에서도 충전 속도대로 셈)
      //          명령이 한꺼번에 도착할 수 있어 반 발 정도는 봐줌. 재등장·탄약 보너스는 가득으로 돌아감
      const reload = CHARACTERS[p.charId].attack.reloadSec;
      p.ammo = Math.min(AMMO_MAX, p.ammo + (state.time - (p.ammoAt === undefined ? state.time : p.ammoAt)) / reload);
      p.ammoAt = state.time;
      if (p.ammo < 0.5) return;
      p.ammo -= 1;
      // 학생 기기에서 쏜 자리에서 출발 (너무 멀면 교사 기기가 아는 자리)
      const near = isFinite(c.x) && isFinite(c.y) && Math.hypot(c.x - p.x, c.y - p.y) < 3;
      const body = { id: p.id, team: p.team, charId: p.charId, radius: p.radius,
        x: near ? c.x : p.x, y: near ? c.y : p.y };
      p.facing = c.a;
      p.stats.shots++;
      state.projectiles.push(Projectiles.create(body, c.a));
    } else if (c.k === 's') {
      if (!state.settings.specialsEnabled || !isFinite(c.x) || !isFinite(c.y)) return;
      const r = CONFIG.SKILL_RADII.indexOf(c.r) !== -1 ? c.r : 3;
      castSpecialAt(p, r, c.x, c.y);
    } else if (c.k === 'm') {
      if (p.missionsUsed >= state.settings.missionLimit) return; // STEP 21: 한 경기 문제 수를 넘으면 무시
      applyMissionResult(p, {
        correct: !!c.ok, hintShown: !!c.h, reward: c.rw || null, wrongCount: c.wc | 0, timeSec: c.ts || 0,
        question: { id: c.qi, type: c.qt, category: c.qc, difficulty: c.qd,
          text: String(c.qx || '').slice(0, 200), answerText: String(c.qa || '').slice(0, 40) },
      });
    }
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
  function specialSound(p, r) {
    AudioManager.play(Skills.spec(p.charId).type === 'blink' ? 'blink' : 'special', { r });
  }

  // 경기 상태가 바뀐 것을 보고 소리를 냄.
  // 혼자 연습·교사 기기·학생 기기 모두 같은 방법이라 네트워크로 따로 알릴 필요가 없음
  let heard = null; // 지난 프레임에 본 상태
  function watchSounds() {
    const inMatch = state.phase === 'playing' || state.phase === 'overtime';
    AudioManager.setBgm(inMatch, state.phase === 'overtime');
    const me = state.localPlayer;
    const now = {
      phase: state.phase,
      me: me && { hp: me.hp, alive: me.alive, ammo: Math.floor(me.ammo + 1e-6) },
      zones: state.zones.map((z) => ({ owner: z.owner, team: z.progressTeam })),
      score: state.score.SOLAR + state.score.LUNAR,
    };
    const prev = heard;
    heard = now;
    if (!prev || !inMatch || prev.phase !== now.phase) return; // 연장전으로 바뀐 순간 등은 건너뜀

    if (now.me && prev.me) {
      if (now.me.alive && prev.me.alive && now.me.hp < prev.me.hp) AudioManager.play('hurt');
      if (prev.me.alive && !now.me.alive) AudioManager.play('knockout');
      if (!prev.me.alive && now.me.alive) AudioManager.play('respawn');
      else if (now.me.alive && now.me.ammo > prev.me.ammo) AudioManager.play('reload');
    }
    now.zones.forEach((z, i) => {
      const p = prev.zones[i];
      if (!p) return;
      if (z.owner && z.owner !== p.owner) AudioManager.play('capture');
      else if (!z.owner && p.owner) AudioManager.play('neutral');
      else if (z.team && z.team !== p.team && z.owner !== z.team) AudioManager.play('captureStart');
    });
    if (now.score > prev.score) AudioManager.play('score');
  }

  // ---------------- 점령·점수 사건 처리 ----------------
  function zoneById(id) {
    return state.zones.find((z) => z.id === id);
  }

  function handleZoneEvent(ev) {
    const z = zoneById(ev.zoneId);
    const team = CONFIG.TEAMS[ev.team];
    if (ev.type === 'captured') {
      addEffect({ kind: 'spawn', x: z.x, y: z.y, color: team.color, life: 0.8, radius: z.r });
      uiAll('showToast', ev.zoneId + '존 점령!', team.name + '팀이 ' + z.area + '㎡를 모두 채웠어요', team.color);
      // 연장전: C존을 먼저 점령한 팀이 승리
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
      endGame(null, 'draw'); // 연장전에서도 승부가 나지 않음
    }
  }

  // 연장전: C존만 켜고 중립으로 되돌림. C존을 먼저 점령한 팀이 승리.
  function startOvertime() {
    state.phase = 'overtime';
    state.timeLeft = CONFIG.CAPTURE.OVERTIME_SEC;
    state.zones.forEach((z) => {
      z.owner = null;
      z.progress = 0;
      z.progressTeam = null;
      z.scoreTimer = 0;
      z.disabled = z.id !== 'C';
    });
    uiAll('showToast', '동점! 연장전', 'C존을 먼저 점령하는 팀이 승리해요', '#ffd84d');
  }

  function endGame(winner, reason) {
    if (state.phase === 'ended') return;
    state.phase = 'ended';
    state.result = { winner, reason };
    state.aim = null;
    Mission.close(false);
    Input.setEnabled(false);
    GameState.change(STATES.RESULT);
    UI.showResult(state);
    // STEP 17: 승리/패배 (관전하는 선생님 화면은 축하 소리)
    AudioManager.setBgm(false);
    const me = state.localPlayer;
    AudioManager.play(!winner ? 'draw' : !me || me.team === winner ? 'win' : 'lose');
    showRecords(); // STEP 19: 개인 기록·학습 결과
  }

  // ---------------- 체력 0 / 재등장 ----------------
  // 폭력적인 표현 없이, 에너지가 흩어졌다가 시작 지역에서 다시 모이는 효과를 보여줍니다.
  function onKnockout(p) {
    addEffect({ kind: 'recharge', x: p.x, y: p.y, color: CONFIG.TEAMS[p.team].color, life: 0.7 });
    if (p.isLocal && p.inMission) Mission.close(false); // 풀던 문제는 다음에 다시
    // (재충전·재등장 소리는 watchSounds 가 체력 변화를 보고 냄)
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
      onShieldBlock(ev.areaId, ev.x, ev.y);
      return;
    }
    if (ev.type === 'hit') {
      const target = findPlayer(ev.targetId);
      if (!target) return;
      const owner = findPlayer(ev.ownerId);
      const applied = applyDamage(target, ev.damage, owner, ev.x, ev.y, color);
      // 기본 공격을 맞히면 +3⚡ (터렛 탄은 제외)
      if (applied && owner && !ev.fromTurret) Player.addEnergy(owner, CONFIG.ENERGY.ON_HIT);
      if (applied && owner && owner.isLocal) AudioManager.play('hit'); // STEP 17: 명중
    }
  }

  // 보호막이 공격을 막았을 때: 하얀 불꽃 + 가디언의 지원 기록
  function onShieldBlock(areaId, x, y) {
    addEffect({ kind: 'spark', x, y, color: '#ffffff', life: 0.3, big: true });
    const a = state.areas.find((s) => s.id === areaId);
    const owner = a && findPlayer(a.ownerId);
    if (owner) owner.stats.support++;
  }

  // ---------------- 특수기 사건 처리 ----------------
  function handleSkillEvent(ev) {
    if (ev.type === 'blast') {
      addEffect({ kind: 'blast', x: ev.x, y: ev.y, r: ev.r, color: CONFIG.TEAMS[ev.team].color, life: 0.5 });
      AudioManager.play('blast'); // STEP 17
    } else if (ev.type === 'damage') {
      const target = findPlayer(ev.targetId);
      if (target) applyDamage(target, ev.damage, findPlayer(ev.ownerId), ev.x, ev.y, CHARACTERS[ev.charId].accent);
    } else if (ev.type === 'blocked') {
      onShieldBlock(ev.areaId, ev.x, ev.y);
    } else if (ev.type === 'heal') {
      const target = findPlayer(ev.targetId);
      const owner = findPlayer(ev.ownerId);
      if (!target) return;
      const healed = Player.heal(target, ev.amount);
      if (healed > 0) {
        addEffect({ kind: 'dmg', x: target.x + (Math.random() - 0.5) * 0.6, y: target.y - target.radius - 1.5,
          text: '+' + Math.round(healed), color: '#6dffa8', life: 0.8 });
        if (owner) {
          owner.stats.healed += healed;
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
    if (!aim) return null;
    const t = specialTargetFrom(p, aim);
    return makePreview(p, t);
  }

  function makePreview(p, t) {
    const sp = Skills.spec(p.charId);
    const r = Skills.radiusFor(p.charId, state.specialRadius);
    const cost = Skills.costOf(p.charId, state.specialRadius);
    // 반지름을 바꾼 지 1.5초 안이면 이전 원도 함께 그림 (크기 비교)
    const recent = state.radiusChangedAt !== undefined && state.time - state.radiusChangedAt < 1.5;
    return {
      type: sp.type,
      x: t.x, y: t.y, r,
      area: circleArea(r),
      cost,
      ok: p.energy >= cost,
      castRange: sp.castRange,
      fromX: p.x, fromY: p.y,
      team: p.team,
      prevR: recent && state.prevRadius !== r ? state.prevRadius : null,
      prevAge: recent ? state.time - state.radiusChangedAt : 0,
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
      return Skills.clampTarget(p, p.x + aim.dx * sp.castRange, p.y + aim.dy * sp.castRange);
    }
    // 'self' / 'tap'
    if (sp.type === 'blast') {
      // 블래스터: 던질 수 있는 거리 안의 가장 가까운 상대, 없으면 바라보는 방향 6m
      const target = findAutoTarget(p, sp.castRange);
      if (target) return Skills.clampTarget(p, target.x, target.y);
      return Skills.clampTarget(p, p.x + Math.cos(p.facing) * 6, p.y + Math.sin(p.facing) * 6);
    }
    if (sp.type === 'blink') {
      return Skills.clampTarget(p, p.x + Math.cos(p.facing) * sp.castRange, p.y + Math.sin(p.facing) * sp.castRange);
    }
    return { x: p.x, y: p.y };
  }

  function tryCastSpecial(p, cmd) {
    let aim = cmd;
    if (cmd.kind === 'mouse') aim = Input.getAim() || { kind: 'self' };
    const t = specialTargetFrom(p, aim);
    // STEP 16 학생 기기: 에너지를 확인하고 교사 기기에 부탁 (원은 교사 기기가 만들어 보내 줌)
    if (state.netRole === 'client') {
      const cost = Skills.costOf(p.charId, state.specialRadius);
      if (!p.alive) return;
      if (p.energy < cost) { showNoEnergy(p, cost); return; }
      p.energy -= cost; // 교사 기기가 처리할 때까지 미리 줄여 보여줌
      if (Skills.spec(p.charId).type !== 'blink') p.lastSpecial = { name: Skills.spec(p.charId).name, r: state.specialRadius };
      specialSound(p, state.specialRadius); // STEP 17: 교사 기기 답을 기다리지 않고 바로
      Sync.sendCommand({ k: 's', r: state.specialRadius, x: Math.round(t.x * 100) / 100, y: Math.round(t.y * 100) / 100 }, -cost);
      return;
    }
    const res = castSpecialAt(p, state.specialRadius, t.x, t.y);
    if (!res.ok && res.reason === 'energy') showNoEnergy(p, res.cost);
  }

  function showNoEnergy(p, cost) {
    const r = state.specialRadius;
    UI.flashNoEnergy();
    UI.showToast('⚡ 에너지가 부족해요',
      Skills.spec(p.charId).type === 'blink'
        ? '순간이동에는 ' + cost + '⚡ 필요'
        : '반지름 ' + r + 'm 원의 넓이 ' + circleArea(r) + '㎡ → ' + cost + '⚡ 필요',
      '#ff9db0');
  }

  // 특수기를 실제로 씀 (혼자·교사 기기. 학생 명령도 여기로)
  function castSpecialAt(p, radius, tx, ty) {
    const res = Skills.cast(p, radius, tx, ty, state);
    if (!res.ok) return res;
    const color = CONFIG.TEAMS[p.team].color;
    // 게임 상황 문제용: 방금 쓴 특수기와 반지름 기억 (순간이동은 반지름 고르기가 없어 제외)
    if (res.area) p.lastSpecial = { name: Skills.spec(p.charId).name, r: res.area.r };
    if (res.to) {
      addEffect({ kind: 'spark', x: res.from.x, y: res.from.y, color: CHARACTERS[p.charId].accent, life: 0.35, big: true });
      addEffect({ kind: 'spawn', x: res.to.x, y: res.to.y, color, life: 0.4 });
      Sync.warp(p); // STEP 16: 순간이동한 학생 기기도 따라 옮김
    } else {
      addEffect({ kind: 'spawn', x: res.area.x, y: res.area.y, color, life: 0.4, radius: res.area.r - 1.2 });
    }
    if (p.isLocal) specialSound(p, res.area ? res.area.r : 0); // STEP 17
    return res;
  }

  // ---------------- 수학 터미널 (STEP 11) ----------------
  // 내 캐릭터가 쓸 수 있는 가장 가까운 터미널 (사용 거리 2m 안, 우리 팀 쪽)
  function findUsableTerminal(p) {
    let best = null, bestD = GameMap.TERMINAL_USE_RANGE + p.radius;
    GameMap.terminals.forEach((t) => {
      if (CONFIG.MISSION.OWN_SIDE_ONLY && t.side !== p.team) return;
      const d = Math.hypot(t.x - p.x, t.y - p.y);
      if (d <= bestD) { best = t; bestD = d; }
    });
    return best;
  }

  // 지금 미션을 열 수 있는지 (이유도 함께)
  function missionStatus(p) {
    if (!p || !p.alive || p.inMission || state.phase === 'ended') return 'no';
    if (!state.nearTerminal) return 'far';
    if (p.missionsUsed >= state.settings.missionLimit) return 'done';
    if (p.missionCooldown > 0) return 'cooldown';
    return 'ready';
  }

  function openMission() {
    const me = state.localPlayer;
    if (missionStatus(me) !== 'ready') return;
    // 문제은행의 문제를 복사해서 사용 (틀린 횟수 등을 적어도 원본은 그대로)
    const q = me.pendingQuestion || { ...Questions.pick(me, state) };
    me.pendingQuestion = q;
    me.inMission = true;
    Input.setEnabled(false); // 움직이기·쏘기 멈춤
    GameState.change(STATES.MATH_MISSION);
    Mission.open(q, { used: me.missionsUsed, limit: state.settings.missionLimit }, {
      onFinish: (result) => onMissionFinish(me, result),
      onClose: () => endMission(me),
    });
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
    me.missionCooldown = state.missionCooldownSec;
    me.usedQuestionIds.push(result.question.id); // 같은 문제는 다시 내지 않음
    const E = CONFIG.ENERGY;
    const before = me.energy;
    const energy = applyMissionResult(me, result);
    // STEP 16 학생 기기: 에너지·보너스는 교사 기기가 주도록 결과를 보냄
    if (state.netRole === 'client') {
      const q = result.question;
      Sync.sendCommand({ k: 'm', ok: result.correct ? 1 : 0, h: result.hintShown ? 1 : 0, rw: result.reward || '',
        wc: result.wrongCount | 0, ts: Math.round(result.timeSec * 10) / 10,
        qi: String(q.id), qt: q.type || 0, qc: q.category || '', qd: q.difficulty || 0,
        qx: Questions.plainText(q).slice(0, 200), qa: Questions.answerText(q) }, energy);
    }
    const gained = me.energy - before;
    let bonusText = '';
    if (result.correct && result.reward && me.alive) {
      bonusText = ' · ' + CONFIG.MISSION.REWARDS.find((r) => r.id === result.reward).label;
    }
    const energyText = '⚡ +' + energy + (gained < energy ? ' (최대 ' + E.MAX + ')' : '');
    if (result.correct) {
      UI.showToast((result.hintShown ? '힌트로 해결! ' : '미션 성공! ') + energyText + bonusText,
        result.question.explanation, '#4ff0c0', 3000);
      addEffect({ kind: 'spawn', x: me.x, y: me.y, color: '#ffd84d', life: 0.6 });
    } else {
      UI.showToast('다음엔 맞힐 수 있어요! ' + energyText, result.question.explanation, '#9ee8ff', 3500);
    }
  }

  /**
   * 미션 결과 기록 + 보상 (혼자·교사 기기, 그리고 교사 기기가 학생 결과를 받을 때)
   *   힌트 없이 정답 ⚡+20 + 보너스 / 힌트 후 정답 ⚡+12 + 보너스 / 풀이를 봄 ⚡+5
   * @returns 이번 미션 에너지
   */
  function applyMissionResult(me, result) {
    me.missionsUsed++;
    me.missionLog.push({
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
    });
    // STEP 13: 보상
    const E = CONFIG.ENERGY;
    const energy = !result.correct ? E.MISSION_REVEALED
      : result.hintShown ? E.MISSION_CORRECT_AFTER_HINT : E.MISSION_CORRECT;
    Player.addEnergy(me, energy); // 학생 기기에서는 미리 보여주기 (곧 교사 기기 값으로 바뀜)
    if (result.correct && result.reward && me.alive) Player.applyReward(me, result.reward);
    me.missionLog[me.missionLog.length - 1].reward = result.reward;
    me.missionLog[me.missionLog.length - 1].energy = energy;
    // 교사 기기에서 학생의 미션 성공을 보여줌 (학생 기기에는 효과로 전해짐)
    if (!me.isLocal && result.correct) {
      addEffect({ kind: 'spawn', x: me.x, y: me.y, color: '#ffd84d', life: 0.6 });
    }
    return energy;
  }

  function setupMissionControls() {
    document.getElementById('btn-mission').addEventListener('click', openMission);
    window.addEventListener('keydown', (e) => {
      if (isTyping(e)) return;
      if (e.code === 'KeyF' && !e.repeat) openMission();
    });
  }

  // STEP 10: 반지름을 바꾸면 이전 원과 넓이를 비교해서 보여줌
  function setSpecialRadius(r) {
    const prev = state.specialRadius;
    state.specialRadius = r;
    const me = state.localPlayer;
    if (me && Skills.spec(me.charId).type !== 'blink') UI.showRadiusCompare(prev, r);
    state.radiusChangedAt = state.time; // 미리보기에서 이전 원을 잠깐 겹쳐 보여줄 때 사용
    state.prevRadius = prev;
  }

  // 반지름 고르기 (r2·r3·r4 버튼, R 키), 테스트용 에너지 가득
  function setupSpecialControls() {
    document.querySelectorAll('.radius-btn').forEach((b) => {
      b.addEventListener('click', () => setSpecialRadius(Number(b.dataset.r)));
    });
    window.addEventListener('keydown', (e) => {
      if (isTyping(e) || !state.localPlayer) return;
      if (e.code === 'KeyR') {
        const list = CONFIG.SKILL_RADII;
        setSpecialRadius(list[(list.indexOf(state.specialRadius) + 1) % list.length]);
      }
      if (e.code === 'KeyG') fillEnergy();
    });
    // 에너지 가득 (테스트용, 혼자 연습에서만)
    document.getElementById('btn-energy-test').addEventListener('click', fillEnergy);
    function fillEnergy() {
      if (testToolsOn()) state.localPlayer.energy = CONFIG.ENERGY.MAX;
    }
  }

  /**
   * 피해 처리 (나중에 특수기 폭발 등에서도 이 함수를 사용)
   * STEP 16 멀티플레이: 이 함수 결과를 네트워크로 알립니다.
   */
  function applyDamage(target, damage, owner, hx, hy, color) {
    if (!target.alive) return false;
    // 수학 미션 중이면 받는 피해가 절반 (반올림)
    if (target.inMission) damage = Math.max(1, Math.round(damage * CONFIG.MISSION.DAMAGE_TAKEN_MULT));
    // 재등장 보호 중이면 막아냄
    if (target.protect > 0) {
      addEffect({ kind: 'spark', x: hx, y: hy, color: '#ffffff', life: 0.25 });
      addEffect({ kind: 'dmg', x: target.x + (Math.random() - 0.5) * 0.6, y: target.y - target.radius - 1.5,
        text: '보호', color: '#9ee8ff', life: 0.6 });
      return false;
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
      text: '-' + damage, color: '#ffffff', life: 0.8 });

    if (owner) {
      owner.stats.hits++;
      owner.stats.damage += Math.min(damage, target.hp);
    }
    const knockedOut = Player.takeDamage(target, damage, state.settings.respawnSeconds);
    if (knockedOut) {
      if (owner) owner.stats.knockouts++;
      onKnockout(target);
    }
    return true;
  }

  // ---------------- 짧은 효과 ----------------
  function addEffect(e) {
    e.age = 0;
    state.effects.push(e);
    if (state.effects.length > 60) state.effects.shift(); // 너무 많이 쌓이지 않게
  }

  function updateEffects(dt) {
    state.effects.forEach((e) => { e.age += dt; });
    state.effects = state.effects.filter((e) => e.age < e.life);
    state.players.forEach((p) => {
      if (p.hitFlash > 0) p.hitFlash = Math.max(0, p.hitFlash - dt);
    });
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
      const ai = p.ai || (p.ai = { target: null, retarget: 0, fireWait: 1 + Math.random(), stuck: 0, lx: p.x, ly: p.y, side: 0 });
      ai.retarget -= dt;
      ai.fireWait -= dt;
      // 목표: 우리 팀 것이 아닌 존 (가까운 곳 우선), 몇 초마다 다시 고름
      if (!ai.target || ai.retarget <= 0) {
        const open = state.zones.filter((z) => !z.disabled && z.owner !== p.team);
        const list = open.length ? open : state.zones.filter((z) => !z.disabled);
        list.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
        const z = list[Math.random() < 0.7 ? 0 : Math.floor(Math.random() * list.length)];
        const ang = Math.random() * Math.PI * 2, rr = Math.random() * z.r * 0.55;
        ai.target = { x: z.x + Math.cos(ang) * rr, y: z.y + Math.sin(ang) * rr };
        ai.retarget = 5 + Math.random() * 5;
      }
      let mx = ai.target.x - p.x, my = ai.target.y - p.y;
      const d = Math.hypot(mx, my);
      if (d < 0.6) { mx = my = 0; } else { mx /= d; my /= d; }
      // 벽에 막히면 옆으로 비켜 감
      if (d >= 0.6 && Math.hypot(p.x - ai.lx, p.y - ai.ly) < 0.02) ai.stuck += dt; else ai.stuck = 0;
      ai.lx = p.x; ai.ly = p.y;
      if (ai.stuck > 0.4) { ai.side = ai.side || (Math.random() < 0.5 ? 1 : -1); [mx, my] = [-my * ai.side, mx * ai.side]; }
      if (ai.stuck > 1.5) { ai.stuck = 0; ai.side = 0; ai.retarget = 0; }
      // 사거리 안에서 가장 가까운, 벽에 가리지 않은 상대
      const range = CHARACTERS[p.charId].attack.range;
      let enemy = null, best = range;
      state.players.forEach((o) => {
        if (o.team === p.team || !o.alive) return;
        const od = Math.hypot(o.x - p.x, o.y - p.y);
        if (od < best && !Collision.lineBlocked(p.x, p.y, o.x, o.y)) { enemy = o; best = od; }
      });
      const aim = enemy ? Math.atan2(enemy.y - p.y, enemy.x - p.x) : null;
      Player.update(p, { x: mx, y: my }, dt, aim);
      if (enemy && ai.fireWait <= 0 && Player.canFire(p)) {
        const angle = aim + (Math.random() - 0.5) * 0.5; // 조준이 조금 흔들림
        p.facing = angle;
        Player.useAmmo(p);
        state.projectiles.push(Projectiles.create(p, angle));
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
      p.facing = Math.PI;
      state.players.push(p);
    });
  }

  function updatePracticeDummies(dt) {
    state.players.forEach((p) => {
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
      if (o.team === p.team || !o.alive) return;
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
    state.projectiles.push(Projectiles.create(p, angle));
    // STEP 16 학생 기기: 판정은 교사 기기가 하도록 쏜 방향과 자리를 보냄
    if (state.netRole === 'client') {
      Sync.sendCommand({ k: 'f', a: Math.round(angle * 1000) / 1000,
        x: Math.round(p.x * 100) / 100, y: Math.round(p.y * 100) / 100 });
    }
    AudioManager.play('fire', { shape: CHARACTERS[p.charId].attack.shape }); // STEP 17
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
