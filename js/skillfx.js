/* ============================================================
   서클 배틀 - 캐릭터·스킬 그림 (skillfx.js)  — 새 STEP 3
   ------------------------------------------------------------
   "색만 다른 캐릭터"가 되지 않도록 캐릭터마다 몸 모양과 스킬 효과를 다르게 그립니다.
   (충돌 판정 원의 크기는 모두 같음 — 모양만 다름)

   캐릭터 몸 그림은 character.js 로 옮김 (캐릭터 리디자인 — 얼굴이 보이는 2등신 아레나 캐릭터)

   스킬 효과 (LEVEL 1 → 2 → 3 MAX 로 갈수록 더 크고 화려하게, MAX 는 금색)
     블래스터  폭발 예고(위험 표시·모여드는 불꽃) → 충격파 고리·섬광·파편, 밀려난 상대에 밀림 화살표
     가디언    반투명 벌집 무늬 보호막, 맞으면 물결, 막는 양이 줄면 금이 가고 깜빡이다 깨짐
     메딕      초록 회복 고리·올라가는 빛 알갱이·1초마다 퍼지는 파동
     스피더    출발점 → 도착점 빛 줄기와 흐린 잔상
     엔지니어  기계 터렛(포신 1·2·3개), 에너지 선, 체력 막대, LEVEL 3 레이더
     프로스트  얼음 바닥(금)·내리는 눈·얼음 결정·가장자리 얼음 가시

   성능: 흐림 효과(shadowBlur) 없이 선·원·그라디언트만 사용. 모양이 같은 무늬는 한 번 만들어 재사용(Path2D).
   ============================================================ */

