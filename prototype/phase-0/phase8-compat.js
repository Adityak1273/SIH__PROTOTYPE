/* Compatibility bridge + active game-set loader for Phase 8. */
(() => {
  'use strict';
  const KEY='ccner-history';
  function normalize(){
    try{
      const h=JSON.parse(localStorage.getItem(KEY)||'[]');
      if(!Array.isArray(h))return;
      let changed=false;
      h.forEach(s=>(s?.results||[]).forEach(r=>{
        if(r && r.seconds==null && r.avgResponse!=null){r.seconds=Number(r.avgResponse)||0;changed=true;}
        if(r && r.difficulty==null && r.level!=null){r.difficulty=r.level;changed=true;}
      }));
      if(changed)localStorage.setItem(KEY,JSON.stringify(h));
    }catch(_){ }
  }
  normalize();
  window.addEventListener('storage',normalize);
  setInterval(normalize,3000);
  const load=()=>{
    if(window.CCNER_VIDEO_GAMES_LOADED)return;
    window.CCNER_VIDEO_GAMES_LOADED=true;
    const s=document.createElement('script');
    s.src='./phase8-video-override.js?v=0.18.2';
    s.onload=()=>{
      const v=document.createElement('script');
      v.src='./game-set-override.js?v=0.18.2';
      v.onload=()=>{
        const a=document.createElement('script');
        a.src='./game-engine-adaptive.js?v=0.18.2';
        a.defer=true;
        document.head.appendChild(a);
      };
      v.defer=true;
      document.head.appendChild(v);
    };
    s.defer=true;
    document.head.appendChild(s);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();
