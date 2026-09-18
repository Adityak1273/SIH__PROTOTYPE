<?php

namespace App\Services;

use App\Events\CognitiveSessionCompleted;
use App\Models\CognitiveSession;
use App\Models\DailyTask;
use App\Models\GameResult;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class OfflineSyncService
{
    /**
     * Ingest batch from offline outbox (sessions, trials, and daily routine tasks).
     * Uses client_session_id for strictly idempotent deduplication.
     */
    public function processBatch(User $user, array $payload): array
    {
        return DB::transaction(function () use ($user, $payload) {
            $syncedSessions = [];
            $syncedTasks = [];

            // 1. Process Cognitive Sessions
            foreach ($payload['sessions'] ?? [] as $sessionData) {
                $clientSessionId = $sessionData['client_session_id'] ?? (string) Str::uuid();

                $session = CognitiveSession::firstOrCreate(
                    ['client_session_id' => $clientSessionId],
                    [
                        'id' => (string) Str::uuid(),
                        'user_id' => $user->id,
                        'session_type' => $sessionData['session_type'] ?? 'five_game_continuous',
                        'started_at' => $sessionData['started_at'],
                        'completed_at' => $sessionData['completed_at'] ?? now(),
                        'overall_score' => $sessionData['overall_score'] ?? 0,
                        'accuracy' => $sessionData['accuracy'] ?? 0.0,
                        'avg_response_time_seconds' => $sessionData['avg_response_time_seconds'] ?? 0.0,
                        'games_completed' => $sessionData['games_completed'] ?? 5,
                        'game_order' => $sessionData['game_order'] ?? ['sequence', 'stroop', 'house', 'pattern', 'spot'],
                        'sync_status' => 'synced',
                    ]
                );

                if ($session->wasRecentlyCreated) {
                    // Ingest individual game trial results
                    foreach ($sessionData['results'] ?? [] as $resultData) {
                        GameResult::create([
                            'id' => (string) Str::uuid(),
                            'cognitive_session_id' => $session->id,
                            'user_id' => $user->id,
                            'game_key' => $resultData['game'],
                            'trial_number' => $resultData['trial'] ?? 1,
                            'is_correct' => (bool) ($resultData['correct'] ?? false),
                            'response_time_seconds' => (float) ($resultData['seconds'] ?? 0.0),
                            'difficulty_level' => (int) ($resultData['difficulty'] ?? 2),
                            'metadata' => $resultData['metadata'] ?? null,
                        ]);
                    }

                    event(new CognitiveSessionCompleted($session));
                }

                $syncedSessions[] = $clientSessionId;
            }

            // 2. Process Daily Routine Tasks
            foreach ($payload['tasks'] ?? [] as $taskData) {
                $task = DailyTask::updateOrCreate(
                    [
                        'user_id' => $user->id,
                        'task_date' => $taskData['task_date'] ?? now()->toDateString(),
                        'title' => $taskData['title'],
                    ],
                    [
                        'client_id' => $taskData['client_id'] ?? null,
                        'completed' => (bool) ($taskData['completed'] ?? false),
                        'completed_at' => ($taskData['completed'] ?? false) ? now() : null,
                    ]
                );

                $syncedTasks[] = $task->client_id ?? (string) $task->id;
            }

            return [
                'status' => 'success',
                'synced_sessions' => $syncedSessions,
                'synced_tasks' => $syncedTasks,
                'server_time' => now()->toIso8601String(),
            ];
        });
    }
}
