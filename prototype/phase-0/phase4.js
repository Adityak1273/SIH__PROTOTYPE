/* Phase 4 — production-readiness layer
 * Safety-first: training analytics are never presented as a diagnosis.
 * Critical startup intentionally contains no dynamic asset loader.
 * Phase 5 stability guard: multilingual.js must not observe characterData,
 * otherwise its own text replacement creates a MutationObserver feedback loop.
 */
(() => {
  'use strict';

  // Install before multilingual.js loads. The existing app only needs childList
  // observation for dynamic screens; disabling characterData breaks the recursive
  // text-node -> mutation -> text-node loop introduced by Phase 5 localization.
  if (!window.__CCNER_PHASE5_GUARD__) {
    const NativeMutationObserver = window.MutationObserver;
    if (typeof NativeMutationObserver === 'function') {
      window.__CCNER_PHASE5_GUARD__ = true;
      window.MutationObserver = function Phase5SafeMutationObserver(callback) {
        const observer = new NativeMutationObserver(callback);
        return {
          observe(target, options = {}) {
            observer.observe(target, { ...options, characterData: false, characterDataOldValue: false });
          },
          disconnect() { observer.disconnect(); },
          takeRecords() { return observer.takeRecords(); }
        };
      };
      window.MutationObserver.prototype = NativeMutationObserver.prototype;
    }
  }

  const KEY = 'ccner_phase4';
  let state = {};
  try { state = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (_) { state = {}; }
  state.consent = state.consent || { analytics: false, notifications: false };
  state.audit = state.audit || [];

  function save(){ try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) {} }
  function audit(action, detail=''){ state.audit.unshift({ action, detail, at:new Date().toISOString() }); state.audit=state.audit.slice(0,100); save(); }

  window.CognitiveCareProduction = {
    getConsent(){ return {...state.consent}; },
    setConsent(name, value){ if (!(name in state.consent)) return false; state.consent[name]=!!value; audit('consent_changed', `${name}:${!!value}`); return true; },
    recordSafetyEvent(action, detail){ audit(action, detail); },
    exportAudit(){ return JSON.stringify(state.audit, null, 2); },
    resetLocalProductionData(){ localStorage.removeItem(KEY); location.reload(); }
  };

  window.CognitiveCareClinicalSafety = {
    disclaimer: 'Cognitive training performance is not a dementia diagnosis or clinical staging assessment.',
    interpret(score){
      if (score >= 80) return 'Strong training performance in this session.';
      if (score >= 60) return 'Developing training performance; keep practicing regularly.';
      return 'This session was challenging. Consider easier practice and encouragement.';
    }
  };

  document.addEventListener('click', e => {
    const el=e.target.closest('[data-production-action]');
    if(el) audit(el.dataset.productionAction, el.dataset.detail || '');
  });
})();
