/* ============================================================
   서클 배틀 - 원의 넓이 문제은행 (questions.js)
   ------------------------------------------------------------
   STEP 12: 문제 55개 + 게임 상황에서 만드는 문제
   수정 STEP 2: 점령 문제 (실제 점령지역 A·B·C와 연결)
   수정 STEP 3: 원주율
     - 선생님이 고른 원주율(3.14 또는 3)로 문제은행 전체를 다시 만듭니다. (setPi)
       정답·풀이·힌트가 모두 같은 원주율로 계산됩니다.
     - 원주율로 계산해야 하는 문제에는 반드시 "※ 원주율은 3.14로 계산하세요." 가 붙습니다.
       (반지름↔지름 문제, 원주율의 뜻을 묻는 문제는 계산에 원주율을 쓰지 않으므로 붙지 않음)
     - 원주율 값(3.14)을 묻던 문제 2개는 뜻을 고르는 문제로 바꿈 (안내문이 답을 알려 주지 않게)
     - 그림과 연결하는 문제 추가: 반지름·지름 선이 그려진 원을 보고 풀기

   문제 데이터 모양 (설계서 18번과 같음)
   {
     id: "CIRCLE_001",
     type: 1,                    // TYPE 1~6
     typeName: "area",           // 유형 이름
     category: "area",           // 교사용 결과 분류: area(원의 넓이) / radiusDiameter(반지름·지름) / compare(넓이 비교)
     difficulty: 1,              // 1 쉬움 / 2 보통 / 3 어려움
     question: "반지름이 4cm인 원의 넓이는?<small class=pi-note>※ 원주율은 3.14로 계산하세요.</small>",
     radius: 4,
     pi: 3.14,                   // 이 문제를 만든 원주율 (원주율을 쓰지 않는 문제는 null)
     answer: 50.24,              // 고르기 문제는 'A' / 'B' / 'same' 등
     unit: "㎠",
     explanation: "4 × 4 × 3.14 = 50.24",
     hint: "원의 넓이 = 반지름 × 반지름 × 원주율(3.14)",
     choices: [...]              // 고르기 문제만
     plain: "..."                // 그림 문제: 학습 결과·CSV 에 쓸 글자 (그림 대신)
   }

   유형
     TYPE 1  반지름으로 원의 넓이 구하기           쉬움 (넓이→반지름 거꾸로 구하기는 어려움)
     TYPE 2  지름으로 원의 넓이 구하기             보통
     TYPE 3  반지름과 지름의 관계                  쉬움
     TYPE 4  두 원 비교 (고르기)                   보통
     TYPE 5  넓이가 몇 배가 되는지                 어려움
     TYPE 6  게임 상황 문제                        어려움
   ※ 새 문제는 아래 표에 한 줄씩 더하면 됩니다. 정답과 풀이는 자동으로 계산됩니다.
     문제 번호가 학습 결과에 남으므로, 있는 문제 사이에 끼워 넣지 말고 맨 뒤(그림 문제 아래)에 더하세요.
   ============================================================ */

