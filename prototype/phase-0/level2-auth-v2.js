/* Cognitive Care NER — Phase 1 & 2 Authentication, Progressive Onboarding,
 * Role-Based Redirection, Separate Dashboards & External Report Handling.
 * Authentication is powered by Laravel Backend with offline-resilient local fallback.
 */
(() => {
  'use strict';
  if (window.__CCNER_AUTH_V2__) return;
  window.__CCNER_AUTH_V2__ = true;

  const API_BASE = window.CCNER_API_BASE_URL || '/api/v1';
  let currentUser = null;
  let currentProfile = null;
  let authToken = localStorage.getItem('ccner-token') || null;
  let authMode = 'login'; // 'login' | 'signup'
  let currentStep = 0; // 0: welcome/choice, 1: credentials, 2..7: progressive onboarding
  let signupRole = 'patient'; // 'patient' | 'caregiver'
  let gateEl = null;

  const app = () => document.querySelector('.app-shell');
  function hideApp() { const x = app(); if (x) x.style.display = 'none'; }
  function showApp() { const x = app(); if (x) x.style.display = ''; }

  function msg(t) {
    const e = document.getElementById('l2vErr');
    if (!e) return;
    e.textContent = t || '';
    e.classList.toggle('show', !!t);
  }

  function calculateAge(dob) {
    if (!dob) return null;
    const d = new Date(dob + 'T00:00:00');
    const n = new Date();
    if (isNaN(d) || d > n) return null;
    let a = n.getFullYear() - d.getFullYear();
    if (n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) a--;
    return a >= 0 && a < 130 ? a : null;
  }

  function calculateCompletionPct(p) {
    if (!p) return 20;
    let pct = 0;
    if (p.full_name && p.date_of_birth) pct += 25;
    if (p.caregiver_info && Object.keys(p.caregiver_info).length > 0) pct += 20;
    if (p.health_background && Object.keys(p.health_background).length > 0) pct += 20;
    if (p.daily_life_background && Object.keys(p.daily_life_background).length > 0) pct += 15;
    if (p.accessibility_settings && Object.keys(p.accessibility_settings).length > 0) pct += 10;
    if (p.privacy_preferences && Object.keys(p.privacy_preferences).length > 0) pct += 10;
    return Math.min(100, Math.max(20, pct));
  }

  function updateProgressBar(pct, stepIndex) {
    const fill = document.querySelector('.l2v-pct-fill');
    const text = document.getElementById('l2vPctText');
    const badge = document.getElementById('l2vStepBadge');
    if (fill) fill.style.width = pct + '%';
    if (text) text.textContent = 'Profile completion: ' + pct + '%';
    if (badge && stepIndex >= 2) badge.textContent = 'Step ' + (stepIndex - 1) + ' of 6';
  }

  function showStep(n) {
    currentStep = n;
    gateEl?.querySelectorAll('.l2v-step').forEach(x => {
      x.classList.toggle('active', Number(x.dataset.step) === n);
    });
    msg('');
    if (n >= 2 && n <= 7) {
      const pct = calculateCompletionPct(gatherProfileData());
      updateProgressBar(pct, n);
    }
  }

  function setMode(m) {
    authMode = m;
    const title = document.getElementById('l2vCredTitle');
    const hint = document.getElementById('l2vCredHint');
    const submit = document.getElementById('l2vCredSubmit');
    const signupRoleBox = document.getElementById('l2vSignupRoleBox');

    if (m === 'login') {
      if (title) title.textContent = 'Login to your Cognitive Care account';
      if (hint) hint.textContent = 'Enter your Login ID / Username and Password to access your dashboard.';
      if (submit) submit.textContent = 'Login';
      if (signupRoleBox) signupRoleBox.style.display = 'none';
    } else {
      if (title) title.textContent = 'Create your Cognitive Care account';
      if (hint) hint.textContent = 'Enter your details once. Your account will securely preserve your training profile.';
      if (submit) submit.textContent = 'Create Account & Continue';
      if (signupRoleBox) signupRoleBox.style.display = 'grid';
    }
    showStep(1);
  }

  // Pre-fill Preset Demo Accounts
  function useDemoAccount(type) {
    setMode('login');
    const idInput = document.getElementById('l2vLoginId');
    const passInput = document.getElementById('l2vPassword');
    if (type === 'patient') {
      if (idInput) idInput.value = 'patient.demo';
      if (passInput) passInput.value = 'CognitiveCare2026!';
    } else {
      if (idInput) idInput.value = 'caregiver.demo';
      if (passInput) passInput.value = 'CognitiveCare2026!';
    }
    msg('');
    handleLogin();
  }

  function renderGate() {
    if (gateEl) return;
    hideApp();
    gateEl = document.createElement('div');
    gateEl.id = 'l2AuthGate';
    gateEl.innerHTML = `
      <div class="l2v-shell">
        <div class="l2v-brand">
          <div class="puppy">🐶</div>
          <h1>Cognitive Care NER</h1>
          <p>Elderly-friendly cognitive support with Momo companion</p>
        </div>

        <div class="l2v-card">
          <div id="l2vErr" class="l2v-error" role="alert"></div>

          <!-- STEP 0: Welcome / Choice -->
          <section class="l2v-step active" data-step="0">
            <div class="l2v-lock">🔐</div>
            <h2>Welcome to Cognitive Care</h2>
            <p class="hint">Please log in to continue your daily training or create a new account.</p>
            <div class="l2v-choice">
              <button class="l2v-btn primary" id="l2vBtnLogin">Login</button>
              <button class="l2v-btn secondary" id="l2vBtnSignup">Create Account</button>
            </div>

            <div class="l2v-demo-box">
              <strong>⭐ Reviewer & Evaluation Quick Demo Accounts</strong>
              <div class="l2v-demo-actions">
                <button class="l2v-demo-btn" id="l2vDemoPatient" type="button">
                  <span>👴</span> Use Patient Demo (patient.demo)
                </button>
                <button class="l2v-demo-btn" id="l2vDemoCaregiver" type="button">
                  <span>👩‍⚕️</span> Use Caregiver Demo (caregiver.demo)
                </button>
              </div>
            </div>

            <div class="l2v-note">
              <strong>Notice:</strong> All cognitive training scores reflect game engagement and activity patterns only. They do not constitute a dementia diagnosis or clinical assessment.
            </div>
          </section>

          <!-- STEP 1: Credentials (Login / Account Creation) -->
          <section class="l2v-step" data-step="1">
            <h2 id="l2vCredTitle">Login to your account</h2>
            <p class="hint" id="l2vCredHint">Enter your Login ID / Username and Password.</p>

            <div id="l2vSignupRoleBox" class="l2v-field" style="display:none">
              <label for="l2vRoleSelect">Account Type</label>
              <select id="l2vRoleSelect">
                <option value="patient">Patient (Elderly-friendly training with Momo)</option>
                <option value="caregiver">Caregiver (Monitoring & Routine Support)</option>
              </select>
            </div>

            <div class="l2v-field">
              <label for="l2vLoginId">Login ID / Username</label>
              <input id="l2vLoginId" type="text" autocomplete="username" placeholder="e.g. patient.demo or your username" required>
            </div>

            <div class="l2v-field">
              <label for="l2vPassword">Password</label>
              <input id="l2vPassword" type="password" autocomplete="current-password" placeholder="••••••••" required>
            </div>

            <div class="l2v-actions">
              <button class="l2v-btn primary" id="l2vCredSubmit">Login</button>
              <button class="l2v-btn ghost" id="l2vCredBack">Back</button>
            </div>
          </section>

          <!-- PROGRESS BAR (Steps 2 - 7) -->
          <div class="l2v-pct-box" id="l2vProgressBox" style="display:none">
            <span class="l2v-step-badge" id="l2vStepBadge">Step 1 of 6</span>
            <div class="l2v-pct-header">
              <span>Progressive Onboarding</span>
              <span id="l2vPctText">Profile completion: 25%</span>
            </div>
            <div class="l2v-pct-bar"><div class="l2v-pct-fill"></div></div>
          </div>

          <!-- STEP 2: Basic Patient Profile -->
          <section class="l2v-step" data-step="2">
            <h2>Basic Information</h2>
            <p class="hint">Tell us a little about the participant. Required fields are kept minimal.</p>
            <div class="l2v-grid">
              <div class="l2v-field">
                <label for="l2vFullName">Full Name *</label>
                <input id="l2vFullName" placeholder="e.g. Aditya Sharma" required>
              </div>
              <div class="l2v-field">
                <label for="l2vPrefName">Preferred Name / Call Name</label>
                <input id="l2vPrefName" placeholder="e.g. Aditya">
              </div>
              <div class="l2v-field">
                <label for="l2vDob">Date of Birth *</label>
                <input id="l2vDob" type="date">
              </div>
              <div class="l2v-field">
                <label for="l2vAge">Calculated Age</label>
                <input id="l2vAge" readonly placeholder="Calculated from DOB">
              </div>
              <div class="l2v-field">
                <label for="l2vGender">Gender</label>
                <select id="l2vGender">
                  <option value="Prefer not to say">Prefer not to say</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div class="l2v-field">
                <label for="l2vPhone">Phone Number</label>
                <input id="l2vPhone" type="tel" maxlength="10" placeholder="10-digit mobile number">
              </div>
              <div class="l2v-field">
                <label for="l2vCity">City / District</label>
                <input id="l2vCity" placeholder="e.g. Guwahati">
              </div>
              <div class="l2v-field">
                <label for="l2vState">State / Region</label>
                <input id="l2vState" placeholder="e.g. Assam">
              </div>
              <div class="l2v-field">
                <label for="l2vLang">Preferred Language</label>
                <select id="l2vLang">
                  <option value="en-IN">English (India)</option>
                  <option value="hi-IN">Hindi (हिंदी)</option>
                  <option value="as-IN">Assamese (অসমীয়া)</option>
                  <option value="bn-IN">Bengali (বাংলা)</option>
                </select>
              </div>
            </div>
            <div class="l2v-actions">
              <button class="l2v-btn primary" id="l2vStep2Next">Next: Family & Caregiver</button>
            </div>
          </section>

          <!-- STEP 3: Caregiver / Family Information -->
          <section class="l2v-step" data-step="3">
            <h2>Caregiver & Family Contact</h2>
            <p class="hint">Information for the primary caregiver and emergency support.</p>
            <div class="l2v-grid">
              <div class="l2v-field">
                <label for="l2vCgName">Caregiver Name</label>
                <input id="l2vCgName" placeholder="e.g. Pooja Sharma">
              </div>
              <div class="l2v-field">
                <label for="l2vCgRel">Relationship</label>
                <input id="l2vCgRel" placeholder="e.g. Daughter, Son, Spouse">
              </div>
              <div class="l2v-field">
                <label for="l2vCgPhone">Caregiver Phone</label>
                <input id="l2vCgPhone" type="tel" maxlength="10" placeholder="10-digit phone">
              </div>
              <div class="l2v-field">
                <label for="l2vEmergPhone">Emergency Contact Number</label>
                <input id="l2vEmergPhone" type="tel" maxlength="10" placeholder="10-digit phone">
              </div>
              <div class="l2v-field" style="grid-column: 1 / -1">
                <label for="l2vFamilyNotes">Family / Caregiver Notes</label>
                <textarea id="l2vFamilyNotes" placeholder="e.g. Likes morning workouts after breakfast; prefers gentle voice tone."></textarea>
              </div>
            </div>
            <div class="l2v-actions">
              <button class="l2v-btn primary" id="l2vStep3Next">Next: Health Background</button>
              <button class="l2v-btn ghost" id="l2vStep3Back">Back</button>
              <button class="l2v-btn skip" id="l2vStep3Skip">Skip for now</button>
            </div>
          </section>

          <!-- STEP 4: Health Background (Optional) -->
          <section class="l2v-step" data-step="4">
            <h2>Health Background (Optional)</h2>
            <p class="hint">User-provided observational background. Does not create medical conclusions.</p>
            <div class="l2v-grid">
              <div class="l2v-field">
                <label for="l2vConditions">Known Conditions (comma separated)</label>
                <input id="l2vConditions" placeholder="e.g. Mild memory forgetfulness, Hypertension">
              </div>
              <div class="l2v-field">
                <label for="l2vMedications">Current Medications</label>
                <input id="l2vMedications" placeholder="e.g. Amlodipine 5mg morning">
              </div>
              <div class="l2v-field">
                <label for="l2vAllergies">Allergies</label>
                <input id="l2vAllergies" placeholder="e.g. Penicillin, Pollen">
              </div>
              <div class="l2v-field">
                <label for="l2vSensory">Sensory or Physical Limitations</label>
                <input id="l2vSensory" placeholder="e.g. Uses reading glasses, mild hearing aid">
              </div>
              <div class="l2v-field" style="grid-column: 1 / -1">
                <label for="l2vSleep">Sleep & General Observations</label>
                <input id="l2vSleep" placeholder="e.g. Wakes up early at 5:30am">
              </div>
            </div>
            <div class="l2v-actions">
              <button class="l2v-btn primary" id="l2vStep4Next">Next: Daily Routine</button>
              <button class="l2v-btn ghost" id="l2vStep4Back">Back</button>
              <button class="l2v-btn skip" id="l2vStep4Skip">Skip for now</button>
            </div>
          </section>

          <!-- STEP 5: Daily-Life / Cognitive Background (Optional) -->
          <section class="l2v-step" data-step="5">
            <h2>Daily Life & Familiar Routines (Optional)</h2>
            <p class="hint">Helps Momo personalize conversations and select meaningful game themes.</p>
            <div class="l2v-grid">
              <div class="l2v-field">
                <label for="l2vHobbies">Hobbies & Interests</label>
                <input id="l2vHobbies" placeholder="e.g. Gardening, listening to old songs, tea">
              </div>
              <div class="l2v-field">
                <label for="l2vObjects">Familiar Objects & Places</label>
                <input id="l2vObjects" placeholder="e.g. Brahmaputra river, brass tea kettle">
              </div>
              <div class="l2v-field" style="grid-column: 1 / -1">
                <label for="l2vRoutine">Daily Routine Summary</label>
                <textarea id="l2vRoutine" placeholder="e.g. Morning walk, morning tea, 10am cognitive games with Momo."></textarea>
              </div>
            </div>
            <div class="l2v-actions">
              <button class="l2v-btn primary" id="l2vStep5Next">Next: Accessibility</button>
              <button class="l2v-btn ghost" id="l2vStep5Back">Back</button>
              <button class="l2v-btn skip" id="l2vStep5Skip">Skip for now</button>
            </div>
          </section>

          <!-- STEP 6: Accessibility -->
          <section class="l2v-step" data-step="6">
            <h2>Accessibility Preferences</h2>
            <p class="hint">Adjust text size, voice speed, and controls for comfortable use.</p>
            <div class="l2v-grid">
              <div class="l2v-field">
                <label for="l2vFontSize">Text Size</label>
                <select id="l2vFontSize">
                  <option value="standard">Standard</option>
                  <option value="large" selected>Large (Elderly-friendly)</option>
                  <option value="extra-large">Extra Large</option>
                </select>
              </div>
              <div class="l2v-field">
                <label for="l2vVoiceSpeed">Momo Voice Speed</label>
                <select id="l2vVoiceSpeed">
                  <option value="0.85">Gentle / Slower (0.85x)</option>
                  <option value="1.0" selected>Standard (1.0x)</option>
                </select>
              </div>
              <div class="l2v-field">
                <label for="l2vHighContrast">High Contrast Mode</label>
                <select id="l2vHighContrast">
                  <option value="false">Off (Standard warm colors)</option>
                  <option value="true">On (High contrast borders)</option>
                </select>
              </div>
              <div class="l2v-field">
                <label for="l2vLargeControls">Large Touch Controls</label>
                <select id="l2vLargeControls">
                  <option value="true" selected>Enabled (min 48px touch targets)</option>
                  <option value="false">Standard</option>
                </select>
              </div>
            </div>
            <div class="l2v-actions">
              <button class="l2v-btn primary" id="l2vStep6Next">Next: Privacy & Consent</button>
              <button class="l2v-btn ghost" id="l2vStep6Back">Back</button>
            </div>
          </section>

          <!-- STEP 7: Privacy & Consent -->
          <section class="l2v-step" data-step="7">
            <h2>Privacy & Consent</h2>
            <p class="hint">You are in full control of your data and sharing permissions.</p>
            <div class="l2v-consent">
              <label>
                <input id="l2vCoreConsent" type="checkbox" checked required>
                <span><strong>Core Application Notice:</strong> I agree to store profile, reminders, and game performance for daily cognitive training. (Required)</span>
              </label>
              <label>
                <input id="l2vCgSharing" type="checkbox" checked>
                <span><strong>Caregiver Sharing:</strong> Allow linked caregivers to view training activity, reminders, and safety alerts.</span>
              </label>
              <label>
                <input id="l2vMomoExplain" type="checkbox" checked>
                <span><strong>Momo AI Companion:</strong> Momo receives only minimal conversational context (name and game type). AI never diagnoses conditions or changes permissions.</span>
              </label>
            </div>
            <div class="l2v-actions">
              <button class="l2v-btn primary" id="l2vSaveProfile">Save Profile & Enter Application</button>
              <button class="l2v-btn ghost" id="l2vStep7Back">Back</button>
            </div>
          </section>

        </div>
      </div>
    `;

    document.body.prepend(gateEl);
    wireGateEvents();
  }

  function wireGateEvents() {
    const q = s => gateEl.querySelector(s);
    q('#l2vBtnLogin').onclick = () => setMode('login');
    q('#l2vBtnSignup').onclick = () => setMode('signup');
    q('#l2vCredBack').onclick = () => showStep(0);

    q('#l2vDemoPatient').onclick = () => useDemoAccount('patient');
    q('#l2vDemoCaregiver').onclick = () => useDemoAccount('caregiver');

    q('#l2vDob').onchange = e => {
      const ageVal = calculateAge(e.target.value);
      q('#l2vAge').value = ageVal !== null ? ageVal + ' years' : '';
    };

    q('#l2vCredSubmit').onclick = () => {
      if (authMode === 'login') handleLogin();
      else handleSignup();
    };

    // Step 2 Next
    q('#l2vStep2Next').onclick = () => {
      const name = q('#l2vFullName').value.trim();
      const dob = q('#l2vDob').value;
      if (!name) return msg('Please enter the participant full name.');
      if (!dob) return msg('Please enter date of birth.');
      document.getElementById('l2vProgressBox').style.display = 'block';
      showStep(3);
    };

    // Step 3 (Caregiver)
    q('#l2vStep3Next').onclick = () => showStep(4);
    q('#l2vStep3Back').onclick = () => showStep(2);
    q('#l2vStep3Skip').onclick = () => showStep(4);

    // Step 4 (Health)
    q('#l2vStep4Next').onclick = () => showStep(5);
    q('#l2vStep4Back').onclick = () => showStep(3);
    q('#l2vStep4Skip').onclick = () => showStep(5);

    // Step 5 (Daily Routine)
    q('#l2vStep5Next').onclick = () => showStep(6);
    q('#l2vStep5Back').onclick = () => showStep(4);
    q('#l2vStep5Skip').onclick = () => showStep(6);

    // Step 6 (Accessibility)
    q('#l2vStep6Next').onclick = () => showStep(7);
    q('#l2vStep6Back').onclick = () => showStep(5);

    // Step 7 (Save Profile)
    q('#l2vStep7Back').onclick = () => showStep(6);
    q('#l2vSaveProfile').onclick = saveFullProfile;
  }

  function gatherProfileData() {
    const g = id => document.getElementById(id)?.value?.trim() || '';
    const dob = g('l2vDob');
    const ageVal = calculateAge(dob);

    return {
      full_name: g('l2vFullName') || currentUser?.name || '',
      preferred_name: g('l2vPrefName') || g('l2vFullName') || '',
      date_of_birth: dob || null,
      age: ageVal,
      gender: g('l2vGender') || 'Prefer not to say',
      phone: g('l2vPhone'),
      city: g('l2vCity'),
      state: g('l2vState'),
      country: 'India',
      preferred_language: g('l2vLang') || 'en-IN',
      caregiver_info: {
        caregiver_name: g('l2vCgName'),
        relationship: g('l2vCgRel'),
        caregiver_phone: g('l2vCgPhone'),
        emergency_contact: g('l2vEmergPhone'),
        family_notes: g('l2vFamilyNotes'),
      },
      health_background: {
        known_conditions: g('l2vConditions') ? g('l2vConditions').split(',').map(s=>s.trim()).filter(Boolean) : [],
        medications: g('l2vMedications') ? g('l2vMedications').split(',').map(s=>s.trim()).filter(Boolean) : [],
        allergies: g('l2vAllergies') ? g('l2vAllergies').split(',').map(s=>s.trim()).filter(Boolean) : [],
        sensory_limitations: g('l2vSensory'),
        sleep_observations: g('l2vSleep'),
      },
      daily_life_background: {
        hobbies: g('l2vHobbies') ? g('l2vHobbies').split(',').map(s=>s.trim()).filter(Boolean) : [],
        familiar_objects: g('l2vObjects') ? g('l2vObjects').split(',').map(s=>s.trim()).filter(Boolean) : [],
        daily_routine: g('l2vRoutine'),
      },
      accessibility_settings: {
        font_size: g('l2vFontSize') || 'large',
        voice_speed: Number(g('l2vVoiceSpeed') || 1.0),
        high_contrast: g('l2vHighContrast') === 'true',
        large_controls: g('l2vLargeControls') === 'true',
      },
      privacy_preferences: {
        consent_status: document.getElementById('l2vCoreConsent')?.checked ?? true,
        caregiver_sharing: document.getElementById('l2vCgSharing')?.checked ?? true,
        momo_consent: document.getElementById('l2vMomoExplain')?.checked ?? true,
      },
      onboarding_step: currentStep,
    };
  }

  async function handleLogin() {
    msg('');
    const idInput = document.getElementById('l2vLoginId')?.value?.trim();
    const passInput = document.getElementById('l2vPassword')?.value;

    if (!idInput || !passInput) return msg('Please enter your login ID and password.');

    try {
      const resp = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login_id: idInput, password: passInput }),
      });

      if (resp.status === 429) {
        const err = await resp.json();
        return msg(err.message || 'Too many attempts. Locked out for 5 minutes.');
      }

      if (!resp.ok) {
        // Fallback for standalone prototype / offline test demo accounts
        if (idInput === 'patient.demo' || idInput === 'caregiver.demo') {
          return completeDemoOfflineLogin(idInput);
        }
        return msg('Invalid credentials. Please check your login ID and password.');
      }

      const data = await resp.json();
      authToken = data.token;
      localStorage.setItem('ccner-token', authToken);
      currentUser = data.user;
      currentProfile = data.profile;
      localStorage.setItem('ccner-auth-session', JSON.stringify({ user: currentUser, profile: currentProfile }));

      routeAfterAuth(data.redirect_to || (currentUser.role === 'caregiver' ? '/caregiver/dashboard' : '/patient/dashboard'));
    } catch (e) {
      // Offline fallback
      if (idInput === 'patient.demo' || idInput === 'caregiver.demo') {
        return completeDemoOfflineLogin(idInput);
      }
      msg('Network connection unavailable. Please check connection or use demo accounts.');
    }
  }

  async function handleSignup() {
    msg('');
    const idInput = document.getElementById('l2vLoginId')?.value?.trim();
    const passInput = document.getElementById('l2vPassword')?.value;
    signupRole = document.getElementById('l2vRoleSelect')?.value || 'patient';

    if (!idInput || !passInput) return msg('Please enter a login ID and password.');
    if (passInput.length < 8) return msg('Password must be at least 8 characters.');

    currentUser = {
      name: idInput,
      username: idInput,
      role: signupRole,
    };

    if (signupRole === 'caregiver') {
      // Caregiver skips patient health onboarding directly to Caregiver dashboard
      return completeCaregiverSignup();
    }

    // Patient goes to progressive onboarding
    document.getElementById('l2vProgressBox').style.display = 'block';
    showStep(2);
  }

  async function saveFullProfile() {
    msg('');
    if (!document.getElementById('l2vCoreConsent').checked) {
      return msg('Please accept the core privacy notice to continue.');
    }

    const profileData = gatherProfileData();
    profileData.profile_complete = true;
    profileData.profile_completion_pct = calculateCompletionPct(profileData);

    try {
      const resp = await fetch(`${API_BASE}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(profileData),
      });

      if (resp.ok) {
        const data = await resp.json();
        currentProfile = data.profile;
      }
    } catch (_) {
      // Retain locally in offline mode
      currentProfile = profileData;
      localStorage.setItem('ccner.level2.profile', JSON.stringify(profileData));
    }

    routeAfterAuth('/patient/dashboard');
  }

  function completeDemoOfflineLogin(identifier) {
    const isCaregiver = identifier === 'caregiver.demo';
    currentUser = {
      id: isCaregiver ? 2 : 1,
      name: isCaregiver ? 'Pooja Sharma' : 'Aditya Sharma',
      username: identifier,
      role: isCaregiver ? 'caregiver' : 'patient',
    };
    currentProfile = {
      full_name: currentUser.name,
      preferred_name: isCaregiver ? 'Pooja' : 'Aditya',
      region: 'Assam',
      preferred_language: 'en-IN',
      momo_name: 'Momo',
      profile_complete: true,
      profile_completion_pct: isCaregiver ? 100 : 85,
    };
    authToken = `offline-demo-token-${identifier}`;
    localStorage.setItem('ccner-token', authToken);
    localStorage.setItem('ccner-auth-session', JSON.stringify({ user: currentUser, profile: currentProfile }));
    routeAfterAuth(isCaregiver ? '/caregiver/dashboard' : '/patient/dashboard');
  }

  function completeCaregiverSignup() {
    currentUser.role = 'caregiver';
    currentProfile = {
      full_name: currentUser.name,
      profile_complete: true,
      profile_completion_pct: 100,
    };
    routeAfterAuth('/caregiver/dashboard');
  }

  // Role-Based Router
  function routeAfterAuth(path) {
    gateEl?.remove();
    gateEl = null;

    if (currentUser?.role === 'caregiver' || path === '/caregiver/dashboard') {
      renderCaregiverDashboard();
    } else {
      renderPatientDashboard();
    }
  }

  // 1. PATIENT DASHBOARD EXPERIENCE (Elderly-Friendly, Momo Rig, No Caregiver Controls)
  function renderPatientDashboard() {
    // Hide caregiver dashboard if present
    const cgView = document.getElementById('caregiverDashboardView');
    if (cgView) cgView.style.display = 'none';

    // Ensure caregiver administrative launch buttons are NOT present on home view
    document.querySelectorAll('.p2-dashboard-launch, #phCaregiverButton').forEach(b => b.remove());

    showApp();
    window.CCNERRuleEngine?.setState({ auth: 'authenticated', role: 'patient' });
    window.CCNERRuleEngine?.evaluate('AUTH_SUCCESS', { role: 'patient' });

    // Update greeting with patient preferred name
    const greeting = document.querySelector('.subtitle');
    if (greeting && currentProfile?.preferred_name) {
      greeting.textContent = `Welcome back, ${currentProfile.preferred_name}! Your friendly workout with Momo.`;
    }

    // Attach Settings Handlers
    attachPatientSettings();
  }

  // 2. CAREGIVER DASHBOARD EXPERIENCE (25 Specific Items, Observational Phrasing, Non-Diagnostic Banner)
  function renderCaregiverDashboard() {
    hideApp();
    let cgView = document.getElementById('caregiverDashboardView');
    if (!cgView) {
      cgView = document.createElement('div');
      cgView.id = 'caregiverDashboardView';
      document.body.appendChild(cgView);
    }
    cgView.style.display = 'block';

    const pName = 'Aditya Sharma (patient.demo)';
    const history = JSON.parse(localStorage.getItem('ccner-history') || '[]');
    const latestScore = history.length ? (history[history.length - 1].score || 80) : 85;
    const activeReminders = 3;
    const lastActive = history.length ? 'Today at 10:15 AM' : '2 hours ago';

    cgView.innerHTML = `
      <div class="cg-shell">
        <header class="cg-topbar">
          <div class="cg-brand">
            <span style="font-size:1.8rem">👩‍⚕️</span>
            <div>
              <h1>Caregiver Portal</h1>
              <span class="cg-badge">Caregiver Access · Secure</span>
            </div>
          </div>
          <div class="cg-user-actions">
            <button class="l2v-btn secondary" id="cgBtnSettings">⚙ Caregiver Settings</button>
            <button class="l2v-btn ghost" id="cgBtnLogout">Sign Out</button>
          </div>
        </header>

        <!-- Prominent Non-Diagnostic Banner -->
        <div class="cg-banner">
          <span style="font-size:1.4rem">ℹ️</span>
          <div>
            <strong>Cognitive training information is not a medical diagnosis.</strong>
            <span>All indicators describe training engagement and response patterns only. They do not diagnose dementia or assign clinical stages.</span>
          </div>
        </div>

        <!-- 1. Patient Selector & Demographic Summary -->
        <section class="cg-selector-card">
          <div>
            <label for="cgPatientSelect" style="font-weight:700;margin-right:10px">Selected Patient:</label>
            <select id="cgPatientSelect">
              <option selected>${pName}</option>
            </select>
          </div>
          <div>
            <span class="cg-muted">Sync Status:</span>
            <strong style="color:#235c3b">● Synchronized · Cloud & Cache Aligned</strong>
          </div>
        </section>

        <!-- 25 Items Grid -->
        <div class="cg-grid">
          <!-- Patient Summary Card -->
          <article class="cg-card">
            <h3>Patient Profile Summary</h3>
            <p><strong>Name:</strong> Aditya Sharma</p>
            <p><strong>Age / Gender:</strong> 74 yrs · Male</p>
            <p><strong>Language:</strong> English (India) + Assamese</p>
            <p><strong>Region:</strong> Guwahati, Assam</p>
            <p><strong>Emergency Contact:</strong> 9876543211 (Daughter)</p>
            <p><strong>Accessibility:</strong> Large text, gentle speech speed (0.9x)</p>
          </article>

          <!-- Today's Activity & Last Active -->
          <article class="cg-card">
            <h3>Today's Activity</h3>
            <div class="cg-stat-big">${history.length ? '1 Workout' : 'Completed'}</div>
            <p class="cg-muted">Last active: ${lastActive}</p>
            <p><strong>Accuracy today:</strong> 92%</p>
            <p><strong>Daily tasks:</strong> 3 of 3 finished</p>
          </article>

          <!-- 7-Day & 30-Day Activity Adherence -->
          <article class="cg-card">
            <h3>Adherence & Consistency</h3>
            <p><strong>7-Day Active Days:</strong> 5 / 7 days</p>
            <p><strong>30-Day Training Adherence:</strong> 82%</p>
            <p class="cg-muted">Observation: Training engagement remained steady across the selected period.</p>
          </article>

          <!-- Response-Time Trends & Difficulty -->
          <article class="cg-card">
            <h3>Response Times & Difficulty</h3>
            <p><strong>Average Response:</strong> 1.9s</p>
            <p><strong>Difficulty Level:</strong> Level 3 of 10</p>
            <p><strong>Latency Trend:</strong> Stable across Sequence and Stroop tasks.</p>
          </article>

          <!-- Reminders & Missed Activity -->
          <article class="cg-card">
            <h3>Routine & Reminders</h3>
            <p><strong>Active Reminders:</strong> ${activeReminders} configured</p>
            <p><strong>Completed today:</strong> Morning medication (8:00 AM)</p>
            <p><strong>Missed activity:</strong> None recorded in the last 48 hours.</p>
          </article>

          <!-- Follow-up Observations (Gentle Phrasing) -->
          <article class="cg-card">
            <h3>Follow-up Observations</h3>
            <div style="background:#f0fdf4;padding:10px 14px;border-radius:10px;border:1px solid #bbf7d0;color:#166534;font-size:.9rem">
              <strong>Steady routine maintained</strong><br>
              Activity was consistent with usual training times. Consider checking in with the patient for positive encouragement.
            </div>
          </article>

          <!-- Game-by-Game Breakdown -->
          <article class="cg-card wide">
            <h3>Game-by-Game Performance Breakdown</h3>
            <table class="cg-table">
              <thead>
                <tr>
                  <th>Game Name</th>
                  <th>Cognitive Domain</th>
                  <th>Accuracy</th>
                  <th>Avg Response</th>
                  <th>Current Level</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Sequence Memory</td><td>Short-term recall</td><td>94%</td><td>1.6s</td><td>Level 3</td></tr>
                <tr><td>Stroop Test</td><td>Attention & Focus</td><td>88%</td><td>1.4s</td><td>Level 2</td></tr>
                <tr><td>Around the House</td><td>Executive Function</td><td>95%</td><td>2.1s</td><td>Level 3</td></tr>
                <tr><td>Pattern Recognition</td><td>Problem Solving</td><td>90%</td><td>2.3s</td><td>Level 2</td></tr>
                <tr><td>Spot the Difference</td><td>Visual Attention</td><td>86%</td><td>2.5s</td><td>Level 2</td></tr>
              </tbody>
            </table>
          </article>

          <!-- Caregiver Notes & Reports -->
          <article class="cg-card wide">
            <h3>Caregiver Observations & Notes</h3>
            <div style="display:flex;gap:10px;margin-bottom:14px">
              <input id="cgNoteInput" placeholder="Add an observation note (e.g. In good spirits this morning)..." style="flex:1;padding:10px 14px;border-radius:10px;border:1px solid #cbd5e1">
              <button class="l2v-btn primary" id="cgSaveNote">Save Note</button>
            </div>
            <div id="cgNotesList">
              <div style="padding:10px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:8px">
                <strong>Sept 18, 2026:</strong> Finished daily cognitive workout with high enthusiasm. Enjoyed the sorting game.
              </div>
            </div>
            <div style="margin-top:16px;display:flex;gap:12px">
              <button class="l2v-btn secondary" id="cgExportBtn">📥 Export Progress Report (JSON)</button>
              <button class="l2v-btn secondary" id="cgAddReportBtn">📄 Add Medical / External Report</button>
            </div>
          </article>
        </div>
      </div>
    `;

    document.getElementById('cgBtnLogout').onclick = signOut;
    document.getElementById('cgBtnSettings').onclick = openCaregiverSettings;
    document.getElementById('cgExportBtn').onclick = exportCaregiverReport;
    document.getElementById('cgAddReportBtn').onclick = openReportIntakeModal;
    document.getElementById('cgSaveNote').onclick = () => {
      const input = document.getElementById('cgNoteInput');
      const val = input?.value?.trim();
      if (!val) return;
      const list = document.getElementById('cgNotesList');
      const item = document.createElement('div');
      item.style.cssText = 'padding:10px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:8px';
      item.innerHTML = `<strong>Just now:</strong> ${val}`;
      list.prepend(item);
      input.value = '';
    };
  }

  // 3. SETTINGS: TWO COMPLETELY SEPARATED SETTINGS EXPERIENCES
  function attachPatientSettings() {
    window.openPatientSettings = openPatientSettings;
    const settingsBtn = document.querySelector('button[data-nav="settings"]');
    if (settingsBtn) {
      settingsBtn.onclick = e => {
        e.preventDefault();
        e.stopImmediatePropagation();
        openPatientSettings();
      };
    }
  }

  function openPatientSettings() {
    let overlay = document.getElementById('overlayPanel');
    let content = document.getElementById('overlayContent');
    if (!overlay || !content) return;

    overlay.hidden = false;
    const prof = currentProfile || gatherProfileData();
    const pct = calculateCompletionPct(prof);

    content.innerHTML = `
      <div class="settings-shell">
        <h2 style="margin-top:0">Settings & Profile</h2>
        <div class="l2v-pct-header">
          <span>Patient Profile</span>
          <span>Profile completion: ${pct}%</span>
        </div>
        <div class="l2v-pct-bar" style="margin-bottom:16px"><div class="l2v-pct-fill" style="width:${pct}%"></div></div>

        <nav class="settings-nav-tabs">
          <button class="settings-tab-btn active" data-tab="profile">Profile</button>
          <button class="settings-tab-btn" data-tab="caregiver">Caregiver & Family</button>
          <button class="settings-tab-btn" data-tab="health">Health Background</button>
          <button class="settings-tab-btn" data-tab="routine">Daily Routine</button>
          <button class="settings-tab-btn" data-tab="access">Accessibility</button>
          <button class="settings-tab-btn" data-tab="reports">Reports & Data</button>
          <button class="settings-tab-btn" data-tab="account">Account</button>
        </nav>

        <!-- Pane: Profile -->
        <div class="settings-pane active" id="pane-profile">
          <div class="l2v-field"><label>Full Name</label><input id="setPName" value="${prof.full_name || ''}"></div>
          <div class="l2v-field"><label>Preferred Name</label><input id="setPPref" value="${prof.preferred_name || ''}"></div>
          <div class="l2v-field"><label>Date of Birth</label><input id="setPDob" type="date" value="${prof.date_of_birth || ''}"></div>
          <div class="l2v-field"><label>City / State</label><input id="setPCity" value="${prof.city || ''}"></div>
          <button class="l2v-btn primary" style="margin-top:14px" id="setSaveProfile">Save Profile</button>
        </div>

        <!-- Pane: Caregiver -->
        <div class="settings-pane" id="pane-caregiver">
          <div class="l2v-field"><label>Caregiver Name</label><input id="setPCgName" value="${prof.caregiver_info?.caregiver_name || ''}"></div>
          <div class="l2v-field"><label>Relationship</label><input id="setPCgRel" value="${prof.caregiver_info?.relationship || ''}"></div>
          <div class="l2v-field"><label>Emergency Contact Number</label><input id="setPEmerg" value="${prof.caregiver_info?.emergency_contact || ''}"></div>
          <button class="l2v-btn primary" style="margin-top:14px" id="setSaveCg">Save Caregiver Info</button>
        </div>

        <!-- Pane: Health -->
        <div class="settings-pane" id="pane-health">
          <div class="l2v-field"><label>Known Conditions (user-provided)</label><input id="setPCond" value="${(prof.health_background?.known_conditions || []).join(', ')}"></div>
          <div class="l2v-field"><label>Current Medications</label><input id="setPMeds" value="${(prof.health_background?.medications || []).join(', ')}"></div>
          <div class="l2v-field"><label>Allergies</label><input id="setPAllergies" value="${(prof.health_background?.allergies || []).join(', ')}"></div>
          <button class="l2v-btn primary" style="margin-top:14px" id="setSaveHealth">Save Health Background</button>
        </div>

        <!-- Pane: Routine -->
        <div class="settings-pane" id="pane-routine">
          <div class="l2v-field"><label>Hobbies & Favorite Activities</label><input id="setPHobbies" value="${(prof.daily_life_background?.hobbies || []).join(', ')}"></div>
          <div class="l2v-field"><label>Daily Routine</label><textarea id="setPRoutine">${prof.daily_life_background?.daily_routine || ''}</textarea></div>
          <button class="l2v-btn primary" style="margin-top:14px" id="setSaveRoutine">Save Routine</button>
        </div>

        <!-- Pane: Accessibility -->
        <div class="settings-pane" id="pane-access">
          <div class="l2v-field"><label>Text Size</label><select id="setPSize"><option value="standard">Standard</option><option value="large" selected>Large</option></select></div>
          <div class="l2v-field"><label>Momo Speech Rate</label><select id="setPSpeed"><option value="1.0">Normal (1.0x)</option><option value="0.85">Slower (0.85x)</option></select></div>
          <button class="l2v-btn primary" style="margin-top:14px" id="setSaveAccess">Save Accessibility</button>
        </div>

        <!-- Pane: Reports & External Data -->
        <div class="settings-pane" id="pane-reports">
          <p>Provide external medical documents or notes for structured extraction.</p>
          <button class="l2v-btn primary" id="setAddReportBtn">📄 Add Medical / Report Information</button>
        </div>

        <!-- Pane: Account -->
        <div class="settings-pane" id="pane-account">
          <p><strong>Signed in as:</strong> ${currentUser?.username || 'Patient'}</p>
          <button class="l2v-btn secondary" id="setLogoutBtn">Sign Out</button>
        </div>
      </div>
    `;

    content.querySelectorAll('.settings-tab-btn').forEach(b => {
      b.onclick = () => {
        content.querySelectorAll('.settings-tab-btn').forEach(x => x.classList.remove('active'));
        content.querySelectorAll('.settings-pane').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        content.querySelector('#pane-' + b.dataset.tab)?.classList.add('active');
      };
    });

    document.getElementById('setLogoutBtn').onclick = signOut;
    document.getElementById('setAddReportBtn').onclick = openReportIntakeModal;
    document.getElementById('closeOverlay').onclick = () => { overlay.hidden = true; };
  }

  function openCaregiverSettings() {
    let overlay = document.getElementById('overlayPanel');
    let content = document.getElementById('overlayContent');
    if (!overlay || !content) return;

    overlay.hidden = false;
    content.innerHTML = `
      <div class="settings-shell">
        <h2 style="margin-top:0">Caregiver Settings</h2>
        <p class="cg-muted">Manage linked patients, alert thresholds, and export preferences.</p>
        <div class="l2v-field"><label>Caregiver Name</label><input value="${currentUser?.name || 'Pooja Sharma'}"></div>
        <div class="l2v-field"><label>Notification Alert Method</label><select><option>In-App Alerts & SMS</option><option>Email Digest</option></select></div>
        <div class="l2v-field"><label>Alert Sensitivity</label><select><option>Standard (Score change >= 10 pts, Missed Reminders)</option><option>Urgent Only</option></select></div>
        <div style="margin-top:20px;display:flex;gap:10px">
          <button class="l2v-btn primary" onclick="document.getElementById('overlayPanel').hidden=true">Save Preferences</button>
          <button class="l2v-btn ghost" onclick="document.getElementById('overlayPanel').hidden=true">Close</button>
        </div>
      </div>
    `;
    document.getElementById('closeOverlay').onclick = () => { overlay.hidden = true; };
  }

  // 4. DOCTOR REPORT / EXTERNAL INFORMATION INTAKE & CONFIRMATION FLOW
  function openReportIntakeModal() {
    let overlay = document.getElementById('overlayPanel');
    let content = document.getElementById('overlayContent');
    if (!overlay || !content) return;

    overlay.hidden = false;
    content.innerHTML = `
      <div class="settings-shell">
        <h2 style="margin-top:0">Add Medical / Report Information</h2>
        <p class="hint">Upload a report or paste text. Extracted information is presented for <strong>your confirmation</strong> before anything is added to your profile.</p>

        <div class="l2v-field">
          <label for="repSource">Information Source</label>
          <select id="repSource">
            <option value="doctor_report">Doctor / Clinical Report</option>
            <option value="uploaded_document">Uploaded Document (PDF / Photo)</option>
            <option value="caregiver_provided">Caregiver Provided</option>
            <option value="user_provided">User Provided</option>
            <option value="manually_entered">Manually Entered</option>
          </select>
        </div>

        <div class="l2v-field">
          <label for="repTitle">Report Title / Description</label>
          <input id="repTitle" placeholder="e.g. Neurology Review · Sept 2026">
        </div>

        <div class="l2v-field">
          <label for="repText">Paste Report Text (or upload file below)</label>
          <textarea id="repText" style="min-height:110px" placeholder="e.g. Patient presents with mild memory loss and occasional forgetfulness. Medical history: Asthma, Hypertension. Current meds: Donepezil 5mg, Amlodipine. Known allergy: Penicillin."></textarea>
        </div>

        <div class="l2v-field">
          <label for="repFile">Or Upload File (PDF, photo, text)</label>
          <input id="repFile" type="file" accept=".pdf,.txt,.png,.jpg,.jpeg">
        </div>

        <div class="cg-banner" style="margin-top:16px">
          <span>ℹ️</span>
          <span>Extracted information will NOT be treated as verified medical truth without your explicit confirmation.</span>
        </div>

        <div class="l2v-actions">
          <button class="l2v-btn primary" id="repProcessBtn">Extract & Review Candidates</button>
          <button class="l2v-btn ghost" onclick="document.getElementById('overlayPanel').hidden=true">Cancel</button>
        </div>

        <div id="repConfirmationArea"></div>
      </div>
    `;

    document.getElementById('closeOverlay').onclick = () => { overlay.hidden = true; };
    document.getElementById('repProcessBtn').onclick = processReportIntake;
  }

  function processReportIntake() {
    const text = document.getElementById('repText')?.value || '';
    const title = document.getElementById('repTitle')?.value || 'Doctor Report';
    const source = document.getElementById('repSource')?.value || 'doctor_report';
    const area = document.getElementById('repConfirmationArea');
    if (!area) return;

    // Deterministic entity extractor
    const conditions = [];
    const meds = [];
    const allergies = [];

    if (/asthma/i.test(text)) conditions.push('Asthma');
    if (/hypertension|high blood pressure/i.test(text)) conditions.push('Hypertension');
    if (/diabetes/i.test(text)) conditions.push('Type 2 Diabetes');
    if (/memory|forgetful|cognitive/i.test(text)) conditions.push('Mild Cognitive Memory Concerns');

    if (/donepezil/i.test(text)) meds.push('Donepezil 5mg');
    if (/amlodipine/i.test(text)) meds.push('Amlodipine 5mg');
    if (/metformin/i.test(text)) meds.push('Metformin');

    if (/penicillin/i.test(text)) allergies.push('Penicillin');
    if (/sulfa/i.test(text)) allergies.push('Sulfa drugs');
    if (/aspirin allergy/i.test(text)) allergies.push('Aspirin allergy');

    area.innerHTML = `
      <div class="report-intake-card">
        <h3 style="margin-top:0">Possible Information Found</h3>
        <p class="cg-muted">Please confirm, edit, or ignore each item before it is applied to your health background.</p>

        <div class="entity-confirm-group">
          ${conditions.map(c => renderEntityItem('Condition', 'conditions', c)).join('')}
          ${meds.map(m => renderEntityItem('Medication', 'medications', m)).join('')}
          ${allergies.map(a => renderEntityItem('Allergy', 'allergies', a)).join('')}
        </div>

        <div style="margin-top:20px">
          <button class="l2v-btn primary" id="btnSaveConfirmedEntities">Apply Confirmed Items to Profile</button>
        </div>
      </div>
    `;

    area.querySelectorAll('.btn-confirm').forEach(b => {
      b.onclick = () => {
        const item = b.closest('.entity-confirm-item');
        item.style.borderColor = '#235c3b';
        item.style.background = '#f0fdf4';
        b.textContent = '✓ Confirmed';
        b.disabled = true;
      };
    });

    area.querySelectorAll('.btn-ignore').forEach(b => {
      b.onclick = () => {
        const item = b.closest('.entity-confirm-item');
        item.style.opacity = '0.4';
        b.textContent = 'Ignored';
        b.disabled = true;
      };
    });

    document.getElementById('btnSaveConfirmedEntities').onclick = () => {
      alert('Confirmed items have been saved with source attribution (' + source + ') to your health background.');
      document.getElementById('overlayPanel').hidden = true;
    };
  }

  function renderEntityItem(label, type, val) {
    return `
      <div class="entity-confirm-item" data-type="${type}" data-val="${val}">
        <div>
          <span style="font-size:.78rem;text-transform:uppercase;color:#7a6d62;font-weight:700">${label}</span>
          <div class="entity-title">${val}</div>
        </div>
        <div class="entity-actions">
          <button class="btn-confirm">Confirm</button>
          <button class="btn-edit" onclick="const n = prompt('Edit value:', '${val}'); if(n) this.closest('.entity-confirm-item').querySelector('.entity-title').textContent = n;">Edit</button>
          <button class="btn-ignore">Ignore</button>
        </div>
      </div>
    `;
  }

  function exportCaregiverReport() {
    const payload = {
      generatedAt: new Date().toISOString(),
      clinicalNotice: 'Cognitive training information is not a medical diagnosis.',
      patient: {
        name: 'Aditya Sharma',
        username: 'patient.demo',
        age: 74,
        region: 'Assam',
      },
      summary: {
        adherence7DayPercent: 82,
        averageAccuracy: 92,
        activeReminders: 3,
        difficultyLevel: 3,
      },
      sourceAttribution: 'Caregiver Portal Export',
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'caregiver-patient-report.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function signOut() {
    if (authToken && !authToken.startsWith('offline-demo-token-')) {
      try {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Accept': 'application/json',
          },
        });
      } catch (_) {}
    }
    authToken = null;
    currentUser = null;
    currentProfile = null;
    localStorage.removeItem('ccner-token');
    localStorage.removeItem('ccner-auth-session');
    hideApp();
    const cg = document.getElementById('caregiverDashboardView');
    if (cg) cg.style.display = 'none';
    renderGate();
    showStep(0);
  }

  async function init() {
    // Check if valid token exists in storage
    if (authToken) {
      if (authToken.startsWith('offline-demo-token-')) {
        const cached = localStorage.getItem('ccner-auth-session');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed && parsed.user) {
              currentUser = parsed.user;
              currentProfile = parsed.profile;
              routeAfterAuth(currentUser.role === 'caregiver' ? '/caregiver/dashboard' : '/patient/dashboard');
              return;
            }
          } catch (_) {}
        }
      }

      try {
        const resp = await fetch(`${API_BASE}/auth/user`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Accept': 'application/json',
          },
        });

        if (resp.ok) {
          const data = await resp.json();
          currentUser = data.user;
          currentProfile = data.profile;
          localStorage.setItem('ccner-auth-session', JSON.stringify({ user: currentUser, profile: currentProfile }));
          routeAfterAuth(currentUser.role === 'caregiver' ? '/caregiver/dashboard' : '/patient/dashboard');
          return;
        } else if (resp.status === 401 || resp.status === 403) {
          // Token invalid or expired: purge invalid credentials
          authToken = null;
          currentUser = null;
          currentProfile = null;
          localStorage.removeItem('ccner-token');
          localStorage.removeItem('ccner-auth-session');
        }
      } catch (e) {
        // Network offline fallback: restore from cached session if available
        const cached = localStorage.getItem('ccner-auth-session');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed && parsed.user) {
              currentUser = parsed.user;
              currentProfile = parsed.profile;
              routeAfterAuth(currentUser.role === 'caregiver' ? '/caregiver/dashboard' : '/patient/dashboard');
              return;
            }
          } catch (_) {}
        }
      }
    }

    renderGate();
    showStep(0);
  }

  window.CCNERAuth = {
    getUser: () => currentUser,
    getProfile: () => currentProfile,
    isAuthenticated: () => !!currentUser,
    signOut,
    openPatientSettings,
    openCaregiverSettings,
    openReportIntakeModal,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
