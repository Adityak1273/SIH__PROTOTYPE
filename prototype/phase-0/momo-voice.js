/* Momo voice profile
 * Uses the device/browser TTS engine, tuned for a calm, clear, warm female-presenting
 * delivery inspired by the supplied reference sample. This does NOT clone the source speaker.
 */
(() => {
  const profile = {
    locale: 'en-IN',
    rate: 0.88,
    pitch: 1.14,
    volume: 1,
    voiceNameHints: [
      'female', 'woman', 'girl', 'google english india female',
      'en-in-x-ene', 'en-in-x-end', 'en-in-x-enc', 'en-in-x-ena'
    ]
  };

  function getVoices() {
    try { return window.speechSynthesis?.getVoices?.() || []; } catch (_) { return []; }
  }

  function scoreVoice(v) {
    const lang = String(v?.lang || '').toLowerCase();
    const name = String(v?.name || '').toLowerCase();
    let score = 0;
    if (lang === 'en-in') score += 100;
    else if (lang.startsWith('en-in')) score += 90;
    else if (lang.startsWith('en')) score += 40;
    for (const hint of profile.voiceNameHints) if (name.includes(hint)) score += 25;
    if (/male|man|boy/.test(name)) score -= 60;
    if (/female|woman|girl/.test(name)) score += 35;
    if (v?.localService) score += 5;
    return score;
  }

  function chooseVoice() {
    return getVoices().slice().sort((a,b) => scoreVoice(b) - scoreVoice(a))[0] || null;
  }

  window.CCNERMomoVoice = {
    profile: { ...profile },
    getVoice: chooseVoice,
    getVoices,
    test(text = 'Hello. I am Momo. I am here with you. Take your time. We can do this together.') {
      const synth = window.speechSynthesis;
      if (!synth || typeof window.SpeechSynthesisUtterance !== 'function') return false;
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = profile.locale;
      u.rate = profile.rate;
      u.pitch = profile.pitch;
      u.volume = profile.volume;
      const voice = chooseVoice();
      if (voice) u.voice = voice;
      synth.speak(u);
      return true;
    }
  };

  // app.js creates every Momo utterance through speechSynthesis.speak().
  // Intercept that final call so the profile is applied consistently without
  // changing the game's scoring, recognition, or AI logic.
  const install = () => {
    const synth = window.speechSynthesis;
    if (!synth || synth.__ccnerMomoVoicePatched) return;
    const originalSpeak = synth.speak.bind(synth);
    synth.speak = (utterance) => {
      try {
        utterance.lang = profile.locale;
        utterance.rate = profile.rate;
        utterance.pitch = profile.pitch;
        utterance.volume = profile.volume;
        const voice = chooseVoice();
        if (voice) utterance.voice = voice;
      } catch (_) {}
      return originalSpeak(utterance);
    };
    synth.__ccnerMomoVoicePatched = true;
  };

  install();
  if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = () => install();
  }
})();
