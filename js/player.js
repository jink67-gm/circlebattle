/* ============================================================
   서클 배틀 - 플레이어 (player.js)
   ------------------------------------------------------------
   플레이어 한 명의 정보와 움직임을 계산합니다.
   움직임은 "이동 명령 {x, y}"만 받아서 계산하므로,
   명령이 키보드·조이스틱·봇·네트워크 어디서 오든 같은 코드로 움직입니다.
   ============================================================ */

const Player = (function () {
  const ACCEL = 18;      // 클수록 즉시 반응 (살짝 부드럽게 출발·정지)
  const MAX_STEP = 0.25; // 충돌 검사 한 걸음의 최대 거리 (m)

  function create(opts) {
    const p = {
      id: opts.id,
      nick: opts.nick,
      team: opts.team,
      kind: opts.kind || 'student',   // 'student' | 'teacher' | 'bot'
      isLocal: !!opts.isLocal,        // 이 기기에서 조작하는 플레이어인지
      charId: opts.charId || 'blaster',
      slot: opts.slot || 0,           // 시작 지역 안의 자리 번호 (0~4)
      x: 0, y: 0,
      vx: 0, vy: 0,
      facing: opts.team === 'LUNAR' ? Math.PI : 0, // 바라보는 방향 (라디안)
      radius: PLAYER_RADIUS,
      ammo: AMMO_MAX,         // 남은 탄약 (소수: 2.4 = 2발 + 다음 발 40% 충전)
      fireCooldown: 0,        // 다음 발사까지 기다릴 시간 (초)
      alive: true,            // 재충전 중이면 false (맞지 않고 보이지 않음)
      hitFlash: 0,            // 맞았을 때 잠깐 반짝이는 시간 (초)
      hp: 0, maxHp: 0,        // 체력 (아래 resetHp에서 캐릭터에 맞게 채움)
      hpShown: 0,             // 체력바에서 천천히 따라 줄어드는 흰 부분
      respawnTimer: 0,        // 다시 나타날 때까지 남은 시간 (초)
      protect: 0,             // 재등장 보호 남은 시간 (초)
      energy: CONFIG.ENERGY.START, // 에너지 ⚡ (스킬을 한 번 쓸 때 캐릭터마다 정해진 만큼)
      skillLevel: 0,          // 수정 STEP 4: 스킬 레벨 0(잠금)~3(MAX). 에너지 터미널 문제 정답마다 +1 (재등장해도 그대로)
      slowFactor: 1,          // 둔화지역 안이면 1보다 작아짐 (이동속도·점령 준비·점령 게이지·탄약 충전에 곱함)
      chillTimer: 0,          // 수정 STEP 5: 냉기 지역을 벗어난 뒤 남은 둔화 시간 (LEVEL 3)
      chillFactor: 1,
      kbX: 0, kbY: 0, kbT: 0, // 새 STEP 3: 블래스터 폭발에 밀려나는 중 (남은 밀림 거리 방향·시간)
      dashTimer: 0,           // 새 STEP 3: 스피더 LEVEL 3 순간이동 뒤 가속 남은 시간 (초)
      // 수학 미션 (STEP 11)
      inMission: false,       // 지금 터미널에서 문제를 푸는 중
      missionsUsed: 0,        // 이번 경기에서 끝낸 미션 수
      missionCooldown: 0,     // 다음 미션까지 남은 시간 (초)
      pendingQuestion: null,  // 닫고 나간 문제 (다음에 그대로 다시 나옴)
      missionLog: [],         // 푼 문제 기록 (STEP 19 학습 결과용)
      usedQuestionIds: [],    // 이번 경기에서 이미 푼 문제 (반복 방지)
      lastSpecial: null,      // 방금 쓴 특수기 { name, r } (게임 상황 문제용)
      // 점령 문제 (수정 STEP 2)
      capPrep: 0,             // 존 안에서 버틴 시간 (초, 3초가 되면 점령 문제를 풀 수 있음)
      capPrepZone: null,      // 버티고 있는 존
      capReady: null,         // 점령 문제를 풀 수 있는 존 (없으면 null)
      capRetry: 0,            // 점령 도전 실패·포기 후 다시 도전까지 남은 시간 (초)
      inCapQ: false,          // 점령 문제를 푸는 중 (무적 · 이동·공격·스킬 불가 · 존 인원에서 빠짐)
      capZone: null,          // 풀고 있는 점령 문제의 존
      capQTime: 0,            // 점령 문제를 연 뒤 흐른 시간 (교사 기기의 30초 확인용)
      capPending: null,       // 포기하고 닫은 점령 문제 (같은 존에서 다시 열면 같은 문제)
      // 미션 보너스 (STEP 13)
      shieldHp: 0,            // 개인 보호막이 앞으로 막을 수 있는 피해
      shieldTimer: 0,         // 개인 보호막 남은 시간 (초)
      boostTimer: 0,          // 수정 STEP 5: TEAM SPEED 남은 시간 (초)
      // 결과 화면(STEP 19)용 기록
      // capture: 점령 게이지를 민 넓이(㎡)
      // specials: 특수기 사용 횟수, healed: 우리 팀을 회복시킨 양, support: 지원 횟수
      stats: { shots: 0, hits: 0, damage: 0, knockouts: 0, recharges: 0, zoneTime: 0, capture: 0,
               specials: 0, healed: 0, support: 0 },
      zoneId: null,           // 지금 서 있는 에너지 존 ('A' / 'B' / 'C' / null)
    };
    resetHp(p);
    moveToSpawn(p);
    return p;
  }

  // ---------------- 체력 ----------------
  function resetHp(p) {
    p.maxHp = CHARACTERS[p.charId].hp;
    p.hp = p.maxHp;
    p.hpShown = p.maxHp;
  }

  /**
   * 피해를 줍니다. 체력이 0이 되면 "에너지 충전 중" 상태가 됩니다.
   * @returns {boolean} 이번 피해로 체력이 0이 되었는지
   */
  function takeDamage(p, amount, respawnSec) {
    if (!p.alive || p.protect > 0) return false;
    p.hp = Math.max(0, p.hp - amount);
    if (p.hp > 0) return false;
    p.alive = false;
    p.respawnTimer = respawnSec;
    p.vx = p.vy = 0;
    p.shieldHp = p.shieldTimer = p.boostTimer = 0; // 보너스 효과는 사라짐
    p.chillTimer = 0; p.slowFactor = 1;            // 수정 STEP 5: 남은 둔화도 사라짐
    p.kbT = 0; p.dashTimer = 0;                    // 새 STEP 3
    p.stats.recharges++;
    return true;
  }

  // 새 STEP 3: 잠깐 느리게 (프로스트 얼음탄). 이미 더 강하게 느려져 있으면 그 값을 유지
  function chill(p, factor, sec) {
    if (!p.alive || p.inCapQ) return;
    if (p.chillTimer > 0 && factor > (p.chillFactor || 1)) return; // 더 강한 둔화가 남아 있으면 그대로
    p.chillFactor = factor;
    p.chillTimer = Math.max(p.chillTimer || 0, sec);
  }

  // 회복: 실제로 회복된 양을 돌려줌 (최대 체력을 넘지 않음)
  function heal(p, amount) {
    if (!p.alive) return 0;
    const before = p.hp;
    p.hp = Math.min(p.maxHp, p.hp + amount);
    return p.hp - before;
  }

  // ---------------- 에너지 ⚡ ----------------
  // 실제로 늘어난 양을 돌려줌 (최대 60을 넘지 않음)
  function addEnergy(p, amount) {
    const before = p.energy;
    p.energy = Math.max(0, Math.min(CONFIG.ENERGY.MAX, p.energy + amount));
    return p.energy - before;
  }

  // 자기 팀 시작 지역에서 체력·탄약을 가득 채워 다시 나타납니다.
  function respawn(p) {
    p.alive = true;
    p.respawnTimer = 0;
    p.protect = CONFIG.RESPAWN.PROTECT_SEC;
    p.ammo = AMMO_MAX;
    p.fireCooldown = 0;
    p.hitFlash = 0;
    p.facing = p.team === 'LUNAR' ? Math.PI : 0;
    p.capPrep = 0;
    p.capPrepZone = null;
    p.capReady = null;
    resetHp(p);
    moveToSpawn(p);
  }

  // 보호 시간, 미션 보너스 시간, 체력바 애니메이션
  // (STEP 16 학생 기기는 재등장 판정 없이 이것만 계산 — 재등장은 교사 기기가 정함)
  function updateTimers(p, dt) {
    if (p.protect > 0) p.protect = Math.max(0, p.protect - dt);
    if (p.capRetry > 0) p.capRetry = Math.max(0, p.capRetry - dt); // 점령 재도전 대기
    // 미션 보너스 시간
    if (p.shieldTimer > 0) {
      p.shieldTimer = Math.max(0, p.shieldTimer - dt);
      if (p.shieldTimer === 0) p.shieldHp = 0;
    }
    if (p.boostTimer > 0) p.boostTimer = Math.max(0, p.boostTimer - dt);
    if (p.dashTimer > 0) p.dashTimer = Math.max(0, p.dashTimer - dt); // 새 STEP 3
    // 흰 부분이 실제 체력까지 천천히 따라 내려옴
    if (p.hpShown > p.hp) p.hpShown = Math.max(p.hp, p.hpShown - p.maxHp * 0.8 * dt);
    else p.hpShown = p.hp;
  }

  // 재충전 타이머, 보호 시간, 체력바 애니메이션
  // @returns {boolean} 이번 프레임에 다시 나타났는지
  function updateLife(p, dt) {
    updateTimers(p, dt);

    if (p.alive) return false;
    p.respawnTimer -= dt;
    if (p.respawnTimer <= 0) {
      respawn(p);
      return true;
    }
    return false;
  }

  // 팀 시작 지역 안에서 자리 번호에 맞춰 세로로 나란히 섭니다.
  function spawnPoint(team, slot) {
    const s = GameMap.spawns[team];
    const slots = 5;
    const gap = (s.h - 2) / (slots - 1);
    return {
      x: s.x + s.w / 2,
      y: s.y + 1 + (slot % slots) * gap,
    };
  }

  function moveToSpawn(p) {
    const pt = spawnPoint(p.team, p.slot);
    p.x = pt.x;
    p.y = pt.y;
    p.vx = p.vy = 0;
  }

  // 캐릭터를 바꾸면 그 캐릭터의 체력으로 가득 채웁니다.
  function setCharacter(p, charId) {
    if (!CHARACTERS[charId]) return;
    p.charId = charId;
    resetHp(p);
  }

  // ---------------- 탄약 ----------------
  // 탄약은 시간이 지나면 한 발씩 자동으로 찹니다. (캐릭터마다 충전 시간이 다름)
  function updateAmmo(p, dt) {
    const reload = CHARACTERS[p.charId].attack.reloadSec;
    // 새 STEP 4: 얼면(둔화) 탄약도 같은 비율로 느리게 참 — 프로스트가 싸움에서도 쓸모 있게 (손이 얼어서 느려짐)
    if (p.ammo < AMMO_MAX) p.ammo = Math.min(AMMO_MAX, p.ammo + dt * (p.slowFactor || 1) / reload);
    if (p.fireCooldown > 0) p.fireCooldown = Math.max(0, p.fireCooldown - dt);
  }

  function canFire(p) {
    return p.ammo >= 1 && p.fireCooldown <= 0;
  }

  function useAmmo(p) {
    p.ammo -= 1;
    p.fireCooldown = MIN_FIRE_INTERVAL;
    p.stats.shots++;
  }

  /**
   * @param p        플레이어
   * @param move     이동 명령 {x, y} (길이 0~1)
   * @param dt       지난 프레임부터 흐른 시간(초)
   * @param aimAngle 조준 방향 (없으면 움직이는 방향을 바라봄)
   */
  /**
   * 새 STEP 3: 블래스터 폭발에 밀려남. (dx, dy) = 밀려날 거리(m)와 방향
   * KNOCK_SEC 동안 처음엔 빠르게, 점점 느리게 미끄러짐 → 합하면 정확히 그 거리. 벽에는 막힘
   */
  function knock(p, dx, dy) {
    if (!p.alive || p.inCapQ) return;
    const T = CONFIG.SKILL_FX.KNOCK_SEC;
    p.kbX = dx * 2 / T;  // 처음 속도 (선형으로 줄어들면 거리 = 속도 × T / 2)
    p.kbY = dy * 2 / T;
    p.kbT = T;
  }

  function update(p, move, dt, aimAngle) {
    if (!p.alive) return; // 재충전 중에는 움직이지 않음
    // 둔화지역이면 느려지고, TEAM SPEED(수정 STEP 5)면 빨라짐 — 서로 곱해져서 덮어쓰지 않음
    // 새 STEP 3: 스피더 MAX 가속도 곱하기 (둔화를 덮어쓰지 않음)
    const boost = (p.boostTimer > 0 ? CONFIG.TEAM_BOOST.SPEED_MULT : 1) * (p.dashTimer > 0 ? CONFIG.SKILL_FX.DASH_MULT : 1);
    const speed = CHARACTERS[p.charId].speed * (p.slowFactor || 1) * boost;
    const targetVx = move.x * speed;
    const targetVy = move.y * speed;
    const k = Math.min(1, dt * ACCEL);
    p.vx += (targetVx - p.vx) * k;
    p.vy += (targetVy - p.vy) * k;
    // 아주 느린 움직임은 멈춘 것으로
    if (Math.abs(p.vx) < 0.01) p.vx = 0;
    if (Math.abs(p.vy) < 0.01) p.vy = 0;

    // 한 번에 크게 움직이면 얇은 벽을 뚫고 지나갈 수 있으므로
    // 이동을 0.25m 이하의 작은 걸음으로 나눠, 걸음마다 벽 충돌을 검사합니다.
    // 새 STEP 3: 밀려나는 중이면 그 속도를 더함 (시간이 지날수록 약해짐)
    let kx = 0, ky = 0;
    if (p.kbT > 0) {
      const T = CONFIG.SKILL_FX.KNOCK_SEC;
      const t0 = p.kbT, t1 = Math.max(0, p.kbT - dt);
      // 이번 프레임 동안 평균 속도 (선형 감소를 정확히 적분)
      const k = dt > 0 ? ((t0 * t0 - t1 * t1) / (2 * T)) / dt : 0;
      kx = p.kbX * k; ky = p.kbY * k;
      p.kbT = t1;
      if (p.inCapQ) p.kbT = 0;
    }
    const mvx = p.vx + kx, mvy = p.vy + ky;
    const dist = Math.hypot(mvx * dt, mvy * dt);
    const steps = Math.max(1, Math.ceil(dist / MAX_STEP));
    const sdt = dt / steps;
    for (let i = 0; i < steps; i++) {
      p.x += mvx * sdt;
      p.y += mvy * sdt;
      Collision.resolveCircle(p); // 벽·장애물·경기장 테두리 밖으로 밀어내기
    }

    // 조준 중이면 조준 방향을, 아니면 움직이는 방향을 바라봅니다.
    if (aimAngle !== undefined && aimAngle !== null) p.facing = aimAngle;
    else if (move.x !== 0 || move.y !== 0) p.facing = Math.atan2(move.y, move.x);

    updateAmmo(p, dt);
  }

  return {
    create, update, setCharacter, moveToSpawn, spawnPoint, canFire, useAmmo,
    takeDamage, respawn, updateLife, updateTimers, addEnergy, heal, knock, chill,
  };
})();
