/* Cognitive Care NER — Spot the Difference UX fix.
 * Keeps the existing game logic intact and only improves the memory phase UI.
 */
(()=>{
'use strict';
if(window.__CCNER_SPOT_UX_FIX__)return;
window.__CCNER_SPOT_UX_FIX__=true;
const style=document.createElement('style');
style.id='ccner-spot-ux-fix';
style.textContent=`
body.ccner-v6 .v6-spot.v6-spot-memory-phase{grid-template-columns:repeat(4,minmax(78px,1fr));gap:16px;margin:22px auto 12px;max-width:540px}
body.ccner-v6 .v6-spot.v6-spot-memory-phase span{min-height:108px;display:grid;place-items:center;border:2px solid #31513f;border-radius:16px;background:#0a1d13;color:#fff;font-size:3.5rem;line-height:1;box-sizing:border-box}
body.ccner-v6 .v6-spot-memory-status{display:flex;align-items:center;justify-content:space-between;gap:14px;max-width:540px;margin:16px auto 8px;padding:0 2px}
body.ccner-v6 .v6-spot-memory-status .v6-status{margin:0;text-align:left}
body.ccner-v6 .v6-spot-countdown{flex:0 0 auto;min-width:92px;padding:9px 12px;border:1px solid #4c6c59;border-radius:12px;background:#10271a;color:#73d59e;font-weight:950;font-size:1rem;text-align:center;box-sizing:border-box}
body.ccner-v6 .v6-spot-countdown.urgent{color:#ffd27a;border-color:#a7793f;background:#2a2112}
body.ccner-v6 .v6-spot-memory-phase-label{max-width:540px;margin:4px auto 0;color:#9fb4a6;font-size:.82rem;font-weight:800;text-align:left}
body.ccner-v6 .v6-spot.v6-spot-answer-phase{grid-template-columns:repeat(4,minmax(78px,1fr));gap:16px;max-width:540px;margin:22px auto}
body.ccner-v6 .v6-spot.v6-spot-answer-phase button{min-height:108px;font-size:3.5rem;border-width:2px;border-radius:16px}
@media(max-width:600px){
 body.ccner-v6 .v6-spot.v6-spot-memory-phase,body.ccner-v6 .v6-spot.v6-spot-answer-phase{grid-template-columns:repeat(2,minmax(110px,1fr));max-width:420px;gap:12px}
 body.ccner-v6 .v6-spot.v6-spot-memory-phase span,body.ccner-v6 .v6-spot.v6-spot-answer-phase button{min-height:100px;font-size:3rem}
 body.ccner-v6 .v6-spot-memory-status{max-width:420px}
}
`;
document.head.appendChild(style);
function difficulty(){try{const p=JSON.parse(localStorage.getItem('ccner-v6-difficulty')||'{}');return Math.max(1,Math.min(10,Number(p.spot||2)))}catch(_){return 2}}
function durationMs(){return Math.max(2500,6000-(difficulty()-1)*300)}
let activeTimer=null;
function stopTimer(){if(activeTimer){clearInterval(activeTimer);activeTimer=null}}
function decorate(){
 const grid=document.querySelector('#v6spotgrid');
 const status=document.querySelector('#v6spot');
 if(!grid||!status)return;
 const memory=grid.querySelectorAll('span').length>0;
 if(memory){
   if(grid.dataset.spotUx==='memory')return;
   grid.dataset.spotUx='memory';
   grid.classList.add('v6-spot-memory-phase');
   const old=status.parentElement;
   if(old&&old.classList.contains('v6-spot-memory-status'))return;
   const wrap=document.createElement('div');wrap.className='v6-spot-memory-status';
   status.parentNode.insertBefore(wrap,status);
   wrap.appendChild(status);
   const timer=document.createElement('span');timer.className='v6-spot-countdown';timer.id='v6SpotCountdown';wrap.appendChild(timer);
   const label=document.createElement('div');label.className='v6-spot-memory-phase-label';label.textContent='Memorize these items before they disappear.';grid.parentNode.insertBefore(label,grid);
   const end=performance.now()+durationMs();
   const tick=()=>{const left=Math.max(0,end-performance.now());timer.textContent=`${(left/1000).toFixed(1)}s`;timer.classList.toggle('urgent',left<=1500);if(left<=0)stopTimer()};
   tick();activeTimer=setInterval(tick,100);
 }else if(grid.querySelectorAll('button').length){
   stopTimer();grid.dataset.spotUx='answer';grid.classList.remove('v6-spot-memory-phase');grid.classList.add('v6-spot-answer-phase');
   document.querySelector('.v6-spot-memory-phase-label')?.remove();
   document.querySelector('.v6-spot-memory-status')?.remove();
 }
}
const obs=new MutationObserver(decorate);
function boot(){const area=document.querySelector('#gameArea');if(!area)return setTimeout(boot,100);obs.observe(area,{childList:true,subtree:true});decorate()}
boot();
window.addEventListener('beforeunload',stopTimer);
})();
