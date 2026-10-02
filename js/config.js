/* ============================================================
   서클 배틀 - 설정 파일 (config.js)
   ------------------------------------------------------------
   PIN, 원주율, 점수·시간·에너지·점령 같은 게임 규칙 숫자는 이 파일에서 관리합니다.
   (캐릭터 능력치는 characters.js, 문제는 questions.js 에 있습니다)
   ============================================================ */

const CONFIG = {
  // 게임 제목
  TITLE: '서클배틀',

  // 교사용 PIN (GitHub Pages에서는 누구나 이 파일을 볼 수 있으니 가벼운 잠금으로만 생각하세요)
  TEACHER_PIN: '0000',

  // 원주율: 지금 경기에서 쓰는 값 (수정 STEP 3)
  //   선생님이 방을 만들 때 3.14 또는 3을 고르면, 경기가 시작될 때 이 값이 바뀌고
  //   그 경기의 모든 문제·정답·존 넓이·특수기 비용이 같은 원주율로 계산됩니다. (game.js applyPi)
  //   처음 값(혼자 연습)은 ROOM_DEFAULTS.pi 와 같습니다.
  PI: 3.14,

  // ---------------- 맵 ----------------
  // 게임 속 모든 크기는 미터(m) 단위입니다. 화면에 그릴 때만 픽셀로 바꿉니다.
  // 새 STEP 2: 경기장을 약 1.6배로 (48m × 30m → 76m × 48m). 위·가운데·아래 3개 레인과 우회로, 부쉬
  MAP: {
    WIDTH: 76,   // 가로 76m
    HEIGHT: 48,  // 세로 48m
  },

  // ---------------- 새 STEP 2: 캐릭터 추적 카메라 ----------------
  // 기기마다 자기 캐릭터를 따라감 (선생님 관전 TV는 경기장 전체)
  CAMERA: {
    VIEW_H: 22,        // 화면 세로에 보이는 길이 (m) — 사거리(최대 10m)와 스킬 범위가 화면 안에 들어오게
    VIEW_W_MAX: 40,    // 아주 넓은 화면(휴대폰 가로)에서 보이는 가로 길이 최대 (m)
    LOOK_AHEAD: 2.5,   // 상대 쪽(앞)을 조금 더 보여 줌 (m)
    FOLLOW: 9,         // 따라가는 빠르기 (클수록 딱 붙음). 9 → 0.1초 만에 약 60% 따라감
    SNAP_DIST: 12,     // 이만큼 멀어지면(재등장 등) 부드럽게 가지 않고 바로 옮김 (m)
    EDGE: 0.6,         // 경기장 밖은 테두리만 살짝 보이게 (m)
  },

  // ---------------- 새 STEP 2: 부쉬(수풀) ----------------
  // 상대가 부쉬 안에 있으면 보이지 않음 (우리 팀은 계속 보임)
  BUSH: {
    REVEAL_ATTACK_SEC: 1.2, // 부쉬 안에서 쏘거나 스킬을 쓰면 이만큼 드러남
    REVEAL_HIT_SEC: 0.9,    // 부쉬 안에서 맞으면 이만큼 드러남
    NEAR_REVEAL_M: 2.5,     // 바로 옆(2.5m 안)까지 다가온 상대에게는 보임 (코앞에서 안 보이는 일이 없게)
    SENSOR_REVEAL_SEC: 0.6, // 새 STEP 3: 엔지니어 LEVEL 3 터렛 원 안에 있으면 부쉬 안이어도 드러남 (나가면 곧 다시 숨음)
  },

  // ---------------- 새 STEP 3: 스킬 효과 ----------------
  SKILL_FX: {
    KNOCK_SEC: 0.25,        // 블래스터 밀어내기: 이 시간 동안 미끄러지듯 밀려남 (벽에는 막힘)
    DASH_MULT: 1.25,        // 스피더 LEVEL 3: 순간이동 뒤 이동속도 배율
    TURRET_BODY: 0.55,      // 엔지니어 터렛 몸체 반지름 (m) — 상대 탄이 여기에 맞으면 터렛 체력이 줄어듦
    AMBUSH_SEC: 2,          // 새 STEP 4: 스피더 기습 — 순간이동 뒤 이 시간 안에 쏘는 첫 탄은
    AMBUSH_MULT: 1.5,       //            피해가 이 배수 (12 → 18)
  },

  // ---------------- 팀 ----------------
  TEAMS: {
    SOLAR: { id: 'SOLAR', name: 'SOLAR', color: '#ffb23e', glow: '#ff7a3d' },
    LUNAR: { id: 'LUNAR', name: 'LUNAR', color: '#46d2ff', glow: '#8f7dff' },
  },

  // ---------------- 교사 역할 ----------------
  // PLAY     : 교사도 한 팀에 들어가 함께 플레이합니다. (교사 기기가 호스트 역할도 계속 합니다)
  // SPECTATE : 교사는 플레이하지 않고 전체 경기를 관전합니다. (TV 화면에 띄우기 좋습니다)
  TEACHER_ROLES: {
    PLAY: 'play',
    SPECTATE: 'spectate',
  },

  // ---------------- 교사가 방을 만들 때의 기본 설정 ----------------
  ROOM_DEFAULTS: {
    gameMinutes: 8,               // 5 / 8 / 10
    targetScore: 30,              // 20 / 30 / 40
    difficulty: 'normal',         // 'easy' / 'normal' / 'hard'
    pi: 3.14,                     // 원주율 3.14 또는 3 (수정 STEP 3) — 한 경기 안에서는 같은 값
    capSeconds: 30,               // 수정 STEP 6: 점령 문제 제한 시간 30 / 45 / 60초 (기본 30초)
    missionLimit: 5,              // 한 학생이 한 게임에서 풀 수 있는 최대 미션 수
    teamSize: 5,                  // 한 팀 최대 인원 (2~5)
    allowDuplicateCharacters: true,
    specialsEnabled: true,
    respawnSeconds: 5,
    teacherRole: 'spectate',      // 'play' 또는 'spectate'
    fillWithBots: true,           // 인원이 적은 팀에 봇을 넣어 인원을 맞춤
  },

  // 교사 설정 화면에서 고를 수 있는 값들
  ROOM_OPTIONS: {
    gameMinutes: [5, 8, 10],
    targetScore: [20, 30, 40],
    difficulty: ['easy', 'normal', 'hard'],
    pi: [3.14, 3],
    capSeconds: [30, 45, 60],
    missionLimit: [3, 4, 5, 6],
    teamSize: [2, 3, 4, 5],
    respawnSeconds: [3, 5, 7],
  },

  // ---------------- 체력과 재등장 ----------------
  // 재등장까지 걸리는 시간은 ROOM_DEFAULTS.respawnSeconds (교사 설정)
  RESPAWN: {
    PROTECT_SEC: 1.5,   // 다시 나타난 직후 잠깐 맞지 않는 보호 시간 (시작 지역 앞에서 계속 당하지 않게)
  },

  // ---------------- 에너지(⚡)와 특수기 ----------------
  // 수정 STEP 4: 특수기(스킬)는 에너지 터미널 문제를 맞혀 LEVEL 1이 되어야 쓸 수 있고,
  //   한 번 쓸 때 캐릭터마다 정해진 에너지가 듭니다. (characters.js 의 cost, levels)
  ENERGY: {
    START: 0,           // 경기 시작 때 에너지
    MAX: 60,
    ON_HIT: 3,          // 적중할 때
    PER_SEC_IN_ZONE: 1, // 에너지 존 안에 있을 때 초당
    ON_RESPAWN: 10,     // 재등장할 때
    MISSION_CORRECT: 20,            // 수학 미션: 힌트 없이 정답 (+ 스킬 LEVEL 1 올라감)
    MISSION_CORRECT_AFTER_HINT: 12, // 수학 미션: 힌트를 보고 정답 (+ 스킬 LEVEL 1 올라감)
    MISSION_REVEALED: 5,            // 수학 미션: 정답과 풀이를 봄 (참여 보상)
  },

  // ---------------- 에너지 존 점령 ----------------
  // 점령 게이지는 존의 넓이(㎡)만큼 채워야 완료됩니다.
  //   A존 28.26㎡ / C존 50.24㎡ / B존(가운데) 78.5㎡  → 넓은 존일수록 오래 걸림
  CAPTURE: {
    // 존 안의 인원수에 따른 초당 점령량(㎡/초) (4명 이상은 마지막 값)
    RATE_BY_COUNT: [0, 3, 4.5, 5.5, 6],
    SCORE_INTERVAL_SEC: 15,     // 점령한 존이 점수를 주는 간격
    DRIFT_PER_SEC: 2,           // 아무도 없을 때 게이지가 제자리로 돌아가는 속도(㎡/초)
                                //  - 주인 없는 존: 0으로 / 점령된 존: 가득으로
    OVERTIME_SEC: 90,           // 동점일 때 연장전 시간 (수정 STEP 6: 60 → 90초. 가운데 존도 버티기·점령 문제부터 다시라서 60초로는 거의 무승부)
    OVERTIME_ZONE: 'B',         // 새 STEP 2: 연장전은 가운데 핵심 존(B)에서

    // 수정 STEP 2: 점령은 "버티기 → 점령 문제 → 활성화 → 게이지" 순서
    //   존에 들어가 PREP_SEC 동안 버티면 [점령 문제 풀기]가 열리고,
    //   정답이면 우리 팀 전체가 그 존을 점령할 수 있게(활성화) 됩니다.
    PREP_SEC: 3,                // 점령 준비: 존 안에서 버텨야 하는 시간 (밖으로 나가면 처음부터)
    QUESTION_SEC: 30,           // 점령 문제 제한 시간 (푸는 동안만 무적) — 수정 STEP 6: 경기마다 교사 설정 capSeconds 로 바뀜
    RETRY_SEC: 5,               // 점령 도전 실패·포기 후 다시 도전까지
    QUESTION_GRACE_SEC: 3,      // 교사 기기가 학생 기기의 30초를 기다려 주는 여유 (인터넷 지연)
  },

  // ---------------- 수학 터미널 (STEP 11) ----------------
  // 수정 STEP 4: 에너지 터미널 = 스킬 성장. 정답마다 스킬 LEVEL +1 (최대 3).
  //   문제를 푸는 동안 무적이 아님 → 공격을 그대로 받음 (팀원이 지켜 주는 전략)
  //   문제 중 체력이 0이 되면 도전 취소(보상 없음) → 재등장 뒤 다시 터미널로
  MISSION: {
    COOLDOWN_SEC: 20,       // 미션 하나를 끝낸 뒤 다음 미션까지 기다리는 시간 (개인별)
    OWN_SIDE_ONLY: true,    // 우리 팀 쪽 터미널만 사용 가능

    SHIELD_HP: 40,          // (예전 STEP 13 개인 보호막 — 지금은 쓰지 않음, 그림 계산용으로만 남김)
    // 새 STEP 4: 넓어진 경기장에서 터미널에 다녀오는 시간만큼 손해 보지 않도록 — 정답이면 체력 가득 + 잠깐 빨리 달려 돌아감
    //   (시험 경기에서 문제를 많이 푼 팀이 오히려 지는 일이 많았음 → 수학 문제를 푸는 것이 늘 이득이 되게)
    CORRECT_FULL_HEAL: true,
    CORRECT_SPRINT_SEC: 4,  // 이 시간 동안 이동속도 ×1.25 (스피더 MAX 가속과 같은 값)
    // 오답 뒤 다시 도전까지 기다리는 시간 (점령 문제는 이 동안 무적이 풀림, 터미널 문제는 원래 무적 없음)
    RETRY_WAIT_SEC: 5,
  },

  // ---------------- 수정 STEP 5: TEAM BOOST ----------------
  // 스킬이 LEVEL 3 MAX인 학생이 에너지 터미널 문제를 맞히면, 개인 강화 대신 우리 팀 전체에 작은 도움 하나.
  // (선생님이 특수기를 "사용 안 함"으로 하면 첫 정답부터 TEAM BOOST)
  // 정답을 맞힌 학생이 4가지 중 하나를 고름. 6초 안에 안 고르면 지금 팀에 가장 필요한 것(추천)이 자동으로.
  TEAM_BOOST: {
    COOLDOWN_SEC: 30,       // 개인 쿨타임: TEAM BOOST 뒤 다음 터미널 문제까지 (계속 문제만 풀어 버프를 쌓지 못하게)
    SAME_TYPE_SEC: 20,      // 같은 종류는 팀 전체에서 이 시간 안에 다시 고를 수 없음 (중첩 방지)
    AUTO_PICK_SEC: 6,
    HEAL_PCT: 0.12,         // TEAM HEAL: 최대 체력의 12% 회복
    AMMO: 1,                // TEAM AMMO: 탄약 1발 (캐릭터 최대 탄약까지)
    SPEED_MULT: 1.1,        // TEAM SPEED: 이동속도 10% 빠르게
    SPEED_SEC: 5,           //   5초 (이미 켜져 있으면 겹치지 않고 시간만 새로)
    CHARGE: 8,              // TEAM CHARGE: 스킬 에너지 ⚡ +8
    TYPES: [
      { id: 'heal',   label: 'TEAM HEAL',   desc: '팀 전체 체력 +12%' },
      { id: 'ammo',   label: 'TEAM AMMO',   desc: '팀 전체 탄약 +1' },
      { id: 'speed',  label: 'TEAM SPEED',  desc: '팀 전체 5초 동안 10% 빠르게' },
      { id: 'charge', label: 'TEAM CHARGE', desc: '팀 전체 스킬 에너지 ⚡+8' },
    ],
  },

  // 빠른 시험용 설정: 주소 끝에 ?quick=1 을 붙이면 적용 (1분, 목표 10점, 5초마다 점수, 미션 쿨다운 10초)
  QUICK_TEST: { gameMinutes: 1, targetScore: 10, scoreInterval: 5, missionCooldown: 10 },

  // STEP 17: 소리 (audio.js)
  SOUND: {
    // 처음 음량 (0~1). 기기마다 바꾼 값은 그 기기에 기억됩니다.
    DEFAULT_VOLUME: { master: 0.8, bgm: 0.35, sfx: 0.8 },
    OUTPUT_GAIN: 2,        // 전체 소리 키움 (태블릿 스피커용). 너무 크면 줄이기
    // 소리 파일을 쓰고 싶을 때만 적기 (없으면 직접 만든 소리)
    // 예) correct: 'sounds/correct.mp3', bgm: 'sounds/bgm.mp3'
    //     (GitHub Pages 처럼 인터넷 주소로 열 때만 파일을 불러올 수 있어요)
    FILES: {},
  },

  // ---------------- 멀티플레이 (STEP 16) ----------------
  // Firebase 프로젝트 설정 (Firebase 콘솔 → 프로젝트 설정 → 내 앱에서 복사한 값)
  // ※ apiKey는 비밀번호가 아니라 "어느 프로젝트인지" 알려 주는 값이라 공개되어도 괜찮습니다.
  //   대신 Realtime Database 규칙에서 circleBattle 경로만 읽고 쓸 수 있게 해 두세요. (README 참고)
  FIREBASE: {
    apiKey: 'AIzaSyA1uJwPj_1tCBJD8I5_CNBoIi_BKFRl8t0',
    authDomain: 'amongus-re.firebaseapp.com',
    databaseURL: 'https://amongus-re-default-rtdb.asia-southeast1.firebasedatabase.app',
    projectId: 'amongus-re',
    storageBucket: 'amongus-re.firebasestorage.app',
    messagingSenderId: '278604527639',
    appId: '1:278604527639:web:b3d64320fbb2480c56c452',
  },
  NET: {
    ROOT: 'circleBattle',     // 데이터베이스 안에서 이 게임이 쓰는 폴더 (다른 게임 데이터와 섞이지 않게)
    SNAPSHOT_HZ: 10,          // 교사 기기가 경기 상황을 보내는 횟수 (초당)
    INPUT_HZ: 12,             // 학생 기기가 내 위치를 보내는 횟수 (초당)
    EVENT_KEEP_SEC: 1.2,      // 효과·알림을 몇 초 동안 반복해서 보내 줄지 (중간에 한 번 놓쳐도 받게)
    CONNECT_TIMEOUT_SEC: 8,   // 방 만들기·참가를 기다리는 최대 시간
    ROOM_STALE_HOURS: 3,      // 이보다 오래된 방 번호는 새 방에 다시 쓸 수 있음
    AWAY_SEC: 6,              // STEP 18: 학생 기기 소식이 이만큼 없으면 "자리 비움" (캐릭터가 잠시 쉼)
  },
};

