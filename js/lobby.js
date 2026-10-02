/* ============================================================
   서클 배틀 - 시작 화면과 대기방 (lobby.js)
   ------------------------------------------------------------
   STEP 14
   시작 화면 : 닉네임, 방 번호, [참가하기], [혼자 연습하기], [교사용]
   대기방    : 방 번호, 참가 인원, SOLAR·LUNAR 팀 목록(닉네임·캐릭터),
              캐릭터 6종 고르기(능력치·특수기 설명), 시작 버튼은 방장(교사)만

   ※ 대기방은 room.js 의 "방 모양"만 사용하므로, 방만 바꿔 끼우면 됩니다.
   STEP 16: [참가하기] → 학생 기기가 교사 방에 들어감 (NetworkRoom)
            교사 방은 데이터베이스에 올라가(HostNet) 학생 기기가 볼 수 있음
   ============================================================ */

const Lobby = (function () {
  const el = {};
  let room = null;           // 지금 들어가 있는 방
  const NICK_MAX = 8;
  const STORE_KEY = 'circleBattle.nick';
  // 주소에 ?test=1 을 붙이면 교사 대기방에 [+ 시험 학생] 버튼이 보임
  const TEST_MODE = new URLSearchParams(location.search).get('test') === '1';

  function init() {
    el.title = document.getElementById('title-screen');
    el.nick = document.getElementById('input-nick');
    el.code = document.getElementById('input-code');
    el.titleMsg = document.getElementById('title-msg');
    el.lobby = document.getElementById('lobby-screen');
    el.roomCode = document.getElementById('lobby-code');
    el.count = document.getElementById('lobby-count');
    el.teamSolar = document.getElementById('team-solar');
    el.teamLunar = document.getElementById('team-lunar');
    el.spect = document.getElementById('lobby-spectators');
    el.cards = document.getElementById('char-cards');
    el.detail = document.getElementById('char-detail');
    el.start = document.getElementById('btn-start');
    el.wait = document.getElementById('lobby-wait');
    // STEP 15: 교사용
    el.hostBar = document.getElementById('host-bar');
    el.setSummary = document.getElementById('lobby-settings');
    el.hostNote = document.getElementById('host-note');
    el.chars = document.getElementById('lobby-chars');
    el.specNote = document.getElementById('spectate-note');
    el.leaveBtn = document.getElementById('btn-leave');
    document.getElementById('btn-shuffle').addEventListener('click', () => room && room.shuffleTeams && room.shuffleTeams());
    document.getElementById('btn-add-test').addEventListener('click', () => room && room.addTestStudent && room.addTestStudent());
    document.getElementById('btn-edit-settings').addEventListener('click', editSettings);
    document.getElementById('btn-results').addEventListener('click', () => Results.open()); // STEP 19
    // 팀 목록에서 학생 이름 누르기 → 팀 옮기기, ✕ → 시험 학생 빼기 (교사만)
    [el.teamSolar, el.teamLunar].forEach((ul) => ul.addEventListener('click', onTeamClick));
    Teacher.init();

    // 지난번 닉네임 채우기 (이 기기에만 저장)
    try { el.nick.value = localStorage.getItem(STORE_KEY) || ''; } catch (e) { /* 저장 안 되는 브라우저 */ }

    document.getElementById('btn-join').addEventListener('click', join);
    document.getElementById('btn-practice').addEventListener('click', practice);
    document.getElementById('btn-teacher').addEventListener('click', teacher);
    document.getElementById('btn-leave').addEventListener('click', leave);
    el.start.addEventListener('click', startGame);
    // STEP 18: 학생이 경기 중에 나왔다가 다시 들어가기
    el.rejoin = document.getElementById('btn-rejoin');
    el.rejoin.addEventListener('click', () => { if (room && room.rejoinMatch) room.rejoinMatch(); });
    // 방 번호 칸에서 Enter → 참가하기
    el.code.addEventListener('keydown', (e) => { if (e.key === 'Enter') join(); });
    el.nick.addEventListener('keydown', (e) => { if (e.key === 'Enter') el.code.focus(); });
    // 방 번호는 숫자 4자리만
    el.code.addEventListener('input', () => { el.code.value = el.code.value.replace(/\D/g, '').slice(0, 4); });

    buildCards();
  }

  // ---------------- 시작 화면 ----------------
  function showTitle() {
    GameState.change(STATES.TITLE);
    el.titleMsg.textContent = '';
  }

  function say(msg, kind) {
    el.titleMsg.textContent = msg;
    el.titleMsg.className = kind || 'warn';
  }

  // 닉네임 검사: 앞뒤 빈칸 없애고 1~8글자
  function readNick() {
    const nick = el.nick.value.trim().replace(/\s+/g, ' ');
    if (!nick) { say('닉네임을 입력해 주세요.'); el.nick.focus(); return null; }
    if (nick.length > NICK_MAX) { say('닉네임은 ' + NICK_MAX + '글자까지 쓸 수 있어요.'); el.nick.focus(); return null; }
    el.nick.value = nick; // 정리된 닉네임으로 보여줌
    try { localStorage.setItem(STORE_KEY, nick); } catch (e) { /* 무시 */ }
    return nick;
  }

  // STEP 16: 방 번호로 교사 방에 들어가기
  let joining = false;
  function join() {
    if (joining) return;
    const nick = readNick();
    if (!nick) return;
    const code = el.code.value.trim();
    if (!/^\d{4}$/.test(code)) { say('방 번호 4자리를 입력해 주세요.'); el.code.focus(); return; }
    joining = true;
    say('방 ' + code + '에 들어가는 중…', 'info');
    NetworkRoom.join(code, nick).then((r) => {
      joining = false;
      if (!GameState.is(STATES.TITLE)) { r.leave(); return; } // 기다리는 사이에 다른 화면으로 감
      enterRoom(r);
    }).catch((e) => {
      joining = false;
      say(e.message || '방에 들어가지 못했어요.');
    });
  }

  function practice() {
    const nick = readNick();
    if (!nick) return;
    enterRoom(LocalRoom.create(nick));
  }

  // STEP 15: 교사용 → PIN → 설정 → 방 만들기
  function teacher() {
    Teacher.open({
      done: openHostRoom,
      cancel: showTitle,
    });
  }

  // STEP 16: 교사 방을 데이터베이스에 올림. 인터넷이 안 되면 이 기기 안에서만 쓰는 방으로
  function openHostRoom(settings) {
    const r = HostRoom.create(settings);
    r.connecting = Net.available();
    if (!r.connecting) {
      r.offline = true;
      r.offlineReason = 'Firebase를 불러오지 못했어요 (인터넷 연결 확인).';
    }
    enterRoom(r);
    if (!r.connecting) return;
    HostNet.open(r).then((link) => {
      if (room !== r) { link.close(); return; } // 기다리는 사이에 방을 닫음
      r.net = link;
      r.connecting = false;
      render();
    }).catch((e) => {
      r.connecting = false;
      r.offline = true;
      r.offlineReason = e.message;
      if (room === r) render();
    });
  }

  // 교사용 대기방에서 설정 바꾸기 (PIN 다시 묻지 않음)
  function editSettings() {
    if (!room || !room.isTeacherRoom) return;
    Teacher.open({
      current: room.settings,
      skipPin: true,
      buttonText: '설정 저장',
      done: (s) => { room.updateSettings(s); GameState.change(STATES.LOBBY); render(); },
      cancel: () => { GameState.change(STATES.LOBBY); render(); },
    });
  }

  function onTeamClick(e) {
    if (!room || !room.isTeacherRoom) return;
    const li = e.target.closest('li[data-id]');
    if (!li) return;
    if (e.target.closest('.tl-remove')) {
      // STEP 16: 다른 기기에서 들어온 학생은 "내보내기"
      const st = room.findStudent && room.findStudent(li.dataset.id);
      if (st && st.net && room.net) room.net.kick(st.id);
      else room.removePlayer(li.dataset.id);
    } else room.moveToOtherTeam(li.dataset.id);
  }

  // ---------------- 대기방 ----------------
  function enterRoom(r) {
    room = r;
    room.subscribe(render);
    room.notifyNet = render;               // 교사 기기 연결 상태가 바뀌면 다시 그림
    if (r.isNetwork) {
      r.onMatch = onNetMatch;
      r.onClosed = onRoomClosed;
    }
    GameState.change(STATES.LOBBY);
    render();
  }

  // STEP 16 학생 기기: 선생님이 경기를 시작함 / 끝냄
  function onNetMatch(kind, match, late) {
    if (kind === 'start') {
      const lineup = Net.toArray(match.lineup);
      const mine = lineup.find((p) => p.id === room.myId);
      Game.startMatch({
        mode: 'room',
        net: 'client',
        viewMode: mine ? 'play' : 'spectate',     // 팀 인원이 꽉 찼거나 늦게 오면 이번 경기는 관전
        me: mine ? { ...mine } : null,
        others: lineup.filter((p) => p !== mine),
        settings: { ...CONFIG.ROOM_DEFAULTS, ...(match.settings || {}) },
        countdown: late ? 0 : (match.countdown === undefined ? 3 : match.countdown),
        roomCode: room.code,
        matchId: match.id,
        lineup,
        myId: room.myId,
      });
    } else if (kind === 'end') {
      // 결과를 보고 있는 중이 아니면 대기방으로
      if (Game.state.netRole === 'client' && Game.state.phase !== 'ended') Game.backToLobby();
    }
  }

  // STEP 16 학생 기기: 방이 닫히거나 내보내짐 → 시작 화면
  function onRoomClosed(message) {
    if (Game.state.netRole) Game.stopMatch();
    room = null;
    showTitle();
    say(message, 'warn');
  }

  // 경기가 끝나고 [대기방으로] 누르면
  function backToLobby() {
    if (!room) return false;
    if (room.net) room.net.backToLobby(); // STEP 16: 학생 기기도 대기방 상태로
    GameState.change(STATES.LOBBY);
    render();
    return true;
  }

  // 나가기 (교사 방은 "방 닫기"를 한 번 더 눌러야 닫힘 — 실수 방지)
  let leaveArmed = false;
  function leave() {
    if (room && room.isTeacherRoom && !leaveArmed) {
      leaveArmed = true;
      el.leaveBtn.textContent = '정말 닫을까요? 한 번 더';
      setTimeout(() => { leaveArmed = false; if (room) render(); }, 2500);
      return;
    }
    leaveArmed = false;
    if (room && room.net) room.net.close(); // STEP 16: 학생 기기도 시작 화면으로
    if (room) room.leave();
    room = null;
    showTitle();
  }

  function startGame() {
    if (!room || !room.isHost() || el.start.disabled) return;
    const cfg = room.start();
    // STEP 16: 교사 방이면 학생 기기에 경기 시작을 알리고, 이 기기가 경기를 계산(host)
    if (room.net) {
      cfg.net = 'host';
      cfg.matchId = room.net.startMatch(cfg);
    }
    Game.startMatch(cfg);
  }

  // 캐릭터 카드 6장 만들기 (한 번만)
  function buildCards() {
    el.cards.innerHTML = '';
    CHARACTER_ORDER.forEach((id, i) => {
      const ch = CHARACTERS[id];
      const b = document.createElement('button');
      b.className = 'char-card';
      b.dataset.id = id;
      b.innerHTML =
        '<canvas class="cc-icon"></canvas>' +
        '<span class="cc-name">' + ch.name + '</span>' +
        '<span class="cc-role">' + ch.role + '</span>';
      b.addEventListener('click', () => { if (room) room.setCharacter(id); });
      el.cards.appendChild(b);
    });
  }

  // 능력치 막대 (가장 높은 캐릭터 = 100%)
  function bar(label, value, max, text) {
    const pct = Math.round(value / max * 100);
    return '<div class="cd-stat"><span class="cd-label">' + label + '</span>' +
      '<span class="cd-bar"><i style="width:' + pct + '%"></i></span>' +
      '<span class="cd-val">' + text + '</span></div>';
  }

  function renderDetail(id, teamId) {
    const ch = CHARACTERS[id];
    const all = CHARACTER_ORDER.map((k) => CHARACTERS[k]);
    const maxHp = Math.max(...all.map((c) => c.hp));
    const maxSp = Math.max(...all.map((c) => c.speed));
    const maxRange = Math.max(...all.map((c) => c.attack.range));
    const maxDmg = Math.max(...all.map((c) => c.attack.damage));
    const sp = ch.special;
    // 수정 STEP 4: 터미널 문제를 맞힐 때마다 LEVEL 1 → 2 → 3, 반지름이 커짐
    const radiusLine = '터미널 문제로 LEVEL UP · 반지름 ' + sp.levels.map((l) => l.r + 'm').join(' → ') + ' · 한 번에 ' + sp.cost + '⚡';
    el.detail.innerHTML = '<div class="cd-main">' +
      '<div class="cd-head"><span class="cd-name">' + ch.name + '</span><span class="cd-role">' + ch.role + '</span></div>' +
      bar('체력', ch.hp, maxHp, ch.hp) +
      bar('속도', ch.speed, maxSp, ch.speed.toFixed(1)) +
      bar('사거리', ch.attack.range, maxRange, ch.attack.range + 'm') +
      bar('공격', ch.attack.damage, maxDmg, ch.attack.damage) +
      '<div class="cd-line"><b>기본 공격</b> ' + ch.attack.name + ' · 충전 ' + ch.attack.reloadSec + '초</div>' +
      '<div class="cd-line"><b>특수기</b> ' + sp.name + ' — ' + sp.desc + '</div>' +
      // 새 STEP 4: 늘 켜져 있는 특성 (메딕 회복 오라)
      (ch.passive ? '<div class="cd-line"><b>특성</b> ' + ch.passive.name + ' — 둘레 ' + ch.passive.r + 'm 안 친구들이 1초에 ' + ch.passive.healPerSec + '씩 회복</div>' : '') +
      '<div class="cd-line cd-math">' + radiusLine + '</div></div>' +
      // 캐릭터 리디자인: 터미널 문제로 강해지면 모습도 바뀜 (LEVEL 2 장비 빛, LEVEL 3 MAX 금색)
      '<div class="cd-levels">' + [1, 2, 3].map((lv) => '<figure><canvas class="cd-lv" data-lv="' + lv + '"></canvas><figcaption>' +
        (lv === 3 ? 'LEVEL 3 MAX' : 'LEVEL ' + lv) + '</figcaption></figure>').join('') + '</div>';
    const team = teamId || 'SOLAR';
    el.detail.querySelectorAll('.cd-lv').forEach((cv) => Renderer.drawCharacterIcon(cv, id, team, +cv.dataset.lv));
  }

  // 팀 목록 한 줄 (over: 팀 크기를 넘어 이번 경기는 관전)
  function row(p, over) {
    const ch = CHARACTERS[p.charId];
    const host = room.isTeacherRoom;
    const tags = (p.isMe ? '<span class="tag me">나</span>' : '') +
      (p.kind === 'teacher' ? '<span class="tag teacher">선생님</span>' : '') +
      (p.kind === 'bot' ? '<span class="tag bot">' + (room.mode === 'practice' ? '연습' : '봇') + '</span>' : '') +
      (p.test ? '<span class="tag bot">시험</span>' : '') +
      (over ? '<span class="tag over">관전</span>' : '');
    const remove = host && (p.test || p.net)
      ? '<span class="tl-remove" title="' + (p.net ? '내보내기' : '빼기') + '">✕</span>' : '';
    return '<li data-id="' + p.id + '" class="' + (p.isMe ? 'mine' : '') + (host && p.kind !== 'bot' ? ' movable' : '') +
      (over ? ' over' : '') + '"><canvas class="tl-icon" data-char="' + p.charId +
      '" data-team="' + p.team + '"></canvas><span class="tl-nick">' + escapeHtml(p.nick) + '</span>' + tags +
      '<span class="tl-char">' + ch.name + '</span>' + remove + '</li>';
  }

  // 팀 목록: 팀 크기를 넘는 사람은 "관전", 교사 방이면 시작할 때 들어올 봇을 미리 보여줌
  function teamList(players, team) {
    const size = room.settings.teamSize || 99;
    // 교사를 앞에 (교사는 자리가 모자라도 꼭 참가)
    const list = players.filter((p) => p.team === team)
      .sort((a, b) => (a.kind === 'teacher' ? -1 : b.kind === 'teacher' ? 1 : 0));
    let html = list.map((p, i) => row(p, room.isTeacherRoom && i >= size)).join('');
    if (room.isTeacherRoom && room.settings.fillWithBots) {
      const count = (t) => Math.min(size, players.filter((p) => p.team === t).length);
      const target = Math.max(count('SOLAR'), count('LUNAR'), players.length ? 1 : 0);
      const bots = target - count(team);
      if (bots > 0) html += '<li class="bot-preview">+ 봇 ' + bots + '명 (시작할 때 인원 맞춤)</li>';
    }
    return html;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function render() {
    if (!room) return;
    const players = room.players();
    const me = players.find((p) => p.id === room.myId);
    el.roomCode.textContent = room.mode === 'practice' ? '혼자 연습'
      : room.connecting ? '방 만드는 중…' : '방 ' + room.code;
    const studentCount = players.filter((p) => p.kind === 'student').length;
    el.count.textContent = room.isTeacherRoom
      ? '학생 ' + studentCount + '명' + (room.teacherPlays() ? ' + 선생님' : '')
      : '참가 ' + players.filter((p) => p.kind !== 'bot').length + '명' +
        (players.some((p) => p.kind === 'bot') ? ' · ' + (room.mode === 'practice' ? '연습 상대 ' : '봇 ') +
          players.filter((p) => p.kind === 'bot').length : '');

    el.teamSolar.innerHTML = teamList(players, 'SOLAR');
    el.teamLunar.innerHTML = teamList(players, 'LUNAR');

    // STEP 15: 교사용 도구
    const host = !!room.isTeacherRoom;
    el.hostBar.hidden = !host;
    if (host) {
      el.setSummary.textContent = Teacher.summary(room.settings);
      // STEP 16: 연결 상태에 따라 안내
      let note;
      if (room.connecting) note = '인터넷(Firebase)에 방을 여는 중이에요…';
      else if (room.offline) note = '⚠ ' + (room.offlineReason || '인터넷에 연결되지 않았어요.') +
        ' 학생 기기가 들어올 수 없어요. (이 기기에서 시험만 할 수 있어요)';
      else if (room.net && !room.net.isOnline()) note = '⚠ 인터넷 연결이 끊겼어요. 다시 연결하는 중…';
      else note = '방 번호 ' + room.code + ' — 학생들은 시작 화면에서 이 번호를 입력해 들어와요.' +
        ' 이름을 누르면 팀을 옮길 수 있어요.';
      el.hostNote.textContent = note;
      el.hostNote.classList.toggle('warn', !!room.offline || (!!room.net && !room.net.isOnline()));
      document.getElementById('btn-add-test').hidden = !(room.offline || TEST_MODE);
    }
    if (!leaveArmed) el.leaveBtn.textContent = host ? '방 닫기' : '← 나가기';
    // 선생님이 관전이면 캐릭터 고르기 대신 안내
    el.chars.hidden = !me;
    el.specNote.hidden = !!me || !host;
    const sp = room.spectators();
    el.spect.textContent = sp.length ? '관전: ' + sp.map((s) => s.nick).join(', ') : '';
    document.querySelectorAll('.tl-icon').forEach((c) => Renderer.drawCharacterIcon(c, c.dataset.char, c.dataset.team));

    // 캐릭터 카드: 내 선택 표시, 중복 금지 설정이면 같은 팀이 고른 캐릭터는 막음
    const taken = room.settings.allowDuplicateCharacters ? [] :
      players.filter((p) => me && p.team === me.team && p.id !== me.id).map((p) => p.charId);
    Array.from(el.cards.children).forEach((b) => {
      const id = b.dataset.id;
      b.classList.toggle('selected', !!me && me.charId === id);
      b.disabled = taken.indexOf(id) !== -1;
      Renderer.drawCharacterIcon(b.querySelector('canvas'), id, me ? me.team : 'SOLAR');
    });
    if (me) renderDetail(me.charId, me.team);

    // 시작 버튼은 방장(교사)만
    el.start.hidden = !room.isHost();
    el.wait.hidden = room.isHost();
    if (!room.isHost()) el.wait.textContent = room.waitText ? room.waitText() : '선생님이 게임을 시작하기를 기다리는 중…';
    el.rejoin.hidden = !(room.canRejoin && room.canRejoin());
    // 교사 방: 경기에 나갈 사람이 있어야 시작 (방을 여는 중에는 기다림)
    const canStart = !host || (players.length > 0 && !room.connecting);
    el.start.disabled = !canStart;
    el.start.textContent = canStart ? '게임 시작' : room.connecting ? '방 만드는 중…' : '학생을 기다리는 중';
  }

  return { init, showTitle, backToLobby, room: () => room };
})();
