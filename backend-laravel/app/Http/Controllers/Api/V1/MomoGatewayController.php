<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\MomoChatRequest;
use App\Services\MomoCompanionService;
use Illuminate\Http\JsonResponse;

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
}
