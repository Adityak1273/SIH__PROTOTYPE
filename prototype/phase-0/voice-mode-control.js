/* Momo voice-mode control: Continuous or Manual. */
(() => {
  'use strict';
  if (window.__CCNER_VOICE_MODE_CONTROLLER__) return;
  window.__CCNER_VOICE_MODE_CONTROLLER__ = true;
  const KEY = 'ccner-momo-voice-mode';
  const getMode = () => localStorage.getItem(KEY) === 'manual' ? 'manual' : 'continuous';
  const getLanguage = () => {
    const raw = localStorage.getItem('ccner-p1-language') || window.CCNER_CONFIG?.LANGUAGE || 'en-IN';
    return ({en:'en-IN','en-IN':'en-IN',hi:'hi-IN','hi-IN':'hi-IN',bn:'bn-IN','bn-IN':'bn-IN',as:'as-IN','as-IN':'as-IN'})[raw] || 'en-IN';
  };
  let manualRecognition = null;
  let manualListening = false;

  function refreshButtons(){
    const mode=getMode();
    document.querySelectorAll('[data-ccner-voice]').forEach(btn=>{
      const active=btn.dataset.ccnerVoice===mode;
      if(btn.classList.contains('active')!==active)btn.classList.toggle('active',active);
      const pressed=String(active);if(btn.getAttribute('aria-pressed')!==pressed)btn.setAttribute('aria-pressed',pressed);
    });
    const mic=document.querySelector('#l3VoiceBtn');
    if(mic){const title=mode==='manual'?'Tap to talk to Momo':'Talk to Momo';if(mic.title!==title)mic.title=title;if(mic.getAttribute('aria-label')!==title)mic.setAttribute('aria-label',title)}
  }
  function updateVoicePrompt(){const p=document.querySelector('#l3VoiceBox p');if(!p)return;const text=getMode()==='manual'?'Manual mode: tap the microphone each time you want to speak to Momo.':'Continuous mode: after Momo replies, he listens again automatically.';if(p.textContent!==text)p.textContent=text}
  function stopManual(){const r=manualRecognition;manualRecognition=null;manualListening=false;try{r?.stop()}catch(_) {}}
  function setMode(mode){
    const value=mode==='manual'?'manual':'continuous';localStorage.setItem(KEY,value);document.documentElement.dataset.ccnerVoiceMode=value;
    try{window.stopListening?.(false)}catch(_){}
    if(value==='manual'){if(window.state)window.state.voiceArmed=false;stopManual();}
    refreshButtons();updateVoicePrompt();
  }
  function manualListen(){
    if(getMode()!=='manual'||manualListening)return;
    try{window.stopListening?.(false)}catch(_){}
    if(window.state)window.state.voiceArmed=false;
    const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!Recognition){const status=document.querySelector('#statusText');if(status)status.textContent='Voice recognition unavailable';return;}
    const r=new Recognition();manualRecognition=r;manualListening=true;r.lang=getLanguage();r.interimResults=true;r.continuous=false;r.maxAlternatives=1;
    const hint=document.querySelector('#voiceHint'),status=document.querySelector('#statusText');if(hint)hint.hidden=false;if(status)status.textContent='Listening for you';
    let submitted=false;
    r.onresult=e=>{let finalText='',interim='';for(let i=e.resultIndex;i<e.results.length;i++){const text=e.results[i][0]?.transcript||'';if(e.results[i].isFinal)finalText+=text;else interim+=text}const speech=document.querySelector('#speechText');if(interim&&speech)speech.textContent=interim;if(!submitted&&finalText.trim()){submitted=true;window.respond?.(finalText.trim());try{r.stop()}catch(_) {}}};
    const finish=()=>{if(manualRecognition===r)manualRecognition=null;manualListening=false;if(hint)hint.hidden=true;if(status)status.textContent='Ready to play'};r.onerror=finish;r.onend=finish;try{r.start()}catch(_){finish()}
  }
  function hookMic(){const button=document.querySelector('#l3VoiceBtn');if(!button||button.dataset.ccnerManualHook==='1')return;button.dataset.ccnerManualHook='1';button.addEventListener('click',e=>{if(getMode()!=='manual')return;e.preventDefault();e.stopImmediatePropagation();manualListen()},true)}
  function findVoiceRow(){
    const label=[...document.querySelectorAll('body *')].find(el=>{if(el.children.length!==0)return false;const text=el.textContent.trim();return /(?:🎙️|🎤|🎧|microphone|mic)?\s*Voice mode\b/i.test(text)&&text.length<80});
    if(!label)return null;let node=label.parentElement;
    for(let i=0;node&&i<8;i++,node=node.parentElement){if(node.tagName==='BUTTON')return node.parentElement;const hasValue=[...node.querySelectorAll('*')].some(el=>el.children.length===0&&['Continuous','Manual'].includes(el.textContent.trim()));if(hasValue)return node}
    return label.parentElement;
  }
  function ensureSettingsControl(){
    const row=findVoiceRow();if(!row||row.querySelector('.ccner-voice-mode-control'))return;
    const control=document.createElement('div');control.className='ccner-voice-mode-control';control.setAttribute('aria-label','Momo voice mode');
    control.innerHTML='<button type="button" data-ccner-voice="continuous" aria-pressed="false">Continuous</button><button type="button" data-ccner-voice="manual" aria-pressed="false">Manual</button>';
    const oldValue=[...row.querySelectorAll('*')].find(el=>el.children.length===0&&['Continuous','Manual'].includes(el.textContent.trim()));
    if(oldValue&&oldValue.tagName!=='BUTTON')oldValue.replaceWith(control);else row.appendChild(control);
    control.querySelectorAll('[data-ccner-voice]').forEach(btn=>btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();setMode(btn.dataset.ccnerVoice)}));refreshButtons();
  }
  const style=document.createElement('style');style.textContent='.ccner-voice-mode-control{display:flex!important;gap:8px;align-items:center;justify-content:flex-end;flex-wrap:wrap;margin-left:auto;flex-shrink:0}.ccner-voice-mode-control button{border:1px solid #dfd1c2!important;background:#fffaf5!important;color:#4f443b!important;border-radius:10px!important;padding:8px 12px!important;font-weight:800!important;cursor:pointer!important;line-height:1.1!important}.ccner-voice-mode-control button.active{background:#6d4ca5!important;color:#fff!important;border-color:#6d4ca5!important}.ccner-voice-mode-control button:focus-visible{outline:3px solid rgba(109,76,165,.25);outline-offset:2px}@media(max-width:560px){.ccner-voice-mode-control{margin-left:0;justify-content:flex-start;margin-top:6px}}';document.head.appendChild(style);
  document.documentElement.dataset.ccnerVoiceMode=getMode();window.CCNERVoiceMode={getMode,setMode,manualListen,stopManual};
  function boot(){hookMic();ensureSettingsControl();refreshButtons();updateVoicePrompt()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  setInterval(()=>{hookMic();ensureSettingsControl();refreshButtons();updateVoicePrompt()},1000);
})();