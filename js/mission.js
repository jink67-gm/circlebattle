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

  // 몇 번째 오답에 힌트 / 정답 공개 (기획서 39: 첫 오답 "다시", 두 번째 오답 힌트)
  // 고르기 문제는 보기가 3개라 두 번 틀리면 남은 하나가 정답 → 정답 공개까지 가지 않음
  const HINT_AT = { number: 2, choice: 2 };
  const REVEAL_AT = { number: 3, choice: 3 };

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
    // 보너스 고르기: 1·2·3 키, Enter 는 첫 번째
    if (rewarding()) {
      const list = CONFIG.MISSION.REWARDS;
      if (digit && list[Number(digit[2]) - 1]) pickReward(list[Number(digit[2]) - 1].id);
      else if (e.code === 'Enter' || e.code === 'NumpadEnter') pickReward(list[0].id);
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
   * @param info   { used, limit } 이번 경기 미션 수 표시용
   * @param handlers { onFinish(result), onClose() }
   */
  function open(q, info, handlers) {
    current = q;
    input = '';
    // 닫았다가 다시 연 문제면 틀린 횟수·걸린 시간·힌트를 이어서 (학습 결과가 정확하도록)
    wrongCount = q.wrongSoFar || 0;
    hintShown = !!q.hintSoFar;
    openedAt = performance.now() - (q.timeSoFar || 0) * 1000;
    onFinish = handlers.onFinish;
    onClose = handlers.onClose;

    el.count.textContent = '미션 ' + (info.used + 1) + ' / ' + info.limit;
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
      el.feedback.textContent = '정답!';
      el.feedback.className = 'good';
      if (btn) btn.classList.add('right');
      el.panel.classList.add('solved');
      // 잠깐 "정답!"을 보여준 뒤 보너스 고르기
      setTimeout(() => { if (current) showRewards(); }, 600);
      AudioManager.play('correct'); // STEP 17
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

    if (wrongCount >= REVEAL_AT[mode()]) {
      reveal();
    } else if (wrongCount >= HINT_AT[mode()]) {
      hintShown = true;
      el.feedback.textContent = '힌트를 보고 다시 해 보세요.';
      el.feedback.className = 'bad';
      el.hint.textContent = '힌트: ' + current.hint;
    } else {
      el.feedback.textContent = isChoice() ? '다시 생각해보세요.' : '다시 계산해보세요.';
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
  function showRewards() {
    const E = CONFIG.ENERGY;
    const energy = hintShown ? E.MISSION_CORRECT_AFTER_HINT : E.MISSION_CORRECT;
    el.panel.classList.add('reward-mode');
    el.feedback.innerHTML = '정답! <b>⚡ +' + energy + '</b>';
    el.feedback.className = 'good';

    el.choices.innerHTML = '';
    CONFIG.MISSION.REWARDS.forEach((r, i) => {
      const b = document.createElement('button');
      b.className = 'mc mr mr-' + r.id;
      b.innerHTML = '<span class="mc-key">' + (i + 1) + '</span>' + r.label + '<small>' + r.desc + '</small>';
      b.addEventListener('click', () => pickReward(r.id));
      el.choices.appendChild(b);
    });

    // 남은 시간 안내, 시간이 지나면 첫 번째 자동 선택
    let left = CONFIG.MISSION.AUTO_PICK_SEC;
    const tick = () => {
      el.hint.textContent = '보너스를 하나 고르세요 · ' + left + '초 뒤 "' + CONFIG.MISSION.REWARDS[0].label + '"';
      if (left <= 0) { pickReward(CONFIG.MISSION.REWARDS[0].id); return; }
      left--;
      rewardTimer = setTimeout(tick, 1000);
    };
    tick();
  }

  function pickReward(id) {
    if (!current || !rewarding()) return;
    clearTimeout(rewardTimer);
    finishWith(true, id);
    AudioManager.play('reward'); // STEP 17
  }

  function shake() {
    el.panel.classList.remove('shake');
    void el.panel.offsetWidth;
    el.panel.classList.add('shake');
  }

  function finishWith(correct, rewardId) {
    clearTimeout(rewardTimer);
    const result = {
      question: current,
      correct,
      wrongCount,
      hintShown,
      revealed: !correct,
      reward: rewardId || null,   // 고른 보너스 ('ammo' / 'shield' / 'speed' / null)
      timeSec: (performance.now() - openedAt) / 1000,
    };
    const cb = onFinish;
    hide();
    if (cb) cb(result);
  }

  // answered=false: 풀지 않고 닫음 (같은 문제가 다음에 다시 나옴)
  function close(answered) {
    if (!isOpen()) return;
    // 보너스를 고르는 중에 강제로 닫히면(재충전·경기 끝) 정답은 인정, 보너스는 없음
    if (rewarding()) { finishWith(true, null); return; }
    // "정답!"을 보여주는 0.6초 사이에 닫히면(경기 끝·재충전) 정답은 인정, 보너스는 없음
    if (locked()) { finishWith(true, null); return; }
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
    el.panel.hidden = true;
    current = null;
    onFinish = onClose = null;
  }

  function isOpen() {
    return !!current;
  }

  return { init, open, close, isOpen };
})();
