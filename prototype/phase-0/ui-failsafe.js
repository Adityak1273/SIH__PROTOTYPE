/* Cognitive Care NER — interaction failsafe
 * Keeps core navigation/actions alive if a progressive enhancement module fails.
 */
(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const go = (id) => {
    $$('.view').forEach(v => v.hidden = true);
    const target = $(id);
    if (target) target.hidden = false;
    $$('.bottom-nav button').forEach(b => b.classList.toggle('active', b.dataset.nav === id.slice(1)));
    window.scrollTo?.({ top: 0, behavior: 'smooth' });
  };
  function wire() {
    if (window.__ccnerFailsafeWired) return;
    window.__ccnerFailsafeWired = true;
    document.addEventListener('click', (e) => {
      const el = e.target.closest('button');
      if (!el) return;
      if (el.dataset.action === 'start') {
        if (typeof window.startSession === 'function') return window.startSession();
        const game = $('#gameView'); if (game) { go('#gameView'); $('#todayStatus') && ($('#todayStatus').textContent = 'In progress'); }
      }
      if (el.dataset.action === 'talk') {
        if (window.CCNERUIUpgrade?.openTalk) return window.CCNERUIUpgrade.openTalk();
        if (typeof window.armVoice === 'function') return window.armVoice();
      }
      if (el.dataset.action === 'reminder') return window.CCNERPhase1?.openPanel?.('reminders');
      if (el.dataset.action === 'progress') return go('#resultsView');
      if (el.id === 'homeButton' || el.id === 'backHome') return go('#homeView');
      if (el.id === 'playAgain') {
        if (typeof window.startSession === 'function') return window.startSession();
        return go('#gameView');
      }
      if (el.dataset.nav === 'homeView') return go('#homeView');
      if (el.dataset.nav === 'resultsView') {
        if (typeof window.showResultsFromHistory === 'function') return window.showResultsFromHistory();
        return go('#resultsView');
      }
      if (el.dataset.nav === 'reminders') return window.CCNERPhase1?.openPanel?.('reminders');
      if (el.dataset.nav === 'settings') return window.CCNERPhase1?.openPanel?.('settings');
      if (el.id === 'sendButton') {
        const input = $('#chatInput');
        if (input?.value?.trim() && typeof window.respond === 'function') {
          const value = input.value.trim(); input.value = ''; return window.respond(value);
        }
      }
    }, true);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})();
