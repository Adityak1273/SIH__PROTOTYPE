<?php

namespace App\Services;

use App\Enums\CognitiveDomain;
use App\Models\GameResult;
use App\Models\TrainingBaseline;
use App\Models\User;
use Illuminate\Support\Collection;

class AdaptiveDifficultyService
{
    public const MIN_DIFFICULTY = 1;
    public const MAX_DIFFICULTY = 10;

    /**
     * Evaluate recent trial results and return deterministic difficulty adjustment.
     * Implements rule-engine.js and game-engine-v6.js behavior.
     * 
     * Safety Boundary: purely training personalization; never clinical diagnosis.
     */
    public function evaluateNextDifficulty(
        string $gameKey,
        int $currentDifficulty,
        float $accuracy,
        float $responseTime,
        int $consecutiveSuccesses,
        int $consecutiveFailures,
        float $fatigue = 0.0
    ): array {
        $direction = 0;
        $reason = 'MAINTAIN';

        // Fatigue check: high fatigue triggers automatic backoff
        if ($fatigue > 0.75) {
            return [
                'difficulty' => max(self::MIN_DIFFICULTY, $currentDifficulty - 1),
                'direction' => -1,
                'reason' => 'FATIGUE_BACKOFF'
            ];
        }

        // Consecutive failure recovery threshold
        if ($consecutiveFailures >= 2 || $accuracy < 0.50) {
            $direction = -1;
            $reason = 'CONSECUTIVE_FAILURES_OR_LOW_ACCURACY';
        }
        // Consecutive success progression threshold
        elseif ($consecutiveSuccesses >= 3 && $accuracy >= 0.85 && $responseTime < 4.5) {
            $direction = 1;
            $reason = 'HIGH_ACCURACY_AND_FAST_RESPONSE';
        }

        $nextLevel = max(self::MIN_DIFFICULTY, min(self::MAX_DIFFICULTY, $currentDifficulty + $direction));

        return [
            'difficulty' => $nextLevel,
            'direction' => $direction,
            'reason' => $reason
        ];
    }

    /**
     * Update longitudinal domain baseline scores based on session performance.
     */
    public function updateBaselines(User $user, Collection $gameResults): void
    {
        $grouped = $gameResults->groupBy(function (GameResult $result) {
            return $result->game_key->domain()->value;
        });

        foreach ($grouped as $domain => $results) {
            $sessionAccuracy = $results->avg(fn($r) => $r->is_correct ? 100.0 : 0.0);

            $existing = TrainingBaseline::where('user_id', $user->id)
                ->where('domain', $domain)
                ->latest('captured_at')
                ->first();

            $newSampleCount = ($existing?->sample_count ?? 0) + 1;
            $weightedScore = $existing
                ? (($existing->score * $existing->sample_count) + $sessionAccuracy) / $newSampleCount
                : $sessionAccuracy;

            TrainingBaseline::create([
                'user_id' => $user->id,
                'domain' => CognitiveDomain::from($domain),
                'score' => round($weightedScore, 2),
                'sample_count' => $newSampleCount,
                'captured_at' => now(),
            ]);
        }
    }
}
