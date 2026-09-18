(() => {
  const endpoint = window.COGNITIVE_AI_ENDPOINT;
  if (!endpoint || !window.fetch) return;
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url;
    if (url !== '/api/chat') return originalFetch(input, init);
    let nextInit = {...init, headers:{'Content-Type':'application/json',...(init.headers||{})}};
    try {
      const body = JSON.parse(init.body || '{}');
      body.language = window.CCNERLanguage?.locale || localStorage.getItem('ccner-language') || 'en-IN';
      body.languageName = window.CCNERLanguage?.nativeName || '';
      nextInit.body = JSON.stringify(body);
    } catch (_) {}
    return originalFetch(endpoint, nextInit);
  };
})();
