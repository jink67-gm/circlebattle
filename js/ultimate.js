/* ============================================================
   서클 배틀 - 궁극기 (ultimate.js)
   ------------------------------------------------------------
   캐릭터 = 기본 공격 + 고유 스킬(LEVEL 1) + 궁극기(LEVEL 2)

   ■ 성장 (에너지 터미널 문제 정답)
     1번째 정답 LEVEL 1 → 고유 스킬 해금
     2번째 정답 LEVEL 2 → 궁극기 해금 · 게이지가 차기 시작
     3번째 정답 LEVEL 3 MAX → 고유 스킬 + 궁극기 강화
     그 뒤 정답 → TEAM BOOST (예전 그대로)

   ■ 궁극기 게이지 0 ~ 100%
     캐릭터 역할에 맞는 "실제로 일어난 일"로만 참 (config.js 의 ULTIMATE.CHARGE)
       블래스터 실제로 준 피해 · 가디언 받은 피해/보호막으로 막은 피해/점령지역 지키기
       메딕 친구를 실제로 회복한 양 · 스피더 명중/점령 게이지/함께 쓰러뜨리기
       엔지니어 터렛이 준 피해/터렛 원 안의 상대 · 프로스트 상대를 실제로 느리게 한 시간
     가득 찬 친구를 회복하거나 빈 곳에 쏘면 0 → 가짜 행동으로 채울 수 없음
     100% → ULTIMATE READY! (버튼이 빛나고 소리는 한 번) → 쓰면 0%

   ■ 6가지 궁극기 (characters.js 의 ultimate.levels: [LEVEL 2, LEVEL 3 MAX])
     블래스터 메가 에너지 캐논  0.5초 모은 뒤 큰 에너지탄 — 여러 명 관통, 밀어냄, 벽에서 멈춤, 즉사 불가
     가디언   절대 수호        나를 따라다니는 큰 보호 영역 — 안의 우리 팀 피해 크게 감소, 잘 밀려나지 않음
     메딕     생명 에너지 폭발  넓은 원 안 우리 팀 바로 크게 회복 + 몇 초 더 회복 (100%는 아님)
     스피더   초고속 돌파      잠깐 크게 빨라지고 순간이동 강화 (무적 아님)
     엔지니어 전투 지원 드론    나를 따라다니며 가까운 상대를 자동 공격
     프로스트 절대 빙결 지대    쓰는 순간 원 안 상대를 꽁꽁 얼림(2~2.5초 못 움직임) + 얼음 피해 → 냉기 영역이 남아 크게 느리게

   ■ 멀티플레이: 판정은 교사 기기(혼자 연습은 내 기기). 학생 기기는 [궁극기] 명령을 보내고,
     교사 기기가 보낸 궁극기 물체(state.ults)와 게이지를 그립니다. (sync.js)
   ■ 화면을 가리는 긴 연출은 없음: 캐릭터 색 파티클 + 짧은 화면 가장자리 빛(0.45초)만
   ============================================================ */

