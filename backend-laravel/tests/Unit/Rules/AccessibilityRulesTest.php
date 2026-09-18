<?php

namespace Tests\Unit\Rules;

use App\Rules\Services\AccessibilityRules;
use PHPUnit\Framework\TestCase;

class AccessibilityRulesTest extends TestCase
{
    protected AccessibilityRules $rules;

    protected function setUp(): void
    {
        parent::setUp();
        $this->rules = new AccessibilityRules();
    }

    public function test_touch_target_smaller_than_48px_is_denied(): void
    {
        $payload = ['size_pixels' => 36, 'accessibility_mode' => 'standard'];
        $decision = $this->rules->evaluate('TOUCH_TARGET_CHECK', $payload, []);

        $this->assertFalse($decision->allowed);
        $this->assertEquals('enforce_min_touch_target', $decision->action);
        $this->assertEquals(48, $decision->metadata['required_size']);
    }

    public function test_large_touch_mode_requires_64px_minimum(): void
    {
        $payload = ['size_pixels' => 52, 'accessibility_mode' => 'large-touch'];
        $decision = $this->rules->evaluate('TOUCH_TARGET_CHECK', $payload, []);

        $this->assertFalse($decision->allowed);
        $this->assertEquals(64, $decision->metadata['required_size']);
    }

    public function test_speech_rate_is_clamped_to_elderly_comprehension_bounds(): void
    {
        // Unusually fast rate (1.8x) is clamped to 1.20x
        $payload = ['speech_rate' => 1.8];
        $decision = $this->rules->evaluate('SPEECH_RATE_EVALUATE', $payload, []);

        $this->assertTrue($decision->allowed);
        $this->assertEquals(1.20, $decision->metadata['rate']);

        // Unusually slow rate (0.4x) is clamped to 0.70x
        $payloadSlow = ['speech_rate' => 0.4];
        $decisionSlow = $this->rules->evaluate('SPEECH_RATE_EVALUATE', $payloadSlow, []);

        $this->assertTrue($decisionSlow->allowed);
        $this->assertEquals(0.70, $decisionSlow->metadata['rate']);
    }
}
