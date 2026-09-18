/* Cognitive Care NER — auth recovery + safe prototype access. */
(()=>{
'use strict';
if(window.__CCNER_AUTH_RECOVERY__)return;window.__CCNER_AUTH_RECOVERY__=true;
const DEMO_USER={id:'00000000-0000-4000-8000-000000000001',email:'demo@cognitivecare.local'};
const DEMO_PROFILE={user_id:DEMO_USER.id,full_name:'Demo Patient',display_name:'Demo Patient',preferred_language:'en',role:'patient',requested_role:'patient',momo_name:'Momo',voice_preference:'default',region:'North Eastern Region',accessibility:'Large text',profile_complete:true};
const $=s=>document.querySelector(s);
function demo(){
  const gate=$('#l2AuthGate');if(!gate)return;
  gate.querySelectorAll('button').forEach(b=>b.disabled=true);
  window.CCNER_DEMO_MODE=true;
  window.CCNERAuth?.__set?.(DEMO_USER,DEMO_PROFILE);
  gate.remove();
  const app=$('.app-shell');if(app)app.style.display='';
  window.dispatchEvent(new CustomEvent('ccner:profile-ready',{detail:{...DEMO_PROFILE,userId:DEMO_USER.id,demo:true}}));
}
function addDemo(){
  const gate=$('#l2AuthGate'),choice=gate?.querySelector('.l2v-choice');
  if(!gate||!choice||$('#ccnerPrototypeAccess'))return;
  const b=document.createElement('button');b.id='ccnerPrototypeAccess';b.type='button';b.className='l2v-btn ghost';b.textContent='Prototype Access';b.title='Open the main app in local demo mode without authentication';b.onclick=demo;choice.appendChild(b);
  const note=document.createElement('div');note.className='l2v-note';note.id='ccnerPrototypeNote';note.innerHTML='<strong>Prototype Access:</strong> opens the main app with non-production demo data. It does not access cloud patient reports.';gate.querySelector('.l2v-card')?.appendChild(note);
}
async function recoverAuthUrl(){
  const hasAuth=/([?&#](code|access_token|refresh_token|token_hash|type)=)/i.test(location.href);
  if(!hasAuth)return;
  const client=window.CCNERAuth?.client?.();if(!client)return;
  try{
    const {data}=await client.auth.getSession();
    if(data?.session?.user){
      const clean=location.origin+location.pathname;
      history.replaceState({},document.title,clean);
      location.replace(clean);
    }
  }catch(e){console.warn('[CCNER Auth Recovery]',e)}
}
function directPrototype(){
  if(new URLSearchParams(location.search).get('prototype')!=='1')return;
  const timer=setInterval(()=>{if($('#l2AuthGate')){clearInterval(timer);demo()}},250);
  setTimeout(()=>clearInterval(timer),15000);
}
let tries=0;const timer=setInterval(()=>{addDemo();recoverAuthUrl();if(++tries>90)clearInterval(timer)},1000);
setTimeout(()=>{addDemo();recoverAuthUrl();directPrototype()},500);
})();
