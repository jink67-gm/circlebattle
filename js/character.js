/* ============================================================
   서클 배틀 - 캐릭터 그리기 (character.js) — 캐릭터 리디자인
   ------------------------------------------------------------
   위에서 내려다본 "도는 판 + 가운데 문양" 대신, 얼굴이 보이는 2등신 아레나 캐릭터로 그립니다.
   - 몸은 똑바로 서 있고, 무기를 든 팔만 조준 방향으로 돕니다. 왼쪽을 보면 좌우가 뒤집힙니다.
   - 몸 색 = 캐릭터 색. 팀 = 발밑 고리 색 + 허리띠 색 (이름·체력바도 팀 색)
   - 충돌 크기(반지름 0.7m)와 위치는 그대로입니다. 발밑 고리의 가운데가 캐릭터 위치입니다.

   캐릭터 (밝고 조금 과장된 모바일 아레나 스타일 — 특정 게임 캐릭터를 따라 하지 않은 서클배틀만의 모양)
     블래스터  분홍·빨강   뾰족한 머리 지느러미, 자신감 있는 눈썹, 큰 팔 대포, 가슴 에너지 코어, 등 부스터
     가디언    노랑·금색   넓고 낮은 갑옷 몸, T자 바이저 헬멧, 어깨 보호대, 큰 방패판, 넓은 발
     메딕      민트·초록   둥근 몸, 흰 가운, 간호 모자, 등의 회복 캡슐, 옆에 떠 있는 회복 드론, 순한 눈
     스피더    보라·분홍   날렵하게 앞으로 기운 몸, 고글, 뒤로 넘긴 날개, 휘날리는 스카프, 등 제트 불꽃
     엔지니어  보라·기계   네모 몸과 머리, 안전모와 이마 고글, 에너지 렌치, 공구 벨트, 깜빡이는 안테나
     프로스트  하늘·파랑   얼음 결정 왕관, 차가운 눈매, 목도리 마스크, 얼음 장갑, 둘레를 도는 얼음 조각

   움직임: 숨쉬기(가만히) · 통통 걷기(발 번갈아) · 쏘면 반동과 총구 불꽃 · 맞으면 흔들림과 몸 모양 그대로 번쩍
           · 스킬을 쓰면 캐릭터별 동작 · LEVEL 2 장비 빛 · LEVEL 3 MAX 금색 장식과 발밑 금빛 오라
   통신은 바꾸지 않음: 누가 쏜 탄인지, 누가 놓은 스킬 원인지, 맞았는지(hitFlash)는 이미 모든 기기에 있으므로
                      그리는 쪽에서 알아내 움직임을 만듭니다.

   PNG 캐릭터 그림 (assets/characters/blaster.png … frost.png)
     그림을 불러오면 그림으로 그리고, 못 불러오면(파일 없음·오류) 아래의 도형 캐릭터로 그립니다 (fallback).
     보이는 그림 크기와 충돌 판정(반지름 0.7m)·사거리·탄이 나오는 자리는 따로입니다 — 그림 크기로 판정하지 않음.
     발(foot)을 발밑 팀 고리 가운데에 맞추고, 무기 끝(muzzle)에서 총구 불꽃과 탄이 나오는 것처럼 보이게 합니다.
     캐릭터 색은 팀에 따라 바꾸지 않고, 팀은 발밑 고리로 구분합니다. LEVEL 2·3 은 같은 그림 + 외곽 빛.

   구조 (나중에 PNG 그림으로 바꾸기 쉽게)
     drawBaseBody   몸통·머리·고정 장비 — 한 번 그려 두고 붙이기만 함 (태블릿 성능)
     drawFace       눈·표정 — 조준 방향을 봄, 가끔 깜빡임, 맞으면 > <
     drawWeapon     무기 — 조준 방향으로 회전, 쏘면 반동
     drawAccessory  움직이는 장비 — 드론·얼음 조각·불꽃·스카프·안테나 불빛
     drawSkillAura  발밑 오라 — 메딕 회복 오라 범위, LEVEL 2·3 고리
   PNG로 바꾸려면: CharacterRenderer.useImage('blaster', img, { box: [x0, y0, w, h], face: false })
     box = 그림이 덮을 범위(m, 캐릭터 위치 기준, 기본 [-1.2, -1.35, 2.4, 2.0]), face:false 면 그린 얼굴을 쓰지 않음
   ============================================================ */

