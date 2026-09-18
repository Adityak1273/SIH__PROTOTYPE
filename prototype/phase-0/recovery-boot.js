/* Cognitive Care NER — deployment/runtime recovery boot. */
(function(){
  'use strict';
  const VERSION='0.13.0';
  const once='ccner-recovery-'+VERSION;
  const $=s=>document.querySelector(s);
  function report(message){
    let box=$('#ccnerRecovery');
    if(!box){
      box=document.createElement('div');
      box.id='ccnerRecovery';
      box.style.cssText='position:fixed;left:12px;right:12px;bottom:12px;z-index:2147483647;background:#fff8e8;border:2px solid #d89b32;border-radius:14px;padding:14px 16px;font:600 15px/1.4 system-ui,sans-serif;color:#4b3520;box-shadow:0 8px 30px rgba(0,0,0,.18)';
      document.body.appendChild(box);
    }
    box.textContent='Momo startup check: '+message;
  }
  window.addEventListener('error',e=>report('JavaScript error: '+(e.message||'unknown error')));
  window.addEventListener('unhandledrejection',e=>report('Startup promise error: '+(e.reason?.message||String(e.reason||'unknown error'))));
  function action(e){
    const b=e.target.closest?.('button'); if(!b)return;
    const act=b.dataset.action;
    if(act==='start' || b.id==='playAgain'){
      if(typeof window.startSession==='function') return;
      report('Game engine is still loading; retrying automatically…');
      let n=0;const t=setInterval(()=>{n++;if(typeof window.startSession==='function'){clearInterval(t);window.startSession()}else if(n>=20){clearInterval(t);report('Game engine did not load. Refresh this page once.')}} ,250);
    }
  }
  document.addEventListener('click',action,true);
  async function cleanOldCaches(){
    if(!('serviceWorker' in navigator))return;
    const key='ccner-recovery-done-'+VERSION;
    if(sessionStorage.getItem(key))return;
    sessionStorage.setItem(key,'1');
    try{
      const regs=await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r=>r.unregister()));
      if('caches' in window){const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('cognitive-care-ner-')&&k!==`cognitive-care-ner-v${VERSION}`).map(k=>caches.delete(k)))}
      if(location.search.indexOf('ccnerfresh=1')===-1){location.replace(location.pathname+'?ccnerfresh=1')}
    }catch(_){/* recovery is best-effort */}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(cleanOldCaches,100));else setTimeout(cleanOldCaches,100);
})();
