<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Rules\Engine\RuleEngine;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RuleEngineController extends Controller
{
    public function __construct(protected RuleEngine $ruleEngine)
    {
    }

    public function evaluate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'event' => ['required', 'string', 'max:80'],
            'payload' => ['nullable', 'array'],
        ]);

        $decision = $this->ruleEngine->dispatch(
            $validated['event'],
            $validated['payload'] ?? [],
            $request->user()
        );

        return response()->json([
            'decision' => $decision->toArray(),
            'state' => $this->ruleEngine->getState(),
        ]);
    }

    public function state(): JsonResponse
    {
        return response()->json([
            'state' => $this->ruleEngine->getState(),
        ]);
    }
}
