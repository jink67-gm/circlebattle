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
    // 에너지 바 눈금: 내 스킬을 한 번 쓰는 데 드는 에너지 위치 (수정 STEP 4)
    el.energyBar = document.getElementById('energy-bar');
    el.energyBar.addEventListener('animationend', () => el.energyBar.classList.remove('shake'));
    el.energyFill = document.getElementById('energy-fill');
    el.energyNum = document.getElementById('energy-num');
    el.tick = document.getElementById('tick-cost');
    el.spBtn = document.getElementById('btn-special');
    el.spName = document.getElementById('sp-name');
    el.spCost = document.getElementById('sp-cost');
    // 수정 STEP 4: SPECIAL SKILL 카드
    el.skCard = document.getElementById('skill-card');
    el.skDots = document.getElementById('sk-dots');
    el.skLevel = document.getElementById('sk-level-text');
    el.skRange = document.getElementById('sk-range');
    el.skCard.addEventListener('animationend', () => el.skCard.classList.remove('pop'));
    el.energyCost = document.getElementById('energy-cost');
    // 새 STEP 3: 체력 ♥ 막대, 내 캐릭터 그림, 점수 막대, 존 주인 표시, 스킬 아이콘
    el.hpBar = document.getElementById('hp-bar');
    el.hpFill = document.getElementById('hp-fill');
    el.hpLag = document.getElementById('hp-lag');
    el.hpNum = document.getElementById('hp-num');
    el.portrait = document.getElementById('hud-portrait');
    // PNG 캐릭터 그림을 불러오면 HUD 얼굴 그림을 다시 그림
    window.addEventListener('cb-sprites', () => { delete last.portraitKey; });
    el.spIcon = document.getElementById('sp-icon');
    el.scoreBarSolar = document.getElementById('score-bar-solar');
    el.scoreBarLunar = document.getElementById('score-bar-lunar');
    el.zonePips = Array.from(document.querySelectorAll('#zone-pips i'));
    el.ammoBar = document.getElementById('ammo-bar');
    el.ammoBar.addEventListener('animationend', () => el.ammoBar.classList.remove('shake'));
    el.ammoPips = [];
    buildAmmoPips(AMMO_MAX);
  }

  // 탄약 칸: 캐릭터마다 탄약 수가 다름 (블래스터 3 · 메딕 6 …)
  function buildAmmoPips(n) {
    if (el.ammoPips.length === n) return;
    el.ammoBar.innerHTML = '';
    el.ammoPips = [];
    for (let i = 0; i < n; i++) {
      const pip = document.createElement('span');
      pip.className = 'ammo-pip';
      pip.innerHTML = '<span class="ammo-fill"></span>';
      el.ammoBar.appendChild(pip);
      el.ammoPips.push(pip);
    }
    el.ammoBar.dataset.n = n;
    delete last.ammo;
  }

  // 경기가 시작될 때 (원주율·캐릭터가 바뀔 수 있음) 에너지·스킬 표시를 새로 그리게
  function refreshCosts() {
    delete last.energyKey;
    delete last.portraitKey;
    delete last.iconKey;
  }

  // ---------------- 새 STEP 3: 체력 ♥ (아이콘 + 막대 + 숫자) ----------------
  function updateHp(p) {
    const key = Math.round(p.hp) + '|' + Math.round(p.hpShown) + '|' + p.maxHp + '|' + (p.alive ? 1 : 0);
    if (last.hpKey === key) return;
    last.hpKey = key;
    const k = Math.max(0, p.hp / p.maxHp);
    el.hpFill.style.transform = 'scaleX(' + k.toFixed(3) + ')';
    el.hpLag.style.transform = 'scaleX(' + Math.max(0, p.hpShown / p.maxHp).toFixed(3) + ')';
    el.hpNum.textContent = Math.round(p.hp);
    el.hpBar.classList.toggle('low', k <= 0.3 && p.alive);
  }

  // 내 캐릭터 그림 (캐릭터·팀이 바뀔 때만)
  function updatePortrait(p) {
    const key = p.charId + '|' + p.team;
    if (last.portraitKey === key) return;
    last.portraitKey = key;
    Renderer.drawCharacterIcon(el.portrait, p.charId, p.team);
    el.hpBar.style.setProperty('--team', CONFIG.TEAMS[p.team].color);
  }

  // 점수판 아래 막대 = 목표 점수까지 얼마나 왔는지 / 가운데 A·B·C = 존 주인 팀 색
  function updateScoreBoard(state) {
    const t = Math.max(1, state.targetScore || 1);
    const key = state.score.SOLAR + '|' + state.score.LUNAR + '|' + t;
    if (last.boardKey !== key) {
      last.boardKey = key;
      el.scoreBarSolar.style.transform = 'scaleX(' + Math.min(1, state.score.SOLAR / t).toFixed(3) + ')';
      el.scoreBarLunar.style.transform = 'scaleX(' + Math.min(1, state.score.LUNAR / t).toFixed(3) + ')';
    }
    const zones = state.zones || [];
    const zkey = zones.map((z) => (z.owner || '-') + (z.disabled ? 'x' : '') + (z.contested ? 'c' : '') +
      (z.active ? (z.active.SOLAR ? 's' : '') + (z.active.LUNAR ? 'l' : '') : '')).join(',');
    if (last.zoneKey === zkey) return;
    last.zoneKey = zkey;
    el.zonePips.forEach((pip) => {
      const z = zones.find((x) => x.id === pip.dataset.z);
      pip.className = z ? (z.owner ? z.owner.toLowerCase() : 'none') + (z.disabled ? ' off' : '') +
        (z.contested ? ' fight' : '') + (!z.owner && z.active && (z.active.SOLAR || z.active.LUNAR) ? ' act' : '') : 'none';
    });
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
    setText('target', state.phase === 'overtime' ? '연장전 · ' + CONFIG.CAPTURE.OVERTIME_ZONE + '존' : '목표 ' + state.targetScore + '점');
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
    updateScoreBoard(state); // 새 STEP 3
    if (state.localPlayer) {
      updateHp(state.localPlayer);
      updatePortrait(state.localPlayer);
      buildAmmoPips(ammoMaxOf(state.localPlayer.charId));
      updateAmmo(state.localPlayer.ammo);
      updateRespawn(state.localPlayer, state.settings.respawnSeconds);
      updateEnergy(state.localPlayer);
      updateEnergyCost(state.localPlayer, state.specialPreview);
    }
  }

  // ---------------- STEP 11: 수학 미션 버튼 ----------------
  // 터미널 가까이 있을 때만 보임. 준비됨 / 충전 중(남은 시간) / 모두 끝냄
  function updateMissionButton(p, near, limit, boost) {
    let status = 'hidden';
    if (p && near && p.alive && !p.inMission) {
      if (p.missionsUsed >= limit) status = 'done';
      else if (p.missionCooldown > 0) status = 'cooldown:' + Math.ceil(p.missionCooldown);
      else status = 'ready:' + (limit - p.missionsUsed) + (boost ? ':b' : '');
    }
    if (last.missionStatus === status) return;
    last.missionStatus = status;

    const btn = document.getElementById('btn-mission');
    const title = btn.querySelector('.bm-title');
    const sub = document.getElementById('bm-sub');
    btn.hidden = status === 'hidden';
    if (btn.hidden) return;
    const touch = document.body.classList.contains('touch-mode');
    const [kind, n, b] = status.split(':');
    btn.classList.toggle('waiting', kind !== 'ready');
    if (kind === 'ready') {
      title.textContent = b ? 'TEAM BOOST 미션' : '수학 미션'; // 수정 STEP 5: 스킬 MAX 뒤
      sub.textContent = (touch ? '눌러서 시작' : 'F 키') + ' · 남은 ' + n + '문제';
    } else if (kind === 'cooldown') {
      title.textContent = '터미널 충전 중';
      sub.textContent = '다음 미션까지 ' + formatTime(Number(n));
    } else {
      title.textContent = '미션 완료';
      sub.textContent = '이번 경기 ' + limit + '문제를 모두 풀었어요';
    }
  }

  // ---------------- 수정 STEP 2: 점령 준비 막대 / [점령 문제 풀기] ----------------
  // 점령지역 안에서만 보임
  //   점령 준비 중 1.2 / 3초 → 점령 문제 풀기 → (정답) A존 점령 활성화됨
  function updateCaptureButton(p, zones) {
    let status = 'hidden';
    let fill = 0;
    const z = p && p.alive && !p.inCapQ && !p.capWait && !p.inMission && p.zoneId ? zones.find((x) => x.id === p.zoneId) : null;
    if (z && !z.disabled && z.owner !== p.team) {
      const prep = CONFIG.CAPTURE.PREP_SEC;
      if (z.active[p.team]) status = 'active:' + z.id;
      else if (p.capReady === z.id) { status = 'ready:' + z.id; fill = 1; }
      else if (p.capRetry > 0) status = 'retry:' + z.id + ':' + Math.ceil(p.capRetry);
      else {
        const t = Math.min(prep, p.capPrepZone === z.id ? p.capPrep : 0);
        status = 'prep:' + z.id + ':' + (Math.floor(t * 10) / 10).toFixed(1);
        fill = t / prep;
      }
    }
    const btn = document.getElementById('btn-capture');
    if (last.capFill !== fill) {
      last.capFill = fill;
      document.getElementById('bc-fill').style.transform = 'scaleX(' + fill.toFixed(3) + ')';
    }
    if (last.captureStatus === status) return;
    last.captureStatus = status;
    btn.hidden = status === 'hidden';
    if (btn.hidden) return;
    const [kind, zid, n] = status.split(':');
    btn.className = kind;
    const title = document.getElementById('bc-title');
    const sub = document.getElementById('bc-sub');
    const touch = document.body.classList.contains('touch-mode');
    if (kind === 'ready') {
      title.textContent = '점령 문제 풀기';
      sub.textContent = (touch ? '눌러서 시작' : 'F 키') + ' · ' + zid + '존 · 푸는 동안 무적';
    } else if (kind === 'prep') {
      title.textContent = '점령 준비 중';
      sub.textContent = zid + '존에서 버티기 ' + n + ' / ' + CONFIG.CAPTURE.PREP_SEC + '초';
    } else if (kind === 'retry') {
      title.textContent = '다시 도전까지 ' + n + '초';
      sub.textContent = zid + '존 점령 문제';
    } else {
      title.textContent = zid + '존 점령 활성화됨';
      sub.textContent = '우리 팀이 머물면 게이지가 올라가요';
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

  // ---------------- 에너지 ⚡ 와 스킬 카드·특수기 버튼 (수정 STEP 4) ----------------
  //   SPECIAL SKILL
  //   ● ● ○  LEVEL 2
  //   현재 효과 범위: 반지름 3m
  function updateEnergy(p) {
    const e = Math.floor(p.energy);
    const lv = Skills.levelOf(p);
    const key = e + '|' + p.charId + '|' + lv;
    if (last.energyKey === key) return;
    const levelChanged = last.skillLevel !== undefined && last.skillLevel !== lv && last.skillChar === p.charId;
    last.energyKey = key;
    last.skillLevel = lv;
    last.skillChar = p.charId;

    const sp = Skills.spec(p.charId);
    const cost = Skills.costOf(p);
    const max = lv >= SKILL_LEVEL_MAX;
    el.energyFill.style.transform = 'scaleX(' + (p.energy / CONFIG.ENERGY.MAX).toFixed(3) + ')';
    el.energyNum.textContent = e + '/' + CONFIG.ENERGY.MAX;
    el.tick.style.left = (cost / CONFIG.ENERGY.MAX * 100) + '%';
    el.tick.classList.toggle('ready', lv >= 1 && p.energy >= cost);
    el.tick.hidden = lv < 1;

    el.skDots.textContent = '●'.repeat(lv) + '○'.repeat(SKILL_LEVEL_MAX - lv);
    el.skLevel.textContent = lv < 1 ? '잠금' : max ? 'LEVEL 3 MAX' : 'LEVEL ' + lv;
    // 새 STEP 3: 긴 글 대신 짧은 표시 (◎ = 효과 범위 원)
    el.skRange.textContent = lv < 1 ? '🔒 터미널 문제로 해금'
      : (sp.type === 'blink' ? '◎ 순간이동 반지름 ' : '◎ 반지름 ') + Skills.radiusOf(p) + 'm';
    el.skCard.classList.toggle('locked', lv < 1);
    el.skCard.classList.toggle('max', max);
    if (levelChanged && lv > 0) el.skCard.classList.add('pop');

    el.spName.textContent = sp.name;
    el.spCost.innerHTML = lv < 1 ? '🔒 잠금' : cost + '⚡';
    // 새 STEP 3: 버튼 둘레 고리 = 한 번 쓰는 데 필요한 에너지를 얼마나 모았는지
    el.spBtn.style.setProperty('--k', lv < 1 ? 0 : Math.min(1, p.energy / cost).toFixed(3));
    const iconKey = p.charId + '|' + (max ? 'max' : lv);
    if (last.iconKey !== iconKey) {
      last.iconKey = iconKey;
      Renderer.drawSkillIcon(el.spIcon, p.charId, lv);
    }
    el.spBtn.classList.toggle('locked', lv < 1);
    el.spBtn.classList.toggle('max', max);
    el.spBtn.classList.toggle('ready', lv >= 1 && p.energy >= cost);
    el.spBtn.classList.toggle('poor', lv >= 1 && p.energy < cost);
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
  // 수정 STEP 2: 넓이(점령 문제의 정답)는 보여주지 않고, 지금 할 일을 알려줌
  let toastTimer = null;
  function showZoneToast(zone, team) {
    const title = zone.id + '존 · 반지름 ' + zone.r + 'm';
    if (team && zone.owner === team) showToast(title, '우리 팀 존이에요. 지켜 주세요!', '#6dffa8');
    else if (team && zone.active && zone.active[team]) showToast(title, '점령 활성화됨 → 머물면 게이지가 올라가요', '#6dffa8');
    else showToast(title, CONFIG.CAPTURE.PREP_SEC + '초 버티면 점령 문제를 풀 수 있어요', '#ffd84d');
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

  // ---------------- 수정 STEP 5: TEAM BOOST 알림 (우리 팀 화면에만, 작게 2.5초) ----------------
  let tbTimer = null;
  function showTeamBoost(label, desc, nick, color) {
    const box = document.getElementById('tb-banner');
    document.getElementById('tb-title').textContent = 'TEAM BOOST! ' + label;
    document.getElementById('tb-desc').textContent = desc;
    document.getElementById('tb-who').textContent = nick ? '· ' + nick + ' 정답' : '';
    box.style.borderColor = color || '';
    box.hidden = true;
    void box.offsetWidth;
    box.hidden = false;
    clearTimeout(tbTimer);
    tbTimer = setTimeout(() => { box.hidden = true; }, 2600);
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
      overtime: '연장전에서 ' + CONFIG.CAPTURE.OVERTIME_ZONE + '존 먼저 점령',
      overtimeGauge: '연장전 끝 · ' + CONFIG.CAPTURE.OVERTIME_ZONE + '존 점령 게이지를 채우고 있었어요', // 수정 STEP 6
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
    document.getElementById('btn-capture').hidden = true;
    document.getElementById('tb-banner').hidden = true;
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
    showZoneToast, showToast, bumpScore, showResult, flashNoEnergy,
    updateMissionButton, updateCaptureButton, showTeamBoost, showCountdown, resetMatchUI, setNetWarning, refreshCosts,
  };
})();
