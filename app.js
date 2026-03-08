// app.js - SOOP Balloon Battle v5 (두산 + 귀인 등장 + 폭죽 + 화면 흔들림)

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
let prevDusans = {};

function formatNumber(n) {
  return Number(n || 0).toLocaleString('ko-KR');
}

function getDusans(score){
  if(!score) return 0
  return Math.floor((Math.sqrt(8*score+1)-1)/2)
}

function makeGoldenConfetti(count = 40) {

  const layer = document.getElementById('confettiLayer');
  if (!layer) return;

  layer.innerHTML = '';

  const colors = [
    '#FFD700',
    '#FFC400',
    '#FFDF00',
    '#FFF176'
  ];

  for (let i = 0; i < count; i++) {

    const dot = document.createElement('div');

    dot.className = 'confetti-dot';

    dot.style.cssText = `
      left:${Math.random()*100}%;
      top:${Math.random()*100}%;
      background:${colors[Math.floor(Math.random()*colors.length)]};
      width:${6+Math.random()*10}px;
      height:${6+Math.random()*10}px;
      animation-delay:${Math.random()*0.4}s;
    `;

    layer.appendChild(dot);

  }

  layer.style.display = 'block';

  setTimeout(() => {

    layer.style.display = 'none';
    layer.innerHTML = '';

  },3000);

}

function shakeScreen(){

  const root = document.body;

  root.classList.add('screen-shake');

  setTimeout(()=>{
    root.classList.remove('screen-shake')
  },900)

}

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

function render(data){

  if(!data) return;

  const scores = data.scores || {};

  const leftScore = scores[LEFT_ID] || 0;
  const leftDusans = getDusans(leftScore);

  let rightScore = 0;

  MEMBERS.forEach(m=>{
    rightScore += scores[m.id] || 0;
  });

  const rightDusans = getDusans(rightScore);

  const total = leftScore + rightScore;

  const leftPct  = total > 0 ? Math.round(leftScore / total * 1000) / 10 : 50;
  const rightPct = total > 0 ? Math.round(rightScore / total * 1000) / 10 : 50;

  const leftName = data.left_label || LEFT_LABEL;

  document.getElementById('title').textContent =
    data.title || '갈없녀 두산CK';

  document.getElementById('subtitle').textContent =
    data.subtitle || '🏔️ 누적 10만개 달성시 장가계';

  document.getElementById('leftLabel').textContent = leftName;

  const leftEl  = document.getElementById('leftScore');
  const rightEl = document.getElementById('rightTotal');

  leftEl.innerHTML =
    leftDusans + " 두산<br><span style='font-size:13px'>총합 "
    + formatNumber(leftScore) + "</span>";

  rightEl.innerHTML =
    rightDusans + " 두산<br><span style='font-size:13px'>총합 "
    + formatNumber(rightScore) + "</span>";

  document.getElementById('gaugeLeft').style.width  = leftPct + '%';
  document.getElementById('gaugeRight').style.width = rightPct + '%';

  document.getElementById('leftPct').textContent  =
    leftName + ' ' + leftPct + '%';

  document.getElementById('rightPct').textContent =
    '멤버들 ' + rightPct + '%';

  renderRanking(scores);

  const allPlayers = [{ id: LEFT_ID, label: leftName }, ...MEMBERS];

  allPlayers.forEach(p=>{

    const score = scores[p.id] || 0;

    const dusans = getDusans(score);

    const prev = prevDusans[p.id] || 0;

    if(dusans >= 101 && dusans > prev){

      document.getElementById('bsLabel').textContent = '✨ 귀인 등장';
      document.getElementById('bsName').textContent  = p.label + '방';
      document.getElementById('bsAmount').textContent =
        dusans + ' 두산';

      showPopup('bigSupportPopup',6000);

      makeGoldenConfetti(60);

      shakeScreen();

    }

    prevDusans[p.id] = dusans;

  });

  prevScores = {...scores};

}

function renderRanking(scores){

  const list = document.getElementById('rankingList');

  const sorted =
    [...MEMBERS].sort((a,b)=>(scores[b.id]||0)-(scores[a.id]||0));

  list.innerHTML = '';

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
        <span style="font-size:12px">
        총합 ${formatNumber(score)}
        </span>
      </div>
    `;

    list.appendChild(row);

  });

}

async function loadInitial(){

  const {data,error} =
    await sbClient
      .from('match_state')
      .select('*')
      .eq('match_key',MATCH_KEY)
      .single();

  if(error){

    console.error('초기 로드 실패:',error);

    document.getElementById('subtitle').textContent =
      '⚠️ 데이터 로드 실패';

    return;
  }

  render(data);

}

function startRealtime(){

  sbClient
    .channel('battle-'+MATCH_KEY)
    .on('postgres_changes',{
      event:'UPDATE',
      schema:'public',
      table:'match_state',
      filter:`match_key=eq.${MATCH_KEY}`
    },payload=>{

      render(payload.new);

    })
    .subscribe();

}

loadInitial();
startRealtime();
