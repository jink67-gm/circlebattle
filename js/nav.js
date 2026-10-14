/* ============================================================
   서클 배틀 - 봇 길 찾기 (nav.js)  — 새 STEP 2
   ------------------------------------------------------------
   넓어진 경기장에는 긴 벽이 있어서, 목표로 곧장 걸어가는 봇은 벽 앞에서 헤맵니다.
   그래서 장애물 모서리 바로 바깥에 "길목 점"을 만들어 두고,
   서로 보이는 길목끼리 이어 가장 짧은 길(다익스트라)을 찾습니다. (경기 시작 때 한 번 계산)
   빈자리 봇만 사용합니다. 학생 캐릭터와는 상관없습니다.
   ============================================================ */

const Nav = (function () {
  const PAD = 0.85;        // 캐릭터 반지름(0.7) + 여유
  let nodes = null;        // [{ x, y }]
  let adj = null;          // adj[i] = [[j, 거리], ...]

  // 선분이 (캐릭터 몸 두께만큼 넓힌) 장애물에 막히는지
  function blocked(x0, y0, x1, y1) {
    for (const r of GameMap.solids) {
      if (Collision.segmentRect(x0, y0, x1, y1, r, PAD) !== null) return true;
    }
    return false;
  }
  function inSolid(x, y) {
    return GameMap.solids.some((r) => x > r.x - PAD && x < r.x + r.w + PAD && y > r.y - PAD && y < r.y + r.h + PAD);
  }

  function build() {
    const W = GameMap.width, H = GameMap.height, m = PAD + 0.3;
    nodes = [];
    GameMap.solids.forEach((r) => {
      [[r.x - m, r.y - m], [r.x + r.w + m, r.y - m], [r.x - m, r.y + r.h + m], [r.x + r.w + m, r.y + r.h + m]]
        .forEach(([x, y]) => {
          if (x < 1 || y < 1 || x > W - 1 || y > H - 1 || inSolid(x, y)) return;
          nodes.push({ x, y });
        });
    });
    adj = nodes.map(() => []);
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        if (blocked(a.x, a.y, b.x, b.y)) continue;
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        adj[i].push([j, d]);
        adj[j].push([i, d]);
      }
    }
  }

  /**
   * (sx, sy) → (tx, ty) 로 가는 길목 점 목록 (마지막은 목표). 곧장 갈 수 있으면 [목표]
   */
  function path(sx, sy, tx, ty) {
    if (!blocked(sx, sy, tx, ty)) return [{ x: tx, y: ty }];
    if (!nodes) build();
    const n = nodes.length;
    // 출발점·목표에서 곧장 보이는 길목
    const startLinks = [], goalLinks = [];
    for (let i = 0; i < n; i++) {
      const p = nodes[i];
      if (!blocked(sx, sy, p.x, p.y)) startLinks.push([i, Math.hypot(p.x - sx, p.y - sy)]);
      if (!blocked(p.x, p.y, tx, ty)) goalLinks.push([i, Math.hypot(p.x - tx, p.y - ty)]);
    }
    if (!startLinks.length || !goalLinks.length) return [{ x: tx, y: ty }];
    const goalCost = new Map(goalLinks.map(([i, d]) => [i, d]));
    const dist = new Array(n).fill(Infinity), prev = new Array(n).fill(-1), done = new Array(n).fill(false);
    startLinks.forEach(([i, d]) => { dist[i] = d; });
    let best = Infinity, bestEnd = -1;
    for (;;) {
      let u = -1, du = Infinity;
      for (let i = 0; i < n; i++) if (!done[i] && dist[i] < du) { du = dist[i]; u = i; }
      if (u === -1 || du >= best) break;
      done[u] = true;
      if (goalCost.has(u) && du + goalCost.get(u) < best) { best = du + goalCost.get(u); bestEnd = u; }
      adj[u].forEach(([v, w]) => {
        if (du + w < dist[v]) { dist[v] = du + w; prev[v] = u; }
      });
    }
    if (bestEnd === -1) return [{ x: tx, y: ty }];
    const out = [{ x: tx, y: ty }];
    for (let u = bestEnd; u !== -1; u = prev[u]) out.unshift({ x: nodes[u].x, y: nodes[u].y });
    return out;
  }

  return { build, path, blocked, nodeCount: () => (nodes ? nodes.length : 0) };
})();