const Ultimate = (function () {
  const U = CONFIG.ULTIMATE;
  const TAU = Math.PI * 2;
  let nextId = 1;
  let enabled = true;  // 선생님이 특수기를 "사용 안 함"으로 하면 궁극기도 없음

  // ---------------- 값 ----------------
  function def(charId) { return CHARACTERS[charId] && CHARACTERS[charId].ultimate; }
  // LEVEL 2 → levels[0], LEVEL 3 MAX → levels[1]
  function stats(charId, level) {
    const d = def(charId);
    const i = (level | 0) >= SKILL_LEVEL_MAX ? 1 : 0;
    return { ...d.levels[i], name: d.name, max: i === 1 };
  }
  function statsOf(p) { return stats(p.charId, p.skillLevel); }
  function unlocked(p) { return enabled && !!p && (p.skillLevel | 0) >= ULT_UNLOCK_LEVEL; }
  function gauge(p) { return p ? Math.max(0, Math.min(U.MAX, p.ult || 0)) : 0; }
  function active(p) { return !!p && p.ultT > 0; }
  function isReady(p) { return unlocked(p) && gauge(p) >= U.MAX && !active(p); }
  function setEnabled(on) { enabled = !!on; }

  // 궁극기를 지금 쓸 수 있는지 (안 되는 까닭도)
  function canUse(p) {
    if (!p || !p.alive) return 'dead';
    if (!unlocked(p)) return 'locked';
    if (p.inMission || p.inCapQ || p.capWait) return 'busy';
    if (active(p)) return 'active';
    if (gauge(p) < U.MAX) return 'charging';
    return 'ok';
  }

  // ---------------- 게이지 채우기 (혼자·교사 기기) ----------------
  /** 역할에 맞는 행동 key 를 amount 만큼 했을 때 게이지 + */
  function add(p, key, amount) {
    if (!p || !unlocked(p) || active(p) || p.ultPending) return 0;
    const rate = (U.CHARGE[p.charId] || {})[key];
    if (!rate || !(amount > 0)) return 0;
    const before = p.ult || 0;
    p.ult = Math.min(U.MAX, before + rate * amount);
    return p.ult - before;
  }

  /**
   * 피해가 실제로 들어갔을 때 (game.js applyDamage)
   * @param src 'basic' 기본 공격 / 'skill' 스킬 / 'turret' 터렛 / 'drone' 드론 / 'ult' 궁극기 / null
   */
  function onDamage(owner, target, actual, src, time) {
    if (!(actual > 0)) return;
    if (target && target.charId === 'guardian') add(target, 'taken', actual); // 가디언: 받은 피해
    if (!owner || owner.team === (target && target.team)) return;
    if (target) {
      if (!target.lastHitBy) target.lastHitBy = {};
      target.lastHitBy[owner.id] = time;
    }
    if (src === 'ult' || src === 'drone') return; // 궁극기로 궁극기를 채우지 않음
    if (owner.charId === 'blaster' && (src === 'basic' || src === 'skill')) add(owner, 'damage', actual);
    if (owner.charId === 'speeder' && src === 'basic') add(owner, 'hit', 1);
    if (owner.charId === 'engineer' && src === 'turret') add(owner, 'device', actual);
  }

  /** 상대가 쓰러짐 → 4초 안에 맞혔던 스피더는 "함께함" */
  function onKnockout(target, players, time) {
    const by = target.lastHitBy || {};
    players.forEach((p) => {
      if (p.charId !== 'speeder' || p.team === target.team) return;
      if (by[p.id] !== undefined && time - by[p.id] <= U.ASSIST_SEC) add(p, 'assist', 1);
    });
    target.lastHitBy = {};
  }

  /** 가디언 보호막이 막은 피해 */
  function onShieldBlock(owner, damage) {
    if (owner && owner.charId === 'guardian') add(owner, 'protect', damage);
  }

  /** 메딕이 친구를 실제로 회복 (나 자신·가득 찬 친구는 0이라 안 참) */
  function onHeal(owner, target, healed) {
    if (owner && target && owner !== target && owner.charId === 'medic') add(owner, 'heal', healed);
  }

  // ---------------- 궁극기 물체 안에 있는지 ----------------
  function inCircle(u, p) {
    const dx = p.x - u.x, dy = p.y - u.y;
    return dx * dx + dy * dy <= u.r * u.r;
  }

  /** 가디언 「절대 수호」 안의 우리 팀 → 받는 피해 배수 (1 = 그대로) */
  function damageMult(target, world) {
    let m = 1;
    (world.ults || []).forEach((u) => {
      if (u.kind === 'aura' && u.team === target.team && inCircle(u, target)) m = Math.min(m, 1 - u.reduce);
    });
    return m;
  }
  /** 가디언 「절대 수호」 안의 우리 팀 → 밀려나는 거리 배수 */
  function knockMult(target, world) {
    let m = 1;
    (world.ults || []).forEach((u) => {
      if (u.kind === 'aura' && u.team === target.team && inCircle(u, target)) m = Math.min(m, u.knockMult);
    });
    return m;
  }
  /** 스피더 「초고속 돌파」 이동속도 배수 (학생 기기도 내 캐릭터를 직접 움직이므로 여기서 계산) */
  function speedMult(p) {
    if (!p || p.charId !== 'speeder' || !(p.ultT > 0)) return 1;
    return stats('speeder', p.skillLevel).speedMult;
  }
  /** 스피더 「초고속 돌파」 중 순간이동: 반지름 배수 / 에너지 배수 */
  function blinkRangeMult(p) {
    return p && p.charId === 'speeder' && p.ultT > 0 ? stats('speeder', p.skillLevel).blinkRangeMult : 1;
  }
  function blinkCostMult(p) {
    return p && p.charId === 'speeder' && p.ultT > 0 ? stats('speeder', p.skillLevel).blinkCostMult : 1;
  }

  // ---------------- 궁극기 쓰기 (혼자·교사 기기) ----------------
  /**
   * @param p      쓰는 사람
   * @param angle  바라보는 방향 (블래스터 캐논 방향)
   * @param world  game state { ults, players, time, areas }
   * @param h      game.js 가 넘겨 주는 도우미 { heal(target, amount, owner), effect(e), reveal(p) }
   * @returns { ok, reason?, kind? }
   */
  function use(p, angle, world, h) {
    const why = canUse(p);
    if (why !== 'ok') return { ok: false, reason: why };
    if (!world.ults) world.ults = [];
    const st = statsOf(p);
    const lv = st.max ? 3 : 2;
    const ch = CHARACTERS[p.charId];
    p.ult = 0;
    p.stats.ults = (p.stats.ults || 0) + 1;
    if (!isFinite(angle)) angle = p.facing || 0;
    const base = { id: 'u' + (nextId++), ownerId: p.id, team: p.team, charId: p.charId, lv, age: 0, x: p.x, y: p.y, angle };
    let u = null;

    if (p.charId === 'blaster') {
      // 모으는 동안은 블래스터 자리를 따라가고, 다 모으면 그 자리에서 직선으로 발사
      u = { ...base, kind: 'cannon', charge: st.charge, speed: st.speed, range: st.range, width: st.width,
        damage: st.damage, knockback: st.knockback, r: st.width, dist: 0, endDist: st.range, fired: false, hit: [],
        duration: st.charge + st.range / st.speed + 0.35 };
      p.ultT = st.charge + 0.2;
      p.facing = angle;
    } else if (p.charId === 'guardian') {
      u = { ...base, kind: 'aura', r: st.r, duration: st.duration, reduce: st.reduce, knockMult: st.knockMult };
      p.ultT = st.duration;
    } else if (p.charId === 'medic') {
      // 바로 크게 회복 (최대 체력의 35~45%) + 몇 초 동안 조금씩 (모두 합쳐도 100%는 안 됨)
      world.players.forEach((m) => {
        if (!m.alive || m.team !== p.team) return;
        const dx = m.x - p.x, dy = m.y - p.y;
        if (dx * dx + dy * dy > st.r * st.r) return;
        h.heal(m, Math.round(m.maxHp * st.healPct), p);
        m.ultRegen = { rate: m.maxHp * st.regenPct, t: st.regenSec, acc: 0, by: p.id };
      });
      u = { ...base, kind: 'pulse', r: st.r, duration: 0.9 };
      p.ultT = st.regenSec;
    } else if (p.charId === 'speeder') {
      p.ultT = st.duration;
      u = null; // 스피더 몸에 잔상만 (player.ultT)
    } else if (p.charId === 'engineer') {
      u = { ...base, kind: 'drone', r: st.range, duration: st.duration, range: st.range, interval: st.interval,
        damage: st.damage, tick: st.interval * 0.5, aim: angle, x: p.x - 1, y: p.y - 1.2 };
      p.ultT = st.duration;
    } else if (p.charId === 'frost') {
      u = { ...base, kind: 'field', r: st.r, duration: st.duration, slowFactor: st.slowFactor, linger: st.linger };
      p.ultT = st.duration;
      // 쓰는 순간 원 안의 상대를 꽁꽁 얼림 (freezeSec 동안 못 움직임) + 얼음 피해 (최대 체력의 60%까지)
      world.players.forEach((e) => {
        if (!e.alive || e.inCapQ || e.team === p.team) return;
        const dx = e.x - p.x, dy = e.y - p.y;
        if (dx * dx + dy * dy > st.r * st.r) return;
        if (Collision.lineBlocked(p.x, p.y, e.x, e.y)) return;               // 진짜 벽 뒤는 안전
        const shield = Skills.isShielded(e, p.x, p.y, world.areas || []);   // 가디언 방벽이 막아 줌
        if (shield) { h.blocked(shield, e.x, e.y, st.damage || 0); return; }
        if (st.damage) h.damage(e, Math.min(st.damage, Math.floor(e.maxHp * U.MAX_ULT_DAMAGE_PCT)), p, e.x, e.y, ch.accent, 'ult');
        if (!e.alive || Skills.fortified(e, world.areas || [])) return;
        e.frozenT = Math.max(e.frozenT || 0, st.freezeSec || 0);
        h.effect({ kind: 'ultHit', x: e.x, y: e.y, color: ch.accent, life: 0.5, pid: e.id });
      });
    }
    if (u) world.ults.push(u);
    if (p.charId !== 'speeder' && p.charId !== 'medic' && h.reveal) h.reveal(p); // 부쉬 안에서 쓰면 드러남
    // 쓰는 순간: 캐릭터 색 빛 고리 + 파티클 + 머리 위 이름 (모든 기기로 전해짐)
    h.effect({ kind: 'ultCast', x: p.x, y: p.y, color: ch.accent, life: 0.9, lv, r: u && u.r ? Math.min(u.r, 7) : 3,
      angle, pid: p.id, text: p.charId });
    h.effect({ kind: 'dmg', x: p.x, y: p.y - p.radius - 2.1, text: st.name + '!', color: ch.accent, life: 1.4, pid: p.id });
    return { ok: true, kind: p.charId };
  }

  // ---------------- 매 프레임 (혼자·교사 기기) ----------------
  /**
   * @param world game state
   * @param h     도우미 { damage(target, dmg, owner, x, y, color, src), blocked(area, x, y, dmg),
   *                     turretHit(area, dmg, x, y, color, owner), knock(target, dx, dy),
   *                     heal(target, amount, owner), effect(e), projectile(b) }
   */
  function update(world, dt, h) {
    const players = world.players;
    if (!world.ults) world.ults = [];
    const byId = {};
    players.forEach((p) => { byId[p.id] = p; });

    // 1) 시간 줄이기 + 메딕 지속 회복
    players.forEach((p) => {
      if (p.ultT > 0) p.ultT = Math.max(0, p.ultT - dt);
      const rg = p.ultRegen;
      if (rg && rg.t > 0) {
        if (!p.alive) { p.ultRegen = null; return; }
        rg.t -= dt;
        rg.acc += rg.rate * dt;
        if (rg.acc >= 1 || rg.t <= 0) { // 1 이상 모이면 한 번에 (숫자가 너무 많이 뜨지 않게)
          const amt = Math.floor(rg.acc);
          rg.acc -= amt;
          if (amt > 0) h.heal(p, amt, byId[rg.by] || null, true);
        }
        if (rg.t <= 0) p.ultRegen = null;
      }
    });

    // 프로스트 궁극기에 언 상대: 남은 시간 동안 전혀 못 움직임 (이동속도 0 — 학생 기기에도 그대로 전해짐)
    players.forEach((p) => {
      if (!(p.frozenT > 0)) return;
      p.frozenT = Math.max(0, p.frozenT - dt);
      if (!p.alive || p.inCapQ) { p.frozenT = 0; return; }
      if (p.frozenT > 0) p.slowFactor = 0;
    });

    // 2) 계속 하는 행동으로 게이지 (가디언 점령지역 지키기 · 스피더 점령 게이지 · 엔지니어 터렛 지역 방어 · 프로스트 둔화)
    players.forEach((p) => {
      const cap = p.stats.capture || 0;
      if (p._ultCap === undefined) p._ultCap = cap;
      const capGain = cap - p._ultCap;
      p._ultCap = cap;
      if (!p.alive || !unlocked(p)) return;
      if (p.charId === 'guardian' && p.zoneId && !p.inCapQ) {
        const z = (world.zones || []).find((o) => o.id === p.zoneId);
        const foe = p.team === 'SOLAR' ? 'LUNAR' : 'SOLAR';
        // 우리 존이 아닌 곳을 밀고 있거나, 상대가 들어온 존을 지키는 중일 때만 (가만히 서 있기만 해서는 안 참)
        if (z && !z.disabled && (z.owner !== p.team || z.counts[foe] > 0)) add(p, 'zone', dt);
      }
      if (p.charId === 'speeder' && capGain > 0) add(p, 'capture', capGain);
      if (p.charId === 'engineer') {
        let n = 0;
        (world.areas || []).forEach((a) => {
          if (a.kind !== 'turret' || a.ownerId !== p.id || a.dead) return;
          players.forEach((e) => {
            if (e.alive && e.team !== p.team && !e.inCapQ && Skills.inside(a, e)) n++;
          });
        });
        if (n > 0) add(p, 'defend', Math.min(2, n) * dt);
      }
    });
    // 프로스트: 실제로 느려진 상대 1명·1초마다 (둔화지역 slowBy · 얼음탄 chillBy)
    players.forEach((e) => {
      if (!e.alive || !(e.slowFactor < 1)) return;
      const by = e.slowBy || (e.chillTimer > 0 ? e.chillBy : null);
      const f = by && byId[by];
      if (f && f.charId === 'frost' && f.team !== e.team) add(f, 'slow', dt);
    });

    // 3) 궁극기 물체
    world.ults.forEach((u) => {
      u.age += dt;
      const owner = byId[u.ownerId];
      const color = CHARACTERS[u.charId].accent;
      if (u.kind === 'cannon') updateCannon(u, owner, world, dt, h, color);
      else if (u.kind === 'aura') {
        if (!owner || !owner.alive) { u.dead = true; return; }
        u.x = owner.x; u.y = owner.y;
      } else if (u.kind === 'drone') updateDrone(u, owner, world, dt, h);
      else if (u.kind === 'field') {
        players.forEach((e) => {
          if (!e.alive || e.inCapQ || e.team === u.team || !inCircle(u, e)) return;
          if (Skills.fortified(e, world.areas || [])) return; // 가디언 MAX 방벽 뒤는 느려지지 않음
          e.slowFactor = Math.min(typeof e.slowFactor === 'number' ? e.slowFactor : 1, u.slowFactor);
          e.slowBy = null; // 궁극기 둔화는 게이지를 채우지 않음
          // 벗어난 뒤에도 1초 더
          if (!(e.chillTimer > 0) || u.slowFactor <= (e.chillFactor || 1)) e.chillFactor = u.slowFactor;
          e.chillTimer = Math.max(e.chillTimer || 0, u.linger);
          e.chillBy = null;
        });
      }
      if (u.age >= u.duration) u.dead = true;
    });
    world.ults = world.ults.filter((u) => !u.dead);
  }

  // 블래스터 캐논: 모으기 → 발사 → 직선으로 날아가며 닿는 상대마다 한 번씩
  function updateCannon(u, owner, world, dt, h, color) {
    if (!u.fired) {
      if (!owner || !owner.alive) { u.dead = true; return; } // 모으는 중에 쓰러지면 취소
      u.x = owner.x; u.y = owner.y;
      if (u.age < u.charge) return;
      u.fired = true;
      u.ox = owner.x; u.oy = owner.y;
      // 벽까지의 거리 (상대는 뚫고 지나가지만 벽에서는 멈춤)
      const x1 = u.ox + Math.cos(u.angle) * u.range, y1 = u.oy + Math.sin(u.angle) * u.range;
      const t = Collision.segmentHitsSolid(u.ox, u.oy, x1, y1, Math.min(0.3, u.width * 0.4));
      u.endDist = t === null ? u.range : Math.max(0.5, t * u.range);
      u.duration = u.charge + u.endDist / u.speed + 0.35;
      if (h.fired) h.fired(u, owner);
    }
    const d0 = u.dist;
    u.dist = Math.min(u.endDist, (u.age - u.charge) * u.speed);
    u.x = u.ox + Math.cos(u.angle) * u.dist;
    u.y = u.oy + Math.sin(u.angle) * u.dist;
    if (u.dist <= d0) return;
    const cx = Math.cos(u.angle), cy = Math.sin(u.angle);
    const ax = u.ox + cx * d0, ay = u.oy + cy * d0;
    const len = u.dist - d0;
    const near = (px, py, r) => {
      const t = Math.max(0, Math.min(len, (px - ax) * cx + (py - ay) * cy));
      const qx = ax + cx * t, qy = ay + cy * t;
      return Math.hypot(px - qx, py - qy) <= u.width + r;
    };
    world.players.forEach((e) => {
      if (!e.alive || e.inCapQ || e.team === u.team || u.hit.indexOf(e.id) !== -1) return;
      if (!near(e.x, e.y, e.radius || PLAYER_RADIUS)) return;
      u.hit.push(e.id);
      const shield = Skills.isShielded(e, u.ox, u.oy, world.areas || []);
      if (shield) { h.blocked(shield, e.x, e.y, u.damage); return; }
      // 즉사 불가: 한 번에 상대 최대 체력의 60%까지
      const dmg = Math.min(u.damage, Math.floor(e.maxHp * U.MAX_ULT_DAMAGE_PCT));
      const ok = h.damage(e, dmg, owner || null, e.x, e.y, color, 'ult');
      if (ok) {
        h.effect({ kind: 'ultHit', x: e.x, y: e.y, color, life: 0.5, pid: e.id });
        if (e.alive && u.knockback) h.knock(e, cx * u.knockback, cy * u.knockback);
      }
    });
    (world.areas || []).forEach((a) => {
      if (a.kind !== 'turret' || a.team === u.team || a.dead || u.hit.indexOf(a.id) !== -1) return;
      if (!near(a.x, a.y, CONFIG.SKILL_FX.TURRET_BODY)) return;
      u.hit.push(a.id);
      h.turretHit(a, Math.round(u.damage * 0.6), a.x, a.y, color, owner || null);
    });
  }

  // 엔지니어 드론: 주인 둘레를 천천히 돌며, 사거리 안 가장 가까운(보이는) 상대를 쏨
  function droneSpot(u, owner) {
    const ang = u.age * 1.4 + (u.id.length % 3);
    return { x: owner.x + Math.cos(ang) * 1.25, y: owner.y - 0.9 + Math.sin(ang) * 0.55 };
  }
  function updateDrone(u, owner, world, dt, h) {
    if (!owner || !owner.alive) { u.dead = true; return; }
    const s = droneSpot(u, owner);
    const k = 1 - Math.exp(-dt * 10);
    u.x += (s.x - u.x) * k;
    u.y += (s.y - u.y) * k;
    u.tick += dt;
    let best = null, bestD = u.range;
    world.players.forEach((e) => {
      if (!e.alive || e.inCapQ || e.team === u.team) return;
      if (Bushes.hiddenFrom(e, u.team, world.players, world.time)) return; // 부쉬에 숨은 상대는 못 봄
      const d = Math.hypot(e.x - u.x, e.y - u.y);
      if (d < bestD && !Collision.lineBlocked(u.x, u.y, e.x, e.y)) { best = e; bestD = d; }
    });
    if (!best) { u.tick = Math.min(u.tick, u.interval); return; }
    u.aim = Math.atan2(best.y - u.y, best.x - u.x);
    if (u.tick < u.interval) return;
    u.tick = 0;
    const body = { id: u.ownerId, team: u.team, charId: u.charId, x: u.x, y: u.y, radius: 0.35 };
    h.projectile(Projectiles.create(body, u.aim, {
      damage: u.damage, speed: 16, size: 0.14, range: u.range + 1, shape: 'bolt', fromTurret: true, fromDrone: true,
    }));
  }

  // ---------------- 학생 기기: 받은 물체를 부드럽게 ----------------
  function clientTick(world, dt) {
    (world.ults || []).forEach((u) => {
      u.age += dt;
      const owner = world.players.find((p) => p.id === u.ownerId);
      if (u.kind === 'aura' && owner) { u.x = owner.x; u.y = owner.y; }
      if (u.kind === 'drone' && owner) {
        const s = droneSpot(u, owner);
        const k = 1 - Math.exp(-dt * 10);
        u.x += (s.x - u.x) * k; u.y += (s.y - u.y) * k;
      }
      if (u.kind === 'cannon' && !u.fired && owner) { u.x = owner.x; u.y = owner.y; }
      if (u.kind === 'cannon' && u.fired) u.dist = Math.min(u.endDist, Math.max(0, (u.age - u.charge) * u.speed));
    });
    world.players.forEach((p) => { if (p.ultT > 0) p.ultT = Math.max(0, p.ultT - dt); });
  }

  // ---------------- 주고받기 (sync.js) ----------------
  const KINDS = ['cannon', 'aura', 'pulse', 'drone', 'field'];
  const r2 = (v) => Math.round((v || 0) * 100) / 100;
  function encode(u, ownerIdx, teamIdx) {
    return [u.id, KINDS.indexOf(u.kind), teamIdx, ownerIdx, r2(u.x), r2(u.y), r2(u.r), r2(u.age), r2(u.duration),
      r2(u.angle), u.lv, u.kind === 'cannon' ? [u.fired ? 1 : 0, r2(u.ox), r2(u.oy), r2(u.endDist), u.charge, u.speed, r2(u.width)] : 0];
  }
  function decode(d, old, ownerOf, teamOf) {
    const u = old[d[0]] || { id: d[0] };
    u.kind = KINDS[d[1]] || 'pulse';
    u.team = teamOf(d[2]);
    const o = ownerOf(d[3]);
    u.ownerId = o ? o.id : null;
    u.charId = o ? o.charId : 'blaster';
    if (u.kind !== 'aura' && u.kind !== 'drone' || u.x === undefined) { u.x = d[4]; u.y = d[5]; }
    u.r = d[6]; u.age = d[7]; u.duration = d[8]; u.angle = d[9]; u.lv = d[10] || 2;
    const c = d[11];
    if (u.kind === 'cannon' && c) {
      u.fired = !!c[0]; u.ox = c[1]; u.oy = c[2]; u.endDist = c[3]; u.charge = c[4]; u.speed = c[5]; u.width = c[6];
      u.dist = u.fired ? Math.min(u.endDist, Math.max(0, (u.age - u.charge) * u.speed)) : 0;
    }
    return u;
  }

  // =========================================================
  //  그리기 (모든 기기)
  // =========================================================
  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function rnd(seed, i) {
    const x = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
    return x - Math.floor(x);
  }
  function seedOf(id) {
    let h = 0;
    const s = String(id);
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 9973;
    return h + 1;
  }
  let lite = false;
  let H = null; // Renderer 도우미 { text, roundRect, hexAlpha } (글자 그리기)
  function initDraw(helpers) { H = helpers; }
  function setLite(on) { if (lite !== !!on) { lite = !!on; layers.clear(); } }

  // 움직이지 않는 부분(그라데이션·무늬·결정)은 한 번만 그려 두고 그림처럼 붙임 (태블릿 부담 줄이기)
  const layers = new Map();
  function layer(c, key, R, x, y, draw) {
    const ppm = Math.abs(c.getTransform().a) || 20;
    const k = key + '|' + R + '|' + Math.round(ppm * 4) / 4 + (lite ? '|l' : '');
    let L = layers.get(k);
    if (!L) {
      const size = Math.ceil(R * 2 * ppm) + 4;
      if (size > 2048 || size < 4) { draw(c, x, y); return; } // 너무 크면 그냥 그림
      const cv = document.createElement('canvas');
      cv.width = cv.height = size;
      const g = cv.getContext('2d');
      g.translate(size / 2, size / 2);
      g.scale(ppm, ppm);
      draw(g, 0, 0);
      L = { cv, size, ppm };
      if (layers.size > 24) layers.clear();
      layers.set(k, L);
    }
    const w = L.size / L.ppm;
    c.drawImage(L.cv, x - w / 2, y - w / 2, w, w);
  }

  /** 바닥 쪽 (캐릭터보다 아래): 보호 영역 · 냉기 영역 · 회복 파동 */
  function drawUnder(c, world, time, hidden) {
    (world.ults || []).forEach((u) => {
      if ((u.kind === 'aura' || u.kind === 'drone') && hidden && hidden.has(u.ownerId)) return;
      if (u.kind === 'aura') drawAura(c, u, time);
      else if (u.kind === 'field') drawField(c, u, time);
      else if (u.kind === 'pulse') drawPulse(c, u);
    });
  }
  /** 위쪽 (캐릭터보다 위): 캐논 · 드론 · 스피더 잔상 */
  function drawOver(c, world, time, hidden) {
    (world.players || []).forEach((p) => {
      if (p.charId === 'speeder' && p.ultT > 0 && p.alive && !(hidden && hidden.has(p.id))) drawSpeedTrail(c, p, time);
      // 꽁꽁 언 캐릭터: 얼음 덩어리 (이동속도 0 = 언 상태, 모든 기기에서 같게 보임)
      if (p.alive && p.slowFactor !== undefined && p.slowFactor <= 0.01 && !(hidden && hidden.has(p.id))) drawIceBlock(c, p, time);
    });
    (world.ults || []).forEach((u) => {
      if (u.kind === 'drone' && !(hidden && hidden.has(u.ownerId))) drawDrone(c, u, time);
      else if (u.kind === 'cannon') drawCannon(c, u, world, time);
    });
  }

  // 얼음 덩어리: 캐릭터를 감싼 반투명 육각 얼음 + 반짝임 + "꽁꽁!"
  function drawIceBlock(c, p, time) {
    const R = (p.radius || PLAYER_RADIUS) + 0.32;
    c.save();
    c.translate(p.x, p.y);
    c.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 6 + i * Math.PI / 3;
      const rr = R * (i % 2 ? 1 : 0.93);
      if (i === 0) c.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    c.closePath();
    c.fillStyle = 'rgba(190, 240, 255, 0.42)';
    c.fill();
    c.strokeStyle = 'rgba(235, 252, 255, 0.95)';
    c.lineWidth = 0.08;
    c.stroke();
    // 얼음 결
    c.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    c.lineWidth = 0.04;
    c.beginPath();
    c.moveTo(-R * 0.55, -R * 0.2); c.lineTo(-R * 0.15, -R * 0.55);
    c.moveTo(R * 0.2, R * 0.5); c.lineTo(R * 0.55, R * 0.1);
    c.stroke();
    // 반짝임
    const tw = 0.5 + 0.5 * Math.sin(time * 6 + (p.x || 0));
    c.fillStyle = 'rgba(255, 255, 255,' + (0.4 + 0.6 * tw) + ')';
    c.beginPath(); c.arc(-R * 0.45, -R * 0.5, 0.07 + 0.04 * tw, 0, TAU); c.fill();
    c.restore();
    if (H) H.text(c, '❄ 꽁꽁!', p.x, p.y + R + 0.45, 0.42, '#bff3ff');
  }

  function fadeIn(u) {
    const left = u.duration - u.age;
    return Math.max(0, Math.min(1, u.age / 0.25, left / 0.4));
  }

  // 가디언 절대 수호: 금빛 육각 무늬 돔 + 천천히 도는 고리
  function auraStatic(c, x, y, r) {
    const g = c.createRadialGradient(x, y, r * 0.2, x, y, r);
    g.addColorStop(0, 'rgba(255, 216, 77, 0.04)');
    g.addColorStop(0.8, 'rgba(255, 216, 77, 0.12)');
    g.addColorStop(1, 'rgba(255, 216, 77, 0.28)');
    c.fillStyle = g;
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    if (lite) return;
    // 육각 무늬 (방패 느낌)
    c.strokeStyle = 'rgba(255, 240, 180, 0.22)';
    c.lineWidth = 0.05;
    const s = 0.9;
    c.save();
    c.beginPath(); c.arc(x, y, r - 0.1, 0, TAU); c.clip();
    c.beginPath();
    for (let gx = -r; gx <= r; gx += s * 1.5) {
      for (let gy = -r; gy <= r; gy += s * 1.732) {
        const ox = x + gx, oy = y + gy + ((Math.round(gx / (s * 1.5)) & 1) ? s * 0.866 : 0);
        for (let i = 0; i < 6; i++) {
          const ang = i * Math.PI / 3;
          const px = ox + Math.cos(ang) * s * 0.5, py = oy + Math.sin(ang) * s * 0.5;
          if (i) c.lineTo(px, py); else c.moveTo(px, py);
        }
        c.closePath();
      }
    }
    c.stroke();
    c.restore();
  }

  function drawAura(c, u, time) {
    const a = fadeIn(u);
    const gold = '#ffd84d';
    c.save();
    c.globalAlpha = a;
    layer(c, 'aura', u.r + 0.2, u.x, u.y, (g, x, y) => auraStatic(g, x, y, u.r));
    c.strokeStyle = gold;
    c.lineWidth = 0.14 + 0.05 * Math.sin(time * 6);
    c.beginPath(); c.arc(u.x, u.y, u.r, 0, TAU); c.stroke();
    // 도는 방패 조각 4개
    c.fillStyle = '#fff4c2';
    for (let i = 0; i < 4; i++) {
      const ang = time * 1.2 + i * TAU / 4;
      c.beginPath(); c.arc(u.x + Math.cos(ang) * u.r, u.y + Math.sin(ang) * u.r, 0.16, 0, TAU); c.fill();
    }
    // 남은 시간 (위쪽 호)
    const left = Math.max(0, 1 - u.age / u.duration);
    c.strokeStyle = '#ffffff';
    c.lineWidth = 0.08;
    c.beginPath(); c.arc(u.x, u.y, u.r + 0.3, -Math.PI / 2, -Math.PI / 2 + TAU * left); c.stroke();
    c.restore();
  }

  // 프로스트 절대 빙결 지대: 푸른 냉기 + 얼음 결정 + 내리는 눈
  function fieldStatic(c, x, y, r) {
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(200, 245, 255, 0.30)');
    g.addColorStop(0.7, 'rgba(120, 210, 255, 0.22)');
    g.addColorStop(1, 'rgba(158, 232, 255, 0.40)');
    c.fillStyle = g;
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    c.strokeStyle = '#e6fbff';
    c.lineWidth = 0.16;
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke();
    // 가장자리 얼음 결정
    const n = lite ? 10 : 18;
    c.fillStyle = 'rgba(230, 251, 255, 0.85)';
    c.beginPath();
    for (let i = 0; i < n; i++) {
      const ang = i * TAU / n + rnd(7, i) * 0.2;
      const len = 0.5 + rnd(7, i + 40) * 0.6;
      const bx = x + Math.cos(ang) * (r - 0.05), by = y + Math.sin(ang) * (r - 0.05);
      c.moveTo(bx + Math.cos(ang + 1.57) * 0.18, by + Math.sin(ang + 1.57) * 0.18);
      c.lineTo(bx - Math.cos(ang) * len, by - Math.sin(ang) * len);
      c.lineTo(bx + Math.cos(ang - 1.57) * 0.18, by + Math.sin(ang - 1.57) * 0.18);
      c.closePath();
    }
    c.fill();
  }

  function drawField(c, u, time) {
    const a = fadeIn(u);
    const seed = seedOf(u.id);
    c.save();
    c.globalAlpha = a;
    layer(c, 'field', u.r + 0.3, u.x, u.y, (g, x, y) => fieldStatic(g, x, y, u.r));
    // 내리는 눈 (천천히 돌며)
    c.fillStyle = '#ffffff';
    const m = lite ? 8 : 16;
    for (let i = 0; i < m; i++) {
      const rr = Math.sqrt(rnd(seed, i + 90)) * (u.r - 0.3);
      const ang = rnd(seed, i + 130) * TAU + time * 0.25;
      const fy = ((time * 0.6 + rnd(seed, i + 170)) % 1) * 0.8;
      c.globalAlpha = a * (0.4 + 0.6 * Math.sin(Math.PI * fy / 0.8));
      c.beginPath(); c.arc(u.x + Math.cos(ang) * rr, u.y + Math.sin(ang) * rr + fy - 0.4, 0.07, 0, TAU); c.fill();
    }
    c.globalAlpha = a;
    const left = Math.max(0, 1 - u.age / u.duration);
    c.strokeStyle = '#ffffff';
    c.lineWidth = 0.08;
    c.beginPath(); c.arc(u.x, u.y, u.r + 0.3, -Math.PI / 2, -Math.PI / 2 + TAU * left); c.stroke();
    c.restore();
  }

  // 메딕 생명 에너지 폭발: 퍼지는 초록 파동 + 십자 빛
  function drawPulse(c, u) {
    const k = Math.min(1, u.age / u.duration);
    const e = 1 - Math.pow(1 - k, 3);
    c.save();
    c.globalAlpha = 1 - k;
    c.fillStyle = 'rgba(109, 255, 168, 0.18)';
    c.beginPath(); c.arc(u.x, u.y, u.r * e, 0, TAU); c.fill();
    c.strokeStyle = '#6dffa8';
    c.lineWidth = 0.3 * (1 - k) + 0.06;
    c.beginPath(); c.arc(u.x, u.y, u.r * e, 0, TAU); c.stroke();
    c.strokeStyle = '#ffffff';
    c.lineWidth = 0.1;
    c.beginPath(); c.arc(u.x, u.y, u.r * Math.max(0, e - 0.15), 0, TAU); c.stroke();
    c.restore();
  }

  // 블래스터 캐논: 모으는 빛 → 큰 에너지탄과 긴 빛 꼬리
  function drawCannon(c, u, world, time) {
    const color = '#ff6b8a';
    c.save();
    if (!u.fired) {
      const k = Math.min(1, u.age / (u.charge || 0.5));
      const mx = u.x + Math.cos(u.angle) * 0.9, my = u.y + Math.sin(u.angle) * 0.9 - 0.4;
      // 모여드는 빛 알갱이
      c.fillStyle = '#ffd0db';
      for (let i = 0; i < 10; i++) {
        const ang = i * TAU / 10 + time * 5;
        const d = 1.8 * (1 - k) + 0.3;
        c.globalAlpha = 0.5 + 0.5 * k;
        c.beginPath(); c.arc(mx + Math.cos(ang) * d, my + Math.sin(ang) * d, 0.08, 0, TAU); c.fill();
      }
      const R = 0.2 + 0.6 * k;
      const g = c.createRadialGradient(mx, my, 0, mx, my, R * 1.8);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.4, hexA(color, 0.9));
      g.addColorStop(1, hexA(color, 0));
      c.globalAlpha = 1;
      c.fillStyle = g;
      c.beginPath(); c.arc(mx, my, R * 1.8, 0, TAU); c.fill();
      // 발사 방향 미리보기 선 (상대도 피할 수 있게)
      c.globalAlpha = 0.25 + 0.35 * k;
      c.strokeStyle = color;
      c.lineWidth = (u.width || 0.7) * 2;
      c.setLineDash([0.5, 0.4]);
      c.beginPath(); c.moveTo(u.x, u.y); c.lineTo(u.x + Math.cos(u.angle) * 4, u.y + Math.sin(u.angle) * 4); c.stroke();
      c.setLineDash([]);
      c.restore();
      return;
    }
    const w = u.width || 0.7;
    const hx = u.ox + Math.cos(u.angle) * u.dist, hy = u.oy + Math.sin(u.angle) * u.dist;
    const tail = Math.max(0, u.dist - 7);
    const tx = u.ox + Math.cos(u.angle) * tail, ty = u.oy + Math.sin(u.angle) * tail;
    const ending = u.dist >= u.endDist ? Math.max(0, 1 - (u.age - u.charge - u.endDist / u.speed) / 0.35) : 1;
    c.globalAlpha = ending;
    // 꼬리
    const g = c.createLinearGradient(tx, ty, hx, hy);
    g.addColorStop(0, hexA(color, 0));
    g.addColorStop(1, hexA(color, 0.75));
    c.strokeStyle = g;
    c.lineCap = 'round';
    c.lineWidth = w * 2;
    c.beginPath(); c.moveTo(tx, ty); c.lineTo(hx, hy); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.8)';
    c.lineWidth = w * 0.6;
    c.beginPath(); c.moveTo(tx + (hx - tx) * 0.5, ty + (hy - ty) * 0.5); c.lineTo(hx, hy); c.stroke();
    // 머리
    const R = w * 1.5;
    const hg = c.createRadialGradient(hx, hy, 0, hx, hy, R * 1.6);
    hg.addColorStop(0, '#ffffff');
    hg.addColorStop(0.35, '#ffd0db');
    hg.addColorStop(0.7, hexA(color, 0.8));
    hg.addColorStop(1, hexA(color, 0));
    c.fillStyle = hg;
    c.beginPath(); c.arc(hx, hy, R * 1.6, 0, TAU); c.fill();
    // 튀는 불꽃
    if (!lite) {
      const seed = seedOf(u.id);
      c.fillStyle = '#ffe0e8';
      for (let i = 0; i < 8; i++) {
        const back = rnd(seed, i + Math.floor(time * 20)) * 3;
        const side = (rnd(seed, i + 50 + Math.floor(time * 20)) - 0.5) * w * 2.4;
        const px = hx - Math.cos(u.angle) * back - Math.sin(u.angle) * side;
        const py = hy - Math.sin(u.angle) * back + Math.cos(u.angle) * side;
        c.beginPath(); c.arc(px, py, 0.07, 0, TAU); c.fill();
      }
    }
    c.restore();
  }

  // 엔지니어 드론: 작은 보라색 기계 + 프로펠러 + 눈
  function drawDrone(c, u, time) {
    const a = fadeIn(u);
    const x = u.x, y = u.y + Math.sin(time * 4) * 0.08;
    c.save();
    c.globalAlpha = a;
    // 작은 화면에서도 잘 보이게 1.35배
    c.translate(x, y); c.scale(1.35, 1.35); c.translate(-x, -y);
    // 그림자
    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.beginPath(); c.ellipse(x, y + 1.0, 0.45, 0.16, 0, 0, TAU); c.fill();
    // 팔과 프로펠러
    c.strokeStyle = '#6c5a9e';
    c.lineWidth = 0.08;
    [[-0.5, -0.12], [0.5, -0.12]].forEach(([dx, dy]) => {
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + dx, y + dy); c.stroke();
      c.strokeStyle = 'rgba(230, 220, 255, 0.7)';
      c.beginPath(); c.ellipse(x + dx, y + dy - 0.05, 0.3 * Math.abs(Math.cos(time * 30)), 0.06, 0, 0, TAU); c.stroke();
      c.strokeStyle = '#6c5a9e';
    });
    // 몸
    c.fillStyle = '#c49bff';
    c.beginPath(); c.ellipse(x, y, 0.36, 0.26, 0, 0, TAU); c.fill();
    c.fillStyle = '#3b2a6b';
    c.beginPath(); c.ellipse(x, y + 0.04, 0.22, 0.14, 0, 0, TAU); c.fill();
    // 눈 (조준 방향)
    const ex = x + Math.cos(u.aim || 0) * 0.1, ey = y + 0.04 + Math.sin(u.aim || 0) * 0.05;
    c.fillStyle = '#6dffea';
    c.beginPath(); c.arc(ex, ey, 0.08, 0, TAU); c.fill();
    // 남은 시간 고리
    const left = Math.max(0, 1 - u.age / u.duration);
    c.strokeStyle = '#e3d4ff';
    c.lineWidth = 0.05;
    c.beginPath(); c.arc(x, y, 0.5, -Math.PI / 2, -Math.PI / 2 + TAU * left); c.stroke();
    c.restore();
  }

  // 스피더 초고속 돌파: 달리는 반대쪽으로 빛줄기 잔상
  function drawSpeedTrail(c, p, time) {
    const v = Math.hypot(p.vx || 0, p.vy || 0);
    const ang = v > 0.5 ? Math.atan2(p.vy, p.vx) : p.facing || 0;
    c.save();
    c.strokeStyle = '#ff9df5';
    c.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const side = (i - 2) * 0.22;
      const len = 1.2 + 0.8 * ((Math.sin(time * 18 + i * 1.7) + 1) / 2) + Math.min(1.5, v * 0.15);
      const sx = p.x - Math.sin(ang) * side, sy = p.y - 0.5 + Math.cos(ang) * side;
      c.globalAlpha = 0.25 + 0.15 * (i % 2);
      c.lineWidth = i === 2 ? 0.14 : 0.08;
      c.beginPath(); c.moveTo(sx - Math.cos(ang) * 0.4, sy - Math.sin(ang) * 0.4);
      c.lineTo(sx - Math.cos(ang) * (0.4 + len), sy - Math.sin(ang) * (0.4 + len)); c.stroke();
    }
    c.globalAlpha = 0.35 + 0.15 * Math.sin(time * 10);
    c.strokeStyle = '#ffffff';
    c.lineWidth = 0.06;
    c.beginPath(); c.ellipse(p.x, p.y + 0.42, 0.95, 0.42, 0, 0, TAU); c.stroke();
    c.restore();
  }

  /** 짧은 효과 — 이 파일이 그린 것이면 true */
  function drawEffect(c, e) {
    const k = Math.max(0, Math.min(1, e.age / e.life));
    if (e.kind === 'ultCast') {
      const color = e.color || '#ffffff';
      const R = (e.r || 3) * (0.3 + 0.9 * (1 - Math.pow(1 - k, 3)));
      const seed = seedOf(Math.round(e.x * 10) + ':' + Math.round(e.y * 10));
      c.save();
      if (k < 0.25) {
        c.globalAlpha = (1 - k / 0.25) * 0.5;
        c.fillStyle = '#ffffff';
        c.beginPath(); c.arc(e.x, e.y, 1.6, 0, TAU); c.fill();
      }
      c.globalAlpha = 1 - k;
      c.strokeStyle = color;
      c.lineWidth = 0.35 * (1 - k) + 0.05;
      c.beginPath(); c.arc(e.x, e.y, R, 0, TAU); c.stroke();
      c.strokeStyle = '#ffffff';
      c.lineWidth = 0.1;
      c.beginPath(); c.arc(e.x, e.y, R * 0.7, 0, TAU); c.stroke();
      // 강한 파티클 (캐릭터 색)
      const n = lite ? 12 : 26;
      for (let i = 0; i < n; i++) {
        const ang = rnd(seed, i) * TAU;
        const d = (0.5 + rnd(seed, i + 33) * (e.r || 3)) * (1 - Math.pow(1 - k, 2));
        c.fillStyle = i % 3 ? color : '#ffffff';
        c.beginPath(); c.arc(e.x + Math.cos(ang) * d, e.y + Math.sin(ang) * d - k * 0.6, 0.16 * (1 - k) + 0.04, 0, TAU); c.fill();
      }
      // 빛 기둥
      c.globalAlpha = (1 - k) * 0.6;
      const g = c.createLinearGradient(e.x, e.y, e.x, e.y - 4);
      g.addColorStop(0, hexA(color.length === 7 ? color : '#ffffff', 0.7));
      g.addColorStop(1, hexA(color.length === 7 ? color : '#ffffff', 0));
      c.fillStyle = g;
      c.fillRect(e.x - 0.55, e.y - 4, 1.1, 4);
      c.restore();
      return true;
    }
    if (e.kind === 'ultHit') {
      c.save();
      c.globalAlpha = 1 - k;
      c.strokeStyle = e.color || '#ff6b8a';
      c.lineWidth = 0.18;
      c.beginPath(); c.arc(e.x, e.y, 0.6 + k * 1.3, 0, TAU); c.stroke();
      c.strokeStyle = '#ffffff';
      c.lineWidth = 0.08;
      for (let i = 0; i < 8; i++) {
        const a = i * TAU / 8;
        c.beginPath();
        c.moveTo(e.x + Math.cos(a) * (0.4 + k), e.y + Math.sin(a) * (0.4 + k));
        c.lineTo(e.x + Math.cos(a) * (0.9 + k * 1.6), e.y + Math.sin(a) * (0.9 + k * 1.6));
        c.stroke();
      }
      c.restore();
      return true;
    }
    if (e.kind === 'ultReady') {
      // 게이지 MAX: 내 캐릭터 둘레 금빛 고리가 반짝 (작게, 한 번)
      c.save();
      c.globalAlpha = 1 - k;
      c.strokeStyle = '#ffd84d';
      c.lineWidth = 0.12;
      c.beginPath(); c.ellipse(e.x, e.y + 0.3, 1.2 + k * 1.2, 0.6 + k * 0.6, 0, 0, TAU); c.stroke();
      c.fillStyle = '#fff4c2';
      for (let i = 0; i < 6; i++) {
        const a = i * TAU / 6 + k * 3;
        c.beginPath(); c.arc(e.x + Math.cos(a) * (1.2 + k), e.y + 0.3 + Math.sin(a) * (0.6 + k * 0.5) - k * 1.2, 0.1, 0, TAU); c.fill();
      }
      c.restore();
      return true;
    }
    return false;
  }

  // 레벨 설명 (도움말·레벨업 알림)
  function describe(charId, level) {
    const st = stats(charId, level);
    const parts = [];
    if (charId === 'blaster') parts.push('피해 ' + st.damage + ' · 사거리 ' + st.range + 'm · 밀어내기 ' + st.knockback + 'm · 관통');
    if (charId === 'guardian') parts.push('반지름 ' + st.r + 'm · ' + st.duration + '초 · 받는 피해 ' + Math.round(st.reduce * 100) + '% 줄임');
    if (charId === 'medic') parts.push('반지름 ' + st.r + 'm · 바로 ' + Math.round(st.healPct * 100) + '% 회복 + ' + st.regenSec + '초 동안 1초에 ' + Math.round(st.regenPct * 100) + '%');
    if (charId === 'speeder') parts.push(st.duration + '초 · 이동속도 ×' + st.speedMult + ' · 순간이동 거리 ×' + st.blinkRangeMult + (st.blinkCostMult === 0 ? ' · 순간이동 에너지 0' : ' · 순간이동 에너지 절반'));
    if (charId === 'engineer') parts.push(st.duration + '초 · 사거리 ' + st.range + 'm · 한 발 ' + st.damage);
    if (charId === 'frost') parts.push('반지름 ' + st.r + 'm · 꽁꽁 ' + st.freezeSec + '초 · 얼음 피해 ' + st.damage + ' · 이어서 ' + st.duration + '초 동안 ' + Math.round((1 - st.slowFactor) * 100) + '% 느리게');
    return parts.join('');
  }

  return {
    initDraw,
    def, stats, statsOf, unlocked, gauge, active, isReady, canUse, setEnabled,
    add, onDamage, onKnockout, onShieldBlock, onHeal,
    damageMult, knockMult, speedMult, blinkRangeMult, blinkCostMult,
    use, update, clientTick, encode, decode,
    drawUnder, drawOver, drawEffect, setLite, describe,
  };
})();
