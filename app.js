// app.js - SOOP Balloon Battle v4 메인 로직 (두산 시스템 적용)

const sbClient = window.supabase.createClient(
  APP_CONFIG.SUPABASE_URL,
  APP_CONFIG.SUPABASE_ANON_KEY
);

const urlParams = new URLSearchParams(window.location.search);
const MATCH_KEY = urlParams.get('match') || 'galduosanck';

const LEFT_ID = 'busky3';
const LEFT_LABEL = '하두링';

const MEMBERS = [
  { id: 'yyssaa33', label: '제티' },
  { id: 'rlsk0705', label: '기나' },
  { id: 'finepearls', label: '혜냥' },
  { id: 'khl1589', label: '요시' },
  { id: 'wkddudrms15', label: '난수' },
];

let prevScores = {};
let prevLeader = null;
let leaderSince = null;
let sirenShown = false;
let milestones = {};

function formatNumber(n) {
  return Number(n || 0).toLocaleString('ko-KR');
}

// ─────────────────────────────
// 두산 계산 함수
// ─────────────────────────────

function getDusans(score){
  if(!score) return 0
  return Math.floor((Math.sqrt(8*score+1)-1)/2)
}

// ─────────────────────────────
// 메인 렌더
// ─────────────────────────────

function render(data) {

  if (!data) return;

  const scores = data.scores || {};

  const leftScore = scores[LEFT_ID] || 0;
  const leftDusans = getDusans(leftScore);

  let rightScore = 0;
  MEMBERS.forEach(m=>{
    rightScore += scores[m.id] || 0;
  })

  const rightDusans = getDusans(rightScore);

  const total = leftScore + rightScore;

  const leftPct  = total > 0 ? Math.round(leftScore / total * 1000) / 10 : 50;
  const rightPct = total > 0 ? Math.round(rightScore / total * 1000) / 10 : 50;

  const leftName = data.left_label || LEFT_LABEL;

  document.getElementById('title').textContent    = data.title || '갈없녀 두산CK';
  document.getElementById('subtitle').textContent = data.subtitle || '🏔️ 누적 10만개 달성시 장가계';
  document.getElementById('leftLabel').textContent = leftName;

  const leftEl  = document.getElementById('leftScore');
  const rightEl = document.getElementById('rightTotal');

  leftEl.innerHTML =
    leftDusans + " 두산<br><span style='font-size:13px'>총합 " +
    formatNumber(leftScore) + "</span>";

  rightEl.innerHTML =
    rightDusans + " 두산<br><span style='font-size:13px'>총합 " +
    formatNumber(rightScore) + "</span>";

  document.getElementById('gaugeLeft').style.width  = leftPct + '%';
  document.getElementById('gaugeRight').style.width = rightPct + '%';

  document.getElementById('leftPct').textContent  = leftName + ' ' + leftPct + '%';
  document.getElementById('rightPct').textContent = '멤버들 ' + rightPct + '%';

  const isLeftLeading = leftScore >= rightScore;

  const leader = isLeftLeading ? leftName : '멤버들 총합';

  const gap = Math.abs(leftScore - rightScore);

  const gapEl = document.getElementById('winnerGap');

  document.getElementById('winnerName').textContent = leader;

  if (gap === 0) {

    gapEl.textContent = '동점!';
    gapEl.className   = 'winner-gap';

  } else if (isLeftLeading) {

    gapEl.innerHTML =
      '멤버들보다 <span class="gap-number">+' +
      formatNumber(gap) +
      '</span> 앞서는 중';

    gapEl.className = 'winner-gap';

  } else {

    gapEl.innerHTML =
      leftName +
      '보다 <span class="gap-number">+' +
      formatNumber(gap) +
      '</span> 앞서는 중';

    gapEl.className = 'winner-gap haduring-lead';
  }

  renderRanking(scores);

  prevScores = { ...scores };
}

// ─────────────────────────────
// 랭킹
// ─────────────────────────────

function renderRanking(scores) {

  const list = document.getElementById('rankingList');

  const sorted = [...MEMBERS].sort((a,b)=> (scores[b.id]||0)-(scores[a.id]||0));

  list.innerHTML='';

  sorted.forEach((m,i)=>{

    const score = scores[m.id] || 0;
    const dusans = getDusans(score);

    const row = document.createElement('div');

    row.className = 'rank-row';

    row.innerHTML = `
      <div class="rank-badge">${i+1}</div>
      <div class="rank-info">
        <div class="rank-name">${m.label}</div>
      </div>
      <div class="rank-score">
        ${dusans} 두산<br>
        <span style="font-size:12px">총합 ${formatNumber(score)}</span>
      </div>
    `;

    list.appendChild(row);

  })

}

// ─────────────────────────────
// 데이터 로드
// ─────────────────────────────

async function loadInitial() {

  const { data, error } = await sbClient
    .from('match_state')
    .select('*')
    .eq('match_key', MATCH_KEY)
    .single();

  if (error) {

    console.error('초기 로드 실패:', error);

    document.getElementById('subtitle').textContent =
      '⚠️ 데이터 로드 실패 - Supabase 연결 확인';

    return;
  }

  render(data);

}

// ─────────────────────────────
// realtime
// ─────────────────────────────

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

// ─────────────────────────────
// 시작
// ─────────────────────────────

loadInitial();
startRealtime();
