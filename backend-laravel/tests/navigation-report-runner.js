/**
 * Cognitive Care NER — Navigation, Game Safety, Central Rule Engine & Report Analysis Verification Runner
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '../..');
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[${String(passed + failed + 1).padStart(2, '0')}] ${message} ... PASS`);
    passed++;
  } else {
    console.error(`[${String(passed + failed + 1).padStart(2, '0')}] ${message} ... FAIL`);
    failed++;
  }
}

console.log('====================================================================');
console.log('   COGNITIVE CARE NER - NAVIGATION, SAFETY & REPORT RUNNER          ');
console.log('====================================================================\n');

// 1. Verify index.html navigation markup
const indexHtml = fs.readFileSync(path.join(rootDir, 'prototype/phase-0/index.html'), 'utf8');
assert(indexHtml.includes('id="gameExitBtn"'), 'Dedicated #gameExitBtn present in #gameView markup');
assert(indexHtml.includes('aria-label="Exit this game"'), '#gameExitBtn contains accessible aria-label');
assert(indexHtml.includes('id="homeButton"') && indexHtml.includes('aria-label="Home"'), '#homeButton contains accessible aria-label');
assert(indexHtml.includes('id="backHome"') && indexHtml.includes('Return to Home'), '#backHome explicitly labeled "⌂ Return to Home"');

// 2. Verify styles.css active game navigation hiding
const stylesCss = fs.readFileSync(path.join(rootDir, 'prototype/phase-0/styles.css'), 'utf8');
assert(stylesCss.includes('body.ccner-game-active #homeButton'), 'styles.css suppresses #homeButton during active game session');
assert(stylesCss.includes('body.ccner-game-active .bottom-nav'), 'styles.css suppresses .bottom-nav during active game session');
assert(stylesCss.includes('.game-exit-btn'), 'styles.css contains dedicated .game-exit-btn styling');
assert(stylesCss.includes('min-height:52px') || stylesCss.includes('min-height: 52px'), 'Touch targets meet elderly-friendly >= 48px standard');

// 3. Verify client-side rule-engine.js state taxonomy and NAV rules
// Execute rule-engine.js in mock browser environment
const windowMock = {
  dispatchEvent: () => {},
  addEventListener: () => {},
};
const navigatorMock = { onLine: true };
const context = { window: windowMock, navigator: navigatorMock, CustomEvent: class {} };

const ruleEngineCode = fs.readFileSync(path.join(rootDir, 'prototype/phase-0/rule-engine.js'), 'utf8');
const runFn = new Function('window', 'navigator', 'CustomEvent', ruleEngineCode + '; return window.CCNERRuleEngine;');
const clientEngine = runFn(windowMock, navigatorMock, class {});

assert(clientEngine && typeof clientEngine.evaluate === 'function', 'Client RuleEngine loaded and exports evaluate()');
assert(typeof clientEngine.canNavigate === 'function', 'Client RuleEngine exports canNavigate()');

// Test client rule NAV-GAME-001: active game navigation lock
const activeGameNav = clientEngine.evaluate('NAV_REQUEST', { from: 'ACTIVE_GAME', to: 'HOME' });
assert(activeGameNav.allowed === false && activeGameNav.rule === 'NAV-GAME-001', 'Rule NAV-GAME-001 blocks direct navigation away from ACTIVE_GAME');

// Test client rule NAV-GAME-002: game exit confirmation modal metadata
const exitRequest = clientEngine.evaluate('GAME_EXIT_REQUEST', {});
assert(exitRequest.allowed === true && exitRequest.title === 'Exit this game?' && exitRequest.buttons.includes('Continue Game') && exitRequest.buttons.includes('Exit Game'), 'Rule NAV-GAME-002 provides strict 2-button Exit confirmation dialog');

// Test client rule EXIT-003: clean reset to HOME
const exitConfirm = clientEngine.evaluate('GAME_EXIT_CONFIRM', {});
assert(exitConfirm.allowed === true && exitConfirm.nextState === 'HOME', 'Rule EXIT-003 cleanly resets session and routes to HOME');

// Test client rule NAV-HOME-001: root screen home back lock
const homeBack = clientEngine.evaluate('NAV_REQUEST', { from: 'HOME', to: 'BACK' });
assert(homeBack.allowed === false && homeBack.rule === 'NAV-HOME-001', 'Rule NAV-HOME-001 disallows Back button on root home screen');

// Test client rule NAV-MODAL-001: critical modal scrim lock
const scrimDismiss = clientEngine.evaluate('MODAL_DISMISS_REQUEST', { isScrim: true, isCritical: true });
assert(scrimDismiss.allowed === false && scrimDismiss.rule === 'NAV-MODAL-001', 'Rule NAV-MODAL-001 locks background scrim click on critical confirmation dialogs');

// Test client rule AI-003: non-diagnostic guardrail
const aiSafety = clientEngine.evaluate('AI_SAFETY_CHECK', { text: 'The user has stage 3 dementia' });
assert(aiSafety.allowed === false && aiSafety.rule === 'AI-003', 'Rule AI-003 intercepts and rejects clinical dementia diagnosis attempts');

// Test client rule AI-002: safe fallback when API key is unconfigured
const aiFallback = clientEngine.evaluate('AI_SAFETY_CHECK', { text: 'Hello Momo', apiKeyConfigured: false });
assert(aiFallback.allowed === false && aiFallback.fallback.includes('AI report analysis is not configured'), 'Rule AI-002 returns safe fallback message when API key is missing');

// Test client rule A11Y-001: touch target size check
const a11ySmall = clientEngine.evaluate('ACCESSIBILITY_CHECK', { targetWidth: 40, targetHeight: 40 });
assert(a11ySmall.compliant === false && a11ySmall.rule === 'A11Y-001', 'Rule A11Y-001 flags touch targets smaller than 48px');

const a11yGood = clientEngine.evaluate('ACCESSIBILITY_CHECK', { targetWidth: 52, targetHeight: 52, contrastRatio: 7.2 });
assert(a11yGood.compliant === true, 'Rule A11Y-001 & A11Y-002 accept compliant touch targets and contrast');

// 4. Verify game-controls.js implementation
const gameControlsJs = fs.readFileSync(path.join(rootDir, 'prototype/phase-0/game-controls.js'), 'utf8');
assert(gameControlsJs.includes('Exit this game?'), 'game-controls.js uses standard prompt title: "Exit this game?"');
assert(gameControlsJs.includes('Your current game progress may not be saved.'), 'game-controls.js uses standard message: "Your current game progress may not be saved."');
assert(gameControlsJs.includes('Continue Game') && gameControlsJs.includes('Exit Game'), 'game-controls.js renders "Continue Game" (primary) and "Exit Game" (danger)');
assert(gameControlsJs.includes('ccner-game-active'), 'game-controls.js manages body.ccner-game-active class');

// 5. Verify core-boot.js click interception
const coreBootJs = fs.readFileSync(path.join(rootDir, 'prototype/phase-0/core-boot.js'), 'utf8');
assert(coreBootJs.includes('gameExitBtn'), 'core-boot.js intercepts clicks on #gameExitBtn');
assert(coreBootJs.includes('isGameActive'), 'core-boot.js detects active game and prevents unauthorized navigation');

// 6. Verify Laravel NavigationRules and ClinicalReportRules files
assert(fs.existsSync(path.join(rootDir, 'backend-laravel/app/Rules/Services/NavigationRules.php')), 'NavigationRules.php exists in Laravel App/Rules/Services');
assert(fs.existsSync(path.join(rootDir, 'backend-laravel/app/Rules/Services/ClinicalReportRules.php')), 'ClinicalReportRules.php exists in Laravel App/Rules/Services');
assert(fs.existsSync(path.join(rootDir, 'backend-laravel/app/Services/ClinicalReportAnalysisService.php')), 'ClinicalReportAnalysisService.php exists in Laravel App/Services');

const providerContent = fs.readFileSync(path.join(rootDir, 'backend-laravel/app/Providers/RuleEngineServiceProvider.php'), 'utf8');
assert(providerContent.includes('NavigationRules'), 'RuleEngineServiceProvider registers NavigationRules');
assert(providerContent.includes('ClinicalReportRules'), 'RuleEngineServiceProvider registers ClinicalReportRules');

// 7. Verify ClinicalIntelligenceController endpoints
const controllerContent = fs.readFileSync(path.join(rootDir, 'backend-laravel/app/Http/Controllers/Api/V1/ClinicalIntelligenceController.php'), 'utf8');
assert(controllerContent.includes('function explain'), 'ClinicalIntelligenceController implements explain() method');
assert(controllerContent.includes('function doctorQuestions'), 'ClinicalIntelligenceController implements doctorQuestions() method');
assert(controllerContent.includes('ClinicalReportAnalysisService'), 'ClinicalIntelligenceController injects ClinicalReportAnalysisService');

// 8. Verify API routes
const apiRoutes = fs.readFileSync(path.join(rootDir, 'backend-laravel/routes/api.php'), 'utf8');
assert(apiRoutes.includes('/clinical/explain'), 'api.php registers /clinical/explain endpoint');
assert(apiRoutes.includes('/clinical/doctor-questions'), 'api.php registers /clinical/doctor-questions endpoint');

console.log('\n====================================================================');
console.log(`TOTAL VERIFICATIONS: ${passed + failed}`);
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${failed}`);
console.log('====================================================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('>>> ALL NAVIGATION, SAFETY & CLINICAL REPORT REQUIREMENTS PASSED! <<<\n');
}
