<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class GameResultResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'game' => $this->game_key->value,
            'game_title' => $this->game_key->title(),
            'domain' => $this->game_key->domain()->value,
            'trial' => $this->trial_number,
            'correct' => $this->is_correct,
            'seconds' => $this->response_time_seconds,
            'difficulty' => $this->difficulty_level,
            'metadata' => $this->metadata,
        ];
    }
}
