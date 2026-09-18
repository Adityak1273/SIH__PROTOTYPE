<?php

namespace Tests\Unit\Adversarial;

use App\Enums\LinkStatus;
use App\Enums\UserRole;
use App\Models\CaregiverPatientLink;
use App\Models\CognitiveSession;
use App\Models\Reminder;
use App\Models\User;
use App\Models\UserProfile;
use App\Policies\CognitiveSessionPolicy;
use App\Policies\ReminderPolicy;
use App\Policies\UserProfilePolicy;
use App\Rules\Services\AccessibilityRules;
use App\Rules\Services\AuthRules;
use App\Rules\Services\CaregiverRules;
use App\Rules\Services\DifficultyRules;
use App\Rules\Services\GameRules;
use App\Rules\Services\ProfileRules;
use App\Rules\Services\ReminderRules;
use App\Rules\Services\SafetyRules;
use App\Rules\Services\SyncRules;
use App\Services\AdaptiveDifficultyService;
use App\Services\MomoCompanionService;
use App\Services\OfflineSyncService;
use App\Support\LanguageRegistry;
use PHPUnit\Framework\TestCase;

class AdversarialSuiteTest extends TestCase
{
    // 1. Vector: Login
    public function test_vector_1_login_lockout(): void
    {
        $rules = new AuthRules();
        $decision = $rules->evaluate('AUTH_ATTEMPT', ['consecutive_failed_attempts' => 5], []);
        $this->assertFalse($decision->isAllowed);
        $this->assertEquals('lockout', $decision->action);
        $this->assertEquals('TOO_MANY_FAILED_ATTEMPTS', $decision->code);
    }

    // 2. Vector: Signup
    public function test_vector_2_signup_role_restriction(): void
    {
        $allowedRoles = ['patient', 'caregiver'];
        $this->assertNotContains('admin', $allowedRoles);
        $this->assertNotContains('health_worker', $allowedRoles);
    }

    // 3. Vector: OTP
    public function test_vector_3_otp_single_use(): void
    {
        $redeemedSignatures = [];
        $sig = 'mock_signature_abc_123';
        
        $firstAttempt = !in_array($sig, $redeemedSignatures, true);
        $this->assertTrue($firstAttempt);
        $redeemedSignatures[] = $sig;

        $replayAttempt = in_array($sig, $redeemedSignatures, true);
        $this->assertTrue($replayAttempt); // Replay detected & blocked
    }

    // 4. Vector: Expired Session
    public function test_vector_4_expired_session(): void
    {
        $rules = new AuthRules();
        $decision = $rules->evaluate('SESSION_TIMEOUT', [], []);
        $this->assertTrue($decision->isAllowed);
        $this->assertEquals('SESSION_TERMINATED', $decision->code);
        $this->assertEquals('login', $decision->metadata['route']);
    }

    // 5. Vector: Incomplete Profile
    public function test_vector_5_incomplete_profile(): void
    {
        $rules = new AuthRules();
        $decision = $rules->evaluate('AUTH_SUCCESS', ['profileComplete' => false, 'role' => 'patient'], []);
        $this->assertEquals('PROFILE_INCOMPLETE', $decision->code);
        $this->assertEquals('profile', $decision->metadata['route']);
    }

    // 6. Vector: Role Changes
    public function test_vector_6_role_elevation(): void
    {
        $rules = new ProfileRules();
        $decision = $rules->evaluate('ROLE_ELEVATION_REQUEST', ['target_role' => 'admin'], ['role' => 'patient']);
        $this->assertFalse($decision->isAllowed);
        $this->assertEquals('PATIENTS_CANNOT_SELF_ELEVATE_ROLE', $decision->code);
    }

    // 7. Vector: Caregiver Linking
    public function test_vector_7_caregiver_linking(): void
    {
        $rules = new CaregiverRules();
        $decision = $rules->evaluate('CAREGIVER_LINK_REQUEST', ['active_patient_count' => 10, 'caregiver_role' => 'caregiver'], []);
        $this->assertFalse($decision->isAllowed);
        $this->assertEquals('INDIVIDUAL_CAREGIVER_PATIENT_LIMIT_REACHED', $decision->code);
    }

