/* ============================================================
   서클 배틀 - 경기장 그림 (arena.js)  — 새 STEP 3
   ------------------------------------------------------------
   "미래형 에너지 경기장" — 평평한 바닥 대신
     바닥 판(2m 타일) · 1m 모눈(원의 넓이 어림용, 그대로 유지) · 팀 쪽 빛 · 가운데 경기선
     에너지 선(터미널·시작 지역 → 존으로 흐르는 빛) · 레인 표시(→ A / → B / → C)
     가장자리 우회로 철망 바닥 · 존 발판(에너지 기지) · 조명 · 가장자리 어둡게
     벽(윗면·앞면·그림자·팀 색 빛줄) · 상자(화물) · 발전장치(B 주변 1.6m 상자) · 방벽(B 옆 짧은 세로 벽)
     기둥 · 터미널 콘솔 · 경기장 테두리 조명
   모두 "경기 시작 때 한 번" 그림 한 장(render.js 의 mapImg)에 그림 → 매 프레임 부담 없음
   움직이는 부분(에너지가 흐르는 점, 발전장치 빛, 방벽 반짝임, 존 에너지 기지)만 매 프레임 조금씩 그림
   ※ 충돌 판정은 그대로 — 벽·상자의 그림은 충돌 사각형 안에만 그림 (그림자만 바깥)
   ============================================================ */

