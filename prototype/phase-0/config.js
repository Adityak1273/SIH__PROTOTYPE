// Public client configuration. Never put service-role or private secrets here.
window.CCNER_CONFIG = {
  AI_ENDPOINT: 'https://sih-prototype-repo.zopcloud.zop.dev/api/chat',
  SUPABASE_URL: 'https://mmgvgqtjlcrrfkehlqqe.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_cchVUBU7WOnxYH_sI8A1QA_05f1Sz4v',
  APP_VERSION: '0.19.0'
};
window.COGNITIVE_AI_ENDPOINT = window.CCNER_CONFIG.AI_ENDPOINT;

(() => {
  const load = (src) => { const s=document.createElement('script'); s.src='./'+src+'?v=0.19.0'; s.defer=true; document.head.appendChild(s); };
  const css = document.createElement('link'); css.rel='stylesheet'; css.href='./clinical-intelligence.css?v=0.19.0'; document.head.appendChild(css);
  load('voice-mode-control.js');
  load('clinical-intelligence.js');
  load('clinical-report-file.js');
  load('clinical-adaptive-bridge.js');
})();
