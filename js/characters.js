/* ============================================================
   서클 배틀 - 캐릭터 6종 (characters.js)
   ------------------------------------------------------------
   모든 캐릭터 능력치는 이 파일에서 관리합니다. (플레이 테스트 후 조절)
   거리·속도 단위: m, m/s   /  시간 단위: 초
   STEP 2에서는 speed(이동속도)와 모양만 사용하고,
   나머지 값은 STEP 4~9에서 공격·특수기를 만들 때 사용합니다.

   attack 안의 값
     damage     한 번 맞혔을 때 피해 (STEP 5)
     range      사거리 (m)
     reloadSec  탄약 1발이 다시 차는 시간 (초)
     shape      'bolt' 직선 탄 / 'orb' 느리고 큰 구체 / 'wave' 부채꼴 충격파
     speed      탄 속도 (m/s)
     size       탄 반지름 (m)
     spreadDeg  부채꼴 충격파의 벌어진 각도 (도)

   special 안의 값 (STEP 9)
     type       'blast' 폭발 / 'shield' 보호막 / 'heal' 회복존 / 'blink' 순간이동
                'turret' 터렛 / 'slow' 둔화지역
     castRange  원의 중심을 놓을 수 있는 최대 거리 (m). 0이면 내 자리
     cost       한 번 쓰는 데 드는 에너지(⚡) — 레벨과 상관없이 같음 (수정 STEP 4)
     levels     수정 STEP 4: 스킬 성장 LEVEL 1·2·3 (에너지 터미널 문제를 맞힐 때마다 한 단계)
                경기 시작은 LEVEL 0(잠금). 1번째 정답 LEVEL 1 해금 → 2번째 LEVEL 2 → 3번째 LEVEL 3 MAX
                r         효과 범위 원의 반지름 (m) — 스피더는 순간이동할 수 있는 원의 반지름
                duration  지속 시간 (초)
                그 밖에   damage 피해 / healPerSec 초당 회복 / slowFactor 이동속도에 곱하는 값 / fireInterval 터렛 발사 간격
                LEVEL 2·3 은 학생이 바로 느낄 만큼 (범위·시간·효과가 함께) 강해지도록 정했습니다.
                새 STEP 3: 캐릭터마다 "색만 다른 캐릭터"가 되지 않도록 고유한 효과를 더했습니다.
                  knockback  블래스터: 원 안의 상대를 원 밖 방향으로 밀어내는 거리 (m) — 존에서 밀어내기
                  shieldHp   가디언: 보호막이 막을 수 있는 피해의 양 (다 막으면 깨짐)
                  fortify    가디언 LEVEL 3: 보호막 안 우리 팀은 밀려나지 않고 느려지지 않음
                  burst      메딕 LEVEL 3: 놓자마자 원 안 우리 팀을 바로 회복하는 양
                  dash       스피더 LEVEL 3: 도착한 뒤 더 빨리 달리는 시간 (초)
                  hp         엔지니어: 터렛 체력 (상대가 쏘면 부서짐, 엔지니어 한 명당 터렛 1개)
                  sensor     엔지니어 LEVEL 3: 터렛 원 안의 부쉬에 숨은 상대를 드러냄
   ultimate      궁극기 (터미널 LEVEL 2 해금 · LEVEL 3 MAX 강화). levels[0] = LEVEL 2, levels[1] = LEVEL 3
                 게이지 100%가 되면 쓸 수 있고, 쓰면 0%로. 게이지는 캐릭터 역할에 맞는 행동으로 참 (config.js ULTIMATE)
   attack.chill  새 STEP 3 프로스트 기본 공격: 맞은 상대를 잠깐 느리게 { factor, sec }
   ============================================================ */

