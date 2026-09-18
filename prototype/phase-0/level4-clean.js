/* Cognitive Care NER — Level 4 clean game-mode controller.
 * Tutorial is shown once per game, never once per round/stage.
 * Game mode contains only the active game and one Exit Game control.
 * No continuous voice recognition is started in game mode.
 */
(() => {
  'use strict';
  if (window.__CCNER_LEVEL4_CLEAN__) return;
  window.__CCNER_LEVEL4_CLEAN__ = true;

  const $ = s => document.querySelector(s);
  const lang = () => localStorage.getItem('ccner-p1-language') || 'en-IN';
  const lk = () => lang().slice(0, 2);
  const COPY = {
    en:{yes:'Yes',no:'No',ask:'Would you like a tutorial?',title:'Before we play',continue:'Continue',exit:'Exit Game',exitTitle:'Leave this game?',exitText:'Your current game will end safely. Completed games remain saved.',stay:'Stay',leave:'Exit Game',objective:'Objective',rules:'Rules',interaction:'How to interact'},
    hi:{yes:'हाँ',no:'नहीं',ask:'क्या आप ट्यूटोरियल चाहते हैं?',title:'खेल शुरू करने से पहले',continue:'जारी रखें',exit:'गेम से बाहर निकलें',exitTitle:'क्या आप गेम छोड़ना चाहते हैं?',exitText:'आपका वर्तमान गेम सुरक्षित रूप से समाप्त हो जाएगा। पूरे किए गए गेम सेव रहेंगे।',stay:'रुकें',leave:'बाहर निकलें',objective:'उद्देश्य',rules:'नियम',interaction:'कैसे खेलें'},
    bn:{yes:'হ্যাঁ',no:'না',ask:'আপনি কি টিউটোরিয়াল চান?',title:'খেলা শুরুর আগে',continue:'চালিয়ে যান',exit:'গেম ছাড়ুন',exitTitle:'গেম ছেড়ে যাবেন?',exitText:'বর্তমান গেমটি নিরাপদে শেষ হবে। সম্পূর্ণ করা গেমগুলো সংরক্ষিত থাকবে।',stay:'থাকুন',leave:'বেরিয়ে যান',objective:'উদ্দেশ্য',rules:'নিয়ম',interaction:'কীভাবে খেলবেন'},
    as:{yes:'হয়',no:'নহয়',ask:'আপুনি টিউটোৰিয়েল বিচাৰে নেকি?',title:'খেল আৰম্ভ কৰাৰ আগতে',continue:'আগবাঢ়ক',exit:'খেল এৰক',exitTitle:'খেল এৰিব নেকি?',exitText:'বৰ্তমান খেলখন সুৰক্ষিতভাৱে শেষ হ’ব। সম্পূৰ্ণ কৰা খেলসমূহ সংৰক্ষিত থাকিব।',stay:'থাকক',leave:'এৰক',objective:'উদ্দেশ্য',rules:'নিয়ম',interaction:'কেনেকৈ খেলিব'}
  };
  const t = k => (COPY[lk()] || COPY.en)[k];

  const INFO = {
    'Sequence Memory':{o:{en:'Remember the order in which the colours light up.',hi:'रंग जिस क्रम में जलें, उस क्रम को याद रखें।',bn:'রঙগুলো যে ক্রমে জ্বলে ওঠে, সেই ক্রম মনে রাখুন।',as:'ৰঙবোৰ যি ক্ৰমত জ্বলি উঠে সেই ক্ৰম মনত ৰাখক।'},r:{en:'Watch the colour tiles carefully. After the preview, tap the same colours in the same order.',hi:'रंगों की टाइल ध्यान से देखें। फिर वही रंग उसी क्रम में दबाएँ।',bn:'রঙের টাইলগুলো মন দিয়ে দেখুন। তারপর একই ক্রমে একই রঙ চাপুন।',as:'ৰঙৰ টাইলবোৰ ভালদৰে চাওক। তাৰ পিছত একে ক্ৰমত একে ৰং টিপক।'},i:{en:'Tap one large colour tile at a time.',hi:'एक-एक करके बड़े रंग के बटन दबाएँ।',bn:'একবারে একটি বড় রঙের টাইল চাপুন।',as:'এবাৰত এটা ডাঙৰ ৰঙৰ টাইল টিপক।'}},
    'Stroop Test':{o:{en:'Choose the colour of the ink, not the word.',hi:'शब्द नहीं, स्याही का रंग चुनें।',bn:'শব্দ নয়, লেখার কালির রঙ বেছে নিন।',as:'শব্দটো নহয়, লিখনিটোৰ ৰংটো বাছক।'},r:{en:'A colour word may appear in a different ink colour. Select the ink colour and continue for two minutes.',hi:'रंग का शब्द दूसरे रंग की स्याही में आ सकता है। स्याही का रंग चुनें और दो मिनट तक जारी रखें।',bn:'একটি রঙের শব্দ অন্য রঙের কালিতে দেখা যেতে পারে। কালির রঙ বেছে নিয়ে দুই মিনিট চালিয়ে যান।',as:'এটা ৰঙৰ শব্দ আন ৰঙৰ কালিত দেখা দিব পাৰে। কালিৰ ৰং বাছি দুই মিনিট খেলক।'},i:{en:'Tap the large colour answer.',hi:'बड़ा रंग वाला उत्तर दबाएँ।',bn:'বড় রঙের উত্তরটি চাপুন।',as:'ডাঙৰ ৰঙৰ উত্তৰটো টিপক।'}},
    'Around the House Sorting':{o:{en:'Put each familiar household item in the place where it belongs.',hi:'हर परिचित घरेलू वस्तु को सही जगह पर रखें।',bn:'প্রতিটি পরিচিত ঘরের জিনিস তার সঠিক জায়গায় রাখুন।',as:'প্ৰতিটো চিনাকি ঘৰুৱা বস্তু তাৰ সঠিক ঠাইত ৰাখক।'},r:{en:'Look at each item, choose one of the two locations, then check your answers.',hi:'हर वस्तु देखें, दो जगहों में से एक चुनें, फिर उत्तर जाँचें।',bn:'প্রতিটি জিনিস দেখুন, দুটি জায়গার একটি বেছে নিন, তারপর উত্তর পরীক্ষা করুন।',as:'প্ৰতিটো বস্তু চাওক, দুটা ঠাইৰ এটাৰ বাছনি কৰক, তাৰ পিছত উত্তৰ পৰীক্ষা কৰক।'},i:{en:'Tap the large location button for each item.',hi:'हर वस्तु के लिए बड़ा जगह वाला बटन दबाएँ।',bn:'প্রতিটি জিনিসের জন্য বড় জায়গার বোতাম চাপুন।',as:'প্ৰতিটো বস্তুৰ বাবে ডাঙৰ ঠাইৰ বুটাম টিপক।'}},
    'Pattern Recognition':{o:{en:'Find the rule in the sequence and choose what comes next.',hi:'क्रम में नियम पहचानें और अगला अंक चुनें।',bn:'ধারার নিয়ম খুঁজে পরের সংখ্যাটি বেছে নিন।',as:'ধাৰাটোৰ নিয়ম বিচাৰি পৰৱৰ্তী সংখ্যাটো বাছক।'},r:{en:'Look carefully at the sequence, think about how it changes, then choose one answer.',hi:'क्रम को ध्यान से देखें, बदलाव समझें और एक उत्तर चुनें।',bn:'ধারাটি মন দিয়ে দেখুন, কীভাবে বদলাচ্ছে বুঝুন, তারপর একটি উত্তর বেছে নিন।',as:'ধাৰাটো ভালদৰে চাওক, কেনেকৈ সলনি হৈছে বুজক আৰু এটা উত্তৰ বাছক।'},i:{en:'Tap one large answer choice.',hi:'एक बड़ा उत्तर दबाएँ।',bn:'একটি বড় উত্তর চাপুন।',as:'এটা ডাঙৰ উত্তৰ টিপক।'}},
    'Spot the Difference':{o:{en:'Remember the items, then find the item that changed.',hi:'वस्तुओं को याद रखें, फिर बदली हुई वस्तु खोजें।',bn:'জিনিসগুলো মনে রাখুন, তারপর যে জিনিসটি বদলেছে সেটি খুঁজুন।',as:'বস্তুবোৰ মনত ৰাখক, তাৰ পিছত সলনি হোৱা বস্তুটো বিচাৰক।'},r:{en:'First you get a short memorization phase. Then one item changes. Tap the changed item.',hi:'पहले थोड़ी देर याद करने का समय मिलेगा। फिर एक वस्तु बदलेगी। बदली वस्तु दबाएँ।',bn:'প্রথমে অল্প সময় মনে রাখার জন্য দেখানো হবে। তারপর একটি জিনিস বদলাবে। বদলানো জিনিসটি চাপুন।',as:'প্ৰথমে অলপ সময় মনত ৰখাৰ বাবে দেখুওৱা হ’ব। তাৰ পিছত এটা বস্তু সলনি হ’ব। সলনি হোৱা বস্তুটো টিপক।'},i:{en:'Tap the item that was not in the original set.',hi:'जो वस्तु पहले नहीं थी उसे दबाएँ।',bn:'যে জিনিসটি আগে ছিল না সেটি চাপুন।',as:'আগতে নথকা বস্তুটো টিপক।'}}
  };

  let lastGameTitle = '';
  let tutorialOpen = false;
  let exitModalOpen = false;

  const style = document.createElement('style');
  style.id = 'ccner-level4-clean-mode';
  style.textContent = `
    body.ccner-game-only{background:#07120d!important;overflow-x:hidden}
    body.ccner-game-only .app-shell{width:100%!important;max-width:none!important;padding:0!important;margin:0!important}
    body.ccner-game-only .app-shell> :not(#gameView){display:none!important}
    body.ccner-game-only #gameView{display:block!important;min-height:100vh;padding:12px 14px 90px!important;margin:0!important}
    body.ccner-game-only #gameView .game-top{max-width:650px;margin:8px auto 12px!important}
    body.ccner-game-only #gameView .game-card{max-width:650px;margin:0 auto!important}
    body.ccner-game-only #gameView .mini-companion{max-width:650px;margin:12px auto!important}
    body.ccner-game-only #l4CleanExit{display:flex;align-items:center;justify-content:space-between;gap:12px;max-width:650px;margin:0 auto 12px;padding:10px 14px;border-radius:16px;background:#f8eee5;font-size:14px;font-weight:700;color:#2f2722}
    body.ccner-game-only #l4CleanExit button{min-height:44px;padding:8px 16px;border-radius:12px;border:1px solid #cdb8a8;background:#fff;font-weight:800;cursor:pointer}
    body.ccner-game-only .l4-gamebar,body.ccner-game-only .l4v-bar{display:none!important}
    body.ccner-game-only #l567Routine{display:none!important}
    body.ccner-game-only .chat-row{display:none!important}
    body.ccner-game-only .top-actions{display:none!important}
    body.ccner-game-only .topbar{display:none!important}
    .ccner-l4-modal{position:fixed;inset:0;z-index:999999;background:rgba(5,15,10,.72);display:flex;align-items:center;justify-content:center;padding:18px}
    .ccner-l4-dialog{width:min(560px,94vw);max-height:90vh;overflow:auto;background:#fffaf3;border:2px solid #ead8c7;border-radius:28px;box-shadow:0 24px 70px rgba(0,0,0,.35);padding:28px;text-align:center}
    .ccner-l4-dialog h2{margin:0 0 18px;font-size:30px}.ccner-l4-dialog h3{text-align:left;margin:18px 0 5px;font-size:18px}.ccner-l4-dialog p{text-align:left;line-height:1.55;font-size:17px}.ccner-l4-momo{font-size:60px}.ccner-l4-row{display:flex;gap:14px;margin-top:22px}.ccner-l4-row button{flex:1;min-height:58px;border-radius:18px;border:2px solid #d9c6b6;font-size:18px;font-weight:800;cursor:pointer}.ccner-l4-primary{background:#72546d;color:#fff;border-color:#72546d!important}.ccner-l4-secondary{background:#fff;color:#4b3b35}
    @media(max-width:600px){.ccner-l4-row{flex-direction:column}.ccner-l4-dialog{padding:22px;border-radius:22px}}
  `;
  document.head.appendChild(style);

  function stopVoice(){try{window.speechSynthesis?.cancel()}catch(_){} }
  function speak(text){stopVoice();try{if('speechSynthesis' in window){const u=new SpeechSynthesisUtterance(text);u.lang=lang();u.rate=.9;u.pitch=1.06;window.speechSynthesis.speak(u)}}catch(_){} }
  function removeLegacyBars(){document.querySelectorAll('.l4-gamebar,.l4v-bar').forEach(e=>e.remove());}
  function ensureExit(){
    const game=$('#gameView'); if(!game||game.hidden)return;
    removeLegacyBars();
    if($('#l4CleanExit'))return;
    game.insertAdjacentHTML('afterbegin',`<div id="l4CleanExit"><span>Game mode</span><button type="button">${t('exit')}</button></div>`);
    $('#l4CleanExit button')?.addEventListener('click',showExitConfirm,{once:true});
  }
  function modal(html){document.querySelector('.ccner-l4-modal')?.remove();const e=document.createElement('div');e.className='ccner-l4-modal';e.innerHTML=html;document.body.appendChild(e);return e}
  function askTutorial(title){
    if(tutorialOpen||exitModalOpen)return;
    const info=INFO[title]; if(!info)return;
    tutorialOpen=true; stopVoice();
    const e=modal(`<div class="ccner-l4-dialog" role="dialog" aria-modal="true"><div class="ccner-l4-momo">🐶</div><small>MOMO</small><h2>${t('ask')}</h2><div class="ccner-l4-row"><button id="ccnerL4Yes" class="ccner-l4-primary">${t('yes')}</button><button id="ccnerL4No" class="ccner-l4-secondary">${t('no')}</button></div></div>`);
    $('#ccnerL4Yes')?.addEventListener('click',()=>showTutorial(title));
    $('#ccnerL4No')?.addEventListener('click',()=>{e.remove();tutorialOpen=false;stopVoice()});
    speak(t('ask'));
  }
  function showTutorial(title){
    const info=INFO[title]; if(!info)return;
    stopVoice();
    const get=x=>x[lk()]||x.en;
    const e=modal(`<div class="ccner-l4-dialog" role="dialog" aria-modal="true"><div class="ccner-l4-momo">🐶</div><small>MOMO</small><h2>${t('title')}</h2><h3>${t('objective')}</h3><p>${get(info.o)}</p><h3>${t('rules')}</h3><p>${get(info.r)}</p><h3>${t('interaction')}</h3><p>${get(info.i)}</p><div class="ccner-l4-row"><button id="ccnerL4Continue" class="ccner-l4-primary">${t('continue')}</button></div></div>`);
    speak(`${get(info.o)} ${get(info.r)} ${get(info.i)}`);
    $('#ccnerL4Continue')?.addEventListener('click',()=>{e.remove();tutorialOpen=false;stopVoice()});
  }
  function showExitConfirm(){
    if(exitModalOpen)return; exitModalOpen=true; stopVoice();
    const e=modal(`<div class="ccner-l4-dialog" role="dialog" aria-modal="true"><div class="ccner-l4-momo">🐶</div><h2>${t('exitTitle')}</h2><p>${t('exitText')}</p><div class="ccner-l4-row"><button id="ccnerL4Stay" class="ccner-l4-secondary">${t('stay')}</button><button id="ccnerL4Leave" class="ccner-l4-primary">${t('leave')}</button></div></div>`);
    $('#ccnerL4Stay')?.addEventListener('click',()=>{e.remove();exitModalOpen=false});
    $('#ccnerL4Leave')?.addEventListener('click',()=>{e.remove();exitModalOpen=false;leaveGame()});
  }
  function leaveGame(){
    stopVoice();
    try{document.getElementById('homeButton')?.click()}catch(_){}
    document.body.classList.remove('ccner-game-only','ccner-adaptive-v4');
    removeLegacyBars();
    document.getElementById('l4CleanExit')?.remove();
    const game=$('#gameView'),home=$('#homeView'),results=$('#resultsView');
    if(game)game.hidden=true;if(results)results.hidden=true;if(home)home.hidden=false;
    const status=$('#todayStatus');if(status)status.textContent='Session exited';
    lastGameTitle='';
    window.dispatchEvent(new CustomEvent('ccner:level4-exit'));
  }
  function enterGameMode(){
    document.body.classList.add('ccner-game-only');
    ensureExit();
    const title=$('#gameTitle')?.textContent?.trim()||'';
    if(title&&INFO[title]&&title!==lastGameTitle){
      lastGameTitle=title;
      setTimeout(()=>askTutorial(title),30);
    }
  }
  function observe(){
    const game=$('#gameView');
    if(!game||game.hidden){if(!exitModalOpen)document.body.classList.remove('ccner-game-only');return}
    enterGameMode();
  }
  const mo=new MutationObserver(observe);
  mo.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden']});

  window.CCNER_LEVEL4_START_HOOK=()=>{
    const api=window.CCNER_VIDEO_GAMES;
    if(!api?.startSession)return false;
    stopVoice(); lastGameTitle='';
    api.startSession();
    setTimeout(observe,0);
    return true;
  };
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopVoice()});
  window.addEventListener('pagehide',stopVoice);
  setTimeout(observe,0);
})();
