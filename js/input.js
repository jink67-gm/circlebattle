/* ============================================================
   서클 배틀 - 조작 입력 (input.js)
   ------------------------------------------------------------
   키보드·마우스·터치 조이스틱을 하나로 모아 게임에 알려줍니다.
   게임은 아래 함수만 부르면 되고, 입력이 어디서 왔는지 몰라도 됩니다.
     Input.getMove()     이동 방향 {x, y} (길이 0~1)
     Input.getAim()      지금 조준 중인 방향 정보
     Input.takeFires()   이번 프레임에 들어온 발사 명령 목록

   PC    : WASD/방향키 이동, 마우스 조준, 왼쪽 클릭(또는 스페이스바) 발사
   태블릿 : 왼쪽 아래 → 이동 조이스틱
            오른쪽 아래 → 공격 조이스틱
              · 끌어서 조준하고 손을 떼면 발사
              · 끌지 않고 톡 누르면 가장 가까운 상대에게 자동 조준 발사
              · 끌었다가 가운데로 되돌려 떼면 발사 취소

   STEP 9 특수기
   PC    : E 키 또는 마우스 오른쪽 버튼을 누르고 있으면 범위 미리보기 → 떼면 사용
           (마우스 위치에 원이 놓임, Esc 로 취소)
   태블릿 : [특수기] 버튼을 누른 채 끌어서 원을 놓을 곳을 정하고 떼면 사용
           톡 누르면 내 자리(블래스터는 가까운 상대)에 사용, 끌었다 되돌려 떼면 취소
   ============================================================ */

