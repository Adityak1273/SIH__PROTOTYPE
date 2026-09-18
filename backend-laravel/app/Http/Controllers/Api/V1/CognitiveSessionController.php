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
        $sessions = CognitiveSession::where('user_id', $request->user()->id)
            ->with('gameResults')
            ->orderByDesc('completed_at')
            ->paginate(15);

        return CognitiveSessionResource::collection($sessions);
    }

    public function store(StoreCognitiveSessionRequest $request): JsonResponse
    {
        $user = $request->user();
        $validated = $request->validated();

        $session = DB::transaction(function () use ($user, $validated) {
            $session = CognitiveSession::firstOrCreate(
                ['client_session_id' => $validated['client_session_id']],
                [
                    'id' => (string) Str::uuid(),
                    'user_id' => $user->id,
                    'session_type' => $validated['session_type'] ?? 'five_game_continuous',
                    'started_at' => $validated['started_at'],
                    'completed_at' => $validated['completed_at'] ?? now(),
                    'overall_score' => $validated['overall_score'],
                    'accuracy' => $validated['accuracy'],
                    'avg_response_time_seconds' => $validated['avg_response_time_seconds'],
                    'games_completed' => $validated['games_completed'],
                    'game_order' => $validated['game_order'],
                    'sync_status' => 'synced',
                ]
            );

            if ($session->wasRecentlyCreated) {
                foreach ($validated['results'] as $result) {
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

                event(new CognitiveSessionCompleted($session));
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
