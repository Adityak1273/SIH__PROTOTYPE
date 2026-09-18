<?php

namespace App\Rules\Services;

use App\Rules\Contracts\RuleInterface;
use App\Rules\Engine\RuleDecision;

class ReminderRules implements RuleInterface
{
    public const SUPPORTED_EVENTS = [
        'REMINDER_DUE',
        'REMINDER_ACKNOWLEDGE',
        'REMINDER_MISSED_CHECK',
        'REMINDER_SNOOZE',
    ];

    public function supports(string $event): bool
    {
        return in_array($event, self::SUPPORTED_EVENTS, true);
    }

    public function evaluate(string $event, array $payload, array $state): RuleDecision
    {
        switch ($event) {
            case 'REMINDER_DUE':
                $kind = $payload['kind'] ?? 'general';
                $isUrgent = in_array($kind, ['medicine', 'hydration', 'appointment'], true);
                $currentTime = $payload['time'] ?? date('H:i');

                // Quiet hours rule: 22:00 to 07:00
                $hour = (int) explode(':', $currentTime)[0];
                $isQuietHours = ($hour >= 22 || $hour < 7);

                if ($isQuietHours && !$isUrgent) {
                    return RuleDecision::allow(
                        'defer_reminder',
                        'QUIET_HOURS_SUPPRESSION',
                        [],
                        ['reschedule_at' => '07:30', 'quiet_hours' => true]
                    );
                }

                $priority = $isUrgent ? 'urgent' : 'normal';

                return RuleDecision::allow(
                    'show_reminder',
                    'REMINDER_DISPATCHED',
                    [],
                    [
                        'priority' => $priority,
                        'kind' => $kind,
                        'require_voice_announcement' => $isUrgent,
                    ]
                );

            case 'REMINDER_MISSED_CHECK':
                $minutesOverdue = (int) ($payload['minutes_overdue'] ?? 0);
                $kind = $payload['kind'] ?? 'general';

                // Escalate to caregiver if medicine is missed for > 30 minutes
                if ($kind === 'medicine' && $minutesOverdue >= 30) {
                    return RuleDecision::allow(
                        'escalate_to_caregiver',
                        'MISSED_MEDICATION_ESCALATION',
                        [],
                        ['alert_type' => 'reminder_missed', 'severity' => 'urgent']
                    );
                }

                return RuleDecision::allow('log_missed_status', 'REMINDER_LOGGED');

            case 'REMINDER_ACKNOWLEDGE':
                return RuleDecision::allow(
                    'dismiss_reminder',
                    'REMINDER_ACKNOWLEDGED_BY_USER'
                );

            case 'REMINDER_SNOOZE':
                $snoozeCount = (int) ($payload['snooze_count'] ?? 0);
                if ($snoozeCount >= 3) {
                    return RuleDecision::deny(
                        'reject_snooze',
                        'MAX_SNOOZE_LIMIT_REACHED',
                        [],
                        ['action_required' => true]
                    );
                }

                return RuleDecision::allow(
                    'snooze',
                    'REMINDER_SNOOZED_10_MINUTES',
                    [],
                    ['snooze_minutes' => 10]
                );

            default:
                return RuleDecision::allow('observe');
        }
    }
}
