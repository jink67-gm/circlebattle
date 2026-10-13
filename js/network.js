/* ============================================================
   서클 배틀 - 네트워크 (network.js)
   ------------------------------------------------------------
   STEP 16: Firebase Realtime Database로 교사 기기와 학생 기기를 연결합니다.
   Firebase를 직접 다루는 코드는 이 파일에만 있습니다.
   (경기 상황을 주고받는 규칙은 sync.js, 게임 규칙은 game.js)

   데이터베이스 모양  circleBattle/rooms/{방 번호}/
     meta     { hostId, hostOnline, status('lobby'|'playing'), settings, teacher, createdAt }
     roster   교사 기기가 정리한 참가자 목록 (팀·캐릭터) → 학생 대기방에 그대로 보임
     players  학생이 직접 쓰는 곳 { nick, charId }  (연결이 끊기면 자동으로 지워짐)
     kick     교사가 내보낸 학생 표시
     match    경기 시작 정보 { id, lineup, settings, countdown }
     snap     경기 중 교사 기기가 보내는 경기 상황 (sync.js)
     in       경기 중 학생 기기가 보내는 내 위치·명령 (sync.js)

   Net         Firebase 연결, 기기 번호, 연결 상태
   NetworkRoom 학생: 방 번호로 참가 (room.js 의 "방 모양"과 같음)
   HostNet     교사: HostRoom 을 데이터베이스에 올리고 학생을 받음
   ============================================================ */

const Net = (function () {
  let db = null;
  let connected = false;
  let everConnected = false;
  const listeners = [];
  const params = new URLSearchParams(location.search);

  // Firebase 스크립트를 불러왔는지 (인터넷이 없으면 불러오지 못함)
  function available() {
    return typeof firebase !== 'undefined' && !!firebase.initializeApp && !!firebase.database;
  }

  function init() {
    if (db) return db;
    if (!available()) return null;
    try {
      const app = firebase.apps && firebase.apps.length ? firebase.app() : firebase.initializeApp(CONFIG.FIREBASE);
      db = firebase.database(app);
      db.ref('.info/connected').on('value', (s) => {
        connected = s.val() === true;
        if (connected) everConnected = true;
        listeners.slice().forEach((fn) => fn(connected));
      });
    } catch (e) {
      console.warn('Firebase 연결 실패', e);
      db = null;
    }
    return db;
  }

  // circleBattle/ 아래 경로
  function ref(path) {
    return init().ref(CONFIG.NET.ROOT + (path ? '/' + path : ''));
  }

  function serverTime() {
    return firebase.database.ServerValue.TIMESTAMP;
  }

  // 이 기기의 번호 (한 번 만들면 이 기기에 기억 → 새로고침해도 같은 사람으로 다시 참가)
  // 시험할 때는 주소 끝 ?dev=이름 으로 기기를 나눌 수 있습니다.
  let myDeviceId = null;
  function deviceId() {
    if (myDeviceId) return myDeviceId;
    const fromUrl = params.get('dev');
    if (fromUrl && /^[a-zA-Z0-9_-]{1,20}$/.test(fromUrl)) return (myDeviceId = 'd-' + fromUrl);
    const KEY = 'circleBattle.deviceId';
    try { myDeviceId = localStorage.getItem(KEY); } catch (e) { myDeviceId = null; }
    if (!myDeviceId) {
      myDeviceId = 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      try { localStorage.setItem(KEY, myDeviceId); } catch (e) { /* 저장 안 되는 브라우저 */ }
    }
    return myDeviceId;
  }

  // 연결 상태가 바뀌면 fn(true/false). 돌려준 함수를 부르면 그만 듣기
  function onConnection(fn) {
    listeners.push(fn);
    return () => {
      const i = listeners.indexOf(fn);
      if (i !== -1) listeners.splice(i, 1);
    };
  }

  // 약속(Promise)이 너무 오래 걸리면 실패로 처리 (인터넷이 끊기면 Firebase는 끝없이 기다림)
  function withTimeout(promise, sec, message) {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error(message || 'timeout')), (sec || CONFIG.NET.CONNECT_TIMEOUT_SEC) * 1000);
      promise.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
    });
  }

  // 에러를 선생님·학생이 알아볼 수 있는 말로
  function explain(err) {
    const m = String((err && (err.code || err.message)) || err || '');
    if (/PERMISSION_DENIED|permission/i.test(m)) {
      return 'Firebase 데이터베이스 규칙이 막고 있어요. (README의 "Firebase 규칙" 참고)';
    }
    if (/timeout/i.test(m)) return '인터넷 연결이 느리거나 끊겨 있어요. 잠시 뒤 다시 해 보세요.';
    return m || '알 수 없는 오류';
  }

  // Firebase는 배열을 {0:…, 1:…} 로 돌려줄 때가 있어 항상 배열로 바꿈
  function toArray(v) {
    if (!v) return [];
    if (Array.isArray(v)) return v.filter((x) => x !== null && x !== undefined);
    return Object.keys(v).sort((a, b) => Number(a) - Number(b)).map((k) => v[k]).filter((x) => x !== null && x !== undefined);
  }

  return {
    available, init, ref, serverTime, deviceId, onConnection, withTimeout, explain, toArray,
    isConnected: () => connected,
    everConnected: () => everConnected,
  };
})();

