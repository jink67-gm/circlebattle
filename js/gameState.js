/* ============================================================
   서클 배틀 - 게임 상태 관리 (gameState.js)
   ------------------------------------------------------------
   게임이 지금 어떤 화면(상태)인지 한 곳에서만 관리합니다.
   다른 파일은 GameState.change('PLAYING') 처럼 여기에 요청만 합니다.
   ============================================================ */

const STATES = {
  TITLE: 'TITLE',
  TEACHER_LOGIN: 'TEACHER_LOGIN',
  LOBBY: 'LOBBY',
  CHARACTER_SELECT: 'CHARACTER_SELECT', // 예약: 캐릭터 고르기는 대기방(LOBBY) 안에서 함
  COUNTDOWN: 'COUNTDOWN',
  PLAYING: 'PLAYING',
  MATH_MISSION: 'MATH_MISSION',
  RESULT: 'RESULT',
};

const GameState = {
  current: null,
  listeners: [],

  // 상태를 바꾸고, 등록된 함수들에게 알려줍니다.
  change(next) {
    if (!STATES[next]) {
      console.warn('[GameState] 알 수 없는 상태:', next);
      return;
    }
    const prev = this.current;
    if (prev === next) return;
    this.current = next;
    document.body.dataset.state = next; // CSS에서 상태별로 화면을 바꿀 때 사용
    this.listeners.forEach((fn) => fn(next, prev));
  },

  // 상태가 바뀔 때 실행할 함수를 등록합니다.
  onChange(fn) {
    this.listeners.push(fn);
  },

  is(state) {
    return this.current === state;
  },
};
