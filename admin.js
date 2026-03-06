// admin.js - SOOP Score Admin Logic

const supabase = window.supabase.createClient(
  APP_CONFIG.SUPABASE_URL,
  APP_CONFIG.SUPABASE_ANON_KEY
);

const MATCH_KEY = 'galduosanck';

// 현재 매치 데이터 가져오기
async function getMatch() {
  const { data, error } = await supabase
    .from('match_state')
    .select('*')
    .eq('match_key', MATCH_KEY)
    .single();
  if (error) { console.error('getMatch error:', error); return null; }
  return data;
}

// 상태 새로고침
async function reloadState() {
  const data = await getMatch();
  if (!data) {
    document.getElementById('stateView').textContent = '❌ 데이터를 불러올 수 없습니다.\nSupabase 연결 및 match_state 테이블을 확인하세요.';
    return;
  }
  document.getElementById('stateView').textContent = JSON.stringify(data, null, 2);
}

// 점수 추가
async function addScore() {
  const player = document.getElementById('playerSelect').value;
  const amount = parseInt(document.getElementById('addAmount').value);
  const msg = document.getElementById('addMsg');

  if (!player || isNaN(amount) || amount <= 0) {
    msg.textContent = '⚠️ 플레이어와 올바른 풍선 수를 입력하세요.';
    return;
  }

  const data = await getMatch();
  if (!data) { msg.textContent = '❌ 데이터 로드 실패'; return; }

  const scores = data.scores || {};
  scores[player] = (scores[player] || 0) + amount;

  const { error } = await supabase
    .from('match_state')
    .update({ scores, updated_at: new Date().toISOString() })
    .eq('match_key', MATCH_KEY);

  if (error) {
    msg.textContent = '❌ 업데이트 실패: ' + error.message;
  } else {
    msg.textContent = `✅ ${player} +${amount} 추가 완료!`;
    document.getElementById('addAmount').value = '';
    reloadState();
  }
  setTimeout(() => { msg.textContent = ''; }, 3000);
}

// 베이스라인 적용
async function applyBaseline() {
  const msg = document.getElementById('baseMsg');
  const scores = {
    busky3:      parseInt(document.getElementById('base_busky3').value) || 0,
    yyssaa33:    parseInt(document.getElementById('base_yyssaa33').value) || 0,
    rlsk0705:    parseInt(document.getElementById('base_rlsk0705').value) || 0,
    finepearls:  parseInt(document.getElementById('base_finepearls').value) || 0,
    khl1589:     parseInt(document.getElementById('base_khl1589').value) || 0,
    wkddudrms15: parseInt(document.getElementById('base_wkddudrms15').value) || 0,
  };

  const { error } = await supabase
    .from('match_state')
    .update({ scores, updated_at: new Date().toISOString() })
    .eq('match_key', MATCH_KEY);

  if (error) {
    msg.textContent = '❌ 베이스라인 적용 실패: ' + error.message;
  } else {
    msg.textContent = '✅ 베이스라인 적용 완료!';
    reloadState();
  }
  setTimeout(() => { msg.textContent = ''; }, 3000);
}

// 매치 리셋
async function resetMatch() {
  if (!confirm('⚠️ 모든 점수를 0으로 초기화합니다. 계속하시겠습니까?')) return;
  const msg = document.getElementById('resetMsg');

  const scores = {
    busky3: 0, yyssaa33: 0, rlsk0705: 0,
    finepearls: 0, khl1589: 0, wkddudrms15: 0
  };

  // 베이스라인 입력 초기화
  Object.keys(scores).forEach(id => {
    const el = document.getElementById('base_' + id);
    if (el) el.value = 0;
  });

  const { error } = await supabase
    .from('match_state')
    .update({ scores, updated_at: new Date().toISOString() })
    .eq('match_key', MATCH_KEY);

  if (error) {
    msg.textContent = '❌ 리셋 실패: ' + error.message;
  } else {
    msg.textContent = '✅ 매치 리셋 완료!';
    reloadState();
  }
  setTimeout(() => { msg.textContent = ''; }, 3000);
}

// 초기 로드
reloadState();
