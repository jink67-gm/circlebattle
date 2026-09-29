/* ============================================================
   서클 배틀 - 원의 넓이 문제은행 (questions.js)
   ------------------------------------------------------------
   STEP 12: 문제 55개 + 게임 상황에서 만드는 문제

   문제 데이터 모양 (설계서 18번과 같음)
   {
     id: "CIRCLE_001",
     type: 1,                    // TYPE 1~6
     typeName: "area",           // 유형 이름
     category: "area",           // 교사용 결과 분류: area(원의 넓이) / radiusDiameter(반지름·지름) / compare(넓이 비교)
     difficulty: 1,              // 1 쉬움 / 2 보통 / 3 어려움
     question: "반지름이 4cm인 원의 넓이는?",
     radius: 4,
     pi: 3.14,
     answer: 50.24,              // 고르기 문제는 'A' / 'B' / 'same'
     unit: "㎠",
     explanation: "4 × 4 × 3.14 = 50.24",
     hint: "원의 넓이 = 반지름 × 반지름 × 3.14",
     choices: [...]              // 고르기 문제만 (TYPE 4)
   }

   유형
     TYPE 1  반지름으로 원의 넓이 구하기           쉬움 (넓이→반지름 거꾸로 구하기는 어려움)
     TYPE 2  지름으로 원의 넓이 구하기             보통
     TYPE 3  반지름과 지름의 관계                  쉬움
     TYPE 4  두 원 비교 (A / B / 같다 고르기)      보통
     TYPE 5  넓이가 몇 배가 되는지                 어려움
     TYPE 6  게임 상황 문제                        어려움
   ※ 새 문제는 아래 표에 한 줄씩 더하면 됩니다. 정답과 풀이는 자동으로 계산됩니다.
   ============================================================ */

