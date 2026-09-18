<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CognitiveSessionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'client_session_id' => $this->client_session_id,
            'session_type' => $this->session_type,
            'started_at' => $this->started_at?->toIso8601String(),
            'completed_at' => $this->completed_at?->toIso8601String(),
            'overall_score' => $this->overall_score,
            'accuracy' => $this->accuracy,
            'avg_response_time_seconds' => $this->avg_response_time_seconds,
            'games_completed' => $this->games_completed,
            'game_order' => $this->game_order,
            'results' => GameResultResource::collection($this->whenLoaded('gameResults')),
            'clinical_disclaimer' => 'These results describe game training performance only. They are not a dementia diagnosis or clinical assessment.',
        ];
    }
}
