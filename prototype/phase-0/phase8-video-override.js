/* Cognitive Care NER — video-structure game set.
 * Mechanic references are derived from the user's uploaded game videos.
 * Questions/content are original and deterministic; AI never decides correctness.
 */
(() => {
  'use strict';
  if (window.CCNER_VIDEO_GAMES) return;

  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const shuffle = a => [...a].sort(() => Math.random() - 0.5);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const esc = v => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const read = (k, f) => { try { return JSON.parse(localStorage.getItem(k)) ?? f; } catch (_) { return f; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} };

  const HISTORY = 'ccner-history';
  const LEVELS = 'ccner-video-levels-v2';
  const levels = Object.assign({ sequence: 1, sorting: 1, pattern: 1, belong: 1 }, read(LEVELS, {}));

  const GAMES = {
    sequence: { title: 'Sequence Memory', area: 'MEMORY + ATTENTION', icon: '🔢', intro: 'Watch the colours light up, remember the order, then repeat the sequence.', voice: 'Watch the colours carefully. Then repeat the same order.' },
    sorting: { title: 'Around the House Sorting', area: 'DAILY-LIFE RECOGNITION', icon: '🏠', intro: 'Tap each familiar item, then choose the place where it belongs.', voice: 'Look at each item and choose the place where it belongs.' },
    pattern: { title: 'Pattern Recognition', area: 'PATTERN RECOGNITION', icon: '🧩', intro: 'Find the rule in the sequence and choose what comes next.', voice: 'Look for the pattern. What number comes next?' },
    belong: { title: 'Where Do They Belong?', area: 'OBJECT + CONTEXT RECOGNITION', icon: '📍', intro: 'Four familiar things share one place. Choose the place they all belong to.', voice: 'Think about these four things. Where do they all belong?' }
  };

  const houseSets = [
    { prompt: 'Writing desk or kitchen drawer?', cats: ['Writing desk', 'Kitchen drawer'], items: [['📎','Paper clips','Writing desk'],['🖊️','Pen','Writing desk'],['✉️','Envelopes','Writing desk'],['🥄','Measuring spoon','Kitchen drawer'],['🧤','Oven mitt','Kitchen drawer']] },
    { prompt: 'Front porch or fireplace?', cats: ['Front porch', 'Fireplace'], items: [['🪑','Rocking chair','Front porch'],['🚪','Welcome mat','Front porch'],['🛎️','Door bell','Front porch'],['🪵','Firewood','Fireplace'],['🔥','Fire poker','Fireplace']] },
    { prompt: 'Bathroom or bedroom?', cats: ['Bathroom', 'Bedroom'], items: [['🪥','Toothbrush','Bathroom'],['🧼','Soap','Bathroom'],['🚿','Shower cap','Bathroom'],['🛏️','Pillow','Bedroom'],['⏰','Alarm clock','Bedroom']] },
    { prompt: 'Kitchen shelf or medicine shelf?', cats: ['Kitchen shelf', 'Medicine shelf'], items: [['🍚','Rice bowl','Kitchen shelf'],['☕','Tea cup','Kitchen shelf'],['🫖','Tea pot','Kitchen shelf'],['💊','Medicine box','Medicine shelf'],['🌡️','Thermometer','Medicine shelf']] }
  ];

  const belongSets = [
    { words: ['Coconut','Spice box','Rice bowl','Tea pot'], choices: ['Kitchen','Bedroom','Garden','Bus stop'], answer: 'Kitchen' },
    { words: ['Pillow','Blanket','Bedside lamp','Alarm clock'], choices: ['Bedroom','Kitchen','Market','School'], answer: 'Bedroom' },
    { words: ['Umbrella','Raincoat','Gumboots','Rain shelter'], choices: ['Rainy-day shelter','Kitchen','Library','Workshop'], answer: 'Rainy-day shelter' },
    { words: ['Bamboo basket','Shawl','Earthen lamp','Wooden bowl'], choices: ['Home','Airport','Office','Playground'], answer: 'Home' },
    { words: ['Platform','Ticket counter','Timetable','Waiting bench'], choices: ['Railway station','Kitchen','Clinic','Garden'], answer: 'Railway station' },
    { words: ['Pencil','Blackboard','Notebook','School bell'], choices: ['School','Kitchen','Farm','Garage'], answer: 'School' }
  ];

  const patternSets = [
    { seq: ['2','4','6','8'], answer: '10', choices: ['9','10','11','12'] },
    { seq: ['3','6','12','24'], answer: '48', choices: ['36','42','48','52'] },
    { seq: ['5','10','15','20'], answer: '25', choices: ['22','24','25','30'] },
    { seq: ['1','4','9','16'], answer: '25', choices: ['20','24','25','36'] },
    { seq: ['2','5','10','17','26'], answer: '37', choices: ['34','36','37','40'] },
    { seq: ['1','3','7','15','31'], answer: '63', choices: ['47','55','62','63'] },
    { seq: ['10','20','30','40'], answer: '50', choices: ['45','50','55','60'] },
    { seq: ['100','90','80','70'], answer: '60', choices: ['50','55','60','65'] }
  ];

  const state = { active: false, index: 0, order: [], round: 0, current: null, results: [] };

  const css = `
    .p8v-intro{padding:24px;text-align:center;background:rgba(255,255,255,.94);border:1px solid #e5ddd4;border-radius:22px}
    .p8v-icon{font-size:44px}.p8v-intro h3{font-size:26px;margin:6px 0}.p8v-intro p{font-size:17px;line-height:1.5}
    .p8v-tags{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin:16px 0}.p8v-tags span{padding:8px 12px;border-radius:999px;background:#f3eee7}
    .p8v-question{text-align:center;font-size:21px;font-weight:800;margin:12px 0 18px}.p8v-muted{text-align:center;color:#6b625a;margin:12px}
    .p8v-sequence,.p8v-colours{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}.p8v-sequence span,.p8v-colour{width:64px;height:64px;border-radius:14px;border:0;box-shadow:0 4px 10px #0002}
    .seq-red{background:#d95c5c}.seq-blue{background:#5d7fd7}.seq-green{background:#65a76b}.seq-yellow{background:#e0ba4c}.seq-purple{background:#8d68bd}
    .p8v-colour{cursor:pointer}.p8v-colour:disabled{opacity:.35}.p8v-picked{text-align:center;color:#6b625a;margin:12px}
    .p8v-sort-list{display:grid;gap:14px}.p8v-sort-row{padding:15px;border:1px solid #e4ddd5;border-radius:16px;background:#fbf8f3}
    .p8v-item{display:flex;gap:10px;align-items:center;font-size:18px;margin-bottom:10px}.p8v-item span{font-size:28px}.p8v-cat-wrap{display:flex;gap:8px;flex-wrap:wrap}
    .p8v-cat,.p8v-answer{min-height:50px;padding:10px 15px;border:1px solid #d8d0c7;border-radius:12px;background:#fff;cursor:pointer;font-size:16px}.p8v-cat.selected{background:#e7f3e9;outline:3px solid #77a77e55}
    .p8v-check{margin-top:14px}.p8v-pattern{display:flex;gap:10px;justify-content:center;align-items:center;flex-wrap:wrap;font-size:28px;margin:20px}.p8v-pattern span{min-width:52px;padding:11px 8px;text-align:center;border-radius:12px;background:#f1eee9}.p8v-pattern .missing{background:#e7f3e9}
    .p8v-answer-list{display:grid;gap:10px;max-width:620px;margin:auto}.p8v-answer{width:100%;font-weight:700;text-align:left}.p8v-answer span{font-size:24px;margin-right:6px}
    @media(max-width:600px){.p8v-question{font-size:19px}.p8v-cat{font-size:14px;padding:9px 11px}.p8v-sort-row{padding:12px}}
  `;
  const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

  function speak(text) { if (!('speechSynthesis' in window)) return; try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = localStorage.getItem('ccner-p1-language') || 'en-IN'; u.rate = .9; speechSynthesis.speak(u); } catch (_) {} }
  function level(k){ return Math.max(1, Math.min(3, Number(levels[k] || 1))); }
  function label(n){ return ['','Easy','Medium','Hard'][n] || 'Easy'; }
  function adapt(k, accuracy){ let n=level(k); if(accuracy>=.8)n=Math.min(3,n+1); else if(accuracy<=.4)n=Math.max(1,n-1); levels[k]=n; write(LEVELS,levels); }
  function showGame(){ $$('.view').forEach(v=>v.hidden=true); const v=$('#gameView'); if(v)v.hidden=false; }
  function start(){ if(state.active)return; state.active=true; state.index=0; state.round=0; state.results=[]; state.order=shuffle(['sequence','sorting','pattern','belong']); showGame(); loadGame(); }
  function loadGame(){ const key=state.order[state.index], g=GAMES[key], n=level(key); state.current={key,level:n,correct:0,time:0,live:false}; state.round=0; $('#gameCategory').textContent=g.area; $('#gameTitle').textContent=g.title; $('#gameCounter').textContent=`${state.index+1} of 4`; $('#gamePrompt').textContent=g.intro; $('#gameMomoText').textContent=`${label(n)} · Momo will guide you step by step.`; $('#gameFeedback').textContent=''; const b=$('#progressBar'); if(b)b.style.width=`${state.index/4*100}%`; intro(g,n); speak(g.voice); }
  function intro(g,n){ const a=$('#gameArea'); a.innerHTML=`<section class="p8v-intro"><div class="p8v-icon">${g.icon}</div><h3>${esc(g.title)}</h3><p><strong>What it trains:</strong> ${esc(g.area.toLowerCase())}</p><p>${esc(g.intro)}</p><div class="p8v-tags"><span>🎚️ ${label(n)}</span><span>🔁 3 rounds</span><span>🧓 Training only · not diagnosis</span></div><button class="p8-primary" id="p8vStart" type="button">▶ Start game</button></section>`; $('#p8vStart').onclick=round; }
  function round(){ if(!state.active||state.current.live)return; state.current.live=true; state.round++; $('#gameFeedback').textContent=`Round ${state.round} of 3`; const k=state.current.key; if(k==='sequence')sequence(); else if(k==='sorting')sorting(); else if(k==='pattern')pattern(); else belong(); }
  function done(ok,ms){ if(!state.current.live)return; state.current.live=false; state.current.correct+=ok?1:0; state.current.time+=Math.max(0,ms); $('#gameFeedback').textContent=ok?'✓ Correct — well done!':'Good try. Let’s continue.'; if(state.round<3)return setTimeout(round,900); const accuracy=state.current.correct/3; adapt(state.current.key,accuracy); state.results.push({key:state.current.key,name:GAMES[state.current.key].title,area:GAMES[state.current.key].area,level:state.current.level,score:Math.round(accuracy*100),accuracy,correct:state.current.correct,attempts:3,avgResponse:state.current.time/3,completed:true}); setTimeout(()=>{ if(state.index<3){state.index++;loadGame();} else finish(); },900); }
  function sequence(){ const n=level('sequence')===1?3:level('sequence')===2?4:5; const seq=shuffle(['red','blue','green','yellow','purple']).slice(0,n); const started=performance.now(), a=$('#gameArea'); a.innerHTML=`<div class="p8v-question">Watch the sequence</div><div class="p8v-sequence">${seq.map(c=>`<span class="seq-${c}"></span>`).join('')}</div><p class="p8v-muted">Remember the order.</p>`; setTimeout(()=>{ if(!state.current.live)return; let chosen=[]; a.innerHTML=`<div class="p8v-question">Repeat the sequence</div><div class="p8v-picked" id="p8vPicked">Choose the first colour.</div><div class="p8v-colours">${['red','blue','green','yellow','purple'].map(c=>`<button class="p8v-colour seq-${c}" data-c="${c}" aria-label="${c}" type="button"></button>`).join('')}</div>`; $$('.p8v-colour').forEach(b=>b.onclick=()=>{chosen.push(b.dataset.c);b.disabled=true;$('#p8vPicked').textContent=`${chosen.length} selected`;if(chosen.length===seq.length)done(chosen.every((x,i)=>x===seq[i]),performance.now()-started);}); },Math.max(2200,4700-level('sequence')*500)); }
  function sorting(){ const set=pick(houseSets), difficulty=level('sorting'), count=difficulty===1?3:difficulty===2?4:5, items=shuffle(set.items).slice(0,count), started=performance.now(), ans={}; const a=$('#gameArea'); a.innerHTML=`<div class="p8v-question">${esc(set.prompt)}</div><div class="p8v-sort-list">${items.map((x,i)=>`<div class="p8v-sort-row"><div class="p8v-item"><span>${x[0]}</span><strong>${esc(x[1])}</strong></div><div class="p8v-cat-wrap">${set.cats.map(c=>`<button class="p8v-cat" data-i="${i}" data-cat="${esc(c)}" type="button">${esc(c)}</button>`).join('')}</div></div>`).join('')}</div><button id="p8vCheck" class="p8-primary p8v-check" type="button">✓ Check answers</button>`; $$('.p8v-cat').forEach(b=>b.onclick=()=>{ans[b.dataset.i]=b.dataset.cat;$$(`.p8v-cat[data-i="${b.dataset.i}"]`).forEach(x=>x.classList.remove('selected'));b.classList.add('selected');}); $('#p8vCheck').onclick=()=>{if(Object.keys(ans).length<items.length){$('#gameFeedback').textContent='Please choose a place for each item.';return;}done(items.every((x,i)=>ans[i]===x[2]),performance.now()-started);}; }
  function pattern(){ const p=pick(patternSets), started=performance.now(), a=$('#gameArea'); a.innerHTML=`<div class="p8v-question">What comes next in the pattern?</div><div class="p8v-pattern">${p.seq.map(x=>`<span>${esc(x)}</span>`).join('')}<span class="missing">?</span></div><div class="p8v-answer-list">${shuffle(p.choices).map(x=>`<button class="p8v-answer" data-v="${esc(x)}" type="button">${esc(x)}</button>`).join('')}</div>`; $$('.p8v-answer').forEach(b=>b.onclick=()=>done(b.dataset.v===p.answer,performance.now()-started)); }
  function belong(){ const p=pick(belongSets), started=performance.now(), a=$('#gameArea'); a.innerHTML=`<div class="p8v-question">What do these four things have in common?</div><div class="p8v-pattern">${p.words.map(x=>`<span>${esc(x)}</span>`).join('')}</div><p class="p8v-muted">Choose the place where they all belong.</p><div class="p8v-answer-list">${shuffle(p.choices).map(x=>`<button class="p8v-answer" data-v="${esc(x)}" type="button">📍 ${esc(x)}</button>`).join('')}</div>`; $$('.p8v-answer').forEach(b=>b.onclick=()=>done(b.dataset.v===p.answer,performance.now()-started)); }
  function finish(){ state.active=false; const total=state.results.reduce((a,r)=>a+r.correct,0), attempts=state.results.length*3; const s={date:new Date().toISOString(),score:attempts?Math.round(total/attempts*100):0,accuracy:attempts?total/attempts:0,avgTime:state.results.reduce((a,r)=>a+r.avgResponse,0)/Math.max(1,state.results.length),results:state.results}; const h=read(HISTORY,[]); h.push(s); write(HISTORY,h.slice(-30)); $$('.view').forEach(v=>v.hidden=true); $('#resultsView').hidden=false; $('#overallScore').textContent=s.score+'%'; $('#overallAccuracy').textContent=Math.round(s.accuracy*100)+'%'; $('#gamesCompleted').textContent='4 / 4'; $('#avgTime').textContent=s.avgTime.toFixed(1)+'s'; $('#trendBadge').textContent='Training session complete'; $('#resultRows').innerHTML=state.results.map(r=>`<div class="p8-result"><div><strong>${esc(r.name)}</strong><div class="p8v-muted">${esc(r.area)} · ${label(r.level)} · ${r.correct}/${r.attempts} correct · ${r.avgResponse.toFixed(1)}s</div></div><strong>${r.score}%</strong></div>`).join(''); speak('You completed all four games. Well done.'); }

  window.CCNER_VIDEO_GAMES={startSession:start,order:()=>state.order.slice(),levels:()=>({...levels})};
  if(window.CCNER_PHASE8) window.CCNER_PHASE8.startSession=start;
})();
