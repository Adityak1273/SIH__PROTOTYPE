<?php

namespace Tests\Unit\Rules;

use App\Rules\Services\ProfileRules;
use PHPUnit\Framework\TestCase;

class ProfileRulesTest extends TestCase
{
    protected ProfileRules $rules;

    protected function setUp(): void
    {
        parent::setUp();
        $this->rules = new ProfileRules();
    }

    public function test_patient_cannot_self_elevate_to_admin(): void
    {
        $payload = ['target_role' => 'admin'];
        $state = ['role' => 'patient'];

        $decision = $this->rules->evaluate('ROLE_ELEVATION_REQUEST', $payload, $state);

        $this->assertFalse($decision->allowed);
        $this->assertEquals('reject_elevation', $decision->action);
        $this->assertEquals('PATIENTS_CANNOT_SELF_ELEVATE_ROLE', $decision->reason);
    }

    public function test_unsupported_language_falls_back_to_en_in(): void
    {
        $payload = ['language' => 'invalid-lang-code'];
        $decision = $this->rules->evaluate('LANGUAGE_SELECT', $payload, []);

        $this->assertFalse($decision->allowed);
        $this->assertEquals('fallback_language', $decision->action);
        $this->assertEquals('en-IN', $decision->metadata['fallback']);
    }

    public function test_supported_regional_language_is_approved(): void
    {
        $payload = ['language' => 'as-IN']; // Assamese
        $decision = $this->rules->evaluate('LANGUAGE_SELECT', $payload, []);

        $this->assertTrue($decision->allowed);
        $this->assertEquals('apply_language', $decision->action);
        $this->assertEquals('as-IN', $decision->metadata['language']);
    }

    public function test_dob_cannot_be_in_the_future(): void
    {
        $payload = [
            'date_of_birth' => date('Y-m-d', strtotime('+1 year')),
            'voice_preference' => 'default',
        ];

        $decision = $this->rules->evaluate('PROFILE_UPDATE', $payload, []);

        $this->assertFalse($decision->allowed);
        $this->assertEquals('DOB_CANNOT_BE_FUTURE', $decision->reason);
    }
}