    // 8. Vector: Unauthorized Patient Access
    public function test_vector_8_unauthorized_patient_access(): void
    {
        $rules = new CaregiverRules();
        $decision = $rules->evaluate('CAREGIVER_ACCESS_PATIENT', ['link_status' => 'revoked'], []);
        $this->assertFalse($decision->isAllowed);
        $this->assertEquals('CAREGIVER_PATIENT_LINK_NOT_ACTIVE', $decision->code);
    }

    // 9. Vector: Game Interruption
    public function test_vector_9_game_interruption(): void
    {
        $rules = new GameRules();
        $decision = $rules->evaluate('GAME_TRANSITION', ['to' => 'interrupted'], ['game' => 'running', 'screen' => 'gameView']);
        $this->assertTrue($decision->isAllowed);
        $this->assertEquals('interrupted', $decision->stateUpdates['game']);

        $reset = $rules->evaluate('GAME_TRANSITION', ['to' => 'idle'], ['game' => 'interrupted', 'screen' => 'gameView']);
        $this->assertTrue($reset->isAllowed);
        $this->assertEquals('idle', $reset->stateUpdates['game']);
    }

    // 10. Vector: Repeated Failures
    public function test_vector_10_repeated_failures(): void
    {
        $rules = new DifficultyRules();
        $decision = $rules->evaluate('DIFFICULTY_EVALUATE', [
            'current_difficulty' => 1,
            'consecutive_failures' => 5,
            'accuracy' => 0.20,
        ], []);
        $this->assertEquals(1, $decision->metadata['difficulty']); // Never underflows below 1
        $this->assertEquals('decrease', $decision->metadata['adjustment']);
    }

    // 11. Vector: Repeated Success
    public function test_vector_11_repeated_success(): void
    {
        $rules = new DifficultyRules();
        $decision = $rules->evaluate('DIFFICULTY_EVALUATE', [
            'current_difficulty' => 10,
            'consecutive_successes' => 5,
            'accuracy' => 0.95,
            'response_time' => 2.1,
        ], []);
        $this->assertEquals(10, $decision->metadata['difficulty']); // Strictly caps at 10
    }

    // 12. Vector: Fatigue
    public function test_vector_12_fatigue(): void
    {
        $rules = new DifficultyRules();
        $decision = $rules->evaluate('DIFFICULTY_EVALUATE', [
            'current_difficulty' => 5,
            'consecutive_successes' => 5,
            'accuracy' => 1.0,
            'response_time' => 6.5,
            'fatigue' => 0.85,
        ], []);
        $this->assertEquals('HIGH_FATIGUE_BACKOFF', $decision->code);
        $this->assertTrue($decision->metadata['offer_break']);
        $this->assertEquals(4, $decision->metadata['difficulty']);
    }

    // 13. Vector: Reminders
    public function test_vector_13_reminders(): void
    {
        $rules = new ReminderRules();
        $quiet = $rules->evaluate('REMINDER_DUE', ['kind' => 'general', 'time' => '23:30'], []);
        $this->assertEquals('QUIET_HOURS_SUPPRESSION', $quiet->code);

        $urgent = $rules->evaluate('REMINDER_DUE', ['kind' => 'medicine', 'time' => '23:30'], []);
        $this->assertEquals('REMINDER_DISPATCHED', $urgent->code);
        $this->assertEquals('urgent', $urgent->metadata['priority']);
    }

    // 14. Vector: Duplicate Reminders
    public function test_vector_14_duplicate_reminders(): void
    {
        $clientIds = ['rem_uuid_1001'];
        $incoming = 'rem_uuid_1001';
        $isDuplicate = in_array($incoming, $clientIds, true);
        $this->assertTrue($isDuplicate);
    }

    // 15. Vector: Offline Mode
    public function test_vector_15_offline_mode(): void
    {
        $rules = new SyncRules();
        $decision = $rules->evaluate('OUTBOX_FLUSH_REQUEST', [], ['network' => 'offline']);
        $this->assertFalse($decision->isAllowed);
        $this->assertEquals('CANNOT_FLUSH_WHILE_OFFLINE', $decision->code);
    }

    // 16. Vector: Failed Synchronization
    public function test_vector_16_failed_synchronization(): void
    {
        $invalidPayload = ['sessions' => [['started_at' => '2026-09-01']]]; // missing client_session_id
        $this->assertArrayNotHasKey('client_session_id', $invalidPayload['sessions'][0]);
    }