/* ============================================================
   학생: 방 번호로 참가하는 방 (NetworkRoom)
   대기방(lobby.js)은 LocalRoom·HostRoom 과 똑같이 다룹니다.
   ============================================================ */
const NetworkRoom = (function () {
  const CHAR_KEY = 'circleBattle.char';

  /**
   * @returns Promise<room>  실패하면 Error(학생이 읽을 수 있는 말)
   */
  function join(code, nick) {
    if (!Net.init()) {
      return Promise.reject(new Error('인터넷에 연결되지 않아 방에 들어갈 수 없어요. [혼자 연습하기]는 할 수 있어요.'));
    }
    const base = Net.ref('rooms/' + code);
    const myId = Net.deviceId();
    let myChar = 'blaster';
    try { myChar = localStorage.getItem(CHAR_KEY) || 'blaster'; } catch (e) { /* 무시 */ }
    if (!CHARACTERS[myChar]) myChar = 'blaster';

    return Net.withTimeout(base.child('meta').once('value'), null, 'timeout').then((s) => {
      const meta = s.val();
      if (!meta || !meta.hostId) throw new Error(code + '번 방을 찾을 수 없어요. 번호를 다시 확인해 주세요.');
      if (meta.hostOnline === false) throw new Error('선생님 화면이 꺼져 있어요. 선생님께 방을 다시 열어 달라고 해 주세요.');
      return Net.withTimeout(base.child('kick/' + myId).remove(), null, 'timeout').then(() => create(base, code, meta, myId, nick, myChar));
    }).catch((e) => {
      throw new Error(e && /^\d{4}번 방|^선생님|^인터넷/.test(e.message) ? e.message : Net.explain(e));
    });
  }

  function create(base, code, meta, myId, nick, myChar) {
    const listeners = [];
    const offs = [];
    let roster = [];
    let closed = false;
    let lastMatchId = null;
    let initialCheck = true;
    let checkTimer = null;
    let match = null;
    const myRef = base.child('players/' + myId);

    const room = {
      code,
      mode: 'room',
      isNetwork: true,
      isTeacherRoom: false,
      settings: { ...CONFIG.ROOM_DEFAULTS, ...(meta.settings || {}) },
      myId,
      status: meta.status || 'lobby',
      hostOnline: meta.hostOnline !== false,
      teacher: meta.teacher || null,
      onMatch: null,      // (kind: 'start' | 'end', match, late) 대기방이 정함
      onClosed: null,     // (message) 방이 닫히거나 내보내졌을 때

      players() {
        const list = roster.map((p) => ({ ...p, isMe: p.id === myId }));
        const me = list.find((p) => p.isMe);
        if (me) me.charId = myChar; // 내가 방금 고른 캐릭터를 바로 보여줌
        return list;
      },
      spectators() {
        const t = room.teacher;
        return t && !t.plays ? [{ id: 'teacher', nick: t.nick || '선생님', kind: 'teacher' }] : [];
      },
      isHost: () => false,
      me() { return room.players().find((p) => p.isMe) || null; },
      teamAssigned() { return !!room.me(); },

      setCharacter(charId) {
        if (!CHARACTERS[charId]) return;
        myChar = charId;
        try { localStorage.setItem(CHAR_KEY, charId); } catch (e) { /* 무시 */ }
        myRef.update({ charId });
        notify();
      },

      // 대기방 아래쪽 안내 문구
      waitText() {
        if (!room.hostOnline) return '선생님 기기 연결이 끊겼어요. 다시 연결되기를 기다리는 중…';
        if (!room.teamAssigned()) return '선생님 기기에 들어가는 중…';
        if (room.canRejoin()) return '경기가 진행 중이에요.';
        if (room.status === 'playing') return '경기가 진행 중이에요. 다음 경기부터 함께해요!';
        return '선생님이 게임을 시작하기를 기다리는 중…';
      },

      currentMatch: () => match,

      // STEP 18: 경기 중에 대기방으로 나왔다면 다시 들어갈 수 있음 (이번 경기 명단에 있을 때)
      canRejoin() {
        return room.status === 'playing' && !!match && !!match.id &&
          Net.toArray(match.lineup).some((p) => p && p.id === myId);
      },
      rejoinMatch() {
        if (room.canRejoin() && room.onMatch) room.onMatch('start', match, true);
      },
      subscribe(fn) { listeners.push(fn); },

      leave() {
        if (closed) return;
        closed = true;
        offs.forEach((off) => off());
        listeners.length = 0;
        myRef.onDisconnect().cancel();
        myRef.remove();
      },
    };

    function notify() { if (!closed) listeners.forEach((fn) => fn(room)); }

    // 들어가기: 내 이름·캐릭터 적기 + 연결이 끊기면 자동으로 지워지게
    function writeMe() {
      myRef.onDisconnect().remove();
      myRef.set({ nick, charId: myChar, at: Net.serverTime() });
    }
    writeMe();

    function listen(r, event, fn) {
      r.on(event, fn);
      offs.push(() => r.off(event, fn));
    }

    // 끊겼다가 다시 연결되면 다시 적기 (태블릿이 잠깐 잠들었을 때)
    let wasConnected = true;
    offs.push(Net.onConnection((on) => {
      if (on && !wasConnected && !closed) writeMe();
      wasConnected = on;
    }));

    listen(base.child('meta'), 'value', (s) => {
      const m = s.val();
      if (!m) { close('선생님이 방을 닫았어요.'); return; }
      room.settings = { ...CONFIG.ROOM_DEFAULTS, ...(m.settings || {}) };
      room.status = m.status || 'lobby';
      room.hostOnline = m.hostOnline !== false;
      room.teacher = m.teacher || null;
      if (typeof Sync !== 'undefined') Sync.setHostOnline(room.hostOnline);
      scheduleCheck();
      notify();
    });
    listen(base.child('roster'), 'value', (s) => {
      roster = Net.toArray(s.val());
      notify();
    });
    listen(base.child('match'), 'value', (s) => {
      match = s.val();
      scheduleCheck();
    });
    listen(base.child('kick/' + myId), 'value', (s) => {
      if (s.val()) close('선생님이 방에서 내보냈어요. 방 번호로 다시 들어올 수 있어요.');
    });

    // meta 와 match 가 따로 도착하므로 잠깐 모았다가 한 번에 판단
    function scheduleCheck() {
      clearTimeout(checkTimer);
      checkTimer = setTimeout(checkMatch, 30);
    }
    function checkMatch() {
      if (closed) return;
      const late = initialCheck;
      initialCheck = false;
      if (room.status === 'playing' && match && match.id && match.id !== lastMatchId) {
        lastMatchId = match.id;
        if (room.onMatch) room.onMatch('start', match, late);
      } else if (room.status === 'lobby' && lastMatchId) {
        if (room.onMatch) room.onMatch('end', match, false);
      }
    }

    function close(message) {
      if (closed) return;
      room.leave();
      if (room.onClosed) room.onClosed(message);
    }

    return room;
  }

  return { join };
})();