const Input = (function () {
  // ---------------- 키보드 ----------------
  // e.code(키의 위치)를 사용합니다. 한글 입력 상태에서도 W 키가 'KeyW'로 들어옵니다.
  const KEYMAP = {
    KeyW: 'up', ArrowUp: 'up',
    KeyS: 'down', ArrowDown: 'down',
    KeyA: 'left', ArrowLeft: 'left',
    KeyD: 'right', ArrowRight: 'right',
  };
  const keys = { up: false, down: false, left: false, right: false };

  // ---------------- 조이스틱 ----------------
  const DEAD_ZONE = 0.15;    // 살짝 닿은 정도는 무시
  const AIM_DRAG = 0.35;     // 공격 조이스틱을 이만큼 끌어야 "조준했다"로 봄

  function makeStick(id, maxPx) {
    return {
      id, max: maxPx,
      el: null, knob: null,
      pointerId: null,
      baseX: 0, baseY: 0,    // 조이스틱 중심 (화면 px)
      dx: 0, dy: 0,          // -1 ~ 1
      dragged: false,        // 한 번이라도 충분히 끌었는지 (공격 조이스틱용)
    };
  }
  const moveStick = makeStick('joystick-move', 55);
  const aimStick = makeStick('joystick-aim', 55);
  const specialStick = makeStick('joystick-special', 55); // [특수기] 버튼을 눌러 시작
  const sticks = [moveStick, aimStick, specialStick];

  // 특수기 (PC): E 키 / 마우스 오른쪽 버튼을 누르고 있는 동안 미리보기
  let specialHeld = null;      // null | 'key' | 'mouse'
  // 특수기 사용 명령: { kind: 'mouse' } | { kind: 'vector', dx, dy } | { kind: 'tap' }
  let specialQueue = [];

  // ---------------- 마우스 ----------------
  const mouse = { active: false, x: 0, y: 0 }; // 화면 좌표(px)

  // 발사 명령 대기열: { kind: 'mouse' } | { kind: 'angle', angle } | { kind: 'auto' }
  let fireQueue = [];
  let enabled = true;

  function init() {
    sticks.forEach((s) => {
      s.el = document.getElementById(s.id);
      s.knob = s.el.querySelector('.joy-knob');
    });

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    // 창 밖을 클릭하면 키가 눌린 채로 남는 문제 방지
    window.addEventListener('blur', resetAll);

    const area = document.getElementById('game-screen');
    area.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
    // 오른쪽 클릭 메뉴가 뜨지 않게
    area.addEventListener('contextmenu', (e) => e.preventDefault());

    // [특수기] 버튼: 누르면 그 자리에서 특수기 조이스틱 시작
    const spBtn = document.getElementById('btn-special');
    if (spBtn) spBtn.addEventListener('pointerdown', onSpecialButtonDown);

    // 주소에 ?touch=1 을 붙이면 PC에서도 조이스틱을 보여줍니다 (테스트용)
    if (new URLSearchParams(location.search).get('touch') === '1') setTouchMode(true);
    else if (window.matchMedia && matchMedia('(pointer: coarse)').matches) setTouchMode(true);
  }

  function isTouchMode() {
    return document.body.classList.contains('touch-mode');
  }
  function setTouchMode(on) {
    document.body.classList.toggle('touch-mode', on);
    if (on) mouse.active = false;
  }

  // 관전 중에는 입력을 받지 않습니다.
  function setEnabled(on) {
    enabled = on;
    if (!on) resetAll();
  }

  // ---------------- 키보드 ----------------
  // 닉네임·방 번호 입력 칸에 글자를 쓰는 중이면 게임 조작으로 쓰지 않음
  function isTyping(e) {
    const t = e.target;
    return !!(t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA'));
  }

  function onKeyDown(e) {
    if (isTyping(e)) return;
    // 특수기: E 누르고 있기 → 떼면 사용 / Esc 취소
    if (e.code === 'KeyE') {
      if (enabled && !e.repeat && !specialHeld) specialHeld = 'key';
      e.preventDefault();
      return;
    }
    if (e.code === 'Escape') {
      specialHeld = null;
      if (specialStick.pointerId !== null) releaseStick(specialStick);
      return;
    }
    if (e.code === 'Space') {
      if (enabled && !e.repeat) fireQueue.push(mouse.active ? { kind: 'mouse' } : { kind: 'auto' });
      e.preventDefault();
      return;
    }
    const dir = KEYMAP[e.code];
    if (!dir) return;
    keys[dir] = true;
    e.preventDefault(); // 방향키로 화면이 스크롤되지 않게
  }
  function onKeyUp(e) {
    if (isTyping(e)) return;
    if (e.code === 'KeyE' && specialHeld === 'key') {
      specialHeld = null;
      if (enabled) specialQueue.push(mouse.active ? { kind: 'mouse' } : { kind: 'tap' });
      return;
    }
    const dir = KEYMAP[e.code];
    if (dir) keys[dir] = false;
  }

  // ---------------- [특수기] 버튼 (태블릿) ----------------
  function onSpecialButtonDown(e) {
    if (!enabled || specialStick.pointerId !== null) return;
    e.preventDefault();
    e.stopPropagation();
    // PC 마우스로 버튼을 클릭하면: 바로 사용 (마우스 방향 조준은 E 키/오른쪽 버튼)
    if (e.pointerType === 'mouse' && !isTouchMode()) {
      specialQueue.push({ kind: 'tap' });
      return;
    }
    const s = specialStick;
    const rect = e.currentTarget.getBoundingClientRect();
    s.pointerId = e.pointerId;
    s.baseX = rect.left + rect.width / 2;
    s.baseY = rect.top + rect.height / 2;
    s.dx = s.dy = 0;
    s.dragged = false;
    s.el.classList.add('active');
    s.max = (s.el.offsetWidth || 140) * 0.4;
    placeStick(s);
  }

  // ---------------- 누르기 / 끌기 / 떼기 ----------------
  // 화면 아래쪽 70% 중 왼쪽 45%는 이동, 오른쪽 55%는 공격
  function stickForPoint(x, y) {
    if (y < window.innerHeight * 0.3) return null;
    return x < window.innerWidth * 0.45 ? moveStick : aimStick;
  }

  function onPointerDown(e) {
    if (e.pointerType === 'touch' && !isTouchMode()) setTouchMode(true);
    if (!enabled || e.target.closest('button')) return;

    // PC 마우스: 왼쪽 버튼 클릭 = 마우스 방향으로 발사, 오른쪽 버튼 누르고 있기 = 특수기
    if (e.pointerType === 'mouse' && !isTouchMode()) {
      mouse.active = true;
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      if (e.button === 0) fireQueue.push({ kind: 'mouse' });
      if (e.button === 2 && !specialHeld) specialHeld = 'mouse';
      return;
    }

    // 터치(또는 ?touch=1 에서 마우스): 조이스틱
    const s = stickForPoint(e.clientX, e.clientY);
    if (!s || s.pointerId !== null) return;
    s.pointerId = e.pointerId;
    s.baseX = e.clientX;
    s.baseY = e.clientY;
    s.dx = s.dy = 0;
    s.dragged = false;
    s.el.classList.add('active');
    s.max = (s.el.offsetWidth || 140) * 0.4; // 화면 크기에 맞춘 조이스틱 크기
    placeStick(s);
    e.preventDefault();
  }

  function onPointerMove(e) {
    if (e.pointerType === 'mouse' && !isTouchMode()) {
      mouse.active = true;
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      return;
    }
    const s = sticks.find((st) => st.pointerId === e.pointerId);
    if (!s) return;
    let mx = e.clientX - s.baseX;
    let my = e.clientY - s.baseY;
    const dist = Math.hypot(mx, my);
    if (dist > s.max) {
      mx = mx / dist * s.max;
      my = my / dist * s.max;
    }
    s.dx = mx / s.max;
    s.dy = my / s.max;
    if (Math.hypot(s.dx, s.dy) > AIM_DRAG) s.dragged = true;
    placeStick(s);
  }

  function onPointerUp(e) {
    // PC 마우스 오른쪽 버튼을 떼면 특수기 사용
    if (e.pointerType === 'mouse' && !isTouchMode() && e.button === 2 && specialHeld === 'mouse') {
      specialHeld = null;
      if (enabled) specialQueue.push({ kind: 'mouse' });
      return;
    }
    const s = sticks.find((st) => st.pointerId === e.pointerId);
    if (!s) return;
    if (s === specialStick && enabled) {
      const len = Math.hypot(s.dx, s.dy);
      if (!s.dragged) specialQueue.push({ kind: 'tap' });
      else if (len > DEAD_ZONE) specialQueue.push({ kind: 'vector', dx: s.dx, dy: s.dy });
      // 끌었다가 되돌려 뗌 → 취소
      releaseStick(s);
      return;
    }
    if (s === aimStick && enabled) {
      const len = Math.hypot(s.dx, s.dy);
      if (!s.dragged) {
        fireQueue.push({ kind: 'auto' });                       // 톡 누름 → 자동 조준
      } else if (len > DEAD_ZONE) {
        fireQueue.push({ kind: 'angle', angle: Math.atan2(s.dy, s.dx) }); // 조준한 방향
      }
      // 끌었다가 가운데로 되돌려 뗌 → 취소 (아무것도 안 함)
    }
    releaseStick(s);
  }

  // 알림창 등으로 터치가 끊기면 발사하지 않고 놓기만 합니다.
  function onPointerCancel(e) {
    const s = sticks.find((st) => st.pointerId === e.pointerId);
    if (s) releaseStick(s);
  }

  function releaseStick(s) {
    s.pointerId = null;
    s.dx = s.dy = 0;
    s.dragged = false;
    s.el.classList.remove('active');
    s.el.style.left = s.el.style.top = '';   // 원래 자리로
    s.knob.style.transform = '';
  }

  function placeStick(s) {
    s.el.style.left = s.baseX + 'px';
    s.el.style.top = s.baseY + 'px';
    s.knob.style.transform = 'translate(' + (s.dx * s.max) + 'px,' + (s.dy * s.max) + 'px)';
  }

  function resetAll() {
    keys.up = keys.down = keys.left = keys.right = false;
    sticks.forEach((s) => { if (s.pointerId !== null) releaseStick(s); });
    fireQueue = [];
    specialHeld = null;
    specialQueue = [];
  }

  // ---------------- 게임이 읽어 가는 값 ----------------
  /**
   * 이동 방향을 돌려줍니다. 길이는 0 ~ 1 입니다.
   * (1이면 최고 속도, 조이스틱을 조금만 밀면 천천히)
   */
  function getMove() {
    if (!enabled) return { x: 0, y: 0 };

    // 조이스틱 우선
    const jl = Math.hypot(moveStick.dx, moveStick.dy);
    if (moveStick.pointerId !== null && jl > DEAD_ZONE) {
      const strength = Math.min(1, (jl - DEAD_ZONE) / (1 - DEAD_ZONE));
      return { x: moveStick.dx / jl * strength, y: moveStick.dy / jl * strength };
    }

    // 키보드: 대각선도 같은 속도가 되도록 길이를 1로 맞춥니다.
    let x = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    let y = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
    const len = Math.hypot(x, y);
    if (len > 0) { x /= len; y /= len; }
    return { x, y };
  }

  /**
   * 지금 조준 중인 방향 정보
   *   { kind: 'stick', angle }  공격 조이스틱을 끌고 있음 (조준선 표시)
   *   { kind: 'mouse', x, y }   PC 마우스 위치 (화면 px)
   *   null                      조준 중 아님
   */
  function getAim() {
    if (!enabled) return null;
    if (aimStick.pointerId !== null && aimStick.dragged &&
        Math.hypot(aimStick.dx, aimStick.dy) > DEAD_ZONE) {
      return { kind: 'stick', angle: Math.atan2(aimStick.dy, aimStick.dx) };
    }
    if (mouse.active && !isTouchMode()) return { kind: 'mouse', x: mouse.x, y: mouse.y };
    return null;
  }

  // 쌓인 발사 명령을 꺼내 갑니다. (꺼내면 비워짐)
  function takeFires() {
    const list = fireQueue;
    fireQueue = [];
    return list;
  }

  /**
   * 특수기 미리보기 중인지와 원을 놓을 곳
   *   { kind: 'mouse', x, y }     PC: 마우스 위치 (화면 px)
   *   { kind: 'vector', dx, dy }  태블릿: 버튼에서 끈 방향과 정도 (-1~1)
   *   { kind: 'self' }            눌렀지만 아직 끌지 않음
   *   null                        미리보기 아님
   */
  function getSpecialAim() {
    if (!enabled) return null;
    if (specialStick.pointerId !== null) {
      if (!specialStick.dragged) return { kind: 'self' };
      return { kind: 'vector', dx: specialStick.dx, dy: specialStick.dy };
    }
    if (specialHeld) return mouse.active ? { kind: 'mouse', x: mouse.x, y: mouse.y } : { kind: 'self' };
    return null;
  }

  function takeSpecialCasts() {
    const list = specialQueue;
    specialQueue = [];
    return list;
  }

  return { init, getMove, getAim, takeFires, setEnabled, getSpecialAim, takeSpecialCasts,
    isEnabled: () => enabled }; // STEP 18: 환경설정 창을 닫을 때 원래대로
})();
