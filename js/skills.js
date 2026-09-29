/* ============================================================
   서클 배틀 - 특수기 (skills.js)
   ------------------------------------------------------------
   STEP 9: 6개 캐릭터 특수기와 원형 범위
     블래스터  에너지 폭발   : 고른 지점에 원 → 0.5초 뒤 원 안의 상대에게 피해
     가디언    원형 보호막   : 내 자리에 원 → 5초 동안 원 밖에서 오는 공격을 막음
     메딕      원형 회복존   : 고른 지점에 원 → 6초 동안 매초 원 안의 우리 팀 회복
     스피더    순간이동      : 반지름 6m 원 안의 고른 지점으로 이동
     엔지니어  원형 범위 터렛 : 고른 지점에 터렛 → 20초 동안 원 안의 상대를 자동 공격
     프로스트  원형 둔화지역  : 고른 지점에 원 → 5초 동안 원 안의 상대가 느려짐

   ★ 원의 넓이와의 연결
     - 반지름은 학생이 2·3·4m 중에서 고릅니다.
     - 비용(⚡) = 고른 원의 넓이(반올림)   r2 → 13⚡, r3 → 28⚡, r4 → 50⚡
       반지름이 2배가 되면 비용은 4배 → "작은 원 자주 vs 큰 원 한 번"을 고민하게 됨
     - "원 안" 판정은 에너지 존과 같습니다: 캐릭터 중심이 원 안에 있으면 적용.
   ============================================================ */

