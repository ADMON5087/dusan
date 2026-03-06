// admin.js - SOOP Score Admin Logic (점수 +/- 지원)

const sbClient = window.supabase.createClient(
  APP_CONFIG.SUPABASE_URL,
  APP_CONFIG.SUPABASE_ANON_KEY
);

const MATCH_KEY = 'galduosanck';

// 플레이어 목록
const PLAYERS = [
  { id: 'busky3',      label: '하두링' },
  { id: 'finepearls',  label: '혜냥' },
  { id: 'khl1589',     label: '요시' },
  { id: 'yyssaa33',    label: '제티' },
  { id: 'rlsk0705',    label: '기나' },
  { id: 'wkddudrms15', label: '난수' },
];

// 빠른 입력 버튼 값
const QUICK_VALUES = [50, 100, 300, 500, 1000];

// 현재 점수 캐시
let cachedScores = {};

// ── DB 조회 ────────────────────────────────────────────

async function getMatch() {
  const { data, error } = await sbClient
    .from('match_state')
    .select('*')
    .eq('match_key', MATCH_KEY)
    .single();
  if (error) { console.error('getMatch error:', error); return null; }
  return data;
}

// ── 상태 새로고침 ────────────────────────────────────────

async function reloadState() {
  const data = await getMatch();
  if (!data) {
    document.getElementById('stateView').textContent =
      '❌ 데이터를 불러올 수 없습니다.\nSupabase 연결 및 match_state 테이블을 확인하세요.';
    return;
  }
  cachedScores = data.scores || {};
  document.getElementById('stateView').textContent = JSON.stringify(data, null, 2);
  updateScoreCards(cachedScores);
}

// ── 점수 카드 렌더 ────────────────────────────────────────

function buildScoreCards() {
  const container = document.getElementById('scoreCards');
  container.innerHTML = '';
  PLAYERS.forEach(p => {
    const card = document.createElement('div');
    card.className = 'score-card';
    card.id = 'card_' + p.id;
    card.innerHTML = `
      <div class="player-name">${p.label}</div>
      <div class="cur-score" id="cur_${p.id}">0 ⭐</div>
      <div class="btn-row">
        <input type="number" class="amt-input" id="amt_${p.id}" placeholder="100" min="1" value=""/>
        <button class="btn-sm plus"  onclick="adjustScore('${p.id}', +1)">➕</button>
        <button class="btn-sm minus" onclick="adjustScore('${p.id}', -1)">➖</button>
      </div>
      <div class="quick-btns">
        ${QUICK_VALUES.map(v =>
          `<button class="q-btn" onclick="setAmt('${p.id}',${v})">${v}</button>`
        ).join('')}
      </div>
      <div class="card-msg" id="msg_${p.id}"></div>
    `;
    container.appendChild(card);
  });
}

function updateScoreCards(scores) {
  PLAYERS.forEach(p => {
    const el = document.getElementById('cur_' + p.id);
    if (el) el.textContent = Number(scores[p.id] || 0).toLocaleString('ko-KR') + ' ⭐';
  });
}

// 빠른 값 클릭 시 input에 세팅
function setAmt(playerId, value) {
  const el = document.getElementById('amt_' + playerId);
  if (el) { el.value = value; el.focus(); }
}

// ── 점수 +/- 처리 ─────────────────────────────────────────

