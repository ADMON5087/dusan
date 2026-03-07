// app.js - SOOP Balloon Battle v4 메인 로직 (뉴모피즘 라이트 테마)

const sbClient = window.supabase.createClient(
  APP_CONFIG.SUPABASE_URL,
  APP_CONFIG.SUPABASE_ANON_KEY
);

// URL 파라미터로 match_key 지원 (기본값: galduosanck)
const urlParams = new URLSearchParams(window.location.search);
const MATCH_KEY = urlParams.get('match') || 'galduosanck';

// 플레이어 고정 정보 (실제 SOOP ID → 표시 이름)
const LEFT_ID = 'busky3';
const LEFT_LABEL = '하두링';
const MEMBERS = [
  { id: 'yyssaa33',    label: '제티' },
  { id: 'rlsk0705',    label: '기나' },
  { id: 'finepearls',  label: '혜냥' },
  { id: 'khl1589',     label: '요시' },
  { id: 'wkddudrms15', label: '난수' },
];

// 이전 상태 저장 (애니메이션 비교용)
let prevScores = {};
let prevLeader = null;
let leaderSince = null;
let sirenShown = false;
let milestones = {};

// ── 유틸 함수들 ──────────────────────────────────────────

function formatNumber(n) {
  return Number(n || 0).toLocaleString('ko-KR');
}

function animateNumber(el, from, to, duration = 450) {
  if (from === to) { el.textContent = formatNumber(to); return; }
  const start = performance.now();
  function step(now) {
    const t = Math.min((now - start) / duration, 1);
    const ease = t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
    el.textContent = formatNumber(Math.round(from + (to - from) * ease));
    if (t < 1) requestAnimationFrame(step);
    else el.textContent = formatNumber(to);
  }
  requestAnimationFrame(step);
}

// 큰손 팝업 (flex 행 안에 내장) show/hide
function showBighand(name, amount, duration = 4000) {
  const el = document.getElementById('bighandPopup');
  if (!el) return;
  document.getElementById('bhName').textContent   = name;
  document.getElementById('bhAmount').textContent = amount;
  el.classList.add('popup-show');
  el.style.display = 'block';
  setTimeout(() => {
    el.classList.remove('popup-show');
    el.style.display = 'none';
  }, duration);
}

// 오버레이 팝업 (500개+, 1만개) show/hide
function showPopup(id, duration = 4000) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = 'flex';
  el.classList.remove('popup-show');
  void el.offsetWidth;
  el.classList.add('popup-show');
  setTimeout(() => {
    el.classList.remove('popup-show');
    el.style.display = 'none';
  }, duration);
}

function makeConfetti(count = 30) {
  const layer = document.getElementById('confettiLayer');
  if (!layer) return;
  layer.innerHTML = '';
  const colors = ['#d02870','#ffd700','#3a5fdf','#7fff7f','#ff8c00','#ff69b4'];
  for (let i = 0; i < count; i++) {
    const dot = document.createElement('div');
    dot.className = 'confetti-dot';
    dot.style.cssText = `
      left:${Math.random()*100}%;
      top:${Math.random()*100}%;
      background:${colors[Math.floor(Math.random()*colors.length)]};
      width:${6+Math.random()*8}px;
      height:${6+Math.random()*8}px;
      animation-delay:${Math.random()*0.5}s;
    `;
    layer.appendChild(dot);
  }
  layer.style.display = 'block';
  setTimeout(() => { layer.style.display = 'none'; layer.innerHTML = ''; }, 3000);
}

// ── 메인 렌더 함수 ───────────────────────────────────────

