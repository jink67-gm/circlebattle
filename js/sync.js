/* ============================================================
   서클 배틀 - 경기 동기화 (sync.js)
   ------------------------------------------------------------
   STEP 16: 여러 기기가 같은 경기를 보도록 경기 상황을 주고받습니다.

   ■ 교사 기기(호스트)가 심판입니다.
     - 체력·에너지·점령·점수·시간·특수기·명중 판정은 모두 교사 기기가 계산합니다.
     - 1초에 10번 "경기 상황(snap)"을 올립니다.
   ■ 학생 기기
     - 내 캐릭터 움직임은 바로 반응하도록 내 기기에서 계산하고, 위치를 1초에 12번 올립니다.
     - 쏘기·특수기·수학 미션 결과는 "명령"으로 보냅니다. 교사 기기가 처리했다고
       알려 줄 때(ack)까지 계속 다시 보내므로 중간에 한 번 끊겨도 사라지지 않습니다.
     - 다른 친구들은 받은 위치로 부드럽게 따라 움직여 그립니다.
   ■ 순간이동·재등장처럼 교사 기기가 위치를 바꾸면 warp 번호가 올라가고,
     학생 기기는 그 위치로 옮겨 갑니다.

   Firebase 를 직접 부르지 않고 network.js 의 Net 만 사용합니다.
   ============================================================ */

