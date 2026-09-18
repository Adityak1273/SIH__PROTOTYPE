(() => {
  const rig = () => document.querySelector('#momoRig');
  const stage = () => document.querySelector('#stage');
  const moodMap = {happy:'happy',excited:'excited',celebrate:'celebrate',thinking:'thinking',listening:'listening',encourage:'encourage',speaking:'speaking',sad:'sad'};
  let last = '', blinkTimer;
  function apply(mood) {
    const r = rig(); if (!r) return;
    const m = moodMap[mood] || 'happy';
    if (m === last) return;
    last = m;
    r.dataset.mood = m;
    r.classList.remove('gesture-pulse'); void r.offsetWidth; r.classList.add('gesture-pulse');
    if (navigator.vibrate && ['excited','celebrate'].includes(m)) navigator.vibrate(18);
  }
  function blink() {
    const r = rig(); if (!r) return;
    const lids = r.querySelectorAll('.momo-lid');
    lids.forEach(x => x.style.transform = 'translateY(0)');
    setTimeout(() => lids.forEach(x => x.style.transform = 'translateY(-35px)'), 115);
    scheduleBlink();
  }
  function scheduleBlink() { clearTimeout(blinkTimer); blinkTimer = setTimeout(blink, 2200 + Math.random()*4200); }
  function gaze(e) {
    const r = rig(); if (!r) return;
    const rect = r.getBoundingClientRect();
    const dx = Math.max(-5, Math.min(5, (e.clientX - (rect.left + rect.width/2))/70));
    const dy = Math.max(-4, Math.min(4, (e.clientY - (rect.top + rect.height*.3))/90));
    r.querySelectorAll('.momo-pupil').forEach(p => p.style.transform = `translate(${dx}px,${dy}px)`);
  }
  function observe() {
    const s = stage(); if (!s) return;
    const sync = () => { const c = [...s.classList].find(x => x.startsWith('mood-')); apply(c ? c.slice(5) : 'happy'); };
    new MutationObserver(sync).observe(s, {attributes:true, attributeFilter:['class']});
    window.addEventListener('pointermove', gaze, {passive:true});
    sync(); scheduleBlink();
  }
  window.MomoAvatar = {
    setMood: apply,
    gesture(name) {
      const r = rig(); if (!r) return;
      r.dataset.gesture = name || 'none'; clearTimeout(r._gestureTimer);
      r._gestureTimer = setTimeout(() => { r.dataset.gesture = 'none'; }, 1200);
    },
    react(type) {
      const map = {correct:'celebrate',incorrect:'encourage',thinking:'thinking',listening:'listening',speaking:'speaking',welcome:'happy',sad:'sad'};
      apply(map[type] || 'happy');
      this.gesture(type === 'correct' ? 'both-up' : type === 'incorrect' ? 'shrug' : type === 'welcome' ? 'wave' : type);
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', observe); else observe();
})();
