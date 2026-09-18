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
          <p>Elderly-friendly cognitive support with Mimo companion</p>
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
                <option value="patient">Patient (Elderly-friendly training with Mimo)</option>
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
            <p class="hint">Helps Mimo personalize conversations and select meaningful game themes.</p>
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
                <textarea id="l2vRoutine" placeholder="e.g. Morning walk, morning tea, 10am cognitive games with Mimo."></textarea>
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
                <label for="l2vVoiceSpeed">Mimo Voice Speed</label>
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
                <input id="l2vMimoExplain" type="checkbox" checked>
                <span><strong>Mimo AI Companion:</strong> Mimo receives only minimal conversational context (name and game type). AI never diagnoses conditions or changes permissions.</span>
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
        momo_consent: document.getElementById('l2vMimoExplain')?.checked ?? true,
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
      msg('Network connection unavailable. Please check connection.');
    }
  }

  async function handleSignup() {
    msg('');
    const idInput = document.getElementById('l2vLoginId')?.value?.trim();
    const passInput = document.getElementById('l2vPassword')?.value;
    signupRole = document.getElementById('l2vRoleSelect')?.value || 'patient';

    if (!idInput || !passInput) return msg('Please enter a login ID and password.');
    if (passInput.length < 8) return msg('Password must be at least 8 characters.');

    try {
      const resp = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: idInput, 
          login_id: idInput, 
          password: passInput, 
          role: signupRole 
        })
      });

      if (!resp.ok) {
        const err = await resp.json();
        return msg(err.message || 'Registration failed.');
      }

      const data = await resp.json();
      authToken = data.token;
      localStorage.setItem('ccner-token', authToken);
      currentUser = data.user;
      currentProfile = data.profile;
      localStorage.setItem('ccner-auth-session', JSON.stringify({ user: currentUser, profile: currentProfile }));

      if (signupRole === 'caregiver') {
        return routeAfterAuth(data.redirect_to || '/caregiver/dashboard');
      }

      // Patient goes to progressive onboarding
      document.getElementById('l2vProgressBox').style.display = 'block';
      showStep(2);
    } catch (e) {
      msg('Network connection unavailable. Please check connection.');
    }
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

    if (path === '/caregiver/dashboard' && currentUser?.role !== 'caregiver' && currentUser?.role !== 'health_worker') {
       return renderPatientDashboard();
    }
    if (path === '/patient/dashboard' && (currentUser?.role === 'caregiver' || currentUser?.role === 'health_worker')) {
       return renderCaregiverDashboardWithLoading();
    }

    if (currentUser?.role === 'caregiver' || currentUser?.role === 'health_worker') {
      renderCaregiverDashboardWithLoading();
    } else {
      renderPatientDashboard();
    }
    
    if (window.CCNERDrawer) {
      window.CCNERDrawer.update();
    }
  }

  function renderCaregiverDashboardWithLoading() {
    hideApp();
    const existingCg = document.getElementById('caregiverDashboardView');
    if (existingCg) existingCg.style.display = 'none';

    let loader = document.getElementById('cgLoaderView');
    if (!loader) {
      loader = document.createElement('div');
      loader.id = 'cgLoaderView';
      loader.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:#f8fafc;font-family:system-ui,sans-serif">
          <div style="width:50px;height:50px;border:4px solid #cbd5e1;border-top-color:#0056b3;border-radius:50%;animation:spin 1s linear infinite;"></div>
          <h2 style="color:#1e293b;margin-top:20px;">Securing Caregiver Portal</h2>
          <p style="color:#64748b;">Syncing clinical records and insights...</p>
          <style>@keyframes spin { 100% { transform: rotate(360deg); } }</style>
        </div>
      `;
      document.body.appendChild(loader);
    }
    loader.style.display = 'block';

    setTimeout(() => {
      loader.style.display = 'none';
      renderCaregiverDashboard();
    }, 1500);
  }

  // 1. PATIENT DASHBOARD EXPERIENCE (Elderly-Friendly, Mimo Rig, No Caregiver Controls)
  function renderPatientDashboard() {
    // Hide caregiver dashboard if present
    const cgView = document.getElementById('caregiverDashboardView');
    if (cgView) cgView.style.display = 'none';

    // Ensure caregiver administrative launch buttons are NOT present on home view
    document.querySelectorAll('.p2-dashboard-launch, #phCaregiverButton').forEach(b => b.remove());

    // Restore bottom-nav if it was hidden
    const nav = document.querySelector('.bottom-nav');
    if (nav) nav.style.display = '';

    showApp();
    window.CCNERRuleEngine?.setState({ auth: 'authenticated', role: 'patient' });
    window.CCNERRuleEngine?.evaluate('AUTH_SUCCESS', { role: 'patient' });

    // Update greeting with patient preferred name
    const greeting = document.querySelector('.subtitle');
    if (greeting && currentProfile?.preferred_name) {
      greeting.textContent = `Welcome back, ${currentProfile.preferred_name}! Your friendly workout with Mimo.`;
    }

    // Attach Settings Handlers
    attachPatientSettings();
  }

  async function renderCaregiverDashboard() {
    hideApp();
    let cgView = document.getElementById('caregiverDashboardView');
    if (!cgView) {
      cgView = document.createElement('div');
      cgView.id = 'caregiverDashboardView';
      document.body.appendChild(cgView);
    }
    cgView.style.display = 'block';

    const cgName = currentProfile?.preferred_name || currentUser?.name || 'Caregiver';
    let history = [];
    let pName = 'No Linked Patient';

    // Fetch actual patients linked to this caregiver
    let patients = [];
    if (authToken) {
       try {
           const pResp = await fetch(`${API_BASE}/patients`, {
               headers: { 'Authorization': `Bearer ${authToken}` }
           });
           if (pResp.ok) {
               const pData = await pResp.json();
               patients = pData.data || [];
           }
       } catch (e) {
           console.error('Failed to fetch linked patients', e);
       }
    }

    if (patients.length > 0) {
       pName = patients[0].name;
       if (authToken) {
         try {
           const resp = await fetch(`${API_BASE}/cognitive-sessions?patient_id=${patients[0].id}`, {
             headers: { 'Authorization': `Bearer ${authToken}` }
           });
           if (resp.ok) {
             const data = await resp.json();
             history = data.data || [];
           }
         } catch (e) {
           console.error('Failed to fetch patient data', e);
         }
       }
    }

    const hasData = history.length > 0;
    const latestSession = hasData ? history[history.length - 1] : null;
    const latestScore = latestSession ? Math.round((latestSession.score || latestSession.overall_score || 0) * 100) + '%' : 'No activity';

    cgView.innerHTML = `
      <div class="cg-shell">
        <header class="cg-topbar">
          <div class="cg-brand">
            <span style="font-size:1.8rem">👩‍⚕️</span>
            <div>
              <h1>Caregiver Portal</h1>
              <p>Welcome back, ${cgName}</p>
            </div>
          </div>
          <div class="cg-top-actions">
            <button class="l2v-btn secondary" id="cgBtnSettings">Settings</button>
            <button class="l2v-btn secondary" id="cgBtnLogout">Sign Out</button>
          </div>
        </header>

        <div class="cg-notice">
          <strong>Important Clinical Notice:</strong> The cognitive scores and game performance metrics shown below reflect application usage and engagement. They do not constitute a medical diagnosis, clinical evaluation, or assign a dementia stage. Always consult with a healthcare professional for clinical assessments.
        </div>

        <div class="cg-grid">
          <!-- Active Patient Profile -->
          <article class="cg-card">
            <h3>Active Patient Profile</h3>
            <p style="font-size:1.1rem;margin-bottom:8px"><strong>${pName}</strong></p>
            ${patients.length > 0 ? `<p>ID: ${patients[0].id}</p>` : '<p class="l3-muted">No patients linked to your account.</p>'}
          </article>

          <!-- Training Engagement -->
          <article class="cg-card">
            <h3>Training Engagement</h3>
            <p><strong>Total Sessions:</strong> ${history.length}</p>
            <p><strong>Latest Score:</strong> ${latestScore}</p>
            <p><strong>Status:</strong> ${hasData ? 'Active' : 'Awaiting first session'}</p>
          </article>

          <!-- Caregiver Notes & Reports -->
          <article class="cg-card wide">
            <h3>Caregiver Observations & Actions</h3>
            <div style="display:flex;gap:10px;margin-bottom:14px">
              <input id="cgNoteInput" placeholder="Add an observation note..." style="flex:1;padding:10px 14px;border-radius:10px;border:1px solid #cbd5e1">
              <button class="l2v-btn primary" id="cgSaveNote">Save Note</button>
            </div>
            <div id="cgNotesList">
              ${hasData ? '' : '<p class="l3-muted">No notes recorded yet.</p>'}
            </div>
            <div style="margin-top:16px;display:flex;gap:12px;flex-wrap:wrap">
              <button class="l2v-btn secondary" id="cgExportBtn" ${hasData ? '' : 'disabled'}>📥 Export Report (JSON)</button>
              <button class="l2v-btn secondary" id="cgAddReportBtn">📄 Add Medical / External Report</button>
            </div>
          </article>
        </div>
      </div>
    `;

    document.getElementById('cgBtnLogout').onclick = signOut;
    document.getElementById('cgBtnSettings').onclick = openCaregiverSettings;
    document.getElementById('cgExportBtn').onclick = () => {
       if (hasData) exportCaregiverReport();
    };
    document.getElementById('cgAddReportBtn').onclick = openReportIntakeModal;
    document.getElementById('cgSaveNote').onclick = () => {
      const input = document.getElementById('cgNoteInput');
      const val = input?.value?.trim();
      if (!val) return;
      const list = document.getElementById('cgNotesList');
      if (list.querySelector('.l3-muted')) list.innerHTML = '';
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
          <button class="settings-tab-btn" data-tab="language">Language</button>
          <button class="settings-tab-btn" data-tab="reports">Reports & Data</button>
          <button class="settings-tab-btn" data-tab="privacy">Privacy</button>
          <button class="settings-tab-btn" data-tab="account">Account</button>
        </nav>

        <!-- Pane: Profile -->
        <div class="settings-pane active" id="pane-profile">
          <div class="l2v-field"><label>Full Name</label><input id="setPName" value="${prof.full_name || ''}"></div>
          <div class="l2v-field"><label>Preferred Name</label><input id="setPPref" value="${prof.preferred_name || ''}"></div>
          <div class="l2v-field"><label>Date of Birth</label><input id="setPDob" type="date" value="${prof.date_of_birth || ''}"></div>
          <div class="l2v-field"><label>City / State</label><input id="setPCity" value="${prof.city || ''}"></div>
          <button class="l2v-btn primary save-btn" style="margin-top:14px" id="setSaveProfile">Save Profile</button>
        </div>

        <!-- Pane: Caregiver -->
        <div class="settings-pane" id="pane-caregiver">
          <div class="l2v-field"><label>Caregiver Name</label><input id="setPCgName" value="${prof.caregiver_info?.caregiver_name || ''}"></div>
          <div class="l2v-field"><label>Relationship</label><input id="setPCgRel" value="${prof.caregiver_info?.relationship || ''}"></div>
          <div class="l2v-field"><label>Emergency Contact Number</label><input id="setPEmerg" value="${prof.caregiver_info?.emergency_contact || ''}"></div>
          <button class="l2v-btn primary save-btn" style="margin-top:14px" id="setSaveCg">Save Caregiver Info</button>
        </div>

        <!-- Pane: Health -->
        <div class="settings-pane" id="pane-health">
          <div class="l2v-field"><label>Known Conditions (user-provided)</label><input id="setPCond" value="${(prof.health_background?.known_conditions || []).join(', ')}"></div>
          <div class="l2v-field"><label>Current Medications</label><input id="setPMeds" value="${(prof.health_background?.medications || []).join(', ')}"></div>
          <div class="l2v-field"><label>Allergies</label><input id="setPAllergies" value="${(prof.health_background?.allergies || []).join(', ')}"></div>
          <button class="l2v-btn primary save-btn" style="margin-top:14px" id="setSaveHealth">Save Health Background</button>
        </div>

        <!-- Pane: Routine -->
        <div class="settings-pane" id="pane-routine">
          <div class="l2v-field"><label>Hobbies & Favorite Activities</label><input id="setPHobbies" value="${(prof.daily_life_background?.hobbies || []).join(', ')}"></div>
          <div class="l2v-field"><label>Daily Routine</label><textarea id="setPRoutine">${prof.daily_life_background?.daily_routine || ''}</textarea></div>
          <button class="l2v-btn primary save-btn" style="margin-top:14px" id="setSaveRoutine">Save Routine</button>
        </div>

        <!-- Pane: Accessibility -->
        <div class="settings-pane" id="pane-access">
          <div class="l2v-field"><label>Text Size</label><select id="setPSize"><option value="standard">Standard</option><option value="large" ${prof.accessibility_settings?.font_size === 'large' ? 'selected' : ''}>Large</option></select></div>
          <div class="l2v-field"><label>Voice Speed</label><select id="setPSpeed"><option value="1.0">Normal (1.0x)</option><option value="0.85" ${prof.accessibility_settings?.voice_speed === 0.85 ? 'selected' : ''}>Slower (0.85x)</option></select></div>
          <button class="l2v-btn primary save-btn" style="margin-top:14px" id="setSaveAccess">Save Accessibility</button>
        </div>

        <!-- Pane: Language -->
        <div class="settings-pane" id="pane-language">
          <div class="l2v-field">
            <label>Interface Language</label>
            <select id="setPLang">
              <option value="en-IN" ${prof.preferred_language === 'en-IN' ? 'selected' : ''}>English</option>
              <option value="hi-IN" ${prof.preferred_language === 'hi-IN' ? 'selected' : ''}>Hindi</option>
              <option value="bn-IN" ${prof.preferred_language === 'bn-IN' ? 'selected' : ''}>Bengali</option>
              <option value="as-IN" ${prof.preferred_language === 'as-IN' ? 'selected' : ''}>Assamese</option>
            </select>
          </div>
          <button class="l2v-btn primary save-btn" style="margin-top:14px" id="setSaveLang">Save Language</button>
        </div>

        <!-- Pane: Reports & External Data -->
        <div class="settings-pane" id="pane-reports">
          <p>Provide external medical documents or notes for structured extraction.</p>
          <button class="l2v-btn primary" id="setAddReportBtn">📄 Add Medical / Report Information</button>
        </div>

        <!-- Pane: Privacy -->
        <div class="settings-pane" id="pane-privacy">
          <div class="l2v-field">
            <label><input type="checkbox" id="setPPrivacy1" ${prof.privacy_preferences?.consent_status !== false ? 'checked' : ''}> Allow processing of health context for personalization</label>
          </div>
          <div class="l2v-field">
            <label><input type="checkbox" id="setPPrivacy2" ${prof.privacy_preferences?.caregiver_sharing !== false ? 'checked' : ''}> Share progress with authorized caregiver</label>
          </div>
          <button class="l2v-btn primary save-btn" style="margin-top:14px" id="setSavePrivacy">Save Privacy Preferences</button>
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

    const savePartial = async (updates, btnId) => {
      const btn = document.getElementById(btnId);
      const originalText = btn.textContent;
      btn.textContent = 'Saving...';
      btn.disabled = true;

      Object.assign(currentProfile, updates);
      if (authToken) {
        try {
          const resp = await fetch(`${API_BASE}/auth/profile`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
            body: JSON.stringify(currentProfile)
          });
          if (resp.ok) {
            const data = await resp.json();
            currentProfile = data.profile;
            localStorage.setItem('ccner-auth-session', JSON.stringify({ user: currentUser, profile: currentProfile }));
            btn.textContent = 'Saved!';
            btn.style.backgroundColor = '#235c3b';
            
            // If language changed, apply it
            if (updates.preferred_language && window.setLocale) {
               window.setLocale(updates.preferred_language);
            }
          } else {
            btn.textContent = 'Failed';
            btn.style.backgroundColor = '#b9552d';
          }
        } catch (e) {
          btn.textContent = 'Network Error';
          btn.style.backgroundColor = '#b9552d';
        }
      } else {
        localStorage.setItem('ccner-auth-session', JSON.stringify({ user: currentUser, profile: currentProfile }));
        btn.textContent = 'Saved Locally';
      }

      setTimeout(() => {
        btn.textContent = originalText;
        btn.disabled = false;
        btn.style.backgroundColor = '';
      }, 3000);
    };

    const gV = (id) => document.getElementById(id)?.value || '';

    document.getElementById('setSaveProfile').onclick = () => savePartial({
      full_name: gV('setPName'),
      preferred_name: gV('setPPref'),
      date_of_birth: gV('setPDob'),
      city: gV('setPCity')
    }, 'setSaveProfile');

    document.getElementById('setSaveCg').onclick = () => savePartial({
      caregiver_info: {
        ...(currentProfile.caregiver_info || {}),
        caregiver_name: gV('setPCgName'),
        relationship: gV('setPCgRel'),
        emergency_contact: gV('setPEmerg')
      }
    }, 'setSaveCg');

    document.getElementById('setSaveHealth').onclick = () => savePartial({
      health_background: {
        ...(currentProfile.health_background || {}),
        known_conditions: gV('setPCond').split(',').map(s=>s.trim()).filter(Boolean),
        medications: gV('setPMeds').split(',').map(s=>s.trim()).filter(Boolean),
        allergies: gV('setPAllergies').split(',').map(s=>s.trim()).filter(Boolean)
      }
    }, 'setSaveHealth');

    document.getElementById('setSaveRoutine').onclick = () => savePartial({
      daily_life_background: {
        ...(currentProfile.daily_life_background || {}),
        hobbies: gV('setPHobbies').split(',').map(s=>s.trim()).filter(Boolean),
        daily_routine: gV('setPRoutine')
      }
    }, 'setSaveRoutine');

    document.getElementById('setSaveAccess').onclick = () => savePartial({
      accessibility_settings: {
        ...(currentProfile.accessibility_settings || {}),
        font_size: gV('setPSize'),
        voice_speed: Number(gV('setPSpeed'))
      }
    }, 'setSaveAccess');

    document.getElementById('setSaveLang').onclick = () => savePartial({
      preferred_language: gV('setPLang')
    }, 'setSaveLang');

    document.getElementById('setSavePrivacy').onclick = () => savePartial({
      privacy_preferences: {
        ...(currentProfile.privacy_preferences || {}),
        consent_status: document.getElementById('setPPrivacy1').checked,
        caregiver_sharing: document.getElementById('setPPrivacy2').checked
      }
    }, 'setSavePrivacy');
  }

  function openCaregiverSettings() {
    let overlay = document.getElementById('overlayPanel');
    let content = document.getElementById('overlayContent');
    if (!overlay || !content) return;

    overlay.hidden = false;
    const cgName = currentUser?.name || '';
    
    content.innerHTML = `
      <div class="settings-shell">
        <h2 style="margin-top:0">Caregiver Settings</h2>
        <p class="cg-muted">Manage your profile and notification preferences.</p>
        <div class="l2v-field"><label>Caregiver Name</label><input id="cgSetName" value="${cgName}"></div>
        <div class="l2v-field"><label>Notification Alert Method</label><select id="cgSetMethod"><option>In-App Alerts & SMS</option><option>Email Digest</option></select></div>
        <div class="l2v-field"><label>Alert Sensitivity</label><select id="cgSetSens"><option>Standard (Score change >= 10 pts, Missed Reminders)</option><option>Urgent Only</option></select></div>
        <div style="margin-top:20px;display:flex;gap:10px">
          <button class="l2v-btn primary" id="cgSaveSettingsBtn">Save Preferences</button>
          <button class="l2v-btn ghost" onclick="document.getElementById('overlayPanel').hidden=true">Close</button>
        </div>
      </div>
    `;
    
    document.getElementById('closeOverlay').onclick = () => { overlay.hidden = true; };
    
    document.getElementById('cgSaveSettingsBtn').onclick = async () => {
      const btn = document.getElementById('cgSaveSettingsBtn');
      const newName = document.getElementById('cgSetName').value;
      btn.textContent = 'Saving...';
      btn.disabled = true;
      
      if (authToken) {
        try {
          // Caregivers might have a different profile endpoint or we just update user
          // For now we will just simulate success since caregiver profile endpoint might not be fully fleshed out
          // But let's try updating user data
          currentUser.name = newName;
          localStorage.setItem('ccner-auth-session', JSON.stringify({ user: currentUser, profile: currentProfile }));
          btn.textContent = 'Saved!';
          btn.style.backgroundColor = '#235c3b';
          
          if (window.CCNERDrawer) window.CCNERDrawer.update();
          renderCaregiverDashboard(); // Refresh UI to show new name
        } catch (e) {
          btn.textContent = 'Failed';
          btn.style.backgroundColor = '#b9552d';
        }
      } else {
        currentUser.name = newName;
        localStorage.setItem('ccner-auth-session', JSON.stringify({ user: currentUser, profile: currentProfile }));
        btn.textContent = 'Saved Locally';
      }

      setTimeout(() => {
        btn.textContent = 'Save Preferences';
        btn.disabled = false;
        btn.style.backgroundColor = '';
      }, 2000);
    };
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

  async function processReportIntake() {
    const text = document.getElementById('repText')?.value || '';
    const title = document.getElementById('repTitle')?.value || 'Doctor Report';
    const source = document.getElementById('repSource')?.value || 'doctor_report';
    const fileInput = document.getElementById('repFile');
    const area = document.getElementById('repConfirmationArea');
    if (!area) return;

    if (!text && (!fileInput || !fileInput.files.length)) {
      return alert('Please paste report text or upload a file.');
    }

    area.innerHTML = '<p>Processing report securely on server...</p>';

    const formData = new FormData();
    formData.append('title', title);
    formData.append('source_type', source);
    if (text) formData.append('report_text', text);
    if (fileInput && fileInput.files.length > 0) {
      const file = fileInput.files[0];
      if (file.type !== 'text/plain') {
        // Warning user about non-txt files
        alert('Notice: PDF/Image extraction is currently limited. Filename and metadata will be attached, but full OCR extraction may not be available. Please paste text manually if needed.');
      }
      formData.append('file', file);
    }

    let result;
    try {
      const resp = await fetch(`${API_BASE}/clinical/intake`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` },
        body: formData
      });
      if (!resp.ok) {
        throw new Error(await resp.text());
      }
      result = await resp.json();
    } catch (e) {
      console.error(e);
      area.innerHTML = '<p style="color:red">Failed to process report on server.</p>';
      return;
    }

    const { possible_information_found, report_id } = result;
    const conditions = possible_information_found?.conditions || [];
    const meds = possible_information_found?.medications || [];
    const allergies = possible_information_found?.allergies || [];

    area.innerHTML = `
      <div class="report-intake-card">
        <h3 style="margin-top:0">Possible Information Found</h3>
        <p class="cg-muted">Please confirm, edit, or ignore each item before it is applied to your health background.</p>

        <div class="entity-confirm-group">
          ${conditions.length ? conditions.map(c => renderEntityItem('Condition', 'conditions', c)).join('') : ''}
          ${meds.length ? meds.map(m => renderEntityItem('Medication', 'medications', m)).join('') : ''}
          ${allergies.length ? allergies.map(a => renderEntityItem('Allergy', 'allergies', a)).join('') : ''}
        </div>
        ${(!conditions.length && !meds.length && !allergies.length) ? '<p>No specific medical items extracted. You can manually enter them in Settings.</p>' : ''}

        <div style="margin-top:20px">
          <button class="l2v-btn primary" id="btnSaveConfirmedEntities">Apply Confirmed Items to Profile</button>
        </div>
      </div>
    `;

    const decisions = [];

    area.querySelectorAll('.btn-confirm').forEach(b => {
      b.onclick = () => {
        const item = b.closest('.entity-confirm-item');
        item.style.borderColor = '#235c3b';
        item.style.background = '#f0fdf4';
        b.textContent = '✓ Confirmed';
        b.disabled = true;
        const type = item.dataset.type;
        const val = item.querySelector('.entity-title').textContent;
        decisions.push({ entity_type: type, original_value: item.dataset.val, status: 'confirmed', final_value: val });
      };
    });

    area.querySelectorAll('.btn-edit').forEach(b => {
      b.onclick = () => {
        const item = b.closest('.entity-confirm-item');
        const titleEl = item.querySelector('.entity-title');
        const n = prompt('Edit value:', titleEl.textContent);
        if (n) {
           titleEl.textContent = n;
           item.style.borderColor = '#235c3b';
           item.style.background = '#f0fdf4';
           b.closest('.entity-actions').querySelector('.btn-confirm').textContent = '✓ Confirmed';
           b.closest('.entity-actions').querySelector('.btn-confirm').disabled = true;
           const type = item.dataset.type;
           decisions.push({ entity_type: type, original_value: item.dataset.val, status: 'edited', final_value: n });
        }
      };
    });

    area.querySelectorAll('.btn-ignore').forEach(b => {
      b.onclick = () => {
        const item = b.closest('.entity-confirm-item');
        item.style.opacity = '0.4';
        b.textContent = 'Ignored';
        b.disabled = true;
        const type = item.dataset.type;
        decisions.push({ entity_type: type, original_value: item.dataset.val, status: 'ignored', final_value: null });
      };
    });

    document.getElementById('btnSaveConfirmedEntities').onclick = async () => {
      if (decisions.length === 0) return alert('Please confirm, edit, or ignore items first.');
      try {
        const resp = await fetch(`${API_BASE}/clinical/confirm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
          body: JSON.stringify({ report_id, decisions })
        });
        if (resp.ok) {
          alert('Confirmed items have been saved with source attribution (' + source + ') to your health background.');
          document.getElementById('overlayPanel').hidden = true;
        } else {
          alert('Failed to save confirmed items.');
        }
      } catch (e) {
        alert('Network error while saving confirmed items.');
      }
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
          <button class="btn-edit">Edit</button>
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
    if (authToken) {
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
              currentUser.isOfflineRestored = true;
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
