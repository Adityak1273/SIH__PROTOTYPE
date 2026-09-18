/* Cognitive Care NER — deterministic application rule engine.
 * Central policy layer: EVENT -> RULES -> ACTIONS -> STATE -> AUDIT.
 * AI may converse, but safety, navigation, adaptation guards, accessibility,
 * sync semantics, and other critical behavior remain deterministic.
 */
(function(){
  'use strict';
  if(window.CCNERRuleEngine)return;

  const VERSION='1.0.0';
  const listeners=new Map();
  const audit=[];
  const state={
    screen:'homeView',
    auth:'unknown',
    profileComplete:false,
    role:'patient',
    game:'idle',
    voice:'idle',
    network:navigator.onLine===false?'offline':'online',
    fatigue:0,
    consecutiveFailures:0,
    consecutiveSuccesses:0
  };

  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  const now=()=>new Date().toISOString();
  const record=(event,decision)=>{
    const item={ts:now(),event,decision};
    audit.push(item);
    if(audit.length>100) audit.shift();
    window.dispatchEvent(new CustomEvent('ccner:rule-audit',{detail:item}));
    return decision;
  };
  const on=(event,fn)=>{
    if(!listeners.has(event))listeners.set(event,[]);
    listeners.get(event).push(fn);
    return()=>listeners.set(event,(listeners.get(event)||[]).filter(x=>x!==fn));
  };
  const emit=(event,payload={})=>{
    const handlers=listeners.get(event)||[];
    const results=handlers.map(fn=>{try{return fn(payload,state)}catch(error){return {error:String(error?.message||error)}}});
    window.dispatchEvent(new CustomEvent('ccner:rule-event',{detail:{event,payload,results}}));
    return results;
  };

  function evaluate(event,payload={}){
    switch(event){
      case 'AUTH_SUCCESS':
        return record(event,payload.profileComplete===false
          ?{route:'profile',reason:'PROFILE_INCOMPLETE'}
          :{route:payload.role==='caregiver'?'caregiver':payload.role==='admin'?'admin':'home'});
      case 'AUTH_FAILURE':
        return record(event,{route:'login',retry:true});
      case 'GAME_RESULT':{
        const accuracy=clamp(Number(payload.accuracy||0),0,1);
        const responseTime=Math.max(0,Number(payload.responseTime||0));
        const skipped=Boolean(payload.skipped);
        const failures=Number(payload.consecutiveFailures||0);
        const successes=Number(payload.consecutiveSuccesses||0);
        const fatigue=clamp(Number(payload.fatigue||0),0,1);
        if(fatigue>=.8)return record(event,{difficulty:'maintain',action:'offer_break',reason:'FATIGUE'});
        if(failures>=3||accuracy<.5)return record(event,{difficulty:'decrease',action:'encourage'});
        if(successes>=3&&accuracy>=.85&&responseTime>0)return record(event,{difficulty:'increase',action:'encourage'});
        if(skipped)return record(event,{difficulty:'maintain',action:'simplify_next_instruction'});
        return record(event,{difficulty:'maintain',action:'encourage'});
      }
      case 'VOICE_REQUEST':
        if(state.game==='running')return record(event,{allowed:false,reason:'GAME_ACTIVE',action:'use_explicit_wake'});
        return record(event,{allowed:true,action:'listen'});
      case 'NETWORK_CHANGE':
        return record(event,{mode:payload.online===false?'offline':'online',action:payload.online===false?'queue_local':'retry_sync'});
      case 'REMINDER_DUE':
        return record(event,{action:'show_reminder',priority:['urgent','important','normal','low'].includes(payload.priority)?payload.priority:'normal'});
      case 'SAFETY_SIGNAL':
        return record(event,{action:'show_safety_flow',allowAiAutonomy:false});
      default:
        return record(event,{action:'observe'});
    }
  }

  function setState(patch){
    Object.assign(state,patch||{});
    window.dispatchEvent(new CustomEvent('ccner:state-change',{detail:{...state}}));
    return {...state};
  }

  // State-machine guards. Critical transitions are rejected rather than guessed.
  const transitions={
    game:{idle:['ready'],ready:['running','idle'],running:['paused','completed','exited','interrupted'],paused:['running','exited','interrupted'],completed:['idle'],exited:['idle'],interrupted:['idle']},
    voice:{idle:['listening','disabled'],listening:['processing','idle','error'],processing:['speaking','idle','error'],speaking:['idle','listening','error'],error:['idle','listening'],disabled:['idle']},
    auth:{unknown:['authenticated','unauthenticated'],unauthenticated:['authenticated'],authenticated:['unauthenticated']}
  };
  function transition(machine,to){
    const from=state[machine];
    if(!transitions[machine]?.[from]?.includes(to))return record('INVALID_TRANSITION',{machine,from,to,allowed:false});
    setState({[machine]:to});
    return record('STATE_TRANSITION',{machine,from,to,allowed:true});
  }

  function difficulty(input={}){
    const current=clamp(Number(input.current||1),1,5);
    const accuracy=clamp(Number(input.accuracy||0),0,1);
    const failures=Math.max(0,Number(input.consecutiveFailures||0));
    const successes=Math.max(0,Number(input.consecutiveSuccesses||0));
    const fatigue=clamp(Number(input.fatigue||0),0,1);
    if(fatigue>=.8||failures>=3||accuracy<.5)return current>1?current-1:1;
    if(successes>=3&&accuracy>=.85&&fatigue<.5)return current<5?current+1:5;
    return current;
  }

  // Deterministic fatigue heuristic; never presented as a medical measure.
  function calculateFatigue(input={}){
    const duration=clamp(Number(input.sessionMinutes||0)/45,0,1);
    const slow=clamp(Number(input.responseTrend||0),0,1);
    const mistakes=clamp(Number(input.mistakes||0)/5,0,1);
    const skips=clamp(Number(input.skips||0)/3,0,1);
    const explicit=input.tired===true?1:0;
    return Number((duration*.25+slow*.2+mistakes*.2+skips*.15+explicit*.2).toFixed(3));
  }

  on('GAME_RESULT',p=>{
    const failures=p.correct?0:state.consecutiveFailures+1;
    const successes=p.correct?state.consecutiveSuccesses+1:0;
    const fatigue=calculateFatigue(p);
    setState({consecutiveFailures:failures,consecutiveSuccesses:successes,fatigue});
  });
  on('NETWORK_CHANGE',p=>setState({network:p.online===false?'offline':'online'}));

  window.addEventListener('online',()=>emit('NETWORK_CHANGE',{online:true}));
  window.addEventListener('offline',()=>emit('NETWORK_CHANGE',{online:false}));

  window.CCNERRuleEngine={
    version:VERSION,state:()=>({...state}),on,emit,evaluate,setState,transition,difficulty,calculateFatigue,
    audit:()=>audit.slice(),clearAudit:()=>audit.splice(0,audit.length)
  };
})();
