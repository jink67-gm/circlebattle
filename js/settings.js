/* ============================================================
   서클 배틀 - 환경설정 (settings.js)
   ------------------------------------------------------------
   STEP 18: 게임 화면의 ⚙ 버튼 (PC는 Esc 키)
     [소리·화면]  전체 음량 · 배경음 · 효과음 · 소리 끄기 · 전체화면
     [조작 설명]  태블릿/PC 조작, 내 캐릭터, 게임 규칙 요약
     [대기방으로 나가기]
       - 혼자 연습 : 경기를 멈추고 대기방으로
       - 학생 기기 : 내 캐릭터는 잠시 쉬고, 대기방의 [경기로 돌아가기]로 다시 들어옴
       - 교사 기기 : 경기 끝내기 → 모든 학생이 대기방으로
       실수로 나가지 않게 두 번 눌러야 나감

   혼자 연습 중에는 설정 창을 여는 동안 경기가 멈춥니다.
   여러 명이 하는 경기는 멈출 수 없으므로 계속 진행됩니다. (내 캐릭터는 제자리)
   ============================================================ */

const Settings = (function () {
  const el = {};
  let openNow = false;
  let inputWas = false;       // 열기 전에 조작이 켜져 있었는지
  let exitArmed = false;
  let exitTimer = null;
  let tab = 'sound';

  function init() {
    el.overlay = document.getElementById('settings-overlay');
    el.status = document.getElementById('sb-status');
    el.exit = document.getElementById('btn-exit-match');
    el.exitNote = document.getElementById('sb-exit-note');
    el.help = document.getElementById('sb-help');
    el.mute = document.getElementById('btn-mute');
    el.fs = document.getElementById('btn-fullscreen');
    el.fsNote = document.getElementById('fs-note');

    document.getElementById('btn-settings').addEventListener('click', () => (openNow ? close() : open()));
    document.getElementById('btn-settings-close').addEventListener('click', () => close());
    document.getElementById('btn-settings-resume').addEventListener('click', () => close());
    // 바깥 어두운 곳을 누르면 닫힘
    el.overlay.addEventListener('pointerdown', (e) => { if (e.target === el.overlay) close(); });
    document.querySelectorAll('.sb-tab').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));

    // 음량 막대
    document.querySelectorAll('.vol-range').forEach((r) => {
      r.addEventListener('input', () => {
        AudioManager.setVolume(r.dataset.kind, Number(r.value) / 100);
        showVolume(r);
      });
      // 효과음·전체는 손을 뗄 때 들어 보기
      r.addEventListener('change', () => { if (r.dataset.kind !== 'bgm') AudioManager.play('correct'); });
    });
    el.mute.addEventListener('click', () => { AudioManager.setMuted(!AudioManager.isMuted()); refreshSound(); });
    el.fs.addEventListener('click', toggleFullscreen);
    // STEP 20: 화질
    el.qNote = document.getElementById('q-note');
    document.querySelectorAll('.q-btn').forEach((b) => b.addEventListener('click', () => {
      Renderer.setQuality(b.dataset.q);
      refreshQuality();
    }));
    ['fullscreenchange', 'webkitfullscreenchange'].forEach((ev) => document.addEventListener(ev, refreshFullscreen));
    el.exit.addEventListener('click', onExit);

    // Esc: 설정 열기/닫기 (특수기 조준 중이거나 수학 미션 중이면 그쪽이 먼저)
    window.addEventListener('keydown', (e) => {
      if (e.code !== 'Escape' || e.repeat) return;
      const t = e.target;
      if (t && t.tagName === 'INPUT' && t.type !== 'range') return;
      if (openNow) {
        close();
        e.stopImmediatePropagation(); // 미션 창까지 닫히지 않게
        return;
      }
      if (!inGameScreen() || GameState.is(STATES.MATH_MISSION) || Input.getSpecialAim()) return;
      open();
      e.stopImmediatePropagation();
    }, true);
  }

  function inGameScreen() {
    return GameState.is(STATES.PLAYING) || GameState.is(STATES.COUNTDOWN) || GameState.is(STATES.RESULT) ||
      GameState.is(STATES.MATH_MISSION);
  }

  // ---------------- 열기 / 닫기 ----------------
  function open() {
    if (openNow || !inGameScreen()) return;
    openNow = true;
    const s = Game.state;
    inputWas = Input.isEnabled();
    Input.setEnabled(false);
    // 혼자 연습은 멈춤
    const live = s.phase === 'playing' || s.phase === 'overtime' || s.phase === 'countdown';
    s.paused = s.mode === 'practice' && live;
    el.status.textContent = s.paused ? '일시정지' : (live && s.netRole ? '경기는 계속 진행 중이에요' : '');
    el.status.className = s.paused ? 'paused' : 'live';
    disarmExit();
    refreshSound();
    refreshFullscreen();
    refreshQuality();
    buildHelp();
    showTab(tab);
    el.overlay.hidden = false;
    document.body.classList.add('settings-open');
  }

  /** @param force 경기가 끝나거나 멈춰서 닫을 때 (조작을 다시 켜지 않음) */
  function close(force) {
    if (!openNow) return;
    openNow = false;
    el.overlay.hidden = true;
    document.body.classList.remove('settings-open');
    disarmExit();
    const s = Game.state;
    s.paused = false;
    if (!force && inputWas && GameState.is(STATES.PLAYING)) Input.setEnabled(true);
  }

  function showTab(name) {
    tab = name;
    document.querySelectorAll('.sb-tab').forEach((b) => b.classList.toggle('on', b.dataset.tab === name));
    document.querySelectorAll('.sb-page').forEach((p) => { p.hidden = p.dataset.page !== name; });
  }

  // ---------------- 소리 ----------------
  function showVolume(r) {
    r.parentElement.querySelector('.vol-num').textContent = r.value;
    r.style.setProperty('--pct', r.value + '%');
  }

  function refreshSound() {
    const v = AudioManager.volumes();
    document.querySelectorAll('.vol-range').forEach((r) => {
      r.value = Math.round(v[r.dataset.kind] * 100);
      showVolume(r);
    });
    const m = AudioManager.isMuted();
    el.mute.textContent = m ? '🔇 소리 켜기' : '🔊 소리 끄기';
    el.mute.classList.toggle('on', m);
    document.getElementById('sb-sound-rows').classList.toggle('muted', m);
  }

  // ---------------- STEP 20: 화질 ----------------
  function refreshQuality() {
    const q = Renderer.getQuality();
    document.querySelectorAll('.q-btn').forEach((b) => b.classList.toggle('on', b.dataset.q === q));
    const scale = Math.round(Renderer.scale() * 100) / 100;
    const text = { auto: '버벅이면 저절로 낮춰요', high: '또렷하지만 오래된 태블릿에서는 느릴 수 있어요', fast: '오래된 태블릿·크롬북에서 부드럽게' }[q];
    el.qNote.textContent = text + ' · 지금 ' + scale + '배로 그리는 중';
  }

  // ---------------- 전체화면 ----------------
  function fsElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }
  function fsSupported() {
    const d = document.documentElement;
    return !!(d.requestFullscreen || d.webkitRequestFullscreen);
  }

  function toggleFullscreen() {
    if (!fsSupported()) return;
    if (fsElement()) {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      return;
    }
    const d = document.documentElement;
    const req = d.requestFullscreen ? d.requestFullscreen({ navigationUI: 'hide' }) : d.webkitRequestFullscreen();
    // 안드로이드 태블릿: 전체화면이면 가로로 고정 (안 되는 기기는 그냥 넘어감)
    Promise.resolve(req).then(() => {
      if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
    }).catch(() => {});
  }

  function refreshFullscreen() {
    const standalone = window.navigator.standalone || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
    if (!fsSupported()) {
      el.fs.disabled = true;
      el.fs.textContent = '⛶ 전체화면';
      el.fsNote.textContent = standalone ? '이미 전체 화면으로 실행 중이에요.'
        : '이 기기는 전체화면을 지원하지 않아요. 공유 버튼 → [홈 화면에 추가]로 열면 전체 화면처럼 쓸 수 있어요.';
      return;
    }
    el.fs.disabled = false;
    const on = !!fsElement();
    el.fs.textContent = on ? '⛶ 전체화면 끄기' : '⛶ 전체화면';
    el.fs.classList.toggle('on', on);
    el.fsNote.textContent = on ? '' : '화면 위아래의 주소창이 사라져 경기장이 더 크게 보여요.';
    setTimeout(Renderer.resize, 150);
  }

  // ---------------- 나가기 ----------------
  function exitInfo() {
    const s = Game.state;
    if (s.phase === 'ended') return { label: '대기방으로', confirm: false, note: '' };
    if (s.netRole === 'host') {
      return { label: '경기 끝내기', confirm: true, again: '정말 끝낼까요? 한 번 더',
        note: '경기가 결과 없이 끝나고, 모든 학생 화면이 대기방으로 돌아가요.' };
    }
    if (s.netRole === 'client' && s.viewMode === 'play') {
      return { label: '대기방으로 나가기', confirm: true, again: '정말 나갈까요? 한 번 더',
        note: '내 캐릭터는 잠시 쉬어요. 대기방의 [경기로 돌아가기]로 다시 들어올 수 있어요.' };
    }
    if (s.mode === 'practice') {
      return { label: '대기방으로 나가기', confirm: true, again: '정말 나갈까요? 한 번 더', note: '연습 경기를 끝내요.' };
    }
    return { label: '대기방으로 나가기', confirm: false, note: '' };
  }

  function disarmExit() {
    exitArmed = false;
    clearTimeout(exitTimer);
    const info = exitInfo();
    el.exit.textContent = info.label;
    el.exit.classList.remove('armed');
    el.exitNote.textContent = info.note;
  }

  function onExit() {
    const info = exitInfo();
    if (info.confirm && !exitArmed) {
      exitArmed = true;
      el.exit.textContent = info.again;
      el.exit.classList.add('armed');
      exitTimer = setTimeout(disarmExit, 2500);
      return;
    }
    const s = Game.state;
    const leavingAsStudent = s.netRole === 'client' && s.viewMode === 'play' && s.phase !== 'ended';
    close(true);
    if (leavingAsStudent) Sync.leaveMatch(); // 교사 기기에 "잠시 쉼"을 알림
    Game.backToLobby();
  }

  // ---------------- 조작 설명 ----------------
  function buildHelp() {
    const s = Game.state;
    const touch = document.body.classList.contains('touch-mode');
    const specials = s.settings.specialsEnabled;
    const tabletRows = [
      ['이동', '왼쪽 조이스틱 (화면 왼쪽 아래를 누르고 끌기)'],
      ['공격', '오른쪽 조이스틱을 끌어 조준 → 떼면 발사<br>톡 누르면 가까운 상대에게 자동 조준<br>가운데로 되돌려 떼면 취소'],
      specials && ['특수기', '[특수기] 버튼을 누른 채 끌어서 원을 놓을 곳 정하기 → 떼면 사용'],
      ['점령 문제', '점령지역에서 3초 버티면 [점령 문제 풀기] 버튼'],
      ['수학 미션', '우리 팀 에너지 터미널 가까이 가면 [수학 미션] 버튼 · 정답이면 스킬 LEVEL UP'],
    ].filter(Boolean);
    const pcRows = [
      ['이동', '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 또는 방향키'],
      ['공격', '마우스로 조준 → 왼쪽 클릭 (또는 <kbd>Space</kbd>)'],
      specials && ['특수기', '<kbd>E</kbd> 또는 오른쪽 버튼을 누르고 있다가 떼기 · <kbd>Esc</kbd> 취소'],
      ['점령 문제', '점령지역에서 3초 버틴 뒤 <kbd>F</kbd>'],
      ['수학 미션', '터미널 가까이에서 <kbd>F</kbd> · 정답이면 스킬 LEVEL UP'],
      ['그 밖에', '<kbd>M</kbd> 소리 끄기 · <kbd>Esc</kbd> 환경설정'],
    ].filter(Boolean);
    const table = (rows) => rows.map(([k, v]) => '<div class="hr"><b>' + k + '</b><span>' + v + '</span></div>').join('');
    const tabletBox = '<div class="help-box' + (touch ? ' mine' : '') + '"><h3>태블릿' + (touch ? ' <small>지금 기기</small>' : '') + '</h3>' + table(tabletRows) + '</div>';
    const pcBox = '<div class="help-box' + (!touch ? ' mine' : '') + '"><h3>PC' + (!touch ? ' <small>지금 기기</small>' : '') + '</h3>' + table(pcRows) + '</div>';

    // 내 캐릭터
    let mine = '';
    const me = s.localPlayer;
    if (me) {
      const ch = CHARACTERS[me.charId];
      const sp = ch.special;
      mine = '<div class="help-box wide"><h3>내 캐릭터 · ' + ch.name + ' <small>' + ch.role + '</small></h3>' +
        '<div class="hr"><b>기본 공격</b><span>' + ch.attack.name + ' · 사거리 ' + ch.attack.range + 'm · 충전 ' + ch.attack.reloadSec + '초</span></div>' +
        (specials ? '<div class="hr"><b>특수기</b><span>' + sp.name + ' — ' + sp.desc + '</span></div>' : '') +
        (ch.passive ? '<div class="hr"><b>특성</b><span>' + ch.passive.name + ' — 둘레 ' + ch.passive.r + 'm 안 친구들이 1초에 ' + ch.passive.healPerSec + '씩 회복 (스킬 잠금이어도)</span></div>' : '') + '</div>';
    }

    // 규칙 요약 (지금 경기 설정 값으로)
    const zones = s.zones.map((z) => z.id + '존 반지름 ' + z.r + 'm · +' + z.points + '점').join('<br>');
    const E = CONFIG.ENERGY;
    const C = CONFIG.CAPTURE;
    const rules = '<div class="help-box wide"><h3>규칙 한눈에</h3>' +
      // 수정 STEP 2: 점령 순서
      '<div class="hr"><b>점령</b><span>존에서 <em>' + C.PREP_SEC + '초 버티기</em> → <em>점령 문제</em> 정답 → 우리 팀 <em>점령 활성화</em>' +
        ' → 팀원이 존에 머물면 게이지(원의 넓이만큼)가 차서 점령. 점령한 존은 ' + s.scoreInterval + '초마다 점수 (상대가 존 안에 있으면 점수 멈춤)<br>' +
        '점령 문제는 ' + C.QUESTION_SEC + '초 안에 · 푸는 동안만 무적(움직이기·공격·특수기 불가) · 세 번 틀리면 ' +
        C.RETRY_SEC + '초 뒤 다시<br>' + zones + '</span></div>' +
      '<div class="hr"><b>에너지 ⚡</b><span>명중 +' + E.ON_HIT + ' · 존 안 1초에 +' + E.PER_SEC_IN_ZONE + ' · 재등장 +' + E.ON_RESPAWN +
        ' · 수학 미션 정답 +' + E.MISSION_CORRECT + ' (최대 ' + E.MAX + ')</span></div>' +
      // 수정 STEP 4: 스킬 성장
      (specials ? '<div class="hr"><b>스킬 성장</b><span>처음에는 <em>잠금</em> → 에너지 터미널 문제를 맞힐 때마다 ' +
        '<em>LEVEL 1</em>(해금) → <em>2</em> → <em>3 MAX</em>. 터미널 문제를 푸는 동안은 무적이 아니에요!' +
        (me ? '<br>' + [1, 2, 3].map((lv) => 'LEVEL ' + lv + ': ' + Skills.describe(me.charId, lv)).join('<br>') +
          '<br>한 번 쓰는 데 ' + Skills.costOf(me) + '⚡' : '') + '</span></div>' : '') +
      // 수정 STEP 5: MAX 뒤에는 TEAM BOOST
      '<div class="hr"><b>TEAM BOOST</b><span>' + (specials ? '스킬 LEVEL 3 MAX 뒤에' : '') + ' 터미널 문제를 맞히면 우리 팀 전체에 도움 하나: ' +
        CONFIG.TEAM_BOOST.TYPES.filter((b) => b.id !== 'charge' || specials).map((b) => b.label + '(' + b.desc.replace('팀 전체 ', '') + ')').join(' · ') +
        '<br>TEAM BOOST 뒤 ' + CONFIG.TEAM_BOOST.COOLDOWN_SEC + '초 쉬기 · 같은 종류는 팀에서 ' + CONFIG.TEAM_BOOST.SAME_TYPE_SEC + '초 안에 다시 못 씀</span></div>' +
      '<div class="hr"><b>원주율</b><span>이번 경기는 <em>' + CONFIG.PI + '</em> — 모든 문제를 이 원주율로 계산해요</span></div>' +
      // 새 STEP 2: 경기장 · 부쉬 · 미니맵
      '<div class="hr"><b>경기장</b><span>화면은 내 캐릭터를 따라가요. 오른쪽 위 <em>미니맵</em>에서 존 주인과 우리 팀 위치를 봐요<br>' +
        'A존 위쪽 · <em>B존 가운데(+2점)</em> · C존 아래쪽. 에너지 터미널: 뒤쪽 모서리(안전) · 가운데 <em>공용</em>(두 팀 모두, 위험)</span></div>' +
      '<div class="hr"><b>부쉬</b><span>수풀 안에 들어가면 <em>상대에게 보이지 않아요</em> (우리 팀에게는 보임)<br>' +
        '부쉬 안에서 쏘거나 스킬을 쓰면 ' + CONFIG.BUSH.REVEAL_ATTACK_SEC + '초, 맞으면 ' + CONFIG.BUSH.REVEAL_HIT_SEC +
        '초 동안 드러나요 (스피더 순간이동은 제외) · 같은 부쉬 안이나 ' + CONFIG.BUSH.NEAR_REVEAL_M + 'm 안까지 다가오면 보여요 · 범위 스킬은 부쉬 안에도 그대로 · 엔지니어 LEVEL 3 터렛 원 안이면 보여요</span></div>' +
      '<div class="hr"><b>승리</b><span>' + s.targetScore + '점을 먼저 얻거나, ' + s.settings.gameMinutes +
        '분이 끝났을 때 점수가 높은 팀 (같으면 ' + CONFIG.CAPTURE.OVERTIME_SEC +
        '초 연장전: ' + CONFIG.CAPTURE.OVERTIME_ZONE + '존을 먼저 점령한 팀, 시간이 끝나면 그 존 게이지를 채우던 팀)</span></div>' +
      '</div>';

    el.help.innerHTML = '<div class="help-grid">' + (touch ? tabletBox + pcBox : pcBox + tabletBox) + '</div>' + mine + rules;
  }

  return { init, open, close, isOpen: () => openNow };
})();
