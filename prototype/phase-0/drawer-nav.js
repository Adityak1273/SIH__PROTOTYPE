(function() {
  function initDrawer() {
    // Only initialize once
    if (document.getElementById('navDrawer')) return;

    const drawerHTML = `
      <div id="navOverlay" class="nav-overlay"></div>
      <aside id="navDrawer" class="nav-drawer" aria-label="Sidebar Navigation">
        <div class="nav-drawer-header">
          <h2>Cognitive Care</h2>
          <p id="navDrawerRole">Welcome</p>
        </div>
        <ul class="nav-drawer-menu" id="navDrawerMenu">
          <!-- Dynamic links based on role will go here -->
        </ul>
      </aside>
    `;

    document.body.insertAdjacentHTML('afterbegin', drawerHTML);

    const overlay = document.getElementById('navOverlay');
    const drawer = document.getElementById('navDrawer');

    overlay.addEventListener('click', closeDrawer);

    // Add toggle button to topbar if not there
    const topbar = document.querySelector('.topbar');
    if (topbar && !document.getElementById('menuToggleBtn')) {
      const btn = document.createElement('button');
      btn.id = 'menuToggleBtn';
      btn.className = 'menu-toggle-btn';
      btn.innerHTML = '☰';
      btn.setAttribute('aria-label', 'Open navigation menu');
      btn.onclick = openDrawer;
      topbar.insertBefore(btn, topbar.firstChild);
      
      // Wrap existing topbar content
      const content = document.createElement('div');
      content.className = 'topbar-content';
      while (topbar.children.length > 1) {
        if (topbar.children[1].className === 'top-actions') {
          break; // keep top-actions at right
        }
        content.appendChild(topbar.children[1]);
      }
      topbar.insertBefore(content, topbar.querySelector('.top-actions'));
    }

    // Keyboard escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.classList.contains('open')) {
        closeDrawer();
      }
    });
  }

  function openDrawer() {
    document.getElementById('navDrawer').classList.add('open');
    document.getElementById('navOverlay').classList.add('open');
    updateDrawerMenu();
  }

  function closeDrawer() {
    document.getElementById('navDrawer').classList.remove('open');
    document.getElementById('navOverlay').classList.remove('open');
  }

  function updateDrawerMenu() {
    const menu = document.getElementById('navDrawerMenu');
    const roleHeader = document.getElementById('navDrawerRole');
    if (!menu) return;

    const user = window.CCNERAuth?.getUser?.();
    const profile = window.CCNERAuth?.getProfile?.();
    const role = user?.role || 'patient';
    
    if (user) {
      roleHeader.textContent = \`\${profile?.preferred_name || user.name} (\${role})\`;
    }

    // Current view
    const currentView = document.querySelector('.view:not([hidden])')?.id || 'homeView';

    let links = '';
    
    if (role === 'caregiver' || role === 'health_worker') {
      links = \`
        <li><button type="button" data-nav="homeView" \${currentView === 'homeView' ? 'class="active"' : ''}><span>📊</span> Overview</button></li>
        <li><button type="button" data-nav="patients"><span>👥</span> Patients</button></li>
        <li><button type="button" data-nav="resultsView" \${currentView === 'resultsView' ? 'class="active"' : ''}><span>📈</span> Progress</button></li>
        <li><button type="button" data-nav="reminders"><span>⏰</span> Reminders</button></li>
        <li><button type="button" data-nav="reports"><span>📄</span> Reports</button></li>
        <li><button type="button" data-nav="notes"><span>📝</span> Notes</button></li>
        <li><button type="button" data-nav="settings"><span>⚙️</span> Settings</button></li>
        <li><button type="button" data-nav="help"><span>❓</span> Help</button></li>
        <li><button type="button" data-nav="signout"><span>🚪</span> Sign Out</button></li>
      \`;
    } else {
      links = \`
        <li><button type="button" data-nav="homeView" \${currentView === 'homeView' ? 'class="active"' : ''}><span>⌂</span> Home</button></li>
        <li><button type="button" data-nav="games"><span>🎮</span> Games</button></li>
        <li><button type="button" data-nav="resultsView" \${currentView === 'resultsView' ? 'class="active"' : ''}><span>◉</span> Progress</button></li>
        <li><button type="button" data-nav="reminders"><span>◷</span> Reminders</button></li>
        <li><button type="button" data-nav="mimo"><span>🐶</span> Mimo</button></li>
        <li><button type="button" data-nav="settings"><span>⚙️</span> Settings</button></li>
        <li><button type="button" data-nav="help"><span>❓</span> Help / Support</button></li>
        <li><button type="button" data-nav="signout"><span>🚪</span> Sign Out</button></li>
      \`;
    }

    menu.innerHTML = links;

    // Attach handlers
    menu.querySelectorAll('button[data-nav]').forEach(btn => {
      btn.onclick = (e) => {
        closeDrawer();
        const target = btn.dataset.nav;
        
        // Custom actions
        if (target === 'signout') {
          if (window.CCNERAuth?.signOut) window.CCNERAuth.signOut();
          return;
        }
        if (target === 'settings') {
          if (role === 'patient' && window.CCNERAuth?.openPatientSettings) window.CCNERAuth.openPatientSettings();
          if ((role === 'caregiver' || role === 'health_worker') && window.CCNERAuth?.openCaregiverSettings) window.CCNERAuth.openCaregiverSettings();
          return;
        }
        if (target === 'reminders') {
          if (window.openPanel) window.openPanel('reminders');
          return;
        }
        if (target === 'mimo') {
          if (window.CCNERUIUpgrade?.openTalk) window.CCNERUIUpgrade.openTalk();
          return;
        }
        if (target === 'games') {
          // If a games view exists, show it, otherwise just homeView
          if (document.getElementById('gamesView')) {
            if (window.showView) window.showView('#gamesView');
          } else {
             if (window.showView) window.showView('#homeView');
          }
          return;
        }

        // Default view switching
        if (window.showView) {
          window.showView('#' + target);
        }
      };
    });
  }

  // Hook into DOM loaded
  document.addEventListener('DOMContentLoaded', () => {
    initDrawer();
  });
  
  // Hook into auth state changes if possible, or just update on open
  
  // Also expose to window
  window.CCNERDrawer = {
    init: initDrawer,
    open: openDrawer,
    close: closeDrawer,
    update: updateDrawerMenu
  };

})();
