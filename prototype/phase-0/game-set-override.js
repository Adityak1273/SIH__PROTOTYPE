/* Cognitive Care NER — video-faithful five-game training engine.
 * Active games:
 * 1) Sequence Memory
 * 2) Stroop Test
 * 3) Around the House Sorting
 * 4) Pattern Recognition
 * 5) Spot the Difference
 *
 * Source-video styling: dark forest background, centered narrow game card,
 * mint/green progress accents, large readable controls, 3 adaptive rounds.
 * The source videos use more rounds/questions; this build intentionally
 * reduces each game to 3 rounds for a gentler elderly-first session.
 */
(() => {
  'use strict';
  if (window.CCNER_GAME_SET_V3) return;
  window.CCNER_GAME_SET_V3 = true;

  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
  const shuffle = input => {
    const a = [...input];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const lang = () => (localStorage.getItem('ccner-p1-language') || 'en-IN').slice(0,2);
  const speak = text => {
    try {
      if (!('speechSynthesis' in window)) return;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = .88;
      u.pitch = 1.04;
      u.lang = ({hi:'hi-IN',bn:'bn-IN',as:'as-IN'}[lang()] || 'en-IN');
      speechSynthesis.speak(u);
    } catch (_) {}
  };

  const COLORS = [
    {id:'red',label:'Red',hex:'#c94c58'},
    {id:'blue',label:'Blue',hex:'#4e74c4'},
    {id:'green',label:'Green',hex:'#45a86a'},
    {id:'yellow',label:'Yellow',hex:'#c6a43a'}
  ];

  const HOUSE = [
    {item:'Stapler',icon:'🖇️',group:'desk'},
    {item:'Envelopes',icon:'✉️',group:'desk'},
    {item:'Paperclips',icon:'📎',group:'desk'},
    {item:'Notebook',icon:'📓',group:'desk'},
    {item:'Can Opener',icon:'🥫',group:'kitchen'},
    {item:'Measuring Spoons',icon:'🥄',group:'kitchen'},
    {item:'Oven Mitt',icon:'🧤',group:'kitchen'},
    {item:'Tea Strainer',icon:'🫖',group:'kitchen'},
    {item:'Rocking Chair',icon:'🪑',group:'porch'},
    {item:'Welcome Mat',icon:'🧶',group:'porch'},
    {item:'Porch Swing',icon:'🛋️',group:'porch'},
    {item:'Fire Poker',icon:'🔥',group:'fireplace'},
    {item:'Firewood',icon:'🪵',group:'fireplace'},
    {item:'Bellows',icon:'🪶',group:'fireplace'},
    {item:'Toothbrush',icon:'🪥',group:'bathroom'},
    {item:'Bath Towel',icon:'🛁',group:'bathroom'},
    {item:'Shower Cap',icon:'🧢',group:'bathroom'},
    {item:'Pillow',icon:'🛏️',group:'bedroom'},
    {item:'Alarm Clock',icon:'⏰',group:'bedroom'},
    {item:'Dresser',icon:'🗄️',group:'bedroom'},
    {item:'Teacups',icon:'☕',group:'china'},
    {item:'Serving Platter',icon:'🍽️',group:'china'},
    {item:'Gravy Boat',icon:'🫕',group:'china'},
    {item:'Broom',icon:'🧹',group:'broom'},
    {item:'Dustpan',icon:'🗑️',group:'broom'},
    {item:'Mop',icon:'🪣',group:'broom'}
  ];

  const HOUSE_PAIRS = [
    ['Writing Desk','Kitchen Drawer','desk','kitchen'],
    ['Front Porch','Fireplace','porch','fireplace'],
    ['Bathroom','Bedroom','bathroom','bedroom'],
    ['China Cabinet','Broom Closet','china','broom']
  ];

  const PATTERNS = [
    {kind:'number', seq:[2,4,8,16], answer:32, options:[24,28,32,36], note:'Each number doubles the previous number.'},
    {kind:'number', seq:[3,6,9,12], answer:15, options:[14,15,16,18], note:'Add 3 each time.'},
    {kind:'number', seq:[1,3,5,7], answer:9, options:[8,9,10,11], note:'Add 2 each time.'},
    {kind:'number', seq:[5,10,20,40], answer:80, options:[60,70,80,90], note:'Each number doubles the previous number.'},
    {kind:'visual', seq:['🍎','🥭','🍎','🥭'], answer:'🍎', options:['🍎','🥭','🍌','🍊'], note:'The two-item pattern repeats.'},
    {kind:'visual', seq:['☕','💧','☕','💧'], answer:'☕', options:['☕','💧','🥄','📖'], note:'The two-item pattern repeats.'}
  ];

  const SPOT_SETS = [
    ['🕐','🕑','🕒','🕓','🕔','🕕','🕖','🕗'],
    ['🎸','🎹','🥁','🎺','🎻','🪗','🎷','🪕'],
    ['🍰','🧁','🍩','🍪','🎂','🍫','🍬','🍭'],
    ['🍎','🍌','🍇','🍊','🍉','🥭','🍐','🍓']
  ];

  const META = {
    sequence:{key:'sequence',title:'Sequence Memory',category:'MEMORY + ATTENTION',icon:'🔢',description:'Watch the colours light up, then repeat the sequence from memory.',training:'Short-term memory and attention',source:'Video structure: four large colour tiles, preview phase, then recall phase.',voice:'Watch the colours carefully. Then repeat the same order.'},
    stroop:{key:'stroop',title:'Stroop Test',category:'ATTENTION + CONCENTRATION',icon:'🎨',description:'Choose the ink colour, not the word you read.',training:'Selective attention and response control',source:'Elderly-first adaptation of the Stroop task: large word, high-contrast choices, short rounds.',voice:'Choose the colour of the ink, not the word.'},
    house:{key:'house',title:'Around the House Sorting',category:'DAILY-LIFE RECOGNITION',icon:'🏠',description:'Tap each familiar item, then choose the place where it belongs.',training:'Daily-life recognition and categorisation',source:'Video structure: two familiar locations, item rows, two category buttons, Check Answers.',voice:'Look at each familiar item and choose where it belongs.'},
    pattern:{key:'pattern',title:'Pattern Recognition',category:'PATTERN RECOGNITION',icon:'🧩',description:'Find the repeating rule and choose what comes next.',training:'Pattern and reasoning skills',source:'Video structure: sequence row, large answer choices, explanation after the answer.',voice:'Look for the pattern. What comes next?'},
    spot:{key:'spot',title:'Spot the Difference',category:'VISUAL ATTENTION',icon:'🔎',description:'Look carefully at the items, then spot what changed.',training:'Visual attention and detail recognition',source:'Video structure: memorize familiar items, then identify the changed item.',voice:'Look carefully, remember the items, then find what changed.'}
  };

  const state = {active:false,index:0,order:[],round:0,roundStarted:0,results:[],current:null,lastOrder:null,cancelled:false};

  const css = `
    body.ccner-video-mode{background:radial-gradient(circle at 50% -12%,rgba(72,160,113,.16),transparent 36%),radial-gradient(circle at 8% 72%,rgba(41,104,74,.12),transparent 34%),repeating-linear-gradient(0deg,rgba(255,255,255,.012) 0 1px,transparent 1px 5px),#07120d!important;color:#edf3ee!important}
    body.ccner-video-mode .topbar,body.ccner-video-mode footer,body.ccner-video-mode .home-strip,body.ccner-video-mode .info-grid,body.ccner-video-mode .section-label{display:none!important}
    body.ccner-video-mode .app-shell{width:min(900px,calc(100% - 28px));padding:14px 0 82px}
    body.ccner-video-mode .game-view-shell{max-width:760px;margin:0 auto}
    body.ccner-video-mode .game-top{max-width:650px;margin:18px auto 12px;align-items:end}
    body.ccner-video-mode .game-top h2{color:#f4f1df;font-family:Georgia,serif;letter-spacing:-.02em}
    body.ccner-video-mode .eyebrow{color:#63c991}
    body.ccner-video-mode .progress-box{color:#c6d3cb}
    body.ccner-video-mode .progress-track{background:#2b352e;height:8px}
    body.ccner-video-mode .progress-track i{background:#50c487}
    body.ccner-video-mode .game-card{max-width:650px;margin:0 auto;padding:20px 18px;background:#0d2017;border:1px solid #2c4a39;border-radius:16px;box-shadow:0 20px 55px rgba(0,0,0,.26);color:#eef4ef}
    body.ccner-video-mode .game-prompt{color:#e8f0ea;font-size:1rem}
    body.ccner-video-mode .game-feedback{color:#66cf95;min-height:24px}
    .ccv3-intro{max-width:650px;margin:0 auto;padding:14px 16px 18px;background:#0d2419;border:1px solid #244a36;border-radius:14px;color:#e9f1eb;text-align:center}
    .ccv3-intro h3{font-family:Georgia,serif;font-size:1.65rem;margin:4px 0 7px}.ccv3-intro p{margin:5px 0;color:#b9cbc0;line-height:1.45}
    .ccv3-badge{display:inline-flex;align-items:center;gap:6px;padding:6px 11px;border-radius:999px;background:#42b97d;color:#062011;font-weight:900;font-size:.74rem;margin-bottom:10px}
    .ccv3-start{border:0;border-radius:11px;background:#49bd82;color:#062011;font-weight:900;padding:14px 24px;min-height:54px;margin-top:12px}.ccv3-start:hover{filter:brightness(1.05)}
    .ccv3-round{display:flex;justify-content:center;gap:7px;margin:8px 0 14px}.ccv3-round i{width:8px;height:8px;border-radius:50%;background:#34433a}.ccv3-round i.on{background:#53c58a;box-shadow:0 0 0 3px rgba(83,197,138,.12)}
    .ccv3-colors{display:grid;grid-template-columns:repeat(2,110px);gap:14px;justify-content:center;margin:14px auto}
    .ccv3-color{width:110px;height:92px;border:2px solid rgba(255,255,255,.12);border-radius:18px;cursor:pointer;transition:transform .15s,filter .15s,box-shadow .15s;box-shadow:0 8px 18px rgba(0,0,0,.16)}
    .ccv3-color:active{transform:scale(.96)}.ccv3-color.flash{filter:brightness(1.5);box-shadow:0 0 0 5px rgba(255,255,255,.1),0 0 28px rgba(255,255,255,.2)}
    .ccv3-color.red{background:#a72f40}.ccv3-color.blue{background:#315a9f}.ccv3-color.green{background:#278d50}.ccv3-color.yellow{background:#9d8012}
    .ccv3-choice-grid{display:grid;grid-template-columns:repeat(2,minmax(130px,1fr));gap:11px;max-width:560px;margin:14px auto}.ccv3-choice{min-height:58px;border:1px solid #2d4a3a;border-radius:11px;background:#0b1811;color:#dce9e1;font-weight:850;font-size:1rem;cursor:pointer;padding:10px}.ccv3-choice:hover,.ccv3-choice.selected{border-color:#4fc58a;background:#123121}
    .ccv3-stroop-word{margin:18px auto 13px;width:min(420px,100%);font-size:clamp(3rem,8vw,5rem);font-weight:950;line-height:1.05;letter-spacing:.02em}
    .ccv3-house-list{display:grid;gap:9px;margin:14px auto}.ccv3-house-row{display:grid;grid-template-columns:minmax(130px,1fr) minmax(210px,1fr);gap:8px;align-items:center;padding:8px 10px;background:#09150f;border:1px solid #263e31;border-radius:11px}.ccv3-house-item{font-size:1rem;text-align:left;color:#eef4ef}.ccv3-house-item .ico{font-size:1.35rem;margin-right:7px}.ccv3-house-buttons{display:grid;grid-template-columns:1fr 1fr;gap:6px}.ccv3-house-btn{min-height:46px;border:0;border-radius:10px;background:#07110c;color:#bdcfc4;font-weight:850;padding:7px 5px;cursor:pointer}.ccv3-house-btn.selected{background:#4bc287;color:#062011}.ccv3-check{width:100%;min-height:54px;border:1px solid #337c58;border-radius:11px;background:#2c8659;color:#dff7e9;font-weight:900;margin-top:10px;cursor:pointer}.ccv3-check:disabled{opacity:.45;cursor:not-allowed}.ccv3-house-row.correct{border-color:#4bc287;background:#102b1f}.ccv3-house-row.wrong{border-color:#bd5d54;background:#2a1615}
    .ccv3-pattern-seq{display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;margin:18px 0}.ccv3-pattern-cell{min-width:52px;min-height:52px;display:grid;place-items:center;padding:7px 10px;border-radius:11px;background:#0b2116;color:#55c98b;font-weight:900;font-size:1.35rem;border:1px solid #1d4530}.ccv3-pattern-cell.q{border:1px dashed #55c98b;background:#0e2a1b}.ccv3-explain{margin:12px auto 0;padding:10px 12px;text-align:left;border-radius:10px;background:#0b1b13;border:1px solid #254534;color:#b8cbbf;font-size:.82rem;line-height:1.45}
    .ccv3-spot-memory{display:flex;justify-content:center;gap:12px;flex-wrap:wrap;padding:14px 5px;margin:8px 0}.ccv3-spot-memory span{font-size:2.65rem;width:58px;height:58px;display:grid;place-items:center;background:#0b1a12;border-radius:11px;border:1px solid #244333}.ccv3-spot-grid{display:grid;grid-template-columns:repeat(4,minmax(58px,1fr));gap:9px;max-width:520px;margin:14px auto}.ccv3-spot{min-height:76px;border:1px solid #2d493a;border-radius:12px;background:#0b1811;color:#fff;font-size:2rem;cursor:pointer}.ccv3-spot:hover{border-color:#4fc58a}
    .ccv3-exit{display:block;margin:12px auto 0;border:1px solid #496456;background:transparent;color:#b7c9be;border-radius:10px;padding:9px 15px;font-weight:800;cursor:pointer}
    body.ccner-video-mode .bottom-nav{background:rgba(7,18,13,.94);border-color:#294334;color:#b6c7bd}body.ccner-video-mode .bottom-nav button{color:#b6c7bd}
    @media(max-width:700px){body.ccner-video-mode .app-shell{width:min(100% - 16px,700px)}body.ccner-video-mode .game-card{padding:16px 10px}.ccv3-house-row{grid-template-columns:1fr}.ccv3-house-buttons{grid-template-columns:1fr 1fr}.ccv3-colors{grid-template-columns:repeat(2,92px)}.ccv3-color{width:92px;height:82px}.ccv3-spot-grid{grid-template-columns:repeat(2,minmax(72px,1fr));max-width:360px}}
  `;
  const style = document.createElement('style'); style.id='ccner-video-game-theme-v3'; style.textContent=css; document.head.appendChild(style);

  function patchHostUi(){
    document.body.classList.add('ccner-video-mode');
    const info=document.querySelector('.info-grid');
    if(info){const games=[...info.querySelectorAll('article')].find(a=>/Games/i.test(a.textContent||''));if(games)games.querySelector('strong').textContent='5 · guided + adaptive';}
    const footer=document.querySelector('footer');if(footer)footer.textContent='5 guided cognitive games · adaptive training · Momo companion · NER care extensions · training only';
  }
  function showGameView(){$$('.view').forEach(v=>v.hidden=true);const v=$('#gameView');if(v)v.hidden=false;const card=$('#gameView .game-card');if(card)card.classList.add('ccner-game-view-shell');}
  function updateHeader(meta){
    if($('#gameCategory'))$('#gameCategory').textContent=meta.category;if($('#gameTitle'))$('#gameTitle').textContent=meta.title;if($('#gameCounter'))$('#gameCounter').textContent=`${state.index+1} of 5`;if($('#gamePrompt'))$('#gamePrompt').textContent=meta.description;if($('#gameMomoText'))$('#gameMomoText').textContent='Momo will stay quiet while you play. Say “Momo” if you need help.';const p=$('#progressBar');if(p)p.style.width=`${(state.index/5)*100}%`;
  }
  function roundDots(){return `<div class="ccv3-round" aria-label="3 rounds">${[1,2,3].map(n=>`<i class="${n<=state.round?'on':''}"></i>`).join('')}</div>`;}
  function renderIntro(meta){
    const a=$('#gameArea');if(!a)return;a.innerHTML=`<section class="ccv3-intro"><div class="ccv3-badge">${meta.icon} Level 1/3 · ${esc(meta.training)}</div><h3>${esc(meta.title)}</h3><p>${esc(meta.description)}</p><p><strong>How it works:</strong> ${esc(meta.source)}</p>${roundDots()}<button class="ccv3-start" id="ccv3Start" type="button">▶ Start this game</button><button class="ccv3-exit" id="ccv3ExitIntro" type="button">Exit Game</button></section>`;
    $('#ccv3Start').onclick=startRound;$('#ccv3ExitIntro').onclick=safeExit;
  }
  function loadGame(){const key=state.order[state.index],meta=META[key];state.round=0;state.current={key,scores:[],correct:0,responseTimes:[],difficulty:1};updateHeader(meta);if($('#gameFeedback'))$('#gameFeedback').textContent='';renderIntro(meta);patchHostUi();speak(meta.voice);}
  function startRound(){if(!state.active||state.current?.live)return;state.current.live=true;state.round+=1;state.roundStarted=performance.now();const key=state.current.key;if($('#gameFeedback'))$('#gameFeedback').textContent=`Round ${state.round} of 3`;if(key==='sequence')return playSequence();if(key==='stroop')return playStroop();if(key==='house')return playHouse();if(key==='pattern')return playPattern();if(key==='spot')return playSpot();}
  function finishRound(ok,started=state.roundStarted,score=ok?100:0,extra={}){if(!state.current?.live)return;state.current.live=false;const seconds=clamp((performance.now()-started)/1000,.1,999);state.current.correct+=ok?1:0;state.current.scores.push(score);state.current.responseTimes.push(seconds);Object.assign(state.current,extra);if(state.round<3){if($('#gameFeedback'))$('#gameFeedback').textContent=ok?'✓ Correct — next round.':'Good try — next round.';setTimeout(startRound,750);return;}finishGame();}
  function finishGame(){const c=state.current,score=Math.round(c.scores.reduce((a,b)=>a+b,0)/3),accuracy=Math.round(c.correct/3*100),avg=c.responseTimes.reduce((a,b)=>a+b,0)/Math.max(1,c.responseTimes.length),difficulty=c.difficulty||1;state.results.push({key:c.key,name:META[c.key].title,score,accuracy,avgResponse:avg,difficulty,correct:c.correct,rounds:3});if(state.index<4){state.index+=1;setTimeout(loadGame,850);}else finishSession();}
  function finishSession(){
    state.active=false;document.body.classList.remove('ccner-video-mode');const correct=state.results.reduce((s,r)=>s+r.correct,0),avg=state.results.reduce((s,r)=>s+r.avgResponse,0)/Math.max(1,state.results.length);const session={date:new Date().toISOString(),score:Math.round(state.results.reduce((s,r)=>s+r.score,0)/5),accuracy:correct/15,avgTime:avg,level:1,games:5,order:state.order,results:state.results.map(r=>({...r}))};
    try{const h=JSON.parse(localStorage.getItem('ccner-history')||'[]');h.push(session);localStorage.setItem('ccner-history',JSON.stringify(h.slice(-30)));localStorage.setItem('ccner-game-order.v1',JSON.stringify(state.order));}catch(_){ }
    if(typeof window.renderResults==='function')window.renderResults(session);$$('.view').forEach(v=>v.hidden=true);const rv=$('#resultsView');if(rv)rv.hidden=false;if($('#overallScore'))$('#overallScore').textContent=`${session.score}%`;if($('#overallAccuracy'))$('#overallAccuracy').textContent=`${Math.round(session.accuracy*100)}%`;if($('#gamesCompleted'))$('#gamesCompleted').textContent='5 / 5';if($('#avgTime'))$('#avgTime').textContent=`${avg.toFixed(1)}s`;
    if($('#resultRows'))$('#resultRows').innerHTML=state.results.map(r=>`<div class="result-row"><div><div class="result-name">${esc(r.name)}</div><div class="result-detail">${r.accuracy}% accuracy · ${r.avgResponse.toFixed(1)}s · Level ${r.difficulty}</div></div><span class="score-pill">${r.score}%</span></div>`).join('');
    const msg=correct>=12?'Wonderful work. You completed all five games with steady accuracy.':'You completed all five games. Keep a comfortable pace and practise again when you feel ready.';if($('#resultMessage'))$('#resultMessage').textContent=msg;speak(correct>=12?'Wonderful work. You finished all five games.':'You finished all five games. Nice steady practice.');
  }
  function getPreviousOrder(){try{const raw=JSON.parse(localStorage.getItem('ccner-game-order.v1')||'null');return Array.isArray(raw)&&raw.length===5?raw:null;}catch(_){return null;}}
  function newOrder(){const keys=['sequence','stroop','house','pattern','spot'],previous=getPreviousOrder();let order=shuffle(keys),guard=0;while(previous&&order.join('|')===previous.join('|')&&guard<12){order=shuffle(keys);guard+=1;}return order;}
  function startSession(){if(state.active)return;state.active=true;state.cancelled=false;state.index=0;state.results=[];state.order=newOrder();state.lastOrder=[...state.order];patchHostUi();showGameView();if($('#todayStatus'))$('#todayStatus').textContent='In progress';loadGame();}
  function safeExit(){if(!state.active)return;const confirmed=window.confirm('Leave this game session? Completed games already saved will remain available.');if(!confirmed)return;state.active=false;state.cancelled=true;if(state.current)state.current.live=false;document.body.classList.remove('ccner-video-mode');$$('.view').forEach(v=>v.hidden=true);const h=$('#homeView');if(h)h.hidden=false;if($('#todayStatus'))$('#todayStatus').textContent='Not started';}

  function playSequence(){const level=state.round,length=3+level,seq=[];while(seq.length<length){const c=pick(COLORS).id;if(seq.length===0||c!==seq[seq.length-1])seq.push(c);}state.current.difficulty=level;const a=$('#gameArea');if(!a)return;a.innerHTML=`<div class="ccv3-intro"><div class="ccv3-badge">Round ${level} of 3 · Easy-to-steady</div><h3>Watch the colours</h3><p>Remember the order. The colours will light up one by one.</p><div class="ccv3-colors" id="ccv3SeqTiles">${COLORS.map(c=>`<button class="ccv3-color ${c.id}" data-c="${c.id}" type="button" aria-label="${c.label}"></button>`).join('')}</div>${roundDots()}<button class="ccv3-exit" id="ccv3ExitSeq" type="button">Exit Game</button></div>`;$('#ccv3ExitSeq').onclick=safeExit;const tiles=$$('#ccv3SeqTiles .ccv3-color');let i=0;const flash=()=>{if(!state.current?.live||!state.active||state.current.key!=='sequence')return;if(i>=seq.length)return collectSequence(seq);const t=tiles.find(x=>x.dataset.c===seq[i]);if(t)t.classList.add('flash');setTimeout(()=>{if(t)t.classList.remove('flash');i+=1;setTimeout(flash,300);},750);};setTimeout(flash,500);speak('Watch the colours. Then repeat them in the same order.');}
  function collectSequence(seq){const a=$('#gameArea');let chosen=[];a.innerHTML=`<div class="ccv3-intro"><div class="ccv3-badge">Your turn · ${seq.length} colours</div><h3>Repeat the sequence</h3><p>Tap the colours in the same order.</p><div class="ccv3-colors" id="ccv3SeqChoices">${COLORS.map(c=>`<button class="ccv3-color ${c.id}" data-c="${c.id}" type="button" aria-label="${c.label}"></button>`).join('')}</div><p id="ccv3SeqProgress">0 of ${seq.length}</p><button class="ccv3-exit" id="ccv3ExitSeq2" type="button">Exit Game</button></div>`;$('#ccv3ExitSeq2').onclick=safeExit;$$('#ccv3SeqChoices .ccv3-color').forEach(b=>b.onclick=()=>{chosen.push(b.dataset.c);if($('#ccv3SeqProgress'))$('#ccv3SeqProgress').textContent=`${chosen.length} of ${seq.length}`;if(chosen.length===seq.length){const ok=chosen.every((v,idx)=>v===seq[idx]);finishRound(ok,state.roundStarted,ok?100:45);}});}
  function playStroop(){const level=state.round,pool=COLORS.slice(0,level===1?2:level===2?3:4),word=pick(pool);let ink=pick(pool);if(pool.length>1)while(ink.id===word.id)ink=pick(pool);state.current.difficulty=level;const a=$('#gameArea');a.innerHTML=`<div class="ccv3-intro"><div class="ccv3-badge">Round ${level} of 3 · Attention</div><h3>Choose the ink colour</h3><p>Ignore the word. Look at the colour of the letters.</p><div class="ccv3-stroop-word" style="color:${ink.hex}">${esc(word.label.toUpperCase())}</div><div class="ccv3-choice-grid">${shuffle(pool).map(c=>`<button class="ccv3-choice" data-c="${c.id}" type="button">${c.label}</button>`).join('')}</div><button class="ccv3-exit" id="ccv3ExitStroop" type="button">Exit Game</button></div>`;$('#ccv3ExitStroop').onclick=safeExit;$$('.ccv3-choice').forEach(b=>b.onclick=()=>finishRound(b.dataset.c===ink.id,state.roundStarted,b.dataset.c===ink.id?100:35));speak(`Choose the ${ink.label} colour. Ignore the word.`);}
  function playHouse(){const level=state.round,pair=HOUSE_PAIRS[(level-1)%HOUSE_PAIRS.length],count=level===1?4:level===2?5:6,pool=shuffle(HOUSE.filter(x=>x.group===pair[2]||x.group===pair[3])),items=pool.slice(0,count),answers=new Map();state.current.difficulty=level;const a=$('#gameArea');a.innerHTML=`<div class="ccv3-intro"><div class="ccv3-badge">Round ${level} of 3 · Daily-life recognition</div><h3>${esc(pair[0])} or ${esc(pair[1])}?</h3><p>Tap each item, then tap the place where it belongs.</p><div class="ccv3-house-list">${items.map((x,i)=>`<div class="ccv3-house-row" data-i="${i}" data-group="${x.group}"><div class="ccv3-house-item"><span class="ico">${x.icon}</span>${esc(x.item)}</div><div class="ccv3-house-buttons"><button class="ccv3-house-btn" data-i="${i}" data-g="${pair[2]}" type="button">${esc(pair[0])}</button><button class="ccv3-house-btn" data-i="${i}" data-g="${pair[3]}" type="button">${esc(pair[1])}</button></div></div>`).join('')}</div><button class="ccv3-check" id="ccv3HouseCheck" type="button" disabled>Check Answers</button><button class="ccv3-exit" id="ccv3ExitHouse" type="button">Exit Game</button></div>`;$('#ccv3ExitHouse').onclick=safeExit;$$('.ccv3-house-btn').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.i);answers.set(i,b.dataset.g);const row=b.closest('.ccv3-house-row');row.querySelectorAll('.ccv3-house-btn').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');const check=$('#ccv3HouseCheck');if(check)check.disabled=answers.size!==items.length;});$('#ccv3HouseCheck').onclick=()=>{let correct=0;items.forEach((x,i)=>{const row=document.querySelector(`.ccv3-house-row[data-i="${i}"]`),ok=answers.get(i)===x.group;if(ok)correct+=1;row.classList.add(ok?'correct':'wrong');});const score=Math.round(correct/items.length*100);setTimeout(()=>finishRound(correct===items.length,state.roundStarted,score),700);};speak(`${pair[0]} or ${pair[1]}. Choose where each item belongs.`);}
  function playPattern(){const level=state.round,options=level===3?PATTERNS.filter(p=>p.kind==='visual'):PATTERNS.filter(p=>p.kind==='number'),p=pick(options);state.current.difficulty=level;const a=$('#gameArea');a.innerHTML=`<div class="ccv3-intro"><div class="ccv3-badge">Round ${level} of 3 · Pattern recognition</div><h3>What comes next?</h3><div class="ccv3-pattern-seq">${p.seq.map(v=>`<span class="ccv3-pattern-cell">${esc(v)}</span>`).join('')}<span class="ccv3-pattern-cell q">?</span></div><div class="ccv3-choice-grid">${shuffle(p.options).map(v=>`<button class="ccv3-choice" data-v="${esc(v)}" type="button">${esc(v)}</button>`).join('')}</div><div id="ccv3PatternExplain" class="ccv3-explain" hidden></div><button class="ccv3-exit" id="ccv3ExitPattern" type="button">Exit Game</button></div>`;$('#ccv3ExitPattern').onclick=safeExit;$$('.ccv3-choice').forEach(b=>b.onclick=()=>{const ok=String(b.dataset.v)===String(p.answer),box=$('#ccv3PatternExplain');if(box){box.hidden=false;box.innerHTML=ok?`<strong>Correct.</strong> ${esc(p.note)}`:`<strong>Good try.</strong> ${esc(p.note)} The answer is ${esc(p.answer)}.`;}$$('.ccv3-choice').forEach(x=>x.disabled=true);setTimeout(()=>finishRound(ok,state.roundStarted,ok?100:40),900);});speak('Look for the repeating rule. What comes next?');}
  function playSpot(){const level=state.round,count=level===1?6:level===2?7:8,base=shuffle(pick(SPOT_SETS)).slice(0,count),diff=Math.floor(Math.random()*count),alternatives=['🕐','🕑','🕒','🕓','🕔','🕕','🕖','🕗','🎷','🎺','🎸','🥁','🍰','🧁','🍩','🍪','🍎','🍌','🍇','🍊'],changed=alternatives.find(x=>x!==base[diff])||'⭐',before=[...base],after=[...base];after[diff]=changed;state.current.difficulty=level;const a=$('#gameArea');a.innerHTML=`<div class="ccv3-intro"><div class="ccv3-badge">Round ${level} of 3 · Visual attention</div><h3>Memorize these items</h3><p id="ccv3SpotTimer">Take a moment to look carefully.</p><div class="ccv3-spot-memory">${before.map(x=>`<span>${x}</span>`).join('')}</div><button class="ccv3-exit" id="ccv3ExitSpot" type="button">Exit Game</button></div>`;$('#ccv3ExitSpot').onclick=safeExit;const wait=level===1?1800:level===2?2300:2800,timer=$('#ccv3SpotTimer');if(timer)timer.textContent=`Memorize for ${Math.round(wait/1000)} seconds.`;setTimeout(()=>{if(!state.current?.live||!state.active||state.current.key!=='spot')return;a.innerHTML=`<div class="ccv3-intro"><div class="ccv3-badge">Round ${level} of 3 · Find the change</div><h3>Which item changed?</h3><p>Tap the one that is different.</p><div class="ccv3-spot-grid">${after.map((x,i)=>`<button class="ccv3-spot" data-i="${i}" type="button">${x}</button>`).join('')}</div><button class="ccv3-exit" id="ccv3ExitSpot2" type="button">Exit Game</button></div>`;$('#ccv3ExitSpot2').onclick=safeExit;$$('.ccv3-spot').forEach(b=>b.onclick=()=>finishRound(Number(b.dataset.i)===diff,state.roundStarted,Number(b.dataset.i)===diff?100:35));speak('Which item changed? Tap the different one.');},wait);}

  window.CCNER_VIDEO_GAMES={startSession};
  window.CCNER_VIDEO_GAME_ORDER=()=>[...state.order];
  document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.id==='homeButton'||b.id==='backHome'){state.active=false;if(state.current)state.current.live=false;document.body.classList.remove('ccner-video-mode');}},true);
})();

