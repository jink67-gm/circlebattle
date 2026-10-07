/* ============================================================
   서클 배틀 - 특수기 (skills.js)
   ------------------------------------------------------------
   STEP 9: 6개 캐릭터 특수기와 원형 범위
     블래스터  에너지 폭발   : 고른 지점에 원 → 0.5초 뒤 원 안의 상대에게 피해
     가디언    에너지 방벽   : 내 자리를 중심으로 한 원의 앞쪽 호(弧)를 따라 벽 → 넘어오는 공격을 막음
                              생기는 순간 벽 근처·안쪽의 상대를 벽 밖으로 밀어내며 작은 피해
     메딕      원형 회복존   : 고른 지점에 원 → 6초 동안 매초 원 안의 우리 팀 회복
     스피더    순간이동      : 반지름 6m 원 안의 고른 지점으로 이동
     엔지니어  원형 범위 터렛 : 고른 지점에 터렛 → 20초 동안 원 안의 상대를 자동 공격
     프로스트  원형 둔화지역  : 고른 지점에 원 → 5초 동안 원 안의 상대가 느려지고 1초마다 냉기 피해

   새 STEP 3: 캐릭터마다 고유한 효과 (characters.js 의 levels)
     블래스터  폭발한 원 안의 상대를 원 밖 방향으로 밀어냄 (knockback) — 존에서 밀어내기
     가디언    방벽에 "막는 양"(hp)이 있음. 다 막으면 깨짐. LEVEL 3: 벽 뒤 우리 팀은 밀려나지 않고 느려지지 않음
     메딕      LEVEL 3: 놓자마자 원 안 우리 팀을 바로 회복 (burst)
     스피더    순간이동은 부쉬에서 드러나지 않음. LEVEL 3: 도착한 뒤 잠깐 더 빠르게 (dash)
     엔지니어  터렛은 한 명당 1개, 체력(hp)이 있어 상대가 부술 수 있음. LEVEL 3: 원 안 부쉬 속 상대를 드러냄
     보호막도 한 명당 1개 (새로 만들면 예전 보호막은 사라짐)

   ★ 원의 넓이와의 연결
     - 수정 STEP 4: 반지름은 스킬 레벨로 정해집니다. 에너지 터미널에서 수학 문제를 맞힐 때마다
       LEVEL 1(해금) → 2 → 3 MAX로 원이 커지고 효과가 강해집니다. (characters.js 의 levels)
     - 비용(⚡)은 캐릭터마다 정해진 값 (레벨이 올라도 같음 → 강화가 손해가 되지 않게)
     - "원 안" 판정은 에너지 존과 같습니다: 캐릭터 중심이 원 안에 있으면 적용.
   ============================================================ */

