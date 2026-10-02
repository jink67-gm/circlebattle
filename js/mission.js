/* ============================================================
   서클 배틀 - 수학 미션 창 (mission.js)
   ------------------------------------------------------------
   STEP 11: 에너지 터미널에서 여는 짧은 문제 창
     - 숫자를 크게 보여주고, 화면 숫자 패드(태블릿)나 키보드 숫자(PC)로 답을 입력
     - 문제를 푸는 동안 캐릭터는 움직이지 못함 (게임은 뒤에서 계속 진행)
     - [닫기]로 나가면 같은 문제가 다음에 그대로 나옴 (문제 바꾸기 방지)
   STEP 12: 문제은행 연결
     - 고르기 문제(TYPE 4): 숫자 패드 대신 [A가 더 넓다] [B가 더 넓다] [넓이가 같다] 버튼
     - 오답 처리 (정답을 바로 보여주지 않음)
         숫자 문제  1번째 "다시 계산해보세요." → 2번째 힌트 → 3번째 정답과 풀이
         고르기 문제 1번째 힌트(고른 버튼은 흐리게) → 2번째 정답과 풀이
     - 정답과 풀이를 본 문제는 "틀림"으로 기록
   STEP 13: 정답 보상
     - 정답이면 창 안에서 "정답! ⚡ +20"과 보너스 3개 중 하나를 고름
       (탄약 즉시 충전 / 5초 보호막 / 3초 가속, 6초 안에 안 고르면 탄약 자동)
     - 실제 보상 적용은 게임(game.js)이 결과를 받아서 처리
   수정 STEP 2: 점령 문제 (mode: 'capture')
     - 제한 시간 30초 (막대로 표시). 시간이 끝나면 점령 도전 실패
     - 1번째 오답 "다시 계산해보세요." → 2번째 힌트 → 3번째 점령 도전 실패
     - 정답이면 "정답! 점령 활성화!"를 잠깐 보여주고 닫힘 (보너스 고르기 없음)
     - [포기]로 닫으면 5초 뒤 다시 도전 (같은 존이면 같은 문제)
   ============================================================ */