const ArenaArt = (function () {
  const TAU = Math.PI * 2;
  let H = null; // { text, roundRect, hexAlpha }
  let L = null; // 경기장 배치에서 뽑은 장식 정보 (한 번만 계산)

  function init(helpers) { H = helpers; }

  function sideColor(x) {
    return x < GameMap.width / 2 ? CONFIG.TEAMS.SOLAR.color : CONFIG.TEAMS.LUNAR.color;
  }

  // ---------------- 배치 ----------------
  function layout() {
    if (L) return L;
    const W = GameMap.width, Ht = GameMap.height;
    const mirX = (pts) => pts.map(([x, y]) => [W - x, y]);
    const mirY = (pts) => pts.map(([x, y]) => [x, Ht - y]);
    const quad = (lines) => lines.concat(lines.map(mirX), lines.map(mirY), lines.map((l) => mirX(mirY(l))));
    const row = (lines) => lines.concat(lines.map(mirX));
    const zA = GameMap.zones[0], zB = GameMap.zones[1];
    // 에너지 선: 뒤쪽 터미널 → 레인 → 존 / 시작 지역 → 가운데 레인 → B / 가운데 세로선 A → 공용 터미널 → B
    const zC = GameMap.zones[2];
    const conduits = quad([
      [[7, 5.9], [7, zA.y], [zA.x - zA.r - 0.9, zA.y]],
      [[22.8, 21.1], [22.8, 24]],
    ]).concat(row([
      [[6, 24], [zB.x - zB.r - 0.9, 24]],
    ]), [
      [[zA.x, zA.y + zA.r + 0.9], [zA.x, zB.y - zB.r - 0.9]],
      [[zC.x, zB.y + zB.r + 0.9], [zC.x, zC.y - zC.r - 0.9]],
    ]);
    conduits.forEach((pts) => {
      let len = 0;
      pts.lens = [];
      for (let i = 1; i < pts.length; i++) {
        const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
        pts.lens.push(l);
        len += l;
      }
      pts.len = len;
    });
    const gens = GameMap.crates.filter((r) => r.w >= 1.55);           // 발전장치 (B 주변 1.6m)
    const crates = GameMap.crates.filter((r) => r.w < 1.55);          // 화물 상자
    const barriers = GameMap.walls.filter((r) => r.h > r.w);          // 방벽 (B 옆 짧은 세로 벽)
    const walls = GameMap.walls.filter((r) => r.h <= r.w);            // 긴 벽
    // 가장자리 우회로 (위·아래 벽 바깥 길)
    const corridors = [{ x: 12, y: 0.35, w: W - 24, h: 3.6 }, { x: 12, y: Ht - 3.95, w: W - 24, h: 3.6 }];
    // 바닥 환기구 (그냥 무늬 — 막지 않음)
    const vents = [];
    [[3, 3], [9.5, 13.5], [18, 12], [26.5, 11.8], [16.5, 27.8], [3, 33]].forEach(([x, y]) => {
      [[x, y], [W - x - 1.6, y], [x, Ht - y - 0.9], [W - x - 1.6, Ht - y - 0.9]].forEach(([vx, vy]) => vents.push({ x: vx, y: vy, w: 1.6, h: 0.9 }));
    });
    L = { conduits, gens, crates, barriers, walls, corridors, vents };
    return L;
  }

  // =========================================================
  //  움직이지 않는 경기장 (한 번만)
  // =========================================================
  /**
   * @param c   그릴 캔버스 (1m 단위 변환이 된 상태)
   * @param b   이 범위(m)에 걸치는 것만 그림
   * @param ppm 1m = 몇 픽셀인지 (얇은 선 두께 계산)
   * @param dpr 기기 픽셀 배율
   */
  function drawStatic(c, b, ppm, dpr) {
    const lay = layout();
    const W = GameMap.width, Ht = GameMap.height;
    const onePx = 1 / ppm * dpr;
    drawFloor(c, W, Ht, onePx);
    drawCorridors(c, lay.corridors, onePx);
    drawGrid(c, b, W, Ht, onePx);
    drawCourt(c, W, Ht);
    drawLaneMarks(c, W, Ht);
    lay.vents.forEach((v) => drawVent(c, v));
    lay.conduits.forEach((pts) => drawConduit(c, pts));
    drawLights(c, lay, W, Ht);
    drawSpawns(c);
    drawZonePads(c);
    // 그림자 먼저 (물체 위에 그림자가 겹치지 않게)
    const solids = [].concat(lay.walls, lay.barriers, lay.crates, lay.gens);
    c.fillStyle = 'rgba(0, 0, 0, 0.35)';
    solids.forEach((r) => { H.roundRect(c, r.x + 0.22, r.y + 0.34, r.w, r.h, 0.18); c.fill(); });
    c.fillStyle = 'rgba(0, 0, 0, 0.4)';
    GameMap.pillars.forEach((r) => { H.roundRect(c, r.x + 0.45, r.y + 0.6, r.w, r.h, 0.3); c.fill(); });
    GameMap.terminals.forEach((t) => {
      const s = GameMap.TERMINAL_SIZE;
      H.roundRect(c, t.x - s / 2 + 0.2, t.y - s / 2 + 0.32, s, s, 0.25); c.fill();
    });
    lay.walls.forEach((r) => drawWall(c, r));
    lay.barriers.forEach((r) => drawBarrier(c, r));
    lay.crates.forEach((r, i) => drawCrate(c, r, i));
    lay.gens.forEach((r) => drawGenerator(c, r));
    GameMap.pillars.forEach((r) => drawPillar(c, r));
    GameMap.terminals.forEach((t) => drawTerminal(c, t));
    drawVignette(c, W, Ht);
    drawBorder(c, W, Ht);
  }

  // 바닥: 2m 판 (조금씩 다른 색 + 모서리 빛/그늘) + 팀 쪽 은은한 빛
  function drawFloor(c, W, Ht, onePx) {
    const base = c.createLinearGradient(0, 0, W, 0);
    base.addColorStop(0, '#221f46');
    base.addColorStop(0.5, '#1c2352');
    base.addColorStop(1, '#1a2152');
    c.fillStyle = base;
    c.fillRect(0, 0, W, Ht);
    // 판마다 살짝 다른 밝기
    for (let x = 0; x < W; x += 2) {
      for (let y = 0; y < Ht; y += 2) {
        const v = SkillFx.rnd(x * 131 + y, 3);
        if (v < 0.55) continue;
        c.fillStyle = 'rgba(255, 255, 255,' + (0.012 + (v - 0.55) * 0.05) + ')';
        c.fillRect(x, y, 2, 2);
      }
    }
    // 판 모서리: 위·왼쪽은 밝게, 아래·오른쪽은 어둡게 (살짝 도드라져 보임)
    c.lineWidth = onePx * 1.5;
    c.strokeStyle = 'rgba(255, 255, 255, 0.045)';
    c.beginPath();
    for (let x = 0; x < W; x += 2) { c.moveTo(x + 0.03, 0); c.lineTo(x + 0.03, Ht); }
    for (let y = 0; y < Ht; y += 2) { c.moveTo(0, y + 0.03); c.lineTo(W, y + 0.03); }
    c.stroke();
    c.strokeStyle = 'rgba(0, 0, 0, 0.28)';
    c.beginPath();
    for (let x = 2; x < W; x += 2) { c.moveTo(x - 0.03, 0); c.lineTo(x - 0.03, Ht); }
    for (let y = 2; y < Ht; y += 2) { c.moveTo(0, y - 0.03); c.lineTo(W, y - 0.03); }
    c.stroke();
    // 팀 쪽 빛 (왼쪽 SOLAR 주황, 오른쪽 LUNAR 파랑)
    [['SOLAR', 0], ['LUNAR', W]].forEach(([t, x]) => {
      const g = c.createRadialGradient(x, Ht / 2, 1, x, Ht / 2, W * 0.42);
      g.addColorStop(0, H.hexAlpha(CONFIG.TEAMS[t].color, 0.13));
      g.addColorStop(1, H.hexAlpha(CONFIG.TEAMS[t].color, 0));
      c.fillStyle = g;
      c.fillRect(0, 0, W, Ht);
    });
  }

  // 가장자리 우회로: 어두운 철망 바닥
  function drawCorridors(c, list, onePx) {
    list.forEach((r) => {
      c.fillStyle = 'rgba(8, 10, 30, 0.35)';
      c.fillRect(r.x, r.y, r.w, r.h);
      c.save();
      c.beginPath(); c.rect(r.x, r.y, r.w, r.h); c.clip();
      c.strokeStyle = 'rgba(150, 170, 255, 0.07)';
      c.lineWidth = onePx * 2;
      c.beginPath();
      for (let x = r.x - r.h; x < r.x + r.w; x += 0.5) { c.moveTo(x, r.y + r.h); c.lineTo(x + r.h, r.y); }
      c.stroke();
      c.restore();
      c.strokeStyle = 'rgba(255, 216, 77, 0.25)';
      c.lineWidth = 0.06;
      c.setLineDash([0.5, 0.35]);
      c.strokeRect(r.x + 0.05, r.y + 0.05, r.w - 0.1, r.h - 0.1);
      c.setLineDash([]);
    });
  }

  // 1m 모눈 (5m마다 조금 더 진하게) — 모눈 칸을 세어 원의 넓이를 어림할 수 있습니다. (그대로 유지)
  function drawGrid(c, b, W, Ht, onePx) {
    c.lineWidth = onePx;
    ['minor', 'major'].forEach((kind) => {
      c.strokeStyle = kind === 'major' ? 'rgba(140, 160, 255, 0.16)' : 'rgba(140, 160, 255, 0.07)';
      c.beginPath();
      for (let x = Math.max(1, Math.floor(b.x0)); x < Math.min(W, b.x1); x++) {
        if ((x % 5 === 0) !== (kind === 'major')) continue;
        c.moveTo(x, Math.max(0, b.y0)); c.lineTo(x, Math.min(Ht, b.y1));
      }
      for (let y = Math.max(1, Math.floor(b.y0)); y < Math.min(Ht, b.y1); y++) {
        if ((y % 5 === 0) !== (kind === 'major')) continue;
        c.moveTo(Math.max(0, b.x0), y); c.lineTo(Math.min(W, b.x1), y);
      }
      c.stroke();
    });
  }

  // 가운데 경기선 + B 둘레 큰 경기장 원 (눈금)
  function drawCourt(c, W, Ht) {
    const zB = GameMap.zones[1];
    c.save();
    c.strokeStyle = 'rgba(235, 240, 255, 0.14)';
    c.lineWidth = 0.12;
    c.setLineDash([0.9, 0.6]);
    c.beginPath(); c.moveTo(W / 2, 0.4); c.lineTo(W / 2, Ht - 0.4); c.stroke();
    c.setLineDash([]);
    const R = zB.r + 3.2;
    c.strokeStyle = 'rgba(235, 240, 255, 0.12)';
    c.lineWidth = 0.1;
    c.beginPath(); c.arc(zB.x, zB.y, R, 0, TAU); c.stroke();
    c.lineWidth = 0.08;
    c.beginPath();
    for (let i = 0; i < 36; i++) {
      const a = i * TAU / 36, l = i % 3 === 0 ? 0.55 : 0.28;
      c.moveTo(zB.x + Math.cos(a) * R, zB.y + Math.sin(a) * R);
      c.lineTo(zB.x + Math.cos(a) * (R - l), zB.y + Math.sin(a) * (R - l));
    }
    c.stroke();
    c.restore();
  }

  // 레인 표시: 시작 지역 앞 바닥에 "→ A" 같은 길 안내 + 존 쪽을 가리키는 화살표
  function drawLaneMarks(c, W, Ht) {
    const marks = [['A', 16, 11.2], ['B', 16.5, 24], ['C', 16, 36.8]];
    ['SOLAR', 'LUNAR'].forEach((t) => {
      const col = H.hexAlpha(CONFIG.TEAMS[t].color, 0.28);
      const flip = t === 'LUNAR';
      marks.forEach(([id, x, y]) => {
        const mx = flip ? W - x : x;
        H.text(c, flip ? id + ' ←' : '→ ' + id, mx, y, 1.1, col, 'bold');
      });
      // 존 앞 화살표 (>>)
      [[26, 9], [26, 39], [26.3, 22.9]].forEach(([x, y]) => {
        const mx = flip ? W - x : x, d = flip ? -1 : 1;
        c.strokeStyle = col;
        c.lineWidth = 0.14;
        c.lineJoin = 'round';
        for (let i = 0; i < 2; i++) {
          const ox = mx + d * i * 0.55;
          c.beginPath();
          c.moveTo(ox - d * 0.3, y - 0.45); c.lineTo(ox + d * 0.1, y); c.lineTo(ox - d * 0.3, y + 0.45);
          c.stroke();
        }
      });
    });
  }

  function drawVent(c, v) {
    c.fillStyle = 'rgba(6, 8, 24, 0.55)';
    H.roundRect(c, v.x, v.y, v.w, v.h, 0.1);
    c.fill();
    c.strokeStyle = 'rgba(160, 175, 255, 0.22)';
    c.lineWidth = 0.04;
    c.stroke();
    c.beginPath();
    for (let x = v.x + 0.2; x < v.x + v.w - 0.1; x += 0.2) { c.moveTo(x, v.y + 0.12); c.lineTo(x, v.y + v.h - 0.12); }
    c.stroke();
  }

  // 에너지 선: 어두운 홈 + 빛나는 가운데 선 + 이음 마디
  function drawConduit(c, pts) {
    const path = () => {
      c.beginPath();
      pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    };
    c.save();
    c.lineCap = 'round';
    c.lineJoin = 'round';
    path();
    c.strokeStyle = 'rgba(79, 240, 220, 0.07)';
    c.lineWidth = 0.7;
    c.stroke();
    c.strokeStyle = '#0a0e28';
    c.lineWidth = 0.26;
    c.stroke();
    c.strokeStyle = 'rgba(79, 240, 220, 0.55)';
    c.lineWidth = 0.07;
    c.stroke();
    c.fillStyle = 'rgba(79, 240, 220, 0.7)';
    pts.forEach(([x, y]) => { c.beginPath(); c.arc(x, y, 0.16, 0, TAU); c.fill(); });
    c.restore();
  }

  // 조명: 존·터미널·시작 지역·발전장치 둘레가 밝음 (한 번만 그리므로 더하기 합성 사용)
  function drawLights(c, lay, W, Ht) {
    c.save();
    c.globalCompositeOperation = 'lighter';
    const pool = (x, y, r, color, a) => {
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, H.hexAlpha(color, a));
      g.addColorStop(1, H.hexAlpha(color, 0));
      c.fillStyle = g;
      c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    };
    GameMap.zones.forEach((z) => pool(z.x, z.y, z.r + 4, '#a9b8ff', 0.12));
    GameMap.terminals.forEach((t) => pool(t.x, t.y, 3.2, t.side ? '#4ff0c0' : '#ffd84d', 0.1));
    lay.gens.forEach((r) => pool(r.x + r.w / 2, r.y + r.h / 2, 2.6, '#4ff0dc', 0.12));
    Object.keys(GameMap.spawns).forEach((t) => {
      const s = GameMap.spawns[t];
      pool(s.x + s.w / 2, s.y + s.h / 2, 8, CONFIG.TEAMS[t].color, 0.1);
    });
    c.restore();
  }

  // 시작 지역: 팀 색 발사대 + 안쪽을 가리키는 화살표 + 해/달 문양
  function drawSpawns(c) {
    Object.keys(GameMap.spawns).forEach((teamId) => {
      const s = GameMap.spawns[teamId];
      const team = CONFIG.TEAMS[teamId];
      const left = teamId === 'SOLAR';
      const g = c.createLinearGradient(left ? s.x : s.x + s.w, 0, left ? s.x + s.w : s.x, 0);
      g.addColorStop(0, H.hexAlpha(team.color, 0.26));
      g.addColorStop(1, H.hexAlpha(team.color, 0.08));
      c.fillStyle = g;
      c.fillRect(s.x, s.y, s.w, s.h);
      // 줄무늬 테두리
      c.save();
      c.setLineDash([0.4, 0.3]);
      c.strokeStyle = H.hexAlpha(team.color, 0.85);
      c.lineWidth = 0.1;
      c.strokeRect(s.x + 0.05, s.y + 0.05, s.w - 0.1, s.h - 0.1);
      c.restore();
      // 경기장 쪽으로 향한 화살표
      const d = left ? 1 : -1, ex = left ? s.x + s.w - 0.9 : s.x + 0.9;
      c.strokeStyle = H.hexAlpha(team.color, 0.45);
      c.lineWidth = 0.18;
      c.lineJoin = 'round';
      [s.y + 3.4, s.y + s.h - 3.4].forEach((y) => {
        for (let i = 0; i < 3; i++) {
          const x = ex - d * i * 0.6;
          c.beginPath(); c.moveTo(x - d * 0.35, y - 0.5); c.lineTo(x + d * 0.1, y); c.lineTo(x - d * 0.35, y + 0.5); c.stroke();
        }
      });
      // 해 / 달 문양
      const cx = s.x + s.w / 2, cy = s.y + s.h / 2;
      c.strokeStyle = H.hexAlpha(team.color, 0.5);
      c.fillStyle = H.hexAlpha(team.color, 0.22);
      c.lineWidth = 0.12;
      if (left) {
        c.beginPath(); c.arc(cx, cy, 1.1, 0, TAU); c.fill(); c.stroke();
        c.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = i * TAU / 8;
          c.moveTo(cx + Math.cos(a) * 1.45, cy + Math.sin(a) * 1.45);
          c.lineTo(cx + Math.cos(a) * 1.95, cy + Math.sin(a) * 1.95);
        }
        c.stroke();
      } else {
        c.beginPath();
        c.arc(cx, cy, 1.5, Math.PI * 0.35, Math.PI * 1.65);
        c.arc(cx + 0.7, cy, 1.25, Math.PI * 1.55, Math.PI * 0.45, true);
        c.closePath();
        c.fill(); c.stroke();
      }
      H.text(c, team.name, cx, s.y + 0.9, 0.8, team.color, 'bold');
      H.text(c, '시작 지역', cx, s.y + 1.8, 0.5, H.hexAlpha(team.color, 0.8));
    });
  }

  // 존 발판 (에너지 기지): 금속 고리 + 마디 + 발광 장치 받침 8개 + 반지름·이름·점수 (수정 STEP 2·3 표현 유지)
  function drawZonePads(c) {
    GameMap.zones.forEach((z) => {
      const R = z.r + 0.9;
      // 금속 고리
      c.fillStyle = '#161a3e';
      c.beginPath(); c.arc(z.x, z.y, R, 0, TAU); c.arc(z.x, z.y, z.r, 0, TAU, true); c.fill();
      c.strokeStyle = 'rgba(170, 185, 255, 0.35)';
      c.lineWidth = 0.05;
      c.beginPath(); c.arc(z.x, z.y, R, 0, TAU); c.stroke();
      c.strokeStyle = 'rgba(170, 185, 255, 0.18)';
      c.beginPath();
      for (let i = 0; i < 24; i++) {
        const a = i * TAU / 24;
        c.moveTo(z.x + Math.cos(a) * z.r, z.y + Math.sin(a) * z.r);
        c.lineTo(z.x + Math.cos(a) * R, z.y + Math.sin(a) * R);
      }
      c.stroke();
      // 발광 장치 받침 (불빛은 매 프레임 zoneBase 에서)
      c.fillStyle = '#2a3068';
      for (let i = 0; i < 8; i++) {
        const a = i * TAU / 8 + TAU / 16;
        const x = z.x + Math.cos(a) * (z.r + 0.62), y = z.y + Math.sin(a) * (z.r + 0.62);
        c.beginPath(); c.arc(x, y, 0.2, 0, TAU); c.fill();
      }
      // 안쪽 바닥: 가운데가 조금 밝은 원 + 가는 동심원
      const g = c.createRadialGradient(z.x, z.y, 0, z.x, z.y, z.r);
      g.addColorStop(0, 'rgba(255, 255, 255, 0.09)');
      g.addColorStop(1, 'rgba(255, 255, 255, 0.03)');
      c.fillStyle = g;
      c.beginPath(); c.arc(z.x, z.y, z.r, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(235, 240, 255, 0.1)';
      c.lineWidth = 0.05;
      for (let k = 1; k < z.r; k++) { c.beginPath(); c.arc(z.x, z.y, k, 0, TAU); c.stroke(); }
      // 반지름 선: 원의 중심 → 오른쪽 테두리
      c.strokeStyle = 'rgba(235, 240, 255, 0.55)';
      c.lineWidth = 0.06;
      c.beginPath(); c.moveTo(z.x, z.y); c.lineTo(z.x + z.r, z.y); c.stroke();
      c.fillStyle = '#f3f5ff';
      c.beginPath(); c.arc(z.x, z.y, 0.14, 0, TAU); c.fill();
      // "반지름 3m" (수정 STEP 2: 초등학교 표현, 넓이는 점령 문제의 답이라 맵에 쓰지 않음)
      H.text(c, '반지름 ' + z.r + 'm', z.x + z.r / 2, z.y - 0.45, 0.42, 'rgba(235, 240, 255, 0.85)');
      H.text(c, z.id, z.x, z.y - z.r * 0.5, 0.9 + z.r * 0.12, '#f3f5ff', 'bold');
      H.text(c, '점령하면 +' + z.points + '점', z.x, z.y + z.r * 0.5, 0.5, 'rgba(235, 240, 255, 0.75)');
    });
  }

  // 긴 벽: 윗면(밝은 금속) + 앞면(어두운 띠) + 팀 쪽 색 빛줄 — 그림은 충돌 사각형 안에만
  function drawWall(c, r) {
    const front = Math.min(0.28, r.h * 0.35);
    c.fillStyle = '#1b1f4a';
    H.roundRect(c, r.x, r.y, r.w, r.h, 0.14);
    c.fill();
    const g = c.createLinearGradient(0, r.y, 0, r.y + r.h - front);
    g.addColorStop(0, '#454f9a');
    g.addColorStop(1, '#2f3776');
    c.fillStyle = g;
    H.roundRect(c, r.x, r.y, r.w, r.h - front, 0.14);
    c.fill();
    c.strokeStyle = 'rgba(190, 200, 255, 0.55)';
    c.lineWidth = 0.05;
    c.beginPath(); c.moveTo(r.x + 0.15, r.y + 0.05); c.lineTo(r.x + r.w - 0.15, r.y + 0.05); c.stroke();
    // 빛줄 (팀 쪽 색)
    c.strokeStyle = H.hexAlpha(sideColor(r.x + r.w / 2), 0.85);
    c.lineWidth = 0.08;
    const my = r.y + (r.h - front) / 2;
    c.beginPath(); c.moveTo(r.x + 0.3, my); c.lineTo(r.x + r.w - 0.3, my); c.stroke();
    // 마디 (1.5m마다)
    c.strokeStyle = 'rgba(10, 12, 35, 0.6)';
    c.lineWidth = 0.05;
    c.beginPath();
    for (let x = r.x + 1.5; x < r.x + r.w - 0.3; x += 1.5) { c.moveTo(x, r.y + 0.04); c.lineTo(x, r.y + r.h - 0.04); }
    c.stroke();
    c.strokeStyle = '#8a7bff';
    c.lineWidth = 0.05;
    H.roundRect(c, r.x, r.y, r.w, r.h, 0.14);
    c.stroke();
  }

  // 방벽: 양 끝 기둥 + 가운데 에너지 막 (탄이 지나가지 못함)
  function drawBarrier(c, r) {
    const post = Math.min(0.55, r.h * 0.2);
    c.fillStyle = 'rgba(40, 200, 230, 0.22)';
    c.fillRect(r.x + 0.1, r.y + post, r.w - 0.2, r.h - post * 2);
    c.strokeStyle = 'rgba(120, 240, 255, 0.75)';
    c.lineWidth = 0.05;
    c.beginPath();
    for (let x = r.x + 0.2; x < r.x + r.w - 0.1; x += 0.2) { c.moveTo(x, r.y + post); c.lineTo(x, r.y + r.h - post); }
    c.stroke();
    c.strokeStyle = 'rgba(200, 250, 255, 0.9)';
    c.lineWidth = 0.06;
    c.strokeRect(r.x + 0.1, r.y + post, r.w - 0.2, r.h - post * 2);
    [r.y, r.y + r.h - post].forEach((y) => {
      c.fillStyle = '#3a4388';
      H.roundRect(c, r.x, y, r.w, post, 0.1);
      c.fill();
      c.strokeStyle = '#a3adff';
      c.lineWidth = 0.05;
      c.stroke();
      c.fillStyle = '#7ff4ff';
      c.beginPath(); c.arc(r.x + r.w / 2, y + post / 2, 0.1, 0, TAU); c.fill();
    });
  }

  // 화물 상자: 윗면 + 앞면 + X 버팀 + 모서리 쇠 (몇 개는 노란 줄무늬)
  function drawCrate(c, r, i) {
    const front = r.h * 0.22;
    c.fillStyle = '#232a5c';
    H.roundRect(c, r.x, r.y, r.w, r.h, 0.1);
    c.fill();
    const g = c.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
    g.addColorStop(0, '#4d589e');
    g.addColorStop(1, '#343d7e');
    c.fillStyle = g;
    H.roundRect(c, r.x, r.y, r.w, r.h - front, 0.1);
    c.fill();
    const i2 = 0.16;
    c.strokeStyle = 'rgba(190, 200, 255, 0.45)';
    c.lineWidth = 0.05;
    c.strokeRect(r.x + i2, r.y + i2, r.w - i2 * 2, r.h - front - i2 * 2);
    c.beginPath();
    c.moveTo(r.x + i2, r.y + i2); c.lineTo(r.x + r.w - i2, r.y + r.h - front - i2);
    c.moveTo(r.x + r.w - i2, r.y + i2); c.lineTo(r.x + i2, r.y + r.h - front - i2);
    c.stroke();
    if (i % 3 === 0) {
      c.save();
      c.beginPath(); c.rect(r.x, r.y + r.h - front, r.w, front); c.clip();
      c.fillStyle = '#ffd84d';
      c.fillRect(r.x, r.y + r.h - front, r.w, front);
      c.fillStyle = '#1a1d3f';
      for (let x = r.x - front; x < r.x + r.w; x += 0.3) {
        c.beginPath();
        c.moveTo(x, r.y + r.h); c.lineTo(x + 0.15, r.y + r.h); c.lineTo(x + 0.15 + front, r.y + r.h - front); c.lineTo(x + front, r.y + r.h - front);
        c.closePath(); c.fill();
      }
      c.restore();
    }
    c.strokeStyle = '#a3adff';
    c.lineWidth = 0.06;
    H.roundRect(c, r.x, r.y, r.w, r.h, 0.1);
    c.stroke();
  }

  // 발전장치: 받침 + 둥근 에너지 핵 + 번개 표시 (빛은 매 프레임 조금 더)
  function drawGenerator(c, r) {
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    c.fillStyle = '#20265a';
    H.roundRect(c, r.x, r.y, r.w, r.h, 0.22);
    c.fill();
    c.strokeStyle = '#6f7bd0';
    c.lineWidth = 0.06;
    c.stroke();
    c.fillStyle = '#9aa3e0';
    [[0.2, 0.2], [r.w - 0.2, 0.2], [0.2, r.h - 0.2], [r.w - 0.2, r.h - 0.2]].forEach(([x, y]) => {
      c.beginPath(); c.arc(r.x + x, r.y + y, 0.06, 0, TAU); c.fill();
    });
    const R = Math.min(r.w, r.h) * 0.34;
    const g = c.createRadialGradient(cx, cy, 0, cx, cy, R);
    g.addColorStop(0, '#e6fffb');
    g.addColorStop(0.45, '#4ff0dc');
    g.addColorStop(1, '#136a7a');
    c.fillStyle = g;
    c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.fill();
    c.strokeStyle = '#bff9ff';
    c.lineWidth = 0.05;
    c.stroke();
    c.fillStyle = '#10204a';
    c.beginPath();
    c.moveTo(cx + 0.06, cy - 0.3); c.lineTo(cx - 0.14, cy + 0.04); c.lineTo(cx + 0.01, cy + 0.04);
    c.lineTo(cx - 0.06, cy + 0.3); c.lineTo(cx + 0.14, cy - 0.04); c.lineTo(cx - 0.01, cy - 0.04);
    c.closePath(); c.fill();
  }

  // 기둥: 두꺼운 금속 기둥 + 가로 빛띠 3개 + 팀 쪽 색 세로 빛줄
  function drawPillar(c, r) {
    const g = c.createLinearGradient(r.x, 0, r.x + r.w, 0);
    g.addColorStop(0, '#4a55a3');
    g.addColorStop(0.5, '#343d80');
    g.addColorStop(1, '#232a60');
    c.fillStyle = g;
    H.roundRect(c, r.x, r.y, r.w, r.h, 0.3);
    c.fill();
    c.strokeStyle = '#8a7bff';
    c.lineWidth = 0.07;
    c.stroke();
    c.strokeStyle = 'rgba(160, 170, 255, 0.45)';
    c.lineWidth = 0.05;
    [0.22, 0.5, 0.78].forEach((k) => {
      const y = r.y + r.h * k;
      c.beginPath(); c.moveTo(r.x + 0.12, y); c.lineTo(r.x + r.w - 0.12, y); c.stroke();
    });
    c.strokeStyle = H.hexAlpha(sideColor(r.x), 0.8);
    c.lineWidth = 0.09;
    c.beginPath(); c.moveTo(r.x + r.w / 2, r.y + 0.35); c.lineTo(r.x + r.w / 2, r.y + r.h - 0.35); c.stroke();
  }

  // 터미널 콘솔: 받침 + 화면(반지름이 그려진 원) + 이름
  function drawTerminal(c, t) {
    const s = GameMap.TERMINAL_SIZE;
    const col = t.side ? '#4ff0c0' : '#ffd84d';
    c.fillStyle = '#0f2f36';
    H.roundRect(c, t.x - s / 2, t.y - s / 2, s, s, 0.25);
    c.fill();
    c.strokeStyle = col;
    c.lineWidth = 0.08;
    c.stroke();
    c.fillStyle = H.hexAlpha(col, 0.16);
    H.roundRect(c, t.x - s / 2 + 0.16, t.y - s / 2 + 0.16, s - 0.32, s - 0.32, 0.16);
    c.fill();
    c.strokeStyle = col;
    c.lineWidth = 0.07;
    c.beginPath(); c.arc(t.x, t.y, 0.4, 0, TAU); c.stroke();
    c.beginPath(); c.moveTo(t.x, t.y); c.lineTo(t.x + 0.4, t.y); c.stroke();
    c.fillStyle = col;
    c.beginPath(); c.arc(t.x, t.y, 0.08, 0, TAU); c.fill();
    // 새 STEP 2: 가운데 공용 터미널은 두 팀 모두 사용 (빠르지만 상대와 만나기 쉬움)
    if (t.side) H.text(c, '에너지 터미널', t.x, t.y + s / 2 + 0.45, 0.42, 'rgba(79, 240, 192, 0.85)');
    else H.text(c, '공용 터미널 · 두 팀 모두', t.x, t.y + s / 2 + 0.45, 0.42, 'rgba(255, 216, 77, 0.9)');
  }

  // 가장자리를 조금 어둡게 (가운데로 눈이 가게)
  function drawVignette(c, W, Ht) {
    const g = c.createRadialGradient(W / 2, Ht / 2, Ht * 0.45, W / 2, Ht / 2, W * 0.62);
    g.addColorStop(0, 'rgba(5, 6, 20, 0)');
    g.addColorStop(1, 'rgba(5, 6, 20, 0.35)');
    c.fillStyle = g;
    c.fillRect(0, 0, W, Ht);
  }

  // 경기장 테두리: 빛 번짐(선 몇 겹) + 금속 테 + 4m마다 조명
  function drawBorder(c, W, Ht) {
    c.save();
    c.strokeStyle = '#7c6cff';
    [[0.9, 0.08], [0.55, 0.16], [0.3, 0.35]].forEach(([w, a]) => {
      c.globalAlpha = a;
      c.lineWidth = w;
      H.roundRect(c, 0, 0, W, Ht, 0.6);
      c.stroke();
    });
    c.globalAlpha = 1;
    c.lineWidth = 0.18;
    H.roundRect(c, 0, 0, W, Ht, 0.6);
    c.stroke();
    c.fillStyle = '#b9f3ff';
    for (let x = 4; x < W; x += 4) {
      c.beginPath(); c.arc(x, 0.18, 0.08, 0, TAU); c.fill();
      c.beginPath(); c.arc(x, Ht - 0.18, 0.08, 0, TAU); c.fill();
    }
    for (let y = 4; y < Ht; y += 4) {
      c.beginPath(); c.arc(0.18, y, 0.08, 0, TAU); c.fill();
      c.beginPath(); c.arc(W - 0.18, y, 0.08, 0, TAU); c.fill();
    }
    c.restore();
  }

  // =========================================================
  //  매 프레임 (움직이는 부분만, 화면 안에 있는 것만)
  // =========================================================
  function drawLive(c, time, vr, onScreen) {
    const lay = layout();
    // 에너지가 흐르는 빛 점
    c.fillStyle = 'rgba(160, 255, 240, 0.9)';
    lay.conduits.forEach((pts, ci) => {
      const n = SkillFx.isLite() ? 1 : Math.max(1, Math.round(pts.len / 6)); // 가볍게 모드는 선마다 1개
      for (let i = 0; i < n; i++) {
        let d = ((time * 2.2 + ci * 1.7) % pts.len + i * pts.len / n) % pts.len;
        let seg = 0;
        while (seg < pts.lens.length - 1 && d > pts.lens[seg]) { d -= pts.lens[seg]; seg++; }
        const t = pts.lens[seg] ? Math.min(1, d / pts.lens[seg]) : 0;
        const x = pts[seg][0] + (pts[seg + 1][0] - pts[seg][0]) * t;
        const y = pts[seg][1] + (pts[seg + 1][1] - pts[seg][1]) * t;
        if (vr && !onScreen(vr, x, y, 0.5)) continue;
        c.beginPath(); c.arc(x, y, 0.1, 0, TAU); c.fill();
      }
    });
    // 발전장치 빛 고리
    lay.gens.forEach((r, i) => {
      const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
      if (vr && !onScreen(vr, cx, cy, 2)) return;
      const k = (time * 0.8 + i * 0.37) % 1;
      c.strokeStyle = 'rgba(79, 240, 220,' + (0.6 * (1 - k)) + ')';
      c.lineWidth = 0.06;
      c.beginPath(); c.arc(cx, cy, r.w * 0.35 + k * 0.9, 0, TAU); c.stroke();
    });
    // 방벽 반짝임: 빛 줄이 위아래로 오감
    lay.barriers.forEach((r, i) => {
      if (vr && !onScreen(vr, r.x + r.w / 2, r.y + r.h / 2, r.h)) return;
      const post = Math.min(0.55, r.h * 0.2);
      const k = 0.5 + 0.5 * Math.sin(time * 2.5 + i);
      const y = r.y + post + (r.h - post * 2) * k;
      c.strokeStyle = 'rgba(220, 255, 255, 0.85)';
      c.lineWidth = 0.08;
      c.beginPath(); c.moveTo(r.x + 0.1, y); c.lineTo(r.x + r.w - 0.1, y); c.stroke();
    });
  }

  // =========================================================
  //  존 = 에너지 기지 (매 프레임)
  //   중립 회색·흰색 / SOLAR 노랑·주황 / LUNAR 파랑·보라
  //   점령 준비: 둘레 게이지 · 활성화: 발광 장치가 팀 색으로 깜빡임
  //   점령 중: 도는 고리 · 점령 완료: 에너지 물결 + 빛 + 올라가는 알갱이
  // =========================================================
  function zoneBase(c, z, time, players, i) {
    const owner = z.owner ? CONFIG.TEAMS[z.owner] : null;
    const pulse = 0.5 + 0.5 * Math.sin(time * 2 + i);
    // 점령 완료: 빛 + 물결 + 알갱이
    if (owner) {
      const g = c.createRadialGradient(z.x, z.y, 0, z.x, z.y, z.r);
      g.addColorStop(0, H.hexAlpha(owner.color, 0.22 + pulse * 0.06));
      g.addColorStop(1, H.hexAlpha(owner.glow || owner.color, 0.08));
      c.fillStyle = g;
      c.beginPath(); c.arc(z.x, z.y, z.r, 0, TAU); c.fill();
      for (let w = 0; w < 2; w++) {
        const k = (time * 0.5 + w * 0.5) % 1;
        c.strokeStyle = H.hexAlpha(owner.color, 0.5 * (1 - k));
        c.lineWidth = 0.12 * (1 - k) + 0.03;
        c.beginPath(); c.arc(z.x, z.y, z.r * (0.15 + 0.85 * k), 0, TAU); c.stroke();
      }
      c.fillStyle = H.hexAlpha(owner.color, 0.85);
      const seed = SkillFx.seedOf(z.id);
      for (let m = 0, mn = SkillFx.isLite() ? 3 : 5 + z.r; m < mn; m++) {
        const t = (time * 0.4 + SkillFx.rnd(seed, m)) % 1;
        const a = SkillFx.rnd(seed, m + 10) * TAU, d = Math.sqrt(SkillFx.rnd(seed, m + 20)) * z.r * 0.9;
        c.globalAlpha = Math.sin(t * Math.PI);
        c.beginPath(); c.arc(z.x + Math.cos(a) * d, z.y + Math.sin(a) * d - t * 1.4, 0.07, 0, TAU); c.fill();
      }
      c.globalAlpha = 1;
    }
    // 발광 장치 8개: 점령 팀 색(켜짐) / 활성화한 팀 색(깜빡임) / 중립(흐림)
    const act = ['SOLAR', 'LUNAR'].filter((t) => z.active && z.active[t]);
    for (let n = 0; n < 8; n++) {
      const a = n * TAU / 8 + TAU / 16;
      const x = z.x + Math.cos(a) * (z.r + 0.62), y = z.y + Math.sin(a) * (z.r + 0.62);
      let col = 'rgba(200, 210, 240, 0.35)';
      if (owner) col = owner.color;
      else if (act.length) {
        const t = act[act.length === 2 ? n % 2 : 0];
        col = H.hexAlpha(CONFIG.TEAMS[t].color, 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(time * 6 + n)));
      }
      c.fillStyle = col;
      c.beginPath(); c.arc(x, y, 0.13, 0, TAU); c.fill();
    }
    // 점령 준비: 존 둘레 게이지 (팀마다 가장 오래 버틴 친구 기준)
    ['SOLAR', 'LUNAR'].forEach((t, ti) => {
      let best = 0;
      (players || []).forEach((p) => {
        if (p.team === t && p.alive && p.capPrepZone === z.id && p.zoneId === z.id && !p.inCapQ) best = Math.max(best, p.capPrep || 0);
      });
      if (best <= 0) return;
      const k = Math.min(1, best / CONFIG.CAPTURE.PREP_SEC);
      const R = z.r + 1.2 + ti * 0.3;
      c.strokeStyle = 'rgba(10, 12, 35, 0.6)';
      c.lineWidth = 0.2;
      c.beginPath(); c.arc(z.x, z.y, R, 0, TAU); c.stroke();
      c.strokeStyle = CONFIG.TEAMS[t].color;
      c.lineWidth = 0.16;
      c.lineCap = 'round';
      c.beginPath(); c.arc(z.x, z.y, R, -Math.PI / 2, -Math.PI / 2 + k * TAU); c.stroke();
      c.lineCap = 'butt';
    });
    // 점령 중: 팀 색 고리 3조각이 돎 (인원이 많을수록 빠르게)
    const s = z.counts.SOLAR, l = z.counts.LUNAR;
    if ((s > 0) !== (l > 0)) {
      const t = s > 0 ? 'SOLAR' : 'LUNAR';
      const pushing = (z.owner === t && z.progress < z.area - 1e-6) || (z.owner !== t && z.active && z.active[t]);
      if (pushing) {
        const n = s || l;
        const rot = time * (1.2 + n * 0.8);
        c.strokeStyle = CONFIG.TEAMS[t].color;
        c.lineWidth = 0.18;
        c.lineCap = 'round';
        for (let k = 0; k < 3; k++) {
          const a0 = rot + k * TAU / 3;
          c.beginPath(); c.arc(z.x, z.y, z.r + 0.95, a0, a0 + 0.9); c.stroke();
        }
        c.lineCap = 'butt';
      }
    } else if (s > 0 && l > 0) {
      // 대치 중: 흰 고리 조각이 깜빡임
      c.strokeStyle = 'rgba(255, 255, 255,' + (0.4 + 0.4 * Math.sin(time * 10)) + ')';
      c.lineWidth = 0.14;
      for (let k = 0; k < 6; k++) {
        const a0 = k * TAU / 6;
        c.beginPath(); c.arc(z.x, z.y, z.r + 0.95, a0, a0 + 0.5); c.stroke();
      }
    }
  }

  return { init, drawStatic, drawLive, zoneBase, layout };
})();
