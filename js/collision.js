/* ============================================================
   서클 배틀 - 충돌 계산 (collision.js)
   ------------------------------------------------------------
   캐릭터(원)가 벽·상자·기둥·터미널(사각형)을 통과하지 못하게 합니다.
   - 겹치면 가장 가까운 바깥쪽으로 밀어냅니다.
   - 벽 쪽으로 가는 속도만 없애서, 비스듬히 부딪히면 벽을 따라 미끄러집니다.
   STEP 5: 발사체 충돌
   - 탄이 한 프레임 동안 지나간 길(선분)을 통째로 검사합니다.
     그래서 아무리 빠른 탄도 얇은 벽을 뚫고 지나가지 못합니다.
   ============================================================ */

const Collision = (function () {

  /**
   * 원과 사각형이 겹치는지 검사합니다.
   * 겹치면 { nx, ny, depth } 를 돌려줍니다.
   *   (nx, ny) : 원을 밀어낼 방향 (길이 1)
   *   depth    : 겹친 깊이 (m)
   * 겹치지 않으면 null
   */
  function circleRect(cx, cy, r, rect) {
    // 사각형 위에서 원의 중심과 가장 가까운 점
    const px = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
    const py = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
    const dx = cx - px;
    const dy = cy - py;
    const d2 = dx * dx + dy * dy;

    if (d2 > 0) {
      if (d2 >= r * r) return null;               // 떨어져 있음
      const d = Math.sqrt(d2);
      return { nx: dx / d, ny: dy / d, depth: r - d };
    }

    // 원의 중심이 사각형 안에 들어온 경우: 가장 가까운 변 쪽으로 밀어냄
    const left = cx - rect.x;
    const right = rect.x + rect.w - cx;
    const top = cy - rect.y;
    const bottom = rect.y + rect.h - cy;
    const min = Math.min(left, right, top, bottom);
    if (min === left) return { nx: -1, ny: 0, depth: left + r };
    if (min === right) return { nx: 1, ny: 0, depth: right + r };
    if (min === top) return { nx: 0, ny: -1, depth: top + r };
    return { nx: 0, ny: 1, depth: bottom + r };
  }

  /**
   * 원 모양 물체(x, y, radius, vx, vy)를 맵의 모든 단단한 물체 밖으로 밀어냅니다.
   * 모서리에서는 두 물체에 동시에 닿을 수 있어서 몇 번 반복합니다.
   * @returns {boolean} 무언가에 부딪혔는지
   */
  function resolveCircle(e) {
    let hit = false;
    for (let pass = 0; pass < 3; pass++) {
      let moved = false;
      for (const rect of GameMap.solids) {
        const c = circleRect(e.x, e.y, e.radius, rect);
        if (!c) continue;
        e.x += c.nx * c.depth;
        e.y += c.ny * c.depth;
        // 벽 쪽으로 향하는 속도만 없앱니다 → 벽을 따라 미끄러짐
        const into = e.vx * c.nx + e.vy * c.ny;
        if (into < 0) {
          e.vx -= into * c.nx;
          e.vy -= into * c.ny;
        }
        moved = hit = true;
      }
      if (!moved) break;
    }

    // 경기장 테두리
    const W = GameMap.width, H = GameMap.height, r = e.radius;
    if (e.x < r) { e.x = r; if (e.vx < 0) e.vx = 0; hit = true; }
    if (e.x > W - r) { e.x = W - r; if (e.vx > 0) e.vx = 0; hit = true; }
    if (e.y < r) { e.y = r; if (e.vy < 0) e.vy = 0; hit = true; }
    if (e.y > H - r) { e.y = H - r; if (e.vy > 0) e.vy = 0; hit = true; }

    return hit;
  }

  // ---------------- 선분 검사 (STEP 5) ----------------
  // 결과 t는 0~1 사이의 값입니다. (0 = 출발점, 1 = 도착점, 0.5 = 가운데에서 부딪힘)

  /**
   * 선분 (x0,y0)→(x1,y1) 이 사각형(pad만큼 넓힘)에 처음 닿는 지점의 t
   * 닿지 않으면 null. 출발점이 이미 안에 있으면 0.
   */
  function segmentRect(x0, y0, x1, y1, rect, pad) {
    pad = pad || 0;
    const minX = rect.x - pad, maxX = rect.x + rect.w + pad;
    const minY = rect.y - pad, maxY = rect.y + rect.h + pad;
    const dx = x1 - x0, dy = y1 - y0;
    let tMin = 0, tMax = 1;

    // x 방향
    if (dx === 0) {
      if (x0 < minX || x0 > maxX) return null;
    } else {
      let ta = (minX - x0) / dx, tb = (maxX - x0) / dx;
      if (ta > tb) { const s = ta; ta = tb; tb = s; }
      tMin = Math.max(tMin, ta);
      tMax = Math.min(tMax, tb);
      if (tMin > tMax) return null;
    }
    // y 방향
    if (dy === 0) {
      if (y0 < minY || y0 > maxY) return null;
    } else {
      let ta = (minY - y0) / dy, tb = (maxY - y0) / dy;
      if (ta > tb) { const s = ta; ta = tb; tb = s; }
      tMin = Math.max(tMin, ta);
      tMax = Math.min(tMax, tb);
      if (tMin > tMax) return null;
    }
    return tMin;
  }

  /**
   * 선분 (x0,y0)→(x1,y1) 이 원(중심 cx,cy 반지름 r)에 처음 닿는 지점의 t
   * 닿지 않으면 null. 출발점이 이미 원 안이면 0.
   */
  function segmentCircle(x0, y0, x1, y1, cx, cy, r) {
    const fx = x0 - cx, fy = y0 - cy;
    const c = fx * fx + fy * fy - r * r;
    if (c <= 0) return 0;
    const dx = x1 - x0, dy = y1 - y0;
    const a = dx * dx + dy * dy;
    if (a === 0) return null;
    const b = 2 * (fx * dx + fy * dy);
    const disc = b * b - 4 * a * c;
    if (disc < 0) return null;
    const t = (-b - Math.sqrt(disc)) / (2 * a);
    return t >= 0 && t <= 1 ? t : null;
  }

  /**
   * 선분이 벽·장애물에 처음 닿는 지점의 t (pad: 탄의 반지름)
   * 경기장 테두리도 벽으로 봅니다. 닿지 않으면 null
   */
  function segmentHitsSolid(x0, y0, x1, y1, pad) {
    let best = null;
    for (const rect of GameMap.solids) {
      const t = segmentRect(x0, y0, x1, y1, rect, pad);
      if (t !== null && (best === null || t < best)) best = t;
    }
    // 경기장 테두리
    const W = GameMap.width, H = GameMap.height;
    const edges = [
      x1 < pad ? (pad - x0) / (x1 - x0) : null,
      x1 > W - pad ? (W - pad - x0) / (x1 - x0) : null,
      y1 < pad ? (pad - y0) / (y1 - y0) : null,
      y1 > H - pad ? (H - pad - y0) / (y1 - y0) : null,
    ];
    edges.forEach((t) => {
      if (t !== null && isFinite(t)) {
        t = Math.max(0, Math.min(1, t));
        if (best === null || t < best) best = t;
      }
    });
    return best;
  }

  // 두 점 사이에 벽이 있는지 (부채꼴 충격파·폭발이 벽 뒤를 맞히지 않게 할 때 사용)
  // 출발점이 들어 있는 물체는 건너뜁니다. (예: 상자 위에 던진 폭발도 주변은 맞힘)
  function lineBlocked(x0, y0, x1, y1) {
    for (const rect of GameMap.solids) {
      if (x0 >= rect.x && x0 <= rect.x + rect.w && y0 >= rect.y && y0 <= rect.y + rect.h) continue;
      if (segmentRect(x0, y0, x1, y1, rect, 0) !== null) return true;
    }
    return false;
  }

  return { circleRect, resolveCircle, segmentRect, segmentCircle, segmentHitsSolid, lineBlocked };
})();
