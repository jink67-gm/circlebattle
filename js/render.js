/* ============================================================
   서클 배틀 - 화면 그리기 (render.js)
   ------------------------------------------------------------
   게임 속 좌표(미터)를 화면 픽셀로 바꿔 캔버스에 그립니다.
   - 움직이지 않는 맵(바닥, 모눈, 벽 등)은 화면 크기가 바뀔 때 한 번만
     따로 그려 두고(캐시), 매 프레임에는 그 그림을 복사만 합니다.
   - 반짝이는 효과처럼 움직이는 것만 매 프레임 다시 그립니다.
   새 STEP 2: 캐릭터 추적 카메라
   - 학생 화면: 내 캐릭터를 부드럽게 따라감 (상대 쪽을 조금 더, 경기장 밖은 안 보이게)
   - 선생님 관전(TV): 지금처럼 경기장 전체
   - 넓어진 맵은 경기 시작 때 그림 한 장으로 미리 그려 두고(1m = 최대 60픽셀), 화면에 보이는 부분만 잘라 붙임
   - 뒤쪽 맵 캔버스는 화면보다 20% 넓게 그려 두고 카메라가 움직이면 통째로 밀기만 함 (GPU, 매 프레임 다시 그리지 않음)
   - 화면 밖의 캐릭터·탄·효과는 그리지 않음
   - 부쉬: 캐릭터 위에 수풀을 덮고, 상대 팀에게 숨은 캐릭터는 그리지 않음 (bush.js)
   - 오른쪽 위 작은 미니맵 (존 주인, 우리 팀, 보이는 상대)
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

  // ---------------- 새 STEP 2: 카메라 ----------------
  //  mode 'follow'  : 내 캐릭터를 따라감 (학생·선생님 참가·혼자 연습)
  //  mode 'overview': 경기장 전체 (선생님 관전 TV, 경기 전)
  const cam = { x: 0, y: 0, ready: false, mode: 'overview' };
  let lastT = 0;
  let staticKey = '';        // 뒤쪽 캔버스에 마지막으로 그린 카메라 위치 (같으면 다시 그리지 않음)
  // 추적 카메라: 뒤쪽 맵 캔버스를 화면보다 20% 넓게 한 번 그려 두고, 카메라가 움직이면 그림을 통째로 밀기만 함(GPU)
  //   → 매 프레임 맵을 다시 그리지 않음. 가장자리를 넘어갈 만큼 움직였을 때만 새로 그림
  const back = { mx: 0, my: 0, ox: null, oy: null };

  // 경기장 전체 그림 한 장 (1m = 최대 60 기기 픽셀)
  const MAP_PPM_MAX = 60;
  let mapImg = null, mapPPM = 0;

  // 부쉬 그림 (부쉬마다 한 장, 배율이 바뀌면 다시)
  const bushSprites = new Map();
  let bushPPM = 0;

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
    // 새 STEP 3: 캐릭터·스킬 그림(skillfx.js)과 경기장 그림(arena.js)이 같은 도우미를 씀
    const helpers = { text, roundRect, hexAlpha };
    SkillFx.init(helpers);
    ArenaArt.init(helpers);
    CharacterRenderer.init(helpers); // 캐릭터 리디자인: 2등신 아레나 캐릭터 (character.js)
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
    // 새 STEP 3: "가볍게" 화질이거나 느린 기기라서 자동으로 가장 낮아지면 스킬 효과도 가볍게
    const liteFx = quality === 'fast' || (quality === 'auto' && autoScale !== null && dpr <= fastScale() + 0.01);
    SkillFx.setLite(liteFx);
    CharacterRenderer.setLite(liteFx);
    view.w = window.innerWidth;
    view.h = window.innerHeight;

    canvas.width = Math.round(view.w * dpr);
    canvas.height = Math.round(view.h * dpr);
    canvas.style.width = view.w + 'px';
    canvas.style.height = view.h + 'px';
    // 뒤쪽 맵 캔버스: 추적 카메라면 화면보다 사방 20% 크게
    back.mx = cam.mode === 'follow' ? Math.round(view.w * 0.2) : 0;
    back.my = cam.mode === 'follow' ? Math.round(view.h * 0.2) : 0;
    back.ox = back.oy = null;
    cache.width = Math.round((view.w + back.mx * 2) * dpr);
    cache.height = Math.round((view.h + back.my * 2) * dpr);
    cache.style.width = (view.w + back.mx * 2) + 'px';
    cache.style.height = (view.h + back.my * 2) + 'px';
    cache.style.left = -back.mx + 'px';
    cache.style.top = -back.my + 'px';
    cache.style.transform = '';
    cache.style.willChange = cam.mode === 'follow' ? 'transform' : '';

    if (cam.mode === 'follow') {
      // 새 STEP 2: 화면 세로에 약 22m (아주 넓은 화면은 가로 40m까지)
      view.scale = Math.max(view.h / CONFIG.CAMERA.VIEW_H, view.w / CONFIG.CAMERA.VIEW_W_MAX);
      applyCamera();
    } else {
      // 경기장 전체: 위쪽은 점수/시간, 아래쪽은 탄약·에너지 표시 자리로 비워 둡니다.
      const hudTop = view.h < 500 ? 44 : 60;
      const hudBottom = view.h < 500 ? 28 : 50;
      const pad = 8;
      const availW = view.w - pad * 2;
      const availH = view.h - hudTop - hudBottom;
      view.scale = Math.min(availW / GameMap.width, availH / GameMap.height); // 1m = 몇 픽셀
      view.offsetX = (view.w - GameMap.width * view.scale) / 2;
      view.offsetY = hudTop + (availH - GameMap.height * view.scale) / 2;
    }
    staticKey = '';
    drawStaticMap();
    sizeMinimap();
  }

  // ---------------- 새 STEP 2: 카메라 ----------------
  function setCameraMode(mode) {
    if (cam.mode === mode) return;
    cam.mode = mode;
    cam.ready = false;
    resize();
  }

  // 카메라 위치 → 화면 변환 (경기장 밖은 테두리만 살짝 보이게)
  function applyCamera() {
    const W = GameMap.width, H = GameMap.height, E = CONFIG.CAMERA.EDGE;
    const halfW = view.w / 2 / view.scale, halfH = view.h / 2 / view.scale;
    const x = W + E * 2 <= halfW * 2 ? W / 2 : Math.max(halfW - E, Math.min(W + E - halfW, cam.x));
    const y = H + E * 2 <= halfH * 2 ? H / 2 : Math.max(halfH - E, Math.min(H + E - halfH, cam.y));
    cam.x = x; cam.y = y;
    // 기기 픽셀 단위로 맞춤 → 뒤쪽 맵 그림을 밀 때 앞쪽 캔버스와 정확히 겹침
    view.offsetX = Math.round((view.w / 2 - x * view.scale) * dpr) / dpr;
    view.offsetY = Math.round((view.h / 2 - y * view.scale) * dpr) / dpr;
  }

  // 내 캐릭터를 부드럽게 따라감. 재등장처럼 멀리 옮겨지면 바로
  function updateCamera(dt, me) {
    if (!me) return;
    const C = CONFIG.CAMERA;
    if (me.alive || !cam.ready) {
      const tx = me.x + (me.team === 'LUNAR' ? -C.LOOK_AHEAD : C.LOOK_AHEAD);
      const ty = me.y;
      if (!cam.ready || Math.hypot(tx - cam.x, ty - cam.y) > C.SNAP_DIST) {
        cam.x = tx; cam.y = ty; cam.ready = true;
      } else {
        const k = 1 - Math.exp(-dt * C.FOLLOW);
        cam.x += (tx - cam.x) * k;
        cam.y += (ty - cam.y) * k;
      }
    }
    applyCamera();
  }

  function worldToScreen(x, y) {
    return { x: x * view.scale + view.offsetX, y: y * view.scale + view.offsetY };
  }

  // 지금 화면에 보이는 경기장 범위 (m) — 화면 밖 물체는 그리지 않음
  function visibleRect(margin) {
    const m = margin || 0;
    const x0 = -view.offsetX / view.scale, y0 = -view.offsetY / view.scale;
    return { x0: x0 - m, y0: y0 - m, x1: x0 + view.w / view.scale + m, y1: y0 + view.h / view.scale + m };
  }
  function onScreen(vr, x, y, r) {
    return x + r >= vr.x0 && x - r <= vr.x1 && y + r >= vr.y0 && y - r <= vr.y1;
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
  // 새 STEP 2: 지금 캔버스의 변환(카메라·맵 조각)을 읽어 그 자리에 픽셀 글꼴로 씀
  function text(c, str, x, y, size, color, weight) {
    const m = c.getTransform();
    const sx = m.a * x + m.c * y + m.e, sy = m.b * x + m.d * y + m.f;
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.font = (weight || '') + ' ' + Math.max(1, Math.round(size * m.a)) + 'px ' + FONT;
    c.fillStyle = color;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(str, sx, sy);
    c.restore();
  }
  function hexAlpha(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  // ---------------- 움직이지 않는 맵 ----------------
  // 새 STEP 2: 경기장 전체를 한 번에 그리지 않고 8m 조각으로 나눠, 보이는 조각만 뒤쪽 캔버스에 붙임
  //            (카메라가 움직일 때만 다시 붙임 — 조각 그림은 그대로 재사용)
  // 경기장 전체(TV): 뒤쪽 캔버스에 한 번만 그려 둠 (카메라가 안 움직이므로)
  // 추적 카메라: 매 프레임 조각을 앞쪽 캔버스에 바로 붙임 (지우기 + 두 장 겹치기를 하지 않아 가벼움)
  function drawStaticMap() {
    const c = cacheCtx;
    if (cam.mode === 'follow') {
      const dx = view.offsetX - back.ox, dy = view.offsetY - back.oy;
      const key = view.scale.toFixed(4) + '|' + dpr;
      if (back.ox !== null && key === staticKey && Math.abs(dx) < back.mx - 2 && Math.abs(dy) < back.my - 2) {
        cache.style.transform = dx || dy ? 'translate(' + dx + 'px,' + dy + 'px)' : '';
        return; // 그림은 그대로, 밀기만
      }
      staticKey = key;
      back.ox = view.offsetX; back.oy = view.offsetY;
      cache.style.transform = '';
      blitChunks(c, back.mx, back.my);
      return;
    }
    const key = view.scale.toFixed(4) + '|' + view.offsetX.toFixed(2) + '|' + view.offsetY.toFixed(2) + '|' + dpr;
    if (key === staticKey) return;
    staticKey = key;
    blitChunks(c, 0, 0);
  }

  // 맵 그림을 c(기기 픽셀 좌표)에 붙임. mx, my: 캔버스가 화면보다 넓은 여백(CSS px)
  // 경기장 밖 가장자리는 바깥 색으로만 칠함
  function blitChunks(c, mx, my) {
    const img = getMapImage();
    c.setTransform(1, 0, 0, 1, 0, 0);
    const ox = view.offsetX + mx, oy = view.offsetY + my;
    const edge = (m, off) => Math.round((m * view.scale + off) * dpr); // 정수 픽셀로 (앞쪽 캔버스와 정확히 겹치게)
    const W = c.canvas.width, H = c.canvas.height;
    const dx0 = edge(0, ox), dy0 = edge(0, oy), dx1 = edge(GameMap.width, ox), dy1 = edge(GameMap.height, oy);
    // 화면에 보이는 부분만 잘라서 붙임 (그림 전체를 늘리지 않음)
    const kx = img.width / (dx1 - dx0), ky = img.height / (dy1 - dy0);
    const cx0 = Math.max(0, dx0), cy0 = Math.max(0, dy0), cx1 = Math.min(W, dx1), cy1 = Math.min(H, dy1);
    if (cx1 > cx0 && cy1 > cy0) {
      c.drawImage(img, (cx0 - dx0) * kx, (cy0 - dy0) * ky, (cx1 - cx0) * kx, (cy1 - cy0) * ky, cx0, cy0, cx1 - cx0, cy1 - cy0);
    }
    c.fillStyle = COLORS.outside;
    if (cy0 > 0) c.fillRect(0, 0, W, cy0);
    if (cy1 < H) c.fillRect(0, cy1, W, H - cy1);
    if (cx0 > 0) c.fillRect(0, cy0, cx0, cy1 - cy0);
    if (cx1 < W) c.fillRect(cx1, cy0, W - cx1, cy1 - cy0);
  }

  // 경기장 전체를 그림 한 장으로 (경기 시작·화면 크기가 바뀔 때만 — 3·2·1 카운트다운 동안)
  // 해상도는 1m = 최대 60픽셀 (iPad 캔버스 한도·메모리 안), 그 뒤로는 잘라 붙이기만 하므로
  // 멀리 순간이동·재등장해도 멈칫하지 않음
  function getMapImage() {
    const ppm = Math.min(view.scale * dpr, MAP_PPM_MAX);
    // 화질 자동 조절로 조금 바뀐 정도면 다시 그리지 않고 늘리거나 줄여서 씀 (다시 그리면 0.5초 멈칫)
    if (mapImg && ppm / mapPPM > 0.74 && ppm / mapPPM < 1.35) return mapImg;
    mapPPM = ppm;
    mapImg = document.createElement('canvas');
    mapImg.width = Math.ceil(GameMap.width * ppm);
    mapImg.height = Math.ceil(GameMap.height * ppm);
    const c = mapImg.getContext('2d');
    c.setTransform(ppm, 0, 0, ppm, 0, 0);
    drawStaticWorld(c, { x0: -1, y0: -1, x1: GameMap.width + 1, y1: GameMap.height + 1 }, ppm);
    return mapImg;
  }

  // 경기장의 움직이지 않는 부분 (b: 이 범위(m)에 걸치는 것만)
  // 새 STEP 3: 바닥 판·조명·에너지 선·존 발판·벽·상자·발전장치·방벽·기둥·터미널은 arena.js
  function drawStaticWorld(c, b, ppm) {
    ArenaArt.drawStatic(c, b, ppm, dpr);
  }

  // ---------------- 새 STEP 2: 부쉬(수풀) ----------------
  // 부쉬마다 그림을 한 장 만들어 두고(잎·관목·에너지 식물), 매 프레임 붙이기만 함
  // 새 STEP 3: 누가 부쉬에 들어가면 그 부쉬 전체가 잠깐 살짝 흔들림
  //   (부쉬 전체가 흔들리므로 "누가 들어갔다"만 알 수 있고 정확한 자리는 알 수 없음)
  const bushRustle = new Map(); // 부쉬 id → 흔들리기 시작한 시각
  const lastBushOf = new Map(); // 캐릭터 id → 지난 프레임에 있던 부쉬
  const RUSTLE_SEC = 0.45;
  function noteBushEntries(players, time) {
    (players || []).forEach((p) => {
      const now = p.alive ? p.bushZoneId || null : null;
      const before = lastBushOf.get(p.id) || null;
      if (now && now !== before) bushRustle.set(now, time);
      lastBushOf.set(p.id, now);
    });
  }

  function drawBushes(c, world, vr, time) {
    const ppm = view.scale * dpr;
    if (Math.abs(ppm - bushPPM) > 1e-6) { bushSprites.clear(); bushPPM = ppm; }
    const me = world && world.localPlayer;
    const M = 0.6;
    noteBushEntries(world && world.players, time);
    GameMap.bushes.forEach((b) => {
      if (vr && !onScreen(vr, b.x + b.w / 2, b.y + b.h / 2, Math.max(b.w, b.h))) return;
      let img = bushSprites.get(b.id);
      if (!img) { img = makeBushSprite(b, ppm, M); bushSprites.set(b.id, img); }
      c.save();
      // 내가 들어간 부쉬는 흐리게 → 안에 있는 우리 팀·상대가 잘 보임
      c.globalAlpha = me && me.bushZoneId === b.id ? 0.5 : 1;
      const t0 = bushRustle.get(b.id);
      let ox = 0, sy = 1;
      if (t0 !== undefined && time - t0 < RUSTLE_SEC) {
        const k = (time - t0) / RUSTLE_SEC;
        ox = Math.sin(k * Math.PI * 7) * 0.06 * (1 - k);
        sy = 1 + Math.sin(k * Math.PI * 5) * 0.015 * (1 - k);
      }
      const h = (b.h + M * 2) * sy;
      c.drawImage(img, b.x - M + ox, b.y + b.h + M - h, b.w + M * 2, h);
      c.restore();
    });
  }

  function makeBushSprite(b, ppm, M) {
    const cv = document.createElement('canvas');
    cv.width = Math.ceil((b.w + M * 2) * ppm);
    cv.height = Math.ceil((b.h + M * 2) * ppm);
    const c = cv.getContext('2d');
    c.setTransform(ppm, 0, 0, ppm, M * ppm, M * ppm); // (0,0) = 부쉬 왼쪽 위
    const seed = hashId(b.id);
    let k = 0;
    const R = () => rand(seed, k++);
    // 바닥 그림자 + 밑동
    c.fillStyle = 'rgba(0, 0, 0, 0.3)';
    roundRect(c, -0.2, 0.15, b.w + 0.4, b.h + 0.2, Math.min(1.2, b.h / 2)); c.fill();
    c.fillStyle = '#123f2c';
    roundRect(c, 0, 0, b.w, b.h, Math.min(1, b.h / 2)); c.fill();
    // 가장자리: 둥근 잎 뭉치가 테두리 밖으로 조금씩 삐져나옴 (사각형처럼 안 보이게)
    const per = 2 * (b.w + b.h), nEdge = Math.round(per * 1.6);
    for (let i = 0; i < nEdge; i++) {
      let d = (i / nEdge) * per, x, y;
      if (d < b.w) { x = d; y = 0; } else if ((d -= b.w) < b.h) { x = b.w; y = d; }
      else if ((d -= b.h) < b.w) { x = b.w - d; y = b.h; } else { x = 0; y = b.h - (d - b.w); }
      c.fillStyle = R() < 0.5 ? '#1a5c3d' : '#1f6b47';
      c.beginPath(); c.arc(x + (R() - 0.5) * 0.3, y + (R() - 0.5) * 0.3, 0.38 + R() * 0.22, 0, Math.PI * 2); c.fill();
    }
    // 안쪽 관목·풀: 여러 색 잎 뭉치를 겹쳐 그림
    const cols = ['#1f6b47', '#257c52', '#2d8f5c', '#36a468', '#2a8457'];
    const n = Math.round(b.w * b.h * 3.4);
    for (let i = 0; i < n; i++) {
      const x = 0.25 + R() * (b.w - 0.5), y = 0.25 + R() * (b.h - 0.5), r = 0.3 + R() * 0.36;
      c.fillStyle = cols[Math.floor(R() * cols.length)];
      c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
      // 잎 윗부분 밝은 빛
      c.fillStyle = 'rgba(140, 255, 190, 0.16)';
      c.beginPath(); c.arc(x - r * 0.25, y - r * 0.3, r * 0.45, 0, Math.PI * 2); c.fill();
    }
    // 뾰족한 풀잎
    c.strokeStyle = '#4fc47f';
    c.lineWidth = 0.06;
    c.lineCap = 'round';
    const blades = Math.round(b.w * b.h * 1.3);
    for (let i = 0; i < blades; i++) {
      const x = 0.3 + R() * (b.w - 0.6), y = 0.4 + R() * (b.h - 0.6), h = 0.35 + R() * 0.35, lean = (R() - 0.5) * 0.4;
      c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + lean * 0.5, y - h * 0.6, x + lean, y - h); c.stroke();
    }
    // 미래형 에너지 식물: 빛나는 작은 봉오리 몇 개
    const glow = Math.max(2, Math.round(b.w * b.h / 5));
    for (let i = 0; i < glow; i++) {
      const x = 0.5 + R() * (b.w - 1), y = 0.5 + R() * (b.h - 1);
      c.strokeStyle = 'rgba(79, 240, 192, 0.7)';
      c.lineWidth = 0.05;
      c.beginPath(); c.moveTo(x, y + 0.35); c.lineTo(x, y); c.stroke();
      // 빛 번짐: 흐림 효과 대신 둥근 그라디언트 (훨씬 가벼움)
      const g = c.createRadialGradient(x, y, 0, x, y, 0.35);
      g.addColorStop(0, 'rgba(79, 240, 192, 0.55)');
      g.addColorStop(1, 'rgba(79, 240, 192, 0)');
      c.fillStyle = g;
      c.beginPath(); c.arc(x, y, 0.35, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#9dffe2';
      c.beginPath(); c.arc(x, y, 0.11, 0, Math.PI * 2); c.fill();
    }
    return cv;
  }

  // ---------------- 새 STEP 2: 미니맵 ----------------
  // 경기장 모양(벽·부쉬·터미널)은 미리 그려 두고, 존 주인과 캐릭터 점만 0.12초마다 새로 그림
  let mini = null, miniCtx = null, miniBg = null, miniAt = 0, miniScale = 1, miniRatio = 1;
  function sizeMinimap() {
    mini = mini || document.getElementById('minimap');
    if (!mini) return;
    const show = cam.mode === 'follow';
    mini.hidden = !show;
    if (!show) return;
    miniRatio = Math.min(window.devicePixelRatio || 1, 2);
    const w = mini.clientWidth || 172, h = mini.clientHeight || 109;
    mini.width = Math.round(w * miniRatio);
    mini.height = Math.round(h * miniRatio);
    miniCtx = mini.getContext('2d');
    miniScale = Math.min(mini.width / GameMap.width, mini.height / GameMap.height);
    // 배경 한 장
    miniBg = document.createElement('canvas');
    miniBg.width = mini.width; miniBg.height = mini.height;
    const c = miniBg.getContext('2d');
    c.setTransform(miniScale, 0, 0, miniScale, 0, 0);
    c.fillStyle = 'rgba(28, 34, 80, 0.9)';
    c.fillRect(0, 0, GameMap.width, GameMap.height);
    Object.keys(GameMap.spawns).forEach((t) => {
      const s = GameMap.spawns[t];
      c.fillStyle = hexAlpha(CONFIG.TEAMS[t].color, 0.35);
      c.fillRect(s.x, s.y, s.w, s.h);
    });
    c.fillStyle = 'rgba(60, 170, 100, 0.75)';
    GameMap.bushes.forEach((b) => c.fillRect(b.x, b.y, b.w, b.h));
    c.fillStyle = 'rgba(170, 160, 255, 0.85)';
    GameMap.walls.concat(GameMap.pillars, GameMap.crates).forEach((r) => c.fillRect(r.x, r.y, r.w, r.h));
    c.fillStyle = '#4ff0c0';
    GameMap.terminals.forEach((t) => c.fillRect(t.x - 0.9, t.y - 0.9, 1.8, 1.8));
    miniAt = 0;
  }

  function drawMinimap(world, hidden, time) {
    if (cam.mode !== 'follow' || !miniCtx) return;
    if (time - miniAt < 0.2) return; // 1초에 5번이면 충분 (태블릿 부담 줄이기)
    miniAt = time;
    const c = miniCtx, s = miniScale;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, mini.width, mini.height);
    c.drawImage(miniBg, 0, 0);
    c.setTransform(s, 0, 0, s, 0, 0);
    // 존: 주인 팀 색으로 칠함, 게이지를 채우는 중이면 테두리 색
    (world.zones || []).forEach((z) => {
      c.fillStyle = z.owner ? hexAlpha(CONFIG.TEAMS[z.owner].color, 0.55) : 'rgba(235, 240, 255, 0.18)';
      c.beginPath(); c.arc(z.x, z.y, z.r, 0, Math.PI * 2); c.fill();
      c.strokeStyle = z.progressTeam && !z.owner ? CONFIG.TEAMS[z.progressTeam].color : 'rgba(235, 240, 255, 0.85)';
      c.lineWidth = 0.5;
      c.stroke();
      c.save();
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.font = Math.round(9 * miniRatio) + 'px ' + FONT;
      c.fillStyle = '#ffffff';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(z.id, z.x * s, z.y * s);
      c.restore();
    });
    // 캐릭터: 우리 팀 점, 상대는 보일 때만, 나는 흰 테두리로 크게
    const me = world.localPlayer;
    (world.players || []).forEach((p) => {
      if (!p.alive || hidden.has(p.id)) return;
      const isMe = me && p.id === me.id;
      c.fillStyle = CONFIG.TEAMS[p.team].color;
      c.beginPath(); c.arc(p.x, p.y, isMe ? 1.5 : 1.1, 0, Math.PI * 2); c.fill();
      if (isMe) { c.strokeStyle = '#ffffff'; c.lineWidth = 0.6; c.stroke(); }
      else if (me && p.team !== me.team) { c.strokeStyle = '#1a0a14'; c.lineWidth = 0.4; c.stroke(); }
    });
    // 지금 내 화면에 보이는 범위
    const vr = visibleRect(0);
    c.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    c.lineWidth = 0.35;
    c.strokeRect(Math.max(0, vr.x0), Math.max(0, vr.y0),
      Math.min(GameMap.width, vr.x1) - Math.max(0, vr.x0), Math.min(GameMap.height, vr.y1) - Math.max(0, vr.y0));
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
    // 새 STEP 4: 점령한 존에 상대가 있으면 "점수 멈춤"
    const paused = Zones.scorePaused(z);
    const label = z.contested ? (paused ? '대치 · 점수 멈춤' : '대치 중') : paused ? '점수 멈춤' : '';
    const w = teams.length * 1.3 + (label ? label.length * 0.42 + 0.3 : 0);
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
    if (label) text(c, label, x + (label.length * 0.42 + 0.3) / 2, y + 0.02, 0.42, paused ? '#ffd84d' : '#ffffff');
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
      // 안쪽 원 테두리 + "39.3㎡ 채움" (전체 넓이는 점령 문제의 답이라 쓰지 않음)
      c.strokeStyle = team.color;
      c.lineWidth = 0.07;
      c.stroke();
      const label = (Math.floor(z.progress * 10) / 10) + '㎡ 채움';
      c.fillStyle = 'rgba(10, 12, 35, 0.75)';
      roundRect(c, z.x - 1.75, z.y + z.r * 0.22 - 0.3, 3.5, 0.6, 0.3);
      c.fill();
      text(c, label, z.x, z.y + z.r * 0.22, 0.42, team.color);
    }
  }

  // 수정 STEP 2: 점령 활성화한 팀 표시 — 존 위쪽에 "✓ SOLAR 활성화" (두 팀 모두면 두 줄)
  function drawZoneActivation(c, z, time) {
    if (!z.active || z.disabled) return;
    const teams = ['SOLAR', 'LUNAR'].filter((t) => z.active[t]);
    teams.forEach((t, i) => {
      const color = CONFIG.TEAMS[t].color;
      const y = z.y - z.r - 0.55 - i * 0.75;
      c.fillStyle = 'rgba(10, 12, 35, 0.85)';
      roundRect(c, z.x - 1.9, y - 0.32, 3.8, 0.64, 0.32);
      c.fill();
      c.strokeStyle = hexAlpha(color, 0.6 + 0.4 * Math.sin(time * 4));
      c.lineWidth = 0.06;
      c.stroke();
      text(c, '✓ ' + CONFIG.TEAMS[t].name + ' 활성화', z.x, y + 0.02, 0.4, color);
    });
  }

  // 점령한 존: 다음 점수까지 남은 시간을 테두리 바깥 고리로 표시
  function drawScoreRing(c, z, interval) {
    if (!z.owner) return;
    const k = Math.min(1, z.scoreTimer / interval);
    // 새 STEP 4: 상대가 존 안에 있으면 점수가 멈춤 → 고리가 흐려짐
    c.strokeStyle = Zones.scorePaused(z) ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.85)';
    c.lineWidth = 0.14;
    c.lineCap = 'round';
    c.beginPath();
    c.arc(z.x, z.y, z.r + 0.32, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2);
    c.stroke();
    c.lineCap = 'butt';
  }

  function drawZonesLive(c, time, zoneStates, interval, players) {
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
      if (zoneStates) {
        // 새 STEP 3: 에너지 기지 — 점령 빛·물결, 발광 장치, 점령 준비 둘레 게이지, 점령 중 도는 고리 (arena.js)
        ArenaArt.zoneBase(c, z, time, players, i);
        drawZoneOccupancy(c, z, time);
        drawZoneGauge(c, z);
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

  function drawTerminalsLive(c, time, near, vr, me) {
    GameMap.terminals.forEach((t, i) => {
      if (vr && !onScreen(vr, t.x, t.y, 3)) return;
      // 새 STEP 2: 상대 팀 뒤쪽 터미널은 쓸 수 없으므로 표시하지 않음 (공용 터미널은 두 팀 모두)
      if (me && t.side && t.side !== me.team) return;
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
  // 캐릭터 리디자인: 얼굴이 보이는 2등신 아레나 캐릭터 (character.js) — 발밑 팀 고리, 몸·얼굴·무기·장비, 움직임
  // 상태 표시(보호막·점령 문제·미션·둔화)는 보이는 몸의 가운데(cy)와 발밑 고리에 맞춰 그림
  function drawPlayer(c, p, time) {
    const team = CONFIG.TEAMS[p.team];
    const r = p.radius;
    const CM = CharacterRenderer.metrics;
    const cy = p.y + CM.CENTER_Y; // 보이는 몸의 가운데
    const fy = p.y + CM.FOOT_Y;   // 발밑 고리

    // 발밑 팀 고리 + 캐릭터 (맞으면 몸 모양 그대로 번쩍, 느려지면 몸이 얼음색)
    CharacterRenderer.draw(c, p, time, team);

    // 둔화: 발밑 고리가 얼어붙고(얼음 점선), 눈송이 3개가 몸 둘레를 돌며, 발밑에 "느려짐" (수정 STEP 5)
    if (p.slowFactor < 1) {
      c.strokeStyle = 'rgba(158, 232, 255, 0.95)';
      c.lineWidth = 0.1;
      c.setLineDash([0.15, 0.12]);
      c.beginPath(); c.ellipse(p.x, fy, CM.RING_RX + 0.12, CM.RING_RY + 0.08, 0, 0, Math.PI * 2); c.stroke();
      c.setLineDash([]);
      c.strokeStyle = '#e6f8ff';
      c.lineWidth = 0.05;
      for (let i = 0; i < 3; i++) {
        const ang = time * 1.6 + i * Math.PI * 2 / 3;
        drawFlake(c, p.x + Math.cos(ang) * 0.95, cy + Math.sin(ang) * 0.6, 0.14);
      }
      text(c, '느려짐', p.x, p.y + r + 0.5, 0.36, '#9ee8ff');
    }

    // 재등장 보호막: 반짝이는 고리
    if (p.protect > 0) {
      const blink = 0.45 + 0.35 * Math.sin(time * 14);
      c.strokeStyle = 'rgba(158, 232, 255,' + blink + ')';
      c.lineWidth = 0.1;
      c.beginPath(); c.arc(p.x, cy, 1.02, 0, Math.PI * 2); c.stroke();
    }

    // STEP 13: 미션 보너스 — 개인 보호막(하늘색 거품, 남은 양만큼 두껍게)
    if (p.shieldTimer > 0 && p.shieldHp > 0) {
      const k = p.shieldHp / CONFIG.MISSION.SHIELD_HP;
      c.fillStyle = 'rgba(158, 232, 255, 0.14)';
      c.beginPath(); c.arc(p.x, cy, 1.14, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(158, 232, 255, 0.95)';
      c.lineWidth = 0.05 + 0.1 * k;
      c.stroke();
    }
    // STEP 13: 미션 보너스 — 가속(움직이는 반대쪽으로 초록 줄무늬)
    // 새 STEP 4: 터미널 정답 뒤 빨리 달리기도 같은 줄무늬 (스피더는 자기 잔상이 있음)
    if (p.boostTimer > 0 || (p.dashTimer > 0 && p.charId !== 'speeder')) {
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
        c.moveTo(p.x + bx * (r + 0.1) + ox, cy + by * (r + 0.1) + oy);
        c.lineTo(p.x + bx * (r + 0.1 + len) + ox, cy + by * (r + 0.1 + len) + oy);
        c.stroke();
      }
      c.lineCap = 'butt';
    }

    // 수정 STEP 2: 점령 문제 중 — 금색 보호 거품(무적) + "점령 문제 · 무적"
    if (p.inCapQ) {
      const pulse = 0.5 + 0.5 * Math.sin(time * 5);
      c.fillStyle = 'rgba(255, 216, 77,' + (0.12 + pulse * 0.08) + ')';
      c.beginPath(); c.arc(p.x, cy, 1.2, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(255, 216, 77, 0.95)';
      c.lineWidth = 0.1;
      c.setLineDash([0.3, 0.15]);
      c.lineDashOffset = -time * 0.8;
      c.stroke();
      c.setLineDash([]);
      text(c, '점령 문제 · 무적', p.x, p.y - 2.45, 0.4, '#ffd84d');
    }
    // 수정 STEP 2: 내 캐릭터의 점령 준비 — 발밑 고리가 3초 동안 차오르고, 다 차면 "점령 도전 가능!"
    if (p.isLocal && !p.inCapQ && p.capPrepZone && p.capPrepZone === p.zoneId && p.capPrep > 0) {
      const k = Math.min(1, p.capPrep / CONFIG.CAPTURE.PREP_SEC);
      const ready = p.capReady === p.zoneId;
      c.strokeStyle = ready ? 'rgba(255, 216, 77,' + (0.6 + 0.4 * Math.sin(time * 8)) + ')' : '#ffd84d';
      c.lineWidth = 0.14;
      c.lineCap = 'round';
      c.beginPath();
      c.ellipse(p.x, fy, CM.RING_RX + 0.3, CM.RING_RY + 0.2, 0, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2);
      c.stroke();
      c.lineCap = 'butt';
      if (ready) text(c, '점령 도전 가능!', p.x, p.y - 2.45, 0.45, '#ffd84d');
    }

    // 수학 미션 중: 민트색 고리 + "문제 푸는 중"
    if (p.inMission) {
      c.strokeStyle = 'rgba(79, 240, 192, 0.9)';
      c.lineWidth = 0.1;
      c.beginPath(); c.ellipse(p.x, fy, CM.RING_RX + 0.22, CM.RING_RY + 0.14, 0, 0, Math.PI * 2); c.stroke();
      text(c, '문제 푸는 중', p.x, p.y - 2.45, 0.4, '#4ff0c0');
    }

    drawHpBar(c, p, team);

    // 닉네임
    text(c, p.nick, p.x, p.y - 2.0, 0.5, p.isLocal ? '#ffffff' : team.color);
  }

  // ---------------- 체력바 ----------------
  function drawHpBar(c, p, team) {
    const w = 1.6, h = 0.22;
    const x = p.x - w / 2, y = p.y - 1.62; // 캐릭터 리디자인: 머리 위
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
    // 캐릭터 리디자인: 느려진 캐릭터는 체력바 왼쪽에 작은 얼음 표시
    if (p.slowFactor < 1) {
      const bx = x - 0.26, by = y + h / 2;
      c.fillStyle = '#1d4a91';
      c.beginPath(); c.arc(bx, by, 0.19, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#9ee8ff';
      c.lineWidth = 0.05;
      c.stroke();
      c.strokeStyle = '#ffffff';
      drawFlake(c, bx, by, 0.12);
    }
  }

  function drawPlayers(c, players, time, world) {
    // 아래쪽에 있는 캐릭터를 나중에 그려 자연스럽게 겹치게 합니다.
    // 재충전 중인 캐릭터는 보이지 않습니다.
    const sorted = players.filter((p) => p.alive).sort((a, b) => a.y - b.y);
    sorted.forEach((p) => {
      // 새 STEP 2: 부쉬 안(우리 팀·드러난 상대)은 반투명하게 → "숨어 있다"는 것이 보임
      if (!p.inBush) { drawPlayer(c, p, time); return; }
      const revealed = (p.revealedUntil || 0) > (world ? world.time : 0);
      c.save();
      c.globalAlpha = revealed ? 0.9 : 0.62;
      drawPlayer(c, p, time);
      c.restore();
      // 내 캐릭터: 숨었는지 / 공격·피격으로 드러났는지 발밑에 알려 줌
      if (p.isLocal) {
        text(c, revealed ? '드러남!' : '🌿 숨음', p.x, p.y + p.radius + (p.slowFactor < 1 ? 0.95 : 0.5), 0.4,
          revealed ? '#ffd84d' : '#8dffb0');
      }
    });
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
  // 수정 STEP 5: 눈 결정 모양 (선 3개가 가운데에서 60°씩)
  function drawFlake(c, x, y, s) {
    c.beginPath();
    for (let i = 0; i < 3; i++) {
      const ang = i * Math.PI / 3;
      c.moveTo(x - Math.cos(ang) * s, y - Math.sin(ang) * s);
      c.lineTo(x + Math.cos(ang) * s, y + Math.sin(ang) * s);
    }
    c.stroke();
  }
  // 원마다 같은 자리에 결정을 그리기 위한 간단한 난수 (0~1)
  function hashId(id) {
    let h = 7;
    String(id).split('').forEach((ch) => { h = (h * 31 + ch.charCodeAt(0)) % 100003; });
    return h;
  }
  function rand(seed, i) {
    const x = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
    return x - Math.floor(x);
  }

  function drawArea(c, a, time) {
    // 새 STEP 3: 스킬마다 다른 그림 (skillfx.js) — LEVEL 2는 더 크게, LEVEL 3 MAX 는 금색으로 화려하게
    SkillFx.drawArea(c, a, time);
    drawAreaLabel(c, a);
  }

  function drawAreaLabel(c, a) {
    // STEP 10: 놓은 직후 1.5초 동안 "반지름 3m" 라벨 (수정 STEP 3: 초등 표현, 넓이는 문제의 답이라 빼기)
    if (a.age < 1.5 && a.kind !== 'blast') {
      c.save();
      c.globalAlpha = a.age < 1.1 ? 1 : 1 - (a.age - 1.1) / 0.4;
      text(c, 'LV' + (a.level || 1) + ' · 반지름 ' + a.r + 'm', a.x, a.y + a.r + 0.55, 0.45, a.level >= 3 ? '#ffd84d' : '#ffffff');
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
      text(c, 'LV' + pv.level + ' · 반지름 ' + pv.r + 'm 안 · ' + pv.cost + '⚡', pv.fromX, pv.fromY + pv.r + 0.55, 0.45,
        good ? '#ffd84d' : '#ff9db0');
      return;
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

    text(c, '반지름 ' + pv.r + 'm', pv.x + pv.r / 2, pv.y - 0.38, 0.4, '#ffffff');
    // 비용 라벨 (수정 STEP 3: 넓이는 점령 문제의 답이 되므로 보여주지 않음)
    const label = 'LV' + pv.level + ' · ' + pv.cost + '⚡' + (good ? '' : ' 부족'); // 수정 STEP 4
    c.fillStyle = 'rgba(10, 12, 35, 0.8)';
    roundRect(c, pv.x - 1.9, pv.y + pv.r + 0.15, 3.8, 0.7, 0.35);
    c.fill();
    text(c, label, pv.x, pv.y + pv.r + 0.5, 0.45, good ? '#ffd84d' : '#ff9db0');
  }

  // ---------------- 짧은 효과 ----------------
  function drawEffect(c, e) {
    if (SkillFx.drawEffect(c, e)) return; // 새 STEP 3: 스킬·존 효과
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
      c.fillStyle = e.gold ? 'rgba(255, 216, 77, 0.35)' : 'rgba(255, 220, 230, 0.45)';
      c.beginPath(); c.arc(e.x, e.y, e.r, 0, Math.PI * 2); c.fill();
      c.strokeStyle = e.gold ? '#ffd84d' : '#ff6b8a';
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
    const dt = lastT ? Math.min(0.1, Math.max(0, time - lastT)) : 0;
    lastT = time;
    // 새 STEP 2: 내 캐릭터가 있으면 추적 카메라, 관전(TV)·경기 전이면 전체
    const me = world && world.viewMode === 'play' ? world.localPlayer : null;
    setCameraMode(me ? 'follow' : 'overview');
    if (cam.mode === 'follow') updateCamera(dt, me);
    drawStaticMap(); // 경기장 전체(TV)는 카메라가 움직였을 때만 뒤쪽 캔버스에 다시 붙임

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height); // 맵은 뒤쪽 캔버스(map-canvas)에 있음
    useMeters(ctx);
    const vr = visibleRect(3);
    // 이 화면에서 숨길 캐릭터 (상대 팀 부쉬 안) — 캐릭터·이름·효과 모두
    const hidden = new Set();
    if (world && world.players) {
      world.players.forEach((p) => { if (Bushes.hiddenOnScreen(p, world)) hidden.add(p.id); });
    }
    drawZonesLive(ctx, time, world && world.zones, world && world.scoreInterval, world && world.players);
    ArenaArt.drawLive(ctx, time, vr, onScreen); // 새 STEP 3: 에너지가 흐르는 점·발전장치·방벽 반짝임
    drawTerminalsLive(ctx, time, world && world.nearTerminal, vr, world && world.localPlayer);
    if (world && world.areas) world.areas.forEach((a) => { if (onScreen(vr, a.x, a.y, a.r + 1)) drawArea(ctx, a, time); });
    if (world && world.specialPreview) drawSpecialPreview(ctx, world.specialPreview, time);
    drawBushes(ctx, world, vr, time);
    if (world && world.localPlayer && world.aim) drawAimGuide(ctx, world.localPlayer, world.aim);
    if (world) CharacterRenderer.track(world, time); // 걸음·쏨·스킬·맞음 → 캐릭터 움직임 (통신 그대로)
    if (world && world.players) drawPlayers(ctx, world.players.filter((p) => !hidden.has(p.id) && onScreen(vr, p.x, p.y, 2)), time, world);
    if (world && world.projectiles) world.projectiles.forEach((b) => { if (onScreen(vr, b.x, b.y, 1)) drawProjectile(ctx, b); });
    if (world && world.zones) world.zones.forEach((z) => { drawZoneBadge(ctx, z); drawZoneActivation(ctx, z, time); });
    if (world && world.effects) {
      world.effects.forEach((e) => {
        if (e.pid && hidden.has(e.pid)) return; // 숨은 캐릭터 머리 위 효과(회복 숫자 등)로 위치가 드러나지 않게
        if (onScreen(vr, e.x, e.y, (e.r || e.radius || 1) + 1)) drawEffect(ctx, e);
      });
    }
    if (debug) drawDebug(ctx, world);
    if (world) drawMinimap(world, hidden, time);
    lastHidden = hidden;
  }
  let lastHidden = new Set(); // 마지막 화면에서 숨긴 캐릭터 (시험용)

  // ---------------- STEP 14: 대기방 캐릭터 그림 ----------------
  // 게임 속과 같은 모양으로 작은 캔버스에 캐릭터를 그립니다.
  function drawCharacterIcon(canvasEl, charId, teamId, level) {
    const size = canvasEl.clientWidth || 56;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvasEl.width = size * ratio;
    canvasEl.height = size * ratio;
    const c = canvasEl.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, canvasEl.width, canvasEl.height);
    const team = CONFIG.TEAMS[teamId || 'SOLAR'];
    // 캐릭터 리디자인: 게임 속과 같은 2등신 캐릭터 (오른쪽 위를 바라봄)
    //   작은 그림(44px 아래: HUD·팀 목록)은 얼굴이 잘 보이게 머리와 몸 위쪽만 크게
    const portrait = size < 44;
    const span = portrait ? 1.7 : 2.45;           // 캔버스 한 변 = 몇 m
    const cx = portrait ? 0.08 : 0.04, cy = portrait ? -0.45 : -0.27; // 가운데에 올 자리
    const s = size * ratio / span;
    c.setTransform(s, 0, 0, s, size * ratio / 2 - cx * s, size * ratio / 2 - cy * s);
    CharacterRenderer.drawIcon(c, charId, team, portrait ? 'portrait' : 'full', level || 1);
  }

  // 새 STEP 3: 특수기 버튼 아이콘 — 캐릭터 문양 (LEVEL 3 MAX 는 금색 고리)
  function drawSkillIcon(canvasEl, charId, level) {
    const size = canvasEl.clientWidth || 44;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvasEl.width = size * ratio;
    canvasEl.height = size * ratio;
    const c = canvasEl.getContext('2d');
    const s = size * ratio / 2.2;
    c.setTransform(s, 0, 0, s, size * ratio / 2, size * ratio / 2);
    c.clearRect(-2, -2, 4, 4);
    const ch = CHARACTERS[charId];
    const g = c.createRadialGradient(0, 0, 0.1, 0, 0, 1);
    g.addColorStop(0, hexAlpha(ch.accent, level >= 1 ? 0.45 : 0.15));
    g.addColorStop(1, hexAlpha(ch.accent, 0));
    c.fillStyle = g;
    c.beginPath(); c.arc(0, 0, 1, 0, Math.PI * 2); c.fill();
    if (level >= SKILL_LEVEL_MAX) {
      c.strokeStyle = '#ffd84d';
      c.lineWidth = 0.1;
      c.beginPath(); c.arc(0, 0, 0.92, 0, Math.PI * 2); c.stroke();
    }
    SkillFx.emblem(c, ch.emblem, 0.55, level >= 1 ? ch.accent : 'rgba(243, 245, 255, 0.55)');
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

  // 글꼴을 늦게 불러왔을 때 등: 조각·부쉬 그림을 모두 다시
  function redrawStatic() {
    mapImg = null;
    bushSprites.clear();
    staticKey = '';
    drawStaticMap();
  }

  return { init, resize, render, redrawStatic, screenToWorld, worldToScreen, view, cam, setDebug, drawCharacterIcon, drawSkillIcon,
    setQuality, noteFrame, getQuality: () => quality, scale: () => dpr, visibleRect, hiddenIds: () => Array.from(lastHidden) };
})();
