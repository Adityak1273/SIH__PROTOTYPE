<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReminderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'client_id' => $this->client_id,
            'title' => $this->title,
            'reminder_time' => substr($this->reminder_time, 0, 5),
            'repeat_rule' => $this->repeat_rule,
            'kind' => $this->kind->value,
            'active' => $this->active,
        ];
    }
}
