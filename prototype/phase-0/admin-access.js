/* Cognitive Care NER — dedicated allowlisted Admin access. */
(()=>{
'use strict';
if(window.__CCNER_ADMIN_ACCESS__)return;window.__CCNER_ADMIN_ACCESS__=true;
const ADMIN_EMAIL='adityak1273@gmail.com',VERSION='0.18.7';
let sb=null;
const $=(s,r=document)=>r.querySelector(s);
function initClient(){const shared=window.CCNERAuth?.client?.();if(shared){sb=shared;return sb;}return sb;}
function addAdminButton(){
  const gate=$('#l2AuthGate'),choice=$('.l2v-choice',gate);if(!gate||!choice||$('#ccnerAdminLogin'))return false;
  const b=document.createElement('button');b.id='ccnerAdminLogin';b.type='button';b.className='l2v-btn ghost l2v-admin-btn';b.textContent='Admin Login';b.onclick=openAdminLogin;choice.appendChild(b);return true;
}
function modal(){
  if($('#ccnerAdminModal'))return $('#ccnerAdminModal');
  document.body.insertAdjacentHTML('beforeend',`<section id="ccnerAdminModal" class="ccner-admin-modal" role="dialog" aria-modal="true" aria-labelledby="ccnerAdminTitle"><div class="ccner-admin-card"><button id="ccnerAdminClose" class="ccner-admin-close" type="button" aria-label="Close">×</button><div class="ccner-admin-mark">🔐</div><p class="ccner-admin-kicker">COGNITIVE CARE NER</p><h2 id="ccnerAdminTitle">Administrator Login</h2><p class="ccner-admin-copy">Restricted access for the project administrator. Use the authorized email below to receive a secure sign-in link.</p><label class="ccner-admin-label" for="ccnerAdminEmail">Admin email</label><input id="ccnerAdminEmail" class="ccner-admin-input" type="email" value="${ADMIN_EMAIL}" readonly autocomplete="email"><button id="ccnerAdminSend" class="ccner-admin-primary" type="button">Send Admin Login Link</button><div id="ccnerAdminMsg" class="ccner-admin-msg" role="status"></div><p class="ccner-admin-note">No password is stored in the app. Access is restricted by a server-side allowlist.</p></div></section>`);
  $('#ccnerAdminClose').onclick=()=>$('#ccnerAdminModal')?.remove();
  $('#ccnerAdminSend').onclick=sendAdminLink;
  return $('#ccnerAdminModal');
}
function adminMsg(t,bad=false){const e=$('#ccnerAdminMsg');if(!e)return;e.textContent=t;e.classList.toggle('bad',bad);}
function openAdminLogin(){modal();}
async function sendAdminLink(){
  const c=initClient();if(!c)return adminMsg('Authentication service is still starting. Please wait a moment and try again.',true);
  const b=$('#ccnerAdminSend');b.disabled=true;adminMsg('Sending secure admin login link…');
  try{
    const {error}=await c.auth.signInWithOtp({email:ADMIN_EMAIL,options:{shouldCreateUser:true,emailRedirectTo:location.origin+location.pathname}});
    if(error)throw error;
    adminMsg('Link sent. Open it on this device. If email delivery is rate-limited, wait for the limit to reset instead of repeatedly requesting new links.');
  }catch(e){adminMsg(e?.message||'Could not send the admin login link.',true);}finally{b.disabled=false;}
}
async function ensureAdmin(){
  const c=initClient();if(!c)return false;
  const {data}=await c.auth.getSession();const u=data?.session?.user;if(!u||String(u.email||'').toLowerCase()!==ADMIN_EMAIL.toLowerCase())return false;
  let {data:p}=await c.from('profiles').select('*').eq('user_id',u.id).maybeSingle();
  if(!p||p.role!=='admin'){
    const {data:np,error}=await c.from('profiles').upsert({user_id:u.id,full_name:'Administrator',display_name:'Administrator',preferred_language:'en',role:'admin',requested_role:'admin',momo_name:'Momo',voice_preference:'default',profile_complete:true},{onConflict:'user_id'}).select('*').single();
    if(error){console.warn('[CCNER Admin] profile bootstrap failed',error);return false;}
    p=np;
  }
  return p?.role==='admin';
}
async function renderDashboard(){
  if($('#ccnerAdminDashboard'))return;
  document.querySelector('.app-shell')?.style.setProperty('display','none','important');
  $('#l2AuthGate')?.remove();
  document.body.insertAdjacentHTML('afterbegin',`<main id="ccnerAdminDashboard" class="ccner-admin-dashboard"><header class="ccner-admin-head"><div><p class="ccner-admin-kicker">COGNITIVE CARE NER · ADMIN</p><h1>Administrator Dashboard</h1><p>Protected overview of registered users and cognitive-training activity.</p></div><div class="ccner-admin-actions"><button id="ccnerAdminRefresh" type="button">↻ Refresh reports</button><button id="ccnerAdminLogout" type="button">Sign out</button></div></header><section class="ccner-admin-summary"><article><span>Registered users</span><strong id="adminUsers">—</strong></article><article><span>Total sessions</span><strong id="adminSessions">—</strong></article><article><span>Average accuracy</span><strong id="adminAccuracy">—</strong></article><article><span>Open alerts</span><strong id="adminAlerts">—</strong></article></section><section class="ccner-admin-panel"><div class="ccner-admin-panel-head"><div><p class="ccner-admin-kicker">REPORTS</p><h2>Patient & care activity</h2></div><span id="ccnerAdminStatus">Loading…</span></div><div class="ccner-admin-table-wrap"><table><thead><tr><th>User</th><th>Role</th><th>Sessions</th><th>Accuracy</th><th>Score</th><th>Games</th><th>Last session</th><th>Alerts</th></tr></thead><tbody id="ccnerAdminRows"></tbody></table></div><p class="ccner-admin-disclaimer">Training metrics describe game performance and engagement. They are not a dementia diagnosis or clinical staging result.</p></section><footer>Admin access · build ${VERSION} · restricted by server-side allowlist</footer></main>`);
  $('#ccnerAdminRefresh').onclick=loadReports;
  $('#ccnerAdminLogout').onclick=async()=>{const c=initClient();await c?.auth.signOut();location.reload();};
  await loadReports();
}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
async function loadReports(){
  const c=initClient();if(!c)return;
  const st=$('#ccnerAdminStatus');if(st)st.textContent='Refreshing…';
  const {data,error}=await c.rpc('get_admin_patient_reports');
  if(error){if(st)st.textContent='Report access error';$('#ccnerAdminRows').innerHTML=`<tr><td colspan="8">${esc(error.message||'Unable to load reports.')}</td></tr>`;return;}
  const rows=Array.isArray(data)?data:[];
  const totalSessions=rows.reduce((n,r)=>n+(+r.sessions_count||0),0),totalAlerts=rows.reduce((n,r)=>n+(+r.active_alerts||0),0),weightedAcc=rows.reduce((n,r)=>n+(+r.average_accuracy||0)*(+r.sessions_count||0),0),acc=totalSessions?weightedAcc/totalSessions:0;
  $('#adminUsers').textContent=rows.length;$('#adminSessions').textContent=totalSessions;$('#adminAccuracy').textContent=Math.round(acc*100)+'%';$('#adminAlerts').textContent=totalAlerts;
  $('#ccnerAdminRows').innerHTML=rows.length?rows.map(r=>`<tr><td><strong>${esc(r.full_name)}</strong><small>${esc(r.email||'')}</small></td><td><span class="ccner-role">${esc(r.role)}</span></td><td>${+r.sessions_count||0}</td><td>${Math.round((+r.average_accuracy||0)*100)}%</td><td>${Math.round(+r.average_score||0)}%</td><td>${+r.games_played||0}</td><td>${r.last_session_at?new Date(r.last_session_at).toLocaleString([], {dateStyle:'medium',timeStyle:'short'}):'—'}</td><td>${+r.active_alerts||0}</td></tr>`).join(''):`<tr><td colspan="8" class="ccner-empty">No registered patient/care activity yet.</td></tr>`;
  if(st)st.textContent=`${rows.length} account${rows.length===1?'':'s'} · updated just now`;
}
async function check(){addAdminButton();if(await ensureAdmin())await renderDashboard();}
const timer=setInterval(()=>{addAdminButton();check().catch(()=>{});},1200);setTimeout(()=>clearInterval(timer),60000);setTimeout(()=>check().catch(()=>{}),2500);
window.addEventListener('ccner:profile-ready',()=>check().catch(()=>{}));
})();
