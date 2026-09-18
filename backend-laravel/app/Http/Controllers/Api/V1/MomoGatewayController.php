<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\MomoChatRequest;
use App\Services\MomoCompanionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MomoGatewayController extends Controller
{
    public function __construct(protected MomoCompanionService $momoService)
    {
    }

    public function chat(MomoChatRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $reply = $this->momoService->generateReply(
            $request->user(),
            $validated['message'],
            $validated['history'] ?? [],
            $validated['screen'] ?? 'homeView',
            $validated['game'] ?? 'none',
            $validated['level'] ?? 1
        );

        return response()->json([
            'reply' => $reply,
            'clinical_disclaimer' => 'Momo is a friendly companion. Momo does not diagnose conditions or give medical advice.',
        ]);
    }

    /**
     * Explain a cognitive game in plain, elderly-friendly language.
     */
    public function explainGame(Request $request): JsonResponse
    {
        $request->validate([
            'game_key' => ['required', 'string', 'max:50'],
        ]);

        $explanation = $this->momoService->explainGame(
            $request->user(),
            $request->input('game_key')
        );

        return response()->json([
            'game_key' => $request->input('game_key'),
            'explanation' => $explanation,
            'clinical_disclaimer' => 'Momo is a friendly companion. Momo does not diagnose conditions or give medical advice.',
        ]);
    }

    /**
     * Summarize activity streaks and sessions for encouragement.
     */
    public function summarizeActivity(Request $request): JsonResponse
    {
        $request->validate([
            'weekly_sessions' => ['required', 'integer', 'min:0'],
            'streak_days' => ['required', 'integer', 'min:0'],
        ]);

        $summary = $this->momoService->summarizeActivity(
            $request->user(),
            (int) $request->input('weekly_sessions'),
            (int) $request->input('streak_days')
        );

        return response()->json([
            'summary' => $summary,
            'clinical_disclaimer' => 'Momo is a friendly companion. Momo does not diagnose conditions or give medical advice.',
        ]);
    }
}
