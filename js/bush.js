/* ============================================================
   서클 배틀 - 부쉬(수풀) 은폐 (bush.js)  — 새 STEP 2
   ------------------------------------------------------------
   캐릭터를 지우지 않고, 각 기기가 "이 캐릭터를 그릴지"만 정합니다. (판정·범위 공격은 그대로)
     p.inBush        부쉬 안에 있는지 (모든 기기가 위치로 똑같이 계산)
     p.bushZoneId    들어 있는 부쉬 이름 (예: 'K3')
     p.revealedUntil 이 시각(state.time)까지는 부쉬 안이어도 드러남
                     쏘기·스킬 1.2초 / 맞으면 0.9초 — 교사 기기가 정해서 학생 기기로 보냄
   상대 팀 T 에게 숨겨지는 조건 (모두 만족해야 숨음)
     1) 부쉬 안에 있음   2) 드러난 시간이 아님
     3) T 팀 누구도 같은 부쉬 안에 없음   4) T 팀 누구도 2.5m 안으로 다가오지 않음
   우리 팀에게는 항상 보임. 부쉬 밖으로 나오면 바로 보임.
   교실 TV(선생님 관전): 상대 팀에게 숨은 캐릭터는 TV에서도 숨김 (TV를 보고 찾지 못하게)
   ============================================================ */

const Bushes = (function () {
  const B = CONFIG.BUSH;

  // 매 프레임: 누가 어느 부쉬 안에 있는지 (혼자·교사·학생 기기 모두)
  function update(players) {
    players.forEach((p) => {
      const b = p.alive ? GameMap.bushAt(p.x, p.y) : null;
      p.bushZoneId = b ? b.id : null;
      p.inBush = !!b;
    });
  }

  // 부쉬 안에서 공격·스킬·피격 → 잠시 드러남 (혼자·교사 기기)
  function reveal(p, sec, now) {
    if (!p) return;
    p.revealedUntil = Math.max(p.revealedUntil || 0, now + sec);
  }
  function revealAttack(p, now) { reveal(p, B.REVEAL_ATTACK_SEC, now); }
  function revealHit(p, now) { reveal(p, B.REVEAL_HIT_SEC, now); }

  /**
   * target 이 team 에게 숨겨져 있는지
   * @param players 모든 플레이어 (같은 부쉬·가까이 다가온 사람 확인)
   */
  function hiddenFrom(target, team, players, now) {
    if (!target || !target.alive || !target.inBush) return false;
    if (!team || target.team === team) return false;
    if ((target.revealedUntil || 0) > now) return false;
    const near2 = B.NEAR_REVEAL_M * B.NEAR_REVEAL_M;
    for (const o of players) {
      if (o.team !== team || !o.alive) continue;
      if (o.bushZoneId && o.bushZoneId === target.bushZoneId) return false; // 같은 부쉬 안
      const dx = o.x - target.x, dy = o.y - target.y;
      if (dx * dx + dy * dy <= near2) return false;                          // 바로 옆까지 다가옴
    }
    return true;
  }

  function enemyOf(team) { return team === 'SOLAR' ? 'LUNAR' : 'SOLAR'; }

  /**
   * 이 기기 화면에서 target 을 숨길지
   *   내 캐릭터가 있으면 내 팀 기준, 관전(TV)이면 target 의 상대 팀 기준
   */
  function hiddenOnScreen(target, state) {
    const me = state.localPlayer;
    const team = me && state.viewMode === 'play' ? me.team : enemyOf(target.team);
    return hiddenFrom(target, team, state.players, state.time);
  }

  return { update, reveal, revealAttack, revealHit, hiddenFrom, hiddenOnScreen, enemyOf };
})();
