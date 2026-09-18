(()=>{'use strict';
if(window.__CCNER_CLINICAL_ADAPTIVE_BRIDGE__)return;window.__CCNER_CLINICAL_ADAPTIVE_BRIDGE__=true;
const PROFILE='ccner-clinical-profile.v1',DIFF='ccner-v6-difficulty';
const gameDomain={sequence:'memory',stroop:'attention',house:'executive',pattern:'executive',spot:'visuospatial'};
function clamp(n){return Math.max(1,Math.min(10,n))}
function apply(){let p={},c={};try{p=JSON.parse(localStorage.getItem(PROFILE)||'{}');c=JSON.parse(localStorage.getItem(DIFF)||'{}')}catch(_){return}const domains=p.domains||{};Object.entries(gameDomain).forEach(([game,domain])=>{const v=domains[domain];if(!v?.concern)return;const confidence=Math.max(0,Math.min(1,Number(v.confidence)||0));const current=Number(c[game]||2);const target=clamp(current-(confidence>=.75?1:0));c[game]=target});try{localStorage.setItem(DIFF,JSON.stringify(c))}catch(_){} }
window.addEventListener('ccner:clinical-profile-updated',apply);apply();
})();
