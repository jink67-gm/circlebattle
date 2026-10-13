/* ============================================================
   서클 배틀 - 발사체 (projectile.js)
   ------------------------------------------------------------
   기본 공격으로 나가는 탄을 만들고 움직입니다.
     bolt : 직선 에너지탄 (블래스터, 메딕, 스피더, 프로스트)
     orb  : 느리고 큰 에너지 구체 (엔지니어)
     wave : 부채꼴로 퍼지는 충격파 (가디언)
   탄은 사거리만큼 날아가면 사라집니다.

   STEP 5: 충돌
   - 직선탄·구체: 벽·장애물·경기장 테두리에 닿으면 사라짐.
                  상대 팀 캐릭터에 닿으면 사라지고 "맞힘"을 알림.
                  같은 팀과 쏜 사람 자신은 그냥 통과.
   - 충격파: 부채꼴 안에 들어온 상대를 한 명당 한 번만 맞힘.
            벽 뒤에 숨은 상대는 맞지 않음.
   새 STEP 3: 상대 엔지니어 터렛 몸체에 닿으면 터렛이 맞음 (터렛 체력이 줄어듦)
   update()는 무슨 일이 있었는지 "사건 목록"을 돌려줍니다.
   (피해를 실제로 깎는 것은 게임(game.js)이 사건을 보고 처리 → 네트워크 연결이 쉬움)
   ============================================================ */

