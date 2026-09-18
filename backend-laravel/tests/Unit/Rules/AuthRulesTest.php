<?php

namespace Tests\Unit\Rules;

use App\Rules\Services\AuthRules;
use PHPUnit\Framework\TestCase;

class AuthRulesTest extends TestCase
{
    protected AuthRules $rules;

    protected function setUp(): void
    {
        parent::setUp();
        $this->rules = new AuthRules();
    }

    public function test_auth_attempt_locks_out_after_five_failed_attempts(): void
    {
        $payload = ['consecutive_failed_attempts' => 5];
        $decision = $this->rules->evaluate('AUTH_ATTEMPT', $payload, []);

        $this->assertFalse($decision->allowed);
        $this->assertEquals('lockout', $decision->action);
        $this->assertEquals('TOO_MANY_FAILED_ATTEMPTS', $decision->reason);
        $this->assertEquals(300, $decision->metadata['lockout_seconds']);
    }

    public function test_auth_success_redirects_to_profile_if_profile_is_incomplete(): void
    {
        $payload = ['profileComplete' => false, 'role' => 'patient'];
        $decision = $this->rules->evaluate('AUTH_SUCCESS', $payload, []);

        $this->assertTrue($decision->allowed);
        $this->assertEquals('redirect', $decision->action);
        $this->assertEquals('PROFILE_INCOMPLETE', $decision->reason);
        $this->assertEquals('profile', $decision->metadata['route']);
    }

    public function test_auth_success_routes_caregiver_to_caregiver_portal(): void
    {
        $payload = ['profileComplete' => true, 'role' => 'caregiver'];
        $decision = $this->rules->evaluate('AUTH_SUCCESS', $payload, []);

        $this->assertTrue($decision->allowed);
        $this->assertEquals('caregiver.dashboard', $decision->metadata['route']);
        $this->assertEquals('authenticated', $decision->stateUpdates['auth']);
    }

    public function test_session_timeout_resets_state_to_unauthenticated(): void
    {
        $decision = $this->rules->evaluate('SESSION_TIMEOUT', [], ['auth' => 'authenticated']);

        $this->assertTrue($decision->allowed);
        $this->assertEquals('login', $decision->metadata['route']);
        $this->assertEquals('unauthenticated', $decision->stateUpdates['auth']);
    }
}
