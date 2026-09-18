<?php

namespace App\Rules\Services;

use App\Rules\Contracts\RuleInterface;
use App\Rules\Engine\RuleDecision;

class AccessibilityRules implements RuleInterface
{
    public const SUPPORTED_EVENTS = [
        'ACCESSIBILITY_SETTING_CHANGE',
        'TOUCH_TARGET_CHECK',
        'SPEECH_RATE_EVALUATE',
    ];

    public function supports(string $event): bool
    {
        return in_array($event, self::SUPPORTED_EVENTS, true);
    }

    public function evaluate(string $event, array $payload, array $state): RuleDecision
    {
        switch ($event) {
            case 'TOUCH_TARGET_CHECK':
                $size = (int) ($payload['size_pixels'] ?? 0);
                $mode = $payload['accessibility_mode'] ?? 'standard';
                $minSize = ($mode === 'large-touch') ? 64 : 48;

                if ($size < $minSize) {
                    return RuleDecision::deny(
                        'enforce_min_touch_target',
                        'TOUCH_TARGET_TOO_SMALL_FOR_ELDERLY',
                        [],
                        ['current_size' => $size, 'required_size' => $minSize]
                    );
                }

                return RuleDecision::allow('touch_target_approved', 'TOUCH_TARGET_ACCESSIBLE');

            case 'SPEECH_RATE_EVALUATE':
                $requestedRate = (float) ($payload['speech_rate'] ?? 0.85);
                // Bounded between 0.70x and 1.20x for elderly comprehension
                $clamped = max(0.70, min(1.20, $requestedRate));

                return RuleDecision::allow(
                    'apply_speech_rate',
                    'SPEECH_RATE_BOUNDED',
                    [],
                    ['rate' => $clamped]
                );

            case 'ACCESSIBILITY_SETTING_CHANGE':
                $mode = $payload['mode'] ?? 'standard';
                if (!in_array($mode, ['standard', 'high-contrast', 'large-touch', 'simplified'], true)) {
                    return RuleDecision::deny('reject_mode', 'INVALID_ACCESSIBILITY_MODE');
                }

                return RuleDecision::allow(
                    'apply_accessibility_mode',
                    'ACCESSIBILITY_MODE_APPLIED',
                    [],
                    ['mode' => $mode]
                );

            default:
                return RuleDecision::allow('observe');
        }
    }
}
