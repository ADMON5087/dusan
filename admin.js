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
