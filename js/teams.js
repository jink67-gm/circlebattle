/* ============================================================
   서클 배틀 - 팀 배정 (teams.js)
   ------------------------------------------------------------
   학생(과 교사)을 SOLAR / LUNAR 두 팀에 무작위로 나눕니다.
   - 교사 역할이 'play'이면 교사도 한 명의 플레이어로 섞여 들어갑니다.
   - 교사 역할이 'spectate'이면 교사는 관전자가 됩니다.
   - 두 팀 인원이 다르면 적은 쪽에 봇을 넣어 맞춥니다.
   예) 학생 9명 + 교사 관전 → 5 대 4 + 봇 1 = 5 대 5
       학생 9명 + 교사 참가 → 5 대 5 (봇 없음)
   ============================================================ */

const TeamPlanner = {
  /**
   * @param {Object} opts
   * @param {Array}  opts.students   [{ id, nick }]
   * @param {Object} opts.teacher    { id, nick }
   * @param {String} opts.teacherRole 'play' | 'spectate'
   * @param {Number} opts.teamSize   한 팀 최대 인원
   * @param {Boolean} opts.fillWithBots
   * @param {Function} [opts.random] 테스트용 난수 함수 (기본 Math.random)
   * @returns {{ SOLAR: Array, LUNAR: Array, spectators: Array, waiting: Array }}
   */
  plan(opts) {
    const random = opts.random || Math.random;
    const teamSize = opts.teamSize || CONFIG.ROOM_DEFAULTS.teamSize;
    const teacherPlays = opts.teacherRole === CONFIG.TEACHER_ROLES.PLAY;

    const result = { SOLAR: [], LUNAR: [], spectators: [], waiting: [] };

    // 1) 학생 목록을 무작위로 섞기 (피셔-예이츠)
    const players = opts.students.map((s) => ({ ...s, kind: 'student' }));
    for (let i = players.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [players[i], players[j]] = [players[j], players[i]];
    }

    // 2) 교사 넣기: 참가하면 맨 앞에 넣어 자리가 모자라도 꼭 팀에 들어가게 합니다.
    if (opts.teacher) {
      const teacher = { ...opts.teacher, kind: 'teacher' };
      if (teacherPlays) players.unshift(teacher);
      else result.spectators.push(teacher);
    }

    // 3) 번갈아 가며 배정. 두 팀이 꽉 차면 나머지는 대기(관전)로.
    //    첫 팀을 무작위로 정해 항상 SOLAR가 한 명 많아지는 일을 막습니다.
    const order = random() < 0.5 ? ['SOLAR', 'LUNAR'] : ['LUNAR', 'SOLAR'];
    players.forEach((p, i) => {
      const team = order[i % 2];
      if (result[team].length < teamSize) {
        result[team].push({ ...p, team });
      } else {
        result.waiting.push(p);
      }
    });

    // 4) 인원이 적은 팀에 봇 추가
    if (opts.fillWithBots) {
      const target = Math.max(result.SOLAR.length, result.LUNAR.length);
      let botNo = 1;
      ['SOLAR', 'LUNAR'].forEach((team) => {
        while (result[team].length < target) {
          result[team].push({ id: 'bot-' + botNo, nick: '봇 ' + botNo, kind: 'bot', team });
          botNo++;
        }
      });
    }

    return result;
  },

  /**
   * STEP 15: 새로 들어온 학생의 팀 — 인원이 적은 팀, 같으면 무작위
   * @param players 지금 방에 있는 플레이어 [{ team }]
   */
  teamForNewcomer(players, random) {
    random = random || Math.random;
    const s = players.filter((p) => p.team === 'SOLAR').length;
    const l = players.filter((p) => p.team === 'LUNAR').length;
    if (s < l) return 'SOLAR';
    if (l < s) return 'LUNAR';
    return random() < 0.5 ? 'SOLAR' : 'LUNAR';
  },
};
