<?php

namespace Tests\Unit\Rules;

use App\Rules\Services\NotificationRules;
use PHPUnit\Framework\TestCase;

class NotificationRulesTest extends TestCase
{
    protected NotificationRules $rules;

    protected function setUp(): void
    {
        parent::setUp();
        $this->rules = new NotificationRules();
    }

    public function test_urgent_alert_bypasses_quiet_hours_and_rate_limits(): void
    {
        $payload = [
            'severity' => 'urgent',
            'time' => '03:15', // Quiet hours
            'daily_alert_count' => 10, // Over normal rate limit
        ];

        $decision = $this->rules->evaluate('NOTIFICATION_DISPATCH_EVALUATE', $payload, []);

        $this->assertTrue($decision->allowed);
        $this->assertEquals('dispatch_immediately', $decision->action);
        $this->assertEquals('URGENT_ALERT_BYPASSES_RESTRICTIONS', $decision->reason);
        $this->assertContains('push', $decision->metadata['channels']);
    }

    public function test_non_urgent_notification_suppressed_during_quiet_hours(): void
    {
        $payload = [
            'severity' => 'info',
            'time' => '23:45',
        ];

        $decision = $this->rules->evaluate('NOTIFICATION_DISPATCH_EVALUATE', $payload, []);

        $this->assertFalse($decision->allowed);
        $this->assertEquals('suppress_during_quiet_hours', $decision->action);
        $this->assertEquals('QUIET_HOURS_ACTIVE', $decision->reason);
    }

    public function test_non_urgent_notification_throttled_after_three_daily_alerts(): void
    {
        $payload = [
            'severity' => 'info',
            'time' => '14:00',
            'daily_alert_count' => 3,
        ];

        $decision = $this->rules->evaluate('NOTIFICATION_DISPATCH_EVALUATE', $payload, []);

        $this->assertFalse($decision->allowed);
        $this->assertEquals('throttle_non_urgent_alert', $decision->action);
        $this->assertEquals('MAX_DAILY_ALERTS_REACHED', $decision->reason);
    }
}
