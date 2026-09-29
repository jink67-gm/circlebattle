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

  // 원주율: 교과서와 같이 3.14를 사용합니다.
  PI: 3.14,

  // ---------------- 맵 ----------------
  // 게임 속 모든 크기는 미터(m) 단위입니다. 화면에 그릴 때만 픽셀로 바꿉니다.
  MAP: {
    WIDTH: 48,   // 가로 48m
    HEIGHT: 30,  // 세로 30m
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
  // 특수기 비용 = 선택한 원의 넓이(반올림)
  ENERGY: {
    START: 0,           // 경기 시작 때 에너지
    MAX: 60,
    ON_HIT: 3,          // 적중할 때
    PER_SEC_IN_ZONE: 1, // 에너지 존 안에 있을 때 초당
    ON_RESPAWN: 10,     // 재등장할 때
    MISSION_CORRECT: 20,            // 수학 미션: 힌트 없이 정답
    MISSION_CORRECT_AFTER_HINT: 12, // 수학 미션: 힌트를 보고 정답
    MISSION_REVEALED: 5,            // 수학 미션: 정답과 풀이를 봄 (참여 보상)
  },
  SKILL_RADII: [2, 3, 4],       // 특수기 반지름 선택지 (m)
  SPEEDER_BLINK_COST: 20,       // 스피더 순간이동은 고정 비용
  SPEEDER_BLINK_RADIUS: 6,

  // ---------------- 에너지 존 점령 ----------------
  // 점령 게이지는 존의 넓이(㎡)만큼 채워야 완료됩니다.
  //   A존 28.26㎡ / B존 50.24㎡ / C존 78.5㎡  → 넓은 존일수록 오래 걸림
  CAPTURE: {
    // 존 안의 인원수에 따른 초당 점령량(㎡/초) (4명 이상은 마지막 값)
    RATE_BY_COUNT: [0, 3, 4.5, 5.5, 6],
    SCORE_INTERVAL_SEC: 15,     // 점령한 존이 점수를 주는 간격
    DRIFT_PER_SEC: 2,           // 아무도 없을 때 게이지가 제자리로 돌아가는 속도(㎡/초)
                                //  - 주인 없는 존: 0으로 / 점령된 존: 가득으로
    OVERTIME_SEC: 60,           // 동점일 때 연장전 시간
  },

  // ---------------- 수학 터미널 (STEP 11) ----------------
  MISSION: {
    COOLDOWN_SEC: 75,       // 미션 하나를 끝낸 뒤 다음 미션까지 기다리는 시간 (개인별)
    DAMAGE_TAKEN_MULT: 0.5, // 문제를 푸는 동안 받는 피해 (0.5 = 절반)
    OWN_SIDE_ONLY: true,    // 우리 팀 쪽 터미널만 사용 가능

    // STEP 13: 정답을 맞히면 에너지와 함께 고르는 보너스 (하나만)
    // 수학을 잘하는 학생만 너무 강해지지 않도록 짧고 약하게
    REWARDS: [
      { id: 'ammo',   label: '탄약 즉시 충전', desc: '● ● ● 가득' },
      { id: 'shield', label: '5초 보호막',     desc: '피해 40까지 막아요' },
      { id: 'speed',  label: '3초 가속',       desc: '이동속도 35% 빠르게' },
    ],
    SHIELD_HP: 40,          // 개인 보호막이 막는 피해 양
    SHIELD_SEC: 5,
    SPEED_SEC: 3,
    SPEED_MULT: 1.35,
    AUTO_PICK_SEC: 6,       // 이 시간 안에 안 고르면 첫 번째(탄약) 자동 선택
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

// 특수기 비용 = 넓이를 반올림한 정수 (반지름 2 → 13, 3 → 28, 4 → 50)
function skillCost(radius) {
  return Math.round(circleArea(radius));
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
