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
        $syncedSessions = [];
        $failedSessions = [];
        $syncedTasks = [];
        $failedTasks = [];

        // 1. Process Cognitive Sessions with item-level transaction isolation
        foreach ($payload['sessions'] ?? [] as $sessionData) {
            $clientSessionId = $sessionData['client_session_id'] ?? null;
            if (!$clientSessionId) {
                $failedSessions[] = [
                    'client_session_id' => 'unknown',
                    'error' => 'Missing client_session_id',
                ];
                continue;
            }

            try {
                DB::transaction(function () use ($user, $sessionData, $clientSessionId, &$syncedSessions) {
                    $session = CognitiveSession::firstOrCreate(
                        ['client_session_id' => $clientSessionId],
                        [
                            'id' => (string) Str::uuid(),
                            'user_id' => $user->id,
                            'session_type' => $sessionData['session_type'] ?? 'five_game_continuous',
                            'started_at' => $sessionData['started_at'] ?? now(),
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
                });
            } catch (\Throwable $e) {
                $failedSessions[] = [
                    'client_session_id' => $clientSessionId,
                    'error' => $e->getMessage(),
                ];
            }
        }

        // 2. Process Daily Tasks with item-level isolation
        foreach ($payload['tasks'] ?? [] as $taskData) {
            $clientId = $taskData['client_id'] ?? null;
            $title = $taskData['title'] ?? null;

            if (!$title) {
                $failedTasks[] = [
                    'client_id' => $clientId,
                    'error' => 'Task title is required.',
                ];
                continue;
            }

            try {
                $task = DailyTask::updateOrCreate(
                    [
                        'user_id' => $user->id,
                        'task_date' => $taskData['task_date'] ?? now()->toDateString(),
                        'title' => $title,
                    ],
                    [
                        'client_id' => $clientId,
                        'completed' => (bool) ($taskData['completed'] ?? false),
                        'completed_at' => ($taskData['completed'] ?? false) ? now() : null,
                    ]
                );

                $syncedTasks[] = $task->client_id ?? (string) $task->id;
            } catch (\Throwable $e) {
                $failedTasks[] = [
                    'client_id' => $clientId,
                    'error' => $e->getMessage(),
                ];
            }
        }

        $hasFailures = !empty($failedSessions) || !empty($failedTasks);
        $hasSuccesses = !empty($syncedSessions) || !empty($syncedTasks);

        $status = 'success';
        if ($hasFailures && $hasSuccesses) {
            $status = 'partial_success';
        } elseif ($hasFailures && !$hasSuccesses) {
            $status = 'failed';
        }

        return [
            'status' => $status,
            'synced_sessions' => $syncedSessions,
            'failed_sessions' => $failedSessions,
            'synced_tasks' => $syncedTasks,
            'failed_tasks' => $failedTasks,
            'server_time' => now()->toIso8601String(),
        ];
    }
}
