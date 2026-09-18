/* Cognitive Care NER — Levels 5/6/7 support layer
 * Daily Routine Recall + hardened offline queue + client-side role boundaries.
 * Server-side authorization remains mandatory for production data APIs.
 */
(() => {
'use strict';
if(window.__CCNER_LEVEL567__)return;window.__CCNER_LEVEL567__=true;
const K={routine:'ccner.level5.routines.v1',outbox:'ccner.level6.outbox.v2',inbox:'ccner.level6.inbox.v1',audit:'ccner.level7.audit.v1'};
const uid=p=>`${p}-${Date.now()}-${crypto?.randomUUID?.()||Math.random().toString(36).slice(2)}`;
const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch(_){return f}};
const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch(_){return false}};
const profile=()=>read('ccner.level2.profile.v1',{});
const role=()=>profile().role||'Patient';
const actor=()=>profile().mobile||profile().email||profile().fullName||'local-user';
const now=()=>new Date().toISOString();
function audit(action,resource,meta={}){const a=read(K.audit,[]);a.push({id:uid('audit'),at:now(),actor:actor(),role:role(),action,resource,meta});write(K.audit,a.slice(-500));}
function queue(op,resource,payload){const q=read(K.outbox,[]);q.push({id:uid('op'),op,resource,payload,createdAt:now(),attempts:0,status:'pending',dedupeKey:`${resource}:${payload.id||uid('d')}`});write(K.outbox,q.slice(-500));renderSync();}
function renderSync(){const pending=read(K.outbox,[]).filter(x=>x.status==='pending').length;document.querySelectorAll('[data-ccner-sync]').forEach(e=>e.textContent=navigator.onLine?(pending?`${pending} changes waiting to sync`:'Online · synced'):`Offline · ${pending} changes queued`);}
async function flush(){if(!navigator.onLine)return;let q=read(K.outbox,[]);const pending=q.filter(x=>x.status==='pending');if(!pending.length){renderSync();return}const endpoint=window.CCNER_SYNC_ENDPOINT||'/api/sync';try{const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','X-CCNER-Client':'level6'},body:JSON.stringify({actor:actor(),role:role(),operations:pending})});if(!r.ok)throw Error('sync '+r.status);const done=new Set(pending.map(x=>x.id));q=q.map(x=>done.has(x.id)?{...x,status:'synced',syncedAt:now()}:x);write(K.outbox,q.slice(-500));audit('sync.flush','offline-outbox',{count:pending.length});}catch(_){q=q.map(x=>pending.some(p=>p.id===x.id)?{...x,attempts:Number(x.attempts||0)+1,lastAttempt:now()}:x);write(K.outbox,q.slice(-500))}renderSync()}
window.addEventListener('online',flush);window.addEventListener('offline',renderSync);setInterval(flush,60000);

const routineItems=[
 {type:'meal',icon:'🍚',en:'Breakfast',hi:'नाश्ता',bn:'সকালের খাবার',as:'পুৱাৰ আহাৰ'},
 {type:'hydration',icon:'💧',en:'Drink water',hi:'पानी पीना',bn:'জল পান',as:'পানী খোৱা'},
 {type:'prayer',icon:'🙏',en:'Prayer / quiet time',hi:'प्रार्थना / शांत समय',bn:'প্রার্থনা / শান্ত সময়',as:'প্ৰাৰ্থনা / শান্ত সময়'},
 {type:'task',icon:'🧹',en:'Household task',hi:'घर का काम',bn:'ঘরের কাজ',as:'ঘৰুৱা কাম'},
 {type:'meal',icon:'🍛',en:'Lunch',hi:'दोपहर का भोजन',bn:'দুপুরের খাবার',as:'দুপৰীয়াৰ আহাৰ'},
 {type:'family',icon:'👨‍👩‍👧',en:'Talk with family',hi:'परिवार से बात',bn:'পরিবারের সঙ্গে কথা',as:'পৰিয়ালৰ সৈতে কথা'},
 {type:'medicine',icon:'💊',en:'Medicine reminder',hi:'दवा की याद',bn:'ওষুধের স্মরণ',as:'দৰৱৰ সোঁৱৰনী'},
 {type:'rest',icon:'🛏️',en:'Rest / bedtime',hi:'आराम / सोने का समय',bn:'বিশ্রাম / শোয়ার সময়',as:'বিশ্ৰাম / শোৱাৰ সময়'}
];
const lk=()=>localStorage.getItem('ccner-p1-language')?.slice(0,2)||'en';
const txt=x=>x[lk()]||x.en;
function routine(){const list=read(K.routine,[]),today=new Date().toISOString().slice(0,10);return list.filter(x=>x.date===today)}
function ensureRoutine(){const today=new Date().toISOString().slice(0,10),a=read(K.routine,[]);if(a.some(x=>x.date===today))return a.filter(x=>x.date===today);const seed=routineItems.map((x,i)=>({...x,id:uid('routine'),date:today,done:false,order:i,source:'default'}));const merged=[...a.filter(x=>x.date!==today),...seed];write(K.routine,merged.slice(-200));return seed}
function renderRoutine(){const list=ensureRoutine();return `<section class="l567-card"><div class="l567-head"><div><p class="l567-kicker">DAILY ROUTINE RECALL</p><h2>Remember your day</h2><p class="l567-muted">A simple recall exercise for meals, prayers, household tasks and familiar daily activities.</p></div><button id="l567Refresh" class="l567-small">Refresh</button></div><div class="l567-routine">${list.map((x,i)=>`<button class="l567-routine-item ${x.done?'done':''}" data-routine="${x.id}"><span class="l567-num">${i+1}</span><span class="l567-icon">${x.icon}</span><span><strong>${txt(x)}</strong><small>${x.done?'Completed':'Tap to mark as remembered'}</small></span></button>`).join('')}</div><div class="l567-actions"><button id="l567Recall" class="l567-primary">Start recall exercise</button></div></section>`}
function mountRoutine(){if(document.querySelector('#l567Routine'))return;const h=document.createElement('div');h.id='l567Routine';h.className='l567-panel';h.innerHTML=renderRoutine();document.querySelector('.app-shell')?.append(h);bindRoutine()}
function bindRoutine(){document.querySelectorAll('[data-routine]').forEach(b=>b.onclick=()=>{const id=b.dataset.routine,a=read(K.routine,[]).map(x=>x.id===id?{...x,done:true,completedAt:now()}:x);write(K.routine,a);queue('upsert','routine',a.find(x=>x.id===id));audit('routine.complete',id);renderRoutine();bindRoutine();});document.querySelector('#l567Refresh')?.addEventListener('click',()=>{document.querySelector('#l567Routine').innerHTML=renderRoutine();bindRoutine()});document.querySelector('#l567Recall')?.addEventListener('click',startRecall)}
function startRecall(){const list=ensureRoutine().filter(x=>x.done);const target=list.length?list[Math.floor(Math.random()*list.length)]:ensureRoutine()[0];const choices=[target,...routineItems.filter(x=>x.en!==target.en).sort(()=>Math.random()-.5).slice(0,3)].sort(()=>Math.random()-.5);const e=document.createElement('div');e.className='l567-modal';e.innerHTML=`<div class="l567-dialog"><div class="l567-momo">🐶</div><p class="l567-kicker">MOMO</p><h2>What did you do today?</h2><p>Think about your day and choose the activity you remember.</p><div class="l567-choices">${choices.map(x=>`<button data-r="${x.en}">${x.icon} ${txt(x)}</button>`).join('')}</div></div>`;document.body.append(e);e.querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>{const ok=b.dataset.r===target.en;e.querySelector('.l567-dialog').innerHTML=`<div class="l567-momo">${ok?'🐶':'🐾'}</div><h2>${ok?'Nice recall!':'Good try.'}</h2><p>${ok?'You remembered a part of today’s routine.':'That is okay. Let’s keep practising gently.'}</p><button id="l567Close" class="l567-primary">Continue</button>`;e.querySelector('#l567Close').onclick=()=>e.remove();});}
window.CCNERDailyRoutine={mount:mountRoutine,getToday:ensureRoutine,add(item){const a=read(K.routine,[]);const x={...item,id:uid('routine'),date:new Date().toISOString().slice(0,10),done:false};a.push(x);write(K.routine,a.slice(-200));queue('upsert','routine',x);return x}};

window.CCNERAccess={
 roles:['Patient','Caregiver','Doctor/Health Worker'],
 can(action,targetRole=role()){
   const map={readOwn:['Patient','Caregiver','Doctor/Health Worker'],writeOwn:['Patient','Caregiver','Doctor/Health Worker'],manageRoutine:['Patient','Caregiver'],viewCaregiver:['Caregiver','Doctor/Health Worker'],export:['Caregiver','Doctor/Health Worker'],manageUsers:['Doctor/Health Worker']};
   return (map[action]||[]).includes(targetRole);
 },
 guard(action,resource='protected'){const ok=this.can(action);audit(ok?'access.allow':'access.deny',resource,{action});if(!ok){const e=document.createElement('div');e.className='l567-toast';e.textContent='This action is not available for your role.';document.body.append(e);setTimeout(()=>e.remove(),2600)}return ok},
 audit
};
function roleUI(){document.querySelectorAll('[data-role-action]').forEach(e=>{const action=e.dataset.roleAction;e.hidden=!window.CCNERAccess.can(action)});document.querySelectorAll('[data-ccner-sync]').forEach(e=>e.addEventListener('click',flush));renderSync()}
window.CCNER567={flush,mountRoutine,roleUI};
window.addEventListener('load',()=>{mountRoutine();roleUI();flush()});
})();