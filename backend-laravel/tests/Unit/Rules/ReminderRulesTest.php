<?php

namespace Tests\Unit\Rules;

use App\Rules\Services\ReminderRules;
use PHPUnit\Framework\TestCase;

class ReminderRulesTest extends TestCase
{
    protected ReminderRules $rules;

    protected function setUp(): void
    {
        parent::setUp();
        $this->rules = new ReminderRules();
    }

    public function test_urgent_medicine_reminder_bypasses_quiet_hours(): void
    {
        $payload = [
            'kind' => 'medicine',
            'time' => '23:30', // During quiet hours
        ];

        $decision = $this->rules->evaluate('REMINDER_DUE', $payload, []);

        $this->assertTrue($decision->allowed);
        $this->assertEquals('show_reminder', $decision->action);
        $this->assertEquals('urgent', $decision->metadata['priority']);
        $this->assertTrue($decision->metadata['require_voice_announcement']);
    }

    public function test_general_reminder_suppressed_during_quiet_hours(): void
    {
        $payload = [
            'kind' => 'general',
            'time' => '02:00', // Deep night
        ];

        $decision = $this->rules->evaluate('REMINDER_DUE', $payload, []);

        $this->assertTrue($decision->allowed);
        $this->assertEquals('defer_reminder', $decision->action);
        $this->assertEquals('QUIET_HOURS_SUPPRESSION', $decision->reason);
    }

    public function test_missed_medicine_escalates_to_caregiver_after_30_minutes(): void
    {
        $payload = [
            'kind' => 'medicine',
            'minutes_overdue' => 35,
        ];

        $decision = $this->rules->evaluate('REMINDER_MISSED_CHECK', $payload, []);

        $this->assertTrue($decision->allowed);
        $this->assertEquals('escalate_to_caregiver', $decision->action);
        $this->assertEquals('urgent', $decision->metadata['severity']);
    }

    public function test_snooze_denied_after_reaching_max_limit(): void
    {
        $payload = ['snooze_count' => 3];
        $decision = $this->rules->evaluate('REMINDER_SNOOZE', $payload, []);

        $this->assertFalse($decision->allowed);
        $this->assertEquals('reject_snooze', $decision->action);
        $this->assertEquals('MAX_SNOOZE_LIMIT_REACHED', $decision->reason);
    }
}
