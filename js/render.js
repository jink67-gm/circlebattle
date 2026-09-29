/* ============================================================
   서클 배틀 - 화면 그리기 (render.js)
   ------------------------------------------------------------
   게임 속 좌표(미터)를 화면 픽셀로 바꿔 캔버스에 그립니다.
   - 움직이지 않는 맵(바닥, 모눈, 벽 등)은 화면 크기가 바뀔 때 한 번만
     따로 그려 두고(캐시), 매 프레임에는 그 그림을 복사만 합니다.
   - 반짝이는 효과처럼 움직이는 것만 매 프레임 다시 그립니다.
   ============================================================ */

const Renderer = (function () {
  const COLORS = {
    outside: '#0d1130',
    floorCenter: '#232b5e',
    floorEdge: '#171c42',
    gridMinor: 'rgba(140, 160, 255, 0.08)',
    gridMajor: 'rgba(140, 160, 255, 0.18)',
    border: '#7c6cff',
    wall: '#2c3468',
    wallEdge: '#8a7bff',
    crate: '#38437f',
    crateEdge: '#a3adff',
    zoneFill: 'rgba(255, 255, 255, 0.06)',
    zoneLine: 'rgba(235, 240, 255, 0.85)',
    zoneText: '#f3f5ff',
    terminal: '#123a3a',
    terminalEdge: '#4ff0c0',
  };
  const FONT = '"Jua", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';

  let canvas, ctx;
  let cache, cacheCtx;       // 움직이지 않는 맵을 그려 둔 캔버스
  let dpr = 1;
  const view = { w: 0, h: 0, scale: 1, offsetX: 0, offsetY: 0 };

  // ---------------- 초기화와 크기 조절 ----------------
  function init(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    // STEP 20: 움직이지 않는 맵은 뒤쪽 캔버스에 한 번만 그려 둠
    //          (매 프레임 화면 전체를 다시 칠하지 않아 태블릿에서 훨씬 가벼움)
    cache = document.createElement('canvas');
    cache.id = 'map-canvas';
    canvas.parentNode.insertBefore(cache, canvas);
    cacheCtx = cache.getContext('2d');
    resize();
  }

  // ---------------- STEP 20: 화질 (그리는 해상도) ----------------
  //  auto  : 기기 최고 화질로 시작 → 버벅이면 저절로 조금씩 낮춤
  //  high  : 항상 선명하게 (좋은 기기)
  //  fast  : 항상 가볍게 (오래된 태블릿·크롬북)
  const QUALITY_KEY = 'circleBattle.quality';
  let quality = 'auto';
  try { quality = localStorage.getItem(QUALITY_KEY) || 'auto'; } catch (e) { /* 무시 */ }
  if (['auto', 'high', 'fast'].indexOf(quality) === -1) quality = 'auto';
  let autoScale = null;           // auto 에서 낮춘 배율 (null = 아직 낮추지 않음)
  const frames = [];
  let cooldown = 0;

  function maxScale() { return Math.min(window.devicePixelRatio || 1, 2); } // 최대 2배
  function fastScale() { return Math.max(0.8, maxScale() / 2); }
  function targetScale() {
    if (quality === 'high') return maxScale();
    if (quality === 'fast') return fastScale();
    return autoScale ? Math.max(fastScale(), Math.min(autoScale, maxScale())) : maxScale();
  }

  function setQuality(mode) {
    if (['auto', 'high', 'fast'].indexOf(mode) === -1) return;
    quality = mode;
    autoScale = null;
    frames.length = 0;
    try { localStorage.setItem(QUALITY_KEY, mode); } catch (e) { /* 무시 */ }
    resize();
  }

  /**
   * 경기 중 매 프레임 호출 (ms). auto 화질에서 1초에 45장보다 적게 그리면 해상도를 한 단계 낮춤
   * (iPad 저전력 모드처럼 30장으로 고정된 기기도 조금 낮아질 수 있어요. 그럴 땐 설정에서 "선명하게")
   */
  function noteFrame(ms) {
    if (quality !== 'auto' || ms <= 0 || ms > 250) return;
    if (cooldown > 0) { cooldown -= ms; return; }
    frames.push(ms);
    if (frames.length < 60) return;
    const f = frames.splice(0).sort((a, b) => a - b);
    const p50 = f[Math.floor(f.length * 0.5)];
    const scale = targetScale();
    if (p50 > 22 && scale > fastScale() + 0.01) {
      autoScale = Math.max(fastScale(), Math.round(scale * 0.75 * 100) / 100);
      resize();
      cooldown = 1000; // 바뀐 뒤 잠깐 기다렸다가 다시 잼
    }
  }

  function resize() {
    dpr = targetScale();
    view.w = window.innerWidth;
    view.h = window.innerHeight;

    canvas.width = cache.width = Math.round(view.w * dpr);
    canvas.height = cache.height = Math.round(view.h * dpr);
    canvas.style.width = cache.style.width = view.w + 'px';
    canvas.style.height = cache.style.height = view.h + 'px';

    // 위쪽은 점수/시간, 아래쪽은 탄약·에너지 표시 자리로 비워 둡니다. (맵을 가리지 않게)
    const hudTop = view.h < 500 ? 44 : 60;
    const hudBottom = view.h < 500 ? 28 : 50;
    const pad = 8;
    const availW = view.w - pad * 2;
    const availH = view.h - hudTop - hudBottom;
    view.scale = Math.min(availW / GameMap.width, availH / GameMap.height); // 1m = 몇 픽셀
    view.offsetX = (view.w - GameMap.width * view.scale) / 2;
    view.offsetY = hudTop + (availH - GameMap.height * view.scale) / 2;

    drawStaticMap();
  }

  // 이후 그리는 모든 좌표를 '미터' 단위로 쓸 수 있게 변환을 설정합니다.
  function useMeters(c) {
    c.setTransform(dpr * view.scale, 0, 0, dpr * view.scale, dpr * view.offsetX, dpr * view.offsetY);
  }
  function px(n) { return n / view.scale; } // 화면 n픽셀을 미터로

  // 화면 좌표(픽셀) → 게임 좌표(미터). 마우스·터치 조준(STEP 4)에서 사용
  function screenToWorld(sx, sy) {
    return { x: (sx - view.offsetX) / view.scale, y: (sy - view.offsetY) / view.scale };
  }

  // ---------------- 도우미 ----------------
  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y);
    c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r);
    c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r);
    c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
  }
  // 글자는 미터 단위로 아주 작은 글꼴을 쓰면 한글이 깨지므로,
  // 위치만 미터로 받고 실제로는 픽셀 단위로 그립니다.
  function text(c, str, x, y, size, color, weight) {
    c.save();
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.font = (weight || '') + ' ' + Math.round(size * view.scale) + 'px ' + FONT;
    c.fillStyle = color;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(str, view.offsetX + x * view.scale, view.offsetY + y * view.scale);
    c.restore();
  }
  function hexAlpha(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  // ---------------- 움직이지 않는 맵 ----------------
  function drawStaticMap() {
    const c = cacheCtx;
    const W = GameMap.width, H = GameMap.height;

    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = COLORS.outside;
    c.fillRect(0, 0, cache.width, cache.height);

    useMeters(c);

    // 바닥
    const floor = c.createRadialGradient(W / 2, H / 2, 2, W / 2, H / 2, W * 0.6);
    floor.addColorStop(0, COLORS.floorCenter);
    floor.addColorStop(1, COLORS.floorEdge);
    c.fillStyle = floor;
    c.fillRect(0, 0, W, H);

    // 1m 모눈 (5m마다 조금 더 진하게) - 모눈 칸을 세어 원의 넓이를 어림할 수 있습니다.
    for (let x = 1; x < W; x++) {
      c.strokeStyle = x % 5 === 0 ? COLORS.gridMajor : COLORS.gridMinor;
      c.lineWidth = px(1);
      c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke();
    }
    for (let y = 1; y < H; y++) {
      c.strokeStyle = y % 5 === 0 ? COLORS.gridMajor : COLORS.gridMinor;
      c.lineWidth = px(1);
      c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke();
    }

    drawSpawns(c);
    drawZonesStatic(c);
    GameMap.walls.concat(GameMap.pillars).forEach((r) => drawWall(c, r));
    GameMap.crates.forEach((r) => drawCrate(c, r));
    GameMap.terminals.forEach((t) => drawTerminal(c, t));

    // 경기장 테두리
    c.save();
    c.shadowColor = COLORS.border;
    c.shadowBlur = 14 * dpr;
    c.strokeStyle = COLORS.border;
    c.lineWidth = 0.18;
    roundRect(c, 0, 0, W, H, 0.6);
    c.stroke();
    c.restore();
  }

  function drawSpawns(c) {
    Object.keys(GameMap.spawns).forEach((teamId) => {
      const s = GameMap.spawns[teamId];
      const team = CONFIG.TEAMS[teamId];
      c.fillStyle = hexAlpha(team.color, 0.14);
      c.fillRect(s.x, s.y, s.w, s.h);
      c.save();
      c.setLineDash([0.4, 0.3]);
      c.strokeStyle = hexAlpha(team.color, 0.85);
      c.lineWidth = 0.1;
      c.strokeRect(s.x + 0.05, s.y + 0.05, s.w - 0.1, s.h - 0.1);
      c.restore();
      text(c, team.name, s.x + s.w / 2, s.y + 0.9, 0.8, team.color);
      text(c, '시작 지역', s.x + s.w / 2, s.y + 1.8, 0.5, hexAlpha(team.color, 0.8));
    });
  }

  // 존의 글자와 반지름 표시 (테두리는 움직이는 효과라 drawZonesLive에서 그림)
  function drawZonesStatic(c) {
    GameMap.zones.forEach((z) => {
      // 안쪽 칠하기
      c.fillStyle = COLORS.zoneFill;
      c.beginPath(); c.arc(z.x, z.y, z.r, 0, Math.PI * 2); c.fill();

      // 반지름 선: 원의 중심 → 오른쪽 테두리
      c.strokeStyle = 'rgba(235, 240, 255, 0.55)';
      c.lineWidth = 0.06;
      c.beginPath(); c.moveTo(z.x, z.y); c.lineTo(z.x + z.r, z.y); c.stroke();
      // 원의 중심 점
      c.fillStyle = COLORS.zoneText;
      c.beginPath(); c.arc(z.x, z.y, 0.14, 0, Math.PI * 2); c.fill();
      // "r = 3m"
      text(c, 'r = ' + z.r + 'm', z.x + z.r / 2, z.y - 0.45, 0.48, 'rgba(235, 240, 255, 0.85)');

      // 존 이름 (반지름이 클수록 글자도 조금 크게)
      text(c, z.id, z.x, z.y - z.r * 0.5, 0.9 + z.r * 0.12, COLORS.zoneText);
      // 넓이와 점수
      text(c, z.area + '㎡ · +' + z.points + '점', z.x, z.y + z.r * 0.5, 0.5, 'rgba(235, 240, 255, 0.75)');
    });
  }

  function drawWall(c, r) {
    c.fillStyle = COLORS.wall;
    roundRect(c, r.x, r.y, r.w, r.h, 0.15);
    c.fill();
    c.strokeStyle = COLORS.wallEdge;
    c.lineWidth = 0.08;
    c.stroke();
  }

  function drawCrate(c, r) {
    c.fillStyle = COLORS.crate;
    roundRect(c, r.x, r.y, r.w, r.h, 0.12);
    c.fill();
    c.strokeStyle = COLORS.crateEdge;
    c.lineWidth = 0.06;
    c.stroke();
    // 안쪽 무늬
    const i = 0.22;
    c.strokeStyle = 'rgba(163, 173, 255, 0.35)';
    c.lineWidth = 0.05;
    c.strokeRect(r.x + i, r.y + i, r.w - i * 2, r.h - i * 2);
    c.beginPath();
    c.moveTo(r.x + i, r.y + i); c.lineTo(r.x + r.w - i, r.y + r.h - i);
    c.stroke();
  }

  // 터미널: 반지름이 그려진 작은 원 모양 아이콘
  function drawTerminal(c, t) {
    const s = GameMap.TERMINAL_SIZE;
    c.fillStyle = COLORS.terminal;
    roundRect(c, t.x - s / 2, t.y - s / 2, s, s, 0.25);
    c.fill();
    c.strokeStyle = COLORS.terminalEdge;
    c.lineWidth = 0.08;
    c.stroke();

    c.strokeStyle = COLORS.terminalEdge;
    c.lineWidth = 0.07;
    c.beginPath(); c.arc(t.x, t.y, 0.42, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.moveTo(t.x, t.y); c.lineTo(t.x + 0.42, t.y); c.stroke();
    c.fillStyle = COLORS.terminalEdge;
    c.beginPath(); c.arc(t.x, t.y, 0.08, 0, Math.PI * 2); c.fill();

    text(c, '에너지 터미널', t.x, t.y + s / 2 + 0.45, 0.42, 'rgba(79, 240, 192, 0.85)');
  }

  // ---------------- 매 프레임 그리기 ----------------
  // 존 안 상태: 한 팀만 있으면 그 팀 색으로 물들고, 두 팀이 있으면 흰색으로 깜빡임
  function drawZoneOccupancy(c, z, time) {
    const n = z.counts.SOLAR + z.counts.LUNAR;
    if (n === 0) return;
    if (z.contested) {
      const blink = 0.08 + 0.07 * (0.5 + 0.5 * Math.sin(time * 8));
      c.fillStyle = 'rgba(255, 255, 255,' + blink + ')';
    } else {
      const team = z.counts.SOLAR > 0 ? 'SOLAR' : 'LUNAR';
      c.fillStyle = hexAlpha(CONFIG.TEAMS[team].color, 0.16);
    }
    c.beginPath(); c.arc(z.x, z.y, z.r, 0, Math.PI * 2); c.fill();
  }

  // 존 아래쪽 안에 팀별 인원 배지: ● 2  ● 1   (대치 중이면 "대치 중")
  function drawZoneBadge(c, z) {
    const n = z.counts.SOLAR + z.counts.LUNAR;
    if (n === 0) return;
    const y = z.y + z.r * 0.8;
    const teams = ['SOLAR', 'LUNAR'].filter((t) => z.counts[t] > 0);
    const w = teams.length * 1.3 + (z.contested ? 1.9 : 0);
    let x = z.x - w / 2;
    c.fillStyle = 'rgba(10, 12, 35, 0.8)';
    roundRect(c, x - 0.2, y - 0.38, w + 0.4, 0.76, 0.38);
    c.fill();
    teams.forEach((t) => {
      const color = CONFIG.TEAMS[t].color;
      c.fillStyle = color;
      c.beginPath(); c.arc(x + 0.3, y, 0.2, 0, Math.PI * 2); c.fill();
      text(c, String(z.counts[t]), x + 0.85, y + 0.02, 0.5, color);
      x += 1.3;
    });
    if (z.contested) text(c, '대치 중', x + 0.9, y + 0.02, 0.42, '#ffffff');
  }

  /* 점령 게이지: 안쪽 원의 "넓이"가 게이지만큼 차오릅니다.
     게이지가 절반(50%)이면 안쪽 원의 넓이가 절반 → 반지름은 약 0.71배
     (반지름을 절반으로 하면 넓이는 1/4밖에 안 된다는 것을 눈으로 볼 수 있음) */
  function drawZoneGauge(c, z) {
    if (z.progress <= 0 || !z.progressTeam) return;
    const team = CONFIG.TEAMS[z.progressTeam];
    const full = z.owner && z.progress >= z.area;
    const innerR = z.r * Math.sqrt(z.progress / z.area);
    c.fillStyle = hexAlpha(team.color, full ? 0.2 : 0.32);
    c.beginPath(); c.arc(z.x, z.y, innerR, 0, Math.PI * 2); c.fill();
    if (!full) {
      // 안쪽 원 테두리 + "39.3 / 78.5㎡"
      c.strokeStyle = team.color;
      c.lineWidth = 0.07;
      c.stroke();
      const label = (Math.floor(z.progress * 10) / 10) + ' / ' + z.area + '㎡';
      c.fillStyle = 'rgba(10, 12, 35, 0.75)';
      roundRect(c, z.x - 1.75, z.y + z.r * 0.22 - 0.3, 3.5, 0.6, 0.3);
      c.fill();
      text(c, label, z.x, z.y + z.r * 0.22, 0.42, team.color);
    }
  }

  // 점령한 존: 다음 점수까지 남은 시간을 테두리 바깥 고리로 표시
  function drawScoreRing(c, z, interval) {
    if (!z.owner) return;
    const k = Math.min(1, z.scoreTimer / interval);
    c.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    c.lineWidth = 0.14;
    c.lineCap = 'round';
    c.beginPath();
    c.arc(z.x, z.y, z.r + 0.32, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2);
    c.stroke();
    c.lineCap = 'butt';
  }

  function drawZonesLive(c, time, zoneStates, interval) {
    if (zoneStates) {
      zoneStates.forEach((z) => {
        drawZoneOccupancy(c, z, time);
        drawZoneGauge(c, z);
      });
    }
    GameMap.zones.forEach((mz, i) => {
      const z = zoneStates ? zoneStates[i] : mz;
      const pulse = 0.5 + 0.5 * Math.sin(time * 2 + i);
      const ownerColor = z.owner ? CONFIG.TEAMS[z.owner].color : null;

      // 연장전에 쉬는 존은 어둡게
      if (z.disabled) {
        c.fillStyle = 'rgba(5, 7, 25, 0.6)';
        c.beginPath(); c.arc(z.x, z.y, z.r, 0, Math.PI * 2); c.fill();
        c.strokeStyle = 'rgba(180, 190, 255, 0.25)';
        c.lineWidth = 0.08;
        c.stroke();
        text(c, '연장전 휴식', z.x, z.y + z.r * 0.2, 0.45, 'rgba(235, 240, 255, 0.6)');
        return;
      }

      // 은은하게 빛나는 바깥 고리 (점령한 팀 색)
      c.strokeStyle = ownerColor ? hexAlpha(ownerColor, 0.25 + pulse * 0.2)
                                 : 'rgba(180, 190, 255,' + (0.10 + pulse * 0.12) + ')';
      c.lineWidth = 0.35;
      c.beginPath(); c.arc(z.x, z.y, z.r, 0, Math.PI * 2); c.stroke();
      // 테두리: 주인 없으면 천천히 도는 흰 점선, 점령되면 팀 색 실선
      c.save();
      if (!ownerColor) {
        c.setLineDash([0.55, 0.35]);
        c.lineDashOffset = -time * 0.6;
      }
      c.strokeStyle = ownerColor || COLORS.zoneLine;
      c.lineWidth = ownerColor ? 0.14 : 0.1;
      c.beginPath(); c.arc(z.x, z.y, z.r, 0, Math.PI * 2); c.stroke();
      c.restore();

      if (zoneStates) drawScoreRing(c, z, interval);
    });
  }

  function drawTerminalsLive(c, time, near) {
    GameMap.terminals.forEach((t, i) => {
      const pulse = 0.5 + 0.5 * Math.sin(time * 3 + i * 1.3);
      c.save();
      if (near && near.id === t.id) {
        // STEP 11: 내가 쓸 수 있는 터미널 → 밝은 실선 고리 + 위에 "수학 미션"
        c.fillStyle = 'rgba(79, 240, 192, 0.12)';
        c.beginPath(); c.arc(t.x, t.y, GameMap.TERMINAL_USE_RANGE, 0, Math.PI * 2); c.fill();
        c.strokeStyle = 'rgba(79, 240, 192,' + (0.6 + pulse * 0.35) + ')';
        c.lineWidth = 0.1;
        c.stroke();
        c.restore();
        text(c, '수학 미션', t.x, t.y - GameMap.TERMINAL_SIZE / 2 - 0.5, 0.5, '#4ff0c0');
        return;
      }
      // 사용 가능 거리(원)를 희미하게 표시
      c.setLineDash([0.2, 0.25]);
      c.strokeStyle = 'rgba(79, 240, 192,' + (0.12 + pulse * 0.15) + ')';
      c.lineWidth = 0.05;
      c.beginPath(); c.arc(t.x, t.y, GameMap.TERMINAL_USE_RANGE, 0, Math.PI * 2); c.stroke();
      c.restore();
    });
  }

  // ---------------- 캐릭터 ----------------
  // 캐릭터마다 가운데 문양이 다릅니다. (단순한 도형만 사용)
  function drawEmblem(c, type, x, y, s, color) {
    c.save();
    c.translate(x, y);
    c.strokeStyle = color;
    c.fillStyle = color;
    c.lineWidth = s * 0.28;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.beginPath();
    switch (type) {
      case 'diamond': // 블래스터: 다이아몬드
        c.moveTo(0, -s); c.lineTo(s * 0.7, 0); c.lineTo(0, s); c.lineTo(-s * 0.7, 0); c.closePath();
        c.fill();
        break;
      case 'shield': // 가디언: 방패
        c.moveTo(-s * 0.8, -s * 0.8); c.lineTo(s * 0.8, -s * 0.8); c.lineTo(s * 0.8, 0);
        c.quadraticCurveTo(s * 0.8, s * 0.7, 0, s); c.quadraticCurveTo(-s * 0.8, s * 0.7, -s * 0.8, 0);
        c.closePath();
        c.fill();
        break;
      case 'plus': // 메딕: 십자
        c.moveTo(0, -s * 0.85); c.lineTo(0, s * 0.85);
        c.moveTo(-s * 0.85, 0); c.lineTo(s * 0.85, 0);
        c.lineWidth = s * 0.5;
        c.stroke();
        break;
      case 'chevron': // 스피더: 겹화살표
        c.moveTo(-s * 0.8, -s * 0.7); c.lineTo(-s * 0.1, 0); c.lineTo(-s * 0.8, s * 0.7);
        c.moveTo(0, -s * 0.7); c.lineTo(s * 0.7, 0); c.lineTo(0, s * 0.7);
        c.stroke();
        break;
      case 'gear': // 엔지니어: 톱니 원
        for (let i = 0; i < 6; i++) {
          const a = i * Math.PI / 3;
          c.moveTo(Math.cos(a) * s * 0.5, Math.sin(a) * s * 0.5);
          c.lineTo(Math.cos(a) * s * 0.95, Math.sin(a) * s * 0.95);
        }
        c.stroke();
        c.beginPath(); c.arc(0, 0, s * 0.5, 0, Math.PI * 2); c.stroke();
        break;
      case 'snow': // 프로스트: 눈 결정
        for (let i = 0; i < 3; i++) {
          const a = i * Math.PI / 3 + Math.PI / 2;
          c.moveTo(Math.cos(a) * s, Math.sin(a) * s);
          c.lineTo(-Math.cos(a) * s, -Math.sin(a) * s);
        }
        c.stroke();
        break;
    }
    c.restore();
  }

  function drawPlayer(c, p, time) {
    const ch = CHARACTERS[p.charId];
    const team = CONFIG.TEAMS[p.team];
    const r = p.radius;

    // 그림자
    c.fillStyle = 'rgba(0, 0, 0, 0.35)';
    c.beginPath(); c.ellipse(p.x, p.y + r * 0.35, r * 1.0, r * 0.55, 0, 0, Math.PI * 2); c.fill();

    // 내 캐릭터 표시: 발밑에 도는 고리
    if (p.isLocal) {
      c.save();
      c.setLineDash([0.25, 0.18]);
      c.lineDashOffset = -time * 0.8;
      c.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      c.lineWidth = 0.06;
      c.beginPath(); c.arc(p.x, p.y, r + 0.32, 0, Math.PI * 2); c.stroke();
      c.restore();
    }

    // 바라보는 방향 표시 (팀 색 삼각형)
    const fx = Math.cos(p.facing), fy = Math.sin(p.facing);
    c.fillStyle = team.color;
    c.beginPath();
    c.moveTo(p.x + fx * (r + 0.32), p.y + fy * (r + 0.32));
    c.lineTo(p.x + fx * r * 0.9 - fy * 0.24, p.y + fy * r * 0.9 + fx * 0.24);
    c.lineTo(p.x + fx * r * 0.9 + fy * 0.24, p.y + fy * r * 0.9 - fx * 0.24);
    c.closePath();
    c.fill();

    // 몸통: 어두운 원 + 팀 색 테두리
    c.fillStyle = '#1b2152';
    c.beginPath(); c.arc(p.x, p.y, r, 0, Math.PI * 2); c.fill();
    c.strokeStyle = team.color;
    c.lineWidth = 0.13;
    c.stroke();

    // 캐릭터 문양
    drawEmblem(c, ch.emblem, p.x, p.y, r * 0.5, ch.accent);

    // 맞았을 때 하얗게 반짝임
    if (p.hitFlash > 0) {
      c.fillStyle = 'rgba(255, 255, 255,' + Math.min(0.85, p.hitFlash / 0.15 * 0.85) + ')';
      c.beginPath(); c.arc(p.x, p.y, r + 0.05, 0, Math.PI * 2); c.fill();
    }

    // 둔화지역 안: 얼음색 고리
    if (p.slowFactor < 1) {
      c.strokeStyle = 'rgba(158, 232, 255, 0.9)';
      c.lineWidth = 0.08;
      c.setLineDash([0.15, 0.12]);
      c.beginPath(); c.arc(p.x, p.y, r + 0.14, 0, Math.PI * 2); c.stroke();
      c.setLineDash([]);
    }

    // 재등장 보호막: 반짝이는 고리
    if (p.protect > 0) {
      const blink = 0.45 + 0.35 * Math.sin(time * 14);
      c.strokeStyle = 'rgba(158, 232, 255,' + blink + ')';
      c.lineWidth = 0.1;
      c.beginPath(); c.arc(p.x, p.y, r + 0.22, 0, Math.PI * 2); c.stroke();
    }

    // STEP 13: 미션 보너스 — 개인 보호막(하늘색 거품, 남은 양만큼 두껍게)
    if (p.shieldTimer > 0 && p.shieldHp > 0) {
      const k = p.shieldHp / CONFIG.MISSION.SHIELD_HP;
      c.fillStyle = 'rgba(158, 232, 255, 0.14)';
      c.beginPath(); c.arc(p.x, p.y, r + 0.45, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(158, 232, 255, 0.95)';
      c.lineWidth = 0.05 + 0.1 * k;
      c.stroke();
    }
    // STEP 13: 미션 보너스 — 가속(움직이는 반대쪽으로 초록 줄무늬)
    if (p.boostTimer > 0) {
      const sp = Math.hypot(p.vx, p.vy);
      const bx = sp > 0.1 ? -p.vx / sp : -Math.cos(p.facing);
      const by = sp > 0.1 ? -p.vy / sp : -Math.sin(p.facing);
      c.strokeStyle = 'rgba(109, 255, 168, 0.8)';
      c.lineWidth = 0.08;
      c.lineCap = 'round';
      for (let i = -1; i <= 1; i++) {
        const ox = -by * i * 0.35, oy = bx * i * 0.35;
        const len = 0.5 + 0.25 * Math.sin(time * 20 + i);
        c.beginPath();
        c.moveTo(p.x + bx * (r + 0.1) + ox, p.y + by * (r + 0.1) + oy);
        c.lineTo(p.x + bx * (r + 0.1 + len) + ox, p.y + by * (r + 0.1 + len) + oy);
        c.stroke();
      }
      c.lineCap = 'butt';
    }

    // 수학 미션 중: 민트색 고리 + "문제 푸는 중"
    if (p.inMission) {
      c.strokeStyle = 'rgba(79, 240, 192, 0.9)';
      c.lineWidth = 0.1;
      c.beginPath(); c.arc(p.x, p.y, r + 0.3, 0, Math.PI * 2); c.stroke();
      text(c, '문제 푸는 중', p.x, p.y - r - 1.3, 0.4, '#4ff0c0');
    }

    drawHpBar(c, p, team);

    // 닉네임
    text(c, p.nick, p.x, p.y - r - 0.8, 0.5, p.isLocal ? '#ffffff' : team.color);
  }

  // ---------------- 체력바 ----------------
  function drawHpBar(c, p, team) {
    const w = 1.6, h = 0.22;
    const x = p.x - w / 2, y = p.y - p.radius - 0.45;
    const k = p.hp / p.maxHp;
    const kShown = p.hpShown / p.maxHp;
    // 바탕
    c.fillStyle = 'rgba(10, 12, 35, 0.85)';
    roundRect(c, x - 0.04, y - 0.04, w + 0.08, h + 0.08, 0.1);
    c.fill();
    // 방금 깎인 부분 (흰색이 천천히 줄어듦)
    if (kShown > k) {
      c.fillStyle = 'rgba(255, 255, 255, 0.85)';
      c.fillRect(x, y, w * kShown, h);
    }
    // 남은 체력: 팀 색, 30% 이하면 빨강
    c.fillStyle = k <= 0.3 ? '#ff5d6c' : team.color;
    c.fillRect(x, y, w * k, h);
  }

  function drawPlayers(c, players, time) {
    // 아래쪽에 있는 캐릭터를 나중에 그려 자연스럽게 겹치게 합니다.
    // 재충전 중인 캐릭터는 보이지 않습니다.
    const sorted = players.filter((p) => p.alive).sort((a, b) => a.y - b.y);
    sorted.forEach((p) => drawPlayer(c, p, time));
  }

  // ---------------- 조준선 ----------------
  // 기본 공격이 닿는 범위를 미리 보여줍니다. (충격파는 부채꼴, 나머지는 직선)
  function drawAimGuide(c, p, aim) {
    const atk = CHARACTERS[p.charId].attack;
    const team = CONFIG.TEAMS[p.team];
    const a = aim.angle;
    c.save();
    if (atk.shape === 'wave') {
      const half = atk.spreadDeg * Math.PI / 360;
      c.fillStyle = hexAlpha(team.color, 0.18);
      c.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      c.lineWidth = 0.06;
      c.beginPath();
      c.moveTo(p.x, p.y);
      c.arc(p.x, p.y, atk.range, a - half, a + half);
      c.closePath();
      c.fill();
      c.stroke();
    } else {
      const w = atk.size * 2;
      const len = atk.range;
      // 탄 폭만큼의 옅은 띠 + 가운데 점선
      c.translate(p.x, p.y);
      c.rotate(a);
      c.fillStyle = hexAlpha(team.color, 0.2);
      c.fillRect(p.radius, -w / 2, len - p.radius, w);
      c.setLineDash([0.3, 0.25]);
      c.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      c.lineWidth = 0.06;
      c.beginPath(); c.moveTo(p.radius, 0); c.lineTo(len, 0); c.stroke();
      c.setLineDash([]);
      // 끝 표시
      c.beginPath(); c.moveTo(len, -w); c.lineTo(len, w); c.stroke();
    }
    c.restore();
  }

  // ---------------- 발사체 ----------------
  function drawProjectile(c, b) {
    const team = CONFIG.TEAMS[b.team];
    const accent = CHARACTERS[b.charId].accent;
    // 사거리 끝에 가까울수록 흐려짐
    const fade = Math.max(0.25, Math.min(1, (b.range - b.traveled) / 1.5 + 0.25));
    c.save();
    c.globalAlpha = fade;

    if (b.shape === 'wave') {
      // 부채꼴 충격파: 중심에서 퍼져 나가는 두꺼운 호
      const half = b.spread / 2;
      c.strokeStyle = accent;
      c.lineWidth = b.size;
      c.lineCap = 'round';
      c.beginPath();
      c.arc(b.originX, b.originY, b.traveled, b.angle - half, b.angle + half);
      c.stroke();
      c.strokeStyle = team.color;
      c.lineWidth = b.size * 0.35;
      c.stroke();
    } else {
      // 꼬리
      const tail = b.shape === 'orb' ? 0.5 : Math.min(1.2, b.speed * 0.06);
      c.strokeStyle = hexAlpha(accent, 0.55);
      c.lineWidth = b.size * 1.4;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(b.x - b.dirX * tail, b.y - b.dirY * tail);
      c.lineTo(b.x, b.y);
      c.stroke();
      // 몸통: 팀 색 테두리 + 캐릭터 색 가운데
      c.fillStyle = team.color;
      c.beginPath(); c.arc(b.x, b.y, b.size, 0, Math.PI * 2); c.fill();
      c.fillStyle = accent;
      c.beginPath(); c.arc(b.x, b.y, b.size * 0.6, 0, Math.PI * 2); c.fill();
    }
    c.restore();
  }

  // ---------------- 특수기 원 (STEP 9) ----------------
  // 남은 시간을 원 바깥의 흰 호로 보여줌
  function drawTimeArc(c, a) {
    const k = 1 - Math.min(1, a.age / a.duration);
    c.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    c.lineWidth = 0.1;
    c.beginPath();
    c.arc(a.x, a.y, a.r + 0.2, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2);
    c.stroke();
  }

  function drawIconRing(c, a, time, drawIcon) {
    const n = Math.max(3, Math.round(a.r * 1.5));
    for (let i = 0; i < n; i++) {
      const ang = time * 0.6 + i * Math.PI * 2 / n;
      drawIcon(a.x + Math.cos(ang) * a.r * 0.62, a.y + Math.sin(ang) * a.r * 0.62);
    }
  }

  function drawArea(c, a, time) {
    const team = CONFIG.TEAMS[a.team];
    c.save();
    if (a.kind === 'blast') {
      // 폭발 예고: 점점 진해지고, 안쪽 고리가 줄어들며 카운트다운
      const k = Math.min(1, a.age / a.duration);
      c.fillStyle = hexAlpha('#ff6b8a', 0.12 + k * 0.25);
      c.beginPath(); c.arc(a.x, a.y, a.r, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#ff6b8a';
      c.lineWidth = 0.12;
      c.stroke();
      c.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      c.lineWidth = 0.08;
      c.beginPath(); c.arc(a.x, a.y, Math.max(0.05, a.r * (1 - k)), 0, Math.PI * 2); c.stroke();
    } else if (a.kind === 'shield') {
      const pulse = 0.5 + 0.5 * Math.sin(time * 4);
      c.fillStyle = hexAlpha(team.color, 0.12 + pulse * 0.05);
      c.beginPath(); c.arc(a.x, a.y, a.r, 0, Math.PI * 2); c.fill();
      c.strokeStyle = hexAlpha(team.color, 0.9);
      c.lineWidth = 0.16;
      c.stroke();
      c.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      c.lineWidth = 0.05;
      c.beginPath(); c.arc(a.x, a.y, a.r - 0.25, 0, Math.PI * 2); c.stroke();
      drawTimeArc(c, a);
    } else if (a.kind === 'heal') {
      c.fillStyle = 'rgba(109, 255, 168, 0.13)';
      c.beginPath(); c.arc(a.x, a.y, a.r, 0, Math.PI * 2); c.fill();
      c.setLineDash([0.4, 0.25]);
      c.lineDashOffset = -time;
      c.strokeStyle = 'rgba(109, 255, 168, 0.9)';
      c.lineWidth = 0.1;
      c.stroke();
      c.setLineDash([]);
      c.strokeStyle = 'rgba(109, 255, 168, 0.8)';
      c.lineWidth = 0.1;
      drawIconRing(c, a, time, (x, y) => {
        c.beginPath();
        c.moveTo(x - 0.22, y); c.lineTo(x + 0.22, y);
        c.moveTo(x, y - 0.22); c.lineTo(x, y + 0.22);
        c.stroke();
      });
      drawTimeArc(c, a);
    } else if (a.kind === 'slow') {
      c.fillStyle = 'rgba(158, 232, 255, 0.16)';
      c.beginPath(); c.arc(a.x, a.y, a.r, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(158, 232, 255, 0.9)';
      c.lineWidth = 0.1;
      c.stroke();
      c.strokeStyle = 'rgba(220, 245, 255, 0.8)';
      c.lineWidth = 0.06;
      drawIconRing(c, a, -time * 0.5, (x, y) => {
        c.beginPath();
        for (let i = 0; i < 3; i++) {
          const ang = i * Math.PI / 3;
          c.moveTo(x - Math.cos(ang) * 0.22, y - Math.sin(ang) * 0.22);
          c.lineTo(x + Math.cos(ang) * 0.22, y + Math.sin(ang) * 0.22);
        }
        c.stroke();
      });
      drawTimeArc(c, a);
    } else if (a.kind === 'turret') {
      // 공격 범위(원) + 터렛 몸체
      c.fillStyle = hexAlpha(team.color, 0.06);
      c.beginPath(); c.arc(a.x, a.y, a.r, 0, Math.PI * 2); c.fill();
      c.setLineDash([0.35, 0.25]);
      c.strokeStyle = hexAlpha(team.color, 0.75);
      c.lineWidth = 0.08;
      c.stroke();
      c.setLineDash([]);
      drawTimeArc(c, a);
      c.fillStyle = '#2a2f63';
      roundRect(c, a.x - 0.45, a.y - 0.45, 0.9, 0.9, 0.18);
      c.fill();
      c.strokeStyle = team.color;
      c.lineWidth = 0.08;
      c.stroke();
      c.strokeStyle = '#c49bff';
      c.lineWidth = 0.18;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(a.x, a.y);
      c.lineTo(a.x + Math.cos(a.aim) * 0.7, a.y + Math.sin(a.aim) * 0.7);
      c.stroke();
    }
    c.restore();

    // STEP 10: 놓은 직후 1.5초 동안 "r3 · 28.26㎡" 라벨
    if (a.age < 1.5 && a.kind !== 'blast') {
      c.save();
      c.globalAlpha = a.age < 1.1 ? 1 : 1 - (a.age - 1.1) / 0.4;
      text(c, 'r' + a.r + ' · ' + a.area + '㎡', a.x, a.y + a.r + 0.55, 0.45, '#ffffff');
      c.restore();
    }
  }

  // 특수기 범위 미리보기: 원 + 반지름 + 넓이 + 비용
  function drawSpecialPreview(c, pv, time) {
    const team = CONFIG.TEAMS[pv.team];
    const good = pv.ok;
    const main = good ? team.color : '#ff5d6c';
    c.save();

    // 원을 놓을 수 있는 최대 거리 (희미한 점선)
    if (pv.castRange > 0 && pv.type !== 'blink') {
      c.setLineDash([0.3, 0.3]);
      c.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      c.lineWidth = 0.05;
      c.beginPath(); c.arc(pv.fromX, pv.fromY, pv.castRange, 0, Math.PI * 2); c.stroke();
      c.setLineDash([]);
    }

    if (pv.type === 'blink') {
      // 순간이동: 내 주변 반지름 6m 원 = 갈 수 있는 곳, 착지 지점 표시
      c.fillStyle = hexAlpha(main, 0.1);
      c.beginPath(); c.arc(pv.fromX, pv.fromY, pv.r, 0, Math.PI * 2); c.fill();
      c.strokeStyle = main;
      c.lineWidth = 0.08;
      c.stroke();
      c.setLineDash([0.25, 0.2]);
      c.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      c.beginPath(); c.moveTo(pv.fromX, pv.fromY); c.lineTo(pv.x, pv.y); c.stroke();
      c.setLineDash([]);
      c.beginPath(); c.arc(pv.x, pv.y, PLAYER_RADIUS, 0, Math.PI * 2); c.stroke();
      c.restore();
      text(c, '반지름 ' + pv.r + 'm 안 · ' + pv.cost + '⚡', pv.fromX, pv.fromY + pv.r + 0.55, 0.45,
        good ? '#ffd84d' : '#ff9db0');
      return;
    }

    // STEP 10: 고를 수 있는 다른 반지름의 원을 점선으로 겹쳐 그림 (크기 비교)
    c.setLineDash([0.18, 0.18]);
    c.lineWidth = 0.04;
    CONFIG.SKILL_RADII.forEach((rr) => {
      if (rr === pv.r) return;
      c.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      c.beginPath(); c.arc(pv.x, pv.y, rr, 0, Math.PI * 2); c.stroke();
    });
    c.setLineDash([]);
    // 방금 반지름을 바꿨으면 이전 원을 잠깐 진하게 (넓이 차이가 보이게)
    if (pv.prevR) {
      const fade = Math.max(0, 1 - pv.prevAge / 1.5);
      c.fillStyle = 'rgba(255, 255, 255,' + (0.18 * fade) + ')';
      c.beginPath(); c.arc(pv.x, pv.y, pv.prevR, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(255, 255, 255,' + (0.9 * fade) + ')';
      c.lineWidth = 0.08;
      c.stroke();
    }

    // 원
    const pulse = 0.5 + 0.5 * Math.sin(time * 6);
    c.fillStyle = hexAlpha(main, 0.18 + pulse * 0.06);
    c.beginPath(); c.arc(pv.x, pv.y, pv.r, 0, Math.PI * 2); c.fill();
    c.strokeStyle = main;
    c.lineWidth = 0.1;
    c.stroke();
    // 반지름 선과 중심
    c.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    c.lineWidth = 0.06;
    c.beginPath(); c.moveTo(pv.x, pv.y); c.lineTo(pv.x + pv.r, pv.y); c.stroke();
    c.fillStyle = '#ffffff';
    c.beginPath(); c.arc(pv.x, pv.y, 0.1, 0, Math.PI * 2); c.fill();
    c.restore();

    text(c, 'r ' + pv.r + 'm', pv.x + pv.r / 2, pv.y - 0.38, 0.42, '#ffffff');
    // 다른 반지름 원 이름 (원 위쪽 가장자리)
    CONFIG.SKILL_RADII.forEach((rr) => {
      if (rr === pv.r) return;
      text(c, 'r' + rr, pv.x - 0.9, pv.y - rr + 0.3, 0.34, 'rgba(255, 255, 255, 0.7)');
    });
    // 넓이 · 비용 라벨
    const label = pv.area + '㎡ · ' + pv.cost + '⚡' + (good ? '' : ' 부족');
    c.fillStyle = 'rgba(10, 12, 35, 0.8)';
    roundRect(c, pv.x - 1.9, pv.y + pv.r + 0.15, 3.8, 0.7, 0.35);
    c.fill();
    text(c, label, pv.x, pv.y + pv.r + 0.5, 0.45, good ? '#ffd84d' : '#ff9db0');
  }

  // ---------------- 짧은 효과 ----------------
  function drawEffect(c, e) {
    const k = e.age / e.life; // 0 → 1
    if (e.kind === 'spark') {
      // 부딪힌 자리에서 퍼지는 고리 + 작은 조각 4개
      const R = (e.big ? 0.9 : 0.55) * (0.3 + k);
      c.save();
      c.globalAlpha = 1 - k;
      c.strokeStyle = e.color;
      c.lineWidth = 0.09;
      c.beginPath(); c.arc(e.x, e.y, R, 0, Math.PI * 2); c.stroke();
      c.fillStyle = '#ffffff';
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2 + Math.PI / 4;
        c.beginPath(); c.arc(e.x + Math.cos(a) * R * 1.2, e.y + Math.sin(a) * R * 1.2, 0.07, 0, Math.PI * 2); c.fill();
      }
      c.restore();
    } else if (e.kind === 'recharge') {
      // 체력 0: 에너지 조각이 위로 흩어지며 사라짐 (폭력적인 표현 없이)
      c.save();
      c.globalAlpha = 1 - k;
      c.strokeStyle = e.color;
      c.lineWidth = 0.08;
      c.beginPath(); c.arc(e.x, e.y, 0.7 + k * 0.9, 0, Math.PI * 2); c.stroke();
      c.fillStyle = e.color;
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        const d = 0.5 + k * 1.3;
        c.beginPath();
        c.arc(e.x + Math.cos(a) * d, e.y + Math.sin(a) * d - k * 0.8, 0.12 * (1 - k) + 0.03, 0, Math.PI * 2);
        c.fill();
      }
      text(c, '충전!', e.x, e.y - k * 0.6, 0.55, e.color);
      c.restore();
    } else if (e.kind === 'spawn') {
      // 재등장: 큰 고리가 캐릭터 쪽으로 모여듦
      c.save();
      c.globalAlpha = 1 - k * 0.7;
      c.strokeStyle = e.color;
      c.lineWidth = 0.12;
      const R0 = e.radius ? e.radius + 1.5 : 2.2; // 존 점령 효과는 존보다 조금 크게
      c.beginPath(); c.arc(e.x, e.y, Math.max(0.1, R0 - k * 1.4), 0, Math.PI * 2); c.stroke();
      c.restore();
    } else if (e.kind === 'blast') {
      // 에너지 폭발: 원 전체가 번쩍 + 바깥으로 퍼지는 고리
      c.save();
      c.globalAlpha = 1 - k;
      c.fillStyle = 'rgba(255, 220, 230, 0.45)';
      c.beginPath(); c.arc(e.x, e.y, e.r, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#ff6b8a';
      c.lineWidth = 0.2;
      c.beginPath(); c.arc(e.x, e.y, e.r * (0.7 + k * 0.4), 0, Math.PI * 2); c.stroke();
      c.restore();
    } else if (e.kind === 'dmg') {
      // 피해 숫자: 위로 떠오르며 사라짐
      c.save();
      c.globalAlpha = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
      text(c, e.text, e.x, e.y - k * 0.8, 0.62, e.color);
      c.restore();
    }
  }

  /**
   * @param time  현재 시간(초)
   * @param world 그릴 대상 { players, projectiles, localPlayer, aim, effects }
   */
  function render(time, world) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height); // 맵은 뒤쪽 캔버스(map-canvas)에 있음
    useMeters(ctx);
    drawZonesLive(ctx, time, world && world.zones, world && world.scoreInterval);
    drawTerminalsLive(ctx, time, world && world.nearTerminal);
    if (world && world.areas) world.areas.forEach((a) => drawArea(ctx, a, time));
    if (world && world.specialPreview) drawSpecialPreview(ctx, world.specialPreview, time);
    if (world && world.localPlayer && world.aim) drawAimGuide(ctx, world.localPlayer, world.aim);
    if (world && world.players) drawPlayers(ctx, world.players, time);
    if (world && world.projectiles) world.projectiles.forEach((b) => drawProjectile(ctx, b));
    if (world && world.zones) world.zones.forEach((z) => drawZoneBadge(ctx, z));
    if (world && world.effects) world.effects.forEach((e) => drawEffect(ctx, e));
    if (debug) drawDebug(ctx, world);
  }

  // ---------------- STEP 14: 대기방 캐릭터 그림 ----------------
  // 게임 속과 같은 모양으로 작은 캔버스에 캐릭터를 그립니다.
  function drawCharacterIcon(canvasEl, charId, teamId) {
    const size = canvasEl.clientWidth || 56;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvasEl.width = size * ratio;
    canvasEl.height = size * ratio;
    const c = canvasEl.getContext('2d');
    const s = size * ratio / 2.2; // 캔버스 한 변 = 2.2m
    c.setTransform(s, 0, 0, s, size * ratio / 2, size * ratio / 2);
    c.clearRect(-2, -2, 4, 4);
    const ch = CHARACTERS[charId];
    const team = CONFIG.TEAMS[teamId || 'SOLAR'];
    const r = 0.8;
    c.fillStyle = '#1b2152';
    c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
    c.strokeStyle = team.color;
    c.lineWidth = 0.14;
    c.stroke();
    drawEmblem(c, ch.emblem, 0, 0, r * 0.5, ch.accent);
  }

  // ---------------- 충돌 상자 보기 (?debug=1) ----------------
  let debug = false;
  function setDebug(on) { debug = on; }

  function drawDebug(c, world) {
    c.strokeStyle = 'rgba(255, 70, 90, 0.9)';
    c.lineWidth = px(1.5);
    GameMap.solids.forEach((r) => c.strokeRect(r.x, r.y, r.w, r.h));
    if (world && world.players) {
      c.strokeStyle = 'rgba(90, 255, 120, 0.9)';
      world.players.forEach((p) => {
        c.beginPath(); c.arc(p.x, p.y, p.radius, 0, Math.PI * 2); c.stroke();
      });
    }
  }

  return { init, resize, render, redrawStatic: drawStaticMap, screenToWorld, view, setDebug, drawCharacterIcon,
    setQuality, noteFrame, getQuality: () => quality, scale: () => dpr };
})();
