<?php

namespace Tests\Unit\Rules;

use App\Rules\Services\SafetyRules;
use PHPUnit\Framework\TestCase;

class SafetyRulesTest extends TestCase
{
    protected SafetyRules $rules;

    protected function setUp(): void
    {
        parent::setUp();
        $this->rules = new SafetyRules();
    }

    public function test_acute_medical_red_flag_disables_ai_and_shows_safety_flow(): void
    {
        $payload = ['red_flag' => 'sudden_confusion_and_fall'];
        $decision = $this->rules->evaluate('ACUTE_RED_FLAG', $payload, []);

        $this->assertFalse($decision->allowed);
        $this->assertEquals('show_safety_flow', $decision->action);
        $this->assertEquals('EMERGENCY_OR_RED_FLAG_DETECTED', $decision->reason);
        $this->assertFalse($decision->metadata['allow_ai_autonomy']);
        $this->assertEquals('disabled', $decision->stateUpdates['voice']);
    }

    public function test_ai_response_with_forbidden_dementia_diagnosis_is_intercepted(): void
    {
        $payload = ['text' => 'Based on your score, you have stage 3 dementia.'];
        $decision = $this->rules->evaluate('AI_RESPONSE_INSPECT', $payload, []);

        $this->assertFalse($decision->allowed);
        $this->assertEquals('intercept_ai_output', $decision->action);
        $this->assertEquals('CLINICAL_CLAIM_OR_PRESCRIPTION_DETECTED', $decision->reason);
        $this->assertStringContainsString('companion', $decision->metadata['safe_fallback']);
    }

    public function test_ai_response_with_prescription_dosage_is_intercepted(): void
    {
        $payload = ['text' => 'You should take 10mg of Donepezil before sleep.'];
        $decision = $this->rules->evaluate('AI_RESPONSE_INSPECT', $payload, []);

        $this->assertFalse($decision->allowed);
        $this->assertEquals('intercept_ai_output', $decision->action);
    }

    public function test_friendly_companion_response_is_approved(): void
    {
        $payload = ['text' => "Hello! I'm Momo. Shall we do today's little brain workout together? 🐾"];
        $decision = $this->rules->evaluate('AI_RESPONSE_INSPECT', $payload, []);

        $this->assertTrue($decision->allowed);
        $this->assertEquals('pass_ai_output', $decision->action);
    }
}