async function adjustScore(playerId, direction) {
  const amtEl = document.getElementById('amt_' + playerId);
  const msgEl = document.getElementById('msg_' + playerId);
  const amount = parseInt(amtEl.value);

  if (isNaN(amount) || amount <= 0) {
    showCardMsg(playerId, '⚠️ 숫자를 입력하세요', '#ff8c00');
    amtEl.focus();
    return;
  }

  const data = await getMatch();
  if (!data) { showCardMsg(playerId, '❌ DB 오류', '#ff2e63'); return; }

  const scores   = data.scores || {};
  const current  = scores[playerId] || 0;
  const delta    = direction * amount;
  const newScore = Math.max(0, current + delta); // 0 미만 방지

  scores[playerId] = newScore;

  const { error } = await sbClient
    .from('match_state')
    .update({ scores, updated_at: new Date().toISOString() })
    .eq('match_key', MATCH_KEY);

  if (error) {
    showCardMsg(playerId, '❌ 실패: ' + error.message, '#ff2e63');
  } else {
    const playerLabel = PLAYERS.find(p => p.id === playerId)?.label || playerId;
    const sign = direction > 0 ? '+' : '-';
    showCardMsg(playerId,
      `${sign}${amount.toLocaleString('ko-KR')} → ${newScore.toLocaleString('ko-KR')} ✅`,
      '#7fff7f');
    amtEl.value = '';
    cachedScores = scores;
    updateScoreCards(scores);
    // 현재 상태 패널도 갱신
    document.getElementById('stateView').textContent = JSON.stringify(
      { ...data, scores }, null, 2);
  }
}

function showCardMsg(playerId, text, color) {
  const el = document.getElementById('msg_' + playerId);
  if (!el) return;
  el.textContent = text;
  el.style.color  = color || '#ffd700';
  clearTimeout(el._timer);
  el._timer = setTimeout(() => { el.textContent = ''; }, 3500);
}

// ── 베이스라인 설정 ────────────────────────────────────────

async function applyBaseline() {
  const msg = document.getElementById('baseMsg');
  const scores = {
    busky3:      parseInt(document.getElementById('base_busky3').value)      || 0,
    yyssaa33:    parseInt(document.getElementById('base_yyssaa33').value)    || 0,
    rlsk0705:    parseInt(document.getElementById('base_rlsk0705').value)    || 0,
    finepearls:  parseInt(document.getElementById('base_finepearls').value)  || 0,
    khl1589:     parseInt(document.getElementById('base_khl1589').value)     || 0,
    wkddudrms15: parseInt(document.getElementById('base_wkddudrms15').value) || 0,
  };

  const { error } = await sbClient
    .from('match_state')
    .update({ scores, updated_at: new Date().toISOString() })
    .eq('match_key', MATCH_KEY);

  if (error) {
    msg.textContent = '❌ 베이스라인 적용 실패: ' + error.message;
    msg.style.color = '#ff2e63';
  } else {
    msg.textContent = '✅ 베이스라인 적용 완료!';
    msg.style.color = '#7fff7f';
    cachedScores = scores;
    updateScoreCards(scores);
    reloadState();
  }
  setTimeout(() => { msg.textContent = ''; }, 3000);
}

// ── 매치 리셋 ─────────────────────────────────────────────

async function resetMatch() {
  if (!confirm('⚠️ 모든 점수를 0으로 초기화합니다. 계속하시겠습니까?')) return;
  const msg = document.getElementById('resetMsg');

  const scores = {
    busky3: 0, yyssaa33: 0, rlsk0705: 0,
    finepearls: 0, khl1589: 0, wkddudrms15: 0
  };

  // 베이스라인 입력도 0으로
  Object.keys(scores).forEach(id => {
    const el = document.getElementById('base_' + id);
    if (el) el.value = 0;
  });

  const { error } = await sbClient
    .from('match_state')
    .update({ scores, updated_at: new Date().toISOString() })
    .eq('match_key', MATCH_KEY);

  if (error) {
    msg.textContent = '❌ 리셋 실패: ' + error.message;
    msg.style.color = '#ff2e63';
  } else {
    msg.textContent = '✅ 매치 리셋 완료!';
    msg.style.color = '#7fff7f';
    cachedScores = scores;
    updateScoreCards(scores);
    reloadState();
  }
  setTimeout(() => { msg.textContent = ''; }, 3000);
}

// ── 초기화 ───────────────────────────────────────────────

buildScoreCards();
reloadState();