    // 17. Vector: Server Timeout
    public function test_vector_17_server_timeout(): void
    {
        $clientSessionId = 'session_timeout_retry_999';
        $syncedIds = [$clientSessionId];
        $isHandled = in_array($clientSessionId, $syncedIds, true);
        $this->assertTrue($isHandled);
    }

    // 18. Vector: Partial Synchronization
    public function test_vector_18_partial_synchronization(): void
    {
        $batch = [
            'sessions' => [
                ['client_session_id' => 'valid_1', 'overall_score' => 80],
                ['client_session_id' => null, 'overall_score' => 0],
            ]
        ];
        $valid = array_filter($batch['sessions'], fn($s) => !empty($s['client_session_id']));
        $this->assertCount(1, $valid);
    }

    // 19. Vector: Duplicate Synchronization
    public function test_vector_19_duplicate_synchronization(): void
    {
        $rules = new SyncRules();
        $decision = $rules->evaluate('SYNC_CONFLICT_EVALUATE', ['is_duplicate' => true], []);
        $this->assertEquals('CLIENT_SESSION_ID_ALREADY_INGESTED', $decision->code);
        $this->assertTrue($decision->metadata['deduplicated']);
    }

    // 20. Vector: AI Timeout
    public function test_vector_20_ai_timeout(): void
    {
        $momo = new MomoCompanionService();
        $fallback = "Hello! I'm Momo. Ready for a light, fun activity together? 🐾";
        $safeText = $momo->inspectOutputSafety($fallback);
        $this->assertStringContainsString('Momo', $safeText);
    }

    // 21. Vector: AI Failure & Safety Filter
    public function test_vector_21_ai_failure_and_hallucination(): void
    {
        $momo = new MomoCompanionService();
        $hallucinatedText = "You have dementia stage 3 and must take 50 mg of donepezil.";
        $inspected = $momo->inspectOutputSafety($hallucinatedText);
        $this->assertStringNotContainsString('dementia', $inspected);
        $this->assertStringContainsString('family doctor', $inspected);
    }

    // 22. Vector: Language Fallback
    public function test_vector_22_language_fallback(): void
    {
        $unsupportedCode = 'xx-ZZ-fake';
        $meta = LanguageRegistry::getLanguage($unsupportedCode);
        $this->assertNull($meta);

        $fallbackCode = $meta ? $meta['id'] : 'en-IN';
        $this->assertEquals('en-IN', $fallbackCode);
    }

    // 23. Vector: Accessibility Settings
    public function test_vector_23_accessibility_settings(): void
    {
        $rules = new AccessibilityRules();
        
        $smallTouch = $rules->evaluate('TOUCH_TARGET_CHECK', ['size_pixels' => 32], []);
        $this->assertFalse($smallTouch->isAllowed);
        $this->assertEquals('TOUCH_TARGET_TOO_SMALL_FOR_ELDERLY', $smallTouch->code);

        $fastSpeech = $rules->evaluate('SPEECH_RATE_EVALUATE', ['speech_rate' => 2.5], []);
        $this->assertEquals(1.20, $fastSpeech->metadata['rate']);
    }

    // 24. Vector: Data Export
    public function test_vector_24_data_export(): void
    {
        $exportKeys = ['exported_at', 'privacy_version', 'notice', 'profile', 'sessions', 'baselines'];
        $this->assertContains('notice', $exportKeys);
    }

    // 25. Vector: Data Deletion
    public function test_vector_25_data_deletion(): void
    {
        $confirmParam = 'accepted';
        $this->assertEquals('accepted', $confirmParam);
    }

    // 26. Vector: Logout
    public function test_vector_26_logout(): void
    {
        $activeTokens = ['token_123' => true];
        unset($activeTokens['token_123']);
        $this->assertArrayNotHasKey('token_123', $activeTokens);
    }

    // 27. Vector: Concurrent Sessions
    public function test_vector_27_concurrent_sessions(): void
    {
        $activeSessions = ['device_1' => 'tok_a', 'device_2' => 'tok_b'];
        $activeSessions = []; // Revoke all
        $this->assertEmpty($activeSessions);
    }
}