const CharacterRenderer = (function () {
  const TAU = Math.PI * 2;
  const OUT = '#1a1433';      // 두꺼운 외곽선 색
  const LW = 0.07;            // 외곽선 굵기 (m)
  const GOLD = '#ffd84d';
  // 캐릭터 위치(발밑 고리 가운데) 기준 치수 (m) — render.js 가 체력바·이름·상태 표시를 놓을 때 씀
  const M = {
    FOOT_Y: 0.42,     // 발과 발밑 고리의 높이
    RING_RX: 0.74,    // 발밑 고리 가로 반지름 (충돌 반지름 0.7과 비슷)
    RING_RY: 0.34,
    CENTER_Y: -0.25,  // 보이는 몸의 가운데 (보호막 거품 등)
    TOP_Y: -1.34,     // 머리 장식 끝
    SCALE: 1.12,      // 몸 그림 크기 (발을 축으로 키움)
  };
  const BOX = { x0: -1.2, y0: -1.35, w: 2.4, h: 2.0 }; // 몸 그림 한 장이 덮는 범위
  let H = null;       // Renderer 도우미 { roundRect, hexAlpha }
  let lite = false;   // 가벼운 화질: 알갱이·잔상 줄임, 점선 대신 실선

  // 캐릭터 색 (main 몸, dark 그늘, light 빛, trim 강조, metal 장비, metalL 장비 밝은 곳, glow 빛나는 부분)
  const PAL = {
    blaster:  { main: '#ff5c7c', dark: '#c4294f', light: '#ffc0cc', trim: '#ffd84d', metal: '#3b2346', metalL: '#7a4a86', glow: '#ffe07a', head: null },
    guardian: { main: '#ffc53d', dark: '#c27f0e', light: '#fff2b0', trim: '#fff6d0', metal: '#2f3570', metalL: '#5d64a8', glow: '#a8f4ff', head: null },
    medic:    { main: '#47e2a0', dark: '#1a9563', light: '#d2ffec', trim: '#ffffff', metal: '#d9f7ea', metalL: '#ffffff', glow: '#7dffbf',
                head: { light: '#f0fff8', main: '#a6f5d3', dark: '#3fb985' } },
    speeder:  { main: '#b45cff', dark: '#6522ab', light: '#ecd0ff', trim: '#ff74d4', metal: '#2a1c54', metalL: '#53409a', glow: '#7ef6ff', head: null },
    engineer: { main: '#7a6eff', dark: '#3b31a6', light: '#d6d0ff', trim: '#ffa53d', metal: '#9aa3cc', metalL: '#e2e6ff', glow: '#7ef6ff',
                head: { light: '#e6e2ff', main: '#a69dff', dark: '#4c41b8' } },
    frost:    { main: '#6fd0ff', dark: '#2570bd', light: '#e6f8ff', trim: '#ffffff', metal: '#1d4a91', metalL: '#3f74c4', glow: '#dff7ff',
                head: { light: '#f4fcff', main: '#ade8ff', dark: '#3f92d8' } },
  };

  function init(helpers) { H = helpers; loadSprites(); }
  function setLite(on) { lite = !!on; }

  // ---------------- 작은 도우미 ----------------
  function seedOf(v) {
    let h = 7;
    String(v).split('').forEach((ch) => { h = (h * 31 + ch.charCodeAt(0)) % 100003; });
    return h;
  }
  const clamp01 = (k) => Math.max(0, Math.min(1, k));
  function ell(g, x, y, rx, ry) { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); }
  function rr(g, x, y, w, h, r) { H.roundRect(g, x, y, w, h, r); }
  // 칠하고 두꺼운 외곽선
  function ink(g, fill, lw) {
    if (fill) { g.fillStyle = fill; g.fill(); }
    g.lineWidth = lw || LW;
    g.strokeStyle = OUT;
    g.stroke();
  }
  // 왼쪽 위가 밝은 입체 그라디언트 (몸 그림 한 장을 만들 때만 씀)
  function shade(g, x, y, r, P) {
    const gr = g.createRadialGradient(x - r * 0.38, y - r * 0.45, r * 0.06, x, y, r * 1.15);
    gr.addColorStop(0, P.light);
    gr.addColorStop(0.5, P.main);
    gr.addColorStop(1, P.dark);
    return gr;
  }
  // 하이라이트 (왼쪽 위 반짝임)
  function shine(g, x, y, r) {
    g.save();
    g.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    g.lineWidth = r * 0.15;
    g.lineCap = 'round';
    g.beginPath(); g.arc(x, y, r * 0.68, Math.PI * 1.1, Math.PI * 1.4); g.stroke();
    g.fillStyle = 'rgba(255, 255, 255, 0.75)';
    g.beginPath(); g.arc(x - r * 0.18, y - r * 0.62, r * 0.07, 0, TAU); g.fill();
    g.restore();
  }
  // 허리띠 (팀 색) — 몸통 모양 안쪽만 칠함
  function teamBand(g, torso, y, h, team) {
    g.save();
    torso(); g.clip();
    g.fillStyle = team.color;
    g.fillRect(-1.2, y, 2.4, h);
    g.fillStyle = 'rgba(255, 255, 255, 0.4)';
    g.fillRect(-1.2, y, 2.4, h * 0.3);
    g.strokeStyle = OUT;
    g.lineWidth = 0.035;
    g.beginPath(); g.moveTo(-1.2, y); g.lineTo(1.2, y); g.moveTo(-1.2, y + h); g.lineTo(1.2, y + h); g.stroke();
    g.restore();
    torso(); g.lineWidth = LW; g.strokeStyle = OUT; g.stroke(); // 테두리 다시 (띠가 덮지 않게)
  }
  // 가슴 코어: LEVEL 2 빛 번짐, LEVEL 3 MAX 금색
  function core(g, x, y, s, color, tier, shape) {
    if (tier >= 2) {
      const c = tier >= 3 ? GOLD : color;
      const gl = g.createRadialGradient(x, y, 0, x, y, s * 3.2);
      gl.addColorStop(0, H.hexAlpha(c, 0.85));
      gl.addColorStop(1, H.hexAlpha(c, 0));
      g.fillStyle = gl;
      g.beginPath(); g.arc(x, y, s * 3.2, 0, TAU); g.fill();
    }
    g.save();
    g.translate(x, y);
    shape(g, s, tier >= 3 ? GOLD : color);
    g.restore();
  }
  // 코어 모양들 (가운데 0,0)
  const SHAPE = {
    diamond(g, s, col) {
      g.beginPath(); g.moveTo(0, -s * 1.25); g.lineTo(s * 0.85, 0); g.lineTo(0, s * 1.25); g.lineTo(-s * 0.85, 0); g.closePath();
      ink(g, col, 0.035);
      g.fillStyle = 'rgba(255, 255, 255, 0.85)';
      g.beginPath(); g.moveTo(0, -s * 0.8); g.lineTo(s * 0.3, -s * 0.15); g.lineTo(0, 0); g.closePath(); g.fill();
    },
    shield(g, s, col) {
      g.beginPath();
      g.moveTo(-s * 0.85, -s * 0.85); g.lineTo(s * 0.85, -s * 0.85); g.lineTo(s * 0.85, 0);
      g.quadraticCurveTo(s * 0.85, s * 0.75, 0, s * 1.1); g.quadraticCurveTo(-s * 0.85, s * 0.75, -s * 0.85, 0);
      g.closePath();
      ink(g, col, 0.035);
    },
    plus(g, s, col) {
      g.beginPath();
      g.moveTo(-s * 0.35, -s); g.lineTo(s * 0.35, -s); g.lineTo(s * 0.35, -s * 0.35); g.lineTo(s, -s * 0.35); g.lineTo(s, s * 0.35);
      g.lineTo(s * 0.35, s * 0.35); g.lineTo(s * 0.35, s); g.lineTo(-s * 0.35, s); g.lineTo(-s * 0.35, s * 0.35); g.lineTo(-s, s * 0.35);
      g.lineTo(-s, -s * 0.35); g.lineTo(-s * 0.35, -s * 0.35); g.closePath();
      ink(g, col, 0.03);
    },
    chevron(g, s, col) {
      g.lineCap = 'round'; g.lineJoin = 'round';
      [[-0.55, 0], [0.2, 0]].forEach(([ox]) => {
        g.beginPath(); g.moveTo((ox - 0.3) * s, -s * 0.75); g.lineTo((ox + 0.4) * s, 0); g.lineTo((ox - 0.3) * s, s * 0.75);
        g.lineWidth = s * 0.55; g.strokeStyle = OUT; g.stroke();
        g.lineWidth = s * 0.3; g.strokeStyle = col; g.stroke();
      });
    },
    gear(g, s, col) {
      g.beginPath();
      for (let i = 0; i < 16; i++) {
        const a = i * TAU / 16, R = i % 2 ? s * 0.78 : s * 1.05;
        if (i === 0) g.moveTo(Math.cos(a) * R, Math.sin(a) * R); else g.lineTo(Math.cos(a) * R, Math.sin(a) * R);
      }
      g.closePath();
      ink(g, col, 0.03);
      ell(g, 0, 0, s * 0.35, s * 0.35); ink(g, OUT, 0.01);
    },
    snow(g, s, col) {
      g.lineCap = 'round';
      for (let pass = 0; pass < 2; pass++) {
        g.strokeStyle = pass ? col : OUT;
        g.lineWidth = pass ? s * 0.28 : s * 0.5;
        g.beginPath();
        for (let i = 0; i < 3; i++) {
          const a = i * Math.PI / 3 + Math.PI / 2;
          g.moveTo(Math.cos(a) * s, Math.sin(a) * s); g.lineTo(-Math.cos(a) * s, -Math.sin(a) * s);
        }
        g.stroke();
      }
    },
  };

  // =========================================================
  //  drawBaseBody — 몸통·머리·고정 장비 (오른쪽을 보는 모습, 가운데 = 캐릭터 위치)
  //  발·얼굴·무기·움직이는 장비는 매 프레임 따로 그림
  // =========================================================
  const BODY = {
    // 블래스터: 공격형 — 뾰족한 머리 지느러미 + 가슴 에너지 코어 + 등 부스터
    blaster(g, P, tier, team) {
      // 등 부스터 (뒤쪽 = 왼쪽)
      rr(g, -0.62, -0.16, 0.26, 0.5, 0.1); ink(g, P.metal);
      rr(g, -0.58, -0.08, 0.07, 0.32, 0.03); g.fillStyle = P.main; g.fill();
      rr(g, -0.6, 0.3, 0.22, 0.1, 0.04); ink(g, P.metalL, 0.045);
      // 몸통
      const torso = () => rr(g, -0.38, -0.12, 0.76, 0.58, 0.22);
      torso(); ink(g, shade(g, 0, 0.1, 0.45, P));
      teamBand(g, torso, 0.29, 0.09, team);
      core(g, 0.1, 0.1, 0.1, P.glow, tier, SHAPE.diamond);
      // 머리 지느러미 3개 (머리 뒤쪽 위로, 뒤로 기움)
      const hx = 0.03, hy = -0.43, hr = 0.41;
      for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 - 0.62 + i * 0.5;
        const len = hr + 0.36 - Math.abs(i - 1) * 0.07;
        const bx1 = hx + Math.cos(a - 0.2) * hr * 0.8, by1 = hy + Math.sin(a - 0.2) * hr * 0.8;
        const bx2 = hx + Math.cos(a + 0.2) * hr * 0.8, by2 = hy + Math.sin(a + 0.2) * hr * 0.8;
        const tx = hx + Math.cos(a - 0.42) * len, ty = hy + Math.sin(a - 0.42) * len;
        g.beginPath(); g.moveTo(bx1, by1); g.lineTo(tx, ty); g.lineTo(bx2, by2); g.closePath();
        ink(g, P.dark);
        if (tier >= 3) {
          g.fillStyle = GOLD;
          g.beginPath(); g.moveTo(tx, ty);
          g.lineTo(tx + (bx1 - tx) * 0.35, ty + (by1 - ty) * 0.35); g.lineTo(tx + (bx2 - tx) * 0.35, ty + (by2 - ty) * 0.35);
          g.closePath(); g.fill();
        }
      }
      // 머리
      ell(g, hx, hy, hr, hr * 0.96); ink(g, shade(g, hx, hy, hr, P));
      // 볼의 전투 무늬
      g.strokeStyle = P.dark; g.lineWidth = 0.04; g.lineCap = 'round';
      g.beginPath(); g.moveTo(0.33, -0.33); g.lineTo(0.4, -0.28); g.moveTo(0.33, -0.27); g.lineTo(0.39, -0.22); g.stroke();
      shine(g, hx, hy, hr);
    },

    // 가디언: 방어형 — 넓고 낮은 갑옷 + 어깨 보호대 + T자 바이저 헬멧
    guardian(g, P, tier, team) {
      const torso = () => rr(g, -0.54, -0.16, 1.08, 0.64, 0.24);
      torso(); ink(g, shade(g, 0, 0.1, 0.62, P));
      teamBand(g, torso, 0.3, 0.1, team);
      // 배 보호판 + 방패 문양
      rr(g, -0.19, -0.05, 0.44, 0.33, 0.1); ink(g, P.metal, 0.05);
      core(g, 0.03, 0.1, 0.1, P.trim, tier, SHAPE.shield);
      // 어깨 보호판 (두꺼운 판 + 줄)
      [-1, 1].forEach((s) => {
        const x = s * 0.47, y = -0.1;
        rr(g, x - 0.17, y - 0.13, 0.34, 0.24, 0.1); ink(g, shade(g, x, y, 0.22, P));
        g.strokeStyle = tier >= 3 ? GOLD : P.dark; g.lineWidth = 0.035;
        g.beginPath(); g.moveTo(x - 0.11, y + 0.02); g.lineTo(x + 0.11, y + 0.02); g.stroke();
      });
      // 헬멧 (둥근 네모)
      const helm = () => rr(g, -0.38, -0.86, 0.8, 0.72, 0.3);
      // 볏
      rr(g, -0.07, -0.98, 0.18, 0.24, 0.07); ink(g, tier >= 3 ? GOLD : P.dark, 0.05);
      helm(); ink(g, shade(g, 0.02, -0.52, 0.46, P));
      // T자 바이저 (앞쪽으로 치우침)
      rr(g, -0.15, -0.58, 0.55, 0.18, 0.08); ink(g, P.metal, 0.05);
      rr(g, 0.1, -0.44, 0.11, 0.16, 0.04); ink(g, P.metal, 0.04);
      // 헬멧 옆 리벳
      g.fillStyle = P.dark;
      g.beginPath(); g.arc(-0.27, -0.46, 0.035, 0, TAU); g.fill();
      shine(g, 0.0, -0.55, 0.42);
    },

    // 메딕: 지원형 — 둥근 몸 + 흰 가운 + 간호 모자 + 등의 회복 캡슐
    medic(g, P, tier, team) {
      // 등 회복 캡슐 (유리 통 안 초록 물약)
      rr(g, -0.64, -0.24, 0.3, 0.62, 0.14); ink(g, 'rgba(225, 255, 242, 0.95)');
      rr(g, -0.6, -0.02, 0.22, 0.36, 0.09); g.fillStyle = tier >= 2 ? '#8dffc6' : '#38d68e'; g.fill();
      g.fillStyle = 'rgba(255, 255, 255, 0.85)';
      [[-0.53, 0.12, 0.03], [-0.47, 0.22, 0.02], [-0.55, 0.26, 0.018]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); });
      rr(g, -0.66, -0.28, 0.34, 0.1, 0.04); ink(g, '#cfeee0', 0.045);
      rr(g, -0.66, 0.33, 0.34, 0.1, 0.04); ink(g, '#cfeee0', 0.045);
      // 몸통 (둥글게)
      const torso = () => ell(g, 0, 0.13, 0.42, 0.34);
      torso(); ink(g, shade(g, 0, 0.12, 0.45, P));
      // 흰 가운 앞판
      g.save(); torso(); g.clip();
      ell(g, 0.14, 0.14, 0.25, 0.34); g.fillStyle = '#f4fffa'; g.fill();
      g.strokeStyle = 'rgba(26, 20, 51, 0.35)'; g.lineWidth = 0.025; g.stroke();
      g.restore();
      teamBand(g, torso, 0.31, 0.08, team);
      core(g, 0.14, 0.08, 0.085, '#22c47c', tier, SHAPE.plus);
      // 머리
      const HP = P.head;
      ell(g, 0.03, -0.41, 0.41, 0.39); ink(g, shade(g, 0.03, -0.41, 0.41, HP));
      // 간호 모자 + 십자
      rr(g, -0.2, -0.92, 0.48, 0.23, 0.09); ink(g, '#ffffff');
      g.save(); g.translate(0.04, -0.805); SHAPE.plus(g, 0.065, tier >= 3 ? GOLD : '#22c47c'); g.restore();
      // 볼 (분홍)
      g.fillStyle = 'rgba(255, 130, 160, 0.45)';
      [[0.02, -0.3], [0.37, -0.3]].forEach(([x, y]) => { ell(g, x, y, 0.055, 0.035); g.fill(); });
      shine(g, 0.03, -0.41, 0.41);
    },

    // 스피더: 기동형 — 날렵한 몸 + 고글 + 뒤로 넘긴 날개 + 등 제트
    speeder(g, P, tier, team) {
      // 등 제트 (노즐 2개)
      rr(g, -0.58, -0.16, 0.26, 0.42, 0.1); ink(g, P.metal);
      [-0.08, 0.1].forEach((y) => { rr(g, -0.64, y, 0.13, 0.13, 0.04); ink(g, tier >= 3 ? GOLD : P.metalL, 0.035); });
      // 몸통 (앞이 둥글고 뒤가 좁은 날렵한 모양)
      const torso = () => {
        g.beginPath();
        g.moveTo(0.36, 0.08);
        g.bezierCurveTo(0.38, 0.44, -0.28, 0.48, -0.32, 0.18);
        g.bezierCurveTo(-0.35, -0.1, 0.18, -0.18, 0.36, 0.08);
        g.closePath();
      };
      torso(); ink(g, shade(g, 0.02, 0.12, 0.4, P));
      // 분홍 경주 줄무늬 (사선)
      g.save(); torso(); g.clip();
      g.fillStyle = P.trim;
      g.beginPath(); g.moveTo(-0.08, -0.2); g.lineTo(0.06, -0.2); g.lineTo(-0.14, 0.5); g.lineTo(-0.28, 0.5); g.closePath(); g.fill();
      g.restore();
      torso(); g.lineWidth = LW; g.strokeStyle = OUT; g.stroke();
      teamBand(g, torso, 0.3, 0.08, team);
      core(g, 0.16, 0.1, 0.075, '#ffffff', tier, SHAPE.chevron);
      // 뒤로 넘긴 날개 2개 (머리 뒤)
      g.beginPath(); g.moveTo(-0.06, -0.76); g.lineTo(-0.82, -1.04); g.lineTo(-0.28, -0.56); g.closePath(); ink(g, tier >= 3 ? GOLD : P.trim);
      g.beginPath(); g.moveTo(-0.28, -0.5); g.lineTo(-0.9, -0.58); g.lineTo(-0.32, -0.32); g.closePath(); ink(g, P.dark);
      // 머리
      ell(g, 0.05, -0.43, 0.38, 0.37); ink(g, shade(g, 0.05, -0.43, 0.38, P));
      // 고글 (띠 + 렌즈 2개, 앞쪽으로 치우침)
      rr(g, -0.31, -0.55, 0.74, 0.22, 0.1); ink(g, P.metal, 0.05);
      [[0.13, 0.115], [0.34, 0.095]].forEach(([x, rx]) => {
        ell(g, x, -0.44, rx, 0.09);
        const lg = g.createLinearGradient(x, -0.52, x, -0.36);
        lg.addColorStop(0, '#d8fdff'); lg.addColorStop(1, P.glow);
        ink(g, lg, 0.035);
      });
      shine(g, 0.05, -0.43, 0.38);
    },

    // 엔지니어: 전략형 — 네모 몸·머리 + 안전모 + 이마 고글 + 공구 가방 + 안테나
    engineer(g, P, tier, team) {
      // 공구 가방 (등)
      rr(g, -0.64, -0.18, 0.28, 0.5, 0.07); ink(g, P.metal);
      g.fillStyle = P.metalL;
      [[-0.57, -0.09], [-0.43, -0.09], [-0.57, 0.22], [-0.43, 0.22]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 0.025, 0, TAU); g.fill(); });
      // 안테나 대
      g.lineCap = 'round';
      g.strokeStyle = OUT; g.lineWidth = 0.1;
      g.beginPath(); g.moveTo(-0.2, -0.82); g.lineTo(-0.44, -1.18); g.stroke();
      g.strokeStyle = P.metalL; g.lineWidth = 0.045; g.stroke();
      // 몸통 (네모)
      const torso = () => rr(g, -0.42, -0.14, 0.84, 0.6, 0.12);
      torso(); ink(g, shade(g, 0, 0.1, 0.52, P));
      // 멜빵
      g.save(); torso(); g.clip();
      g.strokeStyle = P.dark; g.lineWidth = 0.08;
      g.beginPath(); g.moveTo(-0.2, -0.14); g.lineTo(-0.2, 0.3); g.moveTo(0.24, -0.14); g.lineTo(0.24, 0.3); g.stroke();
      g.restore();
      teamBand(g, torso, 0.28, 0.1, team);
      // 공구 주머니
      [[-0.34, 0.25], [0.16, 0.25]].forEach(([x, y]) => { rr(g, x, y, 0.17, 0.17, 0.04); ink(g, P.trim, 0.035); });
      core(g, 0.02, 0.06, 0.095, P.glow, tier, SHAPE.gear);
      // 머리 (둥근 네모)
      rr(g, -0.33, -0.8, 0.72, 0.64, 0.2); ink(g, shade(g, 0.03, -0.48, 0.42, P.head));
      // 안전모 (반구 + 챙)
      g.beginPath(); g.ellipse(0.03, -0.76, 0.4, 0.27, 0, Math.PI, TAU); g.closePath(); ink(g, P.trim);
      rr(g, -0.07, -1.02, 0.12, 0.26, 0.04); g.fillStyle = '#d9771a'; g.fill();
      rr(g, -0.43, -0.8, 0.94, 0.1, 0.05); ink(g, P.trim, 0.05);
      // 이마 고글 (안전모 위)
      g.strokeStyle = OUT; g.lineWidth = 0.05;
      g.beginPath(); g.moveTo(-0.12, -0.88); g.lineTo(0.36, -0.88); g.stroke();
      [[0.0, 0.085], [0.22, 0.08]].forEach(([x, r]) => {
        ell(g, x, -0.88, r, r); ink(g, P.metal, 0.04);
        ell(g, x, -0.88, r * 0.62, r * 0.62); g.fillStyle = tier >= 2 ? '#c9fbff' : P.glow; g.fill();
      });
      shine(g, 0.03, -0.48, 0.4);
    },

    // 프로스트: 제어형 — 얼음 결정 몸 + 얼음 왕관 + 목도리 마스크 + 어깨 얼음 가시
    frost(g, P, tier, team) {
      // 어깨 얼음 가시
      [[-0.32, -0.05, -2.45], [0.32, -0.05, -0.7]].forEach(([x, y, a]) => {
        const ca = Math.cos(a), sa = Math.sin(a);
        g.beginPath();
        g.moveTo(x - sa * 0.08, y + ca * 0.08); g.lineTo(x + ca * 0.34, y + sa * 0.34); g.lineTo(x + sa * 0.08, y - ca * 0.08);
        g.closePath(); ink(g, '#eafaff', 0.05);
      });
      // 몸통 (얼음 결정 육각)
      const torso = () => {
        g.beginPath();
        g.moveTo(-0.41, 0.13); g.lineTo(-0.22, -0.16); g.lineTo(0.22, -0.16);
        g.lineTo(0.41, 0.13); g.lineTo(0.22, 0.45); g.lineTo(-0.22, 0.45); g.closePath();
      };
      torso(); ink(g, shade(g, 0, 0.12, 0.46, P));
      g.save(); torso(); g.clip();
      g.strokeStyle = 'rgba(255, 255, 255, 0.5)'; g.lineWidth = 0.03;
      g.beginPath();
      [[-0.41, 0.13], [-0.22, -0.16], [0.22, -0.16], [0.41, 0.13]].forEach(([x, y]) => { g.moveTo(0.05, 0.12); g.lineTo(x, y); });
      g.stroke();
      g.restore();
      teamBand(g, torso, 0.3, 0.08, team);
      core(g, 0.06, 0.07, 0.1, '#ffffff', tier, SHAPE.snow);
      // 얼음 왕관 (머리 뒤에 먼저)
      const hx = 0.03, hy = -0.42, hr = 0.38;
      const hs = [0.16, 0.27, 0.4, 0.27, 0.16];
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i - 2) * 0.42 - 0.08;
        const ca = Math.cos(a), sa = Math.sin(a);
        const bx = hx + ca * hr * 0.8, by = hy + sa * hr * 0.8, tl = hr + hs[i];
        g.beginPath();
        g.moveTo(bx - sa * 0.1, by + ca * 0.1); g.lineTo(hx + ca * tl, hy + sa * tl); g.lineTo(bx + sa * 0.1, by - ca * 0.1);
        g.closePath();
        ink(g, i === 2 && tier >= 3 ? GOLD : '#eafaff', 0.05);
      }
      // 머리
      ell(g, hx, hy, hr, hr * 0.97); ink(g, shade(g, hx, hy, hr, P.head));
      // 목도리 마스크 (입을 가림)
      rr(g, -0.1, -0.35, 0.5, 0.17, 0.08); ink(g, P.metal, 0.05);
      g.strokeStyle = 'rgba(223, 247, 255, 0.7)'; g.lineWidth = 0.025;
      g.beginPath(); g.moveTo(0.02, -0.27); g.lineTo(0.3, -0.27); g.stroke();
      shine(g, hx, hy, hr);
    },
  };

  // =========================================================
  //  drawFace — 눈·표정 (매 프레임) : look = 조준 방향(몸 기준), blink, hurt(맞음), cast(스킬)
  // =========================================================
  function hurtEyes(c, xs, y, s) {
    c.strokeStyle = OUT; c.lineWidth = 0.05; c.lineCap = 'round';
    c.beginPath();
    xs.forEach((x, i) => {
      const d = i ? -1 : 1; // > <
      c.moveTo(x - d * s, y - s); c.lineTo(x + d * s * 0.6, y); c.lineTo(x - d * s, y + s);
    });
    c.stroke();
  }
  function blinkEyes(c, xs, y, s) {
    c.strokeStyle = OUT; c.lineWidth = 0.045; c.lineCap = 'round';
    c.beginPath();
    xs.forEach((x) => { c.moveTo(x - s, y); c.lineTo(x + s, y); });
    c.stroke();
  }
  // 흰자 + 눈동자 + 반짝임 (둘째 눈은 조금 좁게 → 옆을 보는 느낌)
  function eyes(c, f, o) {
    if (f.hurt) { hurtEyes(c, o.xs, o.y, o.rx * 0.9); return; }
    if (f.blink) { blinkEyes(c, o.xs, o.y, o.rx); return; }
    o.xs.forEach((x, i) => {
      const rx = o.rx * (i ? 0.86 : 1), ry = o.ry;
      ell(c, x, o.y, rx, ry);
      c.fillStyle = '#ffffff'; c.fill();
      c.lineWidth = 0.035; c.strokeStyle = OUT; c.stroke();
      const px = x + f.look.x * rx * 0.42, py = o.y + f.look.y * ry * 0.4;
      ell(c, px, py, o.pupil * (i ? 0.9 : 1), o.pupil * 1.15);
      c.fillStyle = o.iris || OUT; c.fill();
      c.fillStyle = '#ffffff';
      c.beginPath(); c.arc(px - o.pupil * 0.35, py - o.pupil * 0.45, o.pupil * 0.35, 0, TAU); c.fill();
    });
  }
  function mouth(c, x, y, w, curve, color) {
    c.strokeStyle = color || OUT; c.lineWidth = 0.035; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x - w, y); c.quadraticCurveTo(x, y + curve, x + w, y - (curve < 0 ? 0 : curve * 0.2)); c.stroke();
  }

  const FACE = {
    blaster(c, P, f) {
      const xs = [0.1, 0.29], y = -0.42;
      eyes(c, f, { xs, y, rx: 0.075, ry: 0.088, pupil: 0.042 });
      // 자신감 있는 눈썹 (안쪽이 내려감)
      c.strokeStyle = OUT; c.lineWidth = 0.055; c.lineCap = 'round';
      c.beginPath();
      c.moveTo(xs[0] - 0.09, y - 0.14); c.lineTo(xs[0] + 0.07, y - 0.1);
      c.moveTo(xs[1] + 0.07, y - 0.14); c.lineTo(xs[1] - 0.06, y - 0.1);
      c.stroke();
      // 씩 웃는 입 (한쪽만 올라감)
      if (f.hurt) mouth(c, 0.21, -0.25, 0.06, -0.03);
      else {
        c.strokeStyle = OUT; c.lineWidth = 0.035;
        c.beginPath(); c.moveTo(0.13, -0.26); c.quadraticCurveTo(0.21, -0.22, 0.29, -0.28); c.stroke();
      }
    },
    guardian(c, P, f) {
      // 바이저 안의 빛나는 눈 2개 (조준 방향으로 살짝 움직임)
      const y = -0.49 + f.look.y * 0.012;
      const xs = [0.05 + f.look.x * 0.03, 0.27 + f.look.x * 0.03];
      if (f.hurt) { c.save(); c.strokeStyle = P.glow; c.lineWidth = 0.04; c.beginPath(); xs.forEach((x) => { c.moveTo(x - 0.05, y); c.lineTo(x + 0.05, y); }); c.stroke(); c.restore(); return; }
      c.fillStyle = f.cast ? '#ffffff' : P.glow;
      xs.forEach((x, i) => {
        if (f.blink) { c.fillRect(x - 0.05, y - 0.012, 0.1, 0.024); return; }
        rr(c, x - 0.055 * (i ? 0.85 : 1), y - 0.04, 0.11 * (i ? 0.85 : 1), 0.08, 0.03); c.fill();
      });
    },
    medic(c, P, f) {
      eyes(c, f, { xs: [0.12, 0.3], y: -0.42, rx: 0.08, ry: 0.095, pupil: 0.05, iris: '#1d5e46' });
      if (!f.hurt) {
        // 순한 눈썹 + 미소
        c.strokeStyle = OUT; c.lineWidth = 0.03; c.lineCap = 'round';
        c.beginPath();
        c.arc(0.12, -0.53, 0.06, Math.PI * 1.15, Math.PI * 1.85);
        c.moveTo(0.25, -0.556); c.arc(0.3, -0.53, 0.055, Math.PI * 1.15, Math.PI * 1.85);
        c.stroke();
        mouth(c, 0.21, -0.27, 0.06, 0.05);
      } else mouth(c, 0.21, -0.25, 0.05, -0.03);
    },
    speeder(c, P, f) {
      // 고글 렌즈 안의 눈동자
      if (f.hurt) { hurtEyes(c, [0.13, 0.34], -0.44, 0.05); }
      else if (!f.blink) {
        c.fillStyle = OUT;
        [[0.13, 1], [0.34, 0.9]].forEach(([x, k]) => {
          ell(c, x + f.look.x * 0.035, -0.44 + f.look.y * 0.025, 0.035 * k, 0.045);
          c.fill();
        });
        c.fillStyle = '#ffffff';
        [0.13, 0.34].forEach((x) => { c.beginPath(); c.arc(x + f.look.x * 0.035 - 0.015, -0.455, 0.013, 0, TAU); c.fill(); });
      } else blinkEyes(c, [0.13, 0.34], -0.44, 0.06);
      // 신난 입 (이 보이게)
      if (!f.hurt) {
        c.beginPath(); c.moveTo(0.15, -0.28); c.quadraticCurveTo(0.24, -0.2, 0.33, -0.29); c.closePath();
        c.fillStyle = '#ffffff'; c.fill(); c.lineWidth = 0.03; c.strokeStyle = OUT; c.stroke();
      } else mouth(c, 0.24, -0.26, 0.05, -0.03);
    },
    engineer(c, P, f) {
      // 네모난 눈 (집중하는 표정)
      const xs = [0.1, 0.29], y = -0.5;
      if (f.hurt) hurtEyes(c, xs, y, 0.05);
      else if (f.blink) blinkEyes(c, xs, y, 0.06);
      else {
        xs.forEach((x, i) => {
          const w = 0.14 * (i ? 0.85 : 1);
          rr(c, x - w / 2, y - 0.075, w, 0.15, 0.05); ink(c, '#ffffff', 0.032);
          const px = x + f.look.x * 0.025, py = y + f.look.y * 0.025;
          rr(c, px - 0.032, py - 0.045, 0.064, 0.09, 0.025); c.fillStyle = OUT; c.fill();
          c.fillStyle = '#ffffff'; c.fillRect(px - 0.022, py - 0.035, 0.02, 0.02);
        });
        // 일자 눈썹 (집중)
        c.strokeStyle = OUT; c.lineWidth = 0.04;
        c.beginPath(); c.moveTo(0.03, -0.615); c.lineTo(0.17, -0.6); c.moveTo(0.23, -0.6); c.lineTo(0.35, -0.615); c.stroke();
      }
      mouth(c, 0.2, -0.3, 0.055, f.hurt ? -0.03 : 0.012);
    },
    frost(c, P, f) {
      // 차가운 눈매 (윗눈꺼풀이 반쯤 덮음)
      const xs = [0.12, 0.3], y = -0.45;
      if (f.hurt) { hurtEyes(c, xs, y, 0.05); return; }
      if (f.blink) { blinkEyes(c, xs, y, 0.065); return; }
      xs.forEach((x, i) => {
        const rx = 0.075 * (i ? 0.86 : 1);
        ell(c, x, y, rx, 0.06); c.fillStyle = '#ffffff'; c.fill(); c.lineWidth = 0.032; c.strokeStyle = OUT; c.stroke();
        const px = x + f.look.x * rx * 0.4, py = y + f.look.y * 0.02 + 0.01;
        ell(c, px, py, 0.034, 0.042); c.fillStyle = '#2a7fd0'; c.fill();
        c.fillStyle = '#ffffff'; c.beginPath(); c.arc(px - 0.012, py - 0.016, 0.012, 0, TAU); c.fill();
      });
      // 눈꺼풀 (비스듬히, 차분한 느낌)
      c.strokeStyle = OUT; c.lineWidth = 0.045; c.lineCap = 'round';
      c.beginPath(); c.moveTo(0.03, -0.49); c.lineTo(0.2, -0.505); c.moveTo(0.23, -0.505); c.lineTo(0.38, -0.49); c.stroke();
    },
  };

  // =========================================================
  //  drawWeapon — 무기 (손 위치에서 조준 방향을 +x 로), w.recoil 0~1
  //  tip: 총구 위치 (총구 불꽃)
  // =========================================================
  const WEAPON = {
    blaster: { pivot: [0.22, 0.04], tip: 0.7, kick: 0.14, draw(c, P, w) {
      ell(c, -0.06, 0, 0.13, 0.13); ink(c, P.dark);                    // 주먹
      rr(c, -0.04, -0.14, 0.62, 0.28, 0.11); ink(c, P.metal);           // 대포 몸
      rr(c, 0.1, -0.14, 0.12, 0.28, 0.03); c.fillStyle = w.tier >= 2 ? P.glow : P.main; c.fill();
      rr(c, 0.5, -0.17, 0.16, 0.34, 0.07); ink(c, w.tier >= 3 ? GOLD : P.main, 0.05); // 총구 고리
      c.fillStyle = H.hexAlpha(P.glow, 0.6 + 0.4 * Math.sin(w.time * 8));
      c.beginPath(); c.arc(0.6, 0, 0.075, 0, TAU); c.fill();
    } },
    // 가디언 방패: 돌리지 않고 늘 앞면이 보이게 (옆을 볼 때는 좁게, 아래를 볼 때는 넓게) — 조준 쪽 몸 앞에 듦
    guardian: { pivot: [0.02, 0.0], tip: 0.75, kick: 0, billboard: true,
      // face: 앞면이 보이는 정도 0(옆)~1(정면), back: 뒷면, sg: 오른쪽(1)/왼쪽(-1)을 향함, cast: 스킬 번쩍
      shape(c, P, tier, face, back, sg, cast) {
        const hw = 0.17 + 0.24 * face, h = 1.0;
        const shieldPath = (k) => {
          c.beginPath();
          c.moveTo(-hw * k, -h * 0.5 * k); c.lineTo(hw * k, -h * 0.5 * k); c.lineTo(hw * k, h * 0.08 * k);
          c.quadraticCurveTo(hw * k, h * 0.36 * k, 0, h * 0.52 * k); c.quadraticCurveTo(-hw * k, h * 0.36 * k, -hw * k, h * 0.08 * k);
          c.closePath();
        };
        // 두께 (몸 쪽으로 살짝 밀린 어두운 판)
        c.save(); c.translate(-sg * 0.07 * Math.sqrt(Math.max(0, 1 - face * face)), 0.03); shieldPath(1); ink(c, '#7a4f08'); c.restore();
        shieldPath(1); ink(c, cast ? '#fff6c8' : back ? P.dark : P.main);
        if (back) return;                                                   // 뒷면: 무늬 없음
        shieldPath(0.74); c.fillStyle = P.metal; c.fill();
        // 가운데 금색 줄 + 별
        c.fillStyle = tier >= 3 ? GOLD : P.main;
        rr(c, -0.04, -0.34, 0.08, 0.62, 0.03); c.fill();
        if (face > 0.35) {
          c.beginPath();
          for (let i = 0; i < 10; i++) {
            const a = -Math.PI / 2 + i * Math.PI / 5, R = i % 2 ? 0.055 : 0.13;
            if (i === 0) c.moveTo(Math.cos(a) * R, -0.05 + Math.sin(a) * R); else c.lineTo(Math.cos(a) * R, -0.05 + Math.sin(a) * R);
          }
          c.closePath(); ink(c, tier >= 3 ? GOLD : '#fff2b0', 0.03);
        }
        if (tier >= 2) { c.strokeStyle = H.hexAlpha(tier >= 3 ? GOLD : P.glow, 0.9); c.lineWidth = 0.035; shieldPath(0.88); c.stroke(); }
      } },
    medic: { pivot: [0.22, 0.06], tip: 0.5, kick: 0.08, draw(c, P, w) {
      ell(c, -0.04, 0, 0.11, 0.11); ink(c, P.head.main);
      rr(c, -0.02, -0.1, 0.44, 0.2, 0.09); ink(c, '#f4fffa');
      rr(c, 0.34, -0.12, 0.13, 0.24, 0.05); ink(c, w.tier >= 3 ? GOLD : P.main, 0.045);
      c.save(); c.translate(0.15, 0); SHAPE.plus(c, 0.05, w.tier >= 2 ? P.glow : '#22c47c'); c.restore();
    } },
    speeder: { pivot: [0.24, 0.06], tip: 0.55, kick: 0.09, draw(c, P, w) {
      ell(c, -0.04, 0, 0.1, 0.1); ink(c, P.main);
      c.beginPath(); c.moveTo(-0.02, -0.09); c.lineTo(0.44, -0.06); c.lineTo(0.54, 0); c.lineTo(0.44, 0.06); c.lineTo(-0.02, 0.09); c.closePath();
      ink(c, P.metal);
      rr(c, 0.08, -0.03, 0.26, 0.06, 0.03); c.fillStyle = w.tier >= 3 ? GOLD : w.tier >= 2 ? P.glow : P.trim; c.fill();
    } },
    engineer: { pivot: [0.24, 0.06], tip: 0.74, kick: 0.08, spin: true, draw(c, P, w) { // spin: 스킬을 쓰면 렌치를 한 바퀴 돌림
      ell(c, -0.04, 0, 0.11, 0.11); ink(c, P.trim);                       // 장갑
      rr(c, -0.02, -0.065, 0.52, 0.13, 0.05); ink(c, P.metal);
      // 렌치 머리 (C 모양)
      c.lineCap = 'butt';
      c.beginPath(); c.arc(0.6, 0, 0.16, 0.8, TAU - 0.8);
      c.lineWidth = 0.19; c.strokeStyle = OUT; c.stroke();
      c.lineWidth = 0.11; c.strokeStyle = P.metalL; c.stroke();
      // 에너지 구체 (턱 안)
      c.fillStyle = H.hexAlpha(w.tier >= 3 ? GOLD : w.tier >= 2 ? P.glow : '#c49bff', 0.75 + 0.25 * Math.sin(w.time * 6));
      c.beginPath(); c.arc(0.66, 0, 0.075, 0, TAU); c.fill();
    } },
    frost: { pivot: [0.22, 0.06], tip: 0.66, kick: 0.08, draw(c, P, w) {
      rr(c, -0.1, -0.14, 0.34, 0.28, 0.11); ink(c, '#dff6ff');           // 얼음 장갑
      c.beginPath(); c.moveTo(0.18, -0.11); c.lineTo(0.64, 0); c.lineTo(0.18, 0.11); c.closePath();
      const lg = c.createLinearGradient(0.18, 0, 0.64, 0);
      lg.addColorStop(0, '#9fe3ff'); lg.addColorStop(1, '#ffffff');
      ink(c, lg, 0.045);
      c.strokeStyle = 'rgba(63, 146, 216, 0.7)'; c.lineWidth = 0.025;
      c.beginPath(); c.moveTo(0.22, 0); c.lineTo(0.56, 0); c.stroke();
      if (w.tier >= 2) { c.fillStyle = H.hexAlpha(w.tier >= 3 ? GOLD : '#ffffff', 0.9); c.beginPath(); c.arc(0.64, 0, 0.05, 0, TAU); c.fill(); }
    } },
  };

  // 총구 불꽃 (쏜 직후)
  function muzzleFlash(c, x, k, color) {
    c.fillStyle = H.hexAlpha('#ffffff', 0.9 * k);
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = i * TAU / 10, R = (i % 2 ? 0.08 : 0.22) * (0.6 + 0.6 * k);
      const px = x + Math.cos(a) * R * 1.2, py = Math.sin(a) * R;
      if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
    }
    c.closePath(); c.fill();
    c.fillStyle = H.hexAlpha(color, 0.8 * k);
    c.beginPath(); c.arc(x, 0, 0.1 * (0.5 + k), 0, TAU); c.fill();
  }

  // =========================================================
  //  drawAccessory — 움직이는 장비 (layer: 'back' 몸 뒤 / 'front' 몸 앞)
  // =========================================================
  const ACC = {
    blaster(c, P, a, layer) {
      if (layer !== 'back' || a.speedK < 0.15) return;
      // 달릴 때 등 부스터 불꽃
      const fl = 0.1 + 0.16 * a.speedK + 0.05 * Math.sin(a.time * 40);
      c.fillStyle = 'rgba(255, 190, 90, 0.9)';
      c.beginPath(); c.moveTo(-0.58, 0.4); c.lineTo(-0.49, 0.4 + fl); c.lineTo(-0.4, 0.4); c.closePath(); c.fill();
    },
    guardian() {},
    medic(c, P, a, layer) {
      if (layer !== 'front') return;
      // 회복 드론 (어깨 뒤 위에 둥둥): 몸통 + 양쪽 프로펠러 + 아래 초록 불빛
      const x = -0.62, y = -0.88 + Math.sin(a.time * 3 + a.phase) * 0.06;
      c.fillStyle = H.hexAlpha(P.glow, 0.35 + 0.2 * Math.sin(a.time * 6));
      c.beginPath(); c.moveTo(x - 0.08, y + 0.08); c.lineTo(x + 0.08, y + 0.08); c.lineTo(x + 0.15, y + 0.32); c.lineTo(x - 0.15, y + 0.32); c.closePath(); c.fill();
      c.strokeStyle = OUT; c.lineWidth = 0.05;
      c.beginPath(); c.moveTo(x - 0.25, y - 0.04); c.lineTo(x + 0.25, y - 0.04);                  // 팔
      c.moveTo(x - 0.25, y - 0.04); c.lineTo(x - 0.25, y - 0.12); c.moveTo(x + 0.25, y - 0.04); c.lineTo(x + 0.25, y - 0.12); c.stroke();
      c.strokeStyle = 'rgba(235, 255, 247, 0.95)'; c.lineWidth = 0.035;                         // 프로펠러 (빙글)
      [-0.25, 0.25].forEach((o, i) => {
        const pw = 0.04 + 0.11 * Math.abs(Math.cos(a.time * 30 + i));
        c.beginPath(); c.moveTo(x + o - pw, y - 0.13); c.lineTo(x + o + pw, y - 0.13); c.stroke();
      });
      ell(c, x, y, 0.17, 0.12); ink(c, P.main, 0.045);
      c.save(); c.translate(x, y - 0.005); SHAPE.plus(c, 0.06, a.tier >= 3 ? GOLD : '#ffffff'); c.restore();
      if (a.cast > 0) {
        c.strokeStyle = H.hexAlpha(P.glow, a.cast);
        c.lineWidth = 0.05;
        c.beginPath(); c.arc(x, y, 0.2 + (1 - a.cast) * 0.5, 0, TAU); c.stroke();
      }
    },
    speeder(c, P, a, layer) {
      if (layer !== 'back') return;
      // 휘날리는 스카프 (분홍) — 달릴수록 길고 빠르게
      const n = 5, len = 0.13 + 0.07 * a.speedK, wv = 6 + 10 * a.speedK;
      c.beginPath();
      const top = [], bot = [];
      for (let i = 0; i <= n; i++) {
        const x = -0.16 - i * len;
        const y = -0.14 + Math.sin(a.time * wv - i * 0.9) * 0.025 * i + i * 0.03 * (1 - a.speedK);
        const wdt = 0.07 * (1 - i / (n + 1)) + 0.02;
        top.push([x, y - wdt]); bot.push([x, y + wdt]);
      }
      c.moveTo(top[0][0], top[0][1]);
      top.forEach(([x, y]) => c.lineTo(x, y));
      bot.reverse().forEach(([x, y]) => c.lineTo(x, y));
      c.closePath();
      ink(c, a.tier >= 3 ? GOLD : P.trim, 0.04);
      // 등 제트 불꽃 (노즐 2개)
      const fl = 0.08 + 0.26 * a.speedK + (a.dash ? 0.15 : 0);
      [-0.015, 0.165].forEach((y, i) => {
        const f = fl * (0.8 + 0.2 * Math.sin(a.time * 45 + i * 2));
        c.fillStyle = a.dash ? 'rgba(255, 230, 120, 0.95)' : 'rgba(255, 140, 220, 0.9)';
        c.beginPath(); c.moveTo(-0.64, y - 0.05); c.lineTo(-0.64 - f, y); c.lineTo(-0.64, y + 0.05); c.closePath(); c.fill();
        c.fillStyle = 'rgba(255, 255, 255, 0.9)';
        c.beginPath(); c.moveTo(-0.64, y - 0.025); c.lineTo(-0.64 - f * 0.5, y); c.lineTo(-0.64, y + 0.025); c.closePath(); c.fill();
      });
    },
    engineer(c, P, a, layer) {
      if (layer !== 'front') return;
      // 안테나 끝 불빛 (깜빡)
      const on = Math.sin(a.time * 5 + a.phase) > 0;
      ell(c, -0.44, -1.18, 0.07, 0.07);
      ink(c, a.tier >= 3 ? GOLD : on ? P.glow : '#4a3a70', 0.035);
    },
    frost(c, P, a, layer) {
      // 둘레를 도는 얼음 조각 3개 (뒤쪽 반은 몸 뒤에)
      for (let i = 0; i < 3; i++) {
        const ang = a.time * 1.5 + i * TAU / 3 + a.phase;
        const s = Math.sin(ang);
        if ((s < 0) !== (layer === 'back')) continue;
        const x = Math.cos(ang) * 0.66, y = -0.38 + s * 0.2;
        const k = 0.085 * (s < 0 ? 0.8 : 1);
        c.beginPath(); c.moveTo(x, y - k * 1.5); c.lineTo(x + k, y); c.lineTo(x, y + k * 1.5); c.lineTo(x - k, y); c.closePath();
        ink(c, a.tier >= 3 && i === 0 ? GOLD : '#eafaff', 0.03);
      }
      // 차가운 김 (가벼운 화질이 아니면)
      if (!lite && layer === 'front') {
        c.fillStyle = 'rgba(230, 248, 255, 0.7)';
        for (let i = 0; i < 2; i++) {
          const t = (a.time * 0.7 + i * 0.5 + a.phase) % 1;
          c.beginPath(); c.arc(0.3 + i * 0.12 + t * 0.1, 0.2 + t * 0.3, 0.035 * (1 - t), 0, TAU); c.fill();
        }
      }
    },
  };

  // =========================================================
  //  스킬을 쓸 때 캐릭터별 동작 (k: 1 → 0)
  // =========================================================
  const CAST = {
    blaster(c, P, k) { // 가슴 코어가 번쩍 + 불꽃이 사방으로
      c.strokeStyle = H.hexAlpha(P.glow, k); c.lineWidth = 0.07;
      c.beginPath(); c.arc(0.1, 0.1, 0.15 + (1 - k) * 0.55, 0, TAU); c.stroke();
      c.lineWidth = 0.05; c.lineCap = 'round';
      c.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = i * TAU / 8, r0 = 0.5 + (1 - k) * 0.4;
        c.moveTo(0.1 + Math.cos(a) * r0, -0.1 + Math.sin(a) * r0);
        c.lineTo(0.1 + Math.cos(a) * (r0 + 0.18), -0.1 + Math.sin(a) * (r0 + 0.18));
      }
      c.stroke();
    },
    guardian(c, P, k) { // 금빛 방어 고리 + 발 구르기 먼지
      c.strokeStyle = H.hexAlpha(GOLD, k); c.lineWidth = 0.08;
      c.beginPath(); c.ellipse(0, -0.2, 0.75 + (1 - k) * 0.3, 0.95 + (1 - k) * 0.3, 0, 0, TAU); c.stroke();
      c.fillStyle = 'rgba(220, 220, 240,' + 0.5 * k + ')';
      [-0.45, 0.45].forEach((x) => { c.beginPath(); c.arc(x * (1 + (1 - k) * 0.5), M.FOOT_Y, 0.08 + (1 - k) * 0.12, 0, TAU); c.fill(); });
    },
    medic(c, P, k) { // 초록 + 가 위로 떠오름
      for (let i = 0; i < 3; i++) {
        c.save();
        c.globalAlpha *= k;
        c.translate(-0.35 + i * 0.35, -0.75 - (1 - k) * 0.7 - (i % 2) * 0.12);
        SHAPE.plus(c, 0.08, P.glow);
        c.restore();
      }
    },
    speeder(c, P, k) { // 도착: 속도선
      c.strokeStyle = H.hexAlpha('#ffffff', 0.8 * k); c.lineWidth = 0.05; c.lineCap = 'round';
      c.beginPath();
      [-0.6, -0.25, 0.1, 0.35].forEach((y, i) => { const x0 = -0.75 - (i % 2) * 0.15; c.moveTo(x0, y); c.lineTo(x0 - 0.45 * k - 0.1, y); });
      c.stroke();
    },
    engineer(c, P, k) { // 볼트 조각이 튀고 전기 불꽃
      for (let i = 0; i < 4; i++) {
        const a = -Math.PI / 2 + (i - 1.5) * 0.7, d = 0.45 + (1 - k) * 0.6;
        const x = 0.1 + Math.cos(a) * d, y = -0.4 + Math.sin(a) * d;
        c.save(); c.translate(x, y); c.rotate((1 - k) * 6 + i);
        rr(c, -0.05, -0.05, 0.1, 0.1, 0.02); ink(c, H.hexAlpha(P.metalL, k), 0.025);
        c.restore();
      }
      c.strokeStyle = H.hexAlpha(P.glow, k); c.lineWidth = 0.04;
      c.beginPath(); c.moveTo(-0.44, -1.18); c.lineTo(-0.3, -1.32); c.lineTo(-0.2, -1.2); c.lineTo(-0.06, -1.36); c.stroke();
    },
    frost(c, P, k) { // 왕관이 빛나고 눈송이가 퍼짐
      c.fillStyle = H.hexAlpha('#ffffff', 0.5 * k);
      c.beginPath(); c.arc(0.03, -0.95, 0.3, 0, TAU); c.fill();
      c.strokeStyle = H.hexAlpha('#ffffff', k); c.lineWidth = 0.035;
      for (let i = 0; i < 5; i++) {
        const a = i * TAU / 5 - Math.PI / 2, d = 0.4 + (1 - k) * 0.7;
        const x = Math.cos(a) * d, y = -0.4 + Math.sin(a) * d * 0.8;
        c.beginPath();
        for (let j = 0; j < 3; j++) { const b = j * Math.PI / 3; c.moveTo(x - Math.cos(b) * 0.08, y - Math.sin(b) * 0.08); c.lineTo(x + Math.cos(b) * 0.08, y + Math.sin(b) * 0.08); }
        c.stroke();
      }
    },
  };

  // =========================================================
  //  몸 그림 한 장 (캐시) — 화면 배율·캐릭터·LEVEL 단계·팀마다 한 번만 그림
  // =========================================================
  const sprites = new Map();
  const SPRITE_MAX = 64;

  // =========================================================
  //  PNG 캐릭터 그림 — 그림이 있으면 그림, 못 불러오면 도형 캐릭터 (fallback)
  //  좌표는 높이 REF_H(400px) 그림 기준 픽셀 (다른 크기 그림으로 바꿔도 비율로 맞춤)
  //    foot    발이 바닥에 닿는 곳 → 발밑 팀 고리 가운데 (공중에 떠 보이지 않게)
  //    muzzle  무기 끝 → 총구 불꽃, 탄이 이 자리에서 나와 원래 길로 이어지는 것처럼 보임 (판정 자리는 그대로)
  //    dir     무기가 향한 방향 (그림 기준 각도, 오른쪽 = 0)
  //    head    얼굴 [x, y, 반지름] → HUD·팀 목록의 작은 얼굴 그림
  //  그림은 오른쪽(오른쪽 아래)을 봄 → 왼쪽을 조준하면 좌우 반전
  // =========================================================
  const SPRITE = {
    DIR: 'assets/characters/',
    REF_H: 400,
    GAMEPLAY_SCALE: 0.0046, // 경기 화면: 그림 1px = 0.0046m → 높이 약 1.84m (맵·장애물을 가리지 않게. 충돌 원 지름 1.4m 는 그대로)
    SELECTION_FILL: 0.96,   // 캐릭터 선택 화면: 그림이 카드 그림 칸을 거의 다 채우게 크게
    LIST: {
      blaster:  { foot: [158, 372], muzzle: [345, 282], dir: 0,     head: [165, 152, 118] },
      guardian: { foot: [165, 355], muzzle: [300, 262], dir: 0,     head: [175, 150, 112] },
      medic:    { foot: [152, 374], muzzle: [318, 282], dir: -0.05, head: [162, 165, 100] },
      speeder:  { foot: [165, 365], muzzle: [352, 278], dir: 0.08,  head: [182, 172, 108] },
      engineer: { foot: [170, 375], muzzle: [345, 252], dir: -0.4,  head: [186, 170, 112] },
      frost:    { foot: [150, 382], muzzle: [418, 215], dir: -0.45, head: [142, 178, 106] },
    },
  };
  const spriteImgs = {}; // charId → { img, state: 'loading' | 'ok' | 'fail', geo }

  function loadSprites() {
    if (typeof Image === 'undefined') return;
    Object.keys(SPRITE.LIST).forEach((id) => {
      if (spriteImgs[id]) return;
      const img = new Image();
      const s = { img, state: 'loading', geo: null };
      spriteImgs[id] = s;
      img.onload = () => { s.state = img.naturalWidth > 0 && img.naturalHeight > 0 ? 'ok' : 'fail'; spritesChanged(); };
      img.onerror = () => { s.state = 'fail'; spritesChanged(); };
      img.src = SPRITE.DIR + id + '.png';
    });
  }
  // 그림을 다 불러왔거나 실패하면 대기방·HUD 그림을 다시 그리게 알림
  function spritesChanged() {
    sprites.clear();
    try { window.dispatchEvent(new Event('cb-sprites')); } catch (e) { /* 오래된 브라우저 */ }
  }
  function spriteOf(charId) {
    const s = spriteImgs[charId];
    return s && s.state === 'ok' ? s : null;
  }
  // 그림 위치 (m, 캐릭터 위치 기준 몸 좌표: 발 = (0, FOOT_Y))
  function geomOf(charId, s) {
    if (s.geo) return s.geo;
    const L = SPRITE.LIST[charId];
    const k = s.img.naturalHeight / SPRITE.REF_H;          // 그림 크기가 400px 가 아니어도 비율로
    const mpp = SPRITE.GAMEPLAY_SCALE / k;
    const fx = L.foot[0] * k, fy = L.foot[1] * k;
    const at = (x, y) => ({ x: (x * k - fx) * mpp, y: M.FOOT_Y + (y * k - fy) * mpp });
    s.geo = {
      mpp,
      box: { x0: -fx * mpp, y0: M.FOOT_Y - fy * mpp, w: s.img.naturalWidth * mpp, h: s.img.naturalHeight * mpp },
      muzzle: at(L.muzzle[0], L.muzzle[1]), dir: L.dir || 0,
      head: { ...at(L.head[0], L.head[1]), r: L.head[2] * k * mpp },
    };
    return s.geo;
  }
  // 큰 그림을 작게 줄일 때 반씩 여러 번 줄여서 또렷하게
  function downscaleInto(img, cv) {
    let src = img, sw = img.naturalWidth, sh = img.naturalHeight;
    while (sw / 2 >= cv.width && sh / 2 >= cv.height) {
      const t = document.createElement('canvas');
      t.width = Math.ceil(sw / 2); t.height = Math.ceil(sh / 2);
      const tg = t.getContext('2d');
      tg.imageSmoothingQuality = 'high';
      tg.drawImage(src, 0, 0, t.width, t.height);
      src = t; sw = t.width; sh = t.height;
    }
    const g = cv.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(src, 0, 0, cv.width, cv.height);
  }
  // 화면 배율(q: 1m = q 픽셀)에 맞춘 그림 한 장 (처음 한 번만 줄여 두고 붙이기만 함)
  function pngSprite(charId, s, q) {
    const key = 'png|' + charId + '|' + q;
    let r = sprites.get(key);
    if (r) return r;
    const G = geomOf(charId, s);
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.ceil(G.box.w * q));
    cv.height = Math.max(1, Math.ceil(G.box.h * q));
    downscaleInto(s.img, cv);
    r = { cv, box: G.box, sil: {}, glow: {}, face: false, png: true, q };
    if (sprites.size >= SPRITE_MAX) sprites.delete(sprites.keys().next().value);
    sprites.set(key, r);
    return r;
  }
  // 외곽 빛 (LEVEL 2·3): 그림 모양을 둘레로 조금씩 밀어 겹친 테두리 빛 (흐림 효과 없이 — 태블릿에서도 가볍게)
  function glowOf(r, color) {
    let gl = r.glow[color];
    if (gl) return gl;
    const q = r.q, padPx = Math.ceil(0.1 * q) + 2;
    const cv = document.createElement('canvas');
    cv.width = r.cv.width + padPx * 2; cv.height = r.cv.height + padPx * 2;
    const g = cv.getContext('2d');
    const sil = silhouette(r, color);
    const rad = 0.075 * q;
    g.globalAlpha = 0.26;
    for (let i = 0; i < 12; i++) { const a = i * TAU / 12; g.drawImage(sil, padPx + Math.cos(a) * rad, padPx + Math.sin(a) * rad); }
    g.globalAlpha = 0.5;
    for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + 0.4; g.drawImage(sil, padPx + Math.cos(a) * rad * 0.45, padPx + Math.sin(a) * rad * 0.45); }
    gl = { cv, pad: padPx / q };
    r.glow[color] = gl;
    return gl;
  }
  // 나중에 다른 그림으로 바꾸기: useImage('blaster', 이미지) — 발·무기 위치는 SPRITE.LIST 값을 씀
  function useImage(charId, img) {
    if (!SPRITE.LIST[charId] || !img) return;
    spriteImgs[charId] = { img, state: img.complete && img.naturalWidth ? 'ok' : 'loading', geo: null };
    if (!img.complete) {
      img.addEventListener('load', () => { spriteImgs[charId].state = 'ok'; spritesChanged(); });
      img.addEventListener('error', () => { spriteImgs[charId].state = 'fail'; spritesChanged(); });
    }
    spritesChanged();
  }
  function spriteStates() {
    const out = {};
    Object.keys(SPRITE.LIST).forEach((id) => { out[id] = spriteImgs[id] ? spriteImgs[id].state : 'none'; });
    return out;
  }

  function drawBaseBody(g, charId, tier, team) {
    const B = BODY[charId] || BODY.blaster;
    B(g, PAL[charId] || PAL.blaster, tier, team);
  }

  // 도형 캐릭터(fallback) 몸 그림 한 장
  function bodySprite(charId, tier, team, ppm) {
    const q = Math.max(8, Math.round(ppm * 2) / 2);
    const key = charId + '|' + tier + '|' + team.id + '|' + q;
    let s = sprites.get(key);
    if (s) return s;
    const box = BOX;
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.ceil(box.w * q));
    cv.height = Math.max(1, Math.ceil(box.h * q));
    const g = cv.getContext('2d');
    g.setTransform(q, 0, 0, q, -box.x0 * q, -box.y0 * q);
    g.lineJoin = 'round';
    g.lineCap = 'round';
    drawBaseBody(g, charId, tier, team);
    s = { cv, box, sil: {}, face: true, q };
    if (sprites.size >= SPRITE_MAX) sprites.delete(sprites.keys().next().value);
    sprites.set(key, s);
    return s;
  }
  // 몸 모양 그대로 한 가지 색 (맞으면 번쩍, 얼면 얼음색, 잔상)
  function silhouette(s, color) {
    let cv = s.sil[color];
    if (cv) return cv;
    cv = document.createElement('canvas');
    cv.width = s.cv.width; cv.height = s.cv.height;
    const g = cv.getContext('2d');
    g.drawImage(s.cv, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = color;
    g.fillRect(0, 0, cv.width, cv.height);
    s.sil[color] = cv;
    return cv;
  }
  function blit(c, cv, box) { c.drawImage(cv, box.x0, box.y0, box.w, box.h); }

  // 얼굴·무기·빛 그림도 한 번 그려 두고 붙임 (작은 그림 여러 장 — 표정 14가지, 무기, 방패 각도, 발밑 고리)
  const parts = new Map();
  const FBOX = { x0: -0.2, y0: -0.74, w: 0.76, h: 0.64 };   // 얼굴
  const WBOX = { x0: -0.26, y0: -0.3, w: 1.16, h: 0.6 };    // 무기 (손 위치 기준, 오른쪽을 향함)
  const GBOX = { x0: -0.5, y0: -0.6, w: 1.0, h: 1.2 };      // 가디언 방패
  const GLBOX = { x0: -1.06, y0: -1.31, w: 2.12, h: 2.12 }; // LEVEL 3 MAX 몸 뒤 금빛
  function cached(key, box, q, fn) {
    let cv = parts.get(key);
    if (cv) return cv;
    cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.ceil(box.w * q));
    cv.height = Math.max(1, Math.ceil(box.h * q));
    const g = cv.getContext('2d');
    g.setTransform(q, 0, 0, q, -box.x0 * q, -box.y0 * q);
    g.lineJoin = 'round';
    g.lineCap = 'round';
    fn(g);
    if (parts.size >= 240) parts.delete(parts.keys().next().value);
    parts.set(key, cv);
    return cv;
  }

  // =========================================================
  //  움직임 상태 — 모든 기기에서 그리는 쪽이 알아냄 (통신 그대로)
  // =========================================================
  const anims = new Map();
  const seen = new WeakSet();
  let primed = false;
  function animOf(p, time) {
    let a = anims.get(p.id);
    if (!a) {
      a = { x: p.x, y: p.y, t: time, vx: 0, vy: 0, spd: 0, flip: Math.cos(p.facing || 0) < 0 ? -1 : 1,
            fireT: -9, castT: -9, hitT: -9, lastFlash: 0, phase: (seedOf(p.id) % 628) / 100, seenT: time };
      anims.set(p.id, a);
    }
    return a;
  }
  // 매 프레임 한 번 (Renderer.render): 걸음 빠르기 · 새 탄(쏨) · 새 스킬 원(스킬) · 맞음
  function track(world, time) {
    curTime = time;
    if (!world || !world.players) return;
    world.players.forEach((p) => {
      if (!p.id) return;
      const a = animOf(p, time);
      const dt = time - a.t;
      if (dt > 0) {
        const dx = p.x - a.x, dy = p.y - a.y;
        if (dx * dx + dy * dy > 9 || dt > 0.3) { a.vx = 0; a.vy = 0; } // 재등장·순간이동
        else {
          const k = Math.min(1, dt * 10);
          a.vx += (dx / dt - a.vx) * k;
          a.vy += (dy / dt - a.vy) * k;
        }
        a.spd = Math.hypot(a.vx, a.vy);
        a.x = p.x; a.y = p.y; a.t = time;
      }
      const hf = p.hitFlash || 0;
      if (hf > a.lastFlash + 1e-4) a.hitT = time;
      a.lastFlash = hf;
      a.seenT = time;
    });
    (world.projectiles || []).forEach((b) => {
      if (seen.has(b)) return;
      seen.add(b);
      if (!primed || b.fromTurret) return;
      const a = anims.get(b.ownerId);
      if (a) a.fireT = time;
    });
    (world.areas || []).forEach((ar) => {
      if (seen.has(ar)) return;
      seen.add(ar);
      if (!primed || (ar.age || 0) > 0.6) return;
      const a = anims.get(ar.ownerId);
      if (a) a.castT = time;
    });
    (world.effects || []).forEach((e) => {
      if (seen.has(e)) return;
      seen.add(e);
      if (!primed || e.kind !== 'blinkTrail' || !e.pid) return;
      const a = anims.get(e.pid);
      if (a) a.castT = time;
    });
    primed = true;
    if (anims.size > 40) anims.forEach((a, id) => { if (time - a.seenT > 10) anims.delete(id); });
  }

  // =========================================================
  //  drawSkillAura — 발밑 (메딕 회복 오라 범위, LEVEL 2 강조 고리, LEVEL 3 MAX 금빛 오라)
  // =========================================================
  function drawSkillAura(c, p, P, tier, time, icon) {
    const fy = p.y + M.FOOT_Y;
    if (p.charId === 'medic' && CHARACTERS.medic.passive && !icon) {
      c.save();
      if (!lite) { c.setLineDash([0.3, 0.35]); c.lineDashOffset = -time * 0.4; }
      c.strokeStyle = 'rgba(109, 255, 168, 0.22)';
      c.lineWidth = 0.05;
      c.beginPath(); c.arc(p.x, p.y, CHARACTERS.medic.passive.r, 0, TAU); c.stroke();
      c.restore();
    }
    if (tier >= 3) {
      // 금빛 오라: 발밑에 도는 금색 고리 + 올라가는 반짝임
      const g = 0.55 + 0.3 * Math.sin(time * 4);
      c.save();
      c.strokeStyle = 'rgba(255, 216, 77,' + g + ')';
      c.lineWidth = 0.07;
      if (!lite) { c.setLineDash([0.32, 0.2]); c.lineDashOffset = -time * 1.4; }
      c.beginPath(); c.ellipse(p.x, fy, M.RING_RX + 0.16, M.RING_RY + 0.1, 0, 0, TAU); c.stroke();
      c.restore();
      if (!lite && !icon) {
        c.fillStyle = '#fff2b0';
        for (let i = 0; i < 3; i++) {
          const t = (time * 0.8 + i / 3) % 1;
          const ang = i * 2.1 + time * 0.5;
          const x = p.x + Math.cos(ang) * 0.7, y = fy - t * 1.4;
          const s = 0.06 * Math.sin(t * Math.PI);
          c.beginPath(); c.moveTo(x, y - s * 2); c.lineTo(x + s, y); c.lineTo(x, y + s * 2); c.lineTo(x - s, y); c.closePath(); c.fill();
        }
      }
    } else if (tier >= 2) {
      c.strokeStyle = H.hexAlpha(P.glow, 0.85);
      c.lineWidth = 0.05;
      c.beginPath(); c.ellipse(p.x, fy, M.RING_RX - 0.14, M.RING_RY - 0.08, 0, 0, TAU); c.stroke();
    }
  }

  // 발밑 그림자 + 팀 색 고리 + 조준 방향 화살표 (+ 내 캐릭터는 흰 점선 고리)
  //   그림자와 고리는 팀마다 한 번 그려 두고 붙임, 화살표만 매 프레임
  const RBOX = { x0: -0.9, y0: -0.45, w: 1.8, h: 0.9 };
  function drawFootRing(c, p, team, time, isLocal, q) {
    const fy = p.y + M.FOOT_Y;
    const ring = cached('ring|' + team.id + '|' + q, RBOX, q, (g) => {
      g.fillStyle = 'rgba(0, 0, 0, 0.35)';
      g.beginPath(); g.ellipse(0, 0.03, 0.62, 0.25, 0, 0, TAU); g.fill();
      g.fillStyle = H.hexAlpha(team.color, 0.2);
      g.beginPath(); g.ellipse(0, 0, M.RING_RX, M.RING_RY, 0, 0, TAU); g.fill();
      g.strokeStyle = team.color;
      g.lineWidth = 0.1;
      g.stroke();
    });
    c.drawImage(ring, p.x + RBOX.x0, fy + RBOX.y0, RBOX.w, RBOX.h);
    // 조준 방향 화살표 (고리 위)
    const f = p.facing || 0, ca = Math.cos(f), sa = Math.sin(f);
    const ex = p.x + ca * (M.RING_RX + 0.06), ey = fy + sa * (M.RING_RY + 0.04);
    c.fillStyle = team.color;
    c.beginPath();
    c.moveTo(ex + ca * 0.24, ey + sa * 0.13);
    c.lineTo(ex - sa * 0.16, ey + ca * 0.09);
    c.lineTo(ex + sa * 0.16, ey - ca * 0.09);
    c.closePath();
    c.fill();
    c.lineWidth = 0.03; c.strokeStyle = OUT; c.stroke();
    if (isLocal) {
      c.save();
      if (!lite) { c.setLineDash([0.25, 0.18]); c.lineDashOffset = -time * 0.8; }
      c.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      c.lineWidth = 0.05;
      c.beginPath(); c.ellipse(p.x, fy, M.RING_RX + 0.2, M.RING_RY + 0.13, 0, 0, TAU); c.stroke();
      c.restore();
    }
  }

  // 발 2개 (걸으면 번갈아 앞뒤로, 살짝 들림)
  function drawFeet(c, P, charId, walk) {
    const big = charId === 'guardian';
    const rx = big ? 0.19 : 0.14, ry = big ? 0.1 : 0.085;
    const xs = big ? [-0.24, 0.26] : [-0.17, 0.19];
    xs.forEach((x, i) => {
      const s = walk.on ? Math.sin(walk.ph + i * Math.PI) : 0;
      ell(c, x + s * 0.08, M.FOOT_Y - Math.max(0, s) * 0.05, rx, ry);
      ink(c, P.metal === '#d9f7ea' ? '#3fb985' : P.metal, 0.05);
    });
  }

  // =========================================================
  //  한 캐릭터 전체 그리기
  //  p: { id, x, y, facing, charId, skillLevel, hitFlash, slowFactor, dashTimer, kbT, kbX, kbY, isLocal }
  //  o: { icon: true → 움직임 없는 그림 (대기방·HUD) }
  // =========================================================
  // 한 캐릭터 전체 그리기 — 캐릭터 그림(PNG)이 있으면 drawSprite, 없으면 drawLegacyCharacter (fallback)
  function draw(c, p, time, team, o) {
    const opt = o || {};
    const charId = PAL[p.charId] ? p.charId : 'blaster';
    const P = PAL[charId];
    const lvl = p.skillLevel | 0;
    const tier = lvl >= 3 ? 3 : lvl >= 2 ? 2 : 1;
    const a = !opt.icon && p.id ? animOf(p, time) : null;
    const f0 = p.facing || 0;
    const S = spriteOf(charId);       // PNG 그림 (불러오지 못했으면 null → 도형 캐릭터)

    // 좌우 뒤집기 (조준이 왼쪽이면 왼쪽을 봄, 가운데쯤에서는 떨지 않게 그대로)
    let flip = a ? a.flip : (Math.cos(f0) < 0 ? -1 : 1);
    if (a) {
      const cf = Math.cos(f0);
      if (cf < -0.2) flip = -1; else if (cf > 0.2) flip = 1;
      a.flip = flip;
    }
    // LEVEL 3 MAX 가 된 순간 (짧은 MAX 효과)
    if (a) {
      if (a.tier !== undefined && tier >= 3 && a.tier < 3) a.maxT = time;
      a.tier = tier;
    }
    // 움직임 값
    const spd = a ? a.spd : 0;
    const speedK = clamp01(spd / 5);
    const moving = spd > 0.6;
    const ph = a ? a.phase : 0;
    const walkPh = time * 11 + ph;
    const kFire = a ? clamp01(1 - (time - a.fireT) / 0.18) : 0;
    const recoil = kFire * kFire;
    const kHit = a ? clamp01(1 - (time - a.hitT) / 0.28) : 0;
    const kCast = a ? clamp01(1 - (time - a.castT) / 0.5) : 0;
    const kMax = a && a.maxT !== undefined ? clamp01(1 - (time - a.maxT) / 1.1) : 0;
    const breath = opt.icon ? 0 : Math.sin(time * 2.6 + ph);

    let sx = 1 - (moving ? 0 : 0.014 * breath), sy = 1 + (moving ? 0 : 0.024 * breath);
    sx *= 1 + 0.05 * recoil; sy *= 1 - 0.05 * recoil;               // 쏘면 살짝 눌림
    sx *= 1 - 0.07 * kCast * kCast; sy *= 1 + 0.13 * kCast * kCast; // 스킬: 쭉 늘어남
    const hop = moving ? -Math.abs(Math.sin(walkPh)) * 0.08 * Math.max(0.4, speedK) : 0;
    let lean = a ? Math.max(-0.16, Math.min(0.16, a.vx * 0.03)) : 0;
    if (charId === 'speeder' && !S) lean += flip * (0.08 + 0.1 * speedK);   // 도형 스피더: 앞으로 기운 자세 (그림은 이미 달리는 자세)
    // 그림: 위·아래를 조준하면 살짝만 기울임 (8방향 그림이 아니므로 아주 조금)
    const tilt = S && !opt.icon ? 0.1 * Math.sin(f0) * flip : 0;
    const shakeX = kHit > 0 ? Math.sin((time - a.hitT) * 75) * 0.075 * kHit : 0;
    const back = -0.05 * recoil;
    const bx = Math.cos(f0) * back, by = Math.sin(f0) * back;

    // 몸 기준 조준 각도 (뒤집기·기울기 반영) — 무기 방향과 눈동자
    const rel = f0 - lean;
    const aimL = flip > 0 ? rel : Math.PI - rel;

    // ---- 바닥: 오라 · 그림자 · 팀 고리 (캐릭터보다 아래) ----
    if (!opt.noRing) drawSkillAura(c, p, P, tier, time, !!opt.icon);
    const tf = c.getTransform();
    const ppm0 = Math.hypot(tf.a, tf.b);
    const K = S ? 1 : M.SCALE;                      // 도형 캐릭터는 조금 키워서 그림
    const ppm = ppm0 * K;
    const q = Math.max(8, Math.round(ppm * 2) / 2); // 작은 그림들의 해상도 (1m = q 픽셀)
    if (!opt.noRing) drawFootRing(c, p, team, time, !!p.isLocal && !opt.icon, Math.max(8, Math.round(ppm0 * M.SCALE * 2) / 2));
    if (kMax > 0 && !opt.noRing) {
      // MAX 순간: 발밑에서 금빛 고리가 퍼짐
      c.strokeStyle = H.hexAlpha(GOLD, kMax);
      c.lineWidth = 0.09;
      c.beginPath(); c.ellipse(p.x, p.y + M.FOOT_Y, M.RING_RX + (1 - kMax) * 1.1, M.RING_RY + (1 - kMax) * 0.5, 0, 0, TAU); c.stroke();
    }

    // 밀려나는 중: 밀리는 반대쪽으로 흰 줄기 (블래스터 폭발)
    if (p.kbT > 0 && (p.kbX || p.kbY)) {
      const k = Math.atan2(p.kbY, p.kbX);
      c.strokeStyle = 'rgba(255, 230, 240,' + Math.min(0.8, p.kbT * 4) + ')';
      c.lineWidth = 0.09;
      c.lineCap = 'round';
      for (let i = -1; i <= 1; i++) {
        const ox = -Math.sin(k) * i * 0.3, oy = Math.cos(k) * i * 0.3 + M.CENTER_Y;
        c.beginPath();
        c.moveTo(p.x - Math.cos(k) * 0.8 + ox, p.y - Math.sin(k) * 0.8 + oy);
        c.lineTo(p.x - Math.cos(k) * 1.6 + ox, p.y - Math.sin(k) * 1.6 + oy);
        c.stroke();
      }
    }

    const spr = S ? pngSprite(charId, S, q) : bodySprite(charId, tier, team, ppm);

    // 스피더 잔상: 달리거나 가속 중이면 지나온 자리에 흐린 몸 2개
    if (a && charId === 'speeder' && (p.dashTimer > 0 || speedK > 0.85) && spd > 0.5 && !lite) {
      const ux = a.vx / spd, uy = a.vy / spd;
      const ghost = silhouette(spr, p.dashTimer > 0 ? GOLD : P.trim);
      [[0.5, 0.28], [1.0, 0.13]].forEach(([d, al]) => {
        c.save();
        c.globalAlpha *= al;
        c.translate(p.x - ux * d, p.y - uy * d + M.FOOT_Y);
        c.rotate(lean + tilt); c.scale(flip * K, K); c.translate(0, -M.FOOT_Y);
        blit(c, ghost, spr.box);
        c.restore();
      });
    }

    // ---- 몸 기준 좌표로 (발 위치를 축으로 기울이고 눌리고 뒤집음) ----
    const ox = p.x + shakeX + bx, oy = p.y + M.FOOT_Y + hop + by;
    const rot = lean + tilt, SX = flip * sx * K, SY = sy * K;
    c.save();
    c.translate(ox, oy);
    c.rotate(rot);
    c.scale(SX, SY);
    c.translate(0, -M.FOOT_Y);
    c.lineJoin = 'round';
    c.lineCap = 'round';

    const pose = { time, ph, tier, kFire, recoil, kHit, kCast, kMax, aimL, moving, walkPh, speedK, f0, icon: !!opt.icon, q };
    const muzzle = S ? drawSprite(c, p, charId, P, S, spr, pose) : drawLegacyCharacter(c, p, charId, P, spr, pose);
    if (kCast > 0) CAST[charId](c, P, kCast);
    c.restore();

    // 무기 끝 자리 (화면 좌표) — 탄이 무기에서 나와 원래 길로 이어지는 것처럼 보이게 (render.js)
    if (a && muzzle) {
      const X = SX * muzzle.x, Y = SY * (muzzle.y - M.FOOT_Y);
      const cr = Math.cos(rot), sr = Math.sin(rot);
      a.muzzle = { x: ox + X * cr - Y * sr, y: oy + X * sr + Y * cr };
      a.muzzleT = time;
    }
  }

  // ---- PNG 그림 캐릭터 ----
  //  외곽 빛(LEVEL 2 약하게 · LEVEL 3 MAX 금색으로 조금 더) → 그림 → 맞음 번쩍 · 느려짐 얼음색 → 총구 불꽃
  //  돌려주는 값: 무기 끝 (몸 좌표)
  function drawSprite(c, p, charId, P, S, spr, w) {
    const G = geomOf(charId, S);
    if (w.tier >= 2 || w.kMax > 0) {
      const gold = w.tier >= 3;
      const gl = glowOf(spr, gold ? GOLD : P.glow);
      const pulse = 0.5 + 0.5 * Math.sin(w.time * 3.2);
      const al = gold ? (lite ? 0.75 : 0.7 + 0.25 * pulse) : (lite ? 0.45 : 0.4 + 0.15 * pulse);
      c.save();
      c.globalAlpha *= Math.min(1, al + 0.6 * w.kMax);
      c.drawImage(gl.cv, spr.box.x0 - gl.pad, spr.box.y0 - gl.pad, spr.box.w + gl.pad * 2, spr.box.h + gl.pad * 2);
      c.restore();
    }
    blit(c, spr.cv, spr.box);
    // 맞았을 때 몸 모양 그대로 하얗게 번쩍
    if (p.hitFlash > 0) {
      c.save();
      c.globalAlpha *= Math.min(0.8, p.hitFlash / 0.15 * 0.8);
      blit(c, silhouette(spr, '#ffffff'), spr.box);
      c.restore();
    }
    // 느려짐: 몸이 얼음색으로 덮임
    if (p.slowFactor < 1) {
      c.save();
      c.globalAlpha *= 0.36;
      blit(c, silhouette(spr, '#9ee8ff'), spr.box);
      c.restore();
    }
    // MAX 순간: 몸이 금빛으로 번쩍
    if (w.kMax > 0.4) {
      c.save();
      c.globalAlpha *= (w.kMax - 0.4) / 0.6 * 0.55;
      blit(c, silhouette(spr, '#fff2b0'), spr.box);
      c.restore();
    }
    // 쏜 직후: 무기 끝 불꽃 (가디언은 방패로 밀어내는 빛)
    if (w.kFire > 0.3) {
      const k = (w.kFire - 0.3) / 0.7;
      c.save();
      c.translate(G.muzzle.x, G.muzzle.y);
      if (charId === 'guardian') {
        c.strokeStyle = 'rgba(255, 246, 200,' + k + ')';
        c.lineWidth = 0.08;
        c.beginPath(); c.arc(0.05, 0, 0.32 + (1 - k) * 0.35, -1.1, 1.1); c.stroke();
      } else {
        c.rotate(G.dir);
        muzzleFlash(c, 0, k, P.glow);
      }
      c.restore();
    }
    return G.muzzle;
  }

  // ---- 도형 캐릭터 (PNG 를 불러오지 못했을 때) ----
  function drawLegacyCharacter(c, p, charId, P, spr, w) {
    const W = WEAPON[charId];
    const wpose = { recoil: w.recoil, tier: w.tier, time: w.time, cast: w.kCast };
    const acc = { time: w.time, phase: w.ph, speedK: w.speedK, tier: w.tier, cast: w.kCast, dash: p.dashTimer > 0 };
    const weaponBehind = Math.sin(w.f0) < -0.45; // 위쪽을 조준하면 무기가 몸 뒤로
    const q = w.q;

    // LEVEL 3 MAX: 몸 뒤 은은한 빛
    if (w.tier >= 3 && !lite) {
      const glow = cached('glow|' + q, GLBOX, q, (g) => {
        const gl = g.createRadialGradient(0, -0.25, 0.1, 0, -0.25, 1.05);
        gl.addColorStop(0, H.hexAlpha(GOLD, 0.45));
        gl.addColorStop(1, H.hexAlpha(GOLD, 0));
        g.fillStyle = gl;
        g.beginPath(); g.arc(0, -0.25, 1.05, 0, TAU); g.fill();
      });
      c.save();
      c.globalAlpha *= 0.8 + 0.2 * Math.sin(w.time * 3);
      c.drawImage(glow, GLBOX.x0, GLBOX.y0, GLBOX.w, GLBOX.h);
      c.restore();
    }

    ACC[charId](c, P, acc, 'back');
    if (weaponBehind) drawWeapon(c, W, P, wpose, w.aimL, w.kFire, q, charId);
    drawFeet(c, P, charId, { on: w.moving, ph: w.walkPh });
    blit(c, spr.cv, spr.box);
    {
      // 표정: 맞음(> <) · 깜빡임 · 조준 방향 12가지 — 미리 그려 둔 얼굴 그림을 붙임
      const blink = !w.icon && ((w.time + w.ph * 3) % 3.7) < 0.12;
      const dir = ((Math.round(w.aimL / (TAU / 12)) % 12) + 12) % 12;
      const state = w.kHit > 0.15 ? 'h' : blink ? 'b' : 'n' + dir;
      const fcv = cached('f|' + charId + '|' + state + '|' + q, FBOX, q, (g) => {
        const ang = dir * TAU / 12;
        drawFace(g, charId, P, { look: { x: Math.cos(ang), y: Math.sin(ang) }, blink: state === 'b', hurt: state === 'h', cast: false });
      });
      c.drawImage(fcv, FBOX.x0, FBOX.y0, FBOX.w, FBOX.h);
    }
    // 맞았을 때 몸 모양 그대로 하얗게 번쩍
    if (p.hitFlash > 0) {
      c.save();
      c.globalAlpha *= Math.min(0.85, p.hitFlash / 0.15 * 0.85);
      blit(c, silhouette(spr, '#ffffff'), spr.box);
      c.restore();
    }
    // 느려짐: 몸이 얼음색으로 덮임
    if (p.slowFactor < 1) {
      c.save();
      c.globalAlpha *= 0.38;
      blit(c, silhouette(spr, '#9ee8ff'), spr.box);
      c.restore();
    }
    if (!weaponBehind) drawWeapon(c, W, P, wpose, w.aimL, w.kFire, q, charId);
    ACC[charId](c, P, acc, 'front');
    // 무기 끝 (몸 좌표)
    if (W.billboard) return { x: W.pivot[0] + Math.cos(w.aimL) * 0.5, y: W.pivot[1] + Math.sin(w.aimL) * 0.25 };
    return { x: W.pivot[0] + Math.cos(w.aimL) * W.tip, y: W.pivot[1] + Math.sin(w.aimL) * W.tip };
  }

  function drawFace(c, charId, P, f) {
    (FACE[charId] || FACE.blaster)(c, P, f);
  }

  // 무기: 한 번 그려 둔 그림을 조준 방향으로 돌려 붙임 (q 없으면 바로 그림)
  function drawWeapon(c, W, P, w, aimL, kFire, q, charId) {
    c.save();
    c.translate(W.pivot[0], W.pivot[1]);
    if (W.billboard) {
      // 가디언 방패: 조준 쪽 몸 앞에 들고, 앞면이 늘 보이게 (옆을 볼 때 좁게)
      const ca = Math.cos(aimL), sa = Math.sin(aimL);
      const d = 0.5 + 0.16 * w.recoil;                                    // 쏘면 방패로 밀어냄 (앞으로)
      c.translate(ca * d, sa * d * 0.5 + 0.04);
      const step = Math.round(Math.abs(sa) * 5), back = sa < -0.45 ? 1 : 0, sg = ca < 0 ? -1 : 1, cast = w.cast > 0 ? 1 : 0;
      const draw = (g) => W.shape(g, P, w.tier, step / 5, back, sg, cast);
      if (q) c.drawImage(cached('gw|' + w.tier + '|' + step + '|' + back + '|' + sg + '|' + cast + '|' + q, GBOX, q, draw), GBOX.x0, GBOX.y0, GBOX.w, GBOX.h);
      else draw(c);
    } else {
      c.rotate(aimL + (W.spin && w.cast > 0 ? (1 - w.cast) * TAU : 0));
      c.translate(-W.kick * w.recoil, 0);
      if (q) c.drawImage(cached('w|' + charId + '|' + w.tier + '|' + q, WBOX, q, (g) => W.draw(g, P, { tier: w.tier, time: 0 })), WBOX.x0, WBOX.y0, WBOX.w, WBOX.h);
      else W.draw(c, P, w);
    }
    c.restore();
    if (kFire > 0.35 && !W.billboard) {
      c.save();
      c.translate(W.pivot[0], W.pivot[1]);
      c.rotate(aimL);
      muzzleFlash(c, W.tip - W.kick * w.recoil, (kFire - 0.35) / 0.65, P.glow);
      c.restore();
    }
  }

  // 대기방·팀 목록·HUD 그림 (움직임 없음) — 캔버스(size 픽셀, 변환 없음)에 맞춰 그림
  //   mode 'card'     캐릭터 선택 카드: 그림 전체를 크게 (selectionScale)
  //        'full'     LEVEL 미리 보기: 발밑 고리·LEVEL 빛까지
  //        'portrait' HUD·팀 목록: 얼굴을 크게
  function drawIcon(c, size, charId, team, mode, level) {
    const S = spriteOf(charId);
    let cx, cy, span, noRing;
    if (S) {
      const G = geomOf(charId, S);
      if (mode === 'portrait') { cx = G.head.x; cy = G.head.y; span = G.head.r * 2.15; noRing = true; }
      else if (mode === 'card') {
        cx = G.box.x0 + G.box.w / 2; cy = G.box.y0 + G.box.h / 2;
        span = Math.max(G.box.w, G.box.h) / SPRITE.SELECTION_FILL; noRing = true;
      } else {
        const left = Math.min(G.box.x0, -M.RING_RX - 0.25), right = Math.max(G.box.x0 + G.box.w, M.RING_RX + 0.25);
        const top = G.box.y0, bottom = M.FOOT_Y + M.RING_RY + 0.14;
        cx = (left + right) / 2; cy = (top + bottom) / 2;
        span = Math.max(right - left, bottom - top) / 0.95; noRing = false;
      }
    } else {
      // 도형 캐릭터 (그림을 불러오지 못했을 때)
      const portrait = mode === 'portrait';
      span = portrait ? 1.7 : 2.45;
      cx = portrait ? 0.08 : 0.04; cy = portrait ? -0.45 : -0.27;
      noRing = portrait;
    }
    const k = size / span;
    c.setTransform(k, 0, 0, k, size / 2 - cx * k, size / 2 - cy * k);
    const p = { x: 0, y: 0, facing: -0.3, charId, skillLevel: level || 1, hitFlash: 0, slowFactor: 1 };
    draw(c, p, 0.4, team, { icon: true, noRing });
    return !!S;
  }

  // 무기 끝 (화면 좌표) — 이번 화면에서 그린 캐릭터만
  let curTime = 0;
  function muzzleOf(id) {
    const a = anims.get(id);
    return a && a.muzzle && a.muzzleT === curTime ? a.muzzle : null;
  }
  function usingSprite(charId) { return !!spriteOf(charId); }

  return {
    init, setLite, track, draw, drawIcon, useImage, metrics: M, palette: PAL,
    muzzleOf, usingSprite, spriteStates, sprite: SPRITE, loadSprites,
    // 나중에 스프라이트로 바꿀 때 하나씩 쓸 수 있게
    drawBaseBody, drawFace, drawWeapon: (c, charId, w, aim) => drawWeapon(c, WEAPON[charId], PAL[charId], w, aim, 0, 0, charId),
    drawAccessory: (c, charId, a, layer) => ACC[charId](c, PAL[charId], a, layer),
    drawSkillAura,
  };
})();