const SkillFx = (function () {
  const TAU = Math.PI * 2;
  const GOLD = '#ffd84d';
  let H = null; // Renderer 도우미 { text, roundRect, hexAlpha }
  // 가볍게 모드: 화질이 "가볍게"이거나 기기가 느려 화질이 자동으로 가장 낮아졌을 때
  //   알갱이·눈·파편 수를 줄이고 벌집 무늬·서리 안개를 뺌 (모양과 색은 그대로라 무엇인지는 똑같이 보임)
  let lite = false;

  function init(helpers) { H = helpers; }

  // 같은 물체는 매번 같은 모양이 되도록 하는 간단한 난수 (0~1)
  function seedOf(v) {
    let h = 7;
    String(v).split('').forEach((ch) => { h = (h * 31 + ch.charCodeAt(0)) % 100003; });
    return h;
  }
  function rnd(seed, i) {
    const x = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
    return x - Math.floor(x);
  }
  const easeOut = (k) => 1 - (1 - k) * (1 - k);
  const clamp01 = (k) => Math.max(0, Math.min(1, k));

  function poly(c, n, R, rot) {
    c.beginPath();
    for (let i = 0; i < n; i++) {
      const a = rot + i * TAU / n;
      if (i === 0) c.moveTo(Math.cos(a) * R, Math.sin(a) * R);
      else c.lineTo(Math.cos(a) * R, Math.sin(a) * R);
    }
    c.closePath();
  }

  // 캐릭터 몸 그림은 character.js (캐릭터 리디자인: 2등신 아레나 캐릭터)로 옮겼습니다.
  //   여기에는 스킬 원·효과와 특수기 버튼 문양(emblem)만 남아 있습니다.

  // 캐릭터 문양 (가운데)
  function emblem(c, type, s, color) {
    c.save();
    c.strokeStyle = color;
    c.fillStyle = color;
    c.lineWidth = s * 0.28;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.beginPath();
    switch (type) {
      case 'diamond':
        c.moveTo(0, -s); c.lineTo(s * 0.7, 0); c.lineTo(0, s); c.lineTo(-s * 0.7, 0); c.closePath();
        c.fill();
        break;
      case 'shield':
        c.moveTo(-s * 0.8, -s * 0.8); c.lineTo(s * 0.8, -s * 0.8); c.lineTo(s * 0.8, 0);
        c.quadraticCurveTo(s * 0.8, s * 0.7, 0, s); c.quadraticCurveTo(-s * 0.8, s * 0.7, -s * 0.8, 0);
        c.closePath();
        c.fill();
        break;
      case 'plus':
        c.moveTo(0, -s * 0.85); c.lineTo(0, s * 0.85);
        c.moveTo(-s * 0.85, 0); c.lineTo(s * 0.85, 0);
        c.lineWidth = s * 0.5;
        c.stroke();
        break;
      case 'chevron':
        c.moveTo(-s * 0.8, -s * 0.7); c.lineTo(-s * 0.1, 0); c.lineTo(-s * 0.8, s * 0.7);
        c.moveTo(0, -s * 0.7); c.lineTo(s * 0.7, 0); c.lineTo(0, s * 0.7);
        c.stroke();
        break;
      case 'gear':
        for (let i = 0; i < 6; i++) {
          const a = i * Math.PI / 3;
          c.moveTo(Math.cos(a) * s * 0.5, Math.sin(a) * s * 0.5);
          c.lineTo(Math.cos(a) * s * 0.95, Math.sin(a) * s * 0.95);
        }
        c.stroke();
        c.beginPath(); c.arc(0, 0, s * 0.5, 0, TAU); c.stroke();
        break;
      case 'snow':
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

  // 눈 결정 (선 3개)
  function flake(c, x, y, s) {
    c.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = i * Math.PI / 3;
      c.moveTo(x - Math.cos(a) * s, y - Math.sin(a) * s);
      c.lineTo(x + Math.cos(a) * s, y + Math.sin(a) * s);
    }
    c.stroke();
  }

  // 남은 시간: 원 바깥의 흰 호
  function timeArc(c, a, color) {
    const k = 1 - Math.min(1, a.age / a.duration);
    c.strokeStyle = color || 'rgba(255, 255, 255, 0.75)';
    c.lineWidth = 0.1;
    c.lineCap = 'round';
    c.beginPath();
    c.arc(a.x, a.y, a.r + 0.22, -Math.PI / 2, -Math.PI / 2 + k * TAU);
    c.stroke();
    c.lineCap = 'butt';
  }

  // LEVEL 2: 얇은 흰 고리 / LEVEL 3 MAX: 도는 금색 점선 고리
  function levelRing(c, a, time) {
    if ((a.level || 1) < 2) return;
    const max = a.level >= 3;
    c.save();
    c.strokeStyle = max ? 'rgba(255, 216, 77,' + (0.55 + 0.35 * Math.sin(time * 5)) + ')' : 'rgba(255, 255, 255, 0.35)';
    c.lineWidth = max ? 0.16 : 0.07;
    if (!lite) {
      c.setLineDash(max ? [0.5, 0.3] : []);
      c.lineDashOffset = -time * 1.2;
    }
    c.beginPath(); c.arc(a.x, a.y, a.r + 0.45, 0, TAU); c.stroke();
    c.restore();
  }

  // =========================================================
  //  특수기 원 (지속 효과)
  // =========================================================
  function drawArea(c, a, time) {
    const team = CONFIG.TEAMS[a.team];
    const lv = a.level || 1;
    c.save();
    switch (a.kind) {
      case 'blast': areaBlast(c, a, time, lv); break;
      case 'shield': areaShield(c, a, time, lv, team); break;
      case 'heal': areaHeal(c, a, time, lv); break;
      case 'slow': areaSlow(c, a, time, lv); break;
      case 'turret': areaTurret(c, a, time, lv, team); break;
    }
    c.restore();
    if (a.kind !== 'blast') levelRing(c, a, time);
  }

  // ---------------- 성능: 원의 움직이지 않는 부분은 그림 한 장으로 ----------------
  //   그라디언트 바닥·벌집 무늬·얼음 금·결정·눈금처럼 매 프레임 같은 부분은 (종류·레벨·반지름·팀·화면 배율)마다
  //   한 번만 그려 두고 붙이기만 함 → 스킬이 여러 개 겹쳐도 태블릿이 버벅이지 않게
  const layerCache = new Map();
  const LAYER_MAX = 12;           // 그림 몇 장까지 기억할지 (메모리)
  const STATIC = {
    shield: (g, o, lv, team) => shieldStatic(g, o, lv, team),
    heal: (g, o) => healStatic(g, o),
    slow: (g, o, lv) => slowStatic(g, o, lv),
    turret: (g, o, lv, team) => turretStatic(g, o, team),
  };
  let useLayers = true;
  function areaLayer(c, a, lv, team) {
    if (!useLayers) { STATIC[a.kind](c, a, lv, team); return; }
    const m = c.getTransform();
    const ppm = Math.hypot(m.a, m.b);
    const key = a.kind + '|' + lv + '|' + a.r + '|' + a.team + '|' + ppm.toFixed(2) + (lite ? '|lite' : '');
    let L = layerCache.get(key);
    if (!L) {
      const R = a.r + (a.kind === 'slow' && lv >= 3 && !lite ? 1.05 : 0.3);
      const px = Math.ceil(R * 2 * ppm);
      if (px > 2048 || px < 4) { STATIC[a.kind](c, a, lv, team); return; } // 너무 크면 그냥 그림
      const cv = document.createElement('canvas');
      cv.width = cv.height = px;
      const g = cv.getContext('2d');
      g.setTransform(ppm, 0, 0, ppm, R * ppm, R * ppm);
      STATIC[a.kind](g, { x: 0, y: 0, r: a.r, id: a.kind + lv, charId: a.charId, level: lv, st: a.st }, lv, team);
      L = { cv, R };
      if (layerCache.size >= LAYER_MAX) layerCache.delete(layerCache.keys().next().value);
      layerCache.set(key, L);
    }
    // 새 STEP 4: 회전이 없으면 화면 픽셀에 딱 맞춰 1:1로 붙임 → 늘이기·흐리게 계산이 없어 느린 기기에서 훨씬 가벼움
    if (m.b === 0 && m.c === 0) {
      const R = L.R * ppm;
      const dx = Math.round(m.a * a.x + m.e - R), dy = Math.round(m.d * a.y + m.f - R);
      c.save();
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.drawImage(L.cv, dx, dy);
      c.restore();
    } else {
      c.drawImage(L.cv, a.x - L.R, a.y - L.R, L.R * 2, L.R * 2);
    }
  }

  // 블래스터 폭발 예고: 위험 표시 눈금이 돌고, 불꽃이 가운데로 모여들며, 안쪽 고리가 줄어듦
  function areaBlast(c, a, time, lv) {
    const k = Math.min(1, a.age / a.duration);
    const col = lv >= 3 ? GOLD : '#ff6b8a';
    const g = c.createRadialGradient(a.x, a.y, 0, a.x, a.y, a.r);
    g.addColorStop(0, 'rgba(255, 120, 150,' + (0.08 + k * 0.3) + ')');
    g.addColorStop(1, 'rgba(255, 70, 110,' + (0.2 + k * 0.25) + ')');
    c.fillStyle = g;
    c.beginPath(); c.arc(a.x, a.y, a.r, 0, TAU); c.fill();
    const blink = 0.6 + 0.4 * Math.sin(time * (10 + k * 30));
    c.strokeStyle = H.hexAlpha(col, blink);
    c.lineWidth = 0.12;
    c.stroke();
    // 위험 눈금
    const n = 10 + lv * 4;
    c.strokeStyle = col;
    c.lineWidth = 0.09;
    c.beginPath();
    for (let i = 0; i < n; i++) {
      const ang = time * 2 + i * TAU / n;
      c.moveTo(a.x + Math.cos(ang) * (a.r + 0.12), a.y + Math.sin(ang) * (a.r + 0.12));
      c.lineTo(a.x + Math.cos(ang) * (a.r + 0.38), a.y + Math.sin(ang) * (a.r + 0.38));
    }
    c.stroke();
    // 모여드는 불꽃
    const sp = 5 + lv * 3, seed = seedOf(a.id);
    c.fillStyle = lv >= 3 ? '#fff2b0' : '#ffd0dc';
    for (let i = 0; i < sp; i++) {
      const ang = rnd(seed, i) * TAU;
      const t = (k * 1.6 + rnd(seed, i + 40)) % 1;
      const d = a.r * (1 - t);
      c.beginPath(); c.arc(a.x + Math.cos(ang) * d, a.y + Math.sin(ang) * d, 0.06 + 0.06 * t, 0, TAU); c.fill();
    }
    // 줄어드는 카운트다운 고리
    c.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    c.lineWidth = 0.08;
    c.beginPath(); c.arc(a.x, a.y, Math.max(0.05, a.r * (1 - k)), 0, TAU); c.stroke();
    // 조준점 (LEVEL 2부터)
    if (lv >= 2) {
      c.strokeStyle = H.hexAlpha(col, 0.8);
      c.lineWidth = 0.06;
      const s = 0.45;
      c.beginPath();
      c.moveTo(a.x - s, a.y); c.lineTo(a.x + s, a.y);
      c.moveTo(a.x, a.y - s); c.lineTo(a.x, a.y + s);
      c.stroke();
    }
  }

  // 벌집 무늬 (반지름마다 한 번 만들어 재사용)
  const hexCache = new Map();
  function honeycomb(R) {
    const key = R.toFixed(2);
    if (hexCache.has(key)) return hexCache.get(key);
    const path = new Path2D();
    const s = 0.5, w = s * Math.sqrt(3);
    for (let row = -Math.ceil(R / (s * 1.5)) - 1; row <= Math.ceil(R / (s * 1.5)) + 1; row++) {
      const cy = row * s * 1.5;
      for (let col = -Math.ceil(R / w) - 1; col <= Math.ceil(R / w) + 1; col++) {
        const cx = col * w + (row & 1 ? w / 2 : 0);
        if (Math.hypot(cx, cy) > R - 0.2) continue;
        for (let i = 0; i < 6; i++) {
          const a0 = Math.PI / 6 + i * TAU / 6, a1 = a0 + TAU / 6;
          path.moveTo(cx + Math.cos(a0) * s * 0.92, cy + Math.sin(a0) * s * 0.92);
          path.lineTo(cx + Math.cos(a1) * s * 0.92, cy + Math.sin(a1) * s * 0.92);
        }
      }
    }
    hexCache.set(key, path);
    return path;
  }

  // 가디언 보호막: 반투명 거품 + 벌집 무늬 + 막는 양에 따라 테두리 두께·금·깜빡임
  function areaShield(c, a, time, lv, team) {
    const q = a.maxHp > 0 ? clamp01(a.hp / a.maxHp) : 1;
    const low = q < 0.4;
    const flick = low ? 0.7 + 0.3 * Math.sin(time * 22) : 1; // 거의 다 쓰면 깜빡임 (그래도 잘 보이게)
    c.globalAlpha = flick;
    areaLayer(c, a, lv, team); // 거품·벌집 무늬·반짝임 (한 장)
    c.globalAlpha = 1;
    // 테두리: 막는 양이 많을수록 두껍고 진함
    c.strokeStyle = H.hexAlpha(team.color, (0.65 + 0.35 * q) * flick);
    c.lineWidth = 0.1 + 0.12 * q;
    c.beginPath(); c.arc(a.x, a.y, a.r, 0, TAU); c.stroke();
    if (lv >= 2) {
      c.strokeStyle = 'rgba(255, 255, 255,' + 0.35 * flick + ')';
      c.lineWidth = 0.05;
      c.beginPath(); c.arc(a.x, a.y, a.r - 0.22, 0, TAU); c.stroke();
    }
    // 금: 막는 양이 줄수록 많아짐
    if (q < 0.7) {
      const seed = seedOf(a.id), n = Math.round((1 - q) * 9);
      c.strokeStyle = 'rgba(255, 255, 255,' + 0.85 * flick + ')';
      c.lineWidth = 0.055;
      c.beginPath();
      for (let i = 0; i < n; i++) {
        let ang = rnd(seed, i) * TAU, d = a.r;
        c.moveTo(a.x + Math.cos(ang) * d, a.y + Math.sin(ang) * d);
        for (let j = 0; j < 3; j++) {
          d -= 0.3 + rnd(seed, i * 5 + j) * 0.35;
          ang += (rnd(seed, i * 7 + j) - 0.5) * 0.35;
          c.lineTo(a.x + Math.cos(ang) * d, a.y + Math.sin(ang) * d);
        }
      }
      c.stroke();
    }
    // LEVEL 3 MAX: 둘레를 도는 작은 방패 4개 (안의 우리 팀 = 밀리지 않고 느려지지 않음)
    if (lv >= 3) {
      c.fillStyle = GOLD;
      for (let i = 0; i < 4; i++) {
        const ang = time * 0.9 + i * TAU / 4;
        const x = a.x + Math.cos(ang) * (a.r - 0.45), y = a.y + Math.sin(ang) * (a.r - 0.45);
        c.save();
        c.translate(x, y);
        c.beginPath();
        c.moveTo(-0.16, -0.16); c.lineTo(0.16, -0.16); c.lineTo(0.16, 0);
        c.quadraticCurveTo(0.16, 0.14, 0, 0.2); c.quadraticCurveTo(-0.16, 0.14, -0.16, 0);
        c.closePath();
        c.fill();
        c.restore();
      }
    }
    // 맞으면 하얗게 번쩍
    if (a.hitFlash > 0) {
      c.fillStyle = 'rgba(255, 255, 255,' + Math.min(0.35, a.hitFlash * 2.3) + ')';
      c.beginPath(); c.arc(a.x, a.y, a.r, 0, TAU); c.fill();
    }
    timeArc(c, a);
  }

  // 보호막의 움직이지 않는 부분: 반투명 거품 + 벌집 무늬 + 반짝이는 윗부분
  function shieldStatic(c, a, lv, team) {
    const g = c.createRadialGradient(a.x - a.r * 0.3, a.y - a.r * 0.35, a.r * 0.1, a.x, a.y, a.r);
    g.addColorStop(0, H.hexAlpha(team.color, 0.04));
    g.addColorStop(0.75, H.hexAlpha(team.color, 0.1));
    g.addColorStop(1, H.hexAlpha(team.color, 0.26));
    c.fillStyle = g;
    c.beginPath(); c.arc(a.x, a.y, a.r, 0, TAU); c.fill();
    if (!lite) {
      c.save();
      c.translate(a.x, a.y);
      c.strokeStyle = H.hexAlpha(lv >= 3 ? GOLD : team.color, 0.17);
      c.lineWidth = 0.035;
      c.stroke(honeycomb(a.r));
      c.restore();
    }
    c.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    c.lineWidth = 0.1;
    c.lineCap = 'round';
    c.beginPath(); c.arc(a.x, a.y, a.r * 0.8, Math.PI * 1.1, Math.PI * 1.45); c.stroke();
    c.lineCap = 'butt';
  }

  function healStatic(c, a) {
    const g = c.createRadialGradient(a.x, a.y, 0, a.x, a.y, a.r);
    g.addColorStop(0, 'rgba(140, 255, 190, 0.26)');
    g.addColorStop(1, 'rgba(109, 255, 168, 0.08)');
    c.fillStyle = g;
    c.beginPath(); c.arc(a.x, a.y, a.r, 0, TAU); c.fill();
  }

  // 메딕 회복존: 초록 빛 + 도는 고리 + 1초마다 퍼지는 파동 + 올라가는 빛 알갱이
  function areaHeal(c, a, time, lv) {
    areaLayer(c, a, lv, CONFIG.TEAMS[a.team]);
    // 1초마다 가운데에서 퍼지는 회복 파동 (회복 판정과 같은 박자)
    const ph = a.age % 1;
    c.strokeStyle = 'rgba(160, 255, 200,' + (0.7 * (1 - ph)) + ')';
    c.lineWidth = 0.12 * (1 - ph) + 0.03;
    c.beginPath(); c.arc(a.x, a.y, Math.max(0.05, a.r * ph), 0, TAU); c.stroke();
    // 도는 점선 테두리 (가벼운 화질: 실선)
    if (!lite) {
      c.setLineDash([0.4, 0.25]);
      c.lineDashOffset = -time;
    }
    c.strokeStyle = 'rgba(109, 255, 168, 0.9)';
    c.lineWidth = 0.1;
    c.beginPath(); c.arc(a.x, a.y, a.r, 0, TAU); c.stroke();
    if (lv >= 2 && !lite) {
      c.lineDashOffset = time * 0.8;
      c.strokeStyle = 'rgba(109, 255, 168, 0.45)';
      c.lineWidth = 0.06;
      c.beginPath(); c.arc(a.x, a.y, a.r * 0.62, 0, TAU); c.stroke();
    }
    c.setLineDash([]);
    // 올라가는 + 알갱이
    const n = (lite ? 2 : 4) + lv * (lite ? 1 : 3), seed = seedOf(a.id);
    c.lineWidth = 0.07;
    for (let i = 0; i < n; i++) {
      const t = (time * 0.55 + rnd(seed, i)) % 1;
      const ang = rnd(seed, i + 20) * TAU, d = Math.sqrt(rnd(seed, i + 40)) * a.r * 0.85;
      const x = a.x + Math.cos(ang) * d, y = a.y + Math.sin(ang) * d - t * 1.1;
      c.strokeStyle = 'rgba(190, 255, 215,' + Math.sin(t * Math.PI) * 0.9 + ')';
      const s = 0.12 + 0.05 * lv;
      c.beginPath();
      c.moveTo(x - s, y); c.lineTo(x + s, y);
      c.moveTo(x, y - s); c.lineTo(x, y + s);
      c.stroke();
    }
    // LEVEL 3 MAX: 가운데에 크게 도는 금빛 십자
    if (lv >= 3) {
      c.save();
      c.translate(a.x, a.y);
      c.rotate(time * 0.6);
      c.strokeStyle = 'rgba(255, 230, 120, 0.75)';
      c.lineWidth = 0.22;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(0, -0.55); c.lineTo(0, 0.55);
      c.moveTo(-0.55, 0); c.lineTo(0.55, 0);
      c.stroke();
      c.restore();
    }
    timeArc(c, a);
  }

  // 얼음 바닥의 금 (원마다 한 번 만들어 재사용)
  function crackPath(a) {
    if (a._crack && a._crackR === a.r) return a._crack;
    const path = new Path2D(), seed = seedOf(a.id);
    const n = 5 + Math.round(a.r);
    for (let i = 0; i < n; i++) {
      let ang = (i + rnd(seed, i) * 0.6) * TAU / n, d = 0.3 + rnd(seed, i + 9) * 0.5;
      path.moveTo(Math.cos(ang) * d, Math.sin(ang) * d);
      while (d < a.r - 0.3) {
        d += 0.45 + rnd(seed, i * 13 + d * 7) * 0.5;
        ang += (rnd(seed, i * 17 + d * 3) - 0.5) * 0.5;
        const dd = Math.min(d, a.r - 0.2);
        path.lineTo(Math.cos(ang) * dd, Math.sin(ang) * dd);
      }
    }
    a._crack = path; a._crackR = a.r;
    return path;
  }

  // 프로스트 냉기 지역의 움직이지 않는 부분: 서리 안개(LEVEL 3) + 서리 바닥 + 얼음 금 + 얼음 결정
  //   + 테두리·얼음 가시·결정 기둥 + "느리게 45%"
  function slowStatic(c, a, lv) {
    if (lv >= 3 && !lite) {
      const m = c.createRadialGradient(a.x, a.y, a.r * 0.9, a.x, a.y, a.r + 1);
      m.addColorStop(0, 'rgba(200, 240, 255, 0.22)');
      m.addColorStop(1, 'rgba(200, 240, 255, 0)');
      c.fillStyle = m;
      c.beginPath(); c.arc(a.x, a.y, a.r + 1, 0, TAU); c.fill();
    }
    const g = c.createRadialGradient(a.x, a.y, 0, a.x, a.y, a.r);
    g.addColorStop(0, 'rgba(225, 247, 255, 0.38)');
    g.addColorStop(0.7, 'rgba(158, 232, 255, 0.24)');
    g.addColorStop(1, 'rgba(158, 232, 255, 0.14)');
    c.fillStyle = g;
    c.beginPath(); c.arc(a.x, a.y, a.r, 0, TAU); c.fill();
    c.save();
    c.translate(a.x, a.y);
    c.strokeStyle = 'rgba(235, 250, 255, 0.35)';
    c.lineWidth = 0.035;
    c.stroke(crackPath(a));
    c.restore();
    const seed = seedOf(a.id);
    const n = Math.round(a.r * 2.2);
    c.strokeStyle = 'rgba(235, 250, 255, 0.75)';
    c.lineWidth = 0.05;
    for (let i = 0; i < n; i++) {
      const ang = rnd(seed, i * 2) * TAU;
      const d = Math.sqrt(rnd(seed, i * 2 + 1)) * (a.r - 0.35);
      flake(c, a.x + Math.cos(ang) * d, a.y + Math.sin(ang) * d, 0.16 + 0.1 * rnd(seed, i + 50));
    }
    c.strokeStyle = 'rgba(158, 232, 255, 0.35)';
    c.lineWidth = 0.4;
    c.beginPath(); c.arc(a.x, a.y, a.r, 0, TAU); c.stroke();
    c.strokeStyle = 'rgba(210, 243, 255, 0.95)';
    c.lineWidth = 0.13;
    c.stroke();
    const spikes = Math.round(a.r * 7);
    c.lineWidth = 0.06;
    c.beginPath();
    for (let i = 0; i < spikes; i++) {
      const ang = i * TAU / spikes;
      const len = 0.18 + 0.14 * rnd(seed, i + 100);
      c.moveTo(a.x + Math.cos(ang) * a.r, a.y + Math.sin(ang) * a.r);
      c.lineTo(a.x + Math.cos(ang) * (a.r - len), a.y + Math.sin(ang) * (a.r - len));
    }
    c.stroke();
    // LEVEL 2 이상: 가장자리에 얼음 결정 기둥 / LEVEL 3: 더 크고 많이
    if (lv >= 2) {
      const cn = lv >= 3 ? 12 : 8, size = lv >= 3 ? 0.45 : 0.3;
      for (let i = 0; i < cn; i++) {
        const ang = i * TAU / cn + 0.2;
        const cx = a.x + Math.cos(ang) * a.r, cy = a.y + Math.sin(ang) * a.r;
        const ox = Math.cos(ang), oy = Math.sin(ang);
        c.fillStyle = 'rgba(225, 248, 255, 0.9)';
        c.beginPath();
        c.moveTo(cx + ox * size, cy + oy * size);
        c.lineTo(cx - oy * size * 0.35, cy + ox * size * 0.35);
        c.lineTo(cx - ox * size * 0.3, cy - oy * size * 0.3);
        c.lineTo(cx + oy * size * 0.35, cy - ox * size * 0.35);
        c.closePath();
        c.fill();
        c.strokeStyle = 'rgba(120, 200, 240, 0.8)';
        c.lineWidth = 0.03;
        c.stroke();
      }
    }
    const st = a.st && a.st.slowFactor ? a.st : CHARACTERS[a.charId] ? Skills.stats(a.charId, lv) : null;
    if (st) H.text(c, '느리게 ' + Math.round((1 - st.slowFactor) * 100) + '%', a.x, a.y + a.r * 0.62, 0.36, 'rgba(235, 250, 255, 0.95)');
  }

  // 프로스트 냉기 지역: 서리 바닥 + 얼음 금 + 내리는 눈 + 얼음 결정 + 가장자리 얼음 가시
  function areaSlow(c, a, time, lv) {
    areaLayer(c, a, lv, CONFIG.TEAMS[a.team]);
    const seed = seedOf(a.id);
    // 반짝이는 결정 몇 개
    c.strokeStyle = 'rgba(255, 255, 255, 0.95)';
    c.lineWidth = 0.05;
    for (let i = 0; i < 3; i++) {
      const tw = Math.max(0, Math.sin(time * 2.5 + i * 2.1));
      if (tw <= 0.05) continue;
      const ang = rnd(seed, i + 200) * TAU, d = Math.sqrt(rnd(seed, i + 210)) * (a.r - 0.5);
      c.globalAlpha = tw;
      flake(c, a.x + Math.cos(ang) * d, a.y + Math.sin(ang) * d, 0.22);
    }
    c.globalAlpha = 1;
    // 내리는 눈
    const sn = lite ? lv : 3 + lv * 3;
    c.fillStyle = 'rgba(255, 255, 255, 0.85)';
    for (let i = 0; i < sn; i++) {
      const t = (time * 0.35 + rnd(seed, i + 70)) % 1;
      const x0 = (rnd(seed, i + 90) * 2 - 1) * a.r * 0.8;
      const y = a.y - a.r * 0.8 + t * a.r * 1.6;
      const x = a.x + x0 + Math.sin(time * 2 + i) * 0.2;
      if ((x - a.x) * (x - a.x) + (y - a.y) * (y - a.y) > a.r * a.r) continue;
      c.globalAlpha = Math.sin(t * Math.PI);
      c.beginPath(); c.arc(x, y, 0.06 + 0.02 * lv, 0, TAU); c.fill();
    }
    c.globalAlpha = 1;
    timeArc(c, a);
  }

  // 터렛 공격 범위의 움직이지 않는 부분: 옅은 원 + 점선 테두리 + 30°마다 눈금
  function turretStatic(c, a, team) {
    c.fillStyle = H.hexAlpha(team.color, 0.06);
    c.beginPath(); c.arc(a.x, a.y, a.r, 0, TAU); c.fill();
    c.setLineDash([0.35, 0.25]);
    c.strokeStyle = H.hexAlpha(team.color, 0.75);
    c.lineWidth = 0.08;
    c.stroke();
    c.setLineDash([]);
    c.strokeStyle = 'rgba(196, 155, 255, 0.6)';
    c.lineWidth = 0.06;
    c.beginPath();
    for (let i = 0; i < 12; i++) {
      const ang = i * TAU / 12;
      c.moveTo(a.x + Math.cos(ang) * (a.r - 0.3), a.y + Math.sin(ang) * (a.r - 0.3));
      c.lineTo(a.x + Math.cos(ang) * a.r, a.y + Math.sin(ang) * a.r);
    }
    c.stroke();
  }

  // 엔지니어 터렛: 공격 범위 + 에너지 선 + 기계 몸체(포신 1·2·3개) + 체력 막대 + LEVEL 3 레이더
  function areaTurret(c, a, time, lv, team) {
    const acc = '#c49bff';
    areaLayer(c, a, lv, team); // 범위 원·점선·눈금 (한 장)
    // LEVEL 3: 도는 레이더 빛 (부쉬 속 상대 감지)
    if (lv >= 3) {
      const ang = time * 2.2;
      c.fillStyle = 'rgba(255, 216, 77, 0.14)';
      c.beginPath(); c.moveTo(a.x, a.y); c.arc(a.x, a.y, a.r, ang - 0.7, ang); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(255, 216, 77, 0.8)';
      c.lineWidth = 0.05;
      c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(a.x + Math.cos(ang) * a.r, a.y + Math.sin(ang) * a.r); c.stroke();
    }
    // 에너지 선: 몸체 → 원 가장자리로 흐르는 빛
    const lines = 2 + lv;
    for (let i = 0; i < lines; i++) {
      const ang = i * TAU / lines + Math.PI / 4;
      const ex = a.x + Math.cos(ang) * a.r * 0.92, ey = a.y + Math.sin(ang) * a.r * 0.92;
      c.strokeStyle = H.hexAlpha(acc, 0.25);
      c.lineWidth = 0.05;
      c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(ex, ey); c.stroke();
      const t = (time * 0.8 + i / lines) % 1;
      c.fillStyle = H.hexAlpha(acc, 1 - t);
      c.beginPath(); c.arc(a.x + (ex - a.x) * t, a.y + (ey - a.y) * t, 0.08, 0, TAU); c.fill();
    }
    timeArc(c, a);
    // 몸체: 팔각 받침 + 볼트
    c.save();
    c.translate(a.x, a.y);
    c.fillStyle = 'rgba(0, 0, 0, 0.35)';
    c.beginPath(); c.ellipse(0.08, 0.22, 0.7, 0.5, 0, 0, TAU); c.fill();
    c.fillStyle = '#23285a';
    poly(c, 8, 0.64, Math.PI / 8);
    c.fill();
    c.strokeStyle = team.color;
    c.lineWidth = 0.08;
    c.stroke();
    c.fillStyle = '#9aa0d8';
    for (let i = 0; i < 4; i++) {
      const ang = Math.PI / 4 + i * Math.PI / 2;
      c.beginPath(); c.arc(Math.cos(ang) * 0.46, Math.sin(ang) * 0.46, 0.05, 0, TAU); c.fill();
    }
    // 포신 (LEVEL 만큼)
    c.save();
    c.rotate(a.aim || 0);
    c.fillStyle = '#4a4f8f';
    c.strokeStyle = lv >= 3 ? GOLD : acc;
    c.lineWidth = 0.035;
    for (let i = 0; i < lv; i++) {
      const oy = (i - (lv - 1) / 2) * 0.16;
      c.fillRect(0.12, oy - 0.055, 0.68, 0.11);
      c.strokeRect(0.12, oy - 0.055, 0.68, 0.11);
    }
    c.restore();
    // 머리
    c.fillStyle = '#353c7c';
    c.beginPath(); c.arc(0, 0, 0.33, 0, TAU); c.fill();
    c.strokeStyle = acc;
    c.lineWidth = 0.07;
    c.stroke();
    c.fillStyle = H.hexAlpha(acc, 0.6 + 0.4 * Math.sin(time * 5));
    c.beginPath(); c.arc(0, 0, 0.11, 0, TAU); c.fill();
    // LEVEL 3: 머리 위 작은 레이더 접시
    if (lv >= 3) {
      c.strokeStyle = GOLD;
      c.lineWidth = 0.05;
      c.beginPath(); c.arc(0, 0, 0.22, time * 3, time * 3 + 1.4); c.stroke();
    }
    if (a.hitFlash > 0) {
      c.fillStyle = 'rgba(255, 255, 255,' + Math.min(0.8, a.hitFlash * 5) + ')';
      poly(c, 8, 0.66, Math.PI / 8);
      c.fill();
    }
    c.restore();
    // 체력 막대
    if (a.maxHp > 0) {
      const q = clamp01(a.hp / a.maxHp);
      const w = 1.3, x = a.x - w / 2, y = a.y - 0.98;
      c.fillStyle = 'rgba(10, 12, 35, 0.85)';
      H.roundRect(c, x - 0.04, y - 0.04, w + 0.08, 0.2, 0.08);
      c.fill();
      c.fillStyle = q > 0.5 ? '#8dffb0' : q > 0.25 ? '#ffd84d' : '#ff5d6c';
      c.fillRect(x, y, w * q, 0.12);
    }
  }

  // =========================================================
  //  짧은 효과 (한 번 번쩍하고 사라짐)
  // =========================================================
  /** @returns {boolean} 이 파일이 그린 효과인지 (아니면 render.js 가 그림) */
  function drawEffect(c, e) {
    const k = clamp01(e.age / e.life);
    switch (e.kind) {
      case 'blast': fxBlast(c, e, k); return true;
      case 'push': fxPush(c, e, k); return true;
      case 'shieldHit': fxShieldHit(c, e, k); return true;
      case 'shatter': fxShatter(c, e, k); return true;
      case 'debris': fxDebris(c, e, k); return true;
      case 'healPulse': fxHealPulse(c, e, k); return true;
      case 'blinkTrail': fxBlinkTrail(c, e, k); return true;
      case 'zoneActivated': fxZoneActivated(c, e, k); return true;
      case 'zoneWave': fxZoneWave(c, e, k); return true;
      case 'levelUp': fxLevelUp(c, e, k); return true;
    }
    return false;
  }

  // 블래스터 충격파: 섬광 → 퍼지는 고리(LEVEL 2: 두 겹, MAX: 금색 별빛) → 파편
  function fxBlast(c, e, k) {
    const lv = e.lv || (e.gold ? 3 : 1);
    const gold = e.gold || lv >= 3;
    const main = gold ? GOLD : '#ff6b8a';
    const seed = seedOf(Math.round(e.x * 10) + ':' + Math.round(e.y * 10));
    c.save();
    // 섬광
    if (k < 0.3) {
      c.globalAlpha = (1 - k / 0.3) * 0.6;
      c.fillStyle = gold ? '#fff4c2' : '#ffe0e8';
      c.beginPath(); c.arc(e.x, e.y, e.r, 0, TAU); c.fill();
    }
    // 연기 고리
    c.globalAlpha = 0.3 * (1 - k);
    c.strokeStyle = '#c8b8d8';
    c.lineWidth = 0.5;
    c.beginPath(); c.arc(e.x, e.y, e.r * (0.9 + 0.3 * k), 0, TAU); c.stroke();
    // 충격파 고리
    c.globalAlpha = 1 - k;
    c.strokeStyle = main;
    c.lineWidth = 0.34 * (1 - k) + 0.05;
    c.beginPath(); c.arc(e.x, e.y, e.r * (0.25 + 0.95 * easeOut(k)), 0, TAU); c.stroke();
    if (lv >= 2) {
      const k2 = clamp01((k - 0.15) / 0.85);
      c.strokeStyle = '#ffffff';
      c.lineWidth = 0.14 * (1 - k2) + 0.03;
      c.beginPath(); c.arc(e.x, e.y, e.r * (0.15 + 1.15 * easeOut(k2)), 0, TAU); c.stroke();
    }
    if (lv >= 3) {
      c.strokeStyle = GOLD;
      c.lineWidth = 0.08;
      c.beginPath();
      for (let i = 0; i < 14; i++) {
        const ang = i * TAU / 14 + rnd(seed, i) * 0.2;
        const d0 = e.r * 0.3, d1 = e.r * (0.6 + 0.65 * easeOut(k));
        c.moveTo(e.x + Math.cos(ang) * d0, e.y + Math.sin(ang) * d0);
        c.lineTo(e.x + Math.cos(ang) * d1, e.y + Math.sin(ang) * d1);
      }
      c.stroke();
    }
    // 파편
    const n = lite ? 4 + lv * 2 : 6 + lv * 4;
    for (let i = 0; i < n; i++) {
      const ang = rnd(seed, i + 30) * TAU;
      const d = e.r * (0.2 + (0.8 + 0.6 * rnd(seed, i + 60)) * easeOut(k));
      c.fillStyle = i % 3 === 0 ? '#ffffff' : main;
      c.beginPath(); c.arc(e.x + Math.cos(ang) * d, e.y + Math.sin(ang) * d, 0.13 * (1 - k) + 0.03, 0, TAU); c.fill();
    }
    c.restore();
  }

  // 밀려난 자리: 밀린 방향으로 >>> 화살표 (밀린 거리만큼)
  function fxPush(c, e, k) {
    const a = e.angle || 0, L = e.r || 1.5;
    c.save();
    c.globalAlpha = 1 - k;
    c.strokeStyle = e.color || '#ffb3c4';
    c.lineWidth = 0.1;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    for (let i = 0; i < 3; i++) {
      const t = (i + 1) / 3.2 + k * 0.25;
      const cx = e.x + Math.cos(a) * L * t, cy = e.y + Math.sin(a) * L * t;
      const s = 0.28;
      c.beginPath();
      c.moveTo(cx - Math.cos(a - 0.7) * s, cy - Math.sin(a - 0.7) * s);
      c.lineTo(cx, cy);
      c.lineTo(cx - Math.cos(a + 0.7) * s, cy - Math.sin(a + 0.7) * s);
      c.stroke();
    }
    c.restore();
  }

  // 보호막이 공격을 막은 자리: 테두리를 따라 퍼지는 물결
  function fxShieldHit(c, e, k) {
    const ax = e.ax === undefined ? e.x : e.ax, ay = e.ay === undefined ? e.y : e.ay;
    const R = Math.hypot(e.x - ax, e.y - ay);
    const ang = Math.atan2(e.y - ay, e.x - ax);
    c.save();
    c.globalAlpha = 1 - k;
    if (R > 0.3) {
      const w = 0.25 + 0.6 * k;
      c.strokeStyle = '#ffffff';
      c.lineWidth = 0.18 * (1 - k) + 0.04;
      c.lineCap = 'round';
      c.beginPath(); c.arc(ax, ay, R, ang - w, ang + w); c.stroke();
      c.strokeStyle = e.color || '#9ee8ff';
      c.lineWidth = 0.08;
      c.beginPath(); c.arc(ax, ay, R - 0.15, ang - w * 0.8, ang + w * 0.8); c.stroke();
    }
    c.strokeStyle = e.color || '#ffffff';
    c.lineWidth = 0.07;
    c.beginPath(); c.arc(e.x, e.y, 0.2 + 0.5 * k, 0, TAU); c.stroke();
    c.restore();
  }

  // 보호막이 깨짐: 조각이 사방으로 튐
  function fxShatter(c, e, k) {
    const seed = seedOf(Math.round(e.x * 10) + '/' + Math.round(e.y * 10));
    c.save();
    c.globalAlpha = 1 - k;
    c.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    c.lineWidth = 0.12 * (1 - k);
    c.beginPath(); c.arc(e.x, e.y, e.r * (1 + 0.25 * k), 0, TAU); c.stroke();
    const n = 16;
    for (let i = 0; i < n; i++) {
      const ang = i * TAU / n + rnd(seed, i) * 0.3;
      const d = e.r + (0.2 + 1.3 * rnd(seed, i + 20)) * easeOut(k);
      const x = e.x + Math.cos(ang) * d, y = e.y + Math.sin(ang) * d;
      const rot = ang + k * 6 * (rnd(seed, i + 40) - 0.5);
      const s = 0.22 + 0.15 * rnd(seed, i + 60);
      c.fillStyle = i % 2 ? (e.color || '#9ee8ff') : '#ffffff';
      c.beginPath();
      c.moveTo(x + Math.cos(rot) * s, y + Math.sin(rot) * s);
      c.lineTo(x + Math.cos(rot + 2.3) * s * 0.6, y + Math.sin(rot + 2.3) * s * 0.6);
      c.lineTo(x + Math.cos(rot + 4) * s * 0.7, y + Math.sin(rot + 4) * s * 0.7);
      c.closePath();
      c.fill();
    }
    c.restore();
  }

  // 터렛이 부서짐: 금속 조각 + 연기
  function fxDebris(c, e, k) {
    const seed = seedOf(Math.round(e.x * 10) + '#' + Math.round(e.y * 10));
    c.save();
    for (let i = 0; i < 5; i++) {
      const ang = rnd(seed, i) * TAU, d = 0.3 + 0.9 * k * rnd(seed, i + 5);
      c.globalAlpha = 0.35 * (1 - k);
      c.fillStyle = '#8a8fb5';
      c.beginPath(); c.arc(e.x + Math.cos(ang) * d, e.y + Math.sin(ang) * d - k * 0.6, 0.3 + 0.5 * k, 0, TAU); c.fill();
    }
    c.globalAlpha = 1 - k;
    for (let i = 0; i < 10; i++) {
      const ang = rnd(seed, i + 20) * TAU, d = (0.3 + 1.6 * rnd(seed, i + 30)) * easeOut(k);
      c.save();
      c.translate(e.x + Math.cos(ang) * d, e.y + Math.sin(ang) * d);
      c.rotate(k * 8 * (rnd(seed, i + 40) - 0.5));
      c.fillStyle = i % 3 === 0 ? (e.color || '#c49bff') : '#5b6199';
      c.fillRect(-0.1, -0.06, 0.2, 0.12);
      c.restore();
    }
    c.strokeStyle = '#c49bff';
    c.lineWidth = 0.1 * (1 - k);
    c.beginPath(); c.arc(e.x, e.y, 0.4 + 1.2 * k, 0, TAU); c.stroke();
    c.restore();
  }

  // 회복된 캐릭터: 초록 고리가 몸으로 모이고 + 가 올라감 (MAX 첫 회복은 크게)
  function fxHealPulse(c, e, k) {
    const s = e.big ? 1.5 : 1;
    c.save();
    c.globalAlpha = 1 - k;
    c.strokeStyle = e.big ? '#d9ffb0' : '#6dffa8';
    c.lineWidth = 0.08 * s;
    c.beginPath(); c.arc(e.x, e.y, Math.max(0.2, (1.3 - k * 0.6) * s), 0, TAU); c.stroke();
    c.lineWidth = 0.07;
    for (let i = 0; i < 3; i++) {
      const x = e.x + (i - 1) * 0.45, y = e.y - 0.3 - k * 1.1 - (i % 2) * 0.25;
      const p = 0.12 * s;
      c.beginPath();
      c.moveTo(x - p, y); c.lineTo(x + p, y);
      c.moveTo(x, y - p); c.lineTo(x, y + p);
      c.stroke();
    }
    c.restore();
  }

  // 스피더 순간이동: 출발점 → 도착점 빛 줄기와 흐린 잔상
  function fxBlinkTrail(c, e, k) {
    const lv = e.lv || 1;
    const x2 = e.x2 === undefined ? e.x : e.x2, y2 = e.y2 === undefined ? e.y : e.y2;
    c.save();
    const g = c.createLinearGradient(e.x, e.y, x2, y2);
    g.addColorStop(0, H.hexAlpha(e.color || '#ff9df5', 0));
    g.addColorStop(1, H.hexAlpha(lv >= 3 ? GOLD : (e.color || '#ff9df5'), 0.85 * (1 - k)));
    c.strokeStyle = g;
    c.lineCap = 'round';
    c.lineWidth = 0.55 * (1 - k) + 0.08;
    c.beginPath(); c.moveTo(e.x, e.y); c.lineTo(x2, y2); c.stroke();
    // 흐린 잔상
    const n = 2 + lv;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      c.fillStyle = H.hexAlpha(e.color || '#ff9df5', 0.3 * (1 - k) * t);
      c.beginPath(); c.arc(e.x + (x2 - e.x) * t, e.y + (y2 - e.y) * t, PLAYER_RADIUS * (0.7 + 0.3 * t), 0, TAU); c.fill();
    }
    // 출발점에서 퍼지는 고리
    c.globalAlpha = 1 - k;
    c.strokeStyle = e.color || '#ff9df5';
    c.lineWidth = 0.08;
    c.beginPath(); c.arc(e.x, e.y, 0.3 + 1.0 * k, 0, TAU); c.stroke();
    if (lv >= 3) {
      c.strokeStyle = GOLD;
      c.beginPath(); c.arc(x2, y2, 0.5 + 1.2 * k, 0, TAU); c.stroke();
    }
    c.restore();
  }

  // 점령 활성화: 존에서 큰 빛 고리가 퍼지고 "ZONE ACTIVATED!"
  function fxZoneActivated(c, e, k) {
    const R = e.radius || 3;
    const seed = seedOf(Math.round(e.x) + 'za' + Math.round(e.y));
    c.save();
    c.globalAlpha = 1 - k;
    c.strokeStyle = e.color || '#ffffff';
    c.lineWidth = 0.35 * (1 - k) + 0.05;
    c.beginPath(); c.arc(e.x, e.y, R + 0.2 + 2.2 * easeOut(k), 0, TAU); c.stroke();
    c.strokeStyle = '#ffffff';
    c.lineWidth = 0.1;
    c.beginPath(); c.arc(e.x, e.y, R * (1 - 0.5 * k), 0, TAU); c.stroke();
    // 위로 솟는 빛 알갱이
    c.fillStyle = e.color || '#ffffff';
    for (let i = 0; i < 14; i++) {
      const ang = i * TAU / 14;
      const d = R * (0.9 + 0.2 * rnd(seed, i));
      c.beginPath();
      c.arc(e.x + Math.cos(ang) * d, e.y + Math.sin(ang) * d - easeOut(k) * (0.8 + rnd(seed, i + 9)), 0.1 * (1 - k) + 0.04, 0, TAU);
      c.fill();
    }
    c.restore();
    // 글자: 톡 튀어나왔다가 사라짐
    const pop = k < 0.15 ? 0.6 + k / 0.15 * 0.5 : k < 0.25 ? 1.1 - (k - 0.15) : 1;
    c.save();
    c.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
    const y = e.y - R - 1.3 - k * 0.5;
    c.fillStyle = 'rgba(10, 12, 35, 0.75)';
    H.roundRect(c, e.x - 3.3 * pop, y - 0.55 * pop, 6.6 * pop, 1.1 * pop, 0.5 * pop);
    c.fill();
    H.text(c, e.text || 'ZONE ACTIVATED!', e.x, y + 0.02, 0.72 * pop, e.color || '#ffffff', 'bold');
    c.restore();
  }

  // 존 점령 완료: 겹겹이 퍼지는 에너지 물결 + 솟는 빛
  function fxZoneWave(c, e, k) {
    const R = e.radius || 3;
    c.save();
    for (let i = 0; i < 3; i++) {
      const kk = clamp01((k - i * 0.15) / 0.7);
      if (kk <= 0 || kk >= 1) continue;
      c.globalAlpha = 1 - kk;
      c.strokeStyle = i === 1 ? '#ffffff' : (e.color || '#ffffff');
      c.lineWidth = 0.3 * (1 - kk) + 0.04;
      c.beginPath(); c.arc(e.x, e.y, R * (0.3 + 1.2 * easeOut(kk)), 0, TAU); c.stroke();
    }
    c.globalAlpha = 0.35 * (1 - k);
    c.fillStyle = e.color || '#ffffff';
    c.beginPath(); c.arc(e.x, e.y, R, 0, TAU); c.fill();
    c.restore();
  }

  // 스킬 LEVEL UP: 캐릭터 주위로 올라가는 빛 기둥
  function fxLevelUp(c, e, k) {
    const gold = e.gold;
    c.save();
    c.globalAlpha = 1 - k;
    c.strokeStyle = gold ? GOLD : (e.color || '#4ff0c0');
    c.lineWidth = 0.08;
    for (let i = 0; i < 8; i++) {
      const ang = i * TAU / 8 + k * 2;
      const x = e.x + Math.cos(ang) * 1.1, y = e.y + Math.sin(ang) * 0.7;
      c.beginPath(); c.moveTo(x, y - k * 0.4); c.lineTo(x, y - 0.5 - k * 1.6); c.stroke();
    }
    c.lineWidth = 0.12;
    c.beginPath(); c.ellipse(e.x, e.y, 1.2 + k * 0.6, 0.8 + k * 0.4, 0, 0, TAU); c.stroke();
    c.restore();
  }

  return { init, emblem, drawArea, drawEffect, flake, seedOf, rnd,
    setLayers(on) { useLayers = !!on; },
    setLite(on) { if (lite !== !!on) { lite = !!on; layerCache.clear(); } },
    isLite: () => lite };
})();