const Skills = (function () {
  let nextId = 1;

  function spec(charId) {
    return CHARACTERS[charId].special;
  }

  // 수정 STEP 4: 레벨별 값 (level 1~3). 레벨 0(잠금)이면 LEVEL 1 값을 미리보기용으로 돌려줌
  function stats(charId, level) {
    const sp = spec(charId);
    const lv = Math.max(1, Math.min(SKILL_LEVEL_MAX, level | 0));
    return { ...sp, ...sp.levels[lv - 1], level: lv };
  }
  function levelOf(p) { return p ? (p.skillLevel | 0) : 0; }

  // 효과 범위 원의 반지름 (스피더는 순간이동할 수 있는 원의 반지름)
  // 궁극기: 스피더 「초고속 돌파」 중에는 순간이동 거리가 늘어남
  function radiusOf(p) {
    const r = stats(p.charId, levelOf(p)).r;
    return spec(p.charId).type === 'blink' ? Math.round(r * Ultimate.blinkRangeMult(p) * 10) / 10 : r;
  }
  // 한 번 쓰는 데 드는 에너지 (레벨과 상관없이 같음) — 궁극기: 스피더 「초고속 돌파」 중에는 절반(MAX 0)
  function costOf(p) { return Math.round(spec(p.charId).cost * Ultimate.blinkCostMult(p)); }
  // 원의 중심을 놓을 수 있는 거리 (순간이동은 레벨의 반지름)
  function castRangeOf(p) {
    const sp = spec(p.charId);
    return sp.type === 'blink' ? radiusOf(p) : sp.castRange;
  }

  function canCast(p) {
    return p.alive && levelOf(p) >= 1 && p.energy >= costOf(p);
  }

  // 원의 중심을 놓을 자리: 최대 거리(castRange)와 경기장 안으로 제한
  function clampTarget(p, tx, ty) {
    const range = castRangeOf(p);
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

  // ---------------- 가디언 에너지 방벽 (원의 앞쪽 호) ----------------
  //   a.x, a.y = 원의 중심(방벽을 만든 자리), a.r = 반지름, a.aim = 벽이 바라보는 방향
  function wallHalf(a) {
    const st = a.st || stats(a.charId, a.level || 1);
    return (st.arcDeg || 120) * Math.PI / 360;
  }
  function angleOff(a, x, y) {
    let d = Math.atan2(y - a.y, x - a.x) - (a.aim || 0);
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return Math.abs(d);
  }
  // 점 (x, y) 가 벽이 덮는 각도 안인지 (pad: 더 넓게 볼 각도)
  function inArc(a, x, y, pad) { return angleOff(a, x, y) <= wallHalf(a) + (pad || 0); }
  // 벽 뒤(원 안 + 벽이 덮는 각도 안) — LEVEL 3 의 우리 팀 보호 범위
  function behindWall(a, p) { return inside(a, p) && inArc(a, p.x, p.y); }
  /** 선분 (x0,y0)→(x1,y1) 이 벽(호)을 처음 지나는 t (0~1), 없으면 null */
  function wallHitT(a, x0, y0, x1, y1) {
    const dx = x1 - x0, dy = y1 - y0;
    const fx = x0 - a.x, fy = y0 - a.y;
    const A = dx * dx + dy * dy;
    if (A < 1e-9) return null;
    const B = 2 * (fx * dx + fy * dy);
    const C = fx * fx + fy * fy - a.r * a.r;
    const disc = B * B - 4 * A * C;
    if (disc < 0) return null;
    const sq = Math.sqrt(disc);
    const ts = [(-B - sq) / (2 * A), (-B + sq) / (2 * A)];
    for (const t of ts) {
      if (t < 0 || t > 1) continue;
      if (inArc(a, x0 + dx * t, y0 + dy * t)) return t;
    }
    return null;
  }

  /**
   * 특수기를 씁니다. (수정 STEP 4: 반지름·효과는 내 스킬 레벨로 정해짐)
   * @returns {{ ok: boolean, reason?: 'dead'|'locked'|'energy', area?: object, from?: object }}
   */
  function cast(p, tx, ty, world) {
    if (!p.alive) return { ok: false, reason: 'dead' };
    if (levelOf(p) < 1) return { ok: false, reason: 'locked' };
    const st = stats(p.charId, levelOf(p));
    const cost = costOf(p);
    if (p.energy < cost) return { ok: false, reason: 'energy', cost };
    if (st.type === 'blink' && p.frozenT > 0) return { ok: false, reason: 'frozen' }; // 꽁꽁 얼면 순간이동도 못 함

    // 가디언 방벽: 고른 곳은 "벽을 세울 방향" (원의 중심은 내 자리)
    let wallAim = p.facing || 0;
    if (st.type === 'shield' && Math.hypot(tx - p.x, ty - p.y) > 0.05) wallAim = Math.atan2(ty - p.y, tx - p.x);
    const t = clampTarget(p, tx, ty);
    p.energy -= cost;
    p.stats.specials++;

    // 순간이동: 바로 옮기고 끝
    if (st.type === 'blink') {
      const from = { x: p.x, y: p.y };
      p.x = t.x;
      p.y = t.y;
      p.vx = p.vy = 0;
      p.kbT = 0;
      Collision.resolveCircle(p); // 벽 안에 떨어지면 가장 가까운 빈 곳으로
      if (st.dash) p.dashTimer = st.dash; // 새 STEP 3: LEVEL 3 MAX — 도착한 뒤 잠깐 더 빠르게
      p.ambushUntil = (world.time || 0) + CONFIG.SKILL_FX.AMBUSH_SEC; // 새 STEP 4: 기습 (다음 첫 탄 1.5배)
      return { ok: true, from, to: { x: p.x, y: p.y }, level: st.level, dash: st.dash || 0 };
    }

    // 새 STEP 3: 보호막·터렛은 한 사람당 1개 — 새로 놓으면 예전 것은 사라짐
    let replaced = null;
    if (st.type === 'turret' || st.type === 'shield') {
      world.areas.forEach((o) => {
        if (o.ownerId === p.id && o.kind === st.type && !o.dead) { o.dead = true; replaced = o; }
      });
      if (replaced) world.areas = world.areas.filter((o) => !o.dead);
    }
    const hp = st.type === 'shield' ? st.shieldHp : st.type === 'turret' ? st.hp : 0;

    const area = {
      id: 'sk' + (nextId++),
      kind: st.type,
      team: p.team,
      ownerId: p.id,
      charId: p.charId,
      level: st.level,  // 수정 STEP 4: 레벨 (그림을 더 화려하게, 효과 값은 st)
      st,               // 이 원을 만들 때의 레벨 값 (피해·회복·둔화·발사 간격)
      x: t.x, y: t.y, r: st.r,
      area: circleArea(st.r),
      age: 0,
      duration: st.type === 'blast' ? st.delay : st.duration,
      // 회복존: 1초마다 / 터렛: 발사 간격 (터렛은 상대가 들어오면 바로 첫 발)
      tick: st.type === 'turret' ? st.fireInterval : 0,
      helped: [],       // 회복존: 한 번이라도 도움 받은 우리 팀 (지원 횟수용)
      aim: st.type === 'shield' ? wallAim : 0, // 터렛: 포신 방향 / 방벽: 벽이 바라보는 방향
      pushPending: st.type === 'shield', // 방벽: 생기는 첫 프레임에 상대를 밀어냄
      hp: hp || 0,      // 새 STEP 3: 보호막이 더 막을 수 있는 양 / 터렛 체력
      maxHp: hp || 0,
      burst: st.burst || 0, // 새 STEP 3: 메딕 LEVEL 3 — 첫 프레임에 바로 회복
      dead: false,
    };
    world.areas.push(area);
    return { ok: true, area, replaced };
  }

  // 새 STEP 3: 가디언 LEVEL 3 방벽 뒤의 우리 팀 → 밀려나지 않고 느려지지 않음
  function fortified(p, areas) {
    for (const a of areas) {
      if (a.kind !== 'shield' || a.team !== p.team || a.dead) continue;
      const st = a.st || stats(a.charId, a.level || 1);
      if (st.fortify && behindWall(a, p)) return a;
    }
    return null;
  }

  /**
   * 공격(fromX, fromY → target)이 target 팀의 방벽을 넘어와야 하면 그 방벽 (막힘), 아니면 null
   */
  function isShielded(target, fromX, fromY, areas) {
    for (const a of areas) {
      if (a.kind !== 'shield' || a.team !== target.team || a.dead) continue;
      if (wallHitT(a, fromX, fromY, target.x, target.y) !== null) return a;
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
   *   { type: 'knockback', targetId, dx, dy, ownerId }                새 STEP 3: 밀어내기 (거리·방향 m)
   *   { type: 'turretHit', areaId, damage, x, y, ownerId, charId }    새 STEP 3: 폭발이 상대 터렛에 피해
   */
  function update(world, dt) {
    const events = [];
    const players = world.players;

    // 둔화: 매 프레임 새로 계산
    // 수정 STEP 5: LEVEL 3 냉기 지역을 벗어난 뒤에도 잠깐(linger) 느림이 남음 (chillTimer / chillFactor)
    players.forEach((p) => {
      p.slowFactor = 1;
      p.slowBy = null; // 궁극기 게이지: 누가 느리게 했는지 (프로스트)
      if (p.chillTimer > 0) {
        p.chillTimer = Math.max(0, p.chillTimer - dt);
        if (p.alive && !p.inCapQ && p.chillTimer > 0) p.slowFactor = p.chillFactor || 1;
      }
    });

    world.areas.forEach((a) => {
      a.age += dt;
      const sp = a.st || stats(a.charId, a.level || 1); // 수정 STEP 4: 원을 만든 레벨의 값

      if (a.kind === 'blast' && a.age >= a.duration) {
        events.push({ type: 'blast', x: a.x, y: a.y, r: a.r, team: a.team, level: a.level || 1 });
        const owner = players.find((o) => o.id === a.ownerId);
        players.forEach((p) => {
          if (!p.alive || p.inCapQ || p.team === a.team || !inside(a, p)) return; // 점령 문제 중(무적)은 제외
          if (Collision.lineBlocked(a.x, a.y, p.x, p.y)) return; // 벽 뒤는 안전
          const shield = isShielded(p, a.x, a.y, world.areas);
          if (shield) { events.push({ type: 'blocked', areaId: shield.id, x: p.x, y: p.y, damage: sp.damage }); return; }
          events.push({ type: 'damage', targetId: p.id, ownerId: a.ownerId, damage: sp.damage,
            x: p.x, y: p.y, charId: a.charId });
          // 새 STEP 3: 원 밖 방향으로 밀어내기 (가운데에 서 있으면 던진 사람 반대쪽으로)
          if (sp.knockback && !fortified(p, world.areas)) {
            let dx = p.x - a.x, dy = p.y - a.y;
            if (dx * dx + dy * dy < 0.01) {
              dx = owner ? a.x - owner.x : 1; dy = owner ? a.y - owner.y : 0;
              if (dx * dx + dy * dy < 0.01) { dx = 1; dy = 0; }
            }
            const d = Math.hypot(dx, dy);
            events.push({ type: 'knockback', targetId: p.id, ownerId: a.ownerId,
              dx: dx / d * sp.knockback, dy: dy / d * sp.knockback });
          }
        });
        // 새 STEP 3: 원 안의 상대 터렛도 피해
        world.areas.forEach((t) => {
          if (t.kind !== 'turret' || t.team === a.team || t.dead || !inside(a, t)) return;
          if (Collision.lineBlocked(a.x, a.y, t.x, t.y)) return;
          events.push({ type: 'turretHit', areaId: t.id, damage: sp.damage, x: t.x, y: t.y, ownerId: a.ownerId, charId: a.charId });
        });
        a.dead = true;
        return;
      }

      // 가디언 방벽이 생기는 순간: 벽 근처·안쪽(벽이 덮는 각도)의 상대를 벽 밖으로 밀어내며 작은 피해
      if (a.kind === 'shield' && a.pushPending) {
        a.pushPending = false;
        players.forEach((p) => {
          if (!p.alive || p.inCapQ || p.team === a.team) return;
          const dx = p.x - a.x, dy = p.y - a.y;
          const d = Math.hypot(dx, dy);
          if (d > a.r + 1.0) return;                                   // 벽보다 1m 넘게 바깥이면 안 닿음
          const pad = d > p.radius ? Math.asin(Math.min(1, p.radius / d)) : Math.PI;
          if (!inArc(a, p.x, p.y, pad)) return;                        // 벽 옆·뒤쪽은 안 닿음
          if (Collision.lineBlocked(a.x, a.y, p.x, p.y)) return;       // 진짜 벽 뒤는 안전
          if (sp.pushDamage) events.push({ type: 'damage', targetId: p.id, ownerId: a.ownerId, damage: sp.pushDamage,
            x: p.x, y: p.y, charId: a.charId });
          if (fortified(p, world.areas)) return;
          // 벽 바깥(반지름 + 1.3m)까지 밀어냄 (최소 1.2m, 최대 3.5m)
          let ux = dx, uy = dy;
          if (d < 0.05) { ux = Math.cos(a.aim || 0); uy = Math.sin(a.aim || 0); }
          const ul = Math.hypot(ux, uy) || 1;
          const dist = Math.max(1.2, Math.min(3.5, a.r + 1.3 - d));
          events.push({ type: 'knockback', targetId: p.id, ownerId: a.ownerId, dx: ux / ul * dist, dy: uy / ul * dist });
        });
      }

      if (a.kind === 'heal') {
        // 새 STEP 3: 메딕 LEVEL 3 MAX — 놓자마자 원 안 우리 팀을 바로 회복
        if (a.burst > 0) {
          const amount = a.burst;
          a.burst = 0;
          players.forEach((p) => {
            if (!p.alive || p.team !== a.team || !inside(a, p)) return;
            events.push({ type: 'heal', targetId: p.id, ownerId: a.ownerId, amount, areaId: a.id, burst: true });
          });
        }
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
          if (p.alive && !p.inCapQ && p.team !== a.team && inside(a, p) && !fortified(p, world.areas)) {
            p.slowFactor = Math.min(p.slowFactor, sp.slowFactor);
            p.slowBy = a.ownerId;
            if (sp.linger) { p.chillTimer = sp.linger; p.chillFactor = sp.slowFactor; p.chillBy = a.ownerId; }
          }
        });
        // 빙결 둔화: 원 안에 있는 상대에게 1초마다 냉기 피해 (원을 놓고 0.5초 뒤 첫 피해)
        if (sp.dps) {
          if (a.frostTick === undefined) a.frostTick = 0.5;
          a.frostTick += dt;
          while (a.frostTick >= 1) {
            a.frostTick -= 1;
            players.forEach((p) => {
              if (!p.alive || p.inCapQ || p.team === a.team || !inside(a, p)) return;
              events.push({ type: 'damage', targetId: p.id, ownerId: a.ownerId, damage: sp.dps, x: p.x, y: p.y, charId: a.charId, frost: true });
            });
          }
        }
      }

      if (a.kind === 'turret') {
        a.tick += dt;
        // 원 안에 있는 가장 가까운 상대 (벽 뒤 제외)
        let best = null, bestD = Infinity;
        players.forEach((p) => {
          if (!p.alive || p.inCapQ || p.team === a.team || !inside(a, p)) return;
          if (Collision.lineBlocked(a.x, a.y, p.x, p.y)) return;
          const d = Math.hypot(p.x - a.x, p.y - a.y);
          if (d < bestD) { best = p; bestD = d; }
        });
        // 새 STEP 3: LEVEL 3 MAX 터렛은 감지기 — 원 안의 상대는 부쉬 안이어도 드러남
        if (sp.sensor && typeof Bushes !== 'undefined' && world.time !== undefined) {
          players.forEach((p) => {
            if (p.alive && p.team !== a.team && inside(a, p)) Bushes.reveal(p, CONFIG.BUSH.SENSOR_REVEAL_SEC, world.time);
          });
        }
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
    // 새 STEP 3: 가디언 LEVEL 3 보호막 안의 우리 팀은 느려지지 않음 (남아 있던 냉기도 풀림)
    players.forEach((p) => {
      if (p.slowFactor < 1 && fortified(p, world.areas)) { p.slowFactor = 1; p.chillTimer = 0; }
    });
    return { events, areas: world.areas };
  }

  /**
   * 새 STEP 4: 스피더 기습 — 순간이동 뒤 2초 안에 쏘는 첫 탄은 1.5배 (한 번 쓰면 끝)
   * @returns 기본 공격 대신 쓸 값 (없으면 null) — Projectiles.create 의 override
   */
  function shotOverride(p, now) {
    if (!(p.ambushUntil > now)) return null;
    p.ambushUntil = 0;
    const atk = CHARACTERS[p.charId].attack;
    return { damage: Math.round(atk.damage * CONFIG.SKILL_FX.AMBUSH_MULT), ambush: true };
  }

  /**
   * 새 STEP 4: 메딕 회복 오라 — 스킬 레벨과 상관없이 늘 켜져 있음 (혼자·교사 기기)
   * 메딕 둘레 passive.r 안의 우리 팀(메딕 자신은 빼고)이 1초에 passive.healPerSec 씩 회복
   *   — 시험 경기에서 혼자 멀리서 쏘는 메딕(빈자리 봇)이 스스로 회복해 거의 쓰러지지 않았음 → 친구 곁에 있어야 힘이 나는 지원형
   * @param onHeal (medic, target, healed) — 회복 기록용
   */
  function updateAuras(players, dt, onHeal) {
    players.forEach((m) => {
      const pas = m.alive && !m.inCapQ && CHARACTERS[m.charId].passive;
      if (!pas || !pas.healPerSec) return;
      players.forEach((p) => {
        if (p === m || !p.alive || p.team !== m.team || p.hp >= p.maxHp) return;
        const dx = p.x - m.x, dy = p.y - m.y;
        if (dx * dx + dy * dy > pas.r * pas.r) return;
        const h = Player.heal(p, pas.healPerSec * dt);
        if (h > 0 && onHeal) onHeal(m, p, h);
      });
    });
  }

  // 수정 STEP 4: 레벨 효과 한 줄 설명 (레벨업 알림·도움말)
  //   예) "반지름 2m → 3m · 피해 25 → 30"
  function describe(charId, level) {
    const now = stats(charId, level);
    const prev = level > 1 ? stats(charId, level - 1) : null;
    const ch = (a, b, unit) => (prev && a !== b ? a + unit + ' → ' + b + unit : b + unit);
    const parts = [];
    parts.push((now.type === 'blink' ? '순간이동 반지름 ' : '반지름 ') + ch(prev && prev.r, now.r, 'm'));
    if (now.damage !== undefined) parts.push('피해 ' + ch(prev && prev.damage, now.damage, ''));
    if (now.healPerSec !== undefined) parts.push('1초에 ' + ch(prev && prev.healPerSec, now.healPerSec, '') + ' 회복');
    if (now.slowFactor !== undefined) {
      const pct = (f) => Math.round((1 - f) * 100);
      parts.push('이동속도·점령·탄약 충전 ' + ch(prev && pct(prev.slowFactor), pct(now.slowFactor), '%') + ' 느리게');
      if (now.dps) parts.push('1초마다 냉기 피해 ' + ch(prev && prev.dps, now.dps, ''));
      if (now.linger) parts.push('벗어나도 ' + now.linger + '초 더');
    }
    if (now.fireInterval !== undefined && prev && prev.fireInterval !== now.fireInterval) parts.push('더 빠르게 발사');
    if (now.duration !== undefined) parts.push(ch(prev && prev.duration, now.duration, '초'));
    // 새 STEP 3: 캐릭터 고유 효과
    if (now.knockback !== undefined) parts.push('밀어내기 ' + ch(prev && prev.knockback, now.knockback, 'm'));
    if (now.arcDeg) parts.push('벽 너비 ' + ch(prev && prev.arcDeg, now.arcDeg, '°'));
    if (now.shieldHp !== undefined) parts.push('막는 양 ' + ch(prev && prev.shieldHp, now.shieldHp, ''));
    if (now.pushDamage) parts.push('밀어내기 피해 ' + ch(prev && prev.pushDamage, now.pushDamage, ''));
    if (now.fortify) parts.push('벽 뒤 우리 팀은 밀려나지 않고 느려지지 않음');
    if (now.burst) parts.push('놓자마자 +' + now.burst + ' 바로 회복');
    if (now.dash) parts.push('도착 뒤 ' + now.dash + '초 더 빠르게');
    if (now.hp !== undefined) parts.push('터렛 체력 ' + ch(prev && prev.hp, now.hp, ''));
    if (now.sensor) parts.push('원 안 부쉬 속 상대를 드러냄');
    return parts.join(' · ');
  }

  return { spec, stats, levelOf, describe, radiusOf, costOf, castRangeOf, canCast, clampTarget, cast, update, isShielded, inside, fortified,
    wallHitT, inArc, behindWall, wallHalf, updateAuras, shotOverride };
})();
