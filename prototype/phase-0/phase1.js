/*
 * Cognitive Care NER — Phase 1 application layer
 *
 * This file is deliberately separate from app.js. It adds persistent, modular
 * product features without coupling the game mechanics to dashboards/reminders.
 * All state is local-first for the demo; a future Supabase adapter can consume
 * the same records and sync queue.
 */
(() => {
  'use strict';

  const KEY = {
    profile: 'ccner-p1-profile',
    reminders: 'ccner-p1-reminders',
    tasks: 'ccner-p1-tasks',
    sync: 'ccner-p1-sync',
    language: 'ccner-p1-language'
  };
  const read = (key, fallback) => { try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch (_) { return fallback; } };
  const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (_) { return false; } };
  const esc = (v) => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const now = () => new Date();
  const uid = (prefix='id') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;

  const profile = Object.assign({name:'', preferredLanguage:'en-IN', caregiverName:'', caregiverCode:'DEMO-001'}, read(KEY.profile, {}));
  let reminders = Array.isArray(read(KEY.reminders, [])) ? read(KEY.reminders, []) : [];
  let tasks = Array.isArray(read(KEY.tasks, [])) ? read(KEY.tasks, []) : [];
  let syncQueue = Array.isArray(read(KEY.sync, [])) ? read(KEY.sync, []) : [];
  let language = localStorage.getItem(KEY.language) || profile.preferredLanguage || 'en-IN';

  const langNames = {'en-IN':'English (India)','hi-IN':'हिन्दी','bn-IN':'বাংলা','as-IN':'অসমীয়া'};
  const translations = {
    'en-IN': {welcome:'Hello! I’m Momo. Shall we take today one small step at a time?',today:'Today',progress:'Progress',reminders:'Reminders',settings:'Settings',caregiver:'Caregiver dashboard',save:'Save',close:'Close'},
    'hi-IN': {welcome:'नमस्ते! मैं मोमो हूँ। आज हम एक छोटा कदम साथ में उठाएँ?',today:'आज',progress:'प्रगति',reminders:'रिमाइंडर',settings:'सेटिंग्स',caregiver:'देखभालकर्ता डैशबोर्ड',save:'सहेजें',close:'बंद करें'},
    'bn-IN': {welcome:'নমস্কার! আমি মোমো। আজ আমরা একসাথে একটি ছোট পদক্ষেপ নেব?',today:'আজ',progress:'অগ্রগতি',reminders:'রিমাইন্ডার',settings:'সেটিংস',caregiver:'কেয়ারগিভার ড্যাশবোর্ড',save:'সংরক্ষণ',close:'বন্ধ'},
    'as-IN': {welcome:'নমস্কাৰ! মই মোমো। আজি আমি একেলগে এটা সৰু খোজ লওঁ আহক?',today:'আজি',progress:'অগ্ৰগতি',reminders:'সোঁৱৰনী',settings:'ছেটিংছ',caregiver:'কেয়াৰগিভাৰ ডেশ্বব’ৰ্ড',save:'সংৰক্ষণ',close:'বন্ধ'}
  };

  function queueSync(type, payload) {
    syncQueue.push({id:uid('sync'), type, payload, createdAt:now().toISOString(), status:'pending'});
    syncQueue = syncQueue.slice(-100);
    write(KEY.sync, syncQueue);
    updateSyncBadge();
  }
  function updateSyncBadge(){
    const el = document.querySelector('#p1-sync-status'); if(!el) return;
    const online = navigator.onLine !== false;
    el.className = `p1-status${online && !syncQueue.some(x=>x.status==='pending')?'':' offline'}`;
    el.innerHTML = `<span class="p1-dot"></span>${online ? (syncQueue.some(x=>x.status==='pending') ? `${syncQueue.filter(x=>x.status==='pending').length} changes waiting to sync` : 'Online · all changes saved') : 'Offline · changes saved on this device'}`;
  }
  function markQueueSynced(){
    if(!navigator.onLine) return;
    if(!syncQueue.some(x=>x.status==='pending')) return;
    syncQueue = syncQueue.map(x=>({...x,status:'synced',syncedAt:now().toISOString()})).slice(-100);
    write(KEY.sync,syncQueue); updateSyncBadge();
  }
  window.addEventListener('online', markQueueSynced); window.addEventListener('offline', updateSyncBadge);

  function average(arr){ return arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0; }
  function sessions(){ return Array.isArray(window.state?.history) ? window.state.history : read('ccner-history', []); }
  function lastNDays(n){ const cut=Date.now()-n*86400000; return sessions().filter(s=>new Date(s.date).getTime()>=cut); }
  function trend(values){ if(values.length<2)return 'Not enough sessions for a trend yet.'; const a=values.slice(0,-1), prev=average(a), latest=values.at(-1); if(latest>prev+3)return 'Your latest session is trending upward.'; if(latest<prev-3)return 'Your latest session was lower than the recent average. A calm repeat may help.'; return 'Your recent performance is broadly steady.'; }

  function gameStats(){
    const map={};
    sessions().forEach(s => (s.results||[]).forEach(r => { const k=r.name||'Game'; const m=map[k] ||= {name:k,plays:0,correct:0,seconds:[]}; m.plays++; m.correct+=Number(r.correct||0); m.seconds.push(Number(r.seconds||0)); }));
    return Object.values(map).map(x=>({...x,accuracy:x.plays?x.correct/x.plays:0,avgTime:average(x.seconds)})).sort((a,b)=>b.plays-a.plays);
  }

  function addLauncher(){
    if(document.querySelector('.p1-launcher')) return;
    const el=document.createElement('div'); el.className='p1-launcher';
    el.innerHTML=`<button class="p1-chip" data-p1="report">📊 Weekly report</button><button class="p1-chip" data-p1="caregiver">👨‍👩‍👧 Caregiver</button><button class="p1-chip" data-p1="reminders">⏰ Reminders</button>`;
    document.body.appendChild(el);
  }

  function addDrawer(){
    if(document.querySelector('.p1-drawer')) return;
    const el=document.createElement('section'); el.className='p1-drawer'; el.hidden=true; el.id='p1Drawer';
    el.innerHTML=`<div class="p1-panel"><button class="p1-close" id="p1Close" aria-label="Close">×</button><div id="p1Content"></div></div>`;
    document.body.appendChild(el);
    $('#p1Close')?.addEventListener('click',closePanel); el.addEventListener('click',e=>{if(e.target===el)closePanel()});
  }
  const $ = (s) => document.querySelector(s);
  function openPanel(kind){ addDrawer(); const c=$('#p1Content'), d=$('#p1Drawer'); if(!c||!d)return; d.hidden=false; c.innerHTML=renderPanel(kind); bindPanel(kind); }
  function closePanel(){ const d=$('#p1Drawer'); if(d)d.hidden=true; }

  function renderPanel(kind){
    if(kind==='reminders') return renderReminders();
    if(kind==='caregiver') return renderCaregiver();
    if(kind==='settings') return renderSettings();
    return renderReport(kind==='monthly' ? 30 : 7);
  }

  function renderReport(days){
    const ss=lastNDays(days), vals=ss.map(s=>Number(s.score||0)), acc=ss.map(s=>Number(s.accuracy||0));
    const best=ss.length?Math.max(...vals):0, avgScore=Math.round(average(vals)), avgAcc=Math.round(average(acc)*100), avgTime=average(ss.map(s=>Number(s.avgTime||0)));
    const chart=ss.slice(-7).map((s,i)=>`<div class="p1-bar-col"><i style="height:${Math.max(4,Math.round(Number(s.score||0)*.8))}px"></i><span>${new Date(s.date).toLocaleDateString([], {weekday:'short'})}</span></div>`).join('');
    const gs=gameStats().slice(0,6).map(g=>`<div class="p1-row"><div class="p1-row-main"><div class="p1-row-title">${esc(g.name)}</div><div class="p1-row-sub">${g.plays} plays · ${Math.round(g.accuracy*100)}% accuracy · ${g.avgTime.toFixed(1)}s avg</div></div><strong>${Math.round(g.accuracy*100)}%</strong></div>`).join('') || '<p class="p1-muted">Complete a session to build game-level history.</p>';
    return `<p class="eyebrow">COGNITIVE CARE NER · PHASE 1</p><h2>${days===30?'Monthly':'Weekly'} progress report</h2><p class="p1-muted">Training performance only — this report does not diagnose dementia or replace a clinician assessment.</p>
      <div class="p1-grid"><div class="p1-card"><span>Sessions</span><strong>${ss.length}</strong></div><div class="p1-card"><span>Average score</span><strong>${avgScore}%</strong></div><div class="p1-card"><span>Average accuracy</span><strong>${avgAcc}%</strong></div><div class="p1-card"><span>Best score</span><strong>${best}%</strong></div></div>
      <div class="p1-report"><h3>Recent sessions</h3><div class="p1-mini-chart">${chart || '<p class="p1-muted">No sessions yet.</p>'}</div><div class="p1-insight">${esc(trend(vals))} ${avgTime ? `Average response time is ${avgTime.toFixed(1)} seconds.` : ''}</div></div>
      <div class="p1-report"><h3>Game-by-game picture</h3>${gs}</div>
      <div class="p1-actions"><button class="p1-btn" data-p1="monthly">View monthly</button><button class="p1-btn" data-p1="export">Export report</button></div>`;
  }

  function renderCaregiver(){
    const ss=sessions(), last=ss.at(-1), week=lastNDays(7), adherence=tasks.length?Math.round(tasks.filter(t=>t.completed).length/tasks.length*100):0;
    const sessionsText=last?`${Math.round(last.score||0)}% score · ${Math.round((last.accuracy||0)*100)}% accuracy`:'No session completed yet';
    const flags=[];
    if(last && Number(last.accuracy||0)<.6) flags.push('Latest session accuracy was below 60%. Consider a gentle repeat, rest, and observation rather than a conclusion.');
    if(!last) flags.push('No cognitive-training session recorded yet.');
    if(!navigator.onLine) flags.push('Device is offline. Local changes are queued for later synchronization.');
    return `<p class="eyebrow">CAREGIVER / HEALTH WORKER</p><h2>${esc(profile.name||'Participant')} dashboard</h2><p class="p1-muted">A monitoring view for training activity, routines and reminders. It is not a diagnostic dashboard.</p>
      <div class="p1-grid"><div class="p1-card"><span>Latest session</span><strong>${last?Math.round(last.score||0)+'%':'—'}</strong><div class="p1-row-sub">${esc(sessionsText)}</div></div><div class="p1-card"><span>7-day sessions</span><strong>${week.length}</strong></div><div class="p1-card"><span>Task adherence</span><strong>${adherence}%</strong></div><div class="p1-card"><span>Pending sync</span><strong>${syncQueue.filter(x=>x.status==='pending').length}</strong></div></div>
      <div class="p1-report"><h3>What needs attention?</h3>${flags.length?flags.map(x=>`<div class="p1-insight">${esc(x)}</div>`).join(''):'<div class="p1-insight">No immediate demo alerts. Keep routines calm and consistent.</div>'}</div>
      <div class="p1-report"><h3>Today’s routine</h3>${renderTaskRows(true)}</div>
      <div class="p1-report"><h3>Recent reminders</h3>${renderReminderRows(true)}</div>
      <div class="p1-actions"><button class="p1-btn primary" data-p1="report">Open report</button><button class="p1-btn" data-p1="export">Export data</button></div>`;
  }

  function renderReminders(){
    const rows=renderReminderRows(false);
    return `<p class="eyebrow">DAILY SUPPORT</p><h2>Reminders & routine</h2><p class="p1-muted">These demo reminders are stored locally on this device. A production build can connect them to Supabase and device notifications.</p>
      <div class="p1-report"><h3>Add a reminder</h3><form class="p1-form" id="p1ReminderForm"><label>Reminder <input name="title" required placeholder="Medicine, water, appointment…"></label><label>Time <input name="time" type="time" required></label><label>Repeat <select name="repeat"><option value="daily">Every day</option><option value="once">Once</option></select></label><div class="p1-actions"><button class="p1-btn primary" type="submit">Add reminder</button></div></form></div>
      <div class="p1-report"><h3>Reminders</h3>${rows}</div>
      <div class="p1-report"><h3>Today’s tasks</h3><form class="p1-form" id="p1TaskForm"><label>Task <input name="title" required placeholder="Drink water, walk, call family…"></label><div class="p1-actions"><button class="p1-btn primary" type="submit">Add task</button></div></form>${renderTaskRows(false)}</div>`;
  }

  function renderReminderRows(compact){
    if(!reminders.length) return '<p class="p1-muted">No reminders yet.</p>';
    return reminders.slice().sort((a,b)=>String(a.time).localeCompare(String(b.time))).map(r=>`<div class="p1-row"><div class="p1-row-main"><div class="p1-row-title">${esc(r.title)}</div><div class="p1-row-sub">${esc(r.time)} · ${r.repeat==='daily'?'Daily':'Once'}</div></div>${compact?'':`<button class="p1-btn danger" data-remove-reminder="${r.id}">Remove</button>`}</div>`).join('');
  }
  function renderTaskRows(compact){
    if(!tasks.length) return '<p class="p1-muted">No daily tasks yet.</p>';
    return tasks.map(t=>`<div class="p1-row"><div class="p1-row-main"><div class="p1-row-title">${esc(t.title)}</div><div class="p1-row-sub">${t.completed?'Completed today':'Pending'}</div></div>${compact?'':`<button class="p1-btn ${t.completed?'':'primary'}" data-task="${t.id}">${t.completed?'✓ Done':'Complete'}</button>`}</div>`).join('');
  }

  function renderSettings(){
    return `<p class="eyebrow">PERSONALIZATION</p><h2>Settings</h2><div class="p1-report"><h3>Participant</h3><form class="p1-form" id="p1ProfileForm"><label>Name <input name="name" value="${esc(profile.name)}" placeholder="Participant name"></label><label>Preferred language <select name="language">${Object.entries(langNames).map(([k,v])=>`<option value="${k}" ${language===k?'selected':''}>${v}</option>`).join('')}</select></label><label>Caregiver name <input name="caregiverName" value="${esc(profile.caregiverName)}" placeholder="Optional"></label><div class="p1-actions"><button class="p1-btn primary" type="submit">Save settings</button></div></form></div>
      <div class="p1-report"><h3>Offline-first status</h3><div id="p1-sync-status"></div><p class="p1-muted">Sessions, reminders and tasks remain available when connectivity is weak. Pending records are kept in a local sync queue.</p></div>
      <div class="p1-report"><h3>Data controls</h3><p class="p1-muted">Export a JSON copy for the demo. Clearing data removes local training history, reminders, tasks and profile information from this browser.</p><div class="p1-actions"><button class="p1-btn" data-p1="export">Export data</button><button class="p1-btn danger" data-p1="clear">Clear local data</button></div></div>`;
  }

  function exportData(){
    const payload={exportedAt:now().toISOString(),profile,history:sessions(),reminders,tasks,syncQueue};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='cognitive-care-ner-report.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function clearData(){ if(!confirm('Clear local Cognitive Care demo data from this device?'))return; Object.values(KEY).forEach(k=>localStorage.removeItem(k)); localStorage.removeItem('ccner-history'); location.reload(); }

  function bindPanel(kind){
    updateSyncBadge();
    $('#p1ReminderForm')?.addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.currentTarget);const r={id:uid('rem'),title:f.get('title'),time:f.get('time'),repeat:f.get('repeat'),createdAt:now().toISOString()};reminders.push(r);write(KEY.reminders,reminders);queueSync('reminder.created',r);openPanel('reminders');});
    $('#p1TaskForm')?.addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.currentTarget);const t={id:uid('task'),title:f.get('title'),completed:false,createdAt:now().toISOString()};tasks.push(t);write(KEY.tasks,tasks);queueSync('task.created',t);openPanel('reminders');});
    $('#p1ProfileForm')?.addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.currentTarget);profile.name=f.get('name');profile.caregiverName=f.get('caregiverName');profile.preferredLanguage=f.get('language');language=profile.preferredLanguage;localStorage.setItem(KEY.language,language);write(KEY.profile,profile);queueSync('profile.updated',profile);applyLanguage();openPanel('settings');});
    $$('[data-remove-reminder]').forEach(b=>b.addEventListener('click',()=>{reminders=reminders.filter(r=>r.id!==b.dataset.removeReminder);write(KEY.reminders,reminders);queueSync('reminder.deleted',{id:b.dataset.removeReminder});openPanel('reminders')}));
    $$('[data-task]').forEach(b=>b.addEventListener('click',()=>{const t=tasks.find(x=>x.id===b.dataset.task);if(t){t.completed=!t.completed;write(KEY.tasks,tasks);queueSync('task.updated',t);openPanel('reminders')}}));
    $$('[data-p1]').forEach(b=>b.addEventListener('click',()=>{const k=b.dataset.p1;if(k==='monthly'||k==='report')openPanel(k==='monthly'?'monthly':'report');else if(k==='caregiver')openPanel('caregiver');else if(k==='reminders')openPanel('reminders');else if(k==='settings')openPanel('settings');else if(k==='export')exportData();else if(k==='clear')clearData();}));
  }

  function applyLanguage(){
    const t=translations[language]||translations['en-IN'];
    const pageTitle=$('#pageTitle'); if(pageTitle && !pageTitle.dataset.customized) pageTitle.textContent=profile.name?`Meet Momo, ${profile.name}`:'Meet Momo';
    document.documentElement.lang=language.slice(0,2);
    window.CCNER_LANGUAGE=language;
    window.CCNER_TTS_LANG=language;
  }

  function avatarLife(){
    const rig=$('#momoRig'); if(!rig)return;
    let lastX=0,lastY=0;
    document.addEventListener('pointermove',e=>{const rect=rig.getBoundingClientRect();const dx=Math.max(-1,Math.min(1,(e.clientX-(rect.left+rect.width/2))/(rect.width*1.8)));const dy=Math.max(-1,Math.min(1,(e.clientY-(rect.top+rect.height*.35))/(rect.height*2)));if(Math.abs(dx-lastX)+Math.abs(dy-lastY)>.08){lastX=dx;lastY=dy;rig.style.setProperty('--gaze-x',`${dx*5}px`);rig.style.setProperty('--gaze-y',`${dy*3}px`)}});
    const blink=()=>{if(document.hidden)return; const eyes=rig.querySelectorAll('.momo-eye'); eyes.forEach(e=>e.classList.add('p1-blink')); setTimeout(()=>eyes.forEach(e=>e.classList.remove('p1-blink')),170); setTimeout(blink,3500+Math.random()*4200)}; setTimeout(blink,1800);
    const moodObserver=new MutationObserver(()=>{rig.classList.remove('p1-companion-pulse');void rig.offsetWidth;rig.classList.add('p1-companion-pulse')}); const stage=$('#stage'); if(stage)moodObserver.observe(stage,{attributes:true,attributeFilter:['class']});
  }

  function installNav(){
    document.addEventListener('click',e=>{
      const nav=e.target.closest('[data-nav]'); if(nav){e.preventDefault(); const id=nav.dataset.nav; if(id==='reminders')openPanel('reminders'); else if(id==='settings')openPanel('settings'); else if(id==='resultsView'){ if(typeof window.showResultsFromHistory==='function')window.showResultsFromHistory(); else openPanel('report'); } else if(id==='homeView'&&typeof window.showView==='function')window.showView('#homeView'); return; }
      const action=e.target.closest('[data-action]'); if(action&&action.dataset.action==='reminder'){openPanel('reminders');}
    });
  }

  function enhanceSessionHistory(){
    // Keep the local-first sync layer in step with the existing game session engine.
    const originalFinish=window.finishSession;
    if(typeof originalFinish==='function' && !window.__p1Wrapped){
      window.finishSession=function(){ originalFinish(); const last=sessions().at(-1); if(last) queueSync('session.completed',last); renderHomeMetrics(); };
      window.__p1Wrapped=true;
    }
  }
  function renderHomeMetrics(){
    const last=sessions().at(-1), el=$('#todayStatus'); if(el&&last)el.textContent=`Complete · ${Math.round(last.score||0)}%`;
  }

  function init(){
    addLauncher(); addDrawer(); installNav(); avatarLife(); applyLanguage(); enhanceSessionHistory(); renderHomeMetrics(); updateSyncBadge();
    document.querySelector('.p1-launcher')?.addEventListener('click',e=>{const b=e.target.closest('[data-p1]');if(b)openPanel(b.dataset.p1)});
    document.querySelector('#p1Drawer')?.addEventListener('click',e=>{const b=e.target.closest('[data-p1]');if(b){e.preventDefault();const k=b.dataset.p1;if(k==='monthly'||k==='report'||k==='caregiver'||k==='reminders'||k==='settings')openPanel(k==='report'?'report':k);else if(k==='export')exportData();else if(k==='clear')clearData();}});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
  window.CCNERPhase1={openPanel,exportData,queueSync,getReport:(days=7)=>renderReport(days),getGameStats:gameStats,registerReminder:(r)=>{reminders.push({...r,id:r.id||uid('rem')});write(KEY.reminders,reminders);queueSync('reminder.created',r)}};
})();