const Projectiles = (function () {
  let nextId = 1;

  /**
   * 플레이어가 angle 방향으로 기본 공격을 쏩니다. 새 탄 하나를 돌려줍니다.
   * override: 기본 공격 대신 쓸 값 (예: 엔지니어 터렛의 탄) { damage, speed, size, range, shape }
   */
  function create(owner, angle, override) {
    const atk = override ? { ...CHARACTERS[owner.charId].attack, ...override }
                         : CHARACTERS[owner.charId].attack;
    const dirX = Math.cos(angle), dirY = Math.sin(angle);
    // 캐릭터 몸 가장자리에서 출발
    const start = owner.radius * 0.8;
    return {
      id: owner.id + '-' + (nextId++),
      ownerId: owner.id,
      team: owner.team,
      charId: owner.charId,
      shape: atk.shape,
      damage: atk.damage,
      x: owner.x + dirX * start,
      y: owner.y + dirY * start,
      originX: owner.x,          // 부채꼴 충격파의 중심
      originY: owner.y,
      angle,
      dirX, dirY,
      speed: atk.speed,
      size: atk.size,
      spread: (atk.spreadDeg || 0) * Math.PI / 180,
      range: atk.range,
      traveled: start,           // 출발점(캐릭터 중심)에서 온 거리
      dead: false,
      firstFrame: true,          // 첫 프레임에는 캐릭터 중심부터 충돌 검사
      hitIds: [],                // 충격파가 이미 맞힌 상대 (한 명당 한 번만)
      fromTurret: !!atk.fromTurret, // 터렛이 쏜 탄 (에너지 +3 없음)
      fromDrone: !!atk.fromDrone,   // 궁극기: 엔지니어 드론이 쏜 탄 (궁극기 게이지를 채우지 않음)
      ambush: !!atk.ambush,         // 새 STEP 4: 스피더 기습탄 (1.5배)
    };
  }

  // 가디언 에너지 방벽(원의 앞쪽 호)을 처음 지나는 지점의 t — 상대 팀 방벽만 탄을 막음
  function shieldHitT(b, x0, y0, x1, y1, areas) {
    let best = null, which = null;
    if (!areas || typeof Skills === 'undefined') return null;
    for (const a of areas) {
      if (a.kind !== 'shield' || a.team === b.team || a.dead) continue;
      const t = Skills.wallHitT(a, x0, y0, x1, y1);
      if (t !== null && (best === null || t < best)) { best = t; which = a; }
    }
    return best === null ? null : { t: best, area: which };
  }

  // 맞을 수 있는 상대인지 (같은 팀, 재충전 중인 캐릭터는 제외)
  // 수정 STEP 2: 점령 문제를 푸는 학생(무적)은 탄이 그냥 지나감 → 친구를 대신 막아 주는 방패가 되지 않음
  function canHit(b, p) {
    return p.team !== b.team && p.alive !== false && !p.inCapQ;
  }

  /**
   * @param list    탄 목록
   * @param dt      흐른 시간(초)
   * @param players 모든 플레이어
   * @returns 사건 목록
   *   { type: 'wall', x, y, team, charId }                      벽에 막힘
   *   { type: 'hit', targetId, ownerId, damage, x, y, team, charId } 상대를 맞힘
   *   { type: 'blocked', areaId, x, y, team, charId, damage }    보호막에 막힘 (STEP 9) — 새 STEP 3: 막은 피해만큼 보호막이 약해짐
   *   { type: 'turretHit', areaId, damage, x, y, team, charId, ownerId } 새 STEP 3: 상대 터렛을 맞힘
   * @param areas   특수기 원 목록 (보호막이 탄을 막음)
   */
  function update(list, dt, players, areas) {
    const events = [];
    for (const b of list) {
      if (b.shape === 'wave') updateWave(b, dt, players, events, areas);
      else updateBolt(b, dt, players, events, areas);
    }
    // 사라진 탄 정리 (배열을 새로 만들지 않고 앞으로 당겨 태블릿 부담을 줄임)
    let w = 0;
    for (let i = 0; i < list.length; i++) if (!list[i].dead) list[w++] = list[i];
    list.length = w;
    return events;
  }

  // ---------------- 직선탄·구체 ----------------
  function updateBolt(b, dt, players, events, areas) {
    // 이번 프레임에 갈 거리 (사거리를 넘지 않게)
    const step = Math.min(b.speed * dt, b.range - b.traveled);
    // 첫 프레임은 쏜 사람 몸 중심부터 검사 → 벽에 붙어서 쏴도 벽 너머로 나가지 않음
    const x0 = b.firstFrame ? b.originX : b.x;
    const y0 = b.firstFrame ? b.originY : b.y;
    const x1 = b.x + b.dirX * step;
    const y1 = b.y + b.dirY * step;
    b.firstFrame = false;

    // 1) 벽에 먼저 닿는 지점
    let bestT = Collision.segmentHitsSolid(x0, y0, x1, y1, b.size);
    let target = null;

    // 2) 상대 캐릭터에 먼저 닿는 지점
    for (const p of players) {
      if (!canHit(b, p)) continue;
      const t = Collision.segmentCircle(x0, y0, x1, y1, p.x, p.y, p.radius + b.size);
      if (t !== null && (bestT === null || t < bestT)) {
        bestT = t;
        target = p;
      }
    }

    // 3) 상대 보호막에 먼저 닿는 지점
    const sh = shieldHitT(b, x0, y0, x1, y1, areas);
    let shield = null;
    if (sh && (bestT === null || sh.t < bestT)) {
      bestT = sh.t;
      target = null;
      shield = sh.area;
    }

    // 4) 새 STEP 3: 상대 터렛 몸체
    let turret = null;
    if (areas) {
      const body = CONFIG.SKILL_FX.TURRET_BODY + b.size;
      for (const a of areas) {
        if (a.kind !== 'turret' || a.team === b.team || a.dead) continue;
        const t = Collision.segmentCircle(x0, y0, x1, y1, a.x, a.y, body);
        if (t !== null && (bestT === null || t < bestT)) { bestT = t; target = null; shield = null; turret = a; }
      }
    }

    if (bestT !== null) {
      // 부딪힌 자리에서 멈추고 사라짐
      b.x = x0 + (x1 - x0) * bestT;
      b.y = y0 + (y1 - y0) * bestT;
      b.dead = true;
      if (turret) {
        events.push({ type: 'turretHit', areaId: turret.id, damage: b.damage, x: b.x, y: b.y,
          team: b.team, charId: b.charId, ownerId: b.ownerId });
      } else if (shield) {
        events.push({ type: 'blocked', areaId: shield.id, x: b.x, y: b.y, team: b.team, charId: b.charId, damage: b.damage });
      } else if (target) {
        events.push({ type: 'hit', targetId: target.id, ownerId: b.ownerId, damage: b.damage,
          x: b.x, y: b.y, team: b.team, charId: b.charId, fromTurret: b.fromTurret, fromDrone: b.fromDrone, ambush: b.ambush });
      } else {
        events.push({ type: 'wall', x: b.x, y: b.y, team: b.team, charId: b.charId });
      }
      return;
    }

    b.x = x1;
    b.y = y1;
    b.traveled += step;
    if (b.traveled >= b.range - 1e-6) b.dead = true;
  }

  // ---------------- 부채꼴 충격파 ----------------
  function updateWave(b, dt, players, events, areas) {
    b.traveled = Math.min(b.range, b.traveled + b.speed * dt);
    const half = b.spread / 2;

    for (const p of players) {
      if (!canHit(b, p) || b.hitIds.indexOf(p.id) !== -1) continue;
      const dx = p.x - b.originX, dy = p.y - b.originY;
      const d = Math.hypot(dx, dy);
      // 충격파 앞부분이 상대 몸 가장자리에 닿았는지
      if (d - p.radius > b.traveled) continue;
      // 부채꼴 각도 안인지 (몸 크기만큼 여유)
      let diff = Math.abs(Math.atan2(dy, dx) - b.angle);
      if (diff > Math.PI) diff = Math.PI * 2 - diff;
      const edge = d > p.radius ? Math.asin(p.radius / d) : Math.PI;
      if (diff > half + edge) continue;
      // 벽 뒤에 있으면 맞지 않음
      if (Collision.lineBlocked(b.originX, b.originY, p.x, p.y)) continue;

      b.hitIds.push(p.id);
      // 상대 보호막 안에 있고 충격파가 밖에서 왔으면 막힘
      const shield = areas && typeof Skills !== 'undefined' ? Skills.isShielded(p, b.originX, b.originY, areas) : null;
      if (shield) {
        events.push({ type: 'blocked', areaId: shield.id, x: p.x - dx / (d || 1) * p.radius,
          y: p.y - dy / (d || 1) * p.radius, team: b.team, charId: b.charId, damage: b.damage });
        continue;
      }
      events.push({ type: 'hit', targetId: p.id, ownerId: b.ownerId, damage: b.damage,
        x: p.x - dx / (d || 1) * p.radius, y: p.y - dy / (d || 1) * p.radius,
        team: b.team, charId: b.charId });
    }

    // 새 STEP 3: 부채꼴 안의 상대 터렛
    if (areas) {
      const body = CONFIG.SKILL_FX.TURRET_BODY;
      for (const a of areas) {
        if (a.kind !== 'turret' || a.team === b.team || a.dead || b.hitIds.indexOf(a.id) !== -1) continue;
        const dx = a.x - b.originX, dy = a.y - b.originY;
        const d = Math.hypot(dx, dy);
        if (d - body > b.traveled) continue;
        let diff = Math.abs(Math.atan2(dy, dx) - b.angle);
        if (diff > Math.PI) diff = Math.PI * 2 - diff;
        const edge = d > body ? Math.asin(body / d) : Math.PI;
        if (diff > half + edge) continue;
        if (Collision.lineBlocked(b.originX, b.originY, a.x, a.y)) continue;
        b.hitIds.push(a.id);
        events.push({ type: 'turretHit', areaId: a.id, damage: b.damage, x: a.x - dx / (d || 1) * body,
          y: a.y - dy / (d || 1) * body, team: b.team, charId: b.charId, ownerId: b.ownerId });
      }
    }

    if (b.traveled >= b.range) b.dead = true;
  }

  return { create, update };
})();
