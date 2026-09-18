<?php

namespace App\Listeners;

use App\Events\CognitiveSessionCompleted;
use App\Services\AdaptiveDifficultyService;

class RecalculateTrainingBaselines
{
    public function __construct(protected AdaptiveDifficultyService $adaptiveService)
    {
    }

    public function handle(CognitiveSessionCompleted $event): void
    {
        $session = $event->session;
        $session->load('gameResults');
        $this->adaptiveService->updateBaselines($session->user, $session->gameResults);
    }
}