/* Level 4 metadata compatibility for the active five-game set. */
(() => {
  'use strict';
  if (window.CCNER_L4_VIDEO_METADATA_V1) return;
  window.CCNER_L4_VIDEO_METADATA_V1 = true;
  const META={
    'Sequence Memory':{objective:'Remember the colour sequence.',rules:'Watch the colours light up one by one, then repeat the same order.',interaction:'Tap the large colour tiles in the same order.'},
    'Stroop Test':{objective:'Focus on the colour of the letters.',rules:'Ignore the word. Choose the ink colour you see.',interaction:'Tap one large colour answer.'},
    'Around the House Sorting':{objective:'Place familiar household items in the right location.',rules:'Look at each item and decide which of the two places it belongs to.',interaction:'Tap the location button for every item, then tap Check Answers.'},
    'Pattern Recognition':{objective:'Find what comes next in the pattern.',rules:'Look for the simple rule that repeats or changes from one step to the next.',interaction:'Tap the large answer choice you think comes next.'},
    'Spot the Difference':{objective:'Notice the item that changed.',rules:'First remember the familiar items. Then look again and find the one different item.',interaction:'Tap the different item.'}
  };
  function patch(){
    if(typeof window.CCNER_LEVEL4_START_HOOK!=='function')return false;
    if(window.__CCNER_L4_VIDEO_HOOK__)return true;
    const original=window.CCNER_LEVEL4_START_HOOK;
    window.CCNER_LEVEL4_START_HOOK=function(){
      const title=document.querySelector('#gameTitle')?.textContent?.trim()||'',info=META[title];
      if(!info)return original.apply(this,arguments);
      if(window.__CCNER_L4_VIDEO_LOCAL_GATE__)return true;
      window.__CCNER_L4_VIDEO_LOCAL_GATE__=true;
      const lang=(localStorage.getItem('ccner-p1-language')||'en-IN').slice(0,2),copy=({en:{ask:'Would you like a tutorial?',title:'Before we play',yes:'Yes',no:'No',continue:'Continue'},hi:{ask:'क्या आप ट्यूटोरियल चाहते हैं?',title:'खेल शुरू करने से पहले',yes:'हाँ',no:'नहीं',continue:'जारी रखें'},bn:{ask:'আপনি কি টিউটোরিয়াল চান?',title:'খেলা শুরুর আগে',yes:'হ্যাঁ',no:'না',continue:'চালিয়ে যান'},as:{ask:'আপুনি টিউটোৰিয়েল বিচাৰে নেকি?',title:'খেল আৰম্ভ কৰাৰ আগতে',yes:'হয়',no:'নহয়',continue:'আগবাঢ়ক'}}[lang]||null)||{ask:'Would you like a tutorial?',title:'Before we play',yes:'Yes',no:'No',continue:'Continue'};
      const wrap=document.createElement('div');wrap.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(3,12,8,.78);display:grid;place-items:center;padding:18px';const card=document.createElement('div');card.style.cssText='width:min(560px,100%);background:#0d2419;border:1px solid #37664c;border-radius:18px;padding:24px;color:#eef5ef;box-shadow:0 30px 90px rgba(0,0,0,.45);font-family:system-ui,sans-serif';card.innerHTML=`<div style="font-size:44px">🐶</div><div style="font-size:12px;font-weight:900;letter-spacing:.12em;color:#62ca91">MOMO</div><h2 style="margin:6px 0 14px">${copy.title}</h2><p style="font-size:18px"><strong>${copy.ask}</strong></p><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><button id="ccnerL4Yes" type="button" style="min-height:54px;border:0;border-radius:12px;background:#49bd82;color:#062011;font-weight:900">${copy.yes}</button><button id="ccnerL4No" type="button" style="min-height:54px;border:1px solid #496456;border-radius:12px;background:#09150f;color:#d8e7de;font-weight:900">${copy.no}</button></div>`;document.body.appendChild(wrap);wrap.appendChild(card);
      const start=()=>{wrap.remove();window.__CCNER_L4_VIDEO_LOCAL_GATE__=false;window.CCNER_VIDEO_GAMES?.startSession?.();};
      $('#ccnerL4No',card).onclick=start;$('#ccnerL4Yes',card).onclick=()=>{card.innerHTML=`<div style="font-size:44px">🐶</div><div style="font-size:12px;font-weight:900;letter-spacing:.12em;color:#62ca91">MOMO</div><h2 style="margin:6px 0 14px">${copy.title}</h2><h3>${info.objective}</h3><p>${info.rules}</p><h3>How to interact</h3><p>${info.interaction}</p><p style="color:#8fa99b;font-size:14px">Momo will stay quiet while you play. Say “Momo” if you need help.</p><button id="ccnerL4Continue" type="button" style="width:100%;min-height:54px;border:0;border-radius:12px;background:#49bd82;color:#062011;font-weight:900">${copy.continue}</button>`;$('#ccnerL4Continue',card).onclick=start;};
      return true;
    };
    window.__CCNER_L4_VIDEO_HOOK__=true;return true;
  }
  let tries=0;const timer=setInterval(()=>{if(patch()||++tries>80)clearInterval(timer);},50);
})();
