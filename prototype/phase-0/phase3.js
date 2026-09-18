/* Cognitive Care NER — Phase 3
 * Adaptive personalization + expressive Momo behavior.
 * AI may personalize training; deterministic games remain the source of truth for correctness.
 * Never diagnose or map game scores to dementia stages.
 */
(() => {
  'use strict';
  const KEY='ccner-p3-profile';
  const $=s=>document.querySelector(s);
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch(_){return{}}};
  const state=Object.assign({level:2,streak:0,lastTone:'encourage',preferredGames:[],sessions:0},read());
  const save=()=>localStorage.setItem(KEY,JSON.stringify(state));
  const history=()=>{try{return JSON.parse(localStorage.getItem('ccner-history')||'[]')}catch(_){return[]}};
  const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
  function difficulty(){const h=history().slice(-5);if(!h.length)return 2;const s=avg(h.map(x=>Number(x.score||0)));return s>=85?Math.min(5,state.level+1):s<60?Math.max(1,state.level-1):state.level}
  function recalculate(){state.level=difficulty();const h=history();state.sessions=h.length;state.streak=0;for(let i=h.length-1;i>=0;i--){if(Number(h[i].score||0)>=60)state.streak++;else break}save();return state}
  function companion(){return window.MomoAvatar||null}
  function mood(m){const rig=$('#momoRig');if(rig)rig.dataset.mood=m;companion()?.setMood?.(m);}
  function react(type){companion()?.react?.(type)}
  function installEvents(){
    document.addEventListener('click',e=>{const b=e.target.closest('[data-action="start"]');if(b){mood('excited');react('welcome')}});
    const stage=$('#stage');if(stage){new MutationObserver(()=>{const m=[...stage.classList].find(x=>x.startsWith('mood-'))?.replace('mood-','');if(m)mood(m)}).observe(stage,{attributes:true,attributeFilter:['class']})}
  }
  function buildPanel(){
    if($('#p3Panel'))return;const home=$('#homeView');if(!home)return;
    const panel=document.createElement('section');panel.className='p3-panel';panel.id='p3Panel';panel.innerHTML='<div class="p3-row"><div><strong>Personal AI training</strong><div class="p3-muted">Momo adjusts practice gently from your recent training performance.</div></div><span class="p3-chip">Level <b id="p3Level">2</b>/5</span></div><div class="p3-meter"><i id="p3Meter" style="width:40%"></i></div><div class="p3-grid"><article class="p3-card"><span>Training sessions</span><strong id="p3Sessions">0</strong></article><article class="p3-card"><span>Good-session streak</span><strong id="p3Streak">0</strong></article></div><div class="p3-actions"><button class="p3-btn primary" id="p3Plan">Build my next session</button><button class="p3-btn secondary" id="p3Why">Why this level?</button></div><div id="p3Reco" class="p3-reco" hidden></div>';
    home.querySelector('.home-strip')?.insertAdjacentElement('afterend',panel);$('#p3Plan').onclick=makePlan;$('#p3Why').onclick=explain;refresh();
  }
  function refresh(){recalculate();$('#p3Level').textContent=state.level;$('#p3Meter').style.width=(state.level*20)+'%';$('#p3Sessions').textContent=state.sessions;$('#p3Streak').textContent=state.streak}
  function makePlan(){
    refresh();const l=state.level;const plan=l>=4?'A slightly more challenging mix: more objects, longer patterns, and quicker choices.':l<=2?'A calm mix: familiar objects, shorter sequences, and extra thinking time.':'A balanced mix: familiar objects with moderate sequence and pattern difficulty.';const box=$('#p3Reco');box.hidden=false;box.innerHTML='<strong>🐾 Momo’s next-session plan</strong><span>'+plan+'</span><ul class="p3-list"><li>Keep familiar/local objects prominent.</li><li>Increase or reduce difficulty gradually.</li><li>Pause when the user seems tired or frustrated.</li></ul><small class="p3-muted p3-small">This is a training-personalization recommendation, not a medical assessment.</small>';mood('happy');react('encourage')}
  function explain(){const box=$('#p3Reco');box.hidden=false;box.innerHTML='<strong>Why level '+state.level+'?</strong><span>Momo uses recent training performance to choose a gentler or more challenging practice level. A low result does not mean dementia, and a high result does not rule it out.</span>';mood('thinking');react('thinking')}
  function onGameResult(e){const d=e.detail||{};if(d.correct===false){mood('encourage');react('incorrect')}else if(d.correct===true){mood('happy');react('correct')}}
  function patchSpeech(){const original=window.speak;if(typeof original!=='function')return;window.speak=function(text,...args){mood('speaking');return original.call(this,text,...args)}}
  function boot(){buildPanel();installEvents();window.addEventListener('ccner:game-result',onGameResult);setTimeout(()=>{refresh();makePlan()},800);}
  window.CCNERPhase3={getState:()=>({...state}),recalculate,makePlan,explain,setMood:mood};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
