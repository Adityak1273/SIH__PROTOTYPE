/* Cognitive Care NER — Adaptive multi-round game engine.
 * Mirrors the supplied game recordings instead of collapsing each game to one question.
 *
 * Session:
 *   - all five games are played in a randomized order;
 *   - the same complete order is not repeated back-to-back;
 *   - each game keeps its own full test length;
 *   - difficulty adapts between trials from accuracy, response time and streak;
 *   - game performance is persisted for longitudinal training analysis.
 *
 * IMPORTANT: difficulty adaptation is a training/personalization controller.
 * It is not a dementia diagnostic algorithm and does not map scores to MMSE/MoCA/CDR.
 */
(() => {
  'use strict';
  if (window.CCNER_ADAPTIVE_GAME_ENGINE_V4) return;
  window.CCNER_ADAPTIVE_GAME_ENGINE_V4 = true;

  const $ = s => document.querySelector(s);
  const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
  const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const shuffle = a => { const x=[...a]; for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[x[i],x[j]]=[x[j],x[i]]} return x };
  const pick = a => a[Math.floor(Math.random()*a.length)];
  const now = () => performance.now();
  const HISTORY='ccner-history';
  const AIKEY='ccner-ai-game-profile-v4';
  const ORDERKEY='ccner-last-game-order-v4';

  const COLORS=[
    {id:'red',label:'Red',hex:'#b83d4b'},
    {id:'blue',label:'Blue',hex:'#3f6db6'},
    {id:'green',label:'Green',hex:'#32925a'},
    {id:'yellow',label:'Yellow',hex:'#a78b19'}
  ];
  const HOUSE={
    desk:[['Stapler','🖇️'],['Can Opener','🥫'],['Envelopes','✉️'],['Measuring Spoons','🥄'],['Paperclips','📎'],['Oven Mitt','🧤']],
    kitchen:[['Can Opener','🥫'],['Measuring Spoons','🥄'],['Oven Mitt','🧤'],['Tea Strainer','🫖'],['Serving Spoon','🥄'],['Tea Cup','☕']],
    porch:[['Rocking Chair','🪑'],['Fire Poker','🔥'],['Welcome Mat','🧶'],['Firewood','🪵'],['Porch Swing','🛋️'],['Bellows','🪶']],
    fireplace:[['Fire Poker','🔥'],['Firewood','🪵'],['Bellows','🪶'],['Rocking Chair','🪑'],['Porch Swing','🛋️'],['Welcome Mat','🧶']],
    bathroom:[['Toothbrush','🪥'],['Bath Towel','🛁'],['Shower Cap','🧢'],['Soap','🧼'],['Comb','🪮'],['Toothpaste','🧴']],
    bedroom:[['Pillow','🛏️'],['Alarm Clock','⏰'],['Dresser','🗄️'],['Blanket','🧣'],['Bedside Lamp','💡'],['Book','📖']],
    china:[['Teacups','☕'],['Serving Platter','🍽️'],['Gravy Boat','🫕'],['Tea Pot','🫖'],['Saucer','🍵'],['Bowl','🥣']],
    broom:[['Broom','🧹'],['Dustpan','🗑️'],['Mop','🪣'],['Cleaning Cloth','🧽'],['Brush','🧹'],['Bucket','🪣']]
  };
  const HOUSE_ROOMS=[['Writing Desk','Kitchen Drawer','desk','kitchen'],['Front Porch','Fireplace','porch','fireplace'],['Bathroom','Bedroom','bathroom','bedroom'],['China Cabinet','Broom Closet','china','broom']];
  const VISUALS=['🍎','🥭','🍌','🍊','☕','💧','🥄','📖','🍚','🥥','🧺','🪣','🌂','🧴','💊','🌸'];
  const PATTERN_RULES=[
    {seq:[1,2,3,4,5],answer:6,opts:[5,6,7,8],note:'Add 1 each time.'},
    {seq:[2,4,6,8,10],answer:12,opts:[11,12,14,16],note:'Add 2 each time.'},
    {seq:[3,6,9,12,15],answer:18,opts:[16,18,20,21],note:'Add 3 each time.'},
    {seq:[2,4,8,16,32],answer:64,opts:[48,60,64,72],note:'Double each time.'},
    {seq:[5,10,15,20,25],answer:30,opts:[28,30,35,40],note:'Add 5 each time.'},
    {seq:[1,4,9,16,25],answer:36,opts:[30,32,36,49],note:'These are square numbers.'},
    {seq:[2,5,10,17,26],answer:37,opts:[34,36,37,39],note:'Add consecutive odd numbers.'},
    {seq:[10,20,40,80,160],answer:320,opts:[240,280,320,360],note:'Double each time.'}
  ];
  const STROOP_COLORS=COLORS;
  const SPOT_BASE=[
    ['⭐','🌙','☀️','🌈','⚡','🍀','❤️','🔔'],
    ['🎸','🎹','🥁','🎺','🎻','🪗','🎷','🪕'],
    ['🍰','🧁','🍩','🍪','🎂','🍫','🍬','🍭'],
    ['🍎','🍌','🍇','🍊','🍉','🥭','🍐','🍓'],
    ['☕','🥄','🍚','🥣','🫖','🍵','🍞','🧂']
  ];

  const GAMES={
    sequence:{title:'Sequence Memory',category:'MEMORY + ATTENTION',count:6,kind:'rounds',intro:'Watch the colours light up, then repeat the sequence from memory.',training:'Short-term memory and attention'},
    stroop:{title:'Stroop Test',category:'ATTENTION + CONCENTRATION',count:120,kind:'timed',seconds:120,intro:'Choose the ink colour, not the word you read.',training:'Selective attention and response control'},
    house:{title:'Around the House Sorting',category:'DAILY-LIFE RECOGNITION',count:10,kind:'rounds',intro:'Tap each item, then choose the category where it belongs.',training:'Daily-life recognition and categorisation'},
    pattern:{title:'Pattern Recognition',category:'PATTERN RECOGNITION',count:15,kind:'rounds',intro:'Find the pattern and choose what comes next.',training:'Pattern recognition and reasoning'},
    spot:{title:'Spot the Difference',category:'VISUAL ATTENTION',count:15,kind:'rounds',intro:'Look carefully at the items, then spot what changed.',training:'Visual attention and detail recognition'}
  };
  const KEYS=Object.keys(GAMES);

  const state={active:false,index:0,order:[],game:null,round:0,results:[],trialStarted:0,trialLocked:false,timer:null,spot:null,house:null,sequence:null};

  function readJson(k,fallback){try{const x=JSON.parse(localStorage.getItem(k)||'null');return x ?? fallback}catch(_){return fallback}}
  function saveJson(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(_){}
  }
  function profile(){
    const p=readJson(AIKEY,{});
    KEYS.forEach(k=>{if(!p[k])p[k]={difficulty:2,attempts:0,correct:0,streak:0,avgResponse:0,lastAccuracy:0,lastUpdated:null}});
    return p;
  }
  const ai=profile();
  function saveAI(){saveJson(AIKEY,ai)}

  /* Adaptive Intelligence controller.
   * Uses the user's own longitudinal game data. Fast, accurate performance raises
   * task complexity; repeated errors/slow responses reduce it gently. */
  function difficultyFor(key){return clamp(Number(ai[key]?.difficulty||2),1,10)}
  function speedTarget(key,d){
    if(key==='stroop')return clamp(2.9-(d-1)*0.16,1.45,2.9);
    if(key==='sequence')return clamp(5.4-(d-1)*0.25,3.0,5.4);
    if(key==='house')return clamp(4.6-(d-1)*0.18,2.9,4.6);
    if(key==='pattern')return clamp(6.0-(d-1)*0.22,3.6,6.0);
    return clamp(5.5-(d-1)*0.18,3.0,5.5);
  }
  function adapt(key,correct,responseMs){
    const p=ai[key]; if(!p)return;
    const sec=responseMs/1000;
    const target=speedTarget(key,p.difficulty);
    const fast=sec<=target;
    if(correct){p.correct++;p.streak=(p.streak||0)+1}else p.streak=0;
    p.attempts++;
    p.lastAccuracy=p.attempts? p.correct/p.attempts:0;
    p.avgResponse=p.avgResponse?((p.avgResponse*.82)+(sec*.18)):sec;
    if(correct && fast && p.streak>=2) p.difficulty=clamp(p.difficulty+1,1,10);
    else if(!correct && p.streak===0 && p.attempts%2===0) p.difficulty=clamp(p.difficulty-1,1,10);
    else if(!correct && sec>target*1.8) p.difficulty=clamp(p.difficulty-1,1,10);
    p.lastUpdated=new Date().toISOString();
    saveAI();
  }
  function sessionDifficulty(key){return difficultyFor(key)}

  function injectCSS(){
    if($('#ccner-v4-style'))return;
    const s=document.createElement('style');s.id='ccner-v4-style';s.textContent=`
      body.ccner-adaptive-v4{background:radial-gradient(circle at 50% -12%,rgba(72,160,113,.16),transparent 36%),radial-gradient(circle at 10% 75%,rgba(41,104,74,.13),transparent 35%),repeating-linear-gradient(0deg,rgba(255,255,255,.012) 0 1px,transparent 1px 5px),#07120d!important;color:#edf3ee!important}
      body.ccner-adaptive-v4 .topbar,body.ccner-adaptive-v4 footer,body.ccner-adaptive-v4 .home-strip,body.ccner-adaptive-v4 .info-grid,body.ccner-adaptive-v4 .section-label{display:none!important}
      body.ccner-adaptive-v4 .app-shell{width:min(900px,calc(100% - 28px));padding:14px 0 82px}
      body.ccner-adaptive-v4 .game-top{max-width:650px;margin:18px auto 12px}
      body.ccner-adaptive-v4 .game-top h2{color:#f4f1df;font-family:Georgia,serif;letter-spacing:-.02em}
      body.ccner-adaptive-v4 .game-card{max-width:650px;margin:0 auto;padding:20px 18px;background:#0d2017;border:1px solid #2c4a39;border-radius:16px;box-shadow:0 20px 55px rgba(0,0,0,.26);color:#eef4ef}
      body.ccner-adaptive-v4 .progress-track{background:#2b352e;height:8px}body.ccner-adaptive-v4 .progress-track i{background:#50c487}
      .v4-meta{display:flex;justify-content:space-between;gap:8px;align-items:center;color:#9eb4a7;font-size:.78rem;margin:5px 0 12px}.v4-ai{color:#59ca8c;font-weight:900}.v4-count{font-weight:900;color:#dbe8df}
      .v4-rounds{display:flex;gap:5px;justify-content:center;margin:8px 0 12px}.v4-rounds i{width:8px;height:8px;border-radius:50%;background:#34433a}.v4-rounds i.on{background:#53c58a;box-shadow:0 0 0 3px rgba(83,197,138,.12)}
      .v4-colors{display:grid;grid-template-columns:repeat(2,110px);gap:14px;justify-content:center;margin:16px auto}.v4-color{width:110px;height:92px;border:2px solid rgba(255,255,255,.12);border-radius:18px;cursor:pointer;box-shadow:0 8px 18px rgba(0,0,0,.16)}.v4-color.red{background:#a72f40}.v4-color.blue{background:#315a9f}.v4-color.green{background:#278d50}.v4-color.yellow{background:#9d8012}.v4-color.flash{filter:brightness(1.55);box-shadow:0 0 0 5px rgba(255,255,255,.1),0 0 28px rgba(255,255,255,.2)}.v4-color:active{transform:scale(.97)}
      .v4-choice-grid{display:grid;grid-template-columns:repeat(2,minmax(130px,1fr));gap:10px;max-width:560px;margin:15px auto}.v4-choice{min-height:58px;border:1px solid #2d4a3a;border-radius:11px;background:#0b1811;color:#dce9e1;font-weight:850;font-size:1rem;cursor:pointer;padding:10px}.v4-choice.selected{border-color:#4fc58a;background:#123121}
      .v4-stroop{font-size:clamp(3.1rem,8vw,5rem);font-weight:950;line-height:1.05;text-align:center;margin:24px 0 18px}.v4-timer{text-align:center;font-size:1.25rem;font-weight:950;color:#61cb92;margin:8px 0}.v4-timer.warn{color:#e0b45b}
      .v4-house-list{display:grid;gap:9px;margin:12px auto}.v4-house-row{display:grid;grid-template-columns:minmax(130px,1fr) minmax(220px,1fr);gap:8px;align-items:center;padding:8px 10px;background:#09150f;border:1px solid #263e31;border-radius:11px}.v4-house-item{text-align:left;font-size:1rem}.v4-house-item .ico{font-size:1.35rem;margin-right:7px}.v4-house-buttons{display:grid;grid-template-columns:1fr 1fr;gap:6px}.v4-house-btn{min-height:46px;border:0;border-radius:10px;background:#07110c;color:#bdcfc4;font-weight:850;padding:7px 5px;cursor:pointer}.v4-house-btn.selected{background:#4bc287;color:#062011}.v4-check{width:100%;min-height:54px;border:1px solid #337c58;border-radius:11px;background:#2c8659;color:#dff7e9;font-weight:900;margin-top:10px;cursor:pointer}.v4-check:disabled{opacity:.45}.v4-house-row.correct{border-color:#4bc287;background:#102b1f}.v4-house-row.wrong{border-color:#bd5d54;background:#2a1615}
      .v4-pattern{display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;margin:20px 0}.v4-pcell{min-width:52px;min-height:52px;display:grid;place-items:center;padding:7px 10px;border-radius:11px;background:#0b2116;color:#55c98b;font-weight:900;font-size:1.25rem;border:1px solid #1d4530}.v4-pcell.q{border:1px dashed #55c98b;background:#0e2a1b}.v4-explain{margin:12px auto 0;padding:10px 12px;border-radius:10px;background:#0b1b13;border:1px solid #254534;color:#b8cbbf;font-size:.84rem;line-height:1.45}
      .v4-spot-memory{display:flex;justify-content:center;gap:10px;flex-wrap:wrap;padding:16px 5px}.v4-spot-memory span{font-size:2.35rem;width:58px;height:58px;display:grid;place-items:center;background:#0b1b13;border:1px solid #294333;border-radius:12px}.v4-spot-grid{display:grid;grid-template-columns:repeat(4,minmax(60px,1fr));gap:9px;max-width:500px;margin:15px auto}.v4-spot{min-height:66px;border:1px solid #294333;border-radius:12px;background:#0b1b13;color:#fff;font-size:2rem;cursor:pointer}.v4-spot:hover,.v4-spot:focus{border-color:#55c98b}.v4-status{min-height:24px;text-align:center;color:#69cf96;font-weight:800;margin-top:10px}
      .v4-finish{padding:16px;border-radius:13px;background:#0b1b13;border:1px solid #294333;text-align:center}.v4-finish strong{font-size:1.25rem}.v4-finish p{color:#b8cbbf;line-height:1.45}.v4-next{min-height:50px;border:0;border-radius:11px;background:#49bd82;color:#062011;font-weight:900;padding:10px 20px;cursor:pointer}
      @media(max-width:600px){.v4-house-row{grid-template-columns:1fr}.v4-colors{grid-template-columns:repeat(2,100px)}.v4-color{width:100px;height:84px}.v4-spot-grid{grid-template-columns:repeat(4,1fr);gap:7px}.v4-spot{min-height:58px;font-size:1.65rem}}
    `;document.head.appendChild(s);
  }

  function setText(id,text){const e=$(id);if(e)e.textContent=text}
  function setGameChrome(key){
    const g=GAMES[key];
    document.body.classList.add('ccner-adaptive-v4');
    setText('#gameCategory',g.category);setText('#gameTitle',g.title);setText('#gamePrompt',g.intro);
    setText('#gameMomoText',`Adaptive practice · Difficulty ${sessionDifficulty(key)}/10`);
    const meta=$('#gameArea');
    if(meta && !$('#v4meta')) meta.insertAdjacentHTML('beforebegin',`<div id="v4meta" class="v4-meta"><span class="v4-ai">AI-adaptive training</span><span id="v4difficulty">Difficulty ${sessionDifficulty(key)}/10</span><span id="v4count"></span></div>`);
  }
  function updateMeta(){
    const g=state.game,d=sessionDifficulty(g);setText('#v4difficulty',`Difficulty ${d}/10`);
    setText('#v4count',g.kind==='timed'?`${Math.max(0,Math.ceil(g.seconds-(now()-state.gameStarted)/1000))}s remaining`:`Test ${state.round} / ${g.count}`);
    const p=$('#progressBar');if(p)p.style.width=g.kind==='timed'?`${clamp(((now()-state.gameStarted)/1000)/g.seconds*100,0,100)}%`:`${clamp((state.round-1)/g.count*100,0,100)}%`;
  }
  function record(correct,ms,extra={}){
    const key=state.gameKey;adapt(key,correct,ms);
    state.results.push({game:key,name:GAMES[key].title,round:state.round,correct:!!correct,seconds:ms/1000,difficulty:difficultyFor(key),...extra});
    window.dispatchEvent(new CustomEvent('ccner:game-result',{detail:{correct:!!correct,game:key,difficulty:difficultyFor(key),seconds:ms/1000}}));
  }
  function lockAndAdvance(correct,extra={}){
    if(state.trialLocked)return;state.trialLocked=true;
    const ms=now()-state.trialStarted;record(correct,ms,extra);
    const fb=$('#gameFeedback');if(fb)fb.textContent=correct?'Correct!':'Good try. Let’s keep practicing.';
    setTimeout(()=>{state.trialLocked=false;if(state.gameKey==='stroop'){if(now()-state.gameStarted>=120000){finishGame();return}beginRound();}else if(state.round>=GAMES[state.gameKey].count){finishGame()}else{state.round++;beginRound()}},520);
  }

  function beginRound(){
    if(!state.active)return;
    const key=state.gameKey;state.trialStarted=now();state.trialLocked=false;updateMeta();
    if(key==='sequence')renderSequence();
    else if(key==='stroop')renderStroop();
    else if(key==='house')renderHouse();
    else if(key==='pattern')renderPattern();
    else renderSpot();
  }

  function renderSequence(){
    const d=difficultyFor('sequence');
    const len=clamp(3+Math.floor((d-1)/2)+Math.floor((state.round-1)/2),3,10);
    const gap=clamp(720-(d*28),440,720), seq=Array.from({length:len},()=>pick(COLORS));state.sequence={seq,pos:0};
    setText('#gamePrompt','Watch the colours light up, then repeat the sequence from memory.');
    const area=$('#gameArea');area.innerHTML=`<div class="v4-rounds">${Array.from({length:6},(_,i)=>`<i class="${i<state.round?'on':''}"></i>`).join('')}</div><div class="v4-status" id="v4seqstatus">Watch carefully…</div><div class="v4-colors">${COLORS.map(c=>`<button class="v4-color ${c.id}" data-color="${c.id}" aria-label="${c.label}"></button>`).join('')}</div>`;
    const tiles=[...area.querySelectorAll('.v4-color')];let i=0;
    const flash=()=>{if(!state.active)return;tiles.forEach(x=>x.classList.remove('flash'));if(i<seq.length){const t=tiles.find(x=>x.dataset.color===seq[i].id);t?.classList.add('flash');i++;setTimeout(flash,gap);return}tiles.forEach(x=>x.classList.remove('flash'));setText('#v4seqstatus','Your turn — repeat the sequence.');tiles.forEach(t=>t.onclick=()=>{if(state.trialLocked)return;const ok=t.dataset.color===seq[state.sequence.pos]?.id;if(!ok){lockAndAdvance(false,{expected:seq[state.sequence.pos]?.id,chosen:t.dataset.color});return}t.classList.add('flash');state.sequence.pos++;if(state.sequence.pos===seq.length)lockAndAdvance(true,{sequenceLength:seq.length});setTimeout(()=>t.classList.remove('flash'),180)});};
    setTimeout(flash,420);
  }

  function renderStroop(){
    const d=difficultyFor('stroop');
    const visible=COLORS.slice(0,clamp(2+Math.floor(d/3),2,4));
    const word=pick(visible),ink=pick(visible);
    const area=$('#gameArea');area.innerHTML=`<div class="v4-timer" id="v4timer"></div><div class="v4-status">Choose the ink colour, not the word.</div><div class="v4-stroop" style="color:${ink.hex}">${esc(word.label.toUpperCase())}</div><div class="v4-choice-grid">${visible.map(c=>`<button class="v4-choice" data-id="${c.id}">${c.label}</button>`).join('')}</div>`;
    const tick=()=>{if(!state.active)return;const remain=Math.max(0,120-Math.floor((now()-state.gameStarted)/1000));setText('#v4timer',`Time remaining: ${remain}s`);$('#v4timer')?.classList.toggle('warn',remain<=15);if(remain>0)state.timer=requestAnimationFrame(tick);else finishGame()};
    state.timer=requestAnimationFrame(tick);
    area.querySelectorAll('.v4-choice').forEach(b=>b.onclick=()=>lockAndAdvance(b.dataset.id===ink.id,{ink:ink.id,word:word.id}));
  }

  function renderHouse(){
    const d=difficultyFor('house');const pair=HOUSE_ROOMS[(state.round-1)%HOUSE_ROOMS.length];const size=clamp(4+Math.floor((d-1)/3),4,6);const source=HOUSE[pair[2]];const other=HOUSE[pair[3]];const correctGroup=pair[2];
    const items=shuffle([...source.slice(0,Math.ceil(size/2)),...other.slice(0,Math.floor(size/2))]);state.house={pair,items,answers:{},correctGroup};
    setText('#gamePrompt',`${pair[0]} or ${pair[1]}?`);
    const area=$('#gameArea');area.innerHTML=`<div class="v4-status">Tap each item, then tap the category it belongs to.</div><div class="v4-house-list">${items.map((x,i)=>`<div class="v4-house-row" data-i="${i}"><div class="v4-house-item"><span class="ico">${x[1]}</span>${esc(x[0])}</div><div class="v4-house-buttons"><button class="v4-house-btn" data-group="${pair[2]}">${esc(pair[0])}</button><button class="v4-house-btn" data-group="${pair[3]}">${esc(pair[1])}</button></div></div>`).join('')}</div><button class="v4-check" id="v4check" disabled>Check Answers</button>`;
    area.querySelectorAll('.v4-house-row').forEach(row=>row.querySelectorAll('.v4-house-btn').forEach(btn=>btn.onclick=()=>{if(state.trialLocked)return;row.querySelectorAll('.v4-house-btn').forEach(x=>x.classList.remove('selected'));btn.classList.add('selected');state.house.answers[row.dataset.i]=btn.dataset.group;$('#v4check').disabled=Object.keys(state.house.answers).length!==items.length}));
    $('#v4check').onclick=()=>{let ok=0;items.forEach((x,i)=>{const expected=x[2]||((source.includes(x))?pair[2]:pair[3]);const chosen=state.house.answers[i];const row=area.querySelector(`[data-i="${i}"]`);if(chosen===expected){ok++;row.classList.add('correct')}else row.classList.add('wrong')});lockAndAdvance(ok===items.length,{items:items.length,correctItems:ok})};
  }

  function renderPattern(){
    const d=difficultyFor('pattern');let pool=PATTERN_RULES.slice(0,clamp(3+Math.floor(d/2),3,PATTERN_RULES.length));let p=pick(pool);
    if(d>=7 && Math.random()<.45)p={seq:[3,6,12,24,48],answer:96,opts:[72,84,96,108],note:'Double each time.'};
    if(d>=8 && Math.random()<.4)p={seq:[4,7,13,25,49],answer:97,opts:[73,96,97,101],note:'Add 3, then 6, then 12, then 24 — the added amount doubles.'};
    const shown=p.seq.slice(d>=7?0:Math.max(0,p.seq.length-(4+Math.floor(d/4))));
    setText('#gamePrompt','What comes next in the pattern?');
    const area=$('#gameArea');area.innerHTML=`<div class="v4-pattern">${shown.map(x=>`<span class="v4-pcell">${esc(x)}</span>`).join('')}<span class="v4-pcell q">?</span></div><div class="v4-choice-grid">${shuffle(p.opts).map(x=>`<button class="v4-choice" data-answer="${esc(x)}">${esc(x)}</button>`).join('')}</div>`;
    area.querySelectorAll('.v4-choice').forEach(b=>b.onclick=()=>{const val=Number(b.dataset.answer);const ok=val===p.answer;lockAndAdvance(ok,{answer:p.answer,chosen:val,rule:p.note});if($('#gameFeedback'))$('#gameFeedback').textContent=ok?`Correct — ${p.note}`:`The rule was: ${p.note}`;});
  }

  function renderSpot(){
    const d=difficultyFor('spot');const base=pick(SPOT_BASE);const n=clamp(4+Math.floor(d/2),4,8);const items=shuffle(base).slice(0,n);const changedIndex=Math.floor(Math.random()*items.length);const changed=pick(VISUALS.filter(x=>!items.includes(x)));const altered=[...items];altered[changedIndex]=changed;state.spot={items,altered,changedIndex};
    const memorySec=clamp(5.5-(d-1)*.25,3,5.5);
    setText('#gamePrompt','Look carefully at the items, then spot what changed.');
    const area=$('#gameArea');area.innerHTML=`<div class="v4-status" id="v4spotstatus">Memorize these items (${memorySec.toFixed(1)}s)</div><div class="v4-spot-memory">${items.map(x=>`<span>${x}</span>`).join('')}</div>`;
    setTimeout(()=>{if(!state.active||state.gameKey!=='spot'||state.round!==state.spotRound){};showSpotChoices()},memorySec*1000);
    state.spotRound=state.round;
  }
  function showSpotChoices(){
    if(!state.active||state.gameKey!=='spot'||state.spotRound!==state.round)return;const area=$('#gameArea');setText('#v4spotstatus','Which item changed? Tap the one that is different.');area.innerHTML=`<div class="v4-status">Which item changed? Tap the one that’s different.</div><div class="v4-spot-grid">${state.spot.altered.map((x,i)=>`<button class="v4-spot" data-i="${i}">${x}</button>`).join('')}</div><div class="v4-status">Need a hint? Look at the item that was not in the original set.</div>`;area.querySelectorAll('.v4-spot').forEach(b=>b.onclick=()=>lockAndAdvance(Number(b.dataset.i)===state.spot.changedIndex,{changedIndex:state.spot.changedIndex,chosenIndex:Number(b.dataset.i)}));
  }

  function finishGame(){
    cancelAnimationFrame(state.timer);clearTimeout(state.timer);state.timer=null;
    const key=state.gameKey,g=GAMES[key],rs=state.results.filter(r=>r.game===key);const correct=rs.filter(r=>r.correct).length;const accuracy=rs.length?correct/rs.length:0;const avg=rs.length?rs.reduce((a,r)=>a+r.seconds,0)/rs.length:0;
    state.game={key,title:g.title,category:g.category,count:rs.length,accuracy,avgResponse:avg,finalDifficulty:difficultyFor(key),results:rs};
    setText('#gamePrompt',`${g.title} complete.`);const area=$('#gameArea');area.innerHTML=`<div class="v4-finish"><strong>${Math.round(accuracy*100)}% correct</strong><p>${g.kind==='timed'?`You trained for two minutes and completed ${rs.length} responses.`:`You completed ${rs.length} tests in this game.`}</p><p>Adaptive difficulty reached <b>${difficultyFor(key)}/10</b>.</p><button class="v4-next" id="v4Next">${state.index<state.order.length-1?'Next game':'Finish session'}</button></div>`;
    setText('#gameFeedback','');$('#v4Next').onclick=()=>{if(state.index<state.order.length-1){state.index++;startGame(state.order[state.index])}else finishSession()};
  }

  function startGame(key){
    cancelAnimationFrame(state.timer);clearTimeout(state.timer);state.timer=null;state.gameKey=key;state.round=1;state.gameStarted=now();state.spotRound=0;state.house=null;state.sequence=null;setGameChrome(key);setText('#gameCounter',`${state.index+1} of ${state.order.length}`);setText('#progressBar','');setText('#gameFeedback','');
    if(key==='stroop')setText('#gameCounter',`${state.index+1} of ${state.order.length} · 2:00`);else setText('#gameCounter',`${state.index+1} of ${state.order.length}`);
    beginRound();
  }

  function finishSession(){
    state.active=false;cancelAnimationFrame(state.timer);clearTimeout(state.timer);state.timer=null;document.body.classList.remove('ccner-adaptive-v4');
    const results=state.results,correct=results.filter(r=>r.correct).length,accuracy=results.length?correct/results.length:0,avg=results.length?results.reduce((a,r)=>a+r.seconds,0)/results.length:0;
    const perGame=state.order.map(k=>{const rs=results.filter(r=>r.game===k);return {game:k,name:GAMES[k].title,accuracy:rs.length?rs.filter(r=>r.correct).length/rs.length:0,avgResponse:rs.length?rs.reduce((a,r)=>a+r.seconds,0)/rs.length:0,trials:rs.length,finalDifficulty:difficultyFor(k)}});
    const session={date:new Date().toISOString(),score:Math.round(accuracy*100),accuracy,avgTime:avg,level:Math.round(state.order.reduce((a,k)=>a+difficultyFor(k),0)/state.order.length),games:state.order.map(k=>GAMES[k].title),gameOrder:[...state.order],results,perGame};
    const h=readJson(HISTORY,[]);h.push(session);saveJson(HISTORY,h.slice(-30));
    setText('#overallScore',`${session.score}%`);setText('#overallAccuracy',`${Math.round(accuracy*100)}%`);setText('#gamesCompleted',`${state.order.length} / ${state.order.length}`);setText('#avgTime',`${avg.toFixed(1)}s`);
    const rows=$('#resultRows');if(rows)rows.innerHTML=perGame.map(r=>`<div class="result-row"><div><div class="result-name">${esc(r.name)}</div><div class="result-detail">${Math.round(r.accuracy*100)}% · ${r.trials} tests · avg ${r.avgResponse.toFixed(1)}s · difficulty ${r.finalDifficulty}/10</div></div><span class="score-pill">${Math.round(r.accuracy*100)}%</span></div>`).join('');
    setText('#trendBadge',h.length>1?(session.score>(h.at(-2)?.score||0)?'Improving ↑':session.score<(h.at(-2)?.score||0)?'Keep practicing ↔':'Steady →'):'First session');
    setText('#todayStatus','Complete');
    const rv=$('#resultsView'),gv=$('#gameView');if(gv)gv.hidden=true;if(rv)rv.hidden=false;window.scrollTo({top:0,behavior:'smooth'});
    window.dispatchEvent(new CustomEvent('ccner:game-session-complete',{detail:session}));
  }

  function newOrder(){
    const last=readJson(ORDERKEY,[]);let order=shuffle(KEYS);let tries=0;while(last.length===order.length&&order.every((x,i)=>x===last[i])&&tries<20){order=shuffle(KEYS);tries++}saveJson(ORDERKEY,order);return order}
  function startSession(){
    if(state.active)return;state.active=true;state.results=[];state.index=0;state.order=newOrder();
    const hv=$('#homeView'),gv=$('#gameView'),rv=$('#resultsView');if(hv)hv.hidden=true;if(rv)rv.hidden=true;if(gv)gv.hidden=false;setText('#todayStatus','In progress');
    setTimeout(()=>{if(state.active)startGame(state.order[0])},420);
  }
  function install(){
    injectCSS();
    const old=window.startSession;
    window.CCNER_VIDEO_GAMES=window.CCNER_VIDEO_GAMES||{};
    window.CCNER_VIDEO_GAMES.startSession=startSession;
    window.CCNER_VIDEO_GAMES.startGame=startGame;
    window.CCNER_VIDEO_GAMES.getSession=()=>({active:state.active,order:[...state.order],results:[...state.results]});
    window.CCNER_VIDEO_GAMES.getAdaptiveProfile=()=>JSON.parse(JSON.stringify(ai));
    window.startSession=function(){startSession()};
    document.addEventListener('click',e=>{if(e.target.closest('#backHome,#homeButton')){state.active=false;cancelAnimationFrame(state.timer);clearTimeout(state.timer);document.body.classList.remove('ccner-adaptive-v4')}});
    /* Keep the old app's Play Again button useful. */
    $('#playAgain')?.addEventListener('click',()=>startSession());
    /* Prevent stale old game engine state from controlling the new session. */
    if(old && old!==window.startSession) window.CCNER_PREVIOUS_START_SESSION=old;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
