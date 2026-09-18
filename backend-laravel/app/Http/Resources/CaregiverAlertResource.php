<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CaregiverAlertResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'patient_id' => $this->patient_id,
            'type' => $this->type,
            'severity' => $this->severity->value,
            'title' => $this->title,
            'message' => $this->message,
            'acknowledged' => $this->isAcknowledged(),
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}
