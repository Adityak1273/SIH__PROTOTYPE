<?php

namespace App\Rules\Services;

use App\Rules\Contracts\RuleInterface;
use App\Rules\Engine\RuleDecision;

class NotificationRules implements RuleInterface
{
    public const SUPPORTED_EVENTS = [
        'NOTIFICATION_DISPATCH_EVALUATE',
        'NOTIFICATION_RATE_CHECK',
    ];

    public function supports(string $event): bool
    {
        return in_array($event, self::SUPPORTED_EVENTS, true);
    }

    public function evaluate(string $event, array $payload, array $state): RuleDecision
    {
        switch ($event) {
            case 'NOTIFICATION_DISPATCH_EVALUATE':
                $severity = $payload['severity'] ?? 'info';
                $currentTime = $payload['time'] ?? date('H:i');

                // Urgent safety alerts always bypass quiet hours and rate limits
                if ($severity === 'urgent') {
                    return RuleDecision::allow(
                        'dispatch_immediately',
                        'URGENT_ALERT_BYPASSES_RESTRICTIONS',
                        [],
                        ['channels' => ['push', 'mail', 'database']]
                    );
                }

                // Quiet hours rule: 22:00 to 07:00
                $hour = (int) explode(':', $currentTime)[0];
                if ($hour >= 22 || $hour < 7) {
                    return RuleDecision::deny(
                        'suppress_during_quiet_hours',
                        'QUIET_HOURS_ACTIVE',
                        [],
                        ['reschedule_at' => '07:30']
                    );
                }

                // Daily alert limit check to prevent caregiver fatigue
                $dailyCount = (int) ($payload['daily_alert_count'] ?? 0);
                if ($dailyCount >= 3) {
                    return RuleDecision::deny(
                        'throttle_non_urgent_alert',
                        'MAX_DAILY_ALERTS_REACHED',
                        [],
                        ['daily_limit' => 3]
                    );
                }

                return RuleDecision::allow(
                    'dispatch_notification',
                    'NOTIFICATION_AUTHORIZED',
                    [],
                    ['channels' => ['database', 'push']]
                );

            case 'NOTIFICATION_RATE_CHECK':
                $recentAttempts = (int) ($payload['recent_attempts'] ?? 0);
                if ($recentAttempts >= 10) {
                    return RuleDecision::deny('rate_limited', 'RATE_LIMIT_EXCEEDED');
                }
                return RuleDecision::allow('rate_ok', 'RATE_WITHIN_LIMIT');

            default:
                return RuleDecision::allow('observe');
        }
    }
}
