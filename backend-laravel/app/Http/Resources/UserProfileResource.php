<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserProfileResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'full_name' => $this->full_name,
            'date_of_birth' => $this->date_of_birth?->toDateString(),
            'gender' => $this->gender,
            'emergency_contact' => $this->emergency_contact,
            'emergency_relationship' => $this->emergency_relationship,
            'momo_name' => $this->momo_name,
            'voice_preference' => $this->voice_preference,
            'region' => $this->region,
            'preferred_language' => $this->preferred_language,
            'accessibility_mode' => $this->accessibility_mode,
            'avatar_path' => $this->avatar_path,
            'profile_complete' => $this->profile_complete,
        ];
    }
}
