/* Cognitive Care NER — Phase 8: restored full five-game training engine + care extensions */
(() => {
  'use strict';
  if (window.CCNER_PHASE8) return;

  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const shuffle = a => [...a].sort(() => Math.random() - .5);
  const read = (k, fallback) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? fallback; } catch (_) { return fallback; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (_) { return false; } };
  const esc = v => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));

  const HISTORY = 'ccner-history';
  const ADAPT = 'ccner-p8-adaptive';
  const MODE = 'ccner-p8-care-mode';
  const HEALTH = 'ccner-p8-health';

  const objects = {
    familiar: [
      ['☕','Cup'],['🍌','Banana'],['🥄','Spoon'],['📖','Book'],['💊','Medicine'],['💧','Water'],['🧴','Bottle'],['🍚','Rice'],['🧢','Cap'],['🌂','Umbrella']
    ],
    local: [
      ['🍵','Tea'],['🎋','Bamboo'],['🧺','Bamboo basket'],['🍚','Rice'],['🥥','Coconut'],['🧣','Shawl'],['🪔','Earthen lamp'],['🍃','Betel leaf'],['🪵','Wooden bowl'],['🫖','Tea pot']
    ],
    routine: [
      ['🌅','Wake up'],['🪥','Brush teeth'],['🍽️','Breakfast'],['💊','Medicine'],['💧','Drink water'],['🚶','Walk'],['📞','Call family']
    ]
  };

  const patterns = [
    {seq:['🍎','🥭','🍎','🥭'],answer:'🍎',choices:['🍎','🥭','🥥']},
    {seq:['☕','💧','☕','💧'],answer:'☕',choices:['☕','🍚','💊']},
    {seq:['🍚','🥥','🍚','🥥'],answer:'🍚',choices:['🍚','🍵','🧺']},
    {seq:['🍵','🎋','🍵','🎋'],answer:'🍵',choices:['🍵','🪔','🍃']},
    {seq:['🍎','🥭','🥥','🍎','🥭'],answer:'🥥',choices:['🥥','🍎','🍚']}
  ];

  const state = {
    active:false, gameIndex:0, gameOrder:[], current:null, round:0, roundResults:[], sessionResults:[], startedAt:0, roundStarted:0,
    adaptive: Object.assign({memory:1,attention:1,routine:1,pattern:1,local:1}, read(ADAPT, {})), mode: read(MODE, {type:'home',participant:''})
  };

  const GAME_META = {
    memory:{name:'Familiar Object Memory',area:'MEMORY',icon:'🧠',what:'Short-term visual memory',how:'Look at familiar objects, remember them, then choose the object you saw.',voice:'Look carefully. Remember the little objects. There is no rush.'},
    find:{name:'Find the Object',area:'ATTENTION & CONCENTRATION',icon:'🔍',what:'Visual attention and concentration',how:'Listen for the target, scan the choices, and tap the matching object.',voice:'Use your detective eyes. Find the object I ask for.'},
    sequence:{name:'Sequence Recall',area:'DAILY ROUTINE RECALL',icon:'🔢',what:'Routine memory and ordering',how:'Watch the daily routine, then tap the steps in the same correct order.',voice:'Watch the routine. Then help me put the steps back in order.'},
    pattern:{name:'Pattern Completion',area:'PATTERN RECOGNITION',icon:'🧩',what:'Pattern and object recognition',how:'Look for the repeating rule and choose what comes next.',voice:'Look for the rhythm. What little piece comes next?'},
    local:{name:'Local Object Memory',area:'NER FAMILIARITY + MEMORY',icon:'🌏',what:'Memory using familiar NER-style objects',how:'Remember familiar foods, household items and local-life objects, then recall one.',voice:'These are familiar everyday things. Take a good look and remember them.'}
  };

  function levelFor(key){ const area={memory:'memory',find:'attention',sequence:'routine',pattern:'pattern',local:'local'}[key]; return Math.max(1,Math.min(3,Number(state.adaptive[area]||1))); }
  function levelLabel(l){ return ['','Easy','Medium','Hard'][l] || 'Easy'; }
  function setAdaptive(key, accuracy){
    const area={memory:'memory',find:'attention',sequence:'routine',pattern:'pattern',local:'local'}[key];
    let l=levelFor(key);
    if(accuracy >= .8) l=Math.min(3,l+1); else if(accuracy <= .45) l=Math.max(1,l-1);
    state.adaptive[area]=l; write(ADAPT,state.adaptive);
  }
  function setText(id,text){const e=$(id);if(e)e.textContent=text;}
  function speak(text){
    if(!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u=new SpeechSynthesisUtterance(text); u.rate=.9; u.pitch=1.08; u.volume=1;
      const lang=localStorage.getItem('ccner-p1-language')||'en-IN'; u.lang=lang;
      const voices=window.speechSynthesis.getVoices(); const v=voices.find(x=>x.lang===lang)||voices.find(x=>x.lang.startsWith(lang.slice(0,2))); if(v)u.voice=v;
      window.speechSynthesis.speak(u);
    } catch (_) {}
  }
  function showGameView(){ $$('.view').forEach(v=>v.hidden=true); const v=$('#gameView'); if(v)v.hidden=false; $$('.bottom-nav button').forEach(b=>b.classList.toggle('active',false)); }
  function showResultsView(){ $$('.view').forEach(v=>v.hidden=true); const v=$('#resultsView'); if(v)v.hidden=false; }
  function gameContainer(){ return $('#gameArea'); }

  function ensureGameShell(){
    const card=$('.game-card'); if(!card) return;
    if(!document.querySelector('.p8-training-banner')) card.insertAdjacentHTML('beforebegin','<div class="p8-training-banner">🎓 Guided training mode · Momo explains every game before you play</div>');
  }

  function startSession(){
    if(state.active) return;
    state.active=true; state.gameIndex=0; state.round=0; state.sessionResults=[]; state.startedAt=performance.now();
    const weakness=Object.entries(state.adaptive).sort((a,b)=>a[1]-b[1])[0]?.[0];
    const keys=['memory','find','sequence','pattern','local'];
    state.gameOrder=shuffle(keys);
    if(weakness){const wk={memory:'memory',attention:'find',routine:'sequence',pattern:'pattern',local:'local'}[weakness]; state.gameOrder=state.gameOrder.filter(x=>x!==wk); state.gameOrder.unshift(wk);}
    setText('#todayStatus','In progress'); showGameView(); ensureGameShell(); loadGame();
  }

  function loadGame(){
    const key=state.gameOrder[state.gameIndex]; const meta=GAME_META[key]; const level=levelFor(key);
    state.current={key,level,rounds:3,correct:0,attempts:0,totalTime:0}; state.round=0; state.roundResults=[];
    setText('#gameCategory',meta.area); setText('#gameTitle',meta.name); setText('#gameCounter',`${state.gameIndex+1} of 5`);
    const bar=$('#progressBar'); if(bar)bar.style.width=`${state.gameIndex/5*100}%`;
    setText('#gamePrompt',meta.how); setText('#gameMomoText',`Training level: ${levelLabel(level)} · ${meta.what}`); setText('#gameFeedback','');
    renderTrainingCard(meta,level);
    speak(meta.voice);
    setTimeout(()=>{ if(state.active) beginRound(); },1200);
  }

  function renderTrainingCard(meta,level){
    const area=gameContainer(); if(!area)return;
    area.innerHTML=`<section class="p8-training"><h3>${meta.icon} ${esc(meta.name)}</h3><p><strong>What it trains:</strong> ${esc(meta.what)}</p><div class="p8-meta"><span class="p8-pill">🎚️ ${levelLabel(level)}</span><span class="p8-pill">🔁 3 short rounds</span><span class="p8-pill">🧓 Training only · not diagnosis</span></div><div class="p8-how"><div class="p8-step"><strong>1 · Look</strong><span>Follow Momo's voice and look at the screen.</span></div><div class="p8-step"><strong>2 · Think</strong><span>Take your time. You can pause between rounds.</span></div><div class="p8-step"><strong>3 · Tap</strong><span>Choose the answer with the large buttons.</span></div></div><div class="p8-game-actions"><button class="p8-primary" id="p8BeginNow" type="button">▶ Start this game</button></div></section>`;
    $('#p8BeginNow')?.addEventListener('click',()=>beginRound(true));
  }

  function beginRound(force=false){
    if(!state.active || !state.current || state.current._roundLive) return;
    state.current._roundLive=true; state.round++; state.current.attempts++;
    const key=state.current.key;
    setText('#gameFeedback',`Round ${state.round} of 3`);
    if(key==='memory') roundMemory();
    else if(key==='find') roundFind();
    else if(key==='sequence') roundSequence();
    else if(key==='pattern') roundPattern();
    else roundLocal();
  }

  function roundDone(correct,elapsed){
    if(!state.active||!state.current||!state.current._roundLive)return;
    state.current._roundLive=false; state.current.correct += correct?1:0; state.current.totalTime += elapsed;
    state.roundResults.push({correct:!!correct,seconds:elapsed});
    const fb=$('#gameFeedback'); if(fb){fb.textContent=correct?'✓ Correct — lovely work!':'Let’s keep going. The next one is a fresh chance.';fb.className=`p8-feedback ${correct?'good':'try'}`;}
    if(window.CognitiveCareCompanion)try{window.CognitiveCareCompanion.onGameEvent({type:correct?'correct':'incorrect'});}catch(_){ }
    if(state.round<3){ setTimeout(beginRound,900); return; }
    const accuracy=state.current.correct/3; const avg=state.current.totalTime/3; const score=Math.round(accuracy*100);
    setAdaptive(state.current.key,accuracy);
    const result={key:state.current.key,name:GAME_META[state.current.key].name,area:GAME_META[state.current.key].area,level:state.current.level,score,accuracy,correct:state.current.correct,attempts:3,avgResponse:avg,completed:true};
    state.sessionResults.push(result);
    setTimeout(()=>{ if(state.gameIndex<4){state.gameIndex++;loadGame();} else finishSession(); },1100);
  }

  function makeChoiceButtons(items,onPick){
    const area=gameContainer(); area.innerHTML=`<div class="p8-question">Choose the best answer</div><div class="p8-choice-grid">${items.map((x,i)=>`<button class="p8-choice" type="button" data-i="${i}"><span class="emoji">${x[0]}</span>${esc(x[1])}</button>`).join('')}</div>`;
    $$('.p8-choice').forEach(b=>b.addEventListener('click',()=>{ if(!state.current?._roundLive)return; const idx=Number(b.dataset.i); $$('.p8-choice').forEach(x=>x.disabled=true); onPick(items[idx],b); }));
  }

  function roundMemory(){
    const l=state.current.level, n=l===1?3:l===2?5:6, view=l===1?10:l===2?8:6;
    const items=shuffle(objects.familiar).slice(0,n); const target=pick(items); const distractors=shuffle(objects.familiar.filter(x=>!items.includes(x))).slice(0,3); const started=performance.now();
    const area=gameContainer(); area.innerHTML=`<div class="p8-question">Remember these ${n} objects · ${view} seconds</div><div class="p8-object-grid">${items.map(x=>`<div class="p8-object"><span class="emoji">${x[0]}</span><span class="label">${esc(x[1])}</span></div>`).join('')}</div>`; speak(`Remember these ${n} objects. You have ${view} seconds.`);
    setTimeout(()=>{ if(!state.current?._roundLive)return; makeChoiceButtons(shuffle([target,...distractors]),(choice)=>roundDone(choice[1]===target[1],(performance.now()-started)/1000)); speak('Which object did you see?'); },view*1000);
  }

  function roundFind(){
    const l=state.current.level, count=l===1?4:l===2?6:8; const items=shuffle(objects.familiar).slice(0,count); const target=pick(items); const started=performance.now();
    const area=gameContainer(); area.innerHTML=`<div class="p8-question">Find the <strong>${esc(target[1])}</strong></div><div class="p8-choice-grid">${items.map((x,i)=>`<button class="p8-choice" type="button" data-i="${i}"><span class="emoji">${x[0]}</span>${esc(x[1])}</button>`).join('')}</div>`; speak(`Find the ${target[1]}. Take your time.`);
    $$('.p8-choice').forEach((b,i)=>b.addEventListener('click',()=>{if(!state.current?._roundLive)return;$$('.p8-choice').forEach(x=>x.disabled=true);roundDone(items[i][1]===target[1],(performance.now()-started)/1000);}));
  }

  function roundSequence(){
    const l=state.current.level, n=l===1?4:l===2?5:6; const seq=shuffle(objects.routine).slice(0,n); const started=performance.now();
    const area=gameContainer(); area.innerHTML=`<div class="p8-question">Watch this daily routine in order</div><div class="p8-seq-grid">${seq.map(x=>`<div class="p8-seq-card"><span class="emoji">${x[0]}</span><strong>${esc(x[1])}</strong></div>`).join('')}</div>`; speak('Watch the routine carefully. I will scramble it next.');
    setTimeout(()=>{
      if(!state.current?._roundLive)return;
      const scrambled=shuffle(seq); let chosen=[]; const started2=performance.now();
      area.innerHTML=`<div class="p8-question">Tap the steps in the correct order</div><div class="p8-order-row" id="p8Order"><span class="p8-muted">Your order will appear here…</span></div><div class="p8-seq-grid">${scrambled.map((x,i)=>`<button class="p8-order" type="button" data-i="${i}">${x[0]} ${esc(x[1])}</button>`).join('')}</div>`;
      const row=$('#p8Order'); $$('.p8-order').forEach(b=>b.addEventListener('click',()=>{if(!state.current?._roundLive)return;const item=scrambled[Number(b.dataset.i)];chosen.push(item);b.disabled=true;row.innerHTML=chosen.map((x,i)=>`<span class="p8-pill">${i+1}. ${esc(x[1])}</span>`).join(''); if(chosen.length===seq.length){const ok=chosen.every((x,i)=>x[1]===seq[i][1]);roundDone(ok,(performance.now()-started2)/1000);}}));
      speak('Now tap each step in the same order as before.');
    },Math.max(3000,5000-l*500));
  }

  function roundPattern(){
    const l=state.current.level; let p=pick(patterns); if(l===3)p={seq:['🍎','🥭','🥥','🍎','🥭'],answer:'🥥',choices:['🥥','🍎','🍵']}; const started=performance.now();
    const area=gameContainer(); area.innerHTML=`<div class="p8-question">What comes next?</div><div class="p8-pattern">${p.seq.map(x=>`<span>${x}</span>`).join('')}<span class="missing">?</span></div><div class="p8-choice-grid">${shuffle(p.choices.map((x,i)=>[x,x])).map((x,i)=>`<button class="p8-choice" type="button" data-i="${i}"><span class="emoji">${x[0]}</span>${x[0]}</button>`).join('')}</div>`; speak('Look for the pattern. What comes next?');
    const choices=[...$$('.p8-choice')]; const vals=shuffle(p.choices); choices.forEach((b,i)=>b.addEventListener('click',()=>{if(!state.current?._roundLive)return;choices.forEach(x=>x.disabled=true);roundDone(vals[i]===p.answer,(performance.now()-started)/1000);}));
  }

  function roundLocal(){
    const l=state.current.level, n=l===1?3:l===2?5:6, view=l===1?10:l===2?8:6; const items=shuffle(objects.local).slice(0,n); const target=pick(items); const distractors=shuffle(objects.local.filter(x=>!items.includes(x))).slice(0,3); const started=performance.now();
    const area=gameContainer(); area.innerHTML=`<div class="p8-question">Remember these familiar local-life objects · ${view} seconds</div><div class="p8-object-grid">${items.map(x=>`<div class="p8-object"><span class="emoji">${x[0]}</span><span class="label">${esc(x[1])}</span></div>`).join('')}</div>`; speak('Remember these familiar everyday objects.');
    setTimeout(()=>{if(!state.current?._roundLive)return;makeChoiceButtons(shuffle([target,...distractors]),choice=>roundDone(choice[1]===target[1],(performance.now()-started)/1000));speak(`Which ${target[1]} did you see?`);},view*1000);
  }

  function finishSession(){
    state.active=false;
    const totalCorrect=state.sessionResults.reduce((a,r)=>a+r.correct,0); const totalAttempts=state.sessionResults.reduce((a,r)=>a+r.attempts,0); const avg=state.sessionResults.reduce((a,r)=>a+r.avgResponse,0)/Math.max(1,state.sessionResults.length);
    const session={date:new Date().toISOString(),score:Math.round(totalCorrect/Math.max(1,totalAttempts)*100),accuracy:totalCorrect/Math.max(1,totalAttempts),avgTime:avg,level:Math.round(state.sessionResults.reduce((a,r)=>a+r.level,0)/5),results:state.sessionResults,mode:state.mode};
    const history=read(HISTORY,[]); history.push(session); write(HISTORY,history.slice(-30));
    const trend=performanceTrend(history);
    renderFinalResults(session,trend); setText('#todayStatus','Complete');
    speak(session.score>=80?'Wonderful work! You completed all five games. Momo is very proud of you.':'You completed all five games. Every small practice session counts.');
  }

  function performanceTrend(history){
    const last=history.slice(-3).map(x=>Number(x.score||0)); if(last.length<3)return {label:'Building baseline',alert:false,text:'More sessions will help show a clearer training trend.'};
    const first=(last[0]+last[1])/2, latest=last[2]; if(latest<first-15)return {label:'Performance change to review',alert:true,text:'Recent training performance is lower than the previous two-session average. This is a training observation, not a diagnosis.'}; if(latest>first+10)return {label:'Training improvement',alert:false,text:'Recent training performance is higher than the previous two-session average.'}; return {label:'Training pattern steady',alert:false,text:'Recent training performance is broadly steady.'};
  }

  function renderFinalResults(s,trend){
    showResultsView(); setText('#overallScore',`${s.score}%`); setText('#overallAccuracy',`${Math.round(s.accuracy*100)}%`); setText('#gamesCompleted','5 / 5'); setText('#avgTime',`${s.avgTime.toFixed(1)}s`); setText('#trendBadge',trend.label);
    const rows=$('#resultRows'); if(rows)rows.innerHTML=`<div class="p8-result-list">${s.results.map(r=>`<div class="p8-result"><div><strong>${esc(r.name)}</strong><div class="p8-muted">${esc(r.area)} · ${levelLabel(r.level)} · ${r.correct}/${r.attempts} correct · ${r.avgResponse.toFixed(1)}s avg</div></div><strong>${r.score}%</strong></div>`).join('')}</div>${trend.alert?`<div class="p8-alert">⚠️ ${esc(trend.text)}</div>`:`<p class="p8-muted">${esc(trend.text)}</p>`}`;
  }

  function addCareStrip(){
    const home=$('#homeView'); if(!home||document.querySelector('.p8-care-strip'))return;
    const strip=document.createElement('section'); strip.className='p8-care-strip'; strip.innerHTML=`<h3>🤝 Care & engagement modes</h3><p class="p8-muted">Designed for the real-world NER setting: shared hospital/community devices, caregiver guidance, familiar stories and optional health context.</p><div class="p8-care-grid"><button class="p8-care-btn" data-p8-care="clinic">🏥 Clinic / Hospital mode<br><span class="p8-muted">Guided shared-tablet sessions</span></button><button class="p8-care-btn" data-p8-care="community">👥 Community play<br><span class="p8-muted">Group-friendly, anonymous practice</span></button><button class="p8-care-btn" data-p8-care="story">📖 Storytelling<br><span class="p8-muted">Record or play a familiar story</span></button><button class="p8-care-btn" data-p8-care="music">🎵 Music memory<br><span class="p8-muted">Use caregiver-provided regional audio</span></button><button class="p8-care-btn" data-p8-care="health">❤️ Health context<br><span class="p8-muted">Optional steps / pulse log</span></button></div>`;
    home.appendChild(strip); strip.addEventListener('click',e=>{const b=e.target.closest('[data-p8-care]');if(b)openCare(b.dataset.p8Care);});
  }

  function modal(){let m=$('#p8Modal');if(m)return m;m=document.createElement('div');m.id='p8Modal';m.className='p8-modal';m.hidden=true;m.innerHTML='<div class="p8-modal-card"><button class="p8-secondary" id="p8Close">Close</button><div id="p8ModalBody"></div></div>';document.body.appendChild(m);$('#p8Close').onclick=()=>m.hidden=true;m.addEventListener('click',e=>{if(e.target===m)m.hidden=true});return m;}
  function openCare(kind){const m=modal(),body=$('#p8ModalBody');m.hidden=false;
    if(kind==='clinic')body.innerHTML=`<h2>🏥 Clinic / Hospital mode</h2><p>Use one tablet with caregiver or health-worker guidance. The patient does not need to own a phone.</p><form class="p8-form" id="p8ClinicForm"><label>Participant code<input name="participant" value="${esc(state.mode.participant||'PATIENT-001')}" placeholder="PATIENT-001"></label><label>Session setting<select name="setting"><option>Hospital / clinic</option><option>Community health centre</option><option>Caregiver home visit</option></select></label><button class="p8-primary" type="submit">Save guided mode</button></form><p class="p8-muted">This supports the four-week supervised-program idea as a deployment workflow; it does not itself admit or hospitalize a patient.</p>`;
    else if(kind==='community')body.innerHTML=`<h2>👥 Community play</h2><p>For group sessions, use shared devices and show only participant codes. Keep personal scores private.</p><form class="p8-form" id="p8CommunityForm"><label>Number of participants<select name="count"><option>2</option><option>3</option><option>4</option><option>5</option><option>6</option></select></label><button class="p8-primary" type="submit">Start group-friendly session</button></form><p class="p8-muted">The current prototype keeps each participant's detailed training record local; a production multi-user deployment should use authenticated role-based access.</p>`;
    else if(kind==='story')body.innerHTML=`<h2>📖 Storytelling mode</h2><p>Record a short familiar story, memory, family event or local tale. The recording stays in this browser session.</p><button class="p8-primary" id="p8Record">● Start recording</button><button class="p8-secondary" id="p8Stop" disabled>■ Stop</button><audio id="p8StoryAudio" class="p8-audio" controls></audio><p id="p8StoryStatus" class="p8-muted">Microphone permission is required.</p>`;
    else if(kind==='music')body.innerHTML=`<h2>🎵 Music memory mode</h2><p>Choose a regional or family-provided audio file on the device. Nothing is uploaded by this demo.</p><input id="p8MusicFile" type="file" accept="audio/*"><audio id="p8MusicAudio" class="p8-audio" controls></audio><p class="p8-muted">This can be used for a supervised music-memory activity without bundling copyrighted songs into the prototype.</p>`;
    else body.innerHTML=`<h2>❤️ Optional health context</h2><p>Manual entry is provided for prototype demonstrations. Do not treat these values as medical conclusions.</p><form class="p8-form" id="p8HealthForm"><label>Steps today<input name="steps" type="number" min="0" value="${Number(read(HEALTH,{}).steps||0)}"></label><label>Pulse / heart rate (optional)<input name="pulse" type="number" min="0" value="${Number(read(HEALTH,{}).pulse||0)}"></label><button class="p8-primary" type="submit">Save health context</button></form>`;
    bindCare(kind);
  }
  function bindCare(kind){
    $('#p8ClinicForm')?.addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.target);state.mode={type:String(f.get('setting')),participant:String(f.get('participant'))};write(MODE,state.mode);$('#p8Modal').hidden=true;});
    $('#p8CommunityForm')?.addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.target);state.mode={type:'community',participant:`GROUP-${f.get('count')}`};write(MODE,state.mode);$('#p8Modal').hidden=true;startSession();});
    if(kind==='story'){
      let recorder=null,chunks=[];const rec=$('#p8Record'),stop=$('#p8Stop'),audio=$('#p8StoryAudio'),status=$('#p8StoryStatus');
      rec?.addEventListener('click',async()=>{try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});chunks=[];recorder=new MediaRecorder(stream);recorder.ondataavailable=e=>chunks.push(e.data);recorder.onstop=()=>{const blob=new Blob(chunks,{type:'audio/webm'});audio.src=URL.createObjectURL(blob);stream.getTracks().forEach(t=>t.stop());status.textContent='Recording ready for playback in this session.';};recorder.start();rec.disabled=true;stop.disabled=false;status.textContent='Recording… tell a short familiar story.';}catch(_){status.textContent='Microphone access was not available on this device.';}});
      stop?.addEventListener('click',()=>{try{recorder?.stop();}catch(_){}rec.disabled=false;stop.disabled=true;});
    }
    $('#p8MusicFile')?.addEventListener('change',e=>{const file=e.target.files?.[0];if(file)$('#p8MusicAudio').src=URL.createObjectURL(file);});
    $('#p8HealthForm')?.addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.target);write(HEALTH,{steps:Number(f.get('steps')||0),pulse:Number(f.get('pulse')||0),updatedAt:new Date().toISOString()});$('#p8Modal').hidden=true;});
  }

  window.CCNER_PHASE8={startSession,performanceTrend:()=>performanceTrend(read(HISTORY,[])),getAdaptive:()=>({...state.adaptive})};
  window.CCNERGameRestored=window.CCNER_PHASE8;
  addCareStrip();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addCareStrip,{once:true});
})();