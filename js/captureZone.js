/* ============================================================
   서클 배틀 - 에너지 존 (captureZone.js)
   ------------------------------------------------------------
   STEP 7: 누가 어느 원 안에 있는지 판정합니다.
     - 캐릭터의 중심이 원 안(중심까지 거리 ≤ 반지름)에 있으면 "존 안"입니다.
     - 팀별 인원수를 세고, 두 팀이 함께 있으면 "대치 중"으로 표시합니다.
     - 재충전 중인 캐릭터는 세지 않습니다.
   STEP 8: 점령과 점수
     - 한 팀만 존 안에 있으면 점령 게이지가 차오릅니다. 다 채워야 하는 양 = 존의 넓이(㎡)
     - 두 팀이 함께 있으면(대치 중) 게이지가 멈춥니다.
     - 상대가 점령한 존에 들어가면 상대 게이지를 0까지 깎은 뒤(중립) 우리 팀 게이지를 채웁니다.
     - 아무도 없으면 게이지가 천천히 제자리로 돌아갑니다.
     - 점령한 존은 일정 시간마다 팀 점수를 줍니다.
   ============================================================ */

const Zones = (function () {

  // 맵의 존 정보로 게임 중 바뀌는 상태를 만듭니다.
  function create() {
    return GameMap.zones.map((z) => ({
      id: z.id,
      x: z.x, y: z.y, r: z.r,
      area: z.area,
      points: z.points,
      counts: { SOLAR: 0, LUNAR: 0 }, // 지금 존 안에 있는 팀별 인원
      contested: false,               // 두 팀이 함께 있으면 true
      // STEP 8에서 사용할 점령 상태
      owner: null,                    // 점령한 팀 (없으면 null)
      progress: 0,                    // 점령 게이지 (0 ~ 넓이)
      progressTeam: null,             // 게이지를 채우고 있는 팀
      scoreTimer: 0,                  // 다음 점수까지 흐른 시간 (초)
      disabled: false,                // 연장전에서 쉬는 존
    }));
  }

  // 원 안에 있는지: 중심까지의 거리가 반지름 이하
  function isInside(zone, p) {
    const dx = p.x - zone.x, dy = p.y - zone.y;
    return dx * dx + dy * dy <= zone.r * zone.r;
  }

  // 플레이어가 서 있는 존 (없으면 null). 존끼리는 겹치지 않습니다.
  function zoneOf(zones, p) {
    for (const z of zones) if (isInside(z, p)) return z;
    return null;
  }

  /**
   * 존마다 팀별 인원을 다시 셉니다.
   * 각 플레이어의 p.zoneId 에 지금 서 있는 존 이름을 적어 둡니다.
   */
  function updateOccupancy(zones, players) {
    zones.forEach((z) => { z.counts.SOLAR = 0; z.counts.LUNAR = 0; });
    players.forEach((p) => {
      const z = p.alive ? zoneOf(zones, p) : null;
      p.zoneId = z ? z.id : null;
      if (z) z.counts[p.team]++;
    });
    zones.forEach((z) => { z.contested = z.counts.SOLAR > 0 && z.counts.LUNAR > 0; });
  }

  // 인원수 → 초당 점령량
  function rateFor(n) {
    const table = CONFIG.CAPTURE.RATE_BY_COUNT;
    return table[Math.min(n, table.length - 1)];
  }

  /**
   * 점령 게이지와 점수를 계산합니다.
   * @param zones          존 상태 목록
   * @param players        모든 플레이어 (점령 기여도 기록용)
   * @param dt             흐른 시간(초)
   * @param scoreInterval  점수를 주는 간격(초)
   * @returns 사건 목록
   *   { type: 'captured',    zoneId, team }         점령 완료
   *   { type: 'neutralized', zoneId, team }         team 이 가지고 있던 존을 상대가 중립으로 만듦
   *   { type: 'score',       zoneId, team, points } 점수 획득
   */
  function updateCapture(zones, players, dt, scoreInterval) {
    const events = [];
    zones.forEach((z) => {
      if (z.disabled) return;
      const s = z.counts.SOLAR, l = z.counts.LUNAR;

      if (s > 0 && l > 0) {
        // 대치 중: 게이지 멈춤
      } else if (s > 0 || l > 0) {
        const team = s > 0 ? 'SOLAR' : 'LUNAR';
        const n = s > 0 ? s : l;
        const amount = rateFor(n) * dt;
        pushGauge(z, team, amount, events);
        creditCapture(players, z.id, team, amount / n);
      } else {
        drift(z, dt);
      }

      // 점령한 존은 일정 시간마다 점수
      if (z.owner) {
        z.scoreTimer += dt;
        while (z.scoreTimer >= scoreInterval) {
          z.scoreTimer -= scoreInterval;
          events.push({ type: 'score', zoneId: z.id, team: z.owner, points: z.points });
        }
      }
    });
    return events;
  }

  // team 이 amount(㎡)만큼 게이지를 밀어붙입니다.
  function pushGauge(z, team, amount, events) {
    // 1) 우리 팀 존: 깎인 게이지를 다시 채움
    if (z.owner === team) {
      z.progress = Math.min(z.area, z.progress + amount);
      z.progressTeam = team;
      return;
    }
    // 2) 상대 팀 존이거나, 상대가 채우던 게이지: 먼저 0까지 깎음
    const enemyGauge = z.owner ? z.owner : (z.progressTeam && z.progressTeam !== team ? z.progressTeam : null);
    if (enemyGauge && z.progress > 0) {
      z.progress -= amount;
      if (z.progress > 0) return;
      amount = -z.progress; // 남은 양은 우리 게이지로
      z.progress = 0;
      if (z.owner) {
        events.push({ type: 'neutralized', zoneId: z.id, team: z.owner });
        z.owner = null;
        z.scoreTimer = 0;
      }
    }
    // 3) 중립: 우리 팀 게이지를 채움
    z.progressTeam = team;
    z.progress = Math.min(z.area, z.progress + amount);
    if (z.progress >= z.area && z.owner !== team) {
      z.owner = team;
      z.scoreTimer = 0;
      events.push({ type: 'captured', zoneId: z.id, team });
    }
  }

  // 아무도 없을 때: 주인 있는 존은 가득으로, 주인 없는 존은 0으로 천천히 돌아감
  function drift(z, dt) {
    const d = CONFIG.CAPTURE.DRIFT_PER_SEC * dt;
    if (z.owner) {
      z.progress = Math.min(z.area, z.progress + d);
      z.progressTeam = z.owner;
    } else if (z.progress > 0) {
      z.progress = Math.max(0, z.progress - d);
      if (z.progress === 0) z.progressTeam = null;
    }
  }

  // 점령 기여도: 게이지를 민 만큼(㎡) 존 안의 팀원에게 나눠 기록
  function creditCapture(players, zoneId, team, share) {
    players.forEach((p) => {
      if (p.zoneId === zoneId && p.team === team) p.stats.capture += share;
    });
  }

  return { create, isInside, zoneOf, updateOccupancy, updateCapture, rateFor };
})();
