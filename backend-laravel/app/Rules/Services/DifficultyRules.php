<?php

namespace App\Rules\Services;

use App\Rules\Contracts\RuleInterface;
use App\Rules\Engine\RuleDecision;

class DifficultyRules implements RuleInterface
{
    public const SUPPORTED_EVENTS = [
        'DIFFICULTY_EVALUATE',
        'TRIAL_PROCESSED',
    ];

    public function supports(string $event): bool
    {
        return in_array($event, self::SUPPORTED_EVENTS, true);
    }

    public function evaluate(string $event, array $payload, array $state): RuleDecision
    {
        $currentLevel = (int) ($payload['current_difficulty'] ?? $state['lastDifficulty'] ?? 2);
        $accuracy = (float) ($payload['accuracy'] ?? 0.0);
        $responseTime = (float) ($payload['response_time'] ?? 0.0);
        $skipped = (bool) ($payload['skipped'] ?? false);
        $failures = (int) ($payload['consecutive_failures'] ?? $state['consecutiveFailures'] ?? 0);
        $successes = (int) ($payload['consecutive_successes'] ?? $state['consecutiveSuccesses'] ?? 0);
        
        $fatigue = $this->calculateFatigue($payload, (float) ($state['fatigue'] ?? 0.0));

        // 1. Fatigue rule: When fatigue >= 0.8, never increase; offer gentle break
        if ($fatigue >= 0.80) {
            $newLevel = max(1, $currentLevel - 1);
            return RuleDecision::allow(
                'offer_break',
                'HIGH_FATIGUE_BACKOFF',
                [
                    'fatigue' => $fatigue,
                    'lastDifficulty' => $newLevel,
                    'consecutiveFailures' => $failures,
                    'consecutiveSuccesses' => $successes,
                ],
                [
                    'difficulty' => $newLevel,
                    'adjustment' => 'decrease',
                    'offer_break' => true,
                ]
            );
        }

        // 2. High error rule: failures >= 3 or accuracy < 50%
        if ($failures >= 3 || $accuracy < 0.50) {
            $newLevel = max(1, $currentLevel - 1);
            return RuleDecision::allow(
                'encourage',
                'CONSECUTIVE_FAILURES_OR_LOW_ACCURACY',
                [
                    'fatigue' => $fatigue,
                    'lastDifficulty' => $newLevel,
                    'consecutiveFailures' => $failures,
                    'consecutiveSuccesses' => 0,
                ],
                [
                    'difficulty' => $newLevel,
                    'adjustment' => 'decrease',
                ]
            );
        }

        // 3. High mastery rule: successes >= 3 and accuracy >= 85% and fatigue < 50%
        if ($successes >= 3 && $accuracy >= 0.85 && $fatigue < 0.50 && $responseTime > 0) {
            $newLevel = min(10, $currentLevel + 1);
            return RuleDecision::allow(
                'encourage',
                'HIGH_MASTERY_PROGRESSION',
                [
                    'fatigue' => $fatigue,
                    'lastDifficulty' => $newLevel,
                    'consecutiveFailures' => 0,
                    'consecutiveSuccesses' => $successes,
                ],
                [
                    'difficulty' => $newLevel,
                    'adjustment' => 'increase',
                ]
            );
        }

        // 4. Skipped question rule
        if ($skipped) {
            return RuleDecision::allow(
                'simplify_next_instruction',
                'QUESTION_SKIPPED',
                ['fatigue' => $fatigue],
                ['difficulty' => $currentLevel, 'adjustment' => 'maintain']
            );
        }

        // 5. Default maintenance
        return RuleDecision::allow(
            'encourage',
            'PERFORMANCE_STABLE',
            ['fatigue' => $fatigue, 'lastDifficulty' => $currentLevel],
            ['difficulty' => $currentLevel, 'adjustment' => 'maintain']
        );
    }

    /**
     * Deterministic fatigue calculation ported from rule-engine.js:L113-L120
     */
    public function calculateFatigue(array $input, float $currentFatigue = 0.0): float
    {
        $duration = min(1.0, max(0.0, ((float)($input['session_minutes'] ?? 0)) / 45.0));
        $slow = min(1.0, max(0.0, (float)($input['response_trend'] ?? 0.0)));
        $mistakes = min(1.0, max(0.0, ((float)($input['mistakes'] ?? 0)) / 5.0));
        $skips = min(1.0, max(0.0, ((float)($input['skips'] ?? 0)) / 3.0));
        $explicit = !empty($input['tired']) ? 1.0 : 0.0;

        $calculated = ($duration * 0.25) + ($slow * 0.20) + ($mistakes * 0.20) + ($skips * 0.15) + ($explicit * 0.20);
        return round(max($currentFatigue * 0.5, min(1.0, $calculated)), 3);
    }
}
