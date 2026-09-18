<?php

namespace Tests\Unit\Rules;

use App\Rules\Services\DifficultyRules;
use PHPUnit\Framework\TestCase;

class DifficultyRulesTest extends TestCase
{
    protected DifficultyRules $rules;

    protected function setUp(): void
    {
        parent::setUp();
        $this->rules = new DifficultyRules();
    }

    public function test_high_fatigue_forces_difficulty_backoff_and_break_offer(): void
    {
        $payload = [
            'current_difficulty' => 4,
            'session_minutes' => 40,
            'tired' => true,
            'response_trend' => 0.9,
            'mistakes' => 4,
        ];

        $decision = $this->rules->evaluate('DIFFICULTY_EVALUATE', $payload, ['fatigue' => 0.0]);

        $this->assertTrue($decision->allowed);
        $this->assertEquals('offer_break', $decision->action);
        $this->assertEquals('HIGH_FATIGUE_BACKOFF', $decision->reason);
        $this->assertEquals(3, $decision->metadata['difficulty']);
        $this->assertTrue($decision->metadata['offer_break']);
    }

    public function test_consecutive_failures_decreases_difficulty(): void
    {
        $payload = [
            'current_difficulty' => 3,
            'accuracy' => 0.33,
            'consecutive_failures' => 3,
            'consecutive_successes' => 0,
        ];

        $decision = $this->rules->evaluate('DIFFICULTY_EVALUATE', $payload, ['fatigue' => 0.1]);

        $this->assertTrue($decision->allowed);
        $this->assertEquals('encourage', $decision->action);
        $this->assertEquals('decrease', $decision->metadata['adjustment']);
        $this->assertEquals(2, $decision->metadata['difficulty']);
    }

    public function test_high_mastery_increases_difficulty_without_exceeding_max_limit(): void
    {
        $payload = [
            'current_difficulty' => 4,
            'accuracy' => 0.95,
            'response_time' => 2.4,
            'consecutive_successes' => 3,
            'consecutive_failures' => 0,
        ];

        $decision = $this->rules->evaluate('DIFFICULTY_EVALUATE', $payload, ['fatigue' => 0.1]);

        $this->assertTrue($decision->allowed);
        $this->assertEquals('increase', $decision->metadata['adjustment']);
        $this->assertEquals(5, $decision->metadata['difficulty']);
    }

    public function test_difficulty_does_not_drop_below_one(): void
    {
        $payload = [
            'current_difficulty' => 1,
            'accuracy' => 0.20,
            'consecutive_failures' => 4,
        ];

        $decision = $this->rules->evaluate('DIFFICULTY_EVALUATE', $payload, ['fatigue' => 0.1]);

        $this->assertEquals(1, $decision->metadata['difficulty']);
    }

    public function test_difficulty_does_not_exceed_ten(): void
    {
        $payload = [
            'current_difficulty' => 10,
            'accuracy' => 1.0,
            'response_time' => 1.5,
            'consecutive_successes' => 5,
        ];

        $decision = $this->rules->evaluate('DIFFICULTY_EVALUATE', $payload, ['fatigue' => 0.1]);

        $this->assertEquals(10, $decision->metadata['difficulty']);
    }
}
