/* Cognitive Care NER — Phase 1 privacy/security controls. */
(function(){
'use strict';
const KEY='ccner-security-center';
const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return{}}};
const write=v=>{try{localStorage.setItem(KEY,JSON.stringify(v))}catch{}};
const state=Object.assign({analytics:false,notifications:false,privacyVersion:'2026-09-05-v1'},read());
function save(){write(state)}
function client(){return window.CCNERAuth?.client?.()||null}
async function audit(action,metadata={}){try{const sb=client(),p=window.CCNERAuth?.getProfile?.();if(sb&&p?.user_id)await sb.from('audit_log').insert({user_id:p.user_id,action,entity_type:'security',entity_id:null,metadata:{...metadata,app:'ccner',privacyVersion:state.privacyVersion}})}catch{}}
async function setConsent(name,value){state[name]=!!value;save();await audit('consent_changed',{name,value});if(name==='notifications'){try{const sb=client(),p=window.CCNERAuth?.getProfile?.();if(sb&&p?.user_id)await sb.from('notification_preferences').upsert({user_id:p.user_id,push_enabled:!!state.notifications,reminder_enabled:true,updated_at:new Date().toISOString()},{onConflict:'user_id'})}catch{}}}

async function collectExport(){
 const sb=client(),p=window.CCNERAuth?.getProfile?.();
 if(!sb||!p?.user_id){alert('Please sign in first.');return null}
 const uid=p.user_id;
 const queries={
  profile:sb.from('profiles').select('*').eq('user_id',uid).maybeSingle(),
  consents:sb.from('privacy_consents').select('*').eq('user_id',uid).order('accepted_at',{ascending:false}),
  sessions:sb.from('cognitive_sessions').select('*').eq('user_id',uid).order('completed_at',{ascending:false}),
  game_results:sb.from('game_results').select('*').eq('user_id',uid).order('created_at',{ascending:false}),
  daily_tasks:sb.from('daily_tasks').select('*').eq('user_id',uid).order('task_date',{ascending:false}),
  reminders:sb.from('reminders').select('*').eq('user_id',uid).order('created_at',{ascending:false}),
  caregiver_alerts:sb.from('caregiver_alerts').select('*').eq('patient_id',uid).order('created_at',{ascending:false}),
  training_baselines:sb.from('training_baselines').select('*').eq('user_id',uid).order('captured_at',{ascending:false}),
  audit_log:sb.from('audit_log').select('*').eq('user_id',uid).order('created_at',{ascending:false})
 };
 const out={exportedAt:new Date().toISOString(),privacyVersion:state.privacyVersion,notice:'This export contains your Cognitive Care NER application data. Training results are not a medical diagnosis.',cloud:{},local:{}};
 for(const [name,q] of Object.entries(queries)){const r=await q;if(r.error)throw r.error;out.cloud[name]=r.data}
 const localKeys=['ccner-history','ccner-tasks','ccner-reminders','ccner.level5.routines.v1','ccner.level6.outbox.v2'];
 for(const k of localKeys){try{out.local[k]=JSON.parse(localStorage.getItem(k)||'null')}catch{out.local[k]=null}}
 return out;
}
function displayValue(v){
 if(v===null||v===undefined)return '';
 if(typeof v==='object')return JSON.stringify(v);
 return String(v);
}
function rowsFor(out){
 const rows=[['Section','Field','Value']];
 rows.push(['Export','Exported at',out.exportedAt],['Export','Privacy version',out.privacyVersion],['Export','Notice',out.notice]);
 for(const [section,data] of Object.entries(out.cloud||{})){
  if(Array.isArray(data)){
   if(!data.length)rows.push([section,'','No records']);
   data.forEach((item,i)=>{
    if(item&&typeof item==='object')Object.entries(item).forEach(([k,v])=>rows.push([section,`${i+1}. ${k}`,displayValue(v)]));
    else rows.push([section,String(i+1),displayValue(item)]);
   });
  }else if(data&&typeof data==='object')Object.entries(data).forEach(([k,v])=>rows.push([section,k,displayValue(v)]));
  else rows.push([section,'',displayValue(data)]);
 }
 for(const [section,data] of Object.entries(out.local||{})){
  if(data===null||data===undefined){rows.push(['Local data',section,'']);continue}
  if(Array.isArray(data)){
   if(!data.length)rows.push(['Local data',`${section} — records`,'No records']);
   data.forEach((item,i)=>{if(item&&typeof item==='object')Object.entries(item).forEach(([k,v])=>rows.push([`Local: ${section}`,`${i+1}. ${k}`,displayValue(v)]));else rows.push([`Local: ${section}`,String(i+1),displayValue(item)])});
  }else if(typeof data==='object')Object.entries(data).forEach(([k,v])=>rows.push([`Local: ${section}`,k,displayValue(v)]));
  else rows.push([`Local: ${section}`,'',displayValue(data)]);
 }
 return rows;
}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function downloadBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)}
async function exportExcel(){
 const out=await collectExport();if(!out)return;
 const rows=rowsFor(out);
 const table='<table><thead><tr>'+rows[0].map(esc).map(x=>`<th>${x}</th>`).join('')+'</tr></thead><tbody>'+rows.slice(1).map(r=>'<tr>'+r.map(v=>`<td>${esc(v)}</td>`).join('')+'</tr>').join('')+'</tbody></table>';
 const html='<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif}table{border-collapse:collapse;width:100%}th,td{border:1px solid #777;padding:6px;text-align:left;vertical-align:top}th{font-weight:bold;background:#dfeee5}td{mso-number-format:"\\@"}</style></head><body><h2>Cognitive Care NER — Personal Data Export</h2>'+table+'</body></html>';
 downloadBlob(new Blob([html],{type:'application/vnd.ms-excel'}),'cognitive-care-ner-personal-data.xls');
 await audit('data_exported',{scope:'cloud_and_local',format:'excel'});
}
function printPdf(out){
 const rows=rowsFor(out);
 const table='<table><thead><tr>'+rows[0].map(esc).map(x=>`<th>${x}</th>`).join('')+'</tr></thead><tbody>'+rows.slice(1).map(r=>'<tr>'+r.map(v=>`<td>${esc(v)}</td>`).join('')+'</tr>').join('')+'</tbody></table>';
 const w=window.open('','_blank','width=1100,height=800');
 if(!w){alert('Please allow pop-ups to create the PDF.');return false}
 w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Cognitive Care NER — Personal Data Export</title><style>@page{size:A4 landscape;margin:12mm}body{font-family:Arial,sans-serif;color:#17251d;font-size:9px}h1{font-size:18px;margin:0 0 4px}p{margin:0 0 12px;color:#56645b}table{border-collapse:collapse;width:100%;table-layout:fixed}thead{display:table-header-group}tr{page-break-inside:avoid}th,td{border:1px solid #aeb8b1;padding:5px;vertical-align:top;word-break:break-word}th{background:#dfeee5;font-weight:700}th:nth-child(1){width:18%}th:nth-child(2){width:25%}th:nth-child(3){width:57%}</style></head><body><h1>Cognitive Care NER — Personal Data Export</h1><p>Generated '+esc(out.exportedAt)+' · Training results are not a medical diagnosis.</p>'+table+'<script>window.onload=function(){setTimeout(function(){window.print()},250)}<\/script></body></html>');
 w.document.close();
 return true;
}
async function exportPdf(){const out=await collectExport();if(!out)return;if(printPdf(out))await audit('data_exported',{scope:'cloud_and_local',format:'pdf'});}
async function exportAll(){return exportExcel()}

async function deleteAll(){const sb=client(),p=window.CCNERAuth?.getProfile?.();if(!sb||!p?.user_id){alert('Please sign in first.');return false}if(!confirm('Delete your Cognitive Care NER application data from cloud storage and this device? This cannot be undone. Your Supabase login account itself is not deleted by the browser.'))return false;const uid=p.user_id;try{if(p.avatar_path)await sb.storage.from('profile-photos').remove([p.avatar_path]);const ops=[sb.from('game_results').delete().eq('user_id',uid),sb.from('caregiver_alerts').delete().eq('patient_id',uid),sb.from('caregiver_links').delete().eq('patient_user_id',uid),sb.from('caregiver_links').delete().eq('caregiver_user_id',uid),sb.from('daily_tasks').delete().eq('user_id',uid),sb.from('reminders').delete().eq('user_id',uid),sb.from('training_baselines').delete().eq('user_id',uid),sb.from('sync_queue').delete().eq('user_id',uid),sb.from('sync_events').delete().eq('user_id',uid),sb.from('privacy_consents').delete().eq('user_id',uid),sb.from('cognitive_sessions').delete().eq('user_id',uid),sb.from('notification_preferences').delete().eq('user_id',uid),sb.from('profiles').delete().eq('user_id',uid)];for(const q of ops){const r=await q;if(r.error)throw r.error}await audit('data_deleted',{scope:'cloud_app_data'});['ccner-history','ccner-tasks','ccner-reminders','ccner.level5.routines.v1','ccner.level6.outbox.v2','ccner-security-center'].forEach(k=>{try{localStorage.removeItem(k)}catch{}});await window.CCNERAuth.signOut();return true}catch(e){alert(e?.message||'Cloud data deletion failed. No local profile copy is retained by Phase 1.');return false}}
function render(){const s=read(),auth=window.CCNERAuth?.isAuthenticated?.();return `<div class="ph-card"><h3>Privacy & security</h3><p class="p1-muted">Your profile is stored in your protected account, not in browser profile storage. Training scores remain training performance and are not a dementia diagnosis.</p><div class="ph-row"><div><strong>Training analytics</strong><small>Allow optional product analytics.</small></div><button class="ph-btn secondary" data-sec="analytics">${s.analytics?'Enabled':'Disabled'}</button></div><div class="ph-row"><div><strong>Reminder notifications</strong><small>Allow scheduled reminder delivery.</small></div><button class="ph-btn secondary" data-sec="notifications">${s.notifications?'Enabled':'Disabled'}</button></div><div class="ph-actions"><button class="ph-btn" data-sec="export-excel" ${auth?'':'disabled'}>Export Excel</button><button class="ph-btn" data-sec="export-pdf" ${auth?'':'disabled'}>Export PDF</button><button class="ph-btn secondary" data-sec="audit">Security activity</button><button class="ph-btn secondary" data-sec="signout" ${auth?'':'disabled'}>Sign out</button><button class="ph-btn secondary" data-sec="delete" ${auth?'':'disabled'}>Delete app data</button></div></div>`}
function open(){let p=document.getElementById('securityCenter');if(!p){p=document.createElement('section');p.id='securityCenter';p.className='p2-panel';document.body.appendChild(p)}p.innerHTML='<div class="p2-sheet"><button class="p2-close" aria-label="Close">×</button><span class="p2-eyebrow">PRIVACY & SECURITY</span><h2>Your data controls</h2>'+render()+'</div>';p.querySelector('.p2-close').onclick=()=>p.remove();p.querySelectorAll('[data-sec]').forEach(b=>b.onclick=async()=>{const a=b.dataset.sec;if(a==='analytics'){await setConsent('analytics',!read().analytics);open()}else if(a==='notifications'){const ok=await window.CCNERNotifications?.request?.();if(ok)await setConsent('notifications',true);open()}else if(a==='export-excel'){try{await exportExcel()}catch(e){alert(e?.message||'Excel export failed.')}}else if(a==='export-pdf'){try{await exportPdf()}catch(e){alert(e?.message||'PDF export failed.')}}else if(a==='signout'){await window.CCNERAuth.signOut()}else if(a==='delete'){await deleteAll()}else if(a==='audit'){alert('Security activity is recorded in the protected account audit log.')}})}
function boot(){const home=document.getElementById('homeView');if(!home||document.getElementById('securityCenterButton'))return;const b=document.createElement('button');b.id='securityCenterButton';b.className='p2-btn p2-dashboard-launch';b.textContent='🔐 Privacy & security';b.onclick=open;home.appendChild(b)}
window.CCNERSecurity={open,setConsent,exportAll,exportExcel,exportPdf,deleteAll};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
