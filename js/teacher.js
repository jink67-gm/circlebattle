/* ============================================================
   서클 배틀 - 교사용 화면 (teacher.js)
   ------------------------------------------------------------
   STEP 15
   [교사용] → PIN 입력 → 설정 → [방 만들기] → 교사용 대기방

   - PIN은 config.js 의 CONFIG.TEACHER_PIN 한 곳에서만 바꿉니다.
     (GitHub Pages에서는 누구나 파일을 볼 수 있으니 가벼운 잠금으로만 생각하세요)
   - 마지막으로 고른 설정은 이 기기에 기억해 두었다가 다음에 그대로 보여줍니다.
   ============================================================ */

const Teacher = (function () {
  const el = {};
  let pin = '';
  let onDone = null;         // 설정을 마쳤을 때 부를 함수 (settings)
  let settings = null;       // 고르는 중인 설정
  const STORE_KEY = 'circleBattle.teacherSettings';

  // 설정 화면에 보일 항목 (순서대로)
  const FIELDS = [
    { key: 'gameMinutes', label: '게임 시간', text: (v) => v + '분' },
    { key: 'targetScore', label: '목표 점수', text: (v) => v + '점' },
    { key: 'difficulty', label: '문제 난이도', text: (v) => ({ easy: '쉬움', normal: '보통', hard: '어려움' }[v]) },
    { key: 'pi', label: '원주율', text: (v) => String(v), hint: '이번 경기의 모든 문제와 정답을 이 원주율로 계산해요' }, // 수정 STEP 3
    { key: 'capSeconds', label: '점령 문제 시간', text: (v) => v + '초', // 수정 STEP 6
      hint: '학습 결과에 "시간 초과"가 많으면 늘려 주세요' },
    { key: 'missionLimit', label: '수학 미션 수', text: (v) => v + '문제', hint: '한 학생이 한 경기에서 풀 수 있는 최대 문제 수' },
    { key: 'teamSize', label: '팀 크기', text: (v) => v + ' 대 ' + v, hint: '한 팀 최대 인원 (넘치는 학생은 관전)' },
    { key: 'allowDuplicateCharacters', label: '같은 캐릭터', text: (v) => (v ? '여러 명 가능' : '팀마다 한 명'), options: [true, false] },
    { key: 'specialsEnabled', label: '특수기', text: (v) => (v ? '사용' : '사용 안 함'), options: [true, false] },
    { key: 'respawnSeconds', label: '재등장 시간', text: (v) => v + '초' },
    { key: 'teacherRole', label: '선생님', text: (v) => (v === 'play' ? '함께 참가' : '관전 (TV 화면)'), options: ['spectate', 'play'] },
    { key: 'fillWithBots', label: '빈자리 채우기', text: (v) => (v ? '봇으로 인원 맞춤' : '채우지 않음'), options: [true, false] },
  ];

  function init() {
    el.screen = document.getElementById('teacher-screen');
    el.pinPanel = document.getElementById('pin-panel');
    el.setPanel = document.getElementById('settings-panel');
    el.pinDots = document.getElementById('pin-dots');
    el.pinMsg = document.getElementById('pin-msg');
    el.fields = document.getElementById('settings-fields');
    el.createBtn = document.getElementById('btn-create-room');

    document.querySelectorAll('.pk').forEach((b) => b.addEventListener('click', () => pinKey(b.dataset.k)));
    document.getElementById('btn-pin-back').addEventListener('click', cancel);
    document.getElementById('btn-settings-back').addEventListener('click', cancel);
    el.createBtn.addEventListener('click', done);
    // PC 키보드로도 PIN 입력
    window.addEventListener('keydown', (e) => {
      if (!GameState.is(STATES.TEACHER_LOGIN) || el.pinPanel.hidden) return;
      const d = e.code.match(/^(Digit|Numpad)(\d)$/);
      if (d) pinKey(d[2]);
      else if (e.code === 'Backspace') pinKey('back');
      else if (e.code === 'Escape') cancel();
    });
  }

  // ---------------- PIN ----------------
  let onCancel = null;
  /**
   * @param opts { current, done(settings), cancel(), skipPin, buttonText }
   *   current  : 지금 설정 (설정 바꾸기일 때)
   *   skipPin  : 이미 PIN을 넣었으면 true (방 안에서 설정 바꾸기)
   */
  function open(opts) {
    onDone = opts.done;
    onCancel = opts.cancel;
    settings = { ...(opts.current || loadSettings()) };
    el.createBtn.textContent = opts.buttonText || '방 만들기';
    GameState.change(STATES.TEACHER_LOGIN);
    if (opts.skipPin) showSettings();
    else showPin();
  }

  function showPin() {
    pin = '';
    el.pinMsg.textContent = '';
    el.pinPanel.hidden = false;
    el.setPanel.hidden = true;
    renderPin();
  }

  function renderPin() {
    el.pinDots.innerHTML = '';
    for (let i = 0; i < CONFIG.TEACHER_PIN.length; i++) {
      const d = document.createElement('span');
      d.className = 'pin-dot' + (i < pin.length ? ' on' : '');
      el.pinDots.appendChild(d);
    }
  }

  function pinKey(k) {
    if (el.pinPanel.hidden) return;
    if (k === 'back') pin = pin.slice(0, -1);
    else if (pin.length < CONFIG.TEACHER_PIN.length) pin += k;
    renderPin();
    if (pin.length === CONFIG.TEACHER_PIN.length) {
      if (pin === CONFIG.TEACHER_PIN) {
        setTimeout(showSettings, 150);
      } else {
        el.pinMsg.textContent = 'PIN이 맞지 않아요. 다시 입력해 주세요.';
        el.pinPanel.classList.remove('shake');
        void el.pinPanel.offsetWidth;
        el.pinPanel.classList.add('shake');
        pin = '';
        setTimeout(renderPin, 250);
      }
    }
  }

  // ---------------- 설정 ----------------
  function optionsFor(f) {
    return f.options || CONFIG.ROOM_OPTIONS[f.key];
  }

  function showSettings() {
    el.pinPanel.hidden = true;
    el.setPanel.hidden = false;
    renderSettings();
  }

  function renderSettings() {
    el.fields.innerHTML = '';
    FIELDS.forEach((f) => {
      const row = document.createElement('div');
      row.className = 'set-row';
      row.innerHTML = '<div class="set-label">' + f.label + (f.hint ? '<small>' + f.hint + '</small>' : '') + '</div>';
      const seg = document.createElement('div');
      seg.className = 'seg';
      optionsFor(f).forEach((v) => {
        const b = document.createElement('button');
        b.className = 'seg-btn' + (settings[f.key] === v ? ' on' : '');
        b.textContent = f.text(v);
        b.dataset.key = f.key;
        b.addEventListener('click', () => { settings[f.key] = v; renderSettings(); });
        seg.appendChild(b);
      });
      row.appendChild(seg);
      el.fields.appendChild(row);
    });
  }

  function done() {
    saveSettings(settings);
    const cb = onDone;
    onDone = onCancel = null;
    if (cb) cb({ ...settings });
  }

  function cancel() {
    const cb = onCancel;
    onDone = onCancel = null;
    if (cb) cb();
  }

  // ---------------- 설정 기억 (이 기기) ----------------
  function loadSettings() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch (e) { saved = null; }
    const s = { ...CONFIG.ROOM_DEFAULTS };
    if (saved) {
      FIELDS.forEach((f) => {
        if (optionsFor(f).indexOf(saved[f.key]) !== -1) s[f.key] = saved[f.key];
      });
    }
    return s;
  }
  function saveSettings(s) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (e) { /* 무시 */ }
  }

  // 설정 한 줄 요약 (교사용 대기방)
  function summary(s) {
    const diff = { easy: '쉬움', normal: '보통', hard: '어려움' }[s.difficulty];
    return [
      s.gameMinutes + '분',
      '목표 ' + s.targetScore + '점',
      '난이도 ' + diff,
      '원주율 ' + (s.pi || CONFIG.ROOM_DEFAULTS.pi),
      '점령 문제 ' + (s.capSeconds || CONFIG.ROOM_DEFAULTS.capSeconds) + '초',
      '미션 ' + s.missionLimit + '문제',
      s.teamSize + ' 대 ' + s.teamSize,
      s.allowDuplicateCharacters ? '같은 캐릭터 여러 명' : '같은 캐릭터 팀마다 한 명',
      s.specialsEnabled ? '특수기 사용' : '특수기 없음',
      '재등장 ' + s.respawnSeconds + '초',
      s.teacherRole === 'play' ? '선생님 참가' : '선생님 관전',
    ].join(' · ');
  }

  return { init, open, summary, FIELDS };
})();
