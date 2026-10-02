/* ============================================================
   서클 배틀 - 방 (room.js)
   ------------------------------------------------------------
   대기방이 알아야 하는 것(방 번호, 참가자, 팀, 캐릭터, 방장 여부, 시작)을
   한 가지 모양(인터페이스)으로 다룹니다.

   STEP 14: LocalRoom — 혼자 연습용 방 (이 기기 안에서만)
   STEP 16: 같은 모양의 NetworkRoom(Firebase)을 network.js에 만들어
            대기방 코드는 그대로 두고 방만 바꿔 끼웁니다.

   방이 갖춰야 할 모양
     room.code            방 번호 (연습은 '연습')
     room.mode            'practice' | 'room'
     room.settings        교사 설정 (ROOM_DEFAULTS 모양)
     room.myId            이 기기 플레이어의 id
     room.players()       [{ id, nick, team, charId, kind, isMe }]
     room.spectators()    [{ id, nick, kind }]  (관전하는 교사 등)
     room.isHost()        이 기기가 시작 버튼을 누를 수 있는지
     room.setCharacter(charId)
     room.subscribe(fn)   참가자·캐릭터가 바뀌면 fn(room) 호출
     room.start()         경기 시작 → Game.startMatch 에 넘길 설정을 돌려줌
     room.leave()
   ============================================================ */

const LocalRoom = (function () {
  function create(nick) {
    const listeners = [];
    const me = { id: 'me', nick, team: 'SOLAR', charId: 'blaster', kind: 'student', isMe: true };
    // 연습 상대 (game.js 의 PRACTICE_DUMMIES 와 같은 캐릭터)
    const dummies = PRACTICE_DUMMIES.map((d, i) => ({
      id: 'dummy-' + i, nick: d.nick, team: 'LUNAR', charId: d.charId, kind: 'bot',
    }));

    const room = {
      code: '연습',
      mode: 'practice',
      settings: { ...CONFIG.ROOM_DEFAULTS },
      myId: me.id,
      players: () => [me].concat(dummies),
      spectators: () => [],
      isHost: () => true,           // 혼자 연습은 내가 시작
      me: () => me,
      setCharacter(charId) {
        if (!CHARACTERS[charId]) return;
        me.charId = charId;
        notify();
      },
      subscribe(fn) { listeners.push(fn); },
      start() {
        return {
          mode: 'practice',
          viewMode: 'play',
          me: { id: me.id, nick: me.nick, team: me.team, charId: me.charId, slot: 2 },
          settings: room.settings,
        };
      },
      leave() { listeners.length = 0; },
    };
    function notify() { listeners.forEach((fn) => fn(room)); }
    return room;
  }

  return { create };
})();

/* ============================================================
   STEP 15: HostRoom — 교사가 만든 방 (교사 기기가 방장)
   ------------------------------------------------------------
   - 방 번호 4자리 발급
   - 학생이 들어오면 인원이 적은 팀에 자동 배정
   - 교사: 팀 섞기, 이름을 눌러 팀 옮기기, 설정 바꾸기, 방 닫기
   - 시작하면: 팀 크기를 넘는 학생은 관전, 인원이 적은 팀은 봇으로 채움
   STEP 16: 학생 기기 연결은 network.js 의 HostNet 이 이 방에 학생을 넣고 뺍니다.
     [시험 학생 추가]는 인터넷이 안 될 때나 주소에 ?test=1 을 붙였을 때만 보입니다.
   ============================================================ */