const CHARACTERS = {
  blaster: {
    id: 'blaster', name: '블래스터', role: '공격형', tagline: '강한 3발 공격',
    // 새 STEP 4 밸런스: 3:3 교전 실험에서 혼자 이기는 판이 너무 많아 체력 100 → 95, 탄 18 → 16, 충전 1.2 → 1.3초
    hp: 95, speed: 5.0,
    // 새 STEP 3: 탄이 조금 더 빠르고 커서 맞히는 손맛이 좋음 (중거리 공격형)
    // PNG 캐릭터 적용: 캐릭터마다 탄약 수가 다름 — 블래스터는 3발뿐이지만 한 발이 가장 셈 (16 → 18, 충전 1.3 → 1.45초)
    attack: { name: '에너지탄', damage: 18, range: 9, reloadSec: 1.45, ammo: 3, shape: 'bolt', speed: 18, size: 0.23 },
    special: { name: '에너지 폭발', type: 'blast', castRange: 12, delay: 0.5, cost: 25,
      desc: '고른 곳에 원을 놓으면 0.5초 뒤 원 안의 상대에게 피해 + 원 밖으로 밀어냄 (존에서 밀어내기)',
      levels: [
        // 새 STEP 4: 밀어내기가 생긴 만큼 피해는 25·30·40 → 20·25·30 (밀어내기가 이 캐릭터의 핵심)
        { r: 2, damage: 20, knockback: 1.2 },
        { r: 3, damage: 25, knockback: 1.8 },
        { r: 4, damage: 30, knockback: 3.0 }, // MAX: 원도 크고 훨씬 멀리 밀어냄
      ] },
    // 궁극기 (LEVEL 2 해금 · LEVEL 3 강화): 짧게 모은 뒤 큰 에너지탄이 직선으로 날아감 — 여러 명 관통 + 밀어냄 (벽에서는 멈춤)
    //   한 번에 쓰러뜨리지 못하게 피해는 상대 최대 체력의 60%를 넘지 않음 (즉사 불가)
    ultimate: { name: '메가 에너지 캐논', desc: '0.5초 모은 뒤 큰 에너지탄 발사 · 여러 명 관통 · 뒤로 밀어냄',
      levels: [
        { charge: 0.5, damage: 42, range: 16, width: 0.7, speed: 24, knockback: 2.2 },
        { charge: 0.5, damage: 52, range: 20, width: 0.85, speed: 26, knockback: 3.0 },
      ] },
    accent: '#ff6b8a', emblem: 'diamond',
  },
  guardian: {
    id: 'guardian', name: '가디언', role: '방어형', tagline: '튼튼한 방어형',
    hp: 130, speed: 4.3,
    // 새 STEP 3: 공격도 가장 세고 보호막도 무적이던 것을 조정 — 충격파 22 → 17, 보호막은 막는 양이 있음
    // PNG 캐릭터 적용: 탄약·공격력 보통 (4발 · 17 → 15, 충전 1.6 → 1.5초) — 대신 체력이 가장 높음
    attack: { name: '부채꼴 충격파', damage: 15, range: 4, reloadSec: 1.5, ammo: 4, shape: 'wave', speed: 12, size: 0.3, spreadDeg: 70 },
    special: { name: '원형 보호막', type: 'shield', castRange: 0, cost: 25,
      desc: '내 자리에 원을 만들어 원 밖에서 오는 공격을 막음 (막는 양을 다 쓰면 깨짐)',
      levels: [
        { r: 2, duration: 4, shieldHp: 60 },
        { r: 3, duration: 5, shieldHp: 90 },
        { r: 4, duration: 6, shieldHp: 130, fortify: true }, // MAX: 안의 우리 팀은 밀려나지 않고 느려지지 않음
      ] },
    // 궁극기: 가디언을 따라다니는 큰 보호 영역 — 안의 우리 팀은 받는 피해가 크게 줄고 잘 밀려나지 않음 (무적은 아님)
    ultimate: { name: '절대 수호', desc: '내 둘레 큰 보호 영역 · 안의 우리 팀 받는 피해 크게 감소 · 잘 밀려나지 않음',
      levels: [
        { r: 5, duration: 5, reduce: 0.5, knockMult: 0.25 },   // 받는 피해 50% 줄임, 밀려나는 거리 1/4
        { r: 6, duration: 6.5, reduce: 0.6, knockMult: 0.1 },
      ] },
    accent: '#ffd84d', emblem: 'shield',
  },
  medic: {
    id: 'medic', name: '메딕', role: '지원형', tagline: '약하지만 많이 쏘는 지원형',
    hp: 95, speed: 4.8,
    // 새 STEP 4: 스킬이 잠겨 있어도 팀에 도움이 되도록 — 메딕 둘레 3m 안의 우리 팀(메딕 자신은 빼고)이 1초에 1.5씩 회복
    passive: { name: '회복 오라', r: 3, healPerSec: 1.5 },
    // 새 STEP 4: 스킬이 잠긴 경기 초반에 너무 약해서 탄 10 → 12 (+ 회복 오라)
    // PNG 캐릭터 적용: 탄약이 가장 많고(6발) 빨리 차지만 한 발은 약함 (12 → 9, 충전 1.3 → 0.95초) — 빠른 견제
    attack: { name: '약한 에너지탄', damage: 9, range: 10, reloadSec: 0.95, ammo: 6, shape: 'bolt', speed: 14, size: 0.16 },
    special: { name: '원형 회복존', type: 'heal', castRange: 9, cost: 25,
      desc: '원 안의 우리 팀 체력을 매초 회복',
      levels: [
        // 새 STEP 4: 1초 회복 8·10·12 → 9·11·13 / PNG 캐릭터 적용: 탄약이 많아진 만큼 MAX 는 13 → 12, 놓자마자 +15 → +10
        { r: 2, duration: 5, healPerSec: 9 },
        { r: 3, duration: 6, healPerSec: 11 },
        { r: 4, duration: 7, healPerSec: 12, burst: 10 }, // MAX: 놓자마자 +10 바로 회복
      ] },
    // 궁극기: 둘레 넓은 범위의 우리 팀을 바로 크게 회복 + 짧은 지속 회복 (한 번에 100% 회복은 아님)
    ultimate: { name: '생명 에너지 폭발', desc: '넓은 원 안 우리 팀을 바로 크게 회복 + 몇 초 동안 조금씩 더 회복',
      levels: [
        { r: 6, healPct: 0.35, regenPct: 0.04, regenSec: 4 },  // 바로 최대 체력의 35% + 1초에 4%씩 4초
        { r: 7, healPct: 0.45, regenPct: 0.05, regenSec: 5 },
      ] },
    accent: '#6dffa8', emblem: 'plus',
  },
  speeder: {
    id: 'speeder', name: '스피더', role: '기동형', tagline: '빠른 기동형',
    // 새 STEP 4: 3:3 교전에서 너무 쉽게 쓰러져 체력 85 → 90, 충전 0.9 → 0.85초 (+ 순간이동 뒤 기습탄)
    hp: 90, speed: 6.2,
    // 새 STEP 3: 빠른 공격수가 되지 않도록 단발 피해 14 → 12 (대신 이동·우회·기습에 강함)
    // PNG 캐릭터 적용: 탄약 많은 편(5발) + 가장 빠른 충전 (0.85 → 0.8초)
    attack: { name: '빠른 단발', damage: 12, range: 7, reloadSec: 0.8, ammo: 5, shape: 'bolt', speed: 22, size: 0.16 },
    special: { name: '순간이동', type: 'blink', cost: 20,
      desc: '내 주변 원 안 어디로든 순간이동 · 도착 뒤 2초 안 첫 탄 1.5배(기습) · 부쉬 안에서 써도 드러나지 않음',
      levels: [
        { r: 5 },
        { r: 7 },
        { r: 9, dash: 1.5 }, // MAX: 도착한 뒤 1.5초 동안 더 빠르게
      ] },
    // 궁극기: 잠깐 아주 빨라지고 순간이동이 강해짐 (빠른 우회·기습·탈출, 무적은 아님)
    ultimate: { name: '초고속 돌파', desc: '잠깐 이동속도 크게 증가 · 순간이동 거리 증가 · 순간이동 에너지 절약',
      levels: [
        { duration: 5, speedMult: 1.55, blinkRangeMult: 1.3, blinkCostMult: 0.5 },
        { duration: 6, speedMult: 1.7, blinkRangeMult: 1.4, blinkCostMult: 0 },   // MAX: 순간이동 에너지 0
      ] },
    accent: '#ff9df5', emblem: 'chevron',
  },
  engineer: {
    id: 'engineer', name: '엔지니어', role: '전략형', tagline: '장치 설치 전략형',
    hp: 100, speed: 4.6,
    // PNG 캐릭터 적용: 기본 공격은 보통보다 조금 약하게 (4발 · 15 → 13, 충전 1.4 → 1.2초) — 터렛이 핵심
    attack: { name: '에너지 구체', damage: 13, range: 8, reloadSec: 1.2, ammo: 4, shape: 'orb', speed: 9, size: 0.38 },
    // 새 STEP 3: 가장 강하던 터렛 조정 — 한 명당 1개, 체력이 있어 상대가 부술 수 있음, 시간·피해 조금 줄임
    special: { name: '원형 범위 터렛', type: 'turret', castRange: 6, boltSpeed: 14, cost: 30,
      desc: '원 안에 들어온 상대를 터렛이 자동으로 공격 (한 명당 1개 · 상대가 쏘면 부서짐)',
      levels: [
        { r: 3, duration: 12, damage: 6, fireInterval: 1.0, hp: 40 },
        { r: 4, duration: 14, damage: 8, fireInterval: 1.0, hp: 55 },
        { r: 5, duration: 16, damage: 9, fireInterval: 0.8, hp: 70, sensor: true }, // MAX: 원 안 부쉬에 숨은 상대를 드러냄
      ] },
    // 궁극기: 엔지니어 곁을 따라다니며 가까운 상대를 자동으로 쏘는 지원 드론 (부서지지 않고 시간이 끝나면 사라짐)
    //   터렛(제자리 방어)과 달리 따라다니며 견제 → 엔지니어가 앞으로 나갈 때 힘이 됨
    ultimate: { name: '전투 지원 드론', desc: '나를 따라다니며 가까운 상대를 자동 공격하는 드론 소환',
      levels: [
        { duration: 10, range: 6.5, interval: 0.7, damage: 7 },
        { duration: 13, range: 7.5, interval: 0.55, damage: 8 },
      ] },
    accent: '#c49bff', emblem: 'gear',
  },
  frost: {
    id: 'frost', name: '프로스트', role: '제어형', tagline: '상대를 느리게 만드는 제어형',
    hp: 100, speed: 4.7,
    // 새 STEP 3: 얼음탄에 맞으면 1초 동안 조금(15%) 느려짐 → 기본 공격부터 제어형
    // 새 STEP 4: 교전에서 가장 약해서 얼음탄 12 → 14, 탄 속도 15 → 17 (+ 얼면 탄약 충전도 느려짐)
    // PNG 캐릭터 적용: 4발 · 공격력 조금 낮게 14 → 13, 충전 1.3 → 1.15초 — 둔화와 지역 제어가 핵심
    attack: { name: '얼음탄', damage: 13, range: 9, reloadSec: 1.15, ammo: 4, shape: 'bolt', speed: 17, size: 0.2,
      chill: { factor: 0.85, sec: 1.0 } },
    special: { name: '원형 둔화지역', type: 'slow', castRange: 10, cost: 25,
      // 수정 STEP 5: 제어형 — 느려진 상대는 이동뿐 아니라 점령 준비(3초 버티기)와 점령 게이지도 같은 비율로 느려짐
      desc: '원 안의 상대 이동속도를 줄이고, 점령 준비·점령 게이지·탄약 충전도 느리게 만듦',
      levels: [
        { r: 3, duration: 5, slowFactor: 0.75 },
        { r: 4, duration: 6, slowFactor: 0.65 },
        { r: 5, duration: 7, slowFactor: 0.55, linger: 1.5 }, // 수정 STEP 5: 원을 벗어나도 1.5초 더 느림
      ] },
    // 궁극기: 내 자리에 넓은 냉기 영역 — 안의 상대가 크게 느려지고, 벗어나도 1초 더 느림 (완전히 얼리지는 않음)
    ultimate: { name: '절대 빙결 지대', desc: '넓은 냉기 영역 · 안의 상대 이동속도 크게 감소 · 벗어나도 1초 더',
      levels: [
        { r: 6, duration: 5, slowFactor: 0.45, linger: 1.0 },
        { r: 7, duration: 6, slowFactor: 0.4, linger: 1.0 },
      ] },
    accent: '#9ee8ff', emblem: 'snow',
  },
};

