// admin.js - 순차 두산 입력

async function adjustScore(playerId, direction){

  const amtEl = document.getElementById('amt_'+playerId);
  const amount = parseInt(amtEl.value);

  if(isNaN(amount) || amount<=0){
    showCardMsg(playerId,'⚠️ 숫자 입력','#ff8c00');
    return;
  }

  const data = await getMatch();
  if(!data) return;

  const scores = data.scores || {};
  const currentScore = scores[playerId] || 0;

  const currentDusans = Math.floor((Math.sqrt(8*currentScore+1)-1)/2);
  const nextNumber = currentDusans + 1;

  if(amount !== nextNumber){
    showCardMsg(playerId,`❌ ${nextNumber} 두산만 인정`,'#ff2e63');
    return;
  }

  scores[playerId] = currentScore + amount;

  const { error } = await sbClient
    .from('match_state')
    .update({ scores, updated_at:new Date().toISOString() })
    .eq('match_key', MATCH_KEY);

  if(error){
    showCardMsg(playerId,'❌ 실패','#ff2e63');
  }else{
    showCardMsg(playerId,`✅ ${amount} 두산 인정`,'#7fff7f');
    amtEl.value='';
    cachedScores=scores;
    updateScoreCards(scores);
  }

}
async function resetMatch(){

  if(!confirm("정말 모든 점수를 초기화할까요?")) return;

  const players = [
    "busky3",
    "yyssaa33",
    "rlsk0705",
    "finepearls",
    "khl1589",
    "wkddudrms15"
  ];

  const scores = {};

  players.forEach(p=>{
    scores[p] = 0;
  });

  const { error } = await sbClient
    .from("match_state")
    .update({
      scores: scores
    })
    .eq("match_key","galduosanck");

  if(error){

    alert("초기화 실패");
    console.error(error);
    return;

  }

  alert("매치 초기화 완료");

}
