/* ============================================================
   서클 배틀 - 맵 데이터 (map.js)
   ------------------------------------------------------------
   맵의 모든 위치와 크기는 미터(m) 단위입니다. (가로 48m × 세로 30m)
   (0, 0)은 왼쪽 위 모서리, x는 오른쪽, y는 아래쪽으로 커집니다.
   맵은 가운데 세로선(x = 24)을 기준으로 좌우 대칭입니다.
   ============================================================ */

const GameMap = (function () {
  const W = CONFIG.MAP.WIDTH;

  // 왼쪽(SOLAR) 쪽 사각형을 오른쪽(LUNAR) 쪽으로 뒤집어 복사합니다.
  function mirrorRect(r) {
    return { ...r, x: W - r.x - r.w };
  }
  function withMirror(list) {
    return list.concat(list.map(mirrorRect));
  }

  // ---------------- 에너지 존 (원) ----------------
  // 세 존 모두 가운데 세로선 위에 있어 두 팀과의 거리가 같습니다.
  const zones = [
    { id: 'A', x: 24, y: 5,  r: 3, points: 1 },
    { id: 'C', x: 24, y: 15, r: 5, points: 2 },
    { id: 'B', x: 24, y: 25, r: 4, points: 1 },
  ];
  zones.forEach((z) => { z.area = circleArea(z.r); });

  // ---------------- 시작 지역 ----------------
  const spawns = {
    SOLAR: { x: 0,  y: 10, w: 5, h: 10 },
    LUNAR: { x: 43, y: 10, w: 5, h: 10 },
  };

  // ---------------- 벽 (레인 구분) ----------------
  // 위 레인 / 중앙 레인 / 아래 레인을 나누는 긴 벽. 벽 사이 틈으로 레인을 옮길 수 있습니다.
  const walls = withMirror([
    { x: 14, y: 9,    w: 5, h: 0.8 },
    { x: 14, y: 20.2, w: 5, h: 0.8 },
  ]);

  // ---------------- 엄폐물 ----------------
  const crates = withMirror([
    { x: 16, y: 14.25, w: 1.5, h: 1.5 },  // 중앙 존 옆 상자
    { x: 17, y: 4.4,   w: 1.2, h: 1.2 },  // 위 레인 상자
    { x: 17, y: 24.4,  w: 1.2, h: 1.2 },  // 아래 레인 상자
  ]);
  const pillars = withMirror([
    { x: 9, y: 13.5, w: 1.2, h: 3 },      // 시작 지역 앞 기둥
  ]);

  // ---------------- 수학 터미널 ----------------
  // 각 팀 진영 쪽에 2개씩. (x, y)는 터미널의 중심입니다.
  const terminals = [
    { id: 'T1', side: 'SOLAR', x: 10.5, y: 5 },
    { id: 'T2', side: 'SOLAR', x: 10.5, y: 25 },
    { id: 'T3', side: 'LUNAR', x: W - 10.5, y: 5 },
    { id: 'T4', side: 'LUNAR', x: W - 10.5, y: 25 },
  ];
  const TERMINAL_SIZE = 1.4;     // 터미널 한 변 (m)
  const TERMINAL_USE_RANGE = 2;  // 이 거리 안에 오면 [수학 미션] 버튼이 나타남 (STEP 11)

  // 캐릭터와 발사체가 통과할 수 없는 모든 사각형 (STEP 3, 5에서 사용)
  // 터미널도 단단한 물체로 취급합니다.
  const solids = []
    .concat(walls, crates, pillars)
    .concat(terminals.map((t) => ({
      x: t.x - TERMINAL_SIZE / 2, y: t.y - TERMINAL_SIZE / 2,
      w: TERMINAL_SIZE, h: TERMINAL_SIZE,
    })));

  return {
    width: CONFIG.MAP.WIDTH,
    height: CONFIG.MAP.HEIGHT,
    zones, spawns, walls, crates, pillars, terminals, solids,
    TERMINAL_SIZE, TERMINAL_USE_RANGE,
  };
})();
