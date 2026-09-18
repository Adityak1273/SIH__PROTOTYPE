/* Cognitive Care NER — Phase 6
 * Offline-first resilience and synchronization control.
 * Keeps training usable without connectivity, surfaces pending local data,
 * retries synchronization when the network returns, and avoids duplicate
 * queue entries. Clinical data remains training performance only.
 */
(() => {
  'use strict';
  const KEY='ccner-p6-sync-queue';
  const HISTORY='ccner-history';
  const $=s=>document.querySelector(s);
  const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(f))}catch(_){return f}};
  const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const history=()=>read(HISTORY,[]).filter(Boolean);
  const id=s=>String(s?.id||s?.sessionId||s?.date||'').trim();
  const queue=()=>read(KEY,[]).filter(Boolean);
  const setQueue=q=>write(KEY,q);
  function seed(){
    const existing=new Set(queue().map(id));
    const q=queue();
    history().forEach(s=>{const k=id(s);if(k&&!existing.has(k)){q.push({id:k,queuedAt:new Date().toISOString(),status:'pending'});existing.add(k)}});
    setQueue(q.slice(-100));
  }
  function online(){return navigator.onLine!==false}
  function toast(msg){const old=document.querySelector('.p6-toast');old?.remove();const el=document.createElement('div');el.className='p6-toast';el.textContent=msg;document.body.appendChild(el);setTimeout(()=>el.remove(),2400)}
  function render(){
    seed(); const q=queue(), pending=q.filter(x=>x.status!=='synced').length, synced=q.filter(x=>x.status==='synced').length;
    let panel=$('.p6-panel'); if(!panel){const home=$('#homeView');if(!home)return;panel=document.createElement('section');panel.className='p6-panel';home.querySelector('.voice-banner')?.insertAdjacentElement('afterend',panel)}
    panel.innerHTML='<div class="p6-row"><div><div class="p6-title">Offline-first sync</div><p class="p6-sub">Your training stays available when connectivity is limited.</p></div><span id="p6Net" class="p6-pill '+(online()?'':'offline')+'"><i class="p6-dot"></i>'+ (online()?'Online':'Offline') +'</span></div><div class="p6-meta"><article><span>Pending sync</span><strong>'+pending+'</strong></article><article><span>Local sessions</span><strong>'+history().length+'</strong></article><article><span>Synced records</span><strong>'+synced+'</strong></article></div><div class="p6-actions"><button class="p6-btn primary" id="p6Sync" type="button">Sync now</button><button class="p6-btn" id="p6Clear" type="button">Clear sync queue</button></div><p class="p6-note">Offline sessions remain on this device. When the connection returns, the queue is retried. Clearing the queue does not delete your training history.</p>';
    $('#p6Sync').onclick=sync; $('#p6Clear').onclick=()=>{setQueue([]);render();toast('Sync queue cleared. Local history is unchanged.')};
  }
  async function sync(){
    seed();if(!online()){toast('You are offline. Nothing was uploaded.');return}
    const q=queue();if(!q.length){toast('Everything is already synchronized.');return}
    /* Phase 2 owns cloud authentication/upload. Dispatch a neutral event so
       the existing cloud layer can synchronize without Phase 6 duplicating it. */
    const ids=q.filter(x=>x.status!=='synced').map(x=>x.id);
    setQueue(q.map(x=>ids.includes(x.id)?({...x,status:'uploading',attempts:(x.attempts||0)+1}):x));
    window.dispatchEvent(new CustomEvent('ccner:sync-request',{detail:{ids,onAck:(ackIds)=>{
      const ack=new Set(Array.isArray(ackIds)?ackIds:[]);
      setQueue(queue().map(x=>ack.has(x.id)?({...x,status:'synced',syncedAt:new Date().toISOString()}):x));
      render();
    },onFailure:(failedIds)=>{
      const failed=new Set(Array.isArray(failedIds)?failedIds:ids);
      setQueue(queue().map(x=>failed.has(x.id)?({...x,status:'failed',lastError:new Date().toISOString()}):x));
      render();
    }}}));
    // Never claim success before the cloud layer acknowledges the records.
    setTimeout(()=>{
      const stillUploading=queue().filter(x=>ids.includes(x.id)&&x.status==='uploading');
      if(stillUploading.length){
        setQueue(queue().map(x=>stillUploading.some(y=>y.id===x.id)?({...x,status:'failed',lastError:'No server acknowledgement'}):x));
        render();toast('Sync is waiting for server confirmation. We will retry.');
      }
    },10000);
  }
  window.addEventListener('online',()=>{render();sync()});
  window.addEventListener('offline',render);
  window.addEventListener('ccner:session-complete',()=>{seed();render()});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){seed();render()}});
  window.CCNER_PHASE6={sync,refresh:()=>{seed();render()},pending:()=>queue().filter(x=>x.status!=='synced').length};
  setTimeout(render,0);
})();
