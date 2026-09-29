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
     반지름은 학생이 2·3·4m 중에서 고르고, 비용(⚡) = 그 원의 넓이(반올림)
     (스피더 순간이동만 반지름 6m 안 어디로든, 비용 20⚡ 고정)
   ============================================================ */

const CHARACTERS = {
  blaster: {
    id: 'blaster', name: '블래스터', role: '공격형',
    hp: 100, speed: 5.0,
    attack: { name: '에너지탄', damage: 18, range: 9, reloadSec: 1.2, shape: 'bolt', speed: 16, size: 0.2 },
    special: { name: '에너지 폭발', type: 'blast', castRange: 12, damage: 30, delay: 0.5,
      desc: '원 안의 상대 모두에게 피해 30' },
    accent: '#ff6b8a', emblem: 'diamond',
  },
  guardian: {
    id: 'guardian', name: '가디언', role: '방어형',
    hp: 130, speed: 4.3,
    attack: { name: '부채꼴 충격파', damage: 22, range: 4, reloadSec: 1.6, shape: 'wave', speed: 12, size: 0.3, spreadDeg: 70 },
    special: { name: '원형 보호막', type: 'shield', castRange: 0, duration: 5,
      desc: '5초 동안 원 밖에서 오는 공격을 막음' },
    accent: '#ffd84d', emblem: 'shield',
  },
  medic: {
    id: 'medic', name: '메딕', role: '지원형',
    hp: 95, speed: 4.8,
    attack: { name: '약한 에너지탄', damage: 10, range: 10, reloadSec: 1.3, shape: 'bolt', speed: 14, size: 0.16 },
    special: { name: '원형 회복존', type: 'heal', castRange: 9, duration: 6, healPerSec: 8,
      desc: '6초 동안 원 안의 우리 팀 체력을 초당 8 회복' },
    accent: '#6dffa8', emblem: 'plus',
  },
  speeder: {
    id: 'speeder', name: '스피더', role: '기동형',
    hp: 85, speed: 6.2,
    attack: { name: '빠른 단발', damage: 14, range: 7, reloadSec: 0.9, shape: 'bolt', speed: 22, size: 0.16 },
    special: { name: '순간이동', type: 'blink', castRange: 6,
      desc: '반지름 6m 원 안 어디로든 순간이동' },
    accent: '#ff9df5', emblem: 'chevron',
  },
  engineer: {
    id: 'engineer', name: '엔지니어', role: '전략형',
    hp: 100, speed: 4.6,
    attack: { name: '에너지 구체', damage: 15, range: 8, reloadSec: 1.4, shape: 'orb', speed: 9, size: 0.38 },
    special: { name: '원형 범위 터렛', type: 'turret', castRange: 6, duration: 20,
      damage: 8, fireInterval: 1.0, boltSpeed: 14,
      desc: '20초 동안 원 안에 들어온 상대를 자동으로 공격' },
    accent: '#c49bff', emblem: 'gear',
  },
  frost: {
    id: 'frost', name: '프로스트', role: '제어형',
    hp: 100, speed: 4.7,
    attack: { name: '얼음탄', damage: 12, range: 9, reloadSec: 1.3, shape: 'bolt', speed: 15, size: 0.2 },
    special: { name: '원형 둔화지역', type: 'slow', castRange: 10, duration: 5, slowFactor: 0.6,
      desc: '5초 동안 원 안의 상대 이동속도 40% 감소' },
    accent: '#9ee8ff', emblem: 'snow',
  },
};

// 선택 화면 등에서 쓸 순서
const CHARACTER_ORDER = ['blaster', 'guardian', 'medic', 'speeder', 'engineer', 'frost'];

// 모든 캐릭터의 몸 크기(반지름, m). 크기가 같아야 공정합니다.
const PLAYER_RADIUS = 0.7;

// 탄약
const AMMO_MAX = 3;            // 최대 3발
const MIN_FIRE_INTERVAL = 0.28; // 연속으로 쏠 때 최소 간격 (초)
