(function () {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  function renderPatientDashboard() {
    const home = $('#homeView');
    if (!home) return;

    // Clean up existing dashboard if any
    const existing = $('#level3Dashboard');
    if (existing) existing.remove();

    const user = window.CCNERAuth?.getUser?.() || { name: 'Aditya' };
    const profile = window.CCNERAuth?.getProfile?.() || {};
    const name = profile.preferred_name || user.name || 'Aditya';

    const s = window.CCNERRuleEngine?.state() || {};
    const history = s.history || [];
    const lastSession = history[history.length - 1];

    const tasks = s.tasks || [];
    const pendingTasks = tasks.filter((t) => !t.completed).length;

    // Build elderly-friendly simple dashboard
    const html = `
      <section id="level3Dashboard" class="patient-dashboard-simple">
        <div class="dash-greeting">
          <h2>Hello, ${name}</h2>
          <p>Welcome to your daily cognitive training.</p>
        </div>

        <div class="dash-primary-card">
          <div class="dash-mimo-rig">
            ${$('#momoRig')?.innerHTML || '🐶'}
          </div>
          <div class="dash-primary-content">
            <h3>Ready to play?</h3>
            <p>Your daily exercises are waiting for you.</p>
            <button class="action-button primary" id="dashStartGames">
              <span aria-hidden="true">🎮</span> Play a Game
            </button>
          </div>
        </div>

        <div class="dash-grid">
          <button class="dash-card-btn" id="dashTalkMimo">
            <span class="icon">🐶</span>
            <strong>Talk to Mimo</strong>
            <small>Ask questions or chat</small>
          </button>
          
          <button class="dash-card-btn" id="dashReminders">
            <span class="icon">⏰</span>
            <strong>Reminders</strong>
            <small>${pendingTasks ? pendingTasks + ' pending tasks' : 'View daily schedule'}</small>
          </button>
          
          <button class="dash-card-btn" id="dashProgress">
            <span class="icon">📈</span>
            <strong>Progress</strong>
            <small>${lastSession ? 'Last score: ' + Math.round(lastSession.score * 100) + '%' : 'Check your history'}</small>
          </button>
        </div>

        <div class="dash-today-card">
          <h3>Today's Focus</h3>
          <p>We'll work on memory, attention, and identifying patterns. Take your time, there is no rush.</p>
        </div>
      </section>
    `;

    // Clear old homeView contents (except maybe the actual view structure)
    // Actually we will just replace the innerHTML or prepend
    home.innerHTML = '';
    home.insertAdjacentHTML('afterbegin', html);

    bindEvents();
  }

  function bindEvents() {
    const btnGames = $('#dashStartGames');
    const btnMimo = $('#dashTalkMimo');
    const btnReminders = $('#dashReminders');
    const btnProgress = $('#dashProgress');

    if (btnGames) {
      btnGames.onclick = () => {
        if (window.startSession) window.startSession();
        else if (window.showView) window.showView('#gameView');
      };
    }

    if (btnMimo) {
      btnMimo.onclick = () => {
        if (window.CCNERUIUpgrade?.openTalk) window.CCNERUIUpgrade.openTalk();
        else if (window.openTalk) window.openTalk();
      };
    }

    if (btnReminders) {
      btnReminders.onclick = () => {
        if (window.openPanel) window.openPanel('reminders');
      };
    }

    if (btnProgress) {
      btnProgress.onclick = () => {
        if (window.showView) window.showView('#resultsView');
      };
    }
  }

  function boot() {
    const role = window.CCNERAuth?.getUser?.()?.role || window.CCNERRuleEngine?.state()?.role;
    if (role === 'patient') {
      renderPatientDashboard();
    }
  }

  window.CCNERLevel3 = {
    refresh: boot
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();window.addEventListener('ccner:language-change', () => window.CCNERLevel3?.refresh());