const HostRoom = (function () {
  const TEST_NAMES = ['민준', '서연', '도윤', '하은', '지호', '수아', '예준', '지우', '시우', '하린', '주원', '채원'];

  function randomCode() {
    return String(1000 + Math.floor(Math.random() * 9000));
  }

  function create(settings) {
    const listeners = [];
    const teacher = { id: 'teacher', nick: '선생님', kind: 'teacher', charId: 'guardian', team: 'SOLAR', isMe: true };
    let students = [];   // [{ id, nick, team, charId, kind: 'student', test? }]
    let testCount = 0;

    const room = {
      code: randomCode(),
      mode: 'room',
      settings: { ...settings },
      myId: teacher.id,
      isTeacherRoom: true,
      teacherPlays: () => room.settings.teacherRole === CONFIG.TEACHER_ROLES.PLAY,
      // 경기에 나갈 사람 (교사가 참가하면 교사 포함)
      players: () => (room.teacherPlays() ? [teacher] : []).concat(students),
      spectators: () => (room.teacherPlays() ? [] : [{ id: teacher.id, nick: teacher.nick, kind: 'teacher' }]),
      students: () => students,
      isHost: () => true,
      me: () => teacher,

      setCharacter(charId) {
        if (!CHARACTERS[charId]) return;
        teacher.charId = charId;
        notify();
      },

      // 학생 들어옴 (STEP 16: 학생 기기가 들어오면 network.js 가 부름 → opts = { id, net: true })
      addStudent(nick, charId, opts) {
        opts = opts || {};
        const all = room.players();
        const s = {
          id: opts.id || 'st-' + Date.now().toString(36) + '-' + (students.length + 1),
          nick, charId: charId || CHARACTER_ORDER[Math.floor(Math.random() * CHARACTER_ORDER.length)],
          kind: 'student', team: TeamPlanner.teamForNewcomer(all),
        };
        if (opts.net) s.net = true;   // 다른 기기에서 들어온 학생
        students.push(s);
        notify();
        return s;
      },
      // STEP 16: 학생이 자기 기기에서 캐릭터·닉네임을 바꿈
      findStudent: (id) => students.find((s) => s.id === id) || null,
      updateStudent(id, fields) {
        const s = room.findStudent(id);
        if (!s) return;
        let changed = false;
        Object.keys(fields).forEach((k) => { if (s[k] !== fields[k]) { s[k] = fields[k]; changed = true; } });
        if (changed) notify();
      },
      // STEP 16: 데이터베이스에서 빈 방 번호를 받으면 바꿈
      setCode(code) {
        room.code = code;
        notify();
      },
      // 시험용 가상 학생
      addTestStudent() {
        const nick = TEST_NAMES[testCount % TEST_NAMES.length] + (testCount >= TEST_NAMES.length ? testCount : '');
        testCount++;
        const s = room.addStudent(nick);
        s.test = true;
        notify();
        return s;
      },
      removePlayer(id) {
        students = students.filter((s) => s.id !== id);
        notify();
      },
      // 이름을 누르면 반대 팀으로
      moveToOtherTeam(id) {
        const p = room.players().find((x) => x.id === id);
        if (!p) return;
        p.team = p.team === 'SOLAR' ? 'LUNAR' : 'SOLAR';
        notify();
      },
      // 팀 섞기: 무작위로 다시 나눔 (교사 참가면 교사도 섞임)
      shuffleTeams() {
        const plan = TeamPlanner.plan({
          students: students.map((s) => ({ id: s.id, nick: s.nick })),
          teacher: { id: teacher.id, nick: teacher.nick },
          teacherRole: room.settings.teacherRole,
          teamSize: 99,          // 섞을 때는 팀 크기 제한 없이 반반
          fillWithBots: false,
        });
        ['SOLAR', 'LUNAR'].forEach((t) => plan[t].forEach((x) => {
          const p = x.id === teacher.id ? teacher : students.find((s) => s.id === x.id);
          if (p) p.team = t;
        }));
        notify();
      },
      updateSettings(s) {
        const wasPlaying = room.teacherPlays();
        room.settings = { ...s };
        // 선생님이 새로 참가하면 인원이 적은 팀으로
        if (!wasPlaying && room.teacherPlays()) teacher.team = TeamPlanner.teamForNewcomer(students);
        notify();
      },

      /**
       * 경기 시작: 팀 크기 적용 → 봇으로 빈자리 채우기 → 경기 설정
       */
      start() {
        const size = room.settings.teamSize;
        const lineup = { SOLAR: [], LUNAR: [] };
        const waiting = [];
        // 교사를 먼저 넣어 자리가 모자라도 교사는 꼭 참가
        room.players().slice().sort((a, b) => (a.kind === 'teacher' ? -1 : b.kind === 'teacher' ? 1 : 0))
          .forEach((p) => {
            if (lineup[p.team].length < size) lineup[p.team].push(p);
            else waiting.push(p);
          });
        if (room.settings.fillWithBots) {
          const target = Math.max(lineup.SOLAR.length, lineup.LUNAR.length, 1);
          let n = 1;
          ['SOLAR', 'LUNAR'].forEach((t) => {
            while (lineup[t].length < target) {
              lineup[t].push({ id: 'bot-' + n, nick: '봇 ' + n, kind: 'bot', team: t,
                charId: CHARACTER_ORDER[(n * 2) % CHARACTER_ORDER.length] });
              n++;
            }
          });
        }
        room.lastLineup = { lineup, waiting };

        // STEP 16: "같은 캐릭터 팀마다 한 명"이면, 두 학생이 동시에 같은 캐릭터를 골랐을 때
        //          늦게 온 학생을 남은 캐릭터로 바꿔 줌 (경기에서만, 대기방 선택은 그대로)
        const charOf = {};
        if (!room.settings.allowDuplicateCharacters) {
          ['SOLAR', 'LUNAR'].forEach((t) => {
            const used = [];
            lineup[t].forEach((p) => {
              let c = p.charId;
              if (used.indexOf(c) !== -1) c = CHARACTER_ORDER.find((x) => used.indexOf(x) === -1) || c;
              used.push(c);
              charOf[p.id] = c;
            });
          });
        }

        const toSpec = (p, slot) => ({ id: p.id, nick: p.nick, team: p.team, charId: charOf[p.id] || p.charId,
          slot, kind: p.kind, net: !!p.net });
        const others = [];
        const all = [];   // 경기에 나오는 모든 사람 (STEP 16: 모든 기기가 같은 순서로 사용)
        let meSpec = null;
        ['SOLAR', 'LUNAR'].forEach((t) => lineup[t].forEach((p, i) => {
          const spec = toSpec({ ...p, team: t }, i);
          all.push(spec);
          if (p.id === teacher.id) meSpec = spec;
          else others.push(spec);
        }));
        return {
          mode: 'room',
          viewMode: meSpec ? 'play' : 'spectate',
          me: meSpec,
          others,
          lineup: all,
          settings: room.settings,
          roomCode: room.code,
        };
      },

      subscribe(fn) { listeners.push(fn); },
      leave() { listeners.length = 0; students = []; },
    };
    function notify() { listeners.forEach((fn) => fn(room)); }
    return room;
  }

  return { create };
})();
