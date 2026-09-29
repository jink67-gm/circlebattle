/* ============================================================
   서클 배틀 - 학습 결과 (results.js)
   ------------------------------------------------------------
   STEP 19
   ■ 경기 결과 화면: 내 기록 (푼 문제, 정답·정답률, 점령 기여, 공격 성공, 지원, 특수기)
     - 친구끼리 순위를 매기지 않습니다. 내 기록과 우리 반 전체 기록만 보여줍니다.
     - 학생 기기는 교사 기기가 계산한 기록을 받아서 보여줍니다. (sync.js)
   ■ 교사용 학습 결과 (교사 기기에만)
     - 닉네임별: 원의 넓이 / 반지름·지름 / 넓이 비교 정답 수, 전체 정답률, 평균 풀이 시간 …
     - 반 전체 요약, 다시 짚어 볼 문제 (정답률이 낮은 문제)
     - CSV 내려받기: 학생별 요약 / 문제별 풀이 기록 (엑셀에서 한글이 깨지지 않게 저장)
     - 끝난 경기는 교사 기기에 저장됩니다. (새로고침해도 남음, [기록 지우기]로 지움)
   ============================================================ */

const Results = (function () {
  const STORE_KEY = 'circleBattle.results';
  const MAX_MATCHES = 60;
  const CATS = ['area', 'radiusDiameter', 'compare'];
  const CAT_NAME = { area: '원의 넓이', radiusDiameter: '반지름·지름', compare: '넓이 비교' };
  const el = {};
  let scope = 'match';     // 'match' 이번 경기 / 'today' 오늘 전체
  let sortKey = 'nick';
  let sortDir = 1;
  let hideTable = false;
  let clearArmed = false;

  // ---------------- 기록 만들기 ----------------
  const r1 = (v) => Math.round((v || 0) * 10) / 10;

  /** 경기가 끝났을 때 한 사람의 기록 (네트워크로 보내기 좋은 모양) */
  function recordOf(p) {
    const s = p.stats || {};
    return {
      id: p.id, nick: p.nick, team: p.team, charId: p.charId, kind: p.kind || 'student',
      st: {
        shots: s.shots | 0, hits: s.hits | 0, knockouts: s.knockouts | 0, specials: s.specials | 0,
        support: s.support | 0, healed: Math.round(s.healed || 0), capture: r1(s.capture), zoneTime: Math.round(s.zoneTime || 0),
      },
      ms: (p.missionLog || []).map((m) => ({
        id: m.id, type: m.type | 0, category: m.category || '', difficulty: m.difficulty | 0,
        correct: !!m.correct, hint: !!m.hintShown, wrong: m.wrongCount | 0, time: r1(m.timeSec),
        reward: m.reward || '', text: m.text || '', answer: m.answer || '',
      })),
    };
  }

  /** 문제 풀이 요약 */
  function summarize(ms) {
    const out = { total: ms.length, correct: 0, hints: 0, revealed: 0, time: 0, cat: {} };
    CATS.forEach((c) => { out.cat[c] = { n: 0, c: 0 }; });
    ms.forEach((m) => {
      if (m.correct) out.correct++;
      if (m.hint) out.hints++;
      if (!m.correct) out.revealed++;
      out.time += m.time || 0;
      const c = out.cat[m.category];
      if (c) { c.n++; if (m.correct) c.c++; }
    });
    out.rate = out.total ? Math.round(out.correct / out.total * 100) : null;
    out.avgTime = out.total ? r1(out.time / out.total) : null;
    return out;
  }

  // ---------------- 저장 (교사 기기) ----------------
  function load() {
    try {
      const v = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
      return Array.isArray(v) ? v : [];
    } catch (e) { return []; }
  }
  function store(list) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(list.slice(-MAX_MATCHES))); } catch (e) { /* 저장 공간 부족 등 */ }
  }

  /**
   * 끝난 경기 저장
   * @param info { id, room, winner, reason, score, records }
   */
  function saveMatch(info) {
    const list = load().filter((m) => m.id !== info.id);
    list.push({
      id: info.id, room: info.room || '', at: Date.now(), winner: info.winner || null, reason: info.reason || '',
      score: info.score, minutes: info.minutes || 0, records: info.records,
    });
    store(list);
  }

  function todayKey(t) {
    const d = new Date(t);
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }

  function matchesInScope() {
    const list = load();
    if (!list.length) return [];
    if (scope === 'match') return [list[list.length - 1]];
    const today = todayKey(Date.now());
    return list.filter((m) => todayKey(m.at) === today);
  }

  // 여러 경기의 기록을 학생별로 합침 (같은 기기 = 같은 학생)
  function byStudent(matches) {
    const map = {};
    matches.forEach((m) => (m.records || []).forEach((r) => {
      if (r.kind === 'bot' || r.kind === 'teacher') return;
      const s = map[r.id] || (map[r.id] = { id: r.id, nick: r.nick, team: r.team, games: 0, ms: [],
        st: { hits: 0, shots: 0, capture: 0, support: 0, specials: 0 } });
      s.nick = r.nick; s.team = r.team; s.games++;
      s.ms = s.ms.concat(r.ms || []);
      ['hits', 'shots', 'capture', 'support', 'specials'].forEach((k) => { s.st[k] += (r.st && r.st[k]) || 0; });
    }));
    return Object.keys(map).map((k) => {
      const s = map[k];
      s.sum = summarize(s.ms);
      s.st.capture = r1(s.st.capture);
      return s;
    });
  }

  // ---------------- 경기 결과 화면: 내 기록 ----------------
  function pct(c, n) { return n ? Math.round(c / n * 100) + '%' : '-'; }

  /**
   * 결과 배너 안에 내 기록 (rec 가 없으면 "받는 중")
   * @param rec  recordOf() 모양, null 이면 기다리는 중
   */
  function showMine(rec, waiting) {
    const box = document.getElementById('result-record');
    if (!box) return;
    if (!rec) {
      box.innerHTML = waiting ? '<div class="rr-wait">내 기록을 정리하는 중…</div>' : '';
      return;
    }
    const sum = summarize(rec.ms || []);
    const st = rec.st || {};
    const tile = (icon, label, value, sub) => '<div class="rr-tile"><span class="rr-icon">' + icon + '</span>' +
      '<span class="rr-label">' + label + '</span><b>' + value + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</div>';
    let html = '<div class="rr-head">내 기록</div><div class="rr-grid' + (rec.partial ? ' partial' : '') + '">' +
      tile('🧮', '푼 문제', sum.total + '개', '') +
      tile('✅', '정답', sum.correct + '개', sum.total ? '정답률 ' + sum.rate + '%' : '');
    // partial: 교사 기기 기록을 받지 못해 내 기기의 수학 기록만 있을 때
    if (!rec.partial) {
      html += tile('⭕', '점령 기여', r1(st.capture) + '㎡', '') +
        tile('🎯', '공격 성공', (st.hits | 0) + '번', '') +
        tile('🤝', '지원', (st.support | 0) + '번', '') +
        tile('✨', '특수기', (st.specials | 0) + '번', '');
    }
    html += '</div>';
    if (sum.total) {
      html += '<div class="rr-cats">' + CATS.filter((c) => sum.cat[c].n).map((c) =>
        CAT_NAME[c] + ' <b>' + sum.cat[c].c + '/' + sum.cat[c].n + '</b>').join(' · ') + '</div>';
    }
    html += '<div class="rr-msg">' + message(sum) + '</div>';
    box.innerHTML = html;
  }

  // 순위 대신, 나에게 맞는 한마디
  function message(sum) {
    if (!sum.total) return '다음 경기에서는 우리 팀 에너지 터미널에서 수학 미션에 도전해 봐요!';
    if (sum.rate === 100) return sum.hints ? '모두 해결했어요! 힌트 없이도 풀 수 있게 공식을 떠올려 봐요.'
      : '모든 문제를 맞혔어요! 원의 넓이 = 반지름 × 반지름 × 3.14';
    if (sum.rate >= 60) return '잘했어요! 틀린 문제의 풀이를 한 번 더 떠올려 봐요.';
    return '괜찮아요! 반지름 × 반지름 × 3.14 를 기억하면 다음엔 더 잘할 수 있어요.';
  }

  /** 관전하는 선생님 화면: 개인 기록 대신 두 팀·반 전체 수학 기록 */
  function showClass(records) {
    const box = document.getElementById('result-record');
    if (!box) return;
    const people = records.filter((r) => r.kind !== 'bot');
    const team = (t) => summarize([].concat(...people.filter((r) => r.team === t).map((r) => r.ms || [])));
    const all = summarize([].concat(...people.map((r) => r.ms || [])));
    const line = (t) => {
      const s = team(t);
      return '<div class="rr-team ' + t.toLowerCase() + '"><span>' + CONFIG.TEAMS[t].name + '</span> 수학 미션 <b>' +
        s.correct + '/' + s.total + '</b> 정답</div>';
    };
    box.innerHTML = '<div class="rr-head">우리 반 수학 미션</div>' +
      '<div class="rr-class">' + line('SOLAR') + line('LUNAR') + '</div>' +
      '<div class="rr-cats">' + (all.total ? '전체 정답률 <b>' + all.rate + '%</b> · 평균 풀이 시간 <b>' + all.avgTime + '초</b>'
        : '이번 경기에서는 수학 미션을 푼 학생이 없어요') + '</div>';
  }

  // ---------------- 교사용 학습 결과 화면 ----------------
  function init() {
    el.overlay = document.getElementById('results-overlay');
    el.body = document.getElementById('res-body');
    el.scopeBtns = document.querySelectorAll('.res-scope');
    el.clear = document.getElementById('btn-res-clear');
    el.hide = document.getElementById('btn-res-hide');
    document.getElementById('btn-res-close').addEventListener('click', close);
    el.scopeBtns.forEach((b) => b.addEventListener('click', () => { scope = b.dataset.scope; render(); }));
    document.getElementById('btn-csv-summary').addEventListener('click', downloadSummary);
    document.getElementById('btn-csv-log').addEventListener('click', downloadLog);
    el.hide.addEventListener('click', () => { hideTable = !hideTable; render(); });
    el.clear.addEventListener('click', onClear);
    el.body.addEventListener('click', (e) => {
      const th = e.target.closest('th[data-sort]');
      if (!th) return;
      if (sortKey === th.dataset.sort) sortDir = -sortDir; else { sortKey = th.dataset.sort; sortDir = th.dataset.sort === 'nick' ? 1 : -1; }
      render();
    });
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' && isOpen()) { close(); e.stopImmediatePropagation(); }
    }, true);
  }

  function isOpen() { return el.overlay && !el.overlay.hidden; }

  /** @param which 'match' | 'today' */
  function open(which) {
    if (which) scope = which;
    clearArmed = false;
    el.overlay.hidden = false;
    render();
  }
  function close() { el.overlay.hidden = true; }

  function onClear() {
    if (!clearArmed) {
      clearArmed = true;
      el.clear.textContent = '정말 지울까요? 한 번 더';
      el.clear.classList.add('armed');
      setTimeout(() => { clearArmed = false; if (isOpen()) render(); }, 2500);
      return;
    }
    clearArmed = false;
    store([]);
    render();
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function timeText(t) {
    const d = new Date(t);
    return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  function render() {
    const all = load();
    const matches = matchesInScope();
    const todayCount = all.filter((m) => todayKey(m.at) === todayKey(Date.now())).length;
    el.scopeBtns.forEach((b) => {
      b.classList.toggle('on', b.dataset.scope === scope);
      if (b.dataset.scope === 'today') b.textContent = '오늘 전체 (' + todayCount + '경기)';
    });
    el.clear.textContent = '기록 지우기';
    el.clear.classList.remove('armed');
    el.hide.textContent = hideTable ? '학생별 표 보이기' : '학생별 표 가리기 (TV용)';

    if (!matches.length) {
      el.body.innerHTML = '<div class="res-empty">아직 끝난 경기가 없어요.<br>경기가 끝나면 여기에 학습 결과가 모여요.</div>';
      return;
    }
    const students = byStudent(matches);
    const allMs = [].concat(...students.map((s) => s.ms));
    const cls = summarize(allMs);
    const last = matches[matches.length - 1];
    const info = scope === 'match'
      ? timeText(last.at) + ' 경기 · 방 ' + esc(last.room || '-') + ' · ' +
        (last.reason === 'stopped' ? '중간에 끝냄' : last.winner ? CONFIG.TEAMS[last.winner].name + ' 승리' : '무승부') +
        ' (' + (last.score ? last.score.SOLAR + ' : ' + last.score.LUNAR : '') + ')'
      : '오늘 ' + matches.length + '경기 합계';

    // 반 전체 요약
    const card = (label, value, sub) => '<div class="res-card"><span>' + label + '</span><b>' + value + '</b>' +
      (sub ? '<small>' + sub + '</small>' : '') + '</div>';
    let html = '<div class="res-info">' + info + '</div><div class="res-cards">' +
      card('참여 학생', students.length + '명', '') +
      card('푼 문제', cls.total + '개', '정답 ' + cls.correct + '개') +
      card('전체 정답률', cls.total ? cls.rate + '%' : '-', cls.hints ? '힌트 사용 ' + cls.hints + '번' : '') +
      card('평균 풀이 시간', cls.total ? cls.avgTime + '초' : '-', '') +
      '</div>';
    // 분류별 정답률 막대
    html += '<div class="res-cats">' + CATS.map((c) => {
      const x = cls.cat[c];
      const p = x.n ? Math.round(x.c / x.n * 100) : 0;
      return '<div class="res-cat"><span class="rc-name">' + CAT_NAME[c] + '</span>' +
        '<span class="rc-bar"><i style="width:' + p + '%"></i></span>' +
        '<span class="rc-num">' + (x.n ? p + '% <small>(' + x.c + '/' + x.n + ')</small>' : '<small>문제 없음</small>') + '</span></div>';
    }).join('') + '</div>';

    // 다시 짚어 볼 문제: 2번 이상 나온 문제 중 정답률이 낮은 것
    const byQ = {};
    allMs.forEach((m) => {
      const q = byQ[m.id] || (byQ[m.id] = { id: m.id, n: 0, c: 0, text: m.text, answer: m.answer, category: m.category });
      q.n++; if (m.correct) q.c++;
      if (!q.text && m.text) q.text = m.text;
    });
    const hard = Object.keys(byQ).map((k) => byQ[k]).filter((q) => q.n >= 2 && q.c < q.n)
      .sort((a, b) => a.c / a.n - b.c / b.n || b.n - a.n).slice(0, 3);
    if (hard.length) {
      html += '<div class="res-sub">다시 짚어 볼 문제</div><div class="res-hard">' + hard.map((q) =>
        '<div class="rh"><span class="rh-rate">' + Math.round(q.c / q.n * 100) + '%</span>' +
        '<span class="rh-text">' + esc(q.text || q.id) + (q.answer ? ' <em>정답 ' + esc(q.answer) + '</em>' : '') + '</span>' +
        '<span class="rh-n">' + q.c + '/' + q.n + '명 정답</span></div>').join('') + '</div>';
    }

    // 학생별 표
    if (!hideTable) {
      const val = (s, k) => {
        if (k === 'nick') return s.nick;
        if (k === 'rate') return s.sum.rate === null ? -1 : s.sum.rate;
        if (k === 'time') return s.sum.avgTime === null ? 1e9 : s.sum.avgTime;
        if (k === 'total') return s.sum.total;
        if (CATS.indexOf(k) !== -1) return s.sum.cat[k].c;
        return s.st[k];
      };
      students.sort((a, b) => {
        const x = val(a, sortKey), y = val(b, sortKey);
        if (typeof x === 'string') return x.localeCompare(y, 'ko') * sortDir;
        return (x - y) * sortDir || a.nick.localeCompare(b.nick, 'ko');
      });
      const th = (k, label) => '<th data-sort="' + k + '"' + (sortKey === k ? ' class="on"' : '') + '>' + label +
        (sortKey === k ? (sortDir > 0 ? ' ▲' : ' ▼') : '') + '</th>';
      const catCell = (s, c) => {
        const x = s.sum.cat[c];
        return '<td>' + (x.n ? x.c + '<small>/' + x.n + '</small>' : '<span class="dim">-</span>') + '</td>';
      };
      html += '<div class="res-sub">학생별 기록 <small>제목을 누르면 정렬 · 정답 수/푼 수</small></div>' +
        '<div class="res-table-wrap"><table class="res-table"><thead><tr>' +
        th('nick', '닉네임') + th('area', '원의 넓이') + th('radiusDiameter', '반지름·지름') + th('compare', '넓이 비교') +
        th('rate', '정답률') + th('time', '평균 시간') + th('hits', '공격 성공') + th('capture', '점령 기여') + th('support', '지원') +
        '</tr></thead><tbody>' +
        students.map((s) => '<tr><td class="nick ' + (s.team || '').toLowerCase() + '">' + esc(s.nick) +
          (scope === 'today' && s.games > 1 ? ' <small>' + s.games + '경기</small>' : '') + '</td>' +
          CATS.map((c) => catCell(s, c)).join('') +
          '<td>' + (s.sum.total ? s.sum.rate + '%' : '<span class="dim">-</span>') + '</td>' +
          '<td>' + (s.sum.total ? s.sum.avgTime + '초' : '<span class="dim">-</span>') + '</td>' +
          '<td>' + s.st.hits + '</td><td>' + s.st.capture + '㎡</td><td>' + s.st.support + '</td></tr>').join('') +
        '</tbody></table></div>';
    }
    el.body.innerHTML = html;
  }

  // ---------------- CSV ----------------
  function csvCell(v) {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function download(name, rows) {
    const text = '﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n'); // 엑셀에서 한글이 깨지지 않게 BOM
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    window.__lastCsv = { name, text }; // 시험용
  }
  function stamp() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + '_' + p(d.getHours()) + p(d.getMinutes());
  }
  function scopeName() { return scope === 'match' ? '이번경기' : '오늘전체'; }

  function downloadSummary() {
    const matches = matchesInScope();
    if (!matches.length) return;
    const rows = [['닉네임', '팀', '경기 수', '푼 문제', '정답', '정답률(%)',
      '원의 넓이 정답', '원의 넓이 푼 수', '반지름·지름 정답', '반지름·지름 푼 수', '넓이 비교 정답', '넓이 비교 푼 수',
      '힌트 사용', '풀이를 본 문제', '평균 풀이 시간(초)', '공격 성공', '점령 기여(㎡)', '지원', '특수기']];
    byStudent(matches).sort((a, b) => a.nick.localeCompare(b.nick, 'ko')).forEach((s) => {
      const u = s.sum;
      rows.push([s.nick, s.team ? CONFIG.TEAMS[s.team].name : '', s.games, u.total, u.correct, u.rate === null ? '' : u.rate,
        u.cat.area.c, u.cat.area.n, u.cat.radiusDiameter.c, u.cat.radiusDiameter.n, u.cat.compare.c, u.cat.compare.n,
        u.hints, u.revealed, u.avgTime === null ? '' : u.avgTime, s.st.hits, s.st.capture, s.st.support, s.st.specials]);
    });
    download('서클배틀_학생별요약_' + scopeName() + '_' + stamp() + '.csv', rows);
  }

  function downloadLog() {
    const matches = matchesInScope();
    if (!matches.length) return;
    const REWARD = { ammo: '탄약 충전', shield: '보호막', speed: '가속' };
    const rows = [['경기 시각', '방', '닉네임', '팀', '문제 번호', '유형', '분류', '난이도', '문제', '정답', '결과', '틀린 횟수', '풀이 시간(초)', '보너스']];
    matches.forEach((m) => (m.records || []).forEach((r) => {
      if (r.kind === 'bot' || r.kind === 'teacher') return;
      (r.ms || []).forEach((q) => rows.push([
        timeText(m.at), m.room, r.nick, r.team ? CONFIG.TEAMS[r.team].name : '', q.id, 'TYPE ' + q.type,
        CAT_NAME[q.category] || q.category, ['', '쉬움', '보통', '어려움'][q.difficulty] || '', q.text, q.answer,
        !q.correct ? '풀이 봄' : q.hint ? '힌트 후 정답' : '정답', q.wrong, q.time, REWARD[q.reward] || '',
      ]));
    }));
    download('서클배틀_문제별기록_' + scopeName() + '_' + stamp() + '.csv', rows);
  }

  return { init, recordOf, summarize, saveMatch, showMine, showClass, open, close, isOpen, load };
})();