function render(data) {
  if (!data) return;

  const scores     = data.scores || {};
  const leftScore  = scores[LEFT_ID] || 0;
  const rightScore = MEMBERS.reduce((s, m) => s + (scores[m.id] || 0), 0);
  const total      = leftScore + rightScore;
  const leftPct    = total > 0 ? Math.round(leftScore  / total * 1000) / 10 : 50;
  const rightPct   = total > 0 ? Math.round(rightScore / total * 1000) / 10 : 50;

  const leftName = data.left_label || LEFT_LABEL;

  // 타이틀
  document.getElementById('title').textContent    = data.title    || '갈없녀 두산CK';
  document.getElementById('subtitle').textContent = data.subtitle || '🏔️ 누적 10만개 달성시 장가계';
  document.getElementById('leftLabel').textContent = leftName;

  // 점수 애니메이션
  const leftEl  = document.getElementById('leftScore');
  const rightEl = document.getElementById('rightTotal');
  animateNumber(leftEl,  parseInt(leftEl.textContent.replace(/,/g,''))  || 0, leftScore);
  animateNumber(rightEl, parseInt(rightEl.textContent.replace(/,/g,'')) || 0, rightScore);

  // VS 게이지
  document.getElementById('gaugeLeft').style.width  = leftPct  + '%';
  document.getElementById('gaugeRight').style.width = rightPct + '%';
  document.getElementById('leftPct').textContent    = leftName + ' ' + leftPct + '%';
  document.getElementById('rightPct').textContent   = '멤버들 ' + rightPct + '%';

  // 위너 카드
  const isLeftLeading = leftScore >= rightScore;
  const leader        = isLeftLeading ? leftName : '멤버들 총합';
  const gap           = Math.abs(leftScore - rightScore);
  const gapEl         = document.getElementById('winnerGap');

  document.getElementById('winnerName').textContent = leader;

  if (gap === 0) {
    gapEl.textContent = '동점!';
    gapEl.className   = 'winner-gap';
  } else if (isLeftLeading) {
    // 하두링 선두 → 핑크 색
    gapEl.textContent = '멤버들보다 +' + formatNumber(gap) + ' 앞서는 중';
    gapEl.className   = 'winner-gap';
  } else {
    // 멤버 선두 → 파란 색
    gapEl.textContent = leftName + '보다 +' + formatNumber(gap) + ' 앞서는 중';
    gapEl.className   = 'winner-gap haduring-lead';
  }

  // 랭킹 렌더
  renderRanking(scores, data);

  // ── 이벤트 감지 ──
  if (Object.keys(prevScores).length > 0) {

    // 큰손 (멤버 500개+ 투하)
    MEMBERS.forEach(m => {
      const diff = (scores[m.id] || 0) - (prevScores[m.id] || 0);
      if (diff >= 500) {
        showBighand(m.label, '⭐ +' + formatNumber(diff) + '개 별풍선 ', 7000);
        makeConfetti(40);
      }
    });
    // 큰손 (하두링 500개+)
    const leftDiff = leftScore - (prevScores[LEFT_ID] || 0);
    if (leftDiff >= 500) {
      showBighand(leftName, '⭐ +' + formatNumber(leftDiff) + '개 별풍선 ', 7000);
      makeConfetti(40);
    }

    // 500개+ 오버레이 팝업 (별도 대형 팝업)
    MEMBERS.forEach(m => {
      const diff = (scores[m.id] || 0) - (prevScores[m.id] || 0);
      if (diff >= 500) {
        document.getElementById('bsLabel').textContent  = '🎉 500개 이상 투척!';
        document.getElementById('bsName').textContent   = m.label + '방';
        document.getElementById('bsAmount').innerHTML = '⭐ +' + formatNumber(diff) + '개<br>';
        showPopup('bigSupportPopup', 8000);
        makeConfetti(50);
      }
    });
    if (leftDiff >= 500) {
      document.getElementById('bsLabel').textContent  = '🎉 500개 이상 투척!';
      document.getElementById('bsName').textContent   = leftName + '방';
      document.getElementById('bsAmount').innerHTML = '⭐ +' + formatNumber(leftDiff) + '개<br>';
      showPopup('bigSupportPopup', 8000);
      makeConfetti(50);
    }

    // MILESTONE (1만 단위 돌파)
    const allPlayers = [{ id: LEFT_ID, label: leftName }, ...MEMBERS];
    allPlayers.forEach(p => {
      const prev      = prevScores[p.id] || 0;
      const curr      = scores[p.id]     || 0;
      const prevMile  = Math.floor(prev / 10000);
      const currMile  = Math.floor(curr / 10000);
      if (currMile > prevMile && currMile > (milestones[p.id] || 0)) {
        milestones[p.id] = currMile;
        document.getElementById('msLabel').textContent = '🏔️ 누적 ' + formatNumber(currMile) + '만개 돌파!';
        document.getElementById('msValue').textContent = p.label + ' · 목표까지 남은 ' + formatNumber(100000 - curr) + '개!';
        showPopup('milestonePopup', 8000);
        makeConfetti(60);
      }
    });

    // LEAD CHANGE
    const currentLeader = isLeftLeading ? 'left' : 'right';
    if (prevLeader && prevLeader !== currentLeader) {
      document.getElementById('lcName').textContent = leader;
      showPopup('leadChangePopup', 3000);
      const wc = document.getElementById('winnerCard');
      wc.classList.add('flash-card');
      setTimeout(() => wc.classList.remove('flash-card'), 1000);
    }

    // SIREN (5분 이상 같은 팀 선두)
    const currentLeaderKey = currentLeader;
    if (prevLeader === currentLeaderKey) {
      if (!leaderSince) leaderSince = Date.now();
      if (Date.now() - leaderSince > 5 * 60 * 1000 && !sirenShown) {
        sirenShown = true;
        const sirenBar = document.getElementById('sirenBar');
        const sirenTxt = document.getElementById('sirenText');
        sirenBar.style.display = 'block';
        if (isLeftLeading) {
          sirenTxt.textContent  = leftName + ' 5분째 선두유지중!';
          sirenBar.className    = 'siren-bar haduring-lead';
        } else {
          sirenTxt.textContent  = '멤버들 5분째 선두유지중!';
          sirenBar.className    = 'siren-bar member-lead';
        }
      }
    } else {
      leaderSince = null;
      sirenShown  = false;
      document.getElementById('sirenBar').style.display = 'none';
    }

    prevLeader = currentLeader;

  } else {
    prevLeader = isLeftLeading ? 'left' : 'right';
  }

  prevScores = { ...scores };
}

