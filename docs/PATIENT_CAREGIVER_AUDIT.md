# Cognitive Care NER: Patient & Caregiver Architecture Audit

This audit examines the active codebase of **Cognitive Care NER** (repository: `https://github.com/Adityak1273/SIH__PROTOTYPE.git`) to establish exact active runtime paths, authentication mechanisms, database models, dashboard structures, and integration points before implementing enhancements.

---

## 1. Executive Summary & Active Runtime State

The repository contains a hybrid architecture supporting:
1. **Frontend Prototype / Web Shell & Android Capacitor**: Hosted in `prototype/phase-0/`, served by `server.js` or statically bundled.
2. **Laravel 11 Production Backend**: Located in `backend-laravel/`, providing RESTful APIs under `/api/v1/`, server-rendered caregiver and patient Blade portals, centralized Rule Engine (`App\Rules`), and Sanctum token authentication.
3. **Database & Migrations**: Dual-layered — Laravel Eloquent migrations in `backend-laravel/database/migrations/` alongside Supabase PostgreSQL migrations in `supabase/migrations/`.

| Component | Active File(s) | Status | Notes |
|---|---|---|---|
| **Login Flow** | `prototype/phase-0/level2-auth-v2.js` | Direct Supabase Auth (Active) | Uses `@supabase/supabase-js@2` for phone/email OTP. **Target for replacement with Laravel Auth.** |
| **Backend Auth** | `backend-laravel/app/Http/Controllers/Api/V1/AuthController.php` | Sanctum REST (Active) | Rate-limited login (5 attempts lockout), restricted signup (`patient`, `caregiver`). |
| **Patient Dashboard** | `prototype/phase-0/index.html`, `app.js`, `phase1.js`, `level3-dashboard.js`, `backend-laravel/resources/views/patient/shell.blade.php` | Dual-Active | Prototype UI renders `#homeView` (Momo rig, 5 games, daily routine); Laravel serves `/patient/dashboard`. |
| **Caregiver Dashboard** | `backend-laravel/app/Http/Controllers/Caregiver/DashboardController.php`, `prototype/phase-0/phase2.js` | Active | Laravel implements 12 sections with strict observational phrasing; prototype implements client-side demo panel. |
| **Settings** | `prototype/phase-0/phase1.js`, `backend-laravel/app/Http/Controllers/Api/V1/AuthController.php::updateProfile` | Minimal / Mixed | Settings currently limited to participant name, preferred language, and caregiver name. |
| **Profile Storage** | `backend-laravel/app/Models/UserProfile.php`, Supabase `profiles` table | Basic (12 columns) | Needs expansion across 6 structured domains. |
| **Game Engine** | `prototype/phase-0/game-engine-v6.js` | Active (5 games) | Sequence Memory, Stroop Test, Sorting, Pattern, Spot Difference. **Preserved intact.** |
| **Momo AI Companion** | `server.js` (`/api/chat`), `backend-laravel/app/Services/MomoCompanionService.php`, `avatar-engine.js` | Active | Strict non-diagnostic guardrails, 1-3 short sentences, North-East regional language support. |
| **Offline Storage** | `laravel-sync-bridge.js`, `prototype/phase-0/phase6.js`, `sw.js` | Active | LocalStorage outbox (`ccner.laravel.outbox.v1`) syncing idempotently to `/api/v1/sync/batch`. |
| **API Layer** | `backend-laravel/routes/api.php`, `backend-laravel/routes/web.php` | Active | Sanctum protected, centralized Rule Engine evaluation, RBAC policies. |

---

## 2. Active Flow Tracing

### 2.1 Login Flow
- **Active Prototype Entry**: `core-boot.js` dynamically loads `level2-auth-v2.js` and `level2-auth-v2.css`.
- **Runtime Logic**:
  1. `render()` creates `#l2AuthGate` overlay covering the application.
  2. User chooses "Login" or "Create Account".
  3. `send()` calls `supabase.auth.signInWithOtp({ phone: '+91' + phone })` or email magic link.
  4. `verify()` calls `supabase.auth.verifyOtp()`.
  5. Upon authentication, queries `supabase.from('profiles').select('*')`.
- **Identified Gap**:
  - Requires active Supabase project with SMS provider configured, which fails in offline/demo environments without mobile credentials.
  - Does not support username/login ID + password authentication.
  - Does not provide preset demo accounts (`patient.demo`, `caregiver.demo`).
  - **Resolution**: Replace Supabase auth gate with Laravel authentication calling `/api/v1/auth/login` (with username/login ID and password) and offline demo fallbacks.

### 2.2 Signup Flow
- **Active Prototype Entry**: `level2-auth-v2.js` step 3 ("Complete your secure profile").
- **Current Fields**: Name, DOB, gender, role (`patient`, `caregiver`, `health_worker`), preferred language, emergency contact, relationship, momo name, voice preference, region, accessibility preference, privacy consent.
- **Identified Gap**:
  - Monolithic form: all fields requested simultaneously on step 3.
  - Missing structured health conditions, daily routines, personal memories, detailed accessibility, granular consents.
  - **Resolution**: Implement 7-step progressive onboarding with "Skip for now", % completion indicator (e.g. "65%"), and resumable editing from Settings.

### 2.3 Patient Dashboard
- **Active Routes/Views**:
  - Web prototype: `prototype/phase-0/index.html` (`#homeView`).
  - Laravel: `/patient/dashboard` (`patient.shell.blade.php`).