const Skills = (function () {
  let nextId = 1;

  function spec(charId) {
    return CHARACTERS[charId].special;
  }

  // 실제로 쓰는 반지름 (순간이동은 반지름 6m 원 안으로 이동)
  function radiusFor(charId, chosenR) {
    return spec(charId).type === 'blink' ? spec(charId).castRange : chosenR;
  }

  // 비용: 원의 넓이 (순간이동만 고정)
  function costOf(charId, chosenR) {
    return spec(charId).type === 'blink' ? CONFIG.SPEEDER_BLINK_COST : skillCost(chosenR);
  }

  function canCast(p, chosenR) {
    return p.alive && p.energy >= costOf(p.charId, chosenR);
  }

  // 원의 중심을 놓을 자리: 최대 거리(castRange)와 경기장 안으로 제한
  function clampTarget(p, tx, ty) {
    const range = spec(p.charId).castRange;
    if (range === 0) return { x: p.x, y: p.y };
    let dx = tx - p.x, dy = ty - p.y;
    const d = Math.hypot(dx, dy);
    if (d > range) { dx = dx / d * range; dy = dy / d * range; }
    return {
      x: Math.max(0.5, Math.min(GameMap.width - 0.5, p.x + dx)),
      y: Math.max(0.5, Math.min(GameMap.height - 0.5, p.y + dy)),
    };
  }

  function inside(area, p) {
    const dx = p.x - area.x, dy = p.y - area.y;
    return dx * dx + dy * dy <= area.r * area.r;
  }

  /**
   * 특수기를 씁니다.
   * @returns {{ ok: boolean, reason?: string, area?: object, from?: object }}
   */
  function cast(p, chosenR, tx, ty, world) {
    if (!p.alive) return { ok: false, reason: 'dead' };
    const sp = spec(p.charId);
    const cost = costOf(p.charId, chosenR);
    if (p.energy < cost) return { ok: false, reason: 'energy', cost };

    const t = clampTarget(p, tx, ty);
    const r = radiusFor(p.charId, chosenR);
    p.energy -= cost;
    p.stats.specials++;

    // 순간이동: 바로 옮기고 끝
    if (sp.type === 'blink') {
      const from = { x: p.x, y: p.y };
      p.x = t.x;
      p.y = t.y;
      p.vx = p.vy = 0;
      Collision.resolveCircle(p); // 벽 안에 떨어지면 가장 가까운 빈 곳으로
      return { ok: true, from, to: { x: p.x, y: p.y } };
    }

    const area = {
      id: 'sk' + (nextId++),
      kind: sp.type,
      team: p.team,
      ownerId: p.id,
      charId: p.charId,
      x: t.x, y: t.y, r,
      area: circleArea(r),
      age: 0,
      duration: sp.type === 'blast' ? sp.delay : sp.duration,
      // 회복존: 1초마다 / 터렛: 발사 간격 (터렛은 상대가 들어오면 바로 첫 발)
      tick: sp.type === 'turret' ? sp.fireInterval : 0,
      helped: [],       // 회복존: 한 번이라도 도움 받은 우리 팀 (지원 횟수용)
      aim: 0,           // 터렛: 포신 방향
      dead: false,
    };
    world.areas.push(area);
    return { ok: true, area };
  }

  /**
   * target 이 우리 팀 보호막 안에 있고 공격이 보호막 밖에서 왔으면 true
   */
  function isShielded(target, fromX, fromY, areas) {
    for (const a of areas) {
      if (a.kind !== 'shield' || a.team !== target.team) continue;
      if (!inside(a, target)) continue;
      const fx = fromX - a.x, fy = fromY - a.y;
      if (fx * fx + fy * fy > a.r * a.r) return a; // 밖에서 온 공격
    }
    return null;
  }

  /**
   * 지속 효과를 계산합니다.
   * @param world { areas, players, projectiles }
   * @returns 사건 목록
   *   { type: 'damage', targetId, ownerId, damage, x, y, charId }  폭발 피해
   *   { type: 'blocked', areaId, x, y }                               보호막이 폭발을 막음
   *   { type: 'heal', targetId, ownerId, amount }                     회복
   *   { type: 'blast', x, y, r, team }                                폭발 효과
   */
  function update(world, dt) {
    const events = [];
    const players = world.players;

    // 둔화: 매 프레임 새로 계산
    players.forEach((p) => { p.slowFactor = 1; });

    world.areas.forEach((a) => {
      a.age += dt;
      const sp = spec(a.charId);

      if (a.kind === 'blast' && a.age >= a.duration) {
        events.push({ type: 'blast', x: a.x, y: a.y, r: a.r, team: a.team });
        players.forEach((p) => {
          if (!p.alive || p.team === a.team || !inside(a, p)) return;
          if (Collision.lineBlocked(a.x, a.y, p.x, p.y)) return; // 벽 뒤는 안전
          const shield = isShielded(p, a.x, a.y, world.areas);
          if (shield) { events.push({ type: 'blocked', areaId: shield.id, x: p.x, y: p.y }); return; }
          events.push({ type: 'damage', targetId: p.id, ownerId: a.ownerId, damage: sp.damage,
            x: p.x, y: p.y, charId: a.charId });
        });
        a.dead = true;
        return;
      }

      if (a.kind === 'heal') {
        a.tick += dt;
        while (a.tick >= 1) {
          a.tick -= 1;
          players.forEach((p) => {
            if (!p.alive || p.team !== a.team || !inside(a, p)) return;
            events.push({ type: 'heal', targetId: p.id, ownerId: a.ownerId, amount: sp.healPerSec,
              areaId: a.id });
          });
        }
      }

      if (a.kind === 'slow') {
        players.forEach((p) => {
          if (p.alive && p.team !== a.team && inside(a, p)) {
            p.slowFactor = Math.min(p.slowFactor, sp.slowFactor);
          }
        });
      }

      if (a.kind === 'turret') {
        a.tick += dt;
        // 원 안에 있는 가장 가까운 상대 (벽 뒤 제외)
        let best = null, bestD = Infinity;
        players.forEach((p) => {
          if (!p.alive || p.team === a.team || !inside(a, p)) return;
          if (Collision.lineBlocked(a.x, a.y, p.x, p.y)) return;
          const d = Math.hypot(p.x - a.x, p.y - a.y);
          if (d < bestD) { best = p; bestD = d; }
        });
        if (best) {
          a.aim = Math.atan2(best.y - a.y, best.x - a.x);
          if (a.tick >= sp.fireInterval) {
            a.tick = 0;
            const turretBody = { id: a.ownerId, team: a.team, charId: a.charId, x: a.x, y: a.y, radius: 0.5 };
            world.projectiles.push(Projectiles.create(turretBody, a.aim, {
              damage: sp.damage, speed: sp.boltSpeed, size: 0.16, range: a.r + 1, shape: 'bolt',
              fromTurret: true,
            }));
          }
        } else {
          a.tick = Math.min(a.tick, sp.fireInterval); // 상대가 들어오면 바로 쏠 수 있게
        }
      }

      if (a.kind !== 'blast' && a.age >= a.duration) a.dead = true;
    });

    world.areas = world.areas.filter((a) => !a.dead);
    return { events, areas: world.areas };
  }

  return { spec, radiusFor, costOf, canCast, clampTarget, cast, update, isShielded, inside };
})();