const Questions = (function () {
  let PI = CONFIG.PI;   // 지금 문제은행을 만든 원주율
  let HINTS = {};
  const bank = [];
  let n = 0;

  // 소수 계산 오차 없이 넓이 구하기 (반지름이 정수·소수 한 자리일 때 정확)
  function area(r) {
    return Math.round(r * r * PI * 10000) / 10000;
  }
  function sq(unit) { return unit === 'm' ? '㎡' : '㎠'; }
  function fmt(n) { return String(Math.round(n * 10000) / 10000); }
  // 문제 속 숫자는 크게 보이도록 <b>로 감쌈
  function B(n, unit) { return '<b>' + n + (unit || '') + '</b>'; }
  // 원주율 안내 (원주율로 계산하는 문제에만)
  function piNote() { return '<small class="pi-note">' + piNoteText(PI) + '</small>'; }
  // "3 × 3 × 3.14 = 28.26"
  function calc(r) { return r + ' × ' + r + ' × ' + PI + ' = ' + fmt(area(r)); }

  function makeHints() {
    return {
      area: '원의 넓이 = 반지름 × 반지름 × 원주율(' + PI + ')',
      concept: '원의 넓이 = 반지름 × 반지름 × 원주율',
      reverse: '반지름 × 반지름 = 넓이 ÷ ' + PI + ' → 같은 수를 두 번 곱해서 그 값이 되는 수를 찾아요',
      diameter: '먼저 반지름을 구해요: 반지름 = 지름 ÷ 2. 그다음 반지름 × 반지름 × ' + PI,
      relation: '지름 = 반지름 × 2,  반지름 = 지름 ÷ 2',
      compare: '두 원 모두 반지름으로 바꾼 뒤 넓이를 구해서 비교해요 (반지름 = 지름 ÷ 2)',
      times: '(새 반지름 × 새 반지름) ÷ (처음 반지름 × 처음 반지름)',
      picture: '선이 원의 중심에서 끝났으면 반지름, 원을 가로질렀으면 지름이에요 (반지름 = 지름 ÷ 2)',
    };
  }

  function nextId() { n++; return 'CIRCLE_' + String(n).padStart(3, '0'); }
  // usesPi: 원주율로 계산하는 문제 → 문제 끝에 원주율 안내를 붙임
  function add(q, usesPi) {
    q.id = q.id || nextId();
    q.pi = usesPi ? PI : null;
    if (usesPi) q.question += piNote();
    bank.push(q);
  }

  // ---------------- 수정 STEP 3: 그림 ----------------
  // 원 여러 개를 같은 크기로 그림 (실제 크기와 다름 → 선의 길이 글자를 읽어야 풂)
  //   items: [{ tag: '㉠', kind: 'r'(반지름 선) | 'd'(지름 선), len: 6, unit: 'm' }]
  function circlesSvg(items) {
    const tags = items.some((it) => it.tag);
    const R = 26, gap = 22, W = items.length * (R * 2 + gap) - gap + 8, H = R * 2 + (tags ? 26 : 8);
    let s = '<svg class="q-pic" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" aria-hidden="true">';
    items.forEach((it, i) => {
      const cx = 4 + R + i * (R * 2 + gap), cy = R + 4;
      s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="rgba(255,216,77,0.08)" stroke="#9ee8ff" stroke-width="2"/>';
      s += '<circle cx="' + cx + '" cy="' + cy + '" r="2.5" fill="#fff"/>';
      const x0 = it.kind === 'd' ? cx - R : cx;
      s += '<line x1="' + x0 + '" y1="' + cy + '" x2="' + (cx + R) + '" y2="' + cy + '" stroke="#ffd84d" stroke-width="2.5"/>';
      const tx = it.kind === 'd' ? cx : cx + R / 2;
      s += '<text x="' + tx + '" y="' + (cy - 5) + '" text-anchor="middle" font-size="12" fill="#ffd84d">' + it.len + it.unit + '</text>';
      if (it.tag) s += '<text x="' + cx + '" y="' + (H - 3) + '" text-anchor="middle" font-size="14" fill="#fff">' + it.tag + '</text>';
    });
    return s + '</svg>';
  }
  function picWords(it) { return (it.tag ? it.tag + ' ' : '') + (it.kind === 'd' ? '지름 ' : '반지름 ') + it.len + it.unit; }

  // ============================================================
  //  문제은행 만들기 (원주율이 바뀌면 다시 만듦)
  // ============================================================
  function build(pi) {
    PI = pi;
    HINTS = makeHints();
    bank.length = 0;
    n = 0;

    // ---------------- TYPE 1: 반지름 → 넓이 (쉬움) ----------------
    [
      [4, 'cm', '원'], [2, 'cm', '원'], [3, 'm', '회복존'], [5, 'cm', '원'], [6, 'm', '보호막'],
      [7, 'cm', '원'], [8, 'm', '에너지 존'], [9, 'cm', '원'], [10, 'cm', '원'], [1, 'm', '터렛 공격 범위'],
    ].forEach(([r, u, what]) => {
      add({
        type: 1, typeName: 'area', category: 'area', difficulty: 1,
        question: '반지름이 ' + B(r, u) + '인 ' + what + '의 넓이는?',
        radius: r, answer: area(r), unit: sq(u),
        explanation: calc(r),
        hint: HINTS.area,
      }, true);
    });
    // 원주율의 뜻 (쉬움, 고르기) — 번호 CIRCLE_011·012 (예전 "원주율 값 쓰기" 문제 자리)
    add({
      type: 1, typeName: 'concept', category: 'area', difficulty: 1,
      question: '원의 넓이 = 반지름 × 반지름 × ( ? )<br>( ? )에 들어갈 말은 무엇일까요?',
      answer: 'pi', unit: '',
      choices: [{ value: 'pi', label: '원주율' }, { value: 'd', label: '지름' }, { value: 'c', label: '원의 둘레' }],
      explanation: '원의 넓이 = 반지름 × 반지름 × 원주율', hint: '원을 잘라 직사각형처럼 늘어놓으면 가로 = 원의 둘레의 반, 세로 = 반지름',
    }, false);
    add({
      type: 1, typeName: 'concept', category: 'area', difficulty: 1,
      question: '원주율은 원의 ( ? )이/가 지름의 몇 배인지 나타낸 수예요.<br>( ? )에 들어갈 말은?',
      answer: 'c', unit: '',
      choices: [{ value: 'c', label: '둘레' }, { value: 'a', label: '넓이' }, { value: 'r', label: '반지름' }],
      explanation: '원주율 = 원의 둘레 ÷ 지름 (약 3.14, 어림하면 3)', hint: '원주율 = (원의 ?) ÷ 지름',
    }, false);
    // 넓이 → 반지름 거꾸로 (어려움)
    [[5, 'cm', '원'], [2, 'cm', '원'], [6, 'm', '보호막']].forEach(([r, u, what]) => {
      const a = area(r);
      add({
        type: 1, typeName: 'areaReverse', category: 'area', difficulty: 3,
        question: '넓이가 ' + B(fmt(a), sq(u)) + '인 ' + what + '의 반지름은?',
        radius: r, answer: r, unit: u,
        explanation: calc(r) + ' 이므로 반지름은 ' + r + u,
        hint: HINTS.reverse,
      }, true);
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
        explanation: '반지름 = ' + d + ' ÷ 2 = ' + r + ',  ' + calc(r),
        hint: HINTS.diameter,
      }, true);
    });

    // ---------------- TYPE 3: 반지름 ↔ 지름 (쉬움, 원주율 쓰지 않음) ----------------
    [[14, 'm'], [10, 'cm'], [18, 'cm'], [6, 'm']].forEach(([d, u]) => {
      add({
        type: 3, typeName: 'radiusFromDiameter', category: 'radiusDiameter', difficulty: 1,
        question: '지름이 ' + B(d, u) + '인 원의 반지름은?',
        diameter: d, radius: d / 2, answer: d / 2, unit: u,
        explanation: '반지름 = 지름 ÷ 2 = ' + d + ' ÷ 2 = ' + d / 2, hint: HINTS.relation,
      }, false);
    });
    [[4, 'cm'], [6, 'm'], [11, 'cm'], [15, 'm']].forEach(([r, u]) => {
      add({
        type: 3, typeName: 'diameterFromRadius', category: 'radiusDiameter', difficulty: 1,
        question: '반지름이 ' + B(r, u) + '인 원의 지름은?',
        radius: r, diameter: r * 2, answer: r * 2, unit: u,
        explanation: '지름 = 반지름 × 2 = ' + r + ' × 2 = ' + r * 2, hint: HINTS.relation,
      }, false);
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
      const say = (k, v) => '<span class="nw">' + (k === 'r' ? '반지름 ' : '지름 ') + B(v, u) + '</span>';
      const expl = (k, v, r, a) => (k === 'd' ? '반지름 ' + v + '÷2=' + r + ', ' : '') + r + '×' + r + '×' + PI + '=' + fmt(a) + sq(u);
      add({
        type: 4, typeName: 'compare', category: 'compare', difficulty: 2,
        question: '어느 ' + what + '의 넓이가 더 넓을까요?<br>A: ' + say(ka, va) + '&nbsp;&nbsp;&nbsp;&nbsp;B: ' + say(kb, vb),
        answer: ans, unit: '', choices: CHOICES,
        explanation: 'A: ' + expl(ka, va, ra, aa) + '  /  B: ' + expl(kb, vb, rb, ab),
        hint: HINTS.compare,
      }, true);
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
          '(' + rb + '×' + rb + ') ÷ (' + ra + '×' + ra + ') = ' + rb * rb + ' ÷ ' + ra * ra + ' = ' + times +
          '  (원주율은 양쪽에 똑같이 곱해져서 몇 배인지에는 영향이 없어요)',
        hint: HINTS.times + (kind === 'd' ? ' (지름 ÷ 2 = 반지름)' : ''),
      }, true);
    });

    // ---------------- TYPE 6: 게임 상황 (어려움) ----------------
    const d2 = (x) => Math.round(x * 10000) / 10000;
    const SIT = [
      { q: '블래스터의 에너지 폭발 반지름이 ' + B(3, 'm') + '입니다.<br>공격 가능한 범위의 넓이는?',
        a: area(3), u: '㎡', e: calc(3), h: HINTS.area },
      { q: '가디언의 에너지 방벽은 지름 ' + B(8, 'm') + '인 원을 따라 생깁니다.<br>이 원의 넓이는?',
        a: area(4), u: '㎡', e: '반지름 = 8 ÷ 2 = 4,  ' + calc(4), h: HINTS.diameter },
      { q: '메딕 회복존의 반지름은 ' + B(2, 'm') + '입니다.<br>회복존의 넓이는?',
        a: area(2), u: '㎡', e: calc(2), h: HINTS.area },
      // 새 STEP 2: 가운데 핵심 존이 B존(반지름 5m)으로 바뀜
      { q: 'B존의 반지름은 ' + B(5, 'm') + ', A존의 반지름은 ' + B(3, 'm') + '입니다.<br>B존은 A존보다 몇 ㎡ 더 넓은가요?',
        a: d2(area(5) - area(3)), u: '㎡', e: fmt(area(5)) + ' − ' + fmt(area(3)) + ' = ' + fmt(area(5) - area(3)), h: '두 존의 넓이를 각각 구한 뒤 빼요' },
      { q: '터렛 공격 범위를 반지름 ' + B(2, 'm') + '에서 ' + B(4, 'm') + '로 바꾸면<br>넓이가 몇 ㎡ 늘어나나요?',
        a: d2(area(4) - area(2)), u: '㎡', e: fmt(area(4)) + ' − ' + fmt(area(2)) + ' = ' + fmt(area(4) - area(2)), h: '두 원의 넓이를 각각 구한 뒤 빼요' },
      // (예전: 특수기 비용 문제 → 비용 규칙이 바뀌어 존과 폭발 넓이 문제로 바꿈, 번호는 그대로)
      { q: '반지름 ' + B(3, 'm') + '인 A존 한가운데에 반지름 ' + B(2, 'm') + '인 에너지 폭발이 일어났어요.<br>A존에서 폭발 범위 밖의 넓이는?',
        a: d2(area(3) - area(2)), u: '㎡', e: fmt(area(3)) + ' − ' + fmt(area(2)) + ' = ' + fmt(area(3) - area(2)), h: '큰 원의 넓이 − 작은 원의 넓이' },
      { q: '프로스트가 반지름 ' + B(3, 'm') + '인 둔화지역을 2번 만들었습니다.<br>두 둔화지역 넓이의 합은?',
        a: d2(area(3) * 2), u: '㎡', e: fmt(area(3)) + ' × 2 = ' + fmt(area(3) * 2), h: '한 둔화지역의 넓이를 먼저 구해요' },
      { q: '점령 게이지는 존의 넓이만큼 채워야 합니다. 1초에 3㎡씩 채우면<br>A존(반지름 ' + B(3, 'm') + ')은 약 몇 초 걸릴까요? <small>(일의 자리까지 반올림)</small>',
        a: Math.round(area(3) / 3), u: '초', e: fmt(area(3)) + ' ÷ 3 = ' + fmt(area(3) / 3) + ' → 약 ' + Math.round(area(3) / 3) + '초',
        h: 'A존의 넓이 ÷ 1초에 채우는 양' },
    ];
    SIT.forEach((s) => {
      add({
        type: 6, typeName: 'situation', category: 'area', difficulty: 3,
        question: s.q, answer: Math.round(s.a * 10000) / 10000, unit: s.u, explanation: s.e, hint: s.h,
      }, true);
    });

    // ---------------- 수정 STEP 3: 그림 보고 넓이 (CIRCLE_056~) ----------------
    [['r', 3, 'm', 1], ['d', 10, 'cm', 2], ['r', 6, 'cm', 1], ['d', 8, 'm', 2]].forEach(([kind, len, u, lv]) => {
      const r = kind === 'r' ? len : len / 2;
      const it = { kind, len, unit: u };
      add({
        type: kind === 'r' ? 1 : 2, typeName: 'picture', category: 'area', difficulty: lv,
        question: '그림과 같은 원의 넓이는 몇 ' + sq(u) + '일까요?<br>' + circlesSvg([it]),
        plain: '그림(' + picWords(it) + ')과 같은 원의 넓이는 몇 ' + sq(u) + '일까요?',
        radius: r, answer: area(r), unit: sq(u),
        explanation: (kind === 'd' ? '그림의 선은 지름 → 반지름 = ' + len + ' ÷ 2 = ' + r + ',  ' : '그림의 선은 반지름 → ') + calc(r),
        hint: HINTS.picture,
      }, true);
    });
  }

  // 선생님이 고른 원주율로 다시 만들기 (같은 값이면 그대로)
  function setPi(pi) {
    if (pi !== 3 && pi !== 3.14) pi = CONFIG.ROOM_DEFAULTS.pi;
    if (pi === PI && bank.length) return;
    build(pi);
  }

  build(CONFIG.PI);

  // ---------------- 게임 중에 만드는 상황 문제 ----------------
  // 방금 쓴 특수기의 반지름, 우리 팀이 점령한 존을 문제로 만듭니다.
  function dynamicQuestion(p, state) {
    const list = [];
    if (p.lastSpecial && p.lastSpecial.r) {
      const { name, r } = p.lastSpecial;
      list.push({
        id: 'DYN_SPECIAL_R' + r, type: 6, typeName: 'situation', category: 'area', difficulty: 3, pi: PI,
        question: '방금 쓴 <b>' + name + '</b>의 반지름은 ' + B(r, 'm') + '였어요.<br>그 원의 넓이는?' + piNote(),
        radius: r, answer: area(r), unit: '㎡',
        explanation: calc(r), hint: HINTS.area,
      });
      list.push({
        id: 'DYN_SPECIAL_X2_R' + r, type: 5, typeName: 'times', category: 'compare', difficulty: 3, pi: PI,
        question: '방금 쓴 <b>' + name + '</b>의 반지름 ' + B(r, 'm') + '를 ' + B(r * 2, 'm') + '로 늘리면<br>넓이는 몇 배가 될까요?' + piNote(),
        answer: 4, unit: '배',
        explanation: '(' + r * 2 + '×' + r * 2 + ') ÷ (' + r + '×' + r + ') = ' + r * r * 4 + ' ÷ ' + r * r + ' = 4',
        hint: HINTS.times,
      });
    }
    const owned = state && state.zones ? state.zones.filter((z) => z.owner === p.team) : [];
    owned.forEach((z) => {
      list.push({
        id: 'DYN_ZONE_' + z.id, type: 6, typeName: 'situation', category: 'area', difficulty: 3, pi: PI,
        question: '우리 팀이 점령한 <b>' + z.id + '존</b>의 지름은 ' + B(z.r * 2, 'm') + '입니다.<br>이 존의 넓이는?' + piNote(),
        radius: z.r, answer: area(z.r), unit: '㎡',
        explanation: '반지름 = ' + z.r * 2 + ' ÷ 2 = ' + z.r + ',  ' + calc(z.r),
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

  // ---------------- 수정 STEP 2: 점령 문제 (실제 점령지역과 연결) ----------------
  // 존 A 반지름 3m / B 4m / C 5m. 매번 같은 계산만 나오지 않도록 여러 유형을 섞습니다.
  //   Z1 반지름 → 넓이 (쉬움)     Z2 지름 → 넓이 (보통)       Z3 지름 → 반지름 (쉬움)
  //   Z4 두 존 넓이 비교 (보통)   Z5 두 존 넓이의 차 (어려움)  Z6 반지름이 바뀌면 몇 배 (어려움)
  //   Z7 그림에서 같은 원 찾기 (수정 STEP 3 · 쉬움~어려움)
  const ZONE_MIX = {
    easy:   { Z1: 0.45, Z3: 0.3, Z7: 0.25 },
    normal: { Z1: 0.25, Z2: 0.3, Z4: 0.25, Z7: 0.2 },
    hard:   { Z2: 0.25, Z4: 0.15, Z5: 0.2, Z6: 0.2, Z7: 0.2 },
  };
  const ZONE_HINT = '원의 넓이 = 반지름 × 반지름 × 원주율';
  const TAGS = ['㉠', '㉡', '㉢'];

  function zoneQuestionOf(kind, z, other) {
    const name = z.id + ' 에너지 존';
    const r = z.r, d = z.r * 2;
    const base = { zoneId: z.id, pi: PI };
    if (kind === 'Z1') return { ...base, id: 'ZONE_' + z.id + '_R', type: 1, typeName: 'area', category: 'area', difficulty: 1,
      question: name + '의 반지름은 ' + B(r, 'm') + '입니다.<br>이 원의 넓이는 몇 ㎡일까요?' + piNote(),
      radius: r, answer: area(r), unit: '㎡', explanation: calc(r), hint: ZONE_HINT };
    if (kind === 'Z2') return { ...base, id: 'ZONE_' + z.id + '_D', type: 2, typeName: 'areaFromDiameter', category: 'area', difficulty: 2,
      question: name + '의 지름은 ' + B(d, 'm') + '입니다.<br>이 원의 넓이는 몇 ㎡일까요?' + piNote(),
      radius: r, diameter: d, answer: area(r), unit: '㎡',
      explanation: '반지름 = ' + d + ' ÷ 2 = ' + r + ',  ' + calc(r),
      hint: '먼저 반지름을 구해요 (반지름 = 지름 ÷ 2). ' + ZONE_HINT };
    if (kind === 'Z3') return { ...base, pi: null, id: 'ZONE_' + z.id + '_DR', type: 3, typeName: 'radiusFromDiameter', category: 'radiusDiameter', difficulty: 1,
      question: name + '의 지름은 ' + B(d, 'm') + '입니다.<br>이 원의 반지름은 몇 m일까요?',
      diameter: d, radius: r, answer: r, unit: 'm', explanation: '반지름 = 지름 ÷ 2 = ' + d + ' ÷ 2 = ' + r, hint: HINTS.relation };
    if (kind === 'Z4') {
      // 한쪽은 반지름, 한쪽은 지름으로 주어 바로 비교하지 못하게
      const aa = area(z.r), ab = area(other.r);
      return { ...base, id: 'ZONE_' + z.id + '_CMP_' + other.id, type: 4, typeName: 'compare', category: 'compare', difficulty: 2,
        question: '어느 존이 더 넓을까요?<br><span class="nw">' + z.id + '존: 반지름 ' + B(z.r, 'm') + '</span>&nbsp;&nbsp;&nbsp; ' +
          '<span class="nw">' + other.id + '존: 지름 ' + B(other.r * 2, 'm') + '</span>' + piNote(),
        answer: aa > ab ? 'A' : ab > aa ? 'B' : 'same', unit: '',
        choices: [{ value: 'A', label: z.id + '존이 더 넓다' }, { value: 'B', label: other.id + '존이 더 넓다' },
          { value: 'same', label: '넓이가 같다' }],
        explanation: z.id + '존: ' + z.r + '×' + z.r + '×' + PI + '=' + fmt(aa) + '㎡  /  ' + other.id + '존: 반지름 ' +
          (other.r * 2) + '÷2=' + other.r + ', ' + other.r + '×' + other.r + '×' + PI + '=' + fmt(ab) + '㎡',
        hint: '두 존 모두 반지름으로 바꾼 뒤 넓이를 구해서 비교해요' };
    }
    if (kind === 'Z5') {
      const big = z.r >= other.r ? z : other, small = big === z ? other : z;
      const diff = Math.round((area(big.r) - area(small.r)) * 10000) / 10000;
      return { ...base, id: 'ZONE_' + big.id + '_MINUS_' + small.id, type: 6, typeName: 'situation', category: 'area', difficulty: 3,
        question: big.id + '존의 반지름은 ' + B(big.r, 'm') + ', ' + small.id + '존의 반지름은 ' + B(small.r, 'm') + '입니다.<br>' +
          big.id + '존은 ' + small.id + '존보다 몇 ㎡ 더 넓을까요?' + piNote(),
        answer: diff, unit: '㎡',
        explanation: fmt(area(big.r)) + ' − ' + fmt(area(small.r)) + ' = ' + fmt(diff),
        hint: '두 존의 넓이를 각각 구한 뒤 빼요. ' + ZONE_HINT };
    }
    if (kind === 'Z7') {
      // 그림 연결: 같은 크기로 그린 원 3개 중 이 존과 넓이가 같은 원 (지름 2r = 정답 / 지름 r / 반지름 2r)
      const items = [
        { value: 'ok', kind: 'd', len: d, unit: 'm' },
        { value: 'half', kind: 'd', len: r, unit: 'm' },
        { value: 'double', kind: 'r', len: d, unit: 'm' },
      ];
      const shift = { A: 1, B: 2, C: 0 }[z.id] || 0; // 존마다 정답 자리가 다르게
      const order = items.slice(shift).concat(items.slice(0, shift));
      order.forEach((it, i) => { it.tag = TAGS[i]; });
      return { ...base, id: 'ZONE_' + z.id + '_PIC', type: 4, typeName: 'picture', category: 'radiusDiameter', difficulty: 1,
        question: name + '의 반지름은 ' + B(r, 'm') + '입니다.<br>이 존과 넓이가 같은 원을 그림에서 고르세요.<br>' +
          circlesSvg(order) + '<small class="pic-note">그림은 실제 크기와 달라요</small>' + piNote(),
        plain: name + '(반지름 ' + r + 'm)과 넓이가 같은 원은? 그림: ' + order.map(picWords).join(', '),
        answer: 'ok', unit: '',
        choices: order.map((it) => ({ value: it.value, label: it.tag })), // 그림을 읽어야 풀 수 있게 기호만
        explanation: '반지름이 ' + r + 'm로 같아야 넓이가 같아요. 지름 ' + d + 'm → 반지름 ' + d + ' ÷ 2 = ' + r + 'm',
        hint: HINTS.picture };
    }
    // Z6: 반지름이 2배 또는 3배가 되면 넓이는 몇 배
    const k = z.r <= 3 ? 3 : 2;
    return { ...base, id: 'ZONE_' + z.id + '_X' + k, type: 5, typeName: 'times', category: 'compare', difficulty: 3,
      question: name + '의 반지름을 ' + B(z.r, 'm') + '에서 ' + B(z.r * k, 'm') + '로 늘리면<br>넓이는 몇 배가 될까요?' + piNote(),
      answer: k * k, unit: '배',
      explanation: '(' + z.r * k + '×' + z.r * k + ') ÷ (' + z.r + '×' + z.r + ') = ' + (z.r * k) * (z.r * k) + ' ÷ ' + z.r * z.r + ' = ' + k * k,
      hint: HINTS.times };
  }

  /**
   * 점령 문제 하나 고르기 (이 존과 연결된 문제, 이번 경기에서 안 푼 것 먼저)
   * @param p     문제를 풀 플레이어
   * @param zone  점령하려는 존 { id, r }
   * @param state 게임 상태 (난이도 설정)
   */
  function zoneQuestion(p, zone, state, random) {
    random = random || Math.random;
    const diff = (state && state.settings && state.settings.difficulty) || 'normal';
    const mix = ZONE_MIX[diff] || ZONE_MIX.normal;
    const used = (p && p.usedQuestionIds) || [];
    const others = GameMap.zones.filter((z) => z.id !== zone.id);
    const all = [];
    Object.keys(mix).forEach((kind) => {
      const list = kind === 'Z4' || kind === 'Z5' ? others.map((o) => zoneQuestionOf(kind, zone, o)) : [zoneQuestionOf(kind, zone)];
      list.forEach((q) => all.push({ q, w: mix[kind] / list.length }));
    });
    const fresh = all.filter((x) => used.indexOf(x.q.id) === -1);
    const pool = fresh.length ? fresh : all;
    let roll = random() * pool.reduce((s, x) => s + x.w, 0);
    for (const x of pool) {
      if (roll < x.w) return x.q;
      roll -= x.w;
    }
    return pool[pool.length - 1].q;
  }

  // ---------------- 수정 STEP 4: 스킬과 연결된 터미널 문제 ----------------
  // 곧 올라갈 레벨의 효과 범위(원)로 문제를 만듭니다. 예) "LEVEL 2 냉기 지역의 반지름은 4m입니다…"
  //   S1 반지름 → 넓이 (쉬움) / S2 지름 → 넓이 (보통) / S3 레벨이 오르면 넓이가 몇 ㎡ 늘어나나 (어려움)
  const SKILL_WORD = {
    blaster: '에너지 폭발 범위', guardian: '에너지 방벽이 그리는 원', medic: '회복존',
    speeder: '순간이동할 수 있는 범위', engineer: '터렛 공격 범위', frost: '냉기 지역',
  };
  const SKILL_MIX = {
    easy:   { S1: 1 },
    normal: { S1: 0.4, S2: 0.6 },
    hard:   { S2: 0.4, S3: 0.6 },
  };

  function skillQuestionOf(kind, charId, next) {
    const word = SKILL_WORD[charId] || '스킬 범위';
    const lvR = (lv) => CHARACTERS[charId].special.levels[lv - 1].r;
    const r = lvR(next), d = r * 2;
    const base = { pi: PI, skillLevel: next };
    const lvName = 'LEVEL ' + next + ' ' + word;
    if (kind === 'S1') return { ...base, id: 'SKILL_' + charId + '_L' + next + '_R', type: 1, typeName: 'area', category: 'area', difficulty: 1,
      question: lvName + '의 반지름은 ' + B(r, 'm') + '입니다.<br>이 원의 넓이는 몇 ㎡일까요?' + piNote(),
      radius: r, answer: area(r), unit: '㎡', explanation: calc(r), hint: HINTS.area };
    if (kind === 'S2') return { ...base, id: 'SKILL_' + charId + '_L' + next + '_D', type: 2, typeName: 'areaFromDiameter', category: 'area', difficulty: 2,
      question: lvName + '의 지름은 ' + B(d, 'm') + '입니다.<br>이 원의 넓이는 몇 ㎡일까요?' + piNote(),
      radius: r, diameter: d, answer: area(r), unit: '㎡',
      explanation: '반지름 = ' + d + ' ÷ 2 = ' + r + ',  ' + calc(r), hint: HINTS.diameter };
    // S3: 한 레벨 전 → 이번 레벨 (LEVEL 1 해금 문제는 LEVEL 1 → 2)
    const a = next >= 2 ? next - 1 : 1, b = next >= 2 ? next : 2;
    const ra = lvR(a), rb = lvR(b);
    const diff = Math.round((area(rb) - area(ra)) * 10000) / 10000;
    return { ...base, id: 'SKILL_' + charId + '_UP' + b, type: 6, typeName: 'situation', category: 'area', difficulty: 3,
      question: word + '의 반지름이 LEVEL ' + a + '에서 ' + B(ra, 'm') + ', LEVEL ' + b + '에서 ' + B(rb, 'm') + '가 돼요.<br>넓이는 몇 ㎡ 늘어날까요?' + piNote(),
      answer: diff, unit: '㎡', explanation: fmt(area(rb)) + ' − ' + fmt(area(ra)) + ' = ' + fmt(diff),
      hint: '두 원의 넓이를 각각 구한 뒤 빼요. ' + HINTS.area };
  }

  /**
   * 내 캐릭터 스킬과 연결된 문제 (다음에 올라갈 레벨의 원). 이미 푼 문제면 null
   * @param p      플레이어 { charId, skillLevel, usedQuestionIds }
   * @param state  게임 상태 (난이도 설정)
   */
  function skillQuestion(p, state, random) {
    random = random || Math.random;
    const sp = CHARACTERS[p.charId] && CHARACTERS[p.charId].special;
    if (!sp || !sp.levels) return null;
    const next = Math.min(SKILL_LEVEL_MAX, (p.skillLevel | 0) + 1);
    const diff = (state && state.settings && state.settings.difficulty) || 'normal';
    const mix = SKILL_MIX[diff] || SKILL_MIX.normal;
    const used = p.usedQuestionIds || [];
    const pool = Object.keys(mix).map((k) => ({ q: skillQuestionOf(k, p.charId, next), w: mix[k] }))
      .filter((x) => used.indexOf(x.q.id) === -1);
    if (!pool.length) return null;
    let roll = random() * pool.reduce((s, x) => s + x.w, 0);
    for (const x of pool) {
      if (roll < x.w) return x.q;
      roll -= x.w;
    }
    return pool[pool.length - 1].q;
  }

  // 분류 이름 (교사용 결과 화면)
  const CATEGORY_NAMES = { area: '원의 넓이', radiusDiameter: '반지름·지름', compare: '넓이 비교' };

  // STEP 19: 학습 결과·CSV 에 쓸 글자만 남긴 문제와 정답 (그림 문제는 그림을 글로 바꾼 것)
  function plainText(q) {
    const html = String(q.question || '');
    const note = /pi-note/.test(html) ? ' ' + (html.match(/※ 원주율은 [^<]+/) || [''])[0] : '';
    if (q.plain) return q.plain + note;
    return html.replace(/<br\s*\/?>/gi, ' ').replace(/<small/gi, ' <small').replace(/<svg[\s\S]*?<\/svg>/gi, ' ').replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function answerText(q) {
    if (q.choices) {
      const c = q.choices.find((x) => x.value === q.answer);
      if (c && q.typeName === 'picture') {
        const m = (q.plain || '').match(new RegExp(c.label + ' [^,]+'));
        return m ? m[0] : c.label; // "㉡ 지름 6m"
      }
      return c ? c.label : String(q.answer);
    }
    return fmt(q.answer) + (q.unit || '');
  }

  return {
    bank, pick, dynamicQuestion, zoneQuestion, skillQuestion, area, CATEGORY_NAMES, plainText, answerText, setPi,
    get HINTS() { return HINTS; },
    get pi() { return PI; },
  };
})();
