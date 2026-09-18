/* Enhanced Northeast language selector/search/status UI. */
(() => {
  'use strict';
  const boot = () => {
    const registry = window.CCNER_LANGUAGE_REGISTRY || [];
    const home = document.getElementById('homeView');
    if (!home || !registry.length) return;
    const old = document.getElementById('ccnerLanguageCard');
    if (old) old.remove();
    const existing = document.getElementById('ccnerRegionalLanguageCard');
    if (existing) return;
    const card = document.createElement('section');
    card.id = 'ccnerRegionalLanguageCard';
    card.className = 'regional-language-card';
    card.innerHTML = `
      <div class="regional-language-head">
        <div>
          <p class="eyebrow">LANGUAGE</p>
          <h3>Choose your language</h3>
          <p class="regional-language-help">Search by English name, native name, state, or alias.</p>
        </div>
        <span class="regional-language-count">${registry.filter(x=>x.status==='implemented').length} implemented</span>
      </div>
      <label class="regional-language-search">
        <span>🔎</span>
        <input id="regionalLanguageSearch" type="search" autocomplete="off" placeholder="Search 29 languages…" aria-label="Search languages">
      </label>
      <div id="regionalLanguageResults" class="regional-language-results"></div>
      <details class="regional-language-details">
        <summary>Implementation status</summary>
        <div class="regional-language-table-wrap">
          <table class="regional-language-table">
            <thead><tr><th>Language</th><th>State</th><th>English parallel data</th><th>Status</th></tr></thead>
            <tbody id="regionalLanguageTableBody"></tbody>
          </table>
        </div>
      </details>
      <p id="regionalLanguageMessage" class="regional-language-message" aria-live="polite"></p>
    `;
    home.appendChild(card);

    const search = card.querySelector('#regionalLanguageSearch');
    const results = card.querySelector('#regionalLanguageResults');
    const tableBody = card.querySelector('#regionalLanguageTableBody');
    const message = card.querySelector('#regionalLanguageMessage');

    const renderResults = list => {
      results.innerHTML = list.length ? list.map(x => `
        <button class="regional-language-option ${x.status}" type="button" data-regional-lang="${x.id}">
          <span class="regional-language-name"><strong>${escapeHtml(x.native)}</strong><small>${escapeHtml(x.name)}</small></span>
          <span class="regional-language-meta"><small>${escapeHtml(x.state)}</small><b>${x.status==='implemented'?'Implemented':'Not implemented'}</b></span>
        </button>`).join('') : '<p class="regional-language-empty">No language matched your search.</p>';
      results.querySelectorAll('[data-regional-lang]').forEach(btn => btn.addEventListener('click', () => {
        const item = registry.find(x => x.id === btn.dataset.regionalLang);
        if (!item) return;
        if (item.status !== 'implemented') {
          message.textContent = `${item.name} is catalogued, but its English↔local implementation is not enabled yet.`;
          return;
        }
        const target = document.querySelector(`#ccnerLanguageCard [data-lang="${item.id}"]`);
        if (target) target.click();
        else if (item.id === 'en-IN') document.querySelector('#ccnerLanguageCard [data-lang="en-IN"]')?.click();
        message.textContent = `✓ ${item.name} selected.`;
      }));
    };
    const renderTable = () => {
      tableBody.innerHTML = registry.map(x => `<tr><td><strong>${escapeHtml(x.name)}</strong><small>${escapeHtml(x.native)}</small></td><td>${escapeHtml(x.state)}</td><td>${escapeHtml(x.pairs)}<small>${escapeHtml(x.data)}</small></td><td><span class="status-chip ${x.status}">${x.status==='implemented'?'Implemented':'Not implemented'}</span></td></tr>`).join('');
    };
    const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    search.addEventListener('input', () => renderResults(window.CCNERLanguageRegistry.search(search.value)));
    renderResults(registry);
    renderTable();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else setTimeout(boot, 250);
})();
