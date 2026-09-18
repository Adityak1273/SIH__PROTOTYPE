<?php

namespace App\Http\Controllers\Api\V1;

use App\Events\CognitiveSessionCompleted;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCognitiveSessionRequest;
use App\Http\Resources\CognitiveSessionResource;
use App\Models\CognitiveSession;
use App\Models\GameResult;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CognitiveSessionController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $patientId = $request->query('patient_id') ?: $request->user()->id;

        // Caregiver authorization
        if ($patientId != $request->user()->id && !$request->user()->hasRole('caregiver', 'health_worker', 'admin')) {
            abort(403, 'Unauthorized access to patient data.');
        }

        $sessions = CognitiveSession::where('user_id', $patientId)
            ->with('gameResults')
            ->orderByDesc('completed_at')
            ->paginate(15);

        return CognitiveSessionResource::collection($sessions);
    }

    public function store(StoreCognitiveSessionRequest $request): JsonResponse
    {
        $this->authorize('create', CognitiveSession::class);

        $user = $request->user();
        $validated = $request->validated();
        $isInterrupted = ($validated['session_type'] ?? '') === 'interrupted' || !empty($validated['interrupted']);

        $session = DB::transaction(function () use ($user, $validated, $isInterrupted) {
            $session = CognitiveSession::firstOrCreate(
                ['client_session_id' => $validated['client_session_id']],
                [
                    'id' => (string) Str::uuid(),
                    'user_id' => $user->id,
                    'session_type' => $validated['session_type'] ?? 'five_game_continuous',
                    'started_at' => $validated['started_at'],
                    'completed_at' => $isInterrupted ? null : ($validated['completed_at'] ?? now()),
                    'overall_score' => $validated['overall_score'] ?? 0,
                    'accuracy' => $validated['accuracy'] ?? 0.0,
                    'avg_response_time_seconds' => $validated['avg_response_time_seconds'] ?? 0.0,
                    'games_completed' => $validated['games_completed'] ?? 0,
                    'game_order' => $validated['game_order'] ?? [],
                    'sync_status' => $isInterrupted ? 'interrupted' : 'synced',
                ]
            );

            if ($session->wasRecentlyCreated) {
                foreach ($validated['results'] ?? [] as $result) {
                    GameResult::create([
                        'id' => (string) Str::uuid(),
                        'cognitive_session_id' => $session->id,
                        'user_id' => $user->id,
                        'game_key' => $result['game'],
                        'trial_number' => $result['trial'],
                        'is_correct' => $result['correct'],
                        'response_time_seconds' => $result['seconds'],
                        'difficulty_level' => $result['difficulty'],
                        'metadata' => $result['metadata'] ?? null,
                    ]);
                }

                // Interrupted sessions do not recalculate longitudinal baselines to prevent skewing
                if (!$isInterrupted) {
                    event(new CognitiveSessionCompleted($session));
                }
            }

            return $session;
        });

        $session->load('gameResults');

        return (new CognitiveSessionResource($session))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Request $request, CognitiveSession $session): CognitiveSessionResource
    {
        $this->authorize('view', $session);
        $session->load('gameResults');
        return new CognitiveSessionResource($session);
    }
}
