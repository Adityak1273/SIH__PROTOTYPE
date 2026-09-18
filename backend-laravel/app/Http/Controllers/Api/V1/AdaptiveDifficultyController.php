<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\TrainingBaseline;
use App\Services\AdaptiveDifficultyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdaptiveDifficultyController extends Controller
{
    public function __construct(protected AdaptiveDifficultyService $adaptiveService)
    {
    }

    public function recommend(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'game' => ['required', 'string'],
            'current_difficulty' => ['required', 'integer', 'min:1', 'max:10'],
            'accuracy' => ['required', 'numeric', 'min:0', 'max:1'],
            'response_time' => ['required', 'numeric', 'min:0'],
            'consecutive_successes' => ['required', 'integer', 'min:0'],
            'consecutive_failures' => ['required', 'integer', 'min:0'],
            'fatigue' => ['nullable', 'numeric', 'min:0', 'max:1'],
        ]);

        $recommendation = $this->adaptiveService->evaluateNextDifficulty(
            $validated['game'],
            $validated['current_difficulty'],
            $validated['accuracy'],
            $validated['response_time'],
            $validated['consecutive_successes'],
            $validated['consecutive_failures'],
            $validated['fatigue'] ?? 0.0
        );

        return response()->json([
            'game' => $validated['game'],
            'recommendation' => $recommendation,
            'clinical_disclaimer' => 'Difficulty recommendation is a training personalization rule. It is not a cognitive stage or clinical diagnosis.',
        ]);
    }

    public function baselines(Request $request): JsonResponse
    {
        $baselines = TrainingBaseline::where('user_id', $request->user()->id)
            ->latest('captured_at')
            ->get()
            ->unique('domain')
            ->values();

        return response()->json([
            'baselines' => $baselines,
            'clinical_disclaimer' => 'Baselines describe training history only and do not establish a clinical evaluation.',
        ]);
    }
}
