/* ============================================================
   서클 배틀 - 맵 데이터 (map.js)
   ------------------------------------------------------------
   맵의 모든 위치와 크기는 미터(m) 단위입니다. (0, 0)은 왼쪽 위 모서리, x는 오른쪽, y는 아래쪽.
   새 STEP 2: 경기장 76m × 48m (예전 48m × 30m의 약 1.6배)
     - SOLAR는 왼쪽, LUNAR는 오른쪽에서 시작 (가로 화면·교실 TV에서 앞이 넓게 보이게)
     - 점령지역은 두 팀과 거리가 같도록 가운데 세로선(x = 38) 위에
         A 위쪽 레인 (반지름 3m, +1점) / B 가운데 핵심 (반지름 5m, +2점) / C 아래쪽 레인 (반지름 4m, +1점)
       존 사이 간격 6~7m (예전 1~2m)
     - 위·가운데·아래 3개 레인 + 맵 위·아래 가장자리 우회로 + 레인 사이 좁은 통로 + B 주변 넓은 교전 공간
     - 에너지 터미널 3종류
         뒤쪽 모서리(안전·멂, 우리 팀만)  /  가운데 공용(A·B·C 사이, 양 팀 모두 · 빠르지만 위험)
     - 부쉬(수풀): 점령지역 접근로·우회로·측면 길·장애물 뒤·터미널 주변 (존과 터미널은 덮지 않음)
   맵은 왼쪽 위 1/4만 적고, 좌우·위아래로 뒤집어 복사합니다. (두 팀이 완전히 공평)
   ============================================================ */

const GameMap = (function () {
  const W = CONFIG.MAP.WIDTH;
  const H = CONFIG.MAP.HEIGHT;

  // 사각형을 좌우 / 위아래로 뒤집기
  const mirX = (r) => ({ ...r, x: W - r.x - r.w });
  const mirY = (r) => ({ ...r, y: H - r.y - r.h });
  // 왼쪽 위 1/4 → 네 곳 모두
  const quad = (list) => list.concat(list.map(mirX), list.map(mirY), list.map((r) => mirX(mirY(r))));
  // 가운데 가로줄(y = 24) 위의 물체 → 좌우만
  const row = (list) => list.concat(list.map(mirX));

  // ---------------- 에너지 존 (원) ----------------
  // 수정 STEP 3과 같은 반지름(3·5·4m) → 문제은행의 "반지름 3m" 문제가 그대로 맞음
  const zones = [
    { id: 'A', x: W / 2, y: 9,  r: 3, points: 1 },   // 위쪽 레인
    { id: 'B', x: W / 2, y: 24, r: 5, points: 2 },   // 가운데 핵심 (교전이 가장 많이 일어나는 곳, 연장전)
    { id: 'C', x: W / 2, y: 39, r: 4, points: 1 },   // 아래쪽 레인
  ];
  zones.forEach((z) => { z.area = circleArea(z.r); });

  // ---------------- 시작 지역 ----------------
  const spawns = {
    SOLAR: { x: 0,     y: 18, w: 6, h: 12 },
    LUNAR: { x: W - 6, y: 18, w: 6, h: 12 },
  };

  // ---------------- 벽 (레인 구분·우회로) ----------------
  const walls = quad([
    { x: 12, y: 15.2, w: 9, h: 0.8 },    // 위 레인 / 가운데 레인 사이 벽 (앞쪽 끝과 사이는 좁은 통로)
    { x: 25, y: 15.2, w: 5, h: 0.8 },
    { x: 16, y: 4.2,  w: 10, h: 0.8 },   // 맵 가장자리 우회로를 나누는 벽
    { x: 31.5, y: 17.5, w: 0.8, h: 3 },  // B 옆 방벽 (B 싸움의 엄폐물)
  ]);

  // ---------------- 엄폐물 ----------------
  const crates = quad([
    { x: 30,   y: 8.3,  w: 1.4, h: 1.4 },   // A 앞 상자
    { x: 20.5, y: 8.6,  w: 1.2, h: 1.2 },   // 위 레인 상자
    { x: 22,   y: 19.5, w: 1.6, h: 1.6 },   // 가운데 레인 상자
    { x: 9.5,  y: 9.5,  w: 1.2, h: 1.2 },   // 뒤쪽 터미널 앞 상자
  ]).concat(row([
    { x: 29,   y: 23.2, w: 1.6, h: 1.6 },   // B 정면 상자
  ]));
  const pillars = row([
    { x: 12, y: 21.5, w: 1.4, h: 5 },       // 시작 지역 앞 기둥 (B로 곧장 가는 길을 막음)
  ]);

  // ---------------- 부쉬 (수풀) ----------------
  // 들어가면 상대 팀 화면에서 보이지 않음. 벽처럼 막지는 않음 (걸어서·탄이 지나감)
  const bushes = quad([
    { x: 27,   y: 1,    w: 5,   h: 3 },     // 가장자리 우회로 끝 → A 옆으로 나오는 길
    { x: 24.5, y: 18,   w: 4,   h: 3.5 },   // B로 들어가는 측면 길
    { x: 14,   y: 6,    w: 4.5, h: 3 },     // 위 레인 상자 뒤
    { x: 1.5,  y: 9.5,  w: 4,   h: 3.5 },   // 뒤쪽 터미널 가는 길
  ]).map((b, i) => ({ ...b, id: 'K' + (i + 1) }));

  // ---------------- 수학 터미널 ----------------
  // (x, y)는 터미널의 중심. side: 쓸 수 있는 팀 (null = 두 팀 모두)
  const terminals = [
    { id: 'T1', side: 'SOLAR', x: 7,      y: 5,      kind: 'back' },    // 뒤쪽 모서리: 안전하지만 존까지 멂
    { id: 'T2', side: 'SOLAR', x: 7,      y: H - 5,  kind: 'back' },
    { id: 'T3', side: 'LUNAR', x: W - 7,  y: 5,      kind: 'back' },
    { id: 'T4', side: 'LUNAR', x: W - 7,  y: H - 5,  kind: 'back' },
    { id: 'T5', side: null,    x: W / 2,  y: 15.6,   kind: 'center' },  // 가운데 공용: A와 B 사이 (빠르지만 위험)
    { id: 'T6', side: null,    x: W / 2,  y: H - 15.6, kind: 'center' },//            B와 C 사이
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

  // 이 점이 들어 있는 부쉬 (없으면 null)
  function bushAt(x, y) {
    for (const b of bushes) {
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
    }
    return null;
  }

  return {
    width: W,
    height: H,
    zones, spawns, walls, crates, pillars, bushes, terminals, solids,
    TERMINAL_SIZE, TERMINAL_USE_RANGE, bushAt,
  };
})();
