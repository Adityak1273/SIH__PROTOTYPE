/* Cognitive Care NER — Phase 2
 * Online account + cloud sync layer with graceful offline fallback.
 * Caregiver dashboard: activity, performance, trends, game breakdown, reminders and plain-language follow-up flags.
 * Clinical safety rule: product scores are training performance, never diagnosis.
 */
(() => {
  'use strict';
  const C = window.CCNER_CONFIG || {};
  const KEY = {device:'ccner-p2-device',sessionSync:'ccner-p2-session-sync',profile:'ccner-p2-profile'};
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const esc = v => String(v ?? '').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const uid = () => {let id=localStorage.getItem(KEY.device);if(!id){id='device-'+crypto.randomUUID();localStorage.setItem(KEY.device,id)}return id};
  let supabase=null, user=null;
  const localHistory=()=>{try{return JSON.parse(localStorage.getItem('ccner-history')||'[]')}catch(_){return[]}};
  const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
  const dayKey=d=>{const x=new Date(d);return Number.isNaN(x.getTime())?'':x.toISOString().slice(0,10)};
  const daysAgo=n=>{const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-n);return d};
  const sessionDate=s=>new Date(s?.date||s?.started_at||0);
  const completedGames=s=>(s?.results||[]).filter(r=>r&&!r.skipped);
  const trendLabel=change=>change>5?'Improving':change<-5?'Needs a closer look':'Steady';
  const trendClass=change=>change>5?'good':change<-5?'watch':'steady';

  function inject(){
    if($('.p2-account')) return;
    const home=$('#homeView'); if(!home)return;
    const status=document.createElement('div');status.className='p2-status';status.id='p2Status';status.innerHTML='<span class="p2-dot"></span><span>Offline-ready · this device saves your progress</span>';
    const account=document.createElement('section');account.className='p2-account';account.innerHTML='<div class="p2-account-row"><div><strong id="p2AccountTitle">Cloud account</strong><small id="p2AccountSub">Optional sign-in keeps progress available across devices.</small></div><button class="p2-btn" id="p2AccountBtn" type="button">Sign in</button></div>';
    const anchor=home.querySelector('.voice-banner');if(anchor)anchor.insertAdjacentElement('beforebegin',status);home.querySelector('.quick-actions')?.insertAdjacentElement('afterend',account);
    const panel=document.createElement('section');panel.className='p2-panel';panel.id='p2Panel';panel.hidden=true;panel.innerHTML='<div class="p2-sheet"><button class="p2-close" id="p2Close" type="button" aria-label="Close">×</button><div id="p2SheetContent"></div></div>';document.body.appendChild(panel);
    $('#p2Close').onclick=()=>panel.hidden=true;$('#p2AccountBtn').onclick=showAccount;
    window.addEventListener('online',updateStatus);window.addEventListener('offline',updateStatus);updateStatus();
  }
  function updateStatus(){const el=$('#p2Status');if(!el)return;const online=navigator.onLine!==false;el.className='p2-status'+(online?'':' offline');el.innerHTML='<span class="p2-dot"></span><span>'+(online?'Online-ready · local progress is available here too':'Offline · progress will stay on this device until connected')+'</span>'}
  function showAccount(){
    const panel=$('#p2Panel'),box=$('#p2SheetContent');if(!panel||!box)return;panel.hidden=false;
    if(user){box.innerHTML='<h2>Your account</h2><p class="p2-sub">'+esc(user.email||'Signed-in account')+'</p><div class="p2-nav"><button class="p2-btn" id="p2Sync">Sync now</button><button class="p2-btn secondary" id="p2SignOut">Sign out</button></div><p class="p2-note">Your game performance remains training data. It is not a dementia diagnosis.</p>';$('#p2Sync').onclick=syncAll;$('#p2SignOut').onclick=async()=>{await supabase?.auth.signOut();user=null;updateAccount()};return}
    box.innerHTML='<h2>Secure sign-in</h2><p class="p2-sub">Use an email magic link. If cloud authentication is not configured yet, the app continues working offline on this device.</p><form class="p2-form" id="p2Login"><input id="p2Email" type="email" required placeholder="your@email.com" autocomplete="email"/><button class="p2-btn" type="submit">Send magic link</button></form><p id="p2LoginMsg" class="p2-muted"></p>';
    $('#p2Login').onsubmit=async e=>{e.preventDefault();const email=$('#p2Email').value.trim();const msg=$('#p2LoginMsg');try{if(!supabase)throw Error('Cloud authentication is unavailable');const {error}=await supabase.auth.signInWithOtp({email,options:{emailRedirectTo:location.origin+location.pathname}});if(error)throw error;msg.textContent='Magic link sent. Check your email, then return here.'}catch(err){msg.textContent=err.message||'Sign-in is not available yet; local mode remains active.'}};
  }
  function updateAccount(){const title=$('#p2AccountTitle'),sub=$('#p2AccountSub'),btn=$('#p2AccountBtn');if(!title)return;if(user){title.textContent='Cloud account connected';sub.textContent=user.email||'Signed in';btn.textContent='Account'}else{title.textContent='Cloud account';sub.textContent='Optional sign-in keeps progress available across devices.';btn.textContent='Sign in'}}

  function reportData(){
    const h=localHistory().filter(Boolean),cut7=daysAgo(7),cut30=daysAgo(30),recentWindow=h.filter(s=>sessionDate(s)>=cut7),monthWindow=h.filter(s=>sessionDate(s)>=cut30),allGames=[];
    h.forEach(s=>completedGames(s).forEach(r=>allGames.push({...r,sessionDate:s.date})));
    const games={};allGames.forEach(r=>{const k=r.name||'Game';const g=games[k]||={name:k,plays:0,correct:0,scores:[],time:[],mistakes:0,lastDate:null};g.plays++;g.correct+=Number(r.correct||0);g.scores.push(Number(r.score||0));g.time.push(Number(r.seconds||0));g.mistakes+=Number(r.consecutiveMistakes||0);g.lastDate=r.sessionDate});
    const gameRows=Object.values(games).map(g=>({...g,accuracy:g.plays?Math.round(g.correct/g.plays*100):0,avgScore:Math.round(avg(g.scores)),avgTime:avg(g.time),lastDate:g.lastDate})).sort((a,b)=>b.plays-a.plays);
    const latest=h.at(-1),previous=h.at(-2),latestScore=Number(latest?.score||0),previousScore=Number(previous?.score||0),change=latest&&previous?latestScore-previousScore:0,activeDays=new Set(recentWindow.map(s=>dayKey(s.date)).filter(Boolean)).size;
    let tasks=[],reminders=[];try{tasks=JSON.parse(localStorage.getItem('ccner-tasks')||'[]')}catch(_){}try{reminders=JSON.parse(localStorage.getItem('ccner-reminders')||'[]')}catch(_){};
    const pendingTasks=Array.isArray(tasks)?tasks.filter(t=>!t.completed).length:0,activeReminders=Array.isArray(reminders)?reminders.filter(r=>r.enabled!==false).length:0,lastDate=latest?sessionDate(latest):null,daysSince=lastDate&&!Number.isNaN(lastDate.getTime())?Math.max(0,Math.floor((Date.now()-lastDate.getTime())/86400000)):null;
    const flags=[];
    if(!latest)flags.push({kind:'info',title:'No training session yet',text:'No cognitive-game session has been recorded. A completed session will appear here automatically.'});
    else if(daysSince>=7)flags.push({kind:'watch',title:'No recent game session',text:'The last recorded training session was '+daysSince+' days ago. Consider a gentle reminder if a session is part of the person’s routine.'});
    if(latest&&previous&&change<-10)flags.push({kind:'watch',title:'Recent performance changed',text:'The latest overall game score is '+Math.abs(change)+' points lower than the previous session. Review the individual games and activity pattern before drawing conclusions.'});
    if(latest&&previous&&change>10)flags.push({kind:'good',title:'Recent performance improved',text:'The latest overall game score is '+change+' points higher than the previous session.'});
    if(recentWindow.length&&activeDays<2)flags.push({kind:'info',title:'Limited recent activity',text:'There are fewer than two active training days in the last 7 days, so a weekly pattern is not yet strong.'});
    return {h,recentWindow,monthWindow,games:gameRows,latest,previous,latestScore,change,activeDays,pendingTasks,activeReminders,daysSince,flags};
  }
  function formatDate(v){const d=new Date(v);return Number.isNaN(d.getTime())?'—':d.toLocaleDateString(undefined,{day:'2-digit',month:'short',year:'numeric'})}
  function renderFlags(flags){if(!flags.length)return '<div class="p2-alert p2-alert-good"><strong>No follow-up flags</strong><span>No notable activity signal was generated from the available training history.</span></div>';return '<div class="p2-flag-list">'+flags.map(f=>'<div class="p2-alert p2-alert-'+f.kind+'"><strong>'+esc(f.title)+'</strong><span>'+esc(f.text)+'</span></div>').join('')+'</div>'}
  function renderLatest(s){if(!s)return '<p class="p2-muted">No completed session is available yet.</p>';const rs=completedGames(s);return '<div class="p2-latest"><div><span>Date</span><strong>'+esc(formatDate(s.date))+'</strong></div><div><span>Score</span><strong>'+Number(s.score||0)+'%</strong></div><div><span>Accuracy</span><strong>'+Number(s.accuracy||0)+'%</strong></div><div><span>Games</span><strong>'+rs.length+'/5</strong></div></div><div class="p2-table-wrap"><table class="p2-table"><thead><tr><th>Game</th><th>Score</th><th>Time</th><th>Difficulty</th></tr></thead><tbody>'+rs.map(r=>'<tr><td>'+esc(r.name||'Game')+'</td><td>'+Number(r.score||0)+'%</td><td>'+Number(r.seconds||0).toFixed(1)+'s</td><td>'+Number(r.difficulty||s.level||1)+'</td></tr>').join('')+'</tbody></table></div>'}
  function showDashboard(){
    const d=reportData(),panel=$('#p2Panel'),box=$('#p2SheetContent');if(!panel||!box)return;panel.hidden=false;
    box.innerHTML='<div class="p2-dashboard-head"><div><span class="p2-eyebrow">CAREGIVER / HEALTH-WORKER VIEW</span><h2>Care & progress dashboard</h2><p class="p2-sub">Plain-language training activity, progress and follow-up information.</p></div><button class="p2-btn secondary" id="p2Export">Export report</button></div><div class="p2-safety-banner">Training performance only — this dashboard does not diagnose dementia, assign a clinical stage, or replace professional assessment.</div><div id="p2Dash"></div><p class="p2-note">Use these trends to support routines and conversations. Any clinical concern should be assessed by an appropriate health professional.</p>';
    $('#p2Export').onclick=()=>exportReport(reportData());
    const el=$('#p2Dash');
    const nav=tab=>'<div class="p2-nav p2-dashboard-tabs">'+[['overview','Overview'],['activity','Activity'],['games','Games'],['followup','Follow-up']].map(([k,v])=>'<button data-tab="'+k+'" class="'+(tab===k?'active':'')+'">'+v+'</button>').join('')+'</div>';
    const render=tab=>{
      if(tab==='overview'){
        const change=d.change,label=change>5?'Improving':change<-5?'Needs a closer look':'Steady',cls=change>5?'good':change<-5?'watch':'steady';
        el.innerHTML=nav(tab)+'<div class="p2-grid p2-kpi-grid"><article class="p2-card"><span>Sessions recorded</span><strong>'+d.h.length+'</strong><small>All available history</small></article><article class="p2-card"><span>Active days · 7 days</span><strong>'+d.activeDays+'</strong><small>Days with a completed session</small></article><article class="p2-card"><span>Latest score</span><strong>'+d.latestScore+'%</strong><small>Overall training score</small></article><article class="p2-card"><span>Recent trend</span><strong class="p2-trend '+cls+'">'+label+'</strong><small>'+(d.previous?'Change vs previous: '+(change>0?'+':'')+change+' pts':'Need another session to compare')+'</small></article></div><div class="p2-section-title">Recent follow-up signals</div>'+renderFlags(d.flags)+'<div class="p2-section-title">Latest session</div>'+renderLatest(d.latest);
      }else if(tab==='activity'){
        const rows=d.recentWindow.slice().reverse();
        el.innerHTML=nav(tab)+'<div class="p2-grid"><article class="p2-card"><span>7-day sessions</span><strong>'+d.recentWindow.length+'</strong></article><article class="p2-card"><span>30-day sessions</span><strong>'+d.monthWindow.length+'</strong></article><article class="p2-card"><span>Pending daily tasks</span><strong>'+d.pendingTasks+'</strong></article><article class="p2-card"><span>Active reminders</span><strong>'+d.activeReminders+'</strong></article></div><div class="p2-section-title">Recent activity</div>'+(rows.length?'<div class="p2-table-wrap"><table class="p2-table"><thead><tr><th>Date</th><th>Score</th><th>Games</th><th>Level</th></tr></thead><tbody>'+rows.map(s=>'<tr><td>'+esc(formatDate(s.date))+'</td><td><span class="p2-badge">'+Number(s.score||0)+'%</span></td><td>'+completedGames(s).length+'/5</td><td>'+Number(s.level||1)+'</td></tr>').join('')+'</tbody></table></div>':'<p class="p2-muted">No recent activity recorded.</p>');
      }else if(tab==='games'){
        el.innerHTML=nav(tab)+'<div class="p2-section-title">Game-by-game performance</div>'+(d.games.length?'<div class="p2-game-list">'+d.games.map(g=>'<article class="p2-card p2-game-card"><div class="p2-game-row"><div><strong>'+esc(g.name)+'</strong><small>'+g.plays+' completed play'+(g.plays===1?'':'s')+' · last '+esc(formatDate(g.lastDate))+'</small></div><strong>'+g.avgScore+'%</strong></div><div class="p2-bar"><i style="width:'+Math.max(0,Math.min(100,g.avgScore))+'%"></i></div><div class="p2-game-meta"><span>Correct sessions: '+g.accuracy+'%</span><span>Avg time: '+g.avgTime.toFixed(1)+'s</span><span>Mistakes: '+g.mistakes+'</span></div></article>').join('')+'</div>':'<p class="p2-muted">Complete a session to see game-level trends.</p>');
      }else{
        el.innerHTML=nav(tab)+'<div class="p2-section-title">Caregiver action guide</div>'+renderFlags(d.flags)+'<div class="p2-grid"><article class="p2-card p2-wide"><span>What to review</span><strong>Look for changes across several sessions, individual games and activity patterns rather than relying on one score.</strong></article><article class="p2-card"><span>Routine support</span><strong>'+d.activeReminders+'</strong><small>Active reminders configured</small></article><article class="p2-card"><span>Daily tasks</span><strong>'+d.pendingTasks+'</strong><small>Currently incomplete on this device</small></article></div><div class="p2-section-title">Latest session details</div>'+renderLatest(d.latest);
      }
      $$('.p2-dashboard-tabs button').forEach(b=>b.onclick=()=>render(b.dataset.tab));
    };
    render('overview');
  }
  function exportReport(d){const payload={generatedAt:new Date().toISOString(),notice:'Training performance only. Not a diagnosis or clinical staging tool.',summary:{sessions:d.h.length,activeDays7:d.activeDays,latestScore:d.latestScore,recentChangePoints:d.change},flags:d.flags,gamePerformance:d.games,activity:d.recentWindow.map(s=>({date:s.date,score:s.score,accuracy:s.accuracy,games:completedGames(s).length,level:s.level}))};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='cognitive-care-ner-caregiver-report.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),500)}

  async function loadSupabase(){
    if(!C.SUPABASE_URL||!C.SUPABASE_ANON_KEY)return;
    try{const mod=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');supabase=mod.createClient(C.SUPABASE_URL,C.SUPABASE_ANON_KEY);const {data}=await supabase.auth.getSession();user=data?.session?.user||null;supabase.auth.onAuthStateChange((_e,s)=>{user=s?.user||null;updateAccount();if(user)syncAll()});updateAccount();if(user)syncAll()}catch(_){/* offline or CDN unavailable; local mode is intentional */}
  }
  async function syncAll(){
    if(!supabase||!user)return false;const h=localHistory();if(!h.length)return true;
    try{const syncedKeys=new Set(JSON.parse(localStorage.getItem('ccner-p2-synced-keys')||'[]'));for(const s of h){const sKey=String(s.date||s.started_at||'');if(!sKey||syncedKeys.has(sKey))continue;const {data:session,error}=await supabase.from('cognitive_sessions').insert({user_id:user.id,started_at:s.date,completed_at:s.date,score:Number(s.score||0),accuracy:Number(s.accuracy||0),adaptive_level:Number(s.level||1),metadata:{device:uid(),source:'phase2',client_session_key:sKey}}).select('id').single();if(error)throw error;const rows=(s.results||[]).map(r=>({session_id:session.id,user_id:user.id,game_name:r.name,category:r.name,score:Number(r.score||0),correct:Number(r.correct||0)>0,response_time_ms:Math.round(Number(r.seconds||0)*1000),metadata:{source:'phase2'}}));if(rows.length){const {error:e2}=await supabase.from('game_results').insert(rows);if(e2)throw e2}syncedKeys.add(sKey)}localStorage.setItem('ccner-p2-synced-keys',JSON.stringify([...syncedKeys]));localStorage.setItem(KEY.sessionSync,new Date().toISOString());return true}catch(_){return false}
  }
  function addDashboardLauncher(){if($('.p2-dashboard-launch'))return;const home=$('#homeView');if(!home)return;const b=document.createElement('button');b.className='p2-btn p2-dashboard-launch';b.type='button';b.textContent='📊 Open caregiver dashboard';b.onclick=()=>{if(window.CCNERRuleEngine?.state().role!=='caregiver'&&window.CCNERRuleEngine?.state().role!=='health_worker')return showDashboard();showDashboard()};home.querySelector('.home-strip')?.insertAdjacentElement('afterend',b)}
  window.CCNERPhase2={showDashboard,showAccount,syncAll,getUser:()=>user};
  function boot(){inject();addDashboardLauncher();loadSupabase()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