/* ============================================================
   교사: HostRoom 을 데이터베이스에 올리고 학생을 받음 (HostNet)
   ============================================================ */
const HostNet = (function () {
  const STORE_KEY = 'circleBattle.hostRoom';

  /**
   * 방 번호를 정해 데이터베이스에 방을 엽니다.
   * 새로고침 등으로 다시 열면 같은 방 번호를 다시 씁니다. (들어와 있던 학생이 그대로 남음)
   * @returns Promise<link>
   */
  function open(room) {
    if (!Net.init()) return Promise.reject(new Error('Firebase를 불러오지 못했어요 (인터넷 연결 확인).'));
    const myId = Net.deviceId();
    let saved = null;
    try { saved = localStorage.getItem(STORE_KEY); } catch (e) { saved = null; }

    // 쓸 수 있는 방 번호 찾기
    function tryCode(code, n) {
      return Net.withTimeout(Net.ref('rooms/' + code + '/meta').once('value')).then((s) => {
        const m = s.val();
        const now = Date.now();
        const age = m ? now - (m.createdAt || 0) : 0;
        // 비어 있거나, 내가 만들었던 방이거나, 오래된 방이면 사용
        const free = !m || m.hostId === myId || age > CONFIG.NET.ROOM_STALE_HOURS * 3600e3 ||
          (m.hostOnline === false && age > 30 * 60e3);
        if (free) return { code, reuse: !!m && m.hostId === myId };
        if (n <= 0) throw new Error('빈 방 번호를 찾지 못했어요.');
        return tryCode(randomCode(), n - 1);
      });
    }
    const first = saved && /^\d{4}$/.test(saved) ? saved : randomCode();
    return tryCode(first, 12).then(({ code, reuse }) => start(room, code, reuse, myId))
      .catch((e) => { throw new Error(Net.explain(e)); });
  }

  function randomCode() {
    return String(1000 + Math.floor(Math.random() * 9000));
  }

  function start(room, code, reuse, myId) {
    const base = Net.ref('rooms/' + code);
    const offs = [];
    let closed = false;
    let publishTimer = null;
    room.setCode(code);
    try { localStorage.setItem(STORE_KEY, code); } catch (e) { /* 무시 */ }

    function metaNow() {
      const me = room.me();
      return {
        hostId: myId,
        hostOnline: true,
        status: 'lobby',
        createdAt: Net.serverTime(),
        settings: { ...room.settings },
        teacher: { nick: me.nick, plays: room.teacherPlays() },
      };
    }

    const first = reuse
      ? base.update({ meta: metaNow(), match: null, snap: null, in: null, roster: null })
      : base.set({ meta: metaNow() });

    return Net.withTimeout(first).then(() => {
      const link = {
        code,
        startMatch, backToLobby, kick, close,
        isOnline: () => Net.isConnected(),
      };

      // 교사 기기가 꺼지거나 끊기면 학생에게 알림
      function markOnline() {
        base.child('meta/hostOnline').onDisconnect().set(false);
        base.child('meta/hostOnline').set(true);
      }
      markOnline();
      let wasConnected = true;
      offs.push(Net.onConnection((on) => {
        if (on && !wasConnected && !closed) markOnline();
        wasConnected = on;
        room.notifyNet && room.notifyNet();
      }));

      // 학생이 들어오고 나가고 캐릭터를 바꾸면 → HostRoom 에 반영
      const playersRef = base.child('players');
      const onPlayers = (s) => {
        const data = s.val() || {};
        Object.keys(data).forEach((id) => {
          const d = data[id];
          if (!d || typeof d.nick !== 'string') return;
          const nick = d.nick.slice(0, 8) || '학생';
          const charId = CHARACTERS[d.charId] ? d.charId : 'blaster';
          if (!room.findStudent(id)) room.addStudent(nick, charId, { id, net: true });
          else room.updateStudent(id, { nick, charId });
        });
        room.students().filter((st) => st.net && !data[st.id]).forEach((st) => room.removePlayer(st.id));
      };
      playersRef.on('value', onPlayers);
      offs.push(() => playersRef.off('value', onPlayers));

      // 교사 방이 바뀌면 → 학생 대기방에 보일 목록(roster)과 설정을 올림
      function publish() {
        publishTimer = null;
        if (closed) return;
        const roster = room.players().map((p) => clean({
          id: p.id, nick: p.nick, team: p.team, charId: p.charId, kind: p.kind, test: p.test ? true : null,
        }));
        const me = room.me();
        base.update({
          roster: roster.length ? roster : null,
          'meta/settings': { ...room.settings },
          'meta/teacher': { nick: me.nick, plays: room.teacherPlays() },
        });
      }
      room.subscribe(() => {
        if (!publishTimer) publishTimer = setTimeout(publish, 40);
      });
      publish();

      // 경기 시작: 경기 정보와 "경기 중" 표시를 한 번에 올림
      function startMatch(cfg) {
        const id = Date.now().toString(36);
        const lineup = cfg.lineup.map((p) => clean({
          id: p.id, nick: p.nick, team: p.team, charId: p.charId, slot: p.slot, kind: p.kind, net: p.net ? true : null,
        }));
        base.update({
          match: { id, lineup, settings: { ...cfg.settings }, countdown: 3, startedAt: Net.serverTime() },
          'meta/status': 'playing',
          snap: null,
          in: null,
          result: null,   // STEP 19: 지난 경기 기록 지우기
        });
        return id;
      }

      // 경기가 끝나고 대기방으로 (결과는 STEP 19에서 여기에 함께 저장)
      function backToLobby() {
        base.update({ 'meta/status': 'lobby', snap: null, in: null });
      }

      // 학생 내보내기
      function kick(id) {
        base.update({ ['kick/' + id]: true, ['players/' + id]: null });
      }

      // 방 닫기: 방을 통째로 지움 → 학생 화면은 시작 화면으로
      function close() {
        if (closed) return;
        closed = true;
        clearTimeout(publishTimer);
        offs.forEach((off) => off());
        base.child('meta/hostOnline').onDisconnect().cancel();
        base.remove();
        try { localStorage.removeItem(STORE_KEY); } catch (e) { /* 무시 */ }
      }

      return link;
    });
  }

  // Firebase는 undefined 를 저장하지 못하므로 빼고, null 은 "없음"이라 뺌
  function clean(o) {
    const out = {};
    Object.keys(o).forEach((k) => { if (o[k] !== undefined && o[k] !== null) out[k] = o[k]; });
    return out;
  }

  return { open };
})();
