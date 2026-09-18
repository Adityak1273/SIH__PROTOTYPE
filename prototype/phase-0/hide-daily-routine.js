/* Cognitive Care NER — remove Daily Routine Recall from the patient-facing dashboard. */
(() => {
  'use strict';
  function removeRoutine() {
    document.querySelector('#l567Routine')?.remove();
  }
  removeRoutine();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', removeRoutine, { once: true });
  }
  window.addEventListener('load', removeRoutine, { once: true });
  const observer = new MutationObserver(removeRoutine);
  observer.observe(document.body, { childList: true, subtree: true });
  setTimeout(() => observer.disconnect(), 10000);
})();
