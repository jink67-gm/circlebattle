/* ============================================================
   서클 배틀 - 화면 표시(HUD) (ui.js)
   ------------------------------------------------------------
   점수, 남은 시간, 관전 표시처럼 캔버스 위에 올라가는 글자를 관리합니다.
   값이 바뀔 때만 글자를 고쳐서 태블릿에서도 가볍게 동작합니다.
   ============================================================ */

const UI = (function () {
  const el = {};
  const last = {};

  function init() {
    el.scoreSolar = document.getElementById('score-solar');
    el.scoreLunar = document.getElementById('score-lunar');
    el.timer = document.getElementById('timer');
    el.target = document.getElementById('target-score');
    el.spectateBadge = document.getElementById('spectate-badge');
    el.respawn = document.getElementById('respawn-overlay');
    el.respawnSec = document.getElementById('respawn-sec');
    el.respawnFill = document.getElementById('respawn-bar-fill');
    // 에너지 바 눈금: r2·r3·r4 원의 넓이(=비용)만큼의 위치
    el.energyBar = document.getElementById('energy-bar');
    el.energyBar.addEventListener('animationend', () => el.energyBar.classList.remove('shake'));
    el.energyFill = document.getElementById('energy-fill');
    el.energyNum = document.getElementById('energy-num');
    el.ticks = CONFIG.SKILL_RADII.map((r) => {
      const t = document.getElementById('tick-r' + r);
      t.style.left = (skillCost(r) / CONFIG.ENERGY.MAX * 100) + '%';
      return { r, el: t };
    });
    el.spBtn = document.getElementById('btn-special');
    el.spName = document.getElementById('sp-name');
    el.spCost = document.getElementById('sp-cost');
    el.radiusPicker = document.getElementById('radius-picker');
    el.radiusBtns = Array.from(document.querySelectorAll('.radius-btn'));
    el.radiusBtns.forEach((b) => {
      const r = Number(b.dataset.r);
      b.querySelector('small').textContent = skillCost(r) + '⚡';
      // 버튼 안 원: 지름이 반지름에 비례 (r2 → 10px, r3 → 15px, r4 → 20px)
      const c = b.querySelector('.rb-circle');
      c.style.width = c.style.height = (r * 5) + 'px';
    });
    el.energyCost = document.getElementById('energy-cost');
    el.rc = document.getElementById('radius-compare');
    el.ammoBar = document.getElementById('ammo-bar');
    el.ammoBar.addEventListener('animationend', () => el.ammoBar.classList.remove('shake'));
    el.ammoPips = [];
    for (let i = 0; i < AMMO_MAX; i++) {
      const pip = document.createElement('span');
      pip.className = 'ammo-pip';
      pip.innerHTML = '<span class="ammo-fill"></span>';
      el.ammoBar.appendChild(pip);
      el.ammoPips.push(pip);
    }
  }

  // ---------------- 탄약 ● ● ● ----------------
  // 찬 탄은 꽉 찬 원, 충전 중인 탄은 아래에서부터 차오르는 원으로 보여줍니다.
  function updateAmmo(ammo) {
    const rounded = Math.floor(ammo * 20) / 20; // 0.05 단위로만 다시 그림
    if (last.ammo === rounded) return;
    last.ammo = rounded;
    el.ammoPips.forEach((pip, i) => {
      const fill = Math.max(0, Math.min(1, rounded - i));
      pip.classList.toggle('full', fill >= 1);
      pip.firstChild.style.transform = 'scaleY(' + fill + ')';
    });
  }

  // 탄약이 없는데 쏘려고 하면 흔들어 알려줌
  function flashNoAmmo() {
    el.ammoBar.classList.remove('shake');
    void el.ammoBar.offsetWidth; // 애니메이션 다시 시작
    el.ammoBar.classList.add('shake');
  }

  function setText(key, value) {
    if (last[key] === value) return;
    last[key] = value;
    el[key].textContent = value;
  }

  function formatTime(sec) {
    sec = Math.max(0, Math.ceil(sec));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  // 매 프레임 호출해도 괜찮습니다. (바뀐 값만 반영)
  function updateHud(state) {
    setText('scoreSolar', String(state.score.SOLAR));
    setText('scoreLunar', String(state.score.LUNAR));
    setText('timer', formatTime(state.timeLeft));
    setText('target', state.phase === 'overtime' ? '연장전 · C존' : '목표 ' + state.targetScore + '점');
    // 마지막 30초와 연장전은 시간이 빨갛게 깜빡임
    const hurry = state.phase === 'overtime' || (state.phase === 'playing' && state.timeLeft <= 30);
    if (last.hurry !== hurry) {
      last.hurry = hurry;
      el.timer.parentElement.classList.toggle('hurry', hurry);
    }
    // 우리 팀 점수를 왼쪽에 (LUNAR 플레이어는 좌우를 바꿈)
    const lunarSide = !!(state.localPlayer && state.localPlayer.team === 'LUNAR');
    if (last.lunarSide !== lunarSide) {
      last.lunarSide = lunarSide;
      document.getElementById('hud-top').classList.toggle('lunar-view', lunarSide);
    }
    if (state.localPlayer) {
      updateAmmo(state.localPlayer.ammo);
      updateRespawn(state.localPlayer, state.settings.respawnSeconds);
      updateEnergy(state.localPlayer, state.specialRadius);
      updateEnergyCost(state.localPlayer, state.specialPreview);
    }
  }

  // ---------------- STEP 11: 수학 미션 버튼 ----------------
  // 터미널 가까이 있을 때만 보임. 준비됨 / 충전 중(남은 시간) / 모두 끝냄
  function updateMissionButton(p, near, limit) {
    let status = 'hidden';
    if (p && near && p.alive && !p.inMission) {
      if (p.missionsUsed >= limit) status = 'done';
      else if (p.missionCooldown > 0) status = 'cooldown:' + Math.ceil(p.missionCooldown);
      else status = 'ready:' + (limit - p.missionsUsed);
    }
    if (last.missionStatus === status) return;
    last.missionStatus = status;

    const btn = document.getElementById('btn-mission');
    const title = btn.querySelector('.bm-title');
    const sub = document.getElementById('bm-sub');
    btn.hidden = status === 'hidden';
    if (btn.hidden) return;
    const touch = document.body.classList.contains('touch-mode');
    const [kind, n] = status.split(':');
    btn.classList.toggle('waiting', kind !== 'ready');
    if (kind === 'ready') {
      title.textContent = '수학 미션';
      sub.textContent = (touch ? '눌러서 시작' : 'F 키') + ' · 남은 ' + n + '문제';
    } else if (kind === 'cooldown') {
      title.textContent = '터미널 충전 중';
      sub.textContent = '다음 미션까지 ' + formatTime(Number(n));
    } else {
      title.textContent = '미션 완료';
      sub.textContent = '이번 경기 ' + limit + '문제를 모두 풀었어요';
    }
  }

  // ---------------- STEP 10: 에너지 바에 이번 비용 표시 ----------------
  // 미리보기 중이면 [남은 에너지 - 비용 ~ 남은 에너지] 구간이 흰색으로 깜빡임
  // 모자라면 [남은 에너지 ~ 비용] 구간이 빨갛게 깜빡임
  function updateEnergyCost(p, pv) {
    const key = pv ? Math.floor(p.energy) + '|' + pv.cost : 'off';
    if (last.costKey === key) return;
    last.costKey = key;
    const c = el.energyCost;
    if (!pv) { c.classList.remove('show'); return; }
    const max = CONFIG.ENERGY.MAX;
    const e = Math.min(p.energy, max);
    const from = pv.ok ? e - pv.cost : e;
    const to = pv.ok ? e : Math.min(max, pv.cost);
    c.style.left = (from / max * 100) + '%';
    c.style.width = (Math.max(0, to - from) / max * 100) + '%';
    c.classList.toggle('poor', !pv.ok);
    c.classList.add('show');
  }

  // ---------------- STEP 10: 반지름 비교 카드 ----------------
  // 예) 반지름 2m → 4m / 넓이 12.56㎡ → 50.24㎡ / 넓이 비 1 : 4 → 4배
  let rcTimer = null;
  function showRadiusCompare(fromR, toR) {
    if (fromR === toR) return;
    const cmp = compareCircles(fromR, toR);
    document.getElementById('rc-line1').textContent =
      '반지름 ' + fromR + 'm → ' + toR + 'm' + (Number.isInteger(cmp.radiusRatio) ? ' (' + cmp.radiusRatio + '배)' : '');
    document.getElementById('rc-line2').textContent = '넓이 ' + cmp.areaA + '㎡ → ' + cmp.areaB + '㎡';
    document.getElementById('rc-line3').textContent = '넓이 비 ' + cmp.ratioText + ' → ' + cmp.times;
    el.rc.hidden = true;
    void el.rc.offsetWidth;
    el.rc.hidden = false;
    clearTimeout(rcTimer);
    rcTimer = setTimeout(() => { el.rc.hidden = true; }, 3000);
  }

  // ---------------- 에너지 ⚡ 와 특수기 버튼 ----------------
  function updateEnergy(p, chosenR) {
    const e = Math.floor(p.energy);
    const key = e + '|' + chosenR + '|' + p.charId;
    if (last.energyKey === key) return;
    last.energyKey = key;

    el.energyFill.style.transform = 'scaleX(' + (p.energy / CONFIG.ENERGY.MAX).toFixed(3) + ')';
    el.energyNum.textContent = e + '/' + CONFIG.ENERGY.MAX;
    el.ticks.forEach((t) => t.el.classList.toggle('ready', p.energy >= skillCost(t.r)));

    const sp = CHARACTERS[p.charId].special;
    const isBlink = sp.type === 'blink';
    const cost = Skills.costOf(p.charId, chosenR);
    el.spName.textContent = sp.name;
    el.spCost.textContent = (isBlink ? '6m · ' : 'r' + chosenR + ' · ') + cost + '⚡';
    el.spBtn.classList.toggle('ready', p.energy >= cost);
    el.spBtn.classList.toggle('poor', p.energy < cost);
    // 순간이동은 반지름 고르기가 없음
    el.radiusPicker.hidden = isBlink;
    el.radiusBtns.forEach((b) => {
      const r = Number(b.dataset.r);
      b.classList.toggle('selected', r === chosenR);
      b.classList.toggle('poor', p.energy < skillCost(r));
    });
  }

  // 에너지가 모자라면 흔들어 알려줌
  function flashNoEnergy() {
    el.energyBar.classList.remove('shake');
    void el.energyBar.offsetWidth;
    el.energyBar.classList.add('shake');
  }

  // ---------------- 에너지 충전 중 ----------------
  // "재충전 중... 5" → 4 → 3 ... 과 차오르는 막대
  function updateRespawn(p, total) {
    const show = !p.alive;
    if (last.respawnShow !== show) {
      last.respawnShow = show;
      el.respawn.hidden = !show;
    }
    if (!show) return;
    const sec = Math.max(1, Math.ceil(p.respawnTimer));
    if (last.respawnSec !== sec) {
      last.respawnSec = sec;
      el.respawnSec.textContent = sec;
    }
    const k = 1 - Math.max(0, p.respawnTimer) / total;
    el.respawnFill.style.transform = 'scaleX(' + k.toFixed(3) + ')';
  }

  // ---------------- 존 진입 안내 ----------------
  // 존에 들어가면 그 원의 넓이를 구하는 식을 잠깐 보여줍니다.
  let toastTimer = null;
  function showZoneToast(zone) {
    showToast(zone.id + '존에 들어왔어요',
      '반지름 ' + zone.r + 'm → ' + zone.r + ' × ' + zone.r + ' × ' + CONFIG.PI + ' = ' + zone.area + '㎡',
      '#ffd84d');
  }

  // 위쪽 가운데에 잠깐 나타나는 알림 (제목 + 큰 글씨 한 줄)
  function showToast(title, line, color, ms) {
    const t = document.getElementById('zone-toast');
    document.getElementById('zt-title').textContent = title;
    const f = document.getElementById('zt-formula');
    f.textContent = line;
    f.style.color = color || '#ffd84d';
    t.style.borderColor = color || '';
    // 애니메이션을 다시 시작하도록 잠깐 숨겼다가 보여줌
    t.hidden = true;
    void t.offsetWidth;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, ms || 2500);
  }

  // 점수가 오르면 점수판이 톡 튀어 오름
  function bumpScore(team) {
    const box = document.querySelector('.team-score.' + team.toLowerCase());
    box.classList.remove('bump');
    void box.offsetWidth;
    box.classList.add('bump');
  }

  // ---------------- 경기 결과 ----------------
  // (개인 기록과 학습 결과는 STEP 19에서 이 화면에 더합니다)
  function showResult(state) {
    const r = state.result;
    const box = document.getElementById('result-banner');
    const title = document.getElementById('result-title');
    if (r.winner) {
      const team = CONFIG.TEAMS[r.winner];
      title.textContent = team.name + ' 승리!';
      title.style.color = team.color;
    } else {
      title.textContent = '무승부';
      title.style.color = '#ffffff';
    }
    const reasons = {
      target: '목표 ' + state.targetScore + '점 먼저 달성',
      time: '시간 종료',
      overtime: '연장전에서 C존 먼저 점령',
      draw: '연장전에서도 승부가 나지 않았어요',
    };
    document.getElementById('result-reason').textContent = reasons[r.reason] || '';
    document.getElementById('result-solar').textContent = state.score.SOLAR;
    document.getElementById('result-lunar').textContent = state.score.LUNAR;
    // 내 팀 기준 한 줄
    const me = state.localPlayer;
    const mine = document.getElementById('result-mine');
    if (me && r.winner) mine.textContent = me.team === r.winner ? '우리 팀이 이겼어요!' : '다음 경기에서 다시 도전해요!';
    else mine.textContent = '';
    box.hidden = false;
  }

  // ---------------- STEP 14: 시작 카운트다운 3 · 2 · 1 ----------------
  function showCountdown(sec) {
    const box = document.getElementById('countdown');
    const n = Math.ceil(sec);
    const label = n > 0 ? String(n) : '시작!';
    if (last.countdown === label) return;
    last.countdown = label;
    box.textContent = label;
    box.hidden = false;
    box.classList.remove('pop');
    void box.offsetWidth;
    box.classList.add('pop');
    // "시작!"은 잠깐 보여주고 숨김
    if (n <= 0) setTimeout(() => { if (last.countdown === '시작!') box.hidden = true; }, 700);
    AudioManager.play(n > 0 ? 'count' : 'go'); // STEP 17
  }

  // ---------------- STEP 14: 새 경기 시작 전 화면 정리 ----------------
  function resetMatchUI() {
    document.getElementById('result-banner').hidden = true;
    document.getElementById('zone-toast').hidden = true;
    document.getElementById('countdown').hidden = true;
    document.getElementById('radius-compare').hidden = true;
    el.respawn.hidden = true;
    // 다음 경기에서 모든 표시를 새로 그리도록 기억해 둔 값을 지움
    Object.keys(last).forEach((k) => { delete last[k]; });
  }

  // 교사가 관전 중일 때 표시
  function setSpectating(on) {
    el.spectateBadge.hidden = !on;
    document.body.classList.toggle('spectating', on);
  }

  // ---------------- STEP 16: 연결 경고 ----------------
  // text 가 있으면 화면 위쪽에 띄움, null 이면 숨김
  function setNetWarning(text) {
    const key = text || '';
    if (last.netWarning === key) return;
    last.netWarning = key;
    const box = document.getElementById('net-banner');
    if (!box) return;
    box.textContent = key;
    box.hidden = !text;
  }

  return {
    init, updateHud, setSpectating, formatTime, flashNoAmmo,
    showZoneToast, showToast, bumpScore, showResult, flashNoEnergy, showRadiusCompare,
    updateMissionButton, showCountdown, resetMatchUI, setNetWarning,
  };
})();