const Sync = (function () {
  const N = CONFIG.NET;
  const TEAM_IDX = { SOLAR: 1, LUNAR: 2 };
  const IDX_TEAM = [null, 'SOLAR', 'LUNAR'];
  // 수정 STEP 2: 존 이름 ↔ 번호 (0 = 없음). 존 순서는 모든 기기에서 같음 (map.js)
  const zoneIdx = (id) => (id ? GameMap.zones.findIndex((z) => z.id === id) + 1 : 0);
  const idxZone = (i) => (i > 0 && GameMap.zones[i - 1] ? GameMap.zones[i - 1].id : null);
  const UI_ALLOWED = ['showToast', 'bumpScore'];

  let role = null;        // 'host' | 'client' | null
  let base = null;        // rooms/{방 번호}
  let matchId = null;
  let lineup = [];        // 모든 기기가 같은 순서로 쓰는 참가자 목록
  let indexOf = {};       // id → lineup 순서
  let hooks = {};
  const offs = [];
  let hostOnline = true;

  // 교사 기기
  let inputs = {};        // 학생 id → 마지막으로 받은 입력
  let acks = {};          // 학생 id → 처리한 마지막 명령 번호
  let sessOf = {};        // 학생 id → 학생 기기의 접속 번호 (새로고침 후 다시 들어오면 바뀜)
  let seenAt = {};        // 학생 id → 마지막으로 소식을 받은 시각 (ms) — 오래 없으면 "자리 비움"
  let events = [];        // 최근 효과·알림 { t, d }
  let evSeq = 0;
  let snapTimer = 0;

  // 학생 기기
  let myId = null;
  let lastEvSeq = 0;
  let cmdSeq = 0;
  let pending = [];       // 아직 처리 확인을 못 받은 명령
  let sess = 0;           // 이 기기의 이번 접속 번호 (명령 번호를 1부터 다시 세기 위해)
  let sendTimer = 0;
  let lastSentKey = '';
  let flushNow = false;
  let lastSnapAt = 0;     // 마지막으로 경기 상황을 받은 시각 (ms)
  let sendCount = 0;

  const r1 = (v) => Math.round((v || 0) * 10) / 10;
  const r2 = (v) => Math.round((v || 0) * 100) / 100;
  const r3 = (v) => Math.round((v || 0) * 1000) / 1000;

  function setLineup(list) {
    lineup = Net.toArray(list);
    indexOf = {};
    lineup.forEach((p, i) => { indexOf[p.id] = i; });
  }

  function findPlayer(state, id) {
    return state.players.find((p) => p.id === id) || null;
  }

  function stop() {
    offs.splice(0).forEach((off) => off());
    role = null;
    base = null;
    matchId = null;
    inputs = {};
    acks = {};
    sessOf = {};
    seenAt = {};
    events = [];
    pending = [];
  }

  // 다른 기기 캐릭터를 받은 위치로 부드럽게 옮김 (멀리 떨어지면 바로 이동)
  function smoothTo(p, tx, ty, dt) {
    const dx = tx - p.x, dy = ty - p.y;
    if (dx * dx + dy * dy > 16) {
      p.x = tx; p.y = ty; p.vx = p.vy = 0;
      return;
    }
    const k = 1 - Math.exp(-dt * 14);
    const nx = p.x + dx * k, ny = p.y + dy * k;
    if (dt > 0) { p.vx = (nx - p.x) / dt; p.vy = (ny - p.y) / dt; }
    p.x = nx;
    p.y = ny;
  }

  // =========================================================
  //  교사 기기 (호스트)
  // =========================================================
  function startHost(opts) {
    stop();
    role = 'host';
    base = Net.ref('rooms/' + opts.roomCode);
    matchId = opts.matchId;
    setLineup(opts.lineup);
    evSeq = 0;
    snapTimer = 1; // 시작하자마자 한 번 보냄
    // 학생 기기가 준비될 때까지 기다려 줌 (AWAY_SEC 안에 소식이 없으면 자리 비움)
    const t0 = performance.now();
    lineup.forEach((l) => { seenAt[l.id] = t0; });
    const inRef = base.child('in');
    const onInput = (s) => {
      const v = s.val();
      if (v && v.mid === matchId) { inputs[s.key] = v; seenAt[s.key] = performance.now(); }
    };
    inRef.on('child_added', onInput);
    inRef.on('child_changed', onInput);
    offs.push(() => { inRef.off('child_added', onInput); inRef.off('child_changed', onInput); });
  }

  /**
   * 학생 기기에서 받은 위치를 반영하고, 새 명령을 돌려줌
   * @returns [{ p, c }]  c = { q, k: 'f'(쏘기) | 's'(특수기) | 'm'(수학 미션), ... }
   */
  function hostTakeInputs(state, dt) {
    const cmds = [];
    state.players.forEach((p) => {
      if (!p.remote) return;
      const inp = inputs[p.id];
      // STEP 18: 학생이 경기에서 나갔거나(lv) 오래 소식이 없으면 캐릭터가 잠시 쉼
      const away = (inp && inp.lv) || performance.now() - (seenAt[p.id] || 0) > N.AWAY_SEC * 1000;
      if (away !== !!p.away) setAway(p, away);
      if (away) return;
      if (inp) {
        // 학생이 새로고침하고 다시 들어오면 명령 번호가 1부터 다시 시작
        if (inp.s !== sessOf[p.id]) { sessOf[p.id] = inp.s; acks[p.id] = 0; }
        // m: 1 에너지 터미널 문제 / 2 점령 문제 (수정 STEP 2 — 무적은 game.js 가 확인한 뒤에 켬)
        p.inMission = inp.m === 1 || inp.m === true;
        p.netCapQ = inp.m === 2;
        // 교사 기기가 옮긴 뒤(warp)의 위치만 받음 → 재등장 직후 예전 자리로 끌려가지 않음
        // 점령 문제를 푸는 동안은 움직일 수 없으므로 위치를 받지 않음
        if (p.alive && !p.inCapQ && (inp.w | 0) === (p.warp | 0) && isFinite(inp.x) && isFinite(inp.y)) {
          p.netX = inp.x;
          p.netY = inp.y;
          if (isFinite(inp.f)) p.facing = inp.f;
        }
        Net.toArray(inp.c).forEach((c) => {
          if (!c || !(c.q > (acks[p.id] || 0))) return;
          acks[p.id] = c.q;
          cmds.push({ p, c });
        });
      }
      if (p.alive && p.netX !== undefined) smoothTo(p, p.netX, p.netY, dt);
    });
    return cmds;
  }

  // 자리 비움: 경기장에서 빠짐 (존을 막거나 과녁이 되지 않게). 돌아오면 곧 시작 지역에서 재등장
  function setAway(p, on) {
    p.away = on;
    p.inMission = false;
    p.inCapQ = false;
    p.netCapQ = false;
    if (on) {
      p.alive = false;
      p.respawnTimer = 1e9;
    } else if (!p.alive) {
      p.respawnTimer = 0.3;
    }
  }

  // 교사 기기가 캐릭터를 옮겼을 때 (재등장·순간이동)
  function warp(p) {
    p.warp = (p.warp || 0) + 1;
    p.netX = p.x;
    p.netY = p.y;
  }

  function pushEvent(state, d) {
    d.q = ++evSeq;
    events.push({ t: state.time, d });
  }

  // 새 STEP 3: 블래스터 폭발에 학생 캐릭터가 밀려남 → 그 학생 기기가 직접 밀어냄 (위치는 학생 기기가 정하므로)
  function hostKnock(state, p, dx, dy) {
    if (role !== 'host' || indexOf[p.id] === undefined) return;
    pushEvent(state, { k: 'kb', i: indexOf[p.id], x: r2(dx), y: r2(dy) });
  }
  function decodeKnock(e) {
    const l = lineup[e.i];
    return l && isFinite(e.x) && isFinite(e.y) ? { id: l.id, dx: e.x, dy: e.y } : null;
  }

  // 수정 STEP 5: 모든 기기에 보낼 사건 (TEAM BOOST 등)
  function hostEvent(state, d) {
    if (role !== 'host') return;
    pushEvent(state, d);
  }

  // 모든 기기에 보여 줄 알림 (점령·점수·연장전)
  function hostUi(state, fn, args) {
    if (role !== 'host') return;
    // 인자 끝의 undefined 는 빼고, 가운데 것은 null 로 (Firebase 는 undefined 를 못 씀)
    const a = args.slice();
    while (a.length && a[a.length - 1] === undefined) a.pop();
    pushEvent(state, { k: 'ui', f: fn, a: a.map((x) => (x === undefined ? null : x)) });
  }

  // 새로 생긴 탄과 효과를 사건으로 (매 프레임: 금방 사라지는 탄도 놓치지 않게)
  function collect(state) {
    state.projectiles.forEach((b) => {
      if (b.netSent) return;
      b.netSent = true;
      const d = { k: 'b', o: indexOf[b.ownerId] === undefined ? -1 : indexOf[b.ownerId],
        x: r2(b.originX), y: r2(b.originY), a: r3(b.angle) };
      if (b.fromTurret) { d.tu = 1; d.rg = r2(b.range); d.dm = b.damage; d.sp = b.speed; }
      pushEvent(state, d);
    });
    state.effects.forEach((e) => {
      if (e.netSent || e.local) return;
      e.netSent = true;
      const d = { k: 'fx', kd: e.kind, x: r2(e.x), y: r2(e.y), l: r2(e.life) };
      if (e.color) d.c = e.color;
      if (e.big) d.b = 1;
      if (e.gold) d.g = 1;
      if (e.radius !== undefined) d.rd = r2(e.radius);
      if (e.r !== undefined) d.r = r2(e.r);
      if (e.text !== undefined) d.tx = String(e.text);
      if (e.pid && indexOf[e.pid] !== undefined) d.pi = indexOf[e.pid]; // 새 STEP 2: 누구 머리 위 효과인지 (부쉬에 숨으면 안 그림)
      // 새 STEP 3: 스킬 효과 모양 (레벨, 방향, 두 번째 점)
      if (e.lv) d.lv = e.lv;
      if (e.angle !== undefined) d.a = r2(e.angle);
      if (e.x2 !== undefined) { d.x2 = r2(e.x2); d.y2 = r2(e.y2); }
      if (e.ax !== undefined) { d.ax = r2(e.ax); d.ay = r2(e.ay); }
      pushEvent(state, d);
    });
  }

  function encPlayer(p, now) {
    if (!p) return [0];
    const flags = (p.alive ? 1 : 0) | (p.inMission ? 2 : 0) | (p.inCapQ ? 4 : 0);
    return [r2(p.x), r2(p.y), r2(p.facing), Math.round(p.hp), r1(p.energy), flags, r1(Math.min(p.respawnTimer, 99)),
      r1(p.protect), Math.round(p.shieldHp), r1(p.shieldTimer), r1(p.boostTimer), r2(p.slowFactor || 1),
      p.warp | 0, acks[p.id] || 0, p.missionsUsed | 0, sessOf[p.id] || 0,
      // 수정 STEP 2: 점령 준비 시간, 버티는 존, 점령 문제를 풀 수 있는 존, 재도전까지 남은 시간
      r1(p.capPrep), zoneIdx(p.capPrepZone), zoneIdx(p.capReady), r1(p.capRetry),
      p.skillLevel | 0, // 수정 STEP 4: 스킬 레벨
      r1(Math.max(0, (p.revealedUntil || 0) - now)), // 새 STEP 2: 부쉬 안에서 드러나 있는 남은 시간
      r1(p.dashTimer)]; // 새 STEP 3: 스피더 MAX 가속 남은 시간
  }

  function encZone(z) {
    return [TEAM_IDX[z.owner] || 0, r1(z.progress), TEAM_IDX[z.progressTeam] || 0, r1(z.scoreTimer),
      z.counts.SOLAR, z.counts.LUNAR, z.disabled ? 1 : 0,
      (z.active.SOLAR ? 1 : 0) | (z.active.LUNAR ? 2 : 0)]; // 수정 STEP 2: 점령 활성화한 팀
  }

  function encArea(a) {
    return [a.id, a.kind, TEAM_IDX[a.team], indexOf[a.ownerId] === undefined ? -1 : indexOf[a.ownerId],
      a.charId, r2(a.x), r2(a.y), a.r, r2(a.age), a.duration, r2(a.aim || 0), a.level | 0,
      Math.round(a.hp || 0)]; // 새 STEP 3: 보호막이 더 막을 수 있는 양 / 터렛 체력
  }

  // 매 프레임 호출: 사건 모으기 + 정해진 간격마다 경기 상황 올리기
  function hostSend(state, dt) {
    if (role !== 'host') return;
    collect(state);
    snapTimer += dt;
    if (snapTimer < 1 / N.SNAPSHOT_HZ) return;
    snapTimer = 0;
    events = events.filter((e) => state.time - e.t <= N.EVENT_KEEP_SEC);
    const snap = {
      mid: matchId,
      t: r2(state.time),
      ph: state.phase,
      tl: r1(state.timeLeft),
      sc: [state.score.SOLAR, state.score.LUNAR],
      p: lineup.map((l) => encPlayer(findPlayer(state, l.id), state.time)),
      z: state.zones.map(encZone),
    };
    if (events.length) snap.ev = events.map((e) => e.d);
    if (state.areas.length) snap.a = state.areas.map(encArea);
    // 수정 STEP 5: 팀별 TEAM BOOST 같은 종류를 다시 고를 수 있기까지 남은 시간 (고르기 화면에서 흐리게)
    snap.tb = ['SOLAR', 'LUNAR'].map((t) => CONFIG.TEAM_BOOST.TYPES.map((b) => r1(state.teamBoostCd[t][b.id])));
    if (state.result) snap.res = [TEAM_IDX[state.result.winner] || 0, state.result.reason];
    base.child('snap').set(snap);
  }

  // =========================================================
  //  학생 기기
  // =========================================================
  /**
   * @param opts  { roomCode, matchId, lineup, myId }
   * @param state 게임 상태 (game.js)
   * @param h     { onEvent(ev), onSnapshot(snap), onMyKnockout(), onMyRespawn() }
   */
  function startClient(opts, state, h) {
    stop();
    role = 'client';
    base = Net.ref('rooms/' + opts.roomCode);
    matchId = opts.matchId;
    myId = opts.myId;
    hooks = h || {};
    setLineup(opts.lineup);
    lastEvSeq = 0;
    cmdSeq = 0;
    pending = [];
    sess = 1 + Math.floor(Math.random() * 1e6);
    sendTimer = 0;
    lastSentKey = '';
    lastSnapAt = performance.now();
    const snapRef = base.child('snap');
    const onSnap = (s) => {
      const v = s.val();
      if (v && v.mid === matchId && role === 'client') applySnapshot(state, v);
    };
    snapRef.on('value', onSnap);
    offs.push(() => snapRef.off('value', onSnap));
    // STEP 19: 경기가 끝나면 교사 기기가 올리는 기록
    const resRef = base.child('result');
    const onRes = (s) => {
      const v = s.val();
      if (v && v.mid === matchId && hooks.onResult) hooks.onResult(v.r ? v.r[myId] || null : null);
    };
    resRef.on('value', onRes);
    offs.push(() => resRef.off('value', onRes));
  }

  function applySnapshot(state, v) {
    lastSnapAt = performance.now();
    const sc = Net.toArray(v.sc);
    state.score.SOLAR = sc[0] || 0;
    state.score.LUNAR = sc[1] || 0;
    state.timeLeft = v.tl || 0;

    // 에너지 존
    Net.toArray(v.z).forEach((d, i) => {
      const z = state.zones[i];
      if (!z || !d) return;
      z.owner = IDX_TEAM[d[0]] || null;
      z.progress = d[1] || 0;
      z.progressTeam = IDX_TEAM[d[2]] || null;
      z.scoreTimer = d[3] || 0;
      z.counts.SOLAR = d[4] || 0;
      z.counts.LUNAR = d[5] || 0;
      z.contested = z.counts.SOLAR > 0 && z.counts.LUNAR > 0;
      z.disabled = !!d[6];
      z.active.SOLAR = !!(d[7] & 1);
      z.active.LUNAR = !!(d[7] & 2);
    });

    // 특수기 원 (같은 원은 같은 물체를 계속 써서 부드럽게)
    const old = {};
    state.areas.forEach((a) => { old[a.id] = a; });
    state.areas = Net.toArray(v.a).map((d) => {
      const a = old[d[0]] || { id: d[0], helped: [], dead: false };
      a.kind = d[1];
      a.team = IDX_TEAM[d[2]];
      const owner = lineup[d[3]];
      a.ownerId = owner ? owner.id : null;
      a.charId = d[4];
      a.x = d[5]; a.y = d[6]; a.r = d[7];
      a.area = circleArea(a.r);
      a.age = d[8] || 0;
      a.duration = d[9];
      a.aim = d[10] || 0;
      a.level = d[11] || 1; // 수정 STEP 4
      // 새 STEP 3: 보호막·터렛 체력 (줄어들면 잠깐 반짝임)
      const st = CHARACTERS[a.charId] ? Skills.stats(a.charId, a.level) : {};
      a.maxHp = a.kind === 'shield' ? st.shieldHp || 0 : a.kind === 'turret' ? st.hp || 0 : 0;
      const hp = d[12] === undefined ? a.maxHp : d[12];
      if (a.hp !== undefined && hp < a.hp) a.hitFlash = 0.15;
      a.hp = hp;
      return a;
    });

    // 플레이어
    Net.toArray(v.p).forEach((d, i) => {
      const l = lineup[i];
      const p = l && findPlayer(state, l.id);
      if (!p || !d || d.length < 14) return;
      const wasAlive = p.alive;
      const alive = !!(d[5] & 1);
      if (d[3] < p.hp && alive) p.hitFlash = 0.15;
      p.hp = d[3];
      p.energy = d[4];
      p.alive = alive;
      p.respawnTimer = d[6];
      p.protect = d[7];
      p.shieldHp = d[8];
      p.shieldTimer = d[9];
      p.boostTimer = Math.max(d[10], p.isLocal && p.boostTimer > d[10] + 0.4 ? p.boostTimer : 0);
      p.slowFactor = d[11];
      p.missionsUsedHost = d[14] | 0;
      p.revealedUntil = state.time + (d[21] || 0); // 새 STEP 2: 부쉬 안에서 공격·피격으로 드러난 시간
      p.dashTimer = d[22] || 0; // 새 STEP 3
      const warpNo = d[12] | 0;
      if (p.isLocal) {
        // 내 캐릭터: 위치는 내 기기가 정함. 교사 기기가 옮겼을 때만 따라감
        if (warpNo !== (p.warp | 0)) {
          p.warp = warpNo;
          p.x = d[0]; p.y = d[1]; p.vx = p.vy = 0;
        }
        // 교사 기기가 처리한 명령은 다시 보내지 않음 (이번 접속의 번호일 때만)
        const ack = d[13] | 0;
        if (ack && (d[15] | 0) === sess) pending = pending.filter((c) => c.q > ack);
        // 아직 처리되지 않은 특수기·미션의 에너지는 미리 반영해서 보여줌 (숫자가 오르내리지 않게)
        const predicted = pending.reduce((sum, c) => sum + (c.de || 0), 0);
        p.energy = Math.max(0, Math.min(CONFIG.ENERGY.MAX, d[4] + predicted));
        p.missionsUsed = Math.max(p.missionsUsed | 0, d[14] | 0);
        // 수정 STEP 2: 점령 준비·문제 (판정은 교사 기기, 막대만 내 기기에서 부드럽게)
        p.hostCapQ = !!(d[5] & 4);
        const prepZone = idxZone(d[17] | 0);
        const hostPrep = d[16] || 0;
        const keepLocal = prepZone && prepZone === p.capPrepZone && p.capPrep > hostPrep && p.capPrep - hostPrep < 0.6;
        if (!keepLocal) p.capPrep = hostPrep;
        p.capPrepZone = prepZone;
        p.capReady = idxZone(d[18] | 0);
        p.capRetry = Math.max(d[19] || 0, p.capRetry > (d[19] || 0) + 0.4 ? p.capRetry : 0);
        // 수정 STEP 4: 스킬 레벨 — 교사 기기가 아직 처리하지 않은 미션 결과가 있으면 내 기기의 예상 레벨을 유지
        const waitingMission = pending.some((c) => c.k === 'm');
        p.skillLevel = waitingMission ? Math.max(p.skillLevel | 0, d[20] | 0) : d[20] | 0;
        if (wasAlive && !alive && hooks.onMyKnockout) hooks.onMyKnockout(p);
        if (!wasAlive && alive && hooks.onMyRespawn) hooks.onMyRespawn(p);
      } else {
        p.netX = d[0];
        p.netY = d[1];
        p.facing = d[2];
        p.inMission = !!(d[5] & 2);
        p.inCapQ = !!(d[5] & 4);
        p.skillLevel = d[20] | 0;
        p.warp = warpNo;
        if (!wasAlive && alive) { p.x = d[0]; p.y = d[1]; p.vx = p.vy = 0; } // 재등장: 바로 그 자리
      }
    });

    // 효과·알림·탄 (이미 받은 번호는 건너뜀)
    Net.toArray(v.ev).forEach((e) => {
      if (!e || !(e.q > lastEvSeq)) return;
      lastEvSeq = e.q;
      if (hooks.onEvent) hooks.onEvent(e);
    });

    // 수정 STEP 5: TEAM BOOST 쿨타임
    Net.toArray(v.tb).forEach((row, i) => {
      const cd = state.teamBoostCd && state.teamBoostCd[IDX_TEAM[i + 1]];
      if (!cd || !row) return;
      Net.toArray(row).forEach((sec, j) => { const b = CONFIG.TEAM_BOOST.TYPES[j]; if (b) cd[b.id] = sec || 0; });
    });

    if (hooks.onSnapshot) hooks.onSnapshot(v);
  }

  // 받은 사건을 게임에서 쓰는 모양으로
  function decodeEffect(e) {
    const fx = { kind: e.kd, x: e.x, y: e.y, life: e.l, color: e.c };
    if (e.pi !== undefined && lineup[e.pi]) fx.pid = lineup[e.pi].id; // 새 STEP 2
    if (e.b) fx.big = true;
    if (e.g) fx.gold = true;
    if (e.rd !== undefined) fx.radius = e.rd;
    if (e.r !== undefined) fx.r = e.r;
    if (e.tx !== undefined) fx.text = e.tx;
    if (e.lv) fx.lv = e.lv; // 새 STEP 3
    if (e.a !== undefined) fx.angle = e.a;
    if (e.x2 !== undefined) { fx.x2 = e.x2; fx.y2 = e.y2; }
    if (e.ax !== undefined) { fx.ax = e.ax; fx.ay = e.ay; }
    return fx;
  }

  // 탄 사건 → 그릴 탄 (내가 쏜 탄은 이미 내 기기에서 날아가는 중이라 건너뜀)
  function decodeShot(state, e) {
    const owner = lineup[e.o];
    if (!owner) return null;
    if (owner.id === myId && !e.tu) return null;
    const p = findPlayer(state, owner.id);
    const body = { id: owner.id, team: owner.team, charId: p ? p.charId : owner.charId,
      x: e.x, y: e.y, radius: e.tu ? 0.5 : PLAYER_RADIUS };
    const override = e.tu ? { damage: e.dm, speed: e.sp, size: 0.16, range: e.rg, shape: 'bolt', fromTurret: true } : null;
    return Projectiles.create(body, e.a, override);
  }

  function uiCall(e) {
    if (UI_ALLOWED.indexOf(e.f) === -1 || typeof UI[e.f] !== 'function') return;
    UI[e.f].apply(null, Net.toArray(e.a).map((x) => (x === null ? undefined : x)));
  }

  /**
   * 쏘기·특수기·미션 결과를 교사 기기로 (확인받을 때까지 다시 보냄)
   * @param c { k: 'f', a, x, y } | { k: 's', r, x, y } | { k: 'm', ... }
   * @param energyDelta 이 명령으로 바뀔 에너지 (처리될 때까지 미리 보여줌)
   */
  function sendCommand(c, energyDelta) {
    if (role !== 'client') return;
    c.q = ++cmdSeq;
    if (energyDelta) c.de = energyDelta;
    pending.push(c);
    if (pending.length > 30) pending.shift();
    flushNow = true;
  }

  // 매 프레임 호출: 다른 친구들 부드럽게 움직이기 + 내 위치 올리기
  function clientFrame(state, dt) {
    if (role !== 'client') return;
    state.players.forEach((p) => {
      if (!p.isLocal && p.alive && p.netX !== undefined) smoothTo(p, p.netX, p.netY, dt);
    });
    const me = state.localPlayer;
    if (!me) return;
    sendTimer += dt;
    const payload = { mid: matchId, s: sess, x: r2(me.x), y: r2(me.y), f: r2(me.facing),
      m: me.inCapQ ? 2 : me.inMission ? 1 : 0, w: me.warp | 0 };
    if (pending.length) {
      payload.c = pending.map((c) => {
        const out = { ...c };
        delete out.de; // 미리 보여주기용 값은 보내지 않음
        return out;
      });
    }
    const key = JSON.stringify(payload);
    const due = sendTimer >= 1 / N.INPUT_HZ && (key !== lastSentKey || sendTimer >= 0.5);
    if (flushNow || due) {
      payload.n = ++sendCount % 1000; // 가만히 있어도 "살아 있음"이 전해지게 (값이 바뀌어야 교사 기기가 알아챔)
      base.child('in/' + myId).set(payload);
      lastSentKey = key;
      sendTimer = 0;
      flushNow = false;
    }
  }

  // STEP 19: 경기 기록을 학생 기기에 (한 번만)
  function hostPublishResult(records) {
    if (role !== 'host' || !base) return;
    const r = {};
    records.forEach((rec) => {
      if (rec.kind === 'bot' || !/^[\w-]+$/.test(rec.id)) return;
      r[rec.id] = JSON.parse(JSON.stringify(rec)); // Firebase 는 undefined 를 못 씀
    });
    base.child('result').set({ mid: matchId, r });
  }

  // STEP 18: 학생이 경기 중에 대기방으로 나감 → 교사 기기에 알리고 멈춤
  function leaveMatch() {
    if (role !== 'client' || !base) return;
    base.child('in/' + myId).set({ mid: matchId, s: sess, lv: 1 });
    stop();
  }

  // 화면에 띄울 연결 경고 (없으면 null)
  function warning() {
    if (!role) return null;
    if (role === 'client' && !hostOnline) return '선생님 기기 연결이 끊겼어요. 기다리는 중…';
    if (Net.everConnected() && !Net.isConnected()) return '인터넷 연결이 끊겼어요. 다시 연결하는 중…';
    if (role === 'client' && performance.now() - lastSnapAt > 2500) return '연결이 느려요. 잠시만 기다려 주세요…';
    return null;
  }

  return {
    startHost, hostTakeInputs, hostSend, hostUi, hostEvent, warp, hostKnock,
    startClient, sendCommand, clientFrame, decodeEffect, decodeShot, decodeKnock, uiCall,
    stop, warning, leaveMatch, hostPublishResult,
    role: () => role,
    setHostOnline(on) { hostOnline = on; },
    pendingCount: () => pending.length,
    // 시험·문제 찾기용: 이 기기의 경기 번호와 마지막으로 경기 상황을 받은 뒤 지난 시간(초)
    debugInfo: () => ({ role, matchId, sinceSnap: lastSnapAt ? Math.round((performance.now() - lastSnapAt) / 100) / 10 : null, lastEvSeq }),
  };
})();
