<?php

namespace App\Services;

use App\Models\CaregiverAlert;
use App\Models\CognitiveSession;
use App\Models\DailyTask;
use App\Models\Reminder;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class CaregiverFollowUpSignalService
{
    /**
     * Deterministically generates plain-language follow-up signals for caregivers.
     * 
     * PRINCIPLES:
     * 1. Plain language suitable for family caregivers.
     * 2. Purely deterministic and rule-based (no probabilistic AI hallucinations).
     * 3. NEVER suggests or presents performance as a dementia diagnosis.
     */
    public function generateSignals(User $patient): Collection
    {
        $signals = collect();
        $now = Carbon::now();

        $sessions = CognitiveSession::where('user_id', $patient->id)
            ->orderByDesc('completed_at')
            ->take(15)
            ->get();

        $latestSession = $sessions->first();

        // 1. INACTIVITY SIGNAL: Check if 4+ days have passed without cognitive workouts
        if (!$latestSession || ($latestSession->completed_at && $latestSession->completed_at->diffInDays($now) >= 4)) {
            $daysAgo = $latestSession ? $latestSession->completed_at->diffInDays($now) : 'several';
            $signals->push([
                'id' => 'sig_inactivity',
                'category' => 'engagement',
                'severity' => 'attention',
                'title' => 'Break in Daily Routine',
                'message' => "No cognitive workout has been completed in {$daysAgo} days. A gentle, familiar session can help re-establish daily structure.",
                'recommended_action' => "Check in with {$patient->name}. Open Momo together for a light 3-minute exercise.",
                'requires_physician' => false,
            ]);
        }

        // 2. ACCURACY / PERFORMANCE DROP SIGNAL
        if ($sessions->count() >= 3) {
            $recentThree = $sessions->take(3);
            $recentAvgAccuracy = $recentThree->avg('accuracy');
            
            if ($recentAvgAccuracy < 0.50) {
                $signals->push([
                    'id' => 'sig_accuracy_drop',
                    'category' => 'performance',
                    'severity' => 'attention',
                    'title' => 'Recent Sessions Needed Extra Effort',
                    'message' => 'Average accuracy over the last 3 sessions dropped below 50%. This often points to temporary tiredness, poor sleep, or distractions.',
                    'recommended_action' => 'Keep next sessions relaxed and unhurried. If frustration occurs, pause early.',
                    'requires_physician' => false,
                ]);
            }
        }

        // 3. MISSED MEDICATION SIGNAL
        $unacknowledgedMissedAlerts = CaregiverAlert::where('patient_id', $patient->id)
            ->where('type', 'reminder_missed')
            ->where('created_at', '>=', $now->copy()->subHours(48))
            ->whereNull('acknowledged_at')
            ->count();

        if ($unacknowledgedMissedAlerts >= 1) {
            $signals->push([
                'id' => 'sig_missed_medication',
                'category' => 'medication',
                'severity' => 'urgent',
                'title' => 'Scheduled Medicine Reminder Unacknowledged',
                'message' => 'A scheduled medication reminder was not acknowledged within 30 minutes in the past 48 hours.',
                'recommended_action' => 'Verify with the patient or pill organizer that medications were taken as prescribed.',
                'requires_physician' => false,
            ]);
        }

        // 4. RESPONSE TIME SLOWING / FATIGUE SIGNAL
        if ($sessions->count() >= 4) {
            $firstTwo = $sessions->slice(2, 2)->avg('avg_response_time_seconds') ?: 3.0;
            $latestTwo = $sessions->take(2)->avg('avg_response_time_seconds') ?: 3.0;

            if ($firstTwo > 0 && ($latestTwo / $firstTwo) >= 1.40) {
                $signals->push([
                    'id' => 'sig_fatigue_latency',
                    'category' => 'fatigue',
                    'severity' => 'info',
                    'title' => 'Longer Response Times Observed',
                    'message' => 'The patient took about 40% longer to complete choices in recent sessions compared to earlier baseline.',
                    'recommended_action' => 'Schedule practice earlier in the day when energy is highest. Ensure lighting is comfortable.',
                    'requires_physician' => false,
                ]);
            }
        }

        // 5. POSITIVE ENGAGEMENT SIGNAL (Reinforcement)
        if ($sessions->count() >= 3 && $sessions->take(3)->avg('accuracy') >= 0.80) {
            $signals->push([
                'id' => 'sig_positive_consistency',
                'category' => 'positive',
                'severity' => 'positive',
                'title' => 'Consistent & Comfortable Engagement',
                'message' => 'The patient handled recent exercises with strong accuracy and steady focus.',
                'recommended_action' => 'Offer words of encouragement! Maintaining regular daily routines supports wellbeing.',
                'requires_physician' => false,
            ]);
        }

        return $signals;
    }
}
