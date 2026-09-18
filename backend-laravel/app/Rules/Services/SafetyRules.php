<?php

namespace App\Rules\Services;

use App\Rules\Contracts\RuleInterface;
use App\Rules\Engine\RuleDecision;

class SafetyRules implements RuleInterface
{
    public const SUPPORTED_EVENTS = [
        'SAFETY_SIGNAL',
        'AI_RESPONSE_INSPECT',
        'ACUTE_RED_FLAG',
    ];

    /** Forbidden claims an AI is never allowed to make */
    protected array $prohibitedClinicalPatterns = [
        '/\b(you have|diagnosed with)\s+(dementia|alzheimer)/i',
        '/\b(stage\s+[1-7]|cdr\s+score\s+of)\b/i',
        '/\b(prescribe|prescribed|dosage|take\s+\d+\s*mg)\b/i',
        '/\b(cure|treat)\s+(your\s+dementia|cognitive\s+impairment)/i',
    ];

    public function supports(string $event): bool
    {
        return in_array($event, self::SUPPORTED_EVENTS, true);
    }

    public function evaluate(string $event, array $payload, array $state): RuleDecision
    {
        switch ($event) {
            case 'SAFETY_SIGNAL':
            case 'ACUTE_RED_FLAG':
                $redFlag = $payload['red_flag'] ?? 'acute_confusion';
                return RuleDecision::deny(
                    'show_safety_flow',
                    'EMERGENCY_OR_RED_FLAG_DETECTED',
                    ['voice' => 'disabled', 'game' => 'idle'],
                    [
                        'red_flag' => $redFlag,
                        'allow_ai_autonomy' => false,
                        'show_emergency_contact' => true,
                    ]
                );

            case 'AI_RESPONSE_INSPECT':
                $aiText = (string) ($payload['text'] ?? '');

                foreach ($this->prohibitedClinicalPatterns as $pattern) {
                    if (preg_match($pattern, $aiText)) {
                        return RuleDecision::deny(
                            'intercept_ai_output',
                            'CLINICAL_CLAIM_OR_PRESCRIPTION_DETECTED',
                            [],
                            [
                                'safe_fallback' => "I'm your friendly companion Momo! For any medical questions or concerns, please speak directly with your doctor or caregiver. 🐾",
                                'violating_text' => $aiText,
                            ]
                        );
                    }
                }

                return RuleDecision::allow(
                    'pass_ai_output',
                    'OUTPUT_WITHIN_SAFETY_BOUNDS'
                );

            default:
                return RuleDecision::allow('observe');
        }
    }
}