/* ------------------------------------------------------------
   원의 넓이 계산 도우미
   자바스크립트는 4 × 4 × 3.14 를 50.24000000000001 처럼 계산하기 때문에
   소수 둘째 자리에서 반올림해 교과서와 같은 값을 만듭니다.
   ------------------------------------------------------------ */
function circleArea(radius) {
  return Math.round(radius * radius * CONFIG.PI * 100) / 100;
}

// 수정 STEP 3: "원주율은 3.14로 계산하세요." / "원주율은 3으로 계산하세요."
// 끝 숫자 읽기에 받침이 있으면 '으로' (영·삼·육), 없거나 ㄹ 받침이면 '로' (일·이·사·오·칠·팔·구)
function piWithParticle(pi) {
  const last = String(pi).slice(-1);
  return pi + ('036'.indexOf(last) !== -1 ? '으로' : '로');
}
function piNoteText(pi) {
  return '※ 원주율은 ' + piWithParticle(pi === undefined ? CONFIG.PI : pi) + ' 계산하세요.';
}


/* ------------------------------------------------------------
   두 원의 넓이 비교 (STEP 10)
   반지름 a → b 일 때, 넓이 비 = (a×a) : (b×b)
   예) 2 → 4 : 4 : 16 = 1 : 4 → "4배"
       3 → 4 : 9 : 16         → "약 1.8배"
       4 → 2 : 16 : 4 = 4 : 1 → "1/4배"
   ------------------------------------------------------------ */
function compareCircles(a, b) {
  const gcd = (x, y) => (y === 0 ? x : gcd(y, x % y));
  const sa = a * a, sb = b * b;
  const g = gcd(sa, sb);
  const left = sa / g, right = sb / g;
  let times;
  const exact = sb / sa;
  if (left === 1) times = right + '배';                       // 1 : 4 → 4배
  else if (right === 1) times = '1/' + left + '배';           // 4 : 1 → 1/4배
  else if (Number.isInteger(exact * 100)) times = exact + '배'; // 4 : 9 → 2.25배 (딱 나누어떨어짐)
  else times = '약 ' + (Math.round(exact * 10) / 10) + '배';  // 9 : 16 → 약 1.8배
  return {
    radiusRatio: b / a,
    areaA: circleArea(a),
    areaB: circleArea(b),
    ratioText: left + ' : ' + right,  // 가장 간단한 넓이 비
    squareText: sa + ' : ' + sb,      // 반지름×반지름 끼리의 비
    times,
  };
}