// ── 랭킹 렌더 ────────────────────────────────────────────

function renderRanking(scores, data) {
  const list   = document.getElementById('rankingList');
  const sorted = [...MEMBERS].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));
  const maxScore = Math.max(...sorted.map(m => scores[m.id] || 0), 1);

  // FLIP 애니메이션 준비
  const prevPositions = {};
  Array.from(list.children).forEach(row => {
    prevPositions[row.dataset.id] = row.getBoundingClientRect();
  });

  list.innerHTML = '';
  sorted.forEach((m, i) => {
    const score = scores[m.id] || 0;
    const pct   = Math.round(score / maxScore * 100);
    const isMvp = i === 0 && score > 0;

    const row = document.createElement('div');
    row.className  = 'rank-row' + (isMvp ? ' mvp' : '');
    row.dataset.id = m.id;
    row.innerHTML  = `
      <div class="rank-badge">${isMvp ? '1' : i + 1}</div>
      ${isMvp ? '<span class="mini-tag">MVP</span>' : ''}
      <div class="rank-info">
        <div class="rank-name">${m.label}</div>
        <div class="rank-bar-bg">
          <div class="rank-bar-fill" style="width:${pct}%"></div>
        </div>
      </div>
      <div class="rank-score">${formatNumber(score)} ⭐</div>
    `;
    list.appendChild(row);
  });

  // FLIP 실행
  Array.from(list.children).forEach(row => {
    const id = row.dataset.id;
    if (prevPositions[id]) {
      const prev = prevPositions[id];
      const curr = row.getBoundingClientRect();
      const dy   = prev.top - curr.top;
      if (Math.abs(dy) > 1) {
        row.style.transform = `translateY(${dy}px)`;
        row.style.transition = 'none';
        requestAnimationFrame(() => {
          row.style.transition = 'transform 0.38s ease';
          row.style.transform  = '';
        });
      }
    }
  });
}

// ── 데이터 로드 & 실시간 구독 ────────────────────────────

async function loadInitial() {
  const { data, error } = await sbClient
    .from('match_state')
    .select('*')
    .eq('match_key', MATCH_KEY)
    .single();

  if (error) {
    console.error('초기 로드 실패:', error);
    document.getElementById('subtitle').textContent = '⚠️ 데이터 로드 실패 - Supabase 연결 확인';
    return;
  }
  render(data);
}

function startRealtime() {
  sbClient
    .channel('battle-' + MATCH_KEY)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'match_state',
      filter: `match_key=eq.${MATCH_KEY}`
    }, payload => {
      render(payload.new);
    })
    .subscribe();
}

// 초기화
loadInitial();
startRealtime();