// 선택 화면 등에서 쓸 순서
const CHARACTER_ORDER = ['blaster', 'guardian', 'medic', 'speeder', 'engineer', 'frost'];

// 모든 캐릭터의 몸 크기(반지름, m). 크기가 같아야 공정합니다.
const PLAYER_RADIUS = 0.7;

// 수정 STEP 4: 스킬 레벨 (0 = 잠금, 3 = MAX)
const SKILL_LEVEL_MAX = 3;
// 궁극기: 에너지 터미널 LEVEL 2 에서 해금 (LEVEL 1 고유 스킬 → LEVEL 2 궁극기 → LEVEL 3 MAX 스킬·궁극기 강화)
const ULT_UNLOCK_LEVEL = 2;

// 탄약
const AMMO_MAX = 3;            // 기본 3발 (캐릭터마다 attack.ammo 로 다름)
// 캐릭터별 탄약 수 — 블래스터는 적고 강하게, 메딕·스피더는 많이 (캐릭터를 바꾸면 쏘는 느낌이 달라지게)
function ammoMaxOf(charId) {
  const c = CHARACTERS[charId];
  return (c && c.attack.ammo) || AMMO_MAX;
}
const MIN_FIRE_INTERVAL = 0.28; // 연속으로 쏠 때 최소 간격 (초)
