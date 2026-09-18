/* Daily Routine Recall — elderly-friendly sequence recall using familiar daily activities. */
(function(){
  const routines=[
    {name:'Morning Start',steps:[['🌅','Wake up'],['🪥','Brush teeth'],['🧼','Wash face'],['☕','Have tea'],['🍽️','Have breakfast'],['💊','Take medicine']]},
    {name:'Getting Ready',steps:[['🌅','Wake up'],['🛁','Take a bath'],['👕','Get dressed'],['🪮','Comb hair'],['🍽️','Have breakfast'],['🚶','Go outside']]},
    {name:'Medicine Routine',steps:[['⏰','Notice the reminder'],['💊','Take medicine'],['💧','Drink water'],['🪑','Sit and rest'],['📝','Mark it as done']]},
    {name:'Evening Routine',steps:[['🍽️','Have dinner'],['💊','Take evening medicine'],['📖','Read a little'],['🧼','Wash up'],['🛏️','Go to bed']]},
    {name:'Tea Time',steps:[['🫖','Prepare tea'],['☕','Pour tea'],['🍪','Take a small snack'],['🪑','Sit comfortably'],['😊','Enjoy tea']]},
    {name:'Going for a Walk',steps:[['👕','Get ready'],['👟','Put on walking shoes'],['🔑','Take the keys'],['💧','Carry water'],['🚶','Go for a walk']]}
  ];
  function getLevel(){const chosen=window.CCNERAdaptive?.choose?.('routine');return Math.max(1,Math.min(5,Number(chosen||state.level||1)))}
  function settings(level,available){return{level,length:Math.min(available,level===1?3:level===2?4:level===3?5:level===4?5:6),view:level===1?8.5:level===2?7.5:level===3?6.5:level===4?5.5:4.8,distractors:level>=4?2:level>=3?1:0}}
  function install(){
    if(typeof state==='undefined'||typeof catalog==='undefined'||typeof $!=='function'||typeof runGame!=='function'||typeof loadGame!=='function')return false;
    catalog.local={name:'Daily Routine Recall',category:'DAILY ROUTINE RECALL',intro:'Remember the order of a familiar daily routine, then tap the steps in the same order.'};
    const oldRun=runGame;if(window.__routineRunBase===oldRun)return true;window.__routineRunBase=oldRun;
    window.runGame=function(key){if(key==='local')return window.gameDailyRoutineRecall();return oldRun(key)};
    window.gameDailyRoutineRecall=function(){const c=state.current;if(!c||c.answered)return;c.routineRound=0;c.routineCorrect=0;c.routineTotal=0;c.routineConsecutiveMistakes=0;c.routineMaxRound=5;c.routineCompleted=false;c.routineHistory=[];runRound()};
    function runRound(){
      const c=state.current;if(!c||c.answered)return;c.routineRound++;if(c.routineRound>c.routineMaxRound){complete();return}
      const base=routines[(c.routineRound-1)%routines.length],cfg=settings(getLevel(),base.steps.length),ordered=base.steps.slice(0,cfg.length);
      c.routineExpected=ordered;c.routineLevel=cfg.level;c.routineViewing=cfg.view;c.routineLocked=true;
      const extra=cfg.distractors?shuffle(routines[(c.routineRound+1)%routines.length].steps.filter(x=>!ordered.some(y=>y[1]===x[1]))).slice(0,cfg.distractors):[];
      const allCards=shuffle([...ordered,...extra]);
      $('#gameArea').innerHTML=`<div class="routine-stage routine-transition"><div class="routine-meta"><span class="routine-chip">Round <strong>${c.routineRound} / ${c.routineMaxRound}</strong></span><span class="routine-chip">Level <strong>${cfg.level}</strong></span><span class="routine-chip">Correct <strong>${c.routineCorrect}</strong></span><span class="routine-chip">Mistakes <strong>${c.routineConsecutiveMistakes} / 3</strong></span></div><div class="routine-instruction">Remember this order: <strong>${base.name}</strong></div><div class="routine-memory-list">${ordered.map((x,i)=>`<div class="routine-memory-card" style="--delay:${i*70}ms"><span>${x[0]}</span><strong>${x[1]}</strong><small>${i+1}</small></div>`).join('')}</div><div class="routine-countdown" id="routineCountdown">Look carefully…</div></div>`;
      $('#gamePrompt').textContent=`Remember the ${base.name.toLowerCase()} in order.`;say(cfg.level>=4?'This one is a little more challenging. Watch the order carefully.':'Take your time and remember the order of these familiar steps.','thinking','watching');
      setTimeout(()=>{if(c.answered)return;showRecall(ordered,allCards,cfg)},cfg.view*1000);
    }
    function showRecall(ordered,allCards,cfg){
      const c=state.current;if(!c||c.answered)return;c.routineLocked=false;c.routinePosition=0;c.routineSelected=[];$('#gamePrompt').textContent='Now tap the steps in the same order.';
      $('#gameArea').innerHTML=`<div class="routine-stage routine-recall"><div class="routine-meta"><span class="routine-chip">Round <strong>${c.routineRound} / ${c.routineMaxRound}</strong></span><span class="routine-chip">Step <strong id="routineStep">1 of ${ordered.length}</strong></span><span class="routine-chip">Level <strong>${cfg.level}</strong></span></div><div class="routine-instruction">Tap <strong>step 1</strong>, then step 2, and so on.</div><div class="routine-answer-grid">${allCards.map((x,i)=>`<button class="routine-answer" type="button" data-index="${i}" aria-label="${x[1]}"><span>${x[0]}</span><strong>${x[1]}</strong></button>`).join('')}</div><div class="routine-feedback" id="routineFeedback"></div></div>`;
      $$('.routine-answer').forEach(btn=>btn.addEventListener('click',()=>answer(Number(btn.dataset.index),allCards,ordered)));say('Your turn. Tap the first step you remember.','happy','your turn');
    }
    function answer(index,allCards,ordered){
      const c=state.current;if(!c||c.answered||c.routineLocked)return;const expected=ordered[c.routinePosition],chosen=allCards[index],buttons=$$('.routine-answer');if(!chosen)return;
      if(chosen[1]===expected[1]){c.routineSelected.push(chosen[1]);buttons[index].classList.add('correct');buttons[index].disabled=true;c.routinePosition++;const step=$('#routineStep');if(step)step.textContent=c.routinePosition>=ordered.length?'Complete!':`${c.routinePosition+1} of ${ordered.length}`;
        if(c.routinePosition>=ordered.length){c.routineCorrect++;c.routineTotal++;c.routineConsecutiveMistakes=0;const fb=$('#routineFeedback');if(fb){fb.textContent='Excellent! You remembered the whole routine.';fb.className='routine-feedback correct'}setMood('celebrate','happy');setStatus('Correct routine! Next round.');if(window.CognitiveCareCompanion)window.CognitiveCareCompanion.onGameEvent({type:'correct'});c.routineHistory.push({round:c.routineRound,correct:1,total:1,level:c.routineLevel,viewingSeconds:c.routineViewing,length:ordered.length});setTimeout(runRound,900)}
      }else{c.routineTotal++;c.routineConsecutiveMistakes++;buttons[index].classList.add('incorrect');buttons[index].disabled=true;const fb=$('#routineFeedback');if(fb){fb.textContent=c.routineConsecutiveMistakes>=3?'That was a tricky one. We will move to the next game.':'Not quite. We will continue with the next routine.';fb.className='routine-feedback incorrect'}setMood('encourage','encouraging');setStatus(c.routineConsecutiveMistakes>=3?'Three misses in a row — moving on.':'Not quite. Next routine.');if(window.CognitiveCareCompanion)window.CognitiveCareCompanion.onGameEvent({type:'incorrect'});c.routineHistory.push({round:c.routineRound,correct:0,total:1,level:c.routineLevel,viewingSeconds:c.routineViewing,length:ordered.length});c.routineLocked=true;setTimeout(()=>{if(c.routineConsecutiveMistakes>=3)complete();else runRound()},900)}
    }
    function complete(){const c=state.current;if(!c||c.routineCompleted)return;c.routineCompleted=true;c.answered=true;const total=Math.max(1,c.routineTotal||1),score=Math.round((c.routineCorrect/total)*100);c.correct=score>=50?1:0;c.score=score;c.seconds=(performance.now()-c.started)/1000;state.results.push({...c,name:catalog.local.name,skipped:false,rounds:c.routineHistory?.length||0,correctRoutines:c.routineCorrect,totalRoutines:total,difficulty:c.routineLevel||getLevel(),routineHistory:c.routineHistory||[]});setStatus('Daily routine recall complete. Moving to the next game.');setMood(score>=50?'celebrate':'encourage',score>=50?'happy':'encouraging');setTimeout(()=>{if(state.index<state.games.length-1){state.index++;loadGame()}else finishSession()},850)}
    return true;
  }
  if(!install()){const timer=setInterval(()=>{if(install())clearInterval(timer)},50);setTimeout(()=>clearInterval(timer),15000)}
})();