const Questions = (function () {
  const PI = CONFIG.PI;

  // 소수 계산 오차 없이 넓이 구하기 (반지름이 정수·소수 한 자리일 때 정확)
  function area(r) {
    return Math.round(r * r * PI * 10000) / 10000;
  }
  function sq(unit) { return unit === 'm' ? '㎡' : '㎠'; }
  function fmt(n) { return String(Math.round(n * 10000) / 10000); }
  // 문제 속 숫자는 크게 보이도록 <b>로 감쌈
  function B(n, unit) { return '<b>' + n + (unit || '') + '</b>'; }

  const HINTS = {
    area: '원의 넓이 = 반지름 × 반지름 × 3.14',
    concept: '원의 넓이 = 반지름 × 반지름 × 원주율',
    reverse: '반지름 × 반지름 = 넓이 ÷ 3.14 → 같은 수를 두 번 곱해서 그 값이 되는 수를 찾아요',
    diameter: '먼저 반지름을 구해요: 반지름 = 지름 ÷ 2',
    relation: '지름 = 반지름 × 2,  반지름 = 지름 ÷ 2',
    compare: '두 원 모두 반지름으로 바꾼 뒤 넓이를 구해서 비교해요 (반지름 = 지름 ÷ 2)',
    times: '(새 반지름 × 새 반지름) ÷ (처음 반지름 × 처음 반지름)',
  };

  const bank = [];
  let n = 0;
  function nextId() { n++; return 'CIRCLE_' + String(n).padStart(3, '0'); }
  function add(q) { q.id = q.id || nextId(); q.pi = PI; bank.push(q); }

  // ---------------- TYPE 1: 반지름 → 넓이 (쉬움) ----------------
  [
    [4, 'cm', '원'], [2, 'cm', '원'], [3, 'm', '회복존'], [5, 'cm', '원'], [6, 'm', '보호막'],
    [7, 'cm', '원'], [8, 'm', '에너지 존'], [9, 'cm', '원'], [10, 'cm', '원'], [1, 'm', '터렛 공격 범위'],
  ].forEach(([r, u, what]) => {
    add({
      type: 1, typeName: 'area', category: 'area', difficulty: 1,
      question: '반지름이 ' + B(r, u) + '인 ' + what + '의 넓이는?',
      radius: r, answer: area(r), unit: sq(u),
      explanation: r + ' × ' + r + ' × 3.14 = ' + fmt(area(r)),
      hint: HINTS.area,
    });
  });
  // 원주율 개념 (쉬움)
  add({
    type: 1, typeName: 'area', category: 'area', difficulty: 1,
    question: '원의 넓이 = 반지름 × 반지름 × ( ? )<br><small>( ? )에 들어갈 원주율을 소수로 쓰세요</small>',
    answer: 3.14, unit: '', explanation: '원의 넓이 = 반지름 × 반지름 × 원주율(3.14)', hint: HINTS.concept,
  });
  add({
    type: 1, typeName: 'area', category: 'area', difficulty: 1,
    question: '원주율은 원의 둘레가 지름의 약 몇 배인지 나타내요.<br>소수 둘째 자리까지 쓰면?',
    answer: 3.14, unit: '배', explanation: '원주율 = 원의 둘레 ÷ 지름 ≈ 3.14', hint: '3.1415…를 소수 둘째 자리까지',
  });
  // 넓이 → 반지름 거꾸로 (어려움)
  [[78.5, 5, 'cm', '원'], [12.56, 2, 'cm', '원'], [113.04, 6, 'm', '보호막']].forEach(([a, r, u, what]) => {
    add({
      type: 1, typeName: 'areaReverse', category: 'area', difficulty: 3,
      question: '넓이가 ' + B(a, sq(u)) + '인 ' + what + '의 반지름은?',
      radius: r, answer: r, unit: u,
      explanation: r + ' × ' + r + ' × 3.14 = ' + a + ' 이므로 반지름은 ' + r + u,
      hint: HINTS.reverse,
    });
  });

  // ---------------- TYPE 2: 지름 → 넓이 (보통) ----------------
  [
    [10, 'cm', '원'], [4, 'cm', '원'], [6, 'm', '둔화지역'], [8, 'm', '보호막'],
    [12, 'cm', '원'], [14, 'cm', '원'], [16, 'm', '에너지 존'], [20, 'cm', '원'],
  ].forEach(([d, u, what]) => {
    const r = d / 2;
    add({
      type: 2, typeName: 'areaFromDiameter', category: 'area', difficulty: 2,
      question: '지름이 ' + B(d, u) + '인 ' + what + '의 넓이는?',
      radius: r, diameter: d, answer: area(r), unit: sq(u),
      explanation: '반지름 = ' + d + ' ÷ 2 = ' + r + ',  ' + r + ' × ' + r + ' × 3.14 = ' + fmt(area(r)),
      hint: HINTS.diameter,
    });
  });

  // ---------------- TYPE 3: 반지름 ↔ 지름 (쉬움) ----------------
  [[14, 'm'], [10, 'cm'], [18, 'cm'], [6, 'm']].forEach(([d, u]) => {
    add({
      type: 3, typeName: 'radiusFromDiameter', category: 'radiusDiameter', difficulty: 1,
      question: '지름이 ' + B(d, u) + '인 원의 반지름은?',
      diameter: d, radius: d / 2, answer: d / 2, unit: u,
      explanation: '반지름 = 지름 ÷ 2 = ' + d + ' ÷ 2 = ' + d / 2, hint: HINTS.relation,
    });
  });
  [[4, 'cm'], [6, 'm'], [11, 'cm'], [15, 'm']].forEach(([r, u]) => {
    add({
      type: 3, typeName: 'diameterFromRadius', category: 'radiusDiameter', difficulty: 1,
      question: '반지름이 ' + B(r, u) + '인 원의 지름은?',
      radius: r, diameter: r * 2, answer: r * 2, unit: u,
      explanation: '지름 = 반지름 × 2 = ' + r + ' × 2 = ' + r * 2, hint: HINTS.relation,
    });
  });

  // ---------------- TYPE 4: 두 원 비교 — 고르기 (보통) ----------------
  // [A 종류('r' 반지름 / 'd' 지름), A 값, B 종류, B 값, 단위, 이름]
  const CHOICES = [
    { value: 'A', label: 'A가 더 넓다' },
    { value: 'B', label: 'B가 더 넓다' },
    { value: 'same', label: '넓이가 같다' },
  ];
  [
    ['r', 2, 'r', 4, 'm', '보호막'], ['r', 5, 'r', 3, 'cm', '원'], ['r', 3, 'd', 8, 'm', '보호막'],
    ['d', 10, 'r', 4, 'cm', '원'], ['r', 4, 'd', 8, 'm', '에너지 존'], ['d', 12, 'r', 7, 'm', '회복존'],
    ['r', 6, 'd', 12, 'cm', '원'], ['d', 6, 'r', 2, 'm', '둔화지역'],
  ].forEach(([ka, va, kb, vb, u, what]) => {
    const ra = ka === 'r' ? va : va / 2;
    const rb = kb === 'r' ? vb : vb / 2;
    const aa = area(ra), ab = area(rb);
    const ans = aa > ab ? 'A' : ab > aa ? 'B' : 'same';
    const say = (k, v) => (k === 'r' ? '반지름 ' : '지름 ') + B(v, u);
    const expl = (k, v, r, a) => (k === 'd' ? '반지름 ' + v + '÷2=' + r + ', ' : '') + r + '×' + r + '×3.14=' + fmt(a) + sq(u);
    add({
      type: 4, typeName: 'compare', category: 'compare', difficulty: 2,
      question: '어느 ' + what + '의 넓이가 더 넓을까요?<br>A: ' + say(ka, va) + '&nbsp;&nbsp;&nbsp;&nbsp;B: ' + say(kb, vb),
      answer: ans, unit: '', choices: CHOICES,
      explanation: 'A: ' + expl(ka, va, ra, aa) + '  /  B: ' + expl(kb, vb, rb, ab),
      hint: HINTS.compare,
    });
  });

  // ---------------- TYPE 5: 넓이가 몇 배 (어려움) ----------------
  [
    [2, 4, 'r', 'm'], [1, 2, 'r', 'cm'], [3, 6, 'r', 'cm'], [1, 3, 'r', 'm'],
    [4, 12, 'd', 'cm'], [5, 10, 'r', 'm'], [2, 8, 'r', 'cm'], [2, 3, 'r', 'm'],
  ].forEach(([a, b, kind, u]) => {
    const ra = kind === 'r' ? a : a / 2, rb = kind === 'r' ? b : b / 2;
    const times = (rb * rb) / (ra * ra);
    const word = kind === 'r' ? '반지름' : '지름';
    add({
      type: 5, typeName: 'times', category: 'compare', difficulty: 3,
      question: word + '이 ' + B(a, u) + '에서 ' + B(b, u) + '로 늘어났습니다.<br>원의 넓이는 몇 배가 되었나요?',
      answer: times, unit: '배',
      explanation: (kind === 'd' ? '반지름 ' + ra + ' → ' + rb + ',  ' : '') +
        '(' + rb + '×' + rb + ') ÷ (' + ra + '×' + ra + ') = ' + rb * rb + ' ÷ ' + ra * ra + ' = ' + times,
      hint: HINTS.times + (kind === 'd' ? ' (지름 ÷ 2 = 반지름)' : ''),
    });
  });

  // ---------------- TYPE 6: 게임 상황 (어려움) ----------------
  const SIT = [
    { q: '블래스터의 에너지 폭발 반지름이 ' + B(3, 'm') + '입니다.<br>공격 가능한 범위의 넓이는?',
      a: area(3), u: '㎡', e: '3 × 3 × 3.14 = 28.26', h: HINTS.area },
    { q: '가디언이 지름 ' + B(8, 'm') + '인 보호막을 만들었습니다.<br>보호막의 넓이는?',
      a: area(4), u: '㎡', e: '반지름 = 8 ÷ 2 = 4,  4 × 4 × 3.14 = 50.24', h: HINTS.diameter },
    { q: '메딕 회복존의 반지름은 ' + B(2, 'm') + '입니다.<br>회복존의 넓이는?',
      a: area(2), u: '㎡', e: '2 × 2 × 3.14 = 12.56', h: HINTS.area },
    { q: 'C존의 반지름은 ' + B(5, 'm') + ', A존의 반지름은 ' + B(3, 'm') + '입니다.<br>C존은 A존보다 몇 ㎡ 더 넓은가요?',
      a: area(5) - area(3), u: '㎡', e: '78.5 − 28.26 = 50.24', h: '두 존의 넓이를 각각 구한 뒤 빼요' },
    { q: '터렛 공격 범위를 반지름 ' + B(2, 'm') + '에서 ' + B(4, 'm') + '로 바꾸면<br>넓이가 몇 ㎡ 늘어나나요?',
      a: area(4) - area(2), u: '㎡', e: '50.24 − 12.56 = 37.68', h: '두 원의 넓이를 각각 구한 뒤 빼요' },
    { q: '특수기 비용(⚡)은 원의 넓이를 반올림한 값입니다.<br>반지름 ' + B(4, 'm') + '인 원은 몇 ⚡가 필요할까요?',
      a: 50, u: '⚡', e: '4 × 4 × 3.14 = 50.24 → 반올림하면 50', h: HINTS.area + ' 를 구한 뒤 일의 자리까지 반올림' },
    { q: '프로스트가 반지름 ' + B(3, 'm') + '인 둔화지역을 2번 만들었습니다.<br>두 둔화지역 넓이의 합은?',
      a: area(3) * 2, u: '㎡', e: '28.26 × 2 = 56.52', h: '한 둔화지역의 넓이를 먼저 구해요' },
    { q: '점령 게이지는 존의 넓이만큼 채워야 합니다. 1초에 3㎡씩 채우면<br>A존(반지름 ' + B(3, 'm') + ')은 약 몇 초 걸릴까요? <small>(일의 자리까지 반올림)</small>',
      a: 9, u: '초', e: '28.26 ÷ 3 = 9.42 → 약 9초', h: 'A존의 넓이 ÷ 1초에 채우는 양' },
  ];
  SIT.forEach((s) => {
    add({
      type: 6, typeName: 'situation', category: 'area', difficulty: 3,
      question: s.q, answer: Math.round(s.a * 10000) / 10000, unit: s.u, explanation: s.e, hint: s.h,
    });
  });

  // ---------------- 게임 중에 만드는 상황 문제 ----------------
  // 방금 쓴 특수기의 반지름, 우리 팀이 점령한 존을 문제로 만듭니다.
  function dynamicQuestion(p, state) {
    const list = [];
    if (p.lastSpecial && p.lastSpecial.r) {
      const { name, r } = p.lastSpecial;
      list.push({
        id: 'DYN_SPECIAL_R' + r, type: 6, typeName: 'situation', category: 'area', difficulty: 3,
        question: '방금 쓴 <b>' + name + '</b>의 반지름은 ' + B(r, 'm') + '였어요.<br>그 원의 넓이는?',
        radius: r, answer: area(r), unit: '㎡',
        explanation: r + ' × ' + r + ' × 3.14 = ' + fmt(area(r)), hint: HINTS.area,
      });
      list.push({
        id: 'DYN_SPECIAL_X2_R' + r, type: 5, typeName: 'times', category: 'compare', difficulty: 3,
        question: '방금 쓴 <b>' + name + '</b>의 반지름 ' + B(r, 'm') + '를 ' + B(r * 2, 'm') + '로 늘리면<br>넓이는 몇 배가 될까요?',
        answer: 4, unit: '배',
        explanation: '(' + r * 2 + '×' + r * 2 + ') ÷ (' + r + '×' + r + ') = ' + r * r * 4 + ' ÷ ' + r * r + ' = 4',
        hint: HINTS.times,
      });
    }
    const owned = state && state.zones ? state.zones.filter((z) => z.owner === p.team) : [];
    owned.forEach((z) => {
      list.push({
        id: 'DYN_ZONE_' + z.id, type: 6, typeName: 'situation', category: 'area', difficulty: 3,
        question: '우리 팀이 점령한 <b>' + z.id + '존</b>의 지름은 ' + B(z.r * 2, 'm') + '입니다.<br>이 존의 넓이는?',
        radius: z.r, answer: area(z.r), unit: '㎡',
        explanation: '반지름 = ' + z.r * 2 + ' ÷ 2 = ' + z.r + ',  ' + z.r + ' × ' + z.r + ' × 3.14 = ' + fmt(area(z.r)),
        hint: HINTS.diameter,
      });
    });
    const fresh = list.filter((q) => !p.usedQuestionIds || p.usedQuestionIds.indexOf(q.id) === -1);
    return fresh.length ? fresh[Math.floor(Math.random() * fresh.length)] : null;
  }

  // ---------------- 문제 뽑기 ----------------
  // 교사 설정 난이도에 따라 섞는 비율
  const MIX = {
    easy:   { 1: 1 },
    normal: { 1: 0.3, 2: 0.7 },
    hard:   { 2: 0.3, 3: 0.7 },
  };
  const DYNAMIC_CHANCE = { easy: 0, normal: 0.15, hard: 0.35 };

  /**
   * @param p      문제를 풀 플레이어 (이미 푼 문제는 다시 내지 않음)
   * @param state  게임 상태 (난이도 설정, 존 정보)
   * @param random 테스트용 난수 함수
   */
  function pick(p, state, random) {
    random = random || Math.random;
    const diff = (state && state.settings && state.settings.difficulty) || 'normal';
    const used = (p && p.usedQuestionIds) || [];

    if (p && random() < (DYNAMIC_CHANCE[diff] || 0)) {
      const dq = dynamicQuestion(p, state);
      if (dq) return dq;
    }

    // 난이도 고르기
    const mix = MIX[diff] || MIX.normal;
    let roll = random(), level = Number(Object.keys(mix)[0]);
    for (const k of Object.keys(mix)) {
      if (roll < mix[k]) { level = Number(k); break; }
      roll -= mix[k];
    }
    let pool = bank.filter((q) => q.difficulty === level && used.indexOf(q.id) === -1);
    // 그 난이도를 다 풀었으면 설정 안의 다른 난이도에서
    if (!pool.length) pool = bank.filter((q) => mix[q.difficulty] && used.indexOf(q.id) === -1);
    if (!pool.length) pool = bank.filter((q) => mix[q.difficulty]);
    return pool[Math.floor(random() * pool.length)];
  }

  // 분류 이름 (교사용 결과 화면)
  const CATEGORY_NAMES = { area: '원의 넓이', radiusDiameter: '반지름·지름', compare: '넓이 비교' };

  // STEP 19: 학습 결과·CSV 에 쓸 글자만 남긴 문제와 정답
  function plainText(q) {
    return String(q.question || '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function answerText(q) {
    if (q.choices) {
      const c = q.choices.find((x) => x.value === q.answer);
      return c ? c.label : String(q.answer);
    }
    return fmt(q.answer) + (q.unit || '');
  }

  return { bank, pick, dynamicQuestion, area, HINTS, CATEGORY_NAMES, plainText, answerText };
})();
