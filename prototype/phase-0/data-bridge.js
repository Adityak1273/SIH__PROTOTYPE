/* Keeps legacy/local Phase 1 records visible to the caregiver analytics layer. */
(function(){
  const read=k=>{try{return JSON.parse(localStorage.getItem(k)||'[]')}catch(_){return[]}};
  const sync=()=>{try{localStorage.setItem('ccner-reminders',JSON.stringify(read('ccner-p1-reminders')));localStorage.setItem('ccner-tasks',JSON.stringify(read('ccner-p1-tasks')))}catch(_){} };
  sync();setInterval(sync,1000);window.addEventListener('storage',sync);
})();
