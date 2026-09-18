(() => {
  const originalRunGame = window.runGame;
  const originalFinishGame = window.finishGame;
  const originalFinishSession = window.finishSession;
  let active = false;
  let round = 0;
  let score = 0;
  let best = Number(localStorage.getItem('ccner-sequence-best') || 0);
  let consecutiveWrong = 0;
  let level = 1;
  let sequence = [];
  let locked = false;
  let stageResults = [];

  const colors = [
    {id:'red', label:'Red', cls:'seq-red'},
    {id:'blue', label:'Blue', cls:'seq-blue'},
    {id:'green', label:'Green', cls:'seq-green'},
    {id:'yellow', label:'Yellow', cls:'seq-yellow'}
  ];

  const $id = id => document.getElementById(id);
  const setText = (id,text) => { const el=$id(id); if(el) el.textContent=text; };

  function renderHeader(){
    setText('gameCategory','MEMORY');
    setText('gameTitle','Sequence Memory');
    setText('gamePrompt','Watch carefully…');
    const area=$id('gameArea');
    if(!area) return;
    area.innerHTML=`
      <div class="sequence-memory-shell">
        <div class="sequence-stats">
          <span>Round <b id="seqRound">1</b></span>
          <span>Score <b id="seqScore">0</b></span>
          <span>Best <b id="seqBest">${best}</b></span>
          <span>Level <b id="seqLevel">${level}/3</b></span>
        </div>
        <div class="sequence-status" id="seqStatus">Watch carefully…</div>
        <div class="sequence-board" id="sequenceBoard" aria-label="Sequence memory board">
          ${colors.map(c=>`<button class="sequence-memory-tile ${c.cls}" data-color="${c.id}" type="button" aria-label="${c.label}"></button>`).join('')}
        </div>
        <div class="sequence-dots" id="sequenceDots" aria-hidden="true"><i class="active"></i><i></i><i></i></div>
        <div class="sequence-round-count" id="sequenceRoundCount">0 of 3</div>
      </div>`;
  }

  function setStatus(message,type='neutral'){
    const el=$id('seqStatus');
    if(!el) return;
    el.textContent=message;
    el.className=`sequence-status ${type}`;
  }

  function setStats(){
    setText('seqRound',round);
    setText('seqScore',score);
    setText('seqBest',best);
    setText('seqLevel',`${level}/3`);
  }

  function buildSequence(){
    const length=Math.min(3+(level-1)+Math.floor((round-1)/2),8);
    sequence=[];
    for(let i=0;i<length;i++){
      let next=colors[Math.floor(Math.random()*colors.length)].id;
      if(i>0 && next===sequence[i-1]) next=colors[(colors.findIndex(c=>c.id===next)+1)%colors.length].id;
      sequence.push(next);
    }
  }

  function flashSequence(done){
    locked=true;
    const tiles=[...document.querySelectorAll('.sequence-memory-tile')];
    let i=0;
    setStatus('Watch carefully…');
    const flash=()=>{
      tiles.forEach(t=>t.classList.remove('lit'));
      if(i>=sequence.length){
        setTimeout(()=>{
          tiles.forEach(t=>t.classList.remove('lit'));
          locked=false;
          setStatus('Your turn! Repeat the sequence','ready');
          done();
        },260);
        return;
      }
      const tile=tiles.find(t=>t.dataset.color===sequence[i]);
      if(tile){tile.classList.add('lit');setTimeout(()=>tile.classList.remove('lit'),430);}
      i++;
      setTimeout(flash,600);
    };
    flash();
  }

  function nextRound(){
    if(round>=5){endSequence('stage-complete');return;}
    round++;
    buildSequence();
    setStats();
    const count=$id('sequenceRoundCount'); if(count) count.textContent=`0 of ${sequence.length}`;
    flashSequence(startInput);
  }

  function startInput(){
    const tiles=[...document.querySelectorAll('.sequence-memory-tile')];
    let pos=0;
    tiles.forEach(tile=>tile.onclick=()=>{
      if(locked || pos>=sequence.length) return;
      tile.classList.add('pressed');
      setTimeout(()=>tile.classList.remove('pressed'),160);
      const chosen=tile.dataset.color;
      if(chosen!==sequence[pos]){handleWrong();return;}
      pos++;
      const count=$id('sequenceRoundCount'); if(count) count.textContent=`${pos} of ${sequence.length}`;
      if(pos===sequence.length) handleCorrect();
    });
  }

  function handleCorrect(){
    if(locked)return;
    locked=true;
    score++;
    consecutiveWrong=0;
    stageResults.push({correct:true,round});
    best=Math.max(best,score);
    localStorage.setItem('ccner-sequence-best',String(best));
    setStats();
    setStatus('Correct! 🌟 Next step…','correct');
    setTimeout(()=>{locked=false;nextRound();},650);
  }

  function handleWrong(){
    if(locked)return;
    locked=true;
    consecutiveWrong++;
    stageResults.push({correct:false,round});
    setStatus('Incorrect — moving to the next step.','wrong');
    setTimeout(()=>{
      if(consecutiveWrong>=3){endSequence('three-wrong');return;}
      locked=false;
      nextRound();
    },700);
  }

  function endSequence(reason){
    locked=true;
    active=false;
    const total=stageResults.length;
    const correct=stageResults.filter(x=>x.correct).length;
    const accuracy=total?correct/total:0;
    const summary={correct,total,accuracy,score:Math.round(accuracy*100),reason,level,rounds:total};
    window.__ccnerSequenceSummary=summary;
    setStatus(reason==='three-wrong'?'Stage complete — moving to the next game.':'Stage complete — moving to the next game.','complete');
    try{window.CognitiveCareCompanion?.onGameEvent?.({type:correct?'correct':'incorrect'});}catch(_){ }
    setTimeout(()=>originalFinishGame(accuracy>=0.5),850);
  }

  window.runGame=function(key){
    if(key!=='memory') return originalRunGame(key);
    active=true;round=0;score=0;consecutiveWrong=0;level=1;sequence=[];locked=false;stageResults=[];
    renderHeader();
    if(window.say) window.say('Watch the colors light up, then repeat the sequence from memory.','thinking','focused');
    setTimeout(nextRound,650);
  };

  window.finishGame=function(correct=false,skipped=false){
    if(active)return;
    return originalFinishGame(correct,skipped);
  };

  window.finishSession=function(){
    const summary=window.__ccnerSequenceSummary;
    const result=originalFinishSession();
    if(summary){
      try{
        const history=JSON.parse(localStorage.getItem('ccner-history')||'[]');
        const last=history[history.length-1];
        if(last?.results){
          const r=last.results.find(x=>x.name==='Familiar Object Memory');
          if(r){r.name='Sequence Memory';r.score=summary.score;r.correct=summary.accuracy>=0.5?1:0;}
          localStorage.setItem('ccner-history',JSON.stringify(history));
        }
      }catch(_){ }
      window.__ccnerSequenceSummary=null;
    }
    return result;
  };

  const observer=new MutationObserver(()=>{
    const title=$id('gameTitle');
    if(title && title.textContent==='Familiar Object Memory') title.textContent='Sequence Memory';
  });
  observer.observe(document.body,{subtree:true,childList:true,characterData:true});
})();