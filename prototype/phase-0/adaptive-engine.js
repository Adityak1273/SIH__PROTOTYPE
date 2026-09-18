/* Cognitive Care NER — Online ML Adaptive Difficulty Engine
 * Lightweight on-device logistic player model. It learns from gameplay performance
 * and selects the next difficulty for each game. It personalizes training only;
 * it never diagnoses or infers a clinical condition.
 */
(function(){
  'use strict';
  const KEY='ccner-adaptive-ml-v1';
  const MIN=1, MAX=5, TARGET=.72;
  const GAME_DEFAULTS={sequence:1,local:1,find:1,pattern:1,memory:1};
  const clamp=(n,a=MIN,b=MAX)=>Math.max(a,Math.min(b,n));
  const sigmoid=x=>1/(1+Math.exp(-Math.max(-8,Math.min(8,x))));
  const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
  function load(){try{const x=JSON.parse(localStorage.getItem(KEY)||'{}');return x&&typeof x==='object'?x:{}}catch(_){return{}}}
  const db=load();db.games=db.games&&typeof db.games==='object'?db.games:{};
  function gameModel(key){
    if(!db.games[key]) db.games[key]={level:2,attempts:0,history:[],weights:[-0.4,1.1,0.35,0.55,-0.45]};
    return db.games[key];
  }
  function save(){try{localStorage.setItem(KEY,JSON.stringify(db))}catch(_){}
  }
  // Features: bias, performance, response-speed, stability, current difficulty.
  function vector(x){return [1,Number(x.performance||0),Number(x.speed||0),Number(x.stability||0),Number(x.difficulty||0)];}
  function predict(key,features){
    const m=gameModel(key),w=m.weights||[-.4,1.1,.35,.55,-.45];
    return sigmoid(w.reduce((s,v,i)=>s+v*(features[i]||0),0));
  }
  function train(key,features,label){
    const m=gameModel(key),w=m.weights||[-.4,1.1,.35,.55,-.45];
    const p=predict(key,features),err=label-p,lr=.14;
    for(let i=0;i<w.length;i++)w[i]+=lr*err*(features[i]||0);
    m.weights=w;m.attempts=(m.attempts||0)+1;
  }
  function normalizeResult(result){
    const score=clamp(Number(result?.score||0),0,100)/100;
    const total=Math.max(1,Number(result?.totalItems||result?.rounds||1));
    const correct=Math.max(0,Number(result?.correctItems||result?.correctRounds||0));
    const accuracy=result?.totalItems?clamp(correct/total,0,1):score;
    const seconds=Math.max(.1,Number(result?.seconds||0));
    const expected=Math.max(3,total*2.4);
    const speed=clamp(1-(seconds/Math.max(expected,seconds)),0,1);
    const misses=Math.max(0,Number(result?.consecutiveMistakes||0));
    const stability=clamp(1-misses/3,0,1);
    const performance=clamp(score*.55+accuracy*.45,0,1);
    return {performance,speed,stability,difficulty:clamp(Number(result?.difficulty||result?.level||2)/5,0,1)};
  }
  function observe(key,result){
    if(!key||!result||result.__adaptiveObserved)return;
    result.__adaptiveObserved=true;
    const m=gameModel(key),f=normalizeResult(result),features=vector(f);
    // The learner predicts whether the player is in the desired challenge zone.
    const label=f.performance>=TARGET?1:0;
    train(key,features,label);
    const p=predict(key,features),current=clamp(Number(m.level)||2);
    let next=current;
    if(p>=.82 && f.performance>=.78)next=current+1;
    else if(p<=.50 || f.performance<.50)next=current-1;
    else if(f.performance>=.90 && f.stability>=.8)next=current+1;
    next=clamp(next);
    m.level=next;m.lastPrediction=Number(p.toFixed(3));m.lastPerformance=Number(f.performance.toFixed(3));
    m.lastDecision=next>current?'increase':next<current?'decrease':'maintain';
    m.history=(m.history||[]).concat([{ts:Date.now(),score:Number(result.score||0),performance:Number(f.performance.toFixed(3)),prediction:Number(p.toFixed(3)),from:current,to:next}]).slice(-30);
    save();
  }
  function choose(key){
    const m=gameModel(key),h=m.history||[];
    if(!h.length)return clamp(m.level||2);
    const recent=h.slice(-3),trend=mean(recent.map(x=>Number(x.performance||0))),pred=Number(m.lastPrediction||0);
    if(trend>=.88&&pred>=.82)m.level=clamp(Number(m.level||2)+1);
    else if(trend<.50)m.level=clamp(Number(m.level||2)-1);
    save();return clamp(m.level||2);
  }
  function setForGame(key){const level=choose(key);if(typeof state!=='undefined')state.level=level;return level;}
  function status(){
    const out={};Object.keys(GAME_DEFAULTS).forEach(k=>{const m=gameModel(k);out[k]={level:m.level,attempts:m.attempts||0,lastPrediction:m.lastPrediction||null,lastDecision:m.lastDecision||'initial',lastPerformance:m.lastPerformance||null}});return out;
  }
  function summary(key){const m=gameModel(key);return {game:key,level:m.level,attempts:m.attempts||0,predictedSuccess:m.lastPrediction||null,decision:m.lastDecision||'initial'};}
  window.CCNERAdaptive={choose,setForGame,observe,predict,status,summary,getTarget:()=>TARGET,reset(){try{localStorage.removeItem(KEY)}catch(_){}location.reload()}};
  function install(){
    if(typeof state==='undefined'||typeof loadGame!=='function')return false;
    if(window.__ccnerAdaptiveInstalled)return true;window.__ccnerAdaptiveInstalled=true;
    const originalLoad=window.loadGame;
    window.loadGame=function(){const key=state.games?.[state.index];if(key)window.CCNERAdaptive.setForGame(key);return originalLoad.apply(this,arguments)};
    const originalFinish=window.finishSession;
    if(typeof originalFinish==='function')window.finishSession=function(){const last=state.results?.[state.results.length-1];if(last?.key)window.CCNERAdaptive.observe(last.key,last);return originalFinish.apply(this,arguments)};
    let seen=0;
    setInterval(()=>{const results=state.results||[];while(seen<results.length){const r=results[seen++];if(r?.key)window.CCNERAdaptive.observe(r.key,r)}},150);
    return true;
  }
  const boot=()=>{const t=setInterval(()=>{if(install())clearInterval(t)},50);setTimeout(()=>clearInterval(t),10000)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();