- **Included Elements**:
  - Interactive Momo puppy rig with mood states (`happy`, `cheer`, `listen`, `speak`).
  - "Start today's session" button launching 5 games in sequence.
  - Today's routine summary: Memory, Attention, Routine, Patterns.
  - Voice conversation orb (`🎙️ Hands-free voice`).
  - Reminders preview and progress navigation.
- **Identified Gap**:
  - Caregiver portal buttons (`addDashboardLauncher` in `phase2.js` and `addCaregiverButton` in `production-hardening.js`) leak onto the patient home view.
  - **Resolution**: Strip caregiver administrative launchers from the patient view; ensure `/patient/dashboard` is strictly dedicated to the patient.

### 2.4 Caregiver Dashboard
- **Active Routes/Views**:
  - Laravel: `/caregiver/dashboard` (`caregiver.dashboard.blade.php`).
  - Prototype: `phase2.js` `showDashboard()` overlay.
- **Current Features**:
  - 12 sections: Patient Selector, Today's Activity, Recent Sessions, 7-Day & 30-Day Activity, Game-by-Game Performance, Response-Time Trends, Difficulty Progression, Reminder Status, Missed Activity, Follow-Up Signals, Caregiver Notes, Report Export.
  - Server-side RBAC: `Route::middleware(['auth', 'role:caregiver,health_worker'])->prefix('caregiver')`.
  - Middleware: `EnsurePatientLinked` blocks cross-patient access.
- **Identified Gap**:
  - Needs 25 specific dashboard items verified and rendered with explicit non-diagnostic phrasing ("Cognitive training information is not a medical diagnosis").
  - Must display caregiver profile, sync status, last active time, and granular patient emergency details.

### 2.5 Settings & Personalization
- **Active Prototype Entry**: `phase1.js` `openPanel('settings')`.
- **Current Fields**: `p1ProfileForm` editing `name`, `language`, and `caregiverName`.
- **Identified Gap**:
  - Single flat settings view mixing patient and caregiver concerns.
  - **Resolution**: Create two completely separate settings pages:
    - **Patient Settings**: 11 dedicated sections (Patient Profile, Caregiver & Family, Health Background, Daily Routine, Language, Voice & Momo, Accessibility, Reminders, Privacy & Consent, Data & Reports, Account & Security).
    - **Caregiver Settings**: 8 dedicated sections (Caregiver Profile, Linked Patients, Notification Preferences, Alert Preferences, Report Preferences, Privacy, Data Export, Account & Security).

### 2.6 External Reports & Medical Documents
- **Active Prototype Entry**: `clinical-intelligence.js` (`#ccnerClinicalBody` with "Paste report text").
- **Laravel Backend**: `ClinicalIntelligenceController::analyze` and `AnalyzeClinicalReportRequest`.
- **Identified Gap**:
  - Information is analyzed, but there is no structured "Add medical/report information" flow supporting manual entry, document/PDF/photo upload, entity extraction, and **Confirm / Edit / Ignore** user interaction.
  - **Resolution**: Add multi-format intake (upload/paste/manual), entity extraction, user confirmation step, and source attribution metadata.

---

## 3. Database Schema Evolution Plan

Existing tables (`users`, `user_profiles`, `caregiver_patient_links`, `cognitive_sessions`, `game_results`, `training_baselines`, `reminders`, `daily_tasks`, `caregiver_alerts`, `privacy_consents`, `audit_logs`, `clinical_reports`, `caregiver_notes`) will remain intact.

New fields will be added via non-destructive migration:
1. `users.username` (nullable unique string, allowing login ID like `patient.demo`).
2. `user_profiles` expanded with:
   - `preferred_name`, `age`, `phone`, `email`, `address`, `city`, `state`, `country`, `additional_languages`.
   - `caregiver_info` (JSON: caregiver name, relationship, phone, email, emergency contact details, notes).
   - `health_background` (JSON: known conditions, surgeries, medications, allergies, sensory limitations, sleep, observations).
   - `daily_life_background` (JSON: hobbies, routines, familiar objects, family members, important places, personal memories, cognitive concerns).
   - `accessibility_settings` (JSON: font size, contrast, motion, speech speed/volume, large controls, simplified UI).
   - `privacy_preferences` (JSON: consents, caregiver sharing permissions, clinical sharing permissions).
   - `onboarding_step` (integer, default 1).
   - `profile_completion_pct` (integer, default 20).
3. New table `external_reports` (or enhanced `clinical_reports`):
   - `source_type`: 'user_provided', 'caregiver_provided', 'doctor_report', 'uploaded_document', 'manually_entered'.
   - `extracted_entities`: JSON.
   - `confirmed_entities`: JSON.
   - `confirmation_status`: 'pending_confirmation', 'confirmed', 'ignored'.

---

## 4. Preservation & Safety Commitments
- Five cognitive games (`game-engine-v6.js`) will run unchanged.
- Momo AI companion and safety rules will remain strictly non-diagnostic.
- Offline outbox and sync bridge (`laravel-sync-bridge.js`) will remain intact.
- Server.js and Android Capacitor assets will be preserved.
- No plain-text passwords stored in client JavaScript or committed.
- All modifications are incremental, backwards-compatible, and verifiable via automated test runner.
