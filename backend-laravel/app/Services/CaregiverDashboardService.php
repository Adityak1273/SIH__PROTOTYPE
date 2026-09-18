<?php

namespace App\Services;

use App\Enums\GameKey;
use App\Models\CaregiverAlert;
use App\Models\CaregiverNote;
use App\Models\CaregiverPatientLink;
use App\Models\CognitiveSession;
use App\Models\DailyTask;
use App\Models\GameResult;
use App\Models\Reminder;
use App\Models\TrainingBaseline;
use App\Models\User;
use Carbon\Carbon;

class CaregiverDashboardService
{
    public function __construct(
        protected CaregiverFollowUpSignalService $signalService
    ) {
    }

    /**
     * Fetch all patients actively linked to the caregiver.
     * Enforces strict authorization barrier: only 'active' status links are returned.
     */
    public function getLinkedPatients(User $caregiver): array
    {
        return CaregiverPatientLink::where('caregiver_user_id', $caregiver->id)
            ->where('status', 'active')
            ->with(['patient.profile'])
            ->get()
            ->map(fn($link) => $link->patient)
            ->all();
    }

    /**
     * Builds comprehensive 12-section overview for a selected patient.
     */
    public function getPatientOverview(User $patient): array
    {
        $now = Carbon::now();
        $todayStr = $now->toDateString();
        $sevenDaysAgo = $now->copy()->subDays(7);
        $thirtyDaysAgo = $now->copy()->subDays(30);

        // 1. SESSIONS DATA
        $allSessions = CognitiveSession::where('user_id', $patient->id)
            ->orderByDesc('completed_at')
            ->get();

        $weekSessions = $allSessions->filter(fn($s) => $s->completed_at && $s->completed_at->gte($sevenDaysAgo));
        $monthSessions = $allSessions->filter(fn($s) => $s->completed_at && $s->completed_at->gte($thirtyDaysAgo));
        $todaySessions = $allSessions->filter(fn($s) => $s->completed_at && $s->completed_at->isSameDay($now));

        // 2. TODAY'S ACTIVITY
        $todayTasks = DailyTask::where('user_id', $patient->id)
            ->where('task_date', $todayStr)
            ->get();

        $todayActivity = [
            'workout_completed' => $todaySessions->isNotEmpty(),
            'workouts_count' => $todaySessions->count(),
            'latest_today_score' => $todaySessions->first()?->overall_score ?? null,
            'tasks_completed' => $todayTasks->where('completed', true)->count(),
            'tasks_total' => $todayTasks->count(),
            'tasks' => $todayTasks,
        ];

        // 3. RECENT SESSIONS (Latest 5)
        $recentSessions = $allSessions->take(5)->map(function ($s) {
            return [
                'id' => $s->id,
                'date' => $s->completed_at ? $s->completed_at->format('M j, Y - g:ia') : 'In progress',
                'overall_score' => $s->overall_score,
                'accuracy' => round($s->accuracy * 100),
                'response_time' => number_format($s->avg_response_time_seconds, 1) . 's',
                'games_completed' => $s->games_completed,
            ];
        })->values()->all();

        // 4. 7-DAY & 30-DAY ACTIVITY (Adherence rates & bar breakdown)
        $weeklyBars = [];
        for ($i = 6; $i >= 0; $i--) {
            $day = $now->copy()->subDays($i);
            $daySession = $weekSessions->first(fn($s) => $s->completed_at && $s->completed_at->isSameDay($day));
            $weeklyBars[] = [
                'day' => $day->format('D'),
                'date' => $day->format('M j'),
                'completed' => (bool) $daySession,
                'score' => $daySession ? $daySession->overall_score : 0,
            ];
        }

        $daysActiveIn30 = $monthSessions->unique(fn($s) => $s->completed_at?->toDateString())->count();
        $thirtyDayAdherencePercent = min(100, round(($daysActiveIn30 / 30) * 100));

        $adherence = [
            'weekly_bars' => $weeklyBars,
            'week_active_days' => $weekSessions->unique(fn($s) => $s->completed_at?->toDateString())->count(),
            'thirty_day_active_days' => $daysActiveIn30,
            'thirty_day_percent' => $thirtyDayAdherencePercent,
            'weekly_average_score' => round($weekSessions->avg('overall_score') ?? 0),
        ];

        // 5. GAME-BY-GAME PERFORMANCE
        $gameKeys = [
            'sequence' => 'Sequence Memory',
            'stroop' => 'Stroop Test',
            'house' => 'Around the House Sorting',
            'pattern' => 'Pattern Recognition',
            'spot' => 'Spot the Difference',
        ];

        $gamePerformance = [];
        foreach ($gameKeys as $key => $title) {
            $results = GameResult::where('user_id', $patient->id)
                ->where('game_key', $key)
                ->latest('created_at')
                ->take(20)
                ->get();

            $totalTrials = $results->count();
            $accuracy = $totalTrials > 0 ? round(($results->where('is_correct', true)->count() / $totalTrials) * 100) : 0;
            $avgLatency = $totalTrials > 0 ? round($results->avg('response_time_seconds'), 1) : 0;
            $currentDiff = $results->first()?->difficulty_level ?? 2;

            $gamePerformance[$key] = [
                'title' => $title,
                'accuracy' => $accuracy,
                'total_trials' => $totalTrials,
                'avg_latency' => $avgLatency,
                'current_difficulty' => $currentDiff,
            ];
        }

        // 6. RESPONSE-TIME TRENDS (Last 7 sessions)
        $responseTimeTrends = $allSessions->take(7)->reverse()->map(function ($s) {
            return [
                'date' => $s->completed_at ? $s->completed_at->format('M j') : '',
                'seconds' => round($s->avg_response_time_seconds, 1),
            ];
        })->values()->all();

        // 7. DIFFICULTY PROGRESSION
        $difficultyProgression = $allSessions->take(7)->reverse()->map(function ($s) {
            $latestResult = GameResult::where('cognitive_session_id', $s->id)->latest('created_at')->first();
            return [
                'date' => $s->completed_at ? $s->completed_at->format('M j') : '',
                'level' => $latestResult ? $latestResult->difficulty_level : 2,
            ];
        })->values()->all();

        // 8. REMINDER STATUS
        $reminders = Reminder::where('user_id', $patient->id)
            ->orderBy('reminder_time')
            ->get();

        // 9. MISSED ACTIVITY
        $missedAlerts = CaregiverAlert::where('patient_id', $patient->id)
            ->where('type', 'reminder_missed')
            ->latest()
            ->take(5)
            ->get();

        $incompletePastTasks = DailyTask::where('user_id', $patient->id)
            ->where('task_date', '<', $todayStr)
            ->where('completed', false)
            ->latest('task_date')
            ->take(5)
            ->get();

        $missedActivity = [
            'missed_alerts' => $missedAlerts,
            'incomplete_tasks' => $incompletePastTasks,
        ];

        // 10. FOLLOW-UP SIGNALS
        $followUpSignals = $this->signalService->generateSignals($patient);

        // 11. CAREGIVER NOTES
        $caregiverNotes = CaregiverNote::where('patient_id', $patient->id)
            ->with('caregiver')
            ->latest('note_date')
            ->take(10)
            ->get();

        return [
            'patient' => [
                'id' => $patient->id,
                'name' => $patient->profile?->full_name ?? $patient->name,
                'momo_name' => $patient->profile?->momo_name ?? 'Momo',
                'region' => $patient->profile?->region ?? 'Assam',
                'language' => $patient->profile?->preferred_language ?? 'en-IN',
                'dob' => $patient->profile?->date_of_birth?->format('M j, Y') ?? 'Not specified',
                'emergency_contact' => $patient->profile?->emergency_contact ?? 'Not set',
            ],
            'today_activity' => $todayActivity,
            'recent_sessions' => $recentSessions,
            'adherence' => $adherence,
            'game_performance' => $gamePerformance,
            'response_time_trends' => $responseTimeTrends,
            'difficulty_progression' => $difficultyProgression,
            'reminders' => $reminders,
            'missed_activity' => $missedActivity,
            'follow_up_signals' => $followUpSignals,
            'caregiver_notes' => $caregiverNotes,
            'clinical_disclaimer' => 'All statistics and indicators describe cognitive training engagement only. They do not evaluate or diagnose dementia, Alzheimer\'s, or medical conditions.',
        ];
    }
}
