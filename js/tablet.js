/* ============================================================
   서클 배틀 - 태블릿 도우미 (tablet.js)
   ------------------------------------------------------------
   STEP 20
   ■ 화면 꺼짐 방지 (Wake Lock)
     대기방·경기 중에는 태블릿 화면이 저절로 꺼지지 않게 합니다.
     특히 교사 기기가 잠들면 모든 학생의 경기가 멈추므로 중요합니다.
     (지원: 크롬·삼성 인터넷, iPad Safari 16.4 이상. 안 되는 기기는 설정에서 "자동 잠금 안 함")
   ■ 두 손가락 확대, 두 번 눌러 확대, 길게 눌러 메뉴 막기
     (iPad Safari 는 CSS 만으로는 확대를 막지 못해 여기서 막습니다)
   ============================================================ */

const Tablet = (function () {
  let lock = null;
  let want = false;
  let pending = false;

  function supported() {
    return 'wakeLock' in navigator && typeof navigator.wakeLock.request === 'function';
  }

  function acquire() {
    if (!supported() || lock || pending || document.hidden || !want) return;
    pending = true;
    navigator.wakeLock.request('screen').then((l) => {
      pending = false;
      if (!want) { l.release().catch(() => {}); return; }
      lock = l;
      lock.addEventListener('release', () => { lock = null; });
    }).catch(() => { pending = false; lock = null; }); // 배터리 절약 모드 등으로 거절되면 그냥 넘어감
  }

  function release() {
    if (lock) lock.release().catch(() => {});
    lock = null;
  }

  // 시작 화면·교사 PIN 화면이 아니면 깨어 있게
  function update() {
    want = !!GameState.current && !GameState.is(STATES.TITLE) && !GameState.is(STATES.TEACHER_LOGIN);
    if (want) acquire(); else release();
  }

  function isTyping(t) {
    return !!(t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA'));
  }

  function init() {
    GameState.onChange(update);
    // 화면을 다시 켜거나 탭으로 돌아오면 다시 요청 (브라우저가 저절로 풀어 버림)
    document.addEventListener('visibilitychange', () => { if (!document.hidden) acquire(); });
    // 어떤 브라우저는 화면을 한 번 눌러야 허락함
    window.addEventListener('pointerdown', acquire, true);

    // iPad Safari: 두 손가락 확대 막기
    ['gesturestart', 'gesturechange', 'gestureend'].forEach((ev) =>
      document.addEventListener(ev, (e) => e.preventDefault(), { passive: false }));
    // 두 손가락 이상으로 움직일 때 화면이 확대·이동되지 않게 (한 손가락 스크롤은 그대로)
    document.addEventListener('touchmove', (e) => {
      if (e.touches.length > 1) e.preventDefault();
    }, { passive: false });
    // 두 번 눌러 확대 막기
    document.addEventListener('dblclick', (e) => { if (!isTyping(e.target)) e.preventDefault(); }, { passive: false });
    // 길게 눌렀을 때 나오는 메뉴 막기 (입력 칸 제외)
    document.addEventListener('contextmenu', (e) => { if (!isTyping(e.target)) e.preventDefault(); });
    update();
  }

  return { init, isAwake: () => !!lock, wakeLockSupported: supported };
})();