const Mission = (function () {
  const el = {};
  let current = null;   // 지금 열린 문제
  let input = '';       // 입력 중인 답 (문자열)
  let openedAt = 0;     // 문제를 연 시각 (풀이 시간 기록용)
  let wrongCount = 0;   // 이번 문제에서 틀린 횟수
  let hintShown = false;
  let onFinish = null;  // 문제를 끝냈을 때 부를 함수 (결과를 게임에 알림)
  let onClose = null;   // 풀지 않고 닫았을 때 부를 함수
  let kind = 'terminal'; // 'terminal' 에너지 터미널 / 'capture' 점령 문제 (수정 STEP 2)
  let timeLeft = 0;     // 점령 문제 남은 시간 (초)
  let timeLimit = 0;
  let tickTimer = null;
  let isPaused = null;  // 혼자 연습에서 설정 창을 열면 시간이 멈춤
  let correctText = ''; // 수정 STEP 4: 터미널 정답 때 보여줄 글 (예: "정답! LEVEL 2")
  let getBoost = null;  // 수정 STEP 5: 정답이면 TEAM BOOST 고르기 ({ options, auto } 를 돌려주는 함수, 없으면 null)
  let boost = null;

  // 몇 번째 오답에 힌트 / 정답 공개 (기획서 39: 첫 오답 "다시", 두 번째 오답 힌트)
  // 고르기 문제는 보기가 3개라 두 번 틀리면 남은 하나가 정답 → 정답 공개까지 가지 않음
  const HINT_AT = { number: 2, choice: 2 };
  const REVEAL_AT = { number: 3, choice: 3 };
  const CAPTURE_FAIL_AT = 3; // 점령 문제: 세 번째 오답이면 도전 실패

  function init() {
    el.panel = document.getElementById('mission-panel');
    el.count = document.getElementById('mission-count');
    el.level = document.getElementById('mission-level');
    el.question = document.getElementById('mission-question');
    el.answer = document.getElementById('mission-answer');
    el.unit = document.getElementById('mission-unit');
    el.feedback = document.getElementById('mission-feedback');
    el.hint = document.getElementById('mission-hint');
    el.choices = document.getElementById('mission-choices');
    el.ok = document.getElementById('mission-ok');
    el.close = document.getElementById('mission-close');
    el.title = document.getElementById('mission-title');
    el.timer = document.getElementById('mission-timer');
    el.timerFill = document.getElementById('mission-timer-fill');
    el.timerText = document.getElementById('mission-timer-text');
    el.goal = document.getElementById('mission-goal');
    el.panel.addEventListener('animationend', () => el.panel.classList.remove('shake'));

    // 숫자 패드
    document.querySelectorAll('.mk').forEach((b) => {
      b.addEventListener('click', () => press(b.dataset.k));
    });
    el.ok.addEventListener('click', submit);
    el.close.addEventListener('click', () => close(false));

    // 미션 창이 열려 있을 때는 키보드 입력을 미션 창이 먼저 가져갑니다.
    // (숫자 1~6이 캐릭터 바꾸기, H·G·R·E 가 다른 기능으로 새지 않게)
    window.addEventListener('keydown', onKey, true);
  }

  function isChoice() {
    return !!(current && current.choices);
  }
  function mode() {
    return isChoice() ? 'choice' : 'number';
  }
  function locked() {
    return el.panel.classList.contains('solved');
  }
  function rewarding() {
    return el.panel.classList.contains('reward-mode');
  }
  function revealed() {
    return el.panel.classList.contains('revealed');
  }

  function onKey(e) {
    if (!isOpen()) return;
    if (typeof Settings !== 'undefined' && Settings.isOpen()) return; // STEP 18: 설정 창이 위에 있으면 설정 창이 먼저
    e.stopImmediatePropagation();
    e.preventDefault();
    const digit = e.code.match(/^(Digit|Numpad)(\d)$/);
    // 수정 STEP 5: TEAM BOOST 고르기 — 1·2·3·4 키, Enter 는 추천
    if (rewarding()) {
      const list = boost ? boost.options : [];
      const o = digit && list[Number(digit[2]) - 1];
      if (o && !o.disabled) pickReward(o.id);
      else if ((e.code === 'Enter' || e.code === 'NumpadEnter') && boost) pickReward(boost.auto);
      return;
    }
    if (e.code === 'Escape') { close(false); return; }
    if (e.code === 'Enter' || e.code === 'NumpadEnter') { submit(); return; }
    if (isChoice()) {
      // 고르기 문제: 1·2·3 키로 고르기
      if (digit) {
        const btn = el.choices.children[Number(digit[2]) - 1];
        if (btn && !btn.disabled) choose(btn.dataset.v, btn);
      }
      return;
    }
    if (digit) press(digit[2]);
    else if (e.code === 'Period' || e.code === 'NumpadDecimal') press('.');
    else if (e.code === 'Backspace') press('back');
  }

  function press(k) {
    if (!current || locked() || revealed() || isChoice()) return;
    if (k === 'back') input = input.slice(0, -1);
    else if (k === '.') { if (input.indexOf('.') === -1 && input.length < 8) input = (input || '0') + '.'; }
    else if (input.length < 8) input = input === '0' ? k : input + k;
    render();
  }

  function render() {
    el.answer.textContent = input === '' ? '?' : input;
    el.answer.classList.toggle('empty', input === '');
  }

  const LEVEL_NAMES = { 1: '쉬움', 2: '보통', 3: '어려움' };

  /**
   * 문제 창을 엽니다.
   * @param q      문제 (questions.js 모양)
   * @param info   터미널: { used, limit } 이번 경기 미션 수 표시용
   *               점령 문제: { mode: 'capture', zoneId, timeLimit, isPaused() }
   * @param handlers { onFinish(result), onClose() }
   */
  function open(q, info, handlers) {
    current = q;
    input = '';
    kind = info.mode === 'capture' ? 'capture' : 'terminal';
    // 닫았다가 다시 연 문제면 틀린 횟수·걸린 시간·힌트를 이어서 (학습 결과가 정확하도록)
    wrongCount = q.wrongSoFar || 0;
    hintShown = !!q.hintSoFar;
    openedAt = performance.now() - (q.timeSoFar || 0) * 1000;
    onFinish = handlers.onFinish;
    onClose = handlers.onClose;

    el.panel.classList.toggle('capture-mode', kind === 'capture');
    clearInterval(tickTimer);
    if (kind === 'capture') {
      // 점령 문제: 제한 시간 막대 (시간은 새로 연 때부터 다시 30초)
      el.title.textContent = 'ZONE CHALLENGE';
      el.count.textContent = info.zoneId + '존 점령';
      timeLimit = timeLeft = info.timeLimit || 30;
      isPaused = info.isPaused || null;
      renderTimer();
      tickTimer = setInterval(tick, 100);
    } else {
      el.title.textContent = 'ENERGY MISSION';
      el.count.textContent = '미션 ' + (info.used + 1) + ' / ' + info.limit;
    }
    el.timer.hidden = kind !== 'capture';
    // 수정 STEP 4: 터미널 문제 — 정답이면 무엇이 되는지 / 무적 아님 안내, 창은 옆으로
    correctText = info.correctText || '';
    getBoost = info.getBoost || null;
    boost = null;
    el.goal.hidden = !info.goal;
    el.goal.textContent = info.goal || '';
    el.panel.classList.remove('dock-left', 'dock-right', 'hurt');
    if (kind === 'terminal' && info.dock) el.panel.classList.add('dock-' + info.dock);
    el.level.textContent = LEVEL_NAMES[q.difficulty] || '';
    el.level.className = 'mp-level lv' + (q.difficulty || 1);
    el.question.innerHTML = q.question;
    el.unit.textContent = q.unit || '';
    el.feedback.textContent = '';
    el.feedback.className = '';
    el.hint.textContent = hintShown ? '힌트: ' + q.hint : '';
    el.panel.classList.remove('solved', 'revealed', 'reward-mode');
    el.panel.classList.toggle('choice-mode', isChoice());
    el.ok.textContent = '확인';
    el.close.hidden = false;
    el.close.textContent = kind === 'capture' ? '포기' : '닫기';

    // 고르기 버튼 만들기
    el.choices.innerHTML = '';
    if (isChoice()) {
      q.choices.forEach((c, i) => {
        const b = document.createElement('button');
        b.className = 'mc';
        b.dataset.v = c.value;
        b.innerHTML = '<span class="mc-key">' + (i + 1) + '</span>' + c.label;
        b.addEventListener('click', () => choose(c.value, b));
        if (q.disabledChoices && q.disabledChoices.indexOf(c.value) !== -1) b.disabled = true;
        el.choices.appendChild(b);
      });
    }
    render();
    el.panel.hidden = false;
    AudioManager.play('missionOpen'); // STEP 17
  }

  // 고르기 문제: 버튼을 누르면 바로 채점
  function choose(value, btn) {
    if (!current || locked() || revealed()) return;
    check(value, btn);
  }

  function submit() {
    if (!current || locked()) return;
    // 정답을 본 뒤 [확인] → 틀림으로 끝
    if (revealed()) { finishWith(false); return; }
    if (isChoice()) {
      el.feedback.textContent = '답을 골라 주세요.';
      el.feedback.className = 'warn';
      return;
    }
    if (input === '' || input === '.') {
      el.feedback.textContent = '답을 먼저 입력하세요.';
      el.feedback.className = 'warn';
      return;
    }
    check(parseFloat(input));
  }

  // 소수 계산 오차를 없애기 위해 소수 셋째 자리까지 맞춰 비교
  function isCorrect(value) {
    if (isChoice()) return value === current.answer;
    return Math.round(value * 1000) === Math.round(current.answer * 1000);
  }

  function check(value, btn) {
    if (isCorrect(value)) {
      el.feedback.textContent = kind === 'capture' ? '정답! 점령 활성화!' : (correctText || '정답!');
      el.feedback.className = 'good';
      if (btn) btn.classList.add('right');
      el.panel.classList.add('solved');
      AudioManager.play('correct'); // STEP 17
      if (kind === 'capture') {
        // 점령 문제: 보너스 없이 바로 활성화 (시간은 멈춤)
        clearInterval(tickTimer);
        const q = current;
        setTimeout(() => { if (current === q) finishWith(true, null); }, 700);
        return;
      }
      // 수정 STEP 5: 스킬 MAX 뒤의 정답 → TEAM BOOST 고르기
      const q = current;
      boost = getBoost ? getBoost() : null;
      if (boost) {
        setTimeout(() => { if (current === q) showRewards(); }, 600);
        return;
      }
      // 수정 STEP 4: 터미널 정답 = 스킬 성장 → 잠깐 보여준 뒤 닫힘
      setTimeout(() => { if (current === q) finishWith(true, null); }, 900);
      return;
    }

    wrongCount++;
    shake();
    AudioManager.play('wrong'); // STEP 17
    if (btn) {
      btn.disabled = true;
      current.disabledChoices = (current.disabledChoices || []).concat(btn.dataset.v);
    }
    input = '';
    render();

    // 점령 문제: 세 번째 오답이면 도전 실패 (정답과 풀이는 알림으로 보여줌)
    if (kind === 'capture' && wrongCount >= CAPTURE_FAIL_AT) {
      failCapture('wrong');
      return;
    }
    if (wrongCount >= REVEAL_AT[mode()]) {
      reveal();
    } else if (wrongCount >= HINT_AT[mode()]) {
      hintShown = true;
      el.feedback.textContent = '힌트를 보고 다시 해 보세요.';
      el.feedback.className = 'bad';
      el.hint.textContent = '힌트: ' + current.hint;
    } else {
      // 수정 STEP 6: 점령 문제는 고르기(넓이 비교·그림 고르기)도 계산해서 푸는 문제라 "다시 계산해보세요." (기획서)
      el.feedback.textContent = isChoice() && kind !== 'capture' ? '다시 생각해보세요.' : '다시 계산해보세요.';
      el.feedback.className = 'bad';
    }
  }

  // 정답과 풀이 보여주기
  function reveal() {
    el.panel.classList.add('revealed');
    const shown = isChoice()
      ? current.choices.find((c) => c.value === current.answer).label
      : current.answer + (current.unit ? ' ' + current.unit : '');
    el.feedback.innerHTML = '정답은 <b>' + shown + '</b>';
    el.feedback.className = 'reveal';
    el.hint.textContent = '풀이: ' + current.explanation;
    if (isChoice()) {
      Array.from(el.choices.children).forEach((b) => {
        b.disabled = true;
        if (b.dataset.v === current.answer) b.classList.add('right');
      });
    }
    el.ok.textContent = '알겠어요';
    el.close.hidden = true;
  }

  // ---------------- STEP 13: 보너스 고르기 ----------------
  let rewardTimer = null;
  // 수정 STEP 5: TEAM BOOST 고르기 (예전 STEP 13 보너스 고르기 화면을 다시 씀)
  //   같은 종류를 우리 팀이 방금 썼으면 흐리게 (N초 뒤), 추천에는 "추천" 표시
  function showRewards() {
    const TB = CONFIG.TEAM_BOOST;
    el.panel.classList.add('reward-mode');
    el.feedback.innerHTML = '정답! <b>TEAM BOOST!</b>';
    el.feedback.className = 'good';

    el.choices.innerHTML = '';
    boost.options.forEach((o, i) => {
      const b = document.createElement('button');
      b.className = 'mc mr mr-' + o.id + (o.id === boost.auto ? ' rec' : '');
      b.innerHTML = '<span class="mc-key">' + (i + 1) + '</span>' + o.label +
        '<small>' + (o.disabled ? o.wait + '초 뒤' : o.desc) + '</small>' + (o.id === boost.auto ? '<em>추천</em>' : '');
      b.disabled = !!o.disabled;
      b.addEventListener('click', () => pickReward(o.id));
      el.choices.appendChild(b);
    });

    // 남은 시간 안내, 시간이 지나면 추천이 자동으로
    const autoLabel = (boost.options.find((o) => o.id === boost.auto) || {}).label || '';
    let left = TB.AUTO_PICK_SEC;
    const tick = () => {
      el.hint.textContent = '우리 팀에 줄 도움 고르기 · ' + left + '초 뒤 자동으로 ' + autoLabel;
      if (left <= 0) { pickReward(boost.auto); return; }
      left--;
      rewardTimer = setTimeout(tick, 1000);
    };
    tick();
  }

  function pickReward(id) {
    if (!current || !rewarding() || !id) return;
    clearTimeout(rewardTimer);
    finishWith(true, id);
    AudioManager.play('reward'); // STEP 17
  }

  function shake() {
    el.panel.classList.remove('shake');
    void el.panel.offsetWidth;
    el.panel.classList.add('shake');
  }

  function finishWith(correct, rewardId, failed) {
    clearTimeout(rewardTimer);
    const result = {
      question: current,
      correct,
      wrongCount,
      hintShown,
      revealed: !correct,
      reward: rewardId || null,   // 수정 STEP 5: 고른 TEAM BOOST ('heal' / 'ammo' / 'speed' / 'charge' / null)
      timeSec: (performance.now() - openedAt) / 1000,
      kind,                       // 'terminal' / 'capture'
      failed: failed || null,     // 점령 문제 실패 이유: 'wrong' 세 번 틀림 / 'time' 시간 끝
    };
    const cb = onFinish;
    hide();
    if (cb) cb(result);
  }

  // ---------------- 수정 STEP 2: 점령 문제 제한 시간 ----------------
  function tick() {
    if (!current || kind !== 'capture' || locked()) return;
    if (isPaused && isPaused()) return;
    timeLeft = Math.max(0, timeLeft - 0.1);
    renderTimer();
    if (timeLeft <= 0) failCapture('time');
  }
  function renderTimer() {
    el.timerFill.style.transform = 'scaleX(' + (timeLeft / timeLimit).toFixed(3) + ')';
    el.timerText.textContent = Math.ceil(timeLeft) + '초';
    el.timer.classList.toggle('hurry', timeLeft <= 10);
  }
  function failCapture(reason) {
    clearInterval(tickTimer);
    finishWith(false, null, reason);
  }

  // answered=false: 풀지 않고 닫음 (같은 문제가 다음에 다시 나옴)
  function close(answered) {
    if (!isOpen()) return;
    // TEAM BOOST를 고르는 중에 강제로 닫히면(재충전·경기 끝) 정답은 인정, 추천이 자동으로
    if (rewarding()) { finishWith(true, boost ? boost.auto : null); return; }
    // "정답!"을 보여주는 0.6초 사이에 닫히면(경기 끝·재충전) 정답은 인정 (TEAM BOOST면 추천이 자동으로)
    if (locked()) { finishWith(true, boost ? boost.auto : null); return; }
    // 정답을 이미 봤으면 틀림으로 끝냄
    if (revealed()) { finishWith(false); return; }
    // 다음에 이어서 셀 수 있게 문제에 적어 둠
    current.wrongSoFar = wrongCount;
    current.hintSoFar = hintShown;
    current.timeSoFar = (performance.now() - openedAt) / 1000;
    const cb = onClose;
    hide();
    if (cb) cb(answered);
  }

  function hide() {
    clearInterval(tickTimer);
    el.panel.hidden = true;
    el.panel.classList.remove('capture-mode', 'dock-left', 'dock-right', 'hurt');
    current = null;
    onFinish = onClose = null;
    isPaused = null;
  }

  function isOpen() {
    return !!current;
  }

  // 수정 STEP 4: 터미널 문제 중 공격받으면 창이 빨갛게 번쩍이며 흔들림
  let hurtTimer = null;
  function hurt() {
    if (!current || kind !== 'terminal') return;
    el.panel.classList.add('hurt');
    shake();
    clearTimeout(hurtTimer);
    hurtTimer = setTimeout(() => el.panel.classList.remove('hurt'), 350);
  }

  return { init, open, close, isOpen, hurt, mode: () => (current ? kind : null) };
})();